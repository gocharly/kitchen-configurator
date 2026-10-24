import { describe, expect, it } from 'vitest';
import { getModuleSpec } from './catalog';
import { placeModuleFreely } from './dragging';
import { DEFAULT_KITCHEN, addModule, calculateEstimate, fitsInRoom, measureOccupiedLength, resizeRoom, type Kitchen } from './kitchen';
import { measureFreeModuleRect } from './kitchen';
import { addCatalogModule, canAddCatalogModule } from './standing';

const emptyKitchen: Kitchen = { ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } };
const wideKitchen = resizeRoom(emptyKitchen, { length: 5000, width: 4000 });

describe('standing modules', () => {
  it('puts a standing module on the free spot nearest to the room center', () => {
    const next = addCatalogModule(wideKitchen, 'island-drawers', 'island', 'back');
    expect(next.freeModules).toHaveLength(1);
    const rect = measureFreeModuleRect(next.freeModules[0]);
    expect((rect.x0 + rect.x1) / 2).toBeCloseTo(2500, -2);
    expect((rect.z0 + rect.z1) / 2).toBeCloseTo(2000, -2);
    expect(fitsInRoom(next)).toBe(true);
  });

  it('never puts a standing module into a wall row', () => {
    const next = addCatalogModule(wideKitchen, 'sideboard-doors', 'board', 'left');
    expect(next.runs.left).toHaveLength(0);
    expect(next.freeModules).toHaveLength(1);
  });

  it('places the second module beside the first without overlap', () => {
    const first = addCatalogModule(wideKitchen, 'island-doors', 'a', 'back');
    const second = addCatalogModule(first, 'island-doors', 'b', 'back');
    expect(second.freeModules).toHaveLength(2);
    expect(fitsInRoom(second)).toBe(true);
  });

  it('refuses a module that does not fit anywhere in the room', () => {
    const tiny = resizeRoom(emptyKitchen, { length: 1500, width: 1500 });
    expect(canAddCatalogModule(tiny, 'island-deep', 'back')).toBe(false);
    expect(addCatalogModule(tiny, 'island-deep', 'x', 'back')).toBe(tiny);
  });

  it('counts a standing module and its countertop in the estimate', () => {
    const next = addCatalogModule(wideKitchen, 'island-drawers', 'island', 'back');
    const estimate = calculateEstimate(next);
    expect(estimate.lines).toHaveLength(1);
    expect(estimate.lines[0].price).toBe(getModuleSpec('island-drawers').priceFor(1200));
    expect(estimate.countertopPrice).toBeGreaterThan(0);
  });

  it('keeps wall modules working through the same entry point', () => {
    const next = addCatalogModule(wideKitchen, 'base-1-door', 'm', 'back');
    expect(next.runs.back).toHaveLength(1);
    expect(measureOccupiedLength(next)).toBeGreaterThan(0);
  });
});

describe('flat and hanging decor', () => {
  it('lets a rug lie under a table and chairs', () => {
    const withTable = addCatalogModule(wideKitchen, 'table-dining', 'table', 'back');
    const withRug = addCatalogModule(withTable, 'rug-rect', 'rug', 'back');
    expect(withRug.freeModules).toHaveLength(2);
    const rugRect = measureFreeModuleRect(withRug.freeModules[1]);
    const tableRect = measureFreeModuleRect(withRug.freeModules[0]);
    expect(rugRect.x0).toBeLessThan(tableRect.x1);
    expect(rugRect.x1).toBeGreaterThan(tableRect.x0);
    expect(fitsInRoom(withRug)).toBe(true);
  });

  it('hangs a curtain on the back wall', () => {
    const next = addCatalogModule(wideKitchen, 'curtain', 'c', 'back');
    expect(next.freeModules).toHaveLength(1);
    expect(measureFreeModuleRect(next.freeModules[0]).z0).toBe(0);
  });
});

describe('items that stand on the countertop', () => {
  const withBases = addModule(addModule(addModule(wideKitchen, 'base-1-door', 'a', 'back'), 'base-2-doors', 'b', 'back'), 'base-1-door', 'c', 'back');

  it('puts a kettle on the countertop at the counter height against the wall', () => {
    const next = addCatalogModule(withBases, 'kettle', 'kettle', 'back');
    expect(next.freeModules).toHaveLength(1);
    const rect = measureFreeModuleRect(next.freeModules[0]);
    expect(getModuleSpec('kettle').elevation).toBe(854);
    expect(rect.z0).toBeLessThan(40);
    expect(rect.x0).toBeGreaterThanOrEqual(0);
    expect(rect.x1).toBeLessThanOrEqual(1600);
  });

  it('refuses a kettle when there is no countertop', () => {
    expect(canAddCatalogModule(wideKitchen, 'kettle', 'back')).toBe(false);
  });

  it('puts several items side by side without overlap', () => {
    const next = ['toaster', 'kettle', 'coffee-machine'].reduce((acc, id, index) => addCatalogModule(acc, id, `i${index}`, 'back'), withBases);
    expect(next.freeModules).toHaveLength(3);
    expect(fitsInRoom(next)).toBe(true);
  });

  it('does not let an item be dragged off the countertop', () => {
    const withKettle = addCatalogModule(withBases, 'kettle', 'kettle', 'back');
    expect(placeModuleFreely(withKettle, 'kettle', { cx: 3000, cz: 2000 })).toBe(withKettle);
  });

  it('allows a pan on top of a stove', () => {
    const withStove = addModule(wideKitchen, 'appliance-stove', 's', 'back');
    expect(addCatalogModule(withStove, 'pan', 'pan', 'back').freeModules).toHaveLength(1);
  });

  it('does not place anything on a sink', () => {
    const onlySink = addModule(wideKitchen, 'base-sink-2-doors', 'sink', 'back');
    expect(canAddCatalogModule(onlySink, 'kettle', 'back')).toBe(false);
  });
});
