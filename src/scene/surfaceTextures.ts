import * as THREE from 'three';
import type { SurfaceKind, SurfaceOption } from '../domain/catalogFormat';

const TEXTURE_SIZE_PX = 512;
const ANISOTROPY = 8;
const MAX_CANVAS_PX = 1536;
const PIXELS_PER_MM = 0.5;
const HERRINGBONE_LENGTH_RATIO = 4;
const HERRINGBONE_PERIOD_PLANKS = 8;
const HERRINGBONE_PIXELS_PER_PLANK = 48;
const HERRINGBONE_ROTATION = Math.PI / 4;
const PLANK_STAGGER_ROWS = 2;
const GROUT_MM = 3;
const BRICK_JOINT_MM = 8;
const SLAT_GAP_MM = 8;
const TONE_SPREAD = 0.07;

export interface SurfaceTexture {
  texture: THREE.CanvasTexture;
  metersX: number;
  metersY: number;
  rotation: number;
}

interface Painted {
  canvas: HTMLCanvasElement;
  metersX: number;
  metersY: number;
  rotation?: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is not available for surface textures');
  return { canvas, context };
}

function toRepeatingTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

function parseHex(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function shade(hex: string, factor: number): string {
  const [red, green, blue] = parseHex(hex).map((channel) => Math.round(Math.min(255, Math.max(0, channel * factor))));
  return `rgb(${red}, ${green}, ${blue})`;
}

function randomTone(): number {
  return 1 + (Math.random() - 0.5) * 2 * TONE_SPREAD;
}

function paintGray(context: CanvasRenderingContext2D, bounds: Rect, level: number, alpha = 1): void {
  const value = Math.round(Math.min(255, Math.max(0, level * 255)));
  context.fillStyle = `rgba(${value}, ${value}, ${value}, ${alpha})`;
  context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
}

function scatterSpeckles(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, count: number, spread: number): void {
  for (let index = 0; index < count; index += 1) {
    const level = 1 + (Math.random() - 0.5) * 2 * spread;
    const size = 1 + Math.random() * 1.5;
    paintGray(context, { x: Math.random() * canvas.width, y: Math.random() * canvas.height, width: size, height: size }, level);
  }
}

function scatterFlecks(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, color: string, count: number): void {
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = shade(color, 0.8 + Math.random() * 0.4);
    context.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

function fillWrapped(canvas: HTMLCanvasElement, draw: (dx: number, dy: number) => void): void {
  [-1, 0, 1].forEach((column) => [-1, 0, 1].forEach((row) => draw(column * canvas.width, row * canvas.height)));
}

function paintPlankRect(context: CanvasRenderingContext2D, bounds: Rect, color: string, seam: string): void {
  context.fillStyle = shade(color, randomTone());
  context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  for (let streak = 0; streak < 6; streak += 1) {
    context.fillStyle = shade(color, 0.93 + Math.random() * 0.05);
    context.globalAlpha = 0.5;
    context.fillRect(bounds.x + Math.random() * bounds.width, bounds.y, 1 + Math.random() * 2, bounds.height);
  }
  context.globalAlpha = 1;
  context.fillStyle = seam;
  context.fillRect(bounds.x, bounds.y, bounds.width, 1.5);
  context.fillRect(bounds.x, bounds.y, 1.5, bounds.height);
}

function paintPlanks(option: SurfaceOption): Painted {
  const [plankWidthMm, plankLengthMm] = option.sizeMm;
  const plankWidthPx = plankWidthMm * PIXELS_PER_MM;
  const columns = Math.max(1, Math.round(MAX_CANVAS_PX / 2 / plankWidthPx));
  const rowLengthPx = plankLengthMm * PIXELS_PER_MM;
  const { canvas, context } = createCanvas(columns * plankWidthPx, PLANK_STAGGER_ROWS * rowLengthPx);
  const seam = shade(option.color, 0.7);
  for (let column = 0; column < columns; column += 1) {
    const stagger = Math.random() * rowLengthPx;
    for (let row = -1; row < PLANK_STAGGER_ROWS; row += 1) {
      const bounds = { x: column * plankWidthPx, y: row * rowLengthPx + stagger, width: plankWidthPx, height: rowLengthPx };
      paintPlankRect(context, bounds, option.color, seam);
    }
  }
  return { canvas, metersX: (columns * plankWidthMm) / 1000, metersY: (PLANK_STAGGER_ROWS * plankLengthMm) / 1000 };
}

function paintHerringbone(option: SurfaceOption): Painted {
  const plankMm = option.sizeMm[0];
  const unit = HERRINGBONE_PIXELS_PER_PLANK;
  const period = HERRINGBONE_PERIOD_PLANKS;
  const { canvas, context } = createCanvas(period * unit, period * unit);
  const seam = shade(option.color, 0.7);
  const length = HERRINGBONE_LENGTH_RATIO * unit;
  for (let index = 0; index < period; index += 1) {
    const horizontal = { x: index * unit, y: index * unit, width: length, height: unit };
    const vertical = { x: (index + HERRINGBONE_LENGTH_RATIO) * unit, y: (index - HERRINGBONE_LENGTH_RATIO + 1) * unit, width: unit, height: length };
    [horizontal, vertical].forEach((plank) => {
      const tone = randomTone();
      fillWrapped(canvas, (dx, dy) => {
        context.fillStyle = shade(option.color, tone);
        context.fillRect(plank.x + dx, plank.y + dy, plank.width, plank.height);
        context.fillStyle = seam;
        context.fillRect(plank.x + dx, plank.y + dy, plank.width, 1.5);
        context.fillRect(plank.x + dx, plank.y + dy, 1.5, plank.height);
      });
    });
  }
  const meters = (period * plankMm) / 1000;
  return { canvas, metersX: meters, metersY: meters, rotation: HERRINGBONE_ROTATION };
}

function paintCourses(option: SurfaceOption, jointMm: number, staggered: boolean): Painted {
  const [unitWidthMm, unitHeightMm] = option.sizeMm;
  const unitWidthPx = unitWidthMm * PIXELS_PER_MM;
  const unitHeightPx = unitHeightMm * PIXELS_PER_MM;
  const columns = Math.max(2, Math.floor(MAX_CANVAS_PX / 2 / unitWidthPx / 2) * 2);
  const rows = Math.max(2, Math.floor(MAX_CANVAS_PX / 2 / unitHeightPx / 2) * 2);
  const { canvas, context } = createCanvas(columns * unitWidthPx, rows * unitHeightPx);
  const jointPx = Math.max(1, jointMm * PIXELS_PER_MM);
  context.fillStyle = option.accent;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let row = 0; row < rows; row += 1) {
    const shift = staggered && row % 2 === 1 ? unitWidthPx / 2 : 0;
    for (let column = -1; column <= columns; column += 1) {
      context.fillStyle = shade(option.color, randomTone());
      const x = column * unitWidthPx + shift + jointPx / 2;
      fillWrapped(canvas, (dx, dy) => context.fillRect(x + dx, row * unitHeightPx + jointPx / 2 + dy, unitWidthPx - jointPx, unitHeightPx - jointPx));
    }
  }
  return { canvas, metersX: (columns * unitWidthMm) / 1000, metersY: (rows * unitHeightMm) / 1000 };
}

function paintPlain(option: SurfaceOption, flecks: number, speckleSpread: number): Painted {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  context.fillStyle = option.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  scatterSpeckles(context, canvas, 6000, speckleSpread);
  scatterFlecks(context, canvas, option.accent, flecks);
  return { canvas, metersX: 1, metersY: 1 };
}

function paintConcrete(option: SurfaceOption): Painted {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  context.fillStyle = option.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let cloud = 0; cloud < 60; cloud += 1) {
    const radius = 40 + Math.random() * 120;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    context.fillStyle = shade(option.color, 0.9 + Math.random() * 0.2);
    context.globalAlpha = 0.12;
    fillWrapped(canvas, (dx, dy) => {
      context.beginPath();
      context.arc(x + dx, y + dy, radius, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.globalAlpha = 1;
  scatterSpeckles(context, canvas, 4000, 0.06);
  return { canvas, metersX: 1.5, metersY: 1.5 };
}

function paintStripes(option: SurfaceOption): Painted {
  const stripeMm = option.sizeMm[0];
  const stripePx = stripeMm * PIXELS_PER_MM;
  const pairs = Math.max(1, Math.round(TEXTURE_SIZE_PX / (2 * stripePx)));
  const { canvas, context } = createCanvas(pairs * 2 * stripePx, TEXTURE_SIZE_PX);
  context.fillStyle = option.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = option.accent;
  for (let pair = 0; pair < pairs; pair += 1) context.fillRect((pair * 2 + 1) * stripePx, 0, stripePx, canvas.height);
  scatterSpeckles(context, canvas, 3000, 0.03);
  return { canvas, metersX: (pairs * 2 * stripeMm) / 1000, metersY: (TEXTURE_SIZE_PX / PIXELS_PER_MM) / 1000 };
}

function paintDots(option: SurfaceOption): Painted {
  const cellMm = option.sizeMm[0];
  const cellPx = cellMm * PIXELS_PER_MM;
  const cells = Math.max(2, Math.round(TEXTURE_SIZE_PX / cellPx / 2) * 2);
  const { canvas, context } = createCanvas(cells * cellPx, cells * cellPx);
  context.fillStyle = option.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = option.accent;
  for (let row = 0; row < cells; row += 1) {
    for (let column = 0; column < cells; column += 1) {
      const shift = row % 2 === 1 ? cellPx / 2 : 0;
      context.beginPath();
      context.arc(column * cellPx + shift + cellPx / 2, row * cellPx + cellPx / 2, cellPx * 0.14, 0, Math.PI * 2);
      context.fill();
    }
  }
  return { canvas, metersX: (cells * cellMm) / 1000, metersY: (cells * cellMm) / 1000 };
}

function paintLinen(option: SurfaceOption): Painted {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  context.fillStyle = option.color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (let line = 0; line < canvas.width; line += 2) {
    context.fillStyle = shade(option.color, 0.94 + Math.random() * 0.08);
    context.globalAlpha = 0.5;
    context.fillRect(line, 0, 1, canvas.height);
    context.fillRect(0, line, canvas.width, 1);
  }
  context.globalAlpha = 1;
  return { canvas, metersX: 0.5, metersY: 0.5 };
}

function paintSlats(option: SurfaceOption): Painted {
  const slatMm = option.sizeMm[0];
  const slatPx = slatMm * PIXELS_PER_MM;
  const count = Math.max(2, Math.round(TEXTURE_SIZE_PX / slatPx));
  const { canvas, context } = createCanvas(count * slatPx, TEXTURE_SIZE_PX);
  context.fillStyle = option.accent;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gapPx = SLAT_GAP_MM * PIXELS_PER_MM;
  for (let index = 0; index < count; index += 1) {
    context.fillStyle = shade(option.color, randomTone());
    context.fillRect(index * slatPx + gapPx / 2, 0, slatPx - gapPx, canvas.height);
  }
  return { canvas, metersX: (count * slatMm) / 1000, metersY: (TEXTURE_SIZE_PX / PIXELS_PER_MM) / 1000 };
}

const PAINTERS: Record<SurfaceKind, (option: SurfaceOption) => Painted> = {
  planks: paintPlanks,
  herringbone: paintHerringbone,
  tiles: (option) => paintCourses(option, GROUT_MM, false),
  metro: (option) => paintCourses(option, GROUT_MM, true),
  brick: (option) => paintCourses(option, BRICK_JOINT_MM, true),
  sheet: (option) => paintPlain(option, 900, 0.03),
  concrete: paintConcrete,
  paint: (option) => paintPlain(option, 0, 0.05),
  stripes: paintStripes,
  dots: paintDots,
  linen: paintLinen,
  slats: paintSlats,
};

const cache = new Map<string, SurfaceTexture>();

export function getSurfaceTexture(option: SurfaceOption): SurfaceTexture {
  const cached = cache.get(option.id);
  if (cached) return cached;
  const painted = PAINTERS[option.kind](option);
  const surface = {
    texture: toRepeatingTexture(painted.canvas),
    metersX: painted.metersX,
    metersY: painted.metersY,
    rotation: painted.rotation ?? 0,
  };
  cache.set(option.id, surface);
  return surface;
}

export function createPlasterTexture(): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  paintGray(context, { x: 0, y: 0, width: canvas.width, height: canvas.height }, 0.97);
  scatterSpeckles(context, canvas, 5000, 0.05);
  return toRepeatingTexture(canvas);
}

const STONE_TILE_METERS = 0.4;
const WOOD_TILE_METERS = 0.8;
const WOOD_STREAKS = 520;
const STEEL_TILE_METERS = 0.5;
const STEEL_STREAKS = 900;

export function createStoneTexture(): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  paintGray(context, { x: 0, y: 0, width: canvas.width, height: canvas.height }, 0.95);
  scatterSpeckles(context, canvas, 9000, 0.09);
  const texture = toRepeatingTexture(canvas);
  texture.userData.tileMeters = STONE_TILE_METERS;
  return texture;
}

export function createWoodGrainTexture(): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  paintGray(context, { x: 0, y: 0, width: canvas.width, height: canvas.height }, 0.9);
  for (let streak = 0; streak < WOOD_STREAKS; streak += 1) {
    const x = Math.random() * canvas.width;
    const width = 0.5 + Math.random() * 2.2;
    const level = 0.5 + Math.random() * 0.3;
    context.globalAlpha = 0.25 + Math.random() * 0.4;
    const wobble = (Math.random() - 0.5) * 6;
    context.fillStyle = `rgb(${Math.round(level * 255)}, ${Math.round(level * 255)}, ${Math.round(level * 255)})`;
    context.beginPath();
    context.moveTo(x, 0);
    context.quadraticCurveTo(x + wobble, canvas.height / 2, x, canvas.height);
    context.lineTo(x + width, canvas.height);
    context.quadraticCurveTo(x + width + wobble, canvas.height / 2, x + width, 0);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = toRepeatingTexture(canvas);
  texture.userData.tileMeters = WOOD_TILE_METERS;
  return texture;
}

export function createBrushedSteelTexture(): THREE.CanvasTexture {
  const { canvas, context } = createCanvas(TEXTURE_SIZE_PX, TEXTURE_SIZE_PX);
  const whole: Rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
  paintGray(context, whole, 0.93);
  for (let streak = 0; streak < STEEL_STREAKS; streak += 1) {
    const level = 0.82 + Math.random() * 0.18;
    const strip: Rect = { x: Math.random() * canvas.width, y: 0, width: 0.6 + Math.random() * 1.4, height: canvas.height };
    paintGray(context, strip, level, 0.2 + Math.random() * 0.4);
  }
  const texture = toRepeatingTexture(canvas);
  texture.userData.tileMeters = STEEL_TILE_METERS;
  return texture;
}

const PREVIEW_SIZE_PX = 96;
const PREVIEW_SPAN_M = 0.45;
const previews = new Map<string, string>();

export function getSurfacePreviewUrl(option: SurfaceOption): string {
  const cached = previews.get(option.id);
  if (cached) return cached;
  const surface = getSurfaceTexture(option);
  const source = surface.texture.image as HTMLCanvasElement;
  const { canvas, context } = createCanvas(PREVIEW_SIZE_PX, PREVIEW_SIZE_PX);
  const pattern = context.createPattern(source, 'repeat');
  if (!pattern) throw new Error(`Preview pattern for ${option.id} was not created`);
  const pixelsPerMeter = PREVIEW_SIZE_PX / PREVIEW_SPAN_M;
  context.translate(PREVIEW_SIZE_PX / 2, PREVIEW_SIZE_PX / 2);
  context.rotate(surface.rotation);
  context.scale(pixelsPerMeter * surface.metersX / source.width, pixelsPerMeter * surface.metersY / source.height);
  context.fillStyle = pattern;
  context.fillRect(-source.width * 4, -source.height * 4, source.width * 8, source.height * 8);
  const url = canvas.toDataURL('image/png');
  previews.set(option.id, url);
  return url;
}
