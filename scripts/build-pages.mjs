#!/usr/bin/env node
// Faqet statike të produkteve (raporti P02): p/<id>/index.html për çdo produkt të dyqanit, plus sitemap.xml.
// Çdo faqe është vetë dyqani (index.html) me titullin, përshkrimin, adresën kanonike, të dhënat e strukturuara
// (pa vlerësime) dhe përmbajtjen e produktit të shkruara në HTML, që motorët e kërkimit ta lexojnë pa JavaScript.
// Ekzekutimi: node scripts/build-pages.mjs   (sa herë ndryshojnë produktet në js/products.js ose index.html)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
// Kontrolli i katalogut së pari: pa SKU të përsëritura, çmime negative, foto të prishura apo kategori bosh.
const check = spawnSync(process.execPath, [root + 'scripts/check-catalog.mjs'], { stdio: 'inherit' });
if (check.status !== 0) { console.error('Faqet nuk u ndërtuan: rregulloni gabimet e katalogut.'); process.exit(1); }
const ctx = { window: {} };
vm.runInNewContext(readFileSync(root + 'js/products.js', 'utf8'), ctx);
// Produktet me foto reale (pa çmim të ITCOM ende): faqe pa çmim dhe pa Offer në të dhënat e strukturuara.
vm.runInNewContext(readFileSync(root + 'js/products-real.js', 'utf8'), ctx);
// Grupet dhe nënkategoritë e menysë (për faqet statike të kategorive).
vm.runInNewContext(readFileSync(root + 'js/categories.js', 'utf8'), ctx);
const { PRODUCTS, STORE: S, FACETS } = ctx.window;
const template = readFileSync(root + 'index.html', 'utf8');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: S.currency }).format(n);
const imgOf = (p) => p.img || `assets/products/${p.id}.webp`;
const keySpecs = (p) => (FACETS[p.cat] || []).filter((f) => p.attrs?.[f.key] !== undefined).map((f) => [f.label, f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]]);
const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function replaceOnce(html, from, to) {
  if (!html.includes(from)) throw new Error(`index.html: nuk u gjet ${from.slice(0, 60)}`);
  return html.replace(from, to);
}
const setAttr = (html, re, value) => {
  if (!re.test(html)) throw new Error(`index.html: nuk u gjet ${re}`);
  return html.replace(re, (m, a, b) => a + esc(value) + b);
};

