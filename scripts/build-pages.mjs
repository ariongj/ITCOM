#!/usr/bin/env node
// Faqet statike të produkteve (raporti P02): p/<id>/index.html për çdo produkt të dyqanit, plus sitemap.xml.
// Çdo faqe është vetë dyqani (index.html) me titullin, përshkrimin, adresën kanonike, të dhënat e strukturuara
// (pa vlerësime) dhe përmbajtjen e produktit të shkruara në HTML, që motorët e kërkimit ta lexojnë pa JavaScript.
// Ekzekutimi: node scripts/build-pages.mjs   (sa herë ndryshojnë produktet në js/products.js ose index.html)
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../', import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(root + 'js/products.js', 'utf8'), ctx);
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
  const desc = `${p.name}: ${short}. ${fmt(p.price)} me TVSH, garanci 24 muaj, dërgesë në gjithë Kosovën.`;
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
    offers: {
      '@type': 'Offer',
      url,
      price: p.price.toFixed(2),
      priceCurrency: S.currency,
      availability: p.stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: 'ITCOM' },
    },
  };
  const crumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ballina', item: S.siteUrl },
      { '@type': 'ListItem', position: 2, name: p.cat, item: `${S.siteUrl}#/kategoria/${slug(p.cat)}` },
      { '@type': 'ListItem', position: 3, name: p.name, item: url },
    ],
  };
  // Përmbajtja e lexueshme pa JavaScript; dyqani e zëvendëson me faqen e plotë kur ngarkohet.
  const body = `
      <nav class="crumbs" aria-label="Navigimi"><a href="#/">Ballina</a><span aria-hidden="true">/</span><a href="#/kategoria/${slug(p.cat)}">${esc(p.cat)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span></nav>
      <div class="pp">
        <div class="pp__gallery"><div class="pp__main"><div class="media"><img src="${esc(imgOf(p))}" alt="${esc(p.name)}" /></div></div></div>
        <div class="pp__info">
          <span class="eyebrow">${esc(p.brand)} / ${esc(p.cat)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="pp__sub">${esc(short)}</p>
          <p class="pp__sku">Kodi i artikullit: <span class="mono">${esc(p.id.toUpperCase())}</span></p>
          <div class="pp__price"><span class="price">${fmt(p.price)}</span>${p.old > p.price ? `<span class="price-old">${fmt(p.old)}</span>` : ''}</div>
          <p class="pp__vat">Çmimi përfshin TVSH ${Math.round(S.vatRate * 100)}%.</p>
          <p>${p.stock ? 'Në stok' : 'Jashtë stokut'}</p>
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

// Faqet e vjetra të produkteve që nuk ekzistojnë më hiqen.
const dir = root + 'p/';
if (existsSync(dir)) rmSync(dir, { recursive: true });
for (const p of PRODUCTS) {
  mkdirSync(`${dir}${p.id}`, { recursive: true });
  writeFileSync(`${dir}${p.id}/index.html`, page(p));
}

const today = new Date().toISOString().slice(0, 10);
const urls = [S.siteUrl, ...PRODUCTS.map((p) => `${S.siteUrl}p/${p.id}/`)];
writeFileSync(root + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
console.log(`faqe produktesh: ${PRODUCTS.length}, sitemap: ${urls.length} adresa`);
