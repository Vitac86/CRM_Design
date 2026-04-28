import { Outlet, useLocation } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';

const getAuthHeadline = (pathname: string) => {
  if (pathname === '/register') {
    return 'Регистрация для работы с CRM';
  }

  if (pathname === '/forgot-password' || pathname === '/reset-password') {
    return 'Восстановление доступа к CRM';
  }

  return 'Авторизуйтесь для работы с CRM';
};

export const AuthLayout = () => {
  const { pathname } = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-surface)] text-[var(--color-text-primary)] lg:flex-row">
      <aside className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_52%),linear-gradient(150deg,#16456f_0%,#0f2f4c_48%,#0a2237_100%)] px-5 py-8 text-white sm:px-8 lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-10 lg:py-12 xl:px-14">
        <div className="absolute inset-0 bg-[linear-gradient(122deg,rgba(255,255,255,0.13)_0%,rgba(255,255,255,0)_45%)]" aria-hidden="true" />
        <img
          src="/brand/investica/eagle-glass.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-20 bottom-[-8%] z-0 h-auto w-[min(84vw,540px)] max-w-none select-none object-contain opacity-35 sm:-left-16 sm:w-[min(62vw,520px)] lg:-left-24 lg:bottom-[-6%] lg:w-[min(46vw,560px)] xl:-left-16 xl:w-[min(40vw,580px)]"
        />
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo variant="full-ru" tone="white" className="h-9 sm:h-10" />
        </div>

        <div className="relative z-10 mt-10 max-w-md space-y-4 pb-4 lg:mt-0">
          <p className="font-display text-[11px] uppercase tracking-[0.18em] text-white/75">Investica CRM</p>
          <h1 className="font-display text-2xl leading-tight font-semibold text-white sm:text-3xl">
            {getAuthHeadline(pathname)}
          </h1>
          <p className="max-w-sm text-sm text-white/80 sm:text-base">
            Единое пространство для операций, комплаенса и сопровождения клиентов.
          </p>
        </div>
      </aside>

      <section className="flex flex-1 items-center justify-center bg-[#f6f9fc] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  );
};
