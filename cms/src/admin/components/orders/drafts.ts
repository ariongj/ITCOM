// Draft orders (PDF p.17 "Drafti ka klient, artikuj katalogu ose artikull custom, zbritje, dërgesë, taksa, tags dhe shënime").
// Totals use the SAME path as convertDraft → buildOrder (priceCart + custom lines), so the editor shows exactly what the order will be.
import { priceCart, type Totals } from '@/lib/pricing';
import { customerKeyOf } from '@/lib/crm';
import { round2 } from '@/lib/utils';
import type { CartItem, Collection, Customer, Discount, DraftOrder, Lang, Order, Product, Settings } from '@/lib/types';

export interface DraftTotals extends Totals {
  customTotal: number;
  /** Catalogue lines + custom lines − discounts + shipping (what the order total will be) */
  grandTotal: number;
  grandVat: number;
  /** Catalogue + custom lines before discounts */
  grandSubtotal: number;
}

export function draftTotals(d: DraftOrder, ctx: { products: Product[]; settings: Settings; discounts: Discount[]; collections: Collection[] }): DraftTotals {
  const totals = priceCart(d.items, ctx.products, ctx.settings, {
    lang: d.lang ?? 'me',
    codes: d.discountCodes,
    discounts: ctx.discounts,
    collections: ctx.collections,
    delivery: d.delivery,
    city: d.customer.city,
  });
  const customTotal = round2(validCustomLines(d).reduce((s, c) => s + c.price * c.qty, 0));
  const grandTotal = round2(totals.total + customTotal);
  return {
    ...totals,
    customTotal,
    grandTotal,
    grandSubtotal: round2(totals.subtotal + customTotal),
    grandVat: round2(grandTotal - grandTotal / (1 + ctx.settings.vatRate / 100)),
  };
}

export const validCustomLines = (d: Pick<DraftOrder, 'customLines'>) => d.customLines.filter((c) => c.title.trim() && c.qty > 0);

/** Stable cart-line key (same format as the seed): product | sorted options | installation. */
export function lineKey(productId: string, options: Record<string, string>, installation: boolean) {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('&');
  return `${productId}|${opts}|${installation ? 'i' : ''}`;
}

/** Merge lines that ended up with the same key (same product, options and installation). */
export function normalizeItems(items: CartItem[]): CartItem[] {
  const out: CartItem[] = [];
  for (const it of items) {
    const key = lineKey(it.productId, it.options, it.installation);
    const same = out.find((x) => x.key === key);
    if (same) same.qty += it.qty;
    else out.push({ ...it, key });
  }
  return out;
}

export function nextDraftNumber(drafts: DraftOrder[]) {
  const max = drafts.reduce((m, d) => Math.max(m, Number(d.number.replace(/\D/g, '')) || 0), 1000);
  return `D-${max + 1}`;
}

export function blankDraft(lang: Lang, createdBy?: string): DraftOrder {
  return {
    id: '',
    number: '',
    createdAt: new Date().toISOString(),
    customer: { firstName: '', lastName: '', email: '', phone: '', city: '', address: '' },
    items: [],
    customLines: [],
    discountCodes: [],
    delivery: 'delivery',
    payment: 'bank',
    note: '',
    tags: [],
    status: 'open',
    ...(createdBy ? { createdBy } : {}),
    lang,
  };
}

export const draftCustomerName = (d: Pick<DraftOrder, 'customer'>) => `${d.customer.firstName ?? ''} ${d.customer.lastName ?? ''}`.trim();

/** Known customers (from orders, newest data wins) for the draft customer picker. */
export interface KnownCustomer {
  key: string;
  customer: Customer;
  lang: Lang;
  orders: number;
}
export function knownCustomers(orders: Order[]): KnownCustomer[] {
  const map = new Map<string, KnownCustomer>();
  const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const o of sorted) {
    const key = customerKeyOf(o);
    const hit = map.get(key);
    if (hit) hit.orders++;
    else map.set(key, { key, customer: o.customer, lang: o.lang, orders: 1 });
  }
  return [...map.values()];
}

/** What is missing before a draft can be converted / invoiced. */
export function draftProblems(d: DraftOrder, opts: { needEmail?: boolean } = {}) {
  const p: ('lines' | 'name' | 'contact' | 'email' | 'city' | 'address')[] = [];
  if (!d.items.length && !validCustomLines(d).length) p.push('lines');
  if (!d.customer.firstName?.trim()) p.push('name');
  if (!d.customer.phone?.trim() && !d.customer.email?.trim()) p.push('contact');
  if (opts.needEmail && !d.customer.email?.trim()) p.push('email');
  if (d.delivery === 'delivery') {
    if (!d.customer.city?.trim()) p.push('city');
    if (!d.customer.address?.trim()) p.push('address');
  }
  return p;
}
