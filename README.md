# ITCOM — IT Equipment Store

A fast, dependency‑free storefront for IT equipment: 50 laptops, processors and graphics cards, every one shown with an official manufacturer photo, plus a 3D PC builder.

The store's interface and product content are in **Albanian** (prices formatted as `1.199,00 €`, dates in Albanian). The layout follows big electronics retailers (Best Buy, Gjirafa50, Foleja): store header with a category search bar, category sidebar beside a banner carousel, deal and product shelves, a brand grid and a footer. The finish is quiet and premium: neutral greys and near-black, one blue accent (`#0a6cdf`), the Manrope typeface, borderless cards with soft shadows, monochrome brand logos and a dark studio for the PC builder.

## Features

**Shopping** (layout from the visual report of 30 October 2026, "Round 01")
- Home page in a fixed order: one hero item at a time (slider kept) with two side promos, a 4‑item service strip, "Gjej kategorinë tënde", a curated row ("Përzgjedhje që ia vlen t’i shohësh", the CMS's *featured* products), the PC builder and "Cili laptop të përshtatet?" blocks, brands, ITCOM Business and the footer
- One product card everywhere: square photo, 2‑line title, short specs, price, old price only when the discount is real, stock, one button; no stars
- Every view has its own address: catalogue `#/kategoria/laptope`, `#/produktet`, `#/ofertat`, search `#/kerko/<term>`, cart `#/shporta`, checkout `#/porosia`, confirmation `#/konfirmimi/<no>`; each product has a real page at **`/ITCOM/p/<id>/`**
- Product page: gallery, H1, tabs (Specifikimet / Përshkrimi / Dërgesa & garancia), "Pyet për produktin" (goes to the CMS inbox), sticky add‑to‑cart bar on phones
- Cart page and checkout in three steps (Shporta / Të dhënat / Konfirmimi), guest checkout, errors next to each field, order summary always visible
- Catalogue states: loading skeleton, "nothing matches" with "Pastro filtrat", load error with retry; the result count is announced to screen readers
- Compare up to 4 products from the same category: sticky header (photo, name, price, button), grouped rows, horizontal scroll on phones, "only show differences"
- ITCOM Business: a quote request form (company, contact, items prefilled from the cart) that lands in the CMS inbox
- Wishlist, cart drawer with stock limits and undo, free‑delivery meter, VAT breakdown

**Advanced filtering (Gjirafa50‑style)**
- Filters change with the category: Laptops get Type, Processor, RAM, Storage, Screen size, Graphics and OS; Processors get Series, Socket and Cores; Graphics cards get Chip, Series and Memory
- Live counts next to every option, recalculated against all other active filters; options with no results are greyed out
- Price range with min/max inputs, a dual slider and quick presets
- Brand filter with search, "show all" for long lists, collapsible groups (remembered)
- Availability (in stock, on sale)
- Active filter chips with one‑click removal and "Clear all"
- Sort (recommended, price, biggest discount, name), pagination
- On phones, filters open in a drawer with a "Show N results" button

**Honest data and SEO**
- No ratings or review counts anywhere, including structured data, until real reviews exist
- Laptops whose RAM/SSD depend on the configuration say so; the placeholder phone number is never shown as real; the footer marks the shop as a demo
- Static product pages (`p/<id>/index.html`) with their own title, description, canonical URL, Open Graph tags and `Product` + `BreadcrumbList` JSON‑LD, readable without JavaScript; `sitemap.xml` lists them. Regenerate both after changing products: `node scripts/build-pages.mjs`
- Products added later in the CMS (no static page yet) still open: `404.html` sends `/ITCOM/p/<id>/` to the shop

Responsive from 360 px phones to wide screens with no sideways scrolling, keyboard accessible (visible focus, the slider pauses on hover and focus), respects reduced motion.

> Checkout is a front‑end demo: no order is sent and no payment is taken. Connect it to a backend or a platform (Shopify, WooCommerce, a payment provider) to take real orders.

## PC builder (Ndërto PC)

A 3D configurator at `#builder` (menu button **Ndërto PC**, home banner, or `index.html#builder`).

- **Live 3D model** (three.js, `js/pc3d.js`), shown in a dark studio with a reflective floor, soft shadows, ambient occlusion (desktop), soft bloom on the RGB lighting and ACES tone mapping. Parts are modelled in detail: finned VRM and M.2 heatsinks, chokes, RAM heat spreaders, a flow-through GPU with visible fin stack and backplate, and braided 24-pin, CPU and GPU power cables in the case colour: the case with glass side panel, motherboard, RAM, graphics card, air or liquid CPU cooler, fans and PSU shroud. Drag to rotate, scroll or pinch to zoom, optional auto-rotate. The view is labelled as orientative: real parts can differ in shape and colour. Four case styles (mesh, glass, wood, perforated), case colour, and an RGB lighting colour that lights fans, RAM, pump and GPU.
- **Parts**: CPU, motherboard, RAM, GPU, cooler, SSD, PSU, case, from the real catalogue (`window.BUILD_SPECS` in `js/products.js` holds the technical data: socket, RAM type, GPU length, cooler height, radiator sizes, wattage).
- **Compatibility checks**: CPU/motherboard socket, RAM type, GPU length vs case, cooler height or radiator size vs case, PSU wattage (estimated draw × 1.2 minimum, × 1.4 recommended). When a choice clashes, the builder proposes the closest-priced part that fits and shows the change and the price difference in a confirmation panel; nothing changes until the customer confirms. PSUs that are too weak are blocked.
- **Presets**: Gaming 1080p, Gaming 1440p, 4K dhe krijues.
- **Totals**: price, instalments, power meter, optional assembly service (`srv-assembly` in `window.SERVICES`, 39 €), one click to add the whole PC to the cart.
- **Accounts**: sign up / sign in from the header, save builds (with a snapshot of the 3D view), reopen them or add them to the cart later. Checkout is pre-filled from the account. **Demo only**: accounts live in the browser's `localStorage`, passwords are stored as SHA-256 hashes, there is no server.

The 3D code loads only when the builder opens. three.js r160 is vendored in `js/vendor/` (MIT).

## CMS (/admin)

The shop has the same CMS as the Selca and Miftari Vision builds: **https://ariongj.github.io/ITCOM/admin/** (footer link "Hyrje për stafin"). Demo login is pre-filled: `admin@itcom.example` / `itcom2026`.

- **Modules**: overview dashboard, orders (detail, status workflow, invoices, draft orders, returns), products (editor with photos, prices and sale prices, stock, specs, SEO), categories, inventory and purchase orders, customers and segments, inbox (business quote requests), info pages, media, home-page banners (Online Store → Slajdet), analytics, integrations and settings (contact data, WhatsApp, VAT, free-delivery threshold, delivery fee). Albanian, English and Serbian admin.
- **Connected to the shop** (`js/cms-bridge.js`): when the CMS has data in the browser, the shop uses it: products, prices, sale prices, stock, photos, categories, store settings, the info pages (`returns`, `warranty`, `about`, `business`, `careers`, `privacy`) and the home banners. Orders placed at checkout and "Kërkoni ofertë" requests go into the CMS (instantly if it is open in another tab; otherwise they wait in an outbox and are imported when the CMS is opened).
- **Demo only, like Selca/Optika**: everything is stored in the browser's `localStorage`, so changes are visible in that browser only, not to other visitors, and there is no real login. Before going live it needs a backend (database + accounts) or a publish step that writes the catalogue back to the site.
- **Source** is in `cms/` (Vite + React + TypeScript, based on the Optika app). The catalogue seed is generated from `js/products.js`. To rebuild after changing the shop catalogue or the CMS code:

```bash
cd cms && npm ci && npm run site   # → admin/index.html, cms-assets/, fonts/
```

Deep links such as `/ITCOM/admin/narudzbe` work through `404.html`, which reopens the CMS on that screen.

## Photos

Banner photos in `assets/photos/` are real photographs from Unsplash (Unsplash License): ELLA DON (gaming, PC builder banner), User_Pascal (network switch, networking banner), ergonofis (workspace, ITCOM Business). Sources and licence notes are in `assets/photos/asset-manifest.json` and `CREDITS.md`. They are used only for banners, never as product photos.

## Live site

The store is published with GitHub Pages at **https://ariongj.github.io/ITCOM/** from the `gh-pages` branch. To update the live site, push the latest commit to `gh-pages`:

```bash
git push origin HEAD:gh-pages
```

Every product and info page has its own shareable link, for example `#lp-x1c12` (a product) or `#info-delivery` (delivery terms).

## Taking real orders with WhatsApp

Set your number in `js/products.js`:

```js
whatsapp: "38344123456",   // digits only, with country code
```

Checkout then shows **Porosit me WhatsApp**. It opens WhatsApp with the full order (products, total, delivery, payment and the customer's details) ready to send to you. The Kontakti page also gets a WhatsApp button. Set `email` to show an email address on the Kontakti page.

## Store policies

The info pages (Dërgesa, Kthimi, Garancia, Pagesa me këste, Privatësia and others) are in `INFO` in `js/app.js`. The texts are sensible defaults that match the store's stated terms (24–48 h delivery, 14‑day returns, 24‑month warranty); review them against your real policies before launch.

## Run it

Plain HTML/CSS/JS. Open `index.html` or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

To host on **GitHub Pages**: Settings → Pages → Deploy from branch → choose the branch and `/ (root)`.

## Products, images and logos

All products live in `js/products.js`. Each product has a price, optional old price (shows as a discount), stock, specs and an `attrs` object that feeds the filters. Filters per category are defined in `FACETS` in the same file.

**Product images**: every product in the shop has an official manufacturer photo in `assets/products/photo/` (sources and edits in `assets/products/photo/SOURCES.md`; dark promotional NVIDIA shots are in `photo/dark/`). Laptop photos show the model; RAM/SSD depend on the configuration. Parts that only exist in the PC builder (motherboards, RAM, coolers, SSDs, power supplies, cases) are in `window.BUILDER_PARTS` and keep their 3D renders in `assets/products/<id>.webp`; they are not listed in the shop.

```js
{ id: "lp-x1c12", name: "Lenovo ThinkPad X1 Carbon Gen 12", img: "assets/products/lp-x1c12.jpg", ... }
```

Photos on a white or transparent background look best. If an image is missing, the store falls back to the drawing in `js/art.js`.

**Brand logos** are in `js/brands.js`, generated from [Simple Icons](https://simpleicons.org) (CC0). Brands without an icon there (Microsoft, Canon, Brother, Jabra, APC, HPE, CalDigit, Sapphire) are shown as text. Logos are trademarks of their owners.

## Customise

| What | Where |
| --- | --- |
| Products, prices, stock, specs, photos | `js/products.js` (`PRODUCTS`) |
| Filters shown per category | `js/products.js` (`FACETS`) |
| Currency, VAT, delivery fees, instalments, phone | `window.STORE` in `js/products.js` |
| Hero slides and promo tiles | CMS → Online Store → Slides, or `SLIDES` / `renderHero()` in `js/app.js` |
| Static product pages + sitemap | `node scripts/build-pages.mjs` (after product changes) |
| Colours, fonts, radii (light and dark) | tokens at the top of `css/styles.css` |
| Logo / favicon | `assets/favicon.svg` |

## Single‑file build

`python3 scripts/build-single.py dist/itcom.html` bundles everything into one self‑contained HTML file.
