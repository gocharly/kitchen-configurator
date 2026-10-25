import { rublesToTenge } from '../../src/domain/currency';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_KITCHEN } from '../../src/domain/kitchen';
import { encodeKitchenLink } from '../../src/domain/kitchenLink';
import { OrderService } from '../orders/orderService';
import { SqliteOrderStore } from '../orders/sqliteOrderStore';
import { createHttpServer } from './httpServer';

const KITCHEN_TOKEN = encodeKitchenLink(DEFAULT_KITCHEN);
const BODY = { kitchen: KITCHEN_TOKEN, name: 'Иван', phone: '+7 900 123-45-67', comment: '' };
const PNG = { mime: 'image/png', bytes: new Uint8Array([137, 80, 78, 71, 9, 9]) };

interface JsonBody {
  [key: string]: any;
}

async function readJson(response: Response): Promise<JsonBody> {
  return (await response.json()) as JsonBody;
}

const closers: (() => Promise<void>)[] = [];

afterEach(async () => {
  await Promise.all(closers.splice(0).map((close) => close()));
});

async function startServer() {
  const store = new SqliteOrderStore(':memory:');
  const service = new OrderService({ store });
  const server = createHttpServer({ service, publicUrl: 'https://shop.example' });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  closers.push(() => new Promise((resolve) => server.close(() => resolve())));
  const { port } = server.address() as AddressInfo;
  const request = (path: string, init?: RequestInit) => fetch(`http://127.0.0.1:${port}${path}`, init);
  const post = (path: string, body: unknown) =>
    request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { service, request, post };
}

describe('POST /api/orders', () => {
  it('creates an order and returns the cart link', async () => {
    const { post, service } = await startServer();
    const response = await post('/api/orders', BODY);
    expect(response.status).toBe(201);
    const payload = await readJson(response);
    expect(payload.url).toBe(`https://shop.example/order/${payload.token}`);
    expect(payload.order).toMatchObject({ number: 1, status: 'new', customerName: 'Иван' });
    expect(payload.order).not.toHaveProperty('phone');
    expect(service.getOrderById(1).contact?.phone).toBe('+7 900 123-45-67');
  });

  it('ignores a total sent by the client', async () => {
    const { post } = await startServer();
    const payload = await readJson(await post('/api/orders', { ...BODY, total: 1 }));
    expect(payload.order.total).toBeGreaterThan(1000);
  });

  it.each([
    ['unreadable kitchen', { ...BODY, kitchen: 'junk' }, 'invalid_kitchen'],
    ['short phone', { ...BODY, phone: '123' }, 'invalid_contact'],
    ['no name', { ...BODY, name: '' }, 'invalid_contact'],
  ])('rejects %s', async (_title, body, code) => {
    const { post } = await startServer();
    const response = await post('/api/orders', body);
    expect(response.status).toBe(400);
    expect((await readJson(response)).error).toBe(code);
  });

  it('rejects broken json and a large body', async () => {
    const { request } = await startServer();
    const broken = await request('/api/orders', { method: 'POST', body: '{nope' });
    expect(broken.status).toBe(400);
    const large = await request('/api/orders', { method: 'POST', body: 'x'.repeat(20000) });
    expect(large.status).toBe(413);
  });

  it('limits how many orders one address can create', async () => {
    const { post } = await startServer();
    const statuses: number[] = [];
    for (let index = 0; index < 6; index += 1) statuses.push((await post('/api/orders', BODY)).status);
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe('POST /api/orders for a shop product', () => {
  it('creates an order priced by the catalog and ignores a price from the client', async () => {
    const { post } = await startServer();
    const response = await post('/api/orders', { product: 'straight-2400', name: 'Иван', phone: '+7 900 123-45-67', price: 1 });
    expect(response.status).toBe(201);
    const payload = await readJson(response);
    expect(payload.order).toMatchObject({ status: 'new', total: rublesToTenge(36000), kitchenToken: '' });
    expect(payload.order.lines[0]).toMatchObject({ sku: 'K-STRAIGHT-2400', price: rublesToTenge(36000) });
  });

  it('rejects an unknown product', async () => {
    const { post } = await startServer();
    const response = await post('/api/orders', { product: 'nope', name: 'Иван', phone: '+7 900 123-45-67' });
    expect(response.status).toBe(400);
    expect((await readJson(response)).error).toBe('invalid_product');
  });
});

describe('GET /api/orders/:token', () => {
  it('returns the public order and follows status changes', async () => {
    const { post, request, service } = await startServer();
    const { token } = await readJson(await post('/api/orders', BODY));
    expect((await readJson(await request(`/api/orders/${token}`))).status).toBe('new');
    service.attachQr(1, PNG);
    const awaiting = await readJson(await request(`/api/orders/${token}`));
    expect(awaiting).toMatchObject({ status: 'awaiting_payment', hasQr: true });
  });

  it('answers 404 for an unknown token and 405 for a wrong method', async () => {
    const { request } = await startServer();
    expect((await request('/api/orders/unknown-token-1234')).status).toBe(404);
    expect((await request('/api/orders/unknown-token-1234', { method: 'DELETE' })).status).toBe(405);
    expect((await request('/api/other')).status).toBe(404);
  });
});

describe('GET /api/orders/:token/qr', () => {
  it('serves the image only after the manager uploaded it', async () => {
    const { post, request, service } = await startServer();
    const { token } = await readJson(await post('/api/orders', BODY));
    expect((await request(`/api/orders/${token}/qr`)).status).toBe(404);
    service.attachQr(1, PNG);
    const response = await request(`/api/orders/${token}/qr`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG.bytes);
  });
});
