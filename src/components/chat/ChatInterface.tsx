"use client";

import { useEffect, useRef, useMemo } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/contexts/chat-context";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Info, Sparkles, Wand2 } from "lucide-react";

export function ChatInterface() {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { messages, input, handleInputChange, handleSubmit, status, error, reload } = useChat();

  // Count user messages and detect demo mode
  const { userMessageCount, isDemoMode } = useMemo(() => {
    const userMsgs = messages.filter((m) => m.role === "user").length;

    // Helper to extract all text from a message (handles various formats)
    const extractText = (msg: any): string => {
      const texts: string[] = [];

      // Check string content
      if (typeof msg.content === "string") {
        texts.push(msg.content);
      }

      // Check array content (AI SDK format)
      if (Array.isArray(msg.content)) {
        msg.content.forEach((c: any) => {
          if (c?.type === "text" && typeof c?.text === "string") {
            texts.push(c.text);
          }
        });
      }

      // Check parts array
      if (Array.isArray(msg.parts)) {
        msg.parts.forEach((p: any) => {
          if (p?.type === "text" && typeof p?.text === "string") {
            texts.push(p.text);
          }
        });
      }

      return texts.join(" ");
    };

    // Detect demo mode by checking for demo response text in any format
    const demoPatterns = ["static demo response", "ANTHROPIC_API_KEY", "demo mode"];
    const hasDemo = messages.some((m) => {
      if (m.role !== "assistant") return false;
      const text = extractText(m).toLowerCase();
      return demoPatterns.some((pattern) => text.includes(pattern.toLowerCase()));
    });

    return { userMessageCount: userMsgs, isDemoMode: hasDemo };
  }, [messages]);

  // Show warning and block input after 1 message in demo mode
  const showDemoWarning = isDemoMode && userMessageCount >= 1;
  const isInputBlocked = isDemoMode && userMessageCount >= 1;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-card">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="h-14 w-14 rounded-xl bg-primary mx-auto mb-5 flex items-center justify-center">
              <Wand2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              What would you like to create?
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Describe a React component and I&apos;ll generate it for you with
              clean, modern code and Tailwind CSS styling.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Counter", "Form", "Card", "Button"].map((example) => (
                <button
                  key={example}
                  onClick={() =>
                    handleInputChange({
                      target: { value: `Create a ${example.toLowerCase()} component` },
                    } as any)
                  }
                  className="px-3 py-1.5 text-sm rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors border border-border"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
          <div className="p-4">
            <MessageList messages={messages} isLoading={status === "streaming"} />
          </div>
        </ScrollArea>
      )}

      {/* Demo Mode Warning */}
      {showDemoWarning && (
        <div className="mx-4 mb-4 flex-shrink-0 bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                API Key Required
              </h3>
              <p className="text-sm text-muted-foreground">
                Add your API key in Settings to continue creating components.
              </p>
              <div className="mt-3 text-sm bg-background rounded-md p-3 border border-border">
                <p className="font-medium text-foreground mb-2">Quick Setup:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                  <li>
                    Get your API key from{" "}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
                    >
                      console.anthropic.com
                    </a>
                  </li>
                  <li>
                    Click the <span className="font-medium text-foreground">Settings</span> button above
                  </li>
                  <li>Paste your API key and save</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 flex-shrink-0 bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground mb-1">Error</h3>
              <p className="text-sm text-muted-foreground break-words">
                {error.message || "An error occurred while processing your message."}
              </p>
              {error.message?.includes("ANTHROPIC_API_KEY") && (
                <div className="mt-3 text-sm bg-background rounded-md p-3 border border-border">
                  <p className="font-medium text-foreground mb-2">Setup Required</p>
                  <p className="text-xs text-muted-foreground mb-2">Add your Anthropic API key to continue:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground">
                    <li>
                      Get your API key from{" "}
                      <a
                        href="https://console.anthropic.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        console.anthropic.com
                      </a>
                    </li>
                    <li>
                      Click the <span className="font-medium text-foreground">Settings</span> button above
                    </li>
                    <li>Paste your API key and save</li>
                  </ol>
                </div>
              )}
            </div>
            <Button
              onClick={reload}
              variant="outline"
              size="sm"
              className="flex-shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 pt-0 flex-shrink-0">
        <MessageInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={status === "submitted" || status === "streaming"}
          isDisabled={isInputBlocked}
          disabledMessage="Add an API key to continue"
        />
      </div>
    </div>
  );
}
