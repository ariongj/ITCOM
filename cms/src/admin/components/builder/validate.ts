// Section validation (PDF p.32: allowed components have a schema and validation).
// Errors on a VISIBLE section block publishing; warnings never do.
import type { Cta, HomeSection, L10n, Lang } from '@/lib/types';
import type { BKey } from './i18n';
import { SCHEMA } from './catalog';

export type IssueLevel = 'error' | 'warning';
export interface Issue {
  level: IssueLevel;
  key: BKey;
  vars?: Record<string, string | number>;
}

export interface ValidateCtx {
  /** Ids of active (public) products */
  activeProductIds: Set<string>;
  now?: number;
}

const LANG_ORDER: Lang[] = ['sq', 'en', 'me'];

const isL10n = (v: unknown): v is L10n =>
  !!v && typeof v === 'object' && !Array.isArray(v) && typeof (v as L10n).me === 'string' && typeof (v as L10n).sq === 'string' && typeof (v as L10n).en === 'string';

const filled = (v: L10n | undefined) => !!v && LANG_ORDER.some((k) => v[k].trim() !== '');
const first = (v: L10n) => (LANG_ORDER.map((k) => v[k].trim()).find(Boolean) ?? '').replace(/\*/g, '');

/** Every L10n inside a value (deep). */
function eachL10n(v: unknown, cb: (x: L10n) => void) {
  if (isL10n(v)) return cb(v);
  if (Array.isArray(v)) return v.forEach((x) => eachL10n(x, cb));
  if (v && typeof v === 'object') Object.values(v).forEach((x) => eachL10n(x, cb));
}

