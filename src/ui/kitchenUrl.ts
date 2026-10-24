import type { Kitchen } from '../domain/kitchen';
import { decodeKitchenLink, encodeKitchenLink } from '../domain/kitchenLink';

const EDIT_PREFIX = '#k=';
const VIEW_PREFIX = '#v=';

export type LinkMode = 'edit' | 'view';

export interface AddressKitchen {
  kitchen: Kitchen;
  isViewOnly: boolean;
}

export function readKitchenFromAddress(): AddressKitchen | null {
  const { hash } = window.location;
  const isViewOnly = hash.startsWith(VIEW_PREFIX);
  if (!isViewOnly && !hash.startsWith(EDIT_PREFIX)) return null;
  const kitchen = decodeKitchenLink(hash.slice(EDIT_PREFIX.length));
  return kitchen ? { kitchen, isViewOnly } : null;
}

export function buildKitchenLinkUrl(kitchen: Kitchen, mode: LinkMode = 'edit'): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${mode === 'view' ? VIEW_PREFIX : EDIT_PREFIX}${encodeKitchenLink(kitchen)}`;
}

export function writeKitchenToAddress(kitchen: Kitchen): void {
  window.history.replaceState(null, '', buildKitchenLinkUrl(kitchen));
}
