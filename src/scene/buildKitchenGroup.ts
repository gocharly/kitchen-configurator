import * as THREE from 'three';
import {
  BODY_COLORS,
  COUNTERTOP_OVERHANG_MM,
  COUNTERTOP_THICKNESS_MM,
  FACADE_COLORS,
  BACKSPLASHES,
  FACADE_STYLES,
  FLOORS,
  HANDLES,
  PLINTH_HEIGHT_MM,
  getModuleSpec,
  WALL_FINISHES,
  type ColorOption,
  type ModuleSpec,
} from '../domain/catalog';
import type { Filler } from '../domain/fillers';
import type { FreeModule } from '../domain/freeModules';
import {
  DEFAULT_KITCHEN,
  layoutKitchen,
  listFillers,
  listSpaceTaken,
  measureWallLength,
  type Kitchen,
  type LayoutItem,
  type WallId,
} from '../domain/kitchen';
import { OPENING_SPECS, type Opening } from '../domain/openings';
import { buildCatalogModel } from './modelBuilders';
import { createApplianceMaterials } from './appliances/applianceMaterials';
import { buildSinkCountertop } from './appliances/sink';
import { createFurnitureMaterials } from './furniture/furnitureMaterials';
import { buildOpeningContent } from './openingModels';
import { createSurfaceMaterial, findSurface, projectUvToMeters } from './surfaceMaterials';
import { buildBacksplash } from './backsplash';
import { mergeSpans, positionOnWall, type WallSpan } from './wallPlacement';
import {
  COUNTERTOP_EDGE_RADIUS_MM,
  FACADE_GAP_MM,
  FACADE_THICKNESS_MM,
  MM,
  buildCarcass,
  buildFront,
  createBox,
  type FinishStyle,
  type Materials,
} from './cabinetFronts';
import { createStoneTexture, createWoodGrainTexture, getSurfaceTexture } from './surfaceTextures';

const PLINTH_RECESS_MM = 50;
const WALL_THICKNESS_MM = 100;
const SKIRTING_HEIGHT_MM = 90;
const SKIRTING_THICKNESS_MM = 14;
const SKIRTING_MIN_SEGMENT_MM = 20;
const SKIRTING_BLOCK_HEIGHT_MM = 100;
const WALL_CONTACT_TOLERANCE_MM = 5;
const SELECTION_TINT = '#3f7bff';
const SELECTION_TINT_MIX = 0.3;
const FACADE_CLEARCOAT = 0.35;
const FACADE_CLEARCOAT_ROUGHNESS = 0.35;

let stoneTexture: THREE.CanvasTexture | null = null;
let woodTexture: THREE.CanvasTexture | null = null;

function getWoodTexture(): THREE.CanvasTexture {
  woodTexture ??= createWoodGrainTexture();
  return woodTexture;
}

function getStoneTexture(): THREE.CanvasTexture {
  stoneTexture ??= createStoneTexture();
  return stoneTexture;
}

function findColor(options: ColorOption[], id: string): ColorOption {
  const option = options.find((o) => o.id === id);
  if (!option) throw new Error(`Color ${id} is missing in the catalog`);
  return option;
}

function findFinishStyle(kitchen: Kitchen): FinishStyle {
  const handle = HANDLES.find((option) => option.id === kitchen.handleId);
  const facadeStyle = FACADE_STYLES.find((option) => option.id === kitchen.facadeStyleId);
  if (!handle) throw new Error(`Handle ${kitchen.handleId} is missing in the catalog`);
  if (!facadeStyle) throw new Error(`Facade style ${kitchen.facadeStyleId} is missing in the catalog`);
  return { handle, facadeStyle };
}

