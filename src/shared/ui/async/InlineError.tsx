import { cn } from '../../../components/ui/cn';
import { RetryAction } from './RetryAction';

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

export const InlineError = ({ message, onRetry, className }: InlineErrorProps) => {
  return (
    <div className={cn('rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p>{message}</p>
        <RetryAction onRetry={onRetry} />
      </div>
    </div>
  );
};
