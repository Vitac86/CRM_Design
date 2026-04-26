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
  { value: 'contracts', label: 'Договоры / Счета' },
  { value: 'history', label: 'История' },
];

export const SubjectProfileTabs = ({ activeTab, onChange }: SubjectProfileTabsProps) => {
  return (
    <div className="crm-tabs overflow-x-auto rounded-xl border shadow-sm">
      <div className="flex min-w-max items-stretch border-b">
        {tabs.map((tab) => {
          const active = tab.value === activeTab;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                'crm-tab relative px-[var(--density-tab-px)] py-[var(--density-tab-py)] text-left text-base font-medium transition-colors',
                active && 'crm-tab-active font-semibold',
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
