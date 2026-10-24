import { Icon } from './icons';

export type ViewMode = 'perspective' | 'top';

const ZOOM_IN_FACTOR = 0.8;
const ZOOM_OUT_FACTOR = 1.25;

interface ViewBarProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onZoom: (factor: number) => void;
}

export function ViewBar({ view, onViewChange, onZoom }: ViewBarProps) {
  return (
    <div className="floating-bar view-bar" role="toolbar" aria-label="Вид">
      <button type="button" className="bar-button bar-button-text" aria-pressed={view === 'perspective'} onClick={() => onViewChange('perspective')}>
        <Icon name="cube" />
        3D
      </button>
      <button type="button" className="bar-button bar-button-text" aria-pressed={view === 'top'} onClick={() => onViewChange('top')}>
        <Icon name="topView" />
        Сверху
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
