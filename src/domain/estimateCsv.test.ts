import { describe, expect, it } from 'vitest';
import { buildEstimateCsv } from './estimateCsv';
import { DEFAULT_KITCHEN, calculateEstimate } from './kitchen';

describe('estimate csv', () => {
  const rows = buildEstimateCsv(DEFAULT_KITCHEN).replace('﻿', '').trim().split('\r\n');

  it('starts with a header and ends with the total', () => {
    expect(rows[0]).toBe('Артикул;Наименование;Ширина, мм;Цена, ₸');
    expect(rows[rows.length - 1]).toBe(`;Итого;;${calculateEstimate(DEFAULT_KITCHEN).total}`);
  });

  it('has one row per module plus handles, countertop and the total', () => {
    const estimate = calculateEstimate(DEFAULT_KITCHEN);
    expect(rows).toHaveLength(1 + estimate.lines.length + estimate.extraLines.length + 1 + 1);
  });

  it('quotes cells that contain the separator', () => {
    const quoted = rows.find((row) => row.includes('Ручки'));
    expect(quoted).toBeDefined();
    expect(quoted?.split(';').length).toBeGreaterThanOrEqual(4);
  });

  it('marks the file as UTF-8 for spreadsheet programs', () => {
    expect(buildEstimateCsv(DEFAULT_KITCHEN).startsWith('﻿')).toBe(true);
  });
});
