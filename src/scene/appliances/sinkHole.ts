const HOLE_MARGIN_MM = 100;
const HOLE_BACK_MM = 80;
const HOLE_DEPTH_MM = 400;
const HOLE_MIN_WIDTH_MM = 100;

export interface SinkHole {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export function measureSinkHole(moduleWidth: number): SinkHole {
  return { x: HOLE_MARGIN_MM, z: HOLE_BACK_MM, width: Math.max(moduleWidth - 2 * HOLE_MARGIN_MM, HOLE_MIN_WIDTH_MM), depth: HOLE_DEPTH_MM };
}
