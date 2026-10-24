import { DatabaseSync } from 'node:sqlite';
import type { NewOrderRecord, Order, OrderStatus, OrderStore, StoredQr } from './types';

interface OrderRow {
  id: number;
  token: string;
  kitchen_token: string;
  lines: string;
  countertop_price: number;
  total: number;
  status: OrderStatus;
  source: Order['source'];
  contact_name: string | null;
  contact_phone: string | null;
  contact_comment: string | null;
  has_qr: number;
  created_at: string;
  updated_at: string;
}

const SELECT_ORDER = `SELECT id, token, kitchen_token, lines, countertop_price, total, status, source,
  contact_name, contact_phone, contact_comment, qr_mime IS NOT NULL AS has_qr, created_at, updated_at FROM orders`;

function toOrder(row: OrderRow): Order {
  const hasContact = row.contact_name !== null && row.contact_phone !== null;
  return {
    id: row.id,
    token: row.token,
    kitchenToken: row.kitchen_token,
    lines: JSON.parse(row.lines),
    countertopPrice: row.countertop_price,
    total: row.total,
    status: row.status,
    source: row.source,
    contact: hasContact
      ? { name: row.contact_name ?? '', phone: row.contact_phone ?? '', comment: row.contact_comment ?? '' }
      : null,
    hasQr: row.has_qr === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteOrderStore implements OrderStore {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        kitchen_token TEXT NOT NULL,
        lines TEXT NOT NULL,
        countertop_price INTEGER NOT NULL,
        total INTEGER NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL,
        contact_name TEXT,
        contact_phone TEXT,
        contact_comment TEXT,
        qr_mime TEXT,
        qr_bytes BLOB,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }

  insert(record: NewOrderRecord): Order {
    const result = this.database
      .prepare(
        `INSERT INTO orders (token, kitchen_token, lines, countertop_price, total, status, source,
          contact_name, contact_phone, contact_comment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.token,
        record.kitchenToken,
        JSON.stringify(record.lines),
        record.countertopPrice,
        record.total,
        record.source,
        record.contact?.name ?? null,
        record.contact?.phone ?? null,
        record.contact?.comment ?? null,
        record.createdAt,
        record.createdAt,
      );
    return this.getById(Number(result.lastInsertRowid));
  }

  findById(id: number): Order | null {
    const row = this.database.prepare(`${SELECT_ORDER} WHERE id = ?`).get(id) as OrderRow | undefined;
    return row ? toOrder(row) : null;
  }

  findByToken(token: string): Order | null {
    const row = this.database.prepare(`${SELECT_ORDER} WHERE token = ?`).get(token) as OrderRow | undefined;
    return row ? toOrder(row) : null;
  }

  listRecent(limit: number): Order[] {
    const rows = this.database.prepare(`${SELECT_ORDER} ORDER BY id DESC LIMIT ?`).all(limit) as unknown as OrderRow[];
    return rows.map(toOrder);
  }

  updateStatus(id: number, status: OrderStatus, updatedAt: string): Order {
    this.database.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, updatedAt, id);
    return this.getById(id);
  }

  saveQr(id: number, qr: StoredQr, updatedAt: string): Order {
    this.database.prepare('UPDATE orders SET qr_mime = ?, qr_bytes = ?, updated_at = ? WHERE id = ?').run(qr.mime, qr.bytes, updatedAt, id);
    return this.getById(id);
  }

  findQr(id: number): StoredQr | null {
    const row = this.database.prepare('SELECT qr_mime, qr_bytes FROM orders WHERE id = ?').get(id) as
      | { qr_mime: string | null; qr_bytes: Uint8Array | null }
      | undefined;
    if (!row || row.qr_mime === null || row.qr_bytes === null) return null;
    return { mime: row.qr_mime, bytes: row.qr_bytes };
  }

  close(): void {
    this.database.close();
  }

  private getById(id: number): Order {
    const order = this.findById(id);
    if (!order) throw new Error(`Order ${id} is missing after a write`);
    return order;
  }
}
