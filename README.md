# ITCOM — IT Equipment Store

A fast, dependency‑free storefront for IT equipment: laptops, desktops, monitors, networking, storage, peripherals, components and servers.

## Features

- Category navigation, live search (press `/`), brand / price / stock / sale filters, sorting
- Product detail view with specs, SKU, stock level, related products and deep links (`index.html#lp-001`)
- Cart drawer with quantity limits by stock, undo on remove, free‑delivery progress meter and VAT breakdown
- Checkout with validation, delivery options (standard / express / pickup) and payment choice
- Wishlist, light/dark theme (follows the system, with a manual toggle)
- Cart, wishlist and checkout draft are remembered in the browser
- Responsive down to small phones, keyboard accessible, respects reduced motion

> Checkout is a front‑end demo: no order is sent and no payment is taken. Connect it to your backend or a platform (Shopify, WooCommerce, Stripe Checkout) to take real orders.

## Run it

It is plain HTML/CSS/JS, so open `index.html` in a browser or serve the folder:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

To host it on **GitHub Pages**: Settings → Pages → Deploy from branch → select the branch and `/ (root)`.

## Customise

| What | Where |
| --- | --- |
| Products, prices, stock, specs | `js/products.js` |
| Currency, VAT rate, free‑delivery threshold, delivery fee | `window.STORE` at the top of `js/products.js` |
| Colours, fonts, radii (light and dark) | the tokens at the top of `css/styles.css` |
| Logo / favicon | `assets/favicon.svg` |
| Contact details, footer links, hero copy | `index.html` |

## Single‑file build

`python3 scripts/build-single.py dist/itcom.html` bundles everything into one self‑contained HTML file.
