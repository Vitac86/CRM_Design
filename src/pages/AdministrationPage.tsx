import { Card } from '../components/ui';
import { administrationSections } from '../data/administration';

export const AdministrationPage = () => {
  return (
    <div className="space-y-4 rounded-2xl bg-slate-100/80 p-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Администрирование</h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {administrationSections.map((section) => (
          <Card key={section.id} className="flex flex-col gap-3 p-4">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="text-sm text-slate-600">{section.description}</p>
            <p className="mt-auto text-sm font-medium text-brand-dark">{section.itemsCount}</p>
          </Card>
        ))}
      </section>
    </div>
  );
};
