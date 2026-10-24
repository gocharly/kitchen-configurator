import { formatRubles } from '../ui/formatRubles';
import type { Product } from './productCatalog';

export const GENERAL_MESSAGE = 'Здравствуйте! Хочу подобрать кухню.';

export function buildProductMessage(product: Product, productUrl: string): string {
  return [
    'Здравствуйте! Хочу заказать кухню:',
    product.title,
    `Размер: ${product.size}`,
    `Цена: ${formatRubles(product.price)}`,
    productUrl,
  ].join('\n');
}

export function buildWhatsAppLink(phone: string | null, message: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const base = digits ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(message)}`;
}
