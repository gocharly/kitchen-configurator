import { rublesToTenge } from './currency';
import { describe, expect, it } from 'vitest';
import catalogFile from '../catalog/ru-starter.json';
import { CatalogError, compileExpression, parseCatalog } from './catalogFormat';

function cloneCatalog(): any {
  return structuredClone(catalogFile);
}

function expectCatalogError(mutate: (catalog: any) => void, fragment: string): void {
  const catalog = cloneCatalog();
  mutate(catalog);
  expect(() => parseCatalog(catalog)).toThrowError(CatalogError);
  expect(() => parseCatalog(catalog)).toThrowError(fragment);
}

describe('compileExpression', () => {
  const evaluate = (source: string, width = 600) => compileExpression(source, ['width'], 'test')({ width });

  it('follows operator precedence, parentheses and unary minus', () => {
    expect(evaluate('120 + width * 0.18')).toBeCloseTo(228);
    expect(evaluate('(1 + 2) * 3')).toBe(9);
    expect(evaluate('10 - 2 - 3')).toBe(5);
    expect(evaluate('-width + 1000')).toBe(400);
    expect(evaluate('width / 4 * 2')).toBe(300);
  });

  it('refuses names, calls and operators outside the grammar', () => {
    expect(() => evaluate('height * 2')).toThrowError('unknown name "height"');
    expect(() => evaluate('process.exit(1)')).toThrowError(CatalogError);
    expect(() => evaluate('width ** 2')).toThrowError(CatalogError);
    expect(() => evaluate('width +')).toThrowError('unexpected end');
    expect(() => evaluate('(width')).toThrowError('missing ")"');
  });
});

describe('parseCatalog on the shipped catalog', () => {
  const catalog = parseCatalog(catalogFile);

  it('reads every family, category and finish', () => {
    catalog.categories.forEach((category) => {
      expect(catalog.specs.some((spec) => spec.category === category.id)).toBe(true);
    });
    expect(catalog.version).toBe('2026.10.1');
    expect(catalog.facadeColors.map((c) => c.id)).toContain('graphite');
  });

  it('builds skus from the template', () => {
    const spec = catalog.specs.find((s) => s.id === 'base-1-door');
    expect(spec?.sku(450)).toBe('BASE-1-DOOR-450');
  });

  it('prices by the expression and converts to tenge', () => {
    const spec = catalog.specs.find((s) => s.id === 'base-1-door');
    expect(spec?.priceFor(600)).toBe(rublesToTenge(5400));
    expect(catalog.countertop.priceFor(1000)).toBe(rublesToTenge(6000));
    expect(catalog.countertop.priceFor(0)).toBe(0);
  });

  it('gives appliances a builder name and a countertop only to the sink and under-counter units', () => {
    const appliances = catalog.specs.filter((s) => s.category === 'appliances');
    expect(appliances.filter((s) => s.model !== undefined).map((s) => s.model)).toEqual(
      expect.arrayContaining(['kitchenStove', 'kitchenFridge', 'hoodLarge', 'washer']),
    );
    expect(appliances.filter((s) => s.hasCountertop).map((s) => s.id)).toEqual(
      expect.arrayContaining(['appliance-sink', 'appliance-fridge-small', 'appliance-washer']),
    );
  });

  it('gives every wall-run unit under a countertop the same depth and top, so neighbours meet flush', () => {
    const underCountertop = catalog.specs.filter((spec) => spec.hasCountertop && spec.type !== 'standing' && spec.type !== 'specialty');
    const edges = new Set(underCountertop.map((spec) => `${spec.depth}x${spec.elevation + spec.height}`));
    expect([...edges]).toEqual(['560x816']);
  });

  it('leaves a 20 to 50 mm gap on each side of freestanding fridges and a smaller one for under-counter units', () => {
    const gapOf = (id: string) => catalog.specs.find((spec) => spec.id === id)?.clearance;
    ['appliance-fridge', 'appliance-fridge-large', 'appliance-fridge-tall', 'appliance-freezer'].forEach((id) => {
      expect(gapOf(id)).toBeGreaterThanOrEqual(20);
      expect(gapOf(id)).toBeLessThanOrEqual(50);
    });
    ['appliance-washer', 'appliance-dishwasher-free', 'appliance-wine-cooler', 'appliance-fridge-small'].forEach((id) => {
      expect(gapOf(id)).toBeGreaterThan(0);
      expect(gapOf(id)).toBeLessThan(20);
    });
    catalog.specs.forEach((spec) => expect(2 * spec.clearance).toBeLessThan(spec.minWidth));
  });

  it('reads floors and wall finishes with a size and roughness', () => {
    expect(catalog.floors.map((f) => f.kind)).toContain('herringbone');
    expect(catalog.wallFinishes.map((w) => w.kind)).toEqual(expect.arrayContaining(['paint', 'stripes', 'brick']));
    expect(catalog.floors.find((f) => f.id === 'tile-light')?.sizeMm).toEqual([600, 600]);
    expect(catalog.wallFinishes.find((w) => w.id === 'paint-white')?.roughness).toBeGreaterThan(0.5);
  });

  it('marks wood facades with the wood finish and leaves painted ones plain', () => {
    const woods = catalog.facadeColors.filter((c) => c.finish === 'wood').map((c) => c.id);
    expect(woods).toEqual(['oak', 'walnut', 'ash']);
    expect(catalog.facadeColors.find((c) => c.id === 'white')?.finish).toBeUndefined();
  });

  it('keeps every corner module at one fixed width', () => {
    catalog.specs.filter((s) => s.isCorner).forEach((s) => expect(s.minWidth).toBe(s.maxWidth));
  });
});

