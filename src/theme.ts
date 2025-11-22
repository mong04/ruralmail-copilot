// Lightweight theme helper: toggles the root classes/attributes
export function applyTheme(theme: 'light' | 'dark' | 'cyberpunk' | undefined) {
  const root = document.documentElement;
  // Clear any previous theme markers
  root.classList.remove('dark');
  root.removeAttribute('data-theme');

  if (!theme || theme === 'light') {
    // default (light) uses :root variables; nothing to add
    return;
  }

  if (theme === 'dark') {
    root.classList.add('dark');
    return;
  }

  if (theme === 'cyberpunk') {
    root.setAttribute('data-theme', 'cyberpunk');
    return;
  }
}

export default applyTheme;
