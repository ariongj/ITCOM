// Collection helpers for the CMS (PDF p.14): rule vocabulary, human summaries and where a collection is used.
import type { Badge, Category, Collection, CollectionRule, CollectionRuleField, Db, L10n, MenuItem, RuleOp } from '@/lib/types';
import type { CdKey } from './dict';

type T = (key: CdKey, vars?: Record<string, string | number>) => string;

export const RULE_FIELDS: CollectionRuleField[] = ['category', 'tag', 'price', 'compareAt', 'stock', 'vendor', 'title', 'onSale', 'badge', 'status'];

/** Operators that make sense per field (matchesRule in lib/collections.ts). */
export const OPS: Record<CollectionRuleField, RuleOp[]> = {
  category: ['eq', 'neq'],
  tag: ['eq', 'neq', 'contains'],
  price: ['gt', 'lt', 'eq', 'neq'],
  compareAt: ['gt', 'lt', 'eq', 'neq'],
  stock: ['gt', 'lt', 'eq', 'neq'],
  vendor: ['eq', 'neq', 'contains'],
  title: ['contains', 'neq'],
  onSale: ['eq'],
  badge: ['eq', 'neq'],
  status: ['eq', 'neq'],
};

export const BADGES: Badge[] = ['new', 'sale', 'bestseller', 'premium'];
export const isNumeric = (f: CollectionRuleField) => f === 'price' || f === 'compareAt' || f === 'stock';

export function defaultRule(field: CollectionRuleField = 'category', categories: Category[] = []): CollectionRule {
  const op = OPS[field][0];
  const value = field === 'category' ? (categories[0]?.id ?? '') : field === 'onSale' ? 'true' : field === 'status' ? 'active' : field === 'badge' ? 'new' : '';
  return { field, op, value };
}

/** "Kategoria është Syze dielli" — for lists and previews. */
export function ruleText(r: CollectionRule, ctx: { t: T; l: (v: L10n) => string; categories: Category[]; badge: (b: string) => string; status: (s: string) => string; money: (v: number) => string }) {
  const { t, l, categories } = ctx;
  let value = r.value;
  if (r.field === 'category') value = l(categories.find((c) => c.id === r.value)?.name ?? { me: r.value, sq: r.value, en: r.value });
  else if (r.field === 'onSale') value = /^(true|1|da|po|yes)$/i.test(r.value) ? t('yes') : t('no');
  else if (r.field === 'badge') value = ctx.badge(r.value);
  else if (r.field === 'status') value = ctx.status(r.value);
  else if (r.field === 'price' || r.field === 'compareAt') value = Number.isFinite(Number(r.value.replace(',', '.'))) && r.value !== '' ? ctx.money(Number(r.value.replace(',', '.'))) : r.value;
  return `${t(`field_${r.field}` as CdKey)} ${t(`op_${r.op}` as CdKey)} ${value || '…'}`;
}

export interface CollectionUsage {
  discounts: { id: string; title: string }[];
  offers: { id: string; name: L10n }[];
  menus: { id: string; title: string }[];
}

const menuHas = (items: MenuItem[], c: Collection): boolean => items.some((i) => (i.type === 'collection' && (i.target === c.id || i.target === c.slug)) || menuHas(i.children ?? [], c));

export function collectionUsage(c: Collection, db: Pick<Db, 'discounts' | 'offers' | 'menus'>): CollectionUsage {
  return {
    discounts: db.discounts
      .filter((d) => (d.appliesTo.scope === 'collections' && d.appliesTo.ids.includes(c.id)) || (d.bxgy && ((d.bxgy.buyScope === 'collections' && d.bxgy.buyIds.includes(c.id)) || (d.bxgy.getScope === 'collections' && d.bxgy.getIds.includes(c.id)))))
      .map((d) => ({ id: d.id, title: d.title })),
    offers: db.offers.filter((o) => o.collectionId === c.id).map((o) => ({ id: o.id, name: o.name })),
    menus: db.menus.filter((m) => menuHas(m.items, c)).map((m) => ({ id: m.id, title: m.title })),
  };
}

export const usageCount = (u: CollectionUsage) => u.discounts.length + u.offers.length + u.menus.length;

export function uniqueCollectionSlug(base: string, selfId: string, list: Pick<Collection, 'id' | 'slug'>[]) {
  const root = base || 'kolekcija';
  let s = root;
  let n = 2;
  while (list.some((c) => c.slug === s && c.id !== selfId)) s = `${root}-${n++}`;
  return s;
}
