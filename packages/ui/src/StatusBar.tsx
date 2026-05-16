import { useMemo } from 'react';
import { Icons } from './Icons.js';
import { useAppStore } from './store.js';

const WORDS_PER_MINUTE = 220;

interface Props {
  /**
   * Compact layout for embedded contexts (e.g. the VS Code extension preview),
   * where VS Code's own status bar already covers cursor position, language,
   * and encoding. Drops everything but the preview-zoom % and theme indicator,
   * plus a small word-count / reading-time chip on the left.
   */
  compact?: boolean;
}

export function StatusBar({ compact = false }: Props = {}): JSX.Element {
  const source = useAppStore((s) => s.source);
  const cursor = useAppStore((s) => s.cursor);
  const viewMode = useAppStore((s) => s.settings.viewMode);
  const editorZoom = useAppStore((s) => s.settings.zoom.editor);
  const previewZoom = useAppStore((s) => s.settings.zoom.preview);
  const themePref = useAppStore((s) => s.settings.themePreference);
  const resolvedTheme = useAppStore((s) => s.resolvedTheme);
  const focusedPane = useAppStore((s) => s.focusedPane);
  const vsConnected = useAppStore((s) => s.vsConnected);

  const { words, mins, lines, chars } = useMemo(() => {
    const trimmed = source.trim();
    const w = trimmed ? trimmed.split(/\s+/).length : 0;
    return {
      words: w,
      mins: Math.max(1, Math.round(w / WORDS_PER_MINUTE)),
      lines: (source.match(/\n/g)?.length ?? 0) + 1,
      chars: source.length,
    };
  }, [source]);

  const themeLabel =
    themePref === 'auto' || themePref === 'system' ? `auto · ${resolvedTheme}` : themePref;

  if (compact) {
    return (
      <div className="statusbar" role="status">
        <span className="sb-item">
          {words} words · ~{mins} min read
        </span>
        <span className="sb-grow" />
        <span className="sb-item" title="Preview zoom">
          {previewZoom}%
        </span>
        <span className="sb-sep" />
        <span className="sb-item">{themeLabel}</span>
      </div>
    );
  }

  return (
    <div className="statusbar" role="status">
      {vsConnected ? (
        <span className="sb-item">{Icons.vscode} VS Code · synced</span>
      ) : (
        <span className="sb-item">{Icons.edit} emdi · standalone</span>
      )}
      <span className="sb-sep" />
      <span className="sb-item">{viewMode}</span>
      <span className="sb-sep" />
      <span className="sb-item">
        Ln {cursor.line}, Col {cursor.col}
      </span>
      <span className="sb-sep" />
      <span className="sb-item">
        {lines} ln · {words} wd · {chars} ch
      </span>
      <span className="sb-sep" />
      <span className="sb-item">~{mins} min read</span>
      <span className="sb-grow" />
      <span className="sb-item">Markdown · UTF-8</span>
      <span className="sb-sep" />
      <span className="sb-item" title="Focused-pane zoom in bold">
        edit <b style={{ fontWeight: focusedPane === 'editor' ? 700 : 400 }}>{editorZoom}%</b>
        {' · '}
        read <b style={{ fontWeight: focusedPane === 'preview' ? 700 : 400 }}>{previewZoom}%</b>
      </span>
      <span className="sb-sep" />
      <span className="sb-item">{themeLabel}</span>
    </div>
  );
}
