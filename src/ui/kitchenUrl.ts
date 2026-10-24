import type { Kitchen } from '../domain/kitchen';
import { decodeKitchenLink, encodeKitchenLink } from '../domain/kitchenLink';

const HASH_PREFIX = '#k=';

export function readKitchenFromAddress(): Kitchen | null {
  const { hash } = window.location;
  return hash.startsWith(HASH_PREFIX) ? decodeKitchenLink(hash.slice(HASH_PREFIX.length)) : null;
}

export function buildKitchenLinkUrl(kitchen: Kitchen): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${HASH_PREFIX}${encodeKitchenLink(kitchen)}`;
}

export function writeKitchenToAddress(kitchen: Kitchen): void {
  window.history.replaceState(null, '', buildKitchenLinkUrl(kitchen));
}
