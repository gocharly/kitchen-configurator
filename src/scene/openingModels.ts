import * as THREE from 'three';
import { OPENING_SPECS, countOpeningLeaves, type Opening } from '../domain/openings';
import { HANDLE_EDGE_OFFSET_MM, HANDLE_LENGTH_MM, HANDLE_SIZE_MM, createBox, type Materials } from './cabinetFronts';

const FRAME_MM = 50;
const FRAME_DEPTH_MM = 70;
const FRAME_Z_MM = -FRAME_DEPTH_MM / 2;
const PANE_MM = 6;
const SILL_PROTRUSION_MM = 120;
const SILL_THICKNESS_MM = 30;
const SILL_BOARD_MIN_HEIGHT_MM = 300;
const SILL_BOARD_MAX_HEIGHT_MM = 1300;
const DOOR_LEAF_THICKNESS_MM = 40;
const DOOR_HANDLE_HEIGHT_MM = 1000;
const GLAZED_LEAF_FRAME_MM = 45;
const BALCONY_SILL_MM = 900;
const BALCONY_DOOR_MAX_MM = 900;
const BALCONY_WINDOW_MIN_MM = 500;
const BALCONY_STEP_MM = 50;

type Vec3 = [number, number, number];

function createFrameBar(materials: Materials, size: Vec3, origin: Vec3): THREE.Mesh {
  return createBox(size, origin, materials.openingFrame);
}

function createGlassPane(materials: Materials, size: Vec3, origin: Vec3): THREE.Mesh {
  const pane = createBox(size, origin, materials.glass);
  pane.castShadow = false;
  return pane;
}

function createDoorHandle(x: number, materials: Materials): THREE.Mesh {
  return createBox([HANDLE_SIZE_MM, HANDLE_LENGTH_MM, HANDLE_SIZE_MM], [x, DOOR_HANDLE_HEIGHT_MM, DOOR_LEAF_THICKNESS_MM / 2], materials.handle);
}

function buildWindowFrame(opening: Opening, materials: Materials): THREE.Group {
  const { width, height, sill } = opening;
  const group = new THREE.Group();
  const bar = (size: Vec3, origin: Vec3) => group.add(createFrameBar(materials, size, origin));
  const innerHeight = height - 2 * FRAME_MM;
  bar([width, FRAME_MM, FRAME_DEPTH_MM], [0, sill, FRAME_Z_MM]);
  bar([width, FRAME_MM, FRAME_DEPTH_MM], [0, sill + height - FRAME_MM, FRAME_Z_MM]);
  bar([FRAME_MM, innerHeight, FRAME_DEPTH_MM], [0, sill + FRAME_MM, FRAME_Z_MM]);
  bar([FRAME_MM, innerHeight, FRAME_DEPTH_MM], [width - FRAME_MM, sill + FRAME_MM, FRAME_Z_MM]);
  const leaves = countOpeningLeaves(opening);
  for (let divider = 1; divider < leaves; divider += 1) {
    bar([FRAME_MM, innerHeight, FRAME_DEPTH_MM], [(width * divider) / leaves - FRAME_MM / 2, sill + FRAME_MM, FRAME_Z_MM]);
  }
  return group;
}

function buildWindowSillBoard(opening: Opening, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const isBoardHeight = opening.sill >= SILL_BOARD_MIN_HEIGHT_MM && opening.sill <= SILL_BOARD_MAX_HEIGHT_MM;
  if (!isBoardHeight) return group;
  group.add(createFrameBar(materials, [opening.width + 2 * FRAME_MM, SILL_THICKNESS_MM, SILL_PROTRUSION_MM], [-FRAME_MM, opening.sill - SILL_THICKNESS_MM, 0]));
  return group;
}

function buildWindow(opening: Opening, materials: Materials): THREE.Group {
  const { width, height, sill } = opening;
  const group = new THREE.Group();
  group.add(buildWindowFrame(opening, materials));
  group.add(createGlassPane(materials, [width - 2 * FRAME_MM, height - 2 * FRAME_MM, PANE_MM], [FRAME_MM, sill + FRAME_MM, -PANE_MM / 2]));
  group.add(buildWindowSillBoard(opening, materials));
  return group;
}

function buildDoorFrame(opening: Opening, materials: Materials): THREE.Group {
  const { width, height } = opening;
  const group = new THREE.Group();
  const bar = (size: Vec3, origin: Vec3) => group.add(createFrameBar(materials, size, origin));
  bar([FRAME_MM, height, FRAME_DEPTH_MM], [0, 0, FRAME_Z_MM]);
  bar([FRAME_MM, height, FRAME_DEPTH_MM], [width - FRAME_MM, 0, FRAME_Z_MM]);
  bar([width - 2 * FRAME_MM, FRAME_MM, FRAME_DEPTH_MM], [FRAME_MM, height - FRAME_MM, FRAME_Z_MM]);
  return group;
}

