export const CATALOG_SCHEMA = 'openkitchen3d/catalog@0.1';

export type RowName = 'lower' | 'upper';
export type FamilyType = 'base' | 'wall' | 'tall' | 'corner' | 'specialty';
export type FrontBandKind = 'doors' | 'flap' | 'drawer' | 'opening';

export interface FrontBand {
  kind: FrontBandKind;
  ratio: number;
  leaves?: 1 | 2;
}

export interface ModuleSpec {
  id: string;
  type: FamilyType;
  category: string;
  title: string;
  row: RowName;
  minWidth: number;
  maxWidth: number;
  widthStep: number;
  defaultWidth: number;
  height: number;
  depth: number;
  elevation: number;
  front: FrontBand[];
  glass: boolean;
  hasSink: boolean;
  hasCountertop: boolean;
  isCorner: boolean;
  model?: string;
  sku: (width: number) => string;
  priceFor: (width: number) => number;
}

export type SurfaceKind =
  | 'planks'
  | 'herringbone'
  | 'tiles'
  | 'metro'
  | 'brick'
  | 'sheet'
  | 'concrete'
  | 'paint'
  | 'stripes'
  | 'dots'
  | 'linen'
  | 'slats';

export interface SurfaceOption {
  id: string;
  title: string;
  kind: SurfaceKind;
  color: string;
  accent: string;
  sizeMm: [number, number];
  roughness: number;
}

export interface CategorySpec {
  id: string;
  title: string;
}

export type ColorFinish = 'wood';

export interface ColorOption {
  id: string;
  title: string;
  hex: string;
  finish?: ColorFinish;
}

export interface Catalog {
  id: string;
  version: string;
  locale: string;
  currency: string;
  categories: CategorySpec[];
  specs: ModuleSpec[];
  facadeColors: ColorOption[];
  bodyColors: ColorOption[];
  floors: SurfaceOption[];
  wallFinishes: SurfaceOption[];
  plinthHeight: number;
  countertop: { thickness: number; overhang: number; priceFor: (length: number) => number };
  filler: FillerSpec;
  minAisle: number;
}

export interface FillerSpec {
  title: string;
  minWidth: number;
  maxWidth: number;
  sku: (width: number) => string;
  priceFor: (width: number) => number;
}

export class CatalogError extends Error {
  constructor(path: string, message: string) {
    super(`Catalog ${path}: ${message}`);
    this.name = 'CatalogError';
  }
}

type Evaluator = (values: Record<string, number>) => number;

const NUMBER_PATTERN = /^\d+(\.\d+)?/;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*/;
const RATIO_TOLERANCE = 0.01;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const FAMILY_TYPES: FamilyType[] = ['base', 'wall', 'tall', 'corner', 'specialty'];
const ROWS: RowName[] = ['lower', 'upper'];
const COLOR_FINISHES: ColorFinish[] = ['wood'];
const FLOOR_KINDS: SurfaceKind[] = ['planks', 'herringbone', 'tiles', 'sheet', 'concrete'];
const WALL_KINDS: SurfaceKind[] = ['paint', 'stripes', 'dots', 'linen', 'brick', 'metro', 'tiles', 'slats'];
const SURFACE_SIZE_LIMITS = { min: 1, max: 3000 };
const DEFAULT_SURFACE_ROUGHNESS = 0.7;
const FRONT_KINDS: FrontBandKind[] = ['doors', 'flap', 'drawer', 'opening'];

class ExpressionParser {
  private position = 0;

  constructor(
    private readonly source: string,
    private readonly allowedNames: string[],
    private readonly path: string,
  ) {}

  parse(): Evaluator {
    const evaluator = this.parseSum();
    this.skipSpaces();
    if (this.position < this.source.length) this.fail(`unexpected "${this.source[this.position]}"`);
    return evaluator;
  }

  private fail(message: string): never {
    throw new CatalogError(this.path, `expression "${this.source}": ${message}`);
  }

  private skipSpaces(): void {
    while (this.source[this.position] === ' ') this.position += 1;
  }

