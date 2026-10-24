import * as THREE from 'three';
import { COUNTERTOP_THICKNESS_MM, PLINTH_HEIGHT_MM } from '../../domain/catalog';
import { FACADE_GAP_MM, buildCarcass, buildFront, createBox } from '../cabinetFronts';
import type { ModelContext, ModelFrame } from './applianceShapes';
import { buildCooktopSurface, type CooktopVariant } from './stoves';

const PLINTH_RECESS_MM = 50;

function buildCooktopCabinet(variant: CooktopVariant, frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const group = new THREE.Group();
  group.add(buildCarcass(item, materials), buildFront(item, materials));
  group.add(createBox([item.module.width - FACADE_GAP_MM, PLINTH_HEIGHT_MM, frame.depth - PLINTH_RECESS_MM], [0, 0, 0], materials.recess));
  group.add(buildCooktopSurface(variant, { width: frame.width, depth: frame.depth }, frame.elevation + frame.height + COUNTERTOP_THICKNESS_MM, materials));
  return group;
}

export function buildInductionCabinet(frame: ModelFrame, context: ModelContext): THREE.Group {
  return buildCooktopCabinet('glass', frame, context);
}

export function buildGasCooktopCabinet(frame: ModelFrame, context: ModelContext): THREE.Group {
  return buildCooktopCabinet('gas', frame, context);
}
