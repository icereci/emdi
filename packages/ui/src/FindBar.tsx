import { useEffect, useRef } from 'react';
import { Icons } from './Icons.js';
import { useAppStore } from './store.js';

interface Props {
  totalCount: number;
  onNext: () => void;
  onPrev: () => void;
  onReplaceOne: () => void;
  onReplaceAll: () => void;
}

export function FindBar({ totalCount, onNext, onPrev, onReplaceOne, onReplaceAll }: Props): JSX.Element | null {
  const open = useAppStore((s) => s.findOpen);
  const value = useAppStore((s) => s.findQuery);
  const replace = useAppStore((s) => s.findReplace);
  const target = useAppStore((s) => s.findTarget);
  const options = useAppStore((s) => s.findOptions);
  const currentIdx = useAppStore((s) => s.findActiveIdx);
  const setFindOpen = useAppStore((s) => s.setFindOpen);
  const setFindQuery = useAppStore((s) => s.setFindQuery);
  const setFindReplace = useAppStore((s) => s.setFindReplace);
  const setFindTarget = useAppStore((s) => s.setFindTarget);
  const setFindOptions = useAppStore((s) => s.setFindOptions);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setFindOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) onPrev();
      else onNext();
    }
  };

  const metaText =
    totalCount === 0 && value
      ? 'no matches'
      : totalCount > 0
      ? `${currentIdx + 1}/${totalCount}`
      : '';

  return (
    <div className="findbar" onKeyDown={onKey}>
      <div className="find-row">
        <input
          ref={inputRef}
          className="find-input"
          placeholder="Find…"
          value={value}
          onChange={(e) => setFindQuery(e.target.value)}
        />
        <span className="find-meta">{metaText}</span>
        <button className="find-btn" onClick={onPrev} title="Previous (Shift+Enter)" disabled={!totalCount}>
          {Icons.arrowU}
        </button>
        <button className="find-btn" onClick={onNext} title="Next (Enter)" disabled={!totalCount}>
          {Icons.arrowD}
        </button>
        <button className="find-btn" onClick={() => setFindOpen(false)} title="Close (Esc)">
          {Icons.x}
        </button>
      </div>

      {target === 'editor' && (
        <div className="find-row">
          <input
            className="find-input"
            placeholder="Replace…"
            value={replace}
            onChange={(e) => setFindReplace(e.target.value)}
          />
          <button className="find-btn" onClick={onReplaceOne} title="Replace this match" disabled={!totalCount}>
            ↦
          </button>
          <button className="find-btn" onClick={onReplaceAll} title="Replace all" disabled={!totalCount}>
            ⇶
          </button>
        </div>
      )}

      <div className="find-row" style={{ marginTop: 2 }}>
        <div className="find-target">
          <button
            className={target === 'editor' ? 'active' : ''}
            onClick={() => setFindTarget('editor')}
            title="Search in editor source"
          >
            .md
          </button>
          <button
            className={target === 'preview' ? 'active' : ''}
            onClick={() => setFindTarget('preview')}
            title="Search rendered text"
          >
            preview
          </button>
        </div>
        <button
          className={`find-btn ${options.caseSensitive ? 'on' : ''}`}
          onClick={() => setFindOptions({ ...options, caseSensitive: !options.caseSensitive })}
          title="Match case"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}
        >
          Aa
        </button>
        <button
          className={`find-btn ${options.whole ? 'on' : ''}`}
          onClick={() => setFindOptions({ ...options, whole: !options.whole })}
          title="Whole word"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}
        >
          \b
        </button>
        <button
          className={`find-btn ${options.regex ? 'on' : ''}`}
          onClick={() => setFindOptions({ ...options, regex: !options.regex })}
          title="Regular expression"
          style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 11 }}
        >
          .*
        </button>
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}
