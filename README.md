# ITCOM — IT Equipment Store

A fast, dependency‑free storefront for IT equipment: laptops, desktops, monitors, tablets, networking, storage, peripherals, components, printers, servers and UPS.

## Features

**Shopping**
- Marketplace home page: hero slider, promo tiles, shop by category, deals of the day with a countdown, top brands
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

Light and dark themes, responsive down to small phones, keyboard accessible, respects reduced motion.

> Checkout is a front‑end demo: no order is sent and no payment is taken. Connect it to a backend or a platform (Shopify, WooCommerce, a payment provider) to take real orders.

## Run it

Plain HTML/CSS/JS. Open `index.html` or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

To host on **GitHub Pages**: Settings → Pages → Deploy from branch → choose the branch and `/ (root)`.

## Products and photos

All products live in `js/products.js`. Each product has a price, optional old price (shows as a discount), stock, rating, specs and an `attrs` object that feeds the filters. Filters per category are defined in `FACETS` in the same file.

Products currently show studio‑style renders drawn by `js/art.js`. To use real photos, put images in `assets/products/` and add an `img` field:

```js
{ id: "lp-x1c12", name: "Lenovo ThinkPad X1 Carbon Gen 12", img: "assets/products/lp-x1c12.webp", ... }
```

Photos on a white or transparent background look best. Any product without `img` keeps its render.

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
