import * as THREE from 'three';
import { FACADE_THICKNESS_MM, buildFront, createBox, type Materials } from '../cabinetFronts';
import { wrapOpenable } from '../openablePanels';
import {
  createLinedShell,
  createPlinth,
  createTubeHandle,
  type ModelContext,
  type ModelFrame,
  type Vec3,
} from './applianceShapes';

const SIDE_GAP_MM = 2;
const DOOR_GAP_MM = 3;
const DOOR_THICKNESS_MM = 50;
const GASKET_THICKNESS_MM = 6;
const GASKET_WIDTH_MM = 14;
const GASKET_INSET_MM = 12;
const BODY_WALL_MM = 20;
const SHELF_SPACING_MM = 320;
const SHELF_THICKNESS_MM = 4;
const SHELF_BACK_GAP_MM = 30;
const SHELF_FRONT_GAP_MM = 40;
const BIN_DEPTH_MM = 44;
const BIN_HEIGHT_MM = 60;
const BIN_SIDE_MARGIN_MM = 35;
const TALL_DOOR_MM = 900;
const BIN_MIN_DOOR_MM = 300;
const HANDLE_EDGE_MM = 38;
const FREEZER_RATIO = 0.3;
const DISPENSER_WIDTH_MM = 150;
const DISPENSER_HEIGHT_MM = 320;
const DISPENSER_BOTTOM_MM = 1180;
const HINGE_DEPTH_MM = DOOR_THICKNESS_MM / 2;
const PLINTH_DEPTH_INSET_MM = 60;

interface FridgeDoor {
  x: number;
  width: number;
  y: number;
  height: number;
  hinge: 'left' | 'right';
  handleLength: number;
  handleY: number;
  hasDispenser?: boolean;
}

interface FridgeStyle {
  shell: THREE.Material;
  door: THREE.Material;
  plinth: number;
}

function buildShelves(frame: ModelFrame, bottom: number, bodyDepth: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const height = frame.elevation + frame.height - bottom;
  const count = Math.max(0, Math.round(height / SHELF_SPACING_MM) - 1);
  const width = frame.width - 2 * (SIDE_GAP_MM + BODY_WALL_MM) - 4;
  for (let shelf = 1; shelf <= count; shelf += 1) {
    const y = bottom + (height * shelf) / (count + 1);
    group.add(createBox([width, SHELF_THICKNESS_MM, bodyDepth - SHELF_BACK_GAP_MM - SHELF_FRONT_GAP_MM], [SIDE_GAP_MM + BODY_WALL_MM + 2, y, SHELF_BACK_GAP_MM], materials.glass));
  }
  return group;
}

function buildFridgeBody(frame: ModelFrame, bodyDepth: number, style: FridgeStyle, materials: Materials): THREE.Group {
  const bottom = frame.elevation + style.plinth;
  const size: Vec3 = [frame.width - 2 * SIDE_GAP_MM, frame.height - style.plinth, bodyDepth];
  const group = new THREE.Group();
  if (style.plinth > 0) group.add(createPlinth(frame.width - 3, frame.depth - PLINTH_DEPTH_INSET_MM, style.plinth, materials.recess));
  group.add(createLinedShell(size, [SIDE_GAP_MM, bottom, 0], BODY_WALL_MM, { shell: style.shell, liner: materials.enamel }));
  group.add(buildShelves(frame, bottom, bodyDepth, materials));
  return group;
}

