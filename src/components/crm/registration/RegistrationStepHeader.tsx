import type { ReactNode } from 'react';

type RegistrationStepHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export const RegistrationStepHeader = ({ title, description, actions }: RegistrationStepHeaderProps) => {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
};
