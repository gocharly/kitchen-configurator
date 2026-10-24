import * as THREE from 'three';
import { createBox, type Materials } from '../cabinetFronts';
import { wrapOpenable } from '../openablePanels';
import {
  createFlatRing,
  createLinedShell,
  createPlinth,
  createRod,
  createTubeHandle,
  type ApplianceContext,
  type ApplianceFrame,
  type Vec3,
} from './applianceShapes';

const SIDE_GAP_MM = 2;
const HOB_PLATE_MM = 14;
const PANEL_HEIGHT_MM = 100;
const DOOR_THICKNESS_MM = 34;
const DOOR_LIFT_MM = 8;
const DOOR_TOP_GAP_MM = 4;
const GLASS_SIDE_MARGIN_MM = 60;
const GLASS_BOTTOM_MARGIN_MM = 50;
const GLASS_TOP_MARGIN_MM = 130;
const OVEN_WALL_MM = 40;
const OVEN_RACK_RATIO = 0.35;
const PLINTH_DEPTH_INSET_MM = 50;
const KNOB_COUNT = 5;
const UPSTAND_HEIGHT_MM = 50;
const UPSTAND_DEPTH_MM = 12;
const GRATE_LIFT_MM = 18;
const GRATE_HEIGHT_MM = 14;
const GRATE_RAIL_MM = 9;
const GRATE_EDGE_MM = 40;
const GRATE_FRONT_MARGIN_MM = 45;
const FRONT_BURNER_RATIO = 0.3;
const REAR_BURNER_RATIO = 0.72;
const LEFT_COLUMN_RATIO = 0.25;
const RIGHT_COLUMN_RATIO = 0.75;

interface StoveLayout {
  x: number;
  width: number;
  panelBottom: number;
  hobTop: number;
}

interface StoveStyle {
  body: THREE.Material;
  door: THREE.Material;
  plate: THREE.Material;
  buildHob: (frame: ApplianceFrame, layout: StoveLayout, materials: Materials) => THREE.Group;
}

interface BurnerSpec {
  column: number;
  row: number;
  radius: number;
}

const BURNERS: BurnerSpec[] = [
  { column: LEFT_COLUMN_RATIO, row: FRONT_BURNER_RATIO, radius: 38 },
  { column: LEFT_COLUMN_RATIO, row: REAR_BURNER_RATIO, radius: 48 },
  { column: RIGHT_COLUMN_RATIO, row: FRONT_BURNER_RATIO, radius: 48 },
  { column: RIGHT_COLUMN_RATIO, row: REAR_BURNER_RATIO, radius: 38 },
];

function measureLayout(frame: ApplianceFrame): StoveLayout {
  const hobTop = frame.elevation + frame.height;
  return {
    x: SIDE_GAP_MM,
    width: frame.width - 2 * SIDE_GAP_MM,
    panelBottom: hobTop - HOB_PLATE_MM - PANEL_HEIGHT_MM,
    hobTop,
  };
}

function buildOvenChamber(frame: ApplianceFrame, layout: StoveLayout, style: StoveStyle, materials: Materials): THREE.Group {
  const height = layout.panelBottom - frame.elevation;
  const group = new THREE.Group();
  group.add(createLinedShell([layout.width, height, frame.depth - DOOR_THICKNESS_MM], [layout.x, frame.elevation, 0], OVEN_WALL_MM, { shell: style.body, liner: materials.recess }));
  const rackWidth = layout.width - 2 * OVEN_WALL_MM - 8;
  const rackDepth = frame.depth - DOOR_THICKNESS_MM - OVEN_WALL_MM - 30;
  group.add(createBox([rackWidth, 3, rackDepth], [layout.x + OVEN_WALL_MM + 4, frame.elevation + height * OVEN_RACK_RATIO, OVEN_WALL_MM + 10], materials.steelDark));
  return group;
}

function buildStoveBody(frame: ApplianceFrame, layout: StoveLayout, style: StoveStyle, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(createPlinth(frame.width - 3, frame.depth - PLINTH_DEPTH_INSET_MM, frame.elevation, materials.recess));
  group.add(buildOvenChamber(frame, layout, style, materials));
  group.add(createBox([layout.width, PANEL_HEIGHT_MM, frame.depth], [layout.x, layout.panelBottom, 0], style.body, 2));
  group.add(createBox([layout.width, HOB_PLATE_MM, frame.depth], [layout.x, layout.hobTop - HOB_PLATE_MM, 0], style.plate, 2));
  return group;
}

function buildKnobs(frame: ApplianceFrame, layout: StoveLayout, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const y = layout.panelBottom + PANEL_HEIGHT_MM / 2;
  for (let index = 0; index < KNOB_COUNT; index += 1) {
    const x = layout.x + (layout.width * (index + 0.5)) / KNOB_COUNT;
    group.add(createRod(26, 3, [x, y, frame.depth + 1.5], 'z', materials.steelDark));
    group.add(createRod(19, 26, [x, y, frame.depth + 13], 'z', materials.steelDark));
    group.add(createRod(14, 2, [x, y, frame.depth + 26], 'z', materials.chrome));
  }
  return group;
}

