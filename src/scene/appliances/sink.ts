import * as THREE from 'three';
import { COUNTERTOP_THICKNESS_MM } from '../../domain/catalog';
import { COUNTERTOP_EDGE_RADIUS_MM, MM, createBox, type Materials } from '../cabinetFronts';
import { createRod, type Vec3 } from './applianceShapes';
import { measureSinkHole, type SinkHole } from './sinkHole';

const SLAB_BEVEL_SEGMENTS = 2;
const BOWL_DEPTH_MM = 180;
const BOWL_WALL_MM = 3;
const RIM_WIDTH_MM = 8;
const RIM_HEIGHT_MM = 2;
const DRAIN_RADIUS_MM = 28;
const FAUCET_BASE_RADIUS_MM = 22;
const FAUCET_BASE_HEIGHT_MM = 14;
const FAUCET_RISER_RADIUS_MM = 13;
const FAUCET_RISER_HEIGHT_MM = 220;
const FAUCET_SPOUT_RADIUS_MM = 11;
const FAUCET_LEVER_RADIUS_MM = 7;
const FAUCET_LEVER_LENGTH_MM = 70;
const SPOUT_PATH_MM: Vec3[] = [
  [0, 230, 0],
  [0, 300, 8],
  [0, 335, 50],
  [0, 336, 130],
  [0, 318, 190],
  [0, 280, 205],
  [0, 240, 208],
];

function buildBowl(hole: SinkHole, surfaceY: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const floorY = surfaceY - BOWL_DEPTH_MM;
  const inner = hole.width - 2 * BOWL_WALL_MM;
  const wall = (size: Vec3, origin: Vec3) => group.add(createBox(size, origin, materials.steel));
  wall([BOWL_WALL_MM, BOWL_DEPTH_MM, hole.depth], [hole.x, floorY, hole.z]);
  wall([BOWL_WALL_MM, BOWL_DEPTH_MM, hole.depth], [hole.x + hole.width - BOWL_WALL_MM, floorY, hole.z]);
  wall([inner, BOWL_DEPTH_MM, BOWL_WALL_MM], [hole.x + BOWL_WALL_MM, floorY, hole.z]);
  wall([inner, BOWL_DEPTH_MM, BOWL_WALL_MM], [hole.x + BOWL_WALL_MM, floorY, hole.z + hole.depth - BOWL_WALL_MM]);
  wall([inner, BOWL_WALL_MM, hole.depth - 2 * BOWL_WALL_MM], [hole.x + BOWL_WALL_MM, floorY, hole.z + BOWL_WALL_MM]);
  const drainAt: Vec3 = [hole.x + hole.width / 2, floorY + BOWL_WALL_MM + 1, hole.z + hole.depth / 2];
  group.add(createRod(DRAIN_RADIUS_MM, 2, drainAt, 'y', materials.steelDark));
  return group;
}

function buildRim(hole: SinkHole, surfaceY: number, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const rim = (size: Vec3, origin: Vec3) => group.add(createBox(size, origin, materials.steel));
  const wide = hole.width + 2 * RIM_WIDTH_MM;
  rim([wide, RIM_HEIGHT_MM, RIM_WIDTH_MM], [hole.x - RIM_WIDTH_MM, surfaceY, hole.z - RIM_WIDTH_MM]);
  rim([wide, RIM_HEIGHT_MM, RIM_WIDTH_MM], [hole.x - RIM_WIDTH_MM, surfaceY, hole.z + hole.depth]);
  rim([RIM_WIDTH_MM, RIM_HEIGHT_MM, hole.depth], [hole.x - RIM_WIDTH_MM, surfaceY, hole.z]);
  rim([RIM_WIDTH_MM, RIM_HEIGHT_MM, hole.depth], [hole.x + hole.width, surfaceY, hole.z]);
  return group;
}

function createSpoutMesh(origin: Vec3, material: THREE.Material): THREE.Mesh {
  const points = SPOUT_PATH_MM.map(([x, y, z]) => new THREE.Vector3((origin[0] + x) * MM, (origin[1] + y) * MM, (origin[2] + z) * MM));
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, FAUCET_SPOUT_RADIUS_MM * MM, 14);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  return mesh;
}

function buildFaucet(base: Vec3, material: THREE.Material): THREE.Group {
  const [x, y, z] = base;
  const group = new THREE.Group();
  group.add(createRod(FAUCET_BASE_RADIUS_MM, FAUCET_BASE_HEIGHT_MM, [x, y + FAUCET_BASE_HEIGHT_MM / 2, z], 'y', material));
  group.add(createRod(FAUCET_RISER_RADIUS_MM, FAUCET_RISER_HEIGHT_MM, [x, y + FAUCET_BASE_HEIGHT_MM + FAUCET_RISER_HEIGHT_MM / 2, z], 'y', material));
  group.add(createSpoutMesh([x, y, z], material));
  group.add(createRod(FAUCET_LEVER_RADIUS_MM, FAUCET_LEVER_LENGTH_MM, [x + 45, y + 190, z], 'x', material));
  return group;
}

function traceRectangle<T extends THREE.Path>(path: T, corners: [number, number, number, number]): T {
  const [x0, z0, x1, z1] = corners.map((value) => value * MM);
  path.moveTo(x0, z0);
  path.lineTo(x1, z0);
  path.lineTo(x1, z1);
  path.lineTo(x0, z1);
  path.closePath();
  return path;
}

function scaleUvToTile(geometry: THREE.BufferGeometry, tileMeters: number): void {
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, uv.getX(index) / tileMeters, uv.getY(index) / tileMeters);
  uv.needsUpdate = true;
}

function createSlabWithHole(span: { width: number; depth: number; top: number }, hole: SinkHole, material: THREE.MeshStandardMaterial): THREE.Mesh {
  const edge = COUNTERTOP_EDGE_RADIUS_MM;
  const outline = traceRectangle(new THREE.Shape(), [edge, edge, span.width - edge, span.depth - edge]);
  outline.holes.push(traceRectangle(new THREE.Path(), [hole.x - edge, hole.z - edge, hole.x + hole.width + edge, hole.z + hole.depth + edge]));
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: (COUNTERTOP_THICKNESS_MM - 2 * edge) * MM,
    bevelThickness: edge * MM,
    bevelSize: edge * MM,
    bevelSegments: SLAB_BEVEL_SEGMENTS,
  });
  geometry.rotateX(Math.PI / 2);
  scaleUvToTile(geometry, material.map?.userData.tileMeters ?? 1);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = (span.top + COUNTERTOP_THICKNESS_MM - edge) * MM;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function buildSinkCountertop(span: { width: number; depth: number; top: number }, materials: Materials): THREE.Group {
  const hole = measureSinkHole(span.width);
  const surfaceY = span.top + COUNTERTOP_THICKNESS_MM;
  const group = new THREE.Group();
  group.add(createSlabWithHole(span, hole, materials.countertop));
  group.add(buildBowl(hole, surfaceY, materials), buildRim(hole, surfaceY, materials));
  group.add(buildFaucet([hole.x + hole.width / 2, surfaceY, hole.z / 2], materials.chrome));
  return group;
}
