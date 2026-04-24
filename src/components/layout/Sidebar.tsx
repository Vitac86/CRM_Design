import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDataAccess } from '../../app/dataAccess/useDataAccess';
import { isMenuGroup, type SidebarItem } from '../../features/navigation/api/navigationRepository';
import { cn } from '../ui/cn';
import { SidebarIcon } from './SidebarIcon';

const linkBaseClass =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';

const buildInitialOpenGroups = (menu: SidebarItem[]) => menu.reduce<Record<string, boolean>>((acc, item) => {
  if (isMenuGroup(item)) {
    acc[item.id] = item.id === 'front-office';
  }

  return acc;
}, {});

type SidebarProps = {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
  className?: string;
};

export const Sidebar = ({ variant = 'desktop', onNavigate, className }: SidebarProps) => {
  const { navigation } = useDataAccess();
  const location = useLocation();
  const [sidebarMenu, setSidebarMenu] = useState<SidebarItem[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    void navigation.listSidebarItems().then((items) => {
      if (isMounted) {
        setSidebarMenu(items);
        setOpenGroups(buildInitialOpenGroups(items));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [navigation]);

  const activeGroups = useMemo(() => {
    return sidebarMenu.reduce<Record<string, boolean>>((acc, item) => {
      if (!isMenuGroup(item)) {
        return acc;
      }

      acc[item.id] = item.children.some(
        (child) => location.pathname === child.to || location.pathname.startsWith(`${child.to}/`),
      );

      return acc;
    }, {});
  }, [location.pathname, sidebarMenu]);

  const baseAsideClass = variant === 'desktop'
    ? 'fixed left-0 top-0 h-screen w-[270px] shrink-0 border-r border-slate-200 bg-white'
    : 'h-full w-full border-r border-slate-200 bg-white';

  return (
    <aside className={cn('flex min-w-0 flex-col', baseAsideClass, className)}>
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-xl font-semibold tracking-tight text-brand-dark">Инвестика</p>
        <p className="text-xs text-slate-500">CRM prototype</p>
      </div>

      <nav className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {sidebarMenu.map((item) => {
          if (isMenuGroup(item)) {
            const isOpen = openGroups[item.id] ?? false;
            const hasActiveChild = activeGroups[item.id] ?? false;

            return (
              <div key={item.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => setOpenGroups((value) => ({ ...value, [item.id]: !isOpen }))}
                  className={`${linkBaseClass} w-full justify-between ${
                    hasActiveChild ? 'bg-brand-light text-brand-dark' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <SidebarIcon name={item.icon} className="h-5 w-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌃</span>
                </button>

                {isOpen && (
                  <ul className="mt-1 space-y-1 pl-3">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <NavLink
                          to={child.to}
                          onClick={onNavigate}
                          className={({ isActive }) =>
                            `${linkBaseClass} ${
                              isActive
                                ? 'bg-brand-light text-brand-dark'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`
                          }
                        >
                          <SidebarIcon name={child.icon} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{child.label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `${linkBaseClass} mb-1 ${
                  isActive ? 'bg-brand-light text-brand-dark' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <SidebarIcon name={item.icon} className="h-5 w-5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};
