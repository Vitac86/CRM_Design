import { useEffect } from 'react';
import { useNavigate, useRouteError } from 'react-router-dom';
import { Button, Card, EmptyState } from '../components/ui';
import { routes } from '../routes/paths';

export const AppErrorPage = () => {
  const navigate = useNavigate();
  const error = useRouteError();

  useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, [error]);

  return (
    <div className="space-y-4 rounded-2xl bg-[var(--color-muted-surface)] p-5">
      <Card className="p-6">
        <EmptyState
          title="Что-то пошло не так"
          description="Попробуйте обновить страницу или вернуться на дашборд."
          action={
            <Button variant="primary" onClick={() => navigate(routes.dashboard)}>
              На дашборд
            </Button>
          }
        />
      </Card>
    </div>
  );
};
