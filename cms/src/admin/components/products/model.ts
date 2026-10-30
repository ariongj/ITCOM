// Catalogue model helpers for the CMS product screens (PDF pp.09–13).
//
// The shared `Product` type has one stock number and no per-variant data, so the editor keeps the
// "Variantet & inventari" table (SKU / stock / on-off per option combination), shipping data and URL
// redirects as optional extension fields on the stored product (`ProductX`). Everything else in the
// app keeps reading `product.stock`, which always equals the sum of the enabled variants.
import type { Category, Collection, Db, L10n, Product, ProductOption, ProductOptionValue } from '@/lib/types';
import { UNTRACKED_STOCK } from '@/lib/inventory';
import { basePrice } from '@/lib/pricing';
import { round2, slugify, uid } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Extension fields                                                    */
/* ------------------------------------------------------------------ */
export interface Variant {
  id: string;
  /** Canonical identity: "optionId:valueId|…" sorted by option id — label renames keep it */
  key: string;
  values: Record<string, string>;
  sku: string;
  stock: number;
  /** false = combination not sold (removed invalid combination) */
  enabled: boolean;
}

export interface ShippingInfo {
  /** Physical product shipped to the customer (false = service / digital) */
  physical: boolean;
  /** kg */
  weight?: number;
  /** cm */
  length?: number;
  width?: number;
  height?: number;
}

export type ProductX = Product & { variants?: Variant[]; shipping?: ShippingInfo; redirects?: string[] };

export const isTracked = (p: Pick<Product, 'stock'>) => p.stock < UNTRACKED_STOCK;
export const MAX_TRACKED = UNTRACKED_STOCK - 1;
export const LOW_STOCK = 5;

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */
export function variantKey(values: Record<string, string>) {
  return Object.keys(values)
    .sort()
    .map((k) => `${k}:${values[k]}`)
    .join('|');
}

/** Options that can generate variants (at least one value). */
const usable = (options: ProductOption[]) => options.filter((o) => o.values.length > 0);

/** Every option combination, in option order. */
export function combos(options: ProductOption[]): Record<string, string>[] {
  const list = usable(options);
  if (!list.length) return [];
  let out: Record<string, string>[] = [{}];
  for (const o of list) {
    const next: Record<string, string>[] = [];
    for (const c of out) for (const v of o.values) next.push({ ...c, [o.id]: v.id });
    out = next;
  }
  return out;
}

/** Short SKU code for an option value: seeded ids ("frame", "rx", "black") or initials of the SQ label. */
export function valueCode(v: ProductOptionValue, index: number) {
  if (/^[a-z0-9]{1,8}$/i.test(v.id)) return v.id.toUpperCase();
  const words = slugify(v.label.sq || v.label.en || v.label.me).split('-').filter(Boolean);
  const code = words.length > 1 ? words.map((w) => w.slice(0, 3)).join('') : (words[0] ?? '').slice(0, 6);
  return (code || String(index + 1)).toUpperCase().slice(0, 8);
}

export function variantSku(base: string, options: ProductOption[], values: Record<string, string>) {
  const parts = usable(options).map((o) => {
    const i = o.values.findIndex((v) => v.id === values[o.id]);
    return i < 0 ? '' : valueCode(o.values[i], i);
  });
  return [base.trim() || 'SKU', ...parts.filter(Boolean)].join('-');
}

export function variantLabel(options: ProductOption[], values: Record<string, string>, l: (v: L10n) => string) {
  return usable(options)
    .map((o) => {
      const v = o.values.find((x) => x.id === values[o.id]);
      return v ? l(v.label) || '—' : '—';
    })
    .join(' / ');
}

/** Swatch colour of the first swatch option in a combination (for the table dot). */
export function variantSwatch(options: ProductOption[], values: Record<string, string>) {
  const o = options.find((x) => x.type === 'swatch');
  return o?.values.find((v) => v.id === values[o.id])?.swatch;
}

/** Price of one combination = active product price + option surcharges. */
export function variantPrice(p: Pick<Product, 'price' | 'salePrice' | 'options'>, values: Record<string, string>) {
  let delta = 0;
  for (const o of p.options) delta += o.values.find((v) => v.id === values[o.id])?.priceDelta ?? 0;
  return round2(basePrice(p as Product) + delta);
}

