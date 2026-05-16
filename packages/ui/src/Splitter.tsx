import { useRef, useState, type RefObject } from 'react';
import { useAppStore } from './store.js';

interface Props {
  workspaceRef: RefObject<HTMLElement>;
}

/**
 * Drag-to-resize splitter between the editor and preview panes. Updates
 * `settings.splitRatio` (clamped to [0.18, 0.82]).
 */
export function Splitter({ workspaceRef }: Props): JSX.Element {
  const setSplitRatio = useAppStore((s) => s.setSplitRatio);
  const dragging = useRef(false);
  const [drag, setDrag] = useState(false);

  function onDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    setDrag(true);
    document.body.style.cursor = 'col-resize';
    const move = (ev: MouseEvent) => {
      if (!dragging.current || !workspaceRef.current) return;
      const r = workspaceRef.current.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      setSplitRatio(x);
    };
    const up = () => {
      dragging.current = false;
      setDrag(false);
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  return <div className={`splitter ${drag ? 'dragging' : ''}`} onMouseDown={onDown} />;
}
