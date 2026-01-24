"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { Message } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";

// Props for ChatProvider
interface ChatContextProps {
  projectId?: string; // Only set if this is a saved project
  initialMessages?: Message[]; // Load existing conversation history
}

// Type for ChatContext value
interface ChatContextType {
  messages: Message[]; // Conversation history with user/assistant messages and tool calls
  input: string; // Current text in the input field
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; // Update input state
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void; // Send message to API
  status: string; // Loading state: "idle", "streaming", etc.
  error: Error | undefined; // Error state from API
  reload: () => void; // Retry last failed message
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider that wraps useChat hook from Vercel AI SDK
// Handles message streaming, tool call delegation, and work persistence
export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
}: ChatContextProps & { children: ReactNode }) {
  // Get file system from FileSystemContext to access it here
  const { fileSystem, handleToolCall } = useFileSystem();

  // Use Vercel AI SDK's useChat hook for streaming + agentic loop
  // This handles:
  // 1. Sending messages to /api/chat
  // 2. Streaming response chunks
  // 3. Parsing and calling tools
  // 4. Maintaining message history
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    error,
    reload,
  } = useAIChat({
    api: "/api/chat", // Our custom chat endpoint
    initialMessages, // Load saved conversation if provided
    body: {
      // Send current file state with each message
      // Server reconstructs VirtualFileSystem from this
      files: fileSystem.serialize(),
      projectId, // Server uses this to know where to save results
    },
    // Hook called when Claude calls a tool
    // We delegate to FileSystemContext to handle file operations
    onToolCall: ({ toolCall }) => {
      handleToolCall(toolCall);
    },
    // Hook called when an error occurs
    onError: (error) => {
      console.error("[Chat Error]", error);
    },
  });

  // Track anonymous user work in localStorage
  // Allows anonymous users to resume later or save to account
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      setHasAnonWork(messages, fileSystem.serialize());
    }
  }, [messages, fileSystem, projectId]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        handleInputChange,
        handleSubmit,
        status,
        error,
        reload,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// Hook to access chat context from any descendant component
// Throws error if used outside of ChatProvider
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}