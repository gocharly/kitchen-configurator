import * as THREE from 'three';
import type { Kitchen, WallId } from '../domain/kitchen';
import { MM } from './cabinetFronts';

export function positionOnWall(
  holder: THREE.Group,
  span: { wall: WallId; offset: number; width: number },
  room: Kitchen['room'],
): void {
  if (span.wall === 'back') holder.position.set(span.offset * MM, 0, 0);
  if (span.wall === 'left') {
    holder.rotation.y = Math.PI / 2;
    holder.position.set(0, 0, (span.offset + span.width) * MM);
  }
  if (span.wall === 'right') {
    holder.rotation.y = -Math.PI / 2;
    holder.position.set(room.length * MM, 0, span.offset * MM);
  }
}

export type WallSpan = [number, number];

export function mergeSpans(spans: WallSpan[]): WallSpan[] {
  return [...spans]
    .sort((a, b) => a[0] - b[0])
    .reduce<WallSpan[]>((merged, span) => {
      const last = merged[merged.length - 1];
      if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
      else merged.push([span[0], span[1]]);
      return merged;
    }, []);
}
