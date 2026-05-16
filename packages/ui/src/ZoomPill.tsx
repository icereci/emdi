import { ZOOM_STEPS, nextZoom } from '@emdi/core/zoom';
import { Icons } from './Icons.js';

interface Props {
  value: number;
  onChange: (next: number) => void;
  focused?: boolean;
}

const FIRST_STEP: number = ZOOM_STEPS[0];
const LAST_STEP: number = ZOOM_STEPS[ZOOM_STEPS.length - 1] ?? 300;

export function ZoomPill({ value, onChange, focused }: Props): JSX.Element {
  return (
    <div
      className="zoom-pill"
      style={focused ? { borderColor: 'color-mix(in oklch, var(--accent) 50%, transparent)' } : undefined}
    >
      <button
        type="button"
        onClick={() => onChange(nextZoom(value, -1))}
        disabled={value <= FIRST_STEP}
        title="Zoom out"
      >
        {Icons.minus}
      </button>
      <span
        className="zoom-val"
        onClick={() => onChange(100)}
        title="Click to reset to 100%"
      >
        {value}%
      </span>
      <button
        type="button"
        onClick={() => onChange(nextZoom(value, 1))}
        disabled={value >= LAST_STEP}
        title="Zoom in"
      >
        {Icons.plus}
      </button>
    </div>
  );
}
