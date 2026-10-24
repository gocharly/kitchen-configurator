import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KITCHEN,
  addModule,
  addOpening,
  addOpeningAt,
  applyKitchenTemplate,
  calculateEstimate,
  canAddModule,
  canAddOpening,
  layoutKitchen,
  listFillers,
  measureOccupiedLength,
  measureOccupiedWidth,
  moveModule,
  moveModuleToRowIndex,
  moveModuleToWall,
  removeModule,
  resizeModule,
  resizeRoom,
  updateOpening,
  type Kitchen,
} from './kitchen';

const emptyKitchen: Kitchen = { ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } };
const wideKitchen = resizeRoom(emptyKitchen, { length: 6000, width: 4000 });

function addAll(kitchen: Kitchen, specIds: string[], wall: 'back' | 'left' | 'right' = 'back'): Kitchen {
  return specIds.reduce((acc, specId, index) => addModule(acc, specId, `${wall}-${index}`, wall), kitchen);
}

function listOffsets(kitchen: Kitchen, wall: string, row: 'lower' | 'upper'): number[] {
  return layoutKitchen(kitchen)
    .filter((item) => item.wall === wall && item.spec.row === row)
    .map((item) => item.offset);
}

describe('layoutKitchen', () => {
  it('places lower modules one after another from the left wall', () => {
    expect(listOffsets(DEFAULT_KITCHEN, 'back', 'lower')).toEqual([0, 600, 1200, 2000]);
  });

  it('moves upper modules past a tall module', () => {
    expect(listOffsets(DEFAULT_KITCHEN, 'back', 'upper')[0]).toBe(600);
  });

  it('starts the left wall after the back wall depth', () => {
    const kitchen = addAll(addAll(wideKitchen, ['base-1-door']), ['base-1-door'], 'left');
    expect(listOffsets(kitchen, 'left', 'lower')).toEqual([560]);
  });

  it('starts the left wall after a corner module', () => {
    const kitchen = addAll(addAll(wideKitchen, ['base-corner-990', 'base-1-door']), ['base-1-door'], 'left');
    expect(listOffsets(kitchen, 'back', 'lower')).toEqual([0, 990]);
    expect(listOffsets(kitchen, 'left', 'lower')).toEqual([990]);
  });
});

describe('corner modules', () => {
  it('refuses corners on side walls', () => {
    expect(canAddModule(wideKitchen, 'base-corner-990', 'left')).toBe(false);
  });

  it('keeps the first corner at the start and the second at the end', () => {
    const kitchen = addAll(wideKitchen, ['base-1-door', 'base-corner-990', 'base-2-doors', 'base-corner-890']);
    const sides = kitchen.runs.back.map((m) => m.cornerSide ?? 'middle');
    expect(sides).toEqual(['start', 'middle', 'middle', 'end']);
  });

  it('allows at most two corners per row', () => {
    const kitchen = addAll(wideKitchen, ['base-corner-990', 'base-corner-990']);
    expect(canAddModule(kitchen, 'base-corner-890', 'back')).toBe(false);
    expect(canAddModule(kitchen, 'top-corner-720', 'back')).toBe(true);
  });

  it('keeps the room wide enough for the corner legs', () => {
    const kitchen = addAll(wideKitchen, ['base-corner-990']);
    expect(measureOccupiedWidth(kitchen)).toBe(990);
  });

  it('counts the L-shaped countertop in the estimate', () => {
    const estimate = calculateEstimate(addAll(wideKitchen, ['base-corner-990']));
    expect(estimate.countertopPrice).toBe(Math.round((6000 * (2 * 990 - 560)) / 1000));
  });
});

