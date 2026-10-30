// CMS v2 editorial model (PDF p.36 "Faqe dhe blog"): visibility draft / hidden / published + publish date,
// author, excerpt, photo, tags, SEO and template. The extra fields are optional and stored on the existing
// page / post records (older records simply lack them), so the storefront keeps working unchanged.
import type { CmsPage, L10n, Post } from '@/lib/types';

/** Stored visibility. `published: false` = draft; `published: true` + `hidden` = reachable only by direct link. */
export type Visibility = 'published' | 'hidden' | 'draft';
/** Visibility + time: a published record with a future publish date is `scheduled`. */
export type ContentState = Visibility | 'scheduled';

export interface SeoMeta {
  title: L10n;
  description: L10n;
}

export const PAGE_TEMPLATES = ['page', 'policy', 'about', 'contact', 'faq', 'landing'] as const;
export type PageTemplate = (typeof PAGE_TEMPLATES)[number];
export const POST_TEMPLATES = ['article', 'guide', 'news'] as const;
export type PostTemplate = (typeof POST_TEMPLATES)[number];

export interface PageMeta {
  hidden?: boolean;
  /** Publish date (ISO). Future = scheduled. */
  publishedAt?: string;
  author?: string;
  excerpt?: L10n;
  cover?: string;
  tags?: string[];
  template?: PageTemplate;
  seo?: SeoMeta;
}
export type PageX = CmsPage & PageMeta;

export interface PostMeta {
  hidden?: boolean;
  tags?: string[];
  template?: PostTemplate;
  seo?: SeoMeta;
}
export type PostX = Post & PostMeta;

type Visible = { published: boolean; hidden?: boolean };

export const visibilityOf = (r: Visible): Visibility => (!r.published ? 'draft' : r.hidden ? 'hidden' : 'published');

export function withVisibility<T extends Visible>(r: T, v: Visibility): T {
  return { ...r, published: v !== 'draft', hidden: v === 'hidden' };
}

export function contentState(r: Visible, date?: string, now = Date.now()): ContentState {
  const v = visibilityOf(r);
  if (v === 'published' && date && new Date(date).getTime() > now) return 'scheduled';
  return v;
}

/** Listed publicly right now (menus, footer, lists). */
export const isLive = (r: Visible, date?: string, now?: number) => contentState(r, date, now) === 'published';

export const emptySeo = (): SeoMeta => ({ title: { me: '', sq: '', en: '' }, description: { me: '', sq: '', en: '' } });

/** "2026-10-05T09:30" for <input type="datetime-local"> in local time. */
export function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
