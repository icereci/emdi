import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type ViewMode,
  type TweakSettings,
} from '@emdi/core/settings';
import {
  clampZoom,
  zoomIn as zoomInCalc,
  zoomOut as zoomOutCalc,
  ZOOM_DEFAULT,
  type PaneId,
} from '@emdi/core/zoom';
import type { ThemePreference, ThemeMode } from '@emdi/core/theme';
import { DEFAULT_FIND_OPTIONS, type FindOptions, type FindTarget } from '@emdi/core/find';

export interface VsCodeThemeRef {
  id: string;
  label: string;
  kind: ThemeMode;
}

export interface AppState {
  settings: AppSettings;
  /** Resolved theme mode (after applying 'system'/'auto' to OS preference). */
  resolvedTheme: ThemeMode;
  /** Markdown source. Owned by us in standalone; mirrors the editor doc in VS Code preview-only mode. */
  source: string;
  /** Path of the currently open file (standalone only). */
  filePath: string | null;
  /** Filename shown in the topbar's file tab. */
  fileName: string;
  /** Whether the buffer has unsaved changes. */
  dirty: boolean;
  /** Cursor location (1-based, includes front-matter offset). */
  cursor: { line: number; col: number };
  /** Which pane currently has focus (drives focused-zoom-bolding and Ctrl+= target). */
  focusedPane: PaneId;

  /** Outline panel collapsed flag. */
  outlineCollapsed: boolean;

  /** Find/replace bar state. */
  findOpen: boolean;
  findQuery: string;
  findReplace: string;
  findTarget: FindTarget;
  findOptions: FindOptions;
  findActiveIdx: number;
  previewHitCount: number;

  /** Last zoom-toast message. Reset to null when dismissed. */
  toast: string | null;
  toastVersion: number;

  /** A "please scroll editor to this line" request from preview/outline/find. */
  jumpRequest: { line: number; version: number } | null;
  /** A "please flash this line in preview" request from editor cursor. */
  flashLine: { line: number; version: number } | null;

  /** VS Code integration state (only meaningful inside the extension webview). */
  vsConnected: boolean;
  vsTheme: VsCodeThemeRef;

  // Actions
  setSource: (source: string) => void;
  setFilePath: (path: string | null) => void;
  setFileName: (name: string) => void;
  markClean: () => void;
  setCursor: (line: number, col: number) => void;
  setFocusedPane: (pane: PaneId) => void;

  setThemePreference: (pref: ThemePreference) => void;
  setResolvedTheme: (mode: ThemeMode) => void;
  setViewMode: (mode: ViewMode) => void;
  cycleViewMode: () => void;
  setSplitRatio: (ratio: number) => void;
  setSwapPanes: (swap: boolean) => void;
  toggleSwapPanes: () => void;
  toggleSyncScroll: () => void;
  setOutlineCollapsed: (collapsed: boolean) => void;
  toggleOutline: () => void;
  setTweak: <K extends keyof TweakSettings>(key: K, value: TweakSettings[K]) => void;

  setZoom: (pane: PaneId, value: number) => void;
  zoomIn: (pane: PaneId) => number;
  zoomOut: (pane: PaneId) => number;
  resetZoom: (pane: PaneId) => void;

  setFindOpen: (open: boolean) => void;
  toggleFind: () => void;
  setFindQuery: (q: string) => void;
  setFindReplace: (r: string) => void;
  setFindTarget: (t: FindTarget) => void;
  setFindOptions: (opts: FindOptions) => void;
  setFindActiveIdx: (n: number) => void;
  setPreviewHitCount: (n: number) => void;

  flashToast: (msg: string) => void;
  clearToast: () => void;

  requestJump: (line: number) => void;
  requestFlash: (line: number) => void;

