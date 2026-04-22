import { useMemo, useState, type ReactNode } from 'react';
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
  const [showAllCodes, setShowAllCodes] = useState(false);
  const allCodes = useMemo(() => {
    const codes = client.clientCodes?.length ? client.clientCodes : [client.code];
    return Array.from(new Set(codes));
  }, [client.clientCodes, client.code]);
  const hiddenCodesCount = Math.max(0, allCodes.length - 1);
  const previewCodes = showAllCodes ? allCodes : allCodes.slice(0, 7);

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-700">
            {getInitials(client)}
          </div>

          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Код клиента</span>
                <span className="font-mono font-semibold text-slate-900">{client.code}</span>
              </div>
              {hiddenCodesCount > 0 ? <Badge variant="neutral">+{hiddenCodesCount} кодов</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getClientTypeBadgeVariant(client.type)}>{formatClientType(client.type)}</Badge>
              <Badge variant={getResidencyBadgeVariant(client.residency)}>{formatResidency(client.residency)}</Badge>
              {client.representative !== 'Самостоятельно' ? <Badge variant="neutral">Представитель</Badge> : null}
              <Badge variant={client.qualification ? 'brand' : 'neutral'}>
                {client.qualification ? 'Квалифицированный' : 'Неквалифицированный'}
              </Badge>
              <Badge variant={getRiskCategoryBadgeVariant(client.riskCategory)}>
                {formatRiskCategoryForHeader(client.riskCategory)}
              </Badge>
              {isEditing ? <Badge variant="brand">Режим редактирования</Badge> : null}
            </div>
          </div>
        </div>

        {actions}
      </div>

      {allCodes.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Коды клиента</div>
          <div className="flex flex-wrap gap-2">
            {previewCodes.map((code) => (
              <span
                key={code}
                className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700"
              >
                {code}
              </span>
            ))}
          </div>
          {allCodes.length > 7 ? (
            <button
              type="button"
              onClick={() => setShowAllCodes((current) => !current)}
              className="text-xs font-medium text-slate-600 transition hover:text-slate-900"
            >
              {showAllCodes ? 'Скрыть' : 'Показать все коды'}
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};
