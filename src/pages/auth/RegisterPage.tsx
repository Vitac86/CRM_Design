import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordField } from '../../components/auth/PasswordField';
import { Button, Card, FormField } from '../../components/ui';
import { routes } from '../../routes/paths';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !fullName.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Заполните все поля формы.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают. Проверьте введённые значения.');
      return;
    }

    if (!agree) {
      setError('Подтвердите согласие на обработку данных.');
      return;
    }

    setError(null);
    navigate(routes.login, { state: { registered: true } });
  };

  return (
    <Card className="rounded-2xl p-6 sm:p-7">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">Регистрация</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Создайте учётную запись для работы в CRM</p>
        </header>

        <FormField label="Email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <FormField label="ФИО" name="fullName" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />

        <PasswordField label="Пароль" name="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <PasswordField
          label="Подтвердите пароль"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        <label className="inline-flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={agree}
            onChange={(event) => setAgree(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--color-input-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/30"
          />
          Согласен на обработку персональных данных
        </label>

        {error ? (
          <p className="rounded-lg border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/8 px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full">
          Зарегистрироваться
        </Button>

        <p className="text-center text-sm text-[var(--color-text-secondary)]">
          Есть учётная запись?{' '}
          <Link to={routes.login} className="crm-link font-medium">
            Авторизация
          </Link>
        </p>
      </form>
    </Card>
  );
};
