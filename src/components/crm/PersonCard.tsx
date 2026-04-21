import { Card } from '../ui';

type PersonCardProps = {
  title: string;
  name: string;
  subtitle: string;
  phone: string;
  email: string;
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const PersonCard = ({ title, name, subtitle, phone, email }: PersonCardProps) => {
  return (
    <Card className="space-y-3 p-4">
      <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{title}</p>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {getInitials(name)}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          <p className="text-sm text-slate-500">{subtitle}</p>
          <p className="text-xs text-slate-600 font-mono">{phone}</p>
          <p className="text-xs text-slate-600">{email}</p>
        </div>
      </div>
    </Card>
  );
};
