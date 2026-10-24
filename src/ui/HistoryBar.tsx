import { Icon } from './icons';

interface HistoryBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isSharing: boolean;
  onShare: () => void;
}

export function HistoryBar({ canUndo, canRedo, onUndo, onRedo, isSharing, onShare }: HistoryBarProps) {
  return (
    <div className="floating-bar history-bar">
      <button type="button" className="bar-button" aria-label="Отменить" data-tip="Отменить" disabled={!canUndo} onClick={onUndo}>
        <Icon name="undo" />
      </button>
      <button type="button" className="bar-button" aria-label="Повторить" data-tip="Повторить" disabled={!canRedo} onClick={onRedo}>
        <Icon name="redo" />
      </button>
      <button type="button" className="bar-button bar-button-text history-share" aria-label="Поделиться" disabled={isSharing} onClick={onShare}>
        <Icon name="link" />
        <span className="bar-button-label">Поделиться</span>
      </button>
    </div>
  );
}
