"use client";

import { Message } from "ai";
import { cn } from "@/lib/utils";
import { User, Bot, Loader2, Sparkles } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { getToolDisplayName } from "@/lib/utils/tool-display";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

// Safely extract text content - handles both string and array formats
function getTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((item: any) => item?.type === "text" && typeof item?.text === "string")
      .map((item: any) => item.text)
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as any).text || "");
  }
  return "";
}

// Check if a message has any visible text content (not just tool invocations)
function hasVisibleContent(message: Message): boolean {
  // Check direct content
  if (message.content && getTextContent(message.content).trim()) {
    return true;
  }

  // Check parts for text or reasoning content
  if (message.parts) {
    return message.parts.some(part => {
      if (part.type === "text") {
        return getTextContent(part.text).trim().length > 0;
      }
      if (part.type === "reasoning") {
        return true;
      }
      return false;
    });
  }

  return false;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-foreground font-semibold text-base mb-2">Start creating React components</p>
        <p className="text-muted-foreground text-sm max-w-sm">I can help you create buttons, forms, cards, and more</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="space-y-4 max-w-4xl mx-auto w-full">
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
                "rounded-2xl px-4 py-3 bg-secondary text-secondary-foreground border border-border",
                message.role === "user" ? "rounded-br-md" : "rounded-bl-md"
              )}>
                <div className="text-sm">
                  {message.parts ? (
                    <>
                      {message.parts.map((part, partIndex) => {
                        switch (part.type) {
                          case "text":
                            const textContent = getTextContent(part.text);
                            if (!textContent) return null;
                            return message.role === "user" ? (
                              <span key={partIndex} className="whitespace-pre-wrap">{textContent}</span>
                            ) : (
                              <MarkdownRenderer
                                key={partIndex}
                                content={textContent}
                                className="prose-sm"
                              />
                            );
                          case "reasoning":
                            return (
                              <div key={partIndex} className="mt-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
                                <span className="text-xs font-medium text-muted-foreground block mb-1">Reasoning</span>
                                <span className="text-sm text-foreground">{part.reasoning}</span>
                              </div>
                            );
                          case "tool-invocation":
                            const tool = part.toolInvocation;
                            const displayName = getToolDisplayName(tool);
                            return (
                              <div key={partIndex} className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-secondary/50 rounded-lg text-xs border border-border/50">
                                {tool.state === "result" && tool.result ? (
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
                          case "source":
                            return (
                              <div key={partIndex} className="mt-2 text-xs text-muted-foreground">
                                Source: {JSON.stringify(part.source)}
                              </div>
                            );
                          case "step-start":
                            return partIndex > 0 ? <hr key={partIndex} className="my-3 border-border/50" /> : null;
                          default:
                            return null;
                        }
                      })}
                      {isLoading &&
                        message.role === "assistant" &&
                        messages.indexOf(message) === messages.length - 1 && (
                          <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin text-primary" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        )}
                    </>
                  ) : message.content ? (
                    (() => {
                      const content = getTextContent(message.content);
                      if (!content) return null;
                      return message.role === "user" ? (
                        <span className="whitespace-pre-wrap">{content}</span>
                      ) : (
                        <MarkdownRenderer content={content} className="prose-sm" />
                      );
                    })()
                  ) : isLoading &&
                    message.role === "assistant" &&
                    messages.indexOf(message) === messages.length - 1 ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  ) : null}
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
