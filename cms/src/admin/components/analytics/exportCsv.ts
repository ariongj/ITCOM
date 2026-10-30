// CSV export for Analitika — PDF p.38: "eksporti respekton filtrat dhe lejet".
// The export reuses the exact numbers on screen (same filters); sections for modules the role cannot open,
// and the cost/margin column without `viewCost`, are left out.
import type { Category, Discount, L10n, Order, Product, Service } from '@/lib/types';
import { paymentOf } from '@/lib/orders';
import type { Action, Module } from '@/lib/permissions';
import type { CsvCell } from './fmt';
import { isoDay } from './fmt';
import type { AKey } from './i18n';
import { DEF_GROUPS } from './Definitions';
import type { CommercialData } from './Commercial';
import type { Bucket, CampaignRow, Ops, Step } from './metrics';

type Tr = (k: AKey, vars?: Record<string, string | number>) => string;
type Can = (m: Module, a?: Action) => boolean;

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? '' : r2(v));
const dayOf = (b: Bucket, step: Step) => (step === 'hour' ? `${isoDay(b.start)} ${String(b.start.getHours()).padStart(2, '0')}:00` : isoDay(b.start));

export function salesCsv(d: CommercialData, ctx: { t: Tr; l: (v: L10n) => string; can: Can; products: Map<string, Product>; categories: Category[]; discountsById: Map<string, Discount>; vatRate: number }): CsvCell[][] {
  const { t, l, can, products, categories, discountsById } = ctx;
  const s = d.sales;
  const p = d.prevSales;
  const rows: CsvCell[][] = [];
  const ch = (cur: number, prev?: number) => (p && d.comparable && prev ? r2(((cur - prev) / Math.abs(prev)) * 100) : '');
  const metric = (label: string, key: keyof typeof s) => {
    const cur = s[key] as number;
    const prev = p ? (p[key] as number) : undefined;
    rows.push([label, r2(cur), prev === undefined ? '' : r2(prev), ch(cur, prev)]);
  };
  rows.push([t('col_metric'), t('col_current'), t('col_previous'), `${t('col_change')} %`]);
  metric(t('m_gross'), 'gross');
  metric(t('m_discounts'), 'discounts');
  metric(t('m_returns'), 'returns');
  metric(t('m_net'), 'net');
  metric(t('m_shipping'), 'shipping');
  metric(t('m_total'), 'total');
  metric(t('m_vat', { rate: ctx.vatRate }), 'vat');
  metric(t('m_orderValue'), 'orderValue');
  metric(t('k_orders'), 'orders');
  metric(t('k_aov'), 'aov');
  metric(t('k_returning'), 'returning');
  rows.push([`${t('k_returning')} %`, r2(s.returningRate * 100), p ? r2(p.returningRate * 100) : '', ch(s.returningRate, p?.returningRate)]);
  rows.push([]);

  rows.push([t('col_period'), t('chart_net'), t('chart_orders'), ...(d.prevSeries ? [`${t('chart_net')} (${t('col_previous')})`, `${t('chart_orders')} (${t('col_previous')})`] : [])]);
  d.series.forEach((b, i) => {
    const pb = d.prevSeries?.[i];
    rows.push([dayOf(b, d.step), b.future ? '' : b.net, b.future ? '' : b.orders, ...(d.prevSeries ? [pb ? pb.net : '', pb ? pb.orders : ''] : [])]);
  });
  rows.push([]);

  const canCost = can('products', 'viewCost');
  for (const [title, list] of [
    [t('tp_products'), d.breakdown.products],
    [t('tp_variants'), d.breakdown.variants],
  ] as const) {
    rows.push([title, 'SKU', t('col_units'), t('col_orders'), t('col_net'), ...(canCost ? [t('col_margin')] : [])]);
    for (const r of list) {
      const prod = products.get(r.productId);
      const name = prod ? l(prod.name) : r.name;
      const productNet = r.net - r.installation;
      const margin = canCost && prod?.cost != null ? r2(productNet - prod.cost * r.units) : '';
      rows.push([r.options ? `${name} — ${r.options}` : name, prod?.sku ?? '', r.units, r.orders, r.net, ...(canCost ? [margin] : [])]);
    }
    rows.push([]);
  }

  const cats = new Map(categories.map((c) => [c.id, c]));
  rows.push([t('by_category'), t('col_net'), t('col_orders')]);
  for (const r of d.breakdown.category) rows.push([r.key === '_other' ? t('other_cat') : cats.get(r.key) ? l(cats.get(r.key)!.name) : r.key, r.net, r.orders]);
  rows.push([]);
  rows.push([t('by_city'), t('col_net'), t('col_orders')]);
  for (const r of d.breakdown.city) rows.push([r.key, r.net, r.orders]);
  rows.push([]);
  rows.push([t('by_channel'), t('col_net'), t('col_orders')]);
  for (const r of d.breakdown.channel) rows.push([t(r.key === 'manual' ? 'ch_manual' : 'ch_online'), r.net, r.orders]);
  rows.push([]);

  rows.push([t('dr_title'), t('rule_code', { code: '' }).trim(), t('col_kind'), t('col_orders'), t('col_amount')]);
  for (const r of d.discounts.rows) {
    const live = discountsById.get(r.id);
    rows.push([live ? l(live.publicTitle) || live.title : r.title, r.code ?? t('auto'), t(`kind_${r.kind}` as AKey), r.orders, r.amount]);
  }
  rows.push([t(d.discounts.reconciled ? 'dr_ok' : 'dr_bad', { a: d.discounts.rulesGoods.toFixed(2), b: d.discounts.orderDiscounts.toFixed(2), c: d.discounts.lineAllocations.toFixed(2) })]);
  return rows;
}