function createMaterials(kitchen: Kitchen): Materials {
  const standard = (color: string, roughness: number, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const glass = standard('#bcd3dc', 0.1);
  glass.transparent = true;
  glass.opacity = 0.35;
  glass.depthWrite = false;
  const facadeColor = findColor(FACADE_COLORS, kitchen.facadeColorId);
  const facade = new THREE.MeshPhysicalMaterial({
    color: facadeColor.hex,
    map: facadeColor.finish === 'wood' ? getWoodTexture() : null,
    roughness: 0.5,
    clearcoat: FACADE_CLEARCOAT,
    clearcoatRoughness: FACADE_CLEARCOAT_ROUGHNESS,
  });
  return {
    finish: findFinishStyle(kitchen),
    facade,
    body: standard(findColor(BODY_COLORS, kitchen.bodyColorId).hex, 0.7),
    handle: standard('#a3a9af', 0.22, 0.9),
    recess: standard('#2b2d30', 0.9),
    glass,
    countertop: Object.assign(standard('#d8d4cb', 0.32), { map: getStoneTexture() }),
    wall: createSurfaceMaterial(findSurface(WALL_FINISHES, kitchen.wallFinishId)),
    backsplash: createSurfaceMaterial(findSurface(BACKSPLASHES, kitchen.backsplashId)),
    floor: createSurfaceMaterial(findSurface(FLOORS, kitchen.floorId)),
    openingFrame: standard('#f4f3ef', 0.5),
    doorLeaf: standard('#9d8467', 0.6),
    daylight: new THREE.MeshBasicMaterial({ color: '#dbe7ef' }),
    ...createApplianceMaterials(),
    ...createFurnitureMaterials(),
  };
}

function buildCountertop(item: LayoutItem, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const top = spec.elevation + spec.height;
  const depth = spec.depth + COUNTERTOP_OVERHANG_MM;
  if (spec.hasSink) {
    const sinkTop = buildSinkCountertop({ width: module.width, depth, top }, materials);
    sinkTop.position.x = item.offset * MM;
    return sinkTop;
  }
  const group = new THREE.Group();
  group.add(createBox([module.width, COUNTERTOP_THICKNESS_MM, depth], [item.offset, top, 0], materials.countertop, COUNTERTOP_EDGE_RADIUS_MM));
  return group;
}

function buildStraightBody(item: LayoutItem, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const group = new THREE.Group();
  group.add(buildCarcass(item, materials));
  group.add(buildFront(item, materials));
  if (spec.row === 'lower') {
    const plinthSize: [number, number, number] = [module.width - FACADE_GAP_MM, PLINTH_HEIGHT_MM, spec.depth - PLINTH_RECESS_MM];
    group.add(createBox(plinthSize, [0, 0, 0], materials.recess));
  }
  if (spec.hasCountertop) group.add(buildCountertop(item, materials));
  return group;
}

function buildCornerFronts(item: LayoutItem, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const leg = module.width;
  const group = new THREE.Group();
  const armWidth = leg - spec.depth;
  const frontItem: LayoutItem = { ...item, offset: spec.depth, module: { ...module, width: armWidth } };
  const sideFront = buildFront(frontItem, materials);
  sideFront.rotation.y = Math.PI / 2;
  sideFront.position.z = (leg + spec.depth) * MM;
  group.add(buildFront(frontItem, materials), sideFront);
  return group;
}

function buildCornerModule(item: LayoutItem, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const leg = module.width;
  const bodyDepth = spec.depth - FACADE_THICKNESS_MM;
  const group = new THREE.Group();
  group.add(createBox([leg, spec.height, bodyDepth], [0, spec.elevation, 0], materials.body));
  group.add(createBox([bodyDepth, spec.height, leg], [0, spec.elevation, 0], materials.body));
  group.add(buildCornerFronts(item, materials));
  if (spec.row === 'lower') {
    const plinthDepth = spec.depth - PLINTH_RECESS_MM;
    group.add(createBox([leg - FACADE_GAP_MM, PLINTH_HEIGHT_MM, plinthDepth], [0, 0, 0], materials.recess));
    group.add(createBox([plinthDepth, PLINTH_HEIGHT_MM, leg - FACADE_GAP_MM], [0, 0, 0], materials.recess));
  }
  if (spec.hasCountertop) {
    const top = spec.elevation + spec.height;
    const countertopDepth = spec.depth + COUNTERTOP_OVERHANG_MM;
    group.add(createBox([leg, COUNTERTOP_THICKNESS_MM, countertopDepth], [0, top, 0], materials.countertop, COUNTERTOP_EDGE_RADIUS_MM));
    group.add(createBox([countertopDepth, COUNTERTOP_THICKNESS_MM, leg], [0, top, 0], materials.countertop, COUNTERTOP_EDGE_RADIUS_MM));
  }
  if (item.module.cornerSide === 'end') {
    const mirrored = new THREE.Group();
    group.scale.x = -1;
    group.position.x = leg * MM;
    mirrored.add(group);
    return mirrored;
  }
  return group;
}

function placeOnWall(moduleGroup: THREE.Group, item: LayoutItem, room: Kitchen['room']): THREE.Group {
  const holder = new THREE.Group();
  holder.add(moduleGroup);
  positionOnWall(holder, { wall: item.wall, offset: item.offset, width: item.module.width }, room);
  holder.userData = { itemKind: 'module', itemId: item.module.id, wall: item.wall };
  return holder;
}

function buildFiller(filler: Filler, materials: Materials, room: Kitchen['room']): THREE.Group {
  const group = new THREE.Group();
  const bodyDepth = filler.depth - FACADE_THICKNESS_MM;
  group.add(createBox([filler.width, filler.height, bodyDepth], [0, filler.elevation, 0], materials.body));
  group.add(
    createBox(
      [filler.width, filler.height, FACADE_THICKNESS_MM],
      [0, filler.elevation, bodyDepth],
      materials.facade,
    ),
  );
  if (filler.row === 'lower') {
    const plinthDepth = filler.depth - PLINTH_RECESS_MM;
    group.add(createBox([filler.width, PLINTH_HEIGHT_MM, plinthDepth], [0, 0, 0], materials.recess));
  }
  if (filler.hasCountertop) {
    const top = filler.elevation + filler.height;
    group.add(
      createBox(
        [filler.width, COUNTERTOP_THICKNESS_MM, filler.depth + COUNTERTOP_OVERHANG_MM],
        [0, top, 0],
        materials.countertop,
        COUNTERTOP_EDGE_RADIUS_MM,
      ),
    );
  }
  const holder = new THREE.Group();
  holder.add(group);
  positionOnWall(holder, { wall: filler.wall, offset: filler.offset, width: filler.width }, room);
  return holder;
}

function buildModelModule(item: LayoutItem, modelName: string, materials: Materials): THREE.Group {
  const { spec, module } = item;
  const frame = { width: module.width - 2 * spec.clearance, height: spec.height, depth: spec.depth, elevation: spec.elevation };
  const body = buildCatalogModel(modelName, frame, { materials, item });
  body.position.x = spec.clearance * MM;
  const group = new THREE.Group().add(body);
  if (spec.hasCountertop) group.add(buildCountertop(item, materials));
  return group;
}

function tintForSelection(group: THREE.Group, tinted: THREE.Material[]): void {
  const cache = new Map<THREE.Material, THREE.Material>();
  const tint = (material: THREE.Material) => {
    const cached = cache.get(material);
    if (cached) return cached;
    const clone = material.clone() as THREE.MeshStandardMaterial;
    clone.color = clone.color.clone().lerp(new THREE.Color(SELECTION_TINT), SELECTION_TINT_MIX);
    cache.set(material, clone);
    tinted.push(clone);
    return clone;
  };
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material) ? object.material.map(tint) : tint(object.material);
  });
}

