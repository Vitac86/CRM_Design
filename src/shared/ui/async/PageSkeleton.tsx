import { cn } from '../../../components/ui/cn';

type PageSkeletonProps = {
  rows?: number;
  className?: string;
};

export const PageSkeleton = ({ rows = 5, className }: PageSkeletonProps) => {
  return (
    <div className={cn('space-y-3 rounded-lg border border-slate-200 bg-white p-4', className)}>
      <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
      <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-12 w-full animate-pulse rounded bg-slate-100" />
      ))}
    </div>
  );
};
