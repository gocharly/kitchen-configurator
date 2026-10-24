import { useState } from 'react';
import {
  CATEGORIES,
  MODULE_SPECS,
  getModuleSpec,
  listModulesInCategory,
  type CategoryId,
  type ModuleSpec,
} from '../domain/catalog';
import {
  WALLS,
  canAddModule,
  listPlacedModules,
  listRowModules,
  pickWallForModule,
  type Kitchen,
  type PlacedModule,
  type WallId,
} from '../domain/kitchen';
import { Icon } from './icons';
import { ModulePreview } from './ModulePreview';
import { Stepper } from './Stepper';

function formatWidthRange(spec: ModuleSpec): string {
  return spec.minWidth === spec.maxWidth ? `${spec.minWidth} мм` : `${spec.minWidth} – ${spec.maxWidth} мм`;
}

interface ModuleCardProps {
  spec: ModuleSpec;
  colors: { facadeColorId: string; bodyColorId: string };
  canAdd: boolean;
  onAdd: (specId: string) => void;
}

function ModuleCard({ spec, colors, canAdd, onAdd }: ModuleCardProps) {
  return (
    <li>
      <button type="button" className="module-tile" disabled={!canAdd} onClick={() => onAdd(spec.id)}>
        <span className="module-tile-preview">
          <ModulePreview spec={spec} facadeColorId={colors.facadeColorId} bodyColorId={colors.bodyColorId} />
        </span>
        <span className="module-title">{spec.title}</span>
        <span className="module-caption">
          {formatWidthRange(spec)}, высота {spec.height} мм
        </span>
      </button>
    </li>
  );
}

interface WallPickerProps {
  wall: WallId;
  onSelect: (wall: WallId) => void;
}

export function WallPicker({ wall, onSelect }: WallPickerProps) {
  return (
    <div className="wall-picker" role="radiogroup" aria-label="Стена">
      {WALLS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          role="radio"
          aria-checked={entry.id === wall}
          className="wall-button"
          onClick={() => onSelect(entry.id)}
        >
          {entry.title}
        </button>
      ))}
    </div>
  );
}

interface ModuleCatalogProps {
  kitchen: Kitchen;
  wall: WallId;
  onWallChange: (wall: WallId) => void;
  onAdd: (specId: string) => void;
}

const ALL_CATEGORIES = 'all';

export function ModuleCatalog({ kitchen, wall, onWallChange, onAdd }: ModuleCatalogProps) {
  const [categoryId, setCategoryId] = useState<CategoryId>(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const categorySpecs = categoryId === ALL_CATEGORIES ? MODULE_SPECS : listModulesInCategory(categoryId);
  const visibleSpecs = normalizedQuery
    ? categorySpecs.filter((spec) => spec.title.toLowerCase().includes(normalizedQuery))
    : categorySpecs;

  return (
    <div className="panel-stack">
      <WallPicker wall={wall} onSelect={onWallChange} />
      <input
        className="module-search"
        type="text"
        value={query}
        placeholder="Поиск модуля"
        aria-label="Поиск модуля"
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="module-tabs" role="tablist" aria-label="Категории">
        {[{ id: ALL_CATEGORIES, title: 'Все' }, ...CATEGORIES].map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={entry.id === categoryId}
            className="module-tab"
            onClick={() => setCategoryId(entry.id)}
          >
            {entry.title}
          </button>
        ))}
      </div>
      <ul className="module-grid">
        {visibleSpecs.map((spec) => (
          <ModuleCard
            key={spec.id}
            spec={spec}
            colors={kitchen}
            canAdd={canAddModule(kitchen, spec.id, pickWallForModule(spec.id, wall))}
            onAdd={onAdd}
          />
        ))}
      </ul>
    </div>
  );
}

interface ModuleListProps {
  kitchen: Kitchen;
  selectedId: string | null;
  onSelect: (moduleId: string) => void;
  onResize: (moduleId: string, width: number) => void;
  onMove: (moduleId: string, direction: -1 | 1) => void;
  onRemove: (moduleId: string) => void;
}

interface ModuleRowProps extends Omit<ModuleListProps, 'kitchen'> {
  module: PlacedModule;
  colors: { facadeColorId: string; bodyColorId: string };
  rowIndex: number | null;
  rowLength: number;
}

function ModuleRow({ module, colors, rowIndex, rowLength, selectedId, onSelect, onResize, onMove, onRemove }: ModuleRowProps) {
  const spec = getModuleSpec(module.specId);
  const isWidthFixed = spec.minWidth === spec.maxWidth;
  return (
    <li className="module-row" aria-current={module.id === selectedId}>
      <div className="module-row-head">
        <button type="button" className="module-row-main" onClick={() => onSelect(module.id)}>
          <span className="module-row-thumb">
            <ModulePreview spec={spec} facadeColorId={colors.facadeColorId} bodyColorId={colors.bodyColorId} />
          </span>
          <span className="module-row-text">
            <span className="module-title">{spec.title}</span>
            <span className="module-caption">
              {module.width} × {spec.height} мм
            </span>
          </span>
        </button>
        <button type="button" className="row-button" aria-label="Удалить" data-tip="Удалить" onClick={() => onRemove(module.id)}>
          <Icon name="trash" />
        </button>
      </div>
      <div className="module-row-controls">
        {!isWidthFixed && <Stepper label="Ширина" compact value={module.width} step={spec.widthStep} onChange={(width) => onResize(module.id, width)} />}
        {rowIndex !== null && (
          <div className="module-row-order">
            <button type="button" className="row-button" aria-label="Сдвинуть назад" data-tip="Сдвинуть назад" disabled={rowIndex === 0} onClick={() => onMove(module.id, -1)}>
              <Icon name="left" />
            </button>
            <button type="button" className="row-button" aria-label="Сдвинуть вперёд" data-tip="Сдвинуть вперёд" disabled={rowIndex === rowLength - 1} onClick={() => onMove(module.id, 1)}>
              <Icon name="right" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

export function ModuleList({ kitchen, ...actions }: ModuleListProps) {
  if (listPlacedModules(kitchen).length === 0) return null;
  const filledWalls = WALLS.filter((wall) => kitchen.runs[wall.id].length > 0);
  const hasStanding = kitchen.freeModules.length > 0;
  const hasSeveralGroups = filledWalls.length + Number(hasStanding) > 1;
  return (
    <div className="module-groups">
      {filledWalls.map((wall) => (
        <div key={wall.id}>
          {hasSeveralGroups && <h3 className="module-group-title">{wall.title} стена</h3>}
          <ul className="module-list">
            {kitchen.runs[wall.id].map((module) => {
              const rowModules = listRowModules(kitchen.runs[wall.id], getModuleSpec(module.specId).row);
              const rowIndex = rowModules.findIndex((m) => m.id === module.id);
              return <ModuleRow key={module.id} module={module} colors={kitchen} rowIndex={rowIndex} rowLength={rowModules.length} {...actions} />;
            })}
          </ul>
        </div>
      ))}
      {hasStanding && (
        <div>
          {hasSeveralGroups && <h3 className="module-group-title">Отдельно стоящие</h3>}
          <ul className="module-list">
            {kitchen.freeModules.map((free) => (
              <ModuleRow key={free.module.id} module={free.module} colors={kitchen} rowIndex={null} rowLength={0} {...actions} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
