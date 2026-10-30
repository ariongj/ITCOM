// Allowed homepage sections (PDF p.32 "Komponentët e lejuar kanë skema dhe validim"):
// each type declares its schema (fields shown in the catalogue), a per-page limit and a default instance.
import type { HomeSection, HomeSectionType } from '@/lib/types';
import { buildHome } from '@/data/content';
import { B, type BKey } from './i18n';
import { uid } from '@/lib/utils';

export interface SectionSchema {
  /** Max instances on one page */
  max: number;
  /** Field labels (builder dict keys) — the schema shown in the catalogue */
  fields: BKey[];
  /** Max items in the section's repeatable list (validation) */
  maxItems?: number;
}

export const SCHEMA: Record<HomeSectionType, SectionSchema> = {
  hero: { max: 1, maxItems: 8, fields: ['slides', 'image', 'title', 'subtitle', 'primaryCta', 'secondaryCta', 'autoplay'] },
  trust: { max: 1, maxItems: 8, fields: ['items', 'icon', 'title', 'text'] },
  categories: { max: 1, fields: ['eyebrow', 'title', 'subtitle'] },
  featured: { max: 3, fields: ['eyebrow', 'title', 'mode', 'picked'] },
  promo: { max: 2, fields: ['eyebrow', 'title', 'text', 'endsAt', 'code', 'image', 'grpButton'] },
  spotlight: { max: 3, maxItems: 4, fields: ['eyebrow', 'title', 'text', 'image', 'points', 'primaryCta', 'secondaryCta'] },
  process: { max: 1, maxItems: 8, fields: ['eyebrow', 'title', 'steps'] },
  services: { max: 1, maxItems: 12, fields: ['eyebrow', 'title', 'subtitle', 'servicesList'] },
  projects: { max: 1, fields: ['eyebrow', 'title', 'subtitle'] },
  stats: { max: 2, maxItems: 6, fields: ['image', 'quote', 'figures'] },
  faq: { max: 2, maxItems: 20, fields: ['eyebrow', 'title', 'questions'] },
  blog: { max: 1, fields: ['eyebrow', 'title'] },
  instagram: { max: 1, maxItems: 12, fields: ['title', 'photos'] },
  cta: { max: 1, fields: ['eyebrow', 'title', 'text', 'image'] },
};

/** Catalogue order (roughly top-to-bottom of a typical homepage). */
export const CATALOG: HomeSectionType[] = ['hero', 'trust', 'categories', 'featured', 'spotlight', 'promo', 'process', 'services', 'projects', 'stats', 'faq', 'blog', 'instagram', 'cta'];

const tr = (k: BKey) => ({ me: B.me[k], sq: B.sq[k], en: B.en[k] });

/**
 * A new, valid instance of a section type. Content starts from the store's real copy for that type
 * (no placeholders), with a fresh id so several instances can live on one page.
 */
export function createSection(type: HomeSectionType, now = new Date()): HomeSection {
  const seed = buildHome(now).find((s) => s.type === type);
  if (!seed) throw new Error(`Unknown section type: ${type}`);
  const s = structuredClone(seed);
  s.id = uid(type);
  s.enabled = true;
  if (s.type === 'featured') {
    s.data = { ...s.data, eyebrow: tr('newFeaturedEyebrow'), title: tr('newFeaturedTitle'), mode: 'new', productIds: [] };
  }
  if (s.type === 'promo') {
    s.data = { ...s.data, endsAt: new Date(now.getTime() + 14 * 86400000).toISOString() };
  }
  return s;
}

/** Copy of an existing section with a new id. */
export function cloneSection(s: HomeSection): HomeSection {
  const c = structuredClone(s);
  c.id = uid(s.type);
  if (c.type === 'hero') c.data.slides = c.data.slides.map((x) => ({ ...x, id: uid('s') }));
  return c;
}

export const countOf = (sections: HomeSection[], type: HomeSectionType) => sections.filter((s) => s.type === type).length;
export const canAdd = (sections: HomeSection[], type: HomeSectionType) => countOf(sections, type) < SCHEMA[type].max;
