// API Key encryption utilities using AES-256-GCM
// Keys are encrypted before storage and decrypted only server-side when needed

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { EMPTY_API_KEYS } from "./constants";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive encryption key from JWT_SECRET using scrypt
// scrypt is memory-hard and resistant to brute force attacks
function deriveKey(salt: Buffer): Buffer {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET required for encryption");
  }
  return scryptSync(jwtSecret, salt, 32); // 256-bit key
}

/**
 * Encrypt an API key for secure storage
 * Uses AES-256-GCM with random salt and IV
 * Format: salt:iv:authTag:encrypted (all base64 encoded)
 */
export function encryptApiKey(plaintext: string): string {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encrypted (all base64)
  return [
    salt.toString("base64"),
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypt an API key from storage
 * Returns the original plaintext key
 * Throws if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptApiKey(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted key format");
  }

  const [saltB64, ivB64, authTagB64, encryptedB64] = parts;

  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Encrypt a JSON object containing multiple API keys
 * Example: { openai: "sk-...", anthropic: "sk-ant-..." }
 */
export function encryptApiKeys(
  keys: Record<string, string>
): string {
  const json = JSON.stringify(keys);
  return encryptApiKey(json);
}

/**
 * Decrypt and parse a JSON object of API keys
 * Returns empty object if decryption fails or data is invalid
 */
export function decryptApiKeys(
  encrypted: string
): Record<string, string> {
  if (!encrypted || encrypted === EMPTY_API_KEYS) {
    return {};
  }

  try {
    const json = decryptApiKey(encrypted);
    return JSON.parse(json);
  } catch {
    // Decryption failed - corrupted data or wrong JWT_SECRET
    return {};
  }
}

/**
 * Mask an API key for display (show only last 4 characters)
 * Example: "sk-ant-abc123xyz789" -> "sk-...x789"
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****";
  }
  const prefix = key.slice(0, 3);
  const lastFour = key.slice(-4);
  return `${prefix}...${lastFour}`;
}

/**
 * Get the last 4 characters of an API key for identification
 */
export function getKeyLastFour(key: string): string {
  if (key.length < 4) {
    return "****";
  }
  return key.slice(-4);
}
