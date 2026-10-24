export interface QualityLevel {
  pixelRatio: number;
  hasOcclusion: boolean;
  occlusionScale: number;
  occlusionSamples: number;
  shadowMapSize: number;
}

export const QUALITY_LEVELS: QualityLevel[] = [
  { pixelRatio: 2, hasOcclusion: true, occlusionScale: 1, occlusionSamples: 24, shadowMapSize: 2048 },
  { pixelRatio: 2, hasOcclusion: false, occlusionScale: 1, occlusionSamples: 24, shadowMapSize: 2048 },
  { pixelRatio: 1.5, hasOcclusion: false, occlusionScale: 1, occlusionSamples: 24, shadowMapSize: 1024 },
  { pixelRatio: 1, hasOcclusion: false, occlusionScale: 1, occlusionSamples: 24, shadowMapSize: 1024 },
];

export const LAST_QUALITY_LEVEL = QUALITY_LEVELS.length - 1;

const STORAGE_KEY = 'kitchen-render-quality-v2';
const SLOW_FRAME_MS = 30;
const SAMPLE_COUNT = 8;
const COOLDOWN_MS = 1500;

export function pickStartQualityLevel(): number {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isInteger(stored) && stored >= 0 && stored <= LAST_QUALITY_LEVEL) return stored;
  } catch {
    return 0;
  }
  return 0;
}

export function rememberQualityLevel(level: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(level));
  } catch {
    return;
  }
}

export interface FrameCostMonitor {
  record: (costMs: number) => void;
}

export function createFrameCostMonitor(onSlow: () => void): FrameCostMonitor {
  const costs: number[] = [];
  let lastChange = Number.NEGATIVE_INFINITY;
  return {
    record(costMs) {
      if (document.hidden) return;
      costs.push(costMs);
      if (costs.length > SAMPLE_COUNT) costs.shift();
      const now = performance.now();
      if (costs.length < SAMPLE_COUNT || now - lastChange < COOLDOWN_MS) return;
      const median = [...costs].sort((a, b) => a - b)[costs.length >> 1];
      if (median <= SLOW_FRAME_MS) return;
      lastChange = now;
      costs.length = 0;
      onSlow();
    },
  };
}