  private peek(): string {
    this.skipSpaces();
    return this.source[this.position] ?? '';
  }

  private parseSum(): Evaluator {
    let left = this.parseProduct();
    while (this.peek() === '+' || this.peek() === '-') {
      const operator = this.source[this.position++];
      const right = this.parseProduct();
      const current = left;
      left = operator === '+' ? (v) => current(v) + right(v) : (v) => current(v) - right(v);
    }
    return left;
  }

  private parseProduct(): Evaluator {
    let left = this.parseFactor();
    while (this.peek() === '*' || this.peek() === '/') {
      const operator = this.source[this.position++];
      const right = this.parseFactor();
      const current = left;
      left = operator === '*' ? (v) => current(v) * right(v) : (v) => current(v) / right(v);
    }
    return left;
  }

  private parseFactor(): Evaluator {
    const next = this.peek();
    if (next === '-') {
      this.position += 1;
      const operand = this.parseFactor();
      return (v) => -operand(v);
    }
    if (next === '(') {
      this.position += 1;
      const inner = this.parseSum();
      if (this.peek() !== ')') this.fail('missing ")"');
      this.position += 1;
      return inner;
    }
    const rest = this.source.slice(this.position);
    const numberMatch = NUMBER_PATTERN.exec(rest);
    if (numberMatch) {
      this.position += numberMatch[0].length;
      const value = Number(numberMatch[0]);
      return () => value;
    }
    const nameMatch = IDENTIFIER_PATTERN.exec(rest);
    if (!nameMatch) return this.fail(next === '' ? 'unexpected end' : `unexpected "${next}"`);
    const name = nameMatch[0];
    if (!this.allowedNames.includes(name)) this.fail(`unknown name "${name}", allowed: ${this.allowedNames.join(', ')}`);
    this.position += name.length;
    return (values) => values[name];
  }
}

export function compileExpression(source: string, allowedNames: string[], path: string): Evaluator {
  return new ExpressionParser(source, allowedNames, path).parse();
}

type Json = Record<string, unknown>;

function asObject(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new CatalogError(path, 'must be an object');
  return value as Json;
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) throw new CatalogError(path, 'must be a non-empty array');
  return value;
}

function asText(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new CatalogError(path, 'must be a non-empty string');
  return value;
}

function asNumber(value: unknown, path: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new CatalogError(path, `must be a number not less than ${minimum}`);
  }
  return value;
}

function asFlag(value: unknown, path: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') throw new CatalogError(path, 'must be true or false');
  return value;
}

function asOneOf<T extends string>(value: unknown, path: string, allowed: T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new CatalogError(path, `must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function readUniqueIds<T extends { id: string }>(items: T[], path: string): void {
  const seen = new Set<string>();
  items.forEach((item) => {
    if (seen.has(item.id)) throw new CatalogError(path, `id "${item.id}" is used twice`);
    seen.add(item.id);
  });
}

function readColors(value: unknown, path: string): ColorOption[] {
  const colors = asArray(value, path).map((entry, index) => {
    const color = asObject(entry, `${path}[${index}]`);
    const hex = asText(color.hex, `${path}[${index}].hex`);
    if (!COLOR_PATTERN.test(hex)) throw new CatalogError(`${path}[${index}].hex`, 'must look like #aabbcc');
    const finish = color.finish === undefined ? undefined : asOneOf(color.finish, `${path}[${index}].finish`, COLOR_FINISHES);
    return { id: asText(color.id, `${path}[${index}].id`), title: asText(color.title, `${path}[${index}].title`), hex, finish };
  });
  readUniqueIds(colors, path);
  return colors;
}

function readSurfaces(value: unknown, path: string, allowedKinds: SurfaceKind[]): SurfaceOption[] {
  const surfaces = asArray(value, path).map((entry, index): SurfaceOption => {
    const at = `${path}[${index}]`;
    const surface = asObject(entry, at);
    const color = asText(surface.color, `${at}.color`);
    const accent = surface.accent === undefined ? color : asText(surface.accent, `${at}.accent`);
    [color, accent].forEach((hex) => {
      if (!COLOR_PATTERN.test(hex)) throw new CatalogError(at, `color "${hex}" must look like #aabbcc`);
    });
    const size = surface.size === undefined ? [1, 1] : asArray(surface.size, `${at}.size`);
    const sizeMm: [number, number] = [
      asNumber(size[0], `${at}.size[0]`, SURFACE_SIZE_LIMITS.min),
      asNumber(size[1] ?? size[0], `${at}.size[1]`, SURFACE_SIZE_LIMITS.min),
    ];
    return {
      id: asText(surface.id, `${at}.id`),
      title: asText(surface.title, `${at}.title`),
      kind: asOneOf(surface.kind, `${at}.kind`, allowedKinds),
      color,
      accent,
      sizeMm,
      roughness: surface.roughness === undefined ? DEFAULT_SURFACE_ROUGHNESS : asNumber(surface.roughness, `${at}.roughness`, 0),
    };
  });
  readUniqueIds(surfaces, path);
  return surfaces;
}

