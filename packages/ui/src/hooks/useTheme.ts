import { useEffect } from 'react';
import { applyTheme, resolveTheme } from '@emdi/core/theme';
import { useAppStore } from '../store.js';
import type { AppHostBindings } from '../AppHost.js';

/**
 * Resolves the active theme from preference + OS state and applies it as
 * `data-theme` on the .emdi-root element. Keeps the store's `resolvedTheme`
 * in sync for any code that needs it (Monaco, mermaid).
 */
export function useTheme(host: AppHostBindings): void {
  const themePreference = useAppStore((s) => s.settings.themePreference);
  const setResolvedTheme = useAppStore((s) => s.setResolvedTheme);

  useEffect(() => {
    let currentSystem: 'light' | 'dark' = 'dark';

    const apply = () => {
      const mode =
        themePreference === 'system' || themePreference === 'auto'
          ? currentSystem
          : resolveTheme(themePreference);
      applyTheme(mode);
      setResolvedTheme(mode);
    };

    const teardown = host.watchSystemTheme((mode) => {
      currentSystem = mode;
      apply();
    });

    return () => teardown();
  }, [themePreference, setResolvedTheme, host]);
}
