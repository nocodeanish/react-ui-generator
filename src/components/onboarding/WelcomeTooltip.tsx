"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  step?: number;
  totalSteps?: number;
  delay?: number;
  onDismiss?: () => void;
  children: React.ReactNode;
}

const STORAGE_KEY = "react-ai-ui-onboarding-dismissed";

export function WelcomeTooltip({
  id,
  title,
  description,
  position = "bottom",
  step,
  totalSteps,
  delay = 0,
  onDismiss,
  children,
}: WelcomeTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      const dismissedIds: string[] = dismissed ? JSON.parse(dismissed) : [];

      if (!dismissedIds.includes(id)) {
        // Delay for staggered appearance
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, [id, delay, mounted]);

  const handleDismiss = () => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      const dismissedIds: string[] = dismissed ? JSON.parse(dismissed) : [];
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...dismissedIds, id])
      );
    } catch {
      // localStorage not available
    }
    setVisible(false);
    onDismiss?.();
  };

  const handleDismissAll = () => {
    try {
      // Dismiss all tooltips by storing a special key
      const allIds = ["chat-input", "preview-panel", "provider-selector"];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
    } catch {
      // localStorage not available
    }
    setVisible(false);
    onDismiss?.();
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-3",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-3",
    left: "right-full top-1/2 -translate-y-1/2 mr-3",
    right: "left-full top-1/2 -translate-y-1/2 ml-3",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-card",
    bottom:
      "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-card",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-card",
    right:
      "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-card",
  };

  return (
    <div className="relative inline-block">
      {children}
      {visible && (
        <div
          className={cn(
            "absolute z-50 w-72 p-4 rounded-xl border bg-card shadow-lg",
            "animate-scale-in",
            positionClasses[position]
          )}
          role="tooltip"
          aria-live="polite"
        >
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-0 h-0 border-8",
              arrowClasses[position]
            )}
          />

          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Dismiss tip"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          <div className="pr-6">
            <h4 className="font-semibold text-sm text-foreground mb-1.5">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Step indicator and dismiss all */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            {step && totalSteps ? (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      i + 1 === step ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-2">
                  {step} of {totalSteps}
                </span>
              </div>
            ) : (
              <div />
            )}
            <button
              onClick={handleDismissAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip all tips
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to reset onboarding (for testing)
export function resetOnboarding() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}

// Helper to check if onboarding is complete
export function isOnboardingComplete(): boolean {
  try {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) return false;
    const dismissedIds: string[] = JSON.parse(dismissed);
    return (
      dismissedIds.includes("chat-input") &&
      dismissedIds.includes("preview-panel") &&
      dismissedIds.includes("provider-selector")
    );
  } catch {
    return false;
  }
}
