"use client";

import { useEffect, useRef, useMemo } from "react";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/lib/contexts/chat-context";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Info } from "lucide-react";

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
    <div className="flex flex-col h-full p-4 overflow-hidden">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <MessageList messages={messages} isLoading={status === "streaming"} />
        </div>
      ) : (
        <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
          <div className="pr-4">
            <MessageList messages={messages} isLoading={status === "streaming"} />
          </div>
        </ScrollArea>
      )}

      {/* Demo Mode Warning */}
      {showDemoWarning && (
        <div className="mt-4 flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                API Key Required to Continue
              </h3>
              <p className="text-sm text-blue-700">
                Thanks for trying out UI Generator! To continue creating more components, please add your Anthropic API key.
              </p>
              <div className="mt-3 text-sm text-blue-800 bg-blue-100 rounded p-3">
                <p className="font-medium mb-2">Quick Setup:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Get your API key from{" "}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      console.anthropic.com
                    </a>
                  </li>
                  <li>Add it to your <code className="bg-blue-200 px-1 rounded">.env</code> file:</li>
                </ol>
                <pre className="mt-2 font-mono text-xs bg-blue-200 p-2 rounded">ANTHROPIC_API_KEY=sk-ant-your-key-here</pre>
                <p className="mt-2 text-xs">Then restart the development server.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 flex-shrink-0 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-900 mb-1">
                Error
              </h3>
              <p className="text-sm text-red-700 break-words">
                {error.message || "An error occurred while processing your message."}
              </p>
              {error.message?.includes("ANTHROPIC_API_KEY") && (
                <div className="mt-2 text-xs text-red-600 bg-red-100 rounded p-2">
                  <strong>Setup Required:</strong> Add your Anthropic API key to the .env file:
                  <pre className="mt-1 font-mono text-xs">ANTHROPIC_API_KEY=sk-ant-your-key-here</pre>
                  Get your key from: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a>
                </div>
              )}
            </div>
            <Button
              onClick={reload}
              variant="outline"
              size="sm"
              className="flex-shrink-0 text-red-700 border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4 flex-shrink-0">
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
