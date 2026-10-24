import * as THREE from 'three';

const MM = 0.001;
const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(70);
const FLAP_OPEN_ANGLE = THREE.MathUtils.degToRad(75);
const HATCH_OPEN_ANGLE = THREE.MathUtils.degToRad(80);
const DRAWER_TRAVEL_RATIO = 0.75;
const CURTAIN_GATHER_RATIO = 0.78;
export const PANEL_ANIMATION_MS = 300;

export type PanelKind = 'door' | 'flap' | 'hatch' | 'drawer' | 'curtain';

export interface OpenablePanel {
  key: string;
  kind: PanelKind;
  hingeSign: 1 | -1;
  travel: number;
  progress: number;
}

export function wrapOpenable(
  content: THREE.Object3D,
  pivotMm: [number, number, number],
  panel: Omit<OpenablePanel, 'travel' | 'progress'> & { drawerDepthMm?: number },
): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.position.set(pivotMm[0] * MM, pivotMm[1] * MM, pivotMm[2] * MM);
  content.position.set(-pivotMm[0] * MM, -pivotMm[1] * MM, -pivotMm[2] * MM);
  wrapper.add(content);
  const travel = measureTravel(panel.kind, panel.drawerDepthMm ?? 0);
  wrapper.userData.openable = { key: panel.key, kind: panel.kind, hingeSign: panel.hingeSign, travel, progress: 0 } satisfies OpenablePanel;
  return wrapper;
}

function measureTravel(kind: PanelKind, drawerDepthMm: number): number {
  if (kind === 'door') return DOOR_OPEN_ANGLE;
  if (kind === 'curtain') return CURTAIN_GATHER_RATIO;
  if (kind === 'flap') return FLAP_OPEN_ANGLE;
  if (kind === 'hatch') return HATCH_OPEN_ANGLE;
  return drawerDepthMm * DRAWER_TRAVEL_RATIO * MM;
}

export function readOpenable(wrapper: THREE.Object3D): OpenablePanel {
  return wrapper.userData.openable as OpenablePanel;
}

export function applyPanelProgress(wrapper: THREE.Object3D, progress: number): void {
  const panel = readOpenable(wrapper);
  panel.progress = progress;
  if (panel.kind === 'door') wrapper.rotation.y = panel.hingeSign * -panel.travel * progress;
  if (panel.kind === 'flap') wrapper.rotation.x = -panel.travel * progress;
  if (panel.kind === 'hatch') wrapper.rotation.x = panel.travel * progress;
  if (panel.kind === 'drawer') wrapper.position.z = progress * panel.travel;
  if (panel.kind === 'curtain') wrapper.scale.x = 1 - panel.travel * progress;
}

export function findOpenableWrapper(object: THREE.Object3D | null): THREE.Object3D | null {
  let node = object;
  while (node && node.userData.openable === undefined) node = node.parent;
  return node;
}

export function listOpenableWrappers(root: THREE.Object3D): THREE.Object3D[] {
  const wrappers: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.userData.openable !== undefined) wrappers.push(object);
  });
  return wrappers;
}
