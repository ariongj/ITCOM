/* ITCOM — dyqani online (JavaScript i thjeshtë, pa build). */
(() => {
  "use strict";

  const S = window.STORE;
  const CATS = window.CATEGORIES;
  const FACETS = window.FACETS;
  const PRODUCTS = window.PRODUCTS;
  const byId = Object.fromEntries([...PRODUCTS, ...(window.BUILDER_PARTS || []), ...(window.SERVICES || [])].map((p) => [p.id, p]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Format shqip: 1.199,00 €
  const fmt = (n) => { const [i, d] = Math.abs(n).toFixed(2).split("."); return `${n < 0 ? "−" : ""}${group(i)},${d} €`; };
  const fmt0 = (n) => `${group(String(Math.round(n)))} €`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const discount = (p) => (p.old ? Math.round((1 - p.price / p.old) * 100) : 0);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const slugify = (t) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const catSlug = (c) => slugify(c);
  const catFromSlug = (slug) => window.CATEGORIES.find((c) => catSlug(c.id) === slug)?.id;
  // Rrënja e dyqanit (p.sh. /ITCOM/). Çdo produkt ka adresën e vet: /ITCOM/p/<id>/ (faqe statike, e indeksueshme).
  const BASE = new URL(document.baseURI).pathname;
  const productHref = (id) => `${BASE}p/${encodeURIComponent(id)}/`;
  const pathProduct = () => { const m = location.pathname.slice(BASE.length).match(/^p\/([^/]+)\/?$/); return m ? decodeURIComponent(m[1]) : null; };
  // Navigimi mes pamjeve (ballina, katalogu, produkti, shporta, porosia) bëhet me hash, që Back të punojë.
  // Navigim brenda dyqanit: adresat #/… në rrënjë, faqet e produkteve me adresën e tyre (pa ringarkim).
  const go = (target) => {
    const next = target.startsWith("#") ? BASE + target : target;
    if (next === location.pathname + location.hash) route();
    else if (target.startsWith("#") && location.pathname === BASE) location.hash = target;
    else { history.pushState(null, "", next); route(); $("#main").focus({ preventScroll: true }); }
  };
  const announce = (text) => { const el = document.getElementById("announce"); if (el) { el.textContent = ""; setTimeout(() => { el.textContent = text; }, 30); } };

  // Ruajtja në shfletues mund të mos jetë e disponueshme; dyqani punon edhe pa të.
  const saved = {
    get(key, fallback) { try { const v = localStorage.getItem("itcom:" + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem("itcom:" + key, JSON.stringify(value)); } catch { /* ignore */ } },
  };

  /* ================================================================ ikonat */
  const ICON = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    desktop: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 6h4M10 9h4"/><circle cx="12" cy="17" r="1"/>',
    monitor: '<rect x="2" y="3" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 16v5"/>',
    tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1"/>',
    storage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    gpu: '<rect x="2" y="6" width="20" height="11" rx="1.5"/><circle cx="9" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M5 17v2h8"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    bag: '<path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    store: '<path d="M3 9 4.5 3h15L21 9M3 9v12h18V9M3 9h18M9 21v-6h6v6"/>',
    compare: '<path d="M7 4 3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',
  };
  const svg = (paths, cls = "icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const catIcon = (id) => ICON[CATS.find((c) => c.id === id)?.icon] || ICON.grid;
  // Ikonat Lucide (js/icons.js): një familje, kontur 1,8 px.
  const LU = window.LUCIDE || {};
  const lucide = (name, cls = "icon") => (LU[name] ? svg(LU[name], cls) : "");

  /* ================================================================ arkitektura e katalogut (grupe → nënkategori) */
  // Nga CMS-i (menuja "Kategoritë") ose struktura bazë te js/categories.js. Çdo nënkategori ka destinacion:
  // katalogun kur ka produkte, ose faqen e saj me kërkesë për ofertë kur ende nuk ka.
  const GROUPS = (window.CMS?.categoryGroups || window.CATEGORY_GROUPS || []).map((g) => ({
    ...g,
    subs: g.subs.map((x) => ({ ...x, count: x.cat ? PRODUCTS.filter((p) => p.cat === x.cat).length : 0 })),
  }));
  GROUPS.forEach((g) => { g.cats = g.subs.filter((x) => x.count).map((x) => x.cat); g.count = g.subs.reduce((n, x) => n + x.count, 0); });
  const groupBySlug = (slug) => GROUPS.find((g) => g.slug === slug);
  const subBySlug = (slug) => { for (const g of GROUPS) { const x = g.subs.find((y) => y.slug === slug); if (x) return { g, x }; } return null; };
  const groupOfCat = (cat) => GROUPS.find((g) => g.cats.includes(cat));
  const subHref = (x) => `#/kategoria/${x.slug}`;

  /* ================================================================ ndihmës për produktet */
  const imgSrc = (p) => p.img || `assets/products/${p.id}.webp`;
  const media = (p, cls = "", eager = false) =>
    `<div class="media ${cls}"><img src="${esc(imgSrc(p))}" alt="${esc(p.name)}" data-pid="${p.id}" ${eager ? "" : 'loading="lazy"'} decoding="async" /></div>`;
  // Nëse një foto mungon, shfaqet vizatimi i produktit.
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG" && el.dataset.pid && byId[el.dataset.pid]) el.outerHTML = window.productArt(byId[el.dataset.pid]);
  }, true);

  const LOGOS = window.BRAND_LOGOS || {};
  const logoSvg = (name, cls = "") => (LOGOS[name] ? `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${LOGOS[name].path}"/></svg>` : "");
  const brandMark = (name) => `<span class="bmark ${LOGOS[name] ? "" : "bmark--text"}">${logoSvg(name)}<span>${esc(name)}</span></span>`;


  const stockLabel = (p) => {
    if (!p.stock) return '<span class="stock stock--out">Jashtë stokut</span>';
    if (p.stock <= 5) return `<span class="stock stock--low">Vetëm ${p.stock} copë në stok</span>`;
    return '<span class="stock stock--in">Në stok</span>';
  };

  const priceHTML = (p) =>
    `<span class="price ${p.old ? "price--sale" : ""}">${fmt(p.price)}</span>${p.old ? `<span class="price-old">${fmt(p.old)}</span>` : ""}`;

  const inst = (p) => `ose ${S.installments} × ${fmt(p.price / S.installments)} në muaj`;

  const facetDef = (cat, key) => (FACETS[cat] || []).find((f) => f.key === key);
  const fmtVal = (cat, key, v) => { const d = facetDef(cat, key); return d && d.fmt ? d.fmt(Number(v)) : String(v); };

  function keySpecs(p) {
    return (FACETS[p.cat] || [])
      .filter((f) => p.attrs[f.key] !== undefined && !["Pa Wi‑Fi", "Jo"].includes(p.attrs[f.key]) && !(p.cat === "Laptopë" && f.key === "type"))
      .map((f) => (f.key === "usbc" ? "USB‑C" : f.key === "poe" ? "PoE" : f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]))
      .slice(0, 4);
  }

  const searchHay = Object.fromEntries(PRODUCTS.map((p) => [p.id, [p.name, p.brand, p.cat, p.id, ...p.specs, ...Object.values(p.attrs)].join(" ").toLowerCase()]));
  const tokens = (q) => q.toLowerCase().split(/\s+/).filter(Boolean);
  const textMatch = (p, q) => tokens(q).every((t) => searchHay[p.id].includes(t));

  function deliveryDate(workdays) {
    const d = new Date();
    let n = 0;
    while (n < workdays) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0) n++; }
    // Emrat shqip të ditëve dhe muajve, pa u mbështetur te të dhënat e shfletuesit.
    const days = ["e diel", "e hënë", "e martë", "e mërkurë", "e enjte", "e premte", "e shtunë"];
    const months = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }

  /* ================================================================ gjendja */
  const catMax = (cat) => Math.ceil(Math.max(...PRODUCTS.filter((p) => cat === "All" || p.cat === cat).map((p) => p.price)) / 50) * 50;
  const blankFilters = (cat = "All") => ({ q: "", cat, brands: new Set(), f: {}, min: 0, max: catMax(cat), inStock: false, onSale: false, col: null, grp: null });
  // Koleksionet nga CMS-i (Produktet → Koleksionet): grupe produktesh me adresën e vet (#/koleksioni/<slug>).
  const COLLECTIONS = window.CMS?.collections || [];
  const colBySlug = (slug) => COLLECTIONS.find((c) => c.slug === slug);
  const state = Object.assign(blankFilters(), { sort: "featured", per: 24, page: 1 });
  const closedFacets = new Set(saved.get("closedFacets", []));
  const expandedFacets = new Set();

  let cart = saved.get("cart", []).filter((l) => byId[l.id] && byId[l.id].stock > 0);
  let wish = new Set(saved.get("wish", []).filter((id) => byId[id]));
  let compare = saved.get("cmp", []).filter((id) => byId[id]);
  let recent = saved.get("recent", []).filter((id) => byId[id]);
  const cartQty = (id) => cart.find((l) => l.id === id)?.qty || 0;

  /* ================================================================ filtrimi */
  function matches(p, skip = "") {
    if (skip !== "cat" && state.cat !== "All" && p.cat !== state.cat) return false;
    if (state.col && !state.col.productIds.includes(p.id)) return false;
    if (state.grp && !state.grp.cats.includes(p.cat)) return false;
    if (skip !== "brand" && state.brands.size && !state.brands.has(p.brand)) return false;
    if (skip !== "price" && (p.price < state.min || p.price > state.max)) return false;
    if (skip !== "inStock" && state.inStock && !p.stock) return false;
    if (skip !== "onSale" && state.onSale && !p.old) return false;
    for (const [k, set] of Object.entries(state.f)) {
      if (!set.size || skip === "f:" + k) continue;
      const v = p.attrs[k];
      if (v === undefined || !set.has(String(v))) return false;
    }
    if (state.q && !textMatch(p, state.q)) return false;
    return true;
  }

  const CAT_ORDER = (p) => window.CATEGORIES.findIndex((c) => c.id === p.cat);
  const SORTS = {
    featured: (a, b) => (b.stock > 0) - (a.stock > 0) || (b.old ? 1 : 0) - (a.old ? 1 : 0) || CAT_ORDER(a) - CAT_ORDER(b) || b.price - a.price,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    discount: (a, b) => discount(b) - discount(a) || b.price - a.price,
    name: (a, b) => a.name.localeCompare(b.name, "sq"),
  };

  const priceActive = () => state.min > 0 || state.max < catMax(state.cat);

  function activeFilters() {
    const out = [];
    if (state.col) out.push(["col", "Koleksioni", state.col.title]);
    if (state.grp) out.push(["grp", "Grupi", state.grp.name]);
    if (state.q) out.push(["q", "Kërkimi", `“${state.q}”`]);
    if (state.cat !== "All") out.push(["cat", "Kategoria", state.cat]);
    state.brands.forEach((b) => out.push(["brand:" + b, "Brendi", b]));
    for (const [k, set] of Object.entries(state.f)) {
      const label = facetDef(state.cat, k)?.label || k;
      set.forEach((v) => out.push([`f:${k}:${v}`, label, fmtVal(state.cat, k, v)]));
    }
    if (priceActive()) out.push(["price", "Çmimi", `${fmt0(state.min)} – ${fmt0(state.max)}`]);
    if (state.inStock) out.push(["inStock", "", "Në stok"]);
    if (state.onSale) out.push(["onSale", "", "Në zbritje"]);
    return out;
  }

  function removeFilter(key) {
    if (key === "q") { state.q = ""; $("#search").value = ""; }
    else if (key === "cat") return setCat("All");
    else if (key === "col") { state.col = null; state.page = 1; return goCatalog(); }
    else if (key === "grp") { state.grp = null; state.page = 1; return goCatalog(); }
    else if (key.startsWith("brand:")) state.brands.delete(key.slice(6));
    else if (key.startsWith("f:")) { const [, k, ...v] = key.split(":"); state.f[k]?.delete(v.join(":")); }
    else if (key === "price") { state.min = 0; state.max = catMax(state.cat); }
    else state[key] = false;
    state.page = 1;
    render();
  }

  function resetFilters(cat = "All") {
    const keep = { sort: state.sort, per: state.per };
    Object.assign(state, blankFilters(cat), keep, { page: 1 });
    $("#search").value = "";
  }

  function setCat(cat) {
    state.cat = cat;
    state.f = {};
    const brands = new Set(PRODUCTS.filter((p) => cat === "All" || p.cat === cat).map((p) => p.brand));
    state.brands.forEach((b) => brands.has(b) || state.brands.delete(b));
    state.min = 0;
    state.max = catMax(cat);
    state.page = 1;
    render();
  }

  /* ================================================================ filtrat (paneli anësor) */
  function facetGroup(fid, title, body, active = 0) {
    return `<details class="facet" data-fid="${esc(fid)}" ${closedFacets.has(fid) ? "" : "open"}>
      <summary>${esc(title)}${active ? `<span class="pill">${active}</span>` : ""}</summary>
      <div class="facet__body">${body}</div></details>`;
  }

  function checkList(fid, items, limit = 6) {
    const more = expandedFacets.has(fid);
    const rows = items.map((it, i) => `
      <label class="check ${it.count || it.checked ? "" : "is-zero"}" data-label="${esc(String(it.label).toLowerCase())}" data-rank="${i}" ${!more && i >= limit && !it.checked ? "hidden" : ""}>
        <input type="checkbox" data-fk="${esc(it.fk)}" ${it.checked ? "checked" : ""} ${!it.count && !it.checked ? "disabled" : ""} />
        <span>${it.html || esc(it.label)}</span><span class="count">${it.count}</span>
      </label>`).join("");
    const btn = items.length > limit ? `<button type="button" class="link-btn facet__more" data-more="${esc(fid)}">${more ? "Shfaq më pak" : `Shfaq të gjitha (${items.length})`}</button>` : "";
    return rows + btn;
  }

  const PRESETS = [[0, 200], [200, 500], [500, 1000], [1000, 2000], [2000, Infinity]];

  function renderFacets() {
    const focusKey = document.activeElement?.dataset?.fk;
    const pool = PRODUCTS.filter((p) => state.cat === "All" || p.cat === state.cat);
    const groups = [];

    if (state.cat === "All") {
      const items = CATS.map((c) => ({ fk: "cat:" + c.id, label: c.id, count: PRODUCTS.filter((p) => p.cat === c.id && matches(p, "cat")).length, checked: false }));
      groups.push(facetGroup("cat", "Kategoria", checkList("cat", items, 10)));
    }

    const max = catMax(state.cat);
    const presets = PRESETS.filter(([a]) => a < max).map(([a, b]) => {
      const hi = Math.min(b, max);
      const label = a === 0 ? `Deri në ${fmt0(b)}` : b === Infinity || b >= max ? `Mbi ${fmt0(a)}` : `${group(String(a))}–${fmt0(b)}`;
      return `<button type="button" data-preset="${a}-${hi}" aria-pressed="${state.min === a && state.max === hi}">${label}</button>`;
    }).join("");
    groups.push(facetGroup("price", "Çmimi", `
      <div class="price-inputs">
        <label><input type="number" id="pmin" inputmode="numeric" min="0" max="${max}" value="${state.min}" aria-label="Çmimi minimal në euro" /></label>
        <span class="muted">–</span>
        <label><input type="number" id="pmax" inputmode="numeric" min="0" max="${max}" value="${state.max}" aria-label="Çmimi maksimal në euro" /></label>
      </div>
      <div class="dual">
        <div class="dual__track"></div><div class="dual__fill" id="dualFill"></div>
        <input type="range" id="rmin" min="0" max="${max}" step="10" value="${state.min}" aria-label="Çmimi minimal" />
        <input type="range" id="rmax" min="0" max="${max}" step="10" value="${state.max}" aria-label="Çmimi maksimal" />
      </div>
      <div class="presets">${presets}</div>`, priceActive() ? 1 : 0));

    const brands = [...new Set(pool.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
    const brandItems = brands.map((b) => ({ fk: "brand:" + b, label: b, html: brandMark(b), count: PRODUCTS.filter((p) => p.brand === b && matches(p, "brand")).length, checked: state.brands.has(b) }));
    groups.push(facetGroup("brand", "Brendi",
      (brands.length > 8 ? `<input type="search" class="facet__search" data-bsearch placeholder="Kërko ndër ${brands.length} marka" aria-label="Kërko markat" />` : "") + checkList("brand", brandItems, 8),
      state.brands.size));

    if (state.cat !== "All") {
      for (const def of FACETS[state.cat] || []) {
        const values = [...new Set(pool.map((p) => p.attrs[def.key]).filter((v) => v !== undefined))]
          .sort((a, b) => (def.num ? a - b : String(a).localeCompare(String(b), "sq", { numeric: true })));
        if (values.length < 2) continue;
        const sel = state.f[def.key] || new Set();
        const items = values.map((v) => ({
          fk: `f:${def.key}:${v}`,
          label: def.fmt ? def.fmt(v) : v,
          count: PRODUCTS.filter((p) => String(p.attrs[def.key]) === String(v) && matches(p, "f:" + def.key)).length,
          checked: sel.has(String(v)),
        }));
        groups.push(facetGroup("f:" + def.key, def.label, checkList("f:" + def.key, items), sel.size));
      }
    }

    const inStockCount = PRODUCTS.filter((p) => p.stock && matches(p, "inStock")).length;
    const saleCount = PRODUCTS.filter((p) => p.old && matches(p, "onSale")).length;
    groups.push(facetGroup("avail", "Disponueshmëria", checkList("avail", [
      { fk: "inStock", label: "Në stok", count: inStockCount, checked: state.inStock },
      { fk: "onSale", label: "Në zbritje", count: saleCount, checked: state.onSale },
    ]), (state.inStock ? 1 : 0) + (state.onSale ? 1 : 0)));


    $("#facetHost").innerHTML = groups.join("");
    syncDual();
    if (focusKey) $(`[data-fk="${CSS.escape(focusKey)}"]`)?.focus();
  }

  function syncDual() {
    const max = catMax(state.cat);
    const fill = $("#dualFill");
    if (!fill) return;
    fill.style.left = (state.min / max) * 100 + "%";
    fill.style.right = 100 - (state.max / max) * 100 + "%";
  }

  /* ================================================================ rezultatet */
  const addLabel = (p, inCart) => (!p.stock ? "Jashtë stokut" : inCart ? "Në shportë" : "Shto në shportë");
  // Etiketa vetëm kur ka arsye reale: zbritje e vërtetë ose produkt i ri.
  const cardTag = (p, pick) => {
    const d = discount(p);
    if (d) return `<span class="ptag ptag--sale">−${d}%</span>`;
    if (pick) return `<span class="ptag">Përzgjedhje ITCOM</span>`;
    if (p.badge && p.badge !== "Më i shituri") return `<span class="ptag">${esc(p.badge)}</span>`;
    return "";
  };
  const shortSpecs = (p) => keySpecs(p).slice(0, 3).join(" · ") || p.specs.slice(0, 2).join(" · ");

  function card(p, opts = {}) {
    const w = wish.has(p.id), inCart = cartQty(p.id) > 0, cmp = compare.includes(p.id);
    const ship = p.price >= S.freeShippingFrom ? "Dërgesë falas" : `Dërgesë ${fmt(S.shippingFee)}`;
    return `
      <article class="pcard" data-id="${p.id}">
        <div class="pcard__top">
          ${cardTag(p, opts.pick)}
          <span class="pcard__icons">
            <button type="button" class="pcard__icon ${cmp ? "is-on" : ""}" data-cmp="${p.id}" aria-pressed="${cmp}" aria-label="${cmp ? "Hiq nga krahasimi" : "Shto për krahasim"}: ${esc(p.name)}">${svg(ICON.compare)}</button>
            <button type="button" class="pcard__icon ${w ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${w}" aria-label="${w ? "Hiq nga" : "Ruaj te"} të ruajturat: ${esc(p.name)}">${svg(ICON.heart)}</button>
          </span>
        </div>
        <a class="pcard__media" href="${productHref(p.id)}" tabindex="-1" aria-hidden="true">${media(p)}</a>
        <div class="pcard__body">
          <span class="pcard__brand">${esc(p.brand)}</span>
          <h3 class="pcard__title"><a href="${productHref(p.id)}">${esc(p.name)}</a></h3>
          <p class="pcard__specs">${esc(shortSpecs(p))}</p>
          <div class="pcard__price">${priceHTML(p)}</div>
          <p class="pcard__stock">${stockLabel(p)}${p.stock ? `<span class="pcard__ship">${ship}</span>` : ""}</p>
          <button type="button" class="btn btn--cta btn--block add ${inCart ? "added" : ""}" data-add="${p.id}" ${p.stock ? "" : "disabled"} aria-label="${esc(addLabel(p, inCart))}: ${esc(p.name)}">${addLabel(p, inCart)}</button>
        </div>
      </article>`;
  }
  const skeleton = (n) => Array.from({ length: n }, () => `<div class="pcard pcard--skeleton" aria-hidden="true"><div class="sk sk--img"></div><div class="sk sk--line"></div><div class="sk sk--line sk--short"></div><div class="sk sk--btn"></div></div>`).join("");

  // Nënkategoritë e grupit (ose të grupit ku bën pjesë kategoria) si lidhje të shpejta mbi rezultatet.
  function renderSubNav() {
    const g = state.grp || (state.cat !== "All" && !state.col && !state.q ? groupOfCat(state.cat) : null);
    const nav = $("#subNav");
    nav.hidden = !g;
    if (!g) { nav.innerHTML = ""; return; }
    nav.innerHTML = g.subs.map((x) => {
      const on = x.cat && x.cat === state.cat;
      return `<a href="${subHref(x)}" class="subnav__item ${x.count ? "" : "is-empty"}" ${on ? 'aria-current="page"' : ""}>${esc(x.name)}${x.count ? ` <small>${x.count}</small>` : ""}</a>`;
    }).join("");
  }
  // Faqja e koleksionit: hyrje me foto, pastaj produktet, pastaj shpjegimi i përzgjedhjes dhe ndihma.
  function renderColBlocks() {
    const c = state.col;
    $("#colHero").hidden = !c;
    $("#colWhy").hidden = !c || !c.guide;
    $(".catalog__head h1").classList.toggle("sr-only", !!c);
    if (!c) { $("#colHero").innerHTML = ""; $("#colWhy").innerHTML = ""; return; }
    $("#colHero").innerHTML = `
      <div class="col-hero__copy">
        <span class="eyebrow">Koleksioni</span>
        <h2>${esc(c.title)}</h2>
        ${c.tagline ? `<p class="col-hero__tag">${esc(c.tagline)}</p>` : ""}
        ${c.description ? `<p>${esc(c.description)}</p>` : ""}
      </div>
      ${c.image ? `<div class="col-hero__img ${/assets\/photos\//.test(c.image) ? "is-photo" : ""}"><img src="${esc(c.image)}" alt="" /></div>` : ""}`;
    $("#colWhy").innerHTML = c.guide ? `
      <div><h2>Si i zgjodhëm</h2>${window.CMS?.md ? CMS.md(c.guide) : `<p>${esc(c.guide)}</p>`}</div>
      <aside><h3>Nuk je i sigurt?</h3><p>Trego si do ta përdorësh dhe ekipi të sugjeron konfigurimin.</p><button type="button" class="btn btn--primary" data-ask-col="${esc(c.slug)}">Pyet ekipin</button></aside>` : "";
  }

  function renderResults() {
    const grid = $("#grid");
    try {
      const list = PRODUCTS.filter((p) => matches(p)).sort(SORTS[state.sort]);
      const pages = Math.max(1, Math.ceil(list.length / state.per));
      state.page = Math.min(state.page, pages);
      const slice = list.slice((state.page - 1) * state.per, state.page * state.per);
      $("#loadError").hidden = true;
      grid.innerHTML = slice.map((p) => card(p)).join("");
      $("#empty").hidden = list.length > 0;

      const title = state.col ? state.col.title : state.grp ? state.grp.name : state.q ? `Rezultatet për “${state.q}”` : state.onSale && state.cat === "All" ? "Ofertat" : state.cat === "All" ? "Të gjitha produktet" : state.cat;
      $("#resultsDesc").hidden = true;
      renderSubNav();
      renderColBlocks();
      const cb = (window.CMS?.banners || []).find((b) => b.position === "catalog");
      $("#catBanner").hidden = !cb || !!state.col;
      $("#catBanner").innerHTML = cb ? bannerHTML(cb, "banner--catalog") : "";
      $("#resultsTitle").textContent = title;
      const from = list.length ? (state.page - 1) * state.per + 1 : 0;
      const countText = list.length > state.per ? `${from}–${from + slice.length - 1} nga ${list.length} produkte` : plural(list.length, "produkt", "produkte");
      $("#resultsCount").textContent = countText;
      if (view === "catalog") document.title = `${title} · ITCOM`;

      const crumbs = [`<a href="#/">Ballina</a>`];
      const grpOf = state.cat !== "All" ? groupOfCat(state.cat) : null;
      if (state.col) crumbs.push(`<a href="#/produktet">Produktet</a>`, `<span aria-current="page">${esc(state.col.title)}</span>`);
      else if (state.grp) crumbs.push(`<a href="#/kategorite">Kategoritë</a>`, `<span aria-current="page">${esc(state.grp.name)}</span>`);
      else if (state.cat !== "All") crumbs.push(grpOf ? `<a href="#/kategoria/${grpOf.slug}">${esc(grpOf.name)}</a>` : `<a href="#/produktet">Produktet</a>`, `<span aria-current="page">${esc(state.cat)}</span>`);
      else crumbs.push(`<span aria-current="page">${state.q ? "Kërkimi" : state.onSale ? "Ofertat" : "Produktet"}</span>`);
      $("#crumbs").innerHTML = crumbs.join('<span aria-hidden="true">/</span>');

      const act = activeFilters();
      $("#chips").innerHTML = act.map(([k, label, val]) =>
        `<button type="button" class="chip" data-chip="${esc(k)}" aria-label="Hiq filtrin ${esc(label)} ${esc(val)}">${label ? `<b>${esc(label)}:</b>` : ""} ${esc(val)}${svg(ICON.x)}</button>`).join("") +
        (act.length > 1 ? `<button type="button" class="chip chip--clear" data-chip="all">Pastro të gjitha</button>` : "");
      const pill = $("#filterCount");
      pill.textContent = act.length;
      pill.hidden = !act.length;

      const pager = $("#pager");
      if (pages <= 1) pager.innerHTML = "";
      else {
        const nums = [];
        for (let i = 1; i <= pages; i++) {
          if (i === 1 || i === pages || Math.abs(i - state.page) <= 1) nums.push(i);
          else if (nums[nums.length - 1] !== "…") nums.push("…");
        }
        pager.innerHTML = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Faqja e mëparshme">‹</button>` +
          nums.map((n) => (n === "…" ? `<button type="button" disabled>…</button>` : `<button type="button" data-page="${n}" ${n === state.page ? 'aria-current="page"' : ""}>${n}</button>`)).join("") +
          `<button type="button" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="Faqja tjetër">›</button>`;
      }
      $("#sort").value = state.sort;
      $("#applyFilters").textContent = `Shfaq ${plural(list.length, "rezultat", "rezultate")}`;
    } catch (err) {
      console.error(err);
      grid.innerHTML = "";
      $("#empty").hidden = true;
      $("#loadError").hidden = false;
    }
  }

  // Shënon lidhjen aktive në shiritin e kategorive (grupi ose kategoria ku jemi).
  function renderCatNav() {
    const g = state.grp || (state.cat !== "All" ? groupOfCat(state.cat) : null);
    const here = view === "catalog" && g ? `#/kategoria/${g.slug}` : view === "catalog" && state.onSale && !state.q ? "#/ofertat" : "";
    $$("#navLinks a").forEach((a) => { if (a.getAttribute("href") === here) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }

  function render() {
    renderCatNav();
    renderFacets();
    renderResults();
  }

  // Hap katalogun për gjendjen aktuale të filtrave (kategoria është pjesë e URL-së).
  const goCatalog = () => go(state.col ? `#/koleksioni/${state.col.slug}` : state.grp ? `#/kategoria/${state.grp.slug}` : state.q ? `#/kerko/${encodeURIComponent(state.q)}` : state.cat !== "All" ? `#/kategoria/${catSlug(state.cat)}` : state.onSale ? "#/ofertat" : "#/produktet");

  /* ================================================================ ballina */
  // Hero: një artikull në plan të parë. Nga CMS-i (Online Store → Slajdet) kur ka; ndryshe këto.
  // Tre gjuhë vizuale (f. 04): produkt (model, konfigurim, çmim → produkti), prezantim (pa çmim → seria),
  // koleksion (foto ambienti → koleksioni). Ofertat vijnë nga CMS-i me kushtet dhe afatin e tyre.
  const SLIDES = [
    { type: "product", id: "lp-mba13m4", label: "Laptopë / Përzgjedhja ITCOM", title: "Më shumë mundësi. Më pak peshë.", text: "MacBook Air 13\" M4 · 16 GB · 256 GB" },
    { type: "launch", label: "Në fokus / Gjenerata RTX 50", title: "Fuqia merr një dimension të ri.", text: "Zbulo GeForce RTX 5090.", cta: "Eksploro serinë RTX 50", href: "#/kategoria/kartela-grafike?series=RTX%2050", img: "assets/products/photo/dark/cp-5090fe.webp", caption: "GeForce RTX 5090 · Founders Edition" },
    { type: "collection", label: "Koleksioni Gaming", title: "Nga konfigurimi te loja jote.", text: "Kartela grafike, procesorë X3D dhe PC të montuara te ne.", cta: "Shiko koleksionin", href: "#/koleksioni/gaming", img: "assets/photos/gaming-1600.webp" },
  ];
  if (window.CMS?.slides) SLIDES.splice(0, SLIDES.length, ...window.CMS.slides);
  let slide = 0, slideTimer, slidePaused = false;
  const SLIDE_MS = 7000;
  const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function slideHTML(s, i) {
    const pos = `role="group" aria-roledescription="artikull" aria-label="${i + 1} nga ${SLIDES.length}"`;
    const lazy = i ? 'loading="lazy"' : 'fetchpriority="high"';
    const p = byId[s.id];
    const type = s.type || (p ? "product" : "launch");
    if (type === "product" && p) {
      return `<div class="slide slide--product" ${pos}>
        <div class="slide__copy">
          <span class="eyebrow">${esc(s.label || p.cat)}</span>
          <h2>${esc(s.title || p.name)}</h2>
          <p class="slide__spec">${esc(s.text || shortSpecs(p))}</p>
          <div class="slide__price">${priceHTML(p)}</div>
          <a class="btn btn--cta" href="${productHref(p.id)}">${esc(s.cta || "Shiko produktin")}</a>
        </div>
        <a class="slide__art" href="${productHref(p.id)}" tabindex="-1" aria-hidden="true"><img src="${esc(s.img || imgSrc(p))}" alt="" data-pid="${p.id}" ${lazy} /></a>
      </div>`;
    }
    const href = s.href && !/^\/(produkt|faqe)\//.test(s.href) ? s.href : p ? productHref(p.id) : "#/";
    const img = s.img || (p ? imgSrc(p) : "");
    return `<div class="slide slide--${type === "product" ? "launch" : esc(type)}" ${pos}>
      <div class="slide__copy">
        ${s.label ? `<span class="eyebrow">${esc(s.label)}</span>` : ""}
        <h2>${esc(s.title)}</h2>
        ${s.text ? `<p class="slide__spec">${esc(s.text)}</p>` : ""}
        ${type === "offer" && s.ends ? `<p class="slide__terms">Vlen deri më ${fmtDay(s.ends)}${s.code ? ` · kodi <b>${esc(s.code)}</b>` : ""}</p>` : ""}
        <a class="btn btn--cta" href="${esc(href)}">${esc(s.cta || "Shiko")}</a>
      </div>
      ${img ? `<a class="slide__art" href="${esc(href)}" tabindex="-1" aria-hidden="true"><img src="${esc(img)}" alt="" ${lazy} />${s.caption ? `<small class="slide__caption">${esc(s.caption)}</small>` : ""}</a>` : ""}
    </div>`;
  }

  function renderHero() {
    $("#slides").innerHTML = SLIDES.map(slideHTML).join("");
    $("#dots").innerHTML = SLIDES.map((s, i) => `<button type="button" role="tab" data-slide="${i}" aria-label="Shfaq: ${esc(s.title || byId[s.id]?.name || "")}"></button>`).join("");
    $("#slider").classList.toggle("is-single", SLIDES.length < 2);
    goSlide(0);

    const gpu = byId["cp-5070fe"] || PRODUCTS.find((p) => p.cat === "Kartela grafike");
    $("#promos").innerHTML = `
      <a class="promo promo--dark" href="#/kategoria/${catSlug("Kartela grafike")}">
        <span class="eyebrow">Kartela grafike</span>
        <span class="promo__title">Fuqia që zgjedh ti.</span>
        <span class="promo__link">Shiko kartelat</span>
        ${gpu ? `<span class="promo__art"><img src="${esc(imgSrc(gpu))}" alt="" data-pid="${gpu.id}" loading="lazy" /></span>` : ""}
      </a>
      <button type="button" class="promo promo--light" data-business>
        <span class="eyebrow">ITCOM Business</span>
        <span class="promo__title">Pajise ekipin me qartësi.</span>
        <span class="promo__link">Kërko ofertë për biznes</span>
      </button>`;
  }

  function goSlide(i) {
    slide = (i + SLIDES.length) % SLIDES.length;
    $("#slides").style.transform = `translateX(-${slide * 100}%)`;
    $$("#slides .slide").forEach((el, j) => { el.inert = j !== slide; });
    $$("#dots button").forEach((b, j) => b.setAttribute("aria-selected", j === slide));
  }
  function autoSlide() {
    clearInterval(slideTimer);
    if (SLIDES.length < 2 || reducedMotion() || slidePaused) return;
    slideTimer = setInterval(() => goSlide(slide + 1), SLIDE_MS);
  }
  // Kontroll pauze kur banerët lëvizin vetë (WCAG 2.2.2); fshihet me një slajd ose me reduced-motion.
  function syncPause() {
    const b = $("#slidePause");
    b.hidden = SLIDES.length < 2 || reducedMotion();
    b.setAttribute("aria-pressed", slidePaused);
    b.setAttribute("aria-label", slidePaused ? "Vazhdo rrotullimin e banerëve" : "Ndalo rrotullimin e banerëve");
    b.innerHTML = lucide(slidePaused ? "play" : "pause");
  }

  // Përzgjedhja e kuratuar në ballinë: nga CMS-i (produktet "featured"), ndryshe këto.
  const PICKS = ["lp-mba13m4", "lp-proartp16", "cp-4070s", "cp-7800x3d"];
  const SERVICES_STRIP = [
    ["Dërgesa", "Afati sipas porosisë", "delivery", "truck"],
    ["Garancia", "Kushtet e produktit", "warranty", "shield-check"],
    ["Pagesa", "Opsionet e dyqanit", "installments", "credit-card"],
    ["Mbështetja", "Ndihmë nga ekipi", "contact", "headset"],
  ];

  // Shiriti i kategorive (f. 08): lëviz anash me swipe ose shigjeta, me tregues progresi; pa scroll të faqes.
  function renderStrip() {
    const items = window.CATEGORY_STRIP || GROUPS.map((g) => ({ name: g.nav || g.name, icon: g.icon, href: `#/kategoria/${g.slug}` }));
    const countOf = (href) => {
      const slug = href.replace("#/kategoria/", "");
      const g = groupBySlug(slug);
      return g ? g.count : subBySlug(slug)?.x.count || 0;
    };
    $("#catStrip").innerHTML = items.map((it) => {
      const n = countOf(it.href);
      return `<li><a class="cat-card" href="${esc(it.href)}">${lucide(it.icon || "layers")}<b>${esc(it.name)}</b><small>${n ? plural(n, "produkt", "produkte") : "Me kërkesë"}</small></a></li>`;
    }).join("");
    $("#stripPrev").innerHTML = lucide("chevron-left");
    $("#stripNext").innerHTML = lucide("chevron-right");
    syncStrip();
  }
  function syncStrip() {
    const el = $("#catStrip");
    const max = el.scrollWidth - el.clientWidth;
    const at = max > 0 ? el.scrollLeft / max : 1;
    $("#stripBar").style.width = `${Math.max(12, Math.min(100, (el.clientWidth / el.scrollWidth) * 100 + at * (100 - (el.clientWidth / el.scrollWidth) * 100)))}%`;
    $("#stripPrev").disabled = el.scrollLeft <= 2;
    $("#stripNext").disabled = el.scrollLeft >= max - 2;
    $(".strip-nav").classList.toggle("is-static", max <= 2);
  }

  function renderHome() {
    const brandCount = {};
    PRODUCTS.forEach((p) => { brandCount[p.brand] = (brandCount[p.brand] || 0) + 1; });
    const brands = Object.entries(brandCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    $("#searchCat").innerHTML = `<option value="All">Të gjitha</option>` + CATS.map((c) => `<option value="${esc(c.id)}">${esc(c.id)}</option>`).join("");

    $("#services").innerHTML = SERVICES_STRIP.map(([t, sub, info, icon]) =>
      `<li><button type="button" data-info="${info}"><span class="svc__icon">${lucide(icon)}</span><span><b>${t}</b><small>${sub}</small></span></button></li>`).join("");
    renderStrip();

    const cmsPicks = window.CMS?.featured?.filter((id) => byId[id] && PRODUCTS.includes(byId[id]));
    const picks = (cmsPicks?.length ? cmsPicks : PICKS).map((id) => byId[id]).filter(Boolean).slice(0, 4);
    $("#picks").innerHTML = picks.map((p) => card(p, { pick: true })).join("");

    $("#brandRow").innerHTML = brands.map(([b]) => `<li><button type="button" data-brand="${esc(b)}">${logoSvg(b, "icon")}<span>${esc(b)}</span></button></li>`).join("");
    $("#year").textContent = new Date().getFullYear();
  }

  function addRecent(id) {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 10);
    saved.set("recent", recent);
  }

  /* ================================================================ menyja e kategorive */
  // Mega-menuja (f. 07): grupet me nënkategoritë; në telefon si accordion.
  function renderMega() {
    const MAX = 6;
    const subLink = (x) => `<li><a href="${subHref(x)}">${esc(x.name)}</a>${x.count ? ` <small>${x.count}</small>` : ""}</li>`;
    $("#megaInner").innerHTML = `
      <div class="mega__grid">${GROUPS.map((g) => `
        <section class="mega__group">
          <h3><a href="#/kategoria/${g.slug}">${lucide(g.icon || "layers")}<span>${esc(g.name)}</span></a></h3>
          <ul>${g.subs.slice(0, MAX).map(subLink).join("")}</ul>
          ${g.subs.length > MAX ? `<a class="mega__all" href="#/kategoria/${g.slug}">Shiko të gjitha (${g.subs.length})</a>` : ""}
        </section>`).join("")}
      </div>
      <div class="mega__acc">${GROUPS.map((g) => `
        <details class="mega__item">
          <summary>${lucide(g.icon || "layers")}<span>${esc(g.name)}</span>${lucide("chevron-down", "icon mega__chev")}</summary>
          <ul><li><a href="#/kategoria/${g.slug}"><b>Të gjitha: ${esc(g.name)}</b></a></li>${g.subs.map(subLink).join("")}</ul>
        </details>`).join("")}
      </div>
      <a class="mega__allcats" href="#/kategorite">Shiko të gjitha kategoritë</a>`;
  }
  function toggleMega(open, focus = false) {
    const btn = $("#megaBtn");
    const was = btn.getAttribute("aria-expanded") === "true";
    const on = open ?? !was;
    btn.setAttribute("aria-expanded", on);
    $("#mega").hidden = !on;
    if (on && focus) $("#mega a, #mega summary")?.focus();
    if (!on && was && focus) btn.focus();
  }

  /* ================================================================ sugjerimet e kërkimit */
  let sgActive = -1;
  function highlight(text, q) {
    const ts = tokens(q).filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (!ts.length) return esc(text);
    return text.split(new RegExp(`(${ts.join("|")})`, "gi")).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
  }
  function renderSuggest() {
    const q = $("#search").value.trim();
    const box = $("#suggest");
    sgActive = -1;
    if (!q) { box.hidden = true; return; }
    const ql = q.toLowerCase();
    const score = (p) => (p.name.toLowerCase().startsWith(ql) ? 4 : 0) + (p.name.toLowerCase().includes(ql) ? 2 : 0) + (p.brand.toLowerCase() === ql ? 1 : 0) + (p.stock ? 0.5 : 0);
    const hits = PRODUCTS.filter((p) => textMatch(p, q)).sort((a, b) => score(b) - score(a));
    const cats = {};
    hits.forEach((p) => { cats[p.cat] = (cats[p.cat] || 0) + 1; });
    box.innerHTML = hits.length
      ? `${Object.keys(cats).length > 1 ? `<div class="suggest__label">Kategoritë</div><div class="suggest__cats">${Object.entries(cats).map(([c, n]) => `<button type="button" data-sgcat="${esc(c)}">${esc(c)} (${n})</button>`).join("")}</div>` : ""}
         <div class="suggest__label">Produktet</div>
         ${hits.slice(0, 6).map((p) => `<button type="button" class="sg-item" role="option" data-open="${p.id}">${media(p)}<span><b>${highlight(p.name, q)}</b><small>${esc(p.cat)} · ${stockLabel(p).replace(/<[^>]+>/g, "")}</small></span><span class="price ${p.old ? "price--sale" : ""}">${fmt(p.price)}</span></button>`).join("")}
         <button type="button" class="suggest__all" data-sgall>Shiko të gjitha rezultatet (${hits.length}) për “${esc(q)}”</button>`
      : `<div class="suggest__none">Nuk u gjet asnjë produkt për “${esc(q)}”. Provoni një markë, model ose specifikë, p.sh. “Wi‑Fi 7” ose “32 GB”.</div>`;
    box.hidden = false;
  }
  function hideSuggest() { $("#suggest").hidden = true; }
  function applySearch(q, cat = "All") {
    clearTimeout(sgTimer);
    resetFilters(cat);
    state.q = q.trim();
    $("#search").value = state.q;
    hideSuggest();
    $("#search").blur();
    goCatalog();
  }

  /* ================================================================ shporta */
  const saveCart = () => saved.set("cart", cart);

  function addToCart(id, qty = 1, quiet = false) {
    const p = byId[id];
    if (!p || !p.stock) return false;
    const line = cart.find((l) => l.id === id);
    const cur = line ? line.qty : 0;
    const next = Math.min(p.stock, cur + qty);
    if (next === cur) { toast(`Në stok kemi vetëm ${p.stock} copë nga ky produkt`); return false; }
    if (line) line.qty = next; else cart.push({ id, qty: next });
    saveCart();
    renderCart();
    refreshCards();
    bump("#cartCount");
    if (!quiet) { toast(`U shtua në shportë: <b>${esc(p.name)}</b>`, { label: "Shiko shportën", fn: () => go("#/shporta") }); announce(`${p.name} u shtua në shportë`); }
    return true;
  }

  function setQty(id, qty) {
    const line = cart.find((l) => l.id === id);
    if (!line) return;
    if (qty <= 0) return removeLine(id);
    line.qty = Math.min(qty, byId[id].stock);
    saveCart();
    renderCart();
  }

  function removeLine(id) {
    const idx = cart.findIndex((l) => l.id === id);
    if (idx < 0) return;
    const [removed] = cart.splice(idx, 1);
    saveCart();
    renderCart();
    refreshCards();
    toast(`U hoq: ${esc(byId[id].name)}`, { label: "Anulo", fn: () => { cart.splice(idx, 0, removed); saveCart(); renderCart(); refreshCards(); } });
  }

  // Kodi i zbritjes që klienti ka shkruar (ruhet në shfletues derisa ta heqë ose ta përdorë).
  let promo = saved.get("promo", "");
  function totals(delivery = "standard") {
    const items = cart.reduce((n, l) => n + l.qty, 0);
    const subtotal = cart.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
    const savings = cart.reduce((s, l) => s + ((byId[l.id].old || byId[l.id].price) - byId[l.id].price) * l.qty, 0);
    let shipping = subtotal >= S.freeShippingFrom ? 0 : S.shippingFee;
    if (delivery === "express") shipping += S.expressFee;
    if (delivery === "pickup") shipping = 0;
    // Zbritjet e CMS-it (automatike dhe me kod): mbi produktet, mbi porosinë dhe mbi dërgesën.
    const pr = window.CMS?.priceCart ? CMS.priceCart(cart.map((l) => ({ id: l.id, price: byId[l.id].price, qty: l.qty })), { code: promo, shipping }) : null;
    const discount = pr ? pr.products + pr.order : 0;
    const shippingBefore = shipping;
    shipping = Math.max(0, shipping - (pr ? pr.shipping : 0));
    const total = Math.max(0, subtotal - discount) + shipping;
    return {
      items, subtotal, savings, shipping, shippingBefore, total, vat: total - total / (1 + S.vatRate),
      discount, applied: pr ? pr.applied : [], code: pr?.codeOk ? promo : "", codeError: promo && pr ? pr.codeError : "",
    };
  }
  const discountRows = (t) => t.applied.map((a) => `<dt>${esc(a.title)}${a.code ? ` <span class="code-tag">${esc(a.code)}</span>` : ""}</dt><dd class="save">−${fmt(a.amount)}</dd>`).join("");
  const hasDiscounts = () => !!window.CMS?.discounts?.length;

  const totalsHTML = (t) => `
    <dt>Nëntotali (${plural(t.items, "artikull", "artikuj")})</dt><dd>${fmt(t.subtotal)}</dd>
    ${t.savings > 0 ? `<dt>Kurseni</dt><dd class="save">−${fmt(t.savings)}</dd>` : ""}
    ${discountRows(t)}
    <dt>Dërgesa</dt><dd>${t.shipping === 0 ? "Falas" : fmt(t.shipping)}</dd>
    <dt>Përfshirë TVSH ${Math.round(S.vatRate * 100)}%</dt><dd>${fmt(t.vat)}</dd>
    <dt class="grand">Totali</dt><dd class="grand">${fmt(t.total)}</dd>`;

  function renderCart() {
    const t = totals();
    $("#cart").classList.toggle("is-empty", !cart.length);
    const count = $("#cartCount");
    count.textContent = t.items;
    count.hidden = !t.items;
    $("#cartTotalMini").textContent = fmt(t.subtotal);

    const left = S.freeShippingFrom - t.subtotal;
    $("#shipMeter").innerHTML = (left > 0 ? `Shtoni edhe <b>${fmt(left)}</b> për dërgesë falas` : "<strong>Dërgesa juaj është falas</strong>") +
      `<div class="bar"><i style="width:${Math.min(100, (t.subtotal / S.freeShippingFrom) * 100)}%"></i></div>`;

    $("#cartList").innerHTML = cart.map((l) => {
      const p = byId[l.id];
      return `<li class="cart-item">
        ${media(p)}
        <div>
          <h4>${esc(p.name)}</h4>
          <span class="muted">${fmt(p.price)} / copë</span>
          <div class="qty" role="group" aria-label="Sasia">
            <button type="button" data-qty="${p.id}" data-d="-1" aria-label="Zvogëlo sasinë">−</button>
            <span>${l.qty}</span>
            <button type="button" data-qty="${p.id}" data-d="1" ${l.qty >= p.stock ? "disabled" : ""} aria-label="Rrit sasinë">+</button>
          </div>
        </div>
        <div class="cart-item__right"><b class="num">${fmt(p.price * l.qty)}</b><button type="button" class="remove" data-remove="${p.id}">Hiq</button></div>
      </li>`;
    }).join("");
    $("#cartTotals").innerHTML = totalsHTML(t);
    if (view === "cart") renderCartPage();
    else if (view === "checkout" && !cart.length) go("#/shporta");
  }

  // Përditëson butonat në kartat e dukshme pa i rindërtuar.
  function refreshCards() {
    $$(".add[data-add]").forEach((b) => {
      const p = byId[b.dataset.add];
      const inCart = cartQty(p.id) > 0;
      b.classList.toggle("added", inCart);
      b.innerHTML = `${svg(inCart ? ICON.check : ICON.cart)}${addLabel(p, inCart)}`;
    });
    $$("[data-cmp]").forEach((b) => {
      const on = compare.includes(b.dataset.cmp);
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", on ? "Hiq nga krahasimi" : "Shto për krahasim");
    });
  }

  /* ================================================================ paneli dhe dritaret */
  const overlay = $("#overlay");
  let lastFocus = null;
  function syncOverlay() { overlay.hidden = !($("#cart").classList.contains("open") || $("#filters").classList.contains("open")); }
  function openCart() {
    closeModal();
    lastFocus = document.activeElement;
    $("#cart").classList.add("open");
    $("#cart").setAttribute("aria-hidden", "false");
    syncOverlay();
    $("#cart [data-close]").focus();
  }
  function closeCart() {
    if (!$("#cart").classList.contains("open")) return;
    $("#cart").classList.remove("open");
    $("#cart").setAttribute("aria-hidden", "true");
    syncOverlay();
    lastFocus?.focus?.();
  }
  function openFilters() { $("#filters").classList.add("open"); syncOverlay(); }
  function closeFilters() { $("#filters").classList.remove("open"); syncOverlay(); }

  const modal = $("#modal");
  function openModal(html, cls = "") {
    $("#modalBody").innerHTML = html;
    modal.className = "modal " + cls;
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }
  function closeModal() { if (modal.open) modal.close(); }

  /* ================================================================ pamjet dhe adresat */
  // #/ ballina · #/kategoria/laptope · #/produktet · #/ofertat · #/kerko/<fjala> · #/p/<id> · #/shporta · #/porosia
  // #builder dhe #info-<faqja> hapen sipër pamjes aktuale.
  let view = "";
  let infoBack = "";
  const VIEWS = { home: "#viewHome", catalog: "#viewCatalog", product: "#viewProduct", cart: "#viewCart", checkout: "#viewCheckout", done: "#viewDone", page: "#viewPage" };
  const META_DESC = $('meta[name="description"]')?.getAttribute("content") || "";
  function showView(name, title, desc) {
    const changed = view !== name;
    view = name;
    for (const [k, sel] of Object.entries(VIEWS)) $(sel).hidden = k !== name;
    $("#business").hidden = name !== "home";
    document.body.dataset.view = name;
    document.title = title || "ITCOM — Laptopë, procesorë dhe kartela grafike";
    $('meta[name="description"]')?.setAttribute("content", desc || META_DESC);
    const canonical = name === "product" ? location.href.split("#")[0] : name === "home" ? S.siteUrl : "";
    $('link[rel="canonical"]')?.setAttribute("href", canonical ? canonical.replace(location.origin + BASE, S.siteUrl) : S.siteUrl);
    renderCatNav();
    return changed;
  }
  let routed = "";
  const productId = (key) => (byId[key] ? key : window.CMS?.slugToId?.[key]);
  function route() {
    let h = decodeURIComponent(location.hash.slice(1));
    const pid = productId(pathProduct() || "");
    // Adresat #/… i përkasin rrënjës; nga një faqe produkti e pastrojmë adresën.
    if (location.pathname !== BASE && h.startsWith("/")) history.replaceState(null, "", BASE + location.hash);
    else if (location.pathname !== BASE && !pid) history.replaceState(null, "", BASE + location.hash);
    else if (pid && !h) h = "/p/" + pid;
    routed = location.pathname + location.hash;
    const under = () => { if (!view) { if (pid) renderProduct(pid); else showView("home"); } };
    closeCart(); closeFilters(); hideSuggest(); toggleMega(false);
    if (h === "builder") { under(); window.ITCOM.openBuilder?.(); return; }
    if (h.startsWith("info-")) { under(); infoBack = infoBack || location.pathname + (pid ? "" : "#/"); openInfo(h.slice(5), true); return; }
    // Lidhjet e vjetra #lp-x1c12 → #/p/lp-x1c12
    const legacy = productId(h);
    if (legacy) { history.replaceState(null, "", productHref(legacy)); return route(); }
    closeModal();
    const [hPath, hQuery = ""] = h.split("?");
    const query = [...new URLSearchParams(hQuery)];
    const parts = hPath.replace(/^\//, "").split("/");
    const scrollTop = () => { window.scrollTo({ top: 0 }); };
    if (parts[0] === "p" && productId(parts[1])) {
      const id = productId(parts[1]);
      if (location.pathname !== productHref(id)) history.replaceState(null, "", productHref(id));
      routed = location.pathname;
      renderProduct(id); scrollTop(); return;
    }
    if (parts[0] === "kategoria" && catFromSlug(parts[1])) {
      const cat = catFromSlug(parts[1]);
      if (state.cat !== cat || state.q || state.onSale || state.col || state.grp || query.length) resetFilters(cat);
      // Lidhje me filtër, p.sh. #/kategoria/kartela-grafike?series=RTX%2050 (banerët e prezantimit)
      for (const [k, v] of query) if ((FACETS[cat] || []).some((f) => f.key === k)) state.f[k] = new Set([v]);
      showView("catalog"); render(); scrollTop(); return;
    }
    if (parts[0] === "kategoria" && groupBySlug(parts[1])) {
      const g = groupBySlug(parts[1]);
      if (!g.cats.length) { renderOnRequest(g); scrollTop(); return; }
      if (state.grp !== g || state.cat !== "All" || state.q || state.onSale || state.col) { resetFilters(); state.grp = g; }
      showView("catalog"); render(); scrollTop(); return;
    }
    if (parts[0] === "kategoria" && subBySlug(parts[1])) { const { g, x } = subBySlug(parts[1]); renderOnRequest(g, x); scrollTop(); return; }
    if (parts[0] === "kategorite") { renderAllCategories(); scrollTop(); return; }
    if (parts[0] === "produktet") { if (state.cat !== "All" || state.q || state.onSale || state.col || state.grp) resetFilters(); showView("catalog"); render(); scrollTop(); return; }
    if (parts[0] === "ofertat") { if (!state.onSale || state.cat !== "All" || state.q || state.col || state.grp) { resetFilters(); state.onSale = true; state.sort = "discount"; } showView("catalog"); render(); scrollTop(); return; }
    if (parts[0] === "kerko") {
      const q = parts.slice(1).join("/");
      if (state.q !== q) { resetFilters(state.q ? state.cat : "All"); state.q = q; $("#search").value = q; }
      showView("catalog"); $("#grid").innerHTML = skeleton(8);
      requestAnimationFrame(() => render()); scrollTop(); return;
    }
    if (parts[0] === "koleksioni") {
      const c = colBySlug(parts[1]);
      if (!c) { notFound("Koleksioni nuk u gjet", "#/produktet", "Shiko produktet"); scrollTop(); return; }
      if (state.col !== c) { resetFilters(); state.col = c; }
      showView("catalog"); render(); scrollTop(); return;
    }
    if (parts[0] === "oferta") { renderOffer(parts[1]); scrollTop(); return; }
    if (parts[0] === "blog") { if (parts[1]) renderPost(parts[1]); else renderBlog(); scrollTop(); return; }
    if (parts[0] === "servisi") { renderServices(parts[1] || ""); scrollTop(); return; }
    if (parts[0] === "shporta") { renderCartPage(); scrollTop(); return; }
    if (parts[0] === "porosia") { if (!cart.length) { history.replaceState(null, "", BASE + "#/shporta"); renderCartPage(); } else renderCheckout(); scrollTop(); return; }
    if (parts[0] === "konfirmimi") { renderDone(parts[1]); scrollTop(); return; }
    showView("home"); scrollTop();
  }
  // Ndryshimet e adresës (para/prapa, #…): një herë për çdo adresë, edhe kur shfletuesi njofton dy herë.
  const onNav = () => { if (location.pathname + location.hash === routed) return; route(); $("#main").focus({ preventScroll: true }); };
  window.addEventListener("hashchange", onNav);
  window.addEventListener("popstate", onNav);
  // Lidhjet e dyqanit hapen pa ringarkim; Ctrl/Cmd+klik ose skeda e re punojnë si lidhje të zakonshme.
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download") || a.hasAttribute("data-builder")) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    const inShop = url.pathname === BASE ? url.hash.startsWith("#/") : url.pathname.startsWith(BASE + "p/");
    if (inShop) { e.preventDefault(); go(url.pathname === BASE ? url.hash : url.pathname); return; }
    // Lidhje brenda faqes (p.sh. "Kalo te përmbajtja") kur adresa e faqes nuk është rrënja.
    if (url.pathname === BASE && url.hash.length > 1 && location.pathname !== BASE) {
      const t = document.getElementById(url.hash.slice(1));
      if (t) { e.preventDefault(); t.focus({ preventScroll: true }); t.scrollIntoView(); }
    }
  });

  // Faqet informuese kanë lidhjen e vet (#info-delivery); kur mbyllen, kthehemi te pamja ku ishim.
  modal.addEventListener("close", () => {
    if (location.hash.startsWith("#info-")) { history.replaceState(null, "", infoBack || BASE + "#/"); infoBack = ""; routed = location.pathname + location.hash; }
  });

  /* ================================================================ faqet informuese */
  // Numri në js/products.js është shembull derisa ta vendosë dyqani (ose CMS-i); nuk e shfaqim si të vërtetë.
  const realPhone = () => S.phone && S.phone !== "+383 44 000 000";
  const INFO = {
    delivery: {
      title: "Dërgesa",
      html: () => `
        <p class="lead">Dërgojmë në gjithë Kosovën, zakonisht brenda 24–48 orëve në ditë pune.</p>
        <div class="info__facts">
          <div><b>${fmt(S.shippingFee)}</b><span>Dërgesë standarde</span></div>
          <div><b>Falas</b><span>Për porosi mbi ${fmt0(S.freeShippingFrom)}</span></div>
          <div><b>+${fmt(S.expressFee)}</b><span>Dërgesë e shpejtë, ditën tjetër të punës</span></div>
          <div><b>Falas</b><span>Marrje në dyqan</span></div>
        </div>
        <h3>Si funksionon</h3>
        <ul>
          <li>Pas porosisë ju kontaktojmë në telefon për ta konfirmuar.</li>
          <li>Korrieri ju telefonon para se të vijë te adresa juaj.</li>
          <li>Paguani në dorëzim, me para në dorë ose me kartelë.</li>
          <li>Kontrolloni paketimin para se ta pranoni. Nëse është i dëmtuar, mos e pranoni dhe na lajmëroni.</li>
        </ul>`,
    },
    returns: {
      title: "Kthimi i produkteve",
      html: () => `
        <p class="lead">Mund ta ktheni produktin brenda 14 ditëve nga pranimi, pa pasur nevojë të jepni arsye.</p>
        <h3>Kushtet</h3>
        <ul>
          <li>Produkti duhet të jetë i paprekur, me të gjitha pjesët dhe me paketimin origjinal.</li>
          <li>Bashkëngjitni faturën ose numrin e porosisë.</li>
          <li>Softueri dhe licencat e aktivizuara, si dhe produktet e hapura për arsye higjienike, nuk kthehen.</li>
        </ul>
        <h3>Hapat</h3>
        <ul>
          <li>Na kontaktoni dhe na jepni numrin e porosisë.</li>
          <li>Sillni produktin në dyqan ose ne organizojmë marrjen e tij.</li>
          <li>Pas kontrollit, paratë kthehen brenda 14 ditëve me të njëjtën mënyrë pagese.</li>
        </ul>`,
    },
    warranty: {
      title: "Garancia dhe servisi",
      html: () => `
        <p class="lead">Çdo produkt vjen me garanci 24‑mujore. Disa prodhues ofrojnë edhe më gjatë, dhe kjo shënohet te specifikimet.</p>
        <h3>Çfarë mbulon garancia</h3>
        <ul>
          <li>Defektet e fabrikës dhe prishjet gjatë përdorimit normal.</li>
          <li>Riparimin ose zëvendësimin e pjesës, pa pagesë.</li>
        </ul>
        <h3>Çfarë nuk mbulon</h3>
        <ul>
          <li>Dëmtimet fizike, nga lëngjet ose nga rryma.</li>
          <li>Ndërhyrjet nga servise të paautorizuara.</li>
          <li>Konsumin normal, si bateritë pas ciklit të tyre të jetës.</li>
        </ul>
        <h3>Si të aplikoni</h3>
        <ul><li>Sillni produktin me faturën ose fletën e garancisë, ose na kontaktoni që ta marrim ne.</li></ul>`,
    },
    installments: {
      title: "Pagesat",
      html: () => `
        <p class="lead">Zgjidh mënyrën e pagesës kur përfundon porosinë. Asnjë pagesë nuk merret online.</p>
        <ul>
          <li><b>Pagesë në dorëzim</b> — me para në dorë ose me kartelë te korrieri.</li>
          <li><b>Transfertë bankare</b> — ju dërgojmë faturë pro‑forma me email; porosia nisë pas pagesës.</li>
          ${S.installments ? `<li><b>Me këste</b> — deri në ${S.installments} muaj me kartelat e bankave partnere. Kushtet e sakta varen nga banka dhe konfirmohen para dërgesës.</li>` : ""}
        </ul>
        <p>Çmimet përfshijnë TVSH ${Math.round(S.vatRate * 100)}%. Për kompani lëshojmë faturë me TVSH.</p>`,
    },
    contact: {
      title: "Kontakti",
      html: () => `
        <p class="lead">Jemi këtu për pyetje rreth produkteve, porosive ose ofertave për biznese.</p>
        <div class="info__contact">
          ${realPhone() ? `<div>${svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>')}<span>Telefoni <b>${esc(S.phone)}</b></span></div>` : ""}
          <button type="button" class="btn btn--primary" data-business>Na shkruani</button>
          ${S.whatsapp ? `<a href="https://wa.me/${esc(S.whatsapp)}" target="_blank" rel="noopener">${svg('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z"/>')}<span>Shkruani në WhatsApp</span></a>` : ""}
          ${S.email ? `<div>${svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>')}<span>Email <b>${esc(S.email)}</b></span></div>` : ""}
        </div>`,
    },
    about: {
      title: "Rreth ITCOM",
      html: () => `
        <p class="lead">ITCOM ofron pajisje IT për biznese dhe shtëpi: laptopë, procesorë dhe kartela grafike nga markat më të njohura, si dhe konfigurime PC të ndërtuara sipas porosisë.</p>
        <p>Zgjedhim produktet me kujdes, i përshkruajmë me specifika të sakta dhe ju ndihmojmë të gjeni pajisjen e duhur, qoftë për një student apo për një zyrë të tërë.</p>`,
    },
    business: {
      title: "Llogari biznesi",
      html: () => `
        <p class="lead">Për kompani, institucione dhe shkolla që blejnë rregullisht.</p>
        <ul>
          <li>Çmime për sasi dhe oferta të personalizuara.</li>
          <li>Faturë me TVSH dhe pagesë me transfertë bankare.</li>
          <li>Konfigurim i pajisjeve, instalim në vend dhe mirëmbajtje.</li>
          <li>Një person kontakti për të gjitha porositë tuaja.</li>
        </ul>
        <p>Kërkoni ofertë te seksioni ITCOM Business në fund të faqes, ose na kontaktoni në telefon.</p>`,
    },
    careers: {
      title: "Karriera",
      html: () => `<p class="lead">Aktualisht nuk kemi pozita të hapura.</p><p>Nëse dëshironi të punoni me ne në shitje, servis ose logjistikë, na kontaktoni dhe do t'ju njoftojmë kur të hapet një pozitë.</p>`,
    },
    terms: {
      title: "Kushtet e blerjes",
      html: () => `
        <p class="lead">Këto kushte vlejnë për çdo porosi në dyqanin online të ITCOM.</p>
        <h3>Porosia</h3>
        <ul>
          <li>Porosia konsiderohet e pranuar pasi ekipi ITCOM ju kontakton dhe e konfirmon disponueshmërinë dhe çmimin.</li>
          <li>Çmimet janë në euro dhe përfshijnë TVSH. Kostoja e dërgesës shfaqet para se ta dërgoni porosinë.</li>
          <li>Fotot tregojnë modelin; ngjyra dhe konfigurimi i saktë verifikohen sipas kodit të artikullit.</li>
        </ul>
        <h3>Dërgesa dhe pagesa</h3>
        <ul>
          <li>Dërgojmë në gjithë Kosovën, zakonisht brenda 1–2 ditëve pune. Ose merreni falas në dyqan.</li>
          <li>Pagesa bëhet në dorëzim ose me transfertë bankare. Nuk ruajmë të dhëna kartelash.</li>
        </ul>
        <h3>Kthimi dhe garancia</h3>
        <ul>
          <li>Kthim brenda 14 ditëve nga pranimi, për produkte të paprekura në paketimin origjinal.</li>
          <li>Garanci 24 muaj për defektet e fabrikës, sipas kushteve te faqja “Garancia dhe servisi”.</li>
        </ul>`,
    },
    privacy: {
      title: "Politika e privatësisë",
      html: () => `
        <p class="lead">Mbledhim vetëm të dhënat që na duhen për të përpunuar dhe dërguar porosinë tuaj.</p>
        <ul>
          <li>Emrin, telefonin, email‑in dhe adresën i përdorim vetëm për porosinë dhe komunikimin me ju.</li>
          <li>Nuk i shesim dhe nuk i ndajmë të dhënat tuaja me palë të treta, përveç korrierit që dërgon porosinë.</li>
          <li>Shporta, lista e dëshirave dhe produktet e shikuara ruhen vetëm në shfletuesin tuaj.</li>
          <li>Mund të kërkoni në çdo kohë që të dhënat tuaja të fshihen.</li>
        </ul>`,
    },
  };

  // Faqet e redaktuara në CMS zëvendësojnë tekstet e mësipërme (sipas slug-ut: returns, warranty, about …).
  for (const [slug, pg] of Object.entries(window.CMS?.pages || {})) INFO[slug] = { title: pg.title, html: () => pg.html };

  function openInfo(key, fromRoute = false) {
    const page = INFO[key];
    if (!page) return;
    toggleMega(false);
    if (!fromRoute && !location.hash.startsWith("#info-")) infoBack = location.pathname + (location.hash || (location.pathname === BASE ? "#/" : ""));
    const nav = ["delivery", "installments", "returns", "warranty", "terms", "contact"];
    openModal(`
      <article class="info">
        <span class="eyebrow">ITCOM</span>
        <h2>${esc(page.title)}</h2>
        ${page.html()}
        <nav class="info__nav" aria-label="Faqe të tjera">${nav.map((k) => `<button type="button" data-info="${k}" ${k === key ? 'aria-current="page"' : ""}>${esc(INFO[k].title)}</button>`).join("")}</nav>
      </article>`, "modal--info");
    history.replaceState(null, "", location.pathname + "#info-" + key);
    routed = location.pathname + location.hash;
  }

  /* ================================================================ faqja e produktit */
  const gallery = (p) => (p.imgs && p.imgs.length ? p.imgs : [imgSrc(p)]);

  // Detajet e produktit (Raundi 02, f. 11–12): konfigurimi në një vështrim, specifikime në grupe,
  // përshkrim i strukturuar, dërgesa sipas qytetit. Vlerat që mungojnë thuhen hapur (“Sipas konfigurimit”).
  const GLANCE = {
    "Laptopë": [["cpu", "Procesori", "cpu"], ["ram", "Memoria", "memory-stick", " RAM"], ["storage", "Ruajtja", "hard-drive", " SSD"], ["screen", "Ekrani", "monitor"]],
    "Procesorë": [["cores", "Bërthamat", "cpu"], ["socket", "Soketi", "layers"], ["series", "Seria", "gauge"]],
    "Kartela grafike": [["chip", "Çipi", "cpu"], ["vram", "Memoria", "memory-stick", " GDDR"], ["series", "Seria", "gauge"]],
  };
  const SPEC_GROUPS = [
    ["Performanca", ["cpu", "ram", "storage", "gpu", "cores", "chip", "vram", "series"]],
    ["Ekrani, sistemi dhe platforma", ["screen", "os", "type", "socket"]],
  ];
  function glanceHTML(p) {
    const rows = GLANCE[p.cat];
    if (!rows) return "";
    return `<h3 class="pp__h">Konfigurimi në një vështrim</h3>
      <ul class="glance">${rows.map(([k, label, icon, suffix = ""]) => {
        const v = p.attrs[k];
        const val = v === undefined ? "Sipas konfigurimit" : fmtVal(p.cat, k, v) + (suffix && !/GDDR/.test(suffix) ? suffix : "");
        return `<li>${lucide(icon)}<small>${label}</small><b ${v === undefined ? 'class="is-unknown"' : ""}>${esc(val)}</b></li>`;
      }).join("")}</ul>`;
  }
  function specGroupsHTML(p) {
    const facets = FACETS[p.cat] || [];
    const used = new Set();
    const row = ([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`;
    const groups = SPEC_GROUPS.map(([title, keys]) => {
      const rows = keys.map((k) => facets.find((f) => f.key === k)).filter((f) => f && p.attrs[f.key] !== undefined).map((f) => { used.add(f.key); return [f.label, fmtVal(p.cat, f.key, p.attrs[f.key])]; });
      return [title, rows];
    });
    const missing = p.cat === "Laptopë" ? ["ram", "storage"].filter((k) => p.attrs[k] === undefined) : [];
    groups.push(["Modeli dhe garancia", [
      ["Modeli", p.name], ["Brendi", p.brand], ["Kodi i artikullit", p.id.toUpperCase()],
      ...missing.map((k) => [facets.find((f) => f.key === k)?.label || k, "Sipas konfigurimit · verifikohet sipas kodit të artikullit"]),
      ["Garancia", "24 muaj"],
    ]]);
    if (p.specs.length) groups.push(["Veçoritë nga prodhuesi", p.specs.map((x, i) => [i ? "" : "Pikat kryesore", x])]);
    const html = groups.filter(([, rows]) => rows.length).map(([title, rows]) =>
      `<tbody><tr class="spec-group"><th colspan="2" scope="colgroup">${esc(title)}</th></tr>${rows.map(row).join("")}</tbody>`).join("");
    const total = groups.reduce((n, [, r]) => n + r.length, 0);
    return `<table class="spec-table spec-table--grouped ${total > 12 ? "is-collapsed" : ""}" id="specTable">${html}</table>
      ${total > 12 ? `<button type="button" class="link-btn spec-more" id="specMore" aria-controls="specTable" aria-expanded="false">Shfaq të gjitha specifikimet (${total})</button>` : ""}`;
  }
  function shipCalc(p, city) {
    const zone = (window.STORE.zones || []).find((z) => z.cities?.includes(city));
    const fee = p.price >= S.freeShippingFrom ? 0 : zone?.fee ?? S.shippingFee;
    const days = zone?.days || "1–2";
    return `<b>${fee ? fmt(fee) : "Falas"}</b> · ${days} ditë pune${city ? ` në ${esc(city)}` : ""} · marrje falas në dyqan`;
  }

  function renderProduct(id) {
    const p = byId[id];
    if (!p) return;
    addRecent(id);
    const d = discount(p);
    const imgs = gallery(p);
    const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 4);
    const w = wish.has(p.id), cmp = compare.includes(p.id);
    const inShop = PRODUCTS.includes(p);
    const crumbs = [`<a href="#/">Ballina</a>`, inShop ? `<a href="#/kategoria/${catSlug(p.cat)}">${esc(p.cat)}</a>` : "", `<span aria-current="page">${esc(p.name)}</span>`].filter(Boolean);
    const ship = p.price >= S.freeShippingFrom ? "Dërgesë falas" : `Dërgesa ${fmt(S.shippingFee)} · falas mbi ${fmt0(S.freeShippingFrom)}`;
    showView("product", `${p.name} · ITCOM`, `${p.name}: ${shortSpecs(p)}. ${fmt(p.price)} me TVSH, garanci 24 muaj, dërgesë në gjithë Kosovën.`);
    $("#viewProduct").innerHTML = `
      <nav class="crumbs" aria-label="Navigimi">${crumbs.join('<span aria-hidden="true">/</span>')}</nav>
      <div class="pp">
        <div class="pp__gallery">
          <div class="pp__main" id="ppMain">${media(p, "", true)}</div>
          <p class="pp__caption">Foto nga prodhuesi · varianti përfundimtar verifikohet sipas kodit të artikullit</p>
          ${imgs.length > 1 ? `<div class="pp__thumbs" role="tablist" aria-label="Fotot e produktit">${imgs.map((src, i) => `<button type="button" role="tab" data-thumb="${i}" aria-selected="${i === 0}" aria-label="Foto ${i + 1}"><img src="${esc(src)}" alt="" loading="lazy" /></button>`).join("")}</div>` : ""}
        </div>
        <div class="pp__info">
          <span class="eyebrow">${esc(p.brand)} / ${esc(p.cat)}</span>
          <h1>${esc(p.name)}</h1>
          <p class="pp__sub">${esc(shortSpecs(p))}</p>
          <p class="pp__sku">Kodi i artikullit: <span class="mono">${esc(p.id.toUpperCase())}</span></p>
          <div class="pp__price">${priceHTML(p)}${d ? `<span class="pp__save">Kurseni ${fmt(p.old - p.price)}</span>` : ""}</div>
          <p class="pp__vat">Çmimi përfshin TVSH ${Math.round(S.vatRate * 100)}%${S.installments ? ` · ose ${S.installments} × ${fmt(p.price / S.installments)} në muaj` : ""}</p>
          <div class="pp__stock">${stockLabel(p)}<span>${p.stock ? `Porosit sot, arrin <b>${deliveryDate(2)}</b> · marrje falas në dyqan` : "Aktualisht i padisponueshëm — pyetni për afatin"}</span></div>
          <div class="pp__buy">
            <button type="button" class="btn btn--cta btn--lg" id="ppAdd" ${p.stock ? "" : "disabled"}>${p.stock ? "Shto në shportë" : "Jashtë stokut"}</button>
            <div class="qty qty--lg" role="group" aria-label="Sasia">
              <button type="button" id="ppMinus" aria-label="Zvogëlo sasinë">−</button>
              <span id="ppQty" aria-live="polite">1</span>
              <button type="button" id="ppPlus" aria-label="Rrit sasinë">+</button>
            </div>
          </div>
          <ul class="pp__terms">
            <li><button type="button" data-info="delivery">Dërgesa</button><span>${ship}</span></li>
            <li><button type="button" data-info="warranty">Garancia</button><span>24 muaj · kthim brenda 14 ditëve</span></li>
          </ul>
          <div class="pp__actions">
            <button type="button" class="link-btn ${cmp ? "is-on" : ""}" data-cmp="${p.id}" aria-pressed="${cmp}">${svg(ICON.compare)}Krahaso</button>
            <button type="button" class="link-btn ${w ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${w}">${svg(ICON.heart)}Ruaj</button>
            <button type="button" class="link-btn" data-ask="${p.id}">${svg('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z"/>')}Pyet për produktin</button>
          </div>
        </div>
      </div>
      <div class="pp__details">
        <div class="pp__tabs">
          <div class="tabs" role="tablist" aria-label="Detajet e produktit">
            <button type="button" role="tab" id="tab-specs" aria-selected="true" aria-controls="tabSpecs" data-tab="specs">Specifikimet</button>
            <button type="button" role="tab" id="tab-about" aria-selected="false" aria-controls="tabAbout" data-tab="about" tabindex="-1">Përshkrimi</button>
            <button type="button" role="tab" id="tab-ship" aria-selected="false" aria-controls="tabShip" data-tab="ship" tabindex="-1">Dërgesa &amp; garancia</button>
          </div>
          <div id="tabSpecs" role="tabpanel" aria-labelledby="tab-specs" data-pane="specs" tabindex="0">
            ${glanceHTML(p)}
            ${specGroupsHTML(p)}
          </div>
          <div id="tabAbout" role="tabpanel" aria-labelledby="tab-about" data-pane="about" tabindex="0" hidden>
            <h3 class="pp__h">${esc(p.name)}</h3>
            ${p.desc ? `<p class="pp__desc">${esc(p.desc)}</p>` : ""}
            ${p.specs.length ? `<h4 class="pp__h4">Pikat kryesore</h4><ul class="pp__points">${p.specs.slice(0, 3).map((x) => `<li>${lucide("sparkles")}<span>${esc(x)}</span></li>`).join("")}</ul>` : ""}
            <p class="pp__note">Foto dhe të dhëna nga prodhuesi. Varianti, ngjyra dhe përmbajtja e paketës verifikohen sipas kodit të artikullit para dërgesës.</p>
          </div>
          <div id="tabShip" role="tabpanel" aria-labelledby="tab-ship" data-pane="ship" tabindex="0" hidden>
            <div class="ship-grid">
              <section>
                <h4 class="pp__h4">${lucide("truck")}Dërgesa</h4>
                <label class="field" for="shipCity">Zgjidh qytetin
                  <select id="shipCity">${(S.zones || []).flatMap((z) => z.cities || []).map((c) => `<option ${c === "Prishtinë" ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
                </label>
                <p class="ship-out" id="shipOut" aria-live="polite">${shipCalc(p, "Prishtinë")}</p>
                <p class="muted">Dërgesë e shpejtë +${fmt(S.expressFee)} · ditën tjetër të punës.</p>
              </section>
              <section>
                <h4 class="pp__h4">${lucide("shield-check")}Garancia</h4>
                <p>24 muaj për defektet e fabrikës. Kthim brenda 14 ditëve për produkte të paprekura në paketimin origjinal.</p>
                <button type="button" class="link-btn" data-info="warranty">Kushtet e garancisë</button>
              </section>
              <section>
                <h4 class="pp__h4">${lucide("headset")}Mbështetja</h4>
                <p>Pyet ekipin para blerjes ose për instalimin.</p>
                <button type="button" class="link-btn" data-ask="${p.id}">Pyet ekipin</button>
              </section>
            </div>
          </div>
        </div>
        <aside class="pp__help pp__before">
          <h2>Para se të porosisësh</h2>
          <dl>
            <dt>${lucide("truck")}Dërgesa</dt><dd>${p.price >= S.freeShippingFrom ? "Falas" : fmt(S.shippingFee)} · afati sipas adresës, zakonisht 1–2 ditë pune.</dd>
            <dt>${lucide("shield-check")}Garancia</dt><dd>24 muaj · kushtet sipas kodit ${esc(p.id.toUpperCase())}.</dd>
            <dt>${lucide("circle-help")}Ke një pyetje?</dt><dd>Ekipi të ndihmon të zgjedhësh variantin e duhur.</dd>
          </dl>
          <button type="button" class="btn btn--cta btn--block" data-ask="${p.id}">Pyet për produktin</button>
        </aside>
      </div>
      ${imgs.length > 1 ? `<section class="pp__angles"><h2>E njëjta pajisje. Nga kënde të ndryshme.</h2><div class="pp__angles-grid">${imgs.slice(1).map((src) => `<div class="media"><img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" /></div>`).join("")}</div></section>` : ""}
      ${related.length ? `<section class="home-sec"><div class="home-sec__head"><h2 class="home-sec__title">Produkte të ngjashme</h2>${inShop ? `<a class="home-sec__link" href="#/kategoria/${catSlug(p.cat)}">Të gjitha</a>` : ""}</div><div class="pgrid">${related.map((x) => card(x)).join("")}</div></section>` : ""}
      <div class="pp__bar" aria-hidden="true"><b>${fmt(p.price)}</b><button type="button" class="btn btn--cta" data-add="${p.id}" tabindex="-1" ${p.stock ? "" : "disabled"}>${p.stock ? "Shto në shportë" : "Jashtë stokut"}</button></div>`;

    let qty = 1;
    const room = () => Math.max(1, p.stock - cartQty(p.id));
    const sync = () => { $("#ppQty").textContent = qty; $("#ppMinus").disabled = qty <= 1; $("#ppPlus").disabled = qty >= room(); };
    sync();
    $("#ppMinus").onclick = () => { qty = Math.max(1, qty - 1); sync(); };
    $("#ppPlus").onclick = () => { qty = Math.min(room(), qty + 1); sync(); };
    $("#ppAdd").onclick = () => { if (addToCart(p.id, qty)) { qty = 1; sync(); } };
    const root = $("#viewProduct");
    const tabs = $$("[data-tab]", root);
    const pick = (t, focus) => {
      tabs.forEach((x) => { x.setAttribute("aria-selected", x === t); x.tabIndex = x === t ? 0 : -1; });
      $$("[data-pane]", root).forEach((pane) => { pane.hidden = pane.dataset.pane !== t.dataset.tab; });
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => pick(t));
      // Tabet e aksesueshme: shigjetat, Home dhe End lëvizin mes tyre.
      t.addEventListener("keydown", (e) => {
        const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (k === undefined) return;
        e.preventDefault();
        pick(tabs[(k + tabs.length) % tabs.length], true);
      });
    });
    $("#specMore")?.addEventListener("click", (e) => {
      const open = $("#specTable").classList.toggle("is-collapsed") === false;
      e.currentTarget.setAttribute("aria-expanded", open);
      const b = e.currentTarget;
      b.dataset.label ||= b.textContent;
      b.textContent = open ? "Shfaq më pak" : b.dataset.label;
    });
    $("#shipCity")?.addEventListener("change", (e) => { $("#shipOut").innerHTML = shipCalc(p, e.target.value); });
    $$("[data-thumb]", root).forEach((t) => t.addEventListener("click", () => {
      $$("[data-thumb]", root).forEach((x) => x.setAttribute("aria-selected", x === t));
      $("#ppMain img").src = imgs[Number(t.dataset.thumb)];
    }));
  }

  /* ================================================================ forma: pyetje dhe oferta për biznes */
  function openForm({ title, intro, fields, submit, onSubmit }) {
    openModal(`
      <form class="lead-form" id="leadForm" novalidate>
        <h2>${title}</h2>
        <p class="muted">${intro}</p>
        <div class="form-grid">${fields.map((f) => `
          <label class="field ${f.full ? "full" : ""}" for="lf-${f.id}">${f.label}${f.optional ? ' <span class="muted">(opsionale)</span>' : ""}
            ${f.type === "textarea" ? `<textarea id="lf-${f.id}" name="${f.id}" rows="4">${esc(f.value || "")}</textarea>` : `<input id="lf-${f.id}" name="${f.id}" type="${f.type || "text"}" value="${esc(f.value || "")}" ${f.attrs || ""} />`}
            <span class="err"></span>
          </label>`).join("")}</div>
        <button class="btn btn--cta btn--lg" type="submit">${submit}</button>
      </form>`, "modal--info");
    const form = $("#leadForm");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let bad = null;
      for (const f of fields) {
        const el = form.elements[f.id];
        const v = el.value.trim();
        let err = "";
        if (!f.optional && !v) err = "Plotësojeni këtë fushë";
        else if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err = "Shkruani një email të vlefshëm";
        else if (v && f.type === "tel" && v.replace(/\D/g, "").length < 8) err = "Shkruani një numër me të paktën 8 shifra";
        el.closest(".field").classList.toggle("invalid", !!err);
        el.closest(".field").querySelector(".err").textContent = err;
        if (err && !bad) bad = el;
      }
      if (bad) { bad.focus(); return; }
      onSubmit(Object.fromEntries(fields.map((f) => [f.id, form.elements[f.id].value.trim()])));
    });
    form.elements[fields[0].id].focus();
  }
  const me = () => Account.user();
  // Kërkesë e lirë (kategori pa produkte online, koleksion): shkon në inbox të CMS-it.
  function openRequest({ title, intro, message = "", type = "quote", tags = [] }) {
    openForm({
      title, intro, submit: "Dërgo kërkesën",
      fields: [
        { id: "name", label: "Emri", value: me()?.name, attrs: 'autocomplete="name"' },
        { id: "phone", label: "Telefoni", type: "tel", attrs: 'autocomplete="tel"' },
        { id: "email", label: "Email-i", type: "email", optional: true, value: me()?.email, attrs: 'autocomplete="email"' },
        { id: "message", label: "Çfarë ju duhet?", type: "textarea", full: true, value: message },
      ],
      onSubmit: (v) => {
        const ok = window.CMS?.saveInquiry({ type, name: v.name, phone: v.phone, email: v.email, message: v.message, tags });
        closeModal();
        toast(ok ? "Faleminderit! Kërkesa u dërgua — ekipi ju kthen përgjigje." : "Kërkesa nuk u dërgua. Provoni përsëri.");
      },
    });
  }
  function openAsk(id) {
    const p = byId[id];
    openForm({
      title: "Pyet për produktin",
      intro: `${esc(p.name)} · ${esc(p.id.toUpperCase())}. Ekipi ITCOM ju përgjigjet brenda ditës së punës.`,
      submit: "Dërgo pyetjen",
      fields: [
        { id: "name", label: "Emri", value: me()?.name, attrs: 'autocomplete="name"' },
        { id: "phone", label: "Telefoni", type: "tel", attrs: 'autocomplete="tel"' },
        { id: "email", label: "Email-i", type: "email", optional: true, value: me()?.email, attrs: 'autocomplete="email"' },
        { id: "message", label: "Pyetja juaj", type: "textarea", full: true, value: p.cat === "Laptopë" ? "Do ta përdor për: " : "" },
      ],
      onSubmit: (v) => {
        const ok = window.CMS?.saveInquiry({ type: "contact", name: v.name, phone: v.phone, email: v.email, message: v.message, productId: p.id, tags: ["pyetje-produkti"] });
        closeModal();
        toast(ok ? "Faleminderit! Pyetja u dërgua — do t'ju kontaktojmë së shpejti." : "Pyetja nuk u dërgua. Na telefononi ose provoni përsëri.");
      },
    });
  }
  function openBusiness() {
    const items = cart.length ? cart.map((l) => `${l.qty} × ${byId[l.id].name}`).join("\n") : "";
    openForm({
      title: "Kërko ofertë për biznes",
      intro: "Trego çfarë i duhet kompanisë. Ofertën me çmime për sasi, faturë me TVSH dhe afatet ta dërgojmë brenda një dite pune.",
      submit: "Dërgo kërkesën",
      fields: [
        { id: "company", label: "Kompania", attrs: 'autocomplete="organization"' },
        { id: "name", label: "Personi i kontaktit", value: me()?.name, attrs: 'autocomplete="name"' },
        { id: "email", label: "Email-i i punës", type: "email", value: me()?.email, attrs: 'autocomplete="email"' },
        { id: "phone", label: "Telefoni", type: "tel", attrs: 'autocomplete="tel"' },
        { id: "message", label: "Çfarë ju duhet", type: "textarea", full: true, value: items ? `Artikujt nga shporta:\n${items}\n\n` : "" },
      ],
      onSubmit: (v) => {
        const ok = window.CMS?.saveInquiry({ type: "quote", company: v.company, name: v.name, email: v.email, phone: v.phone, message: v.message, tags: ["b2b"] });
        closeModal();
        toast(ok ? "Faleminderit! Kërkesa për ofertë u dërgua — ekipi ITCOM ju kontakton brenda një dite pune." : "Kërkesa nuk u dërgua. Na telefononi ose provoni përsëri.");
      },
    });
  }

  /* ================================================================ krahasimi */
  function toggleCompare(id) {
    const p = byId[id];
    if (compare.includes(id)) compare = compare.filter((x) => x !== id);
    else if (compare.length && byId[compare[0]].cat !== p.cat) {
      toast("Mund të krahasoni vetëm produkte nga e njëjta kategori", { label: "Fillo krahasim të ri", fn: () => { compare = [id]; saveCompare(); } });
      return;
    } else if (compare.length >= 4) { toast("Mund të krahasoni deri në 4 produkte"); return; }
    else compare.push(id);
    saveCompare();
  }
  function saveCompare() { saved.set("cmp", compare); renderTray(); refreshCards(); }

  function renderTray() {
    $("#cmpTray").hidden = !compare.length;
    document.body.classList.toggle("has-tray", compare.length > 0);
    const c = $("#cmpCount");
    c.textContent = compare.length;
    c.hidden = !compare.length;
    $("#cmpItems").innerHTML = compare.map((id) => {
      const p = byId[id];
      return `<div class="cmp-chip">${media(p)}<span>${esc(p.name)}</span><button type="button" data-uncmp="${id}" aria-label="Hiq ${esc(p.name)} nga krahasimi">${svg(ICON.x)}</button></div>`;
    }).join("") + Array.from({ length: 4 - compare.length }, () => `<div class="cmp-slot">Shtoni një produkt</div>`).join("");
    $("#cmpOpen").textContent = `Krahaso (${compare.length})`;
    $("#cmpOpen").disabled = compare.length < 2;
  }

  function openCompare(onlyDiff = false) {
    if (compare.length < 2) { toast("Zgjidhni të paktën dy produkte për krahasim"); return; }
    const ps = compare.map((id) => byId[id]);
    const cat = ps[0].cat;
    const minPrice = Math.min(...ps.map((p) => p.price));
    const groups = [
      ["Bazat", [
        ["Çmimi", ps.map((p) => `<span class="${p.price === minPrice ? "best" : ""}">${fmt(p.price)}</span>`), ps.map((p) => p.price)],
        ["Disponueshmëria", ps.map(stockLabel), ps.map((p) => (p.stock ? (p.stock <= 5 ? 1 : 2) : 0))],
        ["Brendi", ps.map((p) => esc(p.brand)), ps.map((p) => p.brand)],
      ]],
      ["Specifikimet", (FACETS[cat] || []).map((f) => [f.label, ps.map((p) => (p.attrs[f.key] === undefined ? "—" : esc(f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]))), ps.map((p) => String(p.attrs[f.key]))])],
      ["Veçoritë dhe garancia", [
        ["Veçoritë kryesore", ps.map((p) => p.specs.map(esc).join("<br>")), ps.map((p) => p.specs.join())],
        ["Garancia", ps.map(() => "24 muaj"), ps.map(() => "24")],
      ]],
    ];
    const body = groups.map(([title, rows]) => {
      const html = rows.map(([label, cells, raw]) => {
        const diff = new Set(raw).size > 1;
        if (onlyDiff && !diff) return "";
        return `<tr class="${diff ? "diff" : ""}"><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
      }).join("");
      return html ? `<tbody><tr class="cmp__group"><th colspan="${ps.length + 1}" scope="colgroup">${title}</th></tr>${html}</tbody>` : "";
    }).join("");
    openModal(`
      <div class="cmp">
        <h2>Krahasimi: ${esc(cat)}</h2>
        <div class="cmp__opts"><label class="check"><input type="checkbox" id="cmpDiff" ${onlyDiff ? "checked" : ""} /> Shfaq vetëm dallimet</label><span>Rreshtat me sfond ndryshojnë mes produkteve.</span></div>
        <div class="cmp__scroll" tabindex="0" aria-label="Tabela e krahasimit">
          <table>
            <thead><tr><td></td>${ps.map((p) => `<th scope="col"><div class="cmp-head">${media(p)}<a href="${productHref(p.id)}" data-close-modal>${esc(p.name)}</a><b>${fmt(p.price)}</b><div class="row"><button type="button" class="btn btn--cta" data-add="${p.id}" ${p.stock ? "" : "disabled"}>Shto në shportë</button><button type="button" class="link-btn" data-uncmp="${p.id}" data-reopen>Hiq</button></div></div></th>`).join("")}</tr></thead>
            ${body}
          </table>
        </div>
      </div>`, "modal--compare");
    $("#cmpDiff").onchange = (e) => openCompare(e.target.checked);
  }

  /* ================================================================ lista e dëshirave */
  function toggleWish(id) {
    if (wish.has(id)) wish.delete(id); else wish.add(id);
    saved.set("wish", [...wish]);
    renderWishCount();
    $$(`[data-wish="${id}"]`).forEach((b) => {
      const on = wish.has(id);
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", `${on ? "Hiq nga" : "Shto në"} listën e dëshirave`);
    });
    toast(wish.has(id) ? `U ruajt në listën e dëshirave: <b>${esc(byId[id].name)}</b>` : "U hoq nga lista e dëshirave");
  }
  function renderWishCount() { const el = $("#wishCount"); el.textContent = wish.size; el.hidden = !wish.size; }
  function openWishlist() {
    const items = PRODUCTS.filter((p) => wish.has(p.id));
    openModal(`<div class="wishlist"><h2>Lista e dëshirave</h2>${items.length
      ? `<div class="grid">${items.map(card).join("")}</div>`
      : `<div class="empty">${svg(ICON.heart, "icon icon--xl")}<h3>Ende nuk keni ruajtur asgjë</h3><p class="muted">Prekni zemrën te çdo produkt për ta ruajtur këtu.</p></div>`}</div>`, "modal--wish");
  }

  /* ================================================================ shporta, porosia, konfirmimi */
  const steps = (n) => `<ol class="steps" aria-label="Hapat e blerjes">${["Shporta", "Të dhënat", "Konfirmimi"].map((t, i) => `<li ${i + 1 === n ? 'aria-current="step"' : ""} class="${i + 1 < n ? "is-done" : ""}">${t}</li>`).join("")}</ol>`;
  const summaryHTML = (t, cta) => `
    <aside class="sum" aria-label="Përmbledhja">
      <h2>Përmbledhja</h2>
      <ul class="sum__lines">${cart.map((l) => `<li><span>${l.qty} × ${esc(byId[l.id].name)}</span><span class="num">${fmt(byId[l.id].price * l.qty)}</span></li>`).join("")}</ul>
      <div id="promoSlot">${promoHTML(t)}</div>
      <dl class="sum__totals" id="sumRows">${sumRows(t)}</dl>
      <p class="sum__vat" id="sumVat">Përfshirë TVSH ${Math.round(S.vatRate * 100)}% (${fmt(t.vat)}).</p>
      ${cta}
    </aside>`;
  const sumRows = (t) => `
        <dt>Nëntotali</dt><dd>${fmt(t.subtotal)}</dd>
        ${t.savings > 0 ? `<dt>Kurseni</dt><dd class="save">−${fmt(t.savings)}</dd>` : ""}
        ${discountRows(t)}
        <dt>Dërgesa</dt><dd id="sumShip">${t.shipping === 0 ? (t.shippingBefore > 0 ? "Falas" : "0,00 €") : fmt(t.shipping)}</dd>
        <dt class="grand">Totali</dt><dd class="grand" id="sumTotal">${fmt(t.total)}</dd>`;
  // Kutia e kodit të zbritjes: shfaqet vetëm kur CMS-i ka të paktën një zbritje me kod.
  const promoHTML = (t) => !window.CMS?.discounts?.some((d) => d.method === "code") ? "" : `
      <div class="promo-box">
        ${t.code
          ? `<p class="promo-box__ok">${svg(ICON.check)}<span>Kodi <b>${esc(t.code)}</b> u aplikua</span><button type="button" class="link-btn" data-promo-remove>Hiq</button></p>`
          : `<label for="promoCode">Kodi i zbritjes</label>
             <div class="promo-box__row"><input id="promoCode" value="${esc(promo)}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="promoMsg" ${t.codeError ? 'aria-invalid="true"' : ""} /><button type="button" class="btn btn--ghost" id="promoApply">Apliko</button></div>`}
        <p class="promo-box__msg" id="promoMsg" aria-live="polite">${t.codeError ? esc(t.codeError) : ""}</p>
      </div>`;
  // Rifreskon përmbledhjen pa e rindërtuar formularin e porosisë (fushat dhe zgjedhjet mbeten).
  function refreshSummary() {
    if (view === "cart") { renderCartPage(); return; }
    if (view !== "checkout") return;
    const form = $("#checkoutForm");
    const t = totals(form?.delivery?.value || "standard");
    $("#promoSlot").innerHTML = promoHTML(t);
    $("#sumRows").innerHTML = sumRows(t);
    $("#sumVat").textContent = `Përfshirë TVSH ${Math.round(S.vatRate * 100)}% (${fmt(t.vat)}).`;
  }
  function applyPromo(code) {
    promo = String(code || "").trim().toUpperCase();
    saved.set("promo", promo);
    renderCart();
    refreshSummary();
    const t = totals();
    if (promo) announce(t.code ? `Kodi ${promo} u aplikua` : t.codeError);
    (t.code ? $("[data-promo-remove]") : $("#promoCode"))?.focus();
  }

  function renderCartPage() {
    showView("cart", "Shporta · ITCOM");
    const t = totals();
    const left = S.freeShippingFrom - t.subtotal;
    $("#viewCart").innerHTML = `
      ${steps(1)}
      <h1>Shporta jote</h1>
      <p class="muted page-sub">Kostot dhe të dhënat kryesore në një vend.</p>
      ${cart.length ? `
      <div class="flow">
        <div class="flow__main">
          ${left > 0 ? `<p class="ship-note">Shto edhe <b>${fmt(left)}</b> për dërgesë falas.</p>` : `<p class="ship-note ship-note--ok">Dërgesa jote është falas.</p>`}
          <ul class="cline-list">${cart.map((l) => {
            const p = byId[l.id];
            return `<li class="cline">
              <a href="${productHref(p.id)}" class="cline__img" tabindex="-1" aria-hidden="true">${media(p)}</a>
              <div class="cline__info">
                <h2><a href="${productHref(p.id)}">${esc(p.name)}</a></h2>
                <p class="muted">${esc(shortSpecs(p))}</p>
                <b class="cline__price">${fmt(p.price * l.qty)}</b>
                ${l.qty > 1 ? `<small class="muted">${fmt(p.price)} / copë</small>` : ""}
              </div>
              <div class="cline__ctl">
                <div class="qty" role="group" aria-label="Sasia për ${esc(p.name)}">
                  <button type="button" data-qty="${p.id}" data-d="-1" aria-label="Zvogëlo sasinë">−</button>
                  <span>${l.qty}</span>
                  <button type="button" data-qty="${p.id}" data-d="1" ${l.qty >= p.stock ? "disabled" : ""} aria-label="Rrit sasinë">+</button>
                </div>
                <button type="button" class="link-btn" data-remove="${p.id}">Hiq</button>
              </div>
            </li>`;
          }).join("")}</ul>
          <a class="link-back" href="#/produktet">← Kthehu te produktet</a>
        </div>
        ${summaryHTML(t, `<a class="btn btn--cta btn--block btn--lg" href="#/porosia">Vazhdo te porosia</a>`)}
      </div>` : `
      <div class="state">
        ${svg(ICON.bag, "icon icon--xl")}
        <h2>Shporta jote është bosh</h2>
        <p class="muted">Shfleto kategoritë ose kërko një model.</p>
        <a class="btn btn--primary" href="#/produktet">Shiko produktet</a>
      </div>`}`;
  }

  function renderCheckout() {
    showView("checkout", "Përfundo porosinë · ITCOM");
    const u = Account.user();
    const draft = Object.assign(u ? { name: u.name, email: u.email } : {}, saved.get("checkout", {}));
    const f = (id, label, type = "text", extra = "", cls = "", optional = false) => `
      <label class="field ${cls}" for="co-${id}">${label}${optional ? ' <span class="muted">(opsionale)</span>' : ""}
        <input id="co-${id}" name="${id}" type="${type}" value="${esc(draft[id] || "")}" ${extra} />
        <span class="err" id="co-${id}-err"></span>
      </label>`;
    const t0 = totals();
    $("#viewCheckout").innerHTML = `
      ${steps(2)}
      <h1>Përfundo porosinë</h1>
      <p class="muted page-sub">Vetëm të dhënat që duhen për dërgesën. Pagesa nuk kryhet online.</p>
      <form class="flow" id="checkoutForm" novalidate>
        <div class="flow__main">
          <section class="card-box">
            <div class="card-box__head"><h2>${u ? `Porosit si ${esc(u.name.split(" ")[0])}` : "Vazhdo si vizitor"}</h2>${u ? "" : '<button type="button" class="link-btn" data-account>Hyr në llogari</button>'}</div>
            <p class="muted">Llogaria mbetet opsionale.</p>
            <div class="form-grid">
              ${f("name", "Emri dhe mbiemri", "text", 'autocomplete="name"')}
              ${f("email", "Email-i", "email", 'autocomplete="email"')}
              ${f("phone", "Telefoni", "tel", 'autocomplete="tel" placeholder="+383 4x xxx xxx"')}
              ${f("city", "Qyteti", "text", 'autocomplete="address-level2"')}
              ${f("address", "Rruga dhe numri", "text", 'autocomplete="street-address"', "full")}
              ${f("company", "Kompania", "text", 'autocomplete="organization"', "", true)}
              ${f("zip", "Kodi postar", "text", 'autocomplete="postal-code" inputmode="numeric"', "", true)}
            </div>
          </section>
          <section class="card-box">
            <h2>Pagesa dhe dërgesa</h2>
            <fieldset class="options">
              <legend>Dërgesa</legend>
              <label class="option"><input type="radio" name="delivery" value="standard" checked /><span>Dërgesë standarde<small>Arrin ${deliveryDate(2)}</small></span><b id="dStd"></b></label>
              <label class="option"><input type="radio" name="delivery" value="express" /><span>Dërgesë e shpejtë<small>Arrin ${deliveryDate(1)}</small></span><b id="dExp"></b></label>
              <label class="option"><input type="radio" name="delivery" value="pickup" /><span>Marrje në dyqan<small>Gati për 2 orë</small></span><b>Falas</b></label>
            </fieldset>
            <fieldset class="options">
              <legend>Pagesa</legend>
              <label class="option"><input type="radio" name="pay" value="cod" checked /><span>Pagesë në dorëzim<small>Me para në dorë ose me kartelë te korrieri</small></span></label>
              <label class="option"><input type="radio" name="pay" value="bank" /><span>Transfertë bankare<small>Faturë pro‑forma me email</small></span></label>
              ${S.installments ? `<label class="option"><input type="radio" name="pay" value="inst" /><span>Me këste mujore<small>Deri në ${S.installments} muaj · kushtet i konfirmon ekipi para dërgesës</small></span></label>` : ""}
            </fieldset>
          </section>
        </div>
        ${summaryHTML(t0, `<button class="btn btn--cta btn--block btn--lg" type="submit" value="site">Dërgo porosinë</button>
          ${S.whatsapp ? `<button class="btn btn--wa btn--block btn--lg" type="submit" value="wa">Porosit me WhatsApp</button>` : ""}
          <p class="sum__note">Pas porosisë ju telefonojmë për konfirmim. Asnjë pagesë nuk merret online.</p>
          ${demoNote()}
          <a class="link-back" href="#/shporta">← Kthehu te shporta</a>`)}
      </form>`;

    const form = $("#checkoutForm");
    const delivery = () => form.delivery.value;
    const update = () => {
      $("#sumRows").innerHTML = sumRows(totals(delivery()));
      const base = totals("standard").shipping;
      $("#dStd").textContent = base === 0 ? "Falas" : fmt(base);
      $("#dExp").textContent = fmt(base + S.expressFee);
    };
    update();
    form.addEventListener("change", update);
    form.addEventListener("input", (e) => {
      if (!e.target.name || e.target.type === "radio") return;
      const d = saved.get("checkout", {});
      d[e.target.name] = e.target.value;
      saved.set("checkout", d);
      const field = e.target.closest(".field");
      if (field?.classList.contains("invalid")) { field.classList.remove("invalid"); e.target.removeAttribute("aria-invalid"); }
    });

    const rules = {
      name: (v) => v.trim().length >= 2 || "Shkruani emrin dhe mbiemrin",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Shkruani një email të vlefshëm, p.sh. emri@kompania.com",
      phone: (v) => v.replace(/\D/g, "").length >= 8 || "Shkruani një numër telefoni me të paktën 8 shifra",
      city: (v) => v.trim().length >= 2 || "Shkruani qytetin",
      address: (v) => delivery() === "pickup" || v.trim().length >= 4 || "Shkruani rrugën dhe numrin",
      zip: (v) => !v.trim() || /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) || "Kodi postar duket i pasaktë, p.sh. 10000",
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let firstBad = null;
      for (const [name, check] of Object.entries(rules)) {
        const input = form.elements[name];
        const res = check(input.value);
        const field = input.closest(".field");
        field.classList.toggle("invalid", res !== true);
        field.querySelector(".err").textContent = res === true ? "" : res;
        if (res === true) input.removeAttribute("aria-invalid"); else { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", `co-${name}-err`); }
        if (res !== true && !firstBad) firstBad = input;
      }
      if (firstBad) { firstBad.focus(); announce("Plotësoni fushat e shënuara"); return; }
      const t = totals(delivery());
      const fields = Object.fromEntries(["name", "company", "phone", "email", "address", "city", "zip"].map((k) => [k, form.elements[k]?.value.trim() || ""]));
      if (promo && !t.code) { $("#promoCode")?.focus(); announce("Kodi i zbritjes nuk vlen. Hiqeni ose ndryshojeni."); return; }
      if (e.submitter?.value === "wa" && S.whatsapp) {
        // Porosia dërgohet si mesazh WhatsApp te dyqani; shporta mbetet derisa klienti ta konfirmojë.
        const payLabel = { cod: "Pagesë në dorëzim", inst: "Me këste mujore", bank: "Transfertë bankare" }[form.pay.value];
        const delLabel = { standard: "Dërgesë standarde", express: "Dërgesë e shpejtë", pickup: "Marrje në dyqan" }[delivery()];
        const lines = [
          "Përshëndetje ITCOM, dua të porosis:",
          ...cart.map((l) => `• ${l.qty} × ${byId[l.id].name} (${byId[l.id].id.toUpperCase()}) – ${fmt(byId[l.id].price * l.qty)}`),
          ...(t.applied.length ? [`Zbritje: ${t.applied.map((a) => `${a.title}${a.code ? ` (${a.code})` : ""} −${fmt(a.amount)}`).join(", ")}`] : []),
          `Totali: ${fmt(t.total)} (${delLabel}, ${payLabel})`,
          "",
          `Emri: ${fields.name}${fields.company ? ` (${fields.company})` : ""}`,
          `Telefoni: ${fields.phone}`,
          `Email: ${fields.email}`,
          `Adresa: ${fields.address}, ${fields.zip} ${fields.city}`,
        ];
        window.open(`https://wa.me/${S.whatsapp}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
        toast("U hap WhatsApp me porosinë tuaj. Dërgojeni mesazhin për ta përfunduar.");
        return;
      }
      const number = window.CMS?.saveOrder({ lines: cart.map((l) => ({ product: byId[l.id], qty: l.qty })), form: fields, totals: t, delivery: delivery(), pay: form.pay.value })
        || "ITC-" + Date.now().toString(36).toUpperCase().slice(-6);
      try { sessionStorage.setItem("itcom:last-order", JSON.stringify({ number, total: t.total, email: fields.email, items: cart.map((l) => `${l.qty} × ${byId[l.id].name}`), delivery: delivery() })); } catch { /* ignore */ }
      cart = [];
      promo = "";
      saved.set("promo", "");
      saveCart();
      renderCart();
      refreshCards();
      go(`#/konfirmimi/${encodeURIComponent(number)}`);
    });
  }


  // P01: pa kanal porosish (CMS → Publikimi) dhe pa WhatsApp, kërkesa ruhet vetëm në këtë shfletues — e themi qartë.
  const demoNote = () => (window.CMS?.hasChannel?.() || S.whatsapp || window.CMS?.source === "local" ? "" :
    `<p class="demo-note">Dyqan demonstrativ: kjo kërkesë ruhet vetëm në këtë shfletues derisa ITCOM të lidhë kanalin e porosive. Për një blerje të vërtetë, na kontaktoni.</p>`);

  /* ================================================================ nga CMS-i: menutë, njoftimet, koleksionet, fushatat, blogu, servisi */
  const MONTHS = ["janar", "shkurt", "mars", "prill", "maj", "qershor", "korrik", "gusht", "shtator", "tetor", "nëntor", "dhjetor"];
  const fmtDay = (iso) => { const d = new Date(iso); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  // Një lidhje menuje: #builder hap konfiguruesin, #info-… faqet informuese, #business formularin për biznes.
  const menuLink = (it, cls = "") => {
    const h = it.href || "";
    if (h === "#builder") return `<a class="${cls}" href="#builder" data-builder>${esc(it.label)}</a>`;
    if (h === "#business") return `<button type="button" class="${cls}" data-business>${esc(it.label)}</button>`;
    if (h.startsWith("#info-")) return `<button type="button" class="${cls}" data-info="${esc(h.slice(6))}">${esc(it.label)}</button>`;
    if (!h) return `<span class="${cls}">${esc(it.label)}</span>`;
    return `<a class="${cls}" href="${esc(h)}">${esc(it.label)}</a>`;
  };
  function renderMenus() {
    const m = window.CMS?.menus;
    if (m?.main?.length) $("#navLinks").innerHTML = m.main.map((it) => menuLink(it, "navbar__link")).join("");
    // Në telefon lidhjet e kokës fshihen: i shtojmë edhe te paneli "Kategoritë".
    const main = m?.main?.length ? m.main : [{ label: "Ndërto PC", href: "#builder" }, { label: "Ofertat", href: "#/ofertat" }];
    $("#mega").insertAdjacentHTML("beforeend", `<div class="container mega__links">${main.map((it) => menuLink(it)).join("")}</div>`);
    if (m?.footer?.length) {
      const cols = $$(".footer__grid > div").slice(1);
      cols.forEach((c) => c.remove());
      $(".footer__grid").insertAdjacentHTML("beforeend", m.footer.slice(0, 4).map((col) =>
        `<div><h2>${esc(col.label)}</h2><ul>${col.children.map((it) => `<li>${menuLink(it)}</li>`).join("")}</ul></div>`).join(""));
    }
  }
  function renderAnnouncements() {
    const list = window.CMS?.announcements || [];
    const bar = $("#announceBar");
    bar.hidden = !list.length;
    bar.innerHTML = list.length ? `<div class="container announce-bar__inner">${list.slice(0, 3).map((a) => (a.href ? menuLink({ label: a.text, href: a.href }) : `<span>${esc(a.text)}</span>`)).join('<span aria-hidden="true">·</span>')}</div>` : "";
  }
  const bannerHTML = (b, cls) => `
    <a class="banner ${cls}" href="${esc(b.href || "#/ofertat")}">
      ${b.image ? `<span class="banner__img"><img src="${esc(b.image)}" alt="" loading="lazy" /></span>` : ""}
      <span class="banner__copy">${b.eyebrow ? `<span class="eyebrow">${esc(b.eyebrow)}</span>` : ""}<b>${esc(b.title)}</b>${b.text ? `<span>${esc(b.text)}</span>` : ""}<span class="banner__cta">${esc(b.cta || "Shiko")}</span></span>
    </a>`;
  const postCard = (p) => `
    <article class="post-card">
      <a class="post-card__img" href="#/blog/${esc(p.slug)}" tabindex="-1" aria-hidden="true">${p.cover ? `<img src="${esc(p.cover)}" alt="" loading="lazy" />` : ""}</a>
      <div class="post-card__body">
        <span class="eyebrow">${esc(p.tag || "Këshilla")} · ${p.minutes} min lexim</span>
        <h3><a href="#/blog/${esc(p.slug)}">${esc(p.title)}</a></h3>
        <p>${esc(p.excerpt)}</p>
      </div>
    </article>`;
  function renderCmsHome() {
    const cols = COLLECTIONS.filter((c) => c.productIds.length);
    $("#colSec").hidden = !cols.length;
    $("#colTiles").innerHTML = cols.slice(0, 4).map((c) => {
      const img = c.image || (byId[c.productIds[0]] ? imgSrc(byId[c.productIds[0]]) : "");
      const photo = /assets\/photos\//.test(img);
      return `<a class="col-card" href="#/koleksioni/${esc(c.slug)}">
        <span class="col-card__img ${photo ? "is-photo" : ""}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" />` : ""}</span>
        <span class="col-card__body">
          <b>${esc(c.title)}</b>
          <span>${esc(c.tagline || plural(c.productIds.length, "produkt", "produkte"))}</span>
          <span class="col-card__cta">Shiko koleksionin</span>
        </span>
      </a>`;
    }).join("");
    const hb = (window.CMS?.banners || []).find((b) => b.position === "home-banner");
    $("#homeBanner").hidden = !hb;
    $("#homeBanner").innerHTML = hb ? bannerHTML(hb, "banner--home") : "";
    const posts = window.CMS?.posts || [];
    $("#blogSec").hidden = !posts.length;
    $("#blogPosts").innerHTML = posts.slice(0, 3).map(postCard).join("");
  }


  /* ================================================================ kategoritë: faqja e grupit pa produkte, të gjitha kategoritë */
  function renderOnRequest(g, x) {
    const name = x ? x.name : g.name;
    const builder = x ? x.builder : g.subs.some((y) => y.builder);
    showView("page", `${name} · ITCOM`, `${name} nga ITCOM: na tregoni çfarë ju duhet dhe ekipi ju kthen përgjigje me disponueshmëri dhe çmim.`);
    const siblings = g.subs.filter((y) => !x || y !== x);
    $("#viewPage").innerHTML = `
      ${crumbsHTML([["Ballina", "#/"], ["Kategoritë", "#/kategorite"], ...(x ? [[g.name, `#/kategoria/${g.slug}`]] : []), [name]])}
      <section class="onreq">
        <span class="onreq__icon">${lucide(g.icon || "layers")}</span>
        <div>
          <h1 class="page-title">${esc(name)}</h1>
          <p>Produktet e kësaj kategorie ende nuk janë në katalogun online. Na tregoni modelin ose nevojën dhe ekipi ITCOM ju kthen përgjigje me disponueshmëri dhe çmim.</p>
          <div class="onreq__cta">
            <button type="button" class="btn btn--cta" data-request="${esc(x ? x.slug : g.slug)}">Kërko ofertë</button>
            ${builder ? `<a class="btn btn--ghost" href="#builder" data-builder>Zgjidhe në konfiguruesin 3D</a>` : ""}
          </div>
        </div>
      </section>
      ${siblings.length ? `<h2 class="onreq__more">${x ? `Edhe në ${esc(g.name)}` : "Nënkategoritë"}</h2>
      <nav class="subnav subnav--page" aria-label="${esc(g.name)}">${siblings.map((y) => `<a class="subnav__item ${y.count ? "" : "is-empty"}" href="${subHref(y)}">${esc(y.name)}${y.count ? ` <small>${y.count}</small>` : ""}</a>`).join("")}</nav>` : ""}
      <h2 class="onreq__more">Kategoritë me produkte</h2>
      <nav class="subnav subnav--page" aria-label="Kategoritë me produkte">${GROUPS.flatMap((y) => y.subs).filter((y) => y.count).map((y) => `<a class="subnav__item" href="${subHref(y)}">${esc(y.name)} <small>${y.count}</small></a>`).join("")}</nav>`;
  }
  function renderAllCategories() {
    showView("page", "Të gjitha kategoritë · ITCOM", "Laptopë, kompjuterë, komponentë PC, monitorë, periferikë, audio, rrjet, printim, telefona dhe aksesorë.");
    $("#viewPage").innerHTML = `
      ${crumbsHTML([["Ballina", "#/"], ["Kategoritë"]])}
      <h1 class="page-title">Të gjitha kategoritë</h1>
      <p class="muted page-sub">Kategoritë me numër kanë produkte online; të tjerat i porosisni me kërkesë.</p>
      <div class="allcats">${GROUPS.map((g) => `
        <section class="allcats__group">
          <h2><a href="#/kategoria/${g.slug}">${lucide(g.icon || "layers")}<span>${esc(g.name)}</span></a></h2>
          <ul>${g.subs.map((x) => `<li><a href="${subHref(x)}">${esc(x.name)}</a>${x.count ? `<small>${x.count}</small>` : ""}</li>`).join("")}</ul>
        </section>`).join("")}
      </div>`;
  }

  function notFound(title, back = "#/", label = "Kthehu te ballina") {
    showView("page", `${title} · ITCOM`);
    $("#viewPage").innerHTML = `<div class="state"><h1>${esc(title)}</h1><p class="muted">Faqja mund të jetë hequr ose lidhja është e vjetër.</p><a class="btn btn--primary" href="${back}">${label}</a></div>`;
  }
  const crumbsHTML = (items) => `<nav class="crumbs" aria-label="Navigimi">${items.map(([label, href]) => (href ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`)).join('<span aria-hidden="true">/</span>')}</nav>`;

  // Faqja e një fushate (Marketingu → Ofertat në CMS)
  function renderOffer(slug) {
    const o = (window.CMS?.offers || []).find((x) => x.slug === slug);
    if (!o) return notFound("Oferta nuk u gjet", "#/ofertat", "Shiko ofertat");
    const items = o.productIds.map((id) => byId[id]).filter(Boolean);
    showView("page", `${o.name} · ITCOM`, o.text);
    $("#viewPage").innerHTML = `
      ${crumbsHTML([["Ballina", "#/"], ["Ofertat", "#/ofertat"], [o.name]])}
      <section class="offer-hero">
        <div class="offer-hero__copy">
          ${o.badge ? `<span class="ptag ptag--sale">${esc(o.badge)}</span>` : ""}
          <h1>${esc(o.title)}</h1>
          <p>${esc(o.text)}</p>
          ${o.code ? `<p class="offer-code">Kodi <code>${esc(o.code)}</code> <button type="button" class="link-btn" data-copy="${esc(o.code)}">Kopjo</button></p>` : ""}
          ${o.endsAt ? `<p class="muted">Vlen deri më ${fmtDay(o.endsAt)}.</p>` : ""}
        </div>
        ${o.image ? `<div class="offer-hero__img"><img src="${esc(o.image)}" alt="" /></div>` : ""}
      </section>
      ${items.length ? `<div class="pgrid pgrid--catalog">${items.map((p) => card(p)).join("")}</div>` : ""}`;
  }

  // Blogu: lista dhe artikulli
  function renderBlog() {
    const posts = window.CMS?.posts || [];
    showView("page", "Këshilla para blerjes · ITCOM", "Udhëzues praktikë nga ekipi ITCOM për laptopë, procesorë, kartela grafike dhe ndërtimin e PC‑së.");
    $("#viewPage").innerHTML = `
      ${crumbsHTML([["Ballina", "#/"], ["Këshilla"]])}
      <h1 class="page-title">Këshilla para blerjes</h1>
      <p class="muted page-sub">Udhëzues të shkurtër nga ekipi ITCOM.</p>
      ${posts.length ? `<div class="post-grid">${posts.map(postCard).join("")}</div>` : `<div class="state"><h2>Ende pa artikuj</h2></div>`}`;
  }
  function renderPost(slug) {
    const posts = window.CMS?.posts || [];
    const p = posts.find((x) => x.slug === slug);
    if (!p) return notFound("Artikulli nuk u gjet", "#/blog", "Të gjitha këshillat");
    showView("page", `${p.title} · ITCOM`, p.excerpt);
    const more = posts.filter((x) => x !== p).slice(0, 2);
    $("#viewPage").innerHTML = `
      ${crumbsHTML([["Ballina", "#/"], ["Këshilla", "#/blog"], [p.title]])}
      <article class="post">
        <header class="post__head">
          <span class="eyebrow">${esc(p.tag || "Këshilla")} · ${p.minutes} min lexim${p.draft ? " · DRAFT" : ""}</span>
          <h1>${esc(p.title)}</h1>
          <p class="post__lead">${esc(p.excerpt)}</p>
          <p class="muted">${esc(p.author)} · ${fmtDay(p.date)}</p>
        </header>
        ${p.cover ? `<div class="post__cover"><img src="${esc(p.cover)}" alt="" /></div>` : ""}
        <div class="post__body prose">${p.html}</div>
      </article>
      ${more.length ? `<section class="home-sec"><div class="home-sec__head"><h2 class="home-sec__title">Lexo edhe</h2></div><div class="post-grid">${more.map(postCard).join("")}</div></section>` : ""}`;
  }

  // Servisi: shërbimet dhe rezervimi i terminit (CMS → Terminet)
  function renderServices(pre = "") {
    const list = window.CMS?.services || [];
    showView("page", "Servisi dhe terminet · ITCOM", "Montim PC, diagnostikim, pastrim dhe konsulta për biznese. Rezervoni një termin, ekipi ju telefonon për ta konfirmuar.");
    if (!list.length) {
      $("#viewPage").innerHTML = `${crumbsHTML([["Ballina", "#/"], ["Servisi"]])}<h1 class="page-title">Servisi</h1><div class="state"><p>Për servis dhe montim na shkruani dhe ju kontaktojmë.</p><button type="button" class="btn btn--primary" data-info="contact">Kontakti</button></div>`;
      return;
    }
    const priceText = (sv) => (sv.price === 0 ? "Falas" : sv.price ? fmt(sv.price) : "Çmimi pas diagnostikimit");
    // Dita e parë e hapur nga nesër (e diela mbyllur); data lokale, jo UTC.
    const first = new Date();
    do first.setDate(first.getDate() + 1); while (first.getDay() === 0);
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const tomorrow = ymd(new Date(Date.now() + 86400000));
    const firstOpen = ymd(first);
    const times = [];
    for (let m = 9 * 60; m <= 18 * 60; m += 30) times.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    $("#viewPage").innerHTML = `
      ${crumbsHTML([["Ballina", "#/"], ["Servisi"]])}
      <h1 class="page-title">Servisi dhe terminet</h1>
      <p class="muted page-sub">${esc(window.CMS?.hours || "")}${window.CMS?.hours ? " · " : ""}Rezervoni online; ekipi ju telefonon për ta konfirmuar terminin.</p>
      <div class="svc-layout">
        <ul class="svc-cards">${list.map((sv) => `
          <li class="svc-card">
            <h2>${esc(sv.name)}</h2>
            <p>${esc(sv.description)}</p>
            <p class="svc-card__meta"><span>${sv.duration} min${sv.onsite ? " · te ju" : " · në dyqan"}</span><b>${priceText(sv)}</b></p>
            <button type="button" class="btn btn--ghost" data-book="${esc(sv.id)}">Rezervo</button>
          </li>`).join("")}
        </ul>
        <form class="card-box booking" id="bookForm" novalidate>
          <h2>Rezervo një termin</h2>
          <label class="field" for="bk-service">Shërbimi
            <select id="bk-service" name="service">${list.map((sv) => `<option value="${esc(sv.id)}" ${sv.id === pre ? "selected" : ""}>${esc(sv.name)}</option>`).join("")}</select>
          </label>
          <div class="form-grid">
            <label class="field" for="bk-date">Data<input id="bk-date" name="date" type="date" min="${tomorrow}" value="${firstOpen}" /><span class="err" id="bk-date-err"></span></label>
            <label class="field" for="bk-time">Ora<select id="bk-time" name="time">${times.map((t) => `<option ${t === "10:00" ? "selected" : ""}>${t}</option>`).join("")}</select></label>
            <label class="field" for="bk-name">Emri dhe mbiemri<input id="bk-name" name="name" autocomplete="name" /><span class="err" id="bk-name-err"></span></label>
            <label class="field" for="bk-phone">Telefoni<input id="bk-phone" name="phone" type="tel" autocomplete="tel" placeholder="+383 4x xxx xxx" /><span class="err" id="bk-phone-err"></span></label>
            <label class="field full" for="bk-email">Email-i <span class="muted">(opsional)</span><input id="bk-email" name="email" type="email" autocomplete="email" /><span class="err" id="bk-email-err"></span></label>
            <label class="field full" for="bk-address" id="bkAddressField" hidden>Adresa ku vijmë<input id="bk-address" name="address" autocomplete="street-address" /><span class="err" id="bk-address-err"></span></label>
            <label class="field full" for="bk-note">Shënim <span class="muted">(opsional)</span><textarea id="bk-note" name="note" rows="3" placeholder="P.sh. modeli i pajisjes dhe çfarë problemi ka"></textarea></label>
          </div>
          <button class="btn btn--cta btn--lg" type="submit">Dërgo kërkesën</button>
          <p class="muted sum__note">Termini është i rezervuar pasi ekipi ju telefonon për konfirmim.</p>
          ${demoNote()}
        </form>
      </div>`;
    const form = $("#bookForm");
    const svcOf = () => list.find((x) => x.id === form.service.value);
    const syncAddr = () => { $("#bkAddressField").hidden = !svcOf()?.onsite; };
    syncAddr();
    form.service.addEventListener("change", syncAddr);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const sv = svcOf();
      const v = (k) => form.elements[k].value.trim();
      const day = new Date(`${v("date")}T00:00`);
      const rules = {
        date: () => (!v("date") || isNaN(day) ? "Zgjidhni datën" : v("date") < tomorrow ? "Zgjidhni një datë nga nesër e tutje" : day.getDay() === 0 ? "Të dielën jemi mbyllur" : true),
        name: () => v("name").length >= 2 || "Shkruani emrin dhe mbiemrin",
        phone: () => v("phone").replace(/\D/g, "").length >= 8 || "Shkruani një numër me të paktën 8 shifra",
        email: () => !v("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email")) || "Shkruani një email të vlefshëm",
        address: () => !sv?.onsite || v("address").length >= 4 || "Shkruani adresën",
      };
      let bad = null;
      for (const [k, check] of Object.entries(rules)) {
        const res = check();
        const el = form.elements[k];
        el.closest(".field").classList.toggle("invalid", res !== true);
        $(`#bk-${k}-err`).textContent = res === true ? "" : res;
        if (res === true) el.removeAttribute("aria-invalid"); else { el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", `bk-${k}-err`); if (!bad) bad = el; }
      }
      if (bad) { bad.focus(); announce("Plotësoni fushat e shënuara"); return; }
      const start = new Date(`${v("date")}T${v("time")}:00`);
      const id = window.CMS.saveBooking({ serviceId: sv.id, serviceName: sv.name, duration: sv.duration, onsite: sv.onsite, start: start.toISOString(), name: v("name"), phone: v("phone"), email: v("email"), address: v("address"), note: v("note") });
      if (!id) { toast("Kërkesa nuk u dërgua. Provoni përsëri ose na telefononi."); return; }
      form.outerHTML = `<div class="card-box booking booking--done" tabindex="-1" id="bookDone">
        <div class="done__icon">${svg(ICON.check)}</div>
        <h2>Kërkesa u dërgua</h2>
        <p><b>${esc(sv.name)}</b><br>${fmtDay(start.toISOString())}, ora ${v("time")}</p>
        <p class="muted">Ju telefonojmë në ${esc(v("phone"))} për ta konfirmuar terminin.</p>
        <a class="btn btn--primary" href="#/">Kthehu te dyqani</a>
      </div>`;
      $("#bookDone").focus();
      announce("Kërkesa për termin u dërgua");
    });
  }

  function renderDone(number) {
    let o = null;
    try { o = JSON.parse(sessionStorage.getItem("itcom:last-order") || "null"); } catch { /* ignore */ }
    showView("done", "Porosia u pranua · ITCOM");
    $("#viewDone").innerHTML = `
      ${steps(3)}
      <div class="done">
        <div class="done__icon">${svg(ICON.check)}</div>
        <h1>Porosia u pranua</h1>
        <p class="muted">Numri i porosisë</p>
        <code class="done__no">${esc(number || o?.number || "")}</code>
        ${o ? `<ul class="done__items">${o.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p>Totali <b>${fmt(o.total)}</b>${o.delivery === "pickup" ? " · marrje në dyqan" : ""}.</p>` : ""}
        <ol class="done__next">
          <li>Ju telefonojmë brenda ditës së punës për ta konfirmuar porosinë.</li>
          <li>${o?.delivery === "pickup" ? "Ju lajmërojmë kur porosia të jetë gati në dyqan." : "Korrieri ju telefonon para se të vijë te adresa juaj."}</li>
          <li>Paguani në dorëzim ose me transfertë, sipas zgjedhjes suaj.</li>
        </ol>
        <a class="btn btn--primary btn--lg" href="#/">Vazhdo blerjen</a>
      </div>`;
  }

  /* ================================================================ njoftimet */
  let toastTimer;
  function toast(html, action) {
    const el = $("#toast");
    el.innerHTML = `<span>${html}</span>` + (action ? `<button type="button">${action.label}</button>` : "");
    if (action) el.querySelector("button").onclick = () => { el.classList.remove("show"); action.fn(); };
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4000);
  }
  function bump(sel) { const el = $(sel); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }

  /* ================================================================ llogaria */
  // Llogaritë ruhen në këtë shfletues (dyqan demo, pa server). Fjalëkalimi ruhet vetëm si hash SHA‑256.
  const Account = (() => {
    let users = saved.get("users", {});
    let session = saved.get("session", null);
    let after = null;
    const persist = () => { saved.set("users", users); saved.set("session", session); renderAccountBtn(); };
    async function hash(email, pw) {
      const data = `${email.toLowerCase()}|${pw}`;
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch { let h = 0; for (const ch of data) h = (h * 31 + ch.charCodeAt(0)) | 0; return "x" + h; }
    }
    const user = () => (session && users[session]) || null;
    return {
      user,
      builds: () => user()?.builds || [],
      async register(name, email, pw) {
        email = email.trim().toLowerCase();
        if (name.trim().length < 2) return "Shkruani emrin tuaj.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Shkruani një email të vlefshëm, p.sh. emri@shembull.com.";
        if (pw.length < 6) return "Fjalëkalimi duhet të ketë të paktën 6 karaktere.";
        if (users[email]) return "Ky email ka tashmë llogari. Hyni me të.";
        users[email] = { name: name.trim(), email, hash: await hash(email, pw), builds: [], created: Date.now() };
        session = email; persist(); return null;
      },
      async login(email, pw) {
        email = email.trim().toLowerCase();
        const u = users[email];
        if (!u || u.hash !== (await hash(email, pw))) return "Email‑i ose fjalëkalimi nuk është i saktë.";
        session = email; persist(); return null;
      },
      logout() { session = null; persist(); },
      saveBuild(b) { const u = user(); if (!u) return false; u.builds = [b, ...(u.builds || [])].slice(0, 20); persist(); return true; },
      deleteBuild(id) { const u = user(); if (!u) return; u.builds = (u.builds || []).filter((b) => b.id !== id); persist(); },
      require(msg, cb) { if (user()) cb(); else { after = cb; openAccount(msg); } },
      takeAfter() { const f = after; after = null; return f; },
    };
  })();

  function renderAccountBtn() {
    const u = Account.user();
    const lbl = $("#accountLabel");
    if (lbl) lbl.innerHTML = u ? `<small>Përshëndetje,</small><b>${esc(u.name.split(" ")[0])}</b>` : `<small>Llogaria</small><b>Hyr</b>`;
  }

  function openAccount(msg = "") {
    const u = Account.user();
    if (u) {
      const builds = Account.builds();
      openModal(`
        <div class="acct">
          <div class="acct__head"><span class="acct__avatar">${esc(u.name.charAt(0).toUpperCase())}</span><div><h2>${esc(u.name)}</h2><span class="muted">${esc(u.email)}</span></div><button type="button" class="btn btn--ghost" id="acctLogout">Dil</button></div>
          <div class="acct__section"><h3>Konfigurimet e mia të PC‑së</h3><button type="button" class="btn btn--cta" data-builder>${svg('<path d="M12 5v14M5 12h14"/>')}Ndërto PC të re</button></div>
          ${builds.length ? `<div class="acct__builds">${builds.map((b) => `
            <article class="bcard">
              <div class="bcard__img">${b.thumb ? `<img src="${b.thumb}" alt="" />` : svg('<rect x="6" y="2" width="12" height="20" rx="2"/>', "icon icon--xl")}</div>
              <div class="bcard__body"><b>${esc(b.name)}</b><small>${new Date(b.date).toLocaleDateString(S.locale)} · ${Object.keys(b.parts).length} pjesë</small>
                <ul>${Object.values(b.parts).slice(0, 4).map((id) => byId[id] ? `<li>${esc(byId[id].name)}</li>` : "").join("")}</ul>
                <span class="price">${fmt(b.total)}</span></div>
              <div class="bcard__actions">
                <button type="button" class="btn btn--primary" data-build-open="${b.id}">Hap në ndërtues</button>
                <button type="button" class="btn btn--cta" data-build-cart="${b.id}">${svg(ICON.cart)}Shto në shportë</button>
                <button type="button" class="link-btn" data-build-del="${b.id}">Fshi</button>
              </div>
            </article>`).join("")}</div>`
            : `<div class="empty">${svg('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M9 9h6"/>', "icon icon--xl")}<h3>Ende nuk keni konfigurime të ruajtura</h3><p class="muted">Ndërtoni PC‑në tuaj në 3D dhe ruajeni këtu për më vonë.</p></div>`}
          <p class="acct__note muted">Kjo është një llogari demo: të dhënat ruhen vetëm në këtë shfletues.</p>
        </div>`, "modal--account");
      $("#acctLogout").onclick = () => { Account.logout(); closeModal(); toast("Dolët nga llogaria."); };
      return;
    }
    const form = (mode) => `
      <form class="auth__form" data-mode="${mode}" novalidate>
        ${mode === "register" ? `<label class="field" for="auName">Emri dhe mbiemri<input id="auName" type="text" autocomplete="name" /></label>` : ""}
        <label class="field" for="auEmail">Email‑i<input id="auEmail" type="email" autocomplete="email" /></label>
        <label class="field" for="auPw">Fjalëkalimi<input id="auPw" type="password" autocomplete="${mode === "register" ? "new-password" : "current-password"}" /></label>
        <p class="auth__err" id="auErr" role="alert"></p>
        <button class="btn btn--cta btn--block btn--lg" type="submit">${mode === "register" ? "Krijo llogarinë" : "Hyr"}</button>
      </form>`;
    const show = (mode) => {
      openModal(`
        <div class="auth">
          <h2>${mode === "register" ? "Krijo llogari" : "Hyr në llogari"}</h2>
          ${msg ? `<p class="auth__msg">${esc(msg)}</p>` : ""}
          <div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="${mode === "login"}" data-auth="login">Hyr</button><button type="button" role="tab" aria-selected="${mode === "register"}" data-auth="register">Krijo llogari</button></div>
          ${form(mode)}
          <p class="muted acct__note">Me llogari ruani konfigurimet e PC‑së dhe plotësoni porosinë më shpejt. Llogaria demo ruhet vetëm në këtë shfletues.</p>
        </div>`, "modal--info");
      $$("[data-auth]", modal).forEach((b) => b.addEventListener("click", () => show(b.dataset.auth)));
      const f = $(".auth__form", modal);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const err = mode === "register" ? await Account.register($("#auName").value, $("#auEmail").value, $("#auPw").value) : await Account.login($("#auEmail").value, $("#auPw").value);
        if (err) { $("#auErr").textContent = err; return; }
        closeModal();
        toast(`Mirë se erdhët, <b>${esc(Account.user().name.split(" ")[0])}</b>!`);
        Account.takeAfter()?.();
      });
      (mode === "register" ? $("#auName") : $("#auEmail")).focus();
    };
    show("login");
  }

  // API për ndërtuesin e PC‑së (js/builder.js)
  window.ITCOM = Object.assign(window.ITCOM || {}, {
    $, $$, fmt, fmt0, esc, svg, ICON, byId, media, imgSrc, brandMark, saved, toast,
    openModal, closeModal, openCart, addToCart, openAccount,
    account: Account,
  });

  /* ================================================================ ngjarjet */
  document.addEventListener("click", (e) => {
    if (e.target.closest("#promoApply")) { applyPromo($("#promoCode").value); return; }
    const req = e.target.closest("[data-request]");
    if (req) {
      const hit = groupBySlug(req.dataset.request) || subBySlug(req.dataset.request)?.x;
      openRequest({ title: `Kërko ofertë: ${hit?.name || "produkt"}`, intro: "Shkruani modelin, sasinë ose përdorimin. Ekipi ITCOM ju kthen përgjigje me disponueshmëri dhe çmim.", message: "", tags: ["kategori", req.dataset.request] });
      return;
    }
    const askCol = e.target.closest("[data-ask-col]");
    if (askCol) {
      const c = colBySlug(askCol.dataset.askCol);
      openRequest({ title: "Pyet ekipin", intro: `Koleksioni ${esc(c?.title || "")}: trego si do ta përdorësh pajisjen dhe buxhetin.`, type: "contact", message: "Do ta përdor për: ", tags: ["koleksion", askCol.dataset.askCol] });
      return;
    }
    const book = e.target.closest("[data-book]");
    if (book) { const sel = $("#bk-service"); if (sel) { sel.value = book.dataset.book; sel.dispatchEvent(new Event("change")); $("#bookForm").scrollIntoView({ behavior: "smooth", block: "start" }); $("#bk-date").focus({ preventScroll: true }); } return; }
    const copy = e.target.closest("[data-copy]");
    if (copy) { navigator.clipboard?.writeText(copy.dataset.copy).then(() => toast(`U kopjua kodi <b>${esc(copy.dataset.copy)}</b>`), () => {}); return; }
    if (e.target.closest("[data-promo-remove]")) { applyPromo(""); return; }
    const t = e.target.closest("[data-add],[data-open],[data-wish],[data-cmp],[data-qty],[data-remove],[data-cat],[data-chip],[data-page],[data-brand],[data-mega],[data-slide],[data-uncmp],[data-sgall],[data-sgcat],[data-close],[data-close-modal],[data-info],[data-slide-dir],[data-builder],[data-business],[data-ask],[data-account],[data-build-open],[data-build-cart],[data-build-del]");
    if (!e.target.closest(".search")) hideSuggest();
    if (!e.target.closest("#mega, #megaBtn")) toggleMega(false);
    if (!t) return;
    const d = t.dataset;
    if (d.add) addToCart(d.add);
    else if (d.wish) toggleWish(d.wish);
    else if (d.cmp) toggleCompare(d.cmp);
    else if (d.open) go(productHref(d.open));
    else if (d.qty) setQty(d.qty, cartQty(d.qty) + Number(d.d));
    else if (d.remove) removeLine(d.remove);
    else if (d.uncmp) { compare = compare.filter((x) => x !== d.uncmp); saveCompare(); if ("reopen" in d) compare.length >= 2 ? openCompare() : closeModal(); }
    else if (d.cat) { closeModal(); toggleMega(false); resetFilters(d.cat); go(`#/kategoria/${catSlug(d.cat)}`); }
    else if (d.mega) { const [c, k, v] = d.mega.split("|"); toggleMega(false); resetFilters(c); state.f[k] = new Set([v]); go(`#/kategoria/${catSlug(c)}`); }
    else if (d.brand) { closeModal(); resetFilters(); state.brands.add(d.brand); go("#/produktet"); }
    else if (d.chip) { if (d.chip === "all") { const q = state.q; resetFilters(state.cat); state.q = q; render(); } else removeFilter(d.chip); }
    else if (d.page) { state.page = Number(d.page); renderResults(); $("#viewCatalog").scrollIntoView({ block: "start" }); }
    else if (d.slide) { goSlide(Number(d.slide)); autoSlide(); }
    else if ("sgall" in d) applySearch($("#search").value);
    else if (d.sgcat) applySearch($("#search").value, d.sgcat);
    else if (d.info) openInfo(d.info);
    else if ("builder" in d) { e.preventDefault(); closeModal(); toggleMega(false); window.ITCOM.openBuilder?.(); }
    else if ("business" in d) openBusiness();
    else if (d.ask) openAsk(d.ask);
    else if ("account" in d) openAccount();
    else if (d.buildOpen) { const b = Account.builds().find((x) => x.id === d.buildOpen); if (b) window.ITCOM.openBuilder?.(b); }
    else if (d.buildCart) { const b = Account.builds().find((x) => x.id === d.buildCart); if (b) { let n = 0; for (const id of [...Object.values(b.parts), ...(b.assembly ? ["srv-assembly"] : [])]) if (addToCart(id, 1, true)) n++; closeModal(); toast(`U shtuan ${n} artikuj nga “${esc(b.name)}”`, { label: "Shiko shportën", fn: () => go("#/shporta") }); } }
    else if (d.buildDel) { Account.deleteBuild(d.buildDel); openAccount(); }
    else if (d.slideDir) { goSlide(slide + Number(d.slideDir)); autoSlide(); }
    else if ("close" in d) closeCart();
    else if ("closeModal" in d) closeModal();
  });

  // Filtrat
  const host = $("#facetHost");
  host.addEventListener("change", (e) => {
    const fk = e.target.dataset.fk;
    if (!fk) return;
    const on = e.target.checked;
    if (fk.startsWith("cat:")) return setCat(on ? fk.slice(4) : "All");
    if (fk.startsWith("brand:")) { const b = fk.slice(6); on ? state.brands.add(b) : state.brands.delete(b); }
    else if (fk.startsWith("f:")) {
      const [, k, ...rest] = fk.split(":");
      const v = rest.join(":");
      (state.f[k] ||= new Set());
      on ? state.f[k].add(v) : state.f[k].delete(v);
    }
    else state[fk] = on;
    state.page = 1;
    render();
  });
  host.addEventListener("click", (e) => {
    const more = e.target.closest("[data-more]");
    if (more) { const id = more.dataset.more; expandedFacets.has(id) ? expandedFacets.delete(id) : expandedFacets.add(id); renderFacets(); return; }
    const pre = e.target.closest("[data-preset]");
    if (pre) {
      const [a, b] = pre.dataset.preset.split("-").map(Number);
      const same = state.min === a && state.max === b;
      state.min = same ? 0 : a;
      state.max = same ? catMax(state.cat) : b;
      state.page = 1;
      render();
    }
  });
  host.addEventListener("toggle", (e) => {
    const fid = e.target.dataset?.fid;
    if (!fid) return;
    e.target.open ? closedFacets.delete(fid) : closedFacets.add(fid);
    saved.set("closedFacets", [...closedFacets]);
  }, true);
  host.addEventListener("input", (e) => {
    if ("bsearch" in e.target.dataset) {
      const q = e.target.value.trim().toLowerCase();
      $$('[data-fid="brand"] .check', host).forEach((l) => {
        const cb = l.querySelector("input");
        l.hidden = q ? !l.dataset.label.includes(q) : Number(l.dataset.rank) >= 8 && !expandedFacets.has("brand") && !cb.checked;
      });
      return;
    }
    if (e.target.id === "rmin" || e.target.id === "rmax") {
      let lo = Number($("#rmin").value), hi = Number($("#rmax").value);
      if (lo > hi) { if (e.target.id === "rmin") lo = hi; else hi = lo; e.target.value = e.target.id === "rmin" ? lo : hi; }
      state.min = lo; state.max = hi; state.page = 1;
      $("#pmin").value = lo; $("#pmax").value = hi;
      syncDual();
      renderResults();
    }
  });
  host.addEventListener("change", (e) => {
    const id = e.target.id;
    if (id === "rmin" || id === "rmax") { renderFacets(); return; }
    if (id === "pmin" || id === "pmax") {
      const max = catMax(state.cat);
      let lo = Math.max(0, Math.round(Number($("#pmin").value) || 0));
      let hi = Math.min(max, Math.round(Number($("#pmax").value) || max));
      if (lo > hi) [lo, hi] = [hi, lo];
      state.min = lo; state.max = hi; state.page = 1;
      render();
    }
  });

  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; state.page = 1; renderResults(); });
  const clearFilters = () => { const q = state.q; resetFilters(state.cat); state.q = q; $("#search").value = q; render(); };
  $("#resetFilters").addEventListener("click", clearFilters);
  $("#emptyReset").addEventListener("click", clearFilters);
  $("#retryResults").addEventListener("click", render);
  $("#openFilters").addEventListener("click", openFilters);
  $("#closeFilters").addEventListener("click", closeFilters);
  $("#applyFilters").addEventListener("click", () => { closeFilters(); $("#viewCatalog").scrollIntoView({ block: "start" }); });
  $("#cartBtn").addEventListener("click", openCart);
  $("#wishlistBtn").addEventListener("click", openWishlist);
  $("#accountBtn").addEventListener("click", () => openAccount());
  $("#compareBtn").addEventListener("click", () => openCompare());
  $("#cmpOpen").addEventListener("click", () => openCompare());
  $("#cmpClear").addEventListener("click", () => { compare = []; saveCompare(); });
  $("#checkoutBtn").addEventListener("click", () => go("#/porosia"));
  $("#cartPageBtn").addEventListener("click", () => go("#/shporta"));
  // Klik me tastierë (Enter/Hapësirë) e çon fokusin brenda menusë; Escape e mbyll dhe e kthen te butoni.
  $("#megaBtn").addEventListener("click", (e) => toggleMega(undefined, e.detail === 0));
  $("#mega").addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); toggleMega(false, true); } });
  overlay.addEventListener("click", () => { closeCart(); closeFilters(); });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // Kutia e kërkimit
  const search = $("#search");
  let sgTimer;
  search.addEventListener("input", () => { clearTimeout(sgTimer); sgTimer = setTimeout(renderSuggest, 80); });
  search.addEventListener("focus", () => { if (search.value.trim()) renderSuggest(); });
  search.addEventListener("keydown", (e) => {
    const items = $$("#suggest .sg-item, #suggest .suggest__all");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if ($("#suggest").hidden || !items.length) return;
      e.preventDefault();
      sgActive = (sgActive + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle("is-active", i === sgActive));
      items[sgActive].scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (sgActive >= 0 && items[sgActive]) items[sgActive].click();
      else applySearch(search.value, $("#searchCat").value);
    } else if (e.key === "Escape") { hideSuggest(); }
  });
  $("#searchBtn").addEventListener("click", () => applySearch(search.value, $("#searchCat").value));

  // Sllajderi: ndalon kur miu është sipër; rrëshqitje me gisht
  const slider = $("#slider");
  $("#slidePause").addEventListener("click", () => { slidePaused = !slidePaused; syncPause(); autoSlide(); });
  syncPause();
  slider.addEventListener("mouseenter", () => { clearInterval(slideTimer); slider.classList.add("is-paused"); });
  slider.addEventListener("mouseleave", () => { slider.classList.remove("is-paused"); autoSlide(); });
  slider.addEventListener("focusin", () => clearInterval(slideTimer));
  slider.addEventListener("focusout", (e) => { if (!slider.contains(e.relatedTarget)) autoSlide(); });
  // Shiriti i kategorive
  const strip = $("#catStrip");
  strip.addEventListener("scroll", () => requestAnimationFrame(syncStrip), { passive: true });
  window.addEventListener("resize", () => syncStrip());
  $("#stripPrev").addEventListener("click", () => strip.scrollBy({ left: -strip.clientWidth * 0.85, behavior: reducedMotion() ? "auto" : "smooth" }));
  $("#stripNext").addEventListener("click", () => strip.scrollBy({ left: strip.clientWidth * 0.85, behavior: reducedMotion() ? "auto" : "smooth" }));
  let sx = null, swiped = false;
  slider.addEventListener("pointerdown", (e) => { sx = e.clientX; swiped = false; });
  slider.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) { swiped = true; goSlide(slide + (dx < 0 ? 1 : -1)); autoSlide(); }
  });
  // Rrëshqitja nuk duhet të llogaritet edhe si klik mbi produkt.
  slider.addEventListener("click", (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "promoCode") { e.preventDefault(); applyPromo(e.target.value); return; }
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing && !modal.open) { e.preventDefault(); search.focus(); }
    if (e.key === "Escape") { closeCart(); closeFilters(); toggleMega(false); hideSuggest(); }
    if (e.key === "Escape" && document.activeElement?.closest("#slider")) clearInterval(slideTimer);
  });

  /* ================================================================ nisja */
  renderHero();
  autoSlide();
  renderHome();
  renderCmsHome();
  renderMenus();
  renderAnnouncements();
  renderMega();
  renderCart();
  renderWishCount();
  renderAccountBtn();
  renderTray();

  // Të dhëna të strukturuara për motorët e kërkimit (Google).
  try {
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: PRODUCTS.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product", name: p.name, sku: p.id.toUpperCase(), brand: { "@type": "Brand", name: p.brand },
          description: p.desc, category: p.cat, url: `${S.siteUrl}p/${p.id}/`, image: new URL(imgSrc(p), S.siteUrl).href,
          offers: { "@type": "Offer", price: p.price.toFixed(2), priceCurrency: S.currency, availability: p.stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
        },
      })),
    });
    document.head.appendChild(ld);
  } catch { /* ignore */ }

  // Lidhje e drejtpërdrejtë: #/p/lp-x1c12, #/kategoria/laptope, #info-delivery …
  route();
})();
