import { getDocumentsByClientId } from '../../data/clientDocuments';
import { Badge, Button, DataTable, EmptyState } from '../ui';

type SubjectDocumentsTabProps = {
  clientId: string;
};

const documentStatusVariant: Record<string, 'success' | 'danger' | 'warning' | 'neutral'> = {
  Действующий: 'success',
  'Не действующий': 'neutral',
  'На проверке': 'warning',
  'На подписи': 'warning',
  Отклонена: 'danger',
};

export const SubjectDocumentsTab = ({ clientId }: SubjectDocumentsTabProps) => {
  const documents = getDocumentsByClientId(clientId);

  if (documents.length === 0) {
    return <EmptyState title="Документы отсутствуют" description="Для клиента пока не добавлены документы." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { /* TODO: open create document form */ }}>+ Добавить документ</Button>
      </div>

      <DataTable
        columns={[
          { key: 'title', header: 'Название документа', className: 'min-w-[220px] font-medium text-slate-800' },
          { key: 'documentType', header: 'Вид', className: 'min-w-[180px]' },
          {
            key: 'status',
            header: 'Статус',
            className: 'min-w-[160px]',
            render: (row) => <Badge variant={documentStatusVariant[row.status]}>{row.status}</Badge>,
          },
          { key: 'date', header: 'Дата', className: 'min-w-[140px]' },
        ]}
        rows={documents}
      />
    </div>
  );
};
