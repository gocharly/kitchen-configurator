import { SHAPES, type KitchenShape } from './productCatalog';
import { SORT_OPTIONS, type SortOrder } from './shopFilters';

export interface ShopQuery {
  shape: KitchenShape | null;
  sort: SortOrder;
  query: string;
}

export const EMPTY_SHOP_QUERY: ShopQuery = { shape: null, sort: 'default', query: '' };

export function parseShopQuery(search: string): ShopQuery {
  const params = new URLSearchParams(search);
  const shape = params.get('shape');
  const sort = params.get('sort');
  return {
    shape: SHAPES.find((candidate) => candidate === shape) ?? null,
    sort: SORT_OPTIONS.find((option) => option.id === sort)?.id ?? 'default',
    query: params.get('q') ?? '',
  };
}

export function buildShopHref(query: Partial<ShopQuery>): string {
  const merged = { ...EMPTY_SHOP_QUERY, ...query };
  const params = new URLSearchParams();
  if (merged.shape) params.set('shape', merged.shape);
  if (merged.sort !== 'default') params.set('sort', merged.sort);
  if (merged.query.trim() !== '') params.set('q', merged.query);
  const text = params.toString();
  return text ? `/?${text}` : '/';
}