function page(p) {
  const url = `${S.siteUrl}p/${p.id}/`;
  const image = new URL(imgOf(p), S.siteUrl).href;
  const specs = keySpecs(p);
  const short = specs.slice(0, 3).map(([, v]) => v).join(' · ') || p.specs.slice(0, 2).join(' · ');
  const title = `${p.name} · ITCOM`;
  const quote = !!p.quote || !(p.price > 0);
  const desc = quote
    ? `${p.name}: ${short}. Kërkoni ofertë nga ITCOM për çmimin dhe afatin e dorëzimit.`
    : `${p.name}: ${short}. ${fmt(p.price)} me TVSH, garanci 24 muaj, dërgesë në gjithë Kosovën.`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.id.toUpperCase(),
    brand: { '@type': 'Brand', name: p.brand },
    category: p.cat,
    image: [image],
    description: p.desc || p.specs.join(' · '),
    url,
    ...(quote ? {} : {
      offers: {
        '@type': 'Offer',
        url,
        price: p.price.toFixed(2),
        priceCurrency: S.currency,
        availability: p.stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'ITCOM' },
      },
    }),
  };
  const crumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ballina', item: S.siteUrl },
      { '@type': 'ListItem', position: 2, name: p.cat, item: `${S.siteUrl}kategoria/${slug(p.cat)}/` },
      { '@type': 'ListItem', position: 3, name: p.name, item: url },
    ],
  };
  // Përmbajtja e lexueshme pa JavaScript; dyqani e zëvendëson me faqen e plotë kur ngarkohet.
  const body = `
      <nav class="crumbs" aria-label="Navigimi"><a href="#/">Ballina</a><span aria-hidden="true">/</span><a href="kategoria/${slug(p.cat)}/">${esc(p.cat)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span></nav>
      <div class="pp">
        <div class="pp__gallery"><div class="pp__main"><div class="media"><img src="${esc(imgOf(p))}" alt="${esc(p.name)}" /></div></div></div>
        <div class="pp__info">
          <span class="eyebrow">${esc(p.brand)} / ${esc(p.cat)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="pp__sub">${esc(short)}</p>
          <p class="pp__sku">Kodi i artikullit: <span class="mono">${esc(p.id.toUpperCase())}</span></p>
          <div class="pp__price">${quote ? '<span class="price price--quote">Çmimi me kërkesë</span>' : `<span class="price">${fmt(p.price)}</span>${p.old > p.price ? `<span class="price-old">${fmt(p.old)}</span>` : ''}`}</div>
          ${quote ? '' : `<p class="pp__vat">Çmimi përfshin TVSH ${Math.round(S.vatRate * 100)}%.</p>`}
          <p>${quote ? 'Me porosi · çmimi me kërkesë' : p.stock ? 'Në stok' : 'Jashtë stokut'}</p>
        </div>
      </div>
      <div class="pp__details"><div>
        <h2>Specifikimet</h2>
        <table class="spec-table"><tbody>${[...specs, ['Veçoritë kryesore', p.specs.join(' · ')], ['Garancia', '24 muaj']].map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>
        ${p.desc ? `<h2>Përshkrimi</h2><p class="pp__desc">${esc(p.desc)}</p>` : ''}
      </div></div>`;

  let html = template;
  // Faqja jeton gjithmonë në /ITCOM/p/<id>/: një <base> i shkruar që shfletuesi t'i kërkojë skedarët menjëherë nga rrënja.
  html = html.replace(/\s*<script>\s*\/\/ Faqet e produkteve[\s\S]*?<\/script>/, `\n  <base href="${new URL(S.siteUrl).pathname}" />`);
  if (!html.includes('<base href=')) throw new Error('index.html: nuk u gjet skripti i <base>');
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setAttr(html, /(<meta name="description" content=")[^"]*(")/, desc);
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, url);
  html = setAttr(html, /(<meta property="og:type" content=")[^"]*(")/, 'product');
  html = setAttr(html, /(<meta property="og:title" content=")[^"]*(")/, title);
  html = setAttr(html, /(<meta property="og:description" content=")[^"]*(")/, desc);
  html = setAttr(html, /(<meta property="og:url" content=")[^"]*(")/, url);
  html = setAttr(html, /(<meta property="og:image" content=")[^"]*(")/, image);
  html = html.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, '');
  html = replaceOnce(html, '</head>', `  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n  <script type="application/ld+json">${JSON.stringify(crumbsLd).replace(/</g, '\\u003c')}</script>\n</head>`);
  html = replaceOnce(html, '<div class="view" id="viewHome" data-view="home">', '<div class="view" id="viewHome" data-view="home" hidden>');
  html = replaceOnce(html, '<section class="view container" id="viewProduct" data-view="product" hidden></section>', `<section class="view container" id="viewProduct" data-view="product">${body}\n    </section>`);
  html = replaceOnce(html, '<section class="container biz" id="business"', '<section class="container biz" id="business" hidden');
  return html;
}

/* Faqet statike të kategorive dhe grupeve: /ITCOM/kategoria/<slug>/ me titull, përshkrim, adresë kanonike,
   CollectionPage + ItemList + BreadcrumbList dhe lidhje të lexueshme te produktet (pa JavaScript).
   Dyqani i hap si katalogun përkatës (#/kategoria/<slug>). */
function categoryPage({ slugName, name, list, intro, parent }) {
  const url = `${S.siteUrl}kategoria/${slugName}/`;
  const brands = [...new Set(list.map((p) => p.brand))].slice(0, 6);
  const priced = list.filter((p) => !p.quote && p.price > 0).map((p) => p.price);
  const from = priced.length ? Math.min(...priced) : 0;
  const title = `${name} · ITCOM`;
  const desc = `${name} në ITCOM: ${list.length} produkte${brands.length ? ` nga ${brands.join(', ')}` : ''}. ${from ? `Nga ${fmt(from)} me TVSH. ` : ''}Krahaso specifikimet dhe disponueshmërinë; dërgesë në gjithë Kosovën.`;
  const image = list[0] ? new URL(imgOf(list[0]), S.siteUrl).href : `${S.siteUrl}assets/og-image.jpg`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name, description: desc, url,
      mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: list.slice(0, 60).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${S.siteUrl}p/${p.id}/`, name: p.name })) } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ballina', item: S.siteUrl },
      ...(parent ? [{ '@type': 'ListItem', position: 2, name: parent.name, item: `${S.siteUrl}kategoria/${parent.slug}/` }] : []),
      { '@type': 'ListItem', position: parent ? 3 : 2, name, item: url },
    ] },
  ];
  const body = `
      <nav class="crumbs" aria-label="Navigimi"><a href="./">Ballina</a><span aria-hidden="true">/</span>${parent ? `<a href="kategoria/${parent.slug}/">${esc(parent.name)}</a><span aria-hidden="true">/</span>` : ''}<span aria-current="page">${esc(name)}</span></nav>
      <h1 class="page-title">${esc(name)}</h1>
      <p class="muted page-sub">${esc(intro || desc)}</p>
      <ul class="seo-list">${list.map((p) => `<li><a href="p/${p.id}/">${esc(p.name)}</a> · ${(!p.quote && p.price > 0) ? fmt(p.price) : 'Çmimi me kërkesë'}</li>`).join('')}</ul>`;
  let html = template;
  html = html.replace(/\s*<script>\s*\/\/ Faqet e produkteve[\s\S]*?<\/script>/, `\n  <base href="${new URL(S.siteUrl).pathname}" />`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  html = setAttr(html, /(<meta name="description" content=")[^"]*(")/, desc);
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, url);
  html = setAttr(html, /(<meta property="og:title" content=")[^"]*(")/, title);
  html = setAttr(html, /(<meta property="og:description" content=")[^"]*(")/, desc);
  html = setAttr(html, /(<meta property="og:url" content=")[^"]*(")/, url);
  html = setAttr(html, /(<meta property="og:image" content=")[^"]*(")/, image);
  html = html.replace(/\s*<meta property="og:image:(width|height)"[^>]*>/g, '');
  html = replaceOnce(html, '</head>', ld.map((x) => `  <script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n') + '\n</head>');
  html = replaceOnce(html, '<div class="view" id="viewHome" data-view="home">', '<div class="view" id="viewHome" data-view="home" hidden>');
  html = replaceOnce(html, '<section class="view container" id="viewPage" data-view="page" hidden></section>', `<section class="view container" id="viewPage" data-view="page">${body}\n    </section>`);
  html = replaceOnce(html, '<section class="container biz" id="business"', '<section class="container biz" id="business" hidden');
  return html;
}
const catDir = root + 'kategoria/';
if (existsSync(catDir)) rmSync(catDir, { recursive: true });
const catPages = [];
const writeCat = (cfg) => { mkdirSync(`${catDir}${cfg.slugName}`, { recursive: true }); writeFileSync(`${catDir}${cfg.slugName}/index.html`, categoryPage(cfg)); catPages.push(cfg.slugName); };
const groups = ctx.window.CATEGORY_GROUPS || [];
const shopCats = [...new Set(PRODUCTS.map((p) => p.cat))];
const groupOf = (cat) => groups.find((g) => g.subs.some((x) => (x.cat || x.name) === cat));
for (const cat of shopCats) {
  const g = groupOf(cat);
  writeCat({ slugName: slug(cat), name: cat, list: PRODUCTS.filter((p) => p.cat === cat), parent: g ? { name: g.name, slug: g.slug } : null });
}
for (const g of groups) {
  const cats = new Set(g.subs.map((x) => x.cat || x.name));
  const list = PRODUCTS.filter((p) => cats.has(p.cat));
  if (!list.length || catPages.includes(g.slug)) continue;
  writeCat({ slugName: g.slug, name: g.name, list, intro: `${g.name}: ${[...cats].filter((c) => shopCats.includes(c)).join(', ')}. ${list.length} produkte në ITCOM.` });
}

// Faqet e vjetra të produkteve që nuk ekzistojnë më hiqen.
const dir = root + 'p/';
if (existsSync(dir)) rmSync(dir, { recursive: true });
for (const p of PRODUCTS) {
  mkdirSync(`${dir}${p.id}`, { recursive: true });
  writeFileSync(`${dir}${p.id}/index.html`, page(p));
}

const today = new Date().toISOString().slice(0, 10);
const urls = [S.siteUrl, ...catPages.map((c) => `${S.siteUrl}kategoria/${c}/`), ...PRODUCTS.map((p) => `${S.siteUrl}p/${p.id}/`)];
writeFileSync(root + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`faqe produktesh: ${PRODUCTS.length}, faqe kategorish: ${catPages.length}, sitemap: ${urls.length} adresa`);
