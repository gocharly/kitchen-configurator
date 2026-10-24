import {
  FACADE_STYLES,
  FILLER,
  FLOORS,
  HANDLES,
  NO_BACKSPLASH_ID,
  STYLE_PRESETS,
  WALL_FINISHES,
  MIN_AISLE_MM,
  ROOM_LIMITS,
  calculateCountertopPrice,
  countDoorLeaves,
  getModuleSpec,
  type ModuleSpec,
  type RowName,
} from './catalog';
import { findFillers, type Filler, type FillerRowInput } from './fillers';
import {
  isRectInsideRoom,
  measureRotatedFootprint,
  rectsOverlap,
  type FootprintRect,
  type FreeModule,
} from './freeModules';
import { hasPlacementViolation } from './placementRules';
import { OPENING_SPECS, OPENING_STEP_MM, type Opening, type OpeningKind } from './openings';

export type WallId = 'back' | 'left' | 'right';
export type CornerSide = 'start' | 'end';

export const WALLS: { id: WallId; title: string }[] = [
  { id: 'back', title: 'Задняя' },
  { id: 'left', title: 'Левая' },
  { id: 'right', title: 'Правая' },
];

const ROWS: RowName[] = ['lower', 'upper'];

export interface Room {
  length: number;
  width: number;
  height: number;
}

export interface PlacedModule {
  id: string;
  specId: string;
  width: number;
  cornerSide?: CornerSide;
}

export interface Kitchen {
  room: Room;
  runs: Record<WallId, PlacedModule[]>;
  openings: Opening[];
  freeModules: FreeModule[];
  facadeColorId: string;
  bodyColorId: string;
  floorId: string;
  wallFinishId: string;
  backsplashId: string;
  handleId: string;
  facadeStyleId: string;
}

export interface LayoutItem {
  module: PlacedModule;
  spec: ModuleSpec;
  wall: WallId;
  offset: number;
}

export interface EstimateLine {
  moduleId: string;
  sku: string;
  title: string;
  width: number;
  price: number;
}

export interface Estimate {
  lines: EstimateLine[];
  extraLines: EstimateLine[];
  countertopPrice: number;
  total: number;
}

export const DEFAULT_KITCHEN: Kitchen = {
  room: { length: 3600, width: 3000, height: 2700 },
  runs: {
    back: [
      { id: 'm1', specId: 'tall-closed', width: 600 },
      { id: 'm2', specId: 'base-1-door', width: 600 },
      { id: 'm3', specId: 'base-sink-2-doors', width: 800 },
      { id: 'm4', specId: 'base-3-drawers', width: 600 },
      { id: 'm5', specId: 'top-720-1-door', width: 600 },
      { id: 'm6', specId: 'top-720-2-doors', width: 800 },
      { id: 'm7', specId: 'top-720-1-door', width: 600 },
    ],
    left: [],
    right: [],
  },
  openings: [],
  freeModules: [],
  facadeColorId: 'white',
  bodyColorId: 'white',
  floorId: FLOORS[0].id,
  wallFinishId: WALL_FINISHES[0].id,
  backsplashId: NO_BACKSPLASH_ID,
  handleId: HANDLES[0].id,
  facadeStyleId: FACADE_STYLES[0].id,
};

