import { layoutKitchen, type Kitchen, type LayoutItem } from '../domain/kitchen';

const PLAN_WIDTH = 120;
const PLAN_HEIGHT = 90;

interface PlanRect {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function toPlanRects(item: LayoutItem, room: Kitchen['room']): PlanRect[] {
  const { spec, module, wall, offset } = item;
  const depth = spec.depth;
  const key = module.id;
  if (spec.isCorner) {
    const leg = module.width;
    const armB = module.cornerSide === 'end' ? leg - depth : 0;
    return [
      { key: `${key}-a`, x: offset, y: 0, width: leg, height: depth },
      { key: `${key}-b`, x: offset + armB, y: 0, width: depth, height: leg },
    ];
  }
  if (wall === 'back') return [{ key, x: offset, y: 0, width: module.width, height: depth }];
  if (wall === 'left') return [{ key, x: 0, y: offset, width: depth, height: module.width }];
  return [{ key, x: room.length - depth, y: offset, width: depth, height: module.width }];
}

interface PlanThumbnailProps {
  kitchen: Kitchen;
}

export function PlanThumbnail({ kitchen }: PlanThumbnailProps) {
  const { length, width } = kitchen.room;
  const scale = Math.min(PLAN_WIDTH / length, PLAN_HEIGHT / width);
  const rects = layoutKitchen(kitchen)
    .filter((item) => item.spec.row === 'lower')
    .flatMap((item) => toPlanRects(item, kitchen.room));
  return (
    <svg
      className="plan"
      viewBox={`0 0 ${length} ${width}`}
      width={length * scale}
      height={width * scale}
      aria-hidden="true"
    >
      <rect className="plan-room" width={length} height={width} />
      {rects.map((rect) => (
        <rect key={rect.key} className="plan-module" x={rect.x} y={rect.y} width={rect.width} height={rect.height} />
      ))}
    </svg>
  );
}
