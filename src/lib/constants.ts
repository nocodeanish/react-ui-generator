/**
 * Centralized constants for the application
 * Consolidates magic numbers and configuration values
 */

// ============================================================================
// Rate Limits
// ============================================================================

export const RATE_LIMITS = {
  /** Sign up: 3 attempts per hour per IP */
  SIGNUP: { limit: 3, window: 60 * 60 * 1000 },
  /** Sign in: 5 attempts per 15 minutes per IP */
  SIGNIN: { limit: 5, window: 15 * 60 * 1000 },
  /** Chat API (anonymous): 10 requests per hour per IP */
  CHAT_ANON: { limit: 10, window: 60 * 60 * 1000 },
  /** Settings changes: 10 per hour per user */
  SETTINGS: { limit: 10, window: 60 * 60 * 1000 },
  /** API key validation: 10 attempts per hour per user */
  VALIDATE: { limit: 10, window: 60 * 60 * 1000 },
  /** API key check: 20 checks per hour per user */
  CHECK: { limit: 20, window: 60 * 60 * 1000 },
} as const;

// ============================================================================
// Session & Auth
// ============================================================================

/** Session TTL: 7 days in milliseconds */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Bcrypt rounds for password hashing */
export const BCRYPT_ROUNDS = 10;

// ============================================================================
// File System Limits
// ============================================================================

export const FILE_LIMITS = {
  /** Maximum number of files in virtual file system */
  MAX_FILES: 100,
  /** Maximum size per file in bytes (500KB) */
  MAX_FILE_SIZE: 500_000,
  /** Maximum total size of all files in bytes (5MB) */
  MAX_TOTAL_SIZE: 5_000_000,
  /** Maximum path length */
  MAX_PATH_LENGTH: 500,
} as const;

/** Allowed file extensions in virtual file system */
export const ALLOWED_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".json",
  ".md",
  ".txt",
] as const;

// ============================================================================
// Project Settings
// ============================================================================

/** Maximum length for project names */
export const PROJECT_NAME_MAX_LENGTH = 100;

/** Default AI provider when none specified */
export const DEFAULT_PROVIDER = "anthropic" as const;

/** Empty API keys JSON string for comparison */
export const EMPTY_API_KEYS = "{}";

// ============================================================================
// API Key Validation
// ============================================================================

/** Timeout for API key validation requests in milliseconds */
export const VALIDATION_TIMEOUT_MS = 10_000;
