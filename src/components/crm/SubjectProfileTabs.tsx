import { cn } from '../ui/cn';

export type SubjectProfileTab = 'profile' | 'documents' | 'relations' | 'contracts' | 'history';

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
  { value: 'documents', label: 'Документы' },
  { value: 'relations', label: 'Связи' },
  { value: 'contracts', label: 'Договоры' },
  { value: 'history', label: 'История' },
];

export const SubjectProfileTabs = ({ activeTab, onChange }: SubjectProfileTabsProps) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <div className="flex min-w-max items-stretch">
        {tabs.map((tab) => {
          const active = tab.value === activeTab;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'border-r border-slate-200 px-5 py-4 text-left text-lg font-semibold text-slate-600 transition-colors last:border-r-0',
                active && 'bg-brand-light/40 text-brand-dark shadow-[inset_0_-3px_0_0_#2E7D5A]',
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
