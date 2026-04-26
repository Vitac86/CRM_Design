import { useNavigate } from 'react-router-dom';
import { Button, Card, EmptyState } from '../components/ui';
import { routes } from '../routes/paths';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <EmptyState
        title="Раздел не найден"
        description="Проверьте адрес или вернитесь на главную страницу."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => navigate(routes.dashboard)}>
              На дашборд
            </Button>
            <Button variant="secondary" onClick={() => window.history.back()}>
              Назад
            </Button>
          </div>
        }
      />
    </Card>
  );
};
