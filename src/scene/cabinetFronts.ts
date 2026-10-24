import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { countDoorLeaves, type FrontBand } from '../domain/catalog';
import type { LayoutItem } from '../domain/kitchen';
import type { ApplianceMaterials } from './appliances/applianceMaterials';
import { measureSinkHole } from './appliances/sinkHole';
import type { FurnitureMaterials } from './furniture/furnitureMaterials';
import { wrapOpenable } from './openablePanels';

export const MM = 0.001;
export const COUNTERTOP_EDGE_RADIUS_MM = 3;
export const FACADE_THICKNESS_MM = 18;
export const FACADE_GAP_MM = 3;
export const HANDLE_LENGTH_MM = 140;
export const HANDLE_SIZE_MM = 12;
export const HANDLE_EDGE_OFFSET_MM = 40;
const HANDLE_ROW_OFFSET_MM = 60;
const HANDLE_BAR_RADIUS_MM = 4;
const HANDLE_POST_MM = 7;
const HANDLE_STANDOFF_MM = 22;
const HANDLE_POST_INSET_MM = 14;
const TALL_HANDLE_HEIGHT_MM = 1000;
const GLASS_FRAME_MM = 22;
const GLASS_THICKNESS_MM = 4;
const FACADE_EDGE_RADIUS_MM = 2;
const EDGE_SEGMENTS = 2;
const CARCASS_PANEL_MM = 16;
const BACK_PANEL_MM = 6;
const SHELF_SPACING_MM = 360;
const SHELF_FRONT_SETBACK_MM = 20;
const MIN_SHELF_MODULE_WIDTH_MM = 250;
const DRAWER_WALL_MM = 12;
const DRAWER_SIDE_CLEARANCE_MM = 8;
const DRAWER_BACK_GAP_MM = 60;
const DRAWER_LIFT_MM = 20;
const DRAWER_MIN_HEIGHT_MM = 60;
const DRAWER_MAX_HEIGHT_MM = 200;
const DRAWER_HEIGHT_MARGIN_MM = 60;
const UV_HASH_X = 12.9898;
const UV_HASH_Y = 78.233;
const UV_HASH_Z = 37.719;
const UV_HASH_SCALE = 43758.5453;

