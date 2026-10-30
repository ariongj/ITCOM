// Base-path helpers. The app runs at the domain root (Vercel/Netlify, dev server) and under a sub-path on
// GitHub Pages (`/optika/`). react-router <Link>/navigate() already add the base (router basename); use these
// helpers for RAW URLs only: <a href>, <iframe src>, window.open(), location.href, fetch() of public files.

/** Vite base with a trailing slash, e.g. "/" or "/optika/". */
export const BASE = import.meta.env.BASE_URL || '/';

/** Router basename: the base without its trailing slash ("/" stays "/"). */
export const BASENAME = BASE === '/' ? '/' : BASE.replace(/\/+$/, '');

const isExternal = (p: string) => /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(p);

/** App path → URL under the deployment base: href('/admin/faktura/o_1001') → '/optika/admin/faktura/o_1001'. */
export function href(path: string): string {
  if (!path || isExternal(path)) return path;
  const shop = itcomShopPath(path);
  if (shop !== null) return BASE + shop;
  if (BASE !== '/' && (path === BASENAME || path.startsWith(BASE))) return path; // already prefixed
  return BASE + path.replace(/^\/+/, '');
}

/** Public-folder file → URL under the base: asset('/images/hero/living.webp'). */
export function asset(path: string): string {
  return href(path);
}

/** Strip the base from a pathname (location.pathname → app path). */
export function appPath(pathname: string): string {
  if (BASE === '/' || !pathname.startsWith(BASENAME)) return pathname;
  return pathname.slice(BASENAME.length) || '/';
}

/**
 * ITCOM: the shop is the static site at the base and uses hash links (#product-id, #info-page). Storefront paths that
 * the CMS builds in the Optika style are translated: /produkt/x → #x, /faqe/x → #info-x, /produktet… → the shop home.
 * Returns null for CMS paths (/admin…) and anything else.
 */
function itcomShopPath(path: string): string | null {
  const [p] = path.split(/[?#]/);
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^\/produkt\/([^/]+)\/?$/))) return `#${m[1]}`;
  if ((m = p.match(/^\/faqe\/([^/]+)\/?$/))) return `#info-${m[1]}`;
  if (p === '/' || p.startsWith('/produktet') || p === '/kontakt' || p === '/rreth-nesh' || p === '/kerko') return '';
  return null;
}
