# ITCOM — IT Equipment Store

A fast, dependency‑free storefront for IT equipment: about 145 products (laptops, PC parts, monitors, peripherals, networking, printers, phones and more), every one shown with a manufacturer photo, plus a 3D PC builder.

The store's interface and product content are in **Albanian** (prices formatted as `1.199,00 €`, dates in Albanian). The layout follows big electronics retailers (Best Buy, Gjirafa50, Foleja): store header with a category search bar, category sidebar beside a banner carousel, deal and product shelves, a brand grid and a footer. The finish is quiet and premium: neutral greys and near-black, one blue accent (`#0a6cdf`), the Manrope typeface, borderless cards with soft shadows, monochrome brand logos and a dark studio for the PC builder.

## Features

**Shopping** (layout from the visual report of 30 October 2026, "Round 01")
- Home page in a fixed order (updated in Round 03, below)
- One product card everywhere: square photo, 2‑line title, short specs, price, old price only when the discount is real, stock, one button; no stars
- Every view has its own address: catalogue `#/kategoria/laptope`, `#/produktet`, `#/ofertat`, search `#/kerko/<term>`, cart `#/shporta`, checkout `#/porosia`, confirmation `#/konfirmimi/<no>`; each product has a real page at **`/ITCOM/p/<id>/`**
- Product page: gallery, H1, tabs (Specifikimet / Përshkrimi / Dërgesa & garancia), "Pyet për produktin" (goes to the CMS inbox), sticky add‑to‑cart bar on phones
- Cart page and checkout in three steps (Shporta / Të dhënat / Konfirmimi), guest checkout, errors next to each field, order summary always visible
- Catalogue states: loading skeleton, "nothing matches" with "Pastro filtrat", load error with retry; the result count is announced to screen readers
- Compare up to 4 products from the same category: sticky header (photo, name, price, button), grouped rows, horizontal scroll on phones, "only show differences"
- ITCOM Business: a quote request form (company, contact, items prefilled from the cart) that lands in the CMS inbox
- Wishlist, cart drawer with stock limits and undo, free‑delivery meter, VAT breakdown

**Catalogue, banners and collections** (visual report "Raundi 02", 30 October 2026)
- Full catalogue architecture: nine groups (Laptopë & kompjuterë, Komponentë PC, Monitorë & imazh, Periferikë & gaming, Audio & video, Rrjet & ruajtje, Printim & zyrë, Telefona & tabletë, Aksesorë & energji) with their subcategories, in `js/categories.js` or managed in the CMS (Përmbajtja → Menutë → **Kategoritë**)
- Every category has a destination: categories with products open the catalogue (group pages combine them, with subcategory links); the others open their own page with a quote request and, for PC parts, the 3D configurator. Nothing shows products that ITCOM does not list yet
- Mega-menu "Të gjitha kategoritë" (click, keyboard focus, Escape) with an accordion on phones; dark category bar (Laptopë & PC, Komponentë, Aksesorë, Ndërto PC, Ofertat); swipeable category strip with arrows and a progress bar; `#/kategorite` lists everything
- Hero without the sidebar: wider slide, GPU and ITCOM Business boxes kept. Slides by purpose: **product** (model, configuration, price), **launch** (no price, e.g. RTX 50 → filtered series), **collection** (ambient photo), **offer** (real terms and end date); pause button, swipe, arrows, reduced motion
- Collections by use (students, creators, gaming, business): cards with context photo and tagline; the collection page has an intro, the products with filters, "Si i zgjodhëm" and a help button
- Product details: "Konfigurimi në një vështrim" tiles, specifications in groups with "show all", a short description with key points, delivery cost and time by city, and "Para se të porosisësh" with "Pyet për produktin"; accessible tabs (arrow keys)
- Icons: Lucide (ISC), one family, 1.8 px stroke (`js/icons.js`)

**Hot Deals, product grid and phones** (visual report "Raundi 03", 1 November 2026)
- Home order: hero with two promos → dark service boxes → "Gjej kategorinë tënde" → **Hot Deals** → brands → **Eksploro produktet** → compact collections → PC builder and "Këshilla para blerjes" → banner and footer
- **Hot Deals are calculated, not labelled**: only products with a price, a real old price above it and stock (details in Round 04 below). No discount is ever invented, so today it shows the two real offers
- **Eksploro produktet**: 12 products (4×3 on desktop, 2 columns on phones) with quick filters Të gjitha / Laptopë / Komponentë / Aksesorë. "Shiko më shumë" adds 12 without moving the page and shows a loading state and "X nga N produkte"; at the end it says "Të gjitha produktet u shfaqën", and on error it offers a retry. Images load lazily. Catalogue pages use the same "Shiko më shumë"
- Phones: 16 px body and form fields, 24 px titles, 20 px card prices, 44 px buttons (cards, Filtro/Rendit, sticky product CTA), the two promos side by side, services in a 2×2 grid, 2‑line card names
- **Price on request** (`quote: true` or price 0): the card and product page say "Çmimi me ofertë" and offer "Kërko ofertë" instead of "Shto në shportë"; the request (quantity, contact) lands in the CMS inbox as a quote. These products cannot be added to the cart, are sorted after priced ones and have no `Offer` in their structured data

