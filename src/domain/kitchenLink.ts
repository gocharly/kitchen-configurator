import { BODY_COLORS, FACADE_COLORS, FLOORS, MODULE_SPECS, WALL_FINISHES } from './catalog';
import { WALLS, type Kitchen, type WallId } from './kitchen';
import { OPENING_SPECS, type Opening, type OpeningKind } from './openings';
import { normalizeRotation, type FreeModule } from './freeModules';
import { createKitchenFromDraft, type FreeDraft, type RunDrafts } from './kitchenBuilder';

type LinkRun = [specId: string, width: number][];
type LinkFree = [specId: string, width: number, cx: number, cz: number, rotation: number];
type LinkOpening = [kind: OpeningKind, wall: WallId, offset: number, width: number, height: number, sill: number];

interface LinkPayload {
  r: [number, number, number];
  f: string;
  b: string;
  fl: string;
  w: string;
  m: Partial<Record<WallId, LinkRun>>;
  o: LinkOpening[];
  s?: LinkFree[];
}

const KNOWN_SPEC_IDS = new Set(MODULE_SPECS.map((spec) => spec.id));

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const padded = token.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

function encodeFreeModule(free: FreeModule): LinkFree {
  return [free.module.specId, free.module.width, free.cx, free.cz, free.rotation];
}

export function encodeKitchenLink(kitchen: Kitchen): string {
  const runs: Partial<Record<WallId, LinkRun>> = {};
  WALLS.forEach(({ id }) => {
    if (kitchen.runs[id].length > 0) runs[id] = kitchen.runs[id].map((m) => [m.specId, m.width]);
  });
  const { length, width, height } = kitchen.room;
  const payload: LinkPayload = { r: [length, width, height], f: kitchen.facadeColorId, b: kitchen.bodyColorId,
    fl: kitchen.floorId,
    w: kitchen.wallFinishId,
    m: runs,
    o: kitchen.openings.map((o) => [o.kind, o.wall, o.offset, o.width, o.height, o.sill]),
  };
  if (kitchen.freeModules.length > 0) payload.s = kitchen.freeModules.map(encodeFreeModule);
  return toBase64Url(JSON.stringify(payload));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readRun(value: unknown): LinkRun {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): LinkRun => {
    if (!Array.isArray(entry)) return [];
    const [specId, width] = entry;
    return typeof specId === 'string' && KNOWN_SPEC_IDS.has(specId) && isFiniteNumber(width) ? [[specId, width]] : [];
  });
}

function readFreeModules(value: unknown): FreeDraft[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): FreeDraft[] => {
    if (!Array.isArray(entry)) return [];
    const [specId, width, cx, cz, rotation] = entry;
    const isKnownSpec = typeof specId === 'string' && KNOWN_SPEC_IDS.has(specId);
    if (!isKnownSpec || ![width, cx, cz].every(isFiniteNumber)) return [];
    return [{ specId, width, cx, cz, rotation: normalizeRotation(isFiniteNumber(rotation) ? rotation : 0) }];
  });
}

function readOpenings(value: unknown): Opening[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index): Opening[] => {
    if (!Array.isArray(entry)) return [];
    const [kind, wall, offset, width, height, sill] = entry;
    const isKnownKind = typeof kind === 'string' && kind in OPENING_SPECS;
    const isKnownWall = typeof wall === 'string' && WALLS.some((w) => w.id === wall);
    if (!isKnownKind || !isKnownWall || ![offset, width, height, sill].every(isFiniteNumber)) return [];
    return [{ id: `link-o-${index}`, kind: kind as OpeningKind, wall: wall as WallId, offset, width, height, sill }];
  });
}

function pickColorId(options: { id: string }[], value: unknown): string | undefined {
  return options.find((option) => option.id === value)?.id;
}

function readPayload(token: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(token));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function decodeKitchenLink(token: string): Kitchen | null {
  const payload = readPayload(token);
  if (!payload) return null;
  const room = payload.r;
  if (!Array.isArray(room) || room.length !== 3 || !room.every(isFiniteNumber)) return null;
  const rawRuns = typeof payload.m === 'object' && payload.m !== null ? (payload.m as Record<string, unknown>) : {};
  const runs: RunDrafts = {};
  WALLS.forEach(({ id }) => {
    runs[id] = readRun(rawRuns[id]);
  });
  return createKitchenFromDraft({
    idPrefix: 'link',
    room: { length: room[0], width: room[1], height: room[2] },
    runs,
    openings: readOpenings(payload.o),
    free: readFreeModules(payload.s),
    facadeColorId: pickColorId(FACADE_COLORS, payload.f),
    bodyColorId: pickColorId(BODY_COLORS, payload.b),
    floorId: pickColorId(FLOORS, payload.fl),
    wallFinishId: pickColorId(WALL_FINISHES, payload.w),
  });
}
