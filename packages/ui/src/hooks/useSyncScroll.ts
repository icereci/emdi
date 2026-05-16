import { useEffect, useRef } from 'react';
import type * as Monaco from 'monaco-editor';
import {
  collectSourceLineElements,
  createDirectionLock,
  lineForPreviewScroll,
  scrollPreviewToLine,
} from '@emdi/core/syncscroll';
import { useAppStore } from '../store.js';

/**
 * Bidirectional sync between Monaco and the preview scroll container.
 *
 * When the editor scrolls, find the source line at its top viewport line
 * (1-based) and align the preview's matching block. When the preview scrolls,
 * find the top block's source line and reveal it in the editor.
 *
 * The preview's content is in `bodyEl` (the .md-body element); the scrolling
 * viewport is `scrollEl` (the .preview-scroll element). `htmlVersion` is a
 * monotonic counter that invalidates the cached source-line entries when the
 * preview re-renders.
 */
export function useSyncScroll(
  editor: Monaco.editor.IStandaloneCodeEditor | null,
  scrollEl: HTMLElement | null,
  bodyEl: HTMLElement | null,
  htmlVersion: number,
): void {
  const enabled = useAppStore((s) => s.settings.tweaks.syncScroll);
  const lockRef = useRef(createDirectionLock(150));
  const entriesRef = useRef<ReturnType<typeof collectSourceLineElements>>([]);

  useEffect(() => {
    if (!bodyEl) return;
    entriesRef.current = collectSourceLineElements(bodyEl);
  }, [bodyEl, htmlVersion]);

  useEffect(() => {
    if (!enabled || !editor || !scrollEl || !bodyEl) return;

    const onEditorScroll = () => {
      if (lockRef.current.isLocked('editor')) return;
      lockRef.current.acquire('editor');
      const topLine = editor.getVisibleRanges()[0]?.startLineNumber ?? 1;
      scrollPreviewToLine(scrollEl, bodyEl, entriesRef.current, topLine);
    };

    const onPreviewScroll = () => {
      if (lockRef.current.isLocked('preview')) return;
      lockRef.current.acquire('preview');
      const line = lineForPreviewScroll(scrollEl, entriesRef.current);
      if (line !== null) {
        editor.revealLineNearTop(line);
      }
    };

    const disposable = editor.onDidScrollChange(onEditorScroll);
    scrollEl.addEventListener('scroll', onPreviewScroll, { passive: true });

    return () => {
      disposable.dispose();
      scrollEl.removeEventListener('scroll', onPreviewScroll);
    };
  }, [editor, scrollEl, bodyEl, enabled]);
}
