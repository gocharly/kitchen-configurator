import { listPlacedModules, type Kitchen } from './kitchen';
import { buildKitchenPayload, countPayloadModules, restoreKitchenFromPayload } from './kitchenLink';

export const PROJECT_FORMAT = 'kitchen-configurator/project';
export const PROJECT_VERSION = 1;

export type ProjectReadResult =
  | { kind: 'ready'; kitchen: Kitchen; skippedCount: number }
  | { kind: 'rejected'; reason: string };

export function buildProjectFile(kitchen: Kitchen, savedAt: Date = new Date()): string {
  const project = { format: PROJECT_FORMAT, version: PROJECT_VERSION, savedAt: savedAt.toISOString(), kitchen: buildKitchenPayload(kitchen) };
  return JSON.stringify(project, null, 2);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function readProjectFile(text: string): ProjectReadResult {
  const parsed = parseJson(text);
  if (typeof parsed !== 'object' || parsed === null) return { kind: 'rejected', reason: 'Файл не читается: это не JSON' };
  const project = parsed as { format?: unknown; version?: unknown; kitchen?: unknown };
  if (project.format !== PROJECT_FORMAT) return { kind: 'rejected', reason: 'Файл не похож на проект конструктора' };
  if (typeof project.version !== 'number' || project.version > PROJECT_VERSION) return { kind: 'rejected', reason: 'Проект сохранён в более новой версии конструктора' };
  const payload = typeof project.kitchen === 'object' && project.kitchen !== null ? (project.kitchen as Record<string, unknown>) : null;
  const kitchen = restoreKitchenFromPayload(payload);
  if (!kitchen) return { kind: 'rejected', reason: 'В файле нет кухни или она повреждена' };
  const skippedCount = Math.max(0, countPayloadModules(payload) - listPlacedModules(kitchen).length);
  return { kind: 'ready', kitchen, skippedCount };
}
