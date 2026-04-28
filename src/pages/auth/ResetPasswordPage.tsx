import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { PasswordField } from '../../components/auth/PasswordField';
import { Button, Card } from '../../components/ui';
import { routes } from '../../routes/paths';

export const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      setSuccessMessage(null);
      setError('Заполните оба поля, чтобы обновить пароль.');
      return;
    }

    if (password !== confirmPassword) {
      setSuccessMessage(null);
      setError('Пароли не совпадают.');
      return;
    }

    setError(null);
    setSuccessMessage('Пароль успешно обновлён. Теперь вы можете войти в систему.');
  };

  return (
    <Card className="rounded-2xl p-6 sm:p-7">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Новый пароль</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Придумайте новый пароль и подтвердите изменение.</p>
        </header>

        <PasswordField
          label="Новый пароль"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          label="Подтвердите пароль"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {error ? (
          <p className="rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}
        {successMessage ? (
          <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
        ) : null}

        <Button type="submit" className="w-full">
          Сохранить новый пароль
        </Button>

        <Link to={routes.login} className="crm-link block text-center text-sm font-medium">
          Перейти к авторизации
        </Link>
      </form>
    </Card>
  );
};
