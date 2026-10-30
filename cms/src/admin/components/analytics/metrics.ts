// Analytics maths — CMS proposal p.38: "Përkufizimi i çdo metrike dokumentohet që raportet të mos japin total të ndryshëm."
// Pure functions over raw store slices; Analytics.tsx derives everything inside useMemo.
// Every number below has a written definition in i18n.ts (DEF) — keep both in sync.
//
//   Gross  = Σ (products + installation) of non-cancelled orders created in the range   (VAT incl., before discounts)
//   − Discounts (product + order rules, as allocated on the order)
//   − Returns   (refunds dated inside the range)
//   = Net sales
//   + Shipping  (fees paid, after shipping discounts)
//   = Total sales            VAT = Total × rate / (100 + rate)
//
//   Order value (= Dashboard revenue) = Gross − Discounts + Shipping = Σ order.total      AOV = Order value / orders
import type { Booking, Discount, DiscountKind, Inquiry, Offer, OfferState, Order, Product, PurchaseOrder, ReturnRequest, Unit } from '@/lib/types';
import { orderLineInstallation, orderLineNet, orderLineUnits, refundedOf, fulfillmentOf, paymentOf } from '@/lib/orders';
import { customerKeyOf } from '@/lib/crm';
import { discountState } from '@/lib/discounts';
import { offerState } from '@/lib/offers';
import { isTracked } from '@/lib/inventory';

const r2 = (n: number) => Math.round(n * 100) / 100;
const DAY = 86400000;

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* ------------------------------------------------------------------ */
/* Ranges, comparison, channel                                         */
/* ------------------------------------------------------------------ */
export type RangeId = 'today' | '7' | '30' | '90' | 'month' | 'lastMonth' | 'custom';
export const RANGE_IDS: RangeId[] = ['today', '7', '30', '90', 'month', 'lastMonth', 'custom'];
export type CompareId = 'prev' | 'year' | 'none';
export const COMPARE_IDS: CompareId[] = ['prev', 'year', 'none'];
export type ChannelId = 'all' | 'online' | 'manual';
export const CHANNEL_IDS: ChannelId[] = ['all', 'online', 'manual'];

/** [from, to) in local time */
export interface Range {
  from: Date;
  to: Date;
}

export function parseDay(s?: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const x = new Date(y, m - 1, d);
  return Number.isNaN(x.getTime()) ? null : x;
}

export function resolveRange(id: RangeId, now: Date, custom: { from?: string | null; to?: string | null } = {}): Range {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  switch (id) {
    case 'today':
      return { from: today, to: tomorrow };
    case '7':
    case '30':
    case '90':
      return { from: addDays(today, -(Number(id) - 1)), to: tomorrow };
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: tomorrow };
    case 'lastMonth':
      return { from: new Date(today.getFullYear(), today.getMonth() - 1, 1), to: new Date(today.getFullYear(), today.getMonth(), 1) };
    case 'custom': {
      let a = parseDay(custom.from) ?? addDays(today, -29);
      let b = parseDay(custom.to) ?? today;
      if (b < a) [a, b] = [b, a];
      return { from: a, to: addDays(b, 1) };
    }
  }
}

export const rangeDays = (r: Range) => Math.max(1, Math.round((r.to.getTime() - r.from.getTime()) / DAY));

export function compareRange(r: Range, cmp: CompareId): Range | null {
  if (cmp === 'none') return null;
  if (cmp === 'year') {
    const from = new Date(r.from);
    from.setFullYear(from.getFullYear() - 1);
    const to = new Date(r.to);
    to.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }
  return { from: addDays(r.from, -rangeDays(r)), to: new Date(r.from) };
}

/** Earliest recorded order (the demo data starts ~75 days back). */
export const dataStartOf = (orders: Order[]) =>
  orders.reduce<Date | null>((m, o) => {
    const t = new Date(o.createdAt);
    return !m || t < m ? t : m;
  }, null);

