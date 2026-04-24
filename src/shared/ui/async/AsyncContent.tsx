import type { ReactNode } from 'react';
import { EmptyState } from '../../../components/ui';
import { InlineError } from './InlineError';
import { PageSkeleton } from './PageSkeleton';

type AsyncContentProps = {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  emptyFallback?: ReactNode;
  children: ReactNode;
};

export const AsyncContent = ({
  isLoading,
  error,
  isEmpty = false,
  loadingFallback,
  errorFallback,
  emptyFallback,
  children,
}: AsyncContentProps) => {
  if (isLoading) {
    return loadingFallback ?? <PageSkeleton />;
  }

  if (error) {
    return errorFallback ?? <InlineError message={error} />;
  }

  if (isEmpty) {
    return emptyFallback ?? <EmptyState title="Нет данных" />;
  }

  return <>{children}</>;
};
