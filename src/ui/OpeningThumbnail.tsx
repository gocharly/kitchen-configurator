import { OPENING_SPECS, type OpeningKind } from '../domain/openings';

interface OpeningThumbnailProps {
  kind: OpeningKind;
}

const VIEW_SIZE = 48;
const DRAW_SIZE = 38;
const PANE_INSET = 3;
const BALCONY_DOOR_SHARE = 0.5;
const BALCONY_SILL_SHARE = 0.4;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function fitDefaultProportions(kind: OpeningKind): Box {
  const spec = OPENING_SPECS[kind];
  const scale = DRAW_SIZE / Math.max(spec.width.default, spec.height.default);
  const width = spec.width.default * scale;
  const height = spec.height.default * scale;
  return { x: (VIEW_SIZE - width) / 2, y: (VIEW_SIZE - height) / 2, width, height };
}

function shrink(box: Box, inset: number): Box {
  return { x: box.x + inset, y: box.y + inset, width: box.width - 2 * inset, height: box.height - 2 * inset };
}

function Window({ box, leaves }: { box: Box; leaves: number }) {
  const inner = shrink(box, PANE_INSET);
  const paneWidth = inner.width / leaves;
  return (
    <>
      <rect className="opening-frame" {...box} rx="2" />
      {Array.from({ length: leaves }, (_, index) => (
        <rect key={index} className="opening-glass" x={inner.x + index * paneWidth + (index > 0 ? 1 : 0)} y={inner.y} width={paneWidth - (index > 0 ? 1 : 0) - (index < leaves - 1 ? 1 : 0)} height={inner.height} />
      ))}
    </>
  );
}

function Door({ box, leaves }: { box: Box; leaves: number }) {
  const inner = shrink(box, PANE_INSET);
  if (leaves === 0) {
    return (
      <>
        <rect className="opening-frame" {...box} rx="2" />
        <rect className="opening-glass" {...inner} />
      </>
    );
  }
  const leafWidth = inner.width / leaves;
  return (
    <>
      <rect className="opening-frame" {...box} rx="2" />
      {Array.from({ length: leaves }, (_, index) => {
        const x = inner.x + index * leafWidth;
        const handleX = index < leaves / 2 ? x + leafWidth - 4 : x + 2;
        return (
          <g key={index}>
            <rect className="opening-leaf" x={x + (index > 0 ? 1 : 0)} y={inner.y} width={leafWidth - (index > 0 ? 1 : 0)} height={inner.height + PANE_INSET} />
            <rect className="opening-handle" x={handleX} y={inner.y + inner.height * 0.5} width="2" height="6" rx="1" />
          </g>
        );
      })}
    </>
  );
}

function Balcony({ box }: { box: Box }) {
  const inner = shrink(box, PANE_INSET);
  const doorWidth = inner.width * BALCONY_DOOR_SHARE;
  const sillY = inner.y + inner.height * BALCONY_SILL_SHARE;
  return (
    <>
      <rect className="opening-frame" {...box} rx="2" />
      <rect className="opening-glass" x={inner.x} y={inner.y} width={doorWidth - 1} height={inner.height + PANE_INSET} />
      <rect className="opening-handle" x={inner.x + doorWidth - 6} y={inner.y + inner.height * 0.55} width="2" height="6" rx="1" />
      <rect className="opening-glass" x={inner.x + doorWidth + 1} y={inner.y} width={inner.width - doorWidth - 1} height={sillY - inner.y - 1} />
    </>
  );
}

export function OpeningThumbnail({ kind }: OpeningThumbnailProps) {
  const spec = OPENING_SPECS[kind];
  const box = fitDefaultProportions(kind);
  return (
    <svg className="opening-thumbnail" viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} aria-hidden="true">
      {kind === 'balcony' && <Balcony box={box} />}
      {kind !== 'balcony' && spec.family === 'window' && <Window box={box} leaves={spec.leaves} />}
      {kind !== 'balcony' && spec.family === 'door' && <Door box={box} leaves={spec.leaves} />}
    </svg>
  );
}
