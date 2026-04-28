import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, FormField } from '../../components/ui';
import { routes } from '../../routes/paths';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setSuccessMessage(null);
      setError('Укажите email для восстановления доступа.');
      return;
    }

    setError(null);
    setSuccessMessage('Инструкция по восстановлению отправлена на указанную почту.');
  };

  return (
    <Card className="rounded-2xl p-6 sm:p-7">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Сброс пароля</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Введите email, и мы отправим инструкцию для восстановления доступа.</p>
        </header>

        <FormField
          label="Email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error ?? undefined}
        />

        {successMessage ? (
          <p className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{successMessage}</p>
        ) : null}

        <Button type="submit" className="w-full">
          Сбросить пароль
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <Link to={routes.login} className="crm-link font-medium">
            Вернуться к авторизации
          </Link>
          <Link to={routes.resetPassword} className="crm-link font-medium">
            Demo: перейти к новому паролю
          </Link>
        </div>
      </form>
    </Card>
  );
};
