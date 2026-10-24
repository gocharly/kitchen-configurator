import { useCallback, useEffect, useReducer } from 'react';
import { commitChange, createHistory, redoChange, undoChange, type History } from '../domain/history';
import type { Kitchen } from '../domain/kitchen';

type KitchenUpdater = (current: Kitchen) => Kitchen;

type HistoryAction =
  | { type: 'update'; updater: KitchenUpdater; now: number }
  | { type: 'undo' }
  | { type: 'redo' };

function reduceHistory(history: History<Kitchen>, action: HistoryAction): History<Kitchen> {
  if (action.type === 'undo') return undoChange(history);
  if (action.type === 'redo') return redoChange(history);
  return commitChange(history, action.updater(history.present), action.now);
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

export function useKitchenHistory(createInitialKitchen: () => Kitchen) {
  const [history, dispatch] = useReducer(reduceHistory, undefined, () => createHistory(createInitialKitchen()));

  const updateKitchen = useCallback((updater: KitchenUpdater) => {
    dispatch({ type: 'update', updater, now: Date.now() });
  }, []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || isTextInput(event.target)) return;
      const key = event.key.toLowerCase();
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      dispatch({ type: isRedo ? 'redo' : 'undo' });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    kitchen: history.present,
    updateKitchen,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
