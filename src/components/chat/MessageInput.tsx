"use client";

import { FormEvent, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e?: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  isDisabled?: boolean;
  disabledMessage?: string;
  maxLength?: number;
}

export function MessageInput({
  input,
  setInput,
  handleSubmit,
  isLoading,
  isDisabled = false,
  disabledMessage,
  maxLength = 4000,
}: MessageInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isDisabled) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const inputDisabled = isLoading || isDisabled;
  const buttonDisabled = isLoading || isDisabled || !input.trim();

  // Character counter logic
  const charCount = input.length;
  const charPercentage = (charCount / maxLength) * 100;
  const showCounter = charPercentage > 80;
  const isWarning = charPercentage > 95;

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled && disabledMessage ? disabledMessage : "Describe the React component you want to create..."}
          disabled={inputDisabled}
          className={`
            w-full min-h-[100px] max-h-[200px] pl-4 pr-14 py-4
            rounded-xl border border-border/50
            bg-background/50 dark:bg-secondary/30
            text-foreground resize-none
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
            focus:bg-background dark:focus:bg-secondary/50
            transition-all duration-200
            placeholder:text-muted-foreground
            text-[15px] font-normal
            shadow-sm
            ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
          `}
          rows={3}
        />
        <button
          type="submit"
          disabled={buttonDisabled}
          className={`
            absolute right-3 bottom-3 p-3 rounded-xl
            transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            ${buttonDisabled
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md glow-sm'
            }
          `}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-center gap-2">
        <p className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for new line
        </p>
        {showCounter && (
          <span className={`text-xs ${isWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </form>
  );
}
