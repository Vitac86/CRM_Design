import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, EmptyState, FilterBar, SelectFilter } from '../components/ui';
import { clients } from '../data/clients';
import type { ClientType, ComplianceStatus, ResidencyStatus } from '../data/types';

type ComplianceRow = {
  id: string;
  code: string;
  name: string;
  inn: string;
  type: ClientType;
  residency: ResidencyStatus;
  complianceStatus: ComplianceStatus;
  fullDocumentSet: boolean;
};

const complianceBadgeVariant: Record<ComplianceStatus, 'success' | 'warning' | 'orange' | 'danger'> = {
  ПРОЙДЕН: 'success',
  'НА ПРОВЕРКЕ': 'warning',
  'НА ДОРАБОТКЕ': 'orange',
  БАН: 'danger',
};

export const CompliancePage = () => {
  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [residencyFilter, setResidencyFilter] = useState<ResidencyStatus | 'all'>('all');
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'all'>('all');

  const typeOptions = useMemo(() => [...new Set(clients.map((client) => client.type))], []);
  const residencyOptions = useMemo(() => [...new Set(clients.map((client) => client.residency))], []);
  const complianceOptions = useMemo(() => [...new Set(clients.map((client) => client.complianceStatus))], []);

  const rows = useMemo<ComplianceRow[]>(
    () =>
      clients.map((client) => ({
        id: client.id,
        code: client.code,
        name: client.name,
        inn: client.inn,
        type: client.type,
        residency: client.residency,
        complianceStatus: client.complianceStatus,
        fullDocumentSet: client.fullDocumentSet,
      })),
    [],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (typeFilter !== 'all' && row.type !== typeFilter) {
          return false;
        }

        if (residencyFilter !== 'all' && row.residency !== residencyFilter) {
          return false;
        }

        if (complianceFilter !== 'all' && row.complianceStatus !== complianceFilter) {
          return false;
        }

        return true;
      }),
    [complianceFilter, residencyFilter, rows, typeFilter],
  );

  const resetFilters = () => {
    setTypeFilter('all');
    setResidencyFilter('all');
    setComplianceFilter('all');
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Комплаенс</h1>
      </header>

      <FilterBar>
        <SelectFilter value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ClientType | 'all')}>
          <option value="all">Типы</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter
          value={residencyFilter}
          onChange={(event) => setResidencyFilter(event.target.value as ResidencyStatus | 'all')}
        >
          <option value="all">Признак резидентства</option>
          {residencyOptions.map((residency) => (
            <option key={residency} value={residency}>
              {residency}
            </option>
          ))}
        </SelectFilter>

        <SelectFilter
          value={complianceFilter}
          onChange={(event) => setComplianceFilter(event.target.value as ComplianceStatus | 'all')}
        >
          <option value="all">Статус комплаенса</option>
          {complianceOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </SelectFilter>

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Очистить фильтры
        </Button>
      </FilterBar>

      {filteredRows.length === 0 ? (
        <EmptyState
          title="Нет записей"
          description="По выбранным фильтрам не найдено карточек комплаенса."
        />
      ) : (
        <DataTable<ComplianceRow>
          columns={[
            { key: 'code', header: 'Код клиента', className: 'font-medium text-slate-800 whitespace-nowrap' },
            { key: 'name', header: 'Наименование клиента', className: 'min-w-[260px]' },
            { key: 'inn', header: 'ИНН' },
            { key: 'type', header: 'Тип' },
            { key: 'residency', header: 'Резидент' },
            {
              key: 'complianceStatus',
              header: 'Статус комплаенса',
              render: (row) => <Badge variant={complianceBadgeVariant[row.complianceStatus]}>{row.complianceStatus}</Badge>,
            },
            {
              key: 'fullDocumentSet',
              header: 'Полный комплект',
              render: (row) => <Badge variant={row.fullDocumentSet ? 'success' : 'warning'}>{row.fullDocumentSet ? 'Да' : 'Нет'}</Badge>,
            },
          ]}
          rows={filteredRows}
          onRowClick={(row) => navigate(`/compliance/${row.id}`)}
          emptyMessage="По выбранным фильтрам данных нет"
        />
      )}
    </div>
  );
};
