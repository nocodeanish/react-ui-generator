// Multi-provider support for AI language models
// Supports: Anthropic, OpenAI, Google AI, OpenRouter, xAI (Grok)

import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { xai, createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";

import { PROVIDERS, type ProviderId, getDefaultModel } from "./providers";
import { getMockLanguageModel } from "./providers/mock";

// Create an OpenRouter client using OpenAI-compatible API
function createOpenRouterClient(apiKey: string) {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      "HTTP-Referer": "https://uigen.app",
      "X-Title": "React AI UI Generator",
    },
  });
}

/**
 * Get a language model for the specified provider
 * Falls back to mock provider if no API key is available
 */
export function getLanguageModel(
  providerId: ProviderId = "anthropic",
  modelId?: string,
  apiKey?: string
): LanguageModel {
  // Use default model if not specified
  const model = modelId || getDefaultModel(providerId);

  // If no API key provided, try environment variable
  const key = apiKey || process.env[PROVIDERS[providerId].envKey];

  // No API key available - use mock provider
  if (!key || key.trim() === "") {
    return getMockLanguageModel();
  }

  // Create provider-specific model
  // In AI SDK v6, use factory functions when custom API key is needed
  switch (providerId) {
    case "anthropic": {
      const provider = apiKey ? createAnthropic({ apiKey: key }) : anthropic;
      return provider(model);
    }

    case "openai": {
      const provider = apiKey ? createOpenAI({ apiKey: key }) : openai;
      return provider(model);
    }

    case "google": {
      const provider = apiKey ? createGoogleGenerativeAI({ apiKey: key }) : google;
      return provider(model);
    }

    case "openrouter": {
      // OpenRouter only supports Chat Completions API, not the Responses API
      // Use .chat() explicitly to use /chat/completions endpoint
      const client = createOpenRouterClient(key);
      return client.chat(model);
    }

    case "xai": {
      const provider = apiKey ? createXai({ apiKey: key }) : xai;
      return provider(model);
    }

    default:
      // Fallback to mock provider for unknown providers
      return getMockLanguageModel();
  }
}

/**
 * Check if a provider has an API key configured
 * Checks both environment variable and user settings key
 */
export function hasApiKey(providerId: ProviderId, userApiKey?: string): boolean {
  if (userApiKey && userApiKey.trim() !== "") {
    return true;
  }
  const envKey = process.env[PROVIDERS[providerId].envKey];
  return !!envKey && envKey.trim() !== "";
}

/**
 * Get the API key for a provider
 * Priority: userApiKey > environment variable
 */
export function getApiKey(providerId: ProviderId, userApiKey?: string): string | undefined {
  // User's key takes precedence
  if (userApiKey && userApiKey.trim() !== "") {
    return userApiKey;
  }
  // Fall back to environment variable
  const envKey = process.env[PROVIDERS[providerId].envKey];
  return envKey && envKey.trim() !== "" ? envKey : undefined;
}

/**
 * Check if the current configuration is using the mock provider
 */
export function isMockProvider(providerId: ProviderId, userApiKey?: string): boolean {
  return !hasApiKey(providerId, userApiKey);
}

/**
 * Get list of configured providers (those with API keys available)
 * Returns provider IDs that have either env or user API keys
 */
export function getConfiguredProviders(
  userApiKeys?: Record<string, string>
): ProviderId[] {
  const providerIds = Object.keys(PROVIDERS) as ProviderId[];
  return providerIds.filter((id) => {
    const userKey = userApiKeys?.[id];
    return hasApiKey(id, userKey);
  });
}

// Re-export types and utilities
export { PROVIDERS, type ProviderId } from "./providers";
