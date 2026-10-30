// Zbritjet — list of discount rules (CMS proposal pp.20–27): tabs per lifecycle state, search, type filter,
// "Krijo zbritje" → type chooser. Rules are evaluated by lib/discounts.ts (the same engine as cart/checkout).
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { BadgePercent, Copy, Download, Pause, Pencil, Play, Plus, Shapes, Ticket, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, FilterPills, PageHeader, SearchInput, Table, Td, Th, Tr, confirmDialog } from '@/admin/components/kit';
import { dd } from '@/admin/components/discounts/i18n';
import { useDiscountText } from '@/admin/components/discounts/text';
import { KIND_ICON, KINDS, copyToClipboard, daysUntil, discountsCsv, fmtDate, generateCode, isKind } from '@/admin/components/discounts/meta';
import { SelectField, StatePill } from '@/admin/components/discounts/ui';
import { RowMenu, type RowAction } from '@/admin/components/discounts/RowMenu';
import { TypeChooser } from '@/admin/components/discounts/TypeChooser';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { discountState, normalizeCode } from '@/lib/discounts';
import { fold } from '@/lib/search';
import type { Discount, DiscountKind, DiscountState } from '@/lib/types';
import { cn, download, round2 } from '@/lib/utils';

type Tab = 'all' | DiscountState;
const TAB_ORDER: Tab[] = ['all', 'active', 'scheduled', 'draft', 'expired', 'paused'];
const STATE_RANK: Record<DiscountState, number> = { active: 0, scheduled: 1, paused: 2, draft: 3, expired: 4 };

interface Row {
  d: Discount;
  state: DiscountState;
}

