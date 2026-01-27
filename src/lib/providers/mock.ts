// Mock provider for demo purposes (when no API key is configured)
// Returns static React component templates

import { createProviderRegistry } from "ai";
import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
  ProviderV3,
} from "@ai-sdk/provider";

function extractUserMessage(prompt: any[]): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    if (prompt[i].role === "user") {
      const content = prompt[i].content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        const textParts = content.filter((p: any) => p.type === "text");
        return textParts.map((p: any) => p.text).join(" ");
      }
    }
  }
  return "";
}

// Check if tool calls have already been made (look for tool results in prompt)
function hasToolResults(prompt: any[]): boolean {
  return prompt.some((msg: any) => msg.role === "tool");
}

function detectComponentType(message: string): "form" | "card" | "counter" {
  const lower = message.toLowerCase();
  if (lower.includes("form")) return "form";
  if (lower.includes("card")) return "card";
  return "counter";
}

function getComponentName(type: string): string {
  return type === "form" ? "ContactForm" : type === "card" ? "Card" : "Counter";
}

// V3 usage format helper
function createUsage(inputTotal: number, outputTotal: number) {
  return {
    inputTokens: { total: inputTotal, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: outputTotal, text: outputTotal, reasoning: undefined },
  };
}

// V3 finish reason format helper
function createFinishReason(unified: "stop" | "tool-calls" | "length" | "content-filter" | "error" | "other") {
  return { unified, raw: undefined };
}

function getMockResponse(type: string): string {
  return `I'll create a ${getComponentName(type)} component for you. Note: This is a static demo response. Add an API key in settings for real AI-powered component generation.`;
}

function getAppCode(type: string): string {
  const componentName = getComponentName(type);
  return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
}

function getComponentCode(type: string): string {
  switch (type) {
    case "form":
      return `import { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Form submitted! (Demo mode)');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

    case "card":
      return `const Card = ({
  title = "Welcome",
  description = "This is a demo card component"
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Learn More
      </button>
    </div>
  );
};

export default Card;`;

    default:
      return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Decrease
        </button>
        <button
          onClick={() => setCount(0)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Increase
        </button>
      </div>
    </div>
  );
};

export default Counter;`;
  }
}

// Create the mock provider implementation implementing ProviderV3
function createMockProvider(): ProviderV3 {
  return {
    specificationVersion: "v3" as const,

    languageModel: (modelId: string): LanguageModelV3 => {
      return {
        specificationVersion: "v3" as const,
        provider: "mock",
        modelId,
        supportedUrls: {},

        doGenerate: async (options: LanguageModelV3CallOptions): Promise<LanguageModelV3GenerateResult> => {
          const userMessage = extractUserMessage(options.prompt as any);
          const componentType = detectComponentType(userMessage);

          // If we've already made tool calls (tool results exist), just return completion text
          if (hasToolResults(options.prompt as any)) {
            const componentName = getComponentName(componentType);
            return {
              content: [
                { type: "text", text: `I've created the ${componentName} component. You can see it in the preview!` },
              ],
              finishReason: createFinishReason("stop"),
              usage: createUsage(100, 50),
              warnings: [],
            };
          }

          return {
            content: [
              { type: "text", text: getMockResponse(componentType) },
              {
                type: "tool-call",
                toolCallId: "call_mock_1",
                toolName: "str_replace_editor",
                input: JSON.stringify({
                  command: "create",
                  path: "/App.jsx",
                  file_text: getAppCode(componentType),
                }),
              },
              {
                type: "tool-call",
                toolCallId: "call_mock_2",
                toolName: "str_replace_editor",
                input: JSON.stringify({
                  command: "create",
                  path: `/components/${getComponentName(componentType)}.jsx`,
                  file_text: getComponentCode(componentType),
                }),
              },
            ],
            finishReason: createFinishReason("stop"),
            usage: createUsage(100, 200),
            warnings: [],
          };
        },

        doStream: async (options: LanguageModelV3CallOptions): Promise<LanguageModelV3StreamResult> => {
          const userMessage = extractUserMessage(options.prompt as any);
          const componentType = detectComponentType(userMessage);
          const alreadyHasToolResults = hasToolResults(options.prompt as any);

          const stream = new ReadableStream({
            async start(controller) {
              // If we've already made tool calls, just send completion message
              if (alreadyHasToolResults) {
                const componentName = getComponentName(componentType);
                const completionText = `I've created the ${componentName} component. You can see it in the preview!`;
                const textId = "text_1";
                controller.enqueue({ type: "text-start", id: textId });
                for (const char of completionText) {
                  controller.enqueue({ type: "text-delta", id: textId, delta: char });
                  await new Promise((resolve) => setTimeout(resolve, 15));
                }
                controller.enqueue({ type: "text-end", id: textId });
                controller.enqueue({
                  type: "finish",
                  finishReason: createFinishReason("stop"),
                  usage: createUsage(100, 50),
                });
                controller.close();
                return;
              }

              // First call: stream text and send tool calls
              const text = getMockResponse(componentType);
              const textId = "text_1";
              controller.enqueue({ type: "text-start", id: textId });
              for (const char of text) {
                controller.enqueue({ type: "text-delta", id: textId, delta: char });
                await new Promise((resolve) => setTimeout(resolve, 20));
              }
              controller.enqueue({ type: "text-end", id: textId });

              // Send tool calls as complete events (not start/input/end split)
              controller.enqueue({
                type: "tool-call",
                toolCallId: "call_mock_1",
                toolName: "str_replace_editor",
                input: JSON.stringify({
                  command: "create",
                  path: "/App.jsx",
                  file_text: getAppCode(componentType),
                }),
              });

              controller.enqueue({
                type: "tool-call",
                toolCallId: "call_mock_2",
                toolName: "str_replace_editor",
                input: JSON.stringify({
                  command: "create",
                  path: `/components/${getComponentName(componentType)}.jsx`,
                  file_text: getComponentCode(componentType),
                }),
              });

              // Send finish event
              controller.enqueue({
                type: "finish",
                finishReason: createFinishReason("stop"),
                usage: createUsage(100, 200),
              });

              controller.close();
            },
          });

          return { stream };
        },
      };
    },

    embeddingModel: () => {
      throw new Error("Embedding model not supported in mock provider");
    },

    textEmbeddingModel: () => {
      throw new Error("Text embedding model not supported in mock provider");
    },

    imageModel: () => {
      throw new Error("Image model not supported in mock provider");
    },
  };
}

// Get the mock language model
export function getMockLanguageModel() {
  console.log("No API key configured, using mock provider for demo");
  const registry = createProviderRegistry({
    mock: createMockProvider(),
  });
  return registry.languageModel("mock:demo");
}

// Export for testing
export { createMockProvider };
