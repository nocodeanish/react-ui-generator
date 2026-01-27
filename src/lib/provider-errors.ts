// Provider error mapping utility
// Maps cryptic API errors to user-friendly messages with actionable guidance

import { type ProviderId, PROVIDERS } from "./providers";

// Provider-specific API key management URLs
export const PROVIDER_KEY_URLS: Record<ProviderId, string> = {
  anthropic: "https://console.anthropic.com/account/keys",
  openai: "https://platform.openai.com/api-keys",
  google: "https://aistudio.google.com/apikey",
  openrouter: "https://openrouter.ai/keys",
  xai: "https://console.x.ai/",
};

// Error categories for better UX
export type ErrorCategory =
  | "invalid_key"      // API key is invalid, expired, or deleted
  | "quota_exceeded"   // Rate limit or quota exceeded
  | "model_error"      // Model not found or not accessible
  | "network_error"    // Connection issues
  | "server_error"     // Provider server error
  | "unknown";         // Unrecognized error

export interface ProviderError {
  category: ErrorCategory;
  title: string;
  message: string;
  action: string;
  keyUrl: string;
  provider: ProviderId;
  providerName: string;
}

// Common error patterns across providers
const ERROR_PATTERNS: Array<{
  patterns: RegExp[];
  category: ErrorCategory;
  title: string;
  messageTemplate: string;
  actionTemplate: string;
}> = [
  {
    // Invalid/expired/deleted API key errors
    patterns: [
      /invalid.*(api|key)/i,
      /api.*(key|token).*invalid/i,
      /unauthorized/i,
      /authentication.*failed/i,
      /user not found/i,
      /invalid.*credentials/i,
      /incorrect.*api.*key/i,
      /could not validate/i,
      /key.*expired/i,
      /key.*revoked/i,
      /key.*deleted/i,
      /401/,
      /403/,
    ],
    category: "invalid_key",
    title: "Invalid API Key",
    messageTemplate: "Your {provider} API key appears to be invalid, expired, or deleted.",
    actionTemplate: "Please verify your API key at {provider}'s dashboard and update it in Settings.",
  },
  {
    // Rate limit / quota errors
    patterns: [
      /rate.*limit/i,
      /quota.*exceeded/i,
      /too many requests/i,
      /resource.*exhausted/i,
      /billing/i,
      /insufficient.*quota/i,
      /429/,
    ],
    category: "quota_exceeded",
    title: "Rate Limit Exceeded",
    messageTemplate: "You've exceeded the rate limit or quota for {provider}.",
    actionTemplate: "Wait a moment and try again, or check your usage limits at {provider}'s dashboard.",
  },
  {
    // Model errors
    patterns: [
      /model.*not.*found/i,
      /model.*does.*not.*exist/i,
      /invalid.*model/i,
      /model.*not.*available/i,
      /model.*deprecated/i,
    ],
    category: "model_error",
    title: "Model Not Available",
    messageTemplate: "The selected model is not available for {provider}.",
    actionTemplate: "Try selecting a different model from the provider dropdown.",
  },
  {
    // Network errors
    patterns: [
      /network/i,
      /connection.*refused/i,
      /timeout/i,
      /econnrefused/i,
      /enotfound/i,
      /socket/i,
    ],
    category: "network_error",
    title: "Connection Error",
    messageTemplate: "Unable to connect to {provider}'s servers.",
    actionTemplate: "Check your internet connection and try again.",
  },
  {
    // Server errors
    patterns: [
      /internal.*server/i,
      /500/,
      /502/,
      /503/,
      /504/,
      /service.*unavailable/i,
      /overloaded/i,
    ],
    category: "server_error",
    title: "Provider Server Error",
    messageTemplate: "{provider} is experiencing technical difficulties.",
    actionTemplate: "This is a temporary issue. Please try again in a few moments.",
  },
];

/**
 * Parse a provider error and return user-friendly error information
 */
export function parseProviderError(
  providerId: ProviderId,
  error: Error | string | any
): ProviderError {
  const providerName = PROVIDERS[providerId].name;
  const keyUrl = PROVIDER_KEY_URLS[providerId];

  // Extract error message from various error formats
  let errorMessage = "";
  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
    // Check for responseBody in AI SDK errors
    if ((error as any).responseBody) {
      errorMessage += " " + (error as any).responseBody;
    }
    // Check for statusCode
    if ((error as any).statusCode) {
      errorMessage += " " + (error as any).statusCode;
    }
  } else if (error?.message) {
    errorMessage = error.message;
  } else if (error?.error?.message) {
    errorMessage = error.error.message;
  } else {
    errorMessage = JSON.stringify(error);
  }

  // Find matching error pattern
  for (const pattern of ERROR_PATTERNS) {
    const matches = pattern.patterns.some((p) => p.test(errorMessage));
    if (matches) {
      return {
        category: pattern.category,
        title: pattern.title,
        message: pattern.messageTemplate.replace("{provider}", providerName),
        action: pattern.actionTemplate.replace("{provider}", providerName),
        keyUrl,
        provider: providerId,
        providerName,
      };
    }
  }

  // Default unknown error
  return {
    category: "unknown",
    title: "Request Failed",
    message: `An error occurred while communicating with ${providerName}: ${errorMessage}`,
    action: "Please check your API key and try again. If the problem persists, check the provider's status page.",
    keyUrl,
    provider: providerId,
    providerName,
  };
}

/**
 * Get a simple error message for display (without full details)
 */
export function getSimpleErrorMessage(
  providerId: ProviderId,
  error: Error | string | any
): string {
  const parsed = parseProviderError(providerId, error);
  return `${parsed.title}: ${parsed.message}`;
}

/**
 * Check if an error is related to invalid API key
 */
export function isApiKeyError(error: Error | string | any): boolean {
  const errorMessage = typeof error === "string" ? error : error?.message || "";
  return ERROR_PATTERNS[0].patterns.some((p) => p.test(errorMessage));
}
