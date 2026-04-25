import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '../components/ui';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { AdministrationSection } from '../features/administration/api/administrationRepository';
import { useTheme } from '../theme/useTheme';
import type { ThemeId } from '../theme/themeTypes';

const THEME_TITLES: Record<ThemeId, string> = {
  current: 'Текущий дизайн',
  'investica-dark': 'Investica Dark Prestige',
  'investica-light': 'Investica Light Executive',
};

export const AdministrationPage = () => {
  const { administration } = useDataAccess();
  const [sections, setSections] = useState<AdministrationSection[]>([]);
  const { themes, themeId, setTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;

    void administration.listSections().then((items) => {
      if (isMounted) {
        setSections(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [administration]);

  return (
    <div className="min-w-0 space-y-4 rounded-2xl bg-slate-100/80 p-4 sm:p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Администрирование</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.id} className="flex flex-col gap-3 p-4">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm text-slate-600">{section.description}</p>
            <p className="mt-auto text-sm font-medium text-brand-dark">{section.itemsCount}</p>
          </Card>
        ))}
      </section>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Внешний вид CRM</h2>
            <p className="text-sm text-slate-600">Выберите визуальный стиль интерфейса, переключение применяется сразу.</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {themes.map((theme) => {
            const isActive = theme.id === themeId;

            return (
              <Card key={theme.id} className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{THEME_TITLES[theme.id]}</h3>
                    <p className="mt-1 text-xs text-slate-600">{theme.description}</p>
                  </div>
                  {isActive ? <Badge variant="brand">Активно</Badge> : null}
                </div>

                <div
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                  aria-hidden
                >
                  <div className="h-2" style={{ backgroundColor: theme.primary }} />
                  <div className="flex h-16">
                    <div className="w-7" style={{ backgroundColor: theme.sidebar }} />
                    <div className="flex-1 p-2" style={{ backgroundColor: theme.background }}>
                      <div className="mb-1 h-2 w-3/4 rounded" style={{ backgroundColor: theme.textSecondary, opacity: 0.4 }} />
                      <div className="h-2 w-1/2 rounded" style={{ backgroundColor: theme.accent, opacity: 0.7 }} />
                    </div>
                  </div>
                </div>

                <Button
                  className="mt-auto w-full"
                  variant={isActive ? 'secondary' : 'primary'}
                  onClick={() => setTheme(theme.id)}
                  disabled={isActive}
                >
                  {isActive ? 'Активно' : 'Применить'}
                </Button>
              </Card>
            );
          })}
        </section>
      </Card>
    </div>
  );
};
