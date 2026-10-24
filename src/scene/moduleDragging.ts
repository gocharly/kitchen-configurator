import * as THREE from 'three';

export function pickPointOnHorizontalPlane(
  pointer: THREE.Vector2,
  camera: THREE.Camera,
  height: number,
): THREE.Vector3 | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const point = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -height);
  return raycaster.ray.intersectPlane(plane, point);
}

export function findModuleHolder(kitchenGroup: THREE.Group | null, moduleId: string): THREE.Object3D | null {
  if (!kitchenGroup) return null;
  const holder = kitchenGroup.children.find(
    (child) => child.userData.itemKind === 'module' && child.userData.itemId === moduleId,
  );
  return holder ?? null;
}
