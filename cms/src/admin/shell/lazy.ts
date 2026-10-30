import { lazy, type ComponentType } from 'react';

/* Code-split CMS screens: retried on a failed download, then the page reloads once to pick up fresh files. */

const RELOAD_KEY = 'itcom-cms-chunk-reload';

/**
 * Reload the page to pick up fresh HTML and the current chunk names — at most once a minute, so a file that is
 * really gone ends on the error screen instead of a reload loop. False when a reload was done recently.
 */
export function reloadOnce(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOAD_KEY) || 0) < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}

/**
 * A code-split chunk can fail to download (a CDN hiccup, a weak mobile signal, or a page left open across a new
 * deploy whose old file names no longer exist). Retry twice, then reload the page once to pick up fresh files;
 * only after that does the error reach the route's error screen.
 */
export function withRetry<T>(fn: () => Promise<T>): () => Promise<T> {
  return async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fn();
      } catch (err) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        if (reloadOnce()) return new Promise<T>(() => {});
        throw err;
      }
    }
  };
}

/** `React.lazy` with retry + one-time reload (used for every code-split page, storefront and CMS). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lazyRetry = <C extends ComponentType<any>>(fn: () => Promise<{ default: C }>) => lazy(withRetry(fn));