/** full = every day of the window has data · partial = only the end · none = before the first order */
export type Coverage = 'full' | 'partial' | 'none';
export function coverage(r: Range | null, dataStart: Date | null): Coverage {
  if (!r || !dataStart) return 'none';
  if (r.from >= startOfDay(dataStart)) return 'full';
  if (r.to > dataStart) return 'partial';
  return 'none';
}

/** Online Store = storefront checkout; manual = converted from a draft order (phone / in store). */
export const channelOf = (o: Pick<Order, 'draftId'>): Exclude<ChannelId, 'all'> => (o.draftId ? 'manual' : 'online');
const inChannel = (o: Order, ch: ChannelId) => ch === 'all' || channelOf(o) === ch;
const within = (iso: string, r: Range) => {
  const t = new Date(iso).getTime();
  return t >= r.from.getTime() && t < r.to.getTime();
};
const counts = (o: Order) => o.status !== 'cancelled';

/* ------------------------------------------------------------------ */
/* Refunds — dated by the refund, split over the lines they name       */
/* ------------------------------------------------------------------ */
export interface RefundEvent {
  at: string;
  amount: number;
  /** order line indexes the refund covers (empty = whole order) */
  lines: number[];
}

export function refundEvents(o: Order): RefundEvent[] {
  const list = (o.refunds ?? []).filter((r) => r.amount > 0);
  if (list.length)
    return list.map((r) => ({
      at: r.at,
      amount: r.amount,
      lines: r.lineIds.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < o.items.length),
    }));
  const total = refundedOf(o);
  return total > 0 ? [{ at: o.createdAt, amount: total, lines: [] }] : [];
}

