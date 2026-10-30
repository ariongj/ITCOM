import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { PageHeader } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  LOW_STOCK,
  buildBuckets,
  isComparable,
  isPeriod,
  lowStockProducts,
  pctChange,
  periodRanges,
  unassignedContacts,
  windowStats,
  type Period,
} from '@/admin/components/dashboard/data';
import { D, capitalize } from '@/admin/components/dashboard/i18n';
import { fmtDate } from '@/admin/components/dashboard/dates';
import { useNow } from '@/admin/components/dashboard/useNow';
import { KpiCard } from '@/admin/components/dashboard/KpiCard';
import { PeriodSelect } from '@/admin/components/dashboard/PeriodSelect';
import { RevenueChart } from '@/admin/components/dashboard/RevenueChart';
import { StatusBreakdown } from '@/admin/components/dashboard/StatusBreakdown';
import { RecentOrders, TopProducts } from '@/admin/components/dashboard/lists';
import { Attention } from '@/admin/components/dashboard/Attention';
import { Campaigns } from '@/admin/components/dashboard/Campaigns';

/** Last period the viewer picked — a per-browser convenience; the URL (?period=) wins. */
const PERIOD_KEY = 'optika-overview-period';
function storedPeriod(): Period | null {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return isPeriod(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Përmbledhja e dyqanit — store overview (PDF p.08 mock-up, p.38 reports).
 * One period selector scopes the KPIs, the chart, the status breakdown and top products; every tile and
 * attention row opens its filtered list. Widgets follow the role's module permissions.
 */
export default function Dashboard() {
  const t = useDict(D, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();

  const orders = useDb((s) => s.orders);
  const inquiries = useDb((s) => s.inquiries);
  const products = useDb((s) => s.products);

  const [params, setParams] = useSearchParams();
  const [remembered] = useState(storedPeriod);
  const raw = params.get('period');
  const period: Period = isPeriod(raw) ? raw : (remembered ?? 'today');
  const setPeriod = (p: Period) => {
    const next = new URLSearchParams(params);
    next.set('period', p);
    setParams(next, { replace: true });
    try {
      localStorage.setItem(PERIOD_KEY, p);
    } catch {
      /* private mode — the URL still holds it */
    }
  };

  // "now" ticks every minute and is re-read when data changes (e.g. a new order from the storefront tab)
  const tick = useNow();
  const now = useMemo(() => new Date(Math.max(tick, Date.now())), [tick, orders, inquiries]); // eslint-disable-line react-hooks/exhaustive-deps

  const showOrders = can('orders');
  const showSales = showOrders || can('analytics');
  const showStock = can('inventory') && can('products');
  const showContacts = can('contacts');
  const showOffers = can('offers');

  const ranges = useMemo(() => periodRanges(period, now), [period, now]);
  const cur = useMemo(() => windowStats(orders, inquiries, ranges.current), [orders, inquiries, ranges]);
  const prev = useMemo(() => windowStats(orders, inquiries, ranges.previous), [orders, inquiries, ranges]);
  const comparable = useMemo(() => isComparable(orders, ranges.previous), [orders, ranges]);
  const chart = useMemo(() => buildBuckets(orders, now, period), [orders, now, period]);
  const recent = useMemo(() => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 7), [orders]);
  const unseen = useMemo(() => orders.filter((o) => !o.seen).length, [orders]);
  const lowCount = useMemo(() => lowStockProducts(products).length, [products]);
  const unassigned = useMemo(() => unassignedContacts(inquiries).length, [inquiries]);

  const periodLabel = t(`pl_${period}`);
  const open = t('open_list');

  /** Delta vs. the comparison window; when there is no base to divide by, name the previous value instead. */
  const compare = (c: number, p: number, fmt: (v: number) => string) => {
    if (!comparable) return { delta: undefined, caption: t('no_compare') };
    const delta = pctChange(c, p, comparable);
    if (delta !== null) return { delta, caption: period === 'today' ? t('vs_today') : t('vs_prev', { n: ranges.days }) };
    return { delta: undefined, caption: period === 'today' ? t('prev_today', { v: fmt(p) }) : t('prev_days', { n: ranges.days, v: fmt(p) }) };
  };
  const fmtMoney = (v: number) => money(v, lang, { decimals: false });

  const kpis = [
    showSales && (
      <KpiCard
        key="net"
        label={t('kpi_net')}
        value={fmtMoney(cur.net)}
        {...compare(cur.net, prev.net, fmtMoney)}
        title={t('net_def')}
        to={can('analytics') ? `/admin/analitika?period=${period}` : `/admin/narudzbe?period=${period}`}
        linkLabel={open}
      />
    ),
    showOrders && (
      <KpiCard
        key="orders"
        label={t('kpi_orders')}
        value={cur.orders}
        {...compare(cur.orders, prev.orders, String)}
        to={`/admin/narudzbe?period=${period}`}
        linkLabel={open}
      />
    ),
    showStock && <KpiCard key="stock" label={t('kpi_stock')} value={lowCount} caption={t('stock_hint', { n: LOW_STOCK })} to="/admin/proizvodi?zalihe=low" linkLabel={open} />,
    showContacts && (
      <KpiCard
        key="contacts"
        label={t('kpi_contacts')}
        value={cur.contacts}
        caption={unassigned ? t('contacts_unassigned', { n: unassigned }) : t('contacts_all_assigned')}
        to={`/admin/kontakti?period=${period}`}
        linkLabel={open}
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        breadcrumbs={[ta('nav_overview'), t(`p_${period}`)]}
        title={t('title')}
        description={capitalize(fmtDate(now, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })).replace(/\.$/, '')}
        actions={<PeriodSelect value={period} onChange={setPeriod} now={now} />}
      />

      <div className="space-y-4 sm:space-y-5">
        {kpis.length > 0 && <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">{kpis}</div>}

        <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
          {showOrders && <RecentOrders className="xl:col-span-2" orders={recent} unseen={unseen} />}
          {/* phones/tablets: tasks first; desktop: next to the orders as in the mock-up */}
          <Attention className={cn('order-first xl:order-none', !showOrders && 'xl:col-span-3')} now={now} />
        </div>

        {showSales && (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
            <RevenueChart className="xl:col-span-2" buckets={chart.buckets} step={chart.step} periodLabel={periodLabel} />
            <StatusBreakdown byStatus={cur.byStatus} periodLabel={periodLabel} linkable={showOrders} />
          </div>
        )}

        {(showSales || showOffers) && (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {showSales && <TopProducts className={cn(!showOffers && 'lg:col-span-2')} rows={cur.top} products={products} periodLabel={periodLabel} linkable={can('products')} />}
            {showOffers && <Campaigns className={cn(!showSales && 'lg:col-span-2')} now={now} />}
          </div>
        )}
      </div>
    </>
  );
}
