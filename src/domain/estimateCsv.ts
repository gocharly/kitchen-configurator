import { calculateEstimate, type Kitchen } from './kitchen';

const SEPARATOR = ';';
const BYTE_ORDER_MARK = '﻿';
const HEADER = ['Артикул', 'Наименование', 'Ширина, мм', 'Цена, ₸'];

function escapeCell(value: string | number): string {
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toRow(cells: (string | number)[]): string {
  return cells.map(escapeCell).join(SEPARATOR);
}

export function buildEstimateCsv(kitchen: Kitchen): string {
  const estimate = calculateEstimate(kitchen);
  const lineRows = [...estimate.lines, ...estimate.extraLines].map((line) => toRow([line.sku, line.title, line.width > 0 ? line.width : '', line.price]));
  const countertopRows = estimate.countertopPrice > 0 ? [toRow(['COUNTERTOP', 'Столешница', '', estimate.countertopPrice])] : [];
  const rows = [toRow(HEADER), ...lineRows, ...countertopRows, toRow(['', 'Итого', '', estimate.total])];
  return BYTE_ORDER_MARK + rows.join('\r\n') + '\r\n';
}
