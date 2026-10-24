import type { UserFromGetMe } from 'grammy/types';
import { describe, expect, it } from 'vitest';
import { DEFAULT_KITCHEN } from '../../src/domain/kitchen';
import { encodeKitchenLink } from '../../src/domain/kitchenLink';
import { OrderService } from '../orders/orderService';
import { SqliteOrderStore } from '../orders/sqliteOrderStore';
import type { OrderNotifier } from '../orders/types';
import { createOrderBot } from './createBot';

const ADMIN_ID = 111;
const OTHER_ADMIN_ID = 222;
const STRANGER_ID = 999;
const KITCHEN_TOKEN = encodeKitchenLink(DEFAULT_KITCHEN);
const SITE_CONTACT = { name: 'Иван', phone: '+7 900 123-45-67', comment: 'Позвонить' };
const BOT_INFO = { id: 1, is_bot: true, first_name: 'Kitchen', username: 'kitchen_bot' } as UserFromGetMe;

interface Call {
  method: string;
  payload: Record<string, any>;
}

function setup(publicUrl = 'http://localhost:5180') {
  const store = new SqliteOrderStore(':memory:');
  const holder: { notifier?: OrderNotifier } = {};
  const service = new OrderService({
    store,
    notifier: { notifyOrderCreated: (order) => holder.notifier?.notifyOrderCreated(order) ?? Promise.resolve() },
  });
  const downloads: string[] = [];
  const { bot, notifier } = createOrderBot({
    token: '123:test',
    adminIds: [ADMIN_ID, OTHER_ADMIN_ID],
    service,
    publicUrl,
    botInfo: BOT_INFO,
    downloadFile: async (path) => {
      downloads.push(path);
      return new Uint8Array([255, 216, 255, 1, 2, 3]);
    },
  });
  holder.notifier = notifier;
  const calls: Call[] = [];
  bot.api.config.use(async (_previous, method, payload) => {
    calls.push({ method, payload: payload as Record<string, any> });
    const base = { message_id: calls.length, date: 0, chat: { id: (payload as any).chat_id ?? ADMIN_ID, type: 'private' } };
    if (method === 'getFile') return { ok: true, result: { file_id: 'f', file_unique_id: 'u', file_path: 'photos/qr.jpg' } } as any;
    if (method === 'answerCallbackQuery') return { ok: true, result: true } as any;
    return { ok: true, result: { ...base, text: (payload as any).text } } as any;
  });
  let updateId = 0;
  const from = (id: number) => ({ id, is_bot: false, first_name: 'Менеджер' });
  const chat = (id: number) => ({ id, type: 'private' as const });
  const sendText = (id: number, text: string) => {
    const commandLength = text.startsWith('/') ? text.split(' ')[0].length : 0;
    const entities = commandLength > 0 ? [{ type: 'bot_command', offset: 0, length: commandLength }] : undefined;
    return bot.handleUpdate({
      update_id: (updateId += 1),
      message: { message_id: 1, date: 0, chat: chat(id), from: from(id), text, entities },
    } as any);
  };
  const sendPhoto = (id: number, caption?: string) =>
    bot.handleUpdate({
      update_id: (updateId += 1),
      message: {
        message_id: 2,
        date: 0,
        chat: chat(id),
        from: from(id),
        caption,
        photo: [
          { file_id: 'small', file_unique_id: 's', width: 10, height: 10 },
          { file_id: 'large', file_unique_id: 'l', width: 100, height: 100 },
        ],
      },
    } as any);
  const press = (id: number, data: string) =>
    bot.handleUpdate({
      update_id: (updateId += 1),
      callback_query: {
        id: `cb${updateId}`,
        from: from(id),
        chat_instance: 'x',
        data,
        message: { message_id: 7, date: 0, chat: chat(id), text: 'card' },
      },
    } as any);
  const callsOf = (method: string) => calls.filter((call) => call.method === method);
  const buttons = (call: Call): any[] => (call.payload.reply_markup?.inline_keyboard ?? []).flat();
  const findButton = (call: Call, text: string) => buttons(call).find((b) => b.text === text);
  return { service, calls, callsOf, buttons, findButton, sendText, sendPhoto, press, downloads };
}

