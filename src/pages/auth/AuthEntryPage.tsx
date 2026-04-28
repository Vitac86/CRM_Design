import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { routes } from '../../routes/paths';

export const AuthEntryPage = () => {
  const navigate = useNavigate();

  return (
    <Card className="space-y-6 rounded-2xl p-6 sm:p-7">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Вход в систему</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Выберите способ доступа к CRM</p>
      </header>

      <div className="space-y-3">
        <Button className="w-full" onClick={() => navigate(routes.login)}>
          Есть учётная запись
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate(routes.register)}>
          Создать учётную запись
        </Button>
      </div>
    </Card>
  );
};
