import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useUi } from '@/store/ui';
import { useAdminBadges } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { activeNav, navFor, type NavBadge, type NavItem } from './nav';

/**
 * CMS v2 sidebar (PDF p.08 / p.12): light grey #EBEBEB, active item = white pill, sub-items expand under the
 * active parent, "KANALE SHITJEJE" section, settings + module map pinned to the bottom. Items the current
 * role cannot view are removed by `navFor(role)`.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useDict(adm, 'admin');
  const role = useUi((s) => s.adminRole);
  const { pathname } = useLocation();
  const badges = useAdminBadges();
  const items = useMemo(() => navFor(role), [role]);
  const active = activeNav(pathname, items);

  const count = (b?: NavBadge) => (b ? badges[b] : 0);

  const renderItem = (item: NavItem) => {
    const isActive = active.item?.id === item.id;
    const Icon = item.icon;
    const n = count(item.badge);
    return (
      <li key={item.id}>
        <Link
          to={item.to}
          onClick={onNavigate}
          aria-current={isActive && (!item.children || active.leaf?.to === item.to) ? 'page' : undefined}
          className={cn(
            'group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors',
            isActive
              ? 'bg-white font-semibold text-[#1a1a1a] shadow-[0_1px_2px_rgb(0_0_0/0.07)]'
              : 'font-medium text-[#303030] hover:bg-black/[0.05] hover:text-[#1a1a1a]',
          )}
        >
          <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[#1a1a1a]' : 'text-[#616161] group-hover:text-[#1a1a1a]')} strokeWidth={isActive ? 2.25 : 2} />
          <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
          {n > 0 && (
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1a1a1a] px-1.5 text-[10.5px] font-bold tabular-nums text-white">
              {n > 99 ? '99+' : n}
            </span>
          )}
        </Link>
        {isActive && item.children && item.children.length > 1 && (
          <ul className="relative mb-1.5 mt-0.5 space-y-px pl-[26px]">
            <span className="absolute bottom-1 left-[17.5px] top-1 w-px bg-black/[0.12]" aria-hidden />
            {item.children.map((c) => {
              const on = active.leaf?.to === c.to;
              return (
                <li key={c.to} className="relative">
                  {on && <span className="absolute -left-[9px] bottom-1.5 top-1.5 w-[2px] rounded-full bg-[#1a1a1a]" aria-hidden />}
                  <Link
                    to={c.to}
                    onClick={onNavigate}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'flex h-7 items-center rounded-md px-2.5 text-[13px] transition-colors',
                      on ? 'font-semibold text-[#1a1a1a]' : 'text-[#5c5c5c] hover:bg-black/[0.05] hover:text-[#1a1a1a]',
                    )}
                  >
                    <span className="truncate">{t(c.label)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </li>
    );
  };

  const main = items.filter((i) => i.section === 'main');
  const channels = items.filter((i) => i.section === 'channels');
  const bottom = items.filter((i) => i.section === 'bottom');

  return (
    <nav aria-label="CMS" className="no-scrollbar flex h-full flex-col overflow-y-auto px-3 pb-3 pt-3">
      <ul className="space-y-px">{main.map(renderItem)}</ul>
      {channels.length > 0 && (
        <>
          <div className="mb-1 mt-5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#616161]">{t('nav_channels')}</div>
          <ul className="space-y-px">{channels.map(renderItem)}</ul>
        </>
      )}
      {bottom.length > 0 && <ul className="mt-auto space-y-px pt-6">{bottom.map(renderItem)}</ul>}
    </nav>
  );
}
