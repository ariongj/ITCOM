import type { Db, MediaItem } from '@/lib/types';
import { CATEGORIES, buildProducts } from './catalog';
import { generateOrders } from './demo';
import { buildContentModels, buildReturns } from './cms';
import {
  ITCOM_SEGMENTS, ITCOM_SETTINGS, ITCOM_STAFF, buildItcomAudit, buildItcomInquiries, buildItcomMovements, buildItcomPages,
  buildItcomPurchaseOrders, buildItcomSlides,
} from './itcom';

/** Bump to force every browser to reload fresh demo data. */
export const DB_VERSION = 2;

/** Product photos, exposed in the CMS media library. */
function buildMedia(productImages: string[], now: Date): MediaItem[] {
  const unique = Array.from(new Set(productImages));
  return unique.map((url, i) => {
    const name = url.split('/').pop()!;
    return {
      id: `m_${i + 1}`,
      url,
      name,
      alt: name.replace(/\.webp$/, '').replace(/-/g, ' '),
      folder: url.includes('/photo/') ? 'Produktet' : 'Ndërtuesi i PC‑së',
      uploaded: false,
      createdAt: new Date(now.getTime() - (unique.length - i) * 3600000).toISOString(),
    };
  });
}

export function createSeed(now = new Date()): Db {
  const products = buildProducts(now);
  const settings = structuredClone(ITCOM_SETTINGS);
  const generated = generateOrders(products, settings, [], [], now);
  const { returns, orders } = buildReturns(now, generated);

  return {
    version: DB_VERSION,
    settings,
    categories: structuredClone(CATEGORIES),
    products,
    orders,
    inquiries: buildItcomInquiries(now),
    coupons: [],
    pages: buildItcomPages(now),
    posts: [],
    projects: [],
    media: buildMedia(products.flatMap((p) => p.images), now),
    home: [],
    seededAt: now.toISOString(),

    collections: [],
    discounts: [],
    offers: [],
    placements: buildItcomSlides(products),
    staff: structuredClone(ITCOM_STAFF),
    services: [],
    bookings: [],
    segments: structuredClone(ITCOM_SEGMENTS),
    movements: buildItcomMovements(now, orders, returns),
    purchaseOrders: buildItcomPurchaseOrders(now, products),
    drafts: [],
    returns,
    quotes: [],
    menus: [],
    contentModels: buildContentModels([], [], settings.locations.length),
    audit: buildItcomAudit(now, orders),
    homeDraft: null,
    homeHistory: [],
  };
}
