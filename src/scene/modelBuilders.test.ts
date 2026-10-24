import { describe, expect, it } from 'vitest';
import { MODULE_SPECS } from '../domain/catalog';
import { hasModelBuilder } from './modelBuilders';

describe('catalog models', () => {
  it('has a builder for every model named in the catalog', () => {
    const missing = MODULE_SPECS.filter((spec) => spec.model !== undefined && !hasModelBuilder(spec.model)).map((spec) => `${spec.id}: ${spec.model}`);
    expect(missing).toEqual([]);
  });

  it('draws standing modules from a model or from the cabinet body', () => {
    const standing = MODULE_SPECS.filter((spec) => spec.type === 'standing');
    expect(standing.length).toBeGreaterThan(0);
    standing.filter((spec) => spec.row === 'upper').forEach((spec) => expect(spec.category).toBe('interior'));
  });
});
