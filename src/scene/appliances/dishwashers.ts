import * as THREE from 'three';
import { FACADE_GAP_MM, FACADE_THICKNESS_MM, buildCarcass, createBox } from '../cabinetFronts';
import { PLINTH_HEIGHT_MM } from '../../domain/catalog';
import { wrapOpenable } from '../openablePanels';
import { createPlinth, createTubeHandle, type ModelContext, type ModelFrame, type Vec3 } from './applianceShapes';

const SIDE_GAP_MM = 2;
const FREE_PLINTH_MM = 22;
const PLINTH_INSET_MM = 60;
const DOOR_MM = 30;
const CONTROL_STRIP_MM = 60;
const DOOR_TOP_GAP_MM = 4;
const BUILT_IN_HANDLE_DROP_MM = 55;

function buildHatch(key: string, leaf: THREE.Group, pivot: Vec3): THREE.Group {
  return wrapOpenable(leaf, pivot, { key, kind: 'hatch', hingeSign: 1 });
}

export function buildFreeDishwasher(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const group = new THREE.Group();
  const width = frame.width - 2 * SIDE_GAP_MM;
  const bodyHeight = frame.height - FREE_PLINTH_MM;
  const doorHeight = bodyHeight - CONTROL_STRIP_MM - DOOR_TOP_GAP_MM;
  group.add(createPlinth(frame.width - 3, frame.depth - PLINTH_INSET_MM, FREE_PLINTH_MM, materials.recess));
  group.add(createBox([width, bodyHeight, frame.depth - DOOR_MM], [SIDE_GAP_MM, FREE_PLINTH_MM, 0], materials.enamel));
  group.add(createBox([width, CONTROL_STRIP_MM, DOOR_MM], [SIDE_GAP_MM, frame.height - CONTROL_STRIP_MM, frame.depth - DOOR_MM], materials.steel, 2));
  group.add(createBox([width * 0.4, 18, 3], [SIDE_GAP_MM + width * 0.3, frame.height - CONTROL_STRIP_MM / 2 - 9, frame.depth], materials.blackGlass));
  const leaf = new THREE.Group();
  leaf.add(createBox([width, doorHeight, DOOR_MM], [SIDE_GAP_MM, FREE_PLINTH_MM, frame.depth - DOOR_MM], materials.steel, 2));
  leaf.add(createTubeHandle([frame.width / 2, FREE_PLINTH_MM + doorHeight - 50, frame.depth], width - 120, 'x', materials.steel));
  group.add(buildHatch(`${item.module.id}:hatch`, leaf, [frame.width / 2, FREE_PLINTH_MM, frame.depth - DOOR_MM / 2]));
  return group;
}

export function buildBuiltInDishwasher(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const group = new THREE.Group();
  group.add(buildCarcass(item, materials));
  group.add(createBox([item.module.width - FACADE_GAP_MM, PLINTH_HEIGHT_MM, frame.depth - 50], [0, 0, 0], materials.recess));
  const leaf = new THREE.Group();
  const height = frame.height - FACADE_GAP_MM;
  leaf.add(createBox([frame.width - FACADE_GAP_MM, height, FACADE_THICKNESS_MM], [FACADE_GAP_MM / 2, frame.elevation + FACADE_GAP_MM / 2, frame.depth - FACADE_THICKNESS_MM], materials.facade, 2));
  leaf.add(createTubeHandle([frame.width / 2, frame.elevation + height - BUILT_IN_HANDLE_DROP_MM, frame.depth], Math.min(frame.width - 120, 300), 'x', materials.handle));
  group.add(buildHatch(`${item.module.id}:hatch`, leaf, [frame.width / 2, frame.elevation, frame.depth - FACADE_THICKNESS_MM / 2]));
  return group;
}
