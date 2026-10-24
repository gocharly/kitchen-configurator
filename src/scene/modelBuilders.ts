import * as THREE from 'three';
import type { ModelContext, ModelFrame } from './appliances/applianceShapes';
import { buildBuiltInFridge, buildFreestandingFridge, buildSideBySideFridge, buildUnderCounterFridge } from './appliances/fridges';
import { buildDomeHood, buildFlatHood } from './appliances/hoods';
import { buildElectricStove, buildGasStove } from './appliances/stoves';
import { buildWasher } from './appliances/washer';
import { buildBarStool, buildBench, buildKitchenSofa, buildLowStool, buildPaddedChair, buildWoodChair } from './furniture/seating';
import { buildOpenShelving, buildTrolley, buildWineRack } from './furniture/storage';
import { buildBarTable, buildRectTable, buildRoundTable } from './furniture/tables';

type ApplianceBuilder = (frame: ModelFrame, context: ModelContext) => THREE.Group;

const MODEL_BUILDERS: Record<string, ApplianceBuilder> = {
  kitchenStove: buildGasStove,
  kitchenStoveElectric: buildElectricStove,
  kitchenFridge: buildFreestandingFridge,
  kitchenFridgeLarge: buildSideBySideFridge,
  kitchenFridgeBuiltIn: buildBuiltInFridge,
  kitchenFridgeSmall: buildUnderCounterFridge,
  hoodLarge: buildDomeHood,
  hoodModern: buildFlatHood,
  washer: buildWasher,
  tableRect: buildRectTable,
  tableRound: buildRoundTable,
  tableBar: buildBarTable,
  chairWood: buildWoodChair,
  chairPadded: buildPaddedChair,
  stoolBar: buildBarStool,
  stoolLow: buildLowStool,
  bench: buildBench,
  kitchenSofa: buildKitchenSofa,
  shelvingOpen: buildOpenShelving,
  trolley: buildTrolley,
  wineRack: buildWineRack,
};

export function hasModelBuilder(modelName: string): boolean {
  return modelName in MODEL_BUILDERS;
}

export function buildCatalogModel(modelName: string, frame: ModelFrame, context: ModelContext): THREE.Group {
  const build = MODEL_BUILDERS[modelName];
  if (!build) throw new Error(`Model ${modelName} has no builder`);
  return build(frame, context);
}
