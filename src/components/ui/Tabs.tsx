import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type TabItem = {
  value: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

const TabButton = ({ active = false, className, ...props }: TabButtonProps) => (
  <button
    type="button"
    className={cn(
      'crm-tab font-display relative px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
      active && 'crm-tab-active font-semibold',
      className,
    )}
    {...props}
  />
);

export const Tabs = ({ items, value, onChange, className }: TabsProps) => {
  return (
    <div className={cn('crm-tabs crm-scrollbar overflow-x-auto rounded-xl border shadow-sm', className)}>
      <div className="inline-flex min-w-max items-center border-b">
        {items.map((item) => (
          <TabButton
            key={item.value}
            active={item.value === value}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </TabButton>
        ))}
      </div>
    </div>
  );
};
