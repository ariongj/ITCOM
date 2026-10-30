// Navigation menus (PDF p.36 "Menu kryesore, footer… Lidhje te faqe, produkt, koleksion, ofertë ose URL;
// renditje dhe nënmenu"). Pure helpers shared by the CMS menu editor and the storefront header/footer —
// no admin UI imports here, so the storefront bundle stays light.
import type { Category, CmsPage, Collection, L10n, Menu, MenuItem, MenuItemType, Offer, Product } from '@/lib/types';
import { offerState } from '@/lib/offers';
import { contentState, type PageX } from '@/admin/components/editorial/meta';

export interface LinkSources {
  pages: CmsPage[];
  products: Product[];
  collections: Collection[];
  categories: Category[];
  offers: Offer[];
}

/** Why a link is not shown on the storefront. */
export type LinkIssue = 'missing' | 'draft' | 'hidden' | 'scheduled' | 'expired' | 'paused' | 'archived' | 'invalid';

export interface LinkEntity {
  title: L10n;
  image?: string;
  subtitle?: L10n;
}

export interface ResolvedLink {
  /** Router path ("/faqe/x") or absolute URL; '' = no link (column heading) */
  to: string;
  external: boolean;
  /** Visible on the storefront right now */
  live: boolean;
  issue?: LinkIssue;
  entity?: LinkEntity;
}

export const LINK_TYPES: MenuItemType[] = ['page', 'product', 'collection', 'category', 'offer', 'url'];

const EXTERNAL = /^(?:https?:|mailto:|tel:|\/\/)/i;

/** Validate a free URL target: in-app path ("/kontakt", "/produktet?akcija=1", "#rezervo") or http(s)/mailto/tel. */
export function validUrl(target: string) {
  const v = target.trim();
  if (!v) return true; // empty = heading without a link
  if (v.startsWith('/') || v.startsWith('#')) return !/\s/.test(v);
  return /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v) || /^mailto:\S+@\S+$/i.test(v) || /^tel:\+?[\d\s-]{6,}$/i.test(v);
}

export function resolveLink(item: Pick<MenuItem, 'type' | 'target'>, src: LinkSources, now = Date.now()): ResolvedLink {
  const key = item.target.trim();
  const none = (issue: LinkIssue): ResolvedLink => ({ to: '', external: false, live: false, issue });
  switch (item.type) {
    case 'page': {
      const p = src.pages.find((x) => x.id === key || x.slug === key) as PageX | undefined;
      if (!p) return none('missing');
      const state = contentState(p, p.publishedAt, now);
      const res: ResolvedLink = { to: `/faqe/${p.slug}`, external: false, live: state === 'published', entity: { title: p.title, image: p.cover, subtitle: p.excerpt } };
      if (state !== 'published') res.issue = state === 'draft' ? 'draft' : state === 'hidden' ? 'hidden' : 'scheduled';
      return res;
    }
    case 'product': {
      const p = src.products.find((x) => x.id === key || x.slug === key);
      if (!p) return none('missing');
      const live = p.status === 'active';
      return { to: `/produkt/${p.slug}`, external: false, live, issue: live ? undefined : p.status === 'archived' ? 'archived' : 'draft', entity: { title: p.name, image: p.images[0], subtitle: p.short } };
    }
    case 'collection': {
      const c = src.collections.find((x) => x.id === key || x.slug === key);
      if (!c) return none('missing');
      return { to: `/koleksioni/${c.slug}`, external: false, live: c.published, issue: c.published ? undefined : 'draft', entity: { title: c.title, image: c.image, subtitle: c.description } };
    }
    case 'category': {
      const c = src.categories.find((x) => x.id === key || x.slug === key);
      if (!c) return none('missing');
      return { to: `/produktet/${c.slug}`, external: false, live: true, entity: { title: c.name, image: c.image, subtitle: c.tagline } };
    }
    case 'offer': {
      const o = src.offers.find((x) => x.id === key || x.slug === key);
      if (!o) return none('missing');
      const st = offerState(o, now);
      const issue: LinkIssue | undefined = st === 'active' ? undefined : st === 'draft' ? 'draft' : st === 'paused' ? 'paused' : st === 'scheduled' ? 'scheduled' : 'expired';
      return { to: `/oferta/${o.slug}`, external: false, live: st === 'active', issue, entity: { title: o.name, image: o.image, subtitle: o.badge } };
    }
    case 'url':
    default: {
      if (!validUrl(key)) return { to: key, external: EXTERNAL.test(key), live: false, issue: 'invalid' };
      return { to: key, external: EXTERNAL.test(key), live: true };
    }
  }
}

