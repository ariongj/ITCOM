// Build a 50–900 brand scale from a single hex so the client can re-colour the
// whole site from Admin → Postavke and see it update live.
import type { CSSProperties } from 'react';

function hexToHsl(hex: string): [number, number, number] {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

export function isHex(v: string) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export function brandScale(hex: string): Record<string, string> {
  const [h, s, l] = hexToHsl(hex);
  const sat = (d: number) => Math.max(0, Math.min(100, s + d));
  return {
    50: hslToHex(h, sat(-20), 97),
    100: hslToHex(h, sat(-15), 93),
    200: hslToHex(h, sat(-10), 85),
    300: hslToHex(h, sat(-5), 73),
    400: hslToHex(h, s, Math.min(62, l + 18)),
    500: hslToHex(h, s, Math.min(52, l + 8)),
    600: hex,
    700: hslToHex(h, s, Math.max(8, l - 7)),
    800: hslToHex(h, s, Math.max(6, l - 13)),
    900: hslToHex(h, s, Math.max(4, l - 19)),
  };
}

export const DEFAULT_BRAND = '#0a6cdf'; // ITCOM blue (the shop's accent)

/* ------------------------------------------------------------------ */
/* CMS v2: the admin is neutral — black, grey, white (proposal p.07).   */
/* Under /admin the brand scale is remapped to greys (600 = #1A1A1A,    */
/* 700 = #000) and the warm tokens to neutral ones, so every            */
/* `bg-brand-600` / `Button variant="primary"` renders black there.     */
/* The storefront (and the builder's preview iframe, which is its own   */
/* document) keeps the ITCOM brand.                             */
/* ------------------------------------------------------------------ */
export const NEUTRAL_SCALE: Record<string, string> = {
  50: '#f7f7f7',
  100: '#ededed',
  200: '#dadada',
  300: '#bdbdbd',
  400: '#8f8f8f',
  500: '#5f5f5f',
  600: '#1a1a1a',
  700: '#000000',
  800: '#000000',
  900: '#000000',
};

/** Warm storefront tokens → neutral admin tokens (top bar #1A1A1A, sidebar #EBEBEB, work area #F1F1F1). */
export const ADMIN_TOKENS: Record<string, string> = {
  '--color-ink': '#1a1a1a',
  '--color-ink-soft': '#3d3d3d',
  '--color-muted': '#6b6b6b',
  '--color-paper': '#f7f7f7',
  '--color-sand': '#efefef',
  '--color-sand-2': '#e4e4e4',
  '--color-line': '#dedede',
  '--color-canvas': '#f1f1f1',
};

let adminMode = false;
let brandHex = DEFAULT_BRAND;

function setScale(scale: Record<string, string>) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(scale)) root.style.setProperty(`--color-brand-${k}`, v);
}

function setThemeColor(color: string) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

/**
 * Apply the store's brand colour to the document. While the neutral admin theme is on, the colour is only
 * remembered (and applied when leaving /admin) — the CMS never turns red.
 */
export function applyBrand(hex: string) {
  brandHex = isHex(hex) ? hex : DEFAULT_BRAND;
  if (!adminMode) setScale(brandScale(brandHex));
}

/** Switch the neutral CMS theme on (route starts with /admin) or off (storefront: ITCOM brand restored). */
export function setAdminTheme(on: boolean) {
  const root = document.documentElement;
  adminMode = on;
  if (on) {
    setScale(NEUTRAL_SCALE);
    for (const [k, v] of Object.entries(ADMIN_TOKENS)) root.style.setProperty(k, v);
    root.dataset.admin = '';
    setThemeColor('#1A1A1A');
  } else {
    for (const k of Object.keys(ADMIN_TOKENS)) root.style.removeProperty(k);
    delete root.dataset.admin;
    setScale(brandScale(brandHex));
    setThemeColor('#F7F3EE');
  }
}

/**
 * Inline CSS variables that re-enable a brand scale inside one element — e.g. a storefront preview card
 * in the neutral admin: `<div style={brandVars(settings.brandColor)}>…bg-brand-600…</div>`.
 */
export function brandVars(hex: string): CSSProperties {
  const scale = brandScale(isHex(hex) ? hex : DEFAULT_BRAND);
  return Object.fromEntries(Object.entries(scale).map(([k, v]) => [`--color-brand-${k}`, v])) as CSSProperties;
}
