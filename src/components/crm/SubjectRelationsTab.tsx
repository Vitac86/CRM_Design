import { getRelationsByClientId } from '../../data/clientRelations';
import { Badge, DataTable, EmptyState } from '../ui';

type SubjectRelationsTabProps = {
  clientId: string;
};

const relationStatusVariant: Record<string, 'success' | 'neutral' | 'warning'> = {
  Активна: 'success',
  Неактивна: 'neutral',
  'На проверке': 'warning',
};

export const SubjectRelationsTab = ({ clientId }: SubjectRelationsTabProps) => {
  const relations = getRelationsByClientId(clientId);

  if (relations.length === 0) {
    return <EmptyState title="Связи отсутствуют" description="Для клиента не зафиксированы связи." />;
  }

  return (
    <DataTable
      columns={[
        { key: 'relatedName', header: 'Связанное лицо / организация', className: 'min-w-[260px] font-medium text-slate-800' },
        { key: 'relatedCode', header: 'Код', className: 'min-w-[120px]' },
        { key: 'relatedType', header: 'Тип', className: 'min-w-[180px]' },
        { key: 'role', header: 'Роль', className: 'min-w-[170px]' },
        { key: 'dateFrom', header: 'Дата начала', className: 'min-w-[140px]' },
        {
          key: 'status',
          header: 'Статус',
          className: 'min-w-[140px]',
          render: (row) => <Badge variant={relationStatusVariant[row.status]}>{row.status}</Badge>,
        },
      ]}
      rows={relations}
    />
  );
};