async function createSiteOrder(service: OrderService) {
  return service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'site', contact: SITE_CONTACT });
}

describe('access', () => {
  it('refuses a stranger and does not touch orders', async () => {
    const { sendText, callsOf, service } = setup();
    await sendText(STRANGER_ID, `https://shop/#k=${KITCHEN_TOKEN}`);
    expect(callsOf('sendMessage')).toHaveLength(1);
    expect(callsOf('sendMessage')[0].payload.text).toBe('Бот доступен только менеджерам.');
    expect(service.listRecentOrders(5)).toEqual([]);
  });
});

describe('new order notification', () => {
  it('sends the card to every admin with a primary action and the cart link', async () => {
    const { service, callsOf, findButton } = setup();
    const order = await createSiteOrder(service);
    const sent = callsOf('sendMessage');
    expect(sent.map((c) => c.payload.chat_id)).toEqual([ADMIN_ID, OTHER_ADMIN_ID]);
    expect(sent[0].payload.text).toContain('Заказ №1');
    expect(sent[0].payload.text).toContain('Клиент: Иван, +7 900 123-45-67');
    expect(sent[0].payload.text).toContain(`http://localhost:5180/order/${order.token}`);
    expect(findButton(sent[0], 'Выставить оплату')).toMatchObject({ style: 'primary' });
    expect(findButton(sent[0], 'Отменить заказ')).toMatchObject({ style: 'danger' });
  });

  it('uses a url button instead of text for an https cart link', async () => {
    const { service, callsOf, findButton } = setup('https://shop.example');
    const order = await createSiteOrder(service);
    const card = callsOf('sendMessage')[0];
    expect(findButton(card, 'Корзина клиента')).toMatchObject({ url: `https://shop.example/order/${order.token}` });
    expect(card.payload.text).not.toContain('https://');
  });
});

describe('manager creates an order from a link', () => {
  it('creates a bot order and answers with the card', async () => {
    const { sendText, service, callsOf } = setup();
    await sendText(ADMIN_ID, `Вот кухня https://shop.example/#k=${KITCHEN_TOKEN} посмотри`);
    const orders = service.listRecentOrders(5);
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ source: 'bot', contact: null });
    expect(callsOf('sendMessage')[0].payload.text).toContain('Источник: менеджер');
  });

  it('explains how to use the bot when there is no link, and rejects a broken link', async () => {
    const { sendText, callsOf, service } = setup();
    await sendText(ADMIN_ID, 'привет');
    expect(callsOf('sendMessage')[0].payload.text).toContain('пришлите ссылку на кухню');
    await sendText(ADMIN_ID, 'https://shop/#k=abcdefghijkl');
    expect(callsOf('sendMessage')[1].payload.text).toContain('Не удалось прочитать ссылку');
    expect(service.listRecentOrders(5)).toEqual([]);
  });
});

