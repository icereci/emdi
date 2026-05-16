// emdi-outline.jsx — auto-generated TOC panel from headings.

function OutlinePanel({ headings, collapsed, currentLine, onJumpHeading, onJumpLine }) {
  // Determine the "current" heading by line: the deepest heading with line <= currentLine.
  let activeSlug = null;
  for (const h of headings) {
    if (h.line <= currentLine) activeSlug = h.slug;
    else break;
  }

  return (
    <aside className={`outline ${collapsed ? 'collapsed' : ''}`}>
      <div className="outline-head">
        {window.emdiIcons.list}
        <span>Outline</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9.5, opacity: .6 }}>{headings.length}</span>
      </div>
      <div className="outline-list">
        {headings.length === 0 ? (
          <div className="outline-empty">No headings yet — start with <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--fg-soft)' }}># Title</code></div>
        ) : headings.map((h, i) => (
          <div
            key={i}
            className={`outline-item ${h.slug === activeSlug ? 'active' : ''}`}
            style={{ paddingLeft: 6 + (h.level - 1) * 12 }}
            onClick={() => {
              // Use the editor jump as single source of truth; sync-scroll will
              // align the preview. We also nudge the heading element directly
              // in case sync is disabled.
              onJumpLine && onJumpLine(h.line);
              setTimeout(() => onJumpHeading && onJumpHeading(h.slug), 50);
            }}
            title={h.text}
          >
            <span className="num">H{h.level}</span>
            <span className="txt">{h.text}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

window.EmdiOutline = OutlinePanel;
