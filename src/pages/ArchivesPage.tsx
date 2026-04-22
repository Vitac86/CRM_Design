import { useMemo, useState } from 'react';
import { Badge, DataTable, FilterChipSelect, TableControlPanel } from '../components/ui';
import { archiveRecords, type ArchiveRecord, type ArchiveRecordStatus, type ArchiveType } from '../data/archives';

const typeBadge: Record<ArchiveType, 'info' | 'purple'> = {
  Архив: 'info',
  ЧС: 'purple',
};

const statusBadge: Record<ArchiveRecordStatus, 'success' | 'warning' | 'orange'> = {
  'Обработано': 'success',
  'В работе': 'warning',
  'Требует проверки': 'orange',
};

export const ArchivesPage = () => {
  const [typeFilter, setTypeFilter] = useState<ArchiveType | 'all'>('all');

  const filteredRecords = useMemo(
    () => archiveRecords.filter((record) => (typeFilter === 'all' ? true : record.type === typeFilter)),
    [typeFilter],
  );

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Архивы / ЧС</h1>
      </header>

      <TableControlPanel
        search={<div />}
        filters={
          <FilterChipSelect
            label="Тип"
            value={typeFilter}
            displayValue={typeFilter === 'all' ? 'Все' : typeFilter}
            onChange={(value) => setTypeFilter(value as ArchiveType | 'all')}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'Архив', label: 'Архив' },
              { value: 'ЧС', label: 'ЧС' },
            ]}
          />
        }
      />

      <DataTable<ArchiveRecord>
        columns={[
          { key: 'object', header: 'Объект', className: 'font-medium text-slate-800' },
          {
            key: 'type',
            header: 'Тип',
            render: (record) => <Badge variant={typeBadge[record.type]}>{record.type}</Badge>,
          },
          { key: 'date', header: 'Дата', className: 'whitespace-nowrap' },
          {
            key: 'status',
            header: 'Статус',
            render: (record) => <Badge variant={statusBadge[record.status]}>{record.status}</Badge>,
          },
          { key: 'owner', header: 'Ответственный', className: 'whitespace-nowrap' },
        ]}
        rows={filteredRecords}
        emptyMessage="Архивные записи отсутствуют"
      />
    </div>
  );
};
