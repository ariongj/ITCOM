import { useDb } from './db';
import { useUi } from './ui';

/**
 * Keep every open tab (storefront, admin, live-preview iframe) in sync:
 * when one tab writes to localStorage, the others rehydrate instantly.
 * This is what makes "place an order in one tab → it pops up in the CMS" work.
 */
export function startCrossTabSync() {
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'itcom-cms-db') void useDb.persist.rehydrate();
    if (e.key === 'itcom-cms-ui') void useUi.persist.rehydrate();
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