function buildModule(item: LayoutItem, context: { materials: Materials; room: Kitchen['room']; tinted: THREE.Material[]; selectedId: string | null }): THREE.Group {
  const local: LayoutItem = { ...item, offset: 0 };
  const body = buildModuleBody(local, context.materials);
  if (item.module.id === context.selectedId) tintForSelection(body, context.tinted);
  return placeOnWall(body, item, context.room);
}

function buildFreeModule(free: FreeModule, context: { materials: Materials; tinted: THREE.Material[]; selectedId: string | null }): THREE.Group {
  const spec = getModuleSpec(free.module.specId);
  const item: LayoutItem = { module: free.module, spec, wall: 'back', offset: 0 };
  const body = buildModuleBody(item, context.materials);
  if (free.module.id === context.selectedId) tintForSelection(body, context.tinted);
  body.position.set((-free.module.width / 2) * MM, 0, (-spec.depth / 2) * MM);
  const holder = new THREE.Group().add(body);
  holder.position.set(free.cx * MM, 0, free.cz * MM);
  holder.rotation.y = THREE.MathUtils.degToRad(free.rotation);
  holder.userData = { itemKind: 'module', itemId: free.module.id, wall: 'back' };
  return holder;
}

function buildModuleBody(item: LayoutItem, materials: Materials): THREE.Group {
  if (item.spec.model) return buildModelModule(item, item.spec.model, materials);
  return item.spec.isCorner ? buildCornerModule(item, materials) : buildStraightBody(item, materials);
}