export interface Materials extends ApplianceMaterials, FurnitureMaterials {
  facade: THREE.MeshStandardMaterial;
  body: THREE.MeshStandardMaterial;
  handle: THREE.MeshStandardMaterial;
  recess: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  countertop: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  openingFrame: THREE.MeshStandardMaterial;
  doorLeaf: THREE.MeshStandardMaterial;
  daylight: THREE.MeshBasicMaterial;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FrontContext {
  item: LayoutItem;
  materials: Materials;
  frontZ: number;
  bandIndex: number;
}

type Vec3 = [number, number, number];

function hashToUnit(origin: Vec3): number {
  const raw = Math.sin(origin[0] * UV_HASH_X + origin[1] * UV_HASH_Y + origin[2] * UV_HASH_Z) * UV_HASH_SCALE;
  return raw - Math.floor(raw);
}

function scaleMapUv(geometry: THREE.BufferGeometry, sizeM: Vec3, tileMeters: number, offset: number): void {
  const uv = geometry.getAttribute('uv');
  const normal = geometry.getAttribute('normal');
  const [width, height, depth] = sizeM;
  for (let index = 0; index < uv.count; index += 1) {
    const [nx, ny, nz] = [Math.abs(normal.getX(index)), Math.abs(normal.getY(index)), Math.abs(normal.getZ(index))];
    const [spanU, spanV] = nx >= ny && nx >= nz ? [depth, height] : ny >= nz ? [width, depth] : [width, height];
    uv.setXY(index, (uv.getX(index) * spanU) / tileMeters + offset, (uv.getY(index) * spanV) / tileMeters + offset);
  }
  uv.needsUpdate = true;
}

export function createBox(size: Vec3, origin: Vec3, material: THREE.Material, radiusMm = 0): THREE.Mesh {
  const [width, height, depth] = size;
  const geometry =
    radiusMm > 0
      ? new RoundedBoxGeometry(width * MM, height * MM, depth * MM, EDGE_SEGMENTS, radiusMm * MM)
      : new THREE.BoxGeometry(width * MM, height * MM, depth * MM);
  const map = (material as THREE.MeshStandardMaterial).map;
  if (map) scaleMapUv(geometry, [width * MM, height * MM, depth * MM], map.userData.tileMeters ?? 1, hashToUnit(origin));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((origin[0] + width / 2) * MM, (origin[1] + height / 2) * MM, (origin[2] + depth / 2) * MM);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createBarHandle(origin: Vec3, length: number, isVertical: boolean, material: THREE.Material): THREE.Group {
  const [x, y, z] = origin;
  const group = new THREE.Group();
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(HANDLE_BAR_RADIUS_MM * MM, HANDLE_BAR_RADIUS_MM * MM, length * MM, 12),
    material,
  );
  const barZ = z + HANDLE_STANDOFF_MM;
  const center: Vec3 = isVertical
    ? [x + HANDLE_SIZE_MM / 2, y + length / 2, barZ]
    : [x + length / 2, y + HANDLE_SIZE_MM / 2, barZ];
  bar.position.set(center[0] * MM, center[1] * MM, center[2] * MM);
  if (!isVertical) bar.rotation.z = Math.PI / 2;
  bar.castShadow = true;
  group.add(bar);
  [HANDLE_POST_INSET_MM, length - HANDLE_POST_INSET_MM].forEach((along) => {
    const postOrigin: Vec3 = isVertical
      ? [center[0] - HANDLE_POST_MM / 2, y + along - HANDLE_POST_MM / 2, z]
      : [x + along - HANDLE_POST_MM / 2, center[1] - HANDLE_POST_MM / 2, z];
    group.add(createBox([HANDLE_POST_MM, HANDLE_POST_MM, HANDLE_STANDOFF_MM], postOrigin, material));
  });
  return group;
}

function pickVerticalHandleY(item: LayoutItem, lowestY: number, highestY: number): number {
  if (item.spec.row === 'upper') return lowestY;
  if (item.spec.height > TALL_HANDLE_HEIGHT_MM) return TALL_HANDLE_HEIGHT_MM;
  return highestY;
}

function placeVerticalHandle(rect: Rect, isOnRightEdge: boolean, context: FrontContext): THREE.Group {
  const { item, materials, frontZ } = context;
  const x = isOnRightEdge ? rect.x + rect.width - HANDLE_EDGE_OFFSET_MM - HANDLE_SIZE_MM : rect.x + HANDLE_EDGE_OFFSET_MM;
  const lowestY = rect.y + HANDLE_ROW_OFFSET_MM;
  const highestY = rect.y + rect.height - HANDLE_ROW_OFFSET_MM - HANDLE_LENGTH_MM;
  const preferredY = pickVerticalHandleY(item, lowestY, highestY);
  const y = Math.min(Math.max(preferredY, lowestY), Math.max(lowestY, highestY));
  return createBarHandle([x, y, frontZ], HANDLE_LENGTH_MM, true, materials.handle);
}

function placeHorizontalHandle(rect: Rect, isAtTop: boolean, context: FrontContext): THREE.Group {
  const x = rect.x + (rect.width - HANDLE_LENGTH_MM) / 2;
  const y = isAtTop ? rect.y + rect.height - HANDLE_ROW_OFFSET_MM : rect.y + HANDLE_ROW_OFFSET_MM / 2;
  return createBarHandle([x, y, context.frontZ], HANDLE_LENGTH_MM, false, context.materials.handle);
}

function buildSolidPanel(rect: Rect, context: FrontContext): THREE.Mesh {
  const size: Vec3 = [rect.width, rect.height, FACADE_THICKNESS_MM];
  return createBox(size, [rect.x, rect.y, context.frontZ - FACADE_THICKNESS_MM], context.materials.facade, FACADE_EDGE_RADIUS_MM);
}

function buildGlassPanel(rect: Rect, context: FrontContext): THREE.Group {
  const { materials, frontZ } = context;
  const group = new THREE.Group();
  const frameZ = frontZ - FACADE_THICKNESS_MM;
  const frame = (size: Vec3, x: number, y: number) => createBox(size, [x, y, frameZ], materials.handle);
  group.add(
    frame([rect.width, GLASS_FRAME_MM, FACADE_THICKNESS_MM], rect.x, rect.y),
    frame([rect.width, GLASS_FRAME_MM, FACADE_THICKNESS_MM], rect.x, rect.y + rect.height - GLASS_FRAME_MM),
    frame([GLASS_FRAME_MM, rect.height - 2 * GLASS_FRAME_MM, FACADE_THICKNESS_MM], rect.x, rect.y + GLASS_FRAME_MM),
    frame(
      [GLASS_FRAME_MM, rect.height - 2 * GLASS_FRAME_MM, FACADE_THICKNESS_MM],
      rect.x + rect.width - GLASS_FRAME_MM,
      rect.y + GLASS_FRAME_MM,
    ),
  );
  const pane = createBox(
    [rect.width - 2 * GLASS_FRAME_MM, rect.height - 2 * GLASS_FRAME_MM, GLASS_THICKNESS_MM],
    [rect.x + GLASS_FRAME_MM, rect.y + GLASS_FRAME_MM, frameZ + (FACADE_THICKNESS_MM - GLASS_THICKNESS_MM) / 2],
    materials.glass,
  );
  pane.castShadow = false;
  group.add(pane);
  return group;
}

function buildDoorLeaves(band: FrontBand, bandRect: Rect, context: FrontContext): THREE.Group {
  const group = new THREE.Group();
  const leafCount = countDoorLeaves(band, bandRect.width);
  const leafWidth = bandRect.width / leafCount;
  const isFlap = band.kind === 'flap';
  for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
    const rect: Rect = {
      x: bandRect.x + leafIndex * leafWidth + FACADE_GAP_MM / 2,
      y: bandRect.y + FACADE_GAP_MM / 2,
      width: leafWidth - FACADE_GAP_MM,
      height: bandRect.height - FACADE_GAP_MM,
    };
    const isHingedLeft = leafCount === 1 || leafIndex === 0;
    const leaf = new THREE.Group();
    leaf.add(context.item.spec.glass ? buildGlassPanel(rect, context) : buildSolidPanel(rect, context));
    leaf.add(isFlap ? placeHorizontalHandle(rect, false, context) : placeVerticalHandle(rect, isHingedLeft, context));
    const hingeZ = context.frontZ - FACADE_THICKNESS_MM;
    const pivot: Vec3 = isFlap
      ? [rect.x, rect.y + rect.height, hingeZ]
      : [isHingedLeft ? rect.x : rect.x + rect.width, rect.y, hingeZ];
    group.add(
      wrapOpenable(leaf, pivot, {
        key: `${context.item.module.id}:${context.bandIndex}:${leafIndex}`,
        kind: isFlap ? 'flap' : 'door',
        hingeSign: isHingedLeft ? 1 : -1,
      }),
    );
  }
  return group;
}

