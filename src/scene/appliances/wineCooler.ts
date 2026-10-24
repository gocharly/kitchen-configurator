import * as THREE from 'three';
import { createBox } from '../cabinetFronts';
import { wrapOpenable } from '../openablePanels';
import { createLinedShell, createPlinth, createRod, createTubeHandle, type ModelContext, type ModelFrame, type Vec3 } from './applianceShapes';

const SIDE_GAP_MM = 2;
const PLINTH_MM = 30;
const PLINTH_INSET_MM = 60;
const BODY_WALL_MM = 20;
const DOOR_MM = 30;
const DOOR_FRAME_MM = 28;
const SHELF_COUNT = 3;
const SHELF_MM = 8;
const BOTTLE_RADIUS_MM = 36;
const BOTTLES_PER_SHELF = 5;

function buildShelvesWithBottles(frame: ModelFrame, context: ModelContext, bodyDepth: number): THREE.Group {
  const { materials } = context;
  const group = new THREE.Group();
  const inner = frame.width - 2 * (SIDE_GAP_MM + BODY_WALL_MM);
  const usable = frame.height - PLINTH_MM - 2 * BODY_WALL_MM;
  for (let shelf = 0; shelf < SHELF_COUNT; shelf += 1) {
    const y = PLINTH_MM + BODY_WALL_MM + (usable * (shelf + 0.5)) / SHELF_COUNT - BOTTLE_RADIUS_MM - SHELF_MM;
    group.add(createBox([inner, SHELF_MM, bodyDepth - 2 * BODY_WALL_MM], [SIDE_GAP_MM + BODY_WALL_MM, y, BODY_WALL_MM], materials.woodDark));
    for (let bottle = 0; bottle < BOTTLES_PER_SHELF; bottle += 1) {
      const x = SIDE_GAP_MM + BODY_WALL_MM + (inner * (bottle + 0.5)) / BOTTLES_PER_SHELF;
      group.add(createRod(BOTTLE_RADIUS_MM, bodyDepth - 3 * BODY_WALL_MM, [x, y + SHELF_MM + BOTTLE_RADIUS_MM, bodyDepth / 2], 'z', materials.bottleGlass));
    }
  }
  return group;
}

export function buildWineCooler(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const group = new THREE.Group();
  const bodyDepth = frame.depth - DOOR_MM;
  const width = frame.width - 2 * SIDE_GAP_MM;
  const doorHeight = frame.height - PLINTH_MM - 4;
  group.add(createPlinth(frame.width - 3, frame.depth - PLINTH_INSET_MM, PLINTH_MM, materials.recess));
  group.add(createLinedShell([width, frame.height - PLINTH_MM, bodyDepth], [SIDE_GAP_MM, PLINTH_MM, 0], BODY_WALL_MM, { shell: materials.steelDark, liner: materials.recess }));
  group.add(buildShelvesWithBottles(frame, context, bodyDepth));
  const leaf = new THREE.Group();
  const frameBar = (size: Vec3, origin: Vec3) => leaf.add(createBox(size, origin, materials.steelDark));
  const z = frame.depth - DOOR_MM;
  frameBar([width, DOOR_FRAME_MM, DOOR_MM], [SIDE_GAP_MM, PLINTH_MM + 2, z]);
  frameBar([width, DOOR_FRAME_MM, DOOR_MM], [SIDE_GAP_MM, PLINTH_MM + 2 + doorHeight - DOOR_FRAME_MM, z]);
  frameBar([DOOR_FRAME_MM, doorHeight - 2 * DOOR_FRAME_MM, DOOR_MM], [SIDE_GAP_MM, PLINTH_MM + 2 + DOOR_FRAME_MM, z]);
  frameBar([DOOR_FRAME_MM, doorHeight - 2 * DOOR_FRAME_MM, DOOR_MM], [SIDE_GAP_MM + width - DOOR_FRAME_MM, PLINTH_MM + 2 + DOOR_FRAME_MM, z]);
  const glass = createBox([width - 2 * DOOR_FRAME_MM, doorHeight - 2 * DOOR_FRAME_MM, 5], [SIDE_GAP_MM + DOOR_FRAME_MM, PLINTH_MM + 2 + DOOR_FRAME_MM, frame.depth - DOOR_MM / 2], materials.glass);
  glass.castShadow = false;
  leaf.add(glass);
  leaf.add(createTubeHandle([SIDE_GAP_MM + width - 45, PLINTH_MM + 2 + doorHeight / 2, frame.depth], doorHeight * 0.5, 'y', materials.steel));
  group.add(wrapOpenable(leaf, [SIDE_GAP_MM, PLINTH_MM, frame.depth - DOOR_MM / 2], { key: `${item.module.id}:door`, kind: 'door', hingeSign: 1 }));
  return group;
}
