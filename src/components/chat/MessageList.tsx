"use client";

import { useState, useEffect } from "react";
import { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { getToolDisplayName } from "@/lib/utils/tool-display";
import { LOADING_MESSAGES } from "@/lib/design-tokens";

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

// Part type for rendering - supports both v6 parts and legacy content
type MessagePart = {
  type: string;
  text?: string;
  toolCallId?: string;
  input?: unknown;
  state?: string;
  url?: string;
  title?: string;
  [key: string]: unknown;
};

// Get message parts, handling both v6 format (parts) and legacy format (content)
// Legacy messages from database may have content as string or array
function getMessageParts(message: UIMessage): MessagePart[] {
  // v6 format: message.parts is the primary field
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts;
  }

  // Legacy format: content may be string or array
  const content = (message as any).content;
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }
  if (Array.isArray(content)) {
    // Content array may have text parts or tool-call parts
    return content.map((item: any) => {
      if (typeof item === "string") {
        return { type: "text", text: item };
      }
      if (item.type === "text") {
        return { type: "text", text: item.text || "" };
      }
      if (item.type === "tool-call" || item.type === "tool_use") {
        // Convert legacy tool-call to v6 tool part format
        return {
          type: `tool-${item.toolName || item.name || "unknown"}`,
          toolCallId: item.toolCallId || item.id || "",
          input: item.args || item.input || {},
          state: "output-available" as const,
        };
      }
      return item;
    });
  }

  // Fallback: empty parts
  return [];
}

// Check if a message has any visible text content (not just tool invocations)
function hasVisibleContent(message: UIMessage): boolean {
  const parts = getMessageParts(message);
  return parts.some(part => {
    if (part.type === "text") {
      return (part.text || "").trim().length > 0;
    }
    if (part.type === "reasoning") {
      return true;
    }
    return false;
  });
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  // Rotating loading messages for better UX
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setLoadingMsgIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 text-center animate-fade-in">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4 animate-breathing">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-foreground font-semibold text-base mb-2">Start creating React components</p>
        <p className="text-muted-foreground text-sm max-w-sm">I can help you create buttons, forms, cards, and more</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((message, index) => {
          // Skip rendering messages that only have tool invocations (no text content)
          // unless it's the last message and we're loading (show loading state)
          const isLastMessage = index === messages.length - 1;
          const showLoadingState = isLoading && isLastMessage && message.role === "assistant";

          if (!hasVisibleContent(message) && !showLoadingState) {
            return null;
          }

          return (
          <div
            key={message.id || `message-${index}`}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary shadow-sm flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex flex-col gap-2 max-w-[85%]",
              message.role === "user" ? "items-end" : "items-start"
            )}>
              <div className={cn(
                "rounded-2xl px-5 py-4 bg-secondary text-secondary-foreground border border-border",
                message.role === "user" ? "rounded-br-md" : "rounded-bl-md"
              )}>
                <div className="text-sm">
                  {getMessageParts(message).map((part, partIndex) => {
                    // Handle text parts
                    if (part.type === "text") {
                      if (!part.text) return null;
                      return message.role === "user" ? (
                        <span key={partIndex} className="whitespace-pre-wrap">{part.text}</span>
                      ) : (
                        <MarkdownRenderer
                          key={partIndex}
                          content={part.text}
                          className="prose-sm"
                        />
                      );
                    }

                    // Handle reasoning parts (AI SDK v6: text property instead of reasoning)
                    if (part.type === "reasoning") {
                      return (
                        <div key={partIndex} className="mt-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
                          <span className="text-xs font-medium text-muted-foreground block mb-1">Reasoning</span>
                          <span className="text-sm text-foreground">{part.text}</span>
                        </div>
                      );
                    }

                    // Handle tool parts (AI SDK v6: part.type is `tool-${toolName}`)
                    // Check manually since our MessagePart type doesn't match isToolUIPart signature
                    if (part.type.startsWith("tool-")) {
                      const displayName = getToolDisplayName(part as { type: string; input?: unknown });
                      const isComplete = part.state === "output-available" || part.state === "output-error" || part.state === "output-denied";
                      return (
                        <div key={partIndex} className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-secondary/50 rounded-lg text-xs border border-border/50">
                          {isComplete ? (
                            <>
                              <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></div>
                              <span className="text-foreground font-medium">{displayName}</span>
                            </>
                          ) : (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              <span className="text-foreground font-medium">{displayName}</span>
                            </>
                          )}
                        </div>
                      );
                    }

                    // Handle source URL parts
                    if (part.type === "source-url") {
                      return (
                        <div key={partIndex} className="mt-2 text-xs text-muted-foreground">
                          Source: <a href={part.url} className="underline">{part.title || part.url}</a>
                        </div>
                      );
                    }

                    // Handle step-start parts
                    if (part.type === "step-start") {
                      return partIndex > 0 ? <hr key={partIndex} className="my-3 border-border/50" /> : null;
                    }

                    return null;
                  })}
                  {isLoading &&
                    message.role === "assistant" &&
                    messages.indexOf(message) === messages.length - 1 && (
                      <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                        <span className="w-0.5 h-4 bg-primary animate-typing-cursor" />
                        <span className="text-sm">{LOADING_MESSAGES[loadingMsgIndex]}</span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary shadow-sm flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