export default function Discounts() {
  const t = useDict(dd, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const x = useDiscountText();
  const navigate = useNavigate();
  const can = useCan();
  const canEdit = can('discounts', 'edit');
  const canPublish = can('discounts', 'publish');
  const canDelete = can('discounts', 'delete');
  const canExport = can('discounts', 'export');

  const discounts = useDb((s) => s.discounts);
  const orders = useDb((s) => s.orders);
  const offers = useDb((s) => s.offers);
  const upsert = useDb((s) => s.upsert);
  const removeItem = useDb((s) => s.remove);

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tabParam = params.get('tab') ?? 'all';
  const tab: Tab = (TAB_ORDER as string[]).includes(tabParam) ? (tabParam as Tab) : 'all';
  const kindParam = params.get('lloji');
  const kind: DiscountKind | 'all' = isKind(kindParam) ? kindParam : 'all';
  const setParam = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '' || v === 'all') n.delete(k);
          else n.set(k, v);
        }
        return n;
      },
      { replace: true },
    );
  const [chooser, setChooser] = useState(false);

  /* ---------------------------- data ---------------------------- */
  const rows = useMemo<Row[]>(() => {
    const now = Date.now();
    return discounts.map((d) => ({ d, state: discountState(d, now) }));
  }, [discounts]);

  const offerByDiscount = useMemo(() => new Map(offers.filter((o) => o.discountId).map((o) => [o.discountId as string, o])), [offers]);

  const base = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    return rows.filter(({ d }) => {
      if (kind !== 'all' && d.kind !== kind) return false;
      if (terms.length) {
        const hay = fold(`${d.title} ${d.code ?? ''} ${d.publicTitle.me} ${d.publicTitle.sq} ${d.publicTitle.en} ${(d.tags ?? []).join(' ')}`);
        if (!terms.every((term) => hay.includes(term))) return false;
      }
      return true;
    });
  }, [rows, q, kind]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: base.length, active: 0, scheduled: 0, draft: 0, expired: 0, paused: 0 };
    for (const r of base) c[r.state] += 1;
    return c;
  }, [base]);

  const list = useMemo(
    () =>
      base
        .filter((r) => tab === 'all' || r.state === tab)
        .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.d.createdAt.localeCompare(a.d.createdAt)),
    [base, tab],
  );

  /* ---------------------------- stats ---------------------------- */
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.state === 'active');
    const scheduled = rows.filter((r) => r.state === 'scheduled').sort((a, b) => a.d.startsAt.localeCompare(b.d.startsAt));
    const live = orders.filter((o) => o.status !== 'cancelled');
    const withDisc = live.filter((o) => (o.discounts ?? []).length > 0);
    const given = round2(withDisc.reduce((s, o) => s + (o.discounts ?? []).reduce((a, d) => a + d.amount, 0), 0));
    return {
      active: active.length,
      auto: active.filter((r) => r.d.method === 'auto').length,
      code: active.filter((r) => r.d.method === 'code').length,
      scheduled: scheduled.length,
      next: scheduled[0]?.d.startsAt,
      orders: withDisc.length,
      pct: live.length ? Math.round((withDisc.length / live.length) * 100) : 0,
      given,
      avg: withDisc.length ? round2(given / withDisc.length) : 0,
    };
  }, [rows, orders]);

  /* ---------------------------- actions ---------------------------- */
  const open = (d: Discount) => navigate(`/admin/popusti/${d.id}`);
  const setStatus = (d: Discount, status: Discount['status']) => {
    upsert('discounts', { ...d, status });
    toast.success(status === 'active' ? t('activated', { name: d.title }) : t('paused', { name: d.title }));
  };
  const duplicate = (d: Discount) => {
    const now = new Date();
    const id = `d-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
    const copy: Discount = {
      ...structuredClone(d),
      id,
      title: `${d.title}${t('copySuffix')}`,
      code: d.method === 'code' ? generateCode({ ...d, id }, discounts, d.code) : d.code,
      status: 'draft',
      uses: 0,
      createdAt: now.toISOString(),
    };
    upsert('discounts', copy);
    toast.success(t('duplicated'), { description: copy.method === 'code' ? copy.code : copy.title });
    navigate(`/admin/popusti/${id}`);
  };
  const remove = async (d: Discount) => {
    if (!(await confirmDialog({ title: t('deleteTitle', { name: d.method === 'code' ? normalizeCode(d.code) : d.title }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true }))) return;
    removeItem('discounts', d.id);
    toast.success(t('deletedToast'), { description: d.title });
  };
  const copyCode = async (d: Discount) => {
    const ok = await copyToClipboard(normalizeCode(d.code));
    if (ok) toast.success(t('codeCopied', { code: normalizeCode(d.code) }));
  };
  const exportCsv = () => {
    const out = list.map((r) => r.d);
    download(`optika-zbritjet-${new Date().toISOString().slice(0, 10)}.csv`, discountsCsv(out), 'text/csv;charset=utf-8');
    toast.success(t('exported', { n: out.length }));
  };

  const menuFor = ({ d, state }: Row): RowAction[] => {
    const items: RowAction[] = [{ label: ta('edit'), icon: Pencil, onSelect: () => open(d) }];
    if (d.method === 'code' && d.code) items.push({ label: t('copyCode'), icon: Copy, onSelect: () => copyCode(d) });
    if (canEdit) items.push({ label: ta('duplicate'), icon: Shapes, onSelect: () => duplicate(d) });
    if (state !== 'expired') {
      const live = d.status === 'active';
      items.push({
        label: live ? t('pause') : t('activate'),
        icon: live ? Pause : Play,
        onSelect: () => setStatus(d, live ? 'paused' : 'active'),
        disabledTip: canPublish ? undefined : t('noPublishPerm'),
        divider: true,
      });
    }
    items.push({ label: ta('delete'), icon: Trash2, onSelect: () => remove(d), danger: true, divider: state === 'expired', disabledTip: canDelete ? undefined : t('noDeletePerm') });
    return items;
  };

  const filtersActive = !!q || kind !== 'all' || tab !== 'all';
  const clearFilters = () => setParam({ q: null, lloji: null, tab: null });
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  /* ---------------------------- cells ---------------------------- */
  const titleCell = (d: Discount) => {
    const offer = offerByDiscount.get(d.id);
    return (
      <div className="min-w-0">
        <Link to={`/admin/popusti/${d.id}`} onClick={stop} className="block max-w-[300px] truncate font-semibold text-ink hover:underline hover:underline-offset-2">
          {d.method === 'code' ? <span className="font-mono tracking-wide">{normalizeCode(d.code) || '—'}</span> : d.title}
        </Link>
        <div className="mt-0.5 max-w-[300px] truncate text-[12.5px] text-muted">{d.method === 'code' ? d.title : l(d.publicTitle) || t('autoNoCode')}</div>
        {offer && <div className="mt-1 inline-flex max-w-[300px] items-center gap-1 truncate rounded-md bg-canvas px-1.5 py-px text-[11.5px] font-medium text-ink-soft ring-1 ring-inset ring-line">{t('linkedOffer', { name: l(offer.name) })}</div>}
      </div>
    );
  };

  const kindCell = (d: Discount) => {
    const Icon = KIND_ICON[d.kind];
    return (
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.9} />
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[13px] text-ink">{x.kind(d.kind)}</div>
          <div className="mt-0.5 whitespace-nowrap text-[12.5px] font-semibold tabular-nums text-ink-soft">{x.value(d)}</div>
        </div>
      </div>
    );
  };

  const methodCell = (d: Discount) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-soft">
      {d.method === 'code' ? <Ticket className="h-3.5 w-3.5 text-muted" /> : <Zap className="h-3.5 w-3.5 text-muted" />}
      {d.method === 'code' ? t('m_code') : t('m_auto')}
    </span>
  );

  const stateHint = ({ d, state }: Row): string | null => {
    if (state === 'scheduled') return t('startsIn', { n: daysUntil(d.startsAt) });
    if (state === 'active' && d.endsAt) {
      const n = daysUntil(d.endsAt);
      return n <= 1 ? t('endsToday') : n <= 31 ? t('endsIn', { n }) : null;
    }
    if (state === 'draft' && !canPublish) return t('needsApproval');
    return null;
  };

  const usesCell = (d: Discount) => {
    const lim = d.method === 'code' && d.usageLimit && d.usageLimit > 0 ? d.usageLimit : 0;
    return (
      <div className="min-w-[72px]">
        <div className="whitespace-nowrap text-[13px] tabular-nums text-ink">
          <span className="font-semibold">{d.uses}</span>
          {lim > 0 && <span className="text-muted"> / {lim}</span>}
        </div>
        {lim > 0 ? (
          <div className="mt-1.5 h-1 w-16 overflow-hidden rounded-full bg-ink/[0.08]">
            <div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.min(100, (d.uses / lim) * 100)}%` }} />
          </div>
        ) : (
          d.method === 'code' && <div className="mt-0.5 text-[12px] text-muted">{t('noLimit')}</div>
        )}
      </div>
    );
  };

  const pills = TAB_ORDER.filter((id) => id !== 'paused' || counts.paused > 0).map((id) => ({ id, label: t(`tab_${id}`), count: counts[id] }));

  return (
    <div className="pb-24">
      <PageHeader
        breadcrumbs={[ta('nav_discounts'), t(`tab_${tab}`)]}
        title={ta('nav_discounts')}
        description={t('subtitle')}
        actions={
          <>
            {canExport && (
              <Button variant="outline" shape="rounded" size="sm" icon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!list.length}>
                <span className="max-sm:hidden">{t('exportCsv')}</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            )}
            {canEdit && (
              <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setChooser(true)}>
                {t('create')}
              </Button>
            )}
          </>
        }
      />

      {/* KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('stat_active')} value={stats.active} hint={t('stat_activeHint', { a: stats.auto, c: stats.code })} onClick={() => setParam({ tab: 'active' })} />
        <Stat label={t('stat_scheduled')} value={stats.scheduled} hint={stats.next ? t('stat_scheduledNext', { d: fmtDate(stats.next, x.lang, x.tz) }) : t('stat_scheduledNone')} onClick={() => setParam({ tab: 'scheduled' })} />
        <Stat label={t('stat_orders')} value={stats.orders} hint={t('stat_ordersHint', { pct: stats.pct })} />
        <Stat label={t('stat_given')} value={x.eur(stats.given)} hint={t('stat_givenHint', { avg: x.eur(stats.avg) })} />
      </div>

      <Card padded={false}>
        <div className="space-y-3 border-b border-line/70 p-4 sm:p-5">
          <FilterPills<Tab> value={tab} onChange={(v) => setParam({ tab: v })} options={pills} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput value={q} onChange={(v) => setParam({ q: v })} placeholder={t('searchPh')} className="sm:flex-1" />
            <SelectField value={kind} onChange={(e) => setParam({ lloji: e.target.value })} wrapClassName="sm:w-60" aria-label={t('col_type')}>
              <option value="all">{t('allTypes')}</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {x.kind(k)}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<BadgePercent className="h-6 w-6" />}
            title={t('emptyTitle')}
            text={t('emptyText')}
            className="[&>div:first-child]:bg-canvas"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {filtersActive && (
                  <Button variant="outline" shape="rounded" size="sm" onClick={clearFilters}>
                    {t('clearFilters')}
                  </Button>
                )}
                {canEdit && (
                  <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setChooser(true)}>
                    {t('create')}
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t('col_title')}</Th>
                  <Th>{t('col_type')}</Th>
                  <Th className="max-lg:hidden">{t('col_method')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th>{t('col_uses')}</Th>
                  <Th className="max-xl:hidden">{t('col_period')}</Th>
                  <Th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const hint = stateHint(r);
                  return (
                    <Tr key={r.d.id} onClick={() => open(r.d)}>
                      <Td>
                        {titleCell(r.d)}
                      </Td>
                      <Td>
                        {kindCell(r.d)}
                      </Td>
                      <Td className="max-lg:hidden">
                        {methodCell(r.d)}
                      </Td>
                      <Td>
                        <StatePill state={r.state} />
                        {hint && <div className="mt-1 whitespace-nowrap pl-1 text-[12px] text-muted">{hint}</div>}
                      </Td>
                      <Td>
                        {usesCell(r.d)}
                      </Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft max-xl:hidden">{x.periodRange(r.d)}</Td>
                      <Td className="w-12 text-right" onClick={stop}>
                        <RowMenu items={menuFor(r)} label={t('moreActions')} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            {/* Mobile cards */}
            <ul className="divide-y divide-line/70 md:hidden">
              {list.map((r) => {
                const hint = stateHint(r);
                const Icon = KIND_ICON[r.d.kind];
                return (
                  <li key={r.d.id} onClick={() => open(r.d)} className="cursor-pointer px-4 py-3.5 transition-colors active:bg-canvas">
                    <div className="flex items-start justify-between gap-2">
                      {titleCell(r.d)}
                      <div className="-mr-1.5 -mt-1 flex shrink-0 items-center gap-1" onClick={stop}>
                        <RowMenu items={menuFor(r)} label={t('moreActions')} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-ink-soft">
                      <StatePill state={r.state} />
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 text-muted" />
                        {x.kind(r.d.kind)} · <span className="font-semibold tabular-nums text-ink">{x.value(r.d)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-muted">
                      <span>
                        {x.periodRange(r.d)}
                        {hint && <> · {hint}</>}
                      </span>
                      <span className="tabular-nums">
                        {t('col_uses')}: <span className="font-semibold text-ink">{r.d.uses}</span>
                        {r.d.method === 'code' && r.d.usageLimit ? ` / ${r.d.usageLimit}` : ''}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-5 py-3 text-[13px] text-muted md:border-t-0">
              <span>{ta('showing', { n: list.length, total: discounts.length })}</span>
              {filtersActive && (
                <button type="button" onClick={clearFilters} className="font-semibold text-ink-soft hover:text-ink">
                  {t('clearFilters')}
                </button>
              )}
            </div>
          </>
        )}
      </Card>

      <TypeChooser
        open={chooser}
        onClose={() => setChooser(false)}
        onChoose={(k) => {
          setChooser(false);
          navigate(`/admin/popusti/novi?lloji=${k}`);
        }}
      />
    </div>
  );
}

function Stat({ label, value, hint, onClick }: { label: string; value: ReactNode; hint?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'min-w-0 rounded-xl border border-line/80 bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)]',
        onClick && 'transition-colors hover:border-ink/25',
      )}
    >
      <div className="truncate text-[12.5px] font-medium text-muted">{label}</div>
      <div className="mt-1 truncate text-[22px] font-bold leading-tight tabular-nums text-ink">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[12px] text-muted">{hint}</div>}
    </Tag>
  );
}
