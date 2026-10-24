import { describe, expect, it } from 'vitest';
import { EMPTY_SHOP_QUERY, buildShopHref, parseShopQuery } from './shopQuery';

describe('parseShopQuery', () => {
  it('reads shape, sort and text', () => {
    expect(parseShopQuery('?shape=corner&sort=price-asc&q=3%2C0')).toEqual({ shape: 'corner', sort: 'price-asc', query: '3,0' });
  });

  it('falls back to defaults for an empty or unknown address', () => {
    expect(parseShopQuery('')).toEqual(EMPTY_SHOP_QUERY);
    expect(parseShopQuery('?shape=round&sort=random')).toEqual(EMPTY_SHOP_QUERY);
  });
});

describe('buildShopHref', () => {
  it('is the plain shop address without filters', () => {
    expect(buildShopHref({})).toBe('/');
    expect(buildShopHref({ shape: null, sort: 'default', query: '   ' })).toBe('/');
  });

  it('keeps only the set filters and encodes the text', () => {
    expect(buildShopHref({ shape: 'u-shape', query: 'кухня 3' })).toBe('/?shape=u-shape&q=%D0%BA%D1%83%D1%85%D0%BD%D1%8F+3');
    expect(buildShopHref({ sort: 'price-desc' })).toBe('/?sort=price-desc');
  });

  it('round trips with parseShopQuery', () => {
    const query = { shape: 'corner' as const, sort: 'price-desc' as const, query: '2,4 × 1,8' };
    expect(parseShopQuery(buildShopHref(query).slice(1))).toEqual(query);
  });
});
