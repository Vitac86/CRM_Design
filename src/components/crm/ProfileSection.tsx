import type { ReactNode } from 'react';
import { Card } from '../ui';

type ProfileSectionProps = {
  title: string;
  children: ReactNode;
};

export const ProfileSection = ({ title, children }: ProfileSectionProps) => {
  return (
    <Card className="space-y-3 p-3.5 sm:p-4">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {children}
    </Card>
  );
};