function buildDrawerTray(bandRect: Rect, context: FrontContext): THREE.Group {
  const { item, materials } = context;
  const bodyDepth = item.spec.depth - FACADE_THICKNESS_MM;
  const trayWidth = bandRect.width - 2 * (CARCASS_PANEL_MM + DRAWER_SIDE_CLEARANCE_MM);
  const trayHeight = Math.min(DRAWER_MAX_HEIGHT_MM, Math.max(DRAWER_MIN_HEIGHT_MM, bandRect.height - DRAWER_HEIGHT_MARGIN_MM));
  const trayDepth = bodyDepth - DRAWER_BACK_GAP_MM;
  const x = bandRect.x + (bandRect.width - trayWidth) / 2;
  const y = bandRect.y + DRAWER_LIFT_MM;
  const z = bodyDepth - trayDepth;
  const wall = DRAWER_WALL_MM;
  const group = new THREE.Group();
  const part = (size: Vec3, origin: Vec3) => group.add(createBox(size, origin, materials.body));
  part([trayWidth, wall, trayDepth], [x, y, z]);
  part([wall, trayHeight, trayDepth], [x, y, z]);
  part([wall, trayHeight, trayDepth], [x + trayWidth - wall, y, z]);
  part([trayWidth, trayHeight, wall], [x, y, z]);
  return group;
}

function buildDrawer(bandRect: Rect, context: FrontContext): THREE.Group {
  const rect: Rect = {
    x: bandRect.x + FACADE_GAP_MM / 2,
    y: bandRect.y + FACADE_GAP_MM / 2,
    width: bandRect.width - FACADE_GAP_MM,
    height: bandRect.height - FACADE_GAP_MM,
  };
  const drawer = new THREE.Group();
  drawer.add(buildSolidPanel(rect, context), placeHorizontalHandle(rect, true, context), buildDrawerTray(bandRect, context));
  const slider = wrapOpenable(drawer, [0, 0, 0], {
    key: `${context.item.module.id}:${context.bandIndex}:0`,
    kind: 'drawer',
    hingeSign: 1,
    drawerDepthMm: context.item.spec.depth,
  });
  return new THREE.Group().add(slider);
}

