import * as THREE from 'three';
import type { ApplianceContext, ApplianceFrame } from './appliances/applianceShapes';
import { buildBuiltInFridge, buildFreestandingFridge, buildSideBySideFridge, buildUnderCounterFridge } from './appliances/fridges';
import { buildDomeHood, buildFlatHood } from './appliances/hoods';
import { buildElectricStove, buildGasStove } from './appliances/stoves';
import { buildWasher } from './appliances/washer';

type ApplianceBuilder = (frame: ApplianceFrame, context: ApplianceContext) => THREE.Group;

const APPLIANCE_BUILDERS: Record<string, ApplianceBuilder> = {
  kitchenStove: buildGasStove,
  kitchenStoveElectric: buildElectricStove,
  kitchenFridge: buildFreestandingFridge,
  kitchenFridgeLarge: buildSideBySideFridge,
  kitchenFridgeBuiltIn: buildBuiltInFridge,
  kitchenFridgeSmall: buildUnderCounterFridge,
  hoodLarge: buildDomeHood,
  hoodModern: buildFlatHood,
  washer: buildWasher,
};

export function buildApplianceModel(modelName: string, frame: ApplianceFrame, context: ApplianceContext): THREE.Group {
  const build = APPLIANCE_BUILDERS[modelName];
  if (!build) throw new Error(`Appliance model ${modelName} has no builder`);
  return build(frame, context);
}