describe('addModule', () => {
  it('refuses a module that does not fit the room length', () => {
    expect(canAddModule(DEFAULT_KITCHEN, 'base-1-door', 'back')).toBe(true);
    const tight = resizeRoom(DEFAULT_KITCHEN, { length: measureOccupiedLength(DEFAULT_KITCHEN) });
    expect(canAddModule(tight, 'base-1-door', 'back')).toBe(false);
    expect(addModule(tight, 'base-1-door', 'x', 'back')).toBe(tight);
  });

  it('refuses a module longer than the room width on a side wall', () => {
    const narrow = resizeRoom(emptyKitchen, { width: 1500 });
    const kitchen = addAll(narrow, ['base-2-doors'], 'left');
    expect(canAddModule(kitchen, 'base-2-doors', 'left')).toBe(false);
  });

  it('appends a module with its default width', () => {
    const next = addModule(emptyKitchen, 'base-sink-2-doors', 'a', 'back');
    expect(next.runs.back).toEqual([{ id: 'a', specId: 'base-sink-2-doors', width: 800 }]);
  });
});

describe('moveModuleToWall', () => {
  const base = addAll(wideKitchen, ['base-1-door', 'base-2-doors'], 'back');

  it('moves a module to another wall at the requested position', () => {
    const withLeft = addModule(base, 'base-1-door', 'l1', 'left');
    const moved = moveModuleToWall(withLeft, 'back-0', 'left', 0);
    expect(moved.runs.back.map((m) => m.id)).toEqual(['back-1']);
    expect(moved.runs.left.map((m) => m.id)).toEqual(['back-0', 'l1']);
  });

  it('keeps upper modules in the upper row order of the target wall', () => {
    const mixed = addModule(addModule(base, 'top-720-1-door', 'u1', 'left'), 'base-1-door', 'l1', 'left');
    const moved = moveModuleToWall(mixed, 'back-0', 'left', 1);
    expect(moved.runs.left.map((m) => m.id)).toEqual(['u1', 'l1', 'back-0']);
  });

  it('reorders inside the same wall', () => {
    expect(moveModuleToWall(base, 'back-0', 'back', 1).runs.back.map((m) => m.id)).toEqual(['back-1', 'back-0']);
  });

  it('refuses to move a corner module to a side wall', () => {
    const withCorner = addModule(base, 'base-corner-990', 'c', 'back');
    expect(moveModuleToWall(withCorner, 'c', 'left', 0)).toBe(withCorner);
  });

  it('refuses a move that does not fit the target wall', () => {
    const narrow = resizeRoom(emptyKitchen, { width: 1500 });
    const crowded = addModule(narrow, 'base-2-doors', 'a', 'back');
    const second = addModule(crowded, 'base-2-doors', 'b', 'left');
    expect(moveModuleToWall(second, 'a', 'left', 0)).toBe(second);
  });

  it('ignores an unknown module', () => {
    expect(moveModuleToWall(base, 'missing', 'left', 0)).toBe(base);
  });
});

describe('resizeModule', () => {
  it('snaps to the step and stays inside the module limits', () => {
    const base = addModule(emptyKitchen, 'base-1-door', 'a', 'back');
    expect(resizeModule(base, 'a', 5000).runs.back[0].width).toBe(600);
    expect(resizeModule(base, 'a', 10).runs.back[0].width).toBe(300);
    expect(resizeModule(base, 'a', 620).runs.back[0].width).toBe(600);
  });

  it('shrinks the request to the room length', () => {
    const room = resizeRoom(emptyKitchen, { length: 1800 });
    const withFirst = addModule(room, 'base-2-doors', 'a', 'back');
    const withSecond = addModule(withFirst, 'base-2-doors', 'b', 'back');
    expect(resizeModule(withSecond, 'b', 1200).runs.back[1].width).toBe(1000);
  });
});

describe('resizeRoom', () => {
  it('does not shrink below the occupied length and height', () => {
    const smaller = resizeRoom(DEFAULT_KITCHEN, { length: 1500, height: 2300 });
    expect(smaller.room.length).toBe(measureOccupiedLength(DEFAULT_KITCHEN));
    expect(smaller.room.height).toBe(2300);
  });

  it('refuses a module taller than the room', () => {
    const low = resizeRoom(emptyKitchen, { height: 2300 });
    expect(canAddModule(low, 'tall-high-closed', 'back')).toBe(false);
    expect(canAddModule(low, 'tall-closed', 'back')).toBe(true);
  });
});

