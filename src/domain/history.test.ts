import { describe, expect, it } from 'vitest';
import { COALESCE_WINDOW_MS, HISTORY_LIMIT, commitChange, createHistory, redoChange, undoChange } from './history';

describe('history', () => {
  it('keeps a separate entry for changes far apart in time', () => {
    let history = createHistory(0);
    history = commitChange(history, 1, 1000);
    history = commitChange(history, 2, 1000 + COALESCE_WINDOW_MS);
    expect(history.past).toEqual([0, 1]);
    expect(undoChange(history).present).toBe(1);
  });

  it('merges a quick burst of changes into one entry', () => {
    let history = createHistory(0);
    [1, 2, 3, 4].forEach((value, index) => {
      history = commitChange(history, value, 1000 + index * 50);
    });
    expect(history.past).toEqual([0]);
    expect(undoChange(history).present).toBe(0);
  });

  it('ignores a change that keeps the same value', () => {
    const history = createHistory('a');
    expect(commitChange(history, 'a', 1000)).toBe(history);
  });

  it('undoes and redoes and clears redo after a new change', () => {
    let history = commitChange(createHistory(0), 1, 1000);
    history = commitChange(history, 2, 2000);
    history = undoChange(history);
    expect(history).toMatchObject({ present: 1, future: [2] });
    expect(redoChange(history).present).toBe(2);
    history = commitChange(history, 9, 3000);
    expect(history.future).toEqual([]);
    expect(redoChange(history)).toBe(history);
  });

  it('starts a new entry right after undo even inside the window', () => {
    let history = commitChange(createHistory(0), 1, 1000);
    history = undoChange(history);
    history = commitChange(history, 5, 1001);
    expect(history.past).toEqual([0]);
    expect(undoChange(history).present).toBe(0);
  });

  it('does nothing when there is nothing to undo', () => {
    const history = createHistory(0);
    expect(undoChange(history)).toBe(history);
  });

  it('forgets the oldest entries beyond the limit', () => {
    let history = createHistory(0);
    for (let step = 1; step <= HISTORY_LIMIT + 20; step += 1) {
      history = commitChange(history, step, step * COALESCE_WINDOW_MS);
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(20);
  });
});
