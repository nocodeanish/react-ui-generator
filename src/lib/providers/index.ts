// Provider registry - defines all supported AI providers
// Each provider has a name, available models, default model, and env key

export const PROVIDERS = {
  anthropic: {
    name: "Anthropic",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000 },
      { id: "claude-haiku-4-5-20250514", name: "Claude Haiku 4.5", contextWindow: 200000 },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000 },
    ],
    default: "claude-sonnet-4-20250514",
    envKey: "ANTHROPIC_API_KEY",
    supportsTools: true,
  },
  openai: {
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000 },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000 },
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 16385 },
    ],
    default: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    supportsTools: true,
  },
  google: {
    name: "Google AI",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000 },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 1000000 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1000000 },
    ],
    default: "gemini-2.0-flash",
    envKey: "GOOGLE_AI_API_KEY",
    supportsTools: true,
  },
  openrouter: {
    name: "OpenRouter",
    models: [
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", contextWindow: 200000 },
      { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000 },
      { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", contextWindow: 1000000 },
      { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", contextWindow: 131072 },
    ],
    default: "anthropic/claude-3.5-sonnet",
    envKey: "OPENROUTER_API_KEY",
    supportsTools: true,
  },
  xai: {
    name: "xAI (Grok)",
    models: [
      { id: "grok-2", name: "Grok 2", contextWindow: 131072 },
      { id: "grok-2-mini", name: "Grok 2 Mini", contextWindow: 131072 },
    ],
    default: "grok-2-mini",
    envKey: "XAI_API_KEY",
    supportsTools: true,
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;
export type ProviderConfig = (typeof PROVIDERS)[ProviderId];
export type ModelConfig = ProviderConfig["models"][number];

// Get the default model for a provider
export function getDefaultModel(providerId: ProviderId): string {
  return PROVIDERS[providerId].default;
}

// Get model config by ID
export function getModelConfig(
  providerId: ProviderId,
  modelId: string
): ModelConfig | undefined {
  const provider = PROVIDERS[providerId];
  return provider.models.find((m) => m.id === modelId);
}

// Check if a provider ID is valid
export function isValidProvider(id: string): id is ProviderId {
  return id in PROVIDERS;
}

// Get all provider IDs
export function getProviderIds(): ProviderId[] {
  return Object.keys(PROVIDERS) as ProviderId[];
}
