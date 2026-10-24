import { describe, expect, it } from 'vitest';
import { WALL_SNAP_GAP_MM, dragModule, placeModuleFreely, rotateFreeModule } from './dragging';
import {
  DEFAULT_KITCHEN,
  addModule,
  calculateEstimate,
  listPlacedModules,
  locateModuleCenter,
  removeModule,
  resizeModule,
  resizeRoom,
  type Kitchen,
} from './kitchen';

const emptyKitchen: Kitchen = { ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } };
const wideKitchen = resizeRoom(emptyKitchen, { length: 6000, width: 4000 });

function withBase(wall: 'back' | 'left' | 'right' = 'back', specId = 'base-2-doors'): Kitchen {
  return addModule(wideKitchen, specId, 'm1', wall);
}

describe('placeModuleFreely', () => {
  it('takes a module off the wall and stands it in the room', () => {
    const placed = placeModuleFreely(withBase(), 'm1', { cx: 3000, cz: 2000 });
    expect(placed.runs.back).toEqual([]);
    expect(placed.freeModules).toHaveLength(1);
    expect(placed.freeModules[0]).toMatchObject({ cx: 3000, cz: 2000, rotation: 0 });
  });

  it('keeps the facing of the wall the module came from', () => {
    expect(placeModuleFreely(withBase('left'), 'm1', { cx: 3000, cz: 2000 }).freeModules[0].rotation).toBe(90);
    expect(placeModuleFreely(withBase('right'), 'm1', { cx: 3000, cz: 2000 }).freeModules[0].rotation).toBe(270);
  });

  it('refuses corner modules and upper modules that do not hang on a wall', () => {
    const upper = addModule(wideKitchen, 'top-720-1-door', 'u', 'back');
    const corner = addModule(wideKitchen, 'base-corner-990', 'c', 'back');
    expect(placeModuleFreely(upper, 'u', { cx: 3000, cz: 2000 })).toBe(upper);
    expect(placeModuleFreely(corner, 'c', { cx: 3000, cz: 2000 })).toBe(corner);
    expect(placeModuleFreely(upper, 'u', { cx: 3000, cz: 151 }).freeModules).toHaveLength(1);
  });

  it('refuses a spot outside the room or on top of another module', () => {
    const kitchen = addModule(withBase(), 'base-2-doors', 'm2', 'back');
    expect(placeModuleFreely(kitchen, 'm1', { cx: -100, cz: 2000 })).toBe(kitchen);
    const first = placeModuleFreely(kitchen, 'm1', { cx: 3000, cz: 2000 });
    expect(placeModuleFreely(first, 'm2', { cx: 3100, cz: 2000 })).toBe(first);
  });
});

describe('free modules in the kitchen', () => {
  const standing = placeModuleFreely(withBase(), 'm1', { cx: 3000, cz: 2000 });

  it('are listed, priced and removable', () => {
    expect(listPlacedModules(standing)).toEqual([{ wall: null, module: standing.freeModules[0].module }]);
    expect(calculateEstimate(standing).lines).toHaveLength(1);
    expect(removeModule(standing, 'm1').freeModules).toEqual([]);
  });

  it('resize inside the room and are found at their center', () => {
    expect(resizeModule(standing, 'm1', 1000).freeModules[0].module.width).toBe(1000);
    expect(locateModuleCenter(standing, 'm1')).toEqual({ cx: 3000, cz: 2000 });
  });

  it('keep the room from shrinking under them', () => {
    expect(resizeRoom(standing, { length: 1500 }).room.length).toBeGreaterThanOrEqual(3400);
  });

  it('rotate by a quarter turn and refuse a turn that does not fit', () => {
    expect(rotateFreeModule(standing, 'm1').freeModules[0].rotation).toBe(90);
    const nearWall = placeModuleFreely(withBase(), 'm1', { cx: 3000, cz: 300 });
    expect(rotateFreeModule(nearWall, 'm1')).toBe(nearWall);
  });
});

describe('modules pressed against the right wall', () => {
  it('follow the wall when the room length changes', () => {
    const pressed = dragModule(withBase(), 'm1', { cx: 5700, cz: 1500 });
    const longer = resizeRoom(pressed, { length: 6500 });
    expect(longer.freeModules[0].cx).toBe(6500 - 280);
  });
});

describe('dragModule', () => {
  it('lets a module off the wall once it is farther than the wall gap', () => {
    const away = dragModule(withBase(), 'm1', { cx: 3000, cz: 280 + WALL_SNAP_GAP_MM + 300 });
    expect(away.freeModules).toHaveLength(1);
    expect(away.freeModules[0].cz).toBeGreaterThan(280 + WALL_SNAP_GAP_MM);
  });

  it('presses a module against the nearest wall exactly where it was dropped', () => {
    const pressed = dragModule(withBase(), 'm1', { cx: 4200, cz: 420 });
    expect(pressed.freeModules[0]).toMatchObject({ cx: 4200, cz: 280, rotation: 0 });
    expect(pressed.runs.back).toEqual([]);
  });

  it('presses a module against a side wall and turns its front into the room', () => {
    const left = dragModule(withBase(), 'm1', { cx: 400, cz: 2500 });
    expect(left.freeModules[0]).toMatchObject({ cx: 280, cz: 2500, rotation: 90 });
    const right = dragModule(withBase(), 'm1', { cx: 5700, cz: 1500 });
    expect(right.freeModules[0]).toMatchObject({ cx: 6000 - 280, cz: 1500, rotation: 270 });
  });

  it('keeps a module inside the room when it is pushed past a corner', () => {
    const pushed = dragModule(withBase(), 'm1', { cx: 9000, cz: 300 });
    expect(pushed.freeModules[0]).toMatchObject({ cx: 6000 - 280, cz: 400, rotation: 270 });
  });

  it('hangs upper modules on the wall at the dropped position and never lets them float', () => {
    const upper = addModule(wideKitchen, 'top-720-1-door', 'u', 'back');
    const moved = dragModule(upper, 'u', { cx: 4000, cz: 700 });
    expect(moved.freeModules).toHaveLength(1);
    expect(moved.freeModules[0].cz).toBe(151);
  });

  it('keeps a corner module in the back wall run', () => {
    const corner = addModule(wideKitchen, 'base-corner-990', 'c', 'back');
    expect(dragModule(corner, 'c', { cx: 3000, cz: 2000 }).freeModules).toEqual([]);
  });

  it('slides along a neighbour instead of stopping at it', () => {
    const base = placeModuleFreely(withBase(), 'm1', { cx: 3000, cz: 2000 });
    const withSecond = addModule(base, 'base-2-doors', 'm2', 'back');
    const standing = placeModuleFreely(withSecond, 'm2', { cx: 1500, cz: 2000 });
    const blocked = dragModule(standing, 'm2', { cx: 2700, cz: 2300 });
    const moved = blocked.freeModules.find((free) => free.module.id === 'm2');
    expect([moved?.cx, moved?.cz]).toEqual([1500, 2300]);
  });

  it('snaps an edge to the edge of a neighbour', () => {
    const base = placeModuleFreely(withBase(), 'm1', { cx: 3000, cz: 2000 });
    const withSecond = addModule(base, 'base-2-doors', 'm2', 'back');
    const standing = placeModuleFreely(withSecond, 'm2', { cx: 1500, cz: 2000 });
    const snapped = dragModule(standing, 'm2', { cx: 3000 - 800 + 30, cz: 2000 });
    const second = snapped.freeModules.find((free) => free.module.id === 'm2');
    expect(second?.cx).toBe(3000 - 800);
  });
});
