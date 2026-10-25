import { rublesToTenge } from '../domain/currency';
import { describe, expect, it } from 'vitest';
import productsFile from './products.json';
import { PRODUCTS, ProductCatalogError, findProduct, parseProductCatalog } from './productCatalog';

function clone(): any {
  return structuredClone(productsFile);
}

function expectError(mutate: (file: any) => void, fragment: string): void {
  const file = clone();
  mutate(file);
  expect(() => parseProductCatalog(file)).toThrowError(ProductCatalogError);
  expect(() => parseProductCatalog(file)).toThrowError(fragment);
}

describe('product catalog', () => {
  it('reads the shipped products', () => {
    expect(PRODUCTS).toHaveLength(7);
    expect(findProduct('straight-2400')).toMatchObject({ title: 'Кухня прямая 2,4 м', price: rublesToTenge(36000), description: null })
    expect(findProduct('straight-2400')?.images).toHaveLength(3);
    expect(findProduct('nope')).toBeNull();
  });

  it('refuses another schema, an empty list and duplicate ids', () => {
    expectError((f) => (f.schema = 'x'), 'schema');
    expectError((f) => (f.products = []), 'non-empty array');
    expectError((f) => (f.products[1].id = f.products[0].id), 'used twice');
  });

  it('names the broken product and field', () => {
    expectError((f) => (f.products[0].price = 12.5), 'products[0](straight-1600).price');
    expectError((f) => (f.products[0].shape = 'round'), 'shape');
    expectError((f) => (f.products[0].images = 'x'), 'must be a list');
    expectError((f) => (f.products[0].images = [{ position: '0 0' }]), 'images[0].src');
    expectError((f) => (f.products[0].description = 5), 'text or null');
    expectError((f) => (f.products[0].id = 'a b'), 'letters, digits');
  });
});
