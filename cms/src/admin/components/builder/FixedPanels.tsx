import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarClock, CircleDashed, CircleDot, CirclePause, CircleX, Globe, Info, MapPin, Menu as MenuIcon, Palette, Phone } from 'lucide-react';
import type { PlacementState } from '@/lib/types';
import { ButtonLink } from '@/components/ui/Button';
import { LANGS, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { placementState } from '@/lib/offers';
import { date } from '@/lib/format';
import { cn } from '@/lib/utils';
import { B } from './i18n';
import { Group } from './fields';

export type FixedId = '__header' | '__bar' | '__footer';
export const FIXED_IDS: FixedId[] = ['__header', '__bar', '__footer'];
export const isFixedId = (id: string | null | undefined): id is FixedId => !!id && (FIXED_IDS as string[]).includes(id);

/** Announcement-bar placements ordered for display, with their derived state. */
export function useBarMessages() {
  const placements = useDb((s) => s.placements);
  const offers = useDb((s) => s.offers);
  return useMemo(() => {
    const byId = new Map(offers.map((o) => [o.id, o]));
    return placements
      .filter((p) => p.position === 'bar')
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ p, state: placementState(p, undefined, p.offerId ? byId.get(p.offerId) ?? null : null) }));
  }, [placements, offers]);
}

const STATE_ICON: Record<PlacementState, typeof CircleDot> = {
  active: CircleDot,
  scheduled: CalendarClock,
  draft: CircleDashed,
  paused: CirclePause,
  expired: CircleX,
};

/** Placement state as text + symbol. */
export function PlacementStateText({ state }: { state: PlacementState }) {
  const t = useDict(B, 'admin');
  const Icon = STATE_ICON[state];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold', state === 'active' ? 'text-emerald-700' : state === 'scheduled' ? 'text-ink-soft' : 'text-muted')}>
      <Icon className="h-3.5 w-3.5" />
      {t(`pl_${state}`)}
    </span>
  );
}

function LinkRow({ to, icon: Icon, label, meta }: { to: string; icon: typeof Info; label: ReactNode; meta?: ReactNode }) {
  return (
    <Link to={to} className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-ink/[0.03]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#F4F4F4] text-ink ring-1 ring-inset ring-black/[0.06]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold text-ink">{label}</span>
        {meta && <span className="block truncate text-[12px] text-muted">{meta}</span>}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

function Intro({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg bg-[#F4F4F4] p-3.5 text-[13px] leading-relaxed text-ink-soft ring-1 ring-black/[0.05]">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <p>{children}</p>
    </div>
  );
}

/** Read-only settings view for a fixed theme part, pointing to where it is edited. */
export function FixedPanel({ id }: { id: FixedId }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const menus = useDb((s) => s.menus);
  const settings = useDb((s) => s.settings);
  const bar = useBarMessages();
  const menuCount = (handle: 'main' | 'footer') => menus.find((m) => m.handle === handle)?.items.length ?? 0;

  if (id === '__bar') {
    const active = bar.filter((b) => b.state === 'active').length;
    return (
      <div className="space-y-7">
        <Intro>{t('barInfo')}</Intro>
        <Group title={t('barMessages')} aside={<span className="text-[12px] font-semibold tabular-nums text-muted">{t('barSummary', { n: active })}</span>}>
          {bar.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">{t('barEmpty')}</p>
          ) : (
            <ol className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-white">
              {bar.map(({ p, state }, i) => (
                <li key={p.id} className="flex items-start gap-3 px-3.5 py-3">
                  <span className="mt-0.5 w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13px] leading-snug', state === 'active' ? 'font-semibold text-ink' : 'text-ink-soft')}>{l(p.title)}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
                      <PlacementStateText state={state} />
                      {(p.startsAt || p.endsAt) && (
                        <span className="tabular-nums">
                          · {p.startsAt ? date(p.startsAt, lang, { day: 'numeric', month: 'short' }) : '…'} – {p.endsAt ? date(p.endsAt, lang, { day: 'numeric', month: 'short' }) : '…'}
                        </span>
                      )}
                      {p.cta.href && <span className="truncate font-mono text-[11px]">· {p.cta.href}</span>}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <ButtonLink to="/admin/prodavnica/slajdovi" variant="outline" size="sm" shape="rounded" iconRight={<ArrowRight className="h-4 w-4" />} className="w-full">
            {t('manageSlides')}
          </ButtonLink>
        </Group>
      </div>
    );
  }

  if (id === '__header') {
    return (
      <div className="space-y-7">
        <Intro>{t('headerInfo')}</Intro>
        <Group title={t('manageIn')}>
          <div className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-white">
            <LinkRow to="/admin/prodavnica" icon={Palette} label={t('lnkTheme')} meta={settings.companyName} />
            <LinkRow to="/admin/meniji" icon={MenuIcon} label={t('lnkMainMenu')} meta={t('count_items', { n: menuCount('main') })} />
            <LinkRow to="/admin/konfiguracija/gjuhet" icon={Globe} label={t('lnkLanguages')} meta={LANGS.filter((x) => settings.languages[x.code]).map((x) => x.short).join(' · ')} />
          </div>
        </Group>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Intro>{t('footerInfo')}</Intro>
      <Group title={t('manageIn')}>
        <div className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-white">
          <LinkRow to="/admin/meniji" icon={MenuIcon} label={t('lnkFooterMenu')} meta={t('count_items', { n: menuCount('footer') })} />
          <LinkRow to="/admin/konfiguracija" icon={Phone} label={t('lnkContact')} meta={[settings.phone, settings.email].filter(Boolean).join(' · ')} />
          <LinkRow to="/admin/konfiguracija" icon={MapPin} label={t('lnkLocations')} meta={settings.locations.map((x) => x.city).join(' · ')} />
        </div>
      </Group>
    </div>
  );
}
