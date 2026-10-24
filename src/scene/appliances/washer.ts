import * as THREE from 'three';
import { MM, createBox, type Materials } from '../cabinetFronts';
import { wrapOpenable } from '../openablePanels';
import { createHollowBox, createPlinth, createRing, createRod, type ModelContext, type ModelFrame, type Vec3 } from './applianceShapes';

const SIDE_GAP_MM = 2;
const PLINTH_HEIGHT_MM = 22;
const PLINTH_DEPTH_INSET_MM = 60;
const PANEL_HEIGHT_MM = 110;
const FASCIA_SETBACK_MM = 14;
const FASCIA_THICKNESS_MM = 20;
const SHELL_WALL_MM = 10;
const DOOR_RADIUS_MM = 235;
const DOOR_THICKNESS_MM = FASCIA_SETBACK_MM;
const HOLE_RADIUS_MM = 173;
const DRUM_RADIUS_MM = 165;
const DRUM_DEPTH_MM = 300;
const GLASS_RADIUS_MM = 159;
const GLASS_THICKNESS_MM = 20;
const TRIM_RADIUS_MM = 165;
const TRIM_TUBE_MM = 7;
const GASKET_RADIUS_MM = 165;
const GASKET_TUBE_MM = 16;
const DRUM_SEGMENTS = 64;

interface WasherLayout {
  x: number;
  width: number;
  bottom: number;
  height: number;
  centerX: number;
  centerY: number;
  fasciaFrontZ: number;
}

function measureLayout(frame: ModelFrame): WasherLayout {
  const height = frame.height - PLINTH_HEIGHT_MM;
  const centerY = PLINTH_HEIGHT_MM + (height - PANEL_HEIGHT_MM) / 2;
  const width = frame.width - 2 * SIDE_GAP_MM;
  return { x: SIDE_GAP_MM, width, bottom: PLINTH_HEIGHT_MM, height, centerX: frame.width / 2, centerY, fasciaFrontZ: frame.depth - FASCIA_SETBACK_MM };
}

function buildFascia(layout: WasherLayout, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(layout.width * MM, 0);
  shape.lineTo(layout.width * MM, layout.height * MM);
  shape.lineTo(0, layout.height * MM);
  const hole = new THREE.Path();
  hole.absarc((layout.centerX - layout.x) * MM, (layout.centerY - layout.bottom) * MM, HOLE_RADIUS_MM * MM, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: FASCIA_THICKNESS_MM * MM, bevelEnabled: false, curveSegments: DRUM_SEGMENTS });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(layout.x * MM, layout.bottom * MM, (layout.fasciaFrontZ - FASCIA_THICKNESS_MM) * MM);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildDrum(layout: WasherLayout, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const backZ = layout.fasciaFrontZ - FASCIA_THICKNESS_MM - DRUM_DEPTH_MM;
  const tube = new THREE.CylinderGeometry(DRUM_RADIUS_MM * MM, DRUM_RADIUS_MM * MM, DRUM_DEPTH_MM * MM, DRUM_SEGMENTS, 1, true);
  const mesh = new THREE.Mesh(tube, materials.drum);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(layout.centerX * MM, layout.centerY * MM, (backZ + DRUM_DEPTH_MM / 2) * MM);
  group.add(mesh);
  group.add(createRod(DRUM_RADIUS_MM, 4, [layout.centerX, layout.centerY, backZ + 2], 'z', materials.recess));
  group.add(createRing(GASKET_RADIUS_MM, GASKET_TUBE_MM, [layout.centerX, layout.centerY, layout.fasciaFrontZ - GASKET_TUBE_MM / 2], materials.rubber));
  return group;
}

function buildControls(layout: WasherLayout, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const y = layout.bottom + layout.height - PANEL_HEIGHT_MM / 2;
  const z = layout.fasciaFrontZ;
  group.add(createBox([150, 36, 3], [layout.x + 40, y - 18, z - 1], materials.recess));
  group.add(createBox([100, 30, 3], [layout.x + layout.width - 230, y - 15, z - 1], materials.blackGlass, 2));
  group.add(createRod(34, 14, [layout.x + layout.width - 70, y, z + 7], 'z', materials.steelDark));
  group.add(createRod(26, 2, [layout.x + layout.width - 70, y, z + 15], 'z', materials.chrome));
  return group;
}

function buildPorthole(layout: WasherLayout, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const frontZ = layout.fasciaFrontZ + DOOR_THICKNESS_MM;
  const center: Vec3 = [layout.centerX, layout.centerY, frontZ];
  const leaf = new THREE.Group();
  leaf.add(createRod(DOOR_RADIUS_MM, DOOR_THICKNESS_MM, [center[0], center[1], frontZ - DOOR_THICKNESS_MM / 2], 'z', materials.enamel));
  leaf.add(createRing(TRIM_RADIUS_MM, TRIM_TUBE_MM, center, materials.chrome));
  leaf.add(createRod(GLASS_RADIUS_MM, GLASS_THICKNESS_MM, [center[0], center[1], frontZ - 4], 'z', materials.blackGlass));
  const pivot: Vec3 = [layout.centerX - DOOR_RADIUS_MM, layout.centerY, frontZ - DOOR_THICKNESS_MM / 2];
  return wrapOpenable(leaf, pivot, { key: `${item.module.id}:door`, kind: 'door', hingeSign: 1 });
}

export function buildWasher(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials } = context;
  const layout = measureLayout(frame);
  const group = new THREE.Group();
  group.add(createPlinth(frame.width - 3, frame.depth - PLINTH_DEPTH_INSET_MM, PLINTH_HEIGHT_MM, materials.recess));
  const shellDepth = layout.fasciaFrontZ - FASCIA_THICKNESS_MM;
  group.add(createHollowBox([layout.width, layout.height, shellDepth], [layout.x, layout.bottom, 0], SHELL_WALL_MM, materials.enamel));
  group.add(buildFascia(layout, materials.enamel), buildDrum(layout, materials));
  group.add(buildControls(layout, materials), buildPorthole(layout, context));
  return group;
}
