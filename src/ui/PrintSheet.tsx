import { calculateEstimate, type Kitchen } from '../domain/kitchen';
import { DrawingSheet } from '../drawing/DrawingSheet';
import { SHEETS, buildDrawing } from '../drawing/drawingModel';
import { formatPrice } from './formatPrice';

interface PrintSheetProps {
  kitchen: Kitchen;
}

export function PrintSheet({ kitchen }: PrintSheetProps) {
  const estimate = calculateEstimate(kitchen);
  const lines = [...estimate.lines, ...estimate.extraLines];
  return (
    <div className="print-sheet">
      <section className="print-page">
        <h1>Смета</h1>
        <p>
          Комната {kitchen.room.length} × {kitchen.room.width} × {kitchen.room.height} мм
        </p>
        <table className="print-table">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Наименование</th>
              <th>Ширина, мм</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.moduleId}>
                <td>{line.sku}</td>
                <td>{line.title}</td>
                <td>{line.width > 0 ? line.width : ''}</td>
                <td>{formatPrice(line.price)}</td>
              </tr>
            ))}
            {estimate.countertopPrice > 0 && (
              <tr>
                <td />
                <td>Столешница</td>
                <td />
                <td>{formatPrice(estimate.countertopPrice)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td>Итого</td>
              <td />
              <td>{formatPrice(estimate.total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
      {SHEETS.map((sheet) => (
        <section key={sheet.id} className="print-page">
          <DrawingSheet drawing={buildDrawing(kitchen, sheet.id)} />
        </section>
      ))}
    </div>
  );
}
