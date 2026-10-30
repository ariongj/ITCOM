// Collections — CMS proposal p.14. Manual = hand-picked; smart = rules with ALL/ANY logic, evaluated
// live, so changing a price or a tag updates membership without touching the collection.
import type { Collection, CollectionRule, CollectionSort, Product } from './types';

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj');

const onSale = (p: Product) => p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
/** Active selling price */
const activePrice = (p: Product) => (onSale(p) ? (p.salePrice as number) : p.price);
/** Compare-at (reference) price — empty when not on sale ("empty is not zero", p.11) */
const compareAt = (p: Product): number | null => (onSale(p) ? p.price : null);

function cmpNumber(actual: number | null, op: CollectionRule['op'], raw: string): boolean {
  const v = Number(String(raw).replace(',', '.'));
  if (actual == null) return op === 'neq';
  if (!Number.isFinite(v)) return false;
  switch (op) {
    case 'gt':
      return actual > v;
    case 'lt':
      return actual < v;
    case 'eq':
      return Math.abs(actual - v) < 0.005;
    case 'neq':
      return Math.abs(actual - v) >= 0.005;
    default:
      return false;
  }
}

function cmpText(values: string[], op: CollectionRule['op'], raw: string): boolean {
  const v = fold(raw.trim());
  const list = values.map((x) => fold(x));
  switch (op) {
    case 'eq':
      return list.includes(v);
    case 'neq':
      return !list.includes(v);
    case 'contains':
      return list.some((x) => x.includes(v));
    default:
      return false;
  }
}

/** Does a product satisfy one smart-collection rule? */
export function matchesRule(p: Product, r: CollectionRule): boolean {
  switch (r.field) {
    case 'category':
      return cmpText([p.categoryId], r.op, r.value);
    case 'price':
      return cmpNumber(activePrice(p), r.op, r.value);
    case 'compareAt':
      return cmpNumber(compareAt(p), r.op, r.value);
    case 'stock':
      return cmpNumber(p.stock, r.op, r.value);
    case 'status':
      return cmpText([p.status], r.op, r.value);
    case 'tag':
      return cmpText(p.tags ?? [], r.op, r.value);
    case 'title':
      return cmpText([p.name.me, p.name.sq, p.name.en], r.op === 'eq' ? 'contains' : r.op, r.value);
    case 'vendor':
      return cmpText(p.vendor ? [p.vendor] : [], r.op, r.value);
    case 'onSale': {
      const want = /^(true|1|da|po|yes)$/i.test(r.value.trim());
      return r.op === 'neq' ? onSale(p) !== want : onSale(p) === want;
    }
    case 'badge':
      return cmpText(p.badges, r.op, r.value);
    default:
      return false;
  }
}

/** Membership, ignoring publication status. */
export function inCollection(c: Collection, p: Product): boolean {
  if (c.kind === 'manual') return c.productIds.includes(p.id);
  if (!c.rules.length) return false;
  return c.match === 'any' ? c.rules.some((r) => matchesRule(p, r)) : c.rules.every((r) => matchesRule(p, r));
}

export function sortProducts(list: Product[], sort: CollectionSort, manualOrder: string[] = []): Product[] {
  const out = [...list];
  switch (sort) {
    case 'bestselling':
      return out.sort((a, b) => b.sold - a.sold);
    case 'price-asc':
      return out.sort((a, b) => activePrice(a) - activePrice(b));
    case 'price-desc':
      return out.sort((a, b) => activePrice(b) - activePrice(a));
    case 'newest':
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default: {
      const pos = (id: string) => {
        const i = manualOrder.indexOf(id);
        return i < 0 ? Number.MAX_SAFE_INTEGER : i;
      };
      return out.sort((a, b) => pos(a.id) - pos(b.id));
    }
  }
}

/**
 * Products of a collection, sorted. `publicOnly` (storefront) hides draft/archived products even when
 * they match a rule (p.14 "Produkti draft/arkivuar nuk shfaqet publikisht").
 */
export function collectionProducts(c: Collection, products: Product[], opts: { publicOnly?: boolean } = {}): Product[] {
  const members = products.filter((p) => inCollection(c, p) && (!opts.publicOnly || p.status === 'active'));
  return sortProducts(members, c.sort, c.productIds);
}

/** Collection ids a product belongs to. */
export function collectionIdsFor(p: Product, collections: Collection[]): string[] {
  return collections.filter((c) => inCollection(c, p)).map((c) => c.id);
}

/** productId → collection ids, for many products at once (cart pricing, product list filters). */
export function membershipIndex(collections: Collection[], products: Product[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const p of products) map.set(p.id, collectionIdsFor(p, collections));
  return map;
}
