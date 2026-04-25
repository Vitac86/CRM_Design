import type { HTMLAttributes } from 'react';
import { cn } from './cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: CardProps) => {
  return <div className={cn('rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm', className)} {...props} />;
};