describe('parseCatalog validation', () => {
  it('refuses an unknown color finish', () => {
    expectCatalogError((c) => (c.finishes.facade[0].finish = 'marble'), 'finishes.facade[0].finish');
  });

  it('refuses a floor of a wall-only kind', () => {
    expectCatalogError((c) => (c.finishes.floor[0].kind = 'stripes'), 'finishes.floor[0].kind');
  });

  it('refuses a malformed surface color', () => {
    expectCatalogError((c) => (c.finishes.wall[0].color = 'white'), 'finishes.wall[0]');
  });

  it('refuses an empty model name', () => {
    expectCatalogError((c) => (c.families[0].model = ' '), 'families[0](base-1-door).model');
  });

  it('refuses another schema', () => {
    expectCatalogError((c) => (c.schema = 'other@1'), 'schema');
  });

  it('names the broken family and field', () => {
    expectCatalogError((c) => (c.families[0].widths.min = 'wide'), 'families[0](base-1-door).widths.min');
  });

  it('refuses widths that do not fit the step', () => {
    expectCatalogError((c) => (c.families[0].widths.step = 70), 'divisible by step');
  });

  it('refuses a default width outside the range', () => {
    expectCatalogError((c) => (c.families[0].defaultWidth = 1000), 'defaultWidth');
  });

  it('refuses duplicate family ids and unknown categories', () => {
    expectCatalogError((c) => (c.families[1].id = c.families[0].id), 'used twice');
    expectCatalogError((c) => (c.families[0].category = 'nowhere'), 'unknown category');
  });

  it('refuses front ratios that do not add up', () => {
    expectCatalogError((c) => (c.families[0].fronts = [{ kind: 'doors', ratio: 0.4 }]), 'ratios must add up to 1');
  });

  it('refuses a sku without the width placeholder', () => {
    expectCatalogError((c) => (c.families[0].sku = 'FIXED'), '{width}');
  });

  it('refuses prices that go negative or use unknown names', () => {
    expectCatalogError((c) => (c.families[0].price = 'width - 100000'), 'finite number not below 0');
    expectCatalogError((c) => (c.families[0].price = 'cost * 2'), 'unknown name "cost"');
  });

  it('refuses a corner module with a range of widths', () => {
    const corner = (c: any) => c.families.find((f: any) => f.corner);
    expectCatalogError((c) => (corner(c).widths.max = corner(c).widths.max + 100), 'one fixed width');
  });

  it('refuses a color that is not a hex code', () => {
    expectCatalogError((c) => (c.finishes.facade[0].hex = 'white'), '#aabbcc');
  });
});

describe('sink families', () => {
  const catalog = parseCatalog(catalogFile);

  it('reads bowls and faucet with defaults of one bowl and an arc faucet', () => {
    const find = (id: string) => catalog.specs.find((spec) => spec.id === id);
    expect(find('base-sink-2-doors')).toMatchObject({ bowls: 1, faucet: 'arc' });
    expect(find('base-sink-double')).toMatchObject({ bowls: 2, faucet: 'pullout' });
    expect(find('base-sink-pullout')).toMatchObject({ bowls: 1, faucet: 'pullout' });
  });
});
