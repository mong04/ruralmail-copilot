// src/hooks/useTheme.ts (Refactored)
import { useEffect } from 'react';
import { useAppSelector } from '../store';

type Theme = 'light' | 'dark' | 'cyberpunk' | undefined;

export const useTheme = () => {
  const theme: Theme = useAppSelector((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme-related classes and attributes
    root.classList.remove('dark', 'light');
    root.removeAttribute('data-theme');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'cyberpunk') {
      root.setAttribute('data-theme', 'cyberpunk');
      // Cyberpunk is a dark theme, so we also add the dark class
      // for any components that might just be checking for .dark
      root.classList.add('dark');
    } else {
      // Default to light theme
      root.classList.add('light');
    }
  }, [theme]);
};
