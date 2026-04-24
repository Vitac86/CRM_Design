import { useEffect, useState } from 'react';
import { useDataAccess } from '../../app/dataAccess/useDataAccess';
import type { ClientHistoryEvent } from '../../data/types';
import { Badge, DataTable, EmptyState } from '../ui';

type SubjectHistoryTabProps = {
  clientId: string;
};

export const SubjectHistoryTab = ({ clientId }: SubjectHistoryTabProps) => {
  const { history: historyRepository } = useDataAccess();
  const [history, setHistory] = useState<ClientHistoryEvent[]>([]);

  useEffect(() => {
    let isMounted = true;

    void historyRepository.listHistoryByClientId(clientId).then((items) => {
      if (isMounted) {
        setHistory(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clientId, historyRepository]);

  if (history.length === 0) {
    return <EmptyState title="История изменений пуста" description="Изменения по клиенту пока не зафиксированы." />;
  }

  return (
    <DataTable
      columns={[
        { key: 'dateTime', header: 'Дата и время', className: 'min-w-[160px]' },
        { key: 'section', header: 'Раздел', className: 'min-w-[130px]' },
        { key: 'field', header: 'Поле', className: 'min-w-[220px]' },
        {
          key: 'changes',
          header: 'Изменение',
          className: 'min-w-[280px]',
          render: (row) => {
            if (!row.oldValue && !row.newValue) {
              return <span className="text-slate-500">—</span>;
            }

            return (
              <div className="flex flex-wrap items-center gap-2">
                {row.oldValue ? <Badge variant="danger">{row.oldValue}</Badge> : null}
                {row.oldValue && row.newValue ? <span className="text-slate-400">→</span> : null}
                {row.newValue ? <Badge variant="success">{row.newValue}</Badge> : null}
              </div>
            );
          },
        },
        { key: 'user', header: 'Пользователь', className: 'min-w-[150px]' },
      ]}
      rows={history}
    />
  );
};
