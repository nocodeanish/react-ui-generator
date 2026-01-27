"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-accent/80"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      aria-label={`Toggle theme, currently ${theme === "dark" ? "dark" : "light"} mode`}
    >
      <span className="transition-transform duration-200">
        {theme === "dark" ? (
          <Sun className="h-4 w-4 text-amber-400 rotate-0 transition-transform duration-200" />
        ) : (
          <Moon className="h-4 w-4 text-slate-600 rotate-0 transition-transform duration-200" />
        )}
      </span>
    </Button>
  );
}
