export type OrderStatus = 'new' | 'awaiting_payment' | 'paid' | 'canceled';
export type OrderSource = 'site' | 'bot';

export interface OrderLine {
  sku: string;
  title: string;
  width: number;
  price: number;
}

export interface OrderContact {
  name: string;
  phone: string;
  comment: string;
}

export interface Order {
  id: number;
  token: string;
  kitchenToken: string;
  lines: OrderLine[];
  countertopPrice: number;
  total: number;
  status: OrderStatus;
  source: OrderSource;
  contact: OrderContact | null;
  hasQr: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrderRecord {
  token: string;
  kitchenToken: string;
  lines: OrderLine[];
  countertopPrice: number;
  total: number;
  source: OrderSource;
  contact: OrderContact | null;
  createdAt: string;
}

export interface StoredQr {
  mime: string;
  bytes: Uint8Array;
}

export interface OrderStore {
  insert(record: NewOrderRecord): Order;
  findById(id: number): Order | null;
  findByToken(token: string): Order | null;
  listRecent(limit: number): Order[];
  updateStatus(id: number, status: OrderStatus, updatedAt: string): Order;
  saveQr(id: number, qr: StoredQr, updatedAt: string): Order;
  findQr(id: number): StoredQr | null;
}

export interface OrderNotifier {
  notifyOrderCreated(order: Order): Promise<void>;
}
