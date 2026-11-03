// Kontroll i automatizuar i katalogut (raporti Raundi 03, f. 17):
// pa SKU të përsëritura, pa çmime negative, pa foto të prishura, pa kategori bosh,
// pa çmim të vjetër që nuk është më i lartë, pa produkte të shumëfishuara.
//
// Kontrollon si katalogun statik (js/products.js + js/products-real.js) ashtu edhe versionin e publikuar
// nga CMS-i (js/cms-data.js), sepse ky i fundit është ai që shohin vizitorët.
//
// Ekzekutimi: node scripts/check-catalog.mjs        (kodi 1 kur ka gabime; paralajmërimet nuk e ndalojnë)
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url).pathname;
const load = (files) => {
  const ctx = { window: {}, console };
  for (const f of files) if (existsSync(root + f)) vm.runInNewContext(readFileSync(root + f, 'utf8'), ctx);
  return ctx.window;
};

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const imgOk = (src) => {
  if (!src) return false;
  if (/^(https?:)?\/\//.test(src) || src.startsWith('data:')) return true;
  const rel = src.replace(/^\/ITCOM\//, '').replace(/^\//, '').split(/[?#]/)[0];
  return existsSync(root + rel);
};

const counts = [];
function checkList(label, products, builderParts, categories) {
  counts.push(`${label}: ${products.length} produkte + ${builderParts.length} pjesë`);
  const ids = new Map();
  const names = new Map();
  for (const p of [...products, ...builderParts]) {
    const where = `${label} ${p.id}`;
    const key = String(p.sku || p.id).toUpperCase();
    if (ids.has(key)) err(where, `SKU e përsëritur (${key})`);
    ids.set(key, p.id);
    const n = norm(p.name);
    if (names.has(n) && names.get(n) !== p.id) err(where, `i njëjti produkt si ${names.get(n)} ("${p.name}")`);
    names.set(n, p.id);
  }
  for (const p of products) {
    const where = `${label} ${p.id}`;
    if (!(typeof p.price === 'number' && p.price >= 0)) err(where, `çmim i pavlefshëm (${p.price})`);
    if (p.old !== undefined && p.old !== null && !(p.old > p.price)) err(where, `çmimi i vjetër ${p.old} nuk është më i lartë se ${p.price}`);
    if (p.stock !== undefined && !(Number.isInteger(p.stock) && p.stock >= 0)) err(where, `stok i pavlefshëm (${p.stock})`);
    if (!(p.price > 0) && !p.quote && p.stock > 0) warn(where, 'pa çmim por me stok');
    if (!p.cat || (categories && !categories.has(p.cat))) err(where, `kategori e panjohur (${p.cat})`);
    for (const src of [p.img, ...(p.imgs || [])].filter(Boolean)) if (!imgOk(src)) err(where, `foto e prishur (${src})`);
    if (!p.img) warn(where, 'pa foto');
  }
  if (categories) {
    for (const c of categories) if (!products.some((p) => p.cat === c)) err(`${label} kategoria "${c}"`, 'bosh (pa produkte)');
  }
}

// 1. Katalogu statik
const W = load(['js/products.js', 'js/products-real.js']);
checkList('statik', W.PRODUCTS || [], W.BUILDER_PARTS || [], new Set((W.CATEGORIES || []).map((c) => c.id)));

// 2. Versioni i publikuar nga CMS-i
const pub = load(['js/cms-data.js']).ITCOM_PUBLISHED;
if (pub && pub.state) {
  const s = pub.state;
  const sq = (v) => (v && typeof v === 'object' ? v.sq || v.en || '' : v || '');
  const catName = Object.fromEntries((s.categories || []).map((c) => [c.id, sq(c.name)]));
  const live = (s.products || []).filter((p) => p.status === 'active' && (!p.channels || p.channels.includes('online')));
  const isPart = (p) => (p.tags || []).includes('ndërtuesi');
  const asShop = (p) => {
    const sale = p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
    if (p.salePrice != null && p.salePrice > 0 && !sale) warn(`CMS ${p.id}`, `çmimi në zbritje ${p.salePrice} nuk është më i ulët se ${p.price} (nuk shfaqet)`);
    return {
      id: p.id, sku: p.sku, name: sq(p.name), cat: catName[p.categoryId],
      price: sale ? p.salePrice : p.price, old: sale ? p.price : undefined,
      stock: Math.max(0, (p.stock || 0) - (p.unavailable || 0)),
      quote: !!p.quoteOnly || !(p.price > 0),
      img: (p.images || [])[0], imgs: p.images || [],
    };
  };
  const shop = live.filter((p) => !isPart(p)).map(asShop);
  const parts = live.filter(isPart).map(asShop);
  const used = new Set(shop.map((p) => p.cat));
  checkList('CMS', shop, parts, null);
  for (const c of s.categories || []) if (!used.has(sq(c.name)) && !live.some((p) => p.categoryId === c.id)) err(`CMS kategoria "${sq(c.name)}"`, 'bosh (pa produkte aktive)');
  for (const p of s.products || []) {
    if (p.itcom && p.itcom.ref) err(`CMS ${p.id}`, 'referenca e çmimit të tregut është në versionin publik');
    if (p.cost !== undefined) err(`CMS ${p.id}`, 'kostoja e blerjes është në versionin publik');
  }
}

for (const w of warnings) console.log('  ! ' + w);
for (const e of errors) console.log('  ✗ ' + e);
console.log(counts.join(' · '));
console.log(`katalogu: ${errors.length} gabime, ${warnings.length} paralajmërime`);
process.exit(errors.length ? 1 : 0);
