import * as THREE from 'three';
import { MM, createBox } from '../cabinetFronts';
import type { ApplianceContext, ApplianceFrame } from './applianceShapes';

const CANOPY_HEIGHT_MM = 140;
const CHIMNEY_DEPTH_MM = 240;
const CHIMNEY_WIDTH_RATIO = 0.5;
const CHIMNEY_OVERLAP_MM = 2;
const FILTER_INSET_MM = 35;
const FILTER_THICKNESS_MM = 4;
const FLAT_SLAB_HEIGHT_MM = 55;
const FLAT_CHIMNEY_DEPTH_MM = 140;
const FLAT_GLASS_INSET_MM = 15;
const FLAT_GLASS_BACK_MM = 25;

function createCanopyMesh(frame: ApplianceFrame, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(frame.depth * MM, 0);
  shape.lineTo(CHIMNEY_DEPTH_MM * MM, CANOPY_HEIGHT_MM * MM);
  shape.lineTo(0, CANOPY_HEIGHT_MM * MM);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: frame.width * MM, bevelEnabled: false });
  geometry.rotateY(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(frame.width * MM, frame.elevation * MM, 0);
  mesh.castShadow = true;
  return mesh;
}

export function buildDomeHood(frame: ApplianceFrame, context: ApplianceContext): THREE.Group {
  const { steel, steelDark } = context.materials;
  const group = new THREE.Group();
  group.add(createCanopyMesh(frame, steel));
  const filterSize: [number, number, number] = [frame.width - 2 * FILTER_INSET_MM, FILTER_THICKNESS_MM, frame.depth - 2 * FILTER_INSET_MM];
  group.add(createBox(filterSize, [FILTER_INSET_MM, frame.elevation - FILTER_THICKNESS_MM + 1, FILTER_INSET_MM], steelDark));
  const chimneyWidth = frame.width * CHIMNEY_WIDTH_RATIO;
  const chimneyBottom = frame.elevation + CANOPY_HEIGHT_MM - CHIMNEY_OVERLAP_MM;
  const chimneyHeight = frame.height - CANOPY_HEIGHT_MM + CHIMNEY_OVERLAP_MM;
  group.add(createBox([chimneyWidth, chimneyHeight, CHIMNEY_DEPTH_MM], [(frame.width - chimneyWidth) / 2, chimneyBottom, 0], steel, 2));
  return group;
}

export function buildFlatHood(frame: ApplianceFrame, context: ApplianceContext): THREE.Group {
  const { steel, blackGlass } = context.materials;
  const group = new THREE.Group();
  group.add(createBox([frame.width, FLAT_SLAB_HEIGHT_MM, frame.depth], [0, frame.elevation, 0], steel, 3));
  const glassSize: [number, number, number] = [frame.width - 2 * FLAT_GLASS_INSET_MM, FILTER_THICKNESS_MM, frame.depth - FLAT_GLASS_BACK_MM - FLAT_GLASS_INSET_MM];
  group.add(createBox(glassSize, [FLAT_GLASS_INSET_MM, frame.elevation - FILTER_THICKNESS_MM + 1, FLAT_GLASS_BACK_MM], blackGlass));
  const chimneyBottom = frame.elevation + FLAT_SLAB_HEIGHT_MM - CHIMNEY_OVERLAP_MM;
  group.add(createBox([frame.width, frame.height - FLAT_SLAB_HEIGHT_MM + CHIMNEY_OVERLAP_MM, FLAT_CHIMNEY_DEPTH_MM], [0, chimneyBottom, 0], steel, 3));
  return group;
}
