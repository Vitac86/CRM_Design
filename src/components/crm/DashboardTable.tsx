import { Fragment } from 'react';

interface DashboardTableProps {
  title: string;
  columns: string[];
  rows: string[][];
}

export const DashboardTable = ({ title, columns, rows }: DashboardTableProps) => {
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
      <header className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-[var(--color-muted-surface)] text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-2.5 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, rowIndex) => (
              <Fragment key={`${title}-${rowIndex}`}>
                <tr className="border-t border-[var(--color-border)] align-top text-[var(--color-text-primary)]">
                  {cells.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-4 py-3">
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