/** Spread a stock number over n variants (deterministic: the first ones get the remainder). */
function spread(total: number, n: number): number[] {
  if (n <= 0) return [];
  const each = Math.floor(total / n);
  const rest = total - each * n;
  return Array.from({ length: n }, (_, i) => each + (i < rest ? 1 : 0));
}

export function defaultVariants(p: Pick<Product, 'options' | 'sku' | 'stock'>): Variant[] {
  const list = combos(p.options);
  const stocks = spread(isTracked(p) ? Math.max(0, p.stock) : 0, list.length);
  return list.map((values, i) => ({ id: uid('var'), key: variantKey(values), values, sku: variantSku(p.sku, p.options, values), stock: stocks[i], enabled: true }));
}

/**
 * Re-generate the combinations after the options changed, keeping each variant's identity, SKU and stock:
 * exact matches stay as they are; a new option inherits the old stock on its first value; a removed option
 * merges the stock of the combinations it collapses.
 */
export function syncVariants(options: ProductOption[], prev: Variant[], baseSku: string): Variant[] {
  const list = combos(options);
  const byKey = new Map(prev.map((v) => [v.key, v]));
  const optIds = new Set(usable(options).map((o) => o.id));
  const firstValue = new Map(usable(options).map((o) => [o.id, o.values[0].id]));
  const used = new Set<string>();
  const fresh = new Set<Variant>();
  const out = list.map((values): Variant => {
    const key = variantKey(values);
    const exact = byKey.get(key);
    if (exact) {
      used.add(exact.id);
      return { ...exact, values };
    }
    const v: Variant = { id: uid('var'), key, values, sku: variantSku(baseSku, options, values), stock: 0, enabled: true };
    fresh.add(v);
    return v;
  });
  // Carry the stock of combinations that no longer exist to the new combination that replaces them.
  for (const old of prev) {
    if (used.has(old.id) || !old.stock) continue;
    const shared = Object.keys(old.values).filter((k) => optIds.has(k));
    const target = out.find(
      (v) =>
        fresh.has(v) &&
        shared.every((k) => v.values[k] === old.values[k]) &&
        // a newly added option: only its first value inherits the stock
        Object.keys(v.values).every((k) => old.values[k] !== undefined || v.values[k] === firstValue.get(k)),
    );
    if (target) target.stock += old.stock;
  }
  return out;
}

/** Make the variant stocks add up to the product stock again (orders reduce `product.stock` only). */
export function reconcileVariants(variants: Variant[], stock: number): Variant[] {
  const live = variants.filter((v) => v.enabled);
  if (!live.length) return variants;
  let diff = stock - live.reduce((s, v) => s + v.stock, 0);
  if (!diff) return variants;
  const next = variants.map((v) => ({ ...v }));
  const pool = next.filter((v) => v.enabled);
  if (diff > 0) pool[0].stock += diff;
  while (diff < 0) {
    const top = pool.reduce((a, b) => (b.stock > a.stock ? b : a));
    if (top.stock <= 0) break;
    top.stock -= 1;
    diff += 1;
  }
  return next;
}

/** Stored variants (synced to the current options and stock) or generated defaults. */
export function variantsOf(p: ProductX): Variant[] {
  if (!usable(p.options).length) return [];
  const stored = p.variants?.length ? syncVariants(p.options, p.variants, p.sku) : defaultVariants(p);
  return isTracked(p) ? reconcileVariants(stored, p.stock) : stored;
}

/** Variants that are sold (enabled). 0 = product without options. */
export function variantCount(p: ProductX) {
  if (!usable(p.options).length) return 0;
  if (!p.variants?.length) return combos(p.options).length;
  return variantsOf(p).filter((v) => v.enabled).length;
}

/** All SKUs a product answers to (product + variants) — search and duplicate checks. */
export function skusOf(p: ProductX): string[] {
  const out = [p.sku, ...(p.variants ?? []).map((v) => v.sku)].map((s) => s?.trim()).filter(Boolean) as string[];
  return [...new Set(out)];
}

