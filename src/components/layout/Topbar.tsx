import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Client } from '../../data/types';
import { formatClientType, formatComplianceStatus, getComplianceBadgeVariant } from '../../utils/labels';
import { SearchIcon } from '../ui/icons';
import { useDataAccess } from '../../app/dataAccess/useDataAccess';

type TopbarProps = {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
};

const complianceBadgeClassMap = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  orange: 'bg-orange-100 text-orange-700',
  danger: 'bg-rose-100 text-rose-700',
};

const maxResults = 8;

export const Topbar = ({ onMenuClick, showMenuButton = false }: TopbarProps) => {
  const { clients: clientsRepository } = useDataAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLLabelElement | null>(null);
  const hideGlobalSearch =
    location.pathname === '/subjects' ||
    location.pathname.startsWith('/subjects/') ||
    location.pathname === '/trading' ||
    location.pathname.startsWith('/trading/');

  const normalizedSearch = search.trim().toLowerCase();

  useEffect(() => {
    let isMounted = true;

    void clientsRepository.listClients().then((items) => {
      if (isMounted) {
        setClients(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [clientsRepository]);

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
    [normalizedSearch, clients],
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
    <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
        {showMenuButton ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
            aria-label="Открыть меню"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        ) : null}

        {!hideGlobalSearch ? (
          <label ref={searchRef} className="relative hidden min-w-0 w-full max-w-xl sm:block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><SearchIcon className="h-4 w-4" /></span>
            <input
              type="search"
              placeholder="Глобальный поиск"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-brand focus:bg-white"
            />

            {isOpen ? (
              <div className="absolute top-12 z-40 max-h-[min(420px,calc(100vh-5rem))] w-full max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                {searchResults.length ? (
                  <ul className="max-h-[min(420px,calc(100vh-5rem))] overflow-y-auto py-1">
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
                            <p className="truncate text-xs text-slate-500">{formatClientType(client.type)}</p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                              complianceBadgeClassMap[getComplianceBadgeVariant(client.complianceStatus)]
                            }`}
                          >
                            {formatComplianceStatus(client.complianceStatus)}
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
        ) : (
          <div className="hidden w-full max-w-xl sm:block" />
        )}
      </div>

      <div className="ml-2 flex shrink-0 min-w-0 items-center gap-2 sm:gap-3">
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold text-slate-900">Иванов И.И.</p>
          <p className="truncate text-xs text-slate-500">менеджер</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">ИИ</div>
      </div>
    </header>
  );
};
