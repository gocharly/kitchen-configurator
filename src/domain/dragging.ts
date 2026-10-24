import {
  WALLS,
  findFreeModule,
  findWallOfModule,
  fitsInRoom,
  layoutKitchen,
  listSpaceTaken,
  locateModuleCenter,
  moveModuleToWall,
  type Kitchen,
  type PlacedModule,
  type SpaceTaken,
  type WallId,
} from './kitchen';
import { getModuleSpec, type ModuleSpec } from './catalog';
import {
  ROTATION_STEP_DEG,
  measureRotatedFootprint,
  normalizeRotation,
  rotationFacingAwayFromWall,
  type FreeModule,
  type Rotation,
} from './freeModules';

export const WALL_SNAP_GAP_MM = 300;
const EDGE_SNAP_MM = 80;

export interface Point {
  cx: number;
  cz: number;
}

interface Located {
  module: PlacedModule;
  spec: ModuleSpec;
  wall: WallId | null;
  free: FreeModule | null;
}

function locateModule(kitchen: Kitchen, moduleId: string): Located | null {
  const free = findFreeModule(kitchen, moduleId);
  if (free) return { module: free.module, spec: getModuleSpec(free.module.specId), wall: null, free };
  const wall = findWallOfModule(kitchen, moduleId);
  const module = wall ? kitchen.runs[wall].find((m) => m.id === moduleId) : undefined;
  return module && wall ? { module, spec: getModuleSpec(module.specId), wall, free: null } : null;
}

function measureWallGap(wall: WallId, depth: number, point: Point, room: Kitchen['room']): number {
  if (wall === 'back') return point.cz - depth / 2;
  if (wall === 'left') return point.cx - depth / 2;
  return room.length - point.cx - depth / 2;
}

