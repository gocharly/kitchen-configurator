import type { ModuleSpec, RowName } from './catalogFormat';
import type { WallId } from './kitchen';

export interface FillerSpace {
  start: number;
  end: number;
  bottom: number;
  top: number;
}

export interface RowPlacement {
  spec: ModuleSpec;
  start: number;
  end: number;
}

export interface FillerRowInput {
  wall: WallId;
  row: RowName;
  startOffset: number;
  limit: number;
  placements: RowPlacement[];
  obstacles: FillerSpace[];
}

export interface FillerLimits {
  minWidth: number;
  maxWidth: number;
}

export interface Filler {
  key: string;
  wall: WallId;
  row: RowName;
  offset: number;
  width: number;
  elevation: number;
  height: number;
  depth: number;
  hasCountertop: boolean;
}

function subtractObstacles(start: number, end: number, obstacles: FillerSpace[]): [number, number][] {
  const free: [number, number][] = [];
  let cursor = start;
  [...obstacles]
    .sort((a, b) => a.start - b.start)
    .forEach((obstacle) => {
      if (obstacle.end <= cursor || obstacle.start >= end) return;
      if (obstacle.start > cursor) free.push([cursor, obstacle.start]);
      cursor = Math.max(cursor, obstacle.end);
    });
  if (cursor < end) free.push([cursor, end]);
  return free;
}

function findReference(placements: RowPlacement[], gapStart: number, gapEnd: number): RowPlacement | undefined {
  return placements.find((p) => p.end === gapStart) ?? placements.find((p) => p.start === gapEnd);
}

function listRowGaps(input: FillerRowInput): [number, number][] {
  const sorted = [...input.placements].sort((a, b) => a.start - b.start);
  const gaps: [number, number][] = [];
  let cursor = input.startOffset;
  sorted.forEach((placement) => {
    if (placement.start > cursor) gaps.push([cursor, placement.start]);
    cursor = Math.max(cursor, placement.end);
  });
  if (input.limit > cursor) gaps.push([cursor, input.limit]);
  return gaps;
}

function findRowFillers(input: FillerRowInput, limits: FillerLimits): Filler[] {
  if (input.placements.length === 0) return [];
  return listRowGaps(input).flatMap(([gapStart, gapEnd]) => {
    const reference = findReference(input.placements, gapStart, gapEnd);
    if (!reference) return [];
    const { spec } = reference;
    const span = { bottom: spec.elevation, top: spec.elevation + spec.height };
    const blocking = input.obstacles.filter((o) => o.bottom < span.top && o.top > span.bottom);
    return subtractObstacles(gapStart, gapEnd, blocking)
      .filter(([start, end]) => end - start >= limits.minWidth && end - start <= limits.maxWidth)
      .map(([start, end]) => ({
        key: `filler-${input.wall}-${input.row}-${start}`,
        wall: input.wall,
        row: input.row,
        offset: start,
        width: end - start,
        elevation: spec.elevation,
        height: spec.height,
        depth: spec.depth,
        hasCountertop: spec.hasCountertop,
      }));
  });
}

export function findFillers(rows: FillerRowInput[], limits: FillerLimits): Filler[] {
  return rows.flatMap((row) => findRowFillers(row, limits));
}
