import { describe, expect, it } from 'vitest';
import type { Product } from './productCatalog';
import { countByShape, filterProducts, sortProducts } from './shopFilters';

const make = (id: string, shape: Product['shape'], price: number, title = id): Product => ({
  id,
  title,
  shape,
  size: '2400 мм',
  price,
  sku: id,
  images: [],
  description: null,
});

const PRODUCTS = [make('a', 'straight', 300, 'Кухня прямая'), make('b', 'corner', 100, 'Кухня угловая'), make('c', 'straight', 200)];

describe('filterProducts', () => {
  it('keeps everything without a filter', () => {
    expect(filterProducts(PRODUCTS, { shape: null, query: '' })).toHaveLength(3);
  });

  it('filters by shape and by text in title or size, ignoring case and spaces', () => {
    expect(filterProducts(PRODUCTS, { shape: 'straight', query: '' }).map((p) => p.id)).toEqual(['a', 'c']);
    expect(filterProducts(PRODUCTS, { shape: null, query: '  УГЛОВАЯ ' }).map((p) => p.id)).toEqual(['b']);
    expect(filterProducts(PRODUCTS, { shape: null, query: '2400' })).toHaveLength(3);
    expect(filterProducts(PRODUCTS, { shape: 'corner', query: 'прямая' })).toEqual([]);
  });
});

describe('sortProducts', () => {
  it('keeps the catalog order by default and does not change the input', () => {
    expect(sortProducts(PRODUCTS, 'default')).toBe(PRODUCTS);
    sortProducts(PRODUCTS, 'price-asc');
    expect(PRODUCTS.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts by price in both directions', () => {
    expect(sortProducts(PRODUCTS, 'price-asc').map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(sortProducts(PRODUCTS, 'price-desc').map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('countByShape', () => {
  it('counts all or one shape', () => {
    expect(countByShape(PRODUCTS, null)).toBe(3);
    expect(countByShape(PRODUCTS, 'straight')).toBe(2);
    expect(countByShape(PRODUCTS, 'u-shape')).toBe(0);
  });
});
