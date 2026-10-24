import { afterEach, describe, expect, it, vi } from 'vitest';
import { readShareIdFromAddress } from './kitchenUrl';

function setHash(hash: string): void {
  vi.stubGlobal('window', { location: { hash } });
}

describe('share id in the address', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads a well formed id', () => {
    setHash('#s=uQx-QXGl63ibF0zMWcEX0w');
    expect(readShareIdFromAddress()).toBe('uQx-QXGl63ibF0zMWcEX0w');
  });

  it('ignores a malformed id and other addresses', () => {
    setHash('#s=short');
    expect(readShareIdFromAddress()).toBeNull();
    setHash('#s=uQx-QXGl63ibF0zMWcEX0w/../x');
    expect(readShareIdFromAddress()).toBeNull();
    setHash('#k=abc');
    expect(readShareIdFromAddress()).toBeNull();
    setHash('');
    expect(readShareIdFromAddress()).toBeNull();
  });
});
