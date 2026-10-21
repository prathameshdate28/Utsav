"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const emptySubscribe = () => () => {};

/**
 * Idiomatic hook to detect client hydration without cascading effect renders.
 */
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

/**
 * Accessible toggle between Light, Dark, and System modes.
 * Uses only opacity and transform transitions.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div
        className="w-9 h-9 rounded-md border border-border bg-card/50"
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-card text-foreground hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme (current: ${theme})`}
    >
      <Sun
        className={`h-4 w-4 transition-transform duration-200 ${
          isDark ? "scale-0 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"
        } absolute`}
      />
      <Moon
        className={`h-4 w-4 transition-transform duration-200 ${
          isDark ? "scale-100 opacity-100 rotate-0" : "scale-0 opacity-0 -rotate-90"
        } absolute`}
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
