// Builds src/data/itcom-catalog.json from the storefront catalogue (../js/products.js), so the CMS
// starts with exactly the products, prices, stock and photos the shop shows.
// Run: node scripts/itcom-catalog.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(root + 'js/products.js', 'utf8'), ctx);
// Products from the real-photo pack (01.11.2026): no ITCOM price yet ("Çmimi me ofertë" in the shop).
vm.runInNewContext(readFileSync(root + 'js/products-real.js', 'utf8'), ctx);
const { PRODUCTS, BUILDER_PARTS, CATEGORIES } = ctx.window;
/** Internal market references (source shop price on the capture date) — for staff only, never shown as ITCOM prices. */
const REFS = JSON.parse(readFileSync(new URL('./real-refs.json', import.meta.url), 'utf8'));

const same = (v) => ({ me: v, sq: v, en: v });
const T = (sq, en) => ({ me: en, sq, en });

/** Shop categories (from the storefront) + the PC-builder part groups, which stay out of the shop. */
const SHOP = {
  'Laptopë': { id: 'cat-laptop', slug: 'laptope', en: 'Laptops', tagline: T('Laptopë për punë, shkollë dhe krijim', 'Laptops for work, study and creating') },
  'Procesorë': { id: 'cat-cpu', slug: 'procesore', en: 'Processors', tagline: T('AMD Ryzen dhe Intel Core Ultra', 'AMD Ryzen and Intel Core Ultra') },
  'Kartela grafike': { id: 'cat-gpu', slug: 'kartela-grafike', en: 'Graphics cards', tagline: T('NVIDIA GeForce dhe AMD Radeon', 'NVIDIA GeForce and AMD Radeon') },
  // PC-part groups are shared with the 3D builder: builder parts stay out of the shop by their 'ndërtuesi' tag.
  'Pllaka amë': { id: 'cat-mb', slug: 'pllaka-ame', en: 'Motherboards' },
  'Memorie RAM': { id: 'cat-ram', slug: 'ram', en: 'Memory' },
  'SSD': { id: 'cat-ssd', slug: 'ssd', en: 'SSDs' },
  'Furnizues rryme': { id: 'cat-psu', slug: 'furnizues-rryme', en: 'Power supplies' },
  'Kasa': { id: 'cat-case', slug: 'kasa', en: 'PC cases' },
  'Ftohje & ventilatorë': { id: 'cat-cooler', slug: 'ftohje-ventilatore', en: 'Cooling & fans' },
  'Monitorë': { id: 'cat-monitor', slug: 'monitore', en: 'Monitors' },
  'PC gaming': { id: 'cat-pc-gaming', slug: 'pc-gaming', en: 'Gaming PCs' },
  'Maus': { id: 'cat-mouse', slug: 'maus', en: 'Mice' },
  'Tastiera': { id: 'cat-keyboard', slug: 'tastiera', en: 'Keyboards' },
  'Kufje': { id: 'cat-headset', slug: 'kufje', en: 'Headsets' },
  'Kamera sigurie': { id: 'cat-camera', slug: 'kamera-sigurie', en: 'Security cameras' },
  'Routerë': { id: 'cat-router', slug: 'routere', en: 'Routers' },
  'Rrjet mesh': { id: 'cat-mesh', slug: 'rrjet-mesh', en: 'Mesh Wi-Fi' },
  'Switch': { id: 'cat-switch', slug: 'switch', en: 'Switches' },
  'NAS': { id: 'cat-nas', slug: 'nas', en: 'NAS' },
  'Disqe të jashtme': { id: 'cat-extdrive', slug: 'disqe-te-jashtme', en: 'External drives' },
  'Printerë': { id: 'cat-printer', slug: 'printere', en: 'Printers' },
  'Multifunksionale': { id: 'cat-mfp', slug: 'multifunksionale', en: 'All-in-one printers' },
  'Telefona': { id: 'cat-phone', slug: 'telefona', en: 'Phones' },
  'Tabletë': { id: 'cat-tablet', slug: 'tablete', en: 'Tablets' },
  'Orë të mençura': { id: 'cat-watch', slug: 'ore-te-mencura', en: 'Smartwatches & trackers' },
  'Kabllo': { id: 'cat-cable', slug: 'kabllo', en: 'Cables' },
  'Karikues': { id: 'cat-charger', slug: 'karikues', en: 'Chargers' },
  'Hub & dock': { id: 'cat-hub', slug: 'hub-dock', en: 'Hubs & docks' },
};
const BUILDER = [
  ['cat-mb', 'pllaka-ame', 'Pllaka amë', 'Motherboards', /^mb-/],
  ['cat-ram', 'ram', 'Memorie RAM', 'Memory', /^cp-(furyb32|veng32|tz5rgb32)$/],
  ['cat-cooler', 'ftohje-ventilatore', 'Ftohje & ventilatorë', 'Cooling & fans', /^cl-/],
  ['cat-ssd', 'ssd', 'SSD', 'SSDs', /^st-/],
  ['cat-psu', 'furnizues-rryme', 'Furnizues rryme', 'Power supplies', /^ps-/],
  ['cat-case', 'kasa', 'Kasa', 'PC cases', /^cs-/],
];

