import type { AppSettings } from '@emdi/core/settings';

/**
 * The host environment (Tauri desktop OR VS Code webview) implements this
 * interface. Captures the only operations that differ between hosts: file
 * I/O, settings persistence, OS-theme detection, and image-paste storage.
 */
export interface AppHostBindings {
  /** True when this host owns its own editor (desktop). False when an external editor feeds the source (VS Code preview-only). */
  ownsEditor: boolean;

  /** Load persisted settings, if any. */
  loadSettings(): Promise<Partial<AppSettings>>;
  /** Persist settings. Called debounced from the store on change. */
  saveSettings(settings: AppSettings): Promise<void>;

  /** File operations (desktop only — VS Code host passes no-ops). */
  openFile(): Promise<{ path: string; content: string } | null>;
  saveFile(path: string, content: string): Promise<void>;
  saveFileAs(content: string): Promise<{ path: string } | null>;
  listRecent(): Promise<string[]>;

  /**
   * Save a pasted image to a host-managed asset directory and return the
   * markdown link to insert. Desktop writes to ./assets/. VS Code can also
   * write next to the file via its API.
   */
  savePastedImage(file: File): Promise<{ markdownLink: string } | null>;

  /** Export rendered HTML. Default impl can be "download as file". */
  exportHtml(html: string, suggestedName: string): Promise<void>;
  /** Trigger the print dialog (browser-driven PDF export). */
  exportPdf(): Promise<void>;

  /** Initial OS theme + change subscription. Returns the current mode and a teardown for the listener. */
  watchSystemTheme(listener: (mode: 'light' | 'dark') => void): () => void;
}
