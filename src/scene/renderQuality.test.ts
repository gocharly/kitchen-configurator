import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAST_QUALITY_LEVEL, QUALITY_LEVELS, createFrameCostMonitor, createQualityCalibration } from './renderQuality';

describe('frame cost monitor', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { hidden: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for lower quality after a run of slow frames', () => {
    const onSlow = vi.fn();
    const monitor = createFrameCostMonitor(onSlow);
    for (let index = 0; index < 8; index += 1) monitor.record(55);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('keeps quality while frames are fast', () => {
    const onSlow = vi.fn();
    const monitor = createFrameCostMonitor(onSlow);
    for (let index = 0; index < 40; index += 1) monitor.record(9);
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('ignores a single slow frame among fast ones', () => {
    const onSlow = vi.fn();
    const monitor = createFrameCostMonitor(onSlow);
    [9, 9, 120, 9, 9, 9, 9, 9, 9].forEach((cost) => monitor.record(cost));
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('waits before asking again', () => {
    const onSlow = vi.fn();
    const monitor = createFrameCostMonitor(onSlow);
    for (let index = 0; index < 30; index += 1) monitor.record(55);
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('does not count frames of a hidden tab', () => {
    vi.stubGlobal('document', { hidden: true });
    const onSlow = vi.fn();
    const monitor = createFrameCostMonitor(onSlow);
    for (let index = 0; index < 20; index += 1) monitor.record(500);
    expect(onSlow).not.toHaveBeenCalled();
  });
});

describe('quality levels', () => {
  it('drops the occlusion pass before it lowers the resolution', () => {
    const firstCheaperLevel = QUALITY_LEVELS.findIndex((level) => !level.hasOcclusion);
    expect(firstCheaperLevel).toBe(1);
    expect(QUALITY_LEVELS[firstCheaperLevel].pixelRatio).toBe(QUALITY_LEVELS[0].pixelRatio);
  });


  it('only get cheaper from one level to the next', () => {
    QUALITY_LEVELS.slice(1).forEach((level, index) => {
      const previous = QUALITY_LEVELS[index];
      expect(level.pixelRatio).toBeLessThanOrEqual(previous.pixelRatio);
      expect(level.shadowMapSize).toBeLessThanOrEqual(previous.shadowMapSize);
      expect(level.occlusionSamples).toBeLessThanOrEqual(previous.occlusionSamples);
      expect(Number(level.hasOcclusion)).toBeLessThanOrEqual(Number(previous.hasOcclusion));
    });
    expect(LAST_QUALITY_LEVEL).toBe(QUALITY_LEVELS.length - 1);
  });
});

describe('createQualityCalibration', () => {
  const feed = (calibration: ReturnType<typeof createQualityCalibration>, interval: number, count: number, canDegrade = true) =>
    Array.from({ length: count }, () => calibration.record(interval, canDegrade));

  it('accepts after enough fast frames', () => {
    expect(feed(createQualityCalibration(), 16, 11).at(-1)).toBe('accept');
  });

  it('degrades on slow frames and warms up again', () => {
    const calibration = createQualityCalibration();
    const verdicts = feed(calibration, 60, 11);
    expect(verdicts.at(-1)).toBe('degrade');
    expect(feed(calibration, 16, 3).every((verdict) => verdict === 'continue')).toBe(true);
  });

  it('accepts slow frames on the lowest level', () => {
    expect(feed(createQualityCalibration(), 60, 11, false).at(-1)).toBe('accept');
  });
});
