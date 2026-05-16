import { useEffect } from 'react';
import { useAppStore } from '../store.js';
import type { AppHostBindings } from '../AppHost.js';

/**
 * Application-level keyboard shortcuts beyond zoom (which has its own hook):
 *
 *   Ctrl+\\   cycle view (split → editor → preview)
 *   Ctrl+K   cycle theme (dark → light → auto)
 *   Ctrl+B   toggle outline
 *   Ctrl+F   toggle find bar
 *   Ctrl+P   export PDF (via print)
 *   Ctrl+S   save
 *   Ctrl+O   open file
 *   Ctrl+N   new file (clear)
 */
export function useGlobalShortcuts(host: AppHostBindings, onExportHtml: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key;
      const store = useAppStore.getState();
      if (k === '\\') {
        e.preventDefault();
        store.cycleViewMode();
        store.flashToast(`View: ${useAppStore.getState().settings.viewMode}`);
      } else if (k.toLowerCase() === 'k' && !e.shiftKey) {
        e.preventDefault();
        const cur = store.settings.themePreference;
        const nextPref = cur === 'dark' ? 'light' : cur === 'light' ? 'auto' : 'dark';
        store.setThemePreference(nextPref);
        store.flashToast(`Theme: ${nextPref}`);
      } else if (k.toLowerCase() === 'b') {
        e.preventDefault();
        store.toggleOutline();
      } else if (k.toLowerCase() === 'f') {
        e.preventDefault();
        store.toggleFind();
      } else if (k.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault();
        void host.exportPdf();
      } else if (k.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        // Save is host-specific. Use a custom event the desktop shell listens for.
        window.dispatchEvent(new CustomEvent('emdi:save'));
      } else if (k.toLowerCase() === 's' && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('emdi:save-as'));
      } else if (k.toLowerCase() === 'o') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('emdi:open'));
      } else if (k.toLowerCase() === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('emdi:new'));
      } else if (k.toLowerCase() === 'e' && e.shiftKey) {
        e.preventDefault();
        onExportHtml();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [host, onExportHtml]);
}
