# ITCOM — IT Equipment Store

A fast, dependency‑free storefront for IT equipment: laptops, desktops, monitors, tablets, networking, storage, peripherals, components, printers, servers and UPS.

The store's interface and product content are in **Albanian** (prices formatted as `1.199,00 €`, dates in Albanian). The layout follows big electronics retailers (Best Buy, Gjirafa50, Foleja): store header with a category search bar, category sidebar beside a banner carousel, deal and product shelves, a brand grid and a footer. The finish is quiet and premium: neutral greys and near-black, one blue accent (`#0a6cdf`), the Manrope typeface, borderless cards with soft shadows, monochrome brand logos and a dark studio for the PC builder.

## Features

**Shopping**
- Marketplace home page: hero slider, promo tiles, shop by category, weekly deals, top brands
- Mega menu ("Categories") with quick links such as *Laptops → Gaming* or *Monitors → 27"*
- Instant search suggestions with highlighted matches, category shortcuts and keyboard navigation (press `/` to focus)
- Product page with buy box, instalment price, delivery date estimate, specification table and similar products
- Compare up to 4 products from the same category side by side, with "only show differences"
- Wishlist, cart drawer with stock limits and undo, free‑delivery meter, VAT breakdown
- Checkout with validation, delivery options (standard, express, store pickup) and payment choice

**Advanced filtering (Gjirafa50‑style)**
- Filters change with the category: e.g. Laptops get Processor, RAM, Storage, Screen size, Graphics and OS; Monitors get Size, Resolution, Refresh rate, Panel and USB‑C
- Live counts next to every option, recalculated against all other active filters; options with no results are greyed out
- Price range with min/max inputs, a dual slider and quick presets
- Brand filter with search, "show all" for long lists, collapsible groups (remembered)
- Availability (in stock, on sale) and customer rating filters
- Active filter chips with one‑click removal and "Clear all"
- Sort (recommended, price, biggest discount, rating, most reviewed, name), 12/24/48 per page, grid or list view, pagination
- On phones, filters open in a drawer with a "Show N results" button

Responsive down to small phones, keyboard accessible, respects reduced motion.

> Checkout is a front‑end demo: no order is sent and no payment is taken. Connect it to a backend or a platform (Shopify, WooCommerce, a payment provider) to take real orders.

## PC builder (Ndërto PC)

A 3D configurator at `#builder` (menu button **Ndërto PC**, home banner, or `index.html#builder`).

- **Live 3D model** (three.js, `js/pc3d.js`), shown in a dark studio with a reflective floor, soft shadows, ambient occlusion (desktop), soft bloom on the RGB lighting and ACES tone mapping. Parts are modelled in detail: finned VRM and M.2 heatsinks, chokes, RAM heat spreaders, a flow-through GPU with visible fin stack and backplate, and braided 24-pin, CPU and GPU power cables in the case colour: the case with glass side panel, motherboard, RAM, graphics card, air or liquid CPU cooler, fans and PSU shroud. Drag to rotate, scroll or pinch to zoom, optional auto-rotate. Four case styles (mesh, glass, wood, perforated), case colour, and an RGB lighting colour that lights fans, RAM, pump and GPU.
- **Parts**: CPU, motherboard, RAM, GPU, cooler, SSD, PSU, case, from the real catalogue (`window.BUILD_SPECS` in `js/products.js` holds the technical data: socket, RAM type, GPU length, cooler height, radiator sizes, wattage).
- **Compatibility checks**: CPU/motherboard socket, RAM type, GPU length vs case, cooler height or radiator size vs case, PSU wattage (estimated draw × 1.2 minimum, × 1.4 recommended). When a choice clashes, the other part is swapped automatically for the closest-priced one that fits; PSUs that are too weak are blocked.
- **Presets**: Gaming 1080p, Gaming 1440p, 4K dhe krijues.
- **Totals**: price, instalments, power meter, optional assembly service (`srv-assembly` in `window.SERVICES`, 39 €), one click to add the whole PC to the cart.
- **Accounts**: sign up / sign in from the header, save builds (with a snapshot of the 3D view), reopen them or add them to the cart later. Checkout is pre-filled from the account. **Demo only**: accounts live in the browser's `localStorage`, passwords are stored as SHA-256 hashes, there is no server.

The 3D code loads only when the builder opens. three.js r160 is vendored in `js/vendor/` (MIT).

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

All products live in `js/products.js`. Each product has a price, optional old price (shows as a discount), stock, rating, specs and an `attrs` object that feeds the filters. Filters per category are defined in `FACETS` in the same file.

**Product images**: 15 products use official manufacturer photos from `assets/products/photo/` (sources in `assets/products/photo/SOURCES.md`); the rest are 3D studio renders in `assets/products/<id>.webp` (800 × 600, transparent background). Products with `reviews: 0` show “Ende pa vlerësime” instead of stars. To use a real photo instead, replace that file or set `img` on the product:

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
| Hero slides and promo tiles | `SLIDES` / `renderHero()` in `js/app.js` |
| Colours, fonts, radii (light and dark) | tokens at the top of `css/styles.css` |
| Logo / favicon | `assets/favicon.svg` |

## Single‑file build

`python3 scripts/build-single.py dist/itcom.html` bundles everything into one self‑contained HTML file.
