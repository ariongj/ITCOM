import { useCallback, useMemo } from 'react';
import { useDb } from '@/store/db';
import { useL, useLang } from '@/i18n';
import { committedByProduct } from '@/lib/inventory';
import type { Offer, Placement } from '@/lib/types';
import { offerProducts, runChecks, sourceOf, type LinkCtx, type OfferX, type RuleMode } from './model';

/** Raw store slices the offers screens need (each selected separately — stable references). */
export function useOfferData() {
  const offers = useDb((s) => s.offers);
  const discounts = useDb((s) => s.discounts);
  const placements = useDb((s) => s.placements);
  const products = useDb((s) => s.products);
  const collections = useDb((s) => s.collections);
  const categories = useDb((s) => s.categories);
  const pages = useDb((s) => s.pages);
  const posts = useDb((s) => s.posts);
  const orders = useDb((s) => s.orders);
  const staff = useDb((s) => s.staff);
  const segments = useDb((s) => s.segments);
  const settings = useDb((s) => s.settings);

  const committed = useMemo(() => committedByProduct(orders), [orders]);
  const discountById = useMemo(() => new Map(discounts.map((d) => [d.id, d])), [discounts]);
  const linkedByOffer = useMemo(() => {
    const m = new Map<string, Placement[]>();
    for (const p of placements) if (p.offerId) m.set(p.offerId, [...(m.get(p.offerId) ?? []), p]);
    return m;
  }, [placements]);
  const links: LinkCtx = useMemo(() => ({ categories, products, collections, pages, posts, offers }), [categories, products, collections, pages, posts, offers]);

  return useMemo(
    () => ({ offers, discounts, placements, products, collections, categories, pages, posts, orders, staff, segments, settings, committed, discountById, linkedByOffer, links }),
    [offers, discounts, placements, products, collections, categories, pages, posts, orders, staff, segments, settings, committed, discountById, linkedByOffer, links],
  );
}

export type OfferData = ReturnType<typeof useOfferData>;

/** Pre-activation checks for any offer (list attention markers + the editor checklist). */
export function useChecker(data: OfferData) {
  const lang = useLang('admin');
  const l = useL('admin');
  return useCallback(
    (offer: OfferX | Offer, opts: { linked?: Placement[]; mode?: RuleMode; homeBlock?: boolean } = {}) => {
      const discount = offer.discountId ? data.discountById.get(offer.discountId) : undefined;
      const { collection, list } = offerProducts(offer, data.products, data.collections);
      const linked = opts.linked ?? data.linkedByOffer.get(offer.id) ?? [];
      const slug = offer.slug.trim();
      return runChecks({
        offer,
        mode: opts.mode ?? (offer.discountId ? 'link' : 'none'),
        discount,
        discountMissing: !!offer.discountId && !discount,
        homeBlock: opts.homeBlock ?? offer.placements.includes('home-block'),
        linked,
        participating: list,
        collection,
        source: sourceOf(offer, discount),
        links: { ...data.links, selfSlug: slug },
        committed: data.committed,
        slugTaken: !!slug && data.offers.some((o) => o.id !== offer.id && o.slug === slug),
        lang,
        l,
      });
    },
    [data, lang, l],
  );
}
