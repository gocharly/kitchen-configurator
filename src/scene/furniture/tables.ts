import * as THREE from 'three';
import { createBox } from '../cabinetFronts';
import { createRod, type ModelContext, type ModelFrame } from '../appliances/applianceShapes';
import { listCornerOffsets } from './furnitureShapes';

const TOP_THICKNESS_MM = 30;
const TOP_EDGE_RADIUS_MM = 5;
const LEG_SIZE_MM = 55;
const LEG_INSET_MM = 60;
const APRON_HEIGHT_MM = 70;
const APRON_THICKNESS_MM = 22;
const PEDESTAL_RADIUS_MM = 55;
const PEDESTAL_BASE_THICKNESS_MM = 28;
const PEDESTAL_BASE_RATIO = 0.55;
const BAR_LEG_RADIUS_MM = 24;
const BAR_LEG_INSET_MM = 90;
const BAR_RAIL_RADIUS_MM = 14;
const BAR_RAIL_HEIGHT_MM = 260;

function buildTableLegs(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { woodDark } = context.materials;
  const group = new THREE.Group();
  const legHeight = frame.height - TOP_THICKNESS_MM;
  const spanX = frame.width - 2 * (LEG_INSET_MM + LEG_SIZE_MM);
  const spanZ = frame.depth - 2 * (LEG_INSET_MM + LEG_SIZE_MM);
  const apronY = legHeight - APRON_HEIGHT_MM;
  const apronOffset = (LEG_SIZE_MM - APRON_THICKNESS_MM) / 2;
  [LEG_INSET_MM, frame.width - LEG_INSET_MM - LEG_SIZE_MM].forEach((x) => {
    [LEG_INSET_MM, frame.depth - LEG_INSET_MM - LEG_SIZE_MM].forEach((z) => group.add(createBox([LEG_SIZE_MM, legHeight, LEG_SIZE_MM], [x, 0, z], woodDark)));
  });
  [LEG_INSET_MM + apronOffset, frame.depth - LEG_INSET_MM - LEG_SIZE_MM + apronOffset].forEach((z) => {
    group.add(createBox([spanX, APRON_HEIGHT_MM, APRON_THICKNESS_MM], [LEG_INSET_MM + LEG_SIZE_MM, apronY, z], woodDark));
  });
  [LEG_INSET_MM + apronOffset, frame.width - LEG_INSET_MM - LEG_SIZE_MM + apronOffset].forEach((x) => {
    group.add(createBox([APRON_THICKNESS_MM, APRON_HEIGHT_MM, spanZ], [x, apronY, LEG_INSET_MM + LEG_SIZE_MM], woodDark));
  });
  return group;
}

export function buildRectTable(frame: ModelFrame, context: ModelContext): THREE.Group {
  const group = new THREE.Group();
  group.add(createBox([frame.width, TOP_THICKNESS_MM, frame.depth], [0, frame.height - TOP_THICKNESS_MM, 0], context.materials.wood, TOP_EDGE_RADIUS_MM));
  group.add(buildTableLegs(frame, context));
  return group;
}

export function buildRoundTable(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, woodDark } = context.materials;
  const group = new THREE.Group();
  const radius = frame.width / 2;
  const centerX = frame.width / 2;
  const centerZ = frame.depth / 2;
  const columnHeight = frame.height - TOP_THICKNESS_MM - PEDESTAL_BASE_THICKNESS_MM;
  group.add(createRod(radius, TOP_THICKNESS_MM, [centerX, frame.height - TOP_THICKNESS_MM / 2, centerZ], 'y', wood));
  group.add(createRod(PEDESTAL_RADIUS_MM, columnHeight, [centerX, PEDESTAL_BASE_THICKNESS_MM + columnHeight / 2, centerZ], 'y', woodDark));
  group.add(createRod(radius * PEDESTAL_BASE_RATIO, PEDESTAL_BASE_THICKNESS_MM, [centerX, PEDESTAL_BASE_THICKNESS_MM / 2, centerZ], 'y', woodDark));
  return group;
}

export function buildBarTable(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { wood, steelDark, chrome } = context.materials;
  const group = new THREE.Group();
  const legHeight = frame.height - TOP_THICKNESS_MM;
  group.add(createBox([frame.width, TOP_THICKNESS_MM, frame.depth], [0, legHeight, 0], wood, TOP_EDGE_RADIUS_MM));
  listCornerOffsets(frame.width, frame.depth, BAR_LEG_INSET_MM).forEach(([x, z]) => group.add(createRod(BAR_LEG_RADIUS_MM, legHeight, [x, legHeight / 2, z], 'y', steelDark)));
  const railLength = frame.width - 2 * BAR_LEG_INSET_MM;
  [BAR_LEG_INSET_MM, frame.depth - BAR_LEG_INSET_MM].forEach((z) => group.add(createRod(BAR_RAIL_RADIUS_MM, railLength, [frame.width / 2, BAR_RAIL_HEIGHT_MM, z], 'x', chrome)));
  return group;
}
