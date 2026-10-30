import '@/admin/admin.css'; // full CMS stylesheet (the storefront sheet leaves admin-only classes out)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, ExternalLink, Menu, Search, Store, X } from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';
import { ConfirmHost } from '@/admin/components/kit';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useUi } from '@/store/ui';
import { useDb } from '@/store/db';
import { ROLE_META } from '@/lib/permissions';
import { href } from '@/lib/paths';
import { AccountMenu } from './AccountMenu';
import { AdminLangToggle } from './AdminLangToggle';
import { CommandPalette } from './CommandPalette';
import { Notifications, useNewOrderToasts } from './Notifications';
import { Sidebar } from './Sidebar';
import { activeNav, navFor } from './nav';
import { MOD_KEY, useScrollLock } from './popover';

/** "CMS" + small ITCOM mark (top bar, left). */
function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link to="/admin" onClick={onClick} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 text-white">
      <span className="text-[17px] font-extrabold tracking-tight">CMS</span>
      <span className="h-4 w-px bg-white/20" aria-hidden />
      <LogoMark tone="light" className="h-[17px] opacity-90" />
    </Link>
  );
}

/** Store label (top bar, right) — opens the public site in a new tab. */
function StoreLabel({ className, dark = true }: { className?: string; dark?: boolean }) {
  const t = useDict(adm, 'admin');
  const company = useDb((s) => s.settings.companyName);
  const name = company.replace(/\s*(?:d\.?\s?o\.?\s?o\.?|sh\.?\s?p\.?\s?k\.?|l\.?\s?l\.?\s?c\.?)$/i, '') || 'ITCOM';
  return (
    <a
      href={href('/')}
      target="_blank"
      rel="noreferrer"
      title={`${t('viewSite')} — ${name}`}
      className={
        dark
          ? `h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white ${className ?? ''}`
          : `h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-black/[0.05] ${className ?? ''}`
      }
    >
      <Store className={dark ? 'h-4 w-4 text-white/60' : 'h-4 w-4 text-muted'} />
      <span className="truncate">{name}</span>
      <ExternalLink className={dark ? 'h-3 w-3 text-white/40' : 'ml-auto h-3.5 w-3.5 text-muted'} />
    </a>
  );
}

/**
 * CMS v2 shell — PDF p.07 / p.08 / p.12: dark top bar #1A1A1A (CMS mark · global search · store, language,
 * notifications, account + role switcher), light sidebar #EBEBEB with white-pill active state, work area #F1F1F1.
 * On narrow screens the sidebar opens as a drawer. Ctrl/⌘+K opens the command palette.
 */
export default function AdminLayout() {
  const t = useDict(adm, 'admin');
  const l = useL('admin');
  const { pathname } = useLocation();
  const role = useUi((s) => s.adminRole);
  const setRole = useUi((s) => s.setAdminRole);
  const companyName = useDb((s) => s.settings.companyName);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const closePalette = useCallback(() => setPalette(false), []);

  useNewOrderToasts();
  useScrollLock(drawer);

  // Close the mobile drawer whenever the route changes
  useEffect(() => setDrawer(false), [pathname]);

  // Ctrl/⌘+K — global search from anywhere in the CMS
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDrawer(false);
        setPalette((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tab title: "Porositë · CMS — ITCOM"
  const screen = useMemo(() => activeNav(pathname, navFor(role)).leaf, [pathname, role]);
  useEffect(() => {
    document.title = `${screen ? `${t(screen.label)} · ` : ''}CMS — ${companyName}`;
  }, [screen, t, companyName]);

  return (
    <div className="min-h-screen bg-canvas text-[14px] text-ink">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-40 h-14 bg-[#1a1a1a] text-white shadow-[0_1px_0_rgb(255_255_255/0.04)]">
        <div className="flex h-full items-center gap-1.5 px-2 sm:gap-2 sm:px-3 lg:px-0">
          <div className="flex shrink-0 items-center gap-0.5 lg:w-[240px] lg:px-3.5">
            <button type="button" onClick={() => setDrawer(true)} className="grid h-9 w-9 place-items-center rounded-lg text-white/85 hover:bg-white/10 lg:hidden" aria-label={t('menu')}>
              <Menu className="h-5 w-5" />
            </button>
            <Brand />
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <button
              type="button"
              onClick={() => setPalette(true)}
              className="hidden h-9 w-full max-w-[620px] items-center gap-2.5 rounded-lg border border-white/[0.12] bg-white/[0.08] pl-3 pr-1.5 text-left text-[13.5px] text-white/55 transition-colors hover:border-white/25 hover:bg-white/[0.12] hover:text-white/75 sm:flex"
              aria-label={t('searchPlaceholder')}
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search className="h-4 w-4 shrink-0 text-white/60" />
              <span className="min-w-0 flex-1 truncate">{t('searchPlaceholder')}</span>
              <span className="hidden shrink-0 items-center gap-1 md:flex">
                <kbd className="grid h-[22px] min-w-[22px] place-items-center rounded border border-white/15 bg-white/[0.06] px-1.5 font-sans text-[10.5px] font-semibold text-white/60">{MOD_KEY}</kbd>
                <kbd className="grid h-[22px] min-w-[22px] place-items-center rounded border border-white/15 bg-white/[0.06] px-1 font-sans text-[10.5px] font-semibold text-white/60">K</kbd>
              </span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 lg:pr-3">
            <button type="button" onClick={() => setPalette(true)} className="grid h-9 w-9 place-items-center rounded-lg text-white/85 hover:bg-white/10 sm:hidden" aria-label={t('searchShort')}>
              <Search className="h-[18px] w-[18px]" />
            </button>
            {role !== 'owner' && (
              <button
                type="button"
                onClick={() => {
                  setRole('owner');
                  toast(t('roleSwitched', { role: l(ROLE_META.owner.name) }));
                }}
                title={t('viewAsOwner')}
                className="mr-1 hidden h-7 items-center gap-1.5 rounded-full bg-white/[0.12] pl-2.5 pr-2 text-[11.5px] font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 md:inline-flex"
              >
                <Eye className="h-3.5 w-3.5 text-white/70" />
                {t('viewingAs', { role: l(ROLE_META[role].name) })}
                <X className="h-3 w-3 text-white/60" />
              </button>
            )}
            <StoreLabel className="hidden xl:flex" />
            <span className="mx-1 hidden sm:block">
              <AdminLangToggle />
            </span>
            <Notifications />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="fixed bottom-0 left-0 top-14 z-30 hidden w-[240px] border-r border-black/[0.06] bg-[#ebebeb] lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar (mobile drawer) */}
      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col bg-[#ebebeb] shadow-2xl"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              aria-label={t('menu')}
            >
              <div className="flex h-14 shrink-0 items-center justify-between bg-[#1a1a1a] px-2.5">
                <Brand onClick={() => setDrawer(false)} />
                <button type="button" onClick={() => setDrawer(false)} className="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10" aria-label={t('close')}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <Sidebar onNavigate={() => setDrawer(false)} />
              </div>
              <div className="shrink-0 space-y-2 border-t border-black/[0.08] p-3">
                <StoreLabel dark={false} className="flex w-full" />
                <AdminLangToggle tone="light" full />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Work area */}
      <div className="pt-14 lg:pl-[240px]">
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-5 sm:px-6 sm:pt-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={palette} onClose={closePalette} />
      <ConfirmHost />
    </div>
  );
}
