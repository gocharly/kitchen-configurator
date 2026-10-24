import { OPENING_KINDS, OPENING_SPECS, OPENING_STEP_MM, type OpeningKind } from '../domain/openings';
import { WALLS, canAddOpening, type Kitchen, type OpeningPatch, type WallId } from '../domain/kitchen';
import { Icon } from './icons';
import { WallPicker } from './ModulePanels';
import { OpeningThumbnail } from './OpeningThumbnail';
import { Stepper } from './Stepper';

const ADD_LABELS: Record<OpeningKind, string> = {
  window: 'Добавить окно',
  door: 'Добавить дверь',
};

function findWallTitle(wall: WallId): string {
  return WALLS.find((entry) => entry.id === wall)?.title ?? wall;
}

interface OpeningPanelProps {
  kitchen: Kitchen;
  wall: WallId;
  onWallChange: (wall: WallId) => void;
  onAdd: (kind: OpeningKind) => void;
  onUpdate: (openingId: string, patch: OpeningPatch) => void;
  onRemove: (openingId: string) => void;
}

export function OpeningPanel({ kitchen, wall, onWallChange, onAdd, onUpdate, onRemove }: OpeningPanelProps) {
  return (
    <div className="panel-stack">
      <WallPicker wall={wall} onSelect={onWallChange} />
      <div className="opening-add">
        {OPENING_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className="catalog-button"
            disabled={!canAddOpening(kitchen, kind, wall)}
            onClick={() => onAdd(kind)}
          >
            {ADD_LABELS[kind]}
          </button>
        ))}
      </div>
      <ul className="module-list">
        {kitchen.openings.map((opening) => (
          <li key={opening.id} className="module-row">
            <div className="module-row-head">
              <div className="module-row-main">
                <span className="module-row-thumb">
                  <OpeningThumbnail kind={opening.kind} />
                </span>
                <span className="module-row-text">
                  <span className="module-title">{OPENING_SPECS[opening.kind].title}</span>
                  <span className="module-caption">
                    {findWallTitle(opening.wall)} стена, {opening.width} × {opening.height} мм
                  </span>
                </span>
              </div>
              <button type="button" className="row-button" aria-label="Удалить" data-tip="Удалить" onClick={() => onRemove(opening.id)}>
                <Icon name="trash" />
              </button>
            </div>
            <div className="opening-steppers">
              <Stepper label="Отступ от угла" value={opening.offset} step={OPENING_STEP_MM} onChange={(offset) => onUpdate(opening.id, { offset })} />
              <Stepper label="Ширина" value={opening.width} step={OPENING_STEP_MM} onChange={(width) => onUpdate(opening.id, { width })} />
              <Stepper label="Высота" value={opening.height} step={OPENING_STEP_MM} onChange={(height) => onUpdate(opening.id, { height })} />
              {opening.kind === 'window' && (
                <Stepper label="Подоконник" value={opening.sill} step={OPENING_STEP_MM} onChange={(sill) => onUpdate(opening.id, { sill })} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
