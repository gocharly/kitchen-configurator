import { DrawingSheet } from '../drawing/DrawingSheet';
import { SHEETS, buildDrawing, type SheetId } from '../drawing/drawingModel';
import type { Kitchen } from '../domain/kitchen';

interface DrawingPanelProps {
  kitchen: Kitchen;
  sheet: SheetId;
  onSheetChange: (sheet: SheetId) => void;
  onDownload: () => void;
}

export function DrawingPanel({ kitchen, sheet, onSheetChange, onDownload }: DrawingPanelProps) {
  return (
    <div className="panel-stack">
      <ul className="sheet-grid" role="radiogroup" aria-label="Лист чертежа">
        {SHEETS.map((entry) => (
          <li key={entry.id}>
            <button type="button" role="radio" aria-checked={entry.id === sheet} className="sheet-tile" onClick={() => onSheetChange(entry.id)}>
              <span className="sheet-tile-preview">
                <DrawingSheet drawing={buildDrawing(kitchen, entry.id)} />
              </span>
              <span className="module-title">{entry.title}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="catalog-button download-sheet" onClick={onDownload}>
        Скачать SVG
      </button>
    </div>
  );
}
