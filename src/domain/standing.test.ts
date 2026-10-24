import { describe, expect, it } from 'vitest';
import { getModuleSpec } from './catalog';
import { DEFAULT_KITCHEN, calculateEstimate, fitsInRoom, measureOccupiedLength, resizeRoom, type Kitchen } from './kitchen';
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
