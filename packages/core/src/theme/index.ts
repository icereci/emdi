export type ThemeMode = 'light' | 'dark';
/** 'auto' resolves to system color-scheme preference. */
export type ThemePreference = ThemeMode | 'auto' | 'system';

const THEME_ATTR = 'data-theme';

/** Find the .emdi-root element to apply the theme to. */
function findRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.emdi-root');
}

/**
 * Apply a theme by setting `data-theme` on the .emdi-root element. The
 * design's CSS selectors are `.emdi-root` (dark default) and
 * `.emdi-root[data-theme="light"]` (light override).
 */
export function applyTheme(mode: ThemeMode, target?: HTMLElement): void {
  const el = target ?? findRoot();
  if (el) el.setAttribute(THEME_ATTR, mode);
}

export function resolveSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(pref: ThemePreference): ThemeMode {
  if (pref === 'system' || pref === 'auto') return resolveSystemTheme();
  return pref;
}

/** Watch OS color scheme. Calls listener immediately with current value. */
export function watchSystemTheme(listener: (mode: ThemeMode) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    listener('dark');
    return () => {};
  }
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  listener(mql.matches ? 'dark' : 'light');
  const handler = (e: MediaQueryListEvent) => listener(e.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
