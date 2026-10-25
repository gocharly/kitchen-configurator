import { describe, expect, it } from 'vitest';
import type { Product } from './productCatalog';
import { buildProductMessage, buildWhatsAppLink } from './whatsapp';

const PRODUCT: Product = {
  id: 'straight-2400',
  title: 'Кухня прямая 2,4 м',
  shape: 'straight',
  size: '2400 мм',
  price: 36000,
  sku: 'K-1',
  images: [],
  description: null,
};

describe('buildWhatsAppLink', () => {
  it('uses only the digits of the phone and encodes the text', () => {
    const link = buildWhatsAppLink('+7 (900) 123-45-67', 'Привет & пока\nстрока 2');
    expect(link).toBe('https://wa.me/79001234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82%20%26%20%D0%BF%D0%BE%D0%BA%D0%B0%0A%D1%81%D1%82%D1%80%D0%BE%D0%BA%D0%B0%202');
  });

  it('opens WhatsApp without a recipient while the phone is not set', () => {
    expect(buildWhatsAppLink(null, 'Привет')).toBe('https://wa.me/?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
    expect(buildWhatsAppLink('', 'a')).toBe('https://wa.me/?text=a');
  });

  it('round trips the message through the link', () => {
    const message = buildProductMessage(PRODUCT, 'https://shop.example/kitchen/straight-2400');
    const text = new URL(buildWhatsAppLink('79001234567', message)).searchParams.get('text');
    expect(text).toBe(message);
  });
});

describe('buildProductMessage', () => {
  it('names the kitchen, size, price and the page', () => {
    const lines = buildProductMessage(PRODUCT, 'https://shop.example/kitchen/straight-2400').split('\n');
    expect(lines[1]).toBe('Кухня прямая 2,4 м');
    expect(lines[2]).toBe('Размер: 2400 мм');
    expect(lines[3]).toContain('36');
    expect(lines[3]).toContain('₸');
    expect(lines[4]).toBe('https://shop.example/kitchen/straight-2400');
  });
});
