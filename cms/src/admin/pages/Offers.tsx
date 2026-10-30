// Offers centre — Rritja > Ofertat (CMS proposal pp.28–30, mock-up p.30): campaigns with their
// discount rule, promotional content and schedule in one list.
import { useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, Copy, ExternalLink, Flag, Megaphone, Pause, Pencil, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, FilterPills, PageHeader, SearchInput, Table, Td, Th, Thumb, Tr, confirmDialog } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { useDict, useL, useLang } from '@/i18n';
import { useCan } from '@/store/hooks';
import { offerState } from '@/lib/offers';
import { money, num } from '@/lib/format';
import { fold } from '@/lib/search';
import { href } from '@/lib/paths';
import { cn } from '@/lib/utils';
import type { Offer, OfferState } from '@/lib/types';
import { useOfferData, useChecker } from '@/admin/components/offers/hooks';
import { useOfferActions } from '@/admin/components/offers/actions';
import { checkStats, offerProducts } from '@/admin/components/offers/model';
import { ActionMenu, OfferStatusPill, RuleCell, StaffAvatar, contentLines, periodLines, useOT, type MenuItem } from '@/admin/components/offers/ui';

type Tab = 'all' | OfferState;
const ORDER: Record<OfferState, number> = { active: 0, paused: 1, scheduled: 2, draft: 3, expired: 4 };

