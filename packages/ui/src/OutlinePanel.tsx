import type { Heading } from '@emdi/core/markdown';
import { Icons } from './Icons.js';
import { useAppStore } from './store.js';

interface Props {
  headings: Heading[];
  onJumpHeading: (slug: string) => void;
}

export function OutlinePanel({ headings, onJumpHeading }: Props): JSX.Element {
  const collapsed = useAppStore((s) => s.outlineCollapsed);
  const currentLine = useAppStore((s) => s.cursor.line);
  const requestJump = useAppStore((s) => s.requestJump);

  let activeSlug: string | null = null;
  for (const h of headings) {
    if (h.line !== null && h.line <= currentLine) activeSlug = h.slug;
    else break;
  }

  return (
    <aside className={`outline ${collapsed ? 'collapsed' : ''}`}>
      <div className="outline-head">
        {Icons.list}
        <span>Outline</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 9.5, opacity: 0.6 }}>{headings.length}</span>
      </div>
      <div className="outline-list">
        {headings.length === 0 ? (
          <div className="outline-empty">
            No headings yet — start with{' '}
            <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}># Title</code>
          </div>
        ) : (
          headings.map((h, i) => (
            <div
              key={`${h.slug}-${i}`}
              className={`outline-item ${h.slug === activeSlug ? 'active' : ''}`}
              style={{ paddingLeft: 6 + (h.level - 1) * 12 }}
              onClick={() => {
                if (h.line !== null) requestJump(h.line);
                setTimeout(() => onJumpHeading(h.slug), 50);
              }}
              title={h.text}
            >
              <span className="num">H{h.level}</span>
              <span className="txt">{h.text}</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
