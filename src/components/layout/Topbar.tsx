export const Topbar = () => {
  return (
    <header className="flex h-16 items-center justify-end border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">Иванов И.И.</p>
          <p className="text-xs text-slate-500">менеджер</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">ИИ</div>
      </div>
    </header>
  );
};
