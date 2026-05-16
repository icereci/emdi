// emdi-editor.jsx — EditorPane with smart lists, frontmatter folding,
// paste/drop images, line-aware cursor reporting, and per-pane zoom.

const { useState: useState_ed, useEffect: useEffect_ed, useRef: useRef_ed, useMemo: useMemo_ed, useLayoutEffect: useLayoutEffect_ed } = React;

// ── ZoomPill ────────────────────────────────────────────────────────────
function ZoomPill({ value, onChange, focused }) {
  const I = window.emdiIcons;
  const ZSTEPS = window.emdiZoomSteps;
  const nz = window.emdiNextZoom;
  return (
    <div className="zoom-pill" style={focused ? { borderColor: 'color-mix(in oklch, var(--accent) 50%, transparent)' } : null}>
      <button onClick={() => onChange(nz(value, -1))} disabled={value <= ZSTEPS[0]} title="Zoom out">{I.minus}</button>
      <span className="zoom-val" onClick={() => onChange(100)} title="Click to reset to 100%">{value}%</span>
      <button onClick={() => onChange(nz(value, +1))} disabled={value >= ZSTEPS[ZSTEPS.length - 1]} title="Zoom in">{I.plus}</button>
    </div>
  );
}

// ── Smart-list helpers ─────────────────────────────────────────────────
// Returns { match, replacement, cursorOffset } or null for normal Enter.
function handleSmartEnter(value, selStart) {
  const before = value.slice(0, selStart);
  const after = value.slice(selStart);
  const lineStart = before.lastIndexOf('\n') + 1;
  const curLine = before.slice(lineStart);

  // bullets, ordered, task lists
  const bullet = curLine.match(/^(\s*)([-*+])\s(\[[ xX]\]\s)?(.*)$/);
  const ordered = curLine.match(/^(\s*)(\d+)\.\s(.*)$/);

  if (bullet) {
    const [, indent, mark, task, content] = bullet;
    if (!content.trim()) {
      // Empty bullet → exit list (remove the marker on current line)
      const newBefore = before.slice(0, lineStart) + indent.slice(0, Math.max(0, indent.length - 2));
      return { newValue: newBefore + after, caret: newBefore.length };
    }
    const prefix = `${indent}${mark} ${task ? '[ ] ' : ''}`;
    const insert = `\n${prefix}`;
    return { newValue: before + insert + after, caret: selStart + insert.length };
  }

  if (ordered) {
    const [, indent, numStr, content] = ordered;
    if (!content.trim()) {
      const newBefore = before.slice(0, lineStart) + indent.slice(0, Math.max(0, indent.length - 2));
      return { newValue: newBefore + after, caret: newBefore.length };
    }
    const num = parseInt(numStr, 10) + 1;
    const insert = `\n${indent}${num}. `;
    return { newValue: before + insert + after, caret: selStart + insert.length };
  }

  return null;
}

