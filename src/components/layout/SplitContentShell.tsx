import type { HTMLAttributes } from 'react';
import { cn } from '../ui/cn';

type SplitContentShellProps = HTMLAttributes<HTMLElement>;

export const SplitContentShell = ({ className, ...props }: SplitContentShellProps) => {
  return <section className={cn('grid min-w-0 gap-4 xl:grid-cols-[2fr_1fr]', className)} {...props} />;
};
