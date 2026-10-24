import { describe, expect, it } from 'vitest';
import { DEFAULT_KITCHEN, addModule, canAddModule, resizeRoom, type Kitchen } from './kitchen';

const emptyKitchen: Kitchen = { ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } };
const wideKitchen = resizeRoom(emptyKitchen, { length: 6000, width: 3000 });

function addAll(kitchen: Kitchen, specIds: string[]): Kitchen {
  return specIds.reduce((acc, specId, index) => addModule(acc, specId, `m${index}`, 'back'), kitchen);
}

describe('placement rules', () => {
  it('does not put a regular wall cabinet over a hob', () => {
    const withUpper = addAll(wideKitchen, ['top-720-2-doors']);
    expect(canAddModule(withUpper, 'appliance-stove', 'back')).toBe(false);
    const withHob = addAll(wideKitchen, ['appliance-stove']);
    expect(canAddModule(withHob, 'top-720-2-doors', 'back')).toBe(false);
  });

  it('lets a hood hang over a hob', () => {
    const withHob = addAll(wideKitchen, ['appliance-hob-induction']);
    expect(canAddModule(withHob, 'appliance-hood-slanted', 'back')).toBe(true);
  });

  it('keeps a fridge at least 300 mm from a hob along the row', () => {
    const kitchen = addAll(wideKitchen, ['appliance-fridge-tall', 'appliance-stove']);
    expect(kitchen.runs.back).toHaveLength(1);
    const spaced = addAll(wideKitchen, ['appliance-fridge-tall', 'base-1-door', 'base-1-door', 'appliance-stove']);
    expect(spaced.runs.back).toHaveLength(4);
  });

  it('does not limit a hob next to ordinary base cabinets', () => {
    const kitchen = addAll(wideKitchen, ['base-1-door', 'appliance-stove', 'base-1-door']);
    expect(kitchen.runs.back).toHaveLength(3);
  });
});