function readFronts(value: unknown, path: string): FrontBand[] {
  const bands = asArray(value, path).map((entry, index): FrontBand => {
    const band = asObject(entry, `${path}[${index}]`);
    const kind = asOneOf(band.kind, `${path}[${index}].kind`, FRONT_KINDS);
    const ratio = asNumber(band.ratio, `${path}[${index}].ratio`, 0.01);
    if (band.leaves === undefined) return { kind, ratio };
    if (band.leaves !== 1 && band.leaves !== 2) throw new CatalogError(`${path}[${index}].leaves`, 'must be 1 or 2');
    return { kind, ratio, leaves: band.leaves };
  });
  const sum = bands.reduce((total, band) => total + band.ratio, 0);
  if (Math.abs(sum - 1) > RATIO_TOLERANCE) throw new CatalogError(path, `ratios must add up to 1, got ${sum}`);
  return bands;
}

function readPriceFunction(value: unknown, variable: string, path: string, samples: number[]): (input: number) => number {
  const evaluate = compileExpression(asText(value, path), [variable], path);
  samples.forEach((sample) => {
    const result = evaluate({ [variable]: sample });
    if (!Number.isFinite(result) || result < 0) {
      throw new CatalogError(path, `price for ${variable}=${sample} must be a finite number not below 0, got ${result}`);
    }
  });
  return (input) => Math.round(evaluate({ [variable]: input }));
}

function readFamily(value: unknown, index: number, categoryIds: Set<string>): ModuleSpec {
  const path = `families[${index}]`;
  const family = asObject(value, path);
  const id = asText(family.id, `${path}.id`);
  const at = (field: string) => `${path}(${id}).${field}`;
  const category = asText(family.category, at('category'));
  if (!categoryIds.has(category)) throw new CatalogError(at('category'), `unknown category "${category}"`);
  const widths = asObject(family.widths, at('widths'));
  const minWidth = asNumber(widths.min, at('widths.min'), 1);
  const maxWidth = asNumber(widths.max, at('widths.max'), minWidth);
  const widthStep = asNumber(widths.step, at('widths.step'), 1);
  if ((maxWidth - minWidth) % widthStep !== 0) throw new CatalogError(at('widths'), 'max - min must be divisible by step');
  const defaultWidth = asNumber(family.defaultWidth, at('defaultWidth'), minWidth);
  if (defaultWidth > maxWidth || (defaultWidth - minWidth) % widthStep !== 0) {
    throw new CatalogError(at('defaultWidth'), 'must be inside widths and on a step');
  }
  const depths = asArray(family.depths, at('depths')).map((d, i) => asNumber(d, `${at('depths')}[${i}]`, 1));
  const skuTemplate = asText(family.sku, at('sku'));
  if (!skuTemplate.includes('{width}')) throw new CatalogError(at('sku'), 'must contain {width}');
  const isCorner = asFlag(family.corner, at('corner'));
  if (isCorner && minWidth !== maxWidth) throw new CatalogError(at('widths'), 'a corner module has one fixed width');
  return {
    id,
    type: asOneOf(family.type, at('type'), FAMILY_TYPES),
    category,
    title: asText(family.title, at('title')),
    row: asOneOf(family.row, at('row'), ROWS),
    minWidth,
    maxWidth,
    widthStep,
    defaultWidth,
    height: asNumber(family.height, at('height'), 1),
    depth: depths[0],
    elevation: asNumber(family.elevation, at('elevation'), 0),
    front: readFronts(family.fronts, at('fronts')),
    glass: asFlag(family.glass, at('glass')),
    hasSink: asFlag(family.sink, at('sink')),
    hasCountertop: asFlag(family.countertop, at('countertop')),
    isCorner,
    model: family.model === undefined ? undefined : asText(family.model, at('model')),
    sku: (width) => skuTemplate.replaceAll('{width}', String(width)),
    priceFor: readPriceFunction(family.price, 'width', at('price'), [minWidth, maxWidth]),
  };
}

