import type { HTMLAttributes } from 'react';
import { Button } from './Button';
import { cn } from './cn';

type PaginationProps = HTMLAttributes<HTMLDivElement> & {
  page: number;
  totalPages: number;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
};

export const Pagination = ({
  page,
  totalPages,
  onPrev,
  onNext,
  canPrev = page > 1,
  canNext = page < totalPages,
  className,
  ...props
}: PaginationProps) => {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-slate-600', className)} {...props}>
      <span className="min-w-[72px] font-medium text-slate-700">
        {page} из {totalPages}
      </span>
      <Button size="sm" onClick={onPrev} disabled={!canPrev} aria-label="Предыдущая страница">
        ←
      </Button>
      <Button size="sm" onClick={onNext} disabled={!canNext} aria-label="Следующая страница">
        →
      </Button>
    </div>
  );
};
