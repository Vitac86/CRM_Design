import { useEffect, useMemo, useState } from 'react';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import { ReportsPageTemplate } from '../components/crm/ReportsPageTemplate';
import type { Report } from '../data/types';

export const BackOfficePage = () => {
  const { reports: reportsRepository } = useDataAccess();

  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadReports = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedReports = await reportsRepository.listReportsByDepartment('Бэк-офис');

        if (!isMounted) {
          return;
        }

        setReports(loadedReports);
      } catch {
        if (!isMounted) {
          return;
        }

        setReports([]);
        setError('Не удалось загрузить отчёты бэк-офиса.');
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

  const pageReports = useMemo(() => (isLoading ? [] : reports), [isLoading, reports]);

  return (
    <>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}
      <ReportsPageTemplate title="Отчёты Бэк-офиса" reports={pageReports} />
    </>
  );
};