function readFiller(value: unknown): FillerSpec {
  const filler = asObject(value, 'accessories.filler');
  const minWidth = asNumber(filler.minWidth, 'accessories.filler.minWidth', 1);
  const maxWidth = asNumber(filler.maxWidth, 'accessories.filler.maxWidth', minWidth);
  const skuTemplate = asText(filler.sku, 'accessories.filler.sku');
  if (!skuTemplate.includes('{width}')) throw new CatalogError('accessories.filler.sku', 'must contain {width}');
  return {
    title: asText(filler.title, 'accessories.filler.title'),
    minWidth,
    maxWidth,
    sku: (width) => skuTemplate.replaceAll('{width}', String(width)),
    priceFor: readPriceFunction(filler.price, 'width', 'accessories.filler.price', [minWidth, maxWidth]),
  };
}

export function parseCatalog(raw: unknown): Catalog {
  const root = asObject(raw, 'file');
  if (root.schema !== CATALOG_SCHEMA) throw new CatalogError('schema', `must be "${CATALOG_SCHEMA}"`);
  const categories = asArray(root.categories, 'categories').map((entry, index) => {
    const category = asObject(entry, `categories[${index}]`);
    return { id: asText(category.id, `categories[${index}].id`), title: asText(category.title, `categories[${index}].title`) };
  });
  readUniqueIds(categories, 'categories');
  const categoryIds = new Set(categories.map((category) => category.id));
  const specs = asArray(root.families, 'families').map((family, index) => readFamily(family, index, categoryIds));
  readUniqueIds(specs, 'families');
  const finishes = asObject(root.finishes, 'finishes');
  const accessories = asObject(root.accessories, 'accessories');
  const plinth = asObject(accessories.plinth, 'accessories.plinth');
  const countertop = asObject(accessories.countertop, 'accessories.countertop');
  const rules = asObject(root.rules, 'rules');
  return {
    id: asText(root.id, 'id'),
    version: asText(root.version, 'version'),
    locale: asText(root.locale, 'locale'),
    currency: asText(root.currency, 'currency'),
    categories,
    specs,
    facadeColors: readColors(finishes.facade, 'finishes.facade'),
    bodyColors: readColors(finishes.body, 'finishes.body'),
    floors: readSurfaces(finishes.floor, 'finishes.floor', FLOOR_KINDS),
    wallFinishes: readSurfaces(finishes.wall, 'finishes.wall', WALL_KINDS),
    plinthHeight: asNumber(plinth.height, 'accessories.plinth.height', 1),
    countertop: {
      thickness: asNumber(countertop.thickness, 'accessories.countertop.thickness', 1),
      overhang: asNumber(countertop.overhang, 'accessories.countertop.overhang', 0),
      priceFor: readPriceFunction(countertop.price, 'length', 'accessories.countertop.price', [0, 1000, 8000]),
    },
    filler: readFiller(accessories.filler),
    minAisle: asNumber(rules.minAisle, 'rules.minAisle', 0),
  };
}
