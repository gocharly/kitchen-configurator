import { forwardRef } from 'react';
import type { Drawing, DrawingDimension, DrawingLabel, DrawingRect, RectKind } from './drawingModel';

const INK = '#1b1f23';
const MUTED = '#6b737b';
const PAPER = '#ffffff';
const TICK_FACTOR = 0.4;
const LABEL_GAP_FACTOR = 0.35;
const MIN_LABEL_SPAN_FACTOR = 1.4;
const DASH_PATTERN = '8 5';

interface RectStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dashed?: boolean;
}

const RECT_STYLES: Record<RectKind, RectStyle> = {
  room: { fill: 'none', stroke: INK, strokeWidth: 2 },
  lower: { fill: '#f1f1ee', stroke: INK, strokeWidth: 1.4 },
  upper: { fill: 'none', stroke: INK, strokeWidth: 1.2 },
  countertop: { fill: '#d9d9d6', stroke: INK, strokeWidth: 0.8 },
  filler: { fill: '#e2e2de', stroke: INK, strokeWidth: 1 },
  window: { fill: '#dbe9f1', stroke: INK, strokeWidth: 1.4 },
  door: { fill: '#e8dccb', stroke: INK, strokeWidth: 1.4 },
  leaf: { fill: 'none', stroke: MUTED, strokeWidth: 0.8 },
  niche: { fill: '#cfcfcc', stroke: MUTED, strokeWidth: 0.8 },
};

function DrawingRectShape({ rect, sheet }: { rect: DrawingRect; sheet: Drawing['sheet'] }) {
  const style = RECT_STYLES[rect.kind];
  const dashed = sheet === 'plan' && rect.kind === 'upper';
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeDasharray={dashed ? DASH_PATTERN : undefined}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function DimensionShape({ dimension, fontSize }: { dimension: DrawingDimension; fontSize: number }) {
  const { x1, y1, x2, y2, anchor, label } = dimension;
  const isHorizontal = y1 === y2;
  const tick = fontSize * TICK_FACTOR;
  const length = Math.abs(isHorizontal ? x2 - x1 : y2 - y1);
  const gap = fontSize * LABEL_GAP_FACTOR;
  const middleX = (x1 + x2) / 2;
  const middleY = (y1 + y2) / 2;
  const extension = (x: number, y: number) =>
    anchor === undefined ? null : (
      <line
        x1={x}
        y1={y}
        x2={isHorizontal ? x : anchor}
        y2={isHorizontal ? anchor : y}
        stroke={MUTED}
        strokeWidth={0.6}
        vectorEffect="non-scaling-stroke"
      />
    );
  return (
    <g>
      {extension(x1, y1)}
      {extension(x2, y2)}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
      {[
        [x1, y1],
        [x2, y2],
      ].map(([x, y]) => (
        <line
          key={`${x}-${y}`}
          x1={x - tick / 2}
          y1={y + tick / 2}
          x2={x + tick / 2}
          y2={y - tick / 2}
          stroke={INK}
          strokeWidth={1.4}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {length >= fontSize * MIN_LABEL_SPAN_FACTOR && (
        <text
          x={isHorizontal ? middleX : x1 - gap}
          y={isHorizontal ? y1 - gap : middleY}
          fontSize={fontSize}
          fill={INK}
          textAnchor="middle"
          transform={isHorizontal ? undefined : `rotate(-90 ${x1 - gap} ${middleY})`}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function LabelShape({ label, fontSize }: { label: DrawingLabel; fontSize: number }) {
  if (label.kind === 'number') {
    return (
      <text
        x={label.x}
        y={label.y}
        fontSize={fontSize * 0.9}
        fontWeight={600}
        fill={INK}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {label.text}
      </text>
    );
  }
  const isTitle = label.kind === 'title';
  return (
    <text
      x={label.x}
      y={label.y}
      fontSize={isTitle ? fontSize * 1.3 : fontSize}
      fontWeight={isTitle ? 700 : 400}
      fill={INK}
      xmlSpace="preserve"
    >
      {label.text}
    </text>
  );
}

interface DrawingSheetProps {
  drawing: Drawing;
}

export const DrawingSheet = forwardRef<SVGSVGElement, DrawingSheetProps>(function DrawingSheet({ drawing }, ref) {
  const { x, y, width, height } = drawing.viewBox;
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${x} ${y} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
      className="drawing-sheet"
    >
      <rect x={x} y={y} width={width} height={height} fill={PAPER} />
      {drawing.rects.map((rect) => (
        <DrawingRectShape key={rect.key} rect={rect} sheet={drawing.sheet} />
      ))}
      {drawing.dimensions.map((dimension) => (
        <DimensionShape key={dimension.key} dimension={dimension} fontSize={drawing.fontSize} />
      ))}
      {drawing.labels.map((label) => (
        <LabelShape key={label.key} label={label} fontSize={drawing.fontSize} />
      ))}
    </svg>
  );
});
