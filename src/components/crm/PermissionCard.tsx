import { Badge, Card } from '../ui';

type PermissionCardProps = {
  title: string;
  description: string;
  enabled: boolean;
};

export const PermissionCard = ({ title, description, enabled }: PermissionCardProps) => {
  return (
    <Card className="flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Да' : 'Нет'}</Badge>
    </Card>
  );
};
