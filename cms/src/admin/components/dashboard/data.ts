// Pure overview maths (PDF p.08 + p.38): period windows, net sales, chart buckets, top products and the
// "Kërkojnë vëmendje" queues. Everything is derived from raw store slices inside `useMemo` (see Dashboard.tsx).
import type { Booking, Inquiry, Offer, Order, OrderStatus, Product, ReturnRequest, Unit } from '@/lib/types';
import { fulfillmentOf, orderLineNet, orderLineUnits, paymentOf, refundedOf } from '@/lib/orders';
import { offerState } from '@/lib/offers';

export type Period = 'today' | '7' | '30' | '90';
export const PERIODS: Period[] = ['today', '7', '30', '90'];
export const isPeriod = (v: unknown): v is Period => PERIODS.includes(v as Period);
export const periodDays = (p: Period) => (p === 'today' ? 1 : Number(p));

/** Pipeline order of order statuses. */
export const STATUS_ORDER: OrderStatus[] = ['new', 'confirmed', 'processing', 'shipped', 'installation', 'completed', 'cancelled'];

/** "Low stock" = tracked product with this many units or fewer — same rule as the products list filter (?zalihe=low). */
export const LOW_STOCK = 5;
/** Offers that end within this many days are flagged. */
export const OFFER_WARN_DAYS = 14;

const DAY = 86_400_000;
const r2 = (n: number) => Math.round(n * 100) / 100;

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

/** Local YYYY-MM-DD (not UTC) */
export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole calendar days from today to `d` (0 = today, 1 = tomorrow…). */
export function daysUntil(d: Date, now: Date) {
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY);
}

/* ------------------------------------------------------------------ */
/* Net sales — one definition for the KPI, the chart and top products  */
/* ------------------------------------------------------------------ */
export const isCounted = (o: Pick<Order, 'status'>) => o.status !== 'cancelled';

/**
 * Net sales of an order (PDF p.38 "Shitje bruto/neto"): products + installation after every discount and
 * refund, without shipping; VAT included (prices are gross). Cancelled orders count 0.
 */
export function netSales(o: Order): number {
  if (!isCounted(o)) return 0;
  return Math.max(0, r2(o.total - o.shipping - refundedOf(o)));
}

/* ------------------------------------------------------------------ */
/* Period windows                                                       */
/* ------------------------------------------------------------------ */
export interface Range {
  start: Date;
  /** exclusive */
  end: Date;
}

/**
 * Current window = the last N calendar days (today included, so far). The comparison window has exactly the
 * same length one period earlier ("today until 12:14" vs "yesterday until 12:14").
 */
export function periodRanges(p: Period, now: Date) {
  const days = periodDays(p);
  const start = addDays(startOfDay(now), -(days - 1));
  const elapsed = now.getTime() - start.getTime();
  const prevStart = addDays(start, -days);
  return {
    days,
    current: { start, end: new Date(now.getTime() + 1) } as Range,
    previous: { start: prevStart, end: new Date(prevStart.getTime() + elapsed + 1) } as Range,
  };
}

const inRange = (iso: string, r: Range) => {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
};

/* ------------------------------------------------------------------ */
/* Window stats                                                        */
/* ------------------------------------------------------------------ */
export interface TopProduct {
  productId: string;
  name: string;
  image: string;
  unit: Unit;
  /** pieces / metres / sets, or m² for m2 products */
  units: number;
  net: number;
}

export interface WindowStats {
  net: number;
  /** every order placed in the window, cancelled included */
  orders: number;
  byStatus: Record<OrderStatus, number>;
  top: TopProduct[];
  /** contacts (inquiries) received in the window */
  contacts: number;
}

export function windowStats(orders: Order[], inquiries: Inquiry[], r: Range): WindowStats {
  const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<OrderStatus, number>;
  const top = new Map<string, TopProduct>();
  let net = 0;
  let count = 0;
  for (const o of orders) {
    if (!inRange(o.createdAt, r)) continue;
    count++;
    byStatus[o.status]++;
    if (!isCounted(o)) continue;
    net += netSales(o);
    o.items.forEach((l, i) => {
      if (!l.productId) return;
      const row = top.get(l.productId) ?? { productId: l.productId, name: l.name, image: l.image, unit: l.unit, units: 0, net: 0 };
      row.units += orderLineUnits(l);
      row.net += orderLineNet(o, i);
      top.set(l.productId, row);
    });
  }
  return {
    net: r2(net),
    orders: count,
    byStatus,
    top: [...top.values()].sort((a, b) => b.net - a.net).slice(0, 5),
    contacts: inquiries.filter((q) => inRange(q.createdAt, r)).length,
  };
}

