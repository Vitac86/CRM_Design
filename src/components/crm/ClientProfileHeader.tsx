import { type ReactNode } from 'react';
import type { Client } from '../../data/types';
import { Badge, Card, StatusBadge } from '../ui';
import { formatClientType, formatResidency, formatRiskCategoryForHeader } from '../../utils/labels';

type ClientProfileHeaderProps = {
  client: Client;
  actions?: ReactNode;
};

const getInitials = (client: Client) => {
  if (client.firstName !== '—') {
    return `${client.lastName[0] ?? ''}${client.firstName[0] ?? ''}`.toUpperCase();
  }

  return client.name
    .replace(/[«»]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export const ClientProfileHeader = ({ client, actions }: ClientProfileHeaderProps) => {
  return (
    <Card className="crm-dossier-header flex flex-col gap-3 p-[var(--density-panel-padding)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted-surface)] text-lg font-semibold text-[var(--color-primary)]">
            {getInitials(client)}
          </div>

          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{client.name}</h1>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-inner-panel)] px-3 py-1.5 text-sm">
              <span className="text-[var(--color-text-secondary)]">Код клиента</span>
              <span className="font-mono font-semibold text-[var(--color-text-primary)]">{client.code}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={formatClientType(client.type)} />
              <StatusBadge value={formatResidency(client.residency)} />
              {client.representatives.length > 0 ? <Badge variant="neutral">Представитель</Badge> : null}
              <StatusBadge value={client.qualification ? 'Квалифицированный' : 'Неквалифицированный'} />
              <StatusBadge value={formatRiskCategoryForHeader(client.riskCategory)} />
            </div>
          </div>
        </div>

        {actions}
      </div>
    </Card>
  );
};
