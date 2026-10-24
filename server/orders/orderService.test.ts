import { describe, expect, it } from 'vitest';
import { DEFAULT_KITCHEN } from '../../src/domain/kitchen';
import { encodeKitchenLink } from '../../src/domain/kitchenLink';
import { OrderError, OrderService } from './orderService';
import { SqliteOrderStore } from './sqliteOrderStore';
import type { Order, OrderNotifier } from './types';

const KITCHEN_TOKEN = encodeKitchenLink(DEFAULT_KITCHEN);
const CONTACT = { name: 'Иван', phone: '+7 900 123-45-67', comment: 'Позвонить после 18' };
const PNG_QR = { mime: 'image/png', bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3]) };

function createService(options: { notifier?: OrderNotifier } = {}) {
  const store = new SqliteOrderStore(':memory:');
  let counter = 0;
  const service = new OrderService({
    store,
    notifier: options.notifier,
    now: () => new Date('2026-10-19T10:00:00.000Z'),
    createToken: () => `token-${(counter += 1)}`,
  });
  return { service, store };
}

async function expectOrderError(action: () => unknown, code: OrderError['code']): Promise<void> {
  await expect(Promise.resolve().then(action)).rejects.toMatchObject({ name: 'OrderError', code });
}

describe('createOrder', () => {
  it('prices the order on the server and keeps a snapshot', async () => {
    const { service } = createService();
    const order = await service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'site', contact: CONTACT });
    expect(order).toMatchObject({ id: 1, token: 'token-1', status: 'new', source: 'site', hasQr: false });
    expect(order.total).toBe(order.lines.reduce((sum, l) => sum + l.price, 0) + order.countertopPrice);
    expect(order.lines[0]).toEqual({ sku: 'TALL-CLOSED-600', title: 'Пенал закрытый', width: 600, price: 10800 });
    expect(order.contact).toEqual(CONTACT);
  });

  it('accepts a manager order without contact', async () => {
    const { service } = createService();
    const order = await service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'bot', contact: null });
    expect(order.contact).toBeNull();
  });

  it('rejects unreadable and empty kitchens', async () => {
    const { service } = createService();
    await expectOrderError(() => service.createOrder({ kitchenToken: 'junk', source: 'bot', contact: null }), 'invalid_kitchen');
    const empty = encodeKitchenLink({ ...DEFAULT_KITCHEN, runs: { back: [], left: [], right: [] } });
    await expectOrderError(() => service.createOrder({ kitchenToken: empty, source: 'bot', contact: null }), 'empty_kitchen');
  });

  it('requires a valid contact for a site order', async () => {
    const { service } = createService();
    const create = (contact: { name: string; phone: string } | null) =>
      service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'site', contact });
    await expectOrderError(() => create(null), 'invalid_contact');
    await expectOrderError(() => create({ name: ' ', phone: '+7 900 123-45-67' }), 'invalid_contact');
    await expectOrderError(() => create({ name: 'Иван', phone: '123' }), 'invalid_contact');
    await expectOrderError(() => create({ name: 'Иван', phone: 'abc 900 123 45 67' }), 'invalid_contact');
  });

  it('notifies admins and survives a notifier failure', async () => {
    const seen: Order[] = [];
    const ok = createService({ notifier: { notifyOrderCreated: async (order) => void seen.push(order) } });
    await ok.service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'site', contact: CONTACT });
    expect(seen).toHaveLength(1);
    const failing = createService({
      notifier: {
        notifyOrderCreated: async () => {
          throw new Error('telegram is down');
        },
      },
    });
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => void errors.push(args);
    try {
      const order = await failing.service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'site', contact: CONTACT });
      expect(order.id).toBe(1);
    } finally {
      console.error = original;
    }
    expect(errors).toHaveLength(1);
  });
});