  setVsConnected: (b: boolean) => void;
  setVsTheme: (t: VsCodeThemeRef) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS, tweaks: { ...DEFAULT_SETTINGS.tweaks } },
  resolvedTheme: 'dark',
  source: '',
  filePath: null,
  fileName: 'Untitled.md',
  dirty: false,
  cursor: { line: 1, col: 1 },
  focusedPane: 'editor',

  outlineCollapsed: !DEFAULT_SETTINGS.tweaks.showOutline,

  findOpen: false,
  findQuery: '',
  findReplace: '',
  findTarget: 'editor',
  findOptions: { ...DEFAULT_FIND_OPTIONS },
  findActiveIdx: 0,
  previewHitCount: 0,

  toast: null,
  toastVersion: 0,

  jumpRequest: null,
  flashLine: null,

  vsConnected: false,
  vsTheme: { id: 'dark-modern', label: 'Dark Modern', kind: 'dark' },

  setSource: (source) =>
    set((s) => ({ source, dirty: s.filePath !== null && source !== s.source ? true : s.dirty })),
  setFilePath: (filePath) => set({ filePath, dirty: false }),
  setFileName: (fileName) => set({ fileName }),
  markClean: () => set({ dirty: false }),
  setCursor: (line, col) => set({ cursor: { line, col } }),
  setFocusedPane: (focusedPane) => set({ focusedPane }),

  setThemePreference: (themePreference) =>
    set((s) => ({ settings: { ...s.settings, themePreference } })),
  setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
  setViewMode: (viewMode) => set((s) => ({ settings: { ...s.settings, viewMode } })),
  cycleViewMode: () =>
    set((s) => {
      const order: ViewMode[] = ['split', 'editor', 'preview'];
      const i = order.indexOf(s.settings.viewMode);
      const next = order[(i + 1) % order.length] ?? 'split';
      return { settings: { ...s.settings, viewMode: next } };
    }),
  setSplitRatio: (splitRatio) =>
    set((s) => ({ settings: { ...s.settings, splitRatio: Math.max(0.18, Math.min(0.82, splitRatio)) } })),
  setSwapPanes: (swapPanes) => set((s) => ({ settings: { ...s.settings, swapPanes } })),
  toggleSwapPanes: () => set((s) => ({ settings: { ...s.settings, swapPanes: !s.settings.swapPanes } })),
  toggleSyncScroll: () =>
    set((s) => ({
      settings: { ...s.settings, tweaks: { ...s.settings.tweaks, syncScroll: !s.settings.tweaks.syncScroll } },
    })),
  setOutlineCollapsed: (outlineCollapsed) => set({ outlineCollapsed }),
  toggleOutline: () => set((s) => ({ outlineCollapsed: !s.outlineCollapsed })),
  setTweak: (key, value) =>
    set((s) => ({ settings: { ...s.settings, tweaks: { ...s.settings.tweaks, [key]: value } } })),

  setZoom: (pane, value) =>
    set((s) => ({
      settings: { ...s.settings, zoom: { ...s.settings.zoom, [pane]: clampZoom(value) } },
    })),
  zoomIn: (pane) => {
    const next = zoomInCalc(get().settings.zoom[pane]);
    set((s) => ({ settings: { ...s.settings, zoom: { ...s.settings.zoom, [pane]: next } } }));
    return next;
  },
  zoomOut: (pane) => {
    const next = zoomOutCalc(get().settings.zoom[pane]);
    set((s) => ({ settings: { ...s.settings, zoom: { ...s.settings.zoom, [pane]: next } } }));
    return next;
  },
  resetZoom: (pane) =>
    set((s) => ({ settings: { ...s.settings, zoom: { ...s.settings.zoom, [pane]: ZOOM_DEFAULT } } })),

  setFindOpen: (findOpen) => set({ findOpen }),
  toggleFind: () => set((s) => ({ findOpen: !s.findOpen })),
  setFindQuery: (findQuery) => set({ findQuery, findActiveIdx: 0 }),
  setFindReplace: (findReplace) => set({ findReplace }),
  setFindTarget: (findTarget) => set({ findTarget, findActiveIdx: 0 }),
  setFindOptions: (findOptions) => set({ findOptions, findActiveIdx: 0 }),
  setFindActiveIdx: (findActiveIdx) => set({ findActiveIdx }),
  setPreviewHitCount: (previewHitCount) => set({ previewHitCount }),

  flashToast: (msg) => set((s) => ({ toast: msg, toastVersion: s.toastVersion + 1 })),
  clearToast: () => set({ toast: null }),

  requestJump: (line) => set((s) => ({ jumpRequest: { line, version: (s.jumpRequest?.version ?? 0) + 1 } })),
  requestFlash: (line) => set((s) => ({ flashLine: { line, version: (s.flashLine?.version ?? 0) + 1 } })),

  setVsConnected: (vsConnected) => set({ vsConnected }),
  setVsTheme: (vsTheme) => set({ vsTheme }),
}));
