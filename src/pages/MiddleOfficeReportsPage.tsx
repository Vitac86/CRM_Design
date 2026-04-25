import { useEffect, useMemo, useState } from 'react';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { MiddleOfficeReportDetails } from '../components/crm/MiddleOfficeReportDetails';
import { MiddleOfficeReportList } from '../components/crm/MiddleOfficeReportList';
import { PageHeader } from '../components/layout/PageHeader';
import { PageShell } from '../components/layout/PageShell';
import { PageToolbar } from '../components/layout/PageToolbar';
import { SplitContentShell } from '../components/layout/SplitContentShell';
import { Button, SearchInput, SelectFilter } from '../components/ui';
import type { Report } from '../data/types';
import { buildDatedCsvFileName, exportToCsv } from '../utils/csv';

export const MiddleOfficeReportsPage = () => {
  const { reports: reportsRepository } = useDataAccess();

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Report['deliveryStatus'] | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<Extract<Report['deliveryChannel'], 'E-mail' | 'Личный кабинет'> | 'all'>('all');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedReports = await reportsRepository.listReportsByDepartment('Мидл-офис');

        if (!isMounted) {
          return;
        }

        setReports(loadedReports);
      } catch {
        if (!isMounted) {
          return;
        }

        setReports([]);
        setError('Не удалось загрузить отчёты мидл-офиса.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      isMounted = false;
    };
  }, [reportsRepository]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reports.filter((report) => {
      if (normalizedSearch) {
        const searchHit =
          report.clientName.toLowerCase().includes(normalizedSearch) ||
          report.clientCode.toLowerCase().includes(normalizedSearch) ||
          report.reportTitle.toLowerCase().includes(normalizedSearch) ||
          report.fileName.toLowerCase().includes(normalizedSearch);

        if (!searchHit) {
          return false;
        }
      }

      if (statusFilter !== 'all' && report.deliveryStatus !== statusFilter) {
        return false;
      }

      if (channelFilter !== 'all' && report.deliveryChannel !== channelFilter) {
        return false;
      }

      return true;
    });
  }, [channelFilter, reports, search, statusFilter]);

  useEffect(() => {
    if (filteredReports.length === 0) {
      setSelectedReportId(null);
      return;
    }

    const selectedReportExists = filteredReports.some((report) => report.id === selectedReportId);

    if (!selectedReportExists) {
      setSelectedReportId(filteredReports[0].id);
    }
  }, [filteredReports, selectedReportId]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timer = window.setTimeout(() => setToastMessage(null), 2400);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const selectedReport = filteredReports.find((report) => report.id === selectedReportId) ?? null;

  const handleExport = () => {
    const exported = exportToCsv(
      filteredReports,
      [
        { header: 'Клиент', value: (report) => report.clientName },
        { header: 'Код клиента', value: (report) => report.clientCode },
        { header: 'Отчёт', value: (report) => report.reportTitle },
        { header: 'Файл', value: (report) => report.fileName },
        { header: 'Период', value: (report) => report.period },
        { header: 'Канал отправки', value: (report) => report.deliveryChannel },
        { header: 'Статус', value: (report) => report.deliveryStatus },
        { header: 'Дата отправки', value: (report) => report.sentAt },
      ],
      buildDatedCsvFileName('middle-office-reports'),
    );

    if (exported) {
      setToastMessage('CSV-экспорт выполнен');
    }
  };

  return (
    <PageShell>
      <PageHeader title="Мидл-офис — Журнал отправленных отчётов" />

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <SplitContentShell>
        <div className="space-y-3">
          <PageToolbar
            search={
              <SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по клиенту или отчёту..."
              />
            }
            filters={
              <>
                <SelectFilter value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Report['deliveryStatus'] | 'all')}>
                  <option value="all">Статус</option>
                  <option value="Доставлен">Доставлен</option>
                  <option value="Ошибка">Ошибка</option>
                </SelectFilter>
                <SelectFilter
                  value={channelFilter}
                  onChange={(event) =>
                    setChannelFilter(event.target.value as Extract<Report['deliveryChannel'], 'E-mail' | 'Личный кабинет'> | 'all')
                  }
                >
                  <option value="all">Канал</option>
                  <option value="E-mail">E-mail</option>
                  <option value="Личный кабинет">Личный кабинет</option>
                </SelectFilter>
              </>
            }
            actions={
              <Button variant="secondary" onClick={handleExport} disabled={filteredReports.length === 0}>
                Экспорт
              </Button>
            }
          />

          <MiddleOfficeReportList
            reports={isLoading ? [] : filteredReports}
            selectedReportId={selectedReportId}
            onSelect={setSelectedReportId}
          />
        </div>

        <MiddleOfficeReportDetails
          report={isLoading ? null : selectedReport}
          onResend={() => setToastMessage('Отчёт отправлен повторно')}
          onDownload={() => setToastMessage('Файл подготовлен к скачиванию')}
        />
      </SplitContentShell>

      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toastMessage}</div>
      )}
    </PageShell>
  );
};