function buildOvenDoor(frame: ApplianceFrame, layout: StoveLayout, style: StoveStyle, context: ApplianceContext): THREE.Group {
  const { materials, item } = context;
  const bottom = frame.elevation + DOOR_LIFT_MM;
  const height = layout.panelBottom - DOOR_TOP_GAP_MM - bottom;
  const width = layout.width - 4;
  const centerX = layout.x + layout.width / 2;
  const leaf = new THREE.Group();
  leaf.add(createBox([width, height, DOOR_THICKNESS_MM], [layout.x + 2, bottom, frame.depth - DOOR_THICKNESS_MM], style.door, 2));
  const glassSize: Vec3 = [width - 2 * GLASS_SIDE_MARGIN_MM, height - GLASS_TOP_MARGIN_MM - GLASS_BOTTOM_MARGIN_MM, 4];
  leaf.add(createBox(glassSize, [layout.x + 2 + GLASS_SIDE_MARGIN_MM, bottom + GLASS_BOTTOM_MARGIN_MM, frame.depth - 2], materials.blackGlass));
  leaf.add(createTubeHandle([centerX, bottom + height - 55, frame.depth], width - 80, 'x', materials.steel));
  const pivot: Vec3 = [centerX, bottom, frame.depth - DOOR_THICKNESS_MM / 2];
  return wrapOpenable(leaf, pivot, { key: `${item.module.id}:door`, kind: 'hatch', hingeSign: 1 });
}

function buildBurner(center: [number, number], radius: number, surface: number, materials: Materials): THREE.Group {
  const [x, z] = center;
  const group = new THREE.Group();
  group.add(createRod(radius, 6, [x, surface + 3, z], 'y', materials.steelDark));
  group.add(createRod(radius * 0.62, 12, [x, surface + 9, z], 'y', materials.castIron));
  return group;
}

interface GrateSpan {
  x: number;
  width: number;
  z: number;
  depth: number;
  burnerZs: number[];
}

function buildGrate(span: GrateSpan, surface: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const y = surface + GRATE_LIFT_MM;
  const bar = (size: Vec3, origin: Vec3) => group.add(createBox(size, origin, materials.castIron));
  const centerX = span.x + span.width / 2;
  bar([span.width, GRATE_HEIGHT_MM, GRATE_RAIL_MM], [span.x, y, span.z]);
  bar([span.width, GRATE_HEIGHT_MM, GRATE_RAIL_MM], [span.x, y, span.z + span.depth - GRATE_RAIL_MM]);
  bar([GRATE_RAIL_MM, GRATE_HEIGHT_MM, span.depth], [span.x, y, span.z]);
  bar([GRATE_RAIL_MM, GRATE_HEIGHT_MM, span.depth], [span.x + span.width - GRATE_RAIL_MM, y, span.z]);
  bar([GRATE_RAIL_MM, GRATE_HEIGHT_MM, span.depth], [centerX - GRATE_RAIL_MM / 2, y, span.z]);
  span.burnerZs.forEach((z) => bar([span.width, GRATE_HEIGHT_MM, GRATE_RAIL_MM], [span.x, y, z - GRATE_RAIL_MM / 2]));
  return group;
}

function buildGasHob(frame: ApplianceFrame, layout: StoveLayout, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  group.add(createBox([layout.width, UPSTAND_HEIGHT_MM, UPSTAND_DEPTH_MM], [layout.x, layout.hobTop, 0], materials.steel, 2));
  BURNERS.forEach((burner) => {
    const center: [number, number] = [layout.x + layout.width * burner.column, frame.depth * burner.row];
    group.add(buildBurner(center, burner.radius, layout.hobTop, materials));
  });
  [LEFT_COLUMN_RATIO, RIGHT_COLUMN_RATIO].forEach((column) => {
    const width = layout.width / 2 - GRATE_EDGE_MM;
    const burnerZs = [frame.depth * FRONT_BURNER_RATIO, frame.depth * REAR_BURNER_RATIO];
    const span = { x: layout.x + layout.width * column - width / 2, width, z: GRATE_FRONT_MARGIN_MM, depth: frame.depth - 2 * GRATE_FRONT_MARGIN_MM, burnerZs };
    group.add(buildGrate(span, layout.hobTop, materials));
  });
  return group;
}

function buildGlassHob(frame: ApplianceFrame, layout: StoveLayout, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  BURNERS.forEach((burner) => {
    const center: Vec3 = [layout.x + layout.width * burner.column, layout.hobTop + 0.5, frame.depth * burner.row];
    group.add(createFlatRing(burner.radius * 1.6, burner.radius * 1.6 + 2, center, materials.chrome));
    group.add(createFlatRing(burner.radius * 0.9, burner.radius * 0.9 + 2, center, materials.chrome));
  });
  return group;
}

function buildStove(frame: ApplianceFrame, context: ApplianceContext, style: StoveStyle): THREE.Group {
  const { materials } = context;
  const layout = measureLayout(frame);
  const group = new THREE.Group();
  group.add(buildStoveBody(frame, layout, style, materials));
  group.add(style.buildHob(frame, layout, materials));
  group.add(buildKnobs(frame, layout, materials));
  group.add(buildOvenDoor(frame, layout, style, context));
  return group;
}

export function buildGasStove(frame: ApplianceFrame, context: ApplianceContext): THREE.Group {
  const { steel } = context.materials;
  return buildStove(frame, context, { body: steel, door: steel, plate: steel, buildHob: buildGasHob });
}

export function buildElectricStove(frame: ApplianceFrame, context: ApplianceContext): THREE.Group {
  const { enamel, blackGlass } = context.materials;
  return buildStove(frame, context, { body: enamel, door: enamel, plate: blackGlass, buildHob: buildGlassHob });
}
