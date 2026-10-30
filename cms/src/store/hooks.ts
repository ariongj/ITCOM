import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDb } from './db';
import { useUi } from './ui';
import { priceCart } from '@/lib/pricing';
import { activePlacements } from '@/lib/offers';
import { collectionProducts } from '@/lib/collections';
import { can, type Action, type Module } from '@/lib/permissions';
import type { DeliveryMethod, PlacementPosition, Product } from '@/lib/types';

export const useSettings = () => useDb((s) => s.settings);

export function useCategories() {
  const cats = useDb((s) => s.categories);
  return useMemo(() => [...cats].sort((a, b) => a.order - b.order), [cats]);
}

/** Active (published) products only — what the storefront shows. */
export function useActiveProducts() {
  const products = useDb((s) => s.products);
  return useMemo(() => products.filter((p) => p.status === 'active'), [products]);
}

export function useProduct(idOrSlug: string | undefined): Product | undefined {
  return useDb((s) => s.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug));
}

export function useCategory(idOrSlug: string | undefined) {
  return useDb((s) => s.categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug));
}

/**
 * Priced cart for the current shopper (storefront language): automatic discounts + the codes the
 * shopper entered (useUi().codes), evaluated by the discount engine (lib/discounts.ts).
 */
export function useCart(opts: { delivery?: DeliveryMethod; city?: string } = {}) {
  const { cart, lang, codes } = useUi(useShallow((s) => ({ cart: s.cart, lang: s.lang, codes: s.codes })));
  const { products, settings, discounts, collections } = useDb(
    useShallow((s) => ({ products: s.products, settings: s.settings, discounts: s.discounts, collections: s.collections })),
  );
  return useMemo(
    () => priceCart(cart, products, settings, { lang, codes, discounts, collections, delivery: opts.delivery, city: opts.city }),
    [cart, products, settings, lang, codes, discounts, collections, opts.delivery, opts.city],
  );
}

/** Live placements (slides / banners / announcement bar) for a storefront position. */
export function usePlacements(position: PlacementPosition) {
  const placements = useDb((s) => s.placements);
  const offers = useDb((s) => s.offers);
  return useMemo(() => activePlacements(placements, position, offers), [placements, offers, position]);
}

/** Products of a collection (by id or slug), storefront-visible only, sorted per collection. */
export function useCollection(idOrSlug: string | undefined) {
  const collections = useDb((s) => s.collections);
  const products = useDb((s) => s.products);
  return useMemo(() => {
    const collection = collections.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
    return { collection, products: collection ? collectionProducts(collection, products, { publicOnly: true }) : [] };
  }, [collections, products, idOrSlug]);
}

/** Permission check for the current demo admin role. */
export function useCan() {
  const role = useUi((s) => s.adminRole);
  return useCallback((module: Module, action: Action = 'view') => can(role, module, action), [role]);
}

/** Staff member the current demo role acts as (first active staff with that role). */
export function useCurrentStaff() {
  const role = useUi((s) => s.adminRole);
  const staff = useDb((s) => s.staff);
  return useMemo(() => staff.find((m) => m.active && m.role === role) ?? staff.find((m) => m.role === 'owner') ?? null, [staff, role]);
}

export function useCartCount() {
  return useUi((s) => s.cart.length);
}

/** Unseen orders + new inquiries (+ CMS v2 queues) — drives admin notification badges. */
export function useAdminBadges() {
  const orders = useDb((s) => s.orders);
  const inquiries = useDb((s) => s.inquiries);
  const returns = useDb((s) => s.returns);
  const bookings = useDb((s) => s.bookings);
  const drafts = useDb((s) => s.drafts);
  return useMemo(
    () => ({
      newOrders: orders.filter((o) => !o.seen).length,
      newInquiries: inquiries.filter((q) => !q.seen).length,
      openReturns: returns.filter((r) => r.status === 'requested' || r.status === 'approved').length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      openDrafts: drafts.filter((d) => d.status !== 'converted').length,
    }),
    [orders, inquiries, returns, bookings, drafts],
  );
}
