import { describe, expect, it } from 'vitest';
import { listPlacedModules } from './kitchen';
import { KITCHEN_TEMPLATES } from './templates';

const EXPECTED_MODULE_COUNTS: Record<string, number> = {
  'straight-2400': 8,
  'straight-3000-tall': 9,
  'straight-3600': 12,
  'corner-left': 11,
  'corner-fridge': 10,
  'u-shape': 12,
};

describe('KITCHEN_TEMPLATES', () => {
  it.each(KITCHEN_TEMPLATES)('places every module of $title', (template) => {
    expect(listPlacedModules(template.kitchen)).toHaveLength(EXPECTED_MODULE_COUNTS[template.id]);
  });

  it('keeps the requested room size', () => {
    const corner = KITCHEN_TEMPLATES.find((t) => t.id === 'corner-left');
    expect(corner?.kitchen.room).toEqual({ length: 3600, width: 2700, height: 2700 });
  });
});
