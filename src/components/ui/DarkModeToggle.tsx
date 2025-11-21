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
        isDark ? "bg-zinc-800 border border-white/10" : "bg-zinc-200 border border-zinc-300"
      )}
      aria-label="Toggle dark mode"
    >
      {/* The Sliding Knob */}
      <span
        className={twMerge(
          "inline-flex h-7 w-7 transform items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          isDark ? "translate-x-8 bg-zinc-950 text-white" : "translate-x-1 text-zinc-600"
        )}
      >
        {isDark ? <Moon size={14} /> : <Sun size={14} />}
      </span>
    </button>
  );
};