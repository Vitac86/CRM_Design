import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type TableStatusTone = 'neutral' | 'subtle' | 'warning' | 'danger';

type TableStatusTextProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: TableStatusTone;
};

const toneClasses: Record<TableStatusTone, string> = {
  neutral: 'text-[var(--color-text-primary)]',
  subtle: 'text-[var(--color-text-secondary)]',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
};

export const TableStatusText = ({ tone = 'neutral', className, ...props }: TableStatusTextProps) => {
  return <span className={cn('inline text-xs font-medium leading-5 whitespace-nowrap', toneClasses[tone], className)} {...props} />;
};
