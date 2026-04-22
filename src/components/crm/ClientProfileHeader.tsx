import type { ReactNode } from 'react';
import type { Client } from '../../data/types';
import { Badge, Card } from '../ui';
import { formatClientType, formatResidency, getClientTypeBadgeVariant, getResidencyBadgeVariant } from '../../utils/labels';

type ClientProfileHeaderProps = {
  client: Client;
  actions?: ReactNode;
  isEditing?: boolean;
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

export const ClientProfileHeader = ({ client, actions, isEditing = false }: ClientProfileHeaderProps) => {
  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">
          {getInitials(client)}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{client.code}</span>
            <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>
            <Badge variant={getResidencyBadgeVariant(client.residency)}>{formatResidency(client.residency)}</Badge>
            {isEditing ? <Badge variant="brand">Режим редактирования</Badge> : null}
          </div>
        </div>
      </div>

      {actions}
    </Card>
  );
};
