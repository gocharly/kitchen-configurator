import { describe, expect, it } from 'vitest';
import { OPENING_KINDS, OPENING_SPECS, countOpeningLeaves } from './openings';
import { DEFAULT_KITCHEN, addModule, addOpening, canAddOpening, layoutKitchen, resizeRoom, updateOpening, type Kitchen } from './kitchen';
import { decodeKitchenLink, encodeKitchenLink } from './kitchenLink';

const emptyKitchen: Kitchen = { ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } };
const wideKitchen = resizeRoom(emptyKitchen, { length: 6000, width: 4000 });

describe('opening kinds', () => {
  it('lists every kind from the specs once', () => {
    expect([...OPENING_KINDS].sort()).toEqual(Object.keys(OPENING_SPECS).sort());
  });

  it('keeps default size and sill inside the limits of each kind', () => {
    OPENING_KINDS.forEach((kind) => {
      const spec = OPENING_SPECS[kind];
      [spec.width, spec.height, spec.sill].forEach((range) => {
        expect(range.default).toBeGreaterThanOrEqual(range.min);
        expect(range.default).toBeLessThanOrEqual(range.max);
      });
    });
  });

  it('adds every kind to an empty wall', () => {
    OPENING_KINDS.forEach((kind) => {
      expect(canAddOpening(wideKitchen, kind, 'back')).toBe(true);
      const next = addOpening(wideKitchen, kind, `o-${kind}`, 'back');
      expect(next.openings).toHaveLength(1);
      expect(next.openings[0].kind).toBe(kind);
    });
  });

  it('counts leaves by width and never more than the kind allows', () => {
    expect(countOpeningLeaves({ kind: 'window', width: 700 })).toBe(1);
    expect(countOpeningLeaves({ kind: 'window', width: 1200 })).toBe(2);
    expect(countOpeningLeaves({ kind: 'windowTriple', width: 2400 })).toBe(3);
    expect(countOpeningLeaves({ kind: 'doorDouble', width: 1400 })).toBe(2);
    expect(countOpeningLeaves({ kind: 'doorway', width: 1000 })).toBe(0);
  });

  it('lets a panoramic window start at the floor but not a regular one', () => {
    const panoramic = addOpening(wideKitchen, 'windowPanoramic', 'p', 'back');
    expect(updateOpening(panoramic, 'p', { sill: 0 }).openings[0].sill).toBe(0);
    const regular = addOpening(wideKitchen, 'window', 'w', 'back');
    expect(updateOpening(regular, 'w', { sill: 0 }).openings[0].sill).toBe(OPENING_SPECS.window.sill.min);
  });

  it('moves lower modules around a doorway like around a door', () => {
    const withModules = addModule(addModule(wideKitchen, 'base-1-door', 'a', 'back'), 'base-1-door', 'b', 'back');
    const withDoorway = addOpening(withModules, 'doorway', 'd', 'back');
    const doorway = withDoorway.openings[0];
    layoutKitchen(withDoorway).forEach((item) => {
      const overlapsDoorway = item.offset < doorway.offset + doorway.width && item.offset + item.module.width > doorway.offset;
      expect(overlapsDoorway).toBe(false);
    });
  });

  it('survives the link round trip for every kind', () => {
    const kitchen = OPENING_KINDS.reduce((acc, kind) => addOpening(acc, kind, `o-${kind}`, kind.startsWith('window') ? 'back' : 'left'), wideKitchen);
    const restored = decodeKitchenLink(encodeKitchenLink(kitchen));
    expect(restored?.openings.map((opening) => opening.kind).sort()).toEqual(kitchen.openings.map((opening) => opening.kind).sort());
  });
});