function buildDoorLeaves(opening: Opening, materials: Materials): THREE.Group {
  const { width, height } = opening;
  const group = new THREE.Group();
  const leaves = countOpeningLeaves(opening);
  const leafWidth = (width - 2 * FRAME_MM) / leaves;
  for (let leaf = 0; leaf < leaves; leaf += 1) {
    const x = FRAME_MM + leaf * leafWidth;
    const isHandleOnRight = leaf < leaves / 2;
    const handleX = isHandleOnRight ? x + leafWidth - HANDLE_EDGE_OFFSET_MM : x + HANDLE_EDGE_OFFSET_MM - HANDLE_SIZE_MM;
    group.add(createBox([leafWidth, height - FRAME_MM, DOOR_LEAF_THICKNESS_MM], [x, 0, -DOOR_LEAF_THICKNESS_MM / 2], materials.doorLeaf));
    group.add(createDoorHandle(handleX, materials));
  }
  return group;
}

function measureBalconyDoorWidth(opening: Opening): number {
  const inner = opening.width - 2 * FRAME_MM;
  const half = Math.round(inner / 2 / BALCONY_STEP_MM) * BALCONY_STEP_MM;
  return Math.max(OPENING_SPECS.door.width.min - 2 * FRAME_MM, Math.min(BALCONY_DOOR_MAX_MM, half, inner - BALCONY_WINDOW_MIN_MM));
}

interface LeafRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildGlazedLeaf(rect: LeafRect, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const depth = FRAME_DEPTH_MM / 2;
  const z = -depth / 2;
  const bar = (size: Vec3, origin: Vec3) => group.add(createFrameBar(materials, size, origin));
  const sideHeight = rect.height - 2 * GLAZED_LEAF_FRAME_MM;
  bar([rect.width, GLAZED_LEAF_FRAME_MM, depth], [rect.x, rect.y, z]);
  bar([rect.width, GLAZED_LEAF_FRAME_MM, depth], [rect.x, rect.y + rect.height - GLAZED_LEAF_FRAME_MM, z]);
  bar([GLAZED_LEAF_FRAME_MM, sideHeight, depth], [rect.x, rect.y + GLAZED_LEAF_FRAME_MM, z]);
  bar([GLAZED_LEAF_FRAME_MM, sideHeight, depth], [rect.x + rect.width - GLAZED_LEAF_FRAME_MM, rect.y + GLAZED_LEAF_FRAME_MM, z]);
  const pane: Vec3 = [rect.width - 2 * GLAZED_LEAF_FRAME_MM, sideHeight, PANE_MM];
  group.add(createGlassPane(materials, pane, [rect.x + GLAZED_LEAF_FRAME_MM, rect.y + GLAZED_LEAF_FRAME_MM, -PANE_MM / 2]));
  return group;
}

function buildBalcony(opening: Opening, materials: Materials): THREE.Group {
  const { width, height } = opening;
  const group = new THREE.Group();
  const doorWidth = measureBalconyDoorWidth(opening);
  const windowX = FRAME_MM + doorWidth;
  const windowWidth = width - FRAME_MM - windowX;
  group.add(buildDoorFrame(opening, materials));
  group.add(buildGlazedLeaf({ x: FRAME_MM, y: 0, width: doorWidth, height: height - FRAME_MM }, materials));
  group.add(createDoorHandle(FRAME_MM + doorWidth - HANDLE_EDGE_OFFSET_MM, materials));
  group.add(createFrameBar(materials, [FRAME_MM, height - 2 * FRAME_MM, FRAME_DEPTH_MM], [windowX, 0, FRAME_Z_MM]));
  group.add(createFrameBar(materials, [windowWidth, BALCONY_SILL_MM, FRAME_DEPTH_MM], [windowX + FRAME_MM, 0, FRAME_Z_MM]));
  const upper: LeafRect = { x: windowX + FRAME_MM, y: BALCONY_SILL_MM, width: windowWidth - FRAME_MM, height: height - FRAME_MM - BALCONY_SILL_MM };
  group.add(buildGlazedLeaf(upper, materials));
  return group;
}

export function buildOpeningContent(opening: Opening, materials: Materials): THREE.Group {
  if (opening.kind === 'balcony') return buildBalcony(opening, materials);
  if (OPENING_SPECS[opening.kind].family === 'window') return buildWindow(opening, materials);
  const group = new THREE.Group();
  group.add(buildDoorFrame(opening, materials));
  group.add(buildDoorLeaves(opening, materials));
  return group;
}