export const validHref = (h: string) => /^(\/|#|https?:\/\/|tel:|mailto:)/i.test(h.trim());

function checkCta(cta: Cta | undefined, out: Issue[]) {
  if (!cta) return;
  const href = cta.href.trim();
  if (href && !validHref(href)) out.push({ level: 'error', key: 'v_badLink', vars: { href } });
  else if (!href && filled(cta.label)) out.push({ level: 'error', key: 'v_linkMissing', vars: { label: first(cta.label) } });
}

function checkTitle(title: L10n, out: Issue[]) {
  if (!filled(title)) out.push({ level: 'error', key: 'v_titleEmpty' });
}

function checkMax(len: number, max: number | undefined, list: BKey, out: Issue[]) {
  if (max !== undefined && len > max) out.push({ level: 'error', key: 'v_maxItems', vars: { list, max } });
}

/**
 * Issues for one section. `list` vars hold a dict KEY (e.g. 'questions'); the UI translates it.
 */
export function validateSection(s: HomeSection, ctx: ValidateCtx): Issue[] {
  const out: Issue[] = [];
  const now = ctx.now ?? Date.now();
  const maxItems = SCHEMA[s.type].maxItems;

  switch (s.type) {
    case 'hero': {
      if (!s.data.slides.length) out.push({ level: 'error', key: 'v_noSlides' });
      checkMax(s.data.slides.length, maxItems, 'slides', out);
      s.data.slides.forEach((sl, i) => {
        if (!sl.image) out.push({ level: 'error', key: 'v_slideImage', vars: { n: i + 1 } });
        if (!filled(sl.title)) out.push({ level: 'error', key: 'v_slideTitle', vars: { n: i + 1 } });
        checkCta(sl.primary, out);
        checkCta(sl.secondary, out);
      });
      break;
    }
    case 'trust': {
      if (!s.data.items.length) out.push({ level: 'error', key: 'v_emptyList', vars: { list: 'items' } });
      checkMax(s.data.items.length, maxItems, 'items', out);
      s.data.items.forEach((it, i) => !filled(it.title) && out.push({ level: 'error', key: 'v_itemTitle', vars: { list: 'items', n: i + 1 } }));
      break;
    }
    case 'categories':
    case 'projects':
    case 'blog':
      checkTitle(s.data.title, out);
      break;
    case 'featured': {
      checkTitle(s.data.title, out);
      if (s.data.mode === 'manual') {
        if (!s.data.productIds.length) out.push({ level: 'error', key: 'v_noProducts' });
        const inactive = s.data.productIds.filter((id) => !ctx.activeProductIds.has(id)).length;
        if (inactive) out.push({ level: 'warning', key: 'v_inactiveProducts', vars: { n: inactive } });
      }
      break;
    }
    case 'promo': {
      checkTitle(s.data.title, out);
      const end = new Date(s.data.endsAt).getTime();
      if (Number.isNaN(end)) out.push({ level: 'error', key: 'v_dateInvalid' });
      else if (end <= now) out.push({ level: 'warning', key: 'v_expired' });
      if (!s.data.image) out.push({ level: 'error', key: 'v_imageMissing' });
      checkCta(s.data.cta, out);
      break;
    }
    case 'process': {
      checkTitle(s.data.title, out);
      if (!s.data.steps.length) out.push({ level: 'error', key: 'v_emptyList', vars: { list: 'steps' } });
      checkMax(s.data.steps.length, maxItems, 'steps', out);
      s.data.steps.forEach((it, i) => !filled(it.title) && out.push({ level: 'error', key: 'v_itemTitle', vars: { list: 'steps', n: i + 1 } }));
      break;
    }
    case 'services': {
      checkTitle(s.data.title, out);
      if (!s.data.items.length) out.push({ level: 'error', key: 'v_emptyList', vars: { list: 'servicesList' } });
      checkMax(s.data.items.length, maxItems, 'servicesList', out);
      s.data.items.forEach((it, i) => {
        if (!filled(it.title)) out.push({ level: 'error', key: 'v_itemTitle', vars: { list: 'servicesList', n: i + 1 } });
        else if (!it.image) out.push({ level: 'warning', key: 'v_itemImage', vars: { list: 'servicesList', n: i + 1 } });
      });
      break;
    }
    case 'stats': {
      if (!s.data.items.length) out.push({ level: 'error', key: 'v_emptyList', vars: { list: 'figures' } });
      checkMax(s.data.items.length, maxItems, 'figures', out);
      s.data.items.forEach((it, i) => !it.value.trim() && out.push({ level: 'error', key: 'v_figure', vars: { n: i + 1 } }));
      if (!s.data.image) out.push({ level: 'warning', key: 'v_imageMissing' });
      break;
    }
    case 'faq': {
      checkTitle(s.data.title, out);
      if (!s.data.items.length) out.push({ level: 'error', key: 'v_emptyList', vars: { list: 'questions' } });
      checkMax(s.data.items.length, maxItems, 'questions', out);
      s.data.items.forEach((it, i) => (!filled(it.q) || !filled(it.a)) && out.push({ level: 'error', key: 'v_qa', vars: { n: i + 1 } }));
      break;
    }
    case 'instagram': {
      checkTitle(s.data.title, out);
      if (!s.data.images.length) out.push({ level: 'error', key: 'v_emptyList', vars: { list: 'photos' } });
      else if (s.data.images.length < 4) out.push({ level: 'warning', key: 'v_fewPhotos', vars: { n: s.data.images.length } });
      checkMax(s.data.images.length, maxItems, 'photos', out);
      break;
    }
    case 'cta': {
      checkTitle(s.data.title, out);
      if (!s.data.image) out.push({ level: 'warning', key: 'v_imageMissing' });
      break;
    }
    case 'spotlight': {
      checkTitle(s.data.title, out);
      if (!s.data.image) out.push({ level: 'error', key: 'v_imageMissing' });
      checkMax(s.data.points.length, maxItems, 'points', out);
      s.data.points.forEach((it, i) => !filled(it.text) && out.push({ level: 'error', key: 'v_itemTitle', vars: { list: 'points', n: i + 1 } }));
      if (!s.data.primary.href.trim() && !s.data.secondary.href.trim()) out.push({ level: 'warning', key: 'v_noButtons' });
      checkCta(s.data.primary, out);
      checkCta(s.data.secondary, out);
      break;
    }
  }

  // Translations: a text filled in one language but empty in another
  const missing = new Set<Lang>();
  let fields = 0;
  eachL10n(s.data, (v) => {
    if (!filled(v)) return;
    const gaps = LANG_ORDER.filter((k) => !v[k].trim());
    if (gaps.length) {
      fields++;
      gaps.forEach((g) => missing.add(g));
    }
  });
  if (fields) out.push({ level: 'warning', key: 'v_missingLang', vars: { langs: LANG_ORDER.filter((k) => missing.has(k)).map((k) => (k === 'me' ? 'SR' : k.toUpperCase())).join(', '), n: fields } });

  return out;
}

export function issueCounts(list: Issue[] | undefined) {
  let errors = 0;
  let warnings = 0;
  for (const i of list ?? []) i.level === 'error' ? errors++ : warnings++;
  return { errors, warnings };
}
