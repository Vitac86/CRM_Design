import { cn } from '../ui/cn';

export type SubjectProfileTab = 'profile' | 'bankAccounts' | 'documents' | 'relations' | 'contracts' | 'history';

type TabItem = {
  value: SubjectProfileTab;
  label: string;
};

type SubjectProfileTabsProps = {
  activeTab: SubjectProfileTab;
  onChange: (value: SubjectProfileTab) => void;
};

const tabs: TabItem[] = [
  { value: 'profile', label: 'Профиль' },
  { value: 'bankAccounts', label: 'Банковские реквизиты' },
  { value: 'documents', label: 'Документы' },
  { value: 'relations', label: 'Связи' },
  { value: 'contracts', label: 'Договоры' },
  { value: 'history', label: 'История' },
];

export const SubjectProfileTabs = ({ activeTab, onChange }: SubjectProfileTabsProps) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-w-max items-stretch border-b border-slate-100">
        {tabs.map((tab) => {
          const active = tab.value === activeTab;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative px-5 py-3 text-left text-base font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
                active &&
                  'bg-brand-light/20 font-semibold text-brand-dark after:absolute after:right-4 after:bottom-0 after:left-4 after:h-0.5 after:rounded-full after:bg-brand',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
