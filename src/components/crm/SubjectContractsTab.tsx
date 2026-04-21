import { getContractsByClientId } from '../../data/clientContracts';
import { Badge, Card, DataTable, EmptyState } from '../ui';
import { cn } from '../ui/cn';

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

const innerTabs = [
  { key: 'contracts', label: 'Договоры' },
  { key: 'accounts', label: 'Счета' },
];

export const SubjectContractsTab = ({ clientId }: SubjectContractsTabProps) => {
  const contracts = getContractsByClientId(clientId);

  if (contracts.length === 0) {
    return <EmptyState title="Договоры отсутствуют" description="Для клиента пока не добавлены договоры." />;
  }

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-200 bg-white px-4 pt-3">
        {innerTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              tab.key === 'contracts'
                ? 'border-brand text-brand-dark'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
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
    </Card>
  );
};
