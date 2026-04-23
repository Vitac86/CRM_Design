import { type ReactNode } from 'react';
import type { Client } from '../../data/types';
import { Badge, Card } from '../ui';
import {
  formatClientType,
  formatResidency,
  formatRiskCategoryForHeader,
  getClientTypeBadgeVariant,
  getResidencyBadgeVariant,
  getRiskCategoryBadgeVariant,
} from '../../utils/labels';

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
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">
            {getInitials(client)}
          </div>

          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
              <span className="text-slate-500">Код клиента</span>
              <span className="font-mono font-semibold text-slate-900">{client.code}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>
              <Badge variant={getResidencyBadgeVariant(client.residency)}>{formatResidency(client.residency)}</Badge>
              {client.representatives.length > 0 ? <Badge variant="neutral">Представитель</Badge> : null}
              <Badge variant={client.qualification ? 'brand' : 'neutral'}>
                {client.qualification ? 'Квалифицированный' : 'Неквалифицированный'}
              </Badge>
              <Badge variant={getRiskCategoryBadgeVariant(client.riskCategory)}>
                {formatRiskCategoryForHeader(client.riskCategory)}
              </Badge>
            </div>
          </div>
        </div>

        {actions}
      </div>
    </Card>
  );
};
