import type { ReactNode } from 'react';
import { cn } from './cn';

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render?: (row: T, rowIndex: number) => ReactNode;
};

type DataTableProps<T extends { id?: string | number }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  getRowKey?: (row: T, rowIndex: number) => string | number;
  emptyMessage?: string;
};

export const DataTable = <T extends { id?: string | number }>({
  columns,
  rows,
  rowClassName,
  getRowKey,
  emptyMessage = 'Нет данных',
}: DataTableProps<T>) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm text-slate-700">
        <thead className="bg-brand-light/70">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={cn('px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-dark', column.headerClassName)}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={getRowKey ? getRowKey(row, rowIndex) : row.id ?? rowIndex}
                className={cn('border-b border-slate-200 last:border-b-0 hover:bg-slate-50/70', rowClassName?.(row, rowIndex))}
              >
                {columns.map((column) => {
                  const cellValue = row[column.key as keyof T] as ReactNode;
                  return (
                    <td key={String(column.key)} className={cn('px-4 py-3 align-middle', column.className)}>
                      {column.render ? column.render(row, rowIndex) : cellValue}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