function applyWallTransform(object: THREE.Object3D, wall: WallId, room: Kitchen['room']): void {
  if (wall === 'left') {
    object.rotation.y = Math.PI / 2;
    object.position.set(0, 0, room.width * MM);
  }
  if (wall === 'right') {
    object.rotation.y = -Math.PI / 2;
    object.position.set(room.length * MM, 0, 0);
  }
}

function measureLocalStart(opening: Opening, room: Kitchen['room']): number {
  const wallLength = measureWallLength(room, opening.wall);
  return opening.wall === 'left' ? wallLength - opening.offset - opening.width : opening.offset;
}

function buildWall(kitchen: Kitchen, wall: WallId, materials: Materials): THREE.Mesh {
  const { room } = kitchen;
  const length = measureWallLength(room, wall) * MM;
  const overhang = wall === 'back' ? WALL_THICKNESS_MM * MM : 0;
  const shape = new THREE.Shape();
  shape.moveTo(-overhang, 0);
  shape.lineTo(length + overhang, 0);
  shape.lineTo(length + overhang, room.height * MM);
  shape.lineTo(-overhang, room.height * MM);
  shape.lineTo(-overhang, 0);
  kitchen.openings
    .filter((opening) => opening.wall === wall)
    .forEach((opening) => {
      const start = measureLocalStart(opening, room) * MM;
      const hole = new THREE.Path();
      hole.moveTo(start, opening.sill * MM);
      hole.lineTo(start, (opening.sill + opening.height) * MM);
      hole.lineTo(start + opening.width * MM, (opening.sill + opening.height) * MM);
      hole.lineTo(start + opening.width * MM, opening.sill * MM);
      hole.lineTo(start, opening.sill * MM);
      shape.holes.push(hole);
    });
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WALL_THICKNESS_MM * MM, bevelEnabled: false });
  geometry.translate(0, 0, -WALL_THICKNESS_MM * MM);
  projectUvToMeters(geometry, getSurfaceTexture(findSurface(WALL_FINISHES, kitchen.wallFinishId)), (u, v) => [u, v]);
  const mesh = new THREE.Mesh(geometry, materials.wall);
  mesh.receiveShadow = true;
  applyWallTransform(mesh, wall, room);
  return mesh;
}

function buildWallOpening(opening: Opening, room: Kitchen['room'], materials: Materials): THREE.Group {
  const content = buildOpeningContent(opening, materials);
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(opening.width * MM, opening.height * MM),
    materials.daylight,
  );
  backdrop.position.set((opening.width / 2) * MM, (opening.sill + opening.height / 2) * MM, -WALL_THICKNESS_MM * MM);
  content.add(backdrop);
  const placed = new THREE.Group();
  content.position.x = measureLocalStart(opening, room) * MM;
  placed.add(content);
  applyWallTransform(placed, opening.wall, room);
  placed.userData = { itemKind: 'opening', itemId: opening.id, wall: opening.wall };
  return placed;
}

function listBlockedSpans(kitchen: Kitchen, wall: WallId): WallSpan[] {
  const { room } = kitchen;
  const fromModules = listSpaceTaken(kitchen)
    .filter((taken) => taken.bottom < SKIRTING_BLOCK_HEIGHT_MM)
    .flatMap(({ rect }): WallSpan[] => {
      if (wall === 'back') return rect.z0 < WALL_CONTACT_TOLERANCE_MM ? [[rect.x0, rect.x1]] : [];
      if (wall === 'left') return rect.x0 < WALL_CONTACT_TOLERANCE_MM ? [[rect.z0, rect.z1]] : [];
      return rect.x1 > room.length - WALL_CONTACT_TOLERANCE_MM ? [[rect.z0, rect.z1]] : [];
    });
  const fromFillers = listFillers(kitchen)
    .filter((filler) => filler.wall === wall && filler.row === 'lower')
    .map((filler): WallSpan => [filler.offset, filler.offset + filler.width]);
  const fromDoors = kitchen.openings
    .filter((opening) => opening.wall === wall && OPENING_SPECS[opening.kind].family === 'door')
    .map((opening): WallSpan => [opening.offset, opening.offset + opening.width]);
  return mergeSpans([...fromModules, ...fromFillers, ...fromDoors]);
}

