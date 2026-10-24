import * as THREE from 'three';
import { MM, createBox } from '../cabinetFronts';
import { wrapOpenable } from '../openablePanels';
import { createRod, type ModelContext, type ModelFrame } from '../appliances/applianceShapes';

const POT_HEIGHT_RATIO = 0.3;
const POT_TOP_RADIUS_RATIO = 0.46;
const POT_BOTTOM_RADIUS_RATIO = 0.34;
const SOIL_HEIGHT_MM = 14;
const SOIL_PROUD_MM = 3;
const LEAF_COUNT = 9;
const LEAF_LENGTH_RATIO = 0.62;
const LEAF_WIDTH_MM = 70;
const LEAF_TILT_RAD = 0.5;
const RUG_THICKNESS_MM = 12;
const RUG_BORDER_MM = 60;
const LAMP_BASE_HEIGHT_MM = 20;
const LAMP_POLE_RADIUS_MM = 9;
const LAMP_SHADE_HEIGHT_MM = 280;
const BIN_LID_MM = 30;
const BIN_PEDAL_MM = 10;
const CURTAIN_ROD_MM = 18;
const CURTAIN_FOLD_WIDTH_MM = 80;
const CURTAIN_FOLD_OFFSET_MM = 8;
const CURTAIN_FOLD_OVERLAP_MM = 3;
const CURTAIN_FRONT_MARGIN_MM = 25;
const CURTAIN_ROD_DROP_MM = 40;

function createLeaf(length: number, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.5, 14, 10);
  geometry.scale(LEAF_WIDTH_MM * MM, length * MM, LEAF_WIDTH_MM * 0.25 * MM);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

export function buildPlant(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { ceramic, leaf, woodDark } = context.materials;
  const group = new THREE.Group();
  const centerX = frame.width / 2;
  const centerZ = frame.depth / 2;
  const potHeight = frame.height * POT_HEIGHT_RATIO;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(frame.width * POT_TOP_RADIUS_RATIO * MM, frame.width * POT_BOTTOM_RADIUS_RATIO * MM, potHeight * MM, 32), ceramic);
  pot.position.set(centerX * MM, (potHeight / 2) * MM, centerZ * MM);
  pot.castShadow = true;
  group.add(pot);
  group.add(createRod(frame.width * POT_TOP_RADIUS_RATIO - 8, SOIL_HEIGHT_MM, [centerX, potHeight + SOIL_PROUD_MM - SOIL_HEIGHT_MM / 2, centerZ], 'y', woodDark));
  const length = (frame.height - potHeight) * LEAF_LENGTH_RATIO;
  for (let index = 0; index < LEAF_COUNT; index += 1) {
    const angle = (index / LEAF_COUNT) * Math.PI * 2;
    const blade = createLeaf(length, leaf);
    const tilt = LEAF_TILT_RAD + (index % 3) * 0.18;
    const pivot = new THREE.Group().add(blade);
    blade.position.y = (length / 2) * MM;
    pivot.rotation.set(Math.sin(angle) * tilt, angle, Math.cos(angle) * tilt);
    pivot.position.set(centerX * MM, potHeight * MM, centerZ * MM);
    group.add(pivot);
  }
  return group;
}

export function buildRugRect(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { rug, fabric } = context.materials;
  const group = new THREE.Group();
  group.add(createBox([frame.width, RUG_THICKNESS_MM, frame.depth], [0, 0, 0], fabric, 4));
  group.add(createBox([frame.width - 2 * RUG_BORDER_MM, RUG_THICKNESS_MM + 2, frame.depth - 2 * RUG_BORDER_MM], [RUG_BORDER_MM, 0, RUG_BORDER_MM], rug, 3));
  return group;
}

export function buildRugRound(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { rug, fabric } = context.materials;
  const group = new THREE.Group();
  const center: [number, number] = [frame.width / 2, frame.depth / 2];
  group.add(createRod(frame.width / 2, RUG_THICKNESS_MM, [center[0], RUG_THICKNESS_MM / 2, center[1]], 'y', fabric));
  group.add(createRod(frame.width / 2 - RUG_BORDER_MM, RUG_THICKNESS_MM + 2, [center[0], (RUG_THICKNESS_MM + 2) / 2, center[1]], 'y', rug));
  return group;
}

export function buildFloorLamp(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steelDark, lampShade } = context.materials;
  const group = new THREE.Group();
  const center: [number, number] = [frame.width / 2, frame.depth / 2];
  group.add(createRod(frame.width * 0.35, LAMP_BASE_HEIGHT_MM, [center[0], LAMP_BASE_HEIGHT_MM / 2, center[1]], 'y', steelDark));
  group.add(createRod(LAMP_POLE_RADIUS_MM, frame.height - LAMP_SHADE_HEIGHT_MM, [center[0], (frame.height - LAMP_SHADE_HEIGHT_MM) / 2, center[1]], 'y', steelDark));
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(frame.width * 0.3 * MM, frame.width * 0.5 * MM, LAMP_SHADE_HEIGHT_MM * MM, 28, 1, true), lampShade);
  shade.position.set(center[0] * MM, (frame.height - LAMP_SHADE_HEIGHT_MM / 2) * MM, center[1] * MM);
  group.add(shade);
  return group;
}

export function buildTrashBin(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, steelDark, rubber } = context.materials;
  const group = new THREE.Group();
  const center: [number, number] = [frame.width / 2, frame.depth / 2];
  const radius = frame.width / 2;
  group.add(createRod(radius, frame.height - BIN_LID_MM, [center[0], (frame.height - BIN_LID_MM) / 2, center[1]], 'y', steel));
  group.add(createRod(radius + 3, BIN_LID_MM, [center[0], frame.height - BIN_LID_MM / 2, center[1]], 'y', steelDark));
  group.add(createBox([60, BIN_PEDAL_MM, 40], [center[0] - 30, 0, center[1] + radius - 10], rubber));
  return group;
}

export function buildCurtain(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { chrome, curtain } = context.materials;
  const group = new THREE.Group();
  const top = frame.elevation + frame.height;
  const hangZ = frame.depth - CURTAIN_FRONT_MARGIN_MM;
  group.add(createRod(CURTAIN_ROD_MM / 2, frame.width, [frame.width / 2, top, hangZ], 'x', chrome));
  const folds = Math.max(2, Math.round(frame.width / CURTAIN_FOLD_WIDTH_MM));
  const foldWidth = frame.width / folds;
  const length = frame.height - CURTAIN_ROD_DROP_MM;
  const drapery = new THREE.Group();
  for (let fold = 0; fold < folds; fold += 1) {
    const z = hangZ + (fold % 2 === 0 ? -CURTAIN_FOLD_OFFSET_MM : CURTAIN_FOLD_OFFSET_MM);
    const panel = createBox([foldWidth + 2 * CURTAIN_FOLD_OVERLAP_MM, length, 6], [fold * foldWidth - CURTAIN_FOLD_OVERLAP_MM, frame.elevation, z], curtain);
    drapery.add(panel);
  }
  const key = context.item.module.id;
  group.add(wrapOpenable(drapery, [0, 0, hangZ], { key: `${key}:curtain`, kind: 'curtain', hingeSign: 1 }));
  return group;
}
