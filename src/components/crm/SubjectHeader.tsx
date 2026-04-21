import type { Client } from '../../data/types';
import { Badge, Card } from '../ui';

type SubjectHeaderProps = {
  client: Client;
};

const residencyBadgeVariant = (residency: Client['residency']) =>
  residency === 'Резидент РФ' ? 'success' : 'danger';

export const SubjectHeader = ({ client }: SubjectHeaderProps) => {
  const isRepresentative = client.roles.includes('Представитель');

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 bg-slate-100" />

        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{client.name}</h1>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{client.type}</Badge>
            <Badge variant={residencyBadgeVariant(client.residency)}>{client.residency}</Badge>
            {isRepresentative ? <Badge variant="purple">ПРЕДСТАВИТЕЛЬ</Badge> : null}
            <Badge variant={client.qualification ? 'success' : 'danger'}>
              {client.qualification ? 'КВАЛИФИЦИРОВАН' : 'НЕ КВАЛИФИЦИРОВАН'}
            </Badge>
          </div>

          <p className="text-sm text-slate-600">
            Код клиента: <span className="font-medium text-slate-800">{client.code.toLowerCase()}</span>
          </p>
        </div>
      </div>
    </Card>
  );
};
