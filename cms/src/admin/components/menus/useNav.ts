// Storefront side of the menus module (PDF p.36): the header / footer read their links from the CMS menus.
// Only store + pure helpers here (no admin UI), so the public bundle stays light.
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDb } from '@/store/db';
import type { Menu } from '@/lib/types';
import { liveTree, type LinkSources, type NavNode } from './links';

/** The lists a menu link can point to (stable reference while they don't change). */
export function useLinkSources(): LinkSources {
  return useDb(useShallow((s) => ({ pages: s.pages, products: s.products, collections: s.collections, categories: s.categories, offers: s.offers })));
}

/**
 * Live tree of a menu — only links visible on the storefront right now.
 * Returns [] when the menu is missing or has nothing visible (callers then show their default links).
 */
export function useNavMenu(handle: Menu['handle']): NavNode[] {
  const menus = useDb((s) => s.menus);
  const src = useLinkSources();
  return useMemo(() => {
    const menu = menus.find((m) => m.handle === handle);
    return menu ? liveTree(menu.items, src) : [];
  }, [menus, src, handle]);
}
