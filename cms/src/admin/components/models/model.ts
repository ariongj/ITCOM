// Content models (PDF p.36 "Modele dhe fusha"): the definition (fields + rules) lives in `contentModels`,
// the entries stay in the list that owns them (projects, homepage sections, settings.locations).
// The rule flags below are optional extras on the stored records — older data simply lacks them.
import type { ComponentType } from 'react';
import { CalendarDays, Eye, Hash, Image, Images, Link2, ListChecks, MapPin, MessageCircleQuestionMark, Boxes, ToggleRight, Type, Waypoints } from 'lucide-react';
import type { ContentFieldType, ContentModel, Db, L10n } from '@/lib/types';

export const FIELD_TYPES: ContentFieldType[] = ['text', 'number', 'choice', 'image', 'link', 'date', 'boolean', 'reference'];

export const FIELD_ICON: Record<ContentFieldType, ComponentType<{ className?: string }>> = {
  text: Type,
  number: Hash,
  choice: ListChecks,
  image: Image,
  link: Link2,
  date: CalendarDays,
  boolean: ToggleRight,
  reference: Waypoints,
};

/** Types that can hold a different value per language. */
export const TRANSLATABLE_TYPES: ContentFieldType[] = ['text', 'choice', 'link'];

export const REF_TARGETS = ['products', 'categories', 'collections', 'pages', 'services', 'projects', 'staff'] as const;
export type RefTarget = (typeof REF_TARGETS)[number];

export type BaseField = ContentModel['fields'][number];
export interface FieldX extends BaseField {
  required?: boolean;
  translatable?: boolean;
  /** choice */
  options?: string[];
  multiple?: boolean;
  /** reference → list key */
  ref?: RefTarget;
  /** text: max characters; number: maximum */
  max?: number;
  /** number: minimum */
  min?: number;
  help?: L10n;
  /** Added in the CMS (system fields come with the theme and keep their key / type) */
  custom?: boolean;
}

export interface ModelX extends Omit<ContentModel, 'fields'> {
  fields: FieldX[];
  status?: 'active' | 'draft';
  public?: boolean;
}

/* ------------------------------------------------------------------ */
/* Defaults for the seeded (theme) fields                              */
/* ------------------------------------------------------------------ */
type Rules = Pick<FieldX, 'required' | 'translatable' | 'options' | 'multiple' | 'ref' | 'max' | 'min'>;
const DEFAULTS: Record<string, Record<string, Rules>> = {
  projects: {
    title: { required: true, translatable: true, max: 80 },
    location: { required: true, translatable: false },
    year: { required: true, min: 2000, max: 2030 },
    tags: { translatable: true, multiple: true },
    summary: { translatable: true, max: 280 },
    image: { required: true },
    featured: {},
  },
  'home.faq': {
    q: { required: true, translatable: true, max: 140 },
    a: { required: true, translatable: true },
  },
  'home.services': {
    image: { required: true },
    title: { required: true, translatable: true, max: 60 },
    text: { translatable: true, max: 200 },
    service: { ref: 'services' },
  },
  'settings.locations': {
    name: { required: true },
    address: { required: true },
    city: { required: true },
    pickup: {},
    map: {},
  },
};

/** Field with its effective rules (stored flags win over the theme defaults). */
export function withRules(model: Pick<ModelX, 'source'>, f: FieldX): FieldX {
  const d = DEFAULTS[model.source]?.[f.key] ?? { translatable: f.type === 'text' };
  return { ...d, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) } as FieldX;
}

export const isSystem = (f: FieldX) => !f.custom;

export const modelStatus = (m: ModelX) => m.status ?? 'active';
export const modelPublic = (m: ModelX) => m.public ?? true;

/* ------------------------------------------------------------------ */
/* Where the entries live                                              */
/* ------------------------------------------------------------------ */
export const MODEL_ICON: Record<string, ComponentType<{ className?: string }>> = {
  projects: Images,
  'home.faq': MessageCircleQuestionMark,
  'home.services': Eye,
  'settings.locations': MapPin,
};
export const modelIcon = (source: string) => MODEL_ICON[source] ?? Boxes;

