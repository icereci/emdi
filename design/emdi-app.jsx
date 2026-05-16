// emdi-app.jsx — main app shell, state orchestration, top bar, status bar, sample.

const { useState: useS, useEffect: useE, useRef: useR, useMemo: useM, useCallback: useCB } = React;

const SAMPLE_MD = `---
title: Welcome to emdi
author: you
date: 2026-05-16
tags: [markdown, demo, write]
---

# Welcome to **emdi**

A focused markdown editor with three killer features — zoom, theme, side-by-side —
plus the modern essentials: outline, sync scroll, find/replace, math, diagrams,
front-matter, paste-images, and export.

> *"The simplest markdown editor that finally respects my eyes."*

## Quick tour

| Shortcut          | Action                                  |
| ----------------- | --------------------------------------- |
| <kbd>Ctrl</kbd> + <kbd>=</kbd>  | Zoom in the focused pane               |
| <kbd>Ctrl</kbd> + <kbd>-</kbd>  | Zoom out                                |
| <kbd>Ctrl</kbd> + <kbd>0</kbd>  | Reset zoom                              |
| <kbd>Ctrl</kbd> + <kbd>\\\\</kbd> | Cycle view (split → edit → read)        |
| <kbd>Ctrl</kbd> + <kbd>K</kbd>  | Cycle theme (dark → light → auto)       |
| <kbd>Ctrl</kbd> + <kbd>F</kbd>  | Find (regex, case, preview-search)      |
| <kbd>Ctrl</kbd> + <kbd>B</kbd>  | Toggle outline panel                    |

## Outline & sync scroll

The left sidebar is auto-generated from your headings. Click any heading to jump.
Scrolling either pane scrolls the other in sync — anchored on headings so tall
code blocks don't throw it off.

### Click-to-locate

Click any paragraph in the rendered view → the editor cursor jumps to the source
line. Move the cursor in the editor → the matching block flashes on the right.

## Math (KaTeX)

Inline: $e^{i\\pi} + 1 = 0$  and  $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$.

Display:

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

$$
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0} \\qquad
\\nabla \\times \\mathbf{B} = \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
$$

## Diagrams (Mermaid)

\`\`\`mermaid
flowchart LR
  A[Markdown] -->|parse| B(AST)
  B --> C{render}
  C -->|html| D[Preview]
  C -->|outline| E[TOC]
  D --> F((sync))
  E --> F
\`\`\`

\`\`\`mermaid
sequenceDiagram
  participant U as User
  participant E as emdi
  participant FS as ./assets/
  U->>E: paste image
  E->>FS: write image-1.png
  FS-->>E: path
  E-->>U: ![](assets/image-1.png)
\`\`\`

## Code

\`\`\`javascript
// Live preview with debounced rendering
function renderMarkdown(src) {
  const { html, headings } = parse(src);
  return { html: DOMPurify.sanitize(html), headings };
}
\`\`\`

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Return the first n Fibonacci numbers."""
    a, b, out = 0, 1, []
    for _ in range(n):
        out.append(a)
        a, b = b, a + b
    return out
\`\`\`

## Lists with smart continuation

Press <kbd>Enter</kbd> at the end of a bullet to continue; press <kbd>Enter</kbd>
on an empty bullet to exit the list.

- [x] CommonMark + GFM
- [x] Tables, task lists, fenced code, footnotes
- [x] Math (KaTeX), diagrams (Mermaid), syntax-highlighted code
- [x] Find / replace with regex, also searches rendered text
- [x] Paste or drop images → \`./assets/\` + auto-link
- [x] Export to HTML and PDF
- [ ] Real-time collaboration *(soon)*

1. Ordered lists continue too —
2. press Enter on this line to get a "3.";
3. press Enter on an empty number to break out.

## Footnotes & inline

The Euler identity is famously elegant[^euler]. Press <kbd>⌘P</kbd> to print
or export to PDF.

[^euler]: Often called "the most beautiful equation in mathematics."

---

That's it. Start typing on the left.
`;

