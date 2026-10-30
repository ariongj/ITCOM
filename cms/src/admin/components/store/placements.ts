// Slideshow, banners and announcement bar (PDF pp.31–35) — helpers shared by the list and the editor.
import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import type { Category, CmsPage, Collection, L10n, Lang, Offer, Placement, PlacementKind, PlacementPosition, Product } from '@/lib/types';
import { date } from '@/lib/format';
import { lt } from '@/i18n';
import { site } from '@/i18n/site';
import { SE } from './i18n';
import { useDb } from '@/store/db';
import { confirmDialog } from '@/admin/components/kit';

export const KINDS: PlacementKind[] = ['slide', 'banner', 'announcement'];

/** Positions each kind can be placed in (the storefront reads them with usePlacements(position)). */
export const KIND_POSITIONS: Record<PlacementKind, PlacementPosition[]> = {
  slide: ['home-hero'],
  banner: ['catalog', 'home-banner'],
  announcement: ['bar'],
};

/** Where to see a position on the public site. */
export const POSITION_PATH: Record<PlacementPosition, string> = {
  'home-hero': '/',
  'home-banner': '/',
  catalog: '/produktet',
  bar: '/',
};

/* ------------------------------------------------------------------ */
/* Focal point (crop centre) — stored next to the image                */
/* ------------------------------------------------------------------ */
export type Focal = { x: number; y: number };
/**
 * The shared Placement type has no focal point yet; the editor stores `focal` / `focalMobile` (0–100 %) on the
 * placement object. The storefront can use them as `object-position: x% y%` (see objectPos).
 */
export type PlacementX = Placement & { focal?: Focal; focalMobile?: Focal };
export const objectPos = (f?: Focal) => `${Math.round(f?.x ?? 50)}% ${Math.round(f?.y ?? 50)}%`;

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */
const ms = (v?: string) => (v ? new Date(v).getTime() : undefined);

/** Effective window: the offer's dates (inherited) or the placement's own, intersected with the offer. */
export function scheduleOf(p: Pick<Placement, 'startsAt' | 'endsAt'>, offer?: Pick<Offer, 'startsAt' | 'endsAt'> | null): { start?: string; end?: string; inherited: boolean } {
  const own = !!(p.startsAt || p.endsAt);
  if (!offer) return { start: p.startsAt, end: p.endsAt, inherited: false };
  if (!own) return { start: offer.startsAt, end: offer.endsAt, inherited: true };
  const start = [p.startsAt, offer.startsAt].filter(Boolean).sort((a, b) => ms(b)! - ms(a)!)[0];
  const end = [p.endsAt, offer.endsAt].filter(Boolean).sort((a, b) => ms(a)! - ms(b)!)[0];
  return { start, end, inherited: false };
}

const dd = (iso: string) => String(new Date(iso).getDate()).padStart(2, '0');

// Chrome ships without Albanian date data (Intl silently falls back to English), so the Albanian months are local.
const SQ_MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const SQ_SHORT = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'];