function buildNiche(bandRect: Rect, context: FrontContext): THREE.Mesh {
  const inset = FACADE_THICKNESS_MM;
  const rect: Rect = {
    x: bandRect.x + inset,
    y: bandRect.y + inset,
    width: bandRect.width - 2 * inset,
    height: bandRect.height - 2 * inset,
  };
  return createBox([rect.width, rect.height, 2], [rect.x, rect.y, context.frontZ - 2], context.materials.recess);
}

function buildFrontBand(band: FrontBand, bandRect: Rect, context: FrontContext): THREE.Group {
  if (band.kind === 'drawer') return buildDrawer(bandRect, context);
  if (band.kind === 'opening') return new THREE.Group().add(buildNiche(bandRect, context));
  return buildDoorLeaves(band, bandRect, context);
}

export function buildFront(item: LayoutItem, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const group = new THREE.Group();
  let bandTop = spec.elevation + spec.height;
  spec.front.forEach((band, bandIndex) => {
    const bandHeight = Math.round(spec.height * band.ratio);
    const bandRect: Rect = { x: item.offset, y: bandTop - bandHeight, width: module.width, height: bandHeight };
    group.add(buildFrontBand(band, bandRect, { item, materials, frontZ: spec.depth, bandIndex }));
    bandTop -= bandHeight;
  });
  return group;
}

function listShelfHeights(spec: LayoutItem['spec']): number[] {
  const heights: number[] = [];
  let bandTop = spec.elevation + spec.height;
  spec.front.forEach((band) => {
    const bandHeight = Math.round(spec.height * band.ratio);
    const bandBottom = bandTop - bandHeight;
    const shelfCount = band.kind === 'drawer' || band.kind === 'opening' ? 0 : Math.max(0, Math.round(bandHeight / SHELF_SPACING_MM) - 1);
    for (let shelf = 1; shelf <= shelfCount; shelf += 1) heights.push(bandBottom + (bandHeight * shelf) / (shelfCount + 1));
    bandTop = bandBottom;
  });
  return heights;
}

function buildTopPanels(item: LayoutItem, depth: number): [Vec3, Vec3][] {
  const { spec, module } = item;
  const inner = module.width - 2 * CARCASS_PANEL_MM;
  const y = spec.elevation + spec.height - CARCASS_PANEL_MM;
  if (!spec.hasSink) return [[[inner, CARCASS_PANEL_MM, depth], [CARCASS_PANEL_MM, y, 0]]];
  const hole = measureSinkHole(module.width);
  const frontRail = depth - hole.z - hole.depth;
  return [
    [[inner, CARCASS_PANEL_MM, hole.z], [CARCASS_PANEL_MM, y, 0]],
    [[inner, CARCASS_PANEL_MM, Math.max(frontRail, 0)], [CARCASS_PANEL_MM, y, hole.z + hole.depth]],
  ];
}

export function buildCarcass(item: LayoutItem, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const width = module.width;
  const depth = spec.depth - FACADE_THICKNESS_MM;
  const inner = width - 2 * CARCASS_PANEL_MM;
  const group = new THREE.Group();
  const part = (size: Vec3, origin: Vec3) => group.add(createBox(size, origin, materials.body));
  part([CARCASS_PANEL_MM, spec.height, depth], [0, spec.elevation, 0]);
  part([CARCASS_PANEL_MM, spec.height, depth], [width - CARCASS_PANEL_MM, spec.elevation, 0]);
  part([inner, CARCASS_PANEL_MM, depth], [CARCASS_PANEL_MM, spec.elevation, 0]);
  buildTopPanels(item, depth).forEach(([size, origin]) => part(size, origin));
  part([inner, spec.height - 2 * CARCASS_PANEL_MM, BACK_PANEL_MM], [CARCASS_PANEL_MM, spec.elevation + CARCASS_PANEL_MM, 0]);
  if (width < MIN_SHELF_MODULE_WIDTH_MM) return group;
  listShelfHeights(spec).forEach((height) => {
    part([inner, CARCASS_PANEL_MM, depth - SHELF_FRONT_SETBACK_MM], [CARCASS_PANEL_MM, height - CARCASS_PANEL_MM / 2, 0]);
  });
  return group;
}
