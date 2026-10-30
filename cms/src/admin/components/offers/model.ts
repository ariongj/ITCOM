// Offers centre — pure helpers (no React): participating products, content summary, link validation,
// pre-activation checks (PDF p.28 "Kontrollet"), UTM parsing and placement scaffolding.
import type {
  Category, CmsPage, Collection, Discount, DiscountState, L10n, Lang, Offer, OfferSlot, Placement, PlacementKind, PlacementPosition, Post, Product,
} from '@/lib/types';
import { collectionProducts } from '@/lib/collections';
import { discountState } from '@/lib/discounts';
import { stockLevels } from '@/lib/inventory';
import { offerState } from '@/lib/offers';
import { plain } from '@/components/ui/misc';
import { uid } from '@/lib/utils';
import type { OfKey } from './i18n';

/** Offer + the fields the editor adds locally (markets the campaign appears in). */
export type OfferX = Offer & { markets?: string[] };
export type RuleMode = 'link' | 'new' | 'none';
export type Step = 1 | 2 | 3;

export const DAY = 86400000;
const E = (): L10n => ({ me: '', sq: '', en: '' });
/** Albanian first (source language), English, then the Serbian copy in the `me` slot. */
export const LANG_CODES: Lang[] = ['sq', 'en', 'me'];

export function emptyOffer(ownerId: string): OfferX {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 14 * DAY - 60000);
  return {
    id: uid('of'),
    slug: '',
    name: E(),
    description: E(),
    status: 'draft',
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    productIds: [],
    badge: E(),
    image: '',
    landing: { title: E(), text: E() },
    placements: [],
    owner: ownerId,
    utm: '',
    metrics: { visits: 0, ctaClicks: 0, codeUses: 0, orders: 0, revenue: 0, discountTotal: 0 },
    createdAt: new Date().toISOString(),
    markets: ['mk-me'],
  };
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */
const pad = (n: number) => String(n).padStart(2, '0');
/** ISO → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fromLocalInput(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
const ms = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);
/** Same minute? (dates copied from a rule are compared loosely) */
export const sameMoment = (a?: string, b?: string) => (!a && !b) || (!!a && !!b && Math.abs(ms(a) - ms(b)) < 60000);

