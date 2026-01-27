import { describe, it, expect } from "vitest";
import {
  RATE_LIMITS,
  SESSION_TTL_MS,
  BCRYPT_ROUNDS,
  FILE_LIMITS,
  ALLOWED_EXTENSIONS,
  PROJECT_NAME_MAX_LENGTH,
  DEFAULT_PROVIDER,
  EMPTY_API_KEYS,
  VALIDATION_TIMEOUT_MS,
} from "../constants";

describe("constants", () => {
  describe("RATE_LIMITS", () => {
    it("defines signup rate limit", () => {
      expect(RATE_LIMITS.SIGNUP).toEqual({
        limit: 3,
        window: 60 * 60 * 1000, // 1 hour
      });
    });

    it("defines signin rate limit", () => {
      expect(RATE_LIMITS.SIGNIN).toEqual({
        limit: 5,
        window: 15 * 60 * 1000, // 15 minutes
      });
    });

    it("defines chat anonymous rate limit", () => {
      expect(RATE_LIMITS.CHAT_ANON).toEqual({
        limit: 10,
        window: 60 * 60 * 1000, // 1 hour
      });
    });

    it("defines settings rate limit", () => {
      expect(RATE_LIMITS.SETTINGS).toEqual({
        limit: 10,
        window: 60 * 60 * 1000, // 1 hour
      });
    });

    it("defines validate rate limit", () => {
      expect(RATE_LIMITS.VALIDATE).toEqual({
        limit: 10,
        window: 60 * 60 * 1000, // 1 hour
      });
    });

    it("defines check rate limit", () => {
      expect(RATE_LIMITS.CHECK).toEqual({
        limit: 20,
        window: 60 * 60 * 1000, // 1 hour
      });
    });
  });

  describe("SESSION_TTL_MS", () => {
    it("equals 7 days in milliseconds", () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(SESSION_TTL_MS).toBe(sevenDaysMs);
    });
  });

  describe("BCRYPT_ROUNDS", () => {
    it("equals 10 rounds", () => {
      expect(BCRYPT_ROUNDS).toBe(10);
    });
  });

  describe("FILE_LIMITS", () => {
    it("defines max files", () => {
      expect(FILE_LIMITS.MAX_FILES).toBe(100);
    });

    it("defines max file size as 500KB", () => {
      expect(FILE_LIMITS.MAX_FILE_SIZE).toBe(500_000);
    });

    it("defines max total size as 5MB", () => {
      expect(FILE_LIMITS.MAX_TOTAL_SIZE).toBe(5_000_000);
    });

    it("defines max path length", () => {
      expect(FILE_LIMITS.MAX_PATH_LENGTH).toBe(500);
    });
  });

  describe("ALLOWED_EXTENSIONS", () => {
    it("includes common web development extensions", () => {
      expect(ALLOWED_EXTENSIONS).toContain(".js");
      expect(ALLOWED_EXTENSIONS).toContain(".jsx");
      expect(ALLOWED_EXTENSIONS).toContain(".ts");
      expect(ALLOWED_EXTENSIONS).toContain(".tsx");
      expect(ALLOWED_EXTENSIONS).toContain(".css");
      expect(ALLOWED_EXTENSIONS).toContain(".json");
      expect(ALLOWED_EXTENSIONS).toContain(".md");
      expect(ALLOWED_EXTENSIONS).toContain(".txt");
    });

    it("has exactly 8 allowed extensions", () => {
      expect(ALLOWED_EXTENSIONS).toHaveLength(8);
    });
  });

  describe("PROJECT_NAME_MAX_LENGTH", () => {
    it("equals 100 characters", () => {
      expect(PROJECT_NAME_MAX_LENGTH).toBe(100);
    });
  });

  describe("DEFAULT_PROVIDER", () => {
    it("equals anthropic", () => {
      expect(DEFAULT_PROVIDER).toBe("anthropic");
    });
  });

  describe("EMPTY_API_KEYS", () => {
    it("equals empty JSON object string", () => {
      expect(EMPTY_API_KEYS).toBe("{}");
    });
  });

  describe("VALIDATION_TIMEOUT_MS", () => {
    it("equals 10 seconds", () => {
      expect(VALIDATION_TIMEOUT_MS).toBe(10_000);
    });
  });
});