/* ------------------------------------------------------------------ */
/* Pricing form ↔ product                                              */
/* ------------------------------------------------------------------ */
/** UI pricing: Çmimi = what the customer pays, Çmimi referues = compare-at (empty ≠ 0). */
export function pricingOf(p: Pick<Product, 'price' | 'salePrice'>): { price: number | null; compareAt: number | null } {
  const sale = p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
  return sale ? { price: p.salePrice as number, compareAt: p.price } : { price: p.price > 0 ? p.price : null, compareAt: null };
}

/** Back to the data model: regular `price` + optional `salePrice` (only when compare-at > price). */
export function applyPricing(price: number | null, compareAt: number | null): Pick<Product, 'price' | 'salePrice'> {
  const pr = price != null && price > 0 ? round2(price) : 0;
  if (compareAt != null && compareAt > pr && pr > 0) return { price: round2(compareAt), salePrice: pr };
  return { price: pr, salePrice: null };
}

/* ------------------------------------------------------------------ */
/* Publishing requirements (p.10 — publishing is blocked when missing) */
/* ------------------------------------------------------------------ */
export type Requirement = 'name' | 'category' | 'price' | 'image';

export function missingForPublish(
  p: Pick<Product, 'name' | 'categoryId' | 'price' | 'images'> & Partial<Pick<Product, 'quoteOnly' | 'template'>>,
  categories: Pick<Category, 'id'>[],
): Requirement[] {
  const out: Requirement[] = [];
  // Albanian is the source language of the catalogue (the `me` slot holds the optional Serbian copy).
  if (!p.name.sq.trim()) out.push('name');
  if (!p.categoryId || !categories.some((c) => c.id === p.categoryId)) out.push('category');
  // "request a quote" products may go live without a price — the storefront shows "price on request" (smart glasses)
  if (!(p.price > 0) && !(p.quoteOnly || p.template === 'quote')) out.push('price');
  if (!p.images.length) out.push('image');
  return out;
}

/* ------------------------------------------------------------------ */
/* References — what a delete would touch (p.09 consequences dialog)   */
/* ------------------------------------------------------------------ */
export interface ProductRefs {
  orders: number;
  drafts: number;
  quotes: number;
  purchaseOrders: number;
  /** manual collections that list the product */
  collections: Collection[];
  discounts: { id: string; title: string }[];
  offers: { id: string; name: L10n }[];
  /** has history → archive instead of delete */
  history: boolean;
}

type RefDb = Pick<Db, 'orders' | 'drafts' | 'quotes' | 'purchaseOrders' | 'collections' | 'discounts' | 'offers'>;

export function productRefs(id: string, db: RefDb): ProductRefs {
  const orders = db.orders.filter((o) => o.items.some((l) => l.productId === id)).length;
  const drafts = db.drafts.filter((d) => d.status !== 'converted' && d.items.some((i) => i.productId === id)).length;
  const quotes = db.quotes.filter((q) => q.lines.some((l) => l.productId === id)).length;
  const purchaseOrders = db.purchaseOrders.filter((po) => po.lines.some((l) => l.productId === id)).length;
  const collections = db.collections.filter((c) => c.kind === 'manual' && c.productIds.includes(id));
  const discounts = db.discounts
    .filter((d) => (d.appliesTo.scope === 'products' && d.appliesTo.ids.includes(id)) || (d.bxgy && ((d.bxgy.buyScope === 'products' && d.bxgy.buyIds.includes(id)) || (d.bxgy.getScope === 'products' && d.bxgy.getIds.includes(id)))))
    .map((d) => ({ id: d.id, title: d.title }));
  const offers = db.offers.filter((o) => o.productIds.includes(id)).map((o) => ({ id: o.id, name: o.name }));
  return { orders, drafts, quotes, purchaseOrders, collections, discounts, offers, history: orders + drafts + quotes + purchaseOrders > 0 };
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
/** Unique slug among products. */
export function uniqueSlug(base: string, selfId: string, products: Pick<Product, 'id' | 'slug'>[]) {
  const root = base || 'produkt';
  let s = root;
  let n = 2;
  while (products.some((p) => p.slug === s && p.id !== selfId)) s = `${root}-${n++}`;
  return s;
}

/** Sorted, de-duplicated values of a string field across products (vendors, tags). */
export function distinct(values: (string | undefined)[]) {
  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}
