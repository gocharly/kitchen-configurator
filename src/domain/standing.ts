import { getModuleSpec, type ModuleSpec } from './catalog';
import { addFreeModule, type Point } from './dragging';
import { isRectInsideRoom, measureRotatedFootprint, type Rotation } from './freeModules';
import { addModule, canAddModule, listCountertopSurfaces, listSpaceTaken, overlapsInSpace, pickWallForModule, type Kitchen, type SpaceTaken, type WallId } from './kitchen';

const SEARCH_STEP_MM = 100;
const BACKSPLASH_GAP_MM = 10;

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

interface Placement {
  point: Point;
  rotation: Rotation;
}

const ROTATION_BY_WALL: Record<WallId, Rotation> = { back: 0, left: 90, right: 270 };

function listSurfacePlacements(kitchen: Kitchen, spec: ModuleSpec): Placement[] {
  return listCountertopSurfaces(kitchen).flatMap(({ rect: surface, wall }) => {
    const rotation = wall ? ROTATION_BY_WALL[wall] : 0;
    const isSideways = rotation !== 0;
    const alongWidth = isSideways ? surface.z1 - surface.z0 : surface.x1 - surface.x0;
    const crossDepth = isSideways ? surface.x1 - surface.x0 : surface.z1 - surface.z0;
    if (alongWidth < spec.defaultWidth || crossDepth < spec.depth) return [];
    const centerAlong = (isSideways ? surface.z0 + surface.z1 : surface.x0 + surface.x1) / 2;
    const near = BACKSPLASH_GAP_MM + spec.depth / 2;
    const placements: Placement[] = [];
    for (let offset = 0; offset <= (alongWidth - spec.defaultWidth) / 2; offset += SEARCH_STEP_MM) {
      [centerAlong - offset, centerAlong + offset].forEach((along) => {
        const point = rotation === 0 ? { cx: along, cz: surface.z0 + near } : rotation === 90 ? { cx: surface.x0 + near, cz: along } : { cx: surface.x1 - near, cz: along };
        placements.push({ point, rotation });
      });
    }
    return placements;
  });
}

function placeOnSurface(kitchen: Kitchen, specId: string, id: string): Kitchen {
  const spec = getModuleSpec(specId);
  const module = { id, specId, width: spec.defaultWidth };
  for (const { point, rotation } of listSurfacePlacements(kitchen, spec)) {
    const next = addFreeModule(kitchen, module, point, rotation);
    if (next !== kitchen) return next;
  }
  return kitchen;
}

function placeOnNearestFreeSpot(kitchen: Kitchen, specId: string, id: string): Kitchen {
  const spec = getModuleSpec(specId);
  if (spec.placeOn === 'countertop') return placeOnSurface(kitchen, specId, id);
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