export function opsCsv(ops: Ops, ctx: { t: Tr; l: (v: L10n) => string; can: Can; services: Service[]; status: (s: string) => string; inq: (type: string) => string }): CsvCell[][] {
  const { t, l, can, services, status, inq } = ctx;
  const svc = new Map(services.map((s) => [s.id, s]));
  const rows: CsvCell[][] = [];
  const section = (title: AKey, module: Module, head: string[], body: CsvCell[][]) => {
    rows.push([t(title)]);
    if (!can(module, 'view')) rows.push([t('csv_section_skipped')]);
    else rows.push(head, ...body);
    rows.push([]);
  };
  const avail = (p: Product) => Math.max(0, p.stock - (p.unavailable ?? 0));
  const who = (o: Order) => `${o.customer.firstName} ${o.customer.lastName}`;
  section('op_low', 'products', [t('col_product'), 'SKU', t('col_units')], ops.lowStock.map((p) => [l(p.name), p.sku, avail(p)]));
  section('op_out', 'products', [t('col_product'), 'SKU'], ops.outOfStock.map((p) => [l(p.name), p.sku]));
  section('op_incoming', 'purchasing', [t('col_number'), t('col_supplier'), t('col_units'), t('col_date')], ops.incoming.map(({ po, units }) => [po.number, po.supplier, units, po.expectedAt ? isoDay(new Date(po.expectedAt)) : '']));
  section('op_unfulfilled', 'orders', [t('col_number'), t('col_customer'), t('col_status'), t('col_amount'), t('col_date')], ops.unfulfilled.map((o) => [o.number, who(o), status(o.status), o.total, isoDay(new Date(o.createdAt))]));
  section('op_payments', 'orders', [t('col_number'), t('col_customer'), t('col_status'), t('col_amount')], ops.pendingPayments.map((o) => [o.number, who(o), t(paymentOf(o) === 'failed' ? 'pay_failed' : paymentOf(o) === 'authorized' ? 'pay_authorized' : 'pay_pending'), o.total]));
  section('op_unassigned', 'contacts', [t('col_customer'), t('col_kind'), t('col_city'), t('col_date')], ops.unassigned.map((q) => [q.name, inq(q.type), q.city ?? '', isoDay(new Date(q.createdAt))]));
  section('op_bookings', 'appointments', [t('col_customer'), t('col_service'), t('col_date')], ops.pendingBookings.map((b) => [b.customerName, svc.get(b.serviceId) ? l(svc.get(b.serviceId)!.name) : b.serviceId, b.start]));
  section('op_expiring', 'overview', [t('col_kind'), t('col_offer'), t('col_date')], ops.expiring.map((e) => [t(e.kind === 'offer' ? 'kind_offer' : 'kind_discount'), typeof e.name === 'string' ? e.name : l(e.name), e.endsAt]));
  section('op_returns', 'returns', [t('col_number'), t('col_status'), t('col_amount')], ops.openReturns.map((r) => [r.number, r.status, r.refundAmount]));
  return rows;
}

export function campaignsCsv(list: CampaignRow[], ctx: { t: Tr; l: (v: L10n) => string }): CsvCell[][] {
  const { t, l } = ctx;
  const rows: CsvCell[][] = [[t('col_offer'), t('col_status'), t('col_rule'), t('col_visits'), t('col_clicks'), `${t('col_ctr')} %`, t('col_codes'), t('col_orders'), `${t('col_conv')} %`, t('col_revenue'), t('col_discount')]];
  for (const r of list) {
    rows.push([
      l(r.offer.name),
      t(`os_${r.state}` as AKey),
      r.discount ? (r.discount.method === 'code' && r.discount.code ? r.discount.code : t('auto')) : t('no_rule'),
      r.visits,
      r.ctaClicks,
      pct(r.ctr === null ? null : r.ctr * 100),
      r.discount?.method === 'code' ? r.codeUses : '',
      r.discount ? r.orders : '',
      r.discount ? pct(r.conversion === null ? null : r.conversion * 100) : '',
      r.discount ? r.revenue : '',
      r.discount ? r.discountTotal : '',
    ]);
  }
  rows.push([]);
  rows.push([t('cp_caveat')]);
  return rows;
}

export function definitionsCsv(ctx: { t: Tr; vatRate: number }): CsvCell[][] {
  const { t, vatRate } = ctx;
  const rows: CsvCell[][] = [[t('defs_identity')], []];
  for (const g of DEF_GROUPS) for (const [name, def] of g.items) rows.push([t(g.title), t(name, { rate: vatRate }), t(def)]);
  return rows;
}
