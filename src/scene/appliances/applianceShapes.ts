import * as THREE from 'three';
import { MM, createBox, type Materials } from '../cabinetFronts';
import type { LayoutItem } from '../../domain/kitchen';

export type Vec3 = [number, number, number];
export type Axis = 'x' | 'y' | 'z';

export interface ModelFrame {
  width: number;
  height: number;
  depth: number;
  elevation: number;
}

export interface ModelContext {
  materials: Materials;
  item: LayoutItem;
}

const ROD_SEGMENTS = 28;
const HANDLE_ROD_RADIUS_MM = 9;
const HANDLE_POST_RADIUS_MM = 5;
const HANDLE_STANDOFF_MM = 30;
const HANDLE_POST_INSET_MM = 22;
const LINER_THICKNESS_MM = 2;

export function createRod(radiusMm: number, lengthMm: number, center: Vec3, axis: Axis, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(radiusMm * MM, radiusMm * MM, lengthMm * MM, ROD_SEGMENTS);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createRing(radiusMm: number, tubeMm: number, center: Vec3, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.TorusGeometry(radiusMm * MM, tubeMm * MM, 16, 64);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  mesh.castShadow = true;
  return mesh;
}

export function createFlatRing(innerMm: number, outerMm: number, center: Vec3, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(innerMm * MM, outerMm * MM, 64), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  mesh.receiveShadow = true;
  return mesh;
}

export function createHollowBox(size: Vec3, origin: Vec3, wallMm: number, material: THREE.Material): THREE.Group {
  const [width, height, depth] = size;
  const [x, y, z] = origin;
  const inner = width - 2 * wallMm;
  const group = new THREE.Group();
  const part = (partSize: Vec3, partOrigin: Vec3) => group.add(createBox(partSize, partOrigin, material));
  part([wallMm, height, depth], [x, y, z]);
  part([wallMm, height, depth], [x + width - wallMm, y, z]);
  part([inner, wallMm, depth], [x + wallMm, y, z]);
  part([inner, wallMm, depth], [x + wallMm, y + height - wallMm, z]);
  part([inner, height - 2 * wallMm, wallMm], [x + wallMm, y + wallMm, z]);
  return group;
}

export function createLinedShell(size: Vec3, origin: Vec3, wallMm: number, materials: { shell: THREE.Material; liner: THREE.Material }): THREE.Group {
  const [width, height, depth] = size;
  const [x, y, z] = origin;
  const innerSize: Vec3 = [width - 2 * wallMm, height - 2 * wallMm, depth - wallMm];
  const innerOrigin: Vec3 = [x + wallMm, y + wallMm, z + wallMm];
  const group = new THREE.Group();
  group.add(createHollowBox(size, origin, wallMm, materials.shell));
  group.add(createHollowBox(innerSize, innerOrigin, LINER_THICKNESS_MM, materials.liner));
  return group;
}

export function createTubeHandle(center: Vec3, lengthMm: number, axis: 'x' | 'y', material: THREE.Material): THREE.Group {
  const [cx, cy, frontZ] = center;
  const group = new THREE.Group();
  group.add(createRod(HANDLE_ROD_RADIUS_MM, lengthMm, [cx, cy, frontZ + HANDLE_STANDOFF_MM], axis, material));
  [-1, 1].forEach((side) => {
    const offset = side * (lengthMm / 2 - HANDLE_POST_INSET_MM);
    const at: Vec3 = axis === 'x' ? [cx + offset, cy, frontZ + HANDLE_STANDOFF_MM / 2] : [cx, cy + offset, frontZ + HANDLE_STANDOFF_MM / 2];
    group.add(createRod(HANDLE_POST_RADIUS_MM, HANDLE_STANDOFF_MM, at, 'z', material));
  });
  return group;
}

export function createPlinth(width: number, depth: number, heightMm: number, material: THREE.Material): THREE.Mesh {
  return createBox([width, heightMm, depth], [0, 0, 0], material);
}
