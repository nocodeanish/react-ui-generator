import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel, isMockProvider, PROVIDERS, type ProviderId } from "@/lib/provider";
import { isValidProvider } from "@/lib/providers";
import { generationPrompt } from "@/lib/prompts/generation";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { decryptApiKeys } from "@/lib/crypto";

// POST handler for chat messages
// Receives: messages array, serialized file state, optional projectId, provider, model
// Returns: Server-sent events stream with text and tool calls
export async function POST(req: Request) {
  // Security: Validate content-type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return new Response("Invalid content type", { status: 415 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const {
    messages,
    files,
    projectId,
    provider: requestedProvider,
    model: requestedModel,
  }: {
    messages: any[];
    files: Record<string, FileNode>;
    projectId?: string;
    provider?: string;
    model?: string;
  } = body;

  // Validate input
  if (!Array.isArray(messages)) {
    return new Response("Invalid messages format", { status: 400 });
  }

  if (!files || typeof files !== "object") {
    return new Response("Invalid files format", { status: 400 });
  }

  // Validate provider if specified
  const providerId: ProviderId = (requestedProvider && isValidProvider(requestedProvider))
    ? requestedProvider
    : "anthropic";

  // Rate limiting: Apply stricter limits for anonymous users
  const session = await getSession();
  if (!session) {
    // Anonymous users: 10 requests per hour
    const clientIP = getClientIP(req.headers);
    const rateLimitResult = rateLimit(`chat-anon:${clientIP}`, {
      limit: 10,
      window: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please sign in for unlimited access.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Get user's API key from settings (if authenticated)
  let userApiKey: string | undefined;
  if (session) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });

      console.log("[Chat] User settings found:", !!settings, "apiKeys present:", !!settings?.apiKeys);

      if (settings?.apiKeys && settings.apiKeys !== "{}") {
        const userKeys = decryptApiKeys(settings.apiKeys);
        console.log("[Chat] Decrypted keys for providers:", Object.keys(userKeys));
        userApiKey = userKeys[providerId];
        console.log("[Chat] User API key for", providerId, "found:", !!userApiKey);
      }
    } catch (error) {
      console.error("[Chat] Failed to read user settings:", error);
    }
  } else {
    console.log("[Chat] No session, skipping user settings");
  }

  // Check if API key is available
  const envKey = process.env[PROVIDERS[providerId].envKey];
  const apiKey = userApiKey || envKey;
  const isUsingMock = isMockProvider(providerId, userApiKey);

  console.log("[Chat] Provider:", providerId, "envKey present:", !!envKey, "userApiKey present:", !!userApiKey, "using mock:", isUsingMock);

  // If no API key for the selected provider, return error
  if (!apiKey && !isUsingMock) {
    return new Response(
      JSON.stringify({
        error: `No API key configured for ${PROVIDERS[providerId].name}. Add one in settings or select a different provider.`,
        errorType: "missing_key",
        provider: providerId,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Build provider-specific options for system message
  const providerOptions: Record<string, any> = {};
  if (providerId === "anthropic") {
    providerOptions.anthropic = { cacheControl: { type: "ephemeral" } };
  }

  // Prepend system prompt with provider-specific options
  messages.unshift({
    role: "system",
    content: generationPrompt,
    ...(Object.keys(providerOptions).length > 0 && { providerOptions }),
  });

  // Reconstruct VirtualFileSystem from serialized state sent by client
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files);

  // Get language model for the specified provider
  const model = getLanguageModel(providerId, requestedModel, apiKey);

  // Filter and clean messages for mock provider
  // Mock provider doesn't support tool messages or complex content formats
  let filteredMessages = messages;
  if (isUsingMock) {
    filteredMessages = messages
      .filter((m: any) => m.role !== "tool") // Remove tool result messages
      .map((m: any) => {
        // For assistant messages with parts/content arrays, extract just the text
        if (m.role === "assistant") {
          let textContent = "";

          // Handle parts array (AI SDK format)
          if (Array.isArray(m.parts)) {
            textContent = m.parts
              .filter((p: any) => p.type === "text" && typeof p.text === "string")
              .map((p: any) => p.text)
              .join("");
          }
          // Handle content array
          else if (Array.isArray(m.content)) {
            textContent = m.content
              .filter((c: any) => c.type === "text" && typeof c.text === "string")
              .map((c: any) => c.text)
              .join("");
          }
          // Handle string content
          else if (typeof m.content === "string") {
            textContent = m.content;
          }

          // Return simplified message with just text content
          return textContent ? { role: "assistant", content: textContent } : null;
        }

        // For user messages, ensure content is a string
        if (m.role === "user") {
          let textContent = "";
          if (typeof m.content === "string") {
            textContent = m.content;
          } else if (Array.isArray(m.content)) {
            textContent = m.content
              .filter((c: any) => c.type === "text" && typeof c.text === "string")
              .map((c: any) => c.text)
              .join("");
          }
          return textContent ? { role: "user", content: textContent } : null;
        }

        return m;
      })
      .filter(Boolean); // Remove null entries
  }

  // Stream text with tool use (agentic loop)
  // AI can call tools to create/edit files; we execute them in the fileSystem
  const result = streamText({
    model,
    messages: filteredMessages,
    maxTokens: 10_000,
    maxSteps: isUsingMock ? 2 : 40, // Mock provider needs fewer steps
    onError: (err: any) => {
      // Security: Log full error internally but don't expose to client
      console.error(`[AI Error] Provider: ${providerId}`, err);
    },
    tools: {
      // Tool for file creation and editing (view, create, replace, insert)
      str_replace_editor: buildStrReplaceTool(fileSystem),
      // Tool for file operations (rename, delete)
      file_manager: buildFileManagerTool(fileSystem),
    },
    // Called when streaming completes
    onFinish: async ({ response }) => {
      // Only save if this is a project (authenticated user)
      if (projectId) {
        try {
          // Verify user is authenticated
          const session = await getSession();
          if (!session) {
            console.error("[Save Error] User not authenticated, cannot save project");
            return;
          }

          // Get response messages from AI (includes tool calls and final response)
          const responseMessages = response.messages || [];
          // Merge original user/system messages with response messages
          // Exclude system prompt from saved messages
          const userMessages = messages.filter((m) => m.role !== "system");
          const allMessages = [...userMessages, ...responseMessages];

          // Update project in database with new messages and file state
          // Uses projectId + userId to ensure user can only update their own projects
          await prisma.project.update({
            where: {
              id: projectId,
              userId: session.userId,
            },
            data: {
              // Store message history as JSON
              messages: JSON.stringify(allMessages),
              // Store serialized file tree as JSON
              data: JSON.stringify(fileSystem.serialize()),
            },
          });
        } catch (error) {
          console.error("Failed to save project data:", error);
        }
      }
    },
  });

  // Return SSE response (Server-Sent Events for streaming)
  return result.toDataStreamResponse();
}

// Vercel timeout: 120 seconds for API route
export const maxDuration = 120;