describe('QR and payment flow', () => {
  it('asks for a photo, stores the QR and shows the awaiting payment card', async () => {
    const { service, press, sendPhoto, callsOf, findButton, downloads } = setup();
    const order = await createSiteOrder(service);
    await press(ADMIN_ID, `order:${order.id}:qr`);
    expect(callsOf('sendMessage').at(-1)?.payload.text).toContain('Пришлите фото QR для заказа №1');
    await sendPhoto(ADMIN_ID);
    expect(downloads).toEqual(['photos/qr.jpg']);
    expect(callsOf('getFile')[0].payload.file_id).toBe('large');
    const updated = service.getOrderById(order.id);
    expect(updated).toMatchObject({ status: 'awaiting_payment', hasQr: true });
    expect(service.readQr(order.id)?.mime).toBe('image/jpeg');
    const card = callsOf('sendMessage').at(-1)!;
    expect(card.payload.text).toContain('Статус: ожидает оплаты');
    expect(findButton(card, 'Оплачено')).toMatchObject({ style: 'success' });
    expect(findButton(card, 'Заменить QR')).toBeDefined();
  });

  it('takes the order number from the photo caption', async () => {
    const { service, sendPhoto } = setup();
    const order = await createSiteOrder(service);
    await sendPhoto(ADMIN_ID, `№${order.id}`);
    expect(service.getOrderById(order.id).status).toBe('awaiting_payment');
  });

  it('asks to choose an order when a photo arrives without one', async () => {
    const { service, sendPhoto, callsOf } = setup();
    await createSiteOrder(service);
    await sendPhoto(ADMIN_ID);
    expect(callsOf('sendMessage').at(-1)?.payload.text).toContain('Сначала откройте заказ');
  });

  it('asks twice before marking an order as paid', async () => {
    const { service, press, sendPhoto, callsOf, findButton } = setup();
    const order = await createSiteOrder(service);
    await sendPhoto(ADMIN_ID, String(order.id));
    await press(ADMIN_ID, `order:${order.id}:paid`);
    const confirmation = callsOf('editMessageText').at(-1)!;
    expect(confirmation.payload.text).toContain('Подтвердить оплату заказа №1');
    expect(findButton(confirmation, 'Да, оплачен')).toMatchObject({ style: 'success' });
    expect(service.getOrderById(order.id).status).toBe('awaiting_payment');
    await press(ADMIN_ID, `order:${order.id}:paid_confirm`);
    expect(service.getOrderById(order.id).status).toBe('paid');
    const card = callsOf('editMessageText').at(-1)!;
    expect(card.payload.text).toContain('Статус: оплачен');
    expect(findButton(card, 'Оплачено')).toBeUndefined();
    expect(findButton(card, 'Отменить заказ')).toBeUndefined();
  });

  it('does not accept payment for an order without QR', async () => {
    const { service, press, callsOf } = setup();
    const order = await createSiteOrder(service);
    await press(ADMIN_ID, `order:${order.id}:paid_confirm`);
    expect(service.getOrderById(order.id).status).toBe('new');
    expect(callsOf('sendMessage').at(-1)?.payload.text).toBe('Это действие сейчас недоступно для заказа.');
  });

  it('cancels only after confirmation', async () => {
    const { service, press, callsOf, findButton } = setup();
    const order = await createSiteOrder(service);
    await press(ADMIN_ID, `order:${order.id}:cancel`);
    const confirmation = callsOf('editMessageText').at(-1)!;
    expect(confirmation.payload.text).toContain('Отменить заказ №1?');
    expect(findButton(confirmation, 'Да, отменить')).toMatchObject({ style: 'danger' });
    expect(findButton(confirmation, 'Назад')?.style).toBeUndefined();
    expect(service.getOrderById(order.id).status).toBe('new');
    await press(ADMIN_ID, `order:${order.id}:cancel_confirm`);
    expect(service.getOrderById(order.id).status).toBe('canceled');
  });
});

describe('order list', () => {
  it('lists recent orders and opens a card from the list', async () => {
    const { service, sendText, press, callsOf, buttons } = setup();
    await createSiteOrder(service);
    await createSiteOrder(service);
    await sendText(ADMIN_ID, '/orders');
    const list = callsOf('sendMessage').at(-1)!;
    expect(list.payload.text).toBe('Последние заказы:');
    expect(buttons(list).map((b) => b.text.split(',')[0])).toEqual(['№2', '№1']);
    await press(ADMIN_ID, buttons(list)[1].callback_data);
    expect(callsOf('editMessageText').at(-1)?.payload.text).toContain('Заказ №1');
  });

  it('ignores callbacks it does not know', async () => {
    const { press, callsOf } = setup();
    await press(ADMIN_ID, 'garbage');
    expect(callsOf('editMessageText')).toHaveLength(0);
  });
});
