import { useEffect } from 'react';
import { useAppStore } from '../store.js';

/**
 * Ctrl+= / Ctrl+- / Ctrl+0 fire zoom on the currently focused pane and
 * flash a toast with the new value. Ctrl+0 resets both panes.
 */
export function useZoomShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key;
      const store = useAppStore.getState();
      if (k === '=' || k === '+') {
        e.preventDefault();
        const next = store.zoomIn(store.focusedPane);
        store.flashToast(`${capitalize(store.focusedPane)} ${next}%`);
      } else if (k === '-' || k === '_') {
        e.preventDefault();
        const next = store.zoomOut(store.focusedPane);
        store.flashToast(`${capitalize(store.focusedPane)} ${next}%`);
      } else if (k === '0') {
        e.preventDefault();
        store.resetZoom('editor');
        store.resetZoom('preview');
        store.flashToast('Zoom reset · 100%');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
