import {
  DEFAULT_KITCHEN,
  addModule,
  addOpeningAt,
  normalizeModuleWidth,
  normalizeOpening,
  resizeModule,
  resizeRoom,
  type Kitchen,
  type Room,
  type WallId,
} from './kitchen';
import { addFreeModule } from './dragging';
import type { Rotation } from './freeModules';
import type { Opening } from './openings';

export type ModuleDraft = string | [specId: string, width: number];
export type RunDrafts = Partial<Record<WallId, ModuleDraft[]>>;

const WALL_ORDER: WallId[] = ['back', 'left', 'right'];
const LARGEST_ROOM: Room = { length: 8000, width: 6000, height: 3500 };

export interface FreeDraft {
  specId: string;
  width: number;
  cx: number;
  cz: number;
  rotation: Rotation;
}

export interface KitchenDraft {
  idPrefix: string;
  room: Room;
  runs: RunDrafts;
  openings?: Opening[];
  free?: FreeDraft[];
  facadeColorId?: string;
  bodyColorId?: string;
  floorId?: string;
  wallFinishId?: string;
}

export function createKitchenFromDraft(draft: KitchenDraft): Kitchen {
  let kitchen: Kitchen = {
    ...DEFAULT_KITCHEN,
    room: LARGEST_ROOM,
    runs: { back: [], left: [], right: [] },
    openings: [],
    freeModules: [],
    facadeColorId: draft.facadeColorId ?? DEFAULT_KITCHEN.facadeColorId,
    bodyColorId: draft.bodyColorId ?? DEFAULT_KITCHEN.bodyColorId,
    floorId: draft.floorId ?? DEFAULT_KITCHEN.floorId,
    wallFinishId: draft.wallFinishId ?? DEFAULT_KITCHEN.wallFinishId,
  };
  (draft.openings ?? []).forEach((opening) => {
    kitchen = addOpeningAt(kitchen, normalizeOpening(opening));
  });
  WALL_ORDER.forEach((wall) => {
    (draft.runs[wall] ?? []).forEach((moduleDraft, index) => {
      const [specId, width] = typeof moduleDraft === 'string' ? [moduleDraft, undefined] : moduleDraft;
      const moduleId = `${draft.idPrefix}-${wall}-${index}`;
      kitchen = addModule(kitchen, specId, moduleId, wall);
      if (width !== undefined) kitchen = resizeModule(kitchen, moduleId, width);
    });
  });
  (draft.free ?? []).forEach((entry, index) => {
    const module = { id: `${draft.idPrefix}-free-${index}`, specId: entry.specId, width: normalizeModuleWidth(entry.specId, entry.width) };
    kitchen = addFreeModule(kitchen, module, entry, entry.rotation);
  });
  return resizeRoom(kitchen, draft.room);
}