**Premium Hot Deals, brands and phones** (visual report "Raundi 04", 3 November 2026)
- **Hot Deals**: a midnight section with white cards (photo, two-line name, price, old price and "Kursen …" from the data, one "Shiko produktin" button). Desktop grid of 4 per row (4 × 2 with 8 offers, up to 12); with only 1–2 offers the cards become wide instead of repeating products. On phones the offers swipe sideways (scroll-snap, about 300 px per card, the next card peeks in) with previous/next buttons and "Shiko të gjitha ofertat"; no automatic rotation
- Rules: price > 0, a higher previous price, stock, not excluded and still valid. Order: pinned by the team, then discount %, then € saved, then freshness. In the CMS (Produktet → product → **Hot Deals**) the team can pin an offer (1 = first), set the last day it is valid, or exclude it; the card also says whether the product qualifies and why not
- **Brands**: no longer between the offers and the catalogue. A full-width band before the footer ("Markat në katalog") shows logos in their original colours, moving slowly from right to left (about 25 px/s, seamless loop). It pauses on hover and keyboard focus and with "Pauzo lëvizjen" (remembered), stops while off screen, and is a static scrollable list with reduced motion. Clicking a logo opens the catalogue filtered by that brand. 27 of the 51 brands have a logo (Simple Icons, official colours); the others show their name until a proper SVG or transparent PNG is supplied
- **Phones**: header with logo, account, cart and a menu button (the category bar moves into the menu); while scrolling, only the search stays visible (the header slides up without moving the page). Bottom navigation (Kreu, Kategoritë, Të ruajturat, Shporta) on the home page and catalogue only, with safe-area padding, hidden when the comparison bar is open; never on product, cart or checkout pages
- Catalogue on phones: under 480 px the cards are horizontal (photo 112 px, short name, configuration line, price, button); 6 products first and "Shfaq më shumë" adds 6 (desktop 12 + 12). Coming back from a product keeps the filters, sort, loaded products and scroll position. Cards show a short brand + model name; the full name and SKU stay on the product page
- Product page on phones: the title comes before the photo, the photo is about 240 px high and the price + button stay fixed at the bottom
- Footer link groups open as an accordion on phones; the "Këshilla" cards are compact
- Product details on phones: the three tabs become accordion sections (Specifikimet open; several can be open at once); desktop keeps the tabs with arrow-key navigation
- Product states: on-request items say "Çmimi me kërkesë" (never 0 €); quote and availability forms start with the product, its SKU and variant, and the request carries them. A priced product without stock shows "Më njofto kur vjen" instead of a disabled button; the request reaches the CMS inbox tagged `njoftim-stoku`
- Photos: every product photo also exists at 480 and 720 px (`python3 scripts/build-thumbs.py` after adding photos); cards, offers, gallery and thumbnails use `srcset`/`sizes`, so desktop pages download about half the image data (home 956 → 541 KB, catalogue 853 → 339 KB)
- **Payments**: only methods confirmed by ITCOM are shown (CMS → Cilësimet → Pagesat). None is confirmed yet, so checkout says the payment method is confirmed by phone, and no instalments, banks or cards are promised anywhere. Instalments appear only when `installments` in `window.STORE` is set after an agreement with a provider

**Catalogue listing**
- Quick filters above the results (Në stok, Në zbritje, Dërgesë falas, Me çmim) with live counts; picture tiles for the category's type (e.g. laptops: Biznes, Ultrabook, Gaming, 2‑në‑1)
- Grid / list switch (remembered); the list view shows the key specifications next to price, stock and button
- "Shikuar së fundi" (recently viewed) on the catalogue and product pages, with "Pastro listën"

