import { describe, test, expect } from "vitest";
import {
  PROVIDERS,
  getDefaultModel,
  getModelConfig,
  isValidProvider,
  getProviderIds,
  type ProviderId,
} from "../index";

describe("Providers Registry", () => {
  describe("PROVIDERS constant", () => {
    test("should have anthropic provider configured", () => {
      expect(PROVIDERS.anthropic).toBeDefined();
      expect(PROVIDERS.anthropic.name).toBe("Anthropic");
      expect(PROVIDERS.anthropic.envKey).toBe("ANTHROPIC_API_KEY");
      expect(PROVIDERS.anthropic.models.length).toBeGreaterThan(0);
      expect(PROVIDERS.anthropic.supportsTools).toBe(true);
    });

    test("should have openai provider configured", () => {
      expect(PROVIDERS.openai).toBeDefined();
      expect(PROVIDERS.openai.name).toBe("OpenAI");
      expect(PROVIDERS.openai.envKey).toBe("OPENAI_API_KEY");
      expect(PROVIDERS.openai.models.length).toBeGreaterThan(0);
      expect(PROVIDERS.openai.supportsTools).toBe(true);
    });

    test("should have google provider configured", () => {
      expect(PROVIDERS.google).toBeDefined();
      expect(PROVIDERS.google.name).toBe("Google AI");
      expect(PROVIDERS.google.envKey).toBe("GOOGLE_AI_API_KEY");
      expect(PROVIDERS.google.models.length).toBeGreaterThan(0);
    });

    test("should have openrouter provider configured", () => {
      expect(PROVIDERS.openrouter).toBeDefined();
      expect(PROVIDERS.openrouter.name).toBe("OpenRouter");
      expect(PROVIDERS.openrouter.envKey).toBe("OPENROUTER_API_KEY");
      expect(PROVIDERS.openrouter.models.length).toBeGreaterThan(0);
    });

    test("should have xai provider configured", () => {
      expect(PROVIDERS.xai).toBeDefined();
      expect(PROVIDERS.xai.name).toBe("xAI (Grok)");
      expect(PROVIDERS.xai.envKey).toBe("XAI_API_KEY");
      expect(PROVIDERS.xai.models.length).toBeGreaterThan(0);
    });

    test("each provider should have a default model that exists in their model list", () => {
      const providerIds = Object.keys(PROVIDERS) as ProviderId[];

      providerIds.forEach((providerId) => {
        const provider = PROVIDERS[providerId];
        const defaultModel = provider.default;
        const modelIds = provider.models.map((m) => m.id);

        expect(modelIds).toContain(defaultModel);
      });
    });

    test("all models should have required fields", () => {
      const providerIds = Object.keys(PROVIDERS) as ProviderId[];

      providerIds.forEach((providerId) => {
        PROVIDERS[providerId].models.forEach((model) => {
          expect(model).toHaveProperty("id");
          expect(model).toHaveProperty("name");
          expect(model).toHaveProperty("contextWindow");
          expect(typeof model.id).toBe("string");
          expect(typeof model.name).toBe("string");
          expect(typeof model.contextWindow).toBe("number");
          expect(model.contextWindow).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("getDefaultModel", () => {
    test("should return default model for anthropic", () => {
      const defaultModel = getDefaultModel("anthropic");
      expect(defaultModel).toBe(PROVIDERS.anthropic.default);
    });

    test("should return default model for openai", () => {
      const defaultModel = getDefaultModel("openai");
      expect(defaultModel).toBe(PROVIDERS.openai.default);
    });

    test("should return default model for google", () => {
      const defaultModel = getDefaultModel("google");
      expect(defaultModel).toBe(PROVIDERS.google.default);
    });

    test("should return default model for openrouter", () => {
      const defaultModel = getDefaultModel("openrouter");
      expect(defaultModel).toBe(PROVIDERS.openrouter.default);
    });

    test("should return default model for xai", () => {
      const defaultModel = getDefaultModel("xai");
      expect(defaultModel).toBe(PROVIDERS.xai.default);
    });

    test("returned default model should be a valid model ID", () => {
      const providerIds = Object.keys(PROVIDERS) as ProviderId[];

      providerIds.forEach((providerId) => {
        const defaultModel = getDefaultModel(providerId);
        const modelConfig = getModelConfig(providerId, defaultModel);
        expect(modelConfig).toBeDefined();
      });
    });
  });

  describe("getModelConfig", () => {
    test("should return model config for valid model ID", () => {
      const config = getModelConfig("anthropic", "claude-sonnet-4-20250514");

      expect(config).toBeDefined();
      expect(config?.id).toBe("claude-sonnet-4-20250514");
      expect(config?.name).toBe("Claude Sonnet 4");
      expect(config?.contextWindow).toBe(200000);
    });

    test("should return undefined for invalid model ID", () => {
      const config = getModelConfig("anthropic", "non-existent-model");
      expect(config).toBeUndefined();
    });

    test("should return model config for openai model", () => {
      const config = getModelConfig("openai", "gpt-4o");

      expect(config).toBeDefined();
      expect(config?.name).toBe("GPT-4o");
    });

    test("should return model config for google model", () => {
      const config = getModelConfig("google", "gemini-2.0-flash");

      expect(config).toBeDefined();
      expect(config?.name).toBe("Gemini 2.0 Flash");
    });

    test("should return model config for openrouter model", () => {
      const config = getModelConfig("openrouter", "anthropic/claude-3.5-sonnet");

      expect(config).toBeDefined();
      expect(config?.name).toBe("Claude 3.5 Sonnet");
    });

    test("should return model config for xai model", () => {
      const config = getModelConfig("xai", "grok-2");

      expect(config).toBeDefined();
      expect(config?.name).toBe("Grok 2");
    });

    test("should work with all provider default models", () => {
      const providerIds = Object.keys(PROVIDERS) as ProviderId[];

      providerIds.forEach((providerId) => {
        const defaultModelId = getDefaultModel(providerId);
        const config = getModelConfig(providerId, defaultModelId);

        expect(config).toBeDefined();
        expect(config?.id).toBe(defaultModelId);
      });
    });
  });

  describe("isValidProvider", () => {
    test("should return true for valid provider IDs", () => {
      expect(isValidProvider("anthropic")).toBe(true);
      expect(isValidProvider("openai")).toBe(true);
      expect(isValidProvider("google")).toBe(true);
      expect(isValidProvider("openrouter")).toBe(true);
      expect(isValidProvider("xai")).toBe(true);
    });

    test("should return false for invalid provider IDs", () => {
      expect(isValidProvider("invalid")).toBe(false);
      expect(isValidProvider("")).toBe(false);
      expect(isValidProvider("ANTHROPIC")).toBe(false); // Case sensitive
      expect(isValidProvider("claude")).toBe(false);
      expect(isValidProvider("gpt")).toBe(false);
    });

    test("should act as type guard", () => {
      const maybeProvider: string = "anthropic";

      if (isValidProvider(maybeProvider)) {
        // TypeScript should recognize this as ProviderId
        const provider = PROVIDERS[maybeProvider];
        expect(provider).toBeDefined();
      }
    });
  });

  describe("getProviderIds", () => {
    test("should return all provider IDs", () => {
      const ids = getProviderIds();

      expect(ids).toContain("anthropic");
      expect(ids).toContain("openai");
      expect(ids).toContain("google");
      expect(ids).toContain("openrouter");
      expect(ids).toContain("xai");
    });

    test("should return exactly 5 providers", () => {
      const ids = getProviderIds();
      expect(ids).toHaveLength(5);
    });

    test("returned IDs should all be valid", () => {
      const ids = getProviderIds();

      ids.forEach((id) => {
        expect(isValidProvider(id)).toBe(true);
      });
    });

    test("should return array of strings", () => {
      const ids = getProviderIds();

      ids.forEach((id) => {
        expect(typeof id).toBe("string");
      });
    });
  });

  describe("Provider model details", () => {
    test("anthropic models should have Claude in their names", () => {
      PROVIDERS.anthropic.models.forEach((model) => {
        expect(model.name).toContain("Claude");
      });
    });

    test("openai models should have GPT in their names", () => {
      PROVIDERS.openai.models.forEach((model) => {
        expect(model.name).toContain("GPT");
      });
    });

    test("google models should have Gemini in their names", () => {
      PROVIDERS.google.models.forEach((model) => {
        expect(model.name).toContain("Gemini");
      });
    });

    test("xai models should have Grok in their names", () => {
      PROVIDERS.xai.models.forEach((model) => {
        expect(model.name).toContain("Grok");
      });
    });

    test("context windows should be reasonable values", () => {
      const providerIds = Object.keys(PROVIDERS) as ProviderId[];

      providerIds.forEach((providerId) => {
        PROVIDERS[providerId].models.forEach((model) => {
          // Context windows should be at least 8k tokens
          expect(model.contextWindow).toBeGreaterThanOrEqual(8000);
          // And not unreasonably large (under 10M for now)
          expect(model.contextWindow).toBeLessThanOrEqual(10000000);
        });
      });
    });
  });
});