/** Split a refund over line nets (the named lines, or all), never more than a line's net. */
function allocateRefund(amount: number, nets: number[], lines: number[]): number[] {
  const out = nets.map(() => 0);
  const idx = lines.length ? lines : nets.map((_, i) => i);
  const base = idx.reduce((s, i) => s + nets[i], 0);
  if (base <= 0) return out;
  let left = amount;
  idx.forEach((i, k) => {
    const share = k === idx.length - 1 ? left : r2((amount * nets[i]) / base);
    const v = Math.min(nets[i], Math.max(0, share));
    out[i] = v;
    left = r2(left - v);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Sales summary                                                       */
/* ------------------------------------------------------------------ */
export interface Sales {
  /** non-cancelled orders created in the range */
  orders: number;
  cancelled: number;
  gross: number;
  discounts: number;
  returns: number;
  net: number;
  shipping: number;
  /** shipping fees waived by shipping rules (already excluded from `shipping`) */
  shippingDiscounts: number;
  total: number;
  vat: number;
  /** Σ order.total — what the Overview calls revenue */
  orderValue: number;
  aov: number;
  customers: number;
  returning: number;
  returningRate: number;
  returningOrders: number;
}

/** customer key → earliest non-cancelled order (ISO) */
export function firstOrders(orders: Order[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const o of orders) {
    if (!counts(o)) continue;
    const k = customerKeyOf(o);
    const cur = map.get(k);
    if (!cur || o.createdAt < cur) map.set(k, o.createdAt);
  }
  return map;
}

export function salesFor(orders: Order[], r: Range, ch: ChannelId, vatRate: number, first: Map<string, string>): Sales {
  let n = 0;
  let cancelled = 0;
  let gross = 0;
  let discounts = 0;
  let returns = 0;
  let shipping = 0;
  let shippingDiscounts = 0;
  let orderValue = 0;
  let returningOrders = 0;
  const latest = new Map<string, string>();
  for (const o of orders) {
    if (!inChannel(o, ch)) continue;
    if (counts(o)) for (const ev of refundEvents(o)) if (within(ev.at, r)) returns += ev.amount;
    if (!within(o.createdAt, r)) continue;
    if (!counts(o)) {
      cancelled++;
      continue;
    }
    n++;
    gross += o.subtotal + o.installationTotal;
    discounts += o.discount;
    shipping += o.shipping;
    shippingDiscounts += Math.max(0, (o.shippingBeforeDiscount ?? o.shipping) - o.shipping);
    orderValue += o.total;
    const key = customerKeyOf(o);
    const f = first.get(key);
    if (f && f < o.createdAt) returningOrders++;
    const l = latest.get(key);
    if (!l || l < o.createdAt) latest.set(key, o.createdAt);
  }
  let returning = 0;
  for (const [k, at] of latest) {
    const f = first.get(k);
    if (f && f < at) returning++;
  }
  const net = r2(gross - discounts - returns);
  const total = r2(net + shipping);
  return {
    orders: n,
    cancelled,
    gross: r2(gross),
    discounts: r2(discounts),
    returns: r2(returns),
    net,
    shipping: r2(shipping),
    shippingDiscounts: r2(shippingDiscounts),
    total,
    vat: r2((total * vatRate) / (100 + vatRate)),
    orderValue: r2(orderValue),
    aov: n ? orderValue / n : 0,
    customers: latest.size,
    returning,
    returningRate: latest.size ? returning / latest.size : 0,
    returningOrders,
  };
}

/** % change, or null when there is nothing reliable to compare against. */
export function delta(cur: number, prev: number | undefined, ok: boolean): number | null {
  if (!ok || prev === undefined || prev === 0) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

/* ------------------------------------------------------------------ */
/* Time series                                                         */
/* ------------------------------------------------------------------ */
export type Step = 'hour' | 'day' | 'week';
export const stepFor = (r: Range): Step => {
  const d = rangeDays(r);
  return d <= 1 ? 'hour' : d <= 92 ? 'day' : 'week';
};

export interface Bucket {
  start: Date;
  end: Date;
  net: number;
  orders: number;
  /** bucket starts after "now" (rest of today) — not drawn */
  future: boolean;
}

export function seriesFor(orders: Order[], r: Range, ch: ChannelId, step: Step, now: Date): Bucket[] {
  const list: Bucket[] = [];
  let start = new Date(r.from);
  while (start < r.to) {
    const next = step === 'hour' ? new Date(start.getTime() + 3600000) : addDays(start, step === 'day' ? 1 : 7);
    const end = next > r.to ? new Date(r.to) : next;
    list.push({ start, end, net: 0, orders: 0, future: start > now });
    start = end;
  }
  const find = (iso: string) => {
    const t = new Date(iso).getTime();
    return list.find((b) => t >= b.start.getTime() && t < b.end.getTime());
  };
  for (const o of orders) {
    if (!inChannel(o, ch) || !counts(o)) continue;
    for (const ev of refundEvents(o)) {
      const b = find(ev.at);
      if (b) b.net -= ev.amount;
    }
    const b = find(o.createdAt);
    if (!b) continue;
    b.net += o.subtotal + o.installationTotal - o.discount;
    b.orders += 1;
  }
  for (const b of list) b.net = r2(b.net);
  return list;
}

/* ------------------------------------------------------------------ */
/* Breakdowns + top products / variants (one pass over the lines)      */
/* ------------------------------------------------------------------ */
export interface BreakRow {
  key: string;
  net: number;
  orders: number;
}

export interface LineRow {
  key: string;
  productId: string;
  /** name as stored on the order (order language) — the page prefers the live product name */
  name: string;
  options: string;
  image: string;
  unit: Unit;
  units: number;
  orders: number;
  net: number;
  /** installation part of `net` (excluded from margin) */
  installation: number;
  returned: number;
}

export interface Breakdown {
  category: BreakRow[];
  city: BreakRow[];
  channel: BreakRow[];
  products: LineRow[];
  variants: LineRow[];
  /** Σ of every line row — equals gross − discounts − returns (except shipping refunds) */
  linesNet: number;
}

const byNet = <T extends { net: number }>(a: T, b: T) => b.net - a.net;

export function breakdownFor(orders: Order[], r: Range, ch: ChannelId, products: Map<string, Product>): Breakdown {
  const category = new Map<string, BreakRow>();
  const city = new Map<string, BreakRow>();
  const channel = new Map<string, BreakRow>();
  const prods = new Map<string, LineRow>();
  const vars = new Map<string, LineRow>();
  let linesNet = 0;

  const row = (map: Map<string, BreakRow>, key: string, net: number) => {
    const x = map.get(key) ?? { key, net: 0, orders: 0 };
    x.net += net;
    map.set(key, x);
    return x;
  };

  for (const o of orders) {
    if (!inChannel(o, ch) || !counts(o)) continue;
    const inR = within(o.createdAt, r);
    const nets = o.items.map((_, i) => orderLineNet(o, i));
    const refunds = nets.map(() => 0);
    let refundTotal = 0;
    for (const ev of refundEvents(o)) {
      if (!within(ev.at, r)) continue;
      allocateRefund(ev.amount, nets, ev.lines).forEach((v, i) => (refunds[i] += v));
      refundTotal += ev.amount;
    }
    if (!inR && !refundTotal) continue;

    // order level: city + channel
    const orderNet = (inR ? o.subtotal + o.installationTotal - o.discount : 0) - refundTotal;
    const cityRow = row(city, o.customer.city?.trim() || '—', orderNet);
    const chRow = row(channel, channelOf(o), orderNet);
    if (inR) {
      cityRow.orders++;
      chRow.orders++;
    }

    // line level: category, product, variant
    const seenCats = new Set<string>();
    o.items.forEach((l, i) => {
      const net = (inR ? nets[i] : 0) - refunds[i];
      linesNet += net;
      const cat = products.get(l.productId)?.categoryId ?? '_other';
      const c = row(category, cat, net);
      if (inR && !seenCats.has(cat)) {
        seenCats.add(cat);
        c.orders++;
      }
      const pid = l.productId || `custom:${l.name}`;
      for (const [map, key] of [
        [prods, pid],
        [vars, `${pid}|${l.options}`],
      ] as const) {
        const x = map.get(key) ?? { key, productId: l.productId, name: l.name, options: map === vars ? l.options : '', image: l.image, unit: l.unit, units: 0, orders: 0, net: 0, installation: 0, returned: 0 };
        x.net += net;
        x.returned += refunds[i];
        if (inR) {
          x.units += orderLineUnits(l);
          x.orders += 1;
          x.installation += orderLineInstallation(l);
        }
        map.set(key, x);
      }
    });
  }
  const fin = (m: Map<string, BreakRow>) => [...m.values()].map((x) => ({ ...x, net: r2(x.net) })).sort(byNet);
  const finL = (m: Map<string, LineRow>) =>
    [...m.values()].map((x) => ({ ...x, net: r2(x.net), returned: r2(x.returned), units: r2(x.units), installation: r2(x.installation) })).sort(byNet);
  return { category: fin(category), city: fin(city), channel: fin(channel), products: finL(prods), variants: finL(vars), linesNet: r2(linesNet) };
}

/* ------------------------------------------------------------------ */
/* Discounts report — per rule, reconciled with the order allocations  */
/* ------------------------------------------------------------------ */
export interface RuleRow {
  id: string;
  title: string;
  kind: DiscountKind;
  code?: string;
  orders: number;
  amount: number;
}

export interface DiscountReport {
  rows: RuleRow[];
  /** Σ rule amounts of product / order / bxgy rules */
  rulesGoods: number;
  /** Σ rule amounts of shipping rules */
  rulesShipping: number;
  /** Σ order.discount (what the sales summary subtracts) */
  orderDiscounts: number;
  /** Σ line.discount allocations stored on the order lines */
  lineAllocations: number;
  /** Σ (shipping before discount − shipping) */
  shippingWaived: number;
  /** all three goods figures agree to the cent */
  reconciled: boolean;
}

export function discountReport(orders: Order[], r: Range, ch: ChannelId): DiscountReport {
  const rows = new Map<string, RuleRow>();
  let orderDiscounts = 0;
  let lineAllocations = 0;
  let shippingWaived = 0;
  for (const o of orders) {
    if (!inChannel(o, ch) || !counts(o) || !within(o.createdAt, r)) continue;
    orderDiscounts += o.discount;
    lineAllocations += o.items.reduce((s, l, i) => s + (l.discount ?? (o.discount && o.subtotal ? (o.discount * o.items[i].lineTotal) / o.subtotal : 0)), 0);
    shippingWaived += Math.max(0, (o.shippingBeforeDiscount ?? o.shipping) - o.shipping);
    for (const a of o.discounts ?? []) {
      const x = rows.get(a.id) ?? { id: a.id, title: a.title, kind: a.kind, code: a.code, orders: 0, amount: 0 };
      x.orders++;
      x.amount += a.amount;
      rows.set(a.id, x);
    }
  }
  const list = [...rows.values()].map((x) => ({ ...x, amount: r2(x.amount) })).sort((a, b) => b.amount - a.amount);
  const rulesGoods = r2(list.filter((x) => x.kind !== 'shipping').reduce((s, x) => s + x.amount, 0));
  const rulesShipping = r2(list.filter((x) => x.kind === 'shipping').reduce((s, x) => s + x.amount, 0));
  const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
  return {
    rows: list,
    rulesGoods,
    rulesShipping,
    orderDiscounts: r2(orderDiscounts),
    lineAllocations: r2(lineAllocations),
    shippingWaived: r2(shippingWaived),
    reconciled: near(rulesGoods, orderDiscounts) && near(lineAllocations, orderDiscounts) && near(rulesShipping, shippingWaived),
  };
}

/* ------------------------------------------------------------------ */
/* Campaigns — one row per offer, over the offer's whole life          */
/* ------------------------------------------------------------------ */
export interface CampaignRow {
  offer: Offer;
  state: OfferState;
  discount?: Discount;
  visits: number;
  ctaClicks: number;
  codeUses: number;
  orders: number;
  revenue: number;
  discountTotal: number;
  ctr: number | null;
  conversion: number | null;
  /** stored offer counters agree with the orders (orders + discount total) */
  matches: boolean;
}

export function campaignRows(offers: Offer[], discounts: Discount[], orders: Order[], now: Date): CampaignRow[] {
  const byId = new Map(discounts.map((d) => [d.id, d]));
  return offers.map((offer) => {
    const list = offer.discountId ? orders.filter((o) => counts(o) && o.discounts?.some((a) => a.id === offer.discountId)) : [];
    const applied = (o: Order) => o.discounts?.find((a) => a.id === offer.discountId);
    const ordersN = list.length;
    const discountTotal = r2(list.reduce((s, o) => s + (applied(o)?.amount ?? 0), 0));
    const m = offer.metrics;
    return {
      offer,
      state: offerState(offer, now),
      discount: offer.discountId ? byId.get(offer.discountId) : undefined,
      visits: m.visits,
      ctaClicks: m.ctaClicks,
      codeUses: list.filter((o) => !!applied(o)?.code).length,
      orders: ordersN,
      revenue: r2(list.reduce((s, o) => s + o.total, 0)),
      discountTotal,
      ctr: m.visits ? m.ctaClicks / m.visits : null,
      conversion: m.visits ? ordersN / m.visits : null,
      matches: !offer.discountId || (m.orders === ordersN && Math.abs(m.discountTotal - discountTotal) < 0.05),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Operational reports — the current state, not tied to the range      */
/* ------------------------------------------------------------------ */
export const LOW_STOCK = 5;
export const EXPIRY_DAYS = 14;

export interface Expiring {
  kind: 'offer' | 'discount';
  id: string;
  name: Offer['name'] | string;
  endsAt: string;
}

export interface Ops {
  lowStock: Product[];
  outOfStock: Product[];
  incoming: { po: PurchaseOrder; units: number }[];
  incomingUnits: number;
  unfulfilled: Order[];
  unfulfilledBy: { new: number; confirmed: number; processing: number };
  pendingPayments: Order[];
  pendingAmount: number;
  unassigned: Inquiry[];
  pendingBookings: Booking[];
  expiring: Expiring[];
  openReturns: ReturnRequest[];
  movements7: number;
}

export function operations(
  input: { products: Product[]; orders: Order[]; purchaseOrders: PurchaseOrder[]; inquiries: Inquiry[]; bookings: Booking[]; offers: Offer[]; discounts: Discount[]; returns: ReturnRequest[]; movements: { at: string }[] },
  now: Date,
): Ops {
  const { products, orders, purchaseOrders, inquiries, bookings, offers, discounts, returns, movements } = input;
  const stocked = products.filter((p) => p.status === 'active' && !p.quoteOnly && isTracked(p));
  const available = (p: Product) => p.stock - (p.unavailable ?? 0);
  const outOfStock = stocked.filter((p) => available(p) <= 0).sort((a, b) => a.sku.localeCompare(b.sku));
  const lowStock = stocked.filter((p) => available(p) > 0 && available(p) <= LOW_STOCK).sort((a, b) => available(a) - available(b) || a.sku.localeCompare(b.sku));

  const incoming = purchaseOrders
    .filter((po) => po.status === 'sent' || po.status === 'partial')
    .map((po) => ({ po, units: po.lines.reduce((s, l) => s + Math.max(0, l.ordered - l.received - l.rejected), 0) }))
    .filter((x) => x.units > 0)
    .sort((a, b) => (a.po.expectedAt ?? '').localeCompare(b.po.expectedAt ?? ''));

  const newest = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
  const live = orders.filter(counts);
  const unfulfilled = live.filter((o) => fulfillmentOf(o) === 'unfulfilled' && (o.status === 'new' || o.status === 'confirmed' || o.status === 'processing')).sort(newest);
  const unfulfilledBy = { new: 0, confirmed: 0, processing: 0 };
  for (const o of unfulfilled) if (o.status in unfulfilledBy) unfulfilledBy[o.status as keyof typeof unfulfilledBy]++;
  const pendingPayments = live.filter((o) => ['pending', 'authorized', 'failed'].includes(paymentOf(o))).sort(newest);

  const horizon = now.getTime() + EXPIRY_DAYS * DAY;
  const ends = (iso?: string) => !!iso && new Date(iso).getTime() > now.getTime() && new Date(iso).getTime() <= horizon;
  const expOffers: Expiring[] = offers.filter((o) => offerState(o, now) === 'active' && ends(o.endsAt)).map((o) => ({ kind: 'offer', id: o.id, name: o.name, endsAt: o.endsAt! }));
  const covered = new Set(offers.filter((o) => expOffers.some((e) => e.id === o.id)).map((o) => o.discountId));
  const expDiscounts: Expiring[] = discounts
    .filter((d) => discountState(d, now) === 'active' && ends(d.endsAt) && !covered.has(d.id))
    .map((d) => ({ kind: 'discount', id: d.id, name: d.title, endsAt: d.endsAt! }));

  const weekAgo = now.getTime() - 7 * DAY;
  return {
    lowStock,
    outOfStock,
    incoming,
    incomingUnits: incoming.reduce((s, x) => s + x.units, 0),
    unfulfilled,
    unfulfilledBy,
    pendingPayments,
    pendingAmount: r2(pendingPayments.reduce((s, o) => s + o.total - refundedOf(o), 0)),
    unassigned: inquiries.filter((q) => q.status !== 'done' && !q.assignee).sort(newest),
    pendingBookings: bookings.filter((b) => b.status === 'pending').sort((a, b) => a.start.localeCompare(b.start)),
    expiring: [...expOffers, ...expDiscounts].sort((a, b) => a.endsAt.localeCompare(b.endsAt)),
    openReturns: returns.filter((x) => x.status === 'requested' || x.status === 'approved').sort(newest),
    movements7: movements.filter((m) => new Date(m.at).getTime() >= weekAgo).length,
  };
}
