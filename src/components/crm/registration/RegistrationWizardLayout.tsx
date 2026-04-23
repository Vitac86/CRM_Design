import type { ReactNode } from 'react';
import { Card } from '../../ui';

type RegistrationWizardLayoutProps = {
  step: number;
  children: ReactNode;
};

export const RegistrationWizardLayout = ({ step, children }: RegistrationWizardLayoutProps) => {
  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <p className="text-sm text-slate-500">Фронт-офис / Субъекты / Мастер регистрации клиентов</p>

      <Card className="space-y-1 p-5">
        <h1 className="text-2xl font-semibold text-slate-900">Мастер регистрации клиентов</h1>
        <p className="text-sm text-slate-500">Шаг {step} из 3</p>
      </Card>

      <Card className="p-5">{children}</Card>
    </div>
  );
};
