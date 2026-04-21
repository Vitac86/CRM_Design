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
      'rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      className,
    )}
    {...props}
  />
);

export const Tabs = ({ items, value, onChange, className }: TabsProps) => {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1', className)}>
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
  );
};