function pickNearestWall(depth: number, point: Point, room: Kitchen['room'], candidates: WallId[]): { wall: WallId; gap: number } {
  return candidates
    .map((wall) => ({ wall, gap: measureWallGap(wall, depth, point, room) }))
    .reduce((best, entry) => (entry.gap < best.gap ? entry : best));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pressAgainstWall(wall: WallId, located: Located, point: Point, room: Kitchen['room']): Point {
  const { width } = located.module;
  const { depth } = located.spec;
  if (wall === 'back') return { cx: clamp(point.cx, width / 2, room.length - width / 2), cz: depth / 2 };
  const cz = clamp(point.cz, width / 2, room.width - width / 2);
  return { cx: wall === 'left' ? depth / 2 : room.length - depth / 2, cz };
}

function measureRowIndexAt(kitchen: Kitchen, located: Located, wall: WallId, along: number): number {
  return layoutKitchen(kitchen)
    .filter((item) => item.wall === wall && item.spec.row === located.spec.row && item.module.id !== located.module.id)
    .filter((item) => item.offset + item.module.width / 2 < along).length;
}

function dockToWall(kitchen: Kitchen, located: Located, wall: WallId, point: Point): Kitchen {
  const along = wall === 'back' ? point.cx : point.cz;
  return moveModuleToWall(kitchen, located.module.id, wall, measureRowIndexAt(kitchen, located, wall, along));
}

function snapAxis(low: number, high: number, others: [number, number][]): number {
  let best = 0;
  let bestDistance = EDGE_SNAP_MM;
  others.forEach(([otherLow, otherHigh]) => {
    [otherLow - high, otherHigh - low, otherLow - low, otherHigh - high].forEach((delta) => {
      if (Math.abs(delta) < bestDistance) {
        best = delta;
        bestDistance = Math.abs(delta);
      }
    });
  });
  return best;
}

function sharesHeight(taken: SpaceTaken, spec: ModuleSpec): boolean {
  return taken.bottom < spec.elevation + spec.height && taken.top > spec.elevation;
}

function snapCenterToNeighbours(kitchen: Kitchen, located: Located, rotation: Rotation, point: Point): Point {
  const rect = measureRotatedFootprint(located.module.width, located.spec.depth, rotation, point.cx, point.cz);
  const others = listSpaceTaken(kitchen, located.module.id).filter((taken) => sharesHeight(taken, located.spec)).map((taken) => taken.rect);
  const alongX = others.filter((o) => o.z0 < rect.z1 + EDGE_SNAP_MM && o.z1 > rect.z0 - EDGE_SNAP_MM);
  const alongZ = others.filter((o) => o.x0 < rect.x1 + EDGE_SNAP_MM && o.x1 > rect.x0 - EDGE_SNAP_MM);
  const dx = snapAxis(rect.x0, rect.x1, alongX.map((o): [number, number] => [o.x0, o.x1]));
  const dz = snapAxis(rect.z0, rect.z1, alongZ.map((o): [number, number] => [o.z0, o.z1]));
  return { cx: point.cx + dx, cz: point.cz + dz };
}

function withoutModule(kitchen: Kitchen, moduleId: string): Kitchen {
  const runs = { ...kitchen.runs };
  WALLS.forEach(({ id }) => {
    runs[id] = kitchen.runs[id].filter((m) => m.id !== moduleId);
  });
  return { ...kitchen, runs, freeModules: kitchen.freeModules.filter((free) => free.module.id !== moduleId) };
}

export function placeModuleFreely(kitchen: Kitchen, moduleId: string, point: Point, rotation?: Rotation): Kitchen {
  const located = locateModule(kitchen, moduleId);
  if (!located || located.spec.isCorner) return kitchen;
  const turn = rotation ?? located.free?.rotation ?? rotationFacingAwayFromWall(located.wall);
  const cleared = withoutModule(kitchen, moduleId);
  const standing: FreeModule = { module: located.module, cx: Math.round(point.cx), cz: Math.round(point.cz), rotation: turn };
  const next = { ...cleared, freeModules: [...cleared.freeModules, standing] };
  return fitsInRoom(next) ? next : kitchen;
}

export function addFreeModule(kitchen: Kitchen, module: PlacedModule, point: Point, rotation: Rotation): Kitchen {
  if (getModuleSpec(module.specId).isCorner) return kitchen;
  const standing = { module, cx: Math.round(point.cx), cz: Math.round(point.cz), rotation };
  const next = { ...kitchen, freeModules: [...kitchen.freeModules, standing] };
  return fitsInRoom(next) ? next : kitchen;
}

export function rotateFreeModule(kitchen: Kitchen, moduleId: string, degrees: number = ROTATION_STEP_DEG): Kitchen {
  const free = findFreeModule(kitchen, moduleId);
  if (!free || getModuleSpec(free.module.specId).row === 'upper') return kitchen;
  const rotated = { ...free, rotation: normalizeRotation(free.rotation + degrees) };
  const next = { ...kitchen, freeModules: kitchen.freeModules.map((entry) => (entry === free ? rotated : entry)) };
  return fitsInRoom(next) ? next : kitchen;
}

function dragCornerAlongBackWall(kitchen: Kitchen, located: Located, point: Point): Kitchen {
  return dockToWall(kitchen, located, 'back', point);
}

function slideAlongObstacle(kitchen: Kitchen, located: Located, point: Point, rotation: Rotation): Kitchen {
  const from = locateModuleCenter(kitchen, located.module.id);
  if (!from) return kitchen;
  const attempts: Point[] = [
    { cx: point.cx, cz: from.cz },
    { cx: from.cx, cz: point.cz },
  ];
  for (const attempt of attempts) {
    const next = placeModuleFreely(kitchen, located.module.id, attempt, rotation);
    if (next !== kitchen) return next;
  }
  return kitchen;
}

export function dragModule(kitchen: Kitchen, moduleId: string, point: Point): Kitchen {
  const located = locateModule(kitchen, moduleId);
  if (!located) return kitchen;
  if (located.spec.isCorner) return dragCornerAlongBackWall(kitchen, located, point);
  const { room } = kitchen;
  const { wall, gap } = pickNearestWall(located.spec.depth, point, room, ['back', 'left', 'right']);
  const isHanging = located.spec.row === 'upper';
  const touchesWall = isHanging || gap <= WALL_SNAP_GAP_MM;
  const rotation = touchesWall ? rotationFacingAwayFromWall(wall) : (located.free?.rotation ?? rotationFacingAwayFromWall(located.wall));
  const target = touchesWall ? pressAgainstWall(wall, located, point, room) : point;
  const snapped = snapCenterToNeighbours(kitchen, located, rotation, target);
  const aimed = touchesWall ? pressAgainstWall(wall, located, snapped, room) : snapped;
  const placed = placeModuleFreely(kitchen, moduleId, aimed, rotation);
  return placed !== kitchen ? placed : slideAlongObstacle(kitchen, located, aimed, rotation);
}
