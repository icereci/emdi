import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import { mergeSettings } from '@emdi/core/settings';
import { renderMarkdown, type Heading } from '@emdi/core/markdown';
import { findInSource, replaceOne, replaceAll, type EditorMatch } from '@emdi/core/find';
import { EditorPane } from './EditorPane.js';
import { PreviewPane } from './PreviewPane.js';
import { Splitter } from './Splitter.js';
import { StatusBar } from './StatusBar.js';
import { TopBar } from './TopBar.js';
import { OutlinePanel } from './OutlinePanel.js';
import { FindBar } from './FindBar.js';
import { ZoomToast } from './ZoomToast.js';
import { useAppStore } from './store.js';
import { useZoomShortcuts } from './hooks/useZoomShortcuts.js';
import { useTheme } from './hooks/useTheme.js';
import { useSyncScroll } from './hooks/useSyncScroll.js';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts.js';
import { useToastDismiss } from './hooks/useToastDismiss.js';
import type { AppHostBindings } from './AppHost.js';

interface Props {
  host: AppHostBindings;
  /** Preview-only mode hides the editor pane entirely (VS Code extension uses this). */
  previewOnly?: boolean;
}

export function App({ host, previewOnly = false }: Props): JSX.Element {
  const settings = useAppStore((s) => s.settings);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const source = useAppStore((s) => s.source);
  const setSource = useAppStore((s) => s.setSource);
  const setFilePath = useAppStore((s) => s.setFilePath);
  const setFileName = useAppStore((s) => s.setFileName);
  const markClean = useAppStore((s) => s.markClean);
  const filePath = useAppStore((s) => s.filePath);
  const requestJump = useAppStore((s) => s.requestJump);
  const findOpen = useAppStore((s) => s.findOpen);
  const findQuery = useAppStore((s) => s.findQuery);
  const findOptions = useAppStore((s) => s.findOptions);
  const findTarget = useAppStore((s) => s.findTarget);
  const findActiveIdx = useAppStore((s) => s.findActiveIdx);
  const findReplaceText = useAppStore((s) => s.findReplace);
  const previewHitCount = useAppStore((s) => s.previewHitCount);
  const setFindActiveIdx = useAppStore((s) => s.setFindActiveIdx);
  const flashToast = useAppStore((s) => s.flashToast);
  const accent = useAppStore((s) => s.settings.tweaks.accent);
  const monoFont = useAppStore((s) => s.settings.tweaks.monoFont);
  const proseFont = useAppStore((s) => s.settings.tweaks.proseFont);

  // Load persisted settings once on mount.
  useEffect(() => {
    let cancelled = false;
    host.loadSettings().then((partial) => {
      if (cancelled) return;
      useAppStore.setState({ settings: mergeSettings(partial) });
    });
    return () => {
      cancelled = true;
    };
  }, [host]);

  // Persist settings (debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      void host.saveSettings(settings);
    }, 300);
    return () => clearTimeout(t);
  }, [settings, host]);

  // Force preview-only mode when host doesn't own the editor.
  useEffect(() => {
    if (previewOnly && settings.viewMode !== 'preview') {
      setViewMode('preview');
    }
  }, [previewOnly, settings.viewMode, setViewMode]);

  useTheme(host);
  useZoomShortcuts();
  useToastDismiss();

  const onExportHtml = useCallback(async () => {
    const { html } = renderMarkdown(source, { allowHtml: settings.allowRawHtml });
    const fileName = useAppStore.getState().fileName.replace(/\.md$/i, '') || 'document';
    const wrapped = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtmlForBlob(fileName)}</title>
<style>body{font-family:-apple-system,Inter,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.7;color:#222}
h1,h2{border-bottom:1px solid #eee;padding-bottom:.2em}
pre{background:#f4f4f1;padding:14px;border-radius:8px;overflow-x:auto}
code{background:#f4f4f1;padding:2px 4px;border-radius:3px}
table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px}
blockquote{border-left:3px solid #888;padding:.4em 1em;color:#555;margin:1em 0;background:#fafafa}
</style></head><body>${html}</body></html>`;
    await host.exportHtml(wrapped, `${fileName}.html`);
    flashToast('Exported HTML');
  }, [host, source, settings.allowRawHtml, flashToast]);

  useGlobalShortcuts(host, onExportHtml);

  const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [previewScroll, setPreviewScroll] = useState<HTMLElement | null>(null);
  const [previewBody, setPreviewBody] = useState<HTMLElement | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [htmlVersion, setHtmlVersion] = useState(0);

  useSyncScroll(editor, previewScroll, previewBody, htmlVersion);

  const onElementsReady = useCallback(
    (scrollEl: HTMLElement | null, bodyEl: HTMLElement | null, v: number) => {
      setPreviewScroll(scrollEl);
      setPreviewBody(bodyEl);
      setHtmlVersion(v);
    },
    [],
  );

  const onBlockClick = useCallback(
    (sourceLine: number) => {
      requestJump(sourceLine);
    },
    [requestJump],
  );

  const onJumpHeading = useCallback(
    (slug: string) => {
      if (!previewBody) return;
      const el = previewBody.querySelector(`#${CSS.escape(slug)}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [previewBody],
  );

  // Find logic — editor matches computed here.
  const editorMatches: EditorMatch[] = useMemo(() => {
    if (findTarget !== 'editor' || !findQuery) return [];
    return findInSource(source, findQuery, findOptions);
  }, [source, findQuery, findOptions, findTarget]);

  // Jump editor to the active match when it changes.
  useEffect(() => {
    if (findTarget !== 'editor' || editorMatches.length === 0) return;
    const m = editorMatches[Math.min(findActiveIdx, editorMatches.length - 1)];
    if (m) requestJump(m.line);
  }, [findActiveIdx, editorMatches, findTarget, requestJump]);

  const totalCount = findTarget === 'editor' ? editorMatches.length : previewHitCount;

  const onNext = useCallback(() => {
    if (totalCount === 0) return;
    setFindActiveIdx((findActiveIdx + 1) % totalCount);
  }, [findActiveIdx, totalCount, setFindActiveIdx]);

  const onPrev = useCallback(() => {
    if (totalCount === 0) return;
    setFindActiveIdx((findActiveIdx - 1 + totalCount) % totalCount);
  }, [findActiveIdx, totalCount, setFindActiveIdx]);

  const onReplaceOne = useCallback(() => {
    if (findTarget !== 'editor' || editorMatches.length === 0) return;
    const m = editorMatches[Math.min(findActiveIdx, editorMatches.length - 1)];
    if (!m) return;
    setSource(replaceOne(source, m, findReplaceText));
  }, [findTarget, editorMatches, findActiveIdx, findReplaceText, source, setSource]);

  const onReplaceAll = useCallback(() => {
    if (findTarget !== 'editor' || editorMatches.length === 0) return;
    setSource(replaceAll(source, findQuery, findOptions, findReplaceText));
    flashToast(`Replaced ${editorMatches.length}`);
  }, [findTarget, editorMatches, source, findQuery, findOptions, findReplaceText, setSource, flashToast]);

  // Image-paste handler
  const onPasteImage = useCallback(
    async (file: File) => {
      const result = await host.savePastedImage(file);
      if (!result || !editor) return;
      const link = result.markdownLink + '\n\n';
      const pos = editor.getPosition();
      if (!pos) return;
      editor.executeEdits('emdi-paste-image', [
        {
          range: {
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: pos.lineNumber,
            endColumn: pos.column,
          },
          text: link,
          forceMoveMarkers: true,
        },
      ]);
      flashToast(`Saved → ${result.markdownLink}`);
    },
    [host, editor, flashToast],
  );

  // File event listeners (from global shortcuts)
  useEffect(() => {
    const open = async () => {
      const result = await host.openFile();
      if (!result) return;
      setSource(result.content);
      setFilePath(result.path);
      const name = result.path.split(/[\\/]/).pop();
      if (name) setFileName(name);
      flashToast(`Opened ${name ?? result.path}`);
    };
    const save = async () => {
      if (filePath) {
        await host.saveFile(filePath, source);
        markClean();
        flashToast('Saved');
      } else {
        const result = await host.saveFileAs(source);
        if (result) {
          setFilePath(result.path);
          const name = result.path.split(/[\\/]/).pop();
          if (name) setFileName(name);
          markClean();
          flashToast(`Saved ${name ?? result.path}`);
        }
      }
    };
    const saveAs = async () => {
      const result = await host.saveFileAs(source);
      if (result) {
        setFilePath(result.path);
        const name = result.path.split(/[\\/]/).pop();
        if (name) setFileName(name);
        markClean();
        flashToast(`Saved ${name ?? result.path}`);
      }
    };
    const newDoc = () => {
      setSource('');
      setFilePath(null);
      setFileName('Untitled.md');
    };
    window.addEventListener('emdi:open', open);
    window.addEventListener('emdi:save', save);
    window.addEventListener('emdi:save-as', saveAs);
    window.addEventListener('emdi:new', newDoc);
    return () => {
      window.removeEventListener('emdi:open', open);
      window.removeEventListener('emdi:save', save);
      window.removeEventListener('emdi:save-as', saveAs);
      window.removeEventListener('emdi:new', newDoc);
    };
  }, [host, source, filePath, setSource, setFilePath, setFileName, markClean, flashToast]);

  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const editorPane = host.ownsEditor ? (
    <EditorPane onEditorReady={setEditor} onPasteImage={onPasteImage} />
  ) : null;
  const previewPane = (
    <PreviewPane
      onHeadings={setHeadings}
      onElementsReady={onElementsReady}
      onBlockClick={onBlockClick}
    />
  );

  const rootStyle: React.CSSProperties = {
    ['--accent' as string]: accent,
    ['--accent-soft' as string]: `color-mix(in oklch, ${accent} 14%, transparent)`,
    ['--selection' as string]: `color-mix(in oklch, ${accent} 28%, transparent)`,
    ['--mono-font' as string]: monoFont,
    ['--prose-font' as string]: proseFont,
  };

  const showSplitter = settings.viewMode === 'split' && editorPane !== null;
  const showEditorOnly = settings.viewMode === 'editor' && editorPane !== null;
  const showPreviewOnly = settings.viewMode === 'preview' || editorPane === null;

  const swapped = settings.swapPanes;
  const leftPane = swapped ? previewPane : editorPane;
  const rightPane = swapped ? editorPane : previewPane;

  return (
    <div className="emdi-root" style={rootStyle}>
      {!previewOnly && (
        <TopBar
          onOpenFile={() => window.dispatchEvent(new CustomEvent('emdi:open'))}
          onSave={() => window.dispatchEvent(new CustomEvent('emdi:save'))}
          onExportHtml={() => void onExportHtml()}
          onExportPdf={() => void host.exportPdf()}
        />
      )}

      <div
        ref={workspaceRef}
        className={`workspace ${showSplitter ? '' : 'single'}`}
        style={{ position: 'relative' }}
      >
        {!previewOnly && (
          <OutlinePanel headings={headings} onJumpHeading={onJumpHeading} />
        )}

        {showSplitter ? (
          <>
            <div style={{ flex: settings.splitRatio, display: 'flex', minWidth: 0 }}>{leftPane}</div>
            <Splitter workspaceRef={workspaceRef} />
            <div style={{ flex: 1 - settings.splitRatio, display: 'flex', minWidth: 0 }}>{rightPane}</div>
          </>
        ) : showEditorOnly ? (
          editorPane
        ) : showPreviewOnly ? (
          previewPane
        ) : null}

        <ZoomToast />

        {!previewOnly && findOpen && (
          <FindBar
            totalCount={totalCount}
            onNext={onNext}
            onPrev={onPrev}
            onReplaceOne={onReplaceOne}
            onReplaceAll={onReplaceAll}
          />
        )}
      </div>

      <StatusBar compact={previewOnly} />
    </div>
  );
}

function escapeHtmlForBlob(s: string): string {
  return s.replace(/[<>&"]/g, (c) => {
    const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' };
    return map[c] ?? c;
  });
}
