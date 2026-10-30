# ITCOM — CMS

The admin for the ITCOM shop, served at `/ITCOM/admin/`. It is the CMS from the Selca / Miftari Vision builds
(Vite 8, React 19, TypeScript, Tailwind 4, zustand), trimmed to the modules the static shop uses and seeded with
ITCOM's catalogue, settings and demo activity.

- `src/data/itcom-catalog.json` — generated from `../js/products.js` by `scripts/itcom-catalog.mjs`
- `src/data/itcom.ts` — settings, staff, segments, info pages, home banners, inbox, inventory, audit
- `src/data/seed.ts` — assembles the demo database (`DB_VERSION` bump = every browser reseeds)
- `src/store/outbox.ts` — imports orders/requests the shop queued before the CMS was first opened
- `src/lib/paths.ts` — shop links (`/produkt/x` → `/ITCOM/#x`)

Data lives in the browser (`localStorage["itcom-cms-db"]`); the shop reads it through `../js/cms-bridge.js`.

```bash
npm ci
npm run site      # catalogue seed + type-check + build (base /ITCOM/) + copy into ../admin, ../cms-assets, ../fonts
npm run dev       # local CMS at http://localhost:5173/admin (shop photos load only from the built site)
```

Demo login (pre-filled): `admin@itcom.example` / `itcom2026`.
