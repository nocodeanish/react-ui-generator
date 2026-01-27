/**
 * API Key Validators for each provider
 * Makes lightweight test requests to verify keys work
 * Includes timeout handling and proper error messages
 */

import { type ProviderId } from "./providers";
import { VALIDATION_TIMEOUT_MS } from "./constants";

// ============================================================================
// Types
// ============================================================================

export type KeyValidationResult = {
  valid: boolean;
  error?: string;
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch with timeout using AbortController
 * Prevents hanging requests when provider APIs are slow
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = VALIDATION_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Handle errors from validation requests
 */
function handleValidationError(error: unknown): KeyValidationResult {
  if (error instanceof DOMException && error.name === "AbortError") {
    return { valid: false, error: "Request timeout - provider API did not respond" };
  }
  return {
    valid: false,
    error: error instanceof Error ? error.message : "Network error",
  };
}

// ============================================================================
// Provider-Specific Validators
// ============================================================================

/**
 * Validate Anthropic API key via /v1/models endpoint
 */
export async function validateAnthropicKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const response = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: data.error?.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return handleValidationError(error);
  }
}

/**
 * Validate OpenAI API key via /v1/models endpoint
 */
export async function validateOpenAIKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: data.error?.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return handleValidationError(error);
  }
}

/**
 * Validate Google AI API key via /v1/models endpoint
 */
export async function validateGoogleKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
      { method: "GET" }
    );

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: data.error?.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return handleValidationError(error);
  }
}

/**
 * Validate OpenRouter API key via /v1/auth/key endpoint
 */
export async function validateOpenRouterKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const response = await fetchWithTimeout("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: data.error?.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return handleValidationError(error);
  }
}

/**
 * Validate xAI API key via /v1/models endpoint
 */
export async function validateXAIKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const response = await fetchWithTimeout("https://api.x.ai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: data.error?.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    return handleValidationError(error);
  }
}

// ============================================================================
// Validator Registry
// ============================================================================

/**
 * Map of provider ID to validator function
 */
export const KEY_VALIDATORS: Record<
  ProviderId,
  (apiKey: string) => Promise<KeyValidationResult>
> = {
  anthropic: validateAnthropicKey,
  openai: validateOpenAIKey,
  google: validateGoogleKey,
  openrouter: validateOpenRouterKey,
  xai: validateXAIKey,
};

/**
 * Validate an API key for a specific provider
 */
export async function validateApiKey(
  provider: ProviderId,
  apiKey: string
): Promise<KeyValidationResult> {
  const validator = KEY_VALIDATORS[provider];
  if (!validator) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }
  return validator(apiKey.trim());
}