export const EDITORS: Record<string, { to: string; label: 'ed_projects' | 'ed_editor' | 'ed_locations'; usedOn: string[] }> = {
  projects: { to: '/admin/projekti', label: 'ed_projects', usedOn: ['/lookbook', '/'] },
  'home.faq': { to: '/admin/prodavnica/editor', label: 'ed_editor', usedOn: ['/'] },
  'home.services': { to: '/admin/prodavnica/editor', label: 'ed_editor', usedOn: ['/sherbimet', '/'] },
  'settings.locations': { to: '/admin/konfiguracija/lokacionet', label: 'ed_locations', usedOn: ['/kontakt', '/pagesa'] },
};

export const DESCRIPTION_KEY: Record<string, 'md_projects' | 'md_faq' | 'md_services' | 'md_locations'> = {
  projects: 'md_projects',
  'home.faq': 'md_faq',
  'home.services': 'md_services',
  'settings.locations': 'md_locations',
};

export interface EntryPreview {
  id: string;
  title: L10n;
  sub?: L10n;
  image?: string;
  /** Deep link into the owning editor */
  to?: string;
}

const same = (s: string): L10n => ({ me: s, sq: s, en: s });

/** Live entries of a model, read from the list that owns them. */
export function entriesOf(m: Pick<ModelX, 'source' | 'entries'>, db: Pick<Db, 'projects' | 'home' | 'settings'>): { count: number; items: EntryPreview[] } {
  switch (m.source) {
    case 'projects': {
      const items = db.projects.map((p) => ({ id: p.id, title: p.title, sub: same(`${p.location} · ${p.year}`), image: p.image, to: `/admin/projekti?id=${p.id}` }));
      return { count: items.length, items };
    }
    case 'home.faq': {
      const s = db.home.find((h) => h.type === 'faq');
      const items = s && s.type === 'faq' ? s.data.items.map((it, i) => ({ id: `faq-${i}`, title: it.q, sub: it.a })) : [];
      return { count: items.length, items };
    }
    case 'home.services': {
      const s = db.home.find((h) => h.type === 'services');
      const items = s && s.type === 'services' ? s.data.items.map((it, i) => ({ id: `sv-${i}`, title: it.title, sub: it.text, image: it.image })) : [];
      return { count: items.length, items };
    }
    case 'settings.locations': {
      const items = db.settings.locations.map((x) => ({ id: x.id, title: same(x.name), sub: same(`${x.address}, ${x.city}`) }));
      return { count: items.length, items };
    }
    default:
      return { count: m.entries, items: [] };
  }
}

/** Distinct option values already used by the entries (choice fields without stored options). */
export function usedOptions(m: Pick<ModelX, 'source'>, key: string, db: Pick<Db, 'projects'>): string[] {
  if (m.source === 'projects' && key === 'tags') return Array.from(new Set(db.projects.flatMap((p) => p.tags.map((x) => x.sq || x.me)).filter(Boolean)));
  return [];
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */
export const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/** "afati i punimit" → "afatiIPunimit" */
export function keyFromLabel(label: string) {
  const words = label
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'dj')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean);
  const key = words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('');
  return /^[a-z]/.test(key) ? key.slice(0, 40) : key ? `f${key}`.slice(0, 40) : '';
}

export type FieldError = 'label' | 'key' | 'keyTaken' | 'options' | 'ref';

export function fieldErrors(f: FieldX, others: FieldX[]): FieldError[] {
  const out: FieldError[] = [];
  if (!f.label.sq.trim()) out.push('label');
  if (!KEY_RE.test(f.key)) out.push('key');
  else if (others.some((o) => o.key.toLowerCase() === f.key.toLowerCase())) out.push('keyTaken');
  if (f.type === 'choice' && f.custom && (f.options?.length ?? 0) < 2) out.push('options');
  if (f.type === 'reference' && !f.ref) out.push('ref');
  return out;
}
