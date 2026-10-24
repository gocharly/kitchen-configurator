import * as THREE from 'three';
import { createBox } from '../cabinetFronts';
import { createRod, type ModelContext, type ModelFrame } from '../appliances/applianceShapes';
import { listCornerOffsets } from './furnitureShapes';

const PANEL_MM = 22;
const BACK_PANEL_MM = 8;
const SHELF_SPACING_MM = 360;
const FOOT_HEIGHT_MM = 60;
const TROLLEY_POST_RADIUS_MM = 12;
const TROLLEY_WHEEL_RADIUS_MM = 34;
const TROLLEY_WHEEL_WIDTH_MM = 22;
const TROLLEY_TOP_MM = 34;
const TROLLEY_SHELF_MM = 18;
const TROLLEY_POST_INSET_MM = 30;
const RACK_COLUMNS = 4;
const RACK_BOTTLE_RADIUS_MM = 38;
const RACK_BAR_MM = 20;

export function buildOpenShelving(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, woodDark } = context.materials;
  const group = new THREE.Group();
  const innerWidth = frame.width - 2 * PANEL_MM;
  const innerHeight = frame.height - FOOT_HEIGHT_MM;
  group.add(createBox([frame.width, FOOT_HEIGHT_MM - 8, frame.depth - 40], [0, 0, 20], woodDark));
  [0, frame.width - PANEL_MM].forEach((x) => group.add(createBox([PANEL_MM, innerHeight, frame.depth], [x, FOOT_HEIGHT_MM, 0], wood)));
  const shelfCount = Math.max(2, Math.round(innerHeight / SHELF_SPACING_MM));
  for (let shelf = 0; shelf <= shelfCount; shelf += 1) {
    const y = FOOT_HEIGHT_MM + ((innerHeight - PANEL_MM) * shelf) / shelfCount;
    group.add(createBox([innerWidth, PANEL_MM, frame.depth - BACK_PANEL_MM], [PANEL_MM, y, BACK_PANEL_MM], wood));
  }
  group.add(createBox([innerWidth, innerHeight - 2 * PANEL_MM, BACK_PANEL_MM], [PANEL_MM, FOOT_HEIGHT_MM + PANEL_MM, 0], woodDark));
  return group;
}

function buildTrolleyWheels(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { rubber } = context.materials;
  const group = new THREE.Group();
  listCornerOffsets(frame.width, frame.depth, TROLLEY_POST_INSET_MM).forEach(([x, z]) => {
    const wheel = createRod(TROLLEY_WHEEL_RADIUS_MM, TROLLEY_WHEEL_WIDTH_MM, [x, TROLLEY_WHEEL_RADIUS_MM, z], 'x', rubber);
    group.add(wheel);
  });
  return group;
}

export function buildTrolley(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, steelDark } = context.materials;
  const group = new THREE.Group();
  const postBottom = 2 * TROLLEY_WHEEL_RADIUS_MM;
  const postHeight = frame.height - TROLLEY_TOP_MM - postBottom;
  listCornerOffsets(frame.width, frame.depth, TROLLEY_POST_INSET_MM).forEach(([x, z]) => {
    group.add(createRod(TROLLEY_POST_RADIUS_MM, postHeight, [x, postBottom + postHeight / 2, z], 'y', steelDark));
  });
  group.add(createBox([frame.width, TROLLEY_TOP_MM, frame.depth], [0, frame.height - TROLLEY_TOP_MM, 0], wood, 4));
  [postBottom + 80, postBottom + postHeight / 2 + 40].forEach((y) => {
    group.add(createBox([frame.width - 2 * TROLLEY_POST_INSET_MM, TROLLEY_SHELF_MM, frame.depth - 2 * TROLLEY_POST_INSET_MM], [TROLLEY_POST_INSET_MM, y, TROLLEY_POST_INSET_MM], wood, 3));
  });
  group.add(buildTrolleyWheels(frame, context));
  return group;
}

export function buildWineRack(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { woodDark, bottleGlass } = context.materials;
  const group = new THREE.Group();
  const rowCount = Math.max(2, Math.round(frame.height / (2 * RACK_BOTTLE_RADIUS_MM + RACK_BAR_MM)));
  const cellHeight = (frame.height - PANEL_MM) / rowCount;
  const cellWidth = (frame.width - 2 * PANEL_MM) / RACK_COLUMNS;
  [0, frame.width - PANEL_MM].forEach((x) => group.add(createBox([PANEL_MM, frame.height, frame.depth], [x, 0, 0], woodDark)));
  for (let row = 0; row <= rowCount; row += 1) group.add(createBox([frame.width, PANEL_MM, frame.depth], [0, row * cellHeight, 0], woodDark));
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < RACK_COLUMNS; column += 1) {
      const x = PANEL_MM + (column + 0.5) * cellWidth;
      const y = row * cellHeight + PANEL_MM + (cellHeight - PANEL_MM) / 2;
      const bottle = createRod(RACK_BOTTLE_RADIUS_MM, frame.depth - 40, [x, y, frame.depth / 2], 'z', bottleGlass);
      group.add(bottle);
    }
  }
  return group;
}

const WALL_SHELF_THICKNESS_MM = 32;
const RAIL_ROD_RADIUS_MM = 9;
const RAIL_BRACKET_MM = 14;
const RAIL_BRACKET_DEPTH_MM = 90;
const RAIL_HOOK_SPACING_MM = 140;
const RAIL_HOOK_DROP_MM = 70;
const RAIL_HOOK_RADIUS_MM = 3;
const RAIL_HOOK_MARGIN_MM = 120;

export function buildWallShelf(frame: ModelFrame, context: ModelContext): THREE.Group {
  const group = new THREE.Group();
  group.add(createBox([frame.width, WALL_SHELF_THICKNESS_MM, frame.depth], [0, frame.elevation + frame.height - WALL_SHELF_THICKNESS_MM, 0], context.materials.wood, 3));
  return group;
}

export function buildHangingRail(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { chrome } = context.materials;
  const group = new THREE.Group();
  const y = frame.elevation + frame.height / 2;
  group.add(createRod(RAIL_ROD_RADIUS_MM, frame.width, [frame.width / 2, y, RAIL_BRACKET_DEPTH_MM], 'x', chrome));
  [RAIL_BRACKET_MM, frame.width - 2 * RAIL_BRACKET_MM].forEach((x) => group.add(createBox([RAIL_BRACKET_MM, RAIL_BRACKET_MM, RAIL_BRACKET_DEPTH_MM], [x, y - RAIL_BRACKET_MM / 2, 0], chrome)));
  for (let x = RAIL_HOOK_MARGIN_MM; x <= frame.width - RAIL_HOOK_MARGIN_MM; x += RAIL_HOOK_SPACING_MM) {
    group.add(createRod(RAIL_HOOK_RADIUS_MM, RAIL_HOOK_DROP_MM, [x, y - RAIL_HOOK_DROP_MM / 2, RAIL_BRACKET_DEPTH_MM], 'y', chrome));
  }
  return group;
}
