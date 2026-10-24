import { getModuleSpec, type ModuleSpec } from './catalog';
import { addFreeModule, type Point } from './dragging';
import { isRectInsideRoom, measureRotatedFootprint } from './freeModules';
import { addModule, canAddModule, listSpaceTaken, overlapsInSpace, pickWallForModule, type Kitchen, type SpaceTaken, type WallId } from './kitchen';

const SEARCH_STEP_MM = 100;

const searchPointsByRoom = new Map<string, Point[]>();
const spaceTakenByKitchen = new WeakMap<Kitchen, SpaceTaken[]>();

function listSearchPoints(room: Kitchen['room']): Point[] {
  const key = `${room.length}x${room.width}`;
  const cached = searchPointsByRoom.get(key);
  if (cached) return cached;
  const center = { cx: room.length / 2, cz: room.width / 2 };
  const points: Point[] = [];
  for (let cx = 0; cx <= room.length; cx += SEARCH_STEP_MM) {
    for (let cz = 0; cz <= room.width; cz += SEARCH_STEP_MM) points.push({ cx, cz });
  }
  points.sort((a, b) => Math.hypot(a.cx - center.cx, a.cz - center.cz) - Math.hypot(b.cx - center.cx, b.cz - center.cz));
  searchPointsByRoom.set(key, points);
  return points;
}

function readSpaceTaken(kitchen: Kitchen): SpaceTaken[] {
  const cached = spaceTakenByKitchen.get(kitchen);
  if (cached) return cached;
  const taken = listSpaceTaken(kitchen);
  spaceTakenByKitchen.set(kitchen, taken);
  return taken;
}

function listWallSearchPoints(room: Kitchen['room'], depth: number): Point[] {
  const centerX = room.length / 2;
  const points: Point[] = [];
  for (let cx = 0; cx <= room.length; cx += SEARCH_STEP_MM) points.push({ cx, cz: depth / 2 });
  return points.sort((a, b) => Math.abs(a.cx - centerX) - Math.abs(b.cx - centerX));
}

function isSpotFree(kitchen: Kitchen, spec: ModuleSpec, point: Point): boolean {
  const rect = measureRotatedFootprint(spec.defaultWidth, spec.depth, 0, point.cx, point.cz);
  if (!isRectInsideRoom(rect, kitchen.room)) return false;
  if (spec.isFlat) return true;
  const space: SpaceTaken = { rect, bottom: spec.elevation, top: spec.elevation + spec.height };
  return !readSpaceTaken(kitchen).some((other) => overlapsInSpace(space, other));
}

function placeOnNearestFreeSpot(kitchen: Kitchen, specId: string, id: string): Kitchen {
  const spec = getModuleSpec(specId);
  const module = { id, specId, width: spec.defaultWidth };
  const points = spec.row === 'upper' ? listWallSearchPoints(kitchen.room, spec.depth) : listSearchPoints(kitchen.room);
  for (const point of points) {
    if (!isSpotFree(kitchen, spec, point)) continue;
    const next = addFreeModule(kitchen, module, point, 0);
    if (next !== kitchen) return next;
  }
  return kitchen;
}

export function canAddCatalogModule(kitchen: Kitchen, specId: string, wall: WallId): boolean {
  if (getModuleSpec(specId).type === 'standing') return placeOnNearestFreeSpot(kitchen, specId, 'candidate') !== kitchen;
  return canAddModule(kitchen, specId, pickWallForModule(specId, wall));
}

export function addCatalogModule(kitchen: Kitchen, specId: string, id: string, wall: WallId): Kitchen {
  if (getModuleSpec(specId).type === 'standing') return placeOnNearestFreeSpot(kitchen, specId, id);
  return addModule(kitchen, specId, id, pickWallForModule(specId, wall));
}
