import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';

const HOLD_DELAY_MS = 380;
const HOLD_INTERVAL_MS = 70;
const PAGE_MULTIPLIER = 10;

interface StepperProps {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
  unit?: string;
  compact?: boolean;
}

export function Stepper({ label, value, step, onChange, unit = 'мм', compact = false }: StepperProps) {
  const valueRef = useRef(value);
  const holdTimerRef = useRef<number | undefined>(undefined);
  const [draft, setDraft] = useState<string | null>(null);
  valueRef.current = value;

  const stopHold = () => {
    window.clearTimeout(holdTimerRef.current);
    window.clearInterval(holdTimerRef.current);
  };

  useEffect(() => stopHold, []);

  const startHold = (direction: -1 | 1) => {
    stopHold();
    onChange(valueRef.current + direction * step);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = window.setInterval(() => onChange(valueRef.current + direction * step), HOLD_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  };

  const stepOnKeyboardClick = (direction: -1 | 1, event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) onChange(valueRef.current + direction * step);
  };

  const commitDraft = () => {
    if (draft === null) return;
    const typed = Number.parseInt(draft.replace(/\D/g, ''), 10);
    setDraft(null);
    if (Number.isFinite(typed) && typed !== value) onChange(typed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setDraft(null);
      event.currentTarget.blur();
    }
    const keyDeltas: Record<string, number> = { ArrowUp: step, ArrowDown: -step, PageUp: step * PAGE_MULTIPLIER, PageDown: -step * PAGE_MULTIPLIER };
    const delta = keyDeltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    setDraft(null);
    onChange(value + delta);
  };

  return (
    <div className={compact ? 'stepper stepper-compact' : 'stepper'}>
      {!compact && <span className="stepper-label">{label}</span>}
      <div className="stepper-control">
        <button
          type="button"
          className="stepper-button"
          aria-label={`${label}: меньше`}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={(event) => stepOnKeyboardClick(-1, event)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10" />
          </svg>
        </button>
        <label className="stepper-field">
          <input
            className="stepper-input"
            inputMode="numeric"
            aria-label={label}
            value={draft ?? String(value)}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitDraft}
            onKeyDown={handleKeyDown}
          />
          <span className="stepper-unit">{unit}</span>
        </label>
        <button
          type="button"
          className="stepper-button"
          aria-label={`${label}: больше`}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={(event) => stepOnKeyboardClick(1, event)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10M8 3v10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
