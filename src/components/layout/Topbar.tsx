export const Topbar = () => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <label className="relative block w-full max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">🔎</span>
        <input
          type="search"
          placeholder="Глобальный поиск"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:bg-white"
        />
      </label>

      <div className="ml-6 flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">Иванов И.И.</p>
          <p className="text-xs text-slate-500">менеджер</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">ИИ</div>
      </div>
    </header>
  );
};
