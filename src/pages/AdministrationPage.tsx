import { useEffect, useState } from 'react';
import { Badge, Button, Card } from '../components/ui';
import { useDataAccess } from '../app/dataAccess/useDataAccess';
import type { AdministrationSection } from '../features/administration/api/administrationRepository';
import { useTheme } from '../theme/useTheme';
import { BrandLogo } from '../components/brand/BrandLogo';
import type { ThemeId } from '../theme/themeTypes';

const THEME_TITLES: Record<ThemeId, string> = {
  current: 'Текущий дизайн',
  'investica-dark': 'Investica Dark Prestige',
  'investica-light': 'Investica Light Executive',
  'investica-command': 'Investica Command Center',
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
    <div className="min-w-0 space-y-4 rounded-2xl bg-[var(--color-muted-surface)]/80 p-4 sm:p-5">
      <header>
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Администрирование</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Card key={section.id} className="flex flex-col gap-3 p-4">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{section.title}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">{section.description}</p>
            <p className="mt-auto text-sm font-medium text-[var(--color-accent)]">{section.itemsCount}</p>
          </Card>
        ))}
      </section>

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Внешний вид CRM</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">Выберите визуальный стиль интерфейса, переключение применяется сразу.</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {themes.map((theme) => {
            const isActive = theme.id === themeId;

            return (
              <Card
                key={theme.id}
                className={`flex h-full flex-col gap-3 p-4 transition-all ${
                  isActive
                    ? 'border-[var(--color-primary)] shadow-[0_0_0_1px_var(--color-primary)]'
                    : 'hover:border-[var(--color-primary)]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)]">{THEME_TITLES[theme.id]}</h3>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{theme.description}</p>
                  </div>
                  {isActive ? <Badge variant="brand">Активно</Badge> : null}
                </div>

                <div
                  className="relative overflow-hidden rounded-lg border"
                  style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                  aria-hidden
                >
                  <div className="h-2" style={{ backgroundColor: theme.primary }} />
                  <div className="flex h-20">
                    <div className="flex w-14 items-start justify-center px-2 pt-2" style={{ backgroundColor: theme.sidebar }}>
                      <BrandLogo variant="mark" tone={theme.logoTone} className="h-4" />
                    </div>
                    <div className="flex-1 p-2" style={{ backgroundColor: theme.background }}>
                      <div className="mb-1.5 h-2 w-4/5 rounded" style={{ backgroundColor: theme.textSecondary, opacity: 0.4 }} />
                      <div className="mb-2 h-2 w-1/2 rounded" style={{ backgroundColor: theme.accent, opacity: 0.7 }} />
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="h-6 rounded" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }} />
                        <div className="h-6 rounded" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }} />
                      </div>
                    </div>
                  </div>
                  {theme.id === 'investica-command' ? (
                    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded border px-2 py-1" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                      <span className="h-1.5 w-8 rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.8 }} />
                      <span className="h-1.5 w-6 rounded-full" style={{ backgroundColor: theme.textSecondary, opacity: 0.7 }} />
                      <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: theme.primary, opacity: 0.85 }} />
                    </div>
                  ) : null}
                  {theme.id !== 'current' && theme.id !== 'investica-command' ? (
                    <img
                      src="/brand/investica/eagle-glass.png"
                      alt=""
                      className="pointer-events-none absolute -right-3 -bottom-5 h-16 w-16 opacity-20"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
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
