import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clients } from '../../data/clients';
import type { Client, ComplianceStatus } from '../../data/types';

const complianceBadgeVariant: Record<ComplianceStatus, string> = {
  ПРОЙДЕН: 'bg-emerald-100 text-emerald-700',
  'НА ПРОВЕРКЕ': 'bg-amber-100 text-amber-700',
  'НА ДОРАБОТКЕ': 'bg-orange-100 text-orange-700',
  БАН: 'bg-rose-100 text-rose-700',
};

const maxResults = 8;

export const Topbar = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLLabelElement | null>(null);

  const normalizedSearch = search.trim().toLowerCase();

  const searchResults = useMemo<Client[]>(
    () =>
      normalizedSearch
        ? clients
            .filter((client) =>
              [client.code, client.name, client.inn, client.email].some((value) =>
                value.toLowerCase().includes(normalizedSearch),
              ),
            )
            .slice(0, maxResults)
        : [],
    [normalizedSearch],
  );

  useEffect(() => {
    if (!search.trim()) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }, [search]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (clientId: string) => {
    setIsOpen(false);
    navigate(`/subjects/${clientId}`);
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <label ref={searchRef} className="relative block w-full max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">🔎</span>
        <input
          type="search"
          placeholder="Глобальный поиск"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:bg-white"
        />

        {isOpen ? (
          <div className="absolute top-12 z-20 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            {searchResults.length ? (
              <ul className="max-h-[420px] overflow-y-auto py-1">
                {searchResults.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(client.id)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{client.code}</p>
                        <p className="truncate text-sm font-medium text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.type}</p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${complianceBadgeVariant[client.complianceStatus]}`}
                      >
                        {client.complianceStatus}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-3 text-sm text-slate-500">Ничего не найдено</p>
            )}
          </div>
        ) : null}
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
