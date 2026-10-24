import * as THREE from 'three';
import { MM } from '../cabinetFronts';
import type { Vec3 } from '../appliances/applianceShapes';

const RING_SEGMENTS = 48;

export function createHorizontalRing(radiusMm: number, tubeMm: number, center: Vec3, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radiusMm * MM, tubeMm * MM, 12, RING_SEGMENTS);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  mesh.castShadow = true;
  return mesh;
}

export function listCornerOffsets(widthMm: number, depthMm: number, insetMm: number): [number, number][] {
  return [
    [insetMm, insetMm],
    [widthMm - insetMm, insetMm],
    [insetMm, depthMm - insetMm],
    [widthMm - insetMm, depthMm - insetMm],
  ];
}
