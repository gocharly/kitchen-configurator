import { describe, expect, it } from 'vitest';
import { formatKitchenCount } from './formatKitchenCount';

describe('formatKitchenCount', () => {
  it.each([
    [0, '0 кухонь'],
    [1, '1 кухня'],
    [2, '2 кухни'],
    [4, '4 кухни'],
    [5, '5 кухонь'],
    [7, '7 кухонь'],
    [11, '11 кухонь'],
    [12, '12 кухонь'],
    [21, '21 кухня'],
    [22, '22 кухни'],
    [111, '111 кухонь'],
  ])('%i', (count, expected) => {
    expect(formatKitchenCount(count)).toBe(expected);
  });
});
