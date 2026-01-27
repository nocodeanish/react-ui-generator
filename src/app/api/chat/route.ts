import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, stepCountIs } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel, isMockProvider, PROVIDERS, type ProviderId } from "@/lib/provider";
import { isValidProvider } from "@/lib/providers";
import { generationPrompt } from "@/lib/prompts/generation";
import { rateLimit, getClientIP } from "@/lib/rate-limit";
import { decryptApiKeys } from "@/lib/crypto";
import { RATE_LIMITS, EMPTY_API_KEYS } from "@/lib/constants";
import {
  invalidContentTypeResponse,
  invalidJsonResponse,
  badRequestResponse,
  rateLimitResponse,
} from "@/lib/api-responses";

// POST handler for chat messages
// Receives: messages array, serialized file state, optional projectId, provider, model
// Returns: Server-sent events stream with text and tool calls
export async function POST(req: Request) {
  // Security: Validate content-type
  const contentType = req.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return invalidContentTypeResponse();
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return invalidJsonResponse();
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
    return badRequestResponse("Invalid messages format");
  }

  if (!files || typeof files !== "object") {
    return badRequestResponse("Invalid files format");
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
    const rateLimitResult = rateLimit(`chat-anon:${clientIP}`, RATE_LIMITS.CHAT_ANON);

    if (!rateLimitResult.success) {
      return rateLimitResponse("Rate limit exceeded. Please sign in for unlimited access.");
    }
  }

  // Get user's API key from settings (if authenticated)
  let userApiKey: string | undefined;
  if (session) {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: session.userId },
      });

      if (settings?.apiKeys && settings.apiKeys !== EMPTY_API_KEYS) {
        const userKeys = decryptApiKeys(settings.apiKeys);
        userApiKey = userKeys[providerId];
      }
    } catch (error) {
      console.error("[Chat] Failed to read user settings:", error);
    }
  }

  // Check if API key is available
  const envKey = process.env[PROVIDERS[providerId].envKey];
  const apiKey = userApiKey || envKey;
  const isUsingMock = isMockProvider(providerId, userApiKey);

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

  // Normalize messages to ensure they work with streamText
  // Handle both UIMessage format (parts) and legacy format (content)
  // Tool messages from persisted conversations need special handling
  const normalizedMessages = messages
    .map((m: any) => {
      // Filter out tool messages - they cause validation issues when loaded from DB
      // The AI will regenerate tool calls as needed for the conversation
      if (m.role === "tool") {
        return null;
      }

      // For assistant messages, extract only text content
      // Skip any tool_calls or other non-text content that may be persisted
      if (m.role === "assistant") {
        let textContent = "";

        // Handle parts array (UI SDK format)
        if (Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text" && p.text)
            .map((p: any) => p.text)
            .join("");
        }
        // Handle content array
        else if (Array.isArray(m.content)) {
          textContent = m.content
            .filter((c: any) => (c.type === "text" && c.text) || typeof c === "string")
            .map((c: any) => (typeof c === "string" ? c : c.text))
            .join("");
        }
        // Handle string content
        else if (typeof m.content === "string") {
          textContent = m.content;
        }

        // Skip assistant messages with no text (e.g., tool-only responses)
        if (!textContent || textContent.trim() === "") {
          return null;
        }

        return { role: "assistant", content: textContent };
      }

      // For user messages
      if (m.role === "user") {
        let textContent = "";
        if (typeof m.content === "string") {
          textContent = m.content;
        } else if (Array.isArray(m.content)) {
          textContent = m.content
            .filter((c: any) => c.type === "text" || typeof c === "string")
            .map((c: any) => (typeof c === "string" ? c : c.text))
            .join("");
        } else if (m.parts && Array.isArray(m.parts)) {
          textContent = m.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join("");
        }
        return { role: "user", content: textContent || "" };
      }

      // System messages pass through
      if (m.role === "system") {
        return { role: "system", content: m.content || "" };
      }

      return null; // Filter unknown roles
    })
    .filter((m: { role: string; content: string } | null): m is { role: string; content: string } => m !== null); // Remove null entries with type guard

  // Stream text with tool use (agentic loop)
  // AI can call tools to create/edit files; we execute them in the fileSystem
  const result = streamText({
    model,
    messages: normalizedMessages as any,
    maxOutputTokens: 10_000,
    // AI SDK v6: Use stopWhen instead of maxSteps for controlling the agentic loop
    stopWhen: stepCountIs(isUsingMock ? 2 : 40),
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
  // AI SDK v6: Use toUIMessageStreamResponse for useChat compatibility
  return result.toUIMessageStreamResponse();
}

// Vercel timeout: 120 seconds for API route
export const maxDuration = 120;
