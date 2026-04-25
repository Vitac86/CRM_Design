import type { ReactNode } from 'react';
import { cn } from './cn';
import { ChevronDownIcon, ChevronUpIcon, SortIcon as BaseSortIcon } from './icons';

export type SortDirection = 'asc' | 'desc';

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  render?: (row: T, rowIndex: number) => ReactNode;
  sortable?: boolean;
  sortKey?: string;
};

type DataTableProps<T extends { id?: string | number }> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowClassName?: (row: T, rowIndex: number) => string | undefined;
  getRowKey?: (row: T, rowIndex: number) => string | number;
  emptyMessage?: string;
  onRowClick?: (row: T, rowIndex: number) => void;
  sortKey?: string | null;
  sortDirection?: SortDirection | null;
  onSortChange?: (sortKey: string) => void;
  stickyHeader?: boolean;
};

const SortIcon = ({ active, direction }: { active: boolean; direction: SortDirection | null | undefined }) => {
  if (!active || !direction) {
    return (
      <BaseSortIcon className="h-3.5 w-3.5 text-[var(--color-text-secondary)]/70" />
    );
  }

  return direction === 'asc' ? (
    <ChevronUpIcon className="h-3.5 w-3.5" />
  ) : (
    <ChevronDownIcon className="h-3.5 w-3.5" />
  );
};

export const DataTable = <T extends { id?: string | number }>({
  columns,
  rows,
  rowClassName,
  getRowKey,
  emptyMessage = 'Нет данных',
  onRowClick,
  sortKey,
  sortDirection,
  onSortChange,
  stickyHeader = false,
}: DataTableProps<T>) => {
  return (
    <div className="crm-scrollbar relative min-w-0 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="font-sans min-w-full text-left text-sm text-[var(--color-text-primary)]">
        <thead className="bg-[var(--color-muted-surface)]">
          <tr>
            {columns.map((column) => {
              const currentSortKey = column.sortKey ?? String(column.key);
              const isSortable = Boolean(column.sortable && onSortChange);
              const isActiveSort = isSortable && sortKey === currentSortKey;

              return (
                <th
                  key={String(column.key)}
                  className={cn(
                    'font-display px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]',
                    stickyHeader &&
                      'sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-muted-surface)] shadow-[0_1px_0_rgba(15,23,42,0.16)]',
                    column.headerClassName,
                  )}
                >
                  {isSortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(currentSortKey)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-sm transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]/25',
                        isActiveSort ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]/75',
                      )}
                    >
                      <span>{column.header}</span>
                      <SortIcon active={isActiveSort} direction={sortDirection} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={getRowKey ? getRowKey(row, rowIndex) : row.id ?? rowIndex}
                className={cn(
                  'border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-hover)]/70',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row, rowIndex),
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
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
