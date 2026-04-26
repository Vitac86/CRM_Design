import { Fragment } from 'react';

interface DashboardTableProps {
  title: string;
  columns: string[];
  rows: string[][];
}

export const DashboardTable = ({ title, columns, rows }: DashboardTableProps) => {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-kpi-surface)] shadow-sm">
      <header className="border-b border-[var(--color-border)] px-[var(--density-panel-padding)] py-[var(--density-table-header-y)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[var(--color-table-header)] text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-[var(--density-table-cell-x)] py-[var(--density-table-header-y)] font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <Fragment key={`${title}-${rowIndex}`}>
                <tr className="border-t border-[var(--color-border)] align-top text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-table-row-hover)]">
                  {cells.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-[var(--density-table-cell-x)] py-[var(--density-table-row-y)]">
                      {cell}
                    </td>
                  ))}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