describe('moving modules', () => {
  const kitchen = addAll(wideKitchen, ['base-1-door', 'base-sink-2-doors', 'top-720-1-door', 'base-3-drawers']);

  it('swaps neighbours within the same row and ignores moves past the ends', () => {
    const moved = moveModule(kitchen, 'back-0', 1);
    expect(listOffsets(moved, 'back', 'lower')).toEqual([0, 800, 1400]);
    expect(moved.runs.back.find((m) => m.specId === 'base-sink-2-doors')?.id).toBe('back-1');
    expect(moveModule(kitchen, 'back-0', -1)).toBe(kitchen);
  });

  it('moves a module to a row index', () => {
    const moved = moveModuleToRowIndex(kitchen, 'back-3', 0);
    expect(moved.runs.back.filter((m) => m.specId !== 'top-720-1-door').map((m) => m.id)).toEqual([
      'back-3',
      'back-0',
      'back-1',
    ]);
  });

  it('keeps a corner at the start when another module is moved before it', () => {
    const withCorner = addAll(wideKitchen, ['base-corner-990', 'base-1-door']);
    const moved = moveModuleToRowIndex(withCorner, 'back-1', 0);
    expect(moved.runs.back[0].id).toBe('back-0');
  });

  it('removes a module by id', () => {
    expect(removeModule(addModule(emptyKitchen, 'base-1-door', 'a', 'back'), 'a').runs.back).toEqual([]);
  });
});

describe('applyKitchenTemplate', () => {
  it('replaces the layout and keeps the current colors', () => {
    const painted = { ...emptyKitchen, facadeColorId: 'graphite', bodyColorId: 'grey' };
    const result = applyKitchenTemplate(painted, DEFAULT_KITCHEN);
    expect(result.runs).toBe(DEFAULT_KITCHEN.runs);
    expect([result.facadeColorId, result.bodyColorId]).toEqual(['graphite', 'grey']);
  });
});

describe('calculateEstimate', () => {
  it('prices modules by width and adds the countertop for base and sink', () => {
    const kitchen = addAll(emptyKitchen, ['base-1-door', 'tall-closed']);
    const estimate = calculateEstimate(kitchen);
    expect(estimate.lines.map((l) => l.price)).toEqual([5400, 10800]);
    expect(estimate.countertopPrice).toBe(3600);
    expect(estimate.total).toBe(19800);
  });

  it('counts modules from every wall', () => {
    const kitchen = addAll(addAll(wideKitchen, ['base-1-door']), ['base-1-door'], 'right');
    expect(calculateEstimate(kitchen).lines).toHaveLength(2);
  });
});

