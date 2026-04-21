import { useLocation, useParams } from 'react-router-dom';

export const RoutePlaceholderPage = () => {
  const location = useLocation();
  const params = useParams();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
      <section className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-brand-dark">Инвестика CRM</h1>
        <p className="mt-3 text-slate-600">Заглушка раздела: <span className="font-medium text-slate-800">{location.pathname}</span></p>
        <div className="mt-6 rounded-lg border border-brand-light bg-brand-light/40 p-4 text-sm text-slate-700">
          <p>Параметры маршрута:</p>
          <pre className="mt-2 overflow-auto rounded bg-white p-3 text-xs text-slate-600">{JSON.stringify(params, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
};