describe('order lifecycle', () => {
  async function createNewOrder() {
    const { service } = createService();
    const order = await service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'site', contact: CONTACT });
    return { service, order };
  }

  it('moves to awaiting payment after a QR is attached and keeps the image', async () => {
    const { service, order } = await createNewOrder();
    const updated = service.attachQr(order.id, PNG_QR);
    expect(updated).toMatchObject({ status: 'awaiting_payment', hasQr: true });
    expect(service.readQr(order.id)).toMatchObject({ mime: 'image/png' });
    expect(Array.from(service.readQr(order.id)?.bytes ?? [])).toEqual(Array.from(PNG_QR.bytes));
  });

  it('replaces the QR while payment is awaited', async () => {
    const { service, order } = await createNewOrder();
    service.attachQr(order.id, PNG_QR);
    service.attachQr(order.id, { mime: 'image/jpeg', bytes: new Uint8Array([255, 216, 1]) });
    expect(service.readQr(order.id)?.mime).toBe('image/jpeg');
  });

  it('refuses a bad QR', async () => {
    const { service, order } = await createNewOrder();
    await expectOrderError(() => service.attachQr(order.id, { mime: 'text/html', bytes: new Uint8Array([1]) }), 'invalid_qr');
    await expectOrderError(() => service.attachQr(order.id, { mime: 'image/png', bytes: new Uint8Array() }), 'invalid_qr');
  });

  it('is paid only after a QR was issued', async () => {
    const { service, order } = await createNewOrder();
    await expectOrderError(() => service.markPaid(order.id), 'invalid_transition');
    service.attachQr(order.id, PNG_QR);
    expect(service.markPaid(order.id).status).toBe('paid');
  });

  it('cannot cancel a paid order or change a canceled one', async () => {
    const { service, order } = await createNewOrder();
    service.attachQr(order.id, PNG_QR);
    service.markPaid(order.id);
    await expectOrderError(() => service.cancelOrder(order.id), 'invalid_transition');
    const second = await service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'bot', contact: null });
    expect(service.cancelOrder(second.id).status).toBe('canceled');
    await expectOrderError(() => service.attachQr(second.id, PNG_QR), 'invalid_transition');
  });

  it('finds orders by token and lists the newest first', async () => {
    const { service, order } = await createNewOrder();
    const second = await service.createOrder({ kitchenToken: KITCHEN_TOKEN, source: 'bot', contact: null });
    expect(service.findOrderByToken(order.token)?.id).toBe(order.id);
    expect(service.findOrderByToken('missing')).toBeNull();
    expect(service.listRecentOrders(10).map((o) => o.id)).toEqual([second.id, order.id]);
    await expectOrderError(() => service.getOrderById(99), 'order_not_found');
  });
});

describe('createProductOrder', () => {
  const product = { id: 'p1', title: 'Кухня прямая 2,4 м', shape: 'straight' as const, size: '2400 мм', price: 36000, sku: 'K-1', images: [], description: null };

  function createProductService() {
    const store = new SqliteOrderStore(':memory:');
    return new OrderService({ store, findProduct: (id) => (id === 'p1' ? product : null) });
  }

  it('takes the price from the catalog and stores a one line snapshot', async () => {
    const order = await createProductService().createProductOrder({ productId: 'p1', contact: CONTACT });
    expect(order).toMatchObject({ total: 36000, countertopPrice: 0, kitchenToken: '', status: 'new', source: 'site' });
    expect(order.lines).toEqual([{ sku: 'K-1', title: 'Кухня прямая 2,4 м', width: 0, price: 36000 }]);
  });

  it('refuses an unknown product and a bad contact', async () => {
    const service = createProductService();
    await expectOrderError(() => service.createProductOrder({ productId: 'nope', contact: CONTACT }), 'invalid_product');
    await expectOrderError(() => service.createProductOrder({ productId: 'p1', contact: { name: '', phone: '1' } }), 'invalid_contact');
  });

  it('follows the same payment flow as a kitchen order', async () => {
    const service = createProductService();
    const order = await service.createProductOrder({ productId: 'p1', contact: CONTACT });
    expect(service.attachQr(order.id, PNG_QR).status).toBe('awaiting_payment');
    expect(service.markPaid(order.id).status).toBe('paid');
  });
});
