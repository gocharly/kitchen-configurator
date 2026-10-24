export const HISTORY_LIMIT = 100;
export const COALESCE_WINDOW_MS = 400;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  lastChangeAt: number;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastChangeAt: Number.NEGATIVE_INFINITY };
}

export function commitChange<T>(history: History<T>, next: T, now: number): History<T> {
  if (next === history.present) return history;
  const startsNewEntry = now - history.lastChangeAt >= COALESCE_WINDOW_MS;
  const past = startsNewEntry ? [...history.past, history.present].slice(-HISTORY_LIMIT) : history.past;
  return { past, present: next, future: [], lastChangeAt: now };
}

export function undoChange<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastChangeAt: Number.NEGATIVE_INFINITY,
  };
}

export function redoChange<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history;
  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
    lastChangeAt: Number.NEGATIVE_INFINITY,
  };
}
