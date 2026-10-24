import type { PublicOrder } from '../domain/publicOrder';

export class OrderApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`Orders API answered ${status} ${code}`);
  }
}

interface ContactFields {
  name: string;
  phone: string;
  comment: string;
}

export type OrderRequest = ContactFields & { kitchen: string };

export interface CreatedOrder {
  token: string;
  order: PublicOrder;
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  throw new OrderApiError(response.status, body.error ?? 'unknown');
}

export async function createOrder(request: OrderRequest): Promise<CreatedOrder> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return readJson<CreatedOrder>(response);
}

export async function fetchOrder(token: string): Promise<PublicOrder> {
  return readJson<PublicOrder>(await fetch(`/api/orders/${encodeURIComponent(token)}`));
}

export function buildQrUrl(token: string, version: string): string {
  return `/api/orders/${encodeURIComponent(token)}/qr?v=${encodeURIComponent(version)}`;
}
