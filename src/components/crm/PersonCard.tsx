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
    <Card className="crm-dossier-section space-y-3 p-4">
      <p className="text-[11px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">{title}</p>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted-surface)] text-sm font-semibold text-[var(--color-accent)]">
          {getInitials(name)}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">{name}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
          <p className="text-xs font-mono text-[var(--color-text-secondary)]">{phone}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">{email}</p>
        </div>
      </div>
    </Card>
  );
};