// ── Tweak defaults ─────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#7aa2ff",
  "monoFont": "JetBrains Mono",
  "proseFont": "Inter",
  "showLineNumbers": true,
  "syncScroll": true,
  "wordWrap": true,
  "showOutline": true
}/*EDITMODE-END*/;

// ── Top bar ────────────────────────────────────────────────────────────
function TopBar({
  theme, setTheme, effectiveTheme,
  viewMode, setViewMode,
  vsConnected, setVsConnected,
  vsTheme, setVsTheme,
  swapPanes, setSwapPanes,
  fileName, dirty,
  outlineCollapsed, setOutlineCollapsed,
  onToggleFind,
  onExportHtml, onExportPdf,
  onOpenFile, onSave,
}) {
  const I = window.emdiIcons;
  const [vsPopover, setVsPopover] = useS(false);
  const [moreOpen, setMoreOpen] = useS(false);
  const moreRef = useR(null);

  useE(() => {
    function onDown(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">e</div>
        emdi
        <div className="brand-dot"></div>
      </div>

      <button
        className={`icon-btn ${!outlineCollapsed ? 'active' : ''}`}
        onClick={() => setOutlineCollapsed(v => !v)}
        title="Toggle outline (Ctrl+B)"
      >
        {I.list}
      </button>

      <div className={`file-tab ${dirty ? '' : 'saved'}`}>
        <span className="dot"></span>
        {fileName}
        <span style={{ opacity: .55 }}>{dirty ? '•' : ''}</span>
      </div>

      <div className="spacer" />

      <button
        className="icon-btn"
        onClick={onToggleFind}
        title="Find & replace (Ctrl+F)"
      >
        {I.find}
      </button>

      <div className="seg" role="tablist" aria-label="View mode">
        <button
          className={viewMode === 'editor' ? 'active' : ''}
          onClick={() => setViewMode('editor')}
          title="Editor only (Ctrl+\\)"
        >{I.edit} Edit</button>
        <button
          className={viewMode === 'split' ? 'active' : ''}
          onClick={() => setViewMode('split')}
          title="Side-by-side (Ctrl+\\)"
        >{I.split} Split</button>
        <button
          className={viewMode === 'preview' ? 'active' : ''}
          onClick={() => setViewMode('preview')}
          title="Preview only (Ctrl+\\)"
        >{I.eye} Preview</button>
      </div>

      <button
        className="icon-btn"
        onClick={() => setSwapPanes(s => !s)}
        title="Swap panes"
        style={{ opacity: viewMode === 'split' ? 1 : 0.35, pointerEvents: viewMode === 'split' ? 'auto' : 'none' }}
      >{I.swap}</button>

      <div style={{ position: 'relative' }}>
        <button
          className="vs-badge"
          onClick={() => setVsPopover(v => !v)}
          title="VS Code theme sync"
        >
          <span className="pulse"></span>
          {vsConnected ? `VS Code · ${vsTheme.label}` : 'VS Code · standalone'}
        </button>
        {vsPopover && (
          <VsPopover
            connected={vsConnected}
            setConnected={setVsConnected}
            vsTheme={vsTheme}
            setVsTheme={setVsTheme}
            theme={theme}
            setTheme={setTheme}
            onClose={() => setVsPopover(false)}
          />
        )}
      </div>

      <div className="theme-seg" title="Theme: dark / auto / light">
        <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')} title="Dark">{I.moon}</button>
        <button className={theme === 'auto' ? 'active' : ''} onClick={() => setTheme('auto')} title="Follow OS">{I.auto}</button>
        <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')} title="Light">{I.sun}</button>
      </div>

      <div ref={moreRef} style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => setMoreOpen(v => !v)} title="More">{I.more}</button>
        {moreOpen && (
          <div className="menu" style={{ right: 0 }}>
            <div className="menu-label">File</div>
            <div className="menu-item" onClick={() => { setMoreOpen(false); onOpenFile(); }}>
              Open .md… <span className="hint">⌘O</span>
            </div>
            <div className="menu-item" onClick={() => { setMoreOpen(false); onSave(); }}>
              Save <span className="hint">⌘S</span>
            </div>
            <div className="menu-sep"></div>
            <div className="menu-label">Export</div>
            <div className="menu-item" onClick={() => { setMoreOpen(false); onExportHtml(); }}>
              {I.download} HTML
            </div>
            <div className="menu-item" onClick={() => { setMoreOpen(false); onExportPdf(); }}>
              {I.download} PDF (print) <span className="hint">⌘P</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VsPopover({ connected, setConnected, vsTheme, setVsTheme, theme, setTheme, onClose }) {
  const ref = useR(null);
  useE(() => {
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const VS_THEMES = [
    { id: 'dark-modern', label: 'Dark Modern', kind: 'dark' },
    { id: 'dark-plus', label: 'Dark+ (default)', kind: 'dark' },
    { id: 'monokai', label: 'Monokai', kind: 'dark' },
    { id: 'one-dark-pro', label: 'One Dark Pro', kind: 'dark' },
    { id: 'light-modern', label: 'Light Modern', kind: 'light' },
    { id: 'solarized-light', label: 'Solarized Light', kind: 'light' },
    { id: 'github-light', label: 'GitHub Light', kind: 'light' },
  ];

  return (
    <div className="vs-popover" ref={ref}>
      <h4>VS Code Integration</h4>
      <div className="row">
        <span>Status</span>
        {connected ? (
          <span className="vs-status"><span className="dot"></span> connected</span>
        ) : (
          <span className="val">standalone</span>
        )}
      </div>
      <div className="row">
        <span>Sync theme from editor</span>
        <input
          type="checkbox"
          className="switch"
          checked={connected}
          onChange={(e) => {
            setConnected(e.target.checked);
            if (e.target.checked) setTheme(vsTheme.kind);
          }}
        />
      </div>
      {connected && (
        <div className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <span style={{ color: 'var(--fg-soft)' }}>Detected workbench theme</span>
          <select
            value={vsTheme.id}
            onChange={(e) => {
              const t = VS_THEMES.find(t => t.id === e.target.value);
              if (t) { setVsTheme(t); setTheme(t.kind); }
            }}
            style={{
              background: 'var(--bg-soft)', color: 'var(--fg)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '4px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
            }}
          >
            {VS_THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      )}
      <div className="row">
        <span>Preview pane mode</span>
        <span className="val">custom pane</span>
      </div>
      <div className="row">
        <span>Extension version</span>
        <span className="val">v0.4.2</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 10.5, color: 'var(--fg-mute)', lineHeight: 1.5 }}>
        As an extension, emdi reads <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>workbench.colorTheme</code>
        and editor zoom from the VS Code API and updates live.
      </div>
    </div>
  );
}

// ── Splitter ──────────────────────────────────────────────────────────
function Splitter({ workspaceRef, ratio, setRatio }) {
  const dragging = useR(false);
  const [drag, setDrag] = useS(false);

  function onDown(e) {
    e.preventDefault();
    dragging.current = true;
    setDrag(true);
    document.body.style.cursor = 'col-resize';
    function move(ev) {
      if (!dragging.current || !workspaceRef.current) return;
      const r = workspaceRef.current.getBoundingClientRect();
      // Account for outline width: workspace contains outline+panes+splitter+pane.
      // Compute ratio against the pane area only — we use total workspace, which is fine.
      const x = (ev.clientX - r.left) / r.width;
      setRatio(window.emdiClamp(x, 0.18, 0.82));
    }
    function up() {
      dragging.current = false;
      setDrag(false);
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  return <div className={`splitter ${drag ? 'dragging' : ''}`} onMouseDown={onDown}></div>;
}

// ── Status bar ────────────────────────────────────────────────────────
function StatusBar({ markdown, theme, effectiveTheme, vsConnected, editorZoom, previewZoom, viewMode, cursor, focused }) {
  const { words, mins } = window.emdiReadingTime(markdown);
  const lines = (markdown.match(/\n/g) || []).length + 1;
  const chars = markdown.length;
  const I = window.emdiIcons;
  const themeLabel = theme === 'auto' ? `auto · ${effectiveTheme}` : theme;
  return (
    <div className="statusbar">
      {vsConnected ? (
        <span className="sb-item">{I.vscode} VS Code · synced</span>
      ) : (
        <span className="sb-item">{I.edit} emdi · standalone</span>
      )}
      <span className="sb-sep" />
      <span className="sb-item">{viewMode}</span>
      <span className="sb-sep" />
      <span className="sb-item">Ln {cursor.line}, Col {cursor.col}</span>
      <span className="sb-sep" />
      <span className="sb-item">{lines} ln · {words} wd · {chars} ch</span>
      <span className="sb-sep" />
      <span className="sb-item">~{mins} min read</span>
      <span className="sb-grow" />
      <span className="sb-item">Markdown · UTF-8</span>
      <span className="sb-sep" />
      <span className="sb-item" title="Focused-pane zoom in bold">
        edit <b style={{ fontWeight: focused === 'editor' ? 700 : 400 }}>{editorZoom}%</b>
        · read <b style={{ fontWeight: focused === 'preview' ? 700 : 400 }}>{previewZoom}%</b>
      </span>
      <span className="sb-sep" />
      <span className="sb-item">{themeLabel}</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Document
  const [markdown, setMarkdown] = useS(() => {
    try { return localStorage.getItem('emdi:doc') ?? SAMPLE_MD; }
    catch { return SAMPLE_MD; }
  });
  const initialDoc = useR(markdown);
  const [dirty, setDirty] = useS(false);
  const [fileName, setFileName] = useS('README.md');

  // Theme: 'dark' | 'light' | 'auto'
  const [theme, setTheme] = useS(() => {
    try { return localStorage.getItem('emdi:theme') || 'auto'; }
    catch { return 'auto'; }
  });
  const [osPrefersDark, setOsPrefersDark] = useS(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  useE(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onChange(e) { setOsPrefersDark(e.matches); }
    try { mq.addEventListener('change', onChange); } catch { mq.addListener(onChange); }
    return () => { try { mq.removeEventListener('change', onChange); } catch { mq.removeListener(onChange); } };
  }, []);
  const effectiveTheme = theme === 'auto' ? (osPrefersDark ? 'dark' : 'light') : theme;

  // Zoom
  const [editorZoom, setEditorZoom] = useS(() => {
    const v = parseInt(localStorage.getItem('emdi:zoom-editor') || '100', 10);
    return Number.isFinite(v) ? window.emdiClamp(v, 50, 300) : 100;
  });
  const [previewZoom, setPreviewZoom] = useS(() => {
    const v = parseInt(localStorage.getItem('emdi:zoom-preview') || '100', 10);
    return Number.isFinite(v) ? window.emdiClamp(v, 50, 300) : 100;
  });

  const [viewMode, setViewMode] = useS('split');
  const [splitRatio, setSplitRatio] = useS(0.5);
  const [swapPanes, setSwapPanes] = useS(false);

  const [vsConnected, setVsConnected] = useS(false);
  const [vsTheme, setVsTheme] = useS({ id: 'dark-modern', label: 'Dark Modern', kind: 'dark' });

  const [outlineCollapsed, setOutlineCollapsed] = useS(!t.showOutline);
  useE(() => { setOutlineCollapsed(!t.showOutline); }, [t.showOutline]);

  const [focusedPane, setFocusedPane] = useS('editor');

  // Cursor pos
  const [cursor, setCursor] = useS({ line: 1, col: 1 });

  // Headings (from preview)
  const [headings, setHeadings] = useS([]);

  // Sync scroll refs
  const editorScrollLine = useR(1);

  // Editor jump request (preview → editor)
  const [jumpReq, setJumpReq] = useS(null);

  // Preview flash line (editor click → preview block flashes)
  const [flashLine, setFlashLine] = useS(null);

  // Preview heading jump
  const jumpToHeading = useR(null);

  // Toast
  const [toast, setToast] = useS(null);
  const toastTimer = useR(null);
  function flash(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1100);
  }

  // Find & replace
  const [findOpen, setFindOpen] = useS(false);
  const [findQuery, setFindQuery] = useS('');
  const [findReplace, setFindReplace] = useS('');
  const [findTarget, setFindTarget] = useS('editor');
  const [findOptions, setFindOptions] = useS({ regex: false, caseSensitive: false, whole: false });
  const [findActiveIdx, setFindActiveIdx] = useS(0);
  const [previewHitCount, setPreviewHitCount] = useS(0);

  // Editor matches (computed from markdown)
  const editorMatches = useM(() => {
    if (findTarget !== 'editor' || !findQuery) return [];
    const re = window.emdiBuildRegex(findQuery, findOptions);
    if (!re) return [];
    const out = [];
    let m;
    while ((m = re.exec(markdown)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length, str: m[0] });
      if (m.index === re.lastIndex) re.lastIndex++;
      if (out.length > 9999) break;
    }
    return out;
  }, [markdown, findQuery, findOptions, findTarget]);

  // Reset active idx when query changes
  useE(() => { setFindActiveIdx(0); }, [findQuery, findOptions, findTarget]);

  // When editor active match changes, jump to it
  useE(() => {
    if (findTarget === 'editor' && editorMatches.length) {
      const m = editorMatches[Math.min(findActiveIdx, editorMatches.length - 1)];
      if (!m) return;
      // compute line of match start
      const line = markdown.slice(0, m.start).split('\n').length;
      setJumpReq({ line, t: Date.now() });
    }
  }, [findActiveIdx, editorMatches.length, findTarget]);

  function findNext() {
    if (findTarget === 'editor') {
      const n = editorMatches.length;
      if (!n) return;
      setFindActiveIdx(i => (i + 1) % n);
    } else {
      const n = previewHitCount;
      if (!n) return;
      setFindActiveIdx(i => (i + 1) % n);
    }
  }
  function findPrev() {
    if (findTarget === 'editor') {
      const n = editorMatches.length;
      if (!n) return;
      setFindActiveIdx(i => (i - 1 + n) % n);
    } else {
      const n = previewHitCount;
      if (!n) return;
      setFindActiveIdx(i => (i - 1 + n) % n);
    }
  }
  function replaceOne() {
    if (findTarget !== 'editor' || !editorMatches.length) return;
    const m = editorMatches[Math.min(findActiveIdx, editorMatches.length - 1)];
    if (!m) return;
    const next = markdown.slice(0, m.start) + findReplace + markdown.slice(m.end);
    setMarkdown(next);
  }
  function replaceAll() {
    if (findTarget !== 'editor' || !editorMatches.length) return;
    const re = window.emdiBuildRegex(findQuery, findOptions);
    if (!re) return;
    const next = markdown.replace(re, findReplace);
    setMarkdown(next);
    flash(`Replaced ${editorMatches.length}`);
  }

  // Persist
  useE(() => { try { localStorage.setItem('emdi:doc', markdown); } catch {} setDirty(markdown !== initialDoc.current); }, [markdown]);
  useE(() => { try { localStorage.setItem('emdi:theme', theme); } catch {} }, [theme]);
  useE(() => { try { localStorage.setItem('emdi:zoom-editor', String(editorZoom)); } catch {} }, [editorZoom]);
  useE(() => { try { localStorage.setItem('emdi:zoom-preview', String(previewZoom)); } catch {} }, [previewZoom]);

  // Keyboard shortcuts
  useE(() => {
    function onKey(e) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key;
      if (k === '=' || k === '+') {
        e.preventDefault();
        if (focusedPane === 'preview') {
          setPreviewZoom(z => { const n = window.emdiNextZoom(z, +1); flash(`Preview ${n}%`); return n; });
        } else {
          setEditorZoom(z => { const n = window.emdiNextZoom(z, +1); flash(`Editor ${n}%`); return n; });
        }
      } else if (k === '-' || k === '_') {
        e.preventDefault();
        if (focusedPane === 'preview') {
          setPreviewZoom(z => { const n = window.emdiNextZoom(z, -1); flash(`Preview ${n}%`); return n; });
        } else {
          setEditorZoom(z => { const n = window.emdiNextZoom(z, -1); flash(`Editor ${n}%`); return n; });
        }
      } else if (k === '0') {
        e.preventDefault();
        setEditorZoom(100); setPreviewZoom(100);
        flash('Zoom reset · 100%');
      } else if (k === '\\') {
        e.preventDefault();
        setViewMode(m => m === 'split' ? 'editor' : m === 'editor' ? 'preview' : 'split');
      } else if (k.toLowerCase() === 'k') {
        e.preventDefault();
        setTheme(th => th === 'dark' ? 'light' : th === 'light' ? 'auto' : 'dark');
      } else if (k.toLowerCase() === 'b') {
        e.preventDefault();
        setOutlineCollapsed(v => !v);
      } else if (k.toLowerCase() === 'f') {
        e.preventDefault();
        setFindOpen(v => !v);
      } else if (k.toLowerCase() === 'p') {
        e.preventDefault();
        exportPdf();
      } else if (k.toLowerCase() === 's') {
        e.preventDefault();
        saveFile();
      } else if (k.toLowerCase() === 'o') {
        e.preventDefault();
        openFile();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusedPane, markdown, fileName]);

  // ── File ops ──
  const fileInputRef = useR(null);
  function openFile() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function onFilePicked(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setMarkdown(String(r.result || ''));
      initialDoc.current = String(r.result || '');
      setFileName(f.name);
      flash(`Opened ${f.name}`);
    };
    r.readAsText(f);
    e.target.value = '';
  }
  function saveFile() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    triggerDownload(blob, fileName);
    initialDoc.current = markdown;
    setDirty(false);
    flash(`Saved ${fileName}`);
  }
  function exportHtml() {
    const { html } = window.emdiRenderMarkdown(markdown);
    const out = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtmlForBlob(fileName)}</title>
<style>body{font-family:-apple-system,Inter,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;line-height:1.7;color:#222}
h1,h2{border-bottom:1px solid #eee;padding-bottom:.2em}
pre{background:#f4f4f1;padding:14px;border-radius:8px;overflow-x:auto}
code{background:#f4f4f1;padding:2px 4px;border-radius:3px}
table{border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px 10px}
blockquote{border-left:3px solid #888;padding:.4em 1em;color:#555;margin:1em 0;background:#fafafa}
</style></head><body>${html}</body></html>`;
    triggerDownload(new Blob([out], { type: 'text/html' }), fileName.replace(/\.md$/i, '') + '.html');
    flash('Exported HTML');
  }
  function exportPdf() {
    // print-to-PDF uses print stylesheet
    flash('Opening print dialog…');
    setTimeout(() => window.print(), 80);
  }
  function escapeHtmlForBlob(s) { return String(s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
  function triggerDownload(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Paste / drop image: simulate save to ./assets/ and insert link
  const pastedCount = useR(0);
  function onPasteImage(file, textarea) {
    pastedCount.current++;
    const ts = new Date();
    const stamp = `${ts.getFullYear()}${String(ts.getMonth()+1).padStart(2,'0')}${String(ts.getDate()).padStart(2,'0')}-${String(ts.getHours()).padStart(2,'0')}${String(ts.getMinutes()).padStart(2,'0')}${String(ts.getSeconds()).padStart(2,'0')}`;
    const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const name = `pasted-${stamp}.${ext}`;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // Insert markdown link at cursor with data URL (prototype: real app writes to ./assets/)
      const linkText = `![pasted image](assets/${name})\n\n`;
      const ta = textarea;
      if (!ta) return;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const v = markdown;
      const next = v.slice(0, s) + linkText + v.slice(en);
      setMarkdown(next);
      // For demo: also tuck the data URL into a fake assets registry so preview can show it
      window.emdiAssets = window.emdiAssets || {};
      window.emdiAssets[`assets/${name}`] = dataUrl;
      // Rewrite preview render to resolve these — we'll intercept by adding a global hook in render
      // (Simpler: also rewrite href via DOM post-render — done in PreviewPane effect via callback. We'll
      // do a quick approach: replace `assets/${name}` with the data URL in markdown after a tick? No,
      // that bloats the doc. Instead, leave as-is — user pretends ./assets/ exists.)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + linkText.length;
      });
      flash(`Saved → ./assets/${name}`);
    };
    reader.readAsDataURL(file);
  }

  // After preview renders, swap any `assets/...` img src to a known data URL if we have one
  useE(() => {
    const id = setInterval(() => {
      if (!window.emdiAssets) return;
      const imgs = document.querySelectorAll('.md-body img');
      imgs.forEach(img => {
        const src = img.getAttribute('src') || '';
        if (window.emdiAssets[src]) img.src = window.emdiAssets[src];
      });
    }, 250);
    return () => clearInterval(id);
  }, []);

  // ── Components for split view ──
  const workspaceRef = useR(null);

  const EditorPaneC = window.EmdiEditor;
  const PreviewPaneC = window.EmdiPreview;
  const OutlineC = window.EmdiOutline;
  const FindBarC = window.EmdiFindBar;

  const onClickLocateCb = useCB((line) => {
    if (!t.syncScroll) return;
    setFlashLine(null);
    requestAnimationFrame(() => setFlashLine({ line, t: Date.now() }));
  }, [t.syncScroll]);

  const editor = (
    <EditorPaneC
      value={markdown}
      onChange={(v) => setMarkdown(v)}
      zoom={editorZoom}
      setZoom={(z) => { setEditorZoom(z); flash(`Editor ${z}%`); }}
      focused={focusedPane === 'editor'}
      onFocus={() => setFocusedPane('editor')}
      lineNumbers={t.showLineNumbers}
      fontFamily={t.monoFont}
      wordWrap={t.wordWrap}
      setCursorPos={setCursor}
      scrollLineRef={editorScrollLine}
      jumpRequest={jumpReq}
      onJumped={() => {}}
      onPasteImage={onPasteImage}
      onClickLocate={onClickLocateCb}
      syncScrollEnabled={t.syncScroll}
    />
  );
  const preview = (
    <PreviewPaneC
      markdown={markdown}
      zoom={previewZoom}
      setZoom={(z) => { setPreviewZoom(z); flash(`Preview ${z}%`); }}
      focused={focusedPane === 'preview'}
      onFocus={() => setFocusedPane('preview')}
      proseFont={t.proseFont}
      monoFont={t.monoFont}
      theme={effectiveTheme}
      onHeadings={setHeadings}
      onClickLine={(line) => setJumpReq({ line, t: Date.now() })}
      scrollLineRef={editorScrollLine}
      syncScrollEnabled={t.syncScroll}
      searchQuery={findTarget === 'preview' ? findQuery : ''}
      searchOptions={findOptions}
      searchActiveIdx={findActiveIdx}
      onSearchCount={setPreviewHitCount}
      jumpToHeadingRef={jumpToHeading}
      flashLine={flashLine}
    />
  );

  const rootStyle = {
    ['--accent']: t.accent,
    ['--accent-soft']: `color-mix(in oklch, ${t.accent} 14%, transparent)`,
    ['--selection']: `color-mix(in oklch, ${t.accent} 28%, transparent)`,
    ['--mono-font']: t.monoFont,
    ['--prose-font']: t.proseFont,
  };

  return (
    <div className="emdi-root" data-theme={effectiveTheme} style={rootStyle}>
      <TopBar
        theme={theme} setTheme={setTheme} effectiveTheme={effectiveTheme}
        viewMode={viewMode} setViewMode={setViewMode}
        vsConnected={vsConnected} setVsConnected={setVsConnected}
        vsTheme={vsTheme} setVsTheme={setVsTheme}
        swapPanes={swapPanes} setSwapPanes={setSwapPanes}
        fileName={fileName} dirty={dirty}
        outlineCollapsed={outlineCollapsed} setOutlineCollapsed={(v) => { setOutlineCollapsed(typeof v === 'function' ? v(outlineCollapsed) : v); setTweak('showOutline', !(typeof v === 'function' ? v(outlineCollapsed) : v)); }}
        onToggleFind={() => setFindOpen(v => !v)}
        onExportHtml={exportHtml} onExportPdf={exportPdf}
        onOpenFile={openFile} onSave={saveFile}
      />

      <div
        ref={workspaceRef}
        className={`workspace ${viewMode === 'split' ? '' : 'single'}`}
        data-screen-label="01 Workspace"
        style={{ position: 'relative' }}
      >
        <OutlineC
          headings={headings}
          collapsed={outlineCollapsed}
          currentLine={cursor.line}
          onJumpHeading={(slug) => jumpToHeading.current && jumpToHeading.current(slug)}
          onJumpLine={(line) => setJumpReq({ line, t: Date.now() })}
        />

        {viewMode === 'split' ? (
          <>
            <div style={{ flex: splitRatio, display: 'flex', minWidth: 0 }}>
              {swapPanes ? preview : editor}
            </div>
            <Splitter workspaceRef={workspaceRef} ratio={splitRatio} setRatio={setSplitRatio} />
            <div style={{ flex: 1 - splitRatio, display: 'flex', minWidth: 0 }}>
              {swapPanes ? editor : preview}
            </div>
          </>
        ) : viewMode === 'editor' ? editor : preview}

        <div className={`zoom-toast ${toast ? 'show' : ''}`}>{toast || ''}</div>

        <FindBarC
          open={findOpen}
          onClose={() => setFindOpen(false)}
          value={findQuery}
          replace={findReplace}
          target={findTarget}
          options={findOptions}
          currentIdx={findActiveIdx}
          totalCount={findTarget === 'editor' ? editorMatches.length : previewHitCount}
          onChange={setFindQuery}
          onReplaceChange={setFindReplace}
          onChangeTarget={setFindTarget}
          onChangeOptions={setFindOptions}
          onNext={findNext}
          onPrev={findPrev}
          onReplaceOne={replaceOne}
          onReplaceAll={replaceAll}
        />
      </div>

      <StatusBar
        markdown={markdown}
        theme={theme}
        effectiveTheme={effectiveTheme}
        vsConnected={vsConnected}
        editorZoom={editorZoom}
        previewZoom={previewZoom}
        viewMode={viewMode}
        cursor={cursor}
        focused={focusedPane}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        style={{ display: 'none' }}
        onChange={onFilePicked}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakColor
          label="Accent"
          value={t.accent}
          options={['#7aa2ff', '#3a6df0', '#e07b5a', '#5ec8a8', '#c084fc', '#f4a261']}
          onChange={(v) => setTweak('accent', v)}
        />
        <TweakRadio
          label="Mode"
          value={theme}
          options={['dark', 'auto', 'light']}
          onChange={setTheme}
        />
        <TweakSection label="Typography" />
        <TweakSelect
          label="Editor font"
          value={t.monoFont}
          options={['JetBrains Mono', 'Fira Code', 'IBM Plex Mono', 'Menlo']}
          onChange={(v) => setTweak('monoFont', v)}
        />
        <TweakSelect
          label="Prose font"
          value={t.proseFont}
          options={['Inter', 'IBM Plex Sans', 'Source Serif 4', 'Georgia']}
          onChange={(v) => setTweak('proseFont', v)}
        />
        <TweakSection label="Editor" />
        <TweakToggle label="Line numbers" value={t.showLineNumbers} onChange={(v) => setTweak('showLineNumbers', v)} />
        <TweakToggle label="Word wrap" value={t.wordWrap} onChange={(v) => setTweak('wordWrap', v)} />
        <TweakToggle label="Sync scroll" value={t.syncScroll} onChange={(v) => setTweak('syncScroll', v)} />
        <TweakToggle label="Outline panel" value={t.showOutline} onChange={(v) => setTweak('showOutline', v)} />
        <TweakSection label="Document" />
        <TweakButton label="Reset to sample" onClick={() => { setMarkdown(SAMPLE_MD); initialDoc.current = SAMPLE_MD; setFileName('README.md'); }} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