/** A storefront-ready menu node: only live links, labels still localized. */
export interface NavNode {
  id: string;
  label: L10n;
  type: MenuItemType;
  to: string;
  external: boolean;
  entity?: LinkEntity;
  children: NavNode[];
}

/**
 * Menu → live tree. Links that are not visible (draft page, archived product, expired offer, broken URL) are
 * dropped; a parent whose own link is not live stays as a heading while it still has live children.
 */
export function liveTree(items: MenuItem[], src: LinkSources, now = Date.now()): NavNode[] {
  const out: NavNode[] = [];
  for (const it of items) {
    const r = resolveLink(it, src, now);
    const children = (it.children ?? []).flatMap((c) => {
      const rc = resolveLink(c, src, now);
      return rc.live && rc.to ? [{ id: c.id, label: c.label, type: c.type, to: rc.to, external: rc.external, entity: rc.entity, children: [] }] : [];
    });
    const linkOk = r.live && !!r.to;
    if (!linkOk && !children.length) continue;
    out.push({ id: it.id, label: it.label, type: it.type, to: linkOk ? r.to : '', external: linkOk && r.external, entity: r.entity, children });
  }
  return out;
}

/** Visual children (category / collection / product / offer with an image) — drive the mega menu tiles. */
export const isVisual = (n: NavNode) => !!n.entity?.image && (n.type === 'category' || n.type === 'collection' || n.type === 'product' || n.type === 'offer');

/** Sale / campaign links get the accent treatment. */
export const isPromo = (n: Pick<NavNode, 'type' | 'to'>) => n.type === 'offer' || /[?&]akcija=1/.test(n.to);

/* ------------------------------------------------------------------ */
/* Where an entity is linked from (pages list, page editor…)           */
/* ------------------------------------------------------------------ */
export interface MenuRef {
  menu: Menu;
  item: MenuItem;
  parent?: MenuItem;
}

export function menuRefs(menus: Menu[], type: MenuItemType, ids: string[]): MenuRef[] {
  const out: MenuRef[] = [];
  for (const menu of menus) {
    for (const item of menu.items) {
      if (item.type === type && ids.includes(item.target)) out.push({ menu, item });
      for (const c of item.children ?? []) if (c.type === type && ids.includes(c.target)) out.push({ menu, item: c, parent: item });
    }
  }
  return out;
}

/** Add a page link to the footer menu: into the column that already holds most page links, else top-level. */
export function addPageToFooter(menu: Menu, page: Pick<CmsPage, 'id' | 'title'>, newId: string): Menu {
  const link: MenuItem = { id: newId, label: { ...page.title }, type: 'page', target: page.id };
  let best = -1;
  let bestCount = 0;
  menu.items.forEach((it, i) => {
    const n = (it.children ?? []).filter((c) => c.type === 'page').length;
    if (n > bestCount) {
      best = i;
      bestCount = n;
    }
  });
  if (best < 0) return { ...menu, items: [...menu.items, link] };
  return { ...menu, items: menu.items.map((it, i) => (i === best ? { ...it, children: [...(it.children ?? []), link] } : it)) };
}

/** Remove every link to a target from a menu (children included). */
export function removeTarget(menu: Menu, type: MenuItemType, target: string): Menu {
  return {
    ...menu,
    items: menu.items
      .filter((it) => !(it.type === type && it.target === target && !(it.children ?? []).length))
      .map((it) => ({ ...it, ...(it.children ? { children: it.children.filter((c) => !(c.type === type && c.target === target)) } : {}) })),
  };
}