const categories = [
  ...CATEGORIES.map((c, i) => {
    const m = SHOP[c.id];
    if (!m) throw new Error(`No CMS category for shop category ${c.id}`);
    const tagline = m.tagline || T(`${c.id} nga ITCOM`, `${m.en} from ITCOM`);
    return {
      id: m.id, slug: m.slug, name: T(c.id, m.en), tagline, description: tagline,
      image: '', order: i + 1, featured: i < 3,
    };
  }),
  ...BUILDER.filter(([id]) => !Object.values(SHOP).some((m) => m.id === id)).map(([id, slug, sq, en], i) => ({
    id, slug, name: T(sq, en),
    tagline: T('Vetëm në ndërtuesin e PC‑së', 'PC builder only'),
    description: T('Pjesë që shiten vetëm brenda ndërtuesit të PC‑së, jo në katalog.', 'Parts sold only inside the PC builder, not in the catalogue.'),
    image: '', order: 10 + i, featured: false,
  })),
];

const BADGE = { 'Më i shituri': 'bestseller', 'I ri': 'new' };
/** The curated home-page selection (report V01): the shop shows featured products there. */
const PICKS = ['lp-mba13m4', 'lp-proartp16', 'cp-4070s', 'cp-7800x3d'];
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
    featured: PICKS.includes(p.id),
    status: 'active',
    warrantyYears: 2,
    sold: p.quote ? 0 : Math.round((p.reviews || 0) * 1.6 + (builderOnly ? 6 : 3)),
    // No cost estimate for quote products: ITCOM's purchase price is not known yet.
    cost: p.quote ? undefined : Math.round(p.price * (COST[categoryId] ?? 0.78) * 100) / 100,
    vendor: p.brand,
    tags: builderOnly ? ['ndërtuesi'] : p.quote ? ['me-oferte', 'foto-reale'] : [],
    barcode: ean13(i + 1),
    incoming: 0,
    unavailable: 0,
    // Price on request (CMS template 'quote' ↔ quoteOnly): saved without a price, sold through a quote request.
    // Staff switch the template to 'standard' and set the price when ITCOM sells it from the cart.
    template: p.quote ? 'quote' : 'standard',
    ...(p.quote ? { quoteOnly: true } : {}),
    channels: ['online', 'pos'],
    // ITCOM storefront fields the CMS keeps as they are (filters, ratings, badge text, drawing fallback)
    itcom: {
      attrs: p.attrs || {}, rating: p.rating || 0, reviews: p.reviews || 0, badge: p.badge || '', art: p.art || null,
      // Price on request until staff set ITCOM's price; `ref` = market reference from the photo pack (internal).
      ...(p.quote ? { quote: true, ref: REFS[p.id] || null } : {}),
      // Demo offer (Raundi 05): the shop labels it "Ofertë demo" until the team approves real offers.
      ...(p.demoOffer ? { deal: { demo: true } } : {}),
    },
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
