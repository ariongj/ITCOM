// Shared helpers for the CMS orders area (list, detail, invoice, drafts, returns).
import { Banknote, CreditCard, Landmark, type LucideIcon } from 'lucide-react';
import { lt } from '@/i18n';
import { money, num, unitLabel } from '@/lib/format';
import { fold } from '@/lib/search';
import { customerKeyOf } from '@/lib/crm';
import type { RejectedDiscount } from '@/lib/discounts';
import type { Discount, Lang, Order, OrderLine, OrderStatus, PaymentMethod, Product, Staff } from '@/lib/types';

/* ------------------------------------------------------------------ */
/* Archive (PDF p.17: "Arkivimi është organizim liste, jo rimbursim")   */
/* ------------------------------------------------------------------ */
/**
 * The Order type has no archive field yet, so the orders area stores `archivedAt` next to the order
 * (persisted like any other order field). Archiving only hides the order from the working lists —
 * payment, fulfilment and stock are untouched.
 */
export type ArchivableOrder = Order & { archivedAt?: string };
export const archivedAtOf = (o: Order) => (o as ArchivableOrder).archivedAt;
export const isArchived = (o: Order) => !!archivedAtOf(o);
/** Patch for useDb().updateOrder that archives (iso) or restores (null) an order. */
export const archivePatch = (at: string | null) => ({ archivedAt: at ?? undefined }) as Partial<Order>;

/* ------------------------------------------------------------------ */
/* Channel, customer, staff                                            */
/* ------------------------------------------------------------------ */
export type OrderChannel = 'online' | 'draft';
/** Orders converted from a draft were created by staff; everything else came through the Online Store. */
export const channelOf = (o: Pick<Order, 'draftId'>): OrderChannel => (o.draftId ? 'draft' : 'online');

/** Deep link to the customer profile (Customers page reads `?c=<customer key>`). */
export const customerLink = (o: Pick<Order, 'customer'>) => `/admin/kupci?c=${encodeURIComponent(customerKeyOf(o))}`;

/** "web" / "admin" / staff id → display name. */
export function actorName(by: string | undefined, staff: Staff[], labels: { web: string; admin: string }) {
  if (!by) return '';
  if (by === 'web') return labels.web;
  if (by === 'admin') return labels.admin;
  return staff.find((m) => m.id === by)?.name ?? by;
}

/* ------------------------------------------------------------------ */
/* Carriers (stored as a key on order.fulfillment.carrier)             */
/* ------------------------------------------------------------------ */
export const CARRIERS = ['own', 'courier', 'pickup', 'other'] as const;
export type CarrierKey = (typeof CARRIERS)[number];
export const isCarrierKey = (v: string | undefined): v is CarrierKey => !!v && (CARRIERS as readonly string[]).includes(v);

/* ------------------------------------------------------------------ */
/* Discounts                                                           */
/* ------------------------------------------------------------------ */
/** Shopper-facing name of an applied rule in the admin language, falling back to the stored internal title. */
export function discountName(id: string | undefined, fallback: string, discounts: Discount[], lang: Lang) {
  const d = id ? discounts.find((x) => x.id === id) : undefined;
  return d ? lt(d.publicTitle, lang) || d.title : fallback;
}

type Dict = (key: 'rej_notfound' | 'rej_inactive' | 'rej_scheduled' | 'rej_expired' | 'rej_minimum_amount' | 'rej_minimum_qty' | 'rej_notCombinable' | 'rej_notCombinablePlain' | 'rej_notEligible' | 'rej_usageLimit' | 'rej_audience', vars?: Record<string, string | number>) => string;

/** Explain why the discount engine did not apply a rule (PDF p.23 "Arsyet e refuzimit"). */
export function rejectText(r: RejectedDiscount, t: Dict, lang: Lang, nameOf: (id: string) => string) {
  switch (r.reason) {
    case 'minimum':
      return r.minimumType === 'qty' ? t('rej_minimum_qty', { missing: num(r.missing ?? 0, lang) }) : t('rej_minimum_amount', { missing: money(r.missing ?? 0, lang) });
    case 'notCombinable':
      return r.conflictsWith ? t('rej_notCombinable', { other: nameOf(r.conflictsWith) }) : t('rej_notCombinablePlain');
    default:
      return t(`rej_${r.reason}`);
  }
}

