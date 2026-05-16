import { useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown, type Heading } from '@emdi/core/markdown';
import { previewFontSizeForZoom } from '@emdi/core/zoom';
import { useAppStore } from './store.js';
import { ZoomPill } from './ZoomPill.js';

interface Props {
  onHeadings?: (headings: Heading[]) => void;
  /** Called when the scroll element + body element are available, plus an htmlVersion counter. */
  onElementsReady?: (
    scrollEl: HTMLElement | null,
    bodyEl: HTMLElement | null,
    htmlVersion: number,
  ) => void;
  /** Called when the user clicks a rendered block (with its 1-based source line). */
  onBlockClick?: (sourceLine: number) => void;
}

export function PreviewPane({ onHeadings, onElementsReady, onBlockClick }: Props): JSX.Element {
  const source = useAppStore((s) => s.source);
  const zoom = useAppStore((s) => s.settings.zoom.preview);
  const setZoom = useAppStore((s) => s.setZoom);
  const flashToast = useAppStore((s) => s.flashToast);
  const setFocusedPane = useAppStore((s) => s.setFocusedPane);
  const focused = useAppStore((s) => s.focusedPane === 'preview');
  const allowHtml = useAppStore((s) => s.settings.allowRawHtml);
  const proseFont = useAppStore((s) => s.settings.tweaks.proseFont);
  const monoFont = useAppStore((s) => s.settings.tweaks.monoFont);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const flashLine = useAppStore((s) => s.flashLine);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [htmlVersion, setHtmlVersion] = useState(0);

  const { innerHtml, headings } = useMemo(
    () => renderMarkdown(source, { allowHtml }),
    [source, allowHtml],
  );

  // Mount HTML imperatively (so we can run mermaid/highlight effects on the same DOM).
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.innerHTML = innerHtml;
    setHtmlVersion((v) => v + 1);
    onHeadings?.(headings);

    // Mermaid rendering (best-effort, deferred to runtime presence).
    const renderToken = Math.random();
    (bodyRef.current as HTMLElement & { __renderToken?: number }).__renderToken = renderToken;
    const mermaidNodes = bodyRef.current.querySelectorAll<HTMLElement>('.mermaid');
    if (mermaidNodes.length) {
      void import('mermaid').then(({ default: mermaid }) => {
        try {
          mermaid.initialize({
            startOnLoad: false,
            theme: resolvedTheme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
          });
        } catch {
          /* ignore */
        }
        mermaidNodes.forEach(async (node) => {
          const src = node.getAttribute('data-mermaid-src') ?? node.textContent ?? '';
          const id = 'svg-' + Math.random().toString(36).slice(2, 9);
          try {
            const { svg } = await mermaid.render(id, src);
            if (
              bodyRef.current &&
              (bodyRef.current as HTMLElement & { __renderToken?: number }).__renderToken === renderToken
            ) {
              node.innerHTML = svg;
            }
          } catch (err) {
            if (
              bodyRef.current &&
              (bodyRef.current as HTMLElement & { __renderToken?: number }).__renderToken === renderToken
            ) {
              node.classList.add('error');
              node.textContent = '⚠ Mermaid error: ' + (err instanceof Error ? err.message : String(err));
            }
          }
        });
      });
    }
  }, [innerHtml, headings, onHeadings, resolvedTheme]);

  // Expose scroll + body element refs to the parent for sync-scroll wiring.
  useEffect(() => {
    onElementsReady?.(scrollRef.current, bodyRef.current, htmlVersion);
  }, [htmlVersion, onElementsReady]);

  // Click-to-locate: clicking a rendered block fires onBlockClick with its source line.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !onBlockClick) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('a') || target.closest('input')) return;
      const block = target.closest<HTMLElement>('[data-sline]');
      if (!block) return;
      const raw = block.getAttribute('data-sline');
      const line = raw ? Number.parseInt(raw, 10) : NaN;
      if (Number.isFinite(line)) onBlockClick(line);
    };
    body.addEventListener('click', handler);
    return () => body.removeEventListener('click', handler);
  }, [onBlockClick, htmlVersion]);

  // Flash a block when the editor cursor moves (or anyone requests a flash).
  useEffect(() => {
    if (!flashLine || !bodyRef.current) return;
    const blocks = bodyRef.current.querySelectorAll<HTMLElement>('[data-sline]');
    let target: HTMLElement | null = null;
    blocks.forEach((b) => {
      const s = Number.parseInt(b.getAttribute('data-sline') ?? 'NaN', 10);
      const e = Number.parseInt(b.getAttribute('data-eline') ?? 'NaN', 10);
      if (Number.isFinite(s) && flashLine.line >= s && (!Number.isFinite(e) || flashLine.line <= e)) {
        target = b;
      }
    });
    if (target) {
      const node = target as HTMLElement;
      node.classList.add('locate-flash');
      const t = window.setTimeout(() => node.classList.remove('locate-flash'), 1200);
      return () => window.clearTimeout(t);
    }
  }, [flashLine]);

  const fontSize = previewFontSizeForZoom(zoom);

  return (
    <div
      className="pane preview"
      onMouseDown={() => setFocusedPane('preview')}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div className="pane-head">
        <span className="label">
          <span className="swatch" style={{ background: 'var(--success)' }} />
          Preview — Rendered
        </span>
        <div style={{ flex: 1 }} />
        <ZoomPill
          value={zoom}
          focused={focused}
          onChange={(next) => {
            setZoom('preview', next);
            flashToast(`Preview ${next}%`);
          }}
        />
      </div>
      <div
        className="preview-scroll"
        ref={scrollRef}
        tabIndex={0}
        onFocus={() => setFocusedPane('preview')}
      >
        <div
          ref={bodyRef}
          className="md-body"
          style={{
            fontSize,
            ['--prose-font' as string]: proseFont,
            ['--mono-font' as string]: monoFont,
          }}
        />
      </div>
    </div>
  );
}
