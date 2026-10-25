import type { InlineKeyboardButton, InlineKeyboardMarkup } from 'grammy/types';
import { CURRENCY_CODE } from '../../src/domain/currency';
import type { Order, OrderStatus } from '../orders/types';

const money = new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: CURRENCY_CODE, maximumFractionDigits: 0 });

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'новый',
  awaiting_payment: 'ожидает оплаты',
  paid: 'оплачен',
  canceled: 'отменён',
};

export type OrderAction = 'view' | 'qr' | 'paid' | 'paid_confirm' | 'cancel' | 'cancel_confirm';

const ACTIONS: OrderAction[] = ['view', 'qr', 'paid', 'paid_confirm', 'cancel', 'cancel_confirm'];
const CALLBACK_PATTERN = /^order:(\d+):([a-z_]+)$/;
export const ORDERS_LIST_CALLBACK = 'orders';

export function formatMoney(amount: number): string {
  return money.format(amount);
}

export function buildOrderCallback(orderId: number, action: OrderAction): string {
  return `order:${orderId}:${action}`;
}

export function parseOrderCallback(data: string): { orderId: number; action: OrderAction } | null {
  const match = CALLBACK_PATTERN.exec(data);
  if (!match) return null;
  const action = match[2] as OrderAction;
  return ACTIONS.includes(action) ? { orderId: Number(match[1]), action } : null;
}

export function buildCartUrl(publicUrl: string, order: Order): string {
  return `${publicUrl}/order/${order.token}`;
}

function canUseUrlButton(url: string): boolean {
  return url.startsWith('https://');
}

export function formatOrderCard(order: Order, publicUrl: string): string {
  const lines = [
    `Заказ №${order.id}`,
    `Статус: ${STATUS_LABELS[order.status]}`,
    `Сумма: ${formatMoney(order.total)}`,
    `Позиций: ${order.lines.length}`,
    `Источник: ${order.source === 'site' ? 'сайт' : 'менеджер'}`,
  ];
  if (order.contact) {
    lines.push(`Клиент: ${order.contact.name}, ${order.contact.phone}`);
    if (order.contact.comment) lines.push(`Комментарий: ${order.contact.comment}`);
  }
  const cartUrl = buildCartUrl(publicUrl, order);
  if (!canUseUrlButton(cartUrl)) lines.push(`Корзина клиента: ${cartUrl}`);
  return lines.join('\n');
}

function button(text: string, callbackData: string, style?: InlineKeyboardButton.CallbackButton['style']) {
  return { text, callback_data: callbackData, ...(style ? { style } : {}) };
}

function listButton(): InlineKeyboardButton {
  return button('К списку заказов', ORDERS_LIST_CALLBACK);
}

export function buildOrderKeyboard(order: Order, publicUrl: string): InlineKeyboardMarkup {
  const rows: InlineKeyboardButton[][] = [];
  if (order.status === 'new') rows.push([button('Выставить оплату', buildOrderCallback(order.id, 'qr'), 'primary')]);
  if (order.status === 'awaiting_payment') {
    rows.push([button('Оплачено', buildOrderCallback(order.id, 'paid'), 'success')]);
    rows.push([button('Заменить QR', buildOrderCallback(order.id, 'qr'))]);
  }
  const cartUrl = buildCartUrl(publicUrl, order);
  if (canUseUrlButton(cartUrl)) rows.push([{ text: 'Корзина клиента', url: cartUrl }]);
  if (order.status === 'new' || order.status === 'awaiting_payment') {
    rows.push([button('Отменить заказ', buildOrderCallback(order.id, 'cancel'), 'danger')]);
  }
  rows.push([listButton()]);
  return { inline_keyboard: rows };
}

export function formatConfirmation(order: Order, action: 'paid_confirm' | 'cancel_confirm'): string {
  return action === 'paid_confirm'
    ? `Подтвердить оплату заказа №${order.id} на ${formatMoney(order.total)}?`
    : `Отменить заказ №${order.id}? Это действие нельзя вернуть.`;
}

export function buildConfirmationKeyboard(order: Order, action: 'paid_confirm' | 'cancel_confirm'): InlineKeyboardMarkup {
  const confirm =
    action === 'paid_confirm'
      ? button('Да, оплачен', buildOrderCallback(order.id, 'paid_confirm'), 'success')
      : button('Да, отменить', buildOrderCallback(order.id, 'cancel_confirm'), 'danger');
  return { inline_keyboard: [[confirm], [button('Назад', buildOrderCallback(order.id, 'view'))]] };
}

export function formatOrderList(orders: Order[]): string {
  return orders.length === 0 ? 'Заказов пока нет.' : 'Последние заказы:';
}

export function buildOrderListKeyboard(orders: Order[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: orders.map((order) => [
      button(
        `№${order.id}, ${formatMoney(order.total)}, ${STATUS_LABELS[order.status]}`,
        buildOrderCallback(order.id, 'view'),
      ),
    ]),
  };
}

export const HELP_TEXT = [
  'Заказы с сайта приходят сюда карточкой.',
  'Чтобы создать заказ самому, пришлите ссылку на кухню из конструктора.',
  'Чтобы выставить оплату, откройте заказ и нажмите «Выставить оплату», затем пришлите фото QR.',
  '',
  'Команда /orders показывает последние заказы.',
].join('\n');