/** % change, or null when there is nothing to compare against. */
export function pctChange(cur: number, prev: number, comparable: boolean) {
  if (!comparable || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

/** The comparison window only means something if the shop already had orders back then. */
export function isComparable(orders: Order[], previous: Range) {
  let first = Infinity;
  for (const o of orders) first = Math.min(first, new Date(o.createdAt).getTime());
  return first <= previous.start.getTime() + DAY;
}

/* ------------------------------------------------------------------ */
/* Chart buckets                                                       */
/* ------------------------------------------------------------------ */
export type Step = 'hour' | 'day' | 'week';

export interface Bucket {
  start: Date;
  /** exclusive */
  end: Date;
  net: number;
  /** non-cancelled orders behind `net` */
  orders: number;
  /** bucket containing "now" — still in progress */
  current: boolean;
  /** starts after "now" (later hours of today) */
  future: boolean;
}

/** Today → 24 hourly buckets; 7/30 days → daily; 90 days → weekly buckets anchored on today. Oldest first. */
export function buildBuckets(orders: Order[], now: Date, p: Period): { buckets: Bucket[]; step: Step } {
  const today = startOfDay(now);
  const buckets: Bucket[] = [];
  let step: Step;
  if (p === 'today') {
    step = 'hour';
    for (let h = 0; h < 24; h++) {
      const start = new Date(today);
      start.setHours(h);
      const end = new Date(today);
      end.setHours(h + 1);
      buckets.push({ start, end, net: 0, orders: 0, current: now >= start && now < end, future: start > now });
    }
  } else {
    const days = periodDays(p);
    const size = p === '90' ? 7 : 1;
    step = size === 7 ? 'week' : 'day';
    const windowStart = addDays(today, -(days - 1));
    let end = addDays(today, 1);
    while (end > windowStart) {
      let start = addDays(end, -size);
      if (start < windowStart) start = windowStart;
      buckets.unshift({ start, end, net: 0, orders: 0, current: buckets.length === 0, future: false });
      end = start;
    }
  }
  const first = buckets[0].start.getTime();
  const last = buckets[buckets.length - 1].end.getTime();
  for (const o of orders) {
    if (!isCounted(o)) continue;
    const t = new Date(o.createdAt).getTime();
    if (t < first || t >= last) continue;
    const b = buckets.find((x) => t >= x.start.getTime() && t < x.end.getTime());
    if (!b) continue;
    b.net = r2(b.net + netSales(o));
    b.orders += 1;
  }
  return { buckets, step };
}

/** Clean y-axis ticks (0 … niceMax) for roughly `count` intervals. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 250, 500, 750, 1000];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v));
  return ticks;
}

/* ------------------------------------------------------------------ */
/* "Kërkojnë vëmendje" queues (PDF p.08 / p.38 operational reports)     */
/* ------------------------------------------------------------------ */
/** Tracked, non-archived products at or below LOW_STOCK, lowest first. */
export function lowStockProducts(products: Product[]) {
  return products
    .filter((p) => p.status !== 'archived' && p.stock < 999 && p.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock || a.sku.localeCompare(b.sku));
}

/** Open (not cancelled) orders whose payment is still outstanding. */
export function pendingPayments(orders: Order[]) {
  return orders.filter((o) => {
    if (!isCounted(o)) return false;
    const s = paymentOf(o);
    return s === 'pending' || s === 'authorized' || s === 'failed';
  });
}

/** Not-cancelled orders that have not (fully) left the warehouse, oldest first. */
export function unfulfilledOrders(orders: Order[]) {
  return orders
    .filter((o) => isCounted(o) && (fulfillmentOf(o) === 'unfulfilled' || fulfillmentOf(o) === 'partial'))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Bookings the customer asked for that nobody confirmed yet, soonest first. */
export function pendingBookings(bookings: Booking[]) {
  return bookings.filter((b) => b.status === 'pending').sort((a, b) => a.start.localeCompare(b.start));
}

/** Open contacts with no one responsible, newest first. */
export function unassignedContacts(inquiries: Inquiry[]) {
  return inquiries.filter((q) => q.status !== 'done' && !q.assignee).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Running offers that end within OFFER_WARN_DAYS, soonest first. */
export function expiringOffers(offers: Offer[], now: Date) {
  const limit = now.getTime() + OFFER_WARN_DAYS * DAY;
  return offers
    .filter((o) => o.endsAt && offerState(o, now) === 'active' && new Date(o.endsAt).getTime() <= limit)
    .sort((a, b) => (a.endsAt ?? '').localeCompare(b.endsAt ?? ''));
}

/** Returns waiting for a decision or for the goods. */
export function openReturns(returns: ReturnRequest[]) {
  return returns.filter((r) => r.status === 'requested' || r.status === 'approved').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */
export function campaignSummary(offers: Offer[], now: Date) {
  const active: Offer[] = [];
  let scheduled = 0;
  let drafts = 0;
  for (const o of offers) {
    const s = offerState(o, now);
    if (s === 'active') active.push(o);
    else if (s === 'scheduled') scheduled++;
    else if (s === 'draft') drafts++;
  }
  active.sort((a, b) => b.metrics.revenue - a.metrics.revenue);
  return { active, scheduled, drafts };
}
