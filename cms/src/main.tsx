import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import './index.css';
import App from './App';
import { reloadOnce } from './admin/shell/lazy';

// GitHub Pages: a deep link (/ITCOM/admin/narudzbe) lands on 404.html, which stores the path and opens /ITCOM/admin/.
try {
  const saved = sessionStorage.getItem('itcom-cms-redirect');
  if (saved) {
    sessionStorage.removeItem('itcom-cms-redirect');
    history.replaceState(null, '', saved);
  }
} catch {
  /* ignore */
}

/**
 * Production builds load the stylesheet without blocking the first paint (the static first screen in #root has
 * inline styles — see vite.config.ts / scripts/prerender-meta.mjs). React mounts once the sheet has applied, so the
 * real page never shows unstyled. In dev Vite injects the CSS itself and there is no such link.
 */
function cssReady(): Promise<void> {
  const link = document.querySelector<HTMLLinkElement>('link[data-app-css]');
  const done = () => {
    if (link) link.media = 'all';
    document.getElementById('shell-css')?.remove();
  };
  if (!link || link.sheet) {
    done();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const finish = () => {
      done();
      resolve();
    };
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
  });
}

/**
 * Clickjacking guard. GitHub Pages can't send X-Frame-Options / CSP frame-ancestors (and browsers ignore
 * frame-ancestors in a <meta>), so a page framed by another site gets a link to open it instead of the shop. The
 * CMS previews frame the site from the same origin and keep working.
 */
function framedByOtherSite(): boolean {
  if (window.top === window.self) return false;
  try {
    return window.top!.location.origin !== window.location.origin;
  } catch {
    return true;
  }
}

if (framedByOtherSite()) {
  const root = document.getElementById('root')!;
  const link = document.createElement('a');
  link.href = window.location.href;
  link.target = '_top';
  link.rel = 'noopener';
  link.textContent = 'ITCOM →';
  link.style.cssText = 'display:block;padding:24px;font:600 16px system-ui,sans-serif;color:#1c1a17';
  root.replaceChildren(link);
} else {
  void cssReady().then(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
}

// ITCOM: no service worker — the CMS shares its origin with the shop, and a worker scoped to /ITCOM/ would cache shop
// pages. Remove one left over from an earlier build.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((list) => list.filter((r) => r.scope.includes('/ITCOM/')).forEach((r) => void r.unregister())).catch(() => {});
}

// A preloaded chunk failed (new deploy or flaky connection): reload once to fetch the current files.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault();
});
