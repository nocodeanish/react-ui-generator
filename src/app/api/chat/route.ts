import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

// POST handler for chat messages
// Receives: messages array, serialized file state, optional projectId
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
  }: { messages: any[]; files: Record<string, FileNode>; projectId?: string } =
    body;

  // Validate input
  if (!Array.isArray(messages)) {
    return new Response("Invalid messages format", { status: 400 });
  }

  if (!files || typeof files !== "object") {
    return new Response("Invalid files format", { status: 400 });
  }

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

  // Prepend system prompt with prompt caching enabled (ephemeral)
  // Prompt caching allows reusing the same prompt across requests for cost/speed
  messages.unshift({
    role: "system",
    content: generationPrompt,
    providerOptions: {
      anthropic: { cacheControl: { type: "ephemeral" } },
    },
  });

  // Reconstruct VirtualFileSystem from serialized state sent by client
  // The client serializes the file tree for transmission; we rebuild it here
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files);

  // Get language model (Claude via Anthropic)
  const model = getLanguageModel();
  const isMockProvider = !process.env.ANTHROPIC_API_KEY;

  // Filter and clean messages for mock provider
  // Mock provider doesn't support tool messages or complex content formats
  let filteredMessages = messages;
  if (isMockProvider) {
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
  // Claude can call tools to create/edit files; we execute them in the fileSystem
  const result = streamText({
    model,
    messages: filteredMessages,
    maxTokens: 10_000,
    maxSteps: isMockProvider ? 2 : 40, // Mock provider needs fewer steps
    onError: (err: any) => {
      // Security: Log full error internally but don't expose to client
      console.error("[AI Error]", err);
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

          // Get response messages from Claude (includes tool calls and final response)
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
