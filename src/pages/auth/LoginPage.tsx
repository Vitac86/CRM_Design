import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PasswordField } from '../../components/auth/PasswordField';
import { Button, Card, FormField } from '../../components/ui';
import { routes } from '../../routes/paths';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Заполните email и пароль, чтобы продолжить.');
      return;
    }

    if (email.trim().toLowerCase() === 'error@investica.demo') {
      setError('Неверный логин или пароль. Проверьте данные и повторите попытку.');
      return;
    }

    setError(null);
    navigate(routes.dashboard);
  };

  return (
    <Card className="rounded-2xl p-6 sm:p-7">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Вход</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Введите учётные данные для доступа к CRM</p>
        </header>

        <FormField
          label="Email / Логин"
          name="email"
          autoComplete="email"
          placeholder="name@company.ru"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error && !email.trim() ? 'Поле обязательно для заполнения.' : undefined}
        />

        <PasswordField
          label="Пароль"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error && !password.trim() ? 'Поле обязательно для заполнения.' : undefined}
        />

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-input-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
            />
            Запомнить меня
          </label>

          <Link to={routes.forgotPassword} className="crm-link font-medium">
            Забыли пароль?
          </Link>
        </div>


        {location.state && typeof location.state === 'object' && 'registered' in location.state ? (
          <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">Регистрация завершена. Войдите в систему с новым аккаунтом.</p>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full">
          Войти в систему
        </Button>

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Нет учётной записи?{' '}
          <Link to={routes.register} className="crm-link font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </Card>
  );
};
