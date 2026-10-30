// Online Store → Tema (PDF p.32 "Theme settings për logo, font, hapësira dhe ngjyra të website publik",
// p.37 "Preferencat për aksesin, faqen e mirëmbajtjes, gjuhën dhe metadata").
//
// The public-site theme lives on `settings.theme` (not in the shared Settings type yet — see readTheme / themePatch).
// The brand colour stays on `settings.brandColor` and the SEO texts on `settings.seo`.
import type { CSSProperties } from 'react';
import type { L10n, Settings } from '@/lib/types';
import { brandVars, DEFAULT_BRAND, isHex } from '@/lib/color';

export type LogoVariant = 'full' | 'mark';
export type FontPair = 'classic' | 'modern' | 'elegant';
export type Density = 'compact' | 'comfortable' | 'airy';
export type SlideLayout = 'full' | 'inset' | 'layered';

export interface StoreTheme {
  logo: LogoVariant;
  /** Header logo height on desktop, px */
  logoSize: number;
  font: FontPair;
  density: Density;
  /** Open Graph image (1200×630) used when the site is shared */
  shareImage: string;
  maintenance: { on: boolean; message: L10n };
  /** Homepage slideshow behaviour (PDF p.31) */
  slideshow: { layout: SlideLayout; autoplay: boolean; interval: number; controls: boolean };
  domain: { name: string; checkedAt?: string };
}

export const DEFAULT_THEME = (phone = '+383 43 777 667'): StoreTheme => ({
  logo: 'full',
  logoSize: 44,
  font: 'classic',
  density: 'comfortable',
  shareImage: '/images/hero/optical.webp',
  maintenance: {
    on: false,
    message: {
      me: `Uređujemo online prodavnicu — vraćamo se uskoro. Za narudžbe i termine pozovite ${phone}.`,
      sq: `Po e rifreskojmë dyqanin online — kthehemi së shpejti. Për porosi dhe termine telefononi ${phone}.`,
      en: `We are refreshing the online store — back soon. For orders and appointments, call ${phone}.`,
    },
  },
  slideshow: { layout: 'full', autoplay: true, interval: 7, controls: true },
  domain: { name: 'itcom.example' },
});

type WithTheme = Settings & { theme?: Partial<StoreTheme> };

/** Theme stored on the settings, merged over the defaults (older data has none). */
export function readTheme(settings: Settings): StoreTheme {
  const base = DEFAULT_THEME(settings.phone);
  const t = (settings as WithTheme).theme ?? {};
  return {
    ...base,
    ...t,
    maintenance: { ...base.maintenance, ...t.maintenance, message: { ...base.maintenance.message, ...t.maintenance?.message } },
    slideshow: { ...base.slideshow, ...t.slideshow },
    domain: { ...base.domain, ...t.domain },
  };
}

/** `updateSettings(themePatch(theme))` — the field is additive (the shared Settings type does not declare it yet). */
export function themePatch(theme: StoreTheme): Partial<Settings> {
  return { theme } as unknown as Partial<Settings>;
}

/* ------------------------------------------------------------------ */
/* Brand colour                                                        */
/* ------------------------------------------------------------------ */
export const BRAND_PRESETS: { hex: string; key: 'preset_brand' | 'preset_terracotta' | 'preset_oak' | 'preset_olive' | 'preset_petrol' | 'preset_navy' }[] = [
  { hex: DEFAULT_BRAND, key: 'preset_brand' },
  { hex: '#b0532c', key: 'preset_terracotta' },
  { hex: '#8a6235', key: 'preset_oak' },
  { hex: '#5a6b3f', key: 'preset_olive' },
  { hex: '#1f5a63', key: 'preset_petrol' },
  { hex: '#283d66', key: 'preset_navy' },
];

export const normHex = (v: string) => {
  const h = v.trim().replace(/^#?/, '#').toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
};

/** WCAG contrast of white text on the colour (buttons are white on brand-600). */
export function whiteContrast(hex: string) {
  const v = normHex(hex).slice(1);
  const ch = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return 1.05 / (lum + 0.05);
}

/* ------------------------------------------------------------------ */
/* Storefront preview inside the neutral CMS                           */
/* ------------------------------------------------------------------ */
/** The warm storefront tokens (src/index.css) — the admin remaps them to greys, a preview restores them locally. */
const WARM_TOKENS: Record<string, string> = {
  '--color-ink': '#1c1a17',
  '--color-ink-soft': '#3a3631',
  '--color-muted': '#6f675e',
  '--color-paper': '#f7f3ee',
  '--color-sand': '#efe7dc',
  '--color-sand-2': '#e6dccd',
  '--color-line': '#e3d9cc',
  '--color-canvas': '#f3f0eb',
};

/** Inline style that makes a subtree look like the public site (brand scale + warm tokens). */
export function storefrontVars(brand: string): CSSProperties {
  return { ...brandVars(isHex(brand) ? brand : DEFAULT_BRAND), ...(WARM_TOKENS as CSSProperties) };
}

export const FONT_PAIRS: Record<FontPair, { heading: CSSProperties; body: CSSProperties; label: string }> = {
  classic: {
    heading: { fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em' },
    body: { fontFamily: 'var(--font-sans)' },
    label: 'Fraunces + Manrope',
  },
  modern: {
    heading: { fontFamily: 'var(--font-sans)', fontWeight: 750, letterSpacing: '-0.035em' },
    body: { fontFamily: 'var(--font-sans)' },
    label: 'Manrope',
  },
  elegant: {
    heading: { fontFamily: 'var(--font-display)', fontWeight: 330, letterSpacing: '-0.025em' },
    body: { fontFamily: 'var(--font-display)', letterSpacing: '0.005em' },
    label: 'Fraunces',
  },
};

/** Preview spacing per density: section padding, gap and card radius. */
export const DENSITY: Record<Density, { pad: number; gap: number; radius: number; scale: number }> = {
  compact: { pad: 14, gap: 8, radius: 10, scale: 0.86 },
  comfortable: { pad: 20, gap: 12, radius: 14, scale: 1 },
  airy: { pad: 28, gap: 16, radius: 18, scale: 1.14 },
};

/** "Shihni ndryshe. Jini vetvetja." → "Shihni ndryshe. Jini *vetvetja.*" (last word in the italic brand serif). */
export const accentLast = (text: string) => (text.includes('*') ? text : text.replace(/(\S+)\s*$/, '*$1*'));
