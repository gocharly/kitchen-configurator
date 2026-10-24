import * as THREE from 'three';
import { PLINTH_HEIGHT_MM } from '../../domain/catalog';
import { FACADE_GAP_MM, buildCarcass, buildFront, createBox, listFrontBandRects, type FrontBandRect, type Materials } from '../cabinetFronts';
import { wrapOpenable } from '../openablePanels';
import { createLinedShell, createTubeHandle, type ModelContext, type ModelFrame, type Vec3 } from './applianceShapes';

const OVEN_MIN_HEIGHT_MM = 500;
const SLOT_GAP_MM = 3;
const FASCIA_MM = 30;
const DOOR_MM = 24;
const CHAMBER_WALL_MM = 25;
const OVEN_PANEL_HEIGHT_MM = 70;
const OVEN_GLASS_SIDE_MM = 40;
const OVEN_GLASS_BOTTOM_MM = 60;
const OVEN_GLASS_TOP_MM = 70;
const OVEN_HANDLE_DROP_MM = 45;
const MICROWAVE_PANEL_RATIO = 0.26;
const MICROWAVE_MARGIN_MM = 20;
const PLINTH_RECESS_MM = 50;

interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  frontZ: number;
  key: string;
}

function measureSlot(rect: FrontBandRect, frame: ModelFrame, moduleId: string): Slot {
  return {
    x: rect.x + SLOT_GAP_MM,
    y: rect.y + SLOT_GAP_MM,
    width: rect.width - 2 * SLOT_GAP_MM,
    height: rect.height - 2 * SLOT_GAP_MM,
    frontZ: frame.depth,
    key: `${moduleId}:slot${rect.bandIndex}`,
  };
}

function buildChamber(slot: Slot, materials: Materials): THREE.Group {
  const size: Vec3 = [slot.width, slot.height, slot.frontZ - FASCIA_MM];
  return createLinedShell(size, [slot.x, slot.y, 0], CHAMBER_WALL_MM, { shell: materials.steelDark, liner: materials.recess });
}

function buildOven(slot: Slot, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const panelY = slot.y + slot.height - OVEN_PANEL_HEIGHT_MM;
  const doorHeight = slot.height - OVEN_PANEL_HEIGHT_MM - SLOT_GAP_MM;
  const doorZ = slot.frontZ - DOOR_MM;
  group.add(buildChamber(slot, materials));
  group.add(createBox([slot.width, OVEN_PANEL_HEIGHT_MM, FASCIA_MM], [slot.x, panelY, slot.frontZ - FASCIA_MM], materials.steel, 2));
  group.add(createBox([110, 26, 3], [slot.x + slot.width / 2 - 55, panelY + 22, slot.frontZ], materials.blackGlass));
  const leaf = new THREE.Group();
  leaf.add(createBox([slot.width, doorHeight, DOOR_MM], [slot.x, slot.y, doorZ], materials.steel, 2));
  const glass: Vec3 = [slot.width - 2 * OVEN_GLASS_SIDE_MM, doorHeight - OVEN_GLASS_BOTTOM_MM - OVEN_GLASS_TOP_MM, 4];
  leaf.add(createBox(glass, [slot.x + OVEN_GLASS_SIDE_MM, slot.y + OVEN_GLASS_BOTTOM_MM, slot.frontZ - 2], materials.blackGlass));
  leaf.add(createTubeHandle([slot.x + slot.width / 2, slot.y + doorHeight - OVEN_HANDLE_DROP_MM, slot.frontZ], slot.width - 90, 'x', materials.steel));
  const pivot: Vec3 = [slot.x + slot.width / 2, slot.y, slot.frontZ - DOOR_MM / 2];
  group.add(wrapOpenable(leaf, pivot, { key: `${slot.key}:hatch`, kind: 'hatch', hingeSign: 1 }));
  return group;
}

function buildMicrowave(slot: Slot, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  const panelWidth = slot.width * MICROWAVE_PANEL_RATIO;
  const doorWidth = slot.width - panelWidth;
  const glassHeight = slot.height - 2 * MICROWAVE_MARGIN_MM;
  group.add(buildChamber(slot, materials));
  group.add(createBox([panelWidth, slot.height, FASCIA_MM], [slot.x + doorWidth, slot.y, slot.frontZ - FASCIA_MM], materials.steel, 2));
  group.add(createBox([panelWidth - 2 * MICROWAVE_MARGIN_MM, 28, 3], [slot.x + doorWidth + MICROWAVE_MARGIN_MM, slot.y + slot.height - 70, slot.frontZ], materials.blackGlass));
  const leaf = new THREE.Group();
  leaf.add(createBox([doorWidth, slot.height, DOOR_MM], [slot.x, slot.y, slot.frontZ - DOOR_MM], materials.steel, 2));
  leaf.add(createBox([doorWidth - 2 * MICROWAVE_MARGIN_MM, glassHeight, 4], [slot.x + MICROWAVE_MARGIN_MM, slot.y + MICROWAVE_MARGIN_MM, slot.frontZ - 2], materials.blackGlass));
  leaf.add(createTubeHandle([slot.x + doorWidth - 26, slot.y + slot.height / 2, slot.frontZ], slot.height * 0.6, 'y', materials.steel));
  const pivot: Vec3 = [slot.x, slot.y, slot.frontZ - DOOR_MM / 2];
  group.add(wrapOpenable(leaf, pivot, { key: `${slot.key}:door`, kind: 'door', hingeSign: 1 }));
  return group;
}

export function buildInsetAppliances(frame: ModelFrame, context: ModelContext): THREE.Group {
  const { materials, item } = context;
  const group = new THREE.Group();
  group.add(buildCarcass(item, materials), buildFront(item, materials));
  if (item.spec.row === 'lower') {
    group.add(createBox([item.module.width - FACADE_GAP_MM, PLINTH_HEIGHT_MM, frame.depth - PLINTH_RECESS_MM], [0, 0, 0], materials.recess));
  }
  listFrontBandRects(item)
    .filter((rect) => rect.band.kind === 'opening')
    .forEach((rect) => {
      const slot = measureSlot(rect, frame, item.module.id);
      group.add(rect.height >= OVEN_MIN_HEIGHT_MM ? buildOven(slot, materials) : buildMicrowave(slot, materials));
    });
  return group;
}
