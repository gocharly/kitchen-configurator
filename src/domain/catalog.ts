import catalogFile from '../catalog/ru-starter.json';
import { parseCatalog, type FrontBand, type ModuleSpec } from './catalogFormat';

export type {
  CategorySpec,
  FacadeStyleOption,
  HandleOption,
  StylePreset,
  ColorFinish,
  ColorOption,
  FamilyType,
  FrontBand,
  FrontBandKind,
  ModuleSpec,
  RowName,
  SurfaceKind,
  SurfaceOption,
} from './catalogFormat';

export type CategoryId = string;

const catalog = parseCatalog(catalogFile);

export const DOUBLE_LEAF_MIN_WIDTH_MM = 600;
export const CATALOG_VERSION = catalog.version;
export const CATALOG_CURRENCY = catalog.currency;
export const PLINTH_HEIGHT_MM = catalog.plinthHeight;
export const COUNTERTOP_THICKNESS_MM = catalog.countertop.thickness;
export const COUNTERTOP_OVERHANG_MM = catalog.countertop.overhang;
export const FILLER = catalog.filler;
export const MIN_AISLE_MM = catalog.minAisle;
export const CATEGORIES = catalog.categories;
export const MODULE_SPECS = catalog.specs;
export const FACADE_COLORS = catalog.facadeColors;
export const BODY_COLORS = catalog.bodyColors;
export const FLOORS = catalog.floors;
export const WALL_FINISHES = catalog.wallFinishes;
export const BACKSPLASHES = catalog.backsplashes;
export const HANDLES = catalog.handles;
export const FACADE_STYLES = catalog.facadeStyles;
export const STYLE_PRESETS = catalog.stylePresets;
export const NO_BACKSPLASH_ID = 'none';

export const ROOM_LIMITS = {
  length: { min: 1500, max: 8000 },
  width: { min: 1500, max: 6000 },
  height: { min: 2300, max: 3500 },
  step: 50,
} as const;

const MODULE_SPEC_BY_ID = new Map(MODULE_SPECS.map((spec) => [spec.id, spec]));

export function countDoorLeaves(band: FrontBand, width: number): number {
  if (band.kind === 'drawer' || band.kind === 'opening') return 1;
  return band.leaves ?? (width > DOUBLE_LEAF_MIN_WIDTH_MM ? 2 : 1);
}

export function getModuleSpec(specId: string): ModuleSpec {
  const spec = MODULE_SPEC_BY_ID.get(specId);
  if (!spec) throw new Error(`Module ${specId} is missing in the catalog`);
  return spec;
}

export function listModulesInCategory(categoryId: string): ModuleSpec[] {
  return MODULE_SPECS.filter((spec) => spec.category === categoryId);
}

export function calculateCountertopPrice(length: number): number {
  return catalog.countertop.priceFor(length);
}
