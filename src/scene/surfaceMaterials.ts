import * as THREE from 'three';
import type { SurfaceOption } from '../domain/catalog';
import { getSurfaceTexture, type SurfaceTexture } from './surfaceTextures';

export function findSurface(options: SurfaceOption[], id: string): SurfaceOption {
  const option = options.find((entry) => entry.id === id);
  if (!option) throw new Error(`Surface ${id} is missing in the catalog`);
  return option;
}

export function createSurfaceMaterial(option: SurfaceOption): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: option.roughness, map: getSurfaceTexture(option).texture });
}

export function projectUvToMeters(
  geometry: THREE.BufferGeometry,
  surface: SurfaceTexture,
  toMeters: (u: number, v: number) => [number, number],
): void {
  const uv = geometry.getAttribute('uv');
  const cos = Math.cos(surface.rotation);
  const sin = Math.sin(surface.rotation);
  for (let index = 0; index < uv.count; index += 1) {
    const [x, y] = toMeters(uv.getX(index), uv.getY(index));
    uv.setXY(index, (x * cos - y * sin) / surface.metersX, (x * sin + y * cos) / surface.metersY);
  }
  uv.needsUpdate = true;
}
