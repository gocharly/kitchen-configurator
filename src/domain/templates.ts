import { createKitchenFromDraft, type RunDrafts } from './kitchenBuilder';
import type { Kitchen, Room } from './kitchen';

export interface KitchenTemplate {
  id: string;
  title: string;
  kitchen: Kitchen;
}

function buildTemplate(id: string, title: string, room: Room, runs: RunDrafts): KitchenTemplate {
  return { id, title, kitchen: createKitchenFromDraft({ idPrefix: id, room, runs }) };
}

export const KITCHEN_TEMPLATES: KitchenTemplate[] = [
  buildTemplate(
    'straight-2400',
    'Прямая 2400',
    { length: 2800, width: 2600, height: 2700 },
    {
      back: [
        ['base-2-drawers', 600],
        ['base-sink-2-doors', 800],
        ['base-1-door', 600],
        ['base-1-door', 400],
        ['top-720-1-door', 600],
        ['top-720-2-doors', 800],
        ['top-720-1-door', 600],
        ['top-720-1-door', 400],
      ],
    },
  ),
  buildTemplate(
    'straight-3000-tall',
    'Прямая 3000 с пеналом',
    { length: 3400, width: 2800, height: 2700 },
    {
      back: [
        ['tall-closed', 600],
        ['base-1-door', 600],
        ['base-sink-2-doors', 800],
        ['base-3-drawers', 600],
        ['base-1-door', 400],
        ['top-720-1-door', 600],
        ['top-720-2-doors', 800],
        ['top-720-1-door', 600],
        ['top-720-1-door', 400],
      ],
    },
  ),
  buildTemplate(
    'straight-3600',
    'Прямая 3600 с духовкой',
    { length: 4000, width: 2800, height: 2700 },
    {
      back: [
        ['base-1-door', 400],
        ['base-3-drawers', 800],
        ['base-sink-2-doors', 800],
        ['base-oven', 600],
        ['base-1-door', 600],
        ['base-1-door', 400],
        ['top-720-1-door', 400],
        ['top-720-2-doors', 800],
        ['top-hood', 600],
        ['top-720-1-door', 600],
        ['top-720-1-door', 600],
        ['top-720-1-door', 600],
      ],
    },
  ),
  buildTemplate(
    'corner-left',
    'Угловая',
    { length: 3600, width: 2700, height: 2700 },
    {
      back: [
        'base-corner-990',
        ['base-1-door', 600],
        ['base-sink-2-doors', 800],
        ['base-3-drawers', 600],
        'top-corner-720',
        ['top-720-2-doors', 800],
        ['top-720-1-door', 600],
        ['top-720-1-door', 600],
      ],
      left: [
        ['base-1-door', 600],
        ['base-2-drawers', 600],
        ['top-720-2-doors', 800],
      ],
    },
  ),
  buildTemplate(
    'corner-fridge',
    'Угловая с холодильником',
    { length: 3900, width: 3000, height: 2700 },
    {
      back: [
        'base-corner-990',
        ['base-sink-2-doors', 800],
        ['base-1-door', 600],
        'tall-fridge',
        'top-corner-720',
        ['top-720-2-doors', 800],
        ['top-720-1-door', 600],
      ],
      left: [
        ['base-2-drawers', 600],
        ['base-1-door', 600],
        ['base-1-door', 400],
      ],
    },
  ),
  buildTemplate(
    'u-shape',
    'П-образная',
    { length: 3600, width: 3000, height: 2700 },
    {
      back: [
        'base-corner-990',
        ['base-sink-2-doors', 800],
        ['base-3-drawers', 600],
        ['base-1-door', 300],
        'base-corner-890',
        'top-corner-720',
        ['top-720-2-doors', 800],
        ['top-720-1-door', 500],
      ],
      left: [
        ['base-1-door', 600],
        ['base-2-drawers', 600],
      ],
      right: [
        ['base-1-door', 600],
        ['base-3-drawers', 600],
      ],
    },
  ),
];