interface Obstacle {
  start: number;
  end: number;
  bottom: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function normalizeModuleWidth(specId: string, width: number): number {
  const spec = getModuleSpec(specId);
  return clamp(snapToStep(width, spec.widthStep), spec.minWidth, spec.maxWidth);
}

export function measureWallLength(room: Room, wall: WallId): number {
  return wall === 'back' ? room.length : room.width;
}

function listOpeningObstacles(kitchen: Kitchen, wall: WallId): Obstacle[] {
  return kitchen.openings
    .filter((opening) => opening.wall === wall)
    .map((opening) => ({
      start: opening.offset,
      end: opening.offset + opening.width,
      bottom: opening.sill,
      top: opening.sill + opening.height,
    }));
}

function findBlockingEnd(cursor: number, module: PlacedModule, obstacles: Obstacle[]): number | null {
  const spec = getModuleSpec(module.specId);
  const bottom = spec.elevation;
  const top = spec.elevation + spec.height;
  const hit = obstacles.find(
    (obstacle) =>
      obstacle.bottom < top && obstacle.top > bottom && cursor < obstacle.end && cursor + module.width > obstacle.start,
  );
  return hit ? hit.end : null;
}

function placeRow(
  modules: PlacedModule[],
  startOffset: number,
  obstacles: Obstacle[],
  context: { wall: WallId; wallLength: number },
): LayoutItem[] {
  const sequential = modules.filter((m) => m.cornerSide !== 'end');
  let cursor = startOffset;
  const items = sequential.map((module) => {
    let blockingEnd = findBlockingEnd(cursor, module, obstacles);
    while (blockingEnd !== null) {
      cursor = blockingEnd;
      blockingEnd = findBlockingEnd(cursor, module, obstacles);
    }
    const item = { module, spec: getModuleSpec(module.specId), wall: context.wall, offset: cursor };
    cursor += module.width;
    return item;
  });
  const endCorners = modules
    .filter((m) => m.cornerSide === 'end')
    .map((module) => ({
      module,
      spec: getModuleSpec(module.specId),
      wall: context.wall,
      offset: Math.max(cursor, context.wallLength - module.width),
    }));
  return [...items, ...endCorners];
}

export function listRowModules(run: PlacedModule[], row: RowName): PlacedModule[] {
  return run.filter((module) => getModuleSpec(module.specId).row === row);
}

function measureSideRunOffset(kitchen: Kitchen, side: CornerSide, row: RowName): number {
  const rowModules = listRowModules(kitchen.runs.back, row);
  const neighbour = side === 'start' ? rowModules[0] : rowModules[rowModules.length - 1];
  if (!neighbour) return 0;
  const spec = getModuleSpec(neighbour.specId);
  return spec.isCorner ? neighbour.width : spec.depth;
}

function measureStartOffset(kitchen: Kitchen, wall: WallId, row: RowName): number {
  if (wall === 'back') return 0;
  return measureSideRunOffset(kitchen, wall === 'left' ? 'start' : 'end', row);
}

function layoutWall(kitchen: Kitchen, wall: WallId, wallLength: number): LayoutItem[] {
  const run = kitchen.runs[wall];
  const context = { wall, wallLength };
  const openingObstacles = listOpeningObstacles(kitchen, wall);
  const lowerItems = placeRow(
    listRowModules(run, 'lower'),
    measureStartOffset(kitchen, wall, 'lower'),
    openingObstacles,
    context,
  );
  const lowerObstacles = lowerItems.map((item) => ({
    start: item.offset,
    end: item.offset + item.module.width,
    bottom: item.spec.elevation,
    top: item.spec.elevation + item.spec.height,
  }));
  const upperItems = placeRow(
    listRowModules(run, 'upper'),
    measureStartOffset(kitchen, wall, 'upper'),
    [...openingObstacles, ...lowerObstacles],
    context,
  );
  return [...lowerItems, ...upperItems];
}

export function layoutKitchen(kitchen: Kitchen): LayoutItem[] {
  return WALLS.flatMap(({ id }) => layoutWall(kitchen, id, measureWallLength(kitchen.room, id)));
}

function layoutKitchenTightly(kitchen: Kitchen): LayoutItem[] {
  return WALLS.flatMap(({ id }) => layoutWall(kitchen, id, 0));
}

export function listPlacedModules(kitchen: Kitchen): { wall: WallId | null; module: PlacedModule }[] {
  const onWalls = WALLS.flatMap((wall) => kitchen.runs[wall.id].map((module) => ({ wall: wall.id as WallId | null, module })));
  return [...onWalls, ...kitchen.freeModules.map((free) => ({ wall: null, module: free.module }))];
}

function mapFootprintToRoomRect(footprint: Footprint, room: Room): FootprintRect {
  if (footprint.wall === 'back') return { x0: footprint.start, x1: footprint.end, z0: 0, z1: footprint.depth };
  if (footprint.wall === 'left') return { x0: 0, x1: footprint.depth, z0: footprint.start, z1: footprint.end };
  return { x0: room.length - footprint.depth, x1: room.length, z0: footprint.start, z1: footprint.end };
}

export function measureFreeModuleRect(free: FreeModule): FootprintRect {
  return measureRotatedFootprint(free.module.width, getModuleSpec(free.module.specId).depth, free.rotation, free.cx, free.cz);
}

export interface SpaceTaken {
  rect: FootprintRect;
  bottom: number;
  top: number;
}

function measureFreeSpace(free: FreeModule): SpaceTaken {
  const spec = getModuleSpec(free.module.specId);
  return { rect: measureFreeModuleRect(free), bottom: spec.elevation, top: spec.elevation + spec.height };
}

export function listSpaceTaken(kitchen: Kitchen, excludedModuleId: string | null = null): SpaceTaken[] {
  const onWalls = layoutKitchen(kitchen)
    .filter((item) => item.module.id !== excludedModuleId)
    .flatMap((item) =>
      listItemFootprints(item).map((footprint) => ({
        rect: mapFootprintToRoomRect(footprint, kitchen.room),
        bottom: footprint.bottom,
        top: footprint.top,
      })),
    );
  const standing = kitchen.freeModules.filter((free) => free.module.id !== excludedModuleId).map(measureFreeSpace);
  return [...onWalls, ...standing];
}

export function overlapsInSpace(a: SpaceTaken, b: SpaceTaken): boolean {
  return rectsOverlap(a.rect, b.rect) && a.bottom < b.top && a.top > b.bottom;
}

function findFlushWall(free: FreeModule, room: Room): WallId | null {
  const rect = measureFreeModuleRect(free);
  if (free.rotation === 0 && Math.abs(rect.z0) < 1) return 'back';
  if (free.rotation === 90 && Math.abs(rect.x0) < 1) return 'left';
  if (free.rotation === 270 && Math.abs(rect.x1 - room.length) < 1) return 'right';
  return null;
}

export function listFlushStandingItems(kitchen: Kitchen): LayoutItem[] {
  return kitchen.freeModules.flatMap((free): LayoutItem[] => {
    const wall = findFlushWall(free, kitchen.room);
    if (!wall) return [];
    const rect = measureFreeModuleRect(free);
    return [{ module: free.module, spec: getModuleSpec(free.module.specId), wall, offset: wall === 'back' ? rect.x0 : rect.z0 }];
  });
}

export function locateModuleCenter(kitchen: Kitchen, moduleId: string): { cx: number; cz: number } | null {
  const free = kitchen.freeModules.find((entry) => entry.module.id === moduleId);
  if (free) return { cx: free.cx, cz: free.cz };
  const item = layoutKitchen(kitchen).find((entry) => entry.module.id === moduleId);
  if (!item) return null;
  const rects = listItemFootprints(item).map((footprint) => mapFootprintToRoomRect(footprint, kitchen.room));
  const x0 = Math.min(...rects.map((r) => r.x0));
  const x1 = Math.max(...rects.map((r) => r.x1));
  const z0 = Math.min(...rects.map((r) => r.z0));
  const z1 = Math.max(...rects.map((r) => r.z1));
  return { cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

function isHangingOnWall(free: FreeModule, room: Room): boolean {
  const rect = measureFreeModuleRect(free);
  if (free.rotation === 0) return Math.abs(rect.z0) < 1;
  if (free.rotation === 90) return Math.abs(rect.x0) < 1;
  if (free.rotation === 270) return Math.abs(rect.x1 - room.length) < 1;
  return false;
}

function hasInvalidFreeModules(kitchen: Kitchen): boolean {
  const standing = kitchen.freeModules.map(measureFreeSpace);
  const everything = listSpaceTaken(kitchen);
  const onWalls = everything.slice(0, everything.length - standing.length);
  return kitchen.freeModules.some((free, index) => {
    const space = standing[index];
    const needsWall = getModuleSpec(free.module.specId).row === 'upper';
    return (
      !isRectInsideRoom(space.rect, kitchen.room) ||
      (needsWall && !isHangingOnWall(free, kitchen.room)) ||
      onWalls.some((other) => overlapsInSpace(space, other)) ||
      standing.slice(index + 1).some((other) => overlapsInSpace(space, other))
    );
  });
}

function measureExtent(items: LayoutItem[], wall: WallId): number {
  return items
    .filter((item) => item.wall === wall)
    .reduce((max, item) => Math.max(max, item.offset + item.module.width), 0);
}

function measureOpeningsEnd(kitchen: Kitchen, wall: WallId): number {
  return kitchen.openings
    .filter((opening) => opening.wall === wall)
    .reduce((max, opening) => Math.max(max, opening.offset + opening.width), 0);
}

function measureFreeExtent(kitchen: Kitchen, axis: 'x' | 'z'): number {
  return kitchen.freeModules.reduce((max, free) => {
    const rect = measureFreeModuleRect(free);
    return Math.max(max, axis === 'x' ? rect.x1 : rect.z1);
  }, 0);
}

function measureCornerLegs(kitchen: Kitchen): number {
  return kitchen.runs.back.reduce((max, module) => {
    return getModuleSpec(module.specId).isCorner ? Math.max(max, module.width) : max;
  }, 0);
}

export function measureOccupiedLength(kitchen: Kitchen): number {
  return Math.max(
    measureExtent(layoutKitchenTightly(kitchen), 'back'),
    measureOpeningsEnd(kitchen, 'back'),
    measureFreeExtent(kitchen, 'x'),
  );
}

export function measureOccupiedWidth(kitchen: Kitchen): number {
  const items = layoutKitchenTightly(kitchen);
  return Math.max(
    measureExtent(items, 'left'),
    measureExtent(items, 'right'),
    measureCornerLegs(kitchen),
    measureOpeningsEnd(kitchen, 'left'),
    measureOpeningsEnd(kitchen, 'right'),
    measureFreeExtent(kitchen, 'z'),
  );
}

export function measureOccupiedHeight(kitchen: Kitchen): number {
  const modulesTop = listPlacedModules(kitchen).reduce((max, { module }) => {
    const spec = getModuleSpec(module.specId);
    return Math.max(max, spec.elevation + spec.height);
  }, 0);
  return kitchen.openings.reduce((max, opening) => Math.max(max, opening.sill + opening.height), modulesTop);
}

export interface Footprint extends Obstacle {
  wall: WallId;
  row: RowName;
  depth: number;
}

export function listItemFootprints(item: LayoutItem): Footprint[] {
  const vertical = { bottom: item.spec.elevation, top: item.spec.elevation + item.spec.height };
  const traits = { row: item.spec.row, depth: item.spec.depth };
  const main = { wall: item.wall, start: item.offset, end: item.offset + item.module.width, ...vertical, ...traits };
  if (!item.spec.isCorner) return [main];
  const sideWall: WallId = item.module.cornerSide === 'end' ? 'right' : 'left';
  return [main, { wall: sideWall, start: 0, end: item.module.width, ...vertical, ...traits }];
}

function overlaps(a: Obstacle, b: Obstacle): boolean {
  return a.start < b.end && a.end > b.start && a.bottom < b.top && a.top > b.bottom;
}

function hasOpeningCollision(kitchen: Kitchen, items: LayoutItem[]): boolean {
  return items.some((item) =>
    listItemFootprints(item).some((footprint) =>
      listOpeningObstacles(kitchen, footprint.wall).some((obstacle) => overlaps(footprint, obstacle)),
    ),
  );
}

function measureRequiredAisleLength(items: LayoutItem[]): number {
  const lower = items.flatMap(listItemFootprints).filter((footprint) => footprint.row === 'lower');
  const left = lower.filter((footprint) => footprint.wall === 'left');
  const right = lower.filter((footprint) => footprint.wall === 'right');
  return left.reduce((required, a) => {
    const opposite = right.filter((b) => a.start < b.end && a.end > b.start);
    return opposite.reduce((max, b) => Math.max(max, a.depth + b.depth + MIN_AISLE_MM), required);
  }, 0);
}

function hasMovedStartCorner(items: LayoutItem[]): boolean {
  return items.some((item) => item.module.cornerSide === 'start' && item.offset !== 0);
}

function isOpeningInsideRoom(kitchen: Kitchen, opening: Opening): boolean {
  return (
    opening.offset >= 0 &&
    opening.offset + opening.width <= measureWallLength(kitchen.room, opening.wall) &&
    opening.sill >= 0 &&
    opening.sill + opening.height <= kitchen.room.height
  );
}

function hasOverlappingOpenings(kitchen: Kitchen): boolean {
  return kitchen.openings.some((first, index) =>
    kitchen.openings
      .slice(index + 1)
      .some(
        (second) =>
          first.wall === second.wall &&
          first.offset < second.offset + second.width &&
          first.offset + first.width > second.offset,
      ),
  );
}

export function fitsInRoom(kitchen: Kitchen): boolean {
  const tightItems = layoutKitchenTightly(kitchen);
  return (
    measureExtent(tightItems, 'back') <= kitchen.room.length &&
    measureRequiredAisleLength(tightItems) <= kitchen.room.length &&
    measureOccupiedWidth(kitchen) <= kitchen.room.width &&
    measureOccupiedHeight(kitchen) <= kitchen.room.height &&
    kitchen.openings.every((opening) => isOpeningInsideRoom(kitchen, opening)) &&
    !hasOverlappingOpenings(kitchen) &&
    !hasMovedStartCorner(tightItems) &&
    !hasInvalidFreeModules(kitchen) &&
    !hasPlacementViolation(layoutKitchen(kitchen)) &&
    !hasOpeningCollision(kitchen, layoutKitchen(kitchen))
  );
}

function sortCornersToEnds(run: PlacedModule[]): PlacedModule[] {
  const result = [...run];
  ROWS.forEach((row) => {
    const slots = result.flatMap((module, index) => (getModuleSpec(module.specId).row === row ? [index] : []));
    const rowModules = slots.map((index) => result[index]);
    const starts = rowModules.filter((m) => m.cornerSide === 'start');
    const ends = rowModules.filter((m) => m.cornerSide === 'end');
    const middle = rowModules.filter((m) => m.cornerSide === undefined);
    [...starts, ...middle, ...ends].forEach((module, position) => {
      result[slots[position]] = module;
    });
  });
  return result;
}

function pickCornerSide(run: PlacedModule[], spec: ModuleSpec): CornerSide | null {
  const rowModules = listRowModules(run, spec.row);
  if (!rowModules.some((m) => m.cornerSide === 'start')) return 'start';
  if (!rowModules.some((m) => m.cornerSide === 'end')) return 'end';
  return null;
}

function createModule(specId: string, id: string, run: PlacedModule[]): PlacedModule | null {
  const spec = getModuleSpec(specId);
  if (!spec.isCorner) return { id, specId, width: spec.defaultWidth };
  const cornerSide = pickCornerSide(run, spec);
  return cornerSide ? { id, specId, width: spec.defaultWidth, cornerSide } : null;
}

function withRun(kitchen: Kitchen, wall: WallId, run: PlacedModule[]): Kitchen {
  return { ...kitchen, runs: { ...kitchen.runs, [wall]: sortCornersToEnds(run) } };
}

function tryAppend(kitchen: Kitchen, specId: string, id: string, wall: WallId): Kitchen | null {
  if (getModuleSpec(specId).isCorner && wall !== 'back') return null;
  const module = createModule(specId, id, kitchen.runs[wall]);
  if (!module) return null;
  const next = withRun(kitchen, wall, [...kitchen.runs[wall], module]);
  return fitsInRoom(next) ? next : null;
}

export function pickWallForModule(specId: string, preferredWall: WallId): WallId {
  return getModuleSpec(specId).isCorner ? 'back' : preferredWall;
}

export function canAddModule(kitchen: Kitchen, specId: string, wall: WallId): boolean {
  return tryAppend(kitchen, specId, 'candidate', wall) !== null;
}

export function addModule(kitchen: Kitchen, specId: string, id: string, wall: WallId): Kitchen {
  return tryAppend(kitchen, specId, id, wall) ?? kitchen;
}

export function removeModule(kitchen: Kitchen, moduleId: string): Kitchen {
  const runs = { ...kitchen.runs };
  WALLS.forEach(({ id }) => {
    runs[id] = kitchen.runs[id].filter((m) => m.id !== moduleId);
  });
  return { ...kitchen, runs, freeModules: kitchen.freeModules.filter((free) => free.module.id !== moduleId) };
}

export function findFreeModule(kitchen: Kitchen, moduleId: string): FreeModule | null {
  return kitchen.freeModules.find((free) => free.module.id === moduleId) ?? null;
}

export function findWallOfModule(kitchen: Kitchen, moduleId: string): WallId | null {
  const found = WALLS.find(({ id }) => kitchen.runs[id].some((m) => m.id === moduleId));
  return found ? found.id : null;
}

export function moveModuleToRowIndex(kitchen: Kitchen, moduleId: string, rowIndex: number): Kitchen {
  const wall = findWallOfModule(kitchen, moduleId);
  if (!wall) return kitchen;
  const run = kitchen.runs[wall];
  const moving = run.find((m) => m.id === moduleId);
  if (!moving) return kitchen;
  const row = getModuleSpec(moving.specId).row;
  const rowOthers = listRowModules(run, row).filter((m) => m.id !== moduleId);
  const reordered = [...rowOthers];
  reordered.splice(clamp(rowIndex, 0, rowOthers.length), 0, moving);
  const slots = run.flatMap((m, index) => (getModuleSpec(m.specId).row === row ? [index] : []));
  const nextRun = [...run];
  slots.forEach((slot, position) => {
    nextRun[slot] = reordered[position];
  });
  if (nextRun.every((module, index) => module === run[index])) return kitchen;
  const next = withRun(kitchen, wall, nextRun);
  return fitsInRoom(next) ? next : kitchen;
}

function findInsertPosition(run: PlacedModule[], row: RowName, rowIndex: number): number {
  const slots = run.flatMap((module, index) => (getModuleSpec(module.specId).row === row ? [index] : []));
  if (rowIndex < slots.length) return slots[rowIndex];
  return slots.length > 0 ? slots[slots.length - 1] + 1 : run.length;
}

export function moveModuleToWall(kitchen: Kitchen, moduleId: string, wall: WallId, rowIndex: number): Kitchen {
  const sourceWall = findWallOfModule(kitchen, moduleId);
  if (sourceWall === wall) return moveModuleToRowIndex(kitchen, moduleId, rowIndex);
  const free = findFreeModule(kitchen, moduleId);
  const moving = free ? free.module : sourceWall ? kitchen.runs[sourceWall].find((m) => m.id === moduleId) : undefined;
  if (!moving || getModuleSpec(moving.specId).isCorner) return kitchen;
  const row = getModuleSpec(moving.specId).row;
  const targetRun = [...kitchen.runs[wall]];
  targetRun.splice(findInsertPosition(targetRun, row, clamp(rowIndex, 0, listRowModules(targetRun, row).length)), 0, moving);
  const runs = { ...kitchen.runs, [wall]: sortCornersToEnds(targetRun) };
  if (sourceWall) runs[sourceWall] = sortCornersToEnds(kitchen.runs[sourceWall].filter((m) => m.id !== moduleId));
  const next = { ...kitchen, runs, freeModules: kitchen.freeModules.filter((entry) => entry.module.id !== moduleId) };
  return fitsInRoom(next) ? next : kitchen;
}

export function moveModule(kitchen: Kitchen, moduleId: string, direction: -1 | 1): Kitchen {
  const wall = findWallOfModule(kitchen, moduleId);
  if (!wall) return kitchen;
  const moving = kitchen.runs[wall].find((m) => m.id === moduleId);
  if (!moving) return kitchen;
  const rowModules = listRowModules(kitchen.runs[wall], getModuleSpec(moving.specId).row);
  const index = rowModules.findIndex((m) => m.id === moduleId);
  const target = index + direction;
  if (target < 0 || target >= rowModules.length) return kitchen;
  return moveModuleToRowIndex(kitchen, moduleId, target);
}

function resizeFreeModule(kitchen: Kitchen, free: FreeModule, width: number): Kitchen {
  const spec = getModuleSpec(free.module.specId);
  let nextWidth = clamp(snapToStep(width, spec.widthStep), spec.minWidth, spec.maxWidth);
  const withWidth = (w: number): Kitchen => ({
    ...kitchen,
    freeModules: kitchen.freeModules.map((entry) => (entry === free ? { ...entry, module: { ...entry.module, width: w } } : entry)),
  });
  while (nextWidth > spec.minWidth && !fitsInRoom(withWidth(nextWidth))) nextWidth -= spec.widthStep;
  const result = withWidth(nextWidth);
  return fitsInRoom(result) ? result : kitchen;
}

export function resizeModule(kitchen: Kitchen, moduleId: string, width: number): Kitchen {
  const free = findFreeModule(kitchen, moduleId);
  if (free) return resizeFreeModule(kitchen, free, width);
  const wall = findWallOfModule(kitchen, moduleId);
  if (!wall) return kitchen;
  const current = kitchen.runs[wall].find((m) => m.id === moduleId);
  if (!current) return kitchen;
  const spec = getModuleSpec(current.specId);
  let nextWidth = clamp(snapToStep(width, spec.widthStep), spec.minWidth, spec.maxWidth);
  const withWidth = (w: number): Kitchen =>
    withRun(
      kitchen,
      wall,
      kitchen.runs[wall].map((m) => (m.id === moduleId ? { ...m, width: w } : m)),
    );
  while (nextWidth > spec.minWidth && !fitsInRoom(withWidth(nextWidth))) {
    nextWidth -= spec.widthStep;
  }
  const result = withWidth(nextWidth);
  return fitsInRoom(result) ? result : kitchen;
}

export function resizeRoom(kitchen: Kitchen, patch: Partial<Room>): Kitchen {
  const merged = { ...kitchen.room, ...patch };
  const requiredAisleLength = measureRequiredAisleLength(layoutKitchenTightly(kitchen));
  const room: Room = {
    length: clamp(
      snapToStep(merged.length, ROOM_LIMITS.step),
      Math.max(
        ROOM_LIMITS.length.min,
        measureOccupiedLength(kitchen),
        Math.ceil(requiredAisleLength / ROOM_LIMITS.step) * ROOM_LIMITS.step,
      ),
      ROOM_LIMITS.length.max,
    ),
    width: clamp(
      snapToStep(merged.width, ROOM_LIMITS.step),
      Math.max(ROOM_LIMITS.width.min, measureOccupiedWidth(kitchen)),
      ROOM_LIMITS.width.max,
    ),
    height: clamp(
      snapToStep(merged.height, ROOM_LIMITS.step),
      Math.max(ROOM_LIMITS.height.min, measureOccupiedHeight(kitchen)),
      ROOM_LIMITS.height.max,
    ),
  };
  const shift = room.length - kitchen.room.length;
  const freeModules =
    shift === 0
      ? kitchen.freeModules
      : kitchen.freeModules.map((free) => (findFlushWall(free, kitchen.room) === 'right' ? { ...free, cx: free.cx + shift } : free));
  return { ...kitchen, room, freeModules };
}

export function addOpeningAt(kitchen: Kitchen, opening: Opening): Kitchen {
  const next = { ...kitchen, openings: [...kitchen.openings, opening] };
  return fitsInRoom(next) ? next : kitchen;
}

function listOpeningOffsetsFromCenter(kitchen: Kitchen, wall: WallId, width: number): number[] {
  const wallLength = measureWallLength(kitchen.room, wall);
  const center = snapToStep((wallLength - width) / 2, OPENING_STEP_MM);
  const offsets: number[] = [];
  for (let offset = 0; offset <= wallLength - width; offset += OPENING_STEP_MM) offsets.push(offset);
  return offsets.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
}

function createOpeningDraft(kind: OpeningKind, id: string, wall: WallId, offset: number): Opening {
  const spec = OPENING_SPECS[kind];
  return { id, kind, wall, offset, width: spec.width.default, height: spec.height.default, sill: spec.sill.default };
}

function findOpeningPlacement(kitchen: Kitchen, kind: OpeningKind, id: string, wall: WallId): Kitchen | null {
  const width = OPENING_SPECS[kind].width.default;
  for (const offset of listOpeningOffsetsFromCenter(kitchen, wall, width)) {
    const next = addOpeningAt(kitchen, createOpeningDraft(kind, id, wall, offset));
    if (next !== kitchen) return next;
  }
  return null;
}

export function canAddOpening(kitchen: Kitchen, kind: OpeningKind, wall: WallId): boolean {
  return findOpeningPlacement(kitchen, kind, 'candidate', wall) !== null;
}

export function addOpening(kitchen: Kitchen, kind: OpeningKind, id: string, wall: WallId): Kitchen {
  return findOpeningPlacement(kitchen, kind, id, wall) ?? kitchen;
}

export function removeOpening(kitchen: Kitchen, openingId: string): Kitchen {
  return { ...kitchen, openings: kitchen.openings.filter((o) => o.id !== openingId) };
}

export type OpeningPatch = Partial<Pick<Opening, 'offset' | 'width' | 'height' | 'sill'>>;

function clampOpeningPatch(opening: Opening, patch: OpeningPatch): Opening {
  const spec = OPENING_SPECS[opening.kind];
  const merged = { ...opening, ...patch };
  return {
    ...merged,
    offset: Math.max(0, snapToStep(merged.offset, OPENING_STEP_MM)),
    width: clamp(snapToStep(merged.width, OPENING_STEP_MM), spec.width.min, spec.width.max),
    height: clamp(snapToStep(merged.height, OPENING_STEP_MM), spec.height.min, spec.height.max),
    sill: clamp(snapToStep(merged.sill, OPENING_STEP_MM), spec.sill.min, spec.sill.max),
  };
}

export function normalizeOpening(opening: Opening): Opening {
  return clampOpeningPatch(opening, {});
}

export function updateOpening(kitchen: Kitchen, openingId: string, patch: OpeningPatch): Kitchen {
  const current = kitchen.openings.find((o) => o.id === openingId);
  if (!current) return kitchen;
  const updated = clampOpeningPatch(current, patch);
  const next = { ...kitchen, openings: kitchen.openings.map((o) => (o.id === openingId ? updated : o)) };
  return fitsInRoom(next) ? next : kitchen;
}

export function paintKitchen(
  kitchen: Kitchen,
  finishes: Partial<Pick<Kitchen, 'facadeColorId' | 'bodyColorId' | 'floorId' | 'wallFinishId' | 'backsplashId' | 'handleId' | 'facadeStyleId'>>,
): Kitchen {
  return { ...kitchen, ...finishes };
}

export function applyStylePreset(kitchen: Kitchen, presetId: string): Kitchen {
  const preset = STYLE_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) throw new Error(`Style ${presetId} is missing in the catalog`);
  const { id, title, ...finishes } = preset;
  return paintKitchen(kitchen, finishes);
}

export function applyKitchenTemplate(current: Kitchen, template: Kitchen): Kitchen {
  const base: Kitchen = {
    ...template,
    openings: [],
    freeModules: [],
    facadeColorId: current.facadeColorId,
    bodyColorId: current.bodyColorId,
    floorId: current.floorId,
    wallFinishId: current.wallFinishId,
    backsplashId: current.backsplashId,
    handleId: current.handleId,
    facadeStyleId: current.facadeStyleId,
  };
  return current.openings.reduce<Kitchen>((kitchen, opening) => addOpeningAt(kitchen, opening), base);
}

function buildFillerRow(kitchen: Kitchen, items: LayoutItem[], wall: WallId, row: RowName): FillerRowInput {
  const onWall = items.filter((item) => item.wall === wall);
  const rowItems = onWall.filter((item) => item.spec.row === row);
  const openingObstacles = listOpeningObstacles(kitchen, wall);
  const lowerObstacles = onWall
    .filter((item) => item.spec.row === 'lower')
    .map((item) => ({
      start: item.offset,
      end: item.offset + item.module.width,
      bottom: item.spec.elevation,
      top: item.spec.elevation + item.spec.height,
    }));
  return {
    wall,
    row,
    startOffset: measureStartOffset(kitchen, wall, row),
    limit: measureWallLength(kitchen.room, wall),
    placements: rowItems.map((item) => ({ spec: item.spec, start: item.offset, end: item.offset + item.module.width })),
    obstacles: row === 'upper' ? [...openingObstacles, ...lowerObstacles] : openingObstacles,
  };
}

export function listFillers(kitchen: Kitchen): Filler[] {
  const items = layoutKitchen(kitchen);
  const rows = WALLS.flatMap(({ id }) => ROWS.map((row) => buildFillerRow(kitchen, items, id, row)));
  return findFillers(rows, FILLER);
}

function findFacadeStyle(kitchen: Kitchen) {
  const style = FACADE_STYLES.find((entry) => entry.id === kitchen.facadeStyleId);
  if (!style) throw new Error(`Facade style ${kitchen.facadeStyleId} is missing in the catalog`);
  return style;
}

function findHandle(kitchen: Kitchen) {
  const handle = HANDLES.find((entry) => entry.id === kitchen.handleId);
  if (!handle) throw new Error(`Handle ${kitchen.handleId} is missing in the catalog`);
  return handle;
}

export function calculateModulePrice(module: PlacedModule, priceFactor = 1): number {
  const spec = getModuleSpec(module.specId);
  const base = spec.priceFor(module.width);
  return spec.model === undefined ? Math.round(base * priceFactor) : base;
}

export function countModuleHandles(module: PlacedModule): number {
  const spec = getModuleSpec(module.specId);
  if (spec.model !== undefined) return 0;
  return spec.front.reduce((total, band) => (band.kind === 'opening' ? total : total + countDoorLeaves(band, module.width)), 0);
}

function measureCountertopLength(module: PlacedModule): number {
  const spec = getModuleSpec(module.specId);
  if (!spec.hasCountertop) return 0;
  return spec.isCorner ? 2 * module.width - spec.depth : module.width;
}

function buildHandleLines(kitchen: Kitchen, placed: PlacedModule[]): EstimateLine[] {
  const handle = findHandle(kitchen);
  const count = placed.reduce((total, module) => total + countModuleHandles(module), 0);
  if (handle.price === 0 || count === 0) return [];
  return [{ moduleId: 'handles', sku: `HANDLE-${handle.id.toUpperCase()}`, title: `Ручки: ${handle.title}, ${count} шт.`, width: 0, price: count * handle.price }];
}

export function calculateEstimate(kitchen: Kitchen): Estimate {
  const placed = listPlacedModules(kitchen).map(({ module }) => module);
  const priceFactor = findFacadeStyle(kitchen).priceFactor;
  const lines = placed.map((module) => ({
    moduleId: module.id,
    sku: getModuleSpec(module.specId).sku(module.width),
    title: getModuleSpec(module.specId).title,
    width: module.width,
    price: calculateModulePrice(module, priceFactor),
  }));
  const fillers = listFillers(kitchen);
  const fillerLines = fillers.map((filler) => ({
    moduleId: filler.key,
    sku: FILLER.sku(filler.width),
    title: FILLER.title,
    width: filler.width,
    price: FILLER.priceFor(filler.width),
  }));
  const fillerCountertopLength = fillers.reduce((sum, f) => sum + (f.hasCountertop ? f.width : 0), 0);
  const countertopLength = placed.reduce((sum, module) => sum + measureCountertopLength(module), fillerCountertopLength);
  const countertopPrice = calculateCountertopPrice(countertopLength);
  const extraLines = buildHandleLines(kitchen, placed);
  const allLines = [...lines, ...fillerLines];
  const linesTotal = [...allLines, ...extraLines].reduce((sum, line) => sum + line.price, 0);
  return { lines: allLines, extraLines, countertopPrice, total: linesTotal + countertopPrice };
}
