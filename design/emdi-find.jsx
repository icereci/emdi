// emdi-find.jsx — Find & replace overlay (regex, case, find-in-editor/preview).

const { useState: useState_fn, useEffect: useEffect_fn, useRef: useRef_fn } = React;

function FindBar({
  open, onClose,
  value, replace,
  target,                 // 'editor' | 'preview'
  options,                // { regex, caseSensitive, whole }
  currentIdx, totalCount,
  onChange, onReplaceChange,
  onChangeTarget, onChangeOptions,
  onNext, onPrev,
  onReplaceOne, onReplaceAll,
}) {
  const I = window.emdiIcons;
  const inputRef = useRef_fn(null);

  useEffect_fn(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  if (!open) return null;

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  }

  return (
    <div className="findbar" onKeyDown={onKey}>
      <div className="find-row">
        <input
          ref={inputRef}
          className="find-input"
          placeholder="Find…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="find-meta">
          {totalCount === 0 && value ? 'no matches' :
           totalCount > 0 ? `${currentIdx + 1}/${totalCount}` : ''}
        </span>
        <button className="find-btn" onClick={onPrev} title="Previous (Shift+Enter)" disabled={!totalCount}>{I.arrowU}</button>
        <button className="find-btn" onClick={onNext} title="Next (Enter)" disabled={!totalCount}>{I.arrowD}</button>
        <button className="find-btn" onClick={onClose} title="Close (Esc)">{I.x}</button>
      </div>

      {target === 'editor' && (
        <div className="find-row">
          <input
            className="find-input"
            placeholder="Replace…"
            value={replace}
            onChange={(e) => onReplaceChange(e.target.value)}
          />
          <button className="find-btn" onClick={onReplaceOne} title="Replace this match" disabled={!totalCount}>↦</button>
          <button className="find-btn" onClick={onReplaceAll} title="Replace all" disabled={!totalCount}>⇶</button>
        </div>
      )}

      <div className="find-row" style={{ marginTop: 2 }}>
        <div className="find-target">
          <button
            className={target === 'editor' ? 'active' : ''}
            onClick={() => onChangeTarget('editor')}
            title="Search in editor source"
          >.md</button>
          <button
            className={target === 'preview' ? 'active' : ''}
            onClick={() => onChangeTarget('preview')}
            title="Search rendered text"
          >preview</button>
        </div>
        <button
          className={`find-btn ${options.caseSensitive ? 'on' : ''}`}
          onClick={() => onChangeOptions({ ...options, caseSensitive: !options.caseSensitive })}
          title="Match case"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}
        >Aa</button>
        <button
          className={`find-btn ${options.whole ? 'on' : ''}`}
          onClick={() => onChangeOptions({ ...options, whole: !options.whole })}
          title="Whole word"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}
        >\b</button>
        <button
          className={`find-btn ${options.regex ? 'on' : ''}`}
          onClick={() => onChangeOptions({ ...options, regex: !options.regex })}
          title="Regular expression"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}
        >.*</button>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

// Build a RegExp from query + options. Returns null on error.
function buildRegex(query, options) {
  if (!query) return null;
  let pat = query;
  if (!options.regex) pat = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (options.whole) pat = `\\b${pat}\\b`;
  try {
    return new RegExp(pat, 'g' + (options.caseSensitive ? '' : 'i'));
  } catch (e) { return null; }
}

window.EmdiFindBar = FindBar;
window.emdiBuildRegex = buildRegex;
