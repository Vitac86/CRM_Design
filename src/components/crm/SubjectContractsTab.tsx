import { getContractsByClientId } from '../../data/clientContracts';
import { Badge, Button, DataTable, EmptyState } from '../ui';

type SubjectContractsTabProps = {
  clientId: string;
};

const contractTypeVariant: Record<string, 'orange' | 'info' | 'success' | 'purple' | 'neutral'> = {
  Депозитарный: 'orange',
  'Договор ДУ': 'info',
  'Договор БО': 'success',
  Дилерский: 'purple',
  Брокерский: 'neutral',
};

const contractStatusVariant: Record<string, 'success' | 'danger' | 'neutral' | 'warning'> = {
  Действующий: 'success',
  'Не действующий': 'danger',
  Закрытый: 'neutral',
  'На подписании': 'warning',
};

export const SubjectContractsTab = ({ clientId }: SubjectContractsTabProps) => {
  const contracts = getContractsByClientId(clientId);

  if (contracts.length === 0) {
    return <EmptyState title="Договоры отсутствуют" description="Для клиента пока не добавлены договоры." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { /* TODO: open create contract form */ }}>+ Добавить договор</Button>
      </div>

      <DataTable
        columns={[
          { key: 'number', header: 'Номер договора', className: 'min-w-[180px] font-medium text-slate-800' },
          { key: 'signedAt', header: 'Дата заключения', className: 'min-w-[150px]' },
          {
            key: 'contractType',
            header: 'Вид договора',
            className: 'min-w-[180px]',
            render: (row) => <Badge variant={contractTypeVariant[row.contractType]}>{row.contractType}</Badge>,
          },
          {
            key: 'status',
            header: 'Статус договора',
            className: 'min-w-[180px]',
            render: (row) => <Badge variant={contractStatusVariant[row.status]}>{row.status}</Badge>,
          },
        ]}
        rows={contracts}
      />
    </div>
  );
};
