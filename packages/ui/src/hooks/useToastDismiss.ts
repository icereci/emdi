import { useEffect } from 'react';
import { useAppStore } from '../store.js';

/** Auto-clears the zoom toast after a delay. */
export function useToastDismiss(delayMs = 1100): void {
  const version = useAppStore((s) => s.toastVersion);
  const clear = useAppStore((s) => s.clearToast);
  useEffect(() => {
    if (version === 0) return;
    const t = setTimeout(clear, delayMs);
    return () => clearTimeout(t);
  }, [version, clear, delayMs]);
}