export default function Offers() {
  const t = useOT();
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const data = useOfferData();
  const check = useChecker(data);
  const act = useOfferActions();

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tab = (params.get('status') ?? 'all') as Tab;
  const setParam = (k: string, v: string) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (!v || v === 'all') n.delete(k);
        else n.set(k, v);
        return n;
      },
      { replace: true },
    );

  /* ----------------------------- rows ----------------------------- */
  const rows = useMemo(() => {
    const now = Date.now();
    return data.offers
      .map((o) => {
        const state = offerState(o, now);
        const discount = o.discountId ? data.discountById.get(o.discountId) : undefined;
        const linked = data.linkedByOffer.get(o.id) ?? [];
        const { collection, list } = offerProducts(o, data.products, data.collections);
        const stats = state === 'expired' ? null : checkStats(check(o));
        const hay = fold(
          [o.name.me, o.name.sq, o.name.en, o.slug, discount?.code ?? '', discount?.title ?? '', collection ? `${collection.title.me} ${collection.title.sq} ${collection.title.en}` : '', ...list.map((p) => `${p.name.me} ${p.name.sq} ${p.name.en} ${p.sku}`)].join(' '),
        );
        return { o, state, discount, linked, stats, hay, owner: data.staff.find((s) => s.id === o.owner) };
      })
      .sort((a, b) => ORDER[a.state] - ORDER[b.state] || b.o.startsAt.localeCompare(a.o.startsAt));
  }, [data, check]);

  const searched = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    return terms.length ? rows.filter((r) => terms.every((term) => r.hay.includes(term))) : rows;
  }, [rows, q]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: searched.length, active: 0, scheduled: 0, draft: 0, expired: 0, paused: 0 };
    for (const r of searched) c[r.state]++;
    return c;
  }, [searched]);
  const visible = tab === 'all' ? searched : searched.filter((r) => r.state === tab);

  const kpi = useMemo(() => {
    const live = rows.filter((r) => r.state === 'active');
    const sum = (k: keyof Offer['metrics'], list = rows) => list.reduce((s, r) => s + r.o.metrics[k], 0);
    const revenue = sum('revenue');
    const discount = sum('discountTotal');
    return {
      live: live.length,
      scheduled: rows.filter((r) => r.state === 'scheduled').length,
      drafts: rows.filter((r) => r.state === 'draft').length,
      visits: sum('visits', live),
      clicks: sum('ctaClicks', live),
      orders: sum('orders'),
      revenue,
      discount,
      share: revenue ? discount / revenue : 0,
    };
  }, [rows]);

  /* ---------------------------- actions ---------------------------- */
  const canPublish = can('offers', 'publish');
  const menuFor = (o: Offer, state: OfferState): MenuItem[] => {
    const items: MenuItem[] = [
      { label: ta('edit'), icon: Pencil, onSelect: () => navigate(`/admin/ponude/${o.id}`) },
      { label: t('a_viewPage'), icon: ExternalLink, onSelect: () => window.open(href(`/oferta/${o.slug}${state === 'active' ? '' : '?preview=1'}`), '_blank', 'noopener') },
    ];
    if (can('offers', 'edit')) items.push({ label: ta('duplicate'), icon: Copy, onSelect: () => navigate(`/admin/ponude/${act.duplicate(o)}`) });
    if (state === 'active' || state === 'scheduled') items.push({ label: t('a_pause'), icon: Pause, divider: true, disabled: !canPublish, reason: t('noPublishPerm'), onSelect: () => act.setStatus(o, 'paused') });
    if (state === 'paused') items.push({ label: t('a_resume'), icon: Play, divider: true, disabled: !canPublish, reason: t('noPublishPerm'), onSelect: () => act.setStatus(o, 'active') });
    if (state === 'active' || state === 'paused')
      items.push({
        label: t('a_end'),
        icon: Flag,
        disabled: !can('offers', 'archive'),
        reason: t('noPerm'),
        onSelect: async () => {
          if (await confirmDialog({ title: t('endConfirmTitle', { name: l(o.name) }), text: `${t('endConfirmText')} ${t('endContentHint')}`, confirmLabel: t('endNow'), danger: false })) act.end(o);
        },
      });
    if (can('offers', 'delete')) items.push({ label: ta('delete'), icon: Trash2, danger: true, divider: true, onSelect: () => act.del(o) });
    return items;
  };

  const open = (o: Offer) => navigate(`/admin/ponude/${o.id}`);
  const filtersActive = !!q || tab !== 'all';

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: t('tab_all'), count: counts.all },
    { id: 'active', label: t('tab_active'), count: counts.active },
    { id: 'scheduled', label: t('tab_scheduled'), count: counts.scheduled },
    { id: 'draft', label: t('tab_draft'), count: counts.draft },
    { id: 'expired', label: t('tab_expired'), count: counts.expired },
  ];
  if (counts.paused || tab === 'paused') tabs.splice(2, 0, { id: 'paused', label: t('tab_paused'), count: counts.paused });

  return (
    <div className="pb-16">
      <PageHeader
        breadcrumbs={[ta('nav_growth'), ta('nav_offers')]}
        title={ta('nav_offers')}
        description={t('subtitle')}
        actions={
          can('offers', 'edit') && (
            <ButtonLink to="/admin/ponude/novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />}>
              {t('create')}
            </ButtonLink>
          )
        }
      />

      {/* KPI strip — attributed figures, labelled as such */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label={t('kpi_live')} value={num(kpi.live, lang)} hint={t('kpi_liveHint', { n: kpi.scheduled, d: kpi.drafts })} />
        <Kpi label={t('kpi_visits')} value={num(kpi.visits, lang)} hint={t('kpi_visitsHint', { n: num(kpi.clicks, lang) })} />
        <Kpi label={t('kpi_orders')} value={num(kpi.orders, lang)} hint={t('kpi_ordersHint', { v: money(kpi.revenue, lang, { decimals: false }) })} />
        <Kpi label={t('kpi_discount')} value={money(kpi.discount, lang, { decimals: false })} hint={t('kpi_discountHint', { p: pct(kpi.share, lang) })} />
      </div>

      <Card padded={false}>
        <div className="space-y-3 border-b border-line/70 p-4 sm:p-5">
          <FilterPills<Tab> value={tab} onChange={(v) => setParam('status', v)} options={tabs} />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder={t('searchPh')} className="max-w-xl" />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-6 w-6" />}
            title={rows.length ? t('emptyTitle') : t('emptyAllTitle')}
            text={rows.length ? t('emptyText') : t('emptyAllText')}
            action={
              filtersActive ? (
                <button type="button" onClick={() => setParams({}, { replace: true })} className="text-[13.5px] font-semibold text-ink underline underline-offset-4 hover:no-underline">
                  {t('clearFilters')}
                </button>
              ) : (
                can('offers', 'edit') && (
                  <ButtonLink to="/admin/ponude/novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />}>
                    {t('create')}
                  </ButtonLink>
                )
              )
            }
          />
        ) : (
          <>
            {/* Desktop / tablet: compact table (mock-up p.30) */}
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th className="w-[34%]">{t('col_offer')}</Th>
                  <Th>{t('col_rule')}</Th>
                  <Th>{t('col_content')}</Th>
                  <Th>{t('col_period')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th className="w-12" aria-label={ta('actions')} />
                </tr>
              </thead>
              <tbody>
                {visible.map(({ o, state, discount, linked, stats, owner }) => {
                  const c = contentLines(linked, o.placements.includes('home-block'), !!(o.landing.title.me || o.landing.title.sq), t);
                  const p = periodLines(o, state, t, lang);
                  const issues = stats ? stats.fail + stats.warn : 0;
                  return (
                    <Tr key={o.id} onClick={() => open(o)} className={cn(state === 'expired' && 'text-ink-soft')}>
                      <Td>
                        <div className="flex min-w-0 items-center gap-3">
                          <Thumb src={o.image} className={cn('h-10 w-10', state === 'expired' && 'opacity-60 grayscale')} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-ink">{l(o.name) || t('unnamed')}</div>
                            <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted">
                              <span className="truncate">/oferta/{o.slug}</span>
                              {owner && (
                                <>
                                  <span aria-hidden>·</span>
                                  <StaffAvatar staff={owner} size="sm" />
                                  <span className="truncate">{owner.name.split(' ')[0]}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td className="max-w-[220px]">
                        <RuleCell discount={discount} missing={!!o.discountId && !discount} />
                      </Td>
                      <Td className="max-w-[220px]">
                        <div className="truncate">{c.head}</div>
                        {c.sub && <div className="truncate text-[12.5px] text-muted">{c.sub}</div>}
                      </Td>
                      <Td className="whitespace-nowrap">
                        <div className="tabular-nums">{p.head}</div>
                        {p.sub && <div className="text-[12.5px] text-muted">{p.sub}</div>}
                      </Td>
                      <Td>
                        <OfferStatusPill state={state} size="sm" />
                        {issues > 0 && <Attention fail={!!stats?.fail} label={t('attention', { n: issues })} />}
                      </Td>
                      <Td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu items={menuFor(o, state)} label={t('more')} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            {/* Phone: stacked cards */}
            <ul className="divide-y divide-line/70 md:hidden">
              {visible.map(({ o, state, discount, linked, stats }) => {
                const c = contentLines(linked, o.placements.includes('home-block'), !!(o.landing.title.me || o.landing.title.sq), t);
                const p = periodLines(o, state, t, lang);
                const issues = stats ? stats.fail + stats.warn : 0;
                return (
                  <li key={o.id} className="flex gap-3 px-4 py-3.5">
                    <button type="button" onClick={() => open(o)} className="flex min-w-0 flex-1 gap-3 text-left">
                      <Thumb src={o.image} className={cn(state === 'expired' && 'opacity-60 grayscale')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0 font-semibold leading-snug text-ink">{l(o.name) || t('unnamed')}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <OfferStatusPill state={state} size="sm" />
                          {issues > 0 && <Attention fail={!!stats?.fail} label={t('attention', { n: issues })} inline />}
                        </div>
                        <dl className="mt-2 space-y-0.5 text-[12.5px]">
                          <MobileRow label={t('col_rule')}>
                            <RuleCell discount={discount} missing={!!o.discountId && !discount} className="[&>div:first-child]:text-[12.5px]" />
                          </MobileRow>
                          <MobileRow label={t('col_content')}>{c.head}</MobileRow>
                          <MobileRow label={t('col_period')}>
                            {p.head}
                            {p.sub && <span className="text-muted"> · {p.sub}</span>}
                          </MobileRow>
                        </dl>
                      </div>
                    </button>
                    <ActionMenu items={menuFor(o, state)} label={t('more')} />
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="flex flex-col gap-1.5 border-t border-line/70 px-4 py-3 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-ink" />
            {t('footNote')}
          </span>
          <span>{t('attrNoteShort')}</span>
        </div>
      </Card>
    </div>
  );
}

const pct = (v: number, lang: 'me' | 'sq' | 'en') => `${num(v * 100, lang, 1)}%`;

function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="rounded-xl border border-line/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="truncate text-[12.5px] font-medium text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 truncate text-[12.5px] text-muted">{hint}</div>
    </div>
  );
}

function Attention({ fail, label, inline }: { fail: boolean; label: string; inline?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] font-medium', fail ? 'text-red-700' : 'text-amber-800', !inline && 'mt-1 flex')}>
      <AlertTriangle className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function MobileRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[74px] shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}

