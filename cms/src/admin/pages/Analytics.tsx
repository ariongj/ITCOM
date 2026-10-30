// Analitika — CMS proposal p.38: commercial, operational and campaign reports; date range + comparison + channel +
// CSV export; every metric documented ("si llogaritet"). Location: Analitika; campaigns also have their own report.
import { useMemo, type ComponentType } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CalendarRange, ChevronDown, Download, GitCompareArrows, Info, Store } from 'lucide-react';
import { PageHeader } from '@/admin/components/kit';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/misc';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { download } from '@/lib/utils';
import { A, type AKey } from '@/admin/components/analytics/i18n';
import {
  CHANNEL_IDS, COMPARE_IDS, RANGE_IDS, addDays, breakdownFor, campaignRows, compareRange, coverage, dataStartOf, discountReport,
  firstOrders, operations, resolveRange, salesFor, seriesFor, stepFor, type ChannelId, type CompareId, type RangeId,
} from '@/admin/components/analytics/metrics';
import { Commercial, type CommercialData } from '@/admin/components/analytics/Commercial';
import { Operational } from '@/admin/components/analytics/Operational';
import { Campaigns } from '@/admin/components/analytics/Campaigns';
import { Definitions } from '@/admin/components/analytics/Definitions';
import { campaignsCsv, definitionsCsv, opsCsv, salesCsv } from '@/admin/components/analytics/exportCsv';
import { fmtDayYear, isoDay, rangeLabel, toCsv, type CsvCell } from '@/admin/components/analytics/fmt';
import { Callout } from '@/admin/components/analytics/ui';

type Tab = 'sales' | 'operations' | 'campaigns' | 'definitions';
const TABS: Tab[] = ['sales', 'operations', 'campaigns', 'definitions'];
const TAB_LABEL: Record<Tab, AKey> = { sales: 'tab_sales', operations: 'tab_ops', campaigns: 'tab_campaigns', definitions: 'tab_defs' };

const oneOf = <T extends string>(list: readonly T[], v: string | null, fallback: T): T => (v && (list as readonly string[]).includes(v) ? (v as T) : fallback);

