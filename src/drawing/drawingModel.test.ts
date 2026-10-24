import { describe, expect, it } from 'vitest';
import { dragModule } from '../domain/dragging';
import { DEFAULT_KITCHEN, addModule, addOpening, resizeRoom, type Kitchen, type WallId } from '../domain/kitchen';
import { buildDrawing, buildElevationDrawing, buildPlanDrawing } from './drawingModel';

function readLabels(kitchen: Kitchen, wall: WallId, prefix: string): string[] {
  return buildElevationDrawing(kitchen, wall)
    .dimensions.filter((d) => d.key.startsWith(prefix))
    .map((d) => d.label);
}

describe('elevation drawing', () => {
  it('chains module widths below the floor and shows the wall length', () => {
    expect(readLabels(DEFAULT_KITCHEN, 'back', 'lower')).toEqual(['600', '600', '800', '600']);
    expect(readLabels(DEFAULT_KITCHEN, 'back', 'total-0')).toEqual(['3600']);
  });

  it('shows the wall height', () => {
    expect(readLabels(DEFAULT_KITCHEN, 'back', 'total-height')).toEqual(['2700']);
  });

  it('chains upper module widths above the wall', () => {
    expect(readLabels(DEFAULT_KITCHEN, 'back', 'upper')).toEqual(['600', '800', '600']);
  });

  it('lists height levels from the floor to the ceiling including the tall module', () => {
    expect(readLabels(DEFAULT_KITCHEN, 'back', 'levels')).toEqual(['100', '716', '38', '546', '716', '116', '468']);
  });

  it('shows a window with its sill and offsets', () => {
    const wide = resizeRoom({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } }, { length: 4000 });
    const kitchen = addOpening(wide, 'window', 'w', 'back');
    const drawing = buildElevationDrawing(kitchen, 'back');
    const window = drawing.rects.find((r) => r.kind === 'window');
    expect(window).toMatchObject({ x: 1400, y: 2700 - 900 - 1400, width: 1200, height: 1400 });
    expect(readLabels(kitchen, 'back', 'openings')).toEqual(['1400', '1200', '1400']);
    expect(readLabels(kitchen, 'back', 'opening-levels')).toEqual(['900', '1400', '400']);
  });

  it('mirrors the left wall so the back corner is on the right', () => {
    const kitchen = addModule(
      resizeRoom({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } }, { width: 3000 }),
      'base-1-door',
      'a',
      'left',
    );
    const module = buildElevationDrawing(kitchen, 'left').rects.find((r) => r.kind === 'lower');
    expect(module).toMatchObject({ x: 3000 - 600, width: 600 });
  });

  it('draws door leaves inside each module', () => {
    const leaves = buildElevationDrawing(DEFAULT_KITCHEN, 'back').rects.filter((r) => r.kind === 'leaf');
    expect(leaves.length).toBeGreaterThan(DEFAULT_KITCHEN.runs.back.length);
  });
});

describe('plan drawing', () => {
  it('shows the room size and a legend with every module', () => {
    const plan = buildPlanDrawing(DEFAULT_KITCHEN);
    expect(plan.dimensions.find((d) => d.key === 'total-length-0')?.label).toBe('3600');
    expect(plan.dimensions.find((d) => d.key === 'total-width-0')?.label).toBe('3000');
    const legend = plan.labels.filter((l) => l.key.startsWith('legend'));
    expect(legend).toHaveLength(DEFAULT_KITCHEN.runs.back.length);
    expect(legend[0].text).toBe('1  Пенал закрытый, 600 мм');
  });

  it('draws footprints of every wall run', () => {
    const wide = resizeRoom({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } }, { length: 4000, width: 3000 });
    const kitchen = addModule(addModule(wide, 'base-1-door', 'a', 'back'), 'base-1-door', 'b', 'left');
    const lower = buildPlanDrawing(kitchen).rects.filter((r) => r.kind === 'lower');
    expect(lower).toEqual([
      expect.objectContaining({ x: 0, y: 0, width: 600, height: 560 }),
      expect.objectContaining({ x: 0, y: 560, width: 560, height: 600 }),
    ]);
  });

  it('draws both arms of a corner module', () => {
    const wide = resizeRoom({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } }, { length: 4000, width: 3000 });
    const lower = buildPlanDrawing(addModule(wide, 'base-corner-990', 'c', 'back')).rects.filter((r) => r.kind === 'lower');
    expect(lower).toHaveLength(2);
    expect(lower[1]).toMatchObject({ width: 560, height: 990 });
  });

  it('is selected by the sheet id', () => {
    expect(buildDrawing(DEFAULT_KITCHEN, 'plan').sheet).toBe('plan');
    expect(buildDrawing(DEFAULT_KITCHEN, 'right').sheet).toBe('right');
  });

  it('keeps every dimension inside the view box', () => {
    const drawing = buildPlanDrawing(DEFAULT_KITCHEN);
    const { x, y, width, height } = drawing.viewBox;
    drawing.dimensions.forEach((d) => {
      expect(d.x1).toBeGreaterThanOrEqual(x);
      expect(d.x2).toBeLessThanOrEqual(x + width);
      expect(d.y1).toBeGreaterThanOrEqual(y);
      expect(d.y2).toBeLessThanOrEqual(y + height);
    });
  });
});

describe('drawing with fillers', () => {
  const room = resizeRoom({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } }, { length: 2500 });
  const kitchen = ['base-2-doors', 'base-2-doors', 'base-2-doors'].reduce(
    (acc, specId, index) => addModule(acc, specId, `m${index}`, 'back'),
    room,
  );

  it('draws the filler and its countertop on the wall view', () => {
    const rects = buildElevationDrawing(kitchen, 'back').rects;
    expect(rects.find((r) => r.kind === 'filler')).toMatchObject({ x: 2400, width: 100, height: 716 });
    expect(rects.filter((r) => r.kind === 'countertop').at(-1)).toMatchObject({ x: 2400, width: 100 });
  });

  it('adds the filler to the width chain so the chain adds up to the wall', () => {
    expect(readLabels(kitchen, 'back', 'lower')).toEqual(['800', '800', '800', '100']);
  });

  it('draws the filler footprint on the plan', () => {
    const filler = buildPlanDrawing(kitchen).rects.find((r) => r.kind === 'filler');
    expect(filler).toMatchObject({ x: 2400, y: 0, width: 100, height: 560 });
  });
});

describe('standing modules on drawings', () => {
  const pressed = dragModule(DEFAULT_KITCHEN, 'm4', { cx: 3100, cz: 300 });
  const island = dragModule(DEFAULT_KITCHEN, 'm4', { cx: 2000, cz: 2000 });

  it('show a module pressed against the wall on the wall sheet and in the plan legend', () => {
    expect(pressed.freeModules).toHaveLength(1);
    expect(readLabels(pressed, 'back', 'lower').length).toBeGreaterThan(readLabels(DEFAULT_KITCHEN, 'back', 'lower').length - 1);
    expect(buildPlanDrawing(pressed).labels.filter((l) => l.kind === 'note')).toHaveLength(7);
  });

  it('draw a module in the middle of the room only on the plan, numbered and listed', () => {
    const plan = buildPlanDrawing(island);
    expect(plan.rects.some((r) => r.key === 'm4-standing')).toBe(true);
    expect(plan.labels.filter((l) => l.kind === 'note')).toHaveLength(7);
    expect(buildDrawing(island, 'back').rects.some((r) => r.key.startsWith('m4'))).toBe(false);
  });
});
