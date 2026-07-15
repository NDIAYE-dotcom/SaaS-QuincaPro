function toPlainRows(columns, rows) {
  return rows.map((row) =>
    Object.fromEntries(columns.map((col) => [col.label, col.format ? col.format(row[col.key]) : row[col.key]])),
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[";\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(filename, columns, rows) {
  const plainRows = toPlainRows(columns, rows);
  const headerLine = columns.map((c) => csvEscape(c.label)).join(';');
  const lines = plainRows.map((row) => columns.map((c) => csvEscape(row[c.label])).join(';'));
  const csv = [headerLine, ...lines].join('\n');
  downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }), filename);
}

export async function exportToExcel(filename, columns, rows, sheetName = 'Rapport') {
  const XLSX = await import('xlsx');
  const plainRows = toPlainRows(columns, rows);
  const worksheet = XLSX.utils.json_to_sheet(plainRows, { header: columns.map((c) => c.label) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
