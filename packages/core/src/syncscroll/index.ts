/**
 * Sync-scroll utilities — heading/block-anchored, line-interpolating.
 *
 * Each rendered top-level block carries `data-sline="N"` (and `data-eline="M"`)
 * from the source-map markdown-it plugin. To align the preview with the
 * editor's current top-visible line, we find the surrounding pair of blocks
 * (prev with line ≤ editorLine, next with line > editorLine) and linearly
 * interpolate the scroll position between them.
 *
 * Direction-locking prevents feedback loops: when one side initiates a scroll,
 * the other side ignores its own scroll handler for ~150ms.
 */

export interface SourceLineElement {
  line: number;
  el: HTMLElement;
}

export function collectSourceLineElements(container: HTMLElement): SourceLineElement[] {
  const nodes = container.querySelectorAll<HTMLElement>('[data-sline]');
  const out: SourceLineElement[] = [];
  for (const el of nodes) {
    const raw = el.getAttribute('data-sline');
    if (raw === null) continue;
    const line = Number.parseInt(raw, 10);
    if (Number.isFinite(line)) out.push({ line, el });
  }
  out.sort((a, b) => a.line - b.line);
  return out;
}

/** Find the entry with largest line <= targetLine. Returns null if none. */
export function findPrevAnchor(entries: SourceLineElement[], targetLine: number): SourceLineElement | null {
  if (entries.length === 0) return null;
  let lo = 0;
  let hi = entries.length - 1;
  let best: SourceLineElement | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const entry = entries[mid];
    if (!entry) break;
    if (entry.line <= targetLine) {
      best = entry;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/** Find the entry with smallest line > targetLine. */
export function findNextAnchor(entries: SourceLineElement[], targetLine: number): SourceLineElement | null {
  for (const entry of entries) {
    if (entry.line > targetLine) return entry;
  }
  return null;
}

/**
 * Scroll the preview's scroll container so that the editor's current top
 * line maps to the right position, interpolating between block anchors.
 *
 * `bodyEl` is the .md-body element (the content); `scrollEl` is the
 * scrolling viewport (.preview-scroll).
 */
export function scrollPreviewToLine(
  scrollEl: HTMLElement,
  bodyEl: HTMLElement,
  entries: SourceLineElement[],
  editorTopLine: number,
): void {
  if (entries.length === 0) return;
  const prev = findPrevAnchor(entries, editorTopLine);
  if (!prev) {
    scrollEl.scrollTop = 0;
    return;
  }
  const next = findNextAnchor(entries, editorTopLine);
  const prevTop = prev.el.offsetTop;
  const nextTop = next ? next.el.offsetTop : bodyEl.scrollHeight;
  const prevLine = prev.line;
  const nextLine = next ? next.line : prev.line + 30;
  const ratio = clamp01((editorTopLine - prevLine) / Math.max(1, nextLine - prevLine));
  const target = prevTop + (nextTop - prevTop) * ratio - 20;
  scrollEl.scrollTop = Math.max(0, target);
}

/** Inverse: given the preview's scroll position, return the editor line to align to. */
export function lineForPreviewScroll(
  scrollEl: HTMLElement,
  entries: SourceLineElement[],
): number | null {
  const containerTop = scrollEl.getBoundingClientRect().top;
  let best: SourceLineElement | null = null;
  for (const entry of entries) {
    const top = entry.el.getBoundingClientRect().top;
    if (top - containerTop <= 0) {
      best = entry;
    } else {
      break;
    }
  }
  return best?.line ?? entries[0]?.line ?? null;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Tiny direction lock to break feedback loops. */
export function createDirectionLock(holdMs = 150) {
  let lockedBy: 'editor' | 'preview' | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    acquire(side: 'editor' | 'preview'): void {
      lockedBy = side;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lockedBy = null;
        timer = null;
      }, holdMs);
    },
    isLocked(side: 'editor' | 'preview'): boolean {
      return lockedBy !== null && lockedBy !== side;
    },
  };
}
