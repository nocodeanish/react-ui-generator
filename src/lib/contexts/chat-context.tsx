"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { Message } from "ai";
import { useFileSystem } from "./file-system-context";
import { setHasAnonWork } from "@/lib/anon-work-tracker";
import { type ProviderId } from "@/lib/providers";

// Props for ChatProvider
interface ChatContextProps {
  projectId?: string; // Only set if this is a saved project
  initialMessages?: Message[]; // Load existing conversation history
  initialProvider?: ProviderId; // Provider from project settings
  initialModel?: string; // Model from project settings
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
  provider: ProviderId; // Current AI provider
  model: string; // Current model ID
  setProviderAndModel: (provider: ProviderId, model: string) => void; // Update provider/model
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider that wraps useChat hook from Vercel AI SDK
// Handles message streaming, tool call delegation, and work persistence
export function ChatProvider({
  children,
  projectId,
  initialMessages = [],
  initialProvider = "anthropic",
  initialModel = "",
}: ChatContextProps & { children: ReactNode }) {
  // Provider and model state
  const [provider, setProvider] = useState<ProviderId>(initialProvider);
  const [model, setModel] = useState<string>(initialModel);

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
    handleSubmit: originalHandleSubmit,
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
      provider, // Selected AI provider
      model, // Selected model
    },
    // Hook called when AI calls a tool
    // We delegate to FileSystemContext to handle file operations
    onToolCall: ({ toolCall }) => {
      handleToolCall(toolCall);
    },
    // Hook called when an error occurs
    onError: (error) => {
      console.error("[Chat Error]", error);
    },
  });

  // Wrapper for handleSubmit that includes provider/model in body
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    originalHandleSubmit(e, {
      body: {
        files: fileSystem.serialize(),
        projectId,
        provider,
        model,
      },
    });
  }, [originalHandleSubmit, fileSystem, projectId, provider, model]);

  // Update provider and model
  const setProviderAndModel = useCallback((newProvider: ProviderId, newModel: string) => {
    setProvider(newProvider);
    setModel(newModel);
  }, []);

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
        provider,
        model,
        setProviderAndModel,
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
