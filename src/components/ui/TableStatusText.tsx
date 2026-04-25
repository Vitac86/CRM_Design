import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type TableStatusTone = 'neutral' | 'subtle' | 'warning' | 'danger';

type TableStatusTextProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: TableStatusTone;
};

const toneClasses: Record<TableStatusTone, string> = {
  neutral: 'text-[var(--color-text-primary)]',
  subtle: 'text-[var(--color-text-secondary)]',
  warning: 'text-[color:color-mix(in_srgb,var(--color-warning)_72%,var(--color-text-primary))]',
  danger: 'text-[color:color-mix(in_srgb,var(--color-danger)_72%,var(--color-text-primary))]',
};

export const TableStatusText = ({ tone = 'neutral', className, ...props }: TableStatusTextProps) => {
  return <span className={cn('inline text-xs font-medium leading-5 whitespace-nowrap', toneClasses[tone], className)} {...props} />;
};
