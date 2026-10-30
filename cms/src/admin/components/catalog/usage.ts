// Media usage references (PDF p.36 "Bibliotekë me … referenca përdorimi. Fshirja e medias së përdorur kërkon
// zëvendësim ose njoftim të qartë"): where each file is used, and replacing / removing it everywhere at once.
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDb } from '@/store/db';
import type { ContentModel, HomeSection, HomeSectionType, L10n } from '@/lib/types';
import type { PageX } from '@/admin/components/editorial/meta';

export type UsageKind = 'product' | 'category' | 'collection' | 'home' | 'homeDraft' | 'placement' | 'offer' | 'project' | 'post' | 'page' | 'model';

export interface UsageRef {
  kind: UsageKind;
  id: string;
  /** Localized label of the entity */
  name?: L10n;
  /** Plain label (placements, custom model entries) */
  label?: string;
  /** Homepage section type (kind = 'home' | 'homeDraft') */
  section?: HomeSectionType;
  /** Where to edit it in the CMS */
  to: string;
}

/** Bundled images have a `-sm.webp` thumbnail sibling — treat both as the same file. */
export const normUrl = (url: string) => url.replace(/-sm\.webp$/, '.webp');

const isImage = (s: string) => s.startsWith('/images/') || s.startsWith('data:image/') || /^https?:\/\/.+\.(webp|jpe?g|png|gif|avif|svg)(\?.*)?$/i.test(s);

function walkStrings(v: unknown, cb: (s: string) => void) {
  if (typeof v === 'string') cb(v);
  else if (Array.isArray(v)) v.forEach((x) => walkStrings(x, cb));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkStrings(x, cb));
}

/** Custom content-model entries (see ContentModels) keep image values in `items[].values`. */
type ModelWithItems = ContentModel & { items?: { id: string; values: Record<string, unknown> }[] };

/**
 * Where each image is used across the site: products, categories, collections, homepage (live + draft),
 * slides / banners, offers, projects, blog posts, pages and custom model entries. Keyed by normalized URL.
 */
export function useMediaUsage() {
  const s = useDb(
    useShallow((d) => ({
      products: d.products,
      categories: d.categories,
      collections: d.collections,
      home: d.home,
      homeDraft: d.homeDraft,
      placements: d.placements,
      offers: d.offers,
      projects: d.projects,
      posts: d.posts,
      pages: d.pages,
      contentModels: d.contentModels,
    })),
  );

  return useMemo(() => {
    const map = new Map<string, UsageRef[]>();
    const add = (url: string | undefined, ref: UsageRef) => {
      if (!url) return;
      const key = normUrl(url);
      const list = map.get(key) ?? [];
      if (!list.some((r) => r.kind === ref.kind && r.id === ref.id)) list.push(ref);
      map.set(key, list);
    };
    for (const p of s.products) for (const u of p.images) add(u, { kind: 'product', id: p.id, name: p.name, to: `/admin/proizvodi/${p.id}` });
    for (const c of s.categories) add(c.image, { kind: 'category', id: c.id, name: c.name, to: `/admin/kategorije?uredi=${c.id}` });
    for (const c of s.collections) add(c.image, { kind: 'collection', id: c.id, name: c.title, to: `/admin/kolekcije/${c.id}` });
    for (const h of s.home) walkStrings(h.data, (v) => isImage(v) && add(v, { kind: 'home', id: h.id, section: h.type, to: '/admin/prodavnica/editor' }));
    // Unpublished homepage edits: only what is not already live in the same section
    for (const h of s.homeDraft ?? [])
      walkStrings(h.data, (v) => {
        if (!isImage(v)) return;
        const live = map.get(normUrl(v))?.some((r) => r.kind === 'home' && r.id === h.id);
        if (!live) add(v, { kind: 'homeDraft', id: h.id, section: h.type, to: '/admin/prodavnica/editor' });
      });
    for (const p of s.placements) {
      const ref: UsageRef = { kind: 'placement', id: p.id, label: p.name, name: p.title.me ? p.title : undefined, to: `/admin/prodavnica/slajdovi/${p.id}` };
      add(p.image, ref);
      add(p.imageMobile, ref);
    }
    for (const o of s.offers) add(o.image, { kind: 'offer', id: o.id, name: o.name, to: `/admin/ponude/${o.id}` });
    for (const p of s.projects) add(p.image, { kind: 'project', id: p.id, name: p.title, to: `/admin/projekti?id=${p.id}` });
    for (const p of s.posts) add(p.cover, { kind: 'post', id: p.id, name: p.title, to: `/admin/savjeti/${p.id}` });
    for (const p of s.pages as PageX[]) add(p.cover, { kind: 'page', id: p.id, name: p.title, to: `/admin/stranice/${p.id}` });
    for (const m of s.contentModels as ModelWithItems[])
      for (const it of m.items ?? []) walkStrings(it.values, (v) => isImage(v) && add(v, { kind: 'model', id: `${m.id}:${it.id}`, name: m.name, to: `/admin/modeli?model=${m.id}` }));
    return map;
  }, [s]);
}

