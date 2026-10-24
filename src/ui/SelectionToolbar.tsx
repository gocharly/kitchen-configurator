import { getModuleSpec } from '../domain/catalog';
import { findFreeModule, listPlacedModules, listRowModules, type Kitchen } from '../domain/kitchen';
import { Icon } from './icons';
import { Stepper } from './Stepper';

interface SelectionToolbarProps {
  kitchen: Kitchen;
  moduleId: string;
  onResize: (moduleId: string, width: number) => void;
  onMove: (moduleId: string, direction: -1 | 1) => void;
  onRotate: (moduleId: string) => void;
  onRemove: (moduleId: string) => void;
}

interface OrderButtonsProps {
  moduleId: string;
  rowIndex: number;
  rowLength: number;
  onMove: (moduleId: string, direction: -1 | 1) => void;
}

function OrderButtons({ moduleId, rowIndex, rowLength, onMove }: OrderButtonsProps) {
  return (
    <>
      <button type="button" className="bar-button" aria-label="Сдвинуть назад" data-tip="Сдвинуть назад" disabled={rowIndex === 0} onClick={() => onMove(moduleId, -1)}>
        <Icon name="left" />
      </button>
      <button type="button" className="bar-button" aria-label="Сдвинуть вперёд" data-tip="Сдвинуть вперёд" disabled={rowIndex === rowLength - 1} onClick={() => onMove(moduleId, 1)}>
        <Icon name="right" />
      </button>
    </>
  );
}

export function SelectionToolbar({ kitchen, moduleId, onResize, onMove, onRotate, onRemove }: SelectionToolbarProps) {
  const found = listPlacedModules(kitchen).find((entry) => entry.module.id === moduleId);
  if (!found) return null;
  const spec = getModuleSpec(found.module.specId);
  const isStanding = findFreeModule(kitchen, moduleId) !== null;
  const rowModules = found.wall ? listRowModules(kitchen.runs[found.wall], spec.row) : [];
  return (
    <div className="floating-bar selection-toolbar" role="toolbar" aria-label="Выбранный модуль">
      <span className="selection-title">{spec.title}</span>
      {spec.minWidth !== spec.maxWidth && (
        <Stepper compact label="Ширина" value={found.module.width} step={spec.widthStep} onChange={(width) => onResize(moduleId, width)} />
      )}
      {isStanding && spec.row === 'upper' ? null : isStanding ? (
        <button type="button" className="bar-button" aria-label="Повернуть" data-tip="Повернуть" onClick={() => onRotate(moduleId)}>
          <Icon name="rotate" />
        </button>
      ) : (
        <OrderButtons
          moduleId={moduleId}
          rowIndex={rowModules.findIndex((module) => module.id === moduleId)}
          rowLength={rowModules.length}
          onMove={onMove}
        />
      )}
      <button type="button" className="bar-button" aria-label="Удалить" data-tip="Удалить" onClick={() => onRemove(moduleId)}>
        <Icon name="trash" />
      </button>
    </div>
  );
}
