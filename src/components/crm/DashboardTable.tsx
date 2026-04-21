import { Fragment } from 'react';

interface DashboardTableProps {
  title: string;
  columns: string[];
  rows: string[][];
}

export const DashboardTable = ({ title, columns, rows }: DashboardTableProps) => {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-brand-light/70 text-left text-xs uppercase tracking-wide text-slate-600">
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
                <tr className="border-t border-slate-100 align-top text-slate-700">
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
