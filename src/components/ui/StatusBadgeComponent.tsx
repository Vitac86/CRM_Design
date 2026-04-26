import type { HTMLAttributes, ReactNode } from 'react';
import { Badge, type BadgeVariant } from './Badge';
import { cn } from './cn';
import { getStatusBadgeVariant } from './statusBadge';

type StatusBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  value?: string | null;
  status?: string | null;
  variant?: BadgeVariant;
  fallbackVariant?: BadgeVariant;
  compact?: boolean;
  size?: 'sm' | 'md';
  children?: ReactNode;
};

export const StatusBadge = ({
  value,
  status,
  variant,
  fallbackVariant = 'neutral',
  compact = false,
  size,
  className,
  children,
  ...props
}: StatusBadgeProps) => {
  const label = children ?? status ?? value ?? '—';
  const resolvedVariant = variant ?? getStatusBadgeVariant(String(label), fallbackVariant);
  const isCompact = compact || size === 'sm';

  return (
    <Badge
      variant={resolvedVariant}
      className={cn(
        'max-w-full align-middle',
        isCompact && 'px-1.5 py-0 text-[11px] leading-4',
        className,
      )}
      title={typeof label === 'string' ? label : undefined}
      {...props}
    >
      {typeof label === 'string' ? <span className="truncate">{label}</span> : label}
    </Badge>
  );
};
