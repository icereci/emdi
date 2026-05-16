import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '@emdi/ui';
import type { AppHostBindings } from '@emdi/ui';

interface Props {
  host: AppHostBindings;
  children: ReactNode;
}

/**
 * Desktop-only shell: keeps the window title in sync with the current
 * filename + dirty state. Keyboard shortcuts live in @emdi/ui's
 * useGlobalShortcuts hook, which dispatches `emdi:open|save|save-as|new`
 * custom events that App.tsx listens for.
 */
export function DesktopShell({ host: _host, children }: Props): JSX.Element {
  const fileName = useAppStore((s) => s.fileName);
  const dirty = useAppStore((s) => s.dirty);

  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${fileName} — emdi`;
  }, [fileName, dirty]);

  return <>{children}</>;
}