describe('openings', () => {
  const room = resizeRoom(emptyKitchen, { length: 4000, width: 3000 });
  const withWindow = (offset: number, kitchen = room): Kitchen => ({
    ...kitchen,
    openings: [{ id: 'w', kind: 'window', wall: 'back', offset, width: 1200, height: 1400, sill: 900 }],
  });

  it('lets lower modules pass under a window and moves upper modules aside', () => {
    const kitchen = addAll(withWindow(1000), ['base-2-doors', 'top-720-2-doors', 'top-720-1-door']);
    expect(listOffsets(kitchen, 'back', 'lower')).toEqual([0]);
    expect(listOffsets(kitchen, 'back', 'upper')).toEqual([0, 2200]);
  });

  it('moves a tall module past a window', () => {
    const kitchen = addAll(withWindow(300), ['tall-closed']);
    expect(listOffsets(kitchen, 'back', 'lower')).toEqual([1500]);
  });

  it('moves every module past a door', () => {
    const door = { id: 'd', kind: 'door' as const, wall: 'back' as const, offset: 0, width: 900, height: 2050, sill: 0 };
    const kitchen = addAll({ ...room, openings: [door] }, ['base-1-door']);
    expect(listOffsets(kitchen, 'back', 'lower')).toEqual([900]);
  });

  it('refuses an opening that pushes modules out of the room', () => {
    const full = resizeRoom(addAll(room, ['top-720-2-doors', 'top-720-2-doors', 'top-720-2-doors', 'top-720-2-doors']), {
      length: 3200,
    });
    expect(canAddOpening(full, 'window', 'back')).toBe(false);
  });

  it('refuses overlapping openings and openings outside the wall', () => {
    const first = addOpening(room, 'window', 'a', 'back');
    expect(first.openings).toHaveLength(1);
    const second = addOpeningAt(first, { ...first.openings[0], id: 'b' });
    expect(second).toBe(first);
    const outside = addOpeningAt(room, { ...first.openings[0], id: 'c', offset: 3500 });
    expect(outside).toBe(room);
  });

  it('places a new opening in the middle of the wall', () => {
    const next = addOpening(room, 'window', 'a', 'back');
    expect(next.openings[0].offset).toBe(1400);
  });

  it('updates an opening inside its limits and refuses an invalid move', () => {
    const base = addOpening(room, 'window', 'a', 'back');
    expect(updateOpening(base, 'a', { width: 99999 }).openings[0].width).toBe(2400);
    expect(updateOpening(base, 'a', { sill: 0 }).openings[0].sill).toBe(300);
    expect(updateOpening(base, 'a', { offset: 3500 })).toBe(base);
  });

  it('keeps the room as large as its openings', () => {
    const base = addOpening(room, 'window', 'a', 'back');
    const smaller = resizeRoom(base, { length: 1500, height: 2300 });
    expect(smaller.room.length).toBe(2600);
    expect(smaller.room.height).toBe(2300);
  });

  it('keeps openings that still fit when a template is applied', () => {
    const base = addOpening(room, 'window', 'a', 'left');
    expect(applyKitchenTemplate(base, DEFAULT_KITCHEN).openings).toHaveLength(1);
    const blockingWindow = addOpening(room, 'window', 'b', 'back');
    expect(applyKitchenTemplate(blockingWindow, DEFAULT_KITCHEN).openings).toEqual([]);
    const small = resizeRoom(emptyKitchen, { length: 1500, width: 1500 });
    expect(applyKitchenTemplate(base, small).openings).toEqual([]);
  });

  it('refuses an opening over a start corner module', () => {
    const corner = addAll(room, ['base-corner-990']);
    const blocked = addOpeningAt(corner, { id: 'd', kind: 'door', wall: 'back', offset: 0, width: 900, height: 2050, sill: 0 });
    expect(blocked).toBe(corner);
  });
});

describe('end corner', () => {
  it('stands against the right wall and does not count as extra room length', () => {
    const kitchen = addAll(wideKitchen, ['base-corner-990', 'base-1-door', 'base-corner-890']);
    expect(listOffsets(kitchen, 'back', 'lower')).toEqual([0, 990, 5110]);
    expect(measureOccupiedLength(kitchen)).toBe(990 + 600 + 890);
  });

  it('starts the right wall run after the end corner', () => {
    const kitchen = addAll(addAll(wideKitchen, ['base-corner-990', 'base-corner-890']), ['base-1-door'], 'right');
    expect(listOffsets(kitchen, 'right', 'lower')).toEqual([890]);
  });
});

