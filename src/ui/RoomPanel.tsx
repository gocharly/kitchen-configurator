import { ROOM_LIMITS } from '../domain/catalog';
import type { Kitchen, Room } from '../domain/kitchen';
import { PlanThumbnail } from './PlanThumbnail';
import { Stepper } from './Stepper';

interface RoomPanelProps {
  kitchen: Kitchen;
  onResize: (patch: Partial<Room>) => void;
}

export function RoomPanel({ kitchen, onResize }: RoomPanelProps) {
  return (
    <div className="panel-stack">
      <div className="room-plan">
        <PlanThumbnail kitchen={kitchen} />
      </div>
      <div className="room-fields">
        <Stepper label="Длина" value={kitchen.room.length} step={ROOM_LIMITS.step} onChange={(length) => onResize({ length })} />
        <Stepper label="Ширина" value={kitchen.room.width} step={ROOM_LIMITS.step} onChange={(width) => onResize({ width })} />
        <Stepper label="Высота" value={kitchen.room.height} step={ROOM_LIMITS.step} onChange={(height) => onResize({ height })} />
      </div>
    </div>
  );
}
