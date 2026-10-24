import * as THREE from 'three';
import { createBox } from '../cabinetFronts';
import { createRod, type ModelContext, type ModelFrame } from '../appliances/applianceShapes';
import { createHorizontalRing, listCornerOffsets } from './furnitureShapes';

const CHAIR_SEAT_HEIGHT_MM = 450;
const CHAIR_LEG_MM = 38;
const WOOD_SEAT_THICKNESS_MM = 36;
const PADDED_SEAT_THICKNESS_MM = 70;
const STRETCHER_MM = 22;
const STRETCHER_HEIGHT_MM = 170;
const BACK_RAIL_HEIGHT_MM = 70;
const BACK_RAIL_THICKNESS_MM = 20;
const SLAT_WIDTH_MM = 42;
const SLAT_COUNT = 4;
const SLAT_HEIGHT_MM = 240;
const BACK_CUSHION_HEIGHT_MM = 330;
const BACK_CUSHION_THICKNESS_MM = 46;
const STOOL_SEAT_THICKNESS_MM = 46;
const STOOL_LEG_RADIUS_MM = 13;
const STOOL_LEG_SPREAD_MM = 105;
const STOOL_FOOTREST_HEIGHT_MM = 270;
const STOOL_FOOTREST_RADIUS_MM = 148;
const STOOL_FOOTREST_TUBE_MM = 8;
const LOW_STOOL_LEG_RADIUS_MM = 16;
const BENCH_THICKNESS_MM = 40;
const BENCH_SIDE_INSET_MM = 70;
const BENCH_END_INSET_MM = 35;
const BENCH_SIDE_THICKNESS_MM = 36;
const SOFA_LEG_MM = 80;
const SOFA_ARM_MM = 90;
const SOFA_ARM_HEIGHT_MM = 300;
const SOFA_BASE_HEIGHT_MM = 150;
const SOFA_SEAT_HEIGHT_MM = 110;
const SOFA_BACK_DEPTH_MM = 150;
const SOFA_BACK_LIFT_MM = 40;

interface ChairStyle {
  frame: THREE.Material;
  seat: THREE.Material;
  seatThickness: number;
}

function buildChairLegs(frame: ModelFrame, style: ChairStyle): THREE.Group {
  const group = new THREE.Group();
  const seatBottom = CHAIR_SEAT_HEIGHT_MM - style.seatThickness;
  const frontZ = frame.depth - CHAIR_LEG_MM;
  const rightX = frame.width - CHAIR_LEG_MM;
  [0, rightX].forEach((x) => {
    group.add(createBox([CHAIR_LEG_MM, seatBottom, CHAIR_LEG_MM], [x, 0, frontZ], style.frame));
    group.add(createBox([CHAIR_LEG_MM, frame.height, CHAIR_LEG_MM], [x, 0, 0], style.frame));
  });
  const spanX = frame.width - 2 * CHAIR_LEG_MM;
  const spanZ = frame.depth - 2 * CHAIR_LEG_MM;
  [0, frontZ].forEach((z) => group.add(createBox([spanX, STRETCHER_MM, STRETCHER_MM], [CHAIR_LEG_MM, STRETCHER_HEIGHT_MM, z + (CHAIR_LEG_MM - STRETCHER_MM) / 2], style.frame)));
  [0, rightX].forEach((x) => group.add(createBox([STRETCHER_MM, STRETCHER_MM, spanZ], [x + (CHAIR_LEG_MM - STRETCHER_MM) / 2, STRETCHER_HEIGHT_MM, CHAIR_LEG_MM], style.frame)));
  return group;
}

function buildSlattedBack(frame: ModelFrame, style: ChairStyle): THREE.Group {
  const group = new THREE.Group();
  const inner = frame.width - 2 * CHAIR_LEG_MM;
  const topRailY = frame.height - BACK_RAIL_HEIGHT_MM;
  group.add(createBox([inner, BACK_RAIL_HEIGHT_MM, BACK_RAIL_THICKNESS_MM], [CHAIR_LEG_MM, topRailY, (CHAIR_LEG_MM - BACK_RAIL_THICKNESS_MM) / 2], style.frame));
  const gap = (inner - SLAT_COUNT * SLAT_WIDTH_MM) / (SLAT_COUNT + 1);
  const slatY = topRailY - SLAT_HEIGHT_MM;
  for (let slat = 0; slat < SLAT_COUNT; slat += 1) {
    group.add(createBox([SLAT_WIDTH_MM, SLAT_HEIGHT_MM, BACK_RAIL_THICKNESS_MM - 4], [CHAIR_LEG_MM + gap + slat * (SLAT_WIDTH_MM + gap), slatY, (CHAIR_LEG_MM - BACK_RAIL_THICKNESS_MM) / 2 + 2], style.frame));
  }
  return group;
}

