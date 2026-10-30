import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, ExternalLink, LogOut, Settings } from 'lucide-react';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useUi } from '@/store/ui';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { ROLES, ROLE_META } from '@/lib/permissions';
import { href } from '@/lib/paths';
import { cn, initials } from '@/lib/utils';
import type { RoleId } from '@/lib/types';
import { AdminLangToggle } from './AdminLangToggle';
import { DROPDOWN, useDismiss } from './popover';

/**
 * Account menu (top bar, right): current staff member, the demo ROLE SWITCHER ("Shiko si: Pronar / Menaxher / …",
 * PDF p.42 — the sidebar, routes and buttons follow `can(role, …)`), view site, settings and logout.
 */
export function AccountMenu() {
  const t = useDict(adm, 'admin');
  const l = useL('admin');
  const role = useUi((s) => s.adminRole);
  const setRole = useUi((s) => s.setAdminRole);
  const logout = useUi((s) => s.logout);
  const staff = useCurrentStaff();
  const can = useCan();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const name = staff?.name ?? 'ITCOM Admin';
  const switchTo = (r: RoleId) => {
    if (r !== role) {
      setRole(r);
      toast(t('roleSwitched', { role: l(ROLE_META[r].name) }));
    }
    close();
  };

  return (
    <div ref={ref} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('account')}
        className={cn('flex h-9 items-center gap-2 rounded-lg pl-1 pr-1 transition-colors hover:bg-white/10 sm:pr-2', open && 'bg-white/10')}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white ring-1 ring-white/25" style={{ background: staff?.color ?? '#4a4a4a' }}>
          {initials(name)}
        </span>
        <ChevronDown className={cn('hidden h-3.5 w-3.5 text-white/60 transition-transform sm:block', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className={cn(DROPDOWN, 'sm:w-[320px]')}
          >
            <div className="max-h-[calc(100vh-76px)] overflow-y-auto overscroll-contain">
              <div className="flex items-center gap-3 border-b border-black/[0.08] px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: staff?.color ?? '#4a4a4a' }}>
                  {initials(name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-muted">{t('signedInAs')}</span>
                  <span className="block truncate text-[14px] font-semibold text-ink">{name}</span>
                  {staff?.email && <span className="block truncate text-[12px] text-muted">{staff.email}</span>}
                </span>
              </div>

              <div className="px-2 pb-2 pt-3">
                <div className="px-2 pb-1.5">
                  <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink">{t('viewAs')}:</div>
                  <div className="text-[11.5px] text-muted">{t('viewAsHint')}</div>
                </div>
                <ul className="space-y-px">
                  {ROLES.map((r) => {
                    const on = r === role;
                    return (
                      <li key={r}>
                        <button
                          type="button"
                          role="menuitemradio"
                          aria-checked={on}
                          onClick={() => switchTo(r)}
                          className={cn('flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors', on ? 'bg-[#f1f1f1]' : 'hover:bg-[#f5f5f5]')}
                        >
                          <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-black/25 bg-white')}>
                            {on && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-[13px] leading-snug text-ink', on ? 'font-semibold' : 'font-medium')}>{l(ROLE_META[r].name)}</span>
                            <span className="block truncate text-[11.5px] leading-snug text-muted">{l(ROLE_META[r].description)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t border-black/[0.08] px-4 py-3 sm:hidden">
                <div className="mb-2 text-[12px] font-medium text-muted">{t('adminLang')}</div>
                <AdminLangToggle tone="light" full />
              </div>

              <div className="border-t border-black/[0.08] p-2">
                <a href={href('/')} target="_blank" rel="noreferrer" onClick={close} className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium text-ink hover:bg-[#f5f5f5]">
                  <ExternalLink className="h-4 w-4 text-muted" /> {t('viewSite')}
                </a>
                {can('settings') && (
                  <Link to="/admin/konfiguracija" onClick={close} className="flex h-9 items-center gap-2.5 rounded-lg px-2 text-[13px] font-medium text-ink hover:bg-[#f5f5f5]">
                    <Settings className="h-4 w-4 text-muted" /> {t('nav_settings')}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    close();
                    logout();
                    navigate('/admin/login');
                  }}
                  className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] font-medium text-ink hover:bg-[#f5f5f5]"
                >
                  <LogOut className="h-4 w-4 text-muted" /> {t('logout')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
