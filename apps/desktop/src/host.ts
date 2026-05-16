import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, writeFile, mkdir, exists, BaseDirectory } from '@tauri-apps/plugin-fs';
import { Store } from '@tauri-apps/plugin-store';
import type { AppHostBindings } from '@emdi/ui';
import type { AppSettings } from '@emdi/core/settings';

const SETTINGS_KEY = 'settings';
const RECENT_KEY = 'recent';
const MAX_RECENT = 10;
const STORE_FILE = 'emdi.json';

const MD_FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'mdown'] }];

export function createDesktopHost(): AppHostBindings {
  let storePromise: Promise<Store> | null = null;
  const getStore = () => {
    if (!storePromise) storePromise = Store.load(STORE_FILE);
    return storePromise;
  };

  const pushRecent = async (path: string) => {
    const store = await getStore();
    const existing = (await store.get<string[]>(RECENT_KEY)) ?? [];
    const next = [path, ...existing.filter((p) => p !== path)].slice(0, MAX_RECENT);
    await store.set(RECENT_KEY, next);
    await store.save();
  };

  return {
    ownsEditor: true,

    async loadSettings() {
      try {
        const store = await getStore();
        return (await store.get<Partial<AppSettings>>(SETTINGS_KEY)) ?? {};
      } catch {
        return {};
      }
    },

    async saveSettings(settings) {
      try {
        const store = await getStore();
        await store.set(SETTINGS_KEY, settings);
        await store.save();
      } catch {
        /* best-effort */
      }
    },

    async openFile() {
      const path = await open({ multiple: false, filters: MD_FILTERS });
      if (typeof path !== 'string') return null;
      const content = await readTextFile(path);
      await pushRecent(path);
      return { path, content };
    },

    async saveFile(path, content) {
      await writeTextFile(path, content);
      await pushRecent(path);
    },

    async saveFileAs(content) {
      const path = await save({ filters: MD_FILTERS });
      if (typeof path !== 'string') return null;
      await writeTextFile(path, content);
      await pushRecent(path);
      return { path };
    },

    async listRecent() {
      const store = await getStore();
      return (await store.get<string[]>(RECENT_KEY)) ?? [];
    },

    async savePastedImage(file) {
      // Best-effort: drop the image into ./assets/ next to the current document.
      // If no document is open we save to the app data dir.
      const ts = new Date();
      const stamp =
        `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-` +
        `${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
      const ext = (file.type.split('/')[1] ?? 'png').replace('jpeg', 'jpg');
      const name = `pasted-${stamp}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      try {
        // Try app-data-dir assets folder. Tauri's full-path-relative-to-document
        // saving requires more setup; this is a reasonable v1.
        const assetsDir = 'assets';
        if (!(await exists(assetsDir, { baseDir: BaseDirectory.AppData }))) {
          await mkdir(assetsDir, { baseDir: BaseDirectory.AppData, recursive: true });
        }
        await writeFile(`${assetsDir}/${name}`, bytes, { baseDir: BaseDirectory.AppData });
        return { markdownLink: `![pasted image](assets/${name})` };
      } catch {
        return null;
      }
    },

    async exportHtml(html, suggestedName) {
      const path = await save({
        defaultPath: suggestedName,
        filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
      });
      if (typeof path !== 'string') return;
      await writeTextFile(path, html);
    },

    async exportPdf() {
      // Browser-based PDF export via the print stylesheet.
      window.print();
    },

    watchSystemTheme(listener) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      listener(mql.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => listener(e.matches ? 'dark' : 'light');
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    },
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
