import type { LayoutItem } from './kitchen';

export const MIN_FRIDGE_TO_HOB_MM = 300;

function isOverlapping(a: LayoutItem, b: LayoutItem): boolean {
  return a.offset < b.offset + b.module.width && a.offset + a.module.width > b.offset;
}

function measureGap(a: LayoutItem, b: LayoutItem): number {
  return Math.max(a.offset - (b.offset + b.module.width), b.offset - (a.offset + a.module.width));
}

function isSameWall(a: LayoutItem, b: LayoutItem): boolean {
  return a.wall === b.wall;
}

function hasCabinetAboveHob(hob: LayoutItem, items: LayoutItem[]): boolean {
  return items.some((other) => isSameWall(hob, other) && other.spec.row === 'upper' && other.spec.role !== 'hood' && isOverlapping(hob, other));
}

function hasFridgeTooClose(hob: LayoutItem, items: LayoutItem[]): boolean {
  return items.some((other) => other.spec.role === 'fridge' && isSameWall(hob, other) && measureGap(hob, other) < MIN_FRIDGE_TO_HOB_MM);
}

export function hasPlacementViolation(items: LayoutItem[]): boolean {
  return items
    .filter((item) => item.spec.role === 'hob')
    .some((hob) => hasCabinetAboveHob(hob, items) || hasFridgeTooClose(hob, items));
}
