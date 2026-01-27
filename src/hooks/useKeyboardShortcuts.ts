"use client";

import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 * Supports both Cmd (Mac) and Ctrl (Windows/Linux) modifiers
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        // Check modifier keys (support both Cmd and Ctrl)
        const modifierMatch =
          (shortcut.meta || shortcut.ctrl)
            ? event.metaKey || event.ctrlKey
            : !event.metaKey && !event.ctrlKey;

        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        // Check if the key matches (case-insensitive)
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (modifierMatch && shiftMatch && keyMatch) {
          // Allow shortcuts that use Cmd/Ctrl even in editable fields
          // (common shortcuts like Cmd+N, Cmd+B should work)
          if (isEditable && !shortcut.meta && !shortcut.ctrl) {
            continue;
          }

          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}

// Preset shortcuts for common actions
export function createAppShortcuts(handlers: {
  onNewProject?: () => void;
  onToggleSidebar?: () => void;
  onSwitchToChat?: () => void;
  onSwitchToCode?: () => void;
  onSwitchToPreview?: () => void;
}): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onNewProject) {
    shortcuts.push({
      key: "n",
      meta: true,
      handler: handlers.onNewProject,
      description: "Create new project",
    });
  }

  if (handlers.onToggleSidebar) {
    shortcuts.push({
      key: "b",
      meta: true,
      handler: handlers.onToggleSidebar,
      description: "Toggle sidebar",
    });
  }

  if (handlers.onSwitchToChat) {
    shortcuts.push({
      key: "1",
      meta: true,
      handler: handlers.onSwitchToChat,
      description: "Switch to chat",
    });
  }

  if (handlers.onSwitchToCode) {
    shortcuts.push({
      key: "2",
      meta: true,
      handler: handlers.onSwitchToCode,
      description: "Switch to code",
    });
  }

  if (handlers.onSwitchToPreview) {
    shortcuts.push({
      key: "3",
      meta: true,
      handler: handlers.onSwitchToPreview,
      description: "Switch to preview",
    });
  }

  return shortcuts;
}
