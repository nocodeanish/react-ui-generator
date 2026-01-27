import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  encryptApiKey,
  decryptApiKey,
  encryptApiKeys,
  decryptApiKeys,
  maskApiKey,
  getKeyLastFour,
} from "../crypto";

describe("Crypto", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Set a test JWT_SECRET for encryption
    process.env.JWT_SECRET = "test-jwt-secret-for-encryption-testing-123";
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv.JWT_SECRET !== undefined) {
      process.env.JWT_SECRET = originalEnv.JWT_SECRET;
    } else {
      delete process.env.JWT_SECRET;
    }
  });

  describe("encryptApiKey / decryptApiKey", () => {
    test("should encrypt and decrypt a simple API key", () => {
      const originalKey = "sk-ant-api-key-123";
      const encrypted = encryptApiKey(originalKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    test("should encrypt and decrypt a long API key", () => {
      const originalKey = "sk-ant-" + "a".repeat(200);
      const encrypted = encryptApiKey(originalKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    test("should produce different ciphertext for same plaintext (random salt/IV)", () => {
      const originalKey = "sk-ant-api-key-123";
      const encrypted1 = encryptApiKey(originalKey);
      const encrypted2 = encryptApiKey(originalKey);

      // Ciphertexts should be different due to random salt and IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decryptApiKey(encrypted1)).toBe(originalKey);
      expect(decryptApiKey(encrypted2)).toBe(originalKey);
    });

    test("should handle special characters in API key", () => {
      const originalKey = "sk-ant-key+with=special/chars!@#$%^&*()";
      const encrypted = encryptApiKey(originalKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    test("should handle unicode characters", () => {
      const originalKey = "sk-api-key-with-unicode-\u00e9\u00e0\u00fc";
      const encrypted = encryptApiKey(originalKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    test("should handle empty string", () => {
      const originalKey = "";
      const encrypted = encryptApiKey(originalKey);
      const decrypted = decryptApiKey(encrypted);

      expect(decrypted).toBe(originalKey);
    });

    test("encrypted format should have 4 parts separated by colons", () => {
      const encrypted = encryptApiKey("test-key");
      const parts = encrypted.split(":");

      expect(parts).toHaveLength(4);
      // All parts should be valid base64
      parts.forEach((part) => {
        expect(() => Buffer.from(part, "base64")).not.toThrow();
      });
    });

    test("should throw error for invalid encrypted format (wrong parts count)", () => {
      expect(() => decryptApiKey("invalid")).toThrow("Invalid encrypted key format");
      expect(() => decryptApiKey("a:b")).toThrow("Invalid encrypted key format");
      expect(() => decryptApiKey("a:b:c")).toThrow("Invalid encrypted key format");
      expect(() => decryptApiKey("a:b:c:d:e")).toThrow("Invalid encrypted key format");
    });

    test("should throw error for tampered ciphertext", () => {
      const encrypted = encryptApiKey("test-key");
      const parts = encrypted.split(":");
      // Tamper with the encrypted data
      parts[3] = Buffer.from("tampered").toString("base64");
      const tampered = parts.join(":");

      expect(() => decryptApiKey(tampered)).toThrow();
    });

    test("should throw error when JWT_SECRET is not set", () => {
      delete process.env.JWT_SECRET;

      expect(() => encryptApiKey("test-key")).toThrow("JWT_SECRET required for encryption");
    });
  });

  describe("encryptApiKeys / decryptApiKeys", () => {
    test("should encrypt and decrypt multiple API keys", () => {
      const keys = {
        anthropic: "sk-ant-key-123",
        openai: "sk-openai-key-456",
        google: "google-api-key-789",
      };

      const encrypted = encryptApiKeys(keys);
      const decrypted = decryptApiKeys(encrypted);

      expect(decrypted).toEqual(keys);
    });

    test("should handle empty object", () => {
      const keys = {};

      const encrypted = encryptApiKeys(keys);
      const decrypted = decryptApiKeys(encrypted);

      expect(decrypted).toEqual(keys);
    });

    test("should handle single key", () => {
      const keys = { anthropic: "sk-ant-key" };

      const encrypted = encryptApiKeys(keys);
      const decrypted = decryptApiKeys(encrypted);

      expect(decrypted).toEqual(keys);
    });

    test("should return empty object for empty string input", () => {
      const decrypted = decryptApiKeys("");
      expect(decrypted).toEqual({});
    });

    test("should return empty object for '{}' input", () => {
      const decrypted = decryptApiKeys("{}");
      expect(decrypted).toEqual({});
    });

    test("should return empty object for invalid encrypted data", () => {
      const decrypted = decryptApiKeys("invalid-data");
      expect(decrypted).toEqual({});
    });

    test("should return empty object for corrupted encrypted data", () => {
      const decrypted = decryptApiKeys("a:b:c:d");
      expect(decrypted).toEqual({});
    });

    test("should handle keys with special characters in values", () => {
      const keys = {
        provider1: "key-with-special=+/chars",
        provider2: "another!@#$%key",
      };

      const encrypted = encryptApiKeys(keys);
      const decrypted = decryptApiKeys(encrypted);

      expect(decrypted).toEqual(keys);
    });
  });

  describe("maskApiKey", () => {
    test("should mask a standard API key", () => {
      const key = "sk-ant-abc123xyz789";
      const masked = maskApiKey(key);

      // Shows first 3 and last 4 characters
      expect(masked).toBe("sk-...z789");
    });

    test("should show first 3 and last 4 characters", () => {
      const key = "abcdefghijklmnop";
      const masked = maskApiKey(key);

      expect(masked).toBe("abc...mnop");
    });

    test("should return '****' for keys 8 chars or less", () => {
      expect(maskApiKey("12345678")).toBe("****");
      expect(maskApiKey("1234567")).toBe("****");
      expect(maskApiKey("abc")).toBe("****");
      expect(maskApiKey("")).toBe("****");
    });

    test("should handle exactly 9 characters", () => {
      const key = "123456789";
      const masked = maskApiKey(key);

      expect(masked).toBe("123...6789");
    });

    test("should handle very long keys", () => {
      const key = "sk-ant-" + "x".repeat(100);
      const masked = maskApiKey(key);

      expect(masked).toBe("sk-...xxxx");
    });
  });

  describe("getKeyLastFour", () => {
    test("should return last 4 characters", () => {
      expect(getKeyLastFour("sk-ant-abc123xyz789")).toBe("z789");
    });

    test("should return '****' for keys shorter than 4 chars", () => {
      expect(getKeyLastFour("abc")).toBe("****");
      expect(getKeyLastFour("ab")).toBe("****");
      expect(getKeyLastFour("a")).toBe("****");
      expect(getKeyLastFour("")).toBe("****");
    });

    test("should return all 4 characters for exactly 4 char key", () => {
      expect(getKeyLastFour("abcd")).toBe("abcd");
    });

    test("should handle keys with special characters", () => {
      expect(getKeyLastFour("key-with-special=")).toBe("ial=");
    });
  });

  describe("Security Properties", () => {
    test("ciphertext should not contain plaintext", () => {
      const key = "sk-ant-api-key-secret-value";
      const encrypted = encryptApiKey(key);

      // Encrypted value should not contain the plaintext
      expect(encrypted).not.toContain("sk-ant");
      expect(encrypted).not.toContain("secret");
    });

    test("decryption should fail with wrong JWT_SECRET", () => {
      const key = "sk-ant-api-key";
      const encrypted = encryptApiKey(key);

      // Change the secret
      process.env.JWT_SECRET = "different-secret-key-for-testing";

      // Decryption should fail
      expect(() => decryptApiKey(encrypted)).toThrow();
    });

    test("encrypted keys object should not expose key values", () => {
      const keys = {
        anthropic: "sk-ant-super-secret",
        openai: "sk-openai-also-secret",
      };
      const encrypted = encryptApiKeys(keys);

      expect(encrypted).not.toContain("sk-ant");
      expect(encrypted).not.toContain("sk-openai");
      expect(encrypted).not.toContain("super-secret");
      expect(encrypted).not.toContain("also-secret");
    });
  });
});