// ── EditorPane ─────────────────────────────────────────────────────────
function EditorPane({
  value, onChange,
  zoom, setZoom,
  focused, onFocus,
  lineNumbers, fontFamily, wordWrap,
  setCursorPos,
  scrollLineRef, onScrollLine,
  jumpRequest, onJumped,
  onPasteImage,
  onClickLocate,            // (line) => void
  syncScrollEnabled,
}) {
  const I = window.emdiIcons;
  const taRef = useRef_ed(null);
  const scrollRef = useRef_ed(null);
  const gutterRef = useRef_ed(null);
  const [cursorLine, setCursorLine] = useState_ed(1);
  const [dragOver, setDragOver] = useState_ed(false);
  const [fmFolded, setFmFolded] = useState_ed(true);

  const baseFont = 14;
  const fontSize = baseFont * (zoom / 100);
  const lineHeight = 1.65;
  const pxPerLine = fontSize * lineHeight;

  // Front-matter detection (against the FULL doc value)
  const fm = useMemo_ed(() => window.emdiParseFrontMatter(value), [value]);
  const hasFM = !!fm.fm;
  const fmBodyOffset = fm.bodyOffset || 0;

  // When folded, textarea shows body only; we splice edits back into full doc.
  const displayValue = (fmFolded && hasFM) ? value.slice(fmBodyOffset) : value;
  function handleChange(newDisplay) {
    if (fmFolded && hasFM) {
      onChange(value.slice(0, fmBodyOffset) + newDisplay);
    } else {
      onChange(newDisplay);
    }
  }
  // Line shift introduced by folding (lines hidden from view)
  const lineShift = (fmFolded && hasFM) ? fm.fmEndLine : 0;

  // Sync gutter scroll with editor scroll, and report top visible line
  useEffect_ed(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    function onScroll() {
      if (gutterRef.current) gutterRef.current.scrollTop = sc.scrollTop;
      const topLine = Math.max(1, Math.round(sc.scrollTop / pxPerLine) + 1) + lineShift;
      if (scrollLineRef) scrollLineRef.current = topLine;
      if (onScrollLine) onScrollLine(topLine);
    }
    sc.addEventListener('scroll', onScroll);
    return () => sc.removeEventListener('scroll', onScroll);
  }, [pxPerLine, onScrollLine, scrollLineRef, lineShift]);

  // Cursor tracking (line + col) — installed once, reads latest props via refs.
  const lastCursor = useRef_ed({ line: -1, col: -1 });
  const propsRef = useRef_ed({ lineShift: 0, setCursorPos: null, onClickLocate: null });
  propsRef.current = { lineShift, setCursorPos, onClickLocate };
  useEffect_ed(() => {
    const ta = taRef.current;
    if (!ta) return;
    function update(e) {
      const { lineShift: ls, setCursorPos: scp, onClickLocate: ocl } = propsRef.current;
      const pos = ta.selectionStart;
      const before = ta.value.slice(0, pos);
      const lines = before.split('\n');
      const lineInView = lines.length;
      const col = lines[lines.length - 1].length + 1;
      const line = lineInView + ls;
      setCursorLine(lineInView);
      if (line !== lastCursor.current.line || col !== lastCursor.current.col) {
        lastCursor.current = { line, col };
        if (scp) scp({ line, col });
      }
      if (e && e.type === 'click' && ocl) ocl(line);
    }
    ta.addEventListener('keyup', update);
    ta.addEventListener('click', update);
    ta.addEventListener('input', update);
    ta.addEventListener('select', update);
    const initT = setTimeout(() => update(), 0);
    return () => {
      clearTimeout(initT);
      ta.removeEventListener('keyup', update);
      ta.removeEventListener('click', update);
      ta.removeEventListener('input', update);
      ta.removeEventListener('select', update);
    };
  }, []);

  // Jump-to-line request from outside (preview → editor click-to-locate, or find)
  // DEBUG: temporarily simplified
  useEffect_ed(() => {
    if (!jumpRequest || !jumpRequest.line) return;
    const ta = taRef.current;
    const sc = scrollRef.current;
    if (!ta || !sc) return;
    const targetLine = jumpRequest.line;
    const lineInView = Math.max(1, targetLine - lineShift) - 1;
    const lines = ta.value.split('\n');
    let offset = 0;
    for (let i = 0; i < lineInView && i < lines.length; i++) offset += lines[i].length + 1;
    ta.focus();
    ta.setSelectionRange(offset, offset);
    sc.scrollTop = Math.max(0, lineInView * pxPerLine - 60);
  }, [jumpRequest]);

  // Smart Enter + Tab — operate on displayed (possibly stripped) value
  function onKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart, en = ta.selectionEnd;
      const indent = '  ';
      const v = ta.value;
      const next = v.slice(0, s) + indent + v.slice(en);
      handleChange(next);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + indent.length;
      });
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const ta = e.target;
      const r = handleSmartEnter(ta.value, ta.selectionStart);
      if (r) {
        e.preventDefault();
        handleChange(r.newValue);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = r.caret;
        });
      }
    }
  }

  // Paste-image-from-clipboard
  function onPaste(e) {
    if (!e.clipboardData) return;
    for (const item of e.clipboardData.items) {
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file && onPasteImage) onPasteImage(file, taRef.current);
        return;
      }
    }
  }

  // Drag-drop
  function onDragOver(e) {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setDragOver(true);
    }
  }
  function onDragLeave() { setDragOver(false); }
  function onDrop(e) {
    setDragOver(false);
    if (!e.dataTransfer) return;
    const files = Array.from(e.dataTransfer.files || []);
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length) {
      e.preventDefault();
      images.forEach(f => onPasteImage && onPasteImage(f, taRef.current));
    }
  }

  // Build gutter lines based on the *displayed* value, but label them with full-doc line numbers
  const lines = useMemo_ed(() => {
    const count = (displayValue.match(/\n/g) || []).length + 1;
    return Array.from({ length: count }, (_, i) => i + 1 + lineShift);
  }, [displayValue, lineShift]);

  return (
    <div className="pane editor" onMouseDown={onFocus} onFocus={onFocus} style={{ flex: 1 }}>
      <div className="pane-head">
        <span className="label"><span className="swatch"></span>Editor — Markdown</span>
        <div style={{ flex: 1 }} />
        <ZoomPill value={zoom} onChange={setZoom} focused={focused} />
      </div>
      <div
        className="editor-wrap"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {lineNumbers && (
          <div className="gutter" ref={gutterRef} style={{ fontSize, lineHeight }}>
            {lines.map(n => (
              <span key={n} className={n - lineShift === cursorLine ? 'cur' : ''}>{n}</span>
            ))}
          </div>
        )}
        <div className="editor-scroll" ref={scrollRef}>
          {hasFM && (
            <div style={{ padding: '14px 18px 0' }}>
              <span
                className={`fm-chip ${fmFolded ? '' : 'open'}`}
                onClick={() => setFmFolded(v => !v)}
                title={fmFolded ? 'Click to expand front-matter' : 'Click to fold front-matter'}
              >
                front-matter · {fm.fmEndLine} lines · YAML
              </span>
            </div>
          )}
          <textarea
            ref={taRef}
            className="editor-area"
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={onFocus}
            spellCheck={false}
            wrap={wordWrap ? 'soft' : 'off'}
            style={{
              fontSize,
              fontFamily: `'${fontFamily}', ui-monospace, monospace`,
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              paddingTop: hasFM ? 6 : 14,
            }}
          />
          {dragOver && (
            <div className="drop-overlay">
              {I.upload}
              <div>Drop image to save to <span style={{ color: 'var(--fg)' }}>./assets/</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Export to window so other Babel scripts can use it
window.EmdiEditor = EditorPane;
window.EmdiZoomPill = ZoomPill;
