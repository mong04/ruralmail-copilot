// src/components/ui/DarkModeToggle.tsx
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from "../../hooks/useDarkMode";
import { twMerge } from 'tailwind-merge';

export const DarkModeToggle: React.FC = () => {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className={twMerge(
        "relative inline-flex h-9 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2",
        // FIX: Use semantic classes for track color
        isDark ? "bg-surface-muted border border-border" : "bg-surface-muted border border-border"
      )}
      aria-label="Toggle dark mode"
    >
      {/* The Sliding Knob */}
      <span
        className={twMerge(
          "inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          // FIX: Use semantic classes for knob color
          isDark ? "translate-x-8 bg-foreground text-background" : "translate-x-1 bg-background text-foreground"
        )}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
};