export const usageOf = (map: Map<string, UsageRef[]>, url: string) => map.get(normUrl(url)) ?? [];

/* ------------------------------------------------------------------ */
/* Replace / remove a file everywhere                                   */
/* ------------------------------------------------------------------ */
const REMOVE = Symbol('remove');

/** Deep-map every string equal to `from` → `to`; with `to = null` it is dropped from arrays and blanked elsewhere. */
function rewrite<T>(value: T, from: string, to: string | null): T {
  const target = normUrl(from);
  const visit = (v: unknown): unknown => {
    if (typeof v === 'string') return normUrl(v) === target ? (to ?? REMOVE) : v;
    if (Array.isArray(v)) {
      let changed = false;
      const out: unknown[] = [];
      for (const x of v) {
        const y = visit(x);
        if (y !== x) changed = true;
        if (y !== REMOVE) out.push(y);
      }
      return changed ? out : v;
    }
    if (v && typeof v === 'object') {
      let changed = false;
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) {
        const y = visit(x);
        if (y !== x) changed = true;
        out[k] = y === REMOVE ? '' : y;
      }
      return changed ? out : v;
    }
    return v;
  };
  const res = visit(value);
  return (res === REMOVE ? '' : res) as T;
}

/**
 * Point every reference to `from` at `to` (replacement) or remove it (`to = null`) — products, categories,
 * collections, homepage (live + draft), placements, offers, projects, posts, pages and model entries.
 * Order lines keep their historical image. Returns the number of records changed.
 */
export function replaceMediaEverywhere(from: string, to: string | null): number {
  const s = useDb.getState();
  let n = 0;
  for (const p of s.products) {
    const images = rewrite(p.images, from, to);
    if (images !== p.images) {
      s.upsertProduct({ ...p, images });
      n++;
    }
  }
  for (const c of s.categories) {
    const image = rewrite(c.image, from, to);
    if (image !== c.image) {
      s.upsertCategory({ ...c, image });
      n++;
    }
  }
  for (const c of s.collections) {
    const image = rewrite(c.image, from, to);
    if (image !== c.image) {
      s.upsert('collections', { ...c, image });
      n++;
    }
  }
  const home = s.home.map((h) => ({ ...h, data: rewrite(h.data, from, to) }) as HomeSection);
  const homeChanged = home.filter((h, i) => h.data !== s.home[i].data).length;
  if (homeChanged) {
    s.setHome(home);
    n += homeChanged;
  }
  if (s.homeDraft) {
    const draft = s.homeDraft.map((h) => ({ ...h, data: rewrite(h.data, from, to) }) as HomeSection);
    const draftChanged = draft.filter((h, i) => h.data !== s.homeDraft![i].data).length;
    if (draftChanged) {
      s.saveHomeDraft(draft);
      n += draftChanged;
    }
  }
  for (const p of s.placements) {
    const image = rewrite(p.image, from, to);
    const imageMobile = p.imageMobile === undefined ? undefined : rewrite(p.imageMobile, from, to);
    if (image !== p.image || imageMobile !== p.imageMobile) {
      s.upsert('placements', { ...p, image, ...(imageMobile !== undefined ? { imageMobile } : {}) });
      n++;
    }
  }
  for (const o of s.offers) {
    const image = rewrite(o.image, from, to);
    if (image !== o.image) {
      s.upsert('offers', { ...o, image });
      n++;
    }
  }
  for (const p of s.projects) {
    const image = rewrite(p.image, from, to);
    if (image !== p.image) {
      s.upsertProject({ ...p, image });
      n++;
    }
  }
  for (const p of s.posts) {
    const cover = rewrite(p.cover, from, to);
    if (cover !== p.cover) {
      s.upsertPost({ ...p, cover });
      n++;
    }
  }
  for (const p of s.pages as PageX[]) {
    if (!p.cover) continue;
    const cover = rewrite(p.cover, from, to);
    if (cover !== p.cover) {
      s.upsertPage({ ...p, cover } as PageX);
      n++;
    }
  }
  for (const m of s.contentModels as ModelWithItems[]) {
    if (!m.items?.length) continue;
    const items = rewrite(m.items, from, to);
    if (items !== m.items) {
      s.upsert('contentModels', { ...m, items } as ContentModel);
      n++;
    }
  }
  return n;
}
