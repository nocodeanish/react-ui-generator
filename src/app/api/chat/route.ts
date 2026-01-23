import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, appendResponseMessages } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";

// POST handler for chat messages
// Receives: messages array, serialized file state, optional projectId
// Returns: Server-sent events stream with text and tool calls
export async function POST(req: Request) {
  const {
    messages,
    files,
    projectId,
  }: { messages: any[]; files: Record<string, FileNode>; projectId?: string } =
    await req.json();

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

  // Get language model (Claude via Anthropic) or mock fallback
  const model = getLanguageModel();
  // Mock provider uses fewer steps to prevent repetitive mock responses
  const isMockProvider = !process.env.ANTHROPIC_API_KEY;

  // Stream text with tool use (agentic loop)
  // Claude can call tools to create/edit files; we execute them in the fileSystem
  const result = streamText({
    model,
    messages,
    maxTokens: 10_000,
    maxSteps: isMockProvider ? 4 : 40, // Limit agentic iterations
    onError: (err: any) => {
      console.error(err);
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
            console.error("User not authenticated, cannot save project");
            return;
          }

          // Get response messages from Claude (includes tool calls and final response)
          const responseMessages = response.messages || [];
          // Merge original user/system messages with response messages
          const allMessages = appendResponseMessages({
            messages: [...messages.filter((m) => m.role !== "system")], // Exclude system prompt
            responseMessages,
          });

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
