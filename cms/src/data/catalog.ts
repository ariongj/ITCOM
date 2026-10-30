// ITCOM catalogue for the CMS: generated from the storefront's js/products.js by scripts/itcom-catalog.mjs.
// Image paths are site-relative ("/assets/products/…") and get the deployment base, so the CMS and the
// shop (both under /ITCOM/) point at the same photos.
import type { Category, Product } from '@/lib/types';
import data from './itcom-catalog.json';

const BASE = import.meta.env.BASE_URL || '/';
const withBase = (src: string) => (src.startsWith('/assets/') ? BASE + src.slice(1) : src);

/** Product groups that are sold only inside the PC builder (not listed in the shop). */
export const BUILDER_CATEGORIES = ['cat-mb', 'cat-ram', 'cat-cooler', 'cat-ssd', 'cat-psu', 'cat-case'];

export const CATEGORIES: Category[] = data.categories as Category[];

export function buildProducts(now = new Date()): Product[] {
  return (data.products as unknown as Product[]).map((p, i) => {
    const created = new Date(now.getTime() - (20 + ((i * 37) % 160)) * 86400000).toISOString();
    return { ...p, images: p.images.map(withBase), createdAt: created, updatedAt: created };
  });
}