export function buildWoodChair(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, woodDark } = context.materials;
  const style = { frame: woodDark, seat: wood, seatThickness: WOOD_SEAT_THICKNESS_MM };
  const group = new THREE.Group();
  group.add(buildChairLegs(frame, style), buildSlattedBack(frame, style));
  group.add(createBox([frame.width, WOOD_SEAT_THICKNESS_MM, frame.depth], [0, CHAIR_SEAT_HEIGHT_MM - WOOD_SEAT_THICKNESS_MM, 0], style.seat, 4));
  return group;
}

export function buildPaddedChair(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { steelDark, fabric } = context.materials;
  const style = { frame: steelDark, seat: fabric, seatThickness: PADDED_SEAT_THICKNESS_MM };
  const group = new THREE.Group();
  group.add(buildChairLegs(frame, style));
  group.add(createBox([frame.width, PADDED_SEAT_THICKNESS_MM, frame.depth], [0, CHAIR_SEAT_HEIGHT_MM - PADDED_SEAT_THICKNESS_MM, 0], fabric, 14));
  const cushionY = CHAIR_SEAT_HEIGHT_MM + 90;
  group.add(createBox([frame.width - 2 * CHAIR_LEG_MM + 20, BACK_CUSHION_HEIGHT_MM, BACK_CUSHION_THICKNESS_MM], [CHAIR_LEG_MM - 10, cushionY, 0], fabric, 16));
  return group;
}

function buildRoundSeatStool(frame: ModelFrame, context: ModelContext, seatThickness: number, legRadius: number): THREE.Group {
  const { leather, steelDark } = context.materials;
  const group = new THREE.Group();
  const center: [number, number] = [frame.width / 2, frame.depth / 2];
  const legHeight = frame.height - seatThickness;
  group.add(createRod(frame.width / 2, seatThickness, [center[0], frame.height - seatThickness / 2, center[1]], 'y', leather));
  const spread = Math.min(STOOL_LEG_SPREAD_MM, frame.width / 2 - 45);
  listCornerOffsets(2 * spread, 2 * spread, 0).forEach(([x, z]) => {
    group.add(createRod(legRadius, legHeight, [center[0] - spread + x, legHeight / 2, center[1] - spread + z], 'y', steelDark));
  });
  return group;
}

export function buildBarStool(frame: ModelFrame, context: ModelContext): THREE.Group {
  const group = buildRoundSeatStool(frame, context, STOOL_SEAT_THICKNESS_MM, STOOL_LEG_RADIUS_MM);
  group.add(createHorizontalRing(STOOL_FOOTREST_RADIUS_MM, STOOL_FOOTREST_TUBE_MM, [frame.width / 2, STOOL_FOOTREST_HEIGHT_MM, frame.depth / 2], context.materials.chrome));
  return group;
}

export function buildLowStool(frame: ModelFrame, context: ModelContext): THREE.Group {
  return buildRoundSeatStool(frame, context, STOOL_SEAT_THICKNESS_MM, LOW_STOOL_LEG_RADIUS_MM);
}

export function buildBench(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, woodDark } = context.materials;
  const group = new THREE.Group();
  group.add(createBox([frame.width, BENCH_THICKNESS_MM, frame.depth], [0, frame.height - BENCH_THICKNESS_MM, 0], wood, 4));
  [BENCH_SIDE_INSET_MM, frame.width - BENCH_SIDE_INSET_MM - BENCH_SIDE_THICKNESS_MM].forEach((x) => {
    group.add(createBox([BENCH_SIDE_THICKNESS_MM, frame.height - BENCH_THICKNESS_MM, frame.depth - 2 * BENCH_END_INSET_MM], [x, 0, BENCH_END_INSET_MM], woodDark));
  });
  return group;
}

export function buildKitchenSofa(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { fabric, woodDark } = context.materials;
  const group = new THREE.Group();
  const baseY = SOFA_LEG_MM;
  const seatWidth = frame.width - 2 * SOFA_ARM_MM;
  listCornerOffsets(frame.width, frame.depth, SOFA_LEG_MM).forEach(([x, z]) => group.add(createBox([40, SOFA_LEG_MM, 40], [x - 20, 0, z - 20], woodDark)));
  group.add(createBox([frame.width, SOFA_BASE_HEIGHT_MM, frame.depth], [0, baseY, 0], woodDark, 6));
  group.add(createBox([seatWidth, SOFA_SEAT_HEIGHT_MM, frame.depth - SOFA_BACK_DEPTH_MM], [SOFA_ARM_MM, baseY + SOFA_BASE_HEIGHT_MM, SOFA_BACK_DEPTH_MM], fabric, 24));
  const backBottom = baseY + SOFA_BASE_HEIGHT_MM + SOFA_BACK_LIFT_MM;
  group.add(createBox([seatWidth, frame.height - backBottom, SOFA_BACK_DEPTH_MM], [SOFA_ARM_MM, backBottom, 0], fabric, 30));
  [0, frame.width - SOFA_ARM_MM].forEach((x) => group.add(createBox([SOFA_ARM_MM, SOFA_ARM_HEIGHT_MM, frame.depth], [x, baseY + SOFA_BASE_HEIGHT_MM, 0], fabric, 24)));
  return group;
}
