import { Button } from '../../../components/ui';

type RetryActionProps = {
  onRetry?: () => void;
  label?: string;
  className?: string;
};

export const RetryAction = ({ onRetry, label = 'Повторить', className }: RetryActionProps) => {
  if (!onRetry) {
    return null;
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={onRetry} className={className}>
      {label}
    </Button>
  );
};
