export type OpeningKind = 'window' | 'door';

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
  title: string;
  width: Range;
  height: Range;
  sill: Range;
}

export const OPENING_STEP_MM = 50;

export const OPENING_SPECS: Record<OpeningKind, OpeningSpec> = {
  window: {
    kind: 'window',
    title: 'Окно',
    width: { min: 500, max: 2400, default: 1200 },
    height: { min: 500, max: 1800, default: 1400 },
    sill: { min: 300, max: 1200, default: 900 },
  },
  door: {
    kind: 'door',
    title: 'Дверь',
    width: { min: 700, max: 1200, default: 900 },
    height: { min: 1900, max: 2300, default: 2050 },
    sill: { min: 0, max: 0, default: 0 },
  },
};

export const OPENING_KINDS: OpeningKind[] = ['window', 'door'];
