import type { Kitchen } from '../domain/kitchen';
import { decodeKitchenLink, encodeKitchenLink } from '../domain/kitchenLink';

const EDIT_PREFIX = '#k=';
const SHARE_PREFIX = '#s=';
const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function readKitchenFromAddress(): Kitchen | null {
  const { hash } = window.location;
  return hash.startsWith(EDIT_PREFIX) ? decodeKitchenLink(hash.slice(EDIT_PREFIX.length)) : null;
}

export function readShareIdFromAddress(): string | null {
  const { hash } = window.location;
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  const id = hash.slice(SHARE_PREFIX.length);
  return SHARE_ID_PATTERN.test(id) ? id : null;
}

export function buildKitchenLinkUrl(kitchen: Kitchen): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${EDIT_PREFIX}${encodeKitchenLink(kitchen)}`;
}

export function buildShareUrl(id: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${SHARE_PREFIX}${id}`;
}

export function writeKitchenToAddress(kitchen: Kitchen): void {
  window.history.replaceState(null, '', buildKitchenLinkUrl(kitchen));
}
