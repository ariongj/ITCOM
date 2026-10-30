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
  const blankFilters = (cat = "All") => ({ q: "", cat, brands: new Set(), f: {}, min: 0, max: catMax(cat), inStock: false, onSale: false });
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

      const title = state.q ? `Rezultatet për “${state.q}”` : state.onSale && state.cat === "All" ? "Ofertat" : state.cat === "All" ? "Të gjitha produktet" : state.cat;
      $("#resultsTitle").textContent = title;
      const from = list.length ? (state.page - 1) * state.per + 1 : 0;
      const countText = list.length > state.per ? `${from}–${from + slice.length - 1} nga ${list.length} produkte` : plural(list.length, "produkt", "produkte");
      $("#resultsCount").textContent = countText;
      if (view === "catalog") document.title = `${title} · ITCOM`;

      const crumbs = [`<a href="#/">Ballina</a>`];
      if (state.cat !== "All") crumbs.push(`<a href="#/produktet">Produktet</a>`, `<span aria-current="page">${esc(state.cat)}</span>`);
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

  function renderCatNav() {
    $("#catNav").innerHTML = CATS.map((c) =>
      `<li><a href="#/kategoria/${catSlug(c.id)}" ${view === "catalog" && state.cat === c.id ? 'aria-current="page"' : ""}>${esc(c.id)}</a></li>`).join("");
  }

  function render() {
    renderCatNav();
    renderFacets();
    renderResults();
  }

  // Hap katalogun për gjendjen aktuale të filtrave (kategoria është pjesë e URL-së).
  const goCatalog = () => go(state.q ? `#/kerko/${encodeURIComponent(state.q)}` : state.cat !== "All" ? `#/kategoria/${catSlug(state.cat)}` : state.onSale ? "#/ofertat" : "#/produktet");

  /* ================================================================ ballina */
  // Hero: një artikull në plan të parë. Nga CMS-i (Online Store → Slajdet) kur ka; ndryshe këto.
  const SLIDES = [
    { id: "lp-mba13m4", label: "Përzgjedhja ITCOM / Laptopë", title: "Më shumë mundësi. Më pak peshë.", text: "MacBook Air 13\" M4 · 16 GB · 256 GB" },
    { id: "cp-5090fe", label: "Përzgjedhja ITCOM / Kartela grafike", title: "Performancë 4K. Pa kompromis.", text: "GeForce RTX 5090 Founders Edition · 32 GB GDDR7" },
    { id: "lp-proartp16", label: "Përzgjedhja ITCOM / Për krijues", title: "Ekran 4K OLED. Fuqi RTX.", text: "ASUS ProArt P16 · AMD Ryzen AI 9" },
  ];
  if (window.CMS?.slides) SLIDES.splice(0, SLIDES.length, ...window.CMS.slides);
  let slide = 0, slideTimer;
  const SLIDE_MS = 7000;

  function renderHero() {
    $("#slides").innerHTML = SLIDES.map((s, i) => {
      const p = byId[s.id];
      const pos = `role="group" aria-roledescription="artikull" aria-label="${i + 1} nga ${SLIDES.length}"`;
      if (!p) {
        const href = s.href && !/^\/(produkt|faqe)\//.test(s.href) ? s.href : "#/";
        return `<div class="slide" ${pos}>
          <div class="slide__copy">
            ${s.label ? `<span class="eyebrow">${esc(s.label)}</span>` : ""}
            <h2>${esc(s.title)}</h2>
            ${s.text ? `<p class="slide__spec">${esc(s.text)}</p>` : ""}
            ${s.cta ? `<a class="btn btn--cta" href="${esc(href)}">${esc(s.cta)}</a>` : ""}
          </div>
          ${s.img ? `<div class="slide__art"><img src="${esc(s.img)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} /></div>` : ""}
        </div>`;
      }
      return `<div class="slide" ${pos}>
        <div class="slide__copy">
          <span class="eyebrow">${esc(s.label || p.cat)}</span>
          <h2>${esc(s.title || p.name)}</h2>
          <p class="slide__spec">${esc(s.text || shortSpecs(p))}</p>
          <div class="slide__price">${priceHTML(p)}</div>
          <a class="btn btn--cta" href="${productHref(p.id)}">Shiko produktin</a>
        </div>
        <a class="slide__art" href="${productHref(p.id)}" tabindex="-1" aria-hidden="true">
          <img src="${esc(s.img || imgSrc(p))}" alt="" data-pid="${p.id}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} />
        </a>
      </div>`;
    }).join("");
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
    if (SLIDES.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    slideTimer = setInterval(() => goSlide(slide + 1), SLIDE_MS);
  }

  // Përzgjedhja e kuratuar në ballinë: nga CMS-i (produktet "featured"), ndryshe këto.
  const PICKS = ["lp-mba13m4", "lp-proartp16", "cp-4070s", "cp-7800x3d"];
  const SERVICES_STRIP = [
    ["Dërgesa", "Kosto sipas porosisë", "delivery"],
    ["Garancia", "Detaje për çdo produkt", "warranty"],
    ["Pagesa", "Zgjidh mënyrën tënde", "installments"],
    ["Mbështetja", "Pyet para se të blesh", "contact"],
  ];

  function renderHome() {
    const count = (c) => PRODUCTS.filter((p) => p.cat === c).length;
    $("#sideCats").innerHTML = CATS.map((c) => `<li><a href="#/kategoria/${catSlug(c.id)}">${esc(c.id)}</a></li>`).join("");
    const brandCount = {};
    PRODUCTS.forEach((p) => { brandCount[p.brand] = (brandCount[p.brand] || 0) + 1; });
    const brands = Object.entries(brandCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    $("#sideBrands").innerHTML = brands.slice(0, 5).map(([b]) => `<li><button type="button" data-brand="${esc(b)}">${esc(b)}</button></li>`).join("");
    $("#searchCat").innerHTML = `<option value="All">Të gjitha</option>` + CATS.map((c) => `<option value="${esc(c.id)}">${esc(c.id)}</option>`).join("");

    $("#services").innerHTML = SERVICES_STRIP.map(([t, sub, info]) =>
      `<li><button type="button" data-info="${info}">${svg(ICON.check)}<span><b>${t}</b><small>${sub}</small></span></button></li>`).join("");
    $("#catTiles").innerHTML = CATS.map((c) =>
      `<a class="cat-tile" href="#/kategoria/${catSlug(c.id)}">${svg(catIcon(c.id))}<b>${esc(c.id)}</b><small>${plural(count(c.id), "produkt", "produkte")}</small></a>`).join("");

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
  function renderMega() {
    $("#megaInner").innerHTML = CATS.map((c) => {
      const def = (FACETS[c.id] || [])[0];
      const vals = {};
      if (def) PRODUCTS.filter((p) => p.cat === c.id).forEach((p) => { const v = p.attrs[def.key]; if (v !== undefined) vals[v] = (vals[v] || 0) + 1; });
      const list = Object.entries(vals).sort((a, b) => (def.num ? a[0] - b[0] : b[1] - a[1])).slice(0, 6);
      return `<div class="mega__col">
        <h3><button type="button" data-cat="${esc(c.id)}">${svg(catIcon(c.id))}${esc(c.id)}</button></h3>
        <ul>${list.map(([v, n]) => `<li><button type="button" data-mega="${esc(c.id)}|${def.key}|${esc(v)}">${esc(def.fmt ? def.fmt(Number(v)) : v)} <span>${n}</span></button></li>`).join("")}</ul>
      </div>`;
    }).join("") + `<div class="mega__brands">${[...new Set(PRODUCTS.map((p) => p.brand))].sort().map((b) => `<button type="button" data-brand="${esc(b)}">${brandMark(b)}</button>`).join("")}</div>`;
  }
  function toggleMega(open) {
    const btn = $("#megaBtn");
    const on = open ?? btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", on);
    $("#mega").hidden = !on;
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

  function totals(delivery = "standard") {
    const items = cart.reduce((n, l) => n + l.qty, 0);
    const subtotal = cart.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
    const savings = cart.reduce((s, l) => s + ((byId[l.id].old || byId[l.id].price) - byId[l.id].price) * l.qty, 0);
    let shipping = subtotal >= S.freeShippingFrom ? 0 : S.shippingFee;
    if (delivery === "express") shipping += S.expressFee;
    if (delivery === "pickup") shipping = 0;
    const total = subtotal + shipping;
    return { items, subtotal, savings, shipping, total, vat: total - total / (1 + S.vatRate) };
  }

  const totalsHTML = (t) => `
    <dt>Nëntotali (${plural(t.items, "artikull", "artikuj")})</dt><dd>${fmt(t.subtotal)}</dd>
    ${t.savings > 0 ? `<dt>Kurseni</dt><dd class="save">−${fmt(t.savings)}</dd>` : ""}
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
  const VIEWS = { home: "#viewHome", catalog: "#viewCatalog", product: "#viewProduct", cart: "#viewCart", checkout: "#viewCheckout", done: "#viewDone" };
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
    const parts = h.replace(/^\//, "").split("/");
    const scrollTop = () => { window.scrollTo({ top: 0 }); };
    if (parts[0] === "p" && productId(parts[1])) {
      const id = productId(parts[1]);
      if (location.pathname !== productHref(id)) history.replaceState(null, "", productHref(id));
      routed = location.pathname;
      renderProduct(id); scrollTop(); return;
    }
    if (parts[0] === "kategoria" && catFromSlug(parts[1])) {
      const cat = catFromSlug(parts[1]);
      if (state.cat !== cat || state.q || state.onSale) resetFilters(cat);
      showView("catalog"); render(); scrollTop(); return;
    }
    if (parts[0] === "produktet") { if (state.cat !== "All" || state.q || state.onSale) resetFilters(); showView("catalog"); render(); scrollTop(); return; }
    if (parts[0] === "ofertat") { if (!state.onSale || state.cat !== "All" || state.q) { resetFilters(); state.onSale = true; state.sort = "discount"; } showView("catalog"); render(); scrollTop(); return; }
    if (parts[0] === "kerko") {
      const q = parts.slice(1).join("/");
      if (state.q !== q) { resetFilters(state.q ? state.cat : "All"); state.q = q; $("#search").value = q; }
      showView("catalog"); $("#grid").innerHTML = skeleton(8);
      requestAnimationFrame(() => render()); scrollTop(); return;
    }
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

  function renderProduct(id) {
    const p = byId[id];
    if (!p) return;
    addRecent(id);
    const d = discount(p);
    const imgs = gallery(p);
    const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 4);
    const specRows = [
      ["Modeli", p.name], ["Brendi", p.brand], ["Kodi i artikullit", p.id.toUpperCase()],
      ...(FACETS[p.cat] || []).filter((f) => p.attrs[f.key] !== undefined).map((f) => [f.label, f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]]),
      ["Veçoritë kryesore", p.specs.join(" · ")],
      ["Garancia", "24 muaj"],
    ];
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
        <div>
          <div class="tabs" role="tablist" aria-label="Detajet e produktit">
            <button type="button" role="tab" aria-selected="true" aria-controls="tabSpecs" data-tab="specs">Specifikimet</button>
            <button type="button" role="tab" aria-selected="false" aria-controls="tabAbout" data-tab="about">Përshkrimi</button>
            <button type="button" role="tab" aria-selected="false" aria-controls="tabShip" data-tab="ship">Dërgesa &amp; garancia</button>
          </div>
          <div id="tabSpecs" role="tabpanel" data-pane="specs"><table class="spec-table"><tbody>${specRows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
          <div id="tabAbout" role="tabpanel" data-pane="about" hidden><p class="pp__desc">${esc(p.desc)}</p></div>
          <div id="tabShip" role="tabpanel" data-pane="ship" hidden>
            <ul class="pp__shiplist">
              <li><b>Dërgesë standarde</b><span>${p.price >= S.freeShippingFrom ? "Falas" : fmt(S.shippingFee)} · 1–2 ditë pune në gjithë Kosovën</span></li>
              <li><b>Dërgesë e shpejtë</b><span>+${fmt(S.expressFee)} · ditën tjetër të punës</span></li>
              <li><b>Marrje në dyqan</b><span>Falas · gati brenda 2 orëve</span></li>
              <li><b>Garancia</b><span>24 muaj për defektet e fabrikës · kthim brenda 14 ditëve</span></li>
            </ul>
          </div>
        </div>
        <aside class="pp__help">
          <h2>A është zgjedhja e duhur për ty?</h2>
          <p>Trego si do ta përdorësh${p.cat === "Laptopë" ? " laptopin" : p.cat === "Kartela grafike" ? " kartelën dhe çfarë kompjuteri ke" : " procesorin dhe me çfarë pllake"}. Ekipi të ndihmon të verifikosh variantin.</p>
          <button type="button" class="btn btn--primary" data-ask="${p.id}">Pyet ekipin ITCOM</button>
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
    $$("[data-tab]", root).forEach((t) => t.addEventListener("click", () => {
      $$("[data-tab]", root).forEach((x) => x.setAttribute("aria-selected", x === t));
      $$("[data-pane]", root).forEach((pane) => { pane.hidden = pane.dataset.pane !== t.dataset.tab; });
    }));
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
      <dl class="sum__totals">
        <dt>Nëntotali</dt><dd>${fmt(t.subtotal)}</dd>
        ${t.savings > 0 ? `<dt>Kurseni</dt><dd class="save">−${fmt(t.savings)}</dd>` : ""}
        <dt>Dërgesa</dt><dd id="sumShip">${t.shipping === 0 ? "0,00 €" : fmt(t.shipping)}</dd>
        <dt class="grand">Totali</dt><dd class="grand" id="sumTotal">${fmt(t.total)}</dd>
      </dl>
      <p class="sum__vat">Përfshirë TVSH ${Math.round(S.vatRate * 100)}% (${fmt(t.vat)}).</p>
      ${cta}
    </aside>`;

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
          <a class="link-back" href="#/shporta">← Kthehu te shporta</a>`)}
      </form>`;

    const form = $("#checkoutForm");
    const delivery = () => form.delivery.value;
    const update = () => {
      const t = totals(delivery());
      $("#sumShip").textContent = t.shipping === 0 ? "0,00 €" : fmt(t.shipping);
      $("#sumTotal").textContent = fmt(t.total);
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
      if (e.submitter?.value === "wa" && S.whatsapp) {
        // Porosia dërgohet si mesazh WhatsApp te dyqani; shporta mbetet derisa klienti ta konfirmojë.
        const payLabel = { cod: "Pagesë në dorëzim", inst: "Me këste mujore", bank: "Transfertë bankare" }[form.pay.value];
        const delLabel = { standard: "Dërgesë standarde", express: "Dërgesë e shpejtë", pickup: "Marrje në dyqan" }[delivery()];
        const lines = [
          "Përshëndetje ITCOM, dua të porosis:",
          ...cart.map((l) => `• ${l.qty} × ${byId[l.id].name} (${byId[l.id].id.toUpperCase()}) – ${fmt(byId[l.id].price * l.qty)}`),
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
      saveCart();
      renderCart();
      refreshCards();
      go(`#/konfirmimi/${encodeURIComponent(number)}`);
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
    else if ("builder" in d) { e.preventDefault(); closeModal(); window.ITCOM.openBuilder?.(); }
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
  $("#megaBtn").addEventListener("click", () => toggleMega());
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
  slider.addEventListener("mouseenter", () => { clearInterval(slideTimer); slider.classList.add("is-paused"); });
  slider.addEventListener("mouseleave", () => { slider.classList.remove("is-paused"); autoSlide(); });
  slider.addEventListener("focusin", () => clearInterval(slideTimer));
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
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing && !modal.open) { e.preventDefault(); search.focus(); }
    if (e.key === "Escape") { closeCart(); closeFilters(); toggleMega(false); hideSuggest(); }
    if (e.key === "Escape" && document.activeElement?.closest("#slider")) clearInterval(slideTimer);
  });

  /* ================================================================ nisja */
  renderHero();
  autoSlide();
  renderHome();
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
