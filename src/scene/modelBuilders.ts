import * as THREE from 'three';
import type { ModelContext, ModelFrame } from './appliances/applianceShapes';
import { buildInductionCabinet, buildGasCooktopCabinet } from './appliances/cooktopCabinets';
import { buildBuiltInDishwasher, buildFreeDishwasher } from './appliances/dishwashers';
import { buildBuiltInFridge, buildFreestandingFridge, buildSideBySideFridge, buildTallFridge, buildUnderCounterFridge } from './appliances/fridges';
import { buildBuiltInHood, buildDomeHood, buildFlatHood, buildSlantedHood } from './appliances/hoods';
import { buildInsetAppliances } from './appliances/insetAppliances';
import { buildElectricStove, buildGasStove } from './appliances/stoves';
import { buildWasher } from './appliances/washer';
import { buildWineCooler } from './appliances/wineCooler';
import { buildBlender, buildBreadBin, buildCanisters, buildCoffeeMachine, buildCounterMicrowave, buildCuttingBoard, buildDishRack, buildFruitBowl, buildKettle, buildKnifeBlock, buildMugs, buildPan, buildSaucepan, buildToaster, buildTowelHolder, buildUtensilJar } from './furniture/kitchenware';
import { buildCurtain, buildFloorLamp, buildPlant, buildRugRect, buildRugRound, buildTrashBin } from './furniture/decor';
import { buildBarStool, buildBench, buildKitchenSofa, buildLowStool, buildPaddedChair, buildWoodChair } from './furniture/seating';
import { buildHangingRail, buildOpenShelving, buildTrolley, buildWallShelf, buildWineRack } from './furniture/storage';
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
  kitchenFridgeTall: buildTallFridge,
  hoodSlanted: buildSlantedHood,
  hoodBuiltIn: buildBuiltInHood,
  dishwasherFree: buildFreeDishwasher,
  dishwasherBuiltIn: buildBuiltInDishwasher,
  wineCooler: buildWineCooler,
  insetAppliances: buildInsetAppliances,
  cooktopInduction: buildInductionCabinet,
  cooktopGas: buildGasCooktopCabinet,
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
  pan: buildPan,
  saucepan: buildSaucepan,
  kettle: buildKettle,
  toaster: buildToaster,
  coffeeMachine: buildCoffeeMachine,
  counterMicrowave: buildCounterMicrowave,
  cuttingBoard: buildCuttingBoard,
  fruitBowl: buildFruitBowl,
  knifeBlock: buildKnifeBlock,
  utensilJar: buildUtensilJar,
  breadBin: buildBreadBin,
  canisters: buildCanisters,
  mugs: buildMugs,
  dishRack: buildDishRack,
  blender: buildBlender,
  towelHolder: buildTowelHolder,
  plant: buildPlant,
  rugRect: buildRugRect,
  rugRound: buildRugRound,
  floorLamp: buildFloorLamp,
  trashBin: buildTrashBin,
  curtain: buildCurtain,
  wallShelf: buildWallShelf,
  hangingRail: buildHangingRail,
};

export function hasModelBuilder(modelName: string): boolean {
  return modelName in MODEL_BUILDERS;
}

export function buildCatalogModel(modelName: string, frame: ModelFrame, context: ModelContext): THREE.Group {
  const build = MODEL_BUILDERS[modelName];
  if (!build) throw new Error(`Model ${modelName} has no builder`);
  return build(frame, context);
}
