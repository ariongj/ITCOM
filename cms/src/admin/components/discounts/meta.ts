// Pure helpers of the Discounts module: defaults, code generator, store-time-zone date handling, CSV.
import { BadgePercent, Gift, ReceiptText, Truck, type LucideIcon } from 'lucide-react';
import { discountState, isDuplicateCode, normalizeCode } from '@/lib/discounts';
import type { Discount, DiscountKind, DiscountState, Lang, Order } from '@/lib/types';
import { round2 } from '@/lib/utils';

export const KINDS: DiscountKind[] = ['products', 'order', 'bxgy', 'shipping'];
export const KIND_ICON: Record<DiscountKind, LucideIcon> = { products: BadgePercent, order: ReceiptText, bxgy: Gift, shipping: Truck };
export const isKind = (v: string | null | undefined): v is DiscountKind => !!v && (KINDS as string[]).includes(v);

export const STATES: DiscountState[] = ['active', 'scheduled', 'draft', 'paused', 'expired'];

/** Same locales the shared date() helper uses. */
export const DATE_LOCALE: Record<Lang, string> = { me: 'sr-Latn', sq: 'sq-AL', en: 'en-GB' };

/** A fresh rule with the defaults the PDF form suggests per type. Starts now, status draft. */
export function newDiscount(kind: DiscountKind, now = new Date()): Discount {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const base: Discount = {
    id: `d-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`,
    title: '',
    publicTitle: { me: '', sq: '', en: '' },
    kind,
    method: kind === 'order' ? 'code' : 'auto',
    code: '',
    valueType: 'percent',
    value: 10,
    appliesTo: { scope: 'all', ids: [] },
    perItem: false,
    minimum: { type: 'none', value: 0 },
    audience: { type: 'all' },
    combines: { products: true, order: false, shipping: true },
    oncePerCustomer: false,
    startsAt: start.toISOString(),
    status: 'draft',
    uses: 0,
    createdAt: now.toISOString(),
    tags: [],
  };
  if (kind === 'products') return { ...base, value: 15, appliesTo: { scope: 'collections', ids: [] }, combines: { products: false, order: true, shipping: true } };
  if (kind === 'bxgy')
    return {
      ...base,
      value: 100,
      bxgy: { buyIds: [], buyScope: 'products', buyQty: 2, getIds: [], getScope: 'products', getQty: 1, getType: 'free', getValue: 100, maxUses: 1 },
      combines: { products: false, order: true, shipping: true },
    };
  if (kind === 'shipping')
    return { ...base, value: 100, minimum: { type: 'amount', value: 150 }, shipping: { zoneIds: [] }, combines: { products: true, order: true, shipping: false } };
  return base;
}

const WORDS = ['MIFTARI', 'OPTIKA', 'SYZE', 'DIELLI', 'LENTE', 'KORNIZA', 'MIRESEVINI', 'VERA', 'SHKOLLA', 'DIMRI'];
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A memorable, unique code — WORD + value (MIFTARI15) when free, otherwise MIFTARI-XXXXX. */
export function generateCode(d: Pick<Discount, 'id' | 'valueType' | 'value' | 'kind'>, all: Discount[], current?: string) {
  const v = d.kind === 'shipping' || d.kind === 'bxgy' ? '' : String(Math.round(d.value || 0) || '');
  const words = [...WORDS].sort(() => Math.random() - 0.5);
  for (const w of words) {
    const c = `${w}${v}`;
    if (c !== normalizeCode(current) && !isDuplicateCode(c, all, d.id)) return c;
  }
  for (let i = 0; i < 50; i++) {
    let s = '';
    for (let k = 0; k < 5; k++) s += ALNUM[Math.floor(Math.random() * ALNUM.length)];
    const c = `MIFTARI-${s}`;
    if (!isDuplicateCode(c, all, d.id)) return c;
  }
  return `MIFTARI-${Date.now().toString(36).toUpperCase()}`;
}

export const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

/* ------------------------------------------------------------------ */
/* Store time zone (settings.timezone) — schedules are entered there   */
/* ------------------------------------------------------------------ */

