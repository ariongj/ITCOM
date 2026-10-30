import type { ComponentType } from 'react';
import {
  Award, BadgeCheck, BadgePercent, BookOpen, CalendarCheck, Clock, CreditCard, Eye, FlaskConical, Gem, Glasses, HeartHandshake,
  HelpCircle, Images, Instagram, LayoutGrid, ListOrdered, MapPin, Microscope, Package, Phone, Quote, RotateCcw, ScanEye, ScanFace,
  ShieldCheck, Sparkles, Stethoscope, Store, Sun, Truck, Wrench, GalleryHorizontalEnd, ShoppingBag,
} from 'lucide-react';
import type { HomeSection, HomeSectionType, L10n } from '@/lib/types';
import type { BKey } from './i18n';

type IconC = ComponentType<{ className?: string }>;

/** Neutral icon tile (CMS v2: black / grey / white, no decorative colour). */
export const ICON_TILE = 'bg-[#F4F4F4] text-ink ring-black/[0.06]';

/** Visual identity of each homepage section type in the builder. */
export const SECTION_META: Record<HomeSectionType, { icon: IconC; tone: string }> = {
  hero: { icon: GalleryHorizontalEnd, tone: ICON_TILE },
  trust: { icon: ShieldCheck, tone: ICON_TILE },
  categories: { icon: LayoutGrid, tone: ICON_TILE },
  featured: { icon: ShoppingBag, tone: ICON_TILE },
  promo: { icon: BadgePercent, tone: ICON_TILE },
  process: { icon: ListOrdered, tone: ICON_TILE },
  services: { icon: Wrench, tone: ICON_TILE },
  projects: { icon: Images, tone: ICON_TILE },
  stats: { icon: Quote, tone: ICON_TILE },
  instagram: { icon: Instagram, tone: ICON_TILE },
  faq: { icon: HelpCircle, tone: ICON_TILE },
  blog: { icon: BookOpen, tone: ICON_TILE },
  cta: { icon: CalendarCheck, tone: ICON_TILE },
  spotlight: { icon: Sparkles, tone: ICON_TILE },
};

/** Icons the storefront trust bar knows how to render (see site/sections/HomeSections ICONS). */
export const TRUST_ICONS: { name: string; icon: IconC }[] = [
  { name: 'Eye', icon: Eye },
  { name: 'ScanEye', icon: ScanEye },
  { name: 'ScanFace', icon: ScanFace },
  { name: 'Glasses', icon: Glasses },
  { name: 'Sun', icon: Sun },
  { name: 'FlaskConical', icon: FlaskConical },
  { name: 'Microscope', icon: Microscope },
  { name: 'Stethoscope', icon: Stethoscope },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'BadgeCheck', icon: BadgeCheck },
  { name: 'Truck', icon: Truck },
  { name: 'Package', icon: Package },
  { name: 'Clock', icon: Clock },
  { name: 'CalendarCheck', icon: CalendarCheck },
  { name: 'Award', icon: Award },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Gem', icon: Gem },
  { name: 'Store', icon: Store },
  { name: 'MapPin', icon: MapPin },
  { name: 'RotateCcw', icon: RotateCcw },
  { name: 'CreditCard', icon: CreditCard },
  { name: 'HeartHandshake', icon: HeartHandshake },
  { name: 'Wrench', icon: Wrench },
  { name: 'Phone', icon: Phone },
];

export const trustIcon = (name: string): IconC => TRUST_ICONS.find((i) => i.name === name)?.icon ?? Sparkles;

/** Strip *accent* markers. */
export const stripStars = (s: string) => s.replace(/\*/g, '');

/** One-line description of a section for the list (its headline) + a count chip. */
export function sectionSummary(s: HomeSection, l: (v: L10n) => string, t: (k: BKey, v?: Record<string, string | number>) => string): { line: string; meta: string } {
  switch (s.type) {
    case 'hero':
      return {
        line: stripStars(l(s.data.slides[0]?.title ?? { me: '', sq: '', en: '' })),
        meta: t('count_slides', { n: s.data.slides.length }),
      };
    case 'trust':
      return { line: s.data.items.map((i) => l(i.title)).join(' · '), meta: t('count_items', { n: s.data.items.length }) };
    case 'featured':
      return {
        line: stripStars(l(s.data.title)),
        meta: s.data.mode === 'manual' ? `${t('mode_manual')} · ${t('count_products', { n: s.data.productIds.length })}` : t(`mode_${s.data.mode}`),
      };
    case 'process':
      return { line: stripStars(l(s.data.title)), meta: t('count_steps', { n: s.data.steps.length }) };
    case 'services':
      return { line: stripStars(l(s.data.title)), meta: t('count_services', { n: s.data.items.length }) };
    case 'stats':
      return { line: `„${l(s.data.quote)}“`, meta: t('count_figures', { n: s.data.items.length }) };
    case 'faq':
      return { line: stripStars(l(s.data.title)), meta: t('count_questions', { n: s.data.items.length }) };
    case 'instagram':
      return { line: stripStars(l(s.data.title)), meta: t('count_photos', { n: s.data.images.length }) };
    case 'promo':
      return { line: stripStars(l(s.data.title)), meta: s.data.code ? s.data.code : '' };
    case 'spotlight':
      return { line: stripStars(l(s.data.title)), meta: s.data.primary.href || s.data.secondary.href };
    default:
      return { line: stripStars(l(s.data.title)), meta: '' };
  }
}
