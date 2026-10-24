import { describe, expect, it } from 'vitest';
import { addCatalogModule } from './standing';
import { DEFAULT_KITCHEN, calculateEstimate, paintKitchen, resizeRoom } from './kitchen';
import { buildProjectFile, readProjectFile } from './projectFile';

const kitchen = addCatalogModule(
  paintKitchen(resizeRoom(DEFAULT_KITCHEN, { length: 5000, width: 4000 }), { backsplashId: 'metro-grey', handleId: 'knob', facadeStyleId: 'framed', facadeColorId: 'beige' }),
  'table-dining',
  'table',
  'back',
);

describe('project file', () => {
  it('restores the same kitchen from its own file', () => {
    const result = readProjectFile(buildProjectFile(kitchen));
    expect(result.kind).toBe('ready');
    if (result.kind !== 'ready') return;
    expect(result.skippedCount).toBe(0);
    expect(result.kitchen.room).toEqual(kitchen.room);
    expect(result.kitchen).toMatchObject({ backsplashId: 'metro-grey', handleId: 'knob', facadeStyleId: 'framed', facadeColorId: 'beige' });
    expect(calculateEstimate(result.kitchen).total).toBe(calculateEstimate(kitchen).total);
    expect(result.kitchen.freeModules).toHaveLength(1);
  });

  it('writes a readable file with format and version', () => {
    const file = JSON.parse(buildProjectFile(kitchen, new Date('2026-10-24T12:00:00Z')));
    expect(file).toMatchObject({ format: 'kitchen-configurator/project', version: 1, savedAt: '2026-10-24T12:00:00.000Z' });
  });

  it('rejects text that is not JSON', () => {
    expect(readProjectFile('hello')).toEqual({ kind: 'rejected', reason: 'Файл не читается: это не JSON' });
  });

  it('rejects JSON of another format', () => {
    expect(readProjectFile('{"a":1}')).toMatchObject({ kind: 'rejected', reason: 'Файл не похож на проект конструктора' });
  });

  it('rejects a project saved by a newer version', () => {
    const future = JSON.stringify({ format: 'kitchen-configurator/project', version: 99, kitchen: {} });
    expect(readProjectFile(future)).toMatchObject({ kind: 'rejected', reason: 'Проект сохранён в более новой версии конструктора' });
  });

  it('rejects a project without a usable kitchen', () => {
    const broken = JSON.stringify({ format: 'kitchen-configurator/project', version: 1, kitchen: { r: 'x' } });
    expect(readProjectFile(broken)).toMatchObject({ kind: 'rejected', reason: 'В файле нет кухни или она повреждена' });
  });

  it('counts modules that no longer exist in the catalog as skipped', () => {
    const file = JSON.parse(buildProjectFile(kitchen));
    file.kitchen.m.back.push(['removed-module', 600]);
    const result = readProjectFile(JSON.stringify(file));
    expect(result.kind === 'ready' && result.skippedCount).toBe(1);
  });
});
