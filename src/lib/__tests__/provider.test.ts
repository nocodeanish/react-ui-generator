import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { getLanguageModel, isMockProvider, hasApiKey, getConfiguredProviders } from "../provider";
import { PROVIDERS, type ProviderId } from "../providers";
import type { LanguageModelV3 } from "@ai-sdk/provider";

// Helper types for test assertions
type TextContent = { type: "text"; text: string };
type ToolCallContent = { type: "tool-call"; toolCallId: string; toolName: string; input: string };

// Helper to parse tool call input
function parseToolInput(toolCall: ToolCallContent): Record<string, any> {
  return JSON.parse(toolCall.input);
}

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
      // In AI SDK v6, model can be a string or LanguageModelV3
      expect(typeof model === "string" || (model as LanguageModelV3).provider === "mock").toBe(true);
    });

    test("should return mock provider when ANTHROPIC_API_KEY is empty string", () => {
      process.env.ANTHROPIC_API_KEY = "";
      const model = getLanguageModel("anthropic");
      expect(model).toBeDefined();
      expect(typeof model === "string" || (model as LanguageModelV3).provider === "mock").toBe(true);
    });

    test("should return mock provider when ANTHROPIC_API_KEY is whitespace", () => {
      process.env.ANTHROPIC_API_KEY = "   ";
      const model = getLanguageModel("anthropic");
      expect(model).toBeDefined();
      expect(typeof model === "string" || (model as LanguageModelV3).provider === "mock").toBe(true);
    });

    test("mock provider should have correct specification version v3", () => {
      const model = getLanguageModel() as LanguageModelV3;
      expect(model.specificationVersion).toBe("v3");
    });

    test("mock provider should have doGenerate method", () => {
      const model = getLanguageModel() as LanguageModelV3;
      expect(model.doGenerate).toBeDefined();
      expect(typeof model.doGenerate).toBe("function");
    });

    test("mock provider should have doStream method", () => {
      const model = getLanguageModel() as LanguageModelV3;
      expect(model.doStream).toBeDefined();
      expect(typeof model.doStream).toBe("function");
    });

    describe("doGenerate", () => {
      test("should return content array with text and tool calls for counter component", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        // AI SDK v6 returns content array
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);

        // Find text content
        const textParts = result.content.filter((c) => c.type === "text") as { type: "text"; text: string }[];
        expect(textParts.length).toBeGreaterThan(0);
        expect(textParts[0].text).toContain("Counter");
        expect(textParts[0].text).toContain("demo");

        // Find tool call content
        const toolCalls = result.content.filter((c) => c.type === "tool-call");
        expect(toolCalls).toHaveLength(2);
      });

      test("should return tool calls with input as JSON string (v3 format)", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];

        // V3 format: input is a JSON string
        expect(typeof toolCalls[0].input).toBe("string");
        expect(parseToolInput(toolCalls[0])).toHaveProperty("command", "create");
        expect(parseToolInput(toolCalls[1])).toHaveProperty("command", "create");
      });

      test("tool calls should have correct v3 structure", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "make a form" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];

        toolCalls.forEach((toolCall) => {
          expect(toolCall).toHaveProperty("type", "tool-call");
          expect(toolCall).toHaveProperty("toolCallId");
          expect(toolCall).toHaveProperty("toolName", "str_replace_editor");
          expect(toolCall).toHaveProperty("input");
          expect(typeof toolCall.input).toBe("string");
          // Verify input parses to valid object
          const parsed = parseToolInput(toolCall);
          expect(parsed).toHaveProperty("command");
        });
      });

      test("should create App.jsx and Counter.jsx for counter request", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];

        expect(parseToolInput(toolCalls[0]).path).toBe("/App.jsx");
        expect(parseToolInput(toolCalls[1]).path).toBe("/components/Counter.jsx");
      });

      test("should detect 'form' component type from message", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "make a contact form" }] }],
        } as any);

        const textParts = result.content.filter((c) => c.type === "text") as TextContent[];
        expect(textParts[0].text).toContain("ContactForm");

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[1]).path).toBe("/components/ContactForm.jsx");
      });

      test("should detect 'card' component type from message", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "build a card component" }] }],
        } as any);

        const textParts = result.content.filter((c) => c.type === "text") as TextContent[];
        expect(textParts[0].text).toContain("Card");

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[1]).path).toBe("/components/Card.jsx");
      });

      test("should default to 'counter' for unrecognized requests", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "something random" }] }],
        } as any);

        const textParts = result.content.filter((c) => c.type === "text") as TextContent[];
        expect(textParts[0].text).toContain("Counter");

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[1]).path).toBe("/components/Counter.jsx");
      });

      test("should include finish reason and usage stats", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        // v3 API: finishReason is object with unified/raw properties
        expect(result.finishReason).toEqual({ unified: "stop", raw: undefined });
        expect(result.usage).toHaveProperty("inputTokens");
        expect(result.usage).toHaveProperty("outputTokens");
      });
    });

    describe("doStream", () => {
      test("should return stream with correct structure", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        expect(result).toHaveProperty("stream");
      });

      test("stream should emit text-start and text-delta events (v3 format)", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const chunks: any[] = [];
        const reader = result.stream.getReader();

        try {
          // Read first few chunks to check format
          for (let i = 0; i < 5; i++) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        // V3 format: text-start, text-delta, text-end
        const textStart = chunks.find(c => c.type === "text-start");
        const textDelta = chunks.find(c => c.type === "text-delta");

        expect(textStart).toBeDefined();
        expect(textStart).toHaveProperty("id");

        expect(textDelta).toBeDefined();
        expect(textDelta).toHaveProperty("id");
        expect(textDelta).toHaveProperty("delta");
      });

      test("stream should emit tool-call events in v3 format", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

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

        // V3 format: complete tool-call events (for UI streaming compatibility)
        const toolCalls = chunks.filter(c => c.type === "tool-call");

        expect(toolCalls.length).toBeGreaterThan(0);

        // Check structure
        toolCalls.forEach((tc: any) => {
          expect(tc).toHaveProperty("toolCallId");
          expect(tc).toHaveProperty("toolName", "str_replace_editor");
          expect(tc).toHaveProperty("input");
        });
      });

      test("stream should emit finish event", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

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
        // v3 API: finishReason is object with unified/raw properties
        expect(finishEvent).toHaveProperty("finishReason");
        expect(finishEvent.finishReason).toEqual({ unified: "stop", raw: undefined });
        expect(finishEvent).toHaveProperty("usage");
        expect(finishEvent.usage).toHaveProperty("inputTokens");
        expect(finishEvent.usage).toHaveProperty("outputTokens");
      });

      test("stream should not emit encoded strings (SSE format)", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const reader = result.stream.getReader();
        const firstChunk = await reader.read();
        reader.releaseLock();

        // Should be object, not Uint8Array or string with SSE format
        expect(typeof firstChunk.value).toBe("object");
        expect(firstChunk.value).not.toBeInstanceOf(Uint8Array);
        expect(firstChunk.value).toHaveProperty("type");
      });

      test("stream events should follow LanguageModelV3StreamPart format", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doStream({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

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

        // V3 valid types (tool-call is used for complete tool calls in streaming)
        const validTypes = [
          "text-start", "text-delta", "text-end",
          "tool-call",
          "finish"
        ];
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

        const model = getLanguageModel() as LanguageModelV3;

        for (const phrase of phrases) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: phrase }] }],
          } as any);

          const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
          expect(parseToolInput(toolCalls[1]).path).toContain("Counter");
        }
      });

      test("should detect form from various phrasings", async () => {
        const phrases = [
          "create a form",
          "make a contact form",
          "build a form component",
          "I need a form",
        ];

        const model = getLanguageModel() as LanguageModelV3;

        for (const phrase of phrases) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: phrase }] }],
          } as any);

          const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
          expect(parseToolInput(toolCalls[1]).path).toContain("ContactForm");
        }
      });

      test("should detect card from various phrasings", async () => {
        const phrases = [
          "create a card",
          "make a card component",
          "build card",
          "I need a card",
        ];

        const model = getLanguageModel() as LanguageModelV3;

        for (const phrase of phrases) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: phrase }] }],
          } as any);

          const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
          expect(parseToolInput(toolCalls[1]).path).toContain("Card");
        }
      });

      test("should be case-insensitive", async () => {
        const model = getLanguageModel() as LanguageModelV3;

        const result1 = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "CREATE A FORM" }] }],
        } as any);

        const result2 = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a form" }] }],
        } as any);

        const toolCalls1 = result1.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        const toolCalls2 = result2.content.filter((c) => c.type === "tool-call") as ToolCallContent[];

        expect(parseToolInput(toolCalls1[1]).path).toBe(parseToolInput(toolCalls2[1]).path);
      });
    });

    describe("Generated Code Quality", () => {
      test("counter component should include useState", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[1]).file_text).toContain("useState");
        expect(parseToolInput(toolCalls[1]).file_text).toContain("setCount");
      });

      test("counter component should have all three buttons", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[1]).file_text).toContain("Decrease");
        expect(parseToolInput(toolCalls[1]).file_text).toContain("Reset");
        expect(parseToolInput(toolCalls[1]).file_text).toContain("Increase");
      });

      test("form component should include form fields", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "make a form" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[1]).file_text).toContain("name");
        expect(parseToolInput(toolCalls[1]).file_text).toContain("email");
        expect(parseToolInput(toolCalls[1]).file_text).toContain("message");
      });

      test("all components should use Tailwind CSS", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const components = ["counter", "form", "card"];

        for (const component of components) {
          const result = await model.doGenerate({
            prompt: [{ role: "user", content: [{ type: "text", text: `create a ${component}` }] }],
          } as any);

          const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
          expect(parseToolInput(toolCalls[1]).file_text).toContain("className=");
        }
      });

      test("App.jsx should import component with @/ alias", async () => {
        const model = getLanguageModel() as LanguageModelV3;
        const result = await model.doGenerate({
          prompt: [{ role: "user", content: [{ type: "text", text: "create a counter" }] }],
        } as any);

        const toolCalls = result.content.filter((c) => c.type === "tool-call") as ToolCallContent[];
        expect(parseToolInput(toolCalls[0]).file_text).toContain("@/components/");
      });
    });
  });

  describe("Real Provider (With API Key)", () => {
    test("should return anthropic provider when ANTHROPIC_API_KEY is set", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-test-key-123";
      const model = getLanguageModel("anthropic") as LanguageModelV3;

      expect(model).toBeDefined();
      // Anthropic provider returns "anthropic.messages" as provider name
      expect(model.provider).toContain("anthropic");
    });

    test("should not return mock provider when valid API key exists", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-api-key-valid";
      const model = getLanguageModel("anthropic") as LanguageModelV3;

      expect(model.provider).not.toBe("mock");
    });

    test("should use passed API key over environment variable", () => {
      process.env.ANTHROPIC_API_KEY = "sk-ant-env-key";
      const model = getLanguageModel("anthropic", undefined, "sk-ant-passed-key") as LanguageModelV3;

      expect(model).toBeDefined();
      expect(model.provider).toContain("anthropic");
    });
  });

  describe("Multi-Provider Support", () => {
    test("should return mock for OpenAI provider without API key", () => {
      const model = getLanguageModel("openai") as LanguageModelV3;
      expect(model.provider).toBe("mock");
    });

    test("should return OpenAI provider when OPENAI_API_KEY is set", () => {
      process.env.OPENAI_API_KEY = "sk-test-openai-key";
      const model = getLanguageModel("openai") as LanguageModelV3;
      expect(model.provider).toContain("openai");
    });

    test("should return Google provider when GOOGLE_AI_API_KEY is set", () => {
      process.env.GOOGLE_AI_API_KEY = "test-google-key";
      const model = getLanguageModel("google") as LanguageModelV3;
      expect(model.provider).toContain("google");
    });

    test("should return xAI provider when XAI_API_KEY is set", () => {
      process.env.XAI_API_KEY = "xai-test-key";
      const model = getLanguageModel("xai") as LanguageModelV3;
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
