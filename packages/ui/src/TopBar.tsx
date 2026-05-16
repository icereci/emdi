import { useEffect, useRef, useState } from 'react';
import { Icons } from './Icons.js';
import { useAppStore } from './store.js';

interface Props {
  onOpenFile: () => void;
  onSave: () => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
}

export function TopBar({ onOpenFile, onSave, onExportHtml, onExportPdf }: Props): JSX.Element {
  const themePref = useAppStore((s) => s.settings.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const viewMode = useAppStore((s) => s.settings.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const swapPanes = useAppStore((s) => s.settings.swapPanes);
  const toggleSwapPanes = useAppStore((s) => s.toggleSwapPanes);
  const outlineCollapsed = useAppStore((s) => s.outlineCollapsed);
  const toggleOutline = useAppStore((s) => s.toggleOutline);
  const fileName = useAppStore((s) => s.fileName);
  const dirty = useAppStore((s) => s.dirty);
  const toggleFind = useAppStore((s) => s.toggleFind);
  const vsConnected = useAppStore((s) => s.vsConnected);
  const vsTheme = useAppStore((s) => s.vsTheme);

  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && e.target && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const themePrefForButton = themePref === 'system' ? 'auto' : themePref;

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">e</div>
        emdi
        <div className="brand-dot" />
      </div>

      <button
        className={`icon-btn ${!outlineCollapsed ? 'active' : ''}`}
        onClick={toggleOutline}
        title="Toggle outline (Ctrl+B)"
      >
        {Icons.list}
      </button>

      <div className={`file-tab ${dirty ? '' : 'saved'}`}>
        <span className="dot" />
        {fileName}
        <span style={{ opacity: 0.55 }}>{dirty ? '•' : ''}</span>
      </div>

      <div className="spacer" />

      <button className="icon-btn" onClick={toggleFind} title="Find & replace (Ctrl+F)">
        {Icons.find}
      </button>

      <div className="seg" role="tablist" aria-label="View mode">
        <button
          className={viewMode === 'editor' ? 'active' : ''}
          onClick={() => setViewMode('editor')}
          title="Editor only (Ctrl+\)"
        >
          {Icons.edit} Edit
        </button>
        <button
          className={viewMode === 'split' ? 'active' : ''}
          onClick={() => setViewMode('split')}
          title="Side-by-side (Ctrl+\)"
        >
          {Icons.split} Split
        </button>
        <button
          className={viewMode === 'preview' ? 'active' : ''}
          onClick={() => setViewMode('preview')}
          title="Preview only (Ctrl+\)"
        >
          {Icons.eye} Preview
        </button>
      </div>

      <button
        className="icon-btn"
        onClick={toggleSwapPanes}
        title="Swap panes"
        style={{
          opacity: viewMode === 'split' ? 1 : 0.35,
          pointerEvents: viewMode === 'split' ? 'auto' : 'none',
        }}
      >
        {Icons.swap}
      </button>

      <button className="vs-badge" title="VS Code integration" type="button">
        <span className="pulse" />
        {vsConnected ? `VS Code · ${vsTheme.label}` : 'VS Code · standalone'}
      </button>

      <div className="theme-seg" title="Theme: dark / auto / light">
        <button
          className={themePrefForButton === 'dark' ? 'active' : ''}
          onClick={() => setThemePreference('dark')}
          title="Dark"
        >
          {Icons.moon}
        </button>
        <button
          className={themePrefForButton === 'auto' ? 'active' : ''}
          onClick={() => setThemePreference('auto')}
          title="Follow OS"
        >
          {Icons.auto}
        </button>
        <button
          className={themePrefForButton === 'light' ? 'active' : ''}
          onClick={() => setThemePreference('light')}
          title="Light"
        >
          {Icons.sun}
        </button>
      </div>

      <div ref={moreRef} style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => setMoreOpen((v) => !v)} title="More">
          {Icons.more}
        </button>
        {moreOpen && (
          <div className="menu" style={{ right: 0 }}>
            <div className="menu-label">File</div>
            <div
              className="menu-item"
              onClick={() => {
                setMoreOpen(false);
                onOpenFile();
              }}
            >
              Open .md… <span className="hint">⌘O</span>
            </div>
            <div
              className="menu-item"
              onClick={() => {
                setMoreOpen(false);
                onSave();
              }}
            >
              Save <span className="hint">⌘S</span>
            </div>
            <div className="menu-sep" />
            <div className="menu-label">Export</div>
            <div
              className="menu-item"
              onClick={() => {
                setMoreOpen(false);
                onExportHtml();
              }}
            >
              {Icons.download} HTML
            </div>
            <div
              className="menu-item"
              onClick={() => {
                setMoreOpen(false);
                onExportPdf();
              }}
            >
              {Icons.download} PDF (print) <span className="hint">⌘P</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
