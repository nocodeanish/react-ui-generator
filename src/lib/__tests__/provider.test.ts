import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getLanguageModel, isMockProvider, hasApiKey, getConfiguredProviders } from "../provider";
import { PROVIDERS, type ProviderId } from "../providers";

describe("Provider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all provider API keys
    Object.values(PROVIDERS).forEach((config) => {
      delete process.env[config.envKey];
    });
  });

  afterEach(() => {
    // Restore original environment
    Object.values(PROVIDERS).forEach((config) => {
      if (originalEnv[config.envKey] !== undefined) {
        process.env[config.envKey] = originalEnv[config.envKey];
      } else {
        delete process.env[config.envKey];
      }
    });
  });

  describe("Mock Provider (No API Key)", () => {
    test("should return mock provider when no API key is set", () => {
      const model = getLanguageModel();
      expect(model).toBeDefined();
      expect(model.provider).toBe("mock");
    });

    test("should return mock provider when ANTHROPIC_API_KEY is empty string", () => {
      process.env.ANTHROPIC_API_KEY = "";
      const model = getLanguageModel("anthropic");
      expect(model).toBeDefined();
      expect(model.provider).toBe("mock");
    });

    test("should return mock provider when ANTHROPIC_API_KEY is whitespace", () => {
      process.env.ANTHROPIC_API_KEY = "   ";
      const model = getLanguageModel("anthropic");
      expect(model).toBeDefined();
      expect(model.provider).toBe("mock");
    });

    test("mock provider should have correct specification version v1", () => {
      const model = getLanguageModel();
      expect(model.specificationVersion).toBe("v1");
    });

    test("mock provider should have doGenerate method", () => {
      const model = getLanguageModel();
      expect(model.doGenerate).toBeDefined();
      expect(typeof model.doGenerate).toBe("function");
    });

    test("mock provider should have doStream method", () => {
      const model = getLanguageModel();
      expect(model.doStream).toBeDefined();
      expect(typeof model.doStream).toBe("function");
    });

    describe("doGenerate", () => {
      test("should return text and tool calls for counter component", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        expect(result.text).toContain("Counter");
        expect(result.text).toContain("demo");
        expect(result.toolCalls).toBeDefined();
        expect(result.toolCalls).toHaveLength(2);
      });

      test("should return tool calls with JSON string args, not objects", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        // Args should be JSON strings that can be parsed
        expect(typeof result.toolCalls[0].args).toBe("string");
        expect(typeof result.toolCalls[1].args).toBe("string");

        // Should be parseable JSON
        const args1 = JSON.parse(result.toolCalls[0].args);
        const args2 = JSON.parse(result.toolCalls[1].args);

        expect(args1).toHaveProperty("command", "create");
        expect(args2).toHaveProperty("command", "create");
      });

      test("tool calls should have correct structure", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "make a form" }] }],
        });

        result.toolCalls.forEach((toolCall) => {
          expect(toolCall).toHaveProperty("toolCallType", "function");
          expect(toolCall).toHaveProperty("toolCallId");
          expect(toolCall).toHaveProperty("toolName", "str_replace_editor");
          expect(toolCall).toHaveProperty("args");
          expect(typeof toolCall.args).toBe("string");
        });
      });

      test("should create App.jsx and Counter.jsx for counter request", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const args1 = JSON.parse(result.toolCalls[0].args);
        const args2 = JSON.parse(result.toolCalls[1].args);

        expect(args1.path).toBe("/App.jsx");
        expect(args2.path).toBe("/components/Counter.jsx");
      });

      test("should detect 'form' component type from message", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "make a contact form" }] }],
        });

        expect(result.text).toContain("ContactForm");
        const args = JSON.parse(result.toolCalls[1].args);
        expect(args.path).toBe("/components/ContactForm.jsx");
      });

      test("should detect 'card' component type from message", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "build a card component" }] }],
        });

        expect(result.text).toContain("Card");
        const args = JSON.parse(result.toolCalls[1].args);
        expect(args.path).toBe("/components/Card.jsx");
      });

      test("should default to 'counter' for unrecognized requests", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "something random" }] }],
        });

        expect(result.text).toContain("Counter");
        const args = JSON.parse(result.toolCalls[1].args);
        expect(args.path).toBe("/components/Counter.jsx");
      });

      test("should include finish reason and usage stats", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        expect(result.finishReason).toBe("stop");
        expect(result.usage).toHaveProperty("promptTokens", 100);
        expect(result.usage).toHaveProperty("completionTokens", 200);
      });

      test("should include rawCall information", async () => {
        const model = getLanguageModel();
        const prompt = [{ role: "user", content: [{ type: "text", text: "create a counter" }] }];
        const result = await model.doGenerate({ prompt });

        expect(result.rawCall).toHaveProperty("rawPrompt", prompt);
        expect(result.rawCall).toHaveProperty("rawSettings");
      });
    });

    describe("doStream", () => {
      test("should return stream with correct structure", async () => {
        const model = getLanguageModel();
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        expect(result).toHaveProperty("stream");
        expect(result).toHaveProperty("warnings");
        expect(result).toHaveProperty("rawCall");
        expect(result.warnings).toEqual([]);
      });

      test("stream should emit text-delta events", async () => {
        const model = getLanguageModel();
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const reader = result.stream.getReader();
        const firstChunk = await reader.read();
        reader.releaseLock();

        expect(firstChunk.value).toHaveProperty("type", "text-delta");
        expect(firstChunk.value).toHaveProperty("textDelta");
        expect(typeof firstChunk.value.textDelta).toBe("string");
      });

      test("stream should emit tool-call events with JSON string args", async () => {
        const model = getLanguageModel();
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const chunks: any[] = [];
        const reader = result.stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        const toolCalls = chunks.filter((chunk) => chunk.type === "tool-call");
        expect(toolCalls.length).toBeGreaterThan(0);

        toolCalls.forEach((toolCall) => {
          expect(toolCall).toHaveProperty("toolCallType", "function");
          expect(toolCall).toHaveProperty("toolCallId");
          expect(toolCall).toHaveProperty("toolName", "str_replace_editor");
          expect(toolCall).toHaveProperty("args");
          expect(typeof toolCall.args).toBe("string");

          // Should be valid JSON
          const args = JSON.parse(toolCall.args);
          expect(args).toHaveProperty("command");
          expect(args).toHaveProperty("path");
          expect(args).toHaveProperty("file_text");
        });
      });

      test("stream should emit finish event", async () => {
        const model = getLanguageModel();
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const chunks: any[] = [];
        const reader = result.stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        const finishEvents = chunks.filter((chunk) => chunk.type === "finish");
        expect(finishEvents).toHaveLength(1);

        const finishEvent = finishEvents[0];
        expect(finishEvent).toHaveProperty("finishReason", "stop");
        expect(finishEvent).toHaveProperty("usage");
        expect(finishEvent.usage).toHaveProperty("promptTokens");
        expect(finishEvent.usage).toHaveProperty("completionTokens");
      });

      test("stream should not emit encoded strings (SSE format)", async () => {
        const model = getLanguageModel();
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const reader = result.stream.getReader();
        const firstChunk = await reader.read();
        reader.releaseLock();

        // Should be object, not Uint8Array or string with SSE format
        expect(typeof firstChunk.value).toBe("object");
        expect(firstChunk.value).not.toBeInstanceOf(Uint8Array);
        expect(firstChunk.value).toHaveProperty("type");
      });

      test("stream events should follow LanguageModelV1StreamPart format", async () => {
        const model = getLanguageModel();
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const chunks: any[] = [];
        const reader = result.stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        const validTypes = ["text-delta", "tool-call", "finish"];
        chunks.forEach((chunk) => {
          expect(validTypes).toContain(chunk.type);
        });
      });
    });

    describe("Component Detection", () => {
      test("should detect counter from various phrasings", async () => {
        const phrases = [
          "create a counter",
          "make a counter component",
          "build counter",
          "I need a counter",
        ];

        const model = getLanguageModel();

        for (const phrase of phrases) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: phrase }] }],
          });

          const args = JSON.parse(result.toolCalls[1].args);
          expect(args.path).toContain("Counter");
        }
      });

      test("should detect form from various phrasings", async () => {
        const phrases = [
          "create a form",
          "make a contact form",
          "build a form component",
          "I need a form",
        ];

        const model = getLanguageModel();

        for (const phrase of phrases) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: phrase }] }],
          });

          const args = JSON.parse(result.toolCalls[1].args);
          expect(args.path).toContain("ContactForm");
        }
      });

      test("should detect card from various phrasings", async () => {
        const phrases = [
          "create a card",
          "make a card component",
          "build card",
          "I need a card",
        ];

        const model = getLanguageModel();

        for (const phrase of phrases) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: phrase }] }],
          });

          const args = JSON.parse(result.toolCalls[1].args);
          expect(args.path).toContain("Card");
        }
      });

      test("should be case-insensitive", async () => {
        const model = getLanguageModel();

        const result1 = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "CREATE A FORM" }] }],
        });

        const result2 = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a form" }] }],
        });

        const args1 = JSON.parse(result1.toolCalls[1].args);
        const args2 = JSON.parse(result2.toolCalls[1].args);

        expect(args1.path).toBe(args2.path);
      });
    });

    describe("Generated Code Quality", () => {
      test("counter component should include useState", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const args = JSON.parse(result.toolCalls[1].args);
        expect(args.file_text).toContain("useState");
        expect(args.file_text).toContain("setCount");
      });

      test("counter component should have all three buttons", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const args = JSON.parse(result.toolCalls[1].args);
        expect(args.file_text).toContain("Decrease");
        expect(args.file_text).toContain("Reset");
        expect(args.file_text).toContain("Increase");
      });

      test("form component should include form fields", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "make a form" }] }],
        });

        const args = JSON.parse(result.toolCalls[1].args);
        expect(args.file_text).toContain("name");
        expect(args.file_text).toContain("email");
        expect(args.file_text).toContain("message");
      });

      test("all components should use Tailwind CSS", async () => {
        const model = getLanguageModel();
        const components = ["counter", "form", "card"];

        for (const component of components) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: `create a ${component}` }] }],
          });

          const args = JSON.parse(result.toolCalls[1].args);
          expect(args.file_text).toContain("className=");
        }
      });

      test("App.jsx should import component with @/ alias", async () => {
        const model = getLanguageModel();
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        });

        const appArgs = JSON.parse(result.toolCalls[0].args);
        expect(appArgs.file_text).toContain("@/components/");
      });
    });
  });

  describe("Real Provider (With API Key)", () => {
    test("should return anthropic provider when ANTHROPIC_API_KEY is set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-123";
      const model = getLanguageModel("anthropic");

      expect(model).toBeDefined();
      // Anthropic provider returns "anthropic.messages" as provider name
      expect(model.provider).toContain("anthropic");
    });

    test("should not return mock provider when valid API key exists", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-api-key-valid";
      const model = getLanguageModel("anthropic");

      expect(model.provider).not.toBe("mock");
    });

    test("should use passed API key over environment variable", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-env-key";
      const model = getLanguageModel("anthropic", undefined, "sk-ant-passed-key");

      expect(model).toBeDefined();
      expect(model.provider).toContain("anthropic");
    });
  });

  describe("Multi-Provider Support", () => {
    test("should return mock for OpenAI provider without API key", () => {
      const model = getLanguageModel("openai");
      expect(model.provider).toBe("mock");
    });

    test("should return OpenAI provider when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const model = getLanguageModel("openai");
      expect(model.provider).toContain("openai");
    });

    test("should return Google provider when GOOGLE_AI_API_KEY is set", () => {
      process.env.GOOGLE_AI_API_KEY = "test-google-key";
      const model = getLanguageModel("google");
      expect(model.provider).toContain("google");
    });

    test("should return xAI provider when XAI_API_KEY is set", () => {
      process.env.XAI_API_KEY = "xai-test-key";
      const model = getLanguageModel("xai");
      expect(model.provider).toContain("xai");
    });
  });

  describe("Utility Functions", () => {
    test("hasApiKey should return false when no key is set", () => {
      expect(hasApiKey("anthropic")).toBe(false);
      expect(hasApiKey("openai")).toBe(false);
    });

    test("hasApiKey should return true when env key is set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-key";
      expect(hasApiKey("anthropic")).toBe(true);
    });

    test("hasApiKey should return true when user key is provided", () => {
      expect(hasApiKey("anthropic", "sk-ant-user-key")).toBe(true);
    });

    test("isMockProvider should return true when no API key", () => {
      expect(isMockProvider("anthropic")).toBe(true);
    });

    test("isMockProvider should return false when API key exists", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-key";
      expect(isMockProvider("anthropic")).toBe(false);
    });

    test("getConfiguredProviders should return empty array when no keys", () => {
      expect(getConfiguredProviders()).toEqual([]);
    });

    test("getConfiguredProviders should return providers with env keys", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-key";
      process.env.OPENAI_API_KEY = "sk-openai-key";
      const configured = getConfiguredProviders();
      expect(configured).toContain("anthropic");
      expect(configured).toContain("openai");
    });

    test("getConfiguredProviders should include user-configured providers", () => {
      const userKeys = { google: "user-google-key" };
      const configured = getConfiguredProviders(userKeys);
      expect(configured).toContain("google");
    });
  });
});
