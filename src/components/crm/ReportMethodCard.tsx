import { Badge, Card } from '../ui';

type ReportMethodCardProps = {
  title: string;
  description: string;
  enabled: boolean;
};

export const ReportMethodCard = ({ title, description, enabled }: ReportMethodCardProps) => {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Включён' : 'Отключён'}</Badge>
    </Card>
  );
};