**Demo data and automatic checks** (report "Raundi 03", p. 17–18)
- Demo prices and stock are marked visibly: a "Demo" bar above the header and a note under the price on product pages. Set `demo: false` in `window.STORE` (`js/products.js`) once real inventory is connected
- The shop never shows an old price that is not higher than the current price
- `node scripts/check-catalog.mjs` checks the static catalogue and the published CMS version. It fails on a duplicate SKU, the same product listed twice, a negative price, an old price that is not higher, a broken photo path, an unknown category or an empty category. `scripts/build-pages.mjs` runs it first and stops on errors
- CMS → Publikimi shows the same "Kontrolli i katalogut" (it also checks that every photo loads) and disables "Publiko tani" until the errors are fixed
- Sections filled by the script keep their space while loading, so the page does not jump (layout shift below 0.02 at every width)

**Compatibility and variants** (report "Raundi 03", p. 17)
- Product pages for processors, motherboards, RAM, graphics cards, power supplies, cases and coolers have a "Përputhshmëria" block. It uses the model's data, not its name: socket, memory type (DDR4/DDR5, DIMM or SO-DIMM), power draw, card length and case clearance. It lists the matching products in the shop, with a link to the filtered catalogue (e.g. AM5 motherboards, DDR5 memory, power supplies of 600 W or more)
- The recommended power supply uses the same rule as the 3D configurator (graphics card + a 120 W processor + 75 W, with 40% headroom). Parts the configurator knows get "Provoje në konfiguruesin 3D", which opens the configurator with that part in the current build
- Missing data is never guessed: the block says "Konfirmohet sipas kodit të artikullit". LGA1700 boards (DDR4 or DDR5 depending on the model) and server processors (SP5, RDIMM) are explained
- Sockets of imported processors come from the platform of their series (Ryzen 7000–9000 = AM5, Ryzen 1000–5000 = AM4, EPYC 9004 = SP5); AM4/AM5 boards and "D4" models get their memory type the same way
- One SKU per variant: variants of the same model (packaging OEM / Box, colour) link to each other as "Variantet" on the product page

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

## CMS and CRM (/admin)

The shop has its own CMS: **https://ariongj.github.io/ITCOM/admin/** (footer link "Hyrje për stafin"). Demo login is pre-filled: `admin@itcom.example` / `itcom2026`. Albanian and English admin, roles and permissions per staff member, audit log.

| Area | Screens |
| --- | --- |
| Sales | Overview dashboard · orders (detail, status workflow, invoices) · draft orders · returns |
| Catalogue | Products (photos, prices, sale prices, stock, specs, SEO) · **collections** (hand-picked or by rules) · categories · inventory · purchase orders |
| CRM | Customers (history, spend, notes) · segments · **inbox** (questions, business requests, follow-ups, assignee) · **B2B quotes** (versions, send, accept, convert to order) · **appointments** (calendar, services and hours: PC assembly, diagnostics, cleaning, business consultations) |
| Marketing | **Campaigns** (landing page, announcement bar, banners, linked discount) · **discounts** (codes and automatic: products, order, free delivery, buy X get Y; minimums, dates, usage limits, combinations) |
| Content | Info pages · **blog** ("Këshilla", three buying guides) · **menus** (header links and footer columns) · media |
| Channels | Online Store (slides and banners, **publishing**) · markets · integrations · settings |

Seeded with ITCOM data: four collections, three guides, menus, four services with this week's appointments, two B2B quotes answering the business requests in the inbox. **Discounts and campaigns are seeded as drafts** (`MIRESEVINI5`, `STUDENT`, `PCMONTIM`, free delivery over 150 €): the shop never shows a sale until staff switch it on.

**In the shop** (`js/cms-bridge.js`): products, prices, stock, photos, categories, settings, info pages, slides, collections (`#/koleksioni/<slug>` and a home section), campaigns (`#/oferta/<slug>`, announcement bar, home and catalogue banners), the discount-code box and automatic discounts in cart and checkout, the blog (`#/blog`), menus, and the service booking page (`#/servisi`). Orders, questions, business requests and bookings go into the CMS.

### Publishing: from the CMS to every visitor

The CMS works in the browser (`localStorage`). **Online Store → Publikimi → Publiko tani** writes the public part to the live site: it commits `js/cms-data.js` (and any photo uploaded in the CMS, under `assets/uploads/`) to the `gh-pages` branch through the GitHub API, and GitHub Pages serves it within minutes. The shop loads that file for every visitor; staff browsers with CMS data see their own unpublished changes first (`?preview=1` also shows drafts).

