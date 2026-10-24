import * as THREE from 'three';
import { BACKSPLASHES, COUNTERTOP_THICKNESS_MM, NO_BACKSPLASH_ID, getModuleSpec } from '../domain/catalog';
import { WALLS, layoutKitchen, listFillers, listItemFootprints, type Kitchen, type WallId } from '../domain/kitchen';
import { MM, type Materials } from './cabinetFronts';
import { findSurface, projectUvToMeters } from './surfaceMaterials';
import { getSurfaceTexture } from './surfaceTextures';
import { mergeSpans, positionOnWall, type WallSpan } from './wallPlacement';

const BACKSPLASH_TOP_MM = 1400;
const BACKSPLASH_THICKNESS_MM = 8;
const MIN_PIECE_MM = 20;

function listCountertopSpans(kitchen: Kitchen, wall: WallId): WallSpan[] {
  const fromModules = layoutKitchen(kitchen)
    .filter((item) => item.spec.hasCountertop)
    .flatMap((item) => listItemFootprints(item).filter((footprint) => footprint.wall === wall && footprint.row === 'lower'))
    .map((footprint): WallSpan => [footprint.start, footprint.end]);
  const fromFillers = listFillers(kitchen)
    .filter((filler) => filler.wall === wall && filler.row === 'lower' && filler.hasCountertop)
    .map((filler): WallSpan => [filler.offset, filler.offset + filler.width]);
  return mergeSpans([...fromModules, ...fromFillers]);
}

interface OpeningCut {
  span: WallSpan;
  sill: number;
}

function listOpeningCuts(kitchen: Kitchen, wall: WallId, bottom: number): OpeningCut[] {
  return kitchen.openings
    .filter((opening) => opening.wall === wall && opening.sill < BACKSPLASH_TOP_MM && opening.sill + opening.height > bottom)
    .map((opening) => ({ span: [opening.offset, opening.offset + opening.width] as WallSpan, sill: opening.sill }));
}

function clipSpans(spans: WallSpan[], [from, to]: WallSpan): WallSpan[] {
  return spans.map(([start, end]): WallSpan => [Math.max(start, from), Math.min(end, to)]).filter(([start, end]) => end > start);
}

function subtractSpans(spans: WallSpan[], removed: WallSpan[]): WallSpan[] {
  return removed.reduce<WallSpan[]>(
    (pieces, [from, to]) =>
      pieces.flatMap(([start, end]): WallSpan[] => {
        if (to <= start || from >= end) return [[start, end]];
        return [[start, Math.min(from, end)], [Math.max(to, start), end]].filter(([a, b]) => b - a > 0) as WallSpan[];
      }),
    spans,
  );
}

function buildPiece(kitchen: Kitchen, span: WallSpan, heights: { bottom: number; top: number }, material: THREE.Material): THREE.Mesh {
  const { bottom, top } = heights;
  const [start, end] = span;
  const shape = new THREE.Shape();
  shape.moveTo(0, bottom * MM);
  shape.lineTo((end - start) * MM, bottom * MM);
  shape.lineTo((end - start) * MM, top * MM);
  shape.lineTo(0, top * MM);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: BACKSPLASH_THICKNESS_MM * MM, bevelEnabled: false });
  const surface = getSurfaceTexture(findSurface(BACKSPLASHES, kitchen.backsplashId));
  projectUvToMeters(geometry, surface, (u, v) => [u + start * MM, v]);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

export function buildBacksplash(kitchen: Kitchen, materials: Materials): THREE.Group {
  const group = new THREE.Group();
  if (kitchen.backsplashId === NO_BACKSPLASH_ID) return group;
  const bottom = getModuleSpec('base-1-door').elevation + getModuleSpec('base-1-door').height + COUNTERTOP_THICKNESS_MM;
  WALLS.forEach(({ id: wall }) => {
    const countertopSpans = listCountertopSpans(kitchen, wall);
    const cuts = listOpeningCuts(kitchen, wall, bottom);
    const pieces = [
      ...subtractSpans(countertopSpans, cuts.map((cut) => cut.span)).map((span) => ({ span, top: BACKSPLASH_TOP_MM })),
      ...cuts.flatMap((cut) => clipSpans(countertopSpans, cut.span).map((span) => ({ span, top: Math.min(cut.sill, BACKSPLASH_TOP_MM) }))),
    ];
    pieces
      .filter(({ span, top }) => span[1] - span[0] >= MIN_PIECE_MM && top - bottom >= MIN_PIECE_MM)
      .forEach(({ span, top }) => {
        const holder = new THREE.Group().add(buildPiece(kitchen, span, { bottom, top }, materials.backsplash));
        positionOnWall(holder, { wall, offset: span[0], width: span[1] - span[0] }, kitchen.room);
        group.add(holder);
      });
  });
  return group;
}
