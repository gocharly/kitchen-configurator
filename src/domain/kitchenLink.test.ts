import { describe, expect, it } from 'vitest';
import { placeModuleFreely } from './dragging';
import { DEFAULT_KITCHEN, addModule, listPlacedModules, resizeRoom } from './kitchen';
import { decodeKitchenLink, encodeKitchenLink } from './kitchenLink';
import { KITCHEN_TEMPLATES } from './templates';

function describeKitchen(kitchen: ReturnType<typeof decodeKitchenLink>) {
  if (!kitchen) return null;
  return {
    room: kitchen.room,
    colors: [kitchen.facadeColorId, kitchen.bodyColorId],
    surfaces: [kitchen.floorId, kitchen.wallFinishId],
    modules: listPlacedModules(kitchen).map(({ wall, module }) => [wall, module.specId, module.width, module.cornerSide]),
  };
}

describe('kitchen link', () => {
  it('restores the default kitchen from its own token', () => {
    const restored = decodeKitchenLink(encodeKitchenLink(DEFAULT_KITCHEN));
    expect(describeKitchen(restored)).toEqual(describeKitchen(DEFAULT_KITCHEN));
  });

  it.each(KITCHEN_TEMPLATES)('restores the template $title with colors', (template) => {
    const painted = { ...template.kitchen, facadeColorId: 'graphite', bodyColorId: 'grey' };
    expect(describeKitchen(decodeKitchenLink(encodeKitchenLink(painted)))).toEqual(describeKitchen(painted));
  });

  it('restores free-standing modules with their position and rotation', () => {
    const wide = resizeRoom({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } }, { length: 6000, width: 4000 });
    const standing = placeModuleFreely(addModule(wide, 'base-2-doors', 'a', 'back'), 'a', { cx: 3000, cz: 2000 }, 90);
    const restored = decodeKitchenLink(encodeKitchenLink(standing));
    expect(restored?.freeModules.map((f) => [f.module.specId, f.module.width, f.cx, f.cz, f.rotation])).toEqual([['base-2-doors', 800, 3000, 2000, 90]]);
  });

  it('skips free modules that do not fit the room', () => {
    const token = btoa(JSON.stringify({ r: [3000, 2500, 2700], s: [['base-2-doors', 800, 9000, 9000, 0], ['nope', 800, 1000, 1000, 0]] }));
    expect(decodeKitchenLink(token)?.freeModules).toEqual([]);
  });

  it('restores the floor and the wall finish', () => {
    const decorated = { ...DEFAULT_KITCHEN, floorId: 'herringbone-oak', wallFinishId: 'brick-red' };
    const restored = decodeKitchenLink(encodeKitchenLink(decorated));
    expect([restored?.floorId, restored?.wallFinishId]).toEqual(['herringbone-oak', 'brick-red']);
  });

  it('falls back to the default surfaces for unknown ids', () => {
    const token = btoa(JSON.stringify({ r: [3000, 2500, 2700], fl: 'lava', w: 'gold', m: {} }));
    const restored = decodeKitchenLink(token);
    expect([restored?.floorId, restored?.wallFinishId]).toEqual([DEFAULT_KITCHEN.floorId, DEFAULT_KITCHEN.wallFinishId]);
  });

  it('returns null for text that is not a token', () => {
    expect(decodeKitchenLink('not a token')).toBeNull();
    expect(decodeKitchenLink('')).toBeNull();
    expect(decodeKitchenLink(btoa('[1,2]'))).toBeNull();
  });

  it('skips unknown modules and clamps widths and colors', () => {
    const token = btoa(
      JSON.stringify({
        r: [3000, 2500, 2700],
        f: 'missing',
        b: 'grey',
        m: { back: [['no-such-module', 600], ['base-1-door', 5000], ['base-1-door', 'wide']] },
      }),
    );
    const restored = decodeKitchenLink(token);
    expect(restored?.runs.back.map((m) => [m.specId, m.width])).toEqual([['base-1-door', 600]]);
    expect([restored?.facadeColorId, restored?.bodyColorId]).toEqual([DEFAULT_KITCHEN.facadeColorId, 'grey']);
  });

  it('keeps the room at least as large as the modules', () => {
    const token = btoa(JSON.stringify({ r: [1500, 1500, 2300], f: 'white', b: 'white', m: { back: [['base-2-doors', 1200], ['base-2-doors', 1200]] } }));
    expect(decodeKitchenLink(token)?.room.length).toBeGreaterThanOrEqual(2000);
  });
});

describe('kitchen link openings', () => {
  const withOpenings = {
    ...DEFAULT_KITCHEN,
    openings: [
      { id: 'w', kind: 'window' as const, wall: 'left' as const, offset: 800, width: 1000, height: 1200, sill: 950 },
      { id: 'd', kind: 'door' as const, wall: 'right' as const, offset: 400, width: 900, height: 2050, sill: 0 },
    ],
  };

  it('restores windows and doors', () => {
    const restored = decodeKitchenLink(encodeKitchenLink(withOpenings));
    expect(restored?.openings.map(({ kind, wall, offset, width, height, sill }) => [kind, wall, offset, width, height, sill])).toEqual([
      ['window', 'left', 800, 1000, 1200, 950],
      ['door', 'right', 400, 900, 2050, 0],
    ]);
  });

  it('skips unknown openings and clamps sizes', () => {
    const token = btoa(
      JSON.stringify({
        r: [3600, 3000, 2700],
        f: 'white',
        b: 'white',
        m: {},
        o: [['gate', 'back', 0, 900, 2000, 0], ['window', 'ceiling', 0, 900, 900, 900], ['window', 'back', 500, 99999, 99999, 900]],
      }),
    );
    const restored = decodeKitchenLink(token);
    expect(restored?.openings.map((o) => [o.width, o.height])).toEqual([[2400, 1800]]);
  });
});
