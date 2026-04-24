export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
};

const BOM = '\uFEFF';

const escapeCsvCell = (value: string): string => {
  const normalized = value.replace(/\r?\n|\r/g, ' ');
  if (/[;"\n\r]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
};

const normalizeCellValue = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

export const exportToCsv = <T>(rows: T[], columns: CsvColumn<T>[], fileName: string) => {
  if (rows.length === 0) {
    return false;
  }

  const headerLine = columns.map((column) => escapeCsvCell(column.header)).join(';');
  const bodyLines = rows.map((row) =>
    columns
      .map((column) => escapeCsvCell(normalizeCellValue(column.value(row))))
      .join(';'),
  );

  const csvContent = [headerLine, ...bodyLines].join('\n');
  const blob = new Blob([BOM, csvContent], { type: 'text/csv;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
  return true;
};

export const buildDatedCsvFileName = (prefix: string, date = new Date()) => {
  const isoDate = date.toISOString().slice(0, 10);
  return `${prefix}-${isoDate}.csv`;
};
