import { Icon } from './icons';

export type ViewMode = 'perspective' | 'top' | 'eye';

const ZOOM_IN_FACTOR = 0.8;
const ZOOM_OUT_FACTOR = 1.25;

interface ViewBarProps {
  view: ViewMode;
  isEvening: boolean;
  onViewChange: (view: ViewMode) => void;
  onToggleEvening: () => void;
  onSnapshot: () => void;
  onZoom: (factor: number) => void;
}

export function ViewBar({ view, isEvening, onViewChange, onToggleEvening, onSnapshot, onZoom }: ViewBarProps) {
  return (
    <div className="floating-bar view-bar" role="toolbar" aria-label="Вид">
      <button type="button" className="bar-button bar-button-text" aria-pressed={view === 'perspective'} aria-label="3D" onClick={() => onViewChange('perspective')}>
        <Icon name="cube" />
        <span className="bar-button-label">3D</span>
      </button>
      <button type="button" className="bar-button bar-button-text" aria-pressed={view === 'top'} aria-label="Сверху" onClick={() => onViewChange('top')}>
        <Icon name="topView" />
        <span className="bar-button-label">Сверху</span>
      </button>
      <button type="button" className="bar-button bar-button-text" aria-pressed={view === 'eye'} aria-label="Изнутри" onClick={() => onViewChange('eye')}>
        <Icon name="eye" />
        <span className="bar-button-label">Изнутри</span>
      </button>
      <button type="button" className="bar-button" aria-pressed={isEvening} aria-label="Вечерний свет" data-tip="Вечерний свет" onClick={onToggleEvening}>
        <Icon name="moon" />
      </button>
      <button type="button" className="bar-button" aria-label="Сохранить картинку" data-tip="Сохранить картинку" onClick={onSnapshot}>
        <Icon name="camera" />
      </button>
      <button type="button" className="bar-button" aria-label="Отдалить" data-tip="Отдалить" onClick={() => onZoom(ZOOM_OUT_FACTOR)}>
        <Icon name="zoomOut" />
      </button>
      <button type="button" className="bar-button" aria-label="Приблизить" data-tip="Приблизить" onClick={() => onZoom(ZOOM_IN_FACTOR)}>
        <Icon name="zoomIn" />
      </button>
    </div>
  );
}
