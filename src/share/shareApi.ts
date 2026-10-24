import { SHARE_API_URL, SHARE_REQUEST_TIMEOUT_MS } from './shareConfig';

export type CreateShareResult = { kind: 'created'; id: string } | { kind: 'failed' };
export type ClaimShareResult = { kind: 'ready'; token: string } | { kind: 'used' } | { kind: 'missing' } | { kind: 'failed' };

const HTTP_NOT_FOUND = 404;
const HTTP_GONE = 410;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), SHARE_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function createShare(kitchenToken: string): Promise<CreateShareResult> {
  try {
    const response = await fetchWithTimeout(`${SHARE_API_URL}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: kitchenToken }),
    });
    if (!response.ok) return { kind: 'failed' };
    const body: unknown = await response.json();
    const id = typeof body === 'object' && body !== null ? (body as { id?: unknown }).id : undefined;
    return typeof id === 'string' ? { kind: 'created', id } : { kind: 'failed' };
  } catch (error) {
    console.error('Share link was not created', error);
    return { kind: 'failed' };
  }
}

export async function claimShare(id: string): Promise<ClaimShareResult> {
  try {
    const response = await fetchWithTimeout(`${SHARE_API_URL}/share/${encodeURIComponent(id)}`);
    if (response.status === HTTP_GONE) return { kind: 'used' };
    if (response.status === HTTP_NOT_FOUND) return { kind: 'missing' };
    if (!response.ok) return { kind: 'failed' };
    const body: unknown = await response.json();
    const payload = typeof body === 'object' && body !== null ? (body as { payload?: unknown }).payload : undefined;
    return typeof payload === 'string' ? { kind: 'ready', token: payload } : { kind: 'failed' };
  } catch (error) {
    console.error(`Share ${id} was not claimed`, error);
    return { kind: 'failed' };
  }
}
