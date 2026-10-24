import { Icon } from './icons';

interface HistoryBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export function HistoryBar({ canUndo, canRedo, onUndo, onRedo }: HistoryBarProps) {
  return (
    <div className="floating-bar history-bar">
      <button type="button" className="bar-button" aria-label="Отменить" data-tip="Отменить" disabled={!canUndo} onClick={onUndo}>
        <Icon name="undo" />
      </button>
      <button type="button" className="bar-button" aria-label="Повторить" data-tip="Повторить" disabled={!canRedo} onClick={onRedo}>
        <Icon name="redo" />
      </button>
    </div>
  );
}