describe('fillers', () => {
  const room2500 = resizeRoom(emptyKitchen, { length: 2500, width: 2500 });
  const summarize = (kitchen: Kitchen) =>
    listFillers(kitchen).map(({ wall, row, offset, width }) => ({ wall, row, offset, width }));

  it('closes a small gap at the end of a run', () => {
    const kitchen = addAll(room2500, ['base-2-doors', 'base-2-doors', 'base-2-doors']);
    expect(summarize(kitchen)).toEqual([{ wall: 'back', row: 'lower', offset: 2400, width: 100 }]);
  });

  it('leaves a big gap and an empty row without fillers', () => {
    expect(summarize(addAll(room2500, ['base-2-doors', 'base-2-doors']))).toEqual([]);
    expect(summarize(room2500)).toEqual([]);
  });

  it('closes the gap on a side wall toward the front wall', () => {
    const kitchen = addAll(room2500, ['base-2-doors', 'base-2-doors', 'base-2-doors'], 'left');
    expect(summarize(kitchen)).toEqual([{ wall: 'left', row: 'lower', offset: 2400, width: 100 }]);
  });

  it('closes the slack between a module and a window', () => {
    const wide = resizeRoom(emptyKitchen, { length: 4000 });
    const withModule = addAll(wide, ['top-720-1-door']);
    const kitchen = addOpeningAt(withModule, { id: 'w', kind: 'window', wall: 'back', offset: 700, width: 1200, height: 1400, sill: 900 });
    expect(kitchen.openings).toHaveLength(1);
    expect(summarize(kitchen)).toEqual([{ wall: 'back', row: 'upper', offset: 600, width: 100 }]);
  });

  it('takes height, depth and countertop from the neighbour and prices them', () => {
    const kitchen = addAll(room2500, ['base-2-doors', 'base-2-doors', 'base-2-doors']);
    const [filler] = listFillers(kitchen);
    expect(filler).toMatchObject({ elevation: 100, height: 716, depth: 560, hasCountertop: true });
    const estimate = calculateEstimate(kitchen);
    expect(estimate.lines.at(-1)).toMatchObject({ title: 'Добор', sku: 'FILLER-100', width: 100, price: 800 });
    expect(estimate.countertopPrice).toBe(15000);
  });

  it('does not change the module layout', () => {
    const kitchen = addAll(room2500, ['base-2-doors', 'base-2-doors', 'base-2-doors']);
    expect(layoutKitchen(kitchen).map((i) => i.offset)).toEqual([0, 800, 1600]);
  });
});

describe('aisle between opposite runs', () => {
  const room = (length: number) => resizeRoom(emptyKitchen, { length, width: 3000 });

  it('refuses a module that leaves a narrow aisle', () => {
    const left = addAll(room(2000), ['base-1-door'], 'left');
    expect(canAddModule(left, 'base-1-door', 'right')).toBe(false);
    const wider = addAll(room(2050), ['base-1-door'], 'left');
    expect(canAddModule(wider, 'base-1-door', 'right')).toBe(true);
  });

  it('allows opposite modules that do not face each other', () => {
    const wide = resizeRoom(emptyKitchen, { length: 2000, width: 4000 });
    const leftFar = addAll(wide, ['base-2-doors', 'base-2-doors', 'base-2-doors'], 'left');
    expect(leftFar.runs.left).toHaveLength(3);
    const upperOnly = addAll(leftFar, ['top-720-1-door'], 'right');
    expect(upperOnly.runs.right).toHaveLength(1);
  });

  it('does not count upper rows', () => {
    const kitchen = addAll(addAll(room(1500), ['top-720-1-door'], 'left'), ['top-720-1-door'], 'right');
    expect(kitchen.runs.right).toHaveLength(1);
  });

  it('keeps the room long enough for the aisle', () => {
    const facing = addAll(addAll(room(3000), ['base-1-door'], 'left'), ['base-1-door'], 'right');
    expect(resizeRoom(facing, { length: 1500 }).room.length).toBe(2050);
  });

  it('stops a widening module before it faces the opposite run', () => {
    const door = { id: 'd', kind: 'door' as const, wall: 'right' as const, offset: 0, width: 900, height: 2050, sill: 0 };
    const base = { ...room(2000), openings: [door] };
    const facing = addAll(addAll(base, ['base-1-door'], 'right'), ['base-2-doors'], 'left');
    expect(listOffsets(facing, 'right', 'lower')).toEqual([900]);
    expect(resizeModule(facing, 'left-0', 1200).runs.left[0].width).toBe(900);
  });
});
