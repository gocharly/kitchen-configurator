import type { KitchenShape, Product } from './productCatalog';

export type SortOrder = 'default' | 'price-asc' | 'price-desc';

export interface ProductFilter {
  shape: KitchenShape | null;
  query: string;
}

export const SORT_OPTIONS: { id: SortOrder; title: string }[] = [
  { id: 'default', title: 'По умолчанию' },
  { id: 'price-asc', title: 'Сначала дешёвые' },
  { id: 'price-desc', title: 'Сначала дорогие' },
];

export function filterProducts(products: Product[], filter: ProductFilter): Product[] {
  const query = filter.query.trim().toLowerCase();
  return products.filter((product) => {
    if (filter.shape && product.shape !== filter.shape) return false;
    return query === '' || product.title.toLowerCase().includes(query) || product.size.toLowerCase().includes(query);
  });
}

export function sortProducts(products: Product[], order: SortOrder): Product[] {
  if (order === 'default') return products;
  const direction = order === 'price-asc' ? 1 : -1;
  return [...products].sort((a, b) => direction * (a.price - b.price));
}

export function countByShape(products: Product[], shape: KitchenShape | null): number {
  return shape ? products.filter((product) => product.shape === shape).length : products.length;
}