/** Offset (ms) of `tz` from UTC at instant `at`. */
export function tzOffset(tz: string, at: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
    const m: Record<string, number> = {};
    for (const p of parts) if (p.type !== 'literal') m[p.type] = Number(p.value);
    const asUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second);
    return asUtc - Math.floor(at.getTime() / 1000) * 1000;
  } catch {
    return -at.getTimezoneOffset() * 60000;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO instant → "YYYY-MM-DDTHH:mm" wall time in the store zone (for <input type="datetime-local">). */
export function isoToZoned(iso: string | undefined, tz: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const w = new Date(d.getTime() + tzOffset(tz, d));
  return `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}T${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}`;
}

/** "YYYY-MM-DDTHH:mm" wall time in the store zone → ISO instant. */
export function zonedToIso(local: string, tz: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return undefined;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = guess - tzOffset(tz, new Date(guess));
  const off2 = tzOffset(tz, new Date(t));
  if (guess - off2 !== t) t = guess - off2;
  return new Date(t).toISOString();
}

/** "Europe/Belgrade (UTC+2)" */
export function tzLabel(tz: string, at = new Date()) {
  const mins = Math.round(tzOffset(tz, at) / 60000);
  const sign = mins >= 0 ? '+' : '−';
  const h = Math.floor(Math.abs(mins) / 60);
  const mm = Math.abs(mins) % 60;
  return `${tz} (UTC${sign}${h}${mm ? `:${pad(mm)}` : ''})`;
}

/*
 * Chrome ships without Albanian (sq) date data — Intl silently falls back to English ("5 Oct 2026").
 * Albanian dates are therefore formatted by hand with the standard short month names.
 */
const SQ_MONTHS = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'];

/** Wall-clock parts of an instant in the store zone. */
function wallParts(iso: string, tz: string) {
  const d = new Date(iso);
  const w = new Date(d.getTime() + tzOffset(tz, d));
  return { y: w.getUTCFullYear(), m: w.getUTCMonth(), d: w.getUTCDate(), time: `${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}` };
}

/** Short date in the store zone. */
export function fmtDate(iso: string, lang: Lang, tz: string, withTime = false) {
  if (lang === 'sq') {
    const p = wallParts(iso, tz);
    return `${p.d} ${SQ_MONTHS[p.m]} ${p.y}${withTime ? `, ${p.time}` : ''}`;
  }
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz, ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) };
  try {
    return new Intl.DateTimeFormat(DATE_LOCALE[lang], opts).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString();
  }
}

/** "1 – 7 Oct 2026" style range in the store zone. */
export function fmtRange(startIso: string, endIso: string, lang: Lang, tz: string) {
  if (lang === 'sq') {
    const a = wallParts(startIso, tz);
    const b = wallParts(endIso, tz);
    if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${SQ_MONTHS[a.m]} ${a.y}`;
    if (a.y === b.y) return `${a.d} ${SQ_MONTHS[a.m]} – ${b.d} ${SQ_MONTHS[b.m]} ${b.y}`;
    return `${fmtDate(startIso, lang, tz)} – ${fmtDate(endIso, lang, tz)}`;
  }
  try {
    const f = new Intl.DateTimeFormat(DATE_LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz });
    return f.formatRange(new Date(startIso), new Date(endIso));
  } catch {
    return `${fmtDate(startIso, lang, tz)} – ${fmtDate(endIso, lang, tz)}`;
  }
}

/** Whole days between now and an instant (ceil, ≥ 0). */
export const daysUntil = (iso: string, now = Date.now()) => Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86400000));

/* ------------------------------------------------------------------ */
/* Performance from orders                                             */
/* ------------------------------------------------------------------ */
export interface DiscountPerf {
  orders: number;
  given: number;
  sales: number;
}

export function perfByDiscount(orders: Order[]): Map<string, DiscountPerf> {
  const out = new Map<string, DiscountPerf>();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const a of o.discounts ?? []) {
      const p = out.get(a.id) ?? { orders: 0, given: 0, sales: 0 };
      p.orders += 1;
      p.given = round2(p.given + a.amount);
      p.sales = round2(p.sales + o.total);
      out.set(a.id, p);
    }
  }
  return out;
}

export const stateOf = (d: Discount, now?: number) => discountState(d, now);

/** Clipboard with a fallback for non-secure contexts. */
export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */
export function discountsCsv(list: Discount[], now = Date.now()) {
  const head = ['id', 'title', 'kind', 'method', 'code', 'valueType', 'value', 'minimumType', 'minimumValue', 'audience', 'combines', 'usageLimit', 'oncePerCustomer', 'uses', 'state', 'startsAt', 'endsAt', 'tags'];
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = list.map((d) =>
    [
      d.id,
      d.title,
      d.kind,
      d.method,
      d.method === 'code' ? d.code : '',
      d.valueType,
      d.value,
      d.minimum.type,
      d.minimum.value,
      d.audience.type === 'segment' ? d.audience.segmentId : 'all',
      (['products', 'order', 'shipping'] as const).filter((k) => d.combines[k]).join('|'),
      d.usageLimit ?? '',
      d.oncePerCustomer ? 'yes' : 'no',
      d.uses,
      discountState(d, now),
      d.startsAt,
      d.endsAt ?? '',
      (d.tags ?? []).join('|'),
    ]
      .map(esc)
      .join(','),
  );
  return '﻿' + [head.join(','), ...rows].join('\n');
}
