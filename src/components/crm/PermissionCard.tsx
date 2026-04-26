import { Badge, Card } from '../ui';

type PermissionCardProps = {
  title: string;
  description: string;
  enabled: boolean;
};

export const PermissionCard = ({ title, description, enabled }: PermissionCardProps) => {
  return (
    <Card className="crm-dossier-section flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{description}</p>
      </div>
      <Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Да' : 'Нет'}</Badge>
    </Card>
  );
};
