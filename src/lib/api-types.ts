/**
 * Shared API type definitions
 * Consolidates types used across API routes and frontend components
 */

import type { ProviderId } from "./providers";
import type { ProviderError } from "./provider-errors";

// ============================================================================
// Settings API Types
// ============================================================================

/**
 * Status of a provider's API key configuration
 */
export type ProviderStatus = {
  /** Whether the provider has an API key configured */
  configured: boolean;
  /** Source of the API key: environment variable or user-stored */
  source?: "env" | "user";
  /** Last 4 characters of the API key for identification */
  lastFour?: string;
  /** Whether the key has been validated successfully */
  validated?: boolean;
  /** Error message if validation failed */
  validationError?: string;
};

/**
 * Response from GET /api/settings
 */
export type SettingsResponse = {
  providers: Record<string, ProviderStatus>;
};

// ============================================================================
// Validation API Types
// ============================================================================

/**
 * Response from POST /api/settings/validate
 */
export type ValidationResult = {
  provider: ProviderId;
  valid: boolean;
  error?: ProviderError;
};

/**
 * Response from POST /api/settings/check
 */
export type CheckResult = {
  provider: ProviderId;
  valid: boolean;
  error?: ProviderError;
  message?: string;
};

// ============================================================================
// Project API Types
// ============================================================================

/**
 * Project provider/model settings
 */
export type ProjectSettings = {
  provider: string;
  model: string;
};
