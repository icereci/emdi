/**
 * Non-linear zoom steps matching the Claude Design contract.
 * Centered on 100%, with finer steps near the middle.
 */
export const ZOOM_STEPS = [50, 60, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200, 225, 250, 300] as const;

export const ZOOM_MIN: number = ZOOM_STEPS[0];
export const ZOOM_MAX: number = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? 300;
export const ZOOM_DEFAULT = 100;

export type PaneId = 'editor' | 'preview';

export interface ZoomState {
  editor: number;
  preview: number;
}

export const DEFAULT_ZOOM_STATE: ZoomState = {
  editor: ZOOM_DEFAULT,
  preview: ZOOM_DEFAULT,
};

export function clampZoom(value: number): number {
  if (Number.isNaN(value)) return ZOOM_DEFAULT;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(value)));
}

/**
 * Returns the next zoom step in the given direction (+1 or -1) using the
 * non-linear ZOOM_STEPS array. Matches the design's prototype.
 */
export function nextZoom(current: number, dir: 1 | -1): number {
  let idx = ZOOM_STEPS.findIndex((s) => s >= current);
  if (idx === -1) idx = ZOOM_STEPS.length - 1;
  if (ZOOM_STEPS[idx] === current) idx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir));
  else if (dir < 0) idx = Math.max(0, idx - 1);
  const next = ZOOM_STEPS[idx];
  return next ?? ZOOM_DEFAULT;
}

export function zoomIn(current: number): number {
  return nextZoom(current, 1);
}

export function zoomOut(current: number): number {
  return nextZoom(current, -1);
}

export function zoomReset(): number {
  return ZOOM_DEFAULT;
}

/** Returns the editor font size (Monaco's `fontSize`) for a given zoom %. */
export function editorFontSizeForZoom(zoomPercent: number, basePx = 14): number {
  return Math.round((basePx * zoomPercent) / 100);
}

/** Returns the preview body font size (px) for a given zoom %. */
export function previewFontSizeForZoom(zoomPercent: number, basePx = 15): number {
  return Math.round((basePx * zoomPercent) / 100);
}

/** Multiplier for CSS scaling (when using `--prose-font-scale` etc.). */
export function previewFontScaleForZoom(zoomPercent: number): number {
  return zoomPercent / 100;
}
