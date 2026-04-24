import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen overflow-x-clip bg-slate-50 text-slate-900">
      <Sidebar variant="desktop" className="hidden lg:flex" />

      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(270px,85vw)] transform transition-transform duration-200 ease-out lg:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Навигационное меню"
      >
        <Sidebar variant="mobile" onNavigate={() => setIsMobileMenuOpen(false)} className="h-full" />
      </div>

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[270px]">
        <Topbar onMenuClick={() => setIsMobileMenuOpen((value) => !value)} showMenuButton />
        <main className="min-w-0 flex-1 p-4 sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
