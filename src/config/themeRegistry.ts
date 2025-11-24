// Single source of truth for every theme
export const THEME_REGISTRY = {
  light: { type: 'basic' as const, label: 'Light' },
  dark: { type: 'basic' as const, label: 'Dark' },
  cyberpunk: { type: 'rich' as const, label: 'Cyberpunk Neon' },
} as const;

export type ThemeId = keyof typeof THEME_REGISTRY;