- Needs a **fine-grained token** (github.com → Settings → Developer settings → Fine-grained tokens → only `ariongj/ITCOM` → *Contents: Read and write*). The token stays in that browser (`localStorage["itcom-publish"]`), never in the CMS data or the site.
- Never published: orders, customers, messages, bookings, quotes, staff, costs, stock movements, purchase orders, the audit log and anything in draft. Active discount **codes are readable** in the published file; the screen lists them before publishing.
- Without a token: **Shkarko cms-data.js** and upload it to the repository by hand. A second staff device can **load the live version** into its browser.
- Set "Also update branch" to the source branch, so the next code deploy keeps the content. Code deploys to `gh-pages` must first merge any CMS commits from it.

### Order channel: receive every order

Without a backend, an order placed by a visitor stays in that visitor's browser. The **order channel** fixes that for free: a Google Apps Script (`docs/order-channel.gs`, also in CMS → Publikimi) saves every order, message and booking in a Google Sheet, can email you, and the CMS imports them with **Merr porositë** (duplicates are skipped). Set it up in five minutes as described in the script, paste the Web app URL in Publikimi, publish, and the shop starts sending. Until then, checkout and booking pages tell visitors that requests are stored only in their browser.

### Build

**Source** is in `cms/` (Vite + React + TypeScript). The catalogue seed is generated from `js/products.js`.

```bash
cd cms && npm ci && npm run site   # → admin/index.html, cms-assets/, fonts/
node scripts/build-pages.mjs       # product pages + sitemap (after changing index.html or products)
```

Deep links such as `/ITCOM/admin/narudzbe` work through `404.html`, which reopens the CMS on that screen. Bump `DB_VERSION` in `cms/src/data/seed.ts` when the seed changes (browsers then reload the demo data).

## Photos

Banner photos in `assets/photos/` are real photographs from Unsplash (Unsplash License): ELLA DON (gaming, PC builder banner), User_Pascal (network switch, networking banner), ergonofis (workspace, ITCOM Business). Sources and licence notes are in `assets/photos/asset-manifest.json` and `CREDITS.md`. They are used only for banners, never as product photos.

## Live site

The store is published with GitHub Pages at **https://ariongj.github.io/ITCOM/** from the `gh-pages` branch. To update the live site, push the latest commit to `gh-pages`:

```bash
git push origin HEAD:refs/heads/gh-pages
```

Every product has its own page, for example `/ITCOM/p/lp-x1c12/`; info pages open as `#info-delivery` (delivery terms).

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

**Product images**: every product in the shop has an official manufacturer photo in `assets/products/photo/` (sources and edits in `assets/products/photo/SOURCES.md`; dark promotional NVIDIA shots are in `photo/dark/`). Laptop photos show the model; RAM/SSD depend on the configuration. PC builder parts (motherboards, RAM, coolers, SSDs, power supplies, cases) are in `window.BUILDER_PARTS` with their 3D renders in `assets/products/<id>.webp`; their categories are shared with the shop.

**Imported product pack** (`js/products-real.js`, 97 products): imported from the 100‑product photo pack with `python3 -I scripts/import-real.py <pack folder>`. The script maps each item to a shop category, reads filter attributes from the name and converts the photos to `assets/products/real/<id>.webp` (sources in `assets/products/real/SOURCES.md`). Three items already in the catalogue were skipped (Ryzen 9 9900X3D, a second Logitech G Pro X Superlight 2, a second Fitbit). The prices in the pack come from other shops, so **none are shown**: every imported product is **price on request**, with stock 0. The reference prices stay staff‑only in the CMS (`cms/scripts/real-refs.json` → product page note) and are removed from the published snapshot. **Confirm photo rights before launch.**

To start selling an imported product: CMS → Produktet → open it → set ITCOM's price and stock → switch the template from "Kërkesë oferte" to "Produkt standard" → Publikimi → Publiko tani.

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
| Currency, VAT, delivery fees, instalments, payment methods, phone | `window.STORE` in `js/products.js` (payment methods also in CMS → Cilësimet) |
| Hero slides and promo tiles | CMS → Online Store → Slides, or `SLIDES` / `renderHero()` in `js/app.js` |
| Static product pages + sitemap | `node scripts/build-pages.mjs` (after product or `index.html` changes; runs the catalogue check first) |
| Catalogue check | `node scripts/check-catalog.mjs` |
| Smaller photo versions (480/720 px) | `python3 scripts/build-thumbs.py` |
| Demo marking on/off | `demo` in `window.STORE` (`js/products.js`) |
| Collections, discounts, campaigns, blog, menus, services | CMS, then **Publikimi → Publiko tani** |
| Colours, fonts, radii (light and dark) | tokens at the top of `css/styles.css` |
| Logo / favicon | `assets/favicon.svg` |

## Single‑file build

`python3 scripts/build-single.py dist/itcom.html` bundles everything into one self‑contained HTML file.
