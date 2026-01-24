"use client";

import { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  isDisabled?: boolean;
  disabledMessage?: string;
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  isDisabled = false,
  disabledMessage,
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

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <textarea
          value={input}
          onChange={handleInputChange}
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
      <p className="mt-2 text-xs text-muted-foreground text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