function buildGasket(door: FridgeDoor, frontZ: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const z = frontZ - DOOR_THICKNESS_MM - GASKET_THICKNESS_MM;
  const x = door.x + GASKET_INSET_MM;
  const y = door.y + GASKET_INSET_MM;
  const width = door.width - 2 * GASKET_INSET_MM;
  const height = door.height - 2 * GASKET_INSET_MM;
  const strip = (size: Vec3, origin: Vec3) => group.add(createBox(size, origin, materials.rubber));
  strip([width, GASKET_WIDTH_MM, GASKET_THICKNESS_MM], [x, y, z]);
  strip([width, GASKET_WIDTH_MM, GASKET_THICKNESS_MM], [x, y + height - GASKET_WIDTH_MM, z]);
  strip([GASKET_WIDTH_MM, height - 2 * GASKET_WIDTH_MM, GASKET_THICKNESS_MM], [x, y + GASKET_WIDTH_MM, z]);
  strip([GASKET_WIDTH_MM, height - 2 * GASKET_WIDTH_MM, GASKET_THICKNESS_MM], [x + width - GASKET_WIDTH_MM, y + GASKET_WIDTH_MM, z]);
  return group;
}

function countBins(door: FridgeDoor): number {
  if (door.height > TALL_DOOR_MM) return 3;
  return door.height > BIN_MIN_DOOR_MM ? 1 : 0;
}

function buildDoorBins(door: FridgeDoor, frontZ: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const count = countBins(door);
  for (let bin = 0; bin < count; bin += 1) {
    const y = door.y + (door.height * (bin + 1)) / (count + 1);
    const origin: Vec3 = [door.x + BIN_SIDE_MARGIN_MM, y, frontZ - DOOR_THICKNESS_MM - GASKET_THICKNESS_MM - BIN_DEPTH_MM];
    group.add(createBox([door.width - 2 * BIN_SIDE_MARGIN_MM, BIN_HEIGHT_MM, BIN_DEPTH_MM], origin, materials.enamel));
  }
  return group;
}

function buildDispenser(door: FridgeDoor, frontZ: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const x = door.x + (door.width - DISPENSER_WIDTH_MM) / 2;
  group.add(createBox([DISPENSER_WIDTH_MM, DISPENSER_HEIGHT_MM, 4], [x, DISPENSER_BOTTOM_MM, frontZ - 2], materials.blackGlass, 2));
  group.add(createBox([DISPENSER_WIDTH_MM - 50, 10, 34], [x + 25, DISPENSER_BOTTOM_MM + 60, frontZ], materials.steelDark));
  return group;
}

function buildFridgeDoor(door: FridgeDoor, frame: ModelFrame, style: FridgeStyle, context: ModelContext, index: number): THREE.Group {
  const { materials, item } = context;
  const leaf = new THREE.Group();
  leaf.add(createBox([door.width, door.height, DOOR_THICKNESS_MM], [door.x, door.y, frame.depth - DOOR_THICKNESS_MM], style.door, 4));
  leaf.add(buildGasket(door, frame.depth, materials), buildDoorBins(door, frame.depth, materials));
  if (door.hasDispenser) leaf.add(buildDispenser(door, frame.depth, materials));
  const handleX = door.hinge === 'left' ? door.x + door.width - HANDLE_EDGE_MM : door.x + HANDLE_EDGE_MM;
  leaf.add(createTubeHandle([handleX, door.handleY, frame.depth], door.handleLength, 'y', materials.steel));
  const hingeX = door.hinge === 'left' ? door.x : door.x + door.width;
  const pivot: Vec3 = [hingeX, door.y, frame.depth - HINGE_DEPTH_MM];
  return wrapOpenable(leaf, pivot, { key: `${item.module.id}:door${index}`, kind: 'door', hingeSign: door.hinge === 'left' ? 1 : -1 });
}

function buildFridge(frame: ModelFrame, context: ModelContext, style: FridgeStyle, doors: FridgeDoor[]): THREE.Group {
  const group = new THREE.Group();
  group.add(buildFridgeBody(frame, frame.depth - DOOR_THICKNESS_MM - GASKET_THICKNESS_MM, style, context.materials));
  doors.forEach((door, index) => group.add(buildFridgeDoor(door, frame, style, context, index)));
  return group;
}

