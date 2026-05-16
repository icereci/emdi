// emdi-preview.jsx — PreviewPane with KaTeX, Mermaid, heading-anchored
// sync scroll, click-to-locate, and search-hit highlighting.

const { useState: useState_pv, useEffect: useEffect_pv, useRef: useRef_pv, useMemo: useMemo_pv } = React;

function PreviewPane({
  markdown,
  zoom,
  setZoom,
  focused, onFocus,
  proseFont, monoFont,
  theme,
  onHeadings,
  onClickLine,
  scrollLineRef,
  syncScrollEnabled,
  searchQuery, searchOptions, searchActiveIdx, onSearchCount,
  jumpToHeadingRef,
  flashLine,
}) {
  const I = window.emdiIcons;
  const scrollRef = useRef_pv(null);
  const bodyRef = useRef_pv(null);
  const renderTokenRef = useRef_pv(0);

  // Front-matter strip for preview rendering
  const fmInfo = useMemo_pv(() => window.emdiParseFrontMatter(markdown), [markdown]);
  const bodySrc = fmInfo.body;
  const lineOffset = fmInfo.fmEndLine; // lines before body start in original doc

  // Render
  const rendered = useMemo_pv(() => {
    return window.emdiRenderMarkdown(bodySrc, { lineOffset });
  }, [bodySrc, lineOffset]);

  // Apply HTML
  useEffect_pv(() => {
    if (!bodyRef.current) return;
    bodyRef.current.innerHTML = rendered.html;

    // Highlight code with hljs
    if (window.hljs) {
      bodyRef.current.querySelectorAll('pre code').forEach(b => {
        try { hljs.highlightElement(b); } catch (e) {}
      });
    }
    // Task lists
    bodyRef.current.querySelectorAll('li > input[type="checkbox"]').forEach(cb => {
      cb.parentElement.classList.add('task-list-item');
      cb.disabled = false;
    });

    // KaTeX auto-render
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(bodyRef.current, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
          ],
          throwOnError: false,
          errorColor: 'var(--danger)',
        });
      } catch (e) {}
    }

    // Mermaid rendering (async; bump token to ignore stale renders)
    const myToken = ++renderTokenRef.current;
    const nodes = bodyRef.current.querySelectorAll('.mermaid');
    if (nodes.length && window.mermaid) {
      try {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });
      } catch (e) {}
      nodes.forEach(async (node) => {
        const src = node.getAttribute('data-mermaid-src') || node.textContent;
        const id = 'svg-' + Math.random().toString(36).slice(2, 9);
        try {
          const { svg } = await window.mermaid.render(id, src);
          if (renderTokenRef.current === myToken) node.innerHTML = svg;
        } catch (e) {
          if (renderTokenRef.current === myToken) {
            node.classList.add('error');
            node.textContent = '⚠ Mermaid error: ' + (e.message || e);
          }
        }
      });
    }

    // Report headings up
    if (onHeadings) onHeadings(rendered.headings);

    // Wire click handlers on every block with data-sline
    bodyRef.current.querySelectorAll('[data-sline]').forEach(el => {
      el.addEventListener('click', onBlockClick);
    });

    return () => {
      if (bodyRef.current) {
        bodyRef.current.querySelectorAll('[data-sline]').forEach(el => {
          el.removeEventListener('click', onBlockClick);
        });
      }
    };
  }, [rendered.html, theme]);

  function onBlockClick(e) {
    // Don't hijack link clicks
    if (e.target.closest('a') || e.target.closest('input')) return;
    const block = e.currentTarget;
    const sline = parseInt(block.getAttribute('data-sline'), 10);
    if (!Number.isFinite(sline)) return;
    if (onClickLine) onClickLine(sline);
  }

  // Flash a block when editor click locates a line
  useEffect_pv(() => {
    if (!flashLine || !bodyRef.current) return;
    const line = typeof flashLine === 'number' ? flashLine : flashLine.line;
    if (!Number.isFinite(line)) return;
    const blocks = bodyRef.current.querySelectorAll('[data-sline]');
    let target = null;
    blocks.forEach(b => {
      const s = parseInt(b.getAttribute('data-sline'), 10);
      const e = parseInt(b.getAttribute('data-eline'), 10);
      if (Number.isFinite(s) && line >= s && (!Number.isFinite(e) || line <= e)) target = b;
    });
    if (target) {
      target.classList.add('locate-flash');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const t = target;
      setTimeout(() => t.classList.remove('locate-flash'), 1200);
    }
  }, [flashLine]);

  // Scroll-by-line API (heading-anchored sync from editor)
  useEffect_pv(() => {
    if (!syncScrollEnabled) return;
    const sc = scrollRef.current;
    if (!sc || !bodyRef.current) return;

    let raf = 0;
    let lastEditorLine = -1;

    function tick() {
      raf = 0;
      if (!scrollLineRef || !scrollLineRef.current) return;
      const editorLine = scrollLineRef.current;
      if (editorLine === lastEditorLine) return;
      lastEditorLine = editorLine;

      // Find block in preview matching the editor line, scroll preview to align it.
      const blocks = bodyRef.current.querySelectorAll('[data-sline]');
      if (!blocks.length) return;

      // Build anchor list and find the surrounding pair
      let prev = null, next = null;
      for (const b of blocks) {
        const s = parseInt(b.getAttribute('data-sline'), 10);
        if (!Number.isFinite(s)) continue;
        if (s <= editorLine) prev = { el: b, line: s };
        else { next = { el: b, line: s }; break; }
      }

      if (!prev) {
        sc.scrollTop = 0;
        return;
      }
      // Interpolate between prev and next based on editor line
      const prevTop = prev.el.offsetTop;
      const nextTop = next ? next.el.offsetTop : bodyRef.current.scrollHeight;
      const prevLine = prev.line;
      const nextLine = next ? next.line : (prev.line + 30);
      const ratio = clamp01((editorLine - prevLine) / Math.max(1, nextLine - prevLine));
      const target = prevTop + (nextTop - prevTop) * ratio - 20;
      sc.scrollTop = Math.max(0, target);
    }
    function clamp01(v) { return Math.max(0, Math.min(1, v)); }

    // Poll the ref (the editor doesn't push events, it just writes scrollLineRef.current)
    const t = setInterval(() => {
      if (!raf) raf = requestAnimationFrame(tick);
    }, 60);
    return () => { clearInterval(t); if (raf) cancelAnimationFrame(raf); };
  }, [syncScrollEnabled, scrollLineRef]);

  // jumpToHeadingRef: parent sets ref.current = slug; we listen and scroll.
  useEffect_pv(() => {
    if (!jumpToHeadingRef) return;
    jumpToHeadingRef.current = (slug) => {
      const el = bodyRef.current && bodyRef.current.querySelector(`#${CSS.escape(slug)}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }, []);

  // Search-in-preview: wrap text nodes with <mark.search-hit>
  useEffect_pv(() => {
    if (!bodyRef.current) return;
    // Remove existing marks
    bodyRef.current.querySelectorAll('mark.search-hit').forEach(m => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
    if (!searchQuery) { onSearchCount && onSearchCount(0); return; }

    let regex;
    try {
      if (searchOptions && searchOptions.regex) {
        regex = new RegExp(searchQuery, searchOptions.caseSensitive ? 'g' : 'gi');
      } else {
        const esc = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(esc, searchOptions && searchOptions.caseSensitive ? 'g' : 'gi');
      }
    } catch (e) { onSearchCount && onSearchCount(0); return; }

    const walker = document.createTreeWalker(bodyRef.current, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (n.parentNode && /^(SCRIPT|STYLE|CODE|PRE)$/.test(n.parentNode.tagName)) {
          // Allow CODE/PRE
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let count = 0;
    nodes.forEach(n => {
      const text = n.nodeValue;
      regex.lastIndex = 0;
      const matches = [];
      let m;
      while ((m = regex.exec(text)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length });
        if (m.index === regex.lastIndex) regex.lastIndex++;
      }
      if (!matches.length) return;
      const frag = document.createDocumentFragment();
      let last = 0;
      matches.forEach(mm => {
        if (mm.start > last) frag.appendChild(document.createTextNode(text.slice(last, mm.start)));
        const mark = document.createElement('mark');
        mark.className = 'search-hit';
        mark.textContent = text.slice(mm.start, mm.end);
        frag.appendChild(mark);
        last = mm.end;
        count++;
      });
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
    onSearchCount && onSearchCount(count);
  }, [searchQuery, searchOptions, rendered.html]);

  // Active highlight on Nth search hit
  useEffect_pv(() => {
    if (!bodyRef.current) return;
    const marks = bodyRef.current.querySelectorAll('mark.search-hit');
    marks.forEach((m, i) => m.classList.toggle('active', i === searchActiveIdx));
    const active = marks[searchActiveIdx];
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchActiveIdx, searchQuery]);

  return (
    <div className="pane preview" onMouseDown={onFocus} style={{ flex: 1 }}>
      <div className="pane-head">
        <span className="label">
          <span className="swatch" style={{ background: 'var(--success)' }}></span>
          Preview — Rendered
        </span>
        <div style={{ flex: 1 }} />
        <ZoomPill value={zoom} onChange={setZoom} focused={focused} />
      </div>
      <div className="preview-scroll" ref={scrollRef} tabIndex={0} onFocus={onFocus}>
        <div
          ref={bodyRef}
          className="md-body"
          style={{
            fontSize: 15 * (zoom / 100),
            ['--prose-font']: proseFont,
            ['--mono-font']: monoFont,
          }}
        />
      </div>
    </div>
  );
}

// We need ZoomPill from the editor module; reuse via window.
const ZoomPill = window.EmdiZoomPill || (() => null);

window.EmdiPreview = PreviewPane;
