import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

/**
 * Deployment base. Root deployments (Vercel, Netlify, dev server) use "/"; the GitHub Pages workflow builds
 * with BASE_PATH=/optika/. Always normalised to "/x/".
 */
function basePath(): string {
  const raw = (process.env.BASE_PATH ?? '/').trim();
  if (!raw || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}
const base = basePath();

/**
 * Seeded data and JSX reference bundled pictures as absolute "/images/…" strings. Under a sub-path those
 * would 404, so at build time every string literal in src/**\/*.ts(x) that starts with "/images/" is
 * prefixed with the base ('/images/a.webp' → '/optika/images/a.webp'). Checks like
 * `src.startsWith('/images/')` are rewritten the same way, so they keep matching. No-op for base "/".
 */
function baseImages(prefix: string): Plugin {
  const SRC = /[\\/]src[\\/].*\.tsx?$/;
  const LITERAL = /(['"`])\/images\//g;
  return {
    name: 'optika-base-images',
    enforce: 'pre',
    transform(code, id) {
      if (prefix === '/' || !SRC.test(id.split('?')[0]) || !code.includes('/images/')) return null;
      return { code: code.replace(LITERAL, `$1${prefix}images/`), map: null };
    },
  };
}

/**
 * Preload the two fonts every page paints with first (Manrope text, Fraunces display — Latin subsets), so they
 * download in parallel with the JavaScript instead of after it. Phones on slow networks see the real type sooner.
 */
function preloadFonts(prefix: string): Plugin {
  const CRITICAL = /assets\/(?:manrope-latin-wght-normal|fraunces-latin-opsz-normal)-[\w-]+\.woff2$/;
  return {
    name: 'optika-preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        return Object.keys(ctx.bundle ?? {})
          .filter((f) => CRITICAL.test(f))
          .map((f) => ({ tag: 'link', attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `${prefix}${f}`, crossorigin: '' }, injectTo: 'head-prepend' as const }));
      },
    },
  };
}

/**
 * The app stylesheet (~45 KB gzipped, storefront + CMS) must not hold back the first paint: every page ships a
 * static first screen with inline styles (scripts/prerender-meta.mjs), so the sheet loads as a high-priority
 * preload and applies when it lands; main.tsx mounts React only once it has (no unstyled flash).
 */
function asyncCss(): Plugin {
  return {
    name: 'optika-async-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g, (_m, href: string) =>
          [
            `<link rel="preload" as="style" crossorigin href="${href}">`,
            // no inline onload (the CSP allows no inline script): main.tsx switches media to "all"
            `<link rel="stylesheet" crossorigin href="${href}" media="print" data-app-css>`,
            `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`,
            // until the sheet is in: no default body margin and the page colour (main.tsx removes it — unlayered, it
            // would otherwise beat the sheet's layered base styles)
            '<style id="shell-css">body{margin:0;background:#f7f3ee}</style>',
          ].join('\n    '),
        );
      },
    },
  };
}

/**
 * Content-Security-Policy for every built page. GitHub Pages can't send response headers, so it goes in a <meta> —
 * which browsers honour for everything except frame-ancestors, report-uri and sandbox. The full header set
 * (+ frame-ancestors, X-Frame-Options, nosniff, Permissions-Policy) is written to dist/_headers for hosts that read
 * it (Cloudflare Pages, Netlify) and copied in vercel.json — keep that copy in step. On GitHub Pages main.tsx guards
 * against cross-origin framing instead. What the site really loads:
 *  - only its own scripts, styles, fonts, images and the self-hosted MediaPipe runtime (wasm → 'wasm-unsafe-eval');
 *  - inline style attributes (React, the static first screen) → style-src 'unsafe-inline'; no inline script at all;
 *  - data:/blob: images (CMS uploads, try-on snapshots), the try-on's blob wasm and camera stream;
 *  - Web3Forms — the only outside host, contacted only when a form is sent (src/lib/leads.ts);
 *  - same-origin frames only (the CMS previews).
 * Build-only: the dev server injects inline scripts of its own.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data: https://api.web3forms.com https://api.github.com https://script.google.com https://script.googleusercontent.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

/** Response headers for hosts that can send them. Camera stays allowed for the site itself (virtual try-on). */
const HEADERS = {
  'Content-Security-Policy': `${CSP}; frame-ancestors 'self'`,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
};

function securityMeta(prefix: string): Plugin {
  return {
    name: 'optika-security-meta',
    apply: 'build',
    generateBundle() {
      const all = Object.entries(HEADERS).map(([k, v]) => `  ${k}: ${v}`);
      if (process.env.NO_HEADERS) return;
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: [`${prefix}*`, ...all, '', `${prefix}assets/*`, '  Cache-Control: public, max-age=31536000, immutable', ''].join('\n'),
      });
    },
    // first in <head> (after the charset, which must stay in the first 1024 bytes), before anything is fetched
    transformIndexHtml: {
      order: 'post',
      handler: (html) =>
        html
          .replace(/\s*<meta charset="UTF-8" \/>/, '')
          .replace(
            '<head>',
            `<head>\n    <meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">\n    <meta name="referrer" content="strict-origin-when-cross-origin">`,
          ),
    },
  };
}

export default defineConfig({
  base,
  plugins: [baseImages(base), preloadFonts(base), asyncCss(), securityMeta(base), react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
  // manifest: scripts/prerender-meta.mjs reads it to preload a route's lazy chunks from its HTML (then deletes it)
  // JS syntax for Safari/iOS 15 too (iPhone 6s/7 stop at iOS 15.8); the runtime APIs used need iOS 15.4+ at most
  build: { chunkSizeWarningLimit: 1500, assetsDir: 'cms-assets', manifest: false, target: ['es2020', 'safari15', 'ios15', 'chrome100', 'edge100', 'firefox100'] },
});
