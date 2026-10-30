// Commercial reports (PDF p.38, col. 01): sales statement, trend, top products/variants, breakdowns, discounts report.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ChartColumn, ChartLine, Rows3 } from 'lucide-react';
import { Card, Table, Td, Th, Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { useCan } from '@/store/hooks';
import { money, num, unitLabel } from '@/lib/format';
import type { Category, Discount, Lang, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { A, type AKey } from './i18n';
import { BarList, type BarRow } from './BarList';
import { TrendChart, TrendLegend } from './TrendChart';
import { DeltaChip, InfoTip, Segmented, StatTile, StatusMark } from './ui';
import { capitalize, fmtDate, fmtDay, rangeLabel, shareLabel } from './fmt';
import { delta, type Breakdown, type BreakRow, type Bucket, type DiscountReport, type LineRow, type Range, type Sales, type Step } from './metrics';

export interface CommercialData {
  sales: Sales;
  prevSales: Sales | null;
  /** deltas are shown only when the comparison window is fully covered by data */
  comparable: boolean;
  range: Range;
  cmpRange: Range | null;
  step: Step;
  series: Bucket[];
  prevSeries: Bucket[] | null;
  breakdown: Breakdown;
  prevBreakdown: Breakdown | null;
  discounts: DiscountReport;
}

const TOP_N = 8;
const BAR_N = 6;

export function bucketLabel(b: Bucket, step: Step, lang: Lang, long = false) {
  if (step === 'hour') return `${String(b.start.getHours()).padStart(2, '0')}:00`;
  if (step === 'day') return long ? capitalize(fmtDate(b.start, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })) : fmtDay(b.start, lang);
  return rangeLabel(b.start, b.end, lang);
}

export function Commercial({ data, products, categories, discountsById, vatRate }: { data: CommercialData; products: Map<string, Product>; categories: Category[]; discountsById: Map<string, Discount>; vatRate: number }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const { sales: s, prevSales: p, comparable } = data;
  const d = (cur: number, prev?: number) => (p ? delta(cur, prev, comparable) : undefined);
  const m = (v: number) => money(v, lang, { decimals: false });

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label={t('k_net')} infoTitle={t('how')} info={t('d_net')} value={m(s.net)} delta={d(s.net, p?.net)} caption={p && !comparable ? t('no_delta') : undefined} />
        <StatTile
          label={t('k_orders')}
          infoTitle={t('how')}
          info={t('d_orders')}
          value={num(s.orders, lang)}
          delta={d(s.orders, p?.orders)}
          caption={s.cancelled ? t('cancelled_n', { n: s.cancelled }) : undefined}
        />
        <StatTile label={t('k_aov')} infoTitle={t('how')} info={t('d_aov')} value={m(s.aov)} delta={d(s.aov, p?.aov)} />
        <StatTile
          label={t('k_returning')}
          infoTitle={t('how')}
          info={t('d_returning')}
          value={shareLabel(s.returningRate, lang)}
          delta={d(s.returningRate, p?.returningRate)}
          caption={t('returning_of', { n: s.returning, total: s.customers })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
        <TrendCard data={data} />
        <Statement data={data} vatRate={vatRate} />
      </div>

      <TopProducts data={data} products={products} />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <Breakdowns data={data} categories={categories} />
      </div>

      <DiscountsCard report={data.discounts} returns={s.returns} discountsById={discountsById} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trend                                                               */
/* ------------------------------------------------------------------ */
function TrendCard({ data, className }: { data: CommercialData; className?: string }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const [metric, setMetric] = useState<'net' | 'orders'>('net');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const { series, prevSeries, step, range, cmpRange } = data;

  const cur = series.map((b) => (b.future ? null : metric === 'net' ? b.net : b.orders));
  const prev = prevSeries ? series.map((_, i) => (prevSeries[i] ? (metric === 'net' ? prevSeries[i].net : prevSeries[i].orders) : null)) : null;
  const fmt = (v: number) => (metric === 'net' ? money(v, lang) : num(v, lang));
  const axis = (v: number) => (metric === 'net' ? money(v, lang, { decimals: false }) : num(v, lang));
  const hasData = series.some((b) => b.orders > 0 || b.net !== 0);
  const metricLabel = metric === 'net' ? t('chart_net') : t('chart_orders');

  return (
    <Card
      className={className}
      title={t('chart_title')}
      description={t(`step_${step}` as AKey)}
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden sm:block">
            <Segmented
              label={t('chart_title')}
              value={metric}
              onChange={setMetric}
              options={[
                { id: 'net', label: t('chart_net') },
                { id: 'orders', label: t('chart_orders') },
              ]}
            />
          </span>
          <Segmented
            label={t('view_chart')}
            value={view}
            onChange={setView}
            options={[
              { id: 'chart', label: <ChartLine className="h-4 w-4" />, title: t('view_chart') },
              { id: 'table', label: <Rows3 className="h-4 w-4" />, title: t('view_table') },
            ]}
          />
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <TrendLegend current={`${t('legend_cur')} · ${rangeLabel(range.from, range.to, lang)}`} previous={cmpRange ? `${t('legend_prev')} · ${rangeLabel(cmpRange.from, cmpRange.to, lang)}` : null} />
        <span className="sm:hidden">
          <Segmented
            label={t('chart_title')}
            value={metric}
            onChange={setMetric}
            options={[
              { id: 'net', label: t('chart_net') },
              { id: 'orders', label: t('chart_orders') },
            ]}
          />
        </span>
      </div>
      {view === 'chart' ? (
        <div className="relative">
          <TrendChart
            current={cur}
            previous={prev}
            labels={series.map((b) => bucketLabel(b, step, lang))}
            longLabels={series.map((b) => bucketLabel(b, step, lang, true))}
            prevLabels={prevSeries ? series.map((_, i) => (prevSeries[i] ? bucketLabel(prevSeries[i], step, lang, true) : '—')) : undefined}
            format={fmt}
            axisFormat={axis}
            emptyMax={metric === 'net' ? 1000 : 4}
            ariaLabel={t('chart_aria', { metric: metricLabel, range: rangeLabel(range.from, range.to, lang) })}
          />
          {!hasData && (
            <div className="pointer-events-none absolute inset-x-0 top-[36%] text-center">
              <ChartColumn className="mx-auto h-5 w-5 text-muted" />
              <div className="mt-1.5 text-sm font-bold text-ink">{t('empty_title')}</div>
              <div className="mt-0.5 text-[13px] text-muted">{t('empty_text')}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-h-[252px] overflow-y-auto rounded-lg ring-1 ring-line/70">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 bg-canvas">
              <tr className="text-[12px] font-semibold text-muted">
                <th className="px-3 py-2">{t('col_period')}</th>
                <th className="px-3 py-2 text-right">{t('col_current')}</th>
                {prev && <th className="px-3 py-2 text-right">{t('col_previous')}</th>}
              </tr>
            </thead>
            <tbody>
              {series.map((b, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="px-3 py-1.5 text-ink-soft">{bucketLabel(b, step, lang, true)}</td>
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-ink">{cur[i] === null ? '—' : fmt(cur[i] as number)}</td>
                  {prev && <td className="px-3 py-1.5 text-right tabular-nums text-ink-soft">{prev[i] === null ? '—' : fmt(prev[i] as number)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sales statement: gross → net → total                                */
/* ------------------------------------------------------------------ */
function Statement({ data, vatRate, className }: { data: CommercialData; vatRate: number; className?: string }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const { sales: s, prevSales: p, comparable } = data;
  const m = (v: number) => money(v, lang);
  type Line = { key: keyof Sales; label: string; def: AKey; sign?: '−' | '+' | '='; strong?: boolean; sub?: boolean; upIsGood?: boolean };
  const lines: Line[] = [
    { key: 'gross', label: t('m_gross'), def: 'd_gross' },
    { key: 'discounts', label: t('m_discounts'), def: 'd_discounts', sign: '−', upIsGood: false },
    { key: 'returns', label: t('m_returns'), def: 'd_returns', sign: '−', upIsGood: false },
    { key: 'net', label: t('m_net'), def: 'd_net', sign: '=', strong: true },
    { key: 'shipping', label: t('m_shipping'), def: 'd_shipping', sign: '+' },
    { key: 'total', label: t('m_total'), def: 'd_total', sign: '=', strong: true },
    { key: 'vat', label: t('m_vat', { rate: vatRate }), def: 'd_vat', sub: true },
  ];
  const showPrev = !!p;
  return (
    <Card className={className} title={t('st_title')} description={t('st_desc')} padded={false}>
      <div className="px-5 py-3">
        <div className={cn('grid items-center gap-x-3 pb-2 text-[11.5px] font-semibold text-muted', showPrev ? 'grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto]')}>
          <span>{t('col_metric')}</span>
          <span className="w-[92px] text-right">{t('col_current')}</span>
          {showPrev && <span className="hidden w-[92px] text-right sm:block">{t('col_previous')}</span>}
          {showPrev && <span className="hidden w-[64px] text-right sm:block">{t('col_change')}</span>}
        </div>
        {lines.map((l) => {
          const cur = s[l.key] as number;
          const prev = p ? (p[l.key] as number) : undefined;
          const neg = l.sign === '−';
          return (
            <div
              key={l.key}
              className={cn(
                'grid items-center gap-x-3 border-t py-2 text-[13.5px]',
                showPrev ? 'grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto_auto]' : 'grid-cols-[1fr_auto]',
                l.strong ? 'border-ink/20' : 'border-line/70',
                l.sub && 'border-transparent pt-0',
              )}
            >
              <span className={cn('flex min-w-0 items-center gap-1.5', l.strong ? 'font-bold text-ink' : l.sub ? 'pl-5 text-[12.5px] text-muted' : 'text-ink-soft')}>
                {!l.sub && <span className="w-3 shrink-0 text-center text-muted">{l.sign ?? ''}</span>}
                <span className="truncate">{l.label}</span>
                <InfoTip title={t('how')}>{t(l.def)}</InfoTip>
              </span>
              <span className={cn('w-[92px] text-right tabular-nums', l.strong ? 'font-bold text-ink' : l.sub ? 'text-[12.5px] text-muted' : 'text-ink')}>
                {neg && cur ? `−${m(cur)}` : m(cur)}
              </span>
              {showPrev && <span className={cn('hidden w-[92px] text-right tabular-nums sm:block', l.sub ? 'text-[12.5px] text-muted' : 'text-ink-soft')}>{prev === undefined ? '—' : neg && prev ? `−${m(prev)}` : m(prev)}</span>}
              {showPrev && (
                <span className="hidden w-[64px] justify-end sm:flex">{!l.sub && <DeltaChip value={delta(cur, prev, comparable)} upIsGood={l.upIsGood ?? true} />}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line/70 bg-canvas/50 px-5 py-2.5 text-[12.5px] text-muted">
        <span className="flex items-center gap-1.5">
          {t('m_orderValue')}
          <InfoTip title={t('how')}>{t('d_orderValue')}</InfoTip>
        </span>
        <span className="font-semibold tabular-nums text-ink-soft">{m(s.orderValue)}</span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Top products / variants                                             */
/* ------------------------------------------------------------------ */
function TopProducts({ data, products }: { data: CommercialData; products: Map<string, Product> }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const can = useCan();
  const canCost = can('products', 'viewCost');
  const canOpen = can('products', 'view');
  const [mode, setMode] = useState<'products' | 'variants'>('products');
  const all = mode === 'products' ? data.breakdown.products : data.breakdown.variants;
  const rows = all.slice(0, TOP_N);
  const total = data.breakdown.linesNet;

  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          {t('tp_title')}
          <InfoTip title={t('how')}>
            {t('d_top')} {mode === 'variants' && t('d_variant')} {canCost && t('d_margin')}
          </InfoTip>
        </span>
      }
      actions={
        <Segmented
          label={t('tp_title')}
          value={mode}
          onChange={setMode}
          options={[
            { id: 'products', label: t('tp_products') },
            { id: 'variants', label: t('tp_variants') },
          ]}
        />
      }
      padded={false}
    >
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-muted">{t('empty_title')}</div>
      ) : (
        <>
        <ul className="divide-y divide-line/70 sm:hidden">
          {rows.map((r, i) => {
            const prod = products.get(r.productId);
            const title = prod ? l(prod.name) : r.name;
            const body = (
              <>
                <span className="w-4 shrink-0 text-[12px] font-semibold tabular-nums text-muted">{i + 1}</span>
                <Thumb src={r.image} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{title}</span>
                  <span className="block truncate text-[12px] text-muted">{r.options || prod?.sku || t('custom_line')}</span>
                  <span className="block text-[12px] text-muted">
                    {num(r.units, lang, 1)} {unitLabel(r.unit, lang)} · {t('orders_n', { n: r.orders })}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[13.5px] font-bold tabular-nums text-ink">{money(r.net, lang, { decimals: false })}</span>
                  <span className="block text-[11.5px] tabular-nums text-muted">{total > 0 ? shareLabel(Math.max(0, r.net) / total, lang, 1) : ''}</span>
                </span>
              </>
            );
            return (
              <li key={r.key}>
                {prod && canOpen ? (
                  <Link to={`/admin/proizvodi/${prod.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-canvas">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="hidden sm:block">
        <Table>
          <thead>
            <tr>
              <Th className="w-8">#</Th>
              <Th>{t('col_product')}</Th>
              <Th className="text-right">{t('col_units')}</Th>
              <Th className="text-right">{t('col_orders')}</Th>
              <Th className="text-right">{t('col_net')}</Th>
              <Th className="text-right">{t('col_share')}</Th>
              {canCost && <Th className="text-right">{t('col_margin')}</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <ProductRowView key={r.key} r={r} i={i} total={total} product={products.get(r.productId)} canCost={canCost} canOpen={canOpen} name={(p) => l(p.name)} lang={lang} />
            ))}
          </tbody>
        </Table>
        </div>
        </>
      )}
      <div className="flex flex-col gap-1 border-t border-line/70 px-5 py-3 text-[12.5px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>{t('tp_total', { sum: money(total, lang) })}</span>
        {all.length > TOP_N && <span>{t('tp_more', { n: TOP_N, total: all.length })}</span>}
      </div>
    </Card>
  );
}

function ProductRowView({ r, i, total, product, canCost, canOpen, name, lang }: { r: LineRow; i: number; total: number; product?: Product; canCost: boolean; canOpen: boolean; name: (p: Product) => string; lang: Lang }) {
  const t = useDict(A, 'admin');
  const title = product ? name(product) : r.name;
  const productNet = r.net - r.installation;
  const cost = product?.cost != null ? product.cost * r.units : null;
  const margin = cost !== null && productNet > 0 ? productNet - cost : null;
  const label = (
    <span className="min-w-0">
      <span className="block truncate font-semibold text-ink">{title}</span>
      <span className="block truncate text-[12px] text-muted">{r.options || product?.sku || (!r.productId ? t('custom_line') : '')}</span>
    </span>
  );
  return (
    <tr className="transition-colors hover:bg-canvas/60">
      <Td className="text-[12px] font-semibold tabular-nums text-muted">{i + 1}</Td>
      <Td className="max-w-[340px]">
        {product && canOpen ? (
          <Link to={`/admin/proizvodi/${product.id}`} className="flex items-center gap-3 hover:[&_span:first-child]:underline">
            <Thumb src={r.image} />
            {label}
          </Link>
        ) : (
          <span className="flex items-center gap-3">
            <Thumb src={r.image} />
            {label}
          </span>
        )}
      </Td>
      <Td className="whitespace-nowrap text-right tabular-nums text-ink-soft">
        {num(r.units, lang, 1)} {unitLabel(r.unit, lang)}
      </Td>
      <Td className="text-right tabular-nums text-ink-soft">{r.orders}</Td>
      <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(r.net, lang)}</Td>
      <Td className="text-right tabular-nums text-muted">{total > 0 ? shareLabel(Math.max(0, r.net) / total, lang, 1) : '—'}</Td>
      {canCost && (
        <Td className="whitespace-nowrap text-right tabular-nums">
          {margin === null ? (
            <span className="text-muted">—</span>
          ) : (
            <span title={money(margin, lang)}>
              <span className="font-semibold text-ink">{shareLabel(margin / productNet, lang)}</span>
              <span className="ml-1.5 text-[12px] text-muted">{money(margin, lang, { decimals: false })}</span>
            </span>
          )}
        </Td>
      )}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Breakdowns: category / city / channel                               */
/* ------------------------------------------------------------------ */
function fold(rows: BreakRow[], n: number): { rows: BreakRow[]; other: BreakRow | null; count: number } {
  if (rows.length <= n) return { rows, other: null, count: 0 };
  const rest = rows.slice(n - 1);
  return { rows: rows.slice(0, n - 1), other: { key: '_rest', net: rest.reduce((s, r) => s + r.net, 0), orders: rest.reduce((s, r) => s + r.orders, 0) }, count: rest.length };
}

function Breakdowns({ data, categories }: { data: CommercialData; categories: Category[] }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const cats = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const prevOf = (list: BreakRow[] | undefined, key: string) => list?.find((r) => r.key === key)?.net;
  const dl = (cur: number, prev: number | undefined) => (data.prevBreakdown ? delta(cur, prev, data.comparable) : undefined);
  const m = (v: number) => money(v, lang, { decimals: false });
  const sub = (r: BreakRow) => t('orders_n', { n: r.orders });

  const build = (list: BreakRow[], prevList: BreakRow[] | undefined, label: (k: string) => ReactNode): BarRow[] => {
    const f = fold(list, BAR_N);
    const rows: BarRow[] = f.rows.map((r) => ({ key: r.key, label: label(r.key), value: r.net, sub: sub(r), delta: dl(r.net, prevOf(prevList, r.key)) }));
    if (f.other) rows.push({ key: '_rest', label: t('other_rows', { n: f.count }), value: f.other.net, sub: sub(f.other) });
    return rows;
  };

  const category = build(data.breakdown.category, data.prevBreakdown?.category, (k) => (k === '_other' ? t('other_cat') : cats.get(k) ? l(cats.get(k)!.name) : k));
  const city = build(data.breakdown.city, data.prevBreakdown?.city, (k) => k);
  const chRows = (['online', 'manual'] as const).map((k) => data.breakdown.channel.find((r) => r.key === k) ?? { key: k, net: 0, orders: 0 });
  const channel: BarRow[] = [
    ...chRows.map((r) => ({ key: r.key, label: t(r.key === 'online' ? 'ch_online' : 'ch_manual'), value: r.net, sub: sub(r), delta: dl(r.net, prevOf(data.prevBreakdown?.channel, r.key)) })),
    { key: 'pos', label: t('ch_pos'), value: 0, inactive: true, sub: <StatusMark state="off" className="text-[11.5px] font-medium text-muted">{t('pos_inactive')}</StatusMark> },
  ];

  const card = (title: string, rows: BarRow[]) => (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          {title}
          <InfoTip title={t('how')}>{t('d_breakdown')}</InfoTip>
        </span>
      }
    >
      <BarList rows={rows} format={m} empty={t('empty_title')} />
    </Card>
  );

  return (
    <>
      {card(t('by_category'), category)}
      {card(t('by_city'), city)}
      {card(t('by_channel'), channel)}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Discounts report — reconciled with the order allocations (p.38)     */
/* ------------------------------------------------------------------ */
function DiscountsCard({ report, returns, discountsById }: { report: DiscountReport; returns: number; discountsById: Map<string, Discount> }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const can = useCan();
  const m = (v: number) => money(v, lang);
  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          {t('dr_title')}
          <InfoTip title={t('how')}>{t('d_discounts')}</InfoTip>
        </span>
      }
      description={t('dr_desc')}
      padded={false}
    >
      {report.rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-muted">{t('dr_empty')}</div>
      ) : (
        <>
        <ul className="divide-y divide-line/70 sm:hidden">
          {report.rows.map((r) => {
            const live = discountsById.get(r.id);
            return (
              <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-ink">{live ? l(live.publicTitle) || live.title : r.title}</span>
                  <span className="block text-[12px] text-muted">
                    {r.code ?? t('auto')} · {t(`kind_${r.kind}` as AKey)} · {t('orders_n', { n: r.orders })}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] font-semibold tabular-nums">−{m(r.amount)}</span>
              </li>
            );
          })}
        </ul>
        <div className="hidden sm:block">
        <Table>
          <thead>
            <tr>
              <Th>{t('col_rule')}</Th>
              <Th>{t('col_kind')}</Th>
              <Th className="text-right">{t('col_orders')}</Th>
              <Th className="text-right">{t('col_amount')}</Th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => {
              const live = discountsById.get(r.id);
              const name = live ? l(live.publicTitle) || live.title : r.title;
              return (
                <tr key={r.id} className="transition-colors hover:bg-canvas/60">
                  <Td>
                    {live && can('discounts', 'view') ? (
                      <Link to={`/admin/popusti/${r.id}`} className="font-semibold text-ink hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">{name}</span>
                    )}
                    <span className="mt-0.5 block text-[12px] text-muted">{r.code ? <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11.5px] text-ink-soft ring-1 ring-line/70">{r.code}</code> : t('auto')}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">{t(`kind_${r.kind}` as AKey)}</Td>
                  <Td className="text-right tabular-nums text-ink-soft">{r.orders}</Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">−{m(r.amount)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        </div>
        </>
      )}
      <div className="space-y-1.5 border-t border-line/70 px-5 py-3 text-[12.5px]">
        <StatusMark state={report.reconciled ? 'on' : 'bad'} className="whitespace-normal">
          {t(report.reconciled ? 'dr_ok' : 'dr_bad', { a: m(report.rulesGoods), b: m(report.orderDiscounts), c: m(report.lineAllocations) })}
        </StatusMark>
        <div className="flex flex-col gap-1 pl-[18px] text-muted sm:flex-row sm:gap-4">
          <span>{t('dr_shipping', { a: m(report.shippingWaived) })}</span>
          <span>{t('dr_refunds', { a: m(returns) })}</span>
        </div>
      </div>
    </Card>
  );
}
