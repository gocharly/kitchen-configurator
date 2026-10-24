export type OpeningFamily = 'window' | 'door';

export type OpeningKind =
  | 'window'
  | 'windowSingle'
  | 'windowTriple'
  | 'windowPanoramic'
  | 'windowHigh'
  | 'door'
  | 'doorDouble'
  | 'doorway'
  | 'balcony';

export interface Opening {
  id: string;
  kind: OpeningKind;
  wall: 'back' | 'left' | 'right';
  offset: number;
  width: number;
  height: number;
  sill: number;
}

interface Range {
  min: number;
  max: number;
  default: number;
}

export interface OpeningSpec {
  kind: OpeningKind;
  family: OpeningFamily;
  title: string;
  width: Range;
  height: Range;
  sill: Range;
  leaves: number;
  minLeafWidth: number;
}

export const OPENING_STEP_MM = 50;

const NO_SILL: Range = { min: 0, max: 0, default: 0 };
const WINDOW_LEAF_MIN_MM = 450;
const DOOR_LEAF_MIN_MM = 550;

export const OPENING_SPECS: Record<OpeningKind, OpeningSpec> = {
  window: {
    kind: 'window',
    family: 'window',
    title: 'Окно',
    width: { min: 500, max: 2400, default: 1200 },
    height: { min: 500, max: 1800, default: 1400 },
    sill: { min: 300, max: 1200, default: 900 },
    leaves: 2,
    minLeafWidth: WINDOW_LEAF_MIN_MM,
  },
  windowSingle: {
    kind: 'windowSingle',
    family: 'window',
    title: 'Окно одностворчатое',
    width: { min: 400, max: 900, default: 600 },
    height: { min: 500, max: 1500, default: 1000 },
    sill: { min: 300, max: 1300, default: 1000 },
    leaves: 1,
    minLeafWidth: WINDOW_LEAF_MIN_MM,
  },
  windowTriple: {
    kind: 'windowTriple',
    family: 'window',
    title: 'Окно трёхстворчатое',
    width: { min: 1500, max: 3000, default: 2000 },
    height: { min: 800, max: 1800, default: 1400 },
    sill: { min: 300, max: 1200, default: 900 },
    leaves: 3,
    minLeafWidth: WINDOW_LEAF_MIN_MM,
  },
  windowPanoramic: {
    kind: 'windowPanoramic',
    family: 'window',
    title: 'Панорамное окно',
    width: { min: 1200, max: 3600, default: 2400 },
    height: { min: 1500, max: 2400, default: 2100 },
    sill: { min: 0, max: 600, default: 100 },
    leaves: 3,
    minLeafWidth: 800,
  },
  windowHigh: {
    kind: 'windowHigh',
    family: 'window',
    title: 'Окно под потолком',
    width: { min: 600, max: 1800, default: 1200 },
    height: { min: 300, max: 600, default: 400 },
    sill: { min: 1500, max: 2200, default: 1900 },
    leaves: 2,
    minLeafWidth: 500,
  },
  door: {
    kind: 'door',
    family: 'door',
    title: 'Дверь',
    width: { min: 700, max: 1200, default: 900 },
    height: { min: 1900, max: 2300, default: 2050 },
    sill: NO_SILL,
    leaves: 1,
    minLeafWidth: DOOR_LEAF_MIN_MM,
  },
  doorDouble: {
    kind: 'doorDouble',
    family: 'door',
    title: 'Дверь двустворчатая',
    width: { min: 1200, max: 1800, default: 1400 },
    height: { min: 1900, max: 2300, default: 2050 },
    sill: NO_SILL,
    leaves: 2,
    minLeafWidth: DOOR_LEAF_MIN_MM,
  },
  doorway: {
    kind: 'doorway',
    family: 'door',
    title: 'Проём без двери',
    width: { min: 700, max: 2400, default: 1000 },
    height: { min: 1900, max: 2500, default: 2100 },
    sill: NO_SILL,
    leaves: 0,
    minLeafWidth: DOOR_LEAF_MIN_MM,
  },
  balcony: {
    kind: 'balcony',
    family: 'door',
    title: 'Балконный блок',
    width: { min: 1300, max: 2400, default: 1800 },
    height: { min: 2000, max: 2400, default: 2100 },
    sill: NO_SILL,
    leaves: 2,
    minLeafWidth: 600,
  },
};

export const OPENING_KINDS: OpeningKind[] = [
  'window',
  'windowSingle',
  'windowTriple',
  'windowPanoramic',
  'windowHigh',
  'door',
  'doorDouble',
  'doorway',
  'balcony',
];

export function countOpeningLeaves(opening: Pick<Opening, 'kind' | 'width'>): number {
  const spec = OPENING_SPECS[opening.kind];
  if (spec.leaves === 0) return 0;
  return Math.max(1, Math.min(spec.leaves, Math.floor(opening.width / spec.minLeafWidth)));
}
