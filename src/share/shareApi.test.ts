import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claimShare, createShare } from './shareApi';

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('share api', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a share and returns its id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(201, { id: 'abc' }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await createShare('token')).toEqual({ kind: 'created', id: 'abc' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/share$/);
    expect(JSON.parse(init.body)).toEqual({ payload: 'token' });
  });

  it('reports a failed creation for a refused request or a broken answer or a lost connection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(429, { error: 'too_many_attempts' })));
    expect(await createShare('token')).toEqual({ kind: 'failed' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(201, { nothing: true })));
    expect(await createShare('token')).toEqual({ kind: 'failed' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    expect(await createShare('token')).toEqual({ kind: 'failed' });
  });

  it('claims a share and returns the kitchen token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { payload: 'kitchen-token' })));
    expect(await claimShare('id')).toEqual({ kind: 'ready', token: 'kitchen-token' });
  });

  it('tells a used share from a missing one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(410, { error: 'share_used' })));
    expect(await claimShare('id')).toEqual({ kind: 'used' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(404, { error: 'share_missing' })));
    expect(await claimShare('id')).toEqual({ kind: 'missing' });
  });

  it('treats a server error, a bad body and a lost connection as a failed load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(500, {})));
    expect(await claimShare('id')).toEqual({ kind: 'failed' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, { payload: 5 })));
    expect(await claimShare('id')).toEqual({ kind: 'failed' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    expect(await claimShare('id')).toEqual({ kind: 'failed' });
  });
});
