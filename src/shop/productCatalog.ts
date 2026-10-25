import { CURRENCY_CODE, rublesToTenge } from '../domain/currency';
import productsFile from './products.json';

export type KitchenShape = 'straight' | 'corner' | 'u-shape';

export interface ProductImage {
  src: string;
  position: string;
}

export interface Product {
  id: string;
  title: string;
  shape: KitchenShape;
  size: string;
  price: number;
  sku: string;
  images: ProductImage[];
  description: string | null;
}

export interface ProductCatalog {
  currency: string;
  products: Product[];
}

export const PRODUCT_SCHEMA = 'kitchen-shop/products@0.1';

export const SHAPE_TITLES: Record<KitchenShape, string> = {
  straight: 'Прямые',
  corner: 'Угловые',
  'u-shape': 'П-образные',
};

export const SHAPES = Object.keys(SHAPE_TITLES) as KitchenShape[];

export class ProductCatalogError extends Error {
  constructor(path: string, message: string) {
    super(`Product catalog ${path}: ${message}`);
    this.name = 'ProductCatalogError';
  }
}

function readText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new ProductCatalogError(path, 'must be a non-empty string');
  return value;
}

function readImages(value: unknown, path: string): ProductImage[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ProductCatalogError(path, 'must be a list');
  return value.map((entry, index) => {
    const image = typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {};
    const position = image.position === undefined ? '50% 50%' : image.position;
    if (typeof position !== 'string') throw new ProductCatalogError(`${path}[${index}].position`, 'must be text');
    return { src: readText(image.src, `${path}[${index}].src`), position };
  });
}

function readProduct(value: unknown, index: number): Product {
  const path = `products[${index}]`;
  if (typeof value !== 'object' || value === null) throw new ProductCatalogError(path, 'must be an object');
  const entry = value as Record<string, unknown>;
  const id = readText(entry.id, `${path}.id`);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new ProductCatalogError(`${path}.id`, 'may contain letters, digits, - and _');
  const shape = entry.shape;
  if (typeof shape !== 'string' || !SHAPES.includes(shape as KitchenShape)) {
    throw new ProductCatalogError(`${path}(${id}).shape`, `must be one of ${SHAPES.join(', ')}`);
  }
  const price = entry.price;
  if (typeof price !== 'number' || !Number.isInteger(price) || price <= 0) {
    throw new ProductCatalogError(`${path}(${id}).price`, 'must be a positive whole number');
  }
  const description = entry.description === undefined ? null : entry.description;
  if (description !== null && (typeof description !== 'string' || description.trim() === '')) {
    throw new ProductCatalogError(`${path}(${id}).description`, 'must be text or null');
  }
  return {
    id,
    title: readText(entry.title, `${path}(${id}).title`),
    shape: shape as KitchenShape,
    size: readText(entry.size, `${path}(${id}).size`),
    price: rublesToTenge(price),
    sku: readText(entry.sku, `${path}(${id}).sku`),
    images: readImages(entry.images, `${path}(${id}).images`),
    description,
  };
}

export function parseProductCatalog(raw: unknown): ProductCatalog {
  if (typeof raw !== 'object' || raw === null) throw new ProductCatalogError('file', 'must be an object');
  const root = raw as Record<string, unknown>;
  if (root.schema !== PRODUCT_SCHEMA) throw new ProductCatalogError('schema', `must be "${PRODUCT_SCHEMA}"`);
  if (!Array.isArray(root.products) || root.products.length === 0) {
    throw new ProductCatalogError('products', 'must be a non-empty array');
  }
  const products = root.products.map(readProduct);
  const seen = new Set<string>();
  products.forEach((product) => {
    if (seen.has(product.id)) throw new ProductCatalogError('products', `id "${product.id}" is used twice`);
    seen.add(product.id);
  });
  readText(root.currency, 'currency');
  return { currency: CURRENCY_CODE, products };
}

const catalog = parseProductCatalog(productsFile);

export const PRODUCTS = catalog.products;

export function findProduct(productId: string): Product | null {
  return PRODUCTS.find((product) => product.id === productId) ?? null;
}
