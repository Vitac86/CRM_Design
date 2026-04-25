import { Badge, type BadgeVariant } from './Badge';
import { cn } from './cn';
import { getStatusBadgeVariant } from './statusBadge';

type StatusBadgeProps = {
  value: string;
  className?: string;
  fallbackVariant?: BadgeVariant;
  compact?: boolean;
};

export const StatusBadge = ({ value, className, fallbackVariant = 'neutral', compact = false }: StatusBadgeProps) => {
  const variant = getStatusBadgeVariant(value, fallbackVariant);

  return (
    <Badge
      variant={variant}
      className={cn(
        'max-w-full align-middle',
        compact && 'px-1.5 py-0 text-[11px] leading-4',
        className,
      )}
      title={value}
    >
      <span className="truncate">{value}</span>
    </Badge>
  );
};
