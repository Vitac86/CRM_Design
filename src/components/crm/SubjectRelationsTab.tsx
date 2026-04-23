import { getRelationsByClientId } from '../../data/clientRelations';
import { useNavigate } from 'react-router-dom';
import { DataTable, EmptyState } from '../ui';

type SubjectRelationsTabProps = {
  clientId: string;
};

export const SubjectRelationsTab = ({ clientId }: SubjectRelationsTabProps) => {
  const navigate = useNavigate();
  const relations = getRelationsByClientId(clientId);

  if (relations.length === 0) {
    return <EmptyState title="Связи отсутствуют" description="Для клиента не зафиксированы связи." />;
  }

  return (
    <DataTable
      columns={[
        {
          key: 'relatedName',
          header: 'Связанное лицо / организация',
          className: 'min-w-[260px] font-medium text-slate-800',
          render: (row) =>
            row.relatedClientId ? (
              <button type="button" className="text-left text-brand hover:underline" onClick={() => navigate(`/subjects/${row.relatedClientId}`)}>
                {row.relatedName}
              </button>
            ) : (
              row.relatedName
            ),
        },
        { key: 'relatedType', header: 'Тип', className: 'min-w-[180px]' },
        { key: 'role', header: 'Роль', className: 'min-w-[170px]' },
        { key: 'dateFrom', header: 'Дата начала', className: 'min-w-[140px]' },
      ]}
      rows={relations}
    />
  );
};
