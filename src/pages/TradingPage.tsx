import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, DataTable, FilterBar, SelectFilter } from '../components/ui';
import { tradingProfiles } from '../data/trading';
import type { RiskCategory, TradingProfile } from '../data/types';

type TradingRiskCode = 'КНУР' | 'КСУР' | 'КПУР' | 'КОУР';
type BooleanFilter = 'all' | 'yes' | 'no';

type TradingRow = TradingProfile & {
  podFt: boolean;
  clientCode: string;
  clientName: string;
  riskCode: TradingRiskCode;
};

const riskCategoryToCode: Record<RiskCategory, TradingRiskCode> = {
  'Низкий': 'КНУР',
  'Средний': 'КСУР',
  'Повышенный': 'КПУР',
  'Высокий': 'КОУР',
};

const booleanBadgeVariant = (value: boolean): 'success' | 'danger' => (value ? 'success' : 'danger');

const toYesNo = (value: boolean) => (value ? 'Да' : 'Нет');

export const TradingPage = () => {
  const navigate = useNavigate();

  const [qualificationFilter, setQualificationFilter] = useState<BooleanFilter>('all');
  const [podFtFilter, setPodFtFilter] = useState<BooleanFilter>('all');

  const rows = useMemo<TradingRow[]>(
    () =>
      tradingProfiles.map((profile) => {
        const numericId = profile.clientId.replace('c-', '');
        const podFt = profile.allowCashUsage && profile.allowSecuritiesUsage;

        return {
          ...profile,
          podFt,
          clientCode: `CL-${numericId.padStart(6, '0')}`,
          clientName: `Клиент ${numericId}`,
          riskCode: riskCategoryToCode[profile.riskCategory],
        };
      }),
    [],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (qualificationFilter === 'yes' && !row.qualifiedInvestor) {
          return false;
        }

        if (qualificationFilter === 'no' && row.qualifiedInvestor) {
          return false;
        }

        if (podFtFilter === 'yes' && !row.podFt) {
          return false;
        }

        if (podFtFilter === 'no' && row.podFt) {
          return false;
        }

        return true;
      }),
    [podFtFilter, qualificationFilter, rows],
  );

  const resetFilters = () => {
    setQualificationFilter('all');
    setPodFtFilter('all');
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Трейдинг</h1>
      </header>

      <FilterBar>
        <SelectFilter
          value={qualificationFilter}
          onChange={(event) => setQualificationFilter(event.target.value as BooleanFilter)}
        >
          <option value="all">Квалификация</option>
          <option value="yes">Да</option>
          <option value="no">Нет</option>
        </SelectFilter>

        <SelectFilter value={podFtFilter} onChange={(event) => setPodFtFilter(event.target.value as BooleanFilter)}>
          <option value="all">ПОД / ФТ</option>
          <option value="yes">Да</option>
          <option value="no">Нет</option>
        </SelectFilter>

        <Button variant="secondary" className="ml-auto" onClick={resetFilters}>
          Очистить фильтры
        </Button>
      </FilterBar>

      <DataTable<TradingRow>
        columns={[
          { key: 'clientCode', header: 'Код клиента', className: 'font-medium text-slate-800 whitespace-nowrap' },
          { key: 'clientName', header: 'Наименование клиента', className: 'min-w-[220px]' },
          {
            key: 'riskCategory',
            header: 'Категория риска',
            render: (row) => <Badge variant="warning">{row.riskCode}</Badge>,
          },
          {
            key: 'qualifiedInvestor',
            header: 'Признак квалифицированного инвестора',
            render: (row) => (
              <Badge variant={booleanBadgeVariant(row.qualifiedInvestor)}>{toYesNo(row.qualifiedInvestor)}</Badge>
            ),
          },
          {
            key: 'allowCashUsage',
            header: 'Разрешение на использование денежных средств',
            render: (row) => <Badge variant={booleanBadgeVariant(row.allowCashUsage)}>{toYesNo(row.allowCashUsage)}</Badge>,
          },
          {
            key: 'allowSecuritiesUsage',
            header: 'Разрешение на использование ценных бумаг',
            render: (row) => (
              <Badge variant={booleanBadgeVariant(row.allowSecuritiesUsage)}>{toYesNo(row.allowSecuritiesUsage)}</Badge>
            ),
          },
        ]}
        rows={filteredRows}
        emptyMessage="По выбранным фильтрам данных нет"
        onRowClick={(row) => navigate(`/trading/${row.clientId}`)}
      />
    </div>
  );
};
