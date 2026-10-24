import { randomBytes } from 'node:crypto';
import { calculateEstimate, listPlacedModules } from '../../src/domain/kitchen';
import { decodeKitchenLink, encodeKitchenLink } from '../../src/domain/kitchenLink';
import { findProduct as findShopProduct, type Product } from '../../src/shop/productCatalog';
import type { Order, OrderContact, OrderNotifier, OrderSource, OrderStatus, OrderStore, StoredQr } from './types';

export type OrderErrorCode =
  | 'invalid_kitchen'
  | 'empty_kitchen'
  | 'invalid_contact'
  | 'invalid_product'
  | 'order_not_found'
  | 'invalid_transition'
  | 'invalid_qr';

export class OrderError extends Error {
  constructor(
    readonly code: OrderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

export interface ContactInput {
  name: string;
  phone: string;
  comment?: string;
}

export interface CreateOrderInput {
  kitchenToken: string;
  source: OrderSource;
  contact: ContactInput | null;
}

export interface CreateProductOrderInput {
  productId: string;
  contact: ContactInput;
}

export interface OrderServiceDependencies {
  store: OrderStore;
  findProduct?: (productId: string) => Product | null;
  notifier?: OrderNotifier;
  now?: () => Date;
  createToken?: () => string;
}

export const MAX_NAME_LENGTH = 80;
export const MAX_COMMENT_LENGTH = 500;
export const MIN_PHONE_DIGITS = 10;
export const MAX_PHONE_DIGITS = 15;
export const MAX_QR_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_QR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ORDER_TOKEN_BYTES = 18;

const QR_ALLOWED_STATUSES: OrderStatus[] = ['new', 'awaiting_payment'];
const PAYMENT_ALLOWED_STATUSES: OrderStatus[] = ['awaiting_payment'];
const CANCEL_ALLOWED_STATUSES: OrderStatus[] = ['new', 'awaiting_payment'];

function normalizeContact(input: ContactInput): OrderContact {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const comment = (input.comment ?? '').trim();
  const digitCount = phone.replace(/\D/g, '').length;
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new OrderError('invalid_contact', `Name must be 1 to ${MAX_NAME_LENGTH} characters`);
  }
  if (!/^[\d\s()+\-.]+$/.test(phone) || digitCount < MIN_PHONE_DIGITS || digitCount > MAX_PHONE_DIGITS) {
    throw new OrderError('invalid_contact', `Phone must contain ${MIN_PHONE_DIGITS} to ${MAX_PHONE_DIGITS} digits`);
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new OrderError('invalid_contact', `Comment must be at most ${MAX_COMMENT_LENGTH} characters`);
  }
  return { name, phone, comment };
}

export class OrderService {
  private readonly store: OrderStore;
  private readonly notifier: OrderNotifier | undefined;
  private readonly now: () => Date;
  private readonly createToken: () => string;
  private readonly findProduct: (productId: string) => Product | null;

  constructor(dependencies: OrderServiceDependencies) {
    this.store = dependencies.store;
    this.findProduct = dependencies.findProduct ?? findShopProduct;
    this.notifier = dependencies.notifier;
    this.now = dependencies.now ?? (() => new Date());
    this.createToken = dependencies.createToken ?? (() => randomBytes(ORDER_TOKEN_BYTES).toString('base64url'));
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const kitchen = decodeKitchenLink(input.kitchenToken);
    if (!kitchen) throw new OrderError('invalid_kitchen', 'Kitchen link cannot be read');
    if (listPlacedModules(kitchen).length === 0) throw new OrderError('empty_kitchen', 'Kitchen has no modules');
    const contact = input.contact ? normalizeContact(input.contact) : null;
    if (input.source === 'site' && !contact) throw new OrderError('invalid_contact', 'Contact is required');
    const estimate = calculateEstimate(kitchen);
    const order = this.store.insert({
      token: this.createToken(),
      kitchenToken: encodeKitchenLink(kitchen),
      lines: [...estimate.lines, ...estimate.extraLines].map(({ sku, title, width, price }) => ({ sku, title, width, price })),
      countertopPrice: estimate.countertopPrice,
      total: estimate.total,
      source: input.source,
      contact,
      createdAt: this.now().toISOString(),
    });
    await this.notifyCreated(order);
    return order;
  }

  async createProductOrder(input: CreateProductOrderInput): Promise<Order> {
    const product = this.findProduct(input.productId);
    if (!product) throw new OrderError('invalid_product', `Product ${input.productId} not found`);
    const contact = normalizeContact(input.contact);
    const order = this.store.insert({
      token: this.createToken(),
      kitchenToken: '',
      lines: [{ sku: product.sku, title: product.title, width: 0, price: product.price }],
      countertopPrice: 0,
      total: product.price,
      source: 'site',
      contact,
      createdAt: this.now().toISOString(),
    });
    await this.notifyCreated(order);
    return order;
  }

  getOrderById(id: number): Order {
    const order = this.store.findById(id);
    if (!order) throw new OrderError('order_not_found', `Order ${id} not found`);
    return order;
  }

  findOrderByToken(token: string): Order | null {
    return this.store.findByToken(token);
  }

  listRecentOrders(limit: number): Order[] {
    return this.store.listRecent(limit);
  }

  attachQr(orderId: number, qr: StoredQr): Order {
    const order = this.getOrderById(orderId);
    this.requireStatus(order, QR_ALLOWED_STATUSES, 'QR can be attached only to a new order or an order awaiting payment');
    if (!ACCEPTED_QR_MIME_TYPES.includes(qr.mime)) throw new OrderError('invalid_qr', `Unsupported QR type ${qr.mime}`);
    if (qr.bytes.byteLength === 0 || qr.bytes.byteLength > MAX_QR_BYTES) {
      throw new OrderError('invalid_qr', `QR image must be 1 byte to ${MAX_QR_BYTES} bytes`);
    }
    const withQr = this.store.saveQr(orderId, qr, this.now().toISOString());
    return this.store.updateStatus(withQr.id, 'awaiting_payment', this.now().toISOString());
  }

  markPaid(orderId: number): Order {
    const order = this.getOrderById(orderId);
    this.requireStatus(order, PAYMENT_ALLOWED_STATUSES, 'Only an order awaiting payment can be marked as paid');
    return this.store.updateStatus(orderId, 'paid', this.now().toISOString());
  }

  cancelOrder(orderId: number): Order {
    const order = this.getOrderById(orderId);
    this.requireStatus(order, CANCEL_ALLOWED_STATUSES, 'Only an unpaid order can be canceled');
    return this.store.updateStatus(orderId, 'canceled', this.now().toISOString());
  }

  readQr(orderId: number): StoredQr | null {
    return this.store.findQr(orderId);
  }

  private requireStatus(order: Order, allowed: OrderStatus[], message: string): void {
    if (!allowed.includes(order.status)) {
      throw new OrderError('invalid_transition', `${message}, order ${order.id} is ${order.status}`);
    }
  }

  private async notifyCreated(order: Order): Promise<void> {
    if (!this.notifier) return;
    try {
      await this.notifier.notifyOrderCreated(order);
    } catch (error) {
      console.error(`Admins were not notified about order ${order.id}`, error);
    }
  }
}