/** "04 tetor", "04 tet 2027", "04 tetor, 09:00" — Albanian without Intl, ME / EN through Intl. */
export function dayLabel(iso: string, lang: Lang, opts: { month?: 'long' | 'short'; year?: boolean; time?: boolean } = {}) {
  const d = new Date(iso);
  const month = opts.month ?? 'long';
  if (lang === 'sq') {
    const m = (month === 'long' ? SQ_MONTHS : SQ_SHORT)[d.getMonth()];
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${dd(iso)} ${m}${opts.year ? ` ${d.getFullYear()}` : ''}${opts.time ? `, ${hm}` : ''}`;
  }
  return date(iso, lang, { day: '2-digit', month, ...(opts.year ? { year: 'numeric' } : {}), ...(opts.time ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

/**
 * "02–04 tetor", "28 tet – 04 nën", "nga 12 tetor", "deri 04 nëntor" — or null when the window is open
 * (started and no end → "Pa mbarim").
 */
export function rangeLabel(start: string | undefined, end: string | undefined, lang: Lang, words: { from: string; until: string }, now = Date.now()): string | null {
  const s = start && ms(start)! > now ? start : undefined;
  if (!end) return s ? `${words.from} ${dayLabel(s, lang)}` : null;
  const otherYear = new Date(end).getFullYear() !== new Date(now).getFullYear();
  if (!start) return `${words.until} ${dayLabel(end, lang, { year: otherYear })}`;
  const a = new Date(start);
  const b = new Date(end);
  const sameYear = a.getFullYear() === b.getFullYear();
  if (sameYear && a.getMonth() === b.getMonth()) {
    return a.getDate() === b.getDate() ? dayLabel(end, lang, { year: otherYear }) : `${dd(start)}–${dayLabel(end, lang, { year: otherYear })}`;
  }
  const y = !sameYear || otherYear;
  return `${dayLabel(start, lang, { month: 'short', year: y })} – ${dayLabel(end, lang, { month: 'short', year: y })}`;
}

/** ISO ↔ <input type="datetime-local"> */
export function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);

/* ------------------------------------------------------------------ */
/* Link / destination                                                  */
/* ------------------------------------------------------------------ */
export type LinkType = 'offer' | 'collection' | 'category' | 'product' | 'page' | 'url' | 'none';

export interface LinkCtx {
  offers: Offer[];
  collections: Collection[];
  categories: Category[];
  products: Product[];
  pages: CmsPage[];
}

const slugAfter = (href: string, prefix: string) => {
  if (!href.startsWith(prefix)) return null;
  return decodeURIComponent(href.slice(prefix.length).split(/[?#/]/)[0] ?? '') || null;
};

/** What a CTA path points to: { type: 'collection', label: 'Koleksioni i diellit' } — used by "Lidhja" and the destination field. */
export function resolveHref(href: string, ctx: LinkCtx, lang: Lang): { type: LinkType; label: string } {
  const h = href.trim();
  if (!h) return { type: 'none', label: '' };
  let slug: string | null;
  if ((slug = slugAfter(h, '/oferta/'))) {
    const o = ctx.offers.find((x) => x.slug === slug);
    if (o) return { type: 'offer', label: lt(o.name, lang) };
  }
  if ((slug = slugAfter(h, '/koleksioni/'))) {
    const c = ctx.collections.find((x) => x.slug === slug);
    if (c) return { type: 'collection', label: lt(c.title, lang) };
  }
  if ((slug = slugAfter(h, '/produktet/'))) {
    const c = ctx.categories.find((x) => x.slug === slug);
    if (c) return { type: 'category', label: lt(c.name, lang) };
  }
  if ((slug = slugAfter(h, '/produkt/'))) {
    const p = ctx.products.find((x) => x.slug === slug);
    if (p) return { type: 'product', label: lt(p.name, lang) };
  }
  if ((slug = slugAfter(h, '/faqe/'))) {
    const p = ctx.pages.find((x) => x.slug === slug);
    if (p) return { type: 'page', label: lt(p.title, lang) };
  }
  // fixed storefront pages
  const path = h.split(/[?#]/)[0] || '/';
  if (h === '/#rezervo') return { type: 'page', label: SE[lang].dest_measure };
  if (path === '/produktet' && !h.includes('#')) return { type: 'category', label: site[lang].allProducts };
  const fixed: Record<string, keyof (typeof site)['sq']> = {
    '/sherbimet': 'nav_services', '/kontakt': 'nav_contact', '/lookbook': 'nav_projects', '/rreth-nesh': 'nav_about', '/keshilla': 'nav_blog',
    '/provo-virtualisht': 'nav_tryon', '/rezervo': 'nav_book', '/gjej-kornizen': 'nav_finder', '/lentet': 'nav_lensGuide', '/gjurmo-porosine': 'nav_track',
    '/syze-inteligjente': 'nav_smart',
  };
  if (fixed[path]) return { type: 'page', label: site[lang][fixed[path]] };
  if (path === '/klinika') return { type: 'page', label: 'Klinika Miftari' };
  if (path === '/optical-lab') return { type: 'page', label: 'Optical Lab' };
  return { type: 'url', label: h };
}

/** "Lidhja" column: the linked offer first (it owns the campaign), otherwise the CTA destination. */
export function linkOf(p: Placement, ctx: LinkCtx, lang: Lang): { type: LinkType; label: string } {
  const offer = p.offerId ? ctx.offers.find((o) => o.id === p.offerId) : undefined;
  if (offer) return { type: 'offer', label: lt(offer.name, lang) };
  return resolveHref(p.cta.href, ctx, lang);
}

/* ------------------------------------------------------------------ */
/* Ordering, new items                                                 */
/* ------------------------------------------------------------------ */
/** Persist a new order for one position (1…n) — one audit entry instead of one per row. */
export function commitOrder(position: PlacementPosition, ids: string[], detail: string) {
  useDb.setState((s) => ({
    placements: s.placements.map((p) => {
      if (p.position !== position) return p;
      const i = ids.indexOf(p.id);
      return i < 0 ? p : { ...p, order: i + 1 };
    }),
  }));
  useDb.getState().logAudit({ action: 'update', object: 'placement', objectId: position, detail });
}

const E = (): L10n => ({ me: '', sq: '', en: '' });

export function blankPlacement(id: string, kind: PlacementKind, position: PlacementPosition, order: number): PlacementX {
  return {
    id,
    kind,
    position,
    name: '',
    eyebrow: E(),
    title: E(),
    subtitle: E(),
    cta: { label: E(), href: '' },
    image: '',
    alt: E(),
    textAlign: 'left',
    overlay: kind === 'announcement' ? 0 : 35,
    status: 'draft',
    order,
    focal: { x: 50, y: 50 },
  };
}

/** Missing translations of the visible text in a language. */
export function missingIn(p: Placement, lang: Lang) {
  const fields: L10n[] = [p.title];
  if (p.kind !== 'announcement') fields.push(p.alt);
  if (p.cta.href && p.kind !== 'announcement') fields.push(p.cta.label);
  return fields.some((f) => !f[lang]?.trim());
}

/* ------------------------------------------------------------------ */
/* Unsaved changes guard                                               */
/* ------------------------------------------------------------------ */
/**
 * Ask before leaving a dirty editor (router navigation + tab close). `allow()` lets the next navigation through
 * (after a save that redirects).
 */
export function useLeaveGuard(dirty: boolean, text: { title: string; text: string; confirm: string }) {
  const skip = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !skip.current && currentLocation.pathname !== nextLocation.pathname);
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let live = true;
    void confirmDialog({ title: textRef.current.title, text: textRef.current.text, confirmLabel: textRef.current.confirm, danger: true }).then((ok) => {
      if (!live) return;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      live = false;
    };
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [dirty]);
  return {
    allow: () => {
      skip.current = true;
      window.setTimeout(() => (skip.current = false), 0);
    },
  };
}
