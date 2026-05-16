import type { ThemePreference } from '../theme/index.js';
import { DEFAULT_ZOOM_STATE, type ZoomState } from '../zoom/index.js';

export type ViewMode = 'editor' | 'split' | 'preview';

export interface TweakSettings {
  /** Accent color (CSS color). */
  accent: string;
  monoFont: string;
  proseFont: string;
  showLineNumbers: boolean;
  syncScroll: boolean;
  wordWrap: boolean;
  showOutline: boolean;
}

export const DEFAULT_TWEAKS: TweakSettings = {
  accent: '#7aa2ff',
  monoFont: 'JetBrains Mono',
  proseFont: 'Inter',
  showLineNumbers: true,
  syncScroll: true,
  wordWrap: true,
  showOutline: true,
};

export interface AppSettings {
  themePreference: ThemePreference;
  viewMode: ViewMode;
  zoom: ZoomState;
  splitRatio: number; // 0..1
  swapPanes: boolean;
  allowRawHtml: boolean;
  tweaks: TweakSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themePreference: 'system',
  viewMode: 'split',
  zoom: DEFAULT_ZOOM_STATE,
  splitRatio: 0.5,
  swapPanes: false,
  allowRawHtml: false,
  tweaks: DEFAULT_TWEAKS,
};

/** A storage adapter that both desktop and VS Code apps implement. */
export interface SettingsStore {
  load(): Promise<Partial<AppSettings>>;
  save(settings: AppSettings): Promise<void>;
}

export function mergeSettings(partial: Partial<AppSettings> | undefined): AppSettings {
  if (!partial) return cloneSettings(DEFAULT_SETTINGS);
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    zoom: { ...DEFAULT_SETTINGS.zoom, ...(partial.zoom ?? {}) },
    tweaks: { ...DEFAULT_SETTINGS.tweaks, ...(partial.tweaks ?? {}) },
  };
}

function cloneSettings(s: AppSettings): AppSettings {
  return {
    ...s,
    zoom: { ...s.zoom },
    tweaks: { ...s.tweaks },
  };
}
