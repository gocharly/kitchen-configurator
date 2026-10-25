import { CURRENCY_CODE } from '../domain/currency';

const money = new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: CURRENCY_CODE, maximumFractionDigits: 0 });

export function formatPrice(amount: number): string {
  return money.format(amount);
}
