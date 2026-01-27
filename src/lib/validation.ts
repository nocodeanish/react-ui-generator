/**
 * Validation utilities for user input
 * Centralizes email, password, and project name validation
 */

import { PROJECT_NAME_MAX_LENGTH } from "./constants";

// ============================================================================
// Email Validation
// ============================================================================

/** Basic but secure email validation regex */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Normalize email to lowercase and trimmed
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// ============================================================================
// Password Validation
// ============================================================================

/** Password must contain: min 8 chars, 1 uppercase, 1 lowercase, 1 number */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Validate password meets strength requirements
 */
export function validatePassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

// ============================================================================
// Project Name Sanitization
// ============================================================================

/**
 * Sanitize project name by stripping HTML, trimming, and truncating
 *
 * Order of operations (security-first):
 * 1. Strip HTML tags (removes potentially malicious content first)
 * 2. Trim whitespace
 * 3. Truncate to max length
 *
 * Note: This order differs from previous create-project.ts implementation
 * which truncated before stripping HTML. The new order is safer.
 */
export function sanitizeProjectName(name: string): string {
  return name
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .trim()                   // Trim whitespace
    .slice(0, PROJECT_NAME_MAX_LENGTH); // Truncate
}