function layoutFreezerOnTop(frame: ModelFrame, plinth: number): FridgeDoor[] {
  const bottom = frame.elevation + plinth + DOOR_GAP_MM;
  const total = frame.height - plinth - 2 * DOOR_GAP_MM;
  const freezerHeight = Math.round(total * FREEZER_RATIO) - DOOR_GAP_MM / 2;
  const fridgeHeight = total - freezerHeight - DOOR_GAP_MM;
  const base = { x: SIDE_GAP_MM, width: frame.width - 2 * SIDE_GAP_MM, hinge: 'left' as const };
  return [
    { ...base, y: bottom + fridgeHeight + DOOR_GAP_MM, height: freezerHeight, handleLength: 220, handleY: bottom + fridgeHeight + DOOR_GAP_MM + 130 },
    { ...base, y: bottom, height: fridgeHeight, handleLength: 420, handleY: bottom + fridgeHeight - 260 },
  ];
}

function layoutSideBySide(frame: ModelFrame, plinth: number): FridgeDoor[] {
  const y = frame.elevation + plinth + DOOR_GAP_MM;
  const height = frame.height - plinth - 2 * DOOR_GAP_MM;
  const width = (frame.width - 2 * SIDE_GAP_MM - DOOR_GAP_MM) / 2;
  const common = { y, height, width, handleLength: 700, handleY: y + height * 0.55 };
  return [
    { ...common, x: SIDE_GAP_MM, hinge: 'left', hasDispenser: true },
    { ...common, x: SIDE_GAP_MM + width + DOOR_GAP_MM, hinge: 'right' },
  ];
}

function layoutSingleDoor(frame: ModelFrame, plinth: number): FridgeDoor[] {
  const y = frame.elevation + plinth + DOOR_GAP_MM;
  const height = frame.height - plinth - 2 * DOOR_GAP_MM;
  return [{ x: SIDE_GAP_MM, width: frame.width - 2 * SIDE_GAP_MM, y, height, hinge: 'left', handleLength: 260, handleY: y + height - 170 }];
}

function layoutTallSingleDoor(frame: ModelFrame, plinth: number): FridgeDoor[] {
  const y = frame.elevation + plinth + DOOR_GAP_MM;
  const height = frame.height - plinth - 2 * DOOR_GAP_MM;
  const handleLength = Math.min(700, height * 0.4);
  return [{ x: SIDE_GAP_MM, width: frame.width - 2 * SIDE_GAP_MM, y, height, hinge: 'left', handleLength, handleY: y + height * 0.55 }];
}

export function buildTallFridge(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel } = context.materials;
  const style = { shell: steel, door: steel, plinth: 60 };
  return buildFridge(frame, context, style, layoutTallSingleDoor(frame, style.plinth));
}

export function buildFreestandingFridge(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel } = context.materials;
  const style = { shell: steel, door: steel, plinth: 60 };
  return buildFridge(frame, context, style, layoutFreezerOnTop(frame, style.plinth));
}

export function buildSideBySideFridge(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel, enamel } = context.materials;
  const style = { shell: steel, door: steel, plinth: 70 };
  const group = buildFridge(frame, context, style, layoutSideBySide(frame, style.plinth));
  const bodyDepth = frame.depth - DOOR_THICKNESS_MM - GASKET_THICKNESS_MM;
  const height = frame.height - style.plinth - 2 * BODY_WALL_MM;
  group.add(createBox([BODY_WALL_MM, height, bodyDepth - BODY_WALL_MM], [(frame.width - BODY_WALL_MM) / 2, frame.elevation + style.plinth + BODY_WALL_MM, BODY_WALL_MM], enamel));
  return group;
}

export function buildUnderCounterFridge(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steel } = context.materials;
  const style = { shell: steel, door: steel, plinth: 40 };
  return buildFridge(frame, context, style, layoutSingleDoor(frame, style.plinth));
}

export function buildBuiltInFridge(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const style = { shell: materials.body, door: materials.body, plinth: 0 };
  const group = new THREE.Group();
  group.add(buildFridgeBody(frame, frame.depth - FACADE_THICKNESS_MM, style, materials));
  group.add(buildFront(item, materials));
  return group;
}
