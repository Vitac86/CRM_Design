import type { HTMLAttributes, ReactNode } from 'react';
import { Badge, type BadgeVariant } from './Badge';
import { cn } from './cn';
import { getStatusBadgeVariant } from './statusBadge';

type StatusBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  value?: string | null;
  variant?: BadgeVariant;
  fallbackVariant?: BadgeVariant;
  compact?: boolean;
  children?: ReactNode;
};

export const StatusBadge = ({
  value,
  variant,
  fallbackVariant = 'neutral',
  compact = false,
  className,
  children,
  ...props
}: StatusBadgeProps) => {
  const label = children ?? value ?? '—';
  const resolvedVariant = variant ?? getStatusBadgeVariant(String(label), fallbackVariant);

  return (
    <Badge
      variant={resolvedVariant}
      className={cn(
        'max-w-full align-middle',
        compact && 'px-1.5 py-0 text-[11px] leading-4',
        className,
      )}
      title={typeof label === 'string' ? label : undefined}
      {...props}
    >
      {typeof label === 'string' ? <span className="truncate">{label}</span> : label}
    </Badge>
  );
};
