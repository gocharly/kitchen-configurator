import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { PublicOrder } from '../../src/domain/publicOrder';
import { OrderError, type OrderErrorCode, type OrderService } from '../orders/orderService';
import type { Order } from '../orders/types';
import { RateLimiter } from './rateLimiter';

const MAX_BODY_BYTES = 16 * 1024;
const ORDERS_PER_WINDOW = 5;
const ORDER_WINDOW_MS = 10 * 60 * 1000;
const TOKEN_PATTERN = '[A-Za-z0-9_-]{8,64}';
const ORDERS_PATH = /^\/api\/orders$/;
const ORDER_PATH = new RegExp(`^/api/orders/(${TOKEN_PATTERN})$`);
const QR_PATH = new RegExp(`^/api/orders/(${TOKEN_PATTERN})/qr$`);

const ERROR_STATUS: Record<OrderErrorCode, number> = {
  invalid_kitchen: 400,
  empty_kitchen: 400,
  invalid_contact: 400,
  invalid_product: 400,
  invalid_qr: 400,
  order_not_found: 404,
  invalid_transition: 409,
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function toPublicOrder(order: Order): PublicOrder {
  return {
    number: order.id,
    status: order.status,
    total: order.total,
    lines: order.lines,
    countertopPrice: order.countertopPrice,
    kitchenToken: order.kitchenToken,
    customerName: order.contact?.name ?? null,
    hasQr: order.hasQr,
    createdAt: order.createdAt,
  };
}

export interface HttpServerOptions {
  service: OrderService;
  publicUrl: string;
  trustProxy?: boolean;
  now?: () => number;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'body_too_large', 'Request body is too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be JSON');
  }
}

function readString(body: unknown, field: string): string {
  const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[field] : undefined;
  return typeof value === 'string' ? value : '';
}

function pickClientAddress(request: IncomingMessage, trustProxy: boolean): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (trustProxy && typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress ?? 'unknown';
}

export function createHttpServer(options: HttpServerOptions): Server {
  const { service, publicUrl, trustProxy = false } = options;
  const limiter = new RateLimiter(ORDERS_PER_WINDOW, ORDER_WINDOW_MS, options.now);

  async function createOrder(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!limiter.tryConsume(pickClientAddress(request, trustProxy))) {
      throw new HttpError(429, 'too_many_orders', 'Too many orders, try again later');
    }
    const body = await readJsonBody(request);
    const contact = { name: readString(body, 'name'), phone: readString(body, 'phone'), comment: readString(body, 'comment') };
    const productId = readString(body, 'product');
    const order = productId
      ? await service.createProductOrder({ productId, contact })
      : await service.createOrder({ kitchenToken: readString(body, 'kitchen'), source: 'site', contact });
    sendJson(response, 201, { token: order.token, url: `${publicUrl}/order/${order.token}`, order: toPublicOrder(order) });
  }

  function findOrder(token: string): Order {
    const order = service.findOrderByToken(token);
    if (!order) throw new HttpError(404, 'order_not_found', 'Order not found');
    return order;
  }

  function sendQr(response: ServerResponse, order: Order): void {
    const qr = service.readQr(order.id);
    if (!qr) throw new HttpError(404, 'qr_not_found', 'QR is not issued yet');
    response.writeHead(200, {
      'Content-Type': qr.mime,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': qr.bytes.byteLength,
    });
    response.end(Buffer.from(qr.bytes));
  }

  async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const { pathname } = new URL(request.url ?? '/', 'http://localhost');
    if (ORDERS_PATH.test(pathname)) {
      if (request.method !== 'POST') throw new HttpError(405, 'method_not_allowed', 'Use POST');
      return createOrder(request, response);
    }
    const qrMatch = QR_PATH.exec(pathname);
    if (qrMatch) {
      if (request.method !== 'GET') throw new HttpError(405, 'method_not_allowed', 'Use GET');
      return sendQr(response, findOrder(qrMatch[1]));
    }
    const orderMatch = ORDER_PATH.exec(pathname);
    if (orderMatch) {
      if (request.method !== 'GET') throw new HttpError(405, 'method_not_allowed', 'Use GET');
      return sendJson(response, 200, toPublicOrder(findOrder(orderMatch[1])));
    }
    throw new HttpError(404, 'not_found', 'Not found');
  }

  return createServer((request, response) => {
    route(request, response).catch((error: unknown) => {
      if (error instanceof HttpError) return sendJson(response, error.status, { error: error.code, message: error.message });
      if (error instanceof OrderError) {
        return sendJson(response, ERROR_STATUS[error.code], { error: error.code, message: error.message });
      }
      console.error(`Unhandled error for ${request.method} ${request.url}`, error);
      return sendJson(response, 500, { error: 'internal_error', message: 'Internal error' });
    });
  });
}