export default function Analytics() {
  const t = useDict(A, 'admin');
  const ta = useDict(adm, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const can = useCan();

  const [params, setParams] = useSearchParams();
  const tab = oneOf(TABS, params.get('tab'), 'sales');
  const rangeId = oneOf<RangeId>(RANGE_IDS, params.get('range'), '30');
  const cmp = oneOf<CompareId>(COMPARE_IDS, params.get('cmp'), 'prev');
  const ch = oneOf<ChannelId>(CHANNEL_IDS, params.get('ch'), 'all');
  const customFrom = params.get('from');
  const customTo = params.get('to');
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const orders = useDb((s) => s.orders);
  const products = useDb((s) => s.products);
  const categories = useDb((s) => s.categories);
  const discounts = useDb((s) => s.discounts);
  const offers = useDb((s) => s.offers);
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const inquiries = useDb((s) => s.inquiries);
  const bookings = useDb((s) => s.bookings);
  const returns = useDb((s) => s.returns);
  const movements = useDb((s) => s.movements);
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const settings = useDb((s) => s.settings);
  const vatRate = settings.vatRate;

  // "now" is re-read whenever the data changes (e.g. an order placed in another tab)
  const now = useMemo(() => new Date(), [orders, inquiries, bookings]); // eslint-disable-line react-hooks/exhaustive-deps
  const range = useMemo(() => resolveRange(rangeId, now, { from: customFrom, to: customTo }), [rangeId, now, customFrom, customTo]);
  const cmpRange = useMemo(() => compareRange(range, cmp), [range, cmp]);
  const dataStart = useMemo(() => dataStartOf(orders), [orders]);
  const cov = coverage(cmpRange, dataStart);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const discountsById = useMemo(() => new Map(discounts.map((d) => [d.id, d])), [discounts]);
  const first = useMemo(() => firstOrders(orders), [orders]);

  const commercial = useMemo<CommercialData>(() => {
    const step = stepFor(range);
    const withPrev = cmpRange && cov !== 'none' ? cmpRange : null;
    return {
      sales: salesFor(orders, range, ch, vatRate, first),
      prevSales: withPrev ? salesFor(orders, withPrev, ch, vatRate, first) : null,
      comparable: cov === 'full',
      range,
      cmpRange: withPrev,
      step,
      series: seriesFor(orders, range, ch, step, now),
      prevSeries: withPrev ? seriesFor(orders, withPrev, ch, step, now) : null,
      breakdown: breakdownFor(orders, range, ch, productMap),
      prevBreakdown: withPrev && cov === 'full' ? breakdownFor(orders, withPrev, ch, productMap) : null,
      discounts: discountReport(orders, range, ch),
    };
  }, [orders, range, cmpRange, cov, ch, vatRate, first, now, productMap]);

  const ops = useMemo(
    () => operations({ products, orders, purchaseOrders, inquiries, bookings, offers, discounts, returns, movements }, now),
    [products, orders, purchaseOrders, inquiries, bookings, offers, discounts, returns, movements, now],
  );
  const campaigns = useMemo(() => campaignRows(offers, discounts, orders, now), [offers, discounts, orders, now]);
  const analyticsIntegration = settings.integrations.find((i) => i.kind === 'analytics');

  const lastDay = addDays(range.to, -1);
  const canExport = can('analytics', 'export');

  const exportCsv = () => {
    if (!canExport) return;
    const rangeIso = `${isoDay(range.from)} – ${isoDay(lastDay)}`;
    const header: CsvCell[][] = [[`${settings.companyName} — ${ta('nav_analytics')}: ${t(TAB_LABEL[tab])}`], [t('generated'), now.toISOString()]];
    let body: CsvCell[][];
    if (tab === 'sales') {
      header.push(
        [t('f_range'), rangeIso, t(`range_${rangeId}` as AKey)],
        [t('f_compare'), commercial.cmpRange ? `${isoDay(commercial.cmpRange.from)} – ${isoDay(addDays(commercial.cmpRange.to, -1))}` : '', t(`cmp_${cmp}` as AKey)],
        [t('f_channel'), t(`ch_${ch}` as AKey)],
      );
      body = salesCsv(commercial, { t, l, can, products: productMap, categories, discountsById, vatRate });
    } else if (tab === 'operations') body = opsCsv(ops, { t, l, can, services, status: (s) => tc(`status_${s}` as 'status_new'), inq: (type) => tc(`inq_${type}` as 'inq_contact') });
    else if (tab === 'campaigns') body = campaignsCsv(campaigns, { t, l });
    else body = definitionsCsv({ t, vatRate });
    const file = tab === 'sales' ? `analitika-${tab}-${isoDay(range.from)}_${isoDay(lastDay)}.csv` : `analitika-${tab}-${isoDay(now)}.csv`;
    download(file, toCsv([...header, [], ...body]), 'text/csv;charset=utf-8');
    toast.success(t('exported', { file }));
  };

  const setRange = (v: RangeId) => {
    if (v === 'custom') set({ range: v, from: isoDay(range.from), to: isoDay(lastDay) });
    else set({ range: v === '30' ? null : v, from: null, to: null });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={[ta('nav_analytics'), t('crumb')]}
        title={ta('nav_analytics')}
        description={t('desc')}
        actions={
          <span title={canExport ? undefined : t('export_no')}>
            <Button variant="outline" size="sm" shape="rounded" icon={<Download className="h-4 w-4" />} disabled={!canExport} onClick={exportCsv} className="bg-white">
              {t('export')}
            </Button>
          </span>
        }
      />

      <Tabs<Tab> tabs={TABS.map((id) => ({ id, label: t(TAB_LABEL[id]) }))} value={tab} onChange={(v) => set({ tab: v === 'sales' ? null : v })} className="-mt-1" />

      {tab === 'sales' && (
        <>
          <div className="space-y-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <FilterSelect icon={CalendarRange} label={t('f_range')} value={rangeId} onChange={setRange} options={RANGE_IDS.map((id) => ({ value: id, label: t(`range_${id}` as AKey) }))} />
              {rangeId === 'custom' && (
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <DateField label={t('f_from')} value={isoDay(range.from)} max={isoDay(now)} onChange={(v) => set({ from: v })} />
                  <DateField label={t('f_to')} value={isoDay(lastDay)} max={isoDay(now)} onChange={(v) => set({ to: v })} />
                </div>
              )}
              <FilterSelect icon={GitCompareArrows} label={t('f_compare')} value={cmp} onChange={(v) => set({ cmp: v === 'prev' ? null : v })} options={COMPARE_IDS.map((id) => ({ value: id, label: t(`cmp_${id}` as AKey) }))} />
              <FilterSelect icon={Store} label={t('f_channel')} value={ch} onChange={(v) => set({ ch: v === 'all' ? null : v })} options={CHANNEL_IDS.map((id) => ({ value: id, label: t(`ch_${id}` as AKey) }))} />
            </div>
            <p className="text-[12.5px] text-muted">
              <span className="font-semibold text-ink-soft">{rangeLabel(range.from, range.to, lang)}</span>
              {commercial.cmpRange && <> · {t('vs', { range: rangeLabel(commercial.cmpRange.from, commercial.cmpRange.to, lang) })}</>}
            </p>
            {cmp !== 'none' && cov !== 'full' && dataStart && (
              <Callout icon={Info} className="py-2.5">
                {t(cov === 'partial' ? 'cov_partial' : 'cov_none', { date: fmtDayYear(dataStart, lang) })}
              </Callout>
            )}
          </div>
          <Commercial data={commercial} products={productMap} categories={categories} discountsById={discountsById} vatRate={vatRate} />
        </>
      )}

      {tab === 'operations' && <Operational ops={ops} services={services} staff={staff} />}
      {tab === 'campaigns' && <Campaigns rows={campaigns} analytics={analyticsIntegration} />}
      {tab === 'definitions' && <Definitions vatRate={vatRate} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact filter controls (one row above the content they scope)      */
/* ------------------------------------------------------------------ */
function FilterSelect<T extends string>({ icon: Icon, label, value, options, onChange }: { icon: ComponentType<{ className?: string }>; label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="relative flex h-9 w-full min-w-0 items-center rounded-lg border border-line bg-white shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5 sm:w-auto">
      <Icon className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
      <span className="sr-only">{label}</span>
      <select value={value} title={label} onChange={(e) => onChange(e.target.value as T)} className="h-full w-full cursor-pointer appearance-none rounded-lg bg-transparent pl-9 pr-9 text-[13px] font-semibold text-ink outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted" />
    </label>
  );
}

function DateField({ label, value, max, onChange }: { label: string; value: string; max: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-line bg-white pl-3 pr-2 text-[13px] shadow-[0_1px_2px_rgb(0_0_0/0.03)] focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5">
      <span className="shrink-0 font-semibold text-muted">{label}</span>
      <input type="date" value={value} max={max} onChange={(e) => e.target.value && onChange(e.target.value)} className="min-w-0 flex-1 bg-transparent font-semibold text-ink outline-none" />
    </label>
  );
}
