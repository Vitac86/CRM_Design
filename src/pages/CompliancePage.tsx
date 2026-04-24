import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { Badge, Button, DataTable, EmptyState, SelectFilter, TableControlPanel } from '../components/ui';
import { AsyncContent } from '../shared/ui/async';
import type { Client, ClientType, ComplianceStatus, ResidencyStatus } from '../data/types';
import {
  formatClientType,
  formatComplianceStatus,
  formatResidency,
  getClientTypeBadgeVariant,
  getComplianceBadgeVariant,
  getResidencyBadgeVariant,
} from '../utils/labels';
import { buildDatedCsvFileName, exportToCsv } from '../utils/csv';

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

export const CompliancePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients: clientsRepository } = useDataAccess();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>(() => {
    const value = searchParams.get('type');
    return value === 'ООО' || value === 'ИП' || value === 'ПАО' || value === 'ЗАО' || value === 'АО' || value === 'ФЛ' ? value : 'all';
  });
  const [residencyFilter, setResidencyFilter] = useState<ResidencyStatus | 'all'>(() => {
    const value = searchParams.get('residency');
    return value === 'Резидент РФ' || value === 'Нерезидент' ? value : 'all';
  });
  const [complianceFilter, setComplianceFilter] = useState<ComplianceStatus | 'all'>(() => {
    const value = searchParams.get('complianceStatus');
    return value === 'ПРОЙДЕН' || value === 'НА ПРОВЕРКЕ' || value === 'НА ДОРАБОТКЕ' || value === 'ЗАБЛОКИРОВАН' ? value : 'all';
  });

  useEffect(() => {
    let isMounted = true;

    const loadClients = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedClients = await clientsRepository.listClients();

        if (!isMounted) {
          return;
        }

        setClients(loadedClients);
      } catch {
        if (!isMounted) {
          return;
        }

        setError('Не удалось загрузить список комплаенса.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadClients();

    return () => {
      isMounted = false;
    };
  }, [clientsRepository]);

  const typeOptions = useMemo(() => [...new Set(clients.map((client) => client.type))], [clients]);
  const residencyOptions = useMemo(() => [...new Set(clients.map((client) => client.residency))], [clients]);
  const complianceOptions = useMemo(() => [...new Set(clients.map((client) => client.complianceStatus))], [clients]);

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
    [clients],
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

  const handleExport = () => {
    exportToCsv(
      filteredRows,
      [
        { header: 'Код клиента', value: (row) => row.code },
        { header: 'Наименование клиента', value: (row) => row.name },
        { header: 'ИНН', value: (row) => row.inn },
        { header: 'Тип', value: (row) => formatClientType(row.type) },
        { header: 'Резидент', value: (row) => formatResidency(row.residency) },
        { header: 'Статус комплаенса', value: (row) => formatComplianceStatus(row.complianceStatus) },
        { header: 'Полный комплект', value: (row) => (row.fullDocumentSet ? 'Да' : 'Нет') },
      ],
      buildDatedCsvFileName('compliance'),
    );
  };

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (typeFilter !== 'all') {
      nextParams.set('type', typeFilter);
    }
    if (residencyFilter !== 'all') {
      nextParams.set('residency', residencyFilter);
    }
    if (complianceFilter !== 'all') {
      nextParams.set('complianceStatus', complianceFilter);
    }

    setSearchParams(nextParams, { replace: true });
  }, [typeFilter, residencyFilter, complianceFilter, setSearchParams]);

  return (
    <div className="min-w-0 space-y-4 rounded-2xl bg-slate-100/80 p-4 sm:p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Комплаенс</h1>
      </header>

      <TableControlPanel
        filters={
          <>
            <SelectFilter value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ClientType | 'all')}>
              <option value="all">Тип клиента</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {formatClientType(type)}
                </option>
              ))}
            </SelectFilter>
            <SelectFilter
              value={residencyFilter}
              onChange={(event) => setResidencyFilter(event.target.value as ResidencyStatus | 'all')}
            >
              <option value="all">Резидентство</option>
              {residencyOptions.map((residency) => (
                <option key={residency} value={residency}>
                  {formatResidency(residency)}
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
                  {formatComplianceStatus(status)}
                </option>
              ))}
            </SelectFilter>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={resetFilters}>
              Очистить фильтры
            </Button>
            <Button variant="secondary" onClick={handleExport} disabled={filteredRows.length === 0 || isLoading || Boolean(error)}>
              Экспорт
            </Button>
          </>
        }
      />

      <AsyncContent
        isLoading={isLoading}
        error={error}
        isEmpty={filteredRows.length === 0}
        loadingFallback={<EmptyState title="Загрузка..." description="Загружаем список комплаенса." />}
        errorFallback={error ? <EmptyState title="Ошибка загрузки" description={error} /> : undefined}
        emptyFallback={<EmptyState title="Нет записей" description="По выбранным фильтрам не найдено карточек комплаенса." />}
      >
        <DataTable<ComplianceRow>
          columns={[
            { key: 'code', header: 'Код клиента', className: 'font-medium text-slate-800 whitespace-nowrap' },
            { key: 'name', header: 'Наименование клиента', className: 'min-w-[260px]' },
            { key: 'inn', header: 'ИНН' },
            {
              key: 'type',
              header: 'Тип',
              render: (row) => <Badge variant={getClientTypeBadgeVariant(row.type)}>{formatClientType(row.type)}</Badge>,
            },
            {
              key: 'residency',
              header: 'Резидент',
              render: (row) => <Badge variant={getResidencyBadgeVariant(row.residency)}>{formatResidency(row.residency)}</Badge>,
            },
            {
              key: 'complianceStatus',
              header: 'Статус комплаенса',
              render: (row) => (
                <Badge variant={getComplianceBadgeVariant(row.complianceStatus)}>
                  {formatComplianceStatus(row.complianceStatus)}
                </Badge>
              ),
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
      </AsyncContent>
    </div>
  );
};
