import type { Room, PlacedModule, WallId } from './kitchen';

export type Rotation = 0 | 90 | 180 | 270;

export const ROTATION_STEP_DEG = 90;
const FULL_TURN_DEG = 360;
const OVERLAP_TOLERANCE_MM = 0.5;

export interface FreeModule {
  module: PlacedModule;
  cx: number;
  cz: number;
  rotation: Rotation;
}

export interface FootprintRect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export function normalizeRotation(degrees: number): Rotation {
  const turned = ((Math.round(degrees / ROTATION_STEP_DEG) * ROTATION_STEP_DEG) % FULL_TURN_DEG + FULL_TURN_DEG) % FULL_TURN_DEG;
  return turned as Rotation;
}

export function rotationFacingAwayFromWall(wall: WallId | null): Rotation {
  if (wall === 'left') return 90;
  if (wall === 'right') return 270;
  return 0;
}

export function measureRotatedFootprint(width: number, depth: number, rotation: Rotation, cx: number, cz: number): FootprintRect {
  const isSideways = rotation === 90 || rotation === 270;
  const halfX = (isSideways ? depth : width) / 2;
  const halfZ = (isSideways ? width : depth) / 2;
  return { x0: cx - halfX, x1: cx + halfX, z0: cz - halfZ, z1: cz + halfZ };
}

export function rectsOverlap(a: FootprintRect, b: FootprintRect): boolean {
  return (
    a.x0 < b.x1 - OVERLAP_TOLERANCE_MM &&
    a.x1 > b.x0 + OVERLAP_TOLERANCE_MM &&
    a.z0 < b.z1 - OVERLAP_TOLERANCE_MM &&
    a.z1 > b.z0 + OVERLAP_TOLERANCE_MM
  );
}

export function isRectInsideRoom(rect: FootprintRect, room: Room): boolean {
  return rect.x0 >= -OVERLAP_TOLERANCE_MM && rect.z0 >= -OVERLAP_TOLERANCE_MM && rect.x1 <= room.length + OVERLAP_TOLERANCE_MM && rect.z1 <= room.width + OVERLAP_TOLERANCE_MM;
}