// Own month names: some Chromium builds ship without Albanian date data and would print English months.
const MONTHS: Record<Lang, string[]> = {
  me: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'],
  sq: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
/** "26. sep" (ME) · "26 shtator" (SQ) · "26 Sep" (EN), optionally with the year and the time. */
export function fmtDay(iso: string, lang: Lang, opts: { year?: boolean; time?: boolean } = {}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = MONTHS[lang][d.getMonth()];
  let s = lang === 'me' ? `${d.getDate()}. ${m}` : `${d.getDate()} ${m}`;
  if (opts.year) s += lang === 'me' ? ` ${d.getFullYear()}.` : ` ${d.getFullYear()}`;
  if (opts.time) s += `, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return s;
}
/** "26. sep – 17. okt" style range (year only when it differs from now). */
export function rangeLabel(start: string, end: string | undefined, lang: Lang, openLabel: string) {
  const y = new Date().getFullYear();
  const f = (iso: string) => fmtDay(iso, lang, { year: new Date(iso).getFullYear() !== y });
  return `${f(start)} – ${end ? f(end) : openLabel}`;
}
export const fullDate = (iso: string, lang: Lang) => fmtDay(iso, lang, { year: true, time: true });

/* ------------------------------------------------------------------ */
/* Participating products                                              */
/* ------------------------------------------------------------------ */
export type ProductSource = 'collection' | 'products' | 'all';

export function sourceOf(o: Pick<Offer, 'collectionId' | 'productIds'>, discount?: Discount): ProductSource {
  if (o.collectionId) return 'collection';
  if (o.productIds.length) return 'products';
  return discount && discount.appliesTo.scope === 'all' && discount.kind !== 'bxgy' ? 'all' : 'products';
}

/** Products the offer promotes: the collection's members (any status) plus hand-picked ones. */
export function offerProducts(o: Pick<Offer, 'collectionId' | 'productIds'>, products: Product[], collections: Collection[]) {
  const collection = o.collectionId ? collections.find((c) => c.id === o.collectionId) : undefined;
  const fromCol = collection ? collectionProducts(collection, products) : [];
  const ids = new Set(fromCol.map((p) => p.id));
  const picked = o.productIds.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p && !ids.has(p.id));
  return { collection, list: [...fromCol, ...picked] };
}

/* ------------------------------------------------------------------ */
/* Content summary                                                     */
/* ------------------------------------------------------------------ */
export const KIND_SLOT: Record<PlacementKind, OfferSlot> = { slide: 'hero', banner: 'banner', announcement: 'announcement' };
export const KIND_POSITION: Record<PlacementKind, PlacementPosition> = { slide: 'home-hero', banner: 'catalog', announcement: 'bar' };

export function countKinds(list: Placement[]) {
  return {
    slide: list.filter((p) => p.kind === 'slide').length,
    banner: list.filter((p) => p.kind === 'banner').length,
    announcement: list.filter((p) => p.kind === 'announcement').length,
  };
}

/** Slots stored on the offer (`placements`) — derived from the linked content + the homepage block toggle. */
export function slotsFor(linked: Placement[], homeBlock: boolean): OfferSlot[] {
  const set = new Set<OfferSlot>(linked.map((p) => KIND_SLOT[p.kind]));
  if (homeBlock) set.add('home-block');
  return (['hero', 'banner', 'announcement', 'home-block'] as OfferSlot[]).filter((s) => set.has(s));
}

/** ME plural forms (1 slajd · 2 slajda · 5 slajdova); SQ/EN use one/many. */
export function pluralForm(n: number): 'one' | 'few' | 'many' {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'one';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'few';
  return 'many';
}

/* ------------------------------------------------------------------ */
/* New placement from the offer                                        */
/* ------------------------------------------------------------------ */
const CTA_LABEL: L10n = { me: 'Pogledajte ponudu', sq: 'Shikoni ofertën', en: 'See the offer' };

export function placementFromOffer(o: OfferX, kind: PlacementKind, order: number, status: Placement['status']): Placement {
  const href = `/oferta/${o.slug}`;
  const nameMe = o.name.sq || o.name.en || o.name.me || 'Oferta';
  const label = { slide: 'Hero', banner: 'Katalog', announcement: 'Traka' }[kind];
  const barText = (lang: Lang) => [plain(o.badge[lang] || ''), plain(o.landing.title[lang] || o.name[lang] || '')].filter(Boolean).join(' — ');
  return {
    id: uid('pl'),
    kind,
    position: KIND_POSITION[kind],
    name: `${label} — ${nameMe}`,
    eyebrow: kind === 'announcement' ? E() : { ...o.badge },
    title: kind === 'announcement' ? { me: barText('me'), sq: barText('sq'), en: barText('en') } : { ...o.landing.title },
    subtitle: kind === 'announcement' ? E() : { ...o.landing.text },
    cta: { label: kind === 'announcement' ? E() : { ...CTA_LABEL }, href },
    image: kind === 'announcement' ? '' : o.image,
    alt: kind === 'announcement' ? E() : { ...o.name },
    textAlign: 'left',
    overlay: kind === 'announcement' ? 0 : 35,
    offerId: o.id,
    status,
    order,
  };
}

/* ------------------------------------------------------------------ */
/* Link validation (internal storefront routes + external URLs)        */
/* ------------------------------------------------------------------ */
export interface LinkCtx {
  categories: Category[];
  products: Product[];
  collections: Collection[];
  pages: CmsPage[];
  posts: Post[];
  offers: Offer[];
  /** Slug of the offer being edited (valid even before it is saved) */
  selfSlug?: string;
}
const STATIC = new Set(['/', '/produktet', '/sherbimet', '/lookbook', '/rreth-nesh', '/kontakt', '/keshilla', '/shporta', '/kerko', '/te-preferuarat', '/provo-virtualisht', '/syze-inteligjente', '/rezervo', '/klinika', '/optical-lab', '/lentet', '/gjej-kornizen', '/gjurmo-porosine']);

export function linkOk(href: string, c: LinkCtx): boolean {
  const h = (href ?? '').trim();
  if (!h) return false;
  if (/^(https?:|mailto:|tel:)/i.test(h) || h.startsWith('#')) return true;
  if (!h.startsWith('/')) return false;
  const path = h.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (STATIC.has(path)) return true;
  const [, a, b, extra] = path.split('/');
  if (!b || extra) return false;
  switch (a) {
    case 'produktet':
      return c.categories.some((x) => x.slug === b);
    case 'produkt':
      return c.products.some((p) => p.slug === b && p.status === 'active');
    case 'koleksioni':
      return c.collections.some((x) => x.slug === b && x.published);
    case 'oferta':
      return b === c.selfSlug || c.offers.some((o) => o.slug === b);
    case 'faqe':
      return c.pages.some((x) => x.slug === b);
    case 'keshilla':
      return c.posts.some((x) => x.slug === b);
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/* Pre-activation checks                                               */
/* ------------------------------------------------------------------ */
export type CheckLevel = 'ok' | 'warn' | 'fail';
export type CheckGroup = 'dates' | 'links' | 'media' | 'products' | 'content';
export type FixTarget = 'sync' | 'basics' | 'period' | 'rule' | 'products' | 'landing' | 'placements' | 'badge';
export interface Check {
  id: string;
  group: CheckGroup;
  level: CheckLevel;
  key: OfKey;
  vars?: Record<string, string | number>;
  fix?: FixTarget;
  /** Discount state, translated by the UI into {state} */
  dstate?: DiscountState;
  /** Fields with missing translations, rendered by the UI into {list} */
  fields?: { key: OfKey; langs: string }[];
}
export const CHECK_GROUPS: CheckGroup[] = ['dates', 'products', 'links', 'media', 'content'];

export interface CheckInput {
  offer: OfferX;
  mode: RuleMode;
  discount?: Discount;
  /** discountId points to a rule that no longer exists */
  discountMissing: boolean;
  homeBlock: boolean;
  linked: Placement[];
  participating: Product[];
  collection?: Collection;
  source: ProductSource;
  links: LinkCtx;
  committed: Map<string, number>;
  slugTaken: boolean;
  lang: Lang;
  l: (v: L10n | null | undefined) => string;
  now?: number;
}

const list = (names: string[], max = 3) => (names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', '));

export function runChecks(x: CheckInput): Check[] {
  const { offer: o, discount: d, lang, l } = x;
  const now = x.now ?? Date.now();
  const out: Check[] = [];
  const range = (a: string, b?: string) => ({ a: fmtDay(a, lang), b: b ? fmtDay(b, lang) : '∞' });

  /* ---- dates & rule ---- */
  const start = ms(o.startsAt);
  const end = o.endsAt ? ms(o.endsAt) : Infinity;
  if (!(end > start)) out.push({ id: 'dates', group: 'dates', level: 'fail', key: 'ck_datesInvalid', fix: 'period' });
  else if (end <= now && offerState(o, now) !== 'expired') out.push({ id: 'dates', group: 'dates', level: 'warn', key: 'ck_datesPast', fix: 'period' });
  else if (x.mode === 'none') out.push({ id: 'dates', group: 'dates', level: 'ok', key: 'ck_datesEditorial' });
  else if (d) {
    const dStart = ms(d.startsAt);
    const dEnd = d.endsAt ? ms(d.endsAt) : Infinity;
    if (sameMoment(o.startsAt, d.startsAt) && sameMoment(o.endsAt, d.endsAt)) out.push({ id: 'dates', group: 'dates', level: 'ok', key: 'ck_datesMatch' });
    else if (start < dStart - 60000 || end > dEnd + 60000)
      out.push({ id: 'dates', group: 'dates', level: 'fail', key: 'ck_datesOutside', vars: range(d.startsAt, d.endsAt), fix: 'sync' });
    else out.push({ id: 'dates', group: 'dates', level: 'warn', key: 'ck_datesInside', vars: range(d.startsAt, d.endsAt), fix: 'sync' });
  }

  if (x.mode === 'none') out.push({ id: 'rule', group: 'dates', level: 'ok', key: 'ck_ruleEditorial' });
  else if (x.discountMissing) out.push({ id: 'rule', group: 'dates', level: 'fail', key: 'ck_ruleDeleted', fix: 'rule' });
  else if (!d) out.push({ id: 'rule', group: 'dates', level: 'fail', key: 'ck_ruleMissing', fix: 'rule' });
  else {
    const st = discountState(d, now);
    const vars = { name: d.title };
    if (st === 'expired') out.push({ id: 'rule', group: 'dates', level: 'fail', key: 'ck_ruleExpired', vars, dstate: st, fix: 'rule' });
    else if (st === 'draft' || st === 'paused') out.push({ id: 'rule', group: 'dates', level: 'warn', key: 'ck_ruleDraft', vars, dstate: st, fix: 'rule' });
    else out.push({ id: 'rule', group: 'dates', level: 'ok', key: 'ck_ruleOk', vars, dstate: st });
    // the rule must cover the offer's collection (p.28: the offer references the commercial mechanism)
    if (o.collectionId && d.kind === 'products' && d.appliesTo.scope === 'collections' && !d.appliesTo.ids.includes(o.collectionId)) {
      out.push({ id: 'scope', group: 'dates', level: 'warn', key: 'ck_scopeMismatch', fix: 'products' });
    }
  }

  /* ---- products & stock ---- */
  if (x.source === 'all' && !x.participating.length) out.push({ id: 'products', group: 'products', level: 'ok', key: 'ck_productsAll' });
  else if (!x.participating.length) out.push({ id: 'products', group: 'products', level: x.mode === 'none' ? 'warn' : 'fail', key: 'ck_productsEmpty', fix: 'products' });
  else {
    const inactive = x.participating.filter((p) => p.status !== 'active');
    const noStock = x.participating.filter((p) => p.status === 'active' && stockLevels(p, x.committed).available <= 0);
    if (inactive.length) out.push({ id: 'inactive', group: 'products', level: 'warn', key: 'ck_productsInactive', vars: { list: list(inactive.map((p) => l(p.name))) }, fix: 'products' });
    if (noStock.length) out.push({ id: 'stock', group: 'products', level: 'warn', key: 'ck_productsStock', vars: { list: list(noStock.map((p) => l(p.name))) }, fix: 'products' });
    if (!inactive.length && !noStock.length) out.push({ id: 'products', group: 'products', level: 'ok', key: 'ck_productsOk', vars: { n: x.participating.length } });
  }

  /* ---- links ---- */
  if (!o.slug.trim()) out.push({ id: 'slug', group: 'links', level: 'fail', key: 'ck_slugMissing', fix: 'basics' });
  else if (x.slugTaken) out.push({ id: 'slug', group: 'links', level: 'fail', key: 'f_slugTaken', fix: 'basics' });
  else out.push({ id: 'slug', group: 'links', level: 'ok', key: 'ck_slugOk', vars: { url: `/oferta/${o.slug}` } });
  if (x.collection && !x.collection.published) out.push({ id: 'collection', group: 'links', level: 'warn', key: 'ck_collectionUnpublished', vars: { name: l(x.collection.title) }, fix: 'products' });
  const ctas = x.linked.filter((p) => p.kind !== 'announcement' || p.cta.href.trim());
  const broken = ctas.filter((p) => !linkOk(p.cta.href, x.links));
  if (broken.length) out.push({ id: 'links', group: 'links', level: 'fail', key: 'ck_linksBroken', vars: { list: list(broken.map((p) => `${p.name} → ${p.cta.href || '∅'}`), 2) }, fix: 'placements' });
  else if (ctas.length) out.push({ id: 'links', group: 'links', level: 'ok', key: 'ck_linksOk', vars: { n: ctas.length } });

  /* ---- media ---- */
  if (!o.image) out.push({ id: 'image', group: 'media', level: 'fail', key: 'ck_imageMissing', fix: 'landing' });
  else out.push({ id: 'image', group: 'media', level: 'ok', key: 'ck_imageOk' });
  const visual = x.linked.filter((p) => p.kind !== 'announcement');
  const noImg = visual.filter((p) => !p.image);
  const noAlt = visual.filter((p) => p.image && LANG_CODES.some((lg) => !p.alt[lg]?.trim()));
  if (noImg.length) out.push({ id: 'plMedia', group: 'media', level: 'fail', key: 'ck_placementMedia', vars: { list: list(noImg.map((p) => p.name), 2) }, fix: 'placements' });
  if (noAlt.length) out.push({ id: 'plAlt', group: 'media', level: 'warn', key: 'ck_altMissing', vars: { list: list(noAlt.map((p) => p.name), 2) }, fix: 'placements' });
  if (visual.length && !noImg.length && !noAlt.length) out.push({ id: 'plMedia', group: 'media', level: 'ok', key: 'ck_mediaOk' });

  /* ---- content & translations ---- */
  const placed = x.linked.length + (x.homeBlock ? 1 : 0);
  if (placed) out.push({ id: 'placements', group: 'content', level: 'ok', key: 'ck_placementsOk', vars: { n: placed } });
  else out.push({ id: 'placements', group: 'content', level: 'warn', key: 'ck_placementsNone', fix: 'placements' });
  if (!LANG_CODES.some((lg) => o.name[lg]?.trim())) out.push({ id: 'name', group: 'content', level: 'fail', key: 'ck_nameMissing', fix: 'basics' });
  const fields: [L10n, OfKey][] = [
    [o.name, 'f_name'],
    [o.landing.title, 'f_landingTitle'],
    [o.landing.text, 'f_landingText'],
    [o.badge, 'badge'],
  ];
  const missing: { key: OfKey; langs: string }[] = [];
  for (const [v, key] of fields) {
    const langs = LANG_CODES.filter((lg) => !v[lg]?.trim());
    if (langs.length) missing.push({ key, langs: langs.map((s) => (s === 'me' ? 'SR' : s.toUpperCase())).join('/') });
  }
  if (missing.length) out.push({ id: 'i18n', group: 'content', level: 'warn', key: 'ck_translationsMissing', fields: missing, fix: missing[0].key === 'f_name' ? 'basics' : missing[0].key === 'badge' ? 'badge' : 'landing' });
  else out.push({ id: 'i18n', group: 'content', level: 'ok', key: 'ck_translationsOk' });

  return out;
}

export function checkStats(checks: Check[]) {
  return {
    total: checks.length,
    ok: checks.filter((c) => c.level === 'ok').length,
    warn: checks.filter((c) => c.level === 'warn').length,
    fail: checks.filter((c) => c.level === 'fail').length,
  };
}

/* ------------------------------------------------------------------ */
/* UTM                                                                 */
/* ------------------------------------------------------------------ */
export interface UtmFields {
  source: string;
  medium: string;
  campaign: string;
  content: string;
}
export function parseUtm(s: string): UtmFields {
  const p = new URLSearchParams(s.replace(/^\?/, ''));
  return { source: p.get('utm_source') ?? '', medium: p.get('utm_medium') ?? '', campaign: p.get('utm_campaign') ?? '', content: p.get('utm_content') ?? '' };
}
const clean = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '-');
export function buildUtm(f: UtmFields): string {
  const p = new URLSearchParams();
  if (f.source.trim()) p.set('utm_source', clean(f.source));
  if (f.medium.trim()) p.set('utm_medium', clean(f.medium));
  if (f.campaign.trim()) p.set('utm_campaign', clean(f.campaign));
  if (f.content.trim()) p.set('utm_content', clean(f.content));
  return p.toString();
}
