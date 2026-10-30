// Builds src/data/itcom-catalog.json from the storefront catalogue (../js/products.js), so the CMS
// starts with exactly the products, prices, stock and photos the shop shows.
// Run: node scripts/itcom-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(root + 'js/products.js', 'utf8'), ctx);
const { PRODUCTS, BUILDER_PARTS, CATEGORIES } = ctx.window;

const same = (v) => ({ me: v, sq: v, en: v });
const T = (sq, en) => ({ me: en, sq, en });

/** Shop categories (from the storefront) + the PC-builder part groups, which stay out of the shop. */
const SHOP = {
  'Laptopë': { id: 'cat-laptop', slug: 'laptope', en: 'Laptops', tagline: T('Laptopë për punë, shkollë dhe krijim', 'Laptops for work, study and creating') },
  'Procesorë': { id: 'cat-cpu', slug: 'procesore', en: 'Processors', tagline: T('AMD Ryzen dhe Intel Core Ultra', 'AMD Ryzen and Intel Core Ultra') },
  'Kartela grafike': { id: 'cat-gpu', slug: 'kartela-grafike', en: 'Graphics cards', tagline: T('NVIDIA GeForce dhe AMD Radeon', 'NVIDIA GeForce and AMD Radeon') },
};
const BUILDER = [
  ['cat-mb', 'pllaka-ame', 'Pllaka amë', 'Motherboards', /^mb-/],
  ['cat-ram', 'memorie-ram', 'Memorie RAM', 'Memory', /^cp-(furyb32|veng32|tz5rgb32)$/],
  ['cat-cooler', 'ftohes', 'Ftohës procesori', 'CPU coolers', /^cl-/],
  ['cat-ssd', 'disqe-ssd', 'Disqe SSD', 'SSDs', /^st-/],
  ['cat-psu', 'furnizues', 'Furnizues rryme', 'Power supplies', /^ps-/],
  ['cat-case', 'kasa', 'Kasa', 'PC cases', /^cs-/],
];

const categories = [
  ...CATEGORIES.map((c, i) => {
    const m = SHOP[c.id];
    return {
      id: m.id, slug: m.slug, name: T(c.id, m.en), tagline: m.tagline, description: m.tagline,
      image: '', order: i + 1, featured: true,
    };
  }),
  ...BUILDER.map(([id, slug, sq, en], i) => ({
    id, slug, name: T(sq, en),
    tagline: T('Vetëm në ndërtuesin e PC‑së', 'PC builder only'),
    description: T('Pjesë që shiten vetëm brenda ndërtuesit të PC‑së, jo në katalog.', 'Parts sold only inside the PC builder, not in the catalogue.'),
    image: '', order: 10 + i, featured: false,
  })),
];

const BADGE = { 'Më i shituri': 'bestseller', 'I ri': 'new' };
const COST = { 'cat-laptop': 0.82, 'cat-cpu': 0.8, 'cat-gpu': 0.84 };

function ean13(n) {
  const body = `200${String(100000000 + n * 7919).slice(-9)}`;
  const sum = body.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}

function product(p, i, categoryId, builderOnly) {
  const sale = p.old && p.old > p.price;
  const badges = [BADGE[p.badge], sale ? 'sale' : null].filter(Boolean);
  const img = p.img || `assets/products/${p.id}.webp`;
  return {
    id: p.id,
    slug: p.id,
    sku: p.id.toUpperCase(),
    categoryId,
    name: same(p.name),
    short: same(p.specs.slice(0, 2).join(' · ')),
    description: same(p.desc || ''),
    price: sale ? p.old : p.price,
    salePrice: sale ? p.price : null,
    unit: 'kom',
    stock: p.stock,
    images: ['/' + img],
    options: [],
    specs: p.specs.map((s) => ({ label: same(''), value: same(s) })),
    badges,
    featured: !!p.badge,
    status: 'active',
    warrantyYears: 2,
    sold: Math.round((p.reviews || 0) * 1.6 + (builderOnly ? 6 : 3)),
    cost: Math.round(p.price * (COST[categoryId] ?? 0.78) * 100) / 100,
    vendor: p.brand,
    tags: builderOnly ? ['ndërtuesi'] : [],
    barcode: ean13(i + 1),
    incoming: 0,
    unavailable: 0,
    template: 'standard',
    channels: ['online', 'pos'],
    // ITCOM storefront fields the CMS keeps as they are (filters, ratings, badge text, drawing fallback)
    itcom: { attrs: p.attrs || {}, rating: p.rating || 0, reviews: p.reviews || 0, badge: p.badge || '', art: p.art || null },
  };
}

const products = [
  ...PRODUCTS.map((p, i) => product(p, i, SHOP[p.cat].id, false)),
  ...BUILDER_PARTS.map((p, i) => {
    const cat = BUILDER.find((b) => b[4].test(p.id));
    if (!cat) throw new Error(`No builder category for ${p.id}`);
    return product(p, PRODUCTS.length + i, cat[0], true);
  }),
];

writeFileSync(new URL('../src/data/itcom-catalog.json', import.meta.url), JSON.stringify({ categories, products }, null, 1));
console.log(`categories ${categories.length}, products ${products.length}`);
