import { useAppStore } from './store.js';

export function ZoomToast(): JSX.Element {
  const toast = useAppStore((s) => s.toast);
  return <div className={`zoom-toast ${toast ? 'show' : ''}`}>{toast ?? ''}</div>;
}
