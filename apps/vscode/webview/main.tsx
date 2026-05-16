import React from 'react';
import ReactDOM from 'react-dom/client';
import { App, useAppStore } from '@emdi/ui';
import type { AppHostBindings } from '@emdi/ui';
import type { AppSettings } from '@emdi/core/settings';

import uiCss from '@emdi/ui/styles.css';
import katexCss from 'katex/dist/katex.min.css';
import vscodeThemeCss from './vscode-theme-bridge.css';

function injectCss(text: string, id: string): void {
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = text;
  document.head.appendChild(style);
}
injectCss(uiCss, 'emdi-ui-css');
injectCss(katexCss, 'emdi-katex-css');
injectCss(vscodeThemeCss, 'emdi-vscode-theme-css');

const vscode = acquireVsCodeApi<{ settings?: Partial<AppSettings> }>();

const host: AppHostBindings = {
  ownsEditor: false,

  async loadSettings() {
    return vscode.getState()?.settings ?? {};
  },
  async saveSettings(settings) {
    vscode.setState({ ...(vscode.getState() ?? {}), settings });
  },

  async openFile() {
    return null;
  },
  async saveFile() {
    /* host does not own files */
  },
  async saveFileAs() {
    return null;
  },
  async listRecent() {
    return [];
  },
  async savePastedImage() {
    return null;
  },
  async exportHtml() {
    /* not supported in webview */
  },
  async exportPdf() {
    window.print();
  },

  watchSystemTheme(listener) {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data as { type: string; mode?: 'light' | 'dark' };
      if (msg?.type === 'theme' && (msg.mode === 'light' || msg.mode === 'dark')) {
        listener(msg.mode);
      }
    };
    window.addEventListener('message', onMessage);
    listener(document.body.classList.contains('vscode-dark') ? 'dark' : 'light');
    return () => window.removeEventListener('message', onMessage);
  },
};

window.addEventListener('message', (event) => {
  const msg = event.data as { type: string; source?: string; path?: string };
  if (msg?.type === 'source' && typeof msg.source === 'string') {
    useAppStore.getState().setSource(msg.source);
    useAppStore.getState().setFilePath(msg.path ?? null);
    const name = msg.path?.split(/[\\/]/).pop();
    if (name) useAppStore.getState().setFileName(name);
    useAppStore.getState().setVsConnected(true);
  }
});

function showError(msg: string): void {
  const el = document.getElementById('root');
  if (!el) return;
  el.style.cssText = 'padding:24px;font-family:ui-monospace,monospace;color:#f07178;white-space:pre-wrap;background:#1e1e1e;height:100vh;overflow:auto';
  el.textContent = msg;
}

window.addEventListener('error', (e) => {
  showError(`emdi webview error:\n${e.message}\n${e.filename}:${e.lineno}:${e.colno}\n\n${e.error?.stack ?? ''}`);
});
window.addEventListener('unhandledrejection', (e) => {
  showError(`emdi webview unhandled rejection:\n${String(e.reason?.stack ?? e.reason)}`);
});

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App host={host} previewOnly />
    </React.StrictMode>,
  );
  // Handshake: ask the extension to re-post the initial source + theme now
  // that the React app has mounted and registered its message listener.
  vscode.postMessage({ type: 'ready' });
} catch (err) {
  showError(`emdi mount error:\n${err instanceof Error ? err.stack ?? err.message : String(err)}`);
}

declare function acquireVsCodeApi<S>(): {
  postMessage(msg: unknown): void;
  getState(): S | undefined;
  setState(state: S): void;
};