/** The happy-path flow an order moves through (cancelled sits outside it). */
export const ORDER_FLOW: OrderStatus[] = ['new', 'confirmed', 'processing', 'shipped', 'installation', 'completed'];
export const ALL_STATUSES: OrderStatus[] = [...ORDER_FLOW, 'cancelled'];

export function nextStatus(s: OrderStatus): OrderStatus | null {
  const i = ORDER_FLOW.indexOf(s);
  return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
}

export const PAY_ICON: Record<PaymentMethod, LucideIcon> = { cod: Banknote, bank: Landmark, card: CreditCard };

/** timeAgo() falls back to a plain date after 30 days — only worth showing before that. */
export const isRecent = (iso: string) => Date.now() - new Date(iso).getTime() < 30 * 86400000;

export const customerName = (o: Order) => `${o.customer.firstName} ${o.customer.lastName}`.trim();

/** Units a line represents: m² for packaged products (legacy unit, unused in the optical catalogue), otherwise the quantity itself. */
export const lineUnits = (l: OrderLine) => (l.unit === 'm2' && l.packSize ? Math.round(l.qty * l.packSize * 100) / 100 : l.qty);

/** Care+ (stored in the `installation` add-on slot) — priced per frame. */
export const installationAmount = (l: OrderLine) => (l.installation && l.installationPrice ? Math.round(l.installationPrice * lineUnits(l) * 100) / 100 : 0);

/** "2 palë" / "1 copë" — the m² pack form only applies to the legacy m2 unit. */
export function qtyLabel(l: OrderLine, lang: Lang, packsWord: string) {
  if (l.unit === 'm2' && l.packSize) return `${l.qty} ${packsWord} · ${num(lineUnits(l), lang)} m²`;
  return `${num(l.qty, lang)} ${unitLabel(l.unit, lang)}`;
}

/**
 * Order lines are snapshotted in the customer's language. When the product still exists,
 * re-render its name and option summary in the admin's language.
 */
export function localizeLine(l: OrderLine, product: Product | undefined, from: Lang, to: Lang): { name: string; options: string } {
  if (!product || from === to) return { name: product ? lt(product.name, to) : l.name, options: l.options };
  const name = lt(product.name, to);
  if (!l.options) return { name, options: '' };
  const parts: string[] = [];
  for (const o of product.options) {
    const v = o.values.find((x) => l.options.includes(`${lt(o.name, from)}: ${lt(x.label, from)}`));
    if (v) parts.push(`${lt(o.name, to)}: ${lt(v.label, to)}`);
  }
  return { name, options: parts.length ? parts.join(' · ') : l.options };
}

export function mapsUrl(address: string, city: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, city, 'Kosovo'].filter(Boolean).join(', '))}`;
}

/** Case/diacritic-insensitive match on number, name, email, phone (digits only) and city. */
export function matchesOrder(o: Order, query: string) {
  const q = fold(query.trim());
  if (!q) return true;
  const c = o.customer;
  const hay = fold(`${o.number} ${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.city} ${c.company ?? ''}`);
  if (q.split(/\s+/).every((term) => hay.includes(term))) return true;
  const digits = q.replace(/\D/g, '');
  return digits.length >= 3 && c.phone.replace(/\D/g, '').includes(digits);
}

/** Pick a plural form: Serbian (the `me` slot) has one/few/many, Albanian + English one/many. */
export function pluralForm(n: number, lang: Lang): 'one' | 'few' | 'many' {
  if (lang === 'me') {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 'one';
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'few';
    return 'many';
  }
  return n === 1 ? 'one' : 'many';
}

/** "{n} stavka/stavke/stavki" style keys: base_one / base_few / base_many. */
export const pluralKey = <B extends string>(base: B, n: number, lang: Lang) => `${base}_${pluralForm(n, lang)}` as `${B}_one` | `${B}_few` | `${B}_many`;

/** Semicolon CSV (Excel in SQ/SR locales) — values quoted when needed. */
export function toCsv(rows: (string | number)[][]) {
  const cell = (v: string | number) => {
    const s = String(v ?? '');
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

/** 1234.5 → "1234,50" (SQ/SR) or "1234.50" (EN) — plain, spreadsheet friendly. */
export const csvNum = (v: number, lang: Lang) => (lang === 'en' ? v.toFixed(2) : v.toFixed(2).replace('.', ','));
