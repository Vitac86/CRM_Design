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
      'font-display relative px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
      active &&
        'bg-brand-light/20 font-semibold text-brand-dark after:absolute after:right-3 after:bottom-0 after:left-3 after:h-0.5 after:rounded-full after:bg-brand',
      className,
    )}
    {...props}
  />
);

export const Tabs = ({ items, value, onChange, className }: TabsProps) => {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="inline-flex min-w-max items-center border-b border-slate-100">
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