function listOpenSpans(blocked: WallSpan[], start: number, end: number): WallSpan[] {
  const open: WallSpan[] = [];
  let cursor = start;
  blocked.forEach(([from, to]) => {
    if (from - cursor >= SKIRTING_MIN_SEGMENT_MM) open.push([cursor, Math.min(from, end)]);
    cursor = Math.max(cursor, to);
  });
  if (end - cursor >= SKIRTING_MIN_SEGMENT_MM) open.push([cursor, end]);
  return open.filter(([from, to]) => to > from);
}

function buildSkirting(kitchen: Kitchen, materials: Materials): THREE.Group {
  const { room } = kitchen;
  const group = new THREE.Group();
  (['back', 'left', 'right'] as WallId[]).forEach((wall) => {
    const start = wall === 'back' ? 0 : SKIRTING_THICKNESS_MM;
    const end = measureWallLength(room, wall);
    listOpenSpans(listBlockedSpans(kitchen, wall), start, end).forEach(([from, to]) => {
      const size: [number, number, number] =
        wall === 'back'
          ? [to - from, SKIRTING_HEIGHT_MM, SKIRTING_THICKNESS_MM]
          : [SKIRTING_THICKNESS_MM, SKIRTING_HEIGHT_MM, to - from];
      const origin: [number, number, number] =
        wall === 'back' ? [from, 0, 0] : [wall === 'left' ? 0 : room.length - SKIRTING_THICKNESS_MM, 0, from];
      group.add(createBox(size, origin, materials.openingFrame));
    });
  });
  return group;
}

function buildRoom(kitchen: Kitchen, materials: Materials): THREE.Group {
  const { length, width } = kitchen.room;
  const room = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(length * MM, width * MM), materials.floor);
  projectUvToMeters(floor.geometry, getSurfaceTexture(findSurface(FLOORS, kitchen.floorId)), (u, v) => [u * length * MM, v * width * MM]);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((length / 2) * MM, 0, (width / 2) * MM);
  floor.receiveShadow = true;
  room.add(floor);
  (['back', 'left', 'right'] as WallId[]).forEach((wall) => room.add(buildWall(kitchen, wall, materials)));
  room.add(buildSkirting(kitchen, materials));
  return room;
}

export function buildKitchenGroup(kitchen: Kitchen, selectedModuleId: string | null = null): THREE.Group {
  const materials = createMaterials(kitchen);
  const group = new THREE.Group();
  group.add(buildRoom(kitchen, materials));
  group.add(buildBacksplash(kitchen, materials));
  const tinted: THREE.Material[] = [];
  const context = { materials, room: kitchen.room, tinted, selectedId: selectedModuleId };
  layoutKitchen(kitchen).forEach((item) => group.add(buildModule(item, context)));
  kitchen.freeModules.forEach((free) => group.add(buildFreeModule(free, context)));
  listFillers(kitchen).forEach((filler) => group.add(buildFiller(filler, materials, kitchen.room)));
  kitchen.openings.forEach((opening) => group.add(buildWallOpening(opening, kitchen.room, materials)));
  group.userData.materials = materials;
  group.userData.tintedMaterials = tinted;
  return group;
}

export function buildModulePreviewGroup(spec: ModuleSpec, colors: { facadeColorId: string; bodyColorId: string }): THREE.Group {
  const materials = createMaterials({ ...DEFAULT_KITCHEN, ...colors });
  const module = { id: `preview-${spec.id}`, specId: spec.id, width: spec.defaultWidth, cornerSide: spec.isCorner ? ('start' as const) : undefined };
  const item: LayoutItem = { module, spec, wall: 'back', offset: 0 };
  const group = new THREE.Group().add(buildModuleBody(item, materials));
  group.userData.materials = materials;
  group.userData.tintedMaterials = [];
  return group;
}

export function disposeKitchenGroup(group: THREE.Group): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  Object.values(group.userData.materials as Materials).forEach((material) => material.dispose());
  (group.userData.tintedMaterials as THREE.Material[]).forEach((material) => material.dispose());
}
