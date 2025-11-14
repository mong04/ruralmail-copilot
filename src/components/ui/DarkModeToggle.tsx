import { useDarkMode } from "../../hooks/useDarkMode";

export const DarkModeToggle: React.FC = () => {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      className="px-3 py-2 rounded-lg bg-surface text-foreground hover:bg-surface-muted"
      aria-label="Toggle dark mode"
    >
      {isDark ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
};
