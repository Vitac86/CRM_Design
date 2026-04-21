import type { ReactNode } from 'react';
import { Card } from '../ui';

type ProfileSectionProps = {
  title: string;
  children: ReactNode;
};

export const ProfileSection = ({ title, children }: ProfileSectionProps) => {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </Card>
  );
};
