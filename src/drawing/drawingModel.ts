import { COUNTERTOP_THICKNESS_MM, countDoorLeaves, getModuleSpec } from '../domain/catalog';
import { OPENING_SPECS } from '../domain/openings';
import {
  layoutKitchen,
  listFillers,
  listFlushStandingItems,
  listItemFootprints,
  listPlacedModules,
  measureFreeModuleRect,
  measureWallLength,
  WALLS,
  type Footprint,
  type Kitchen,
  type LayoutItem,
  type WallId,
} from '../domain/kitchen';

export type SheetId = 'plan' | WallId;

export const SHEETS: { id: SheetId; title: string }[] = [
  { id: 'plan', title: 'План' },
  { id: 'back', title: 'Задняя стена' },
  { id: 'left', title: 'Левая стена' },
  { id: 'right', title: 'Правая стена' },
];

export type RectKind =
  | 'room'
  | 'lower'
  | 'upper'
  | 'countertop'
  | 'filler'
  | 'window'
  | 'door'
  | 'leaf'
  | 'niche';

export interface DrawingRect {
  key: string;
  kind: RectKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingDimension {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  anchor?: number;
}

export interface DrawingLabel {
  key: string;
  kind: 'number' | 'title' | 'note';
  x: number;
  y: number;
  text: string;
}

export interface Drawing {
  sheet: SheetId;
  viewBox: { x: number; y: number; width: number; height: number };
  fontSize: number;
  rects: DrawingRect[];
  dimensions: DrawingDimension[];
  labels: DrawingLabel[];
}

const CHAIN_STEP_MM = 300;
const FIRST_CHAIN_MM = 300;
const MARGIN_MM = 400;
const MIN_FONT_MM = 40;
const MAX_FONT_MM = 120;
const FONT_DIVISOR = 55;
const FRONT_INSET_MM = 3;
const PLAN_WALL_MARK_MM = 100;
const PLAN_NUMBER_UPPER_DEPTH_MM = 150;
const PLAN_NUMBER_LOWER_DEPTH_MM = 400;
const LEGEND_LINE_FACTOR = 1.6;

interface NumberedItem {
  item: LayoutItem;
  number: number;
}

function numberModules(kitchen: Kitchen): Map<string, number> {
  return new Map(listPlacedModules(kitchen).map(({ module }, index) => [module.id, index + 1]));
}

function numberItems(kitchen: Kitchen): NumberedItem[] {
  const numbers = numberModules(kitchen);
  return [...layoutKitchen(kitchen), ...listFlushStandingItems(kitchen)].map((item) => ({ item, number: numbers.get(item.module.id) ?? 0 }));
}

function listIslandModules(kitchen: Kitchen) {
  const onWalls = new Set(listFlushStandingItems(kitchen).map((item) => item.module.id));
  return kitchen.freeModules.filter((free) => !onWalls.has(free.module.id));
}

function formatStandingLegendLines(kitchen: Kitchen): { number: number; text: string }[] {
  const numbers = numberModules(kitchen);
  return listIslandModules(kitchen).map((free) => ({
    number: numbers.get(free.module.id) ?? 0,
    text: `${numbers.get(free.module.id)}  ${getModuleSpec(free.module.specId).title}, ${free.module.width} мм`,
  }));
}

function chooseFontSize(span: number): number {
  return Math.min(MAX_FONT_MM, Math.max(MIN_FONT_MM, Math.round(span / FONT_DIVISOR)));
}

function formatLegendLines(items: NumberedItem[]): string[] {
  return [...items]
    .sort((a, b) => a.number - b.number)
    .map(({ item, number }) => `${number}  ${item.spec.title}, ${item.module.width} мм`);
}

function addLegend(drawing: Drawing, lines: string[], originX: number, originY: number): number {
  const lineHeight = drawing.fontSize * LEGEND_LINE_FACTOR;
  lines.forEach((text, index) => {
    drawing.labels.push({ key: `legend-${index}`, kind: 'note', x: originX, y: originY + index * lineHeight, text });
  });
  return lines.length * lineHeight;
}

function listChainSegments(points: number[]): [number, number][] {
  const sorted = [...new Set(points)].sort((a, b) => a - b);
  return sorted.slice(1).map((end, index) => [sorted[index], end]);
}

function describeWallLength(wall: WallId): string {
  return WALLS.find((entry) => entry.id === wall)?.title ?? wall;
}

function mapAlongWall(wall: WallId, wallLength: number, start: number, end: number): [number, number] {
  return wall === 'left' ? [wallLength - end, wallLength - start] : [start, end];
}

function isPrimaryFootprint(item: LayoutItem, footprint: Footprint): boolean {
  return footprint.wall === item.wall;
}

function buildFrontRects(item: LayoutItem, x: number, topY: number, key: string): DrawingRect[] {
  const { spec, module } = item;
  const rects: DrawingRect[] = [];
  let bandTop = topY;
  spec.front.forEach((band, bandIndex) => {
    const bandHeight = spec.height * band.ratio;
    const leaves = countDoorLeaves(band, module.width);
    const leafWidth = module.width / leaves;
    for (let leaf = 0; leaf < leaves; leaf += 1) {
      rects.push({
        key: `${key}-front-${bandIndex}-${leaf}`,
        kind: band.kind === 'opening' ? 'niche' : 'leaf',
        x: x + leaf * leafWidth + FRONT_INSET_MM,
        y: bandTop + FRONT_INSET_MM,
        width: leafWidth - 2 * FRONT_INSET_MM,
        height: bandHeight - 2 * FRONT_INSET_MM,
      });
    }
    bandTop += bandHeight;
  });
  return rects;
}

function buildHorizontalChain(
  key: string,
  segments: [number, number][],
  chainY: number,
  anchorY: number,
): DrawingDimension[] {
  return segments.map(([start, end], index) => ({
    key: `${key}-${index}`,
    x1: start,
    y1: chainY,
    x2: end,
    y2: chainY,
    label: String(Math.round(end - start)),
    anchor: anchorY,
  }));
}

function buildVerticalChain(
  key: string,
  segments: [number, number][],
  chainX: number,
  anchorX: number,
): DrawingDimension[] {
  return segments.map(([start, end], index) => ({
    key: `${key}-${index}`,
    x1: chainX,
    y1: start,
    x2: chainX,
    y2: end,
    label: String(Math.round(Math.abs(end - start))),
    anchor: anchorX,
  }));
}

function listModuleLevels(kitchen: Kitchen, footprints: { item: LayoutItem }[]): number[] {
  const levels = [0, kitchen.room.height];
  footprints.forEach(({ item }) => {
    levels.push(item.spec.elevation, item.spec.elevation + item.spec.height);
    if (item.spec.hasCountertop) levels.push(item.spec.elevation + item.spec.height + COUNTERTOP_THICKNESS_MM);
  });
  return levels;
}

export function buildElevationDrawing(kitchen: Kitchen, wall: WallId): Drawing {
  const { room } = kitchen;
  const wallLength = measureWallLength(room, wall);
  const height = room.height;
  const fontSize = chooseFontSize(Math.max(wallLength, height));
  const numbered = numberItems(kitchen);
  const onWall = numbered.flatMap(({ item, number }) =>
    listItemFootprints(item)
      .filter((footprint) => footprint.wall === wall)
      .map((footprint) => ({ item, number, footprint })),
  );
  const openings = kitchen.openings.filter((o) => o.wall === wall);
  const toX = (start: number, end: number) => mapAlongWall(wall, wallLength, start, end);
  const toY = (level: number) => height - level;

  const rects: DrawingRect[] = [{ key: 'room', kind: 'room', x: 0, y: 0, width: wallLength, height }];
  const labels: DrawingLabel[] = [];
  const dimensions: DrawingDimension[] = [];

  openings.forEach((opening) => {
    const [x] = toX(opening.offset, opening.offset + opening.width);
    rects.push({
      key: `opening-${opening.id}`,
      kind: OPENING_SPECS[opening.kind].family,
      x,
      y: toY(opening.sill + opening.height),
      width: opening.width,
      height: opening.height,
    });
  });

  onWall.forEach(({ item, number, footprint }) => {
    const [x] = toX(footprint.start, footprint.end);
    const width = footprint.end - footprint.start;
    const key = `${item.module.id}-${footprint.wall}`;
    rects.push({
      key,
      kind: item.spec.row,
      x,
      y: toY(footprint.top),
      width,
      height: footprint.top - footprint.bottom,
    });
    if (isPrimaryFootprint(item, footprint)) {
      rects.push(...buildFrontRects(item, x, toY(footprint.top), key));
    }
    if (item.spec.hasCountertop) {
      rects.push({
        key: `${key}-countertop`,
        kind: 'countertop',
        x,
        y: toY(footprint.top + COUNTERTOP_THICKNESS_MM),
        width,
        height: COUNTERTOP_THICKNESS_MM,
      });
    }
    labels.push({
      key: `${key}-number`,
      kind: 'number',
      x: x + width / 2,
      y: toY((footprint.top + footprint.bottom) / 2),
      text: String(number),
    });
  });

  const wallFillers = listFillers(kitchen).filter((filler) => filler.wall === wall);
  wallFillers.forEach((filler) => {
    const [x] = toX(filler.offset, filler.offset + filler.width);
    const top = filler.elevation + filler.height;
    rects.push({ key: filler.key, kind: 'filler', x, y: toY(top), width: filler.width, height: filler.height });
    if (filler.hasCountertop) {
      rects.push({
        key: `${filler.key}-countertop`,
        kind: 'countertop',
        x,
        y: toY(top + COUNTERTOP_THICKNESS_MM),
        width: filler.width,
        height: COUNTERTOP_THICKNESS_MM,
      });
    }
  });
  const rowPoints = (row: 'lower' | 'upper') => [
    ...onWall.filter(({ item }) => item.spec.row === row).flatMap(({ footprint }) => toX(footprint.start, footprint.end)),
    ...wallFillers.filter((filler) => filler.row === row).flatMap((f) => toX(f.offset, f.offset + f.width)),
  ];
  const lowerSegments = listChainSegments(rowPoints('lower'));
  const upperSegments = listChainSegments(rowPoints('upper'));
  const openingSegments = listChainSegments([
    0,
    wallLength,
    ...openings.flatMap((o) => toX(o.offset, o.offset + o.width)),
  ]);
  dimensions.push(
    ...buildHorizontalChain('lower', lowerSegments, height + FIRST_CHAIN_MM, height),
    ...buildHorizontalChain('total', [[0, wallLength]], height + FIRST_CHAIN_MM + CHAIN_STEP_MM, height),
    ...buildHorizontalChain('upper', upperSegments, -FIRST_CHAIN_MM, 0),
    ...(openings.length > 0 ? buildHorizontalChain('openings', openingSegments, -FIRST_CHAIN_MM - CHAIN_STEP_MM, 0) : []),
  );

  const moduleLevels = listChainSegments(listModuleLevels(kitchen, onWall)).map(
    ([start, end]): [number, number] => [toY(start), toY(end)],
  );
  dimensions.push(
    ...buildVerticalChain('levels', moduleLevels, -FIRST_CHAIN_MM, 0),
    ...buildVerticalChain('total-height', [[toY(0), toY(height)]], -FIRST_CHAIN_MM - CHAIN_STEP_MM, 0),
  );
  const openingLevels = listChainSegments([
    0,
    height,
    ...openings.flatMap((o) => [o.sill, o.sill + o.height]),
  ]).map(([start, end]): [number, number] => [toY(start), toY(end)]);
  if (openings.length > 0) {
    dimensions.push(...buildVerticalChain('opening-levels', openingLevels, wallLength + FIRST_CHAIN_MM, wallLength));
  }

  labels.push({ key: 'title', kind: 'title', x: 0, y: -FIRST_CHAIN_MM - 3 * CHAIN_STEP_MM, text: `${describeWallLength(wall)} стена, размеры в мм` });
  const drawing: Drawing = {
    sheet: wall,
    viewBox: { x: -MARGIN_MM - FIRST_CHAIN_MM, y: -FIRST_CHAIN_MM - 4 * CHAIN_STEP_MM, width: wallLength + 2 * (MARGIN_MM + FIRST_CHAIN_MM), height: 0 },
    fontSize,
    rects,
    dimensions,
    labels,
  };
  const legendTop = height + FIRST_CHAIN_MM + 3 * CHAIN_STEP_MM;
  const legendHeight = addLegend(drawing, formatLegendLines(onWall.filter(({ footprint, item }) => isPrimaryFootprint(item, footprint))), 0, legendTop);
  drawing.viewBox.height = legendTop + legendHeight + MARGIN_MM - drawing.viewBox.y;
  return drawing;
}

function toPlanRects(item: LayoutItem, room: Kitchen['room']): { x: number; y: number; width: number; height: number }[] {
  const { spec, module, wall, offset } = item;
  const depth = spec.depth;
  if (spec.isCorner) {
    const leg = module.width;
    const armX = module.cornerSide === 'end' ? offset + leg - depth : offset;
    return [
      { x: offset, y: 0, width: leg, height: depth },
      { x: armX, y: 0, width: depth, height: leg },
    ];
  }
  if (wall === 'back') return [{ x: offset, y: 0, width: module.width, height: depth }];
  if (wall === 'left') return [{ x: 0, y: offset, width: depth, height: module.width }];
  return [{ x: room.length - depth, y: offset, width: depth, height: module.width }];
}

function measurePlanNumberPosition(item: LayoutItem, room: Kitchen['room']): { x: number; y: number } {
  const depth = item.spec.row === 'upper' ? PLAN_NUMBER_UPPER_DEPTH_MM : PLAN_NUMBER_LOWER_DEPTH_MM;
  const middle = item.offset + item.module.width / 2;
  if (item.wall === 'back') return { x: middle, y: depth };
  if (item.wall === 'left') return { x: depth, y: middle };
  return { x: room.length - depth, y: middle };
}

function buildPlanChains(kitchen: Kitchen, numbered: NumberedItem[]): DrawingDimension[] {
  const { length, width } = kitchen.room;
  const lowerFillers = listFillers(kitchen).filter((filler) => filler.row === 'lower');
  const lowerOn = (wall: WallId) => numbered.filter(({ item }) => item.wall === wall && item.spec.row === 'lower');
  const spans = (entries: NumberedItem[], wall: WallId) =>
    listChainSegments([
      ...entries.flatMap(({ item }) => [item.offset, item.offset + item.module.width]),
      ...lowerFillers.filter((f) => f.wall === wall).flatMap((f) => [f.offset, f.offset + f.width]),
    ]);
  const openingSpans = (wall: WallId, wallLength: number) =>
    listChainSegments([0, wallLength, ...kitchen.openings.filter((o) => o.wall === wall).flatMap((o) => [o.offset, o.offset + o.width])]);
  const hasOpenings = (wall: WallId) => kitchen.openings.some((o) => o.wall === wall);
  const dimensions: DrawingDimension[] = [
    ...buildHorizontalChain('back-modules', spans(lowerOn('back'), 'back'), -FIRST_CHAIN_MM, 0),
    ...(hasOpenings('back') ? buildHorizontalChain('back-openings', openingSpans('back', length), -FIRST_CHAIN_MM - CHAIN_STEP_MM, 0) : []),
    ...buildHorizontalChain('total-length', [[0, length]], -FIRST_CHAIN_MM - 2 * CHAIN_STEP_MM, 0),
    ...buildVerticalChain('left-modules', spans(lowerOn('left'), 'left'), -FIRST_CHAIN_MM, 0),
    ...(hasOpenings('left') ? buildVerticalChain('left-openings', openingSpans('left', width), -FIRST_CHAIN_MM - CHAIN_STEP_MM, 0) : []),
    ...buildVerticalChain('total-width', [[0, width]], -FIRST_CHAIN_MM - 2 * CHAIN_STEP_MM, 0),
    ...buildVerticalChain('right-modules', spans(lowerOn('right'), 'right'), length + FIRST_CHAIN_MM, length),
    ...(hasOpenings('right') ? buildVerticalChain('right-openings', openingSpans('right', width), length + FIRST_CHAIN_MM + CHAIN_STEP_MM, length) : []),
  ];
  return dimensions;
}

export function buildPlanDrawing(kitchen: Kitchen): Drawing {
  const { room } = kitchen;
  const fontSize = chooseFontSize(Math.max(room.length, room.width));
  const numbered = numberItems(kitchen);
  const rects: DrawingRect[] = [{ key: 'room', kind: 'room', x: 0, y: 0, width: room.length, height: room.width }];
  const labels: DrawingLabel[] = [];
  const upperFirst = [...numbered].sort((a, b) => Number(b.item.spec.row === 'upper') - Number(a.item.spec.row === 'upper'));
  upperFirst.forEach(({ item, number }) => {
    toPlanRects(item, room).forEach((rect, index) => {
      rects.push({ key: `${item.module.id}-${index}`, kind: item.spec.row, ...rect });
    });
    labels.push({ key: `${item.module.id}-number`, kind: 'number', text: String(number), ...measurePlanNumberPosition(item, room) });
  });
  listIslandModules(kitchen).forEach((free) => {
    const rect = measureFreeModuleRect(free);
    rects.push({ key: `${free.module.id}-standing`, kind: 'lower', x: rect.x0, y: rect.z0, width: rect.x1 - rect.x0, height: rect.z1 - rect.z0 });
    labels.push({ key: `${free.module.id}-number`, kind: 'number', text: String(numberModules(kitchen).get(free.module.id)), x: free.cx, y: free.cz });
  });
  listFillers(kitchen)
    .filter((filler) => filler.row === 'lower')
    .forEach((filler) => {
      const rect =
        filler.wall === 'back'
          ? { x: filler.offset, y: 0, width: filler.width, height: filler.depth }
          : filler.wall === 'left'
            ? { x: 0, y: filler.offset, width: filler.depth, height: filler.width }
            : { x: room.length - filler.depth, y: filler.offset, width: filler.depth, height: filler.width };
      rects.push({ key: filler.key, kind: 'filler', ...rect });
    });
  kitchen.openings.forEach((opening) => {
    const start = opening.offset;
    const thickness = PLAN_WALL_MARK_MM;
    const rect =
      opening.wall === 'back'
        ? { x: start, y: -thickness / 2, width: opening.width, height: thickness }
        : opening.wall === 'left'
          ? { x: -thickness / 2, y: start, width: thickness, height: opening.width }
          : { x: room.length - thickness / 2, y: start, width: thickness, height: opening.width };
    rects.push({ key: `opening-${opening.id}`, kind: OPENING_SPECS[opening.kind].family, ...rect });
  });
  labels.push({ key: 'title', kind: 'title', x: 0, y: -FIRST_CHAIN_MM - 3 * CHAIN_STEP_MM, text: 'План, размеры в мм' });
  const drawing: Drawing = {
    sheet: 'plan',
    viewBox: { x: -MARGIN_MM - 2 * FIRST_CHAIN_MM - CHAIN_STEP_MM, y: -FIRST_CHAIN_MM - 4 * CHAIN_STEP_MM, width: room.length + 2 * (MARGIN_MM + 2 * FIRST_CHAIN_MM + CHAIN_STEP_MM), height: 0 },
    fontSize,
    rects,
    dimensions: buildPlanChains(kitchen, numbered),
    labels,
  };
  const legendTop = room.width + MARGIN_MM;
  const legendLines = [...formatLegendLines(numbered), ...formatStandingLegendLines(kitchen).sort((a, b) => a.number - b.number).map((line) => line.text)];
  const legendHeight = addLegend(drawing, legendLines, 0, legendTop);
  drawing.viewBox.height = legendTop + legendHeight + MARGIN_MM - drawing.viewBox.y;
  return drawing;
}

export function buildDrawing(kitchen: Kitchen, sheet: SheetId): Drawing {
  return sheet === 'plan' ? buildPlanDrawing(kitchen) : buildElevationDrawing(kitchen, sheet);
}
