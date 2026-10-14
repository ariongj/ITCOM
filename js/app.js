/* ITCOM storefront — vanilla JS, no build step. */
(() => {
  "use strict";

  const S = window.STORE;
  const CATS = window.CATEGORIES;
  const FACETS = window.FACETS;
  const PRODUCTS = window.PRODUCTS;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = new Intl.NumberFormat(S.locale, { style: "currency", currency: S.currency });
  const money0 = new Intl.NumberFormat(S.locale, { style: "currency", currency: S.currency, maximumFractionDigits: 0 });
  const fmt = (n) => money.format(n);
  const fmt0 = (n) => money0.format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const discount = (p) => (p.old ? Math.round((1 - p.price / p.old) * 100) : 0);

  // Browser storage can be unavailable (private mode, blocked site data): the store still works, it just forgets.
  const saved = {
    get(key, fallback) { try { const v = localStorage.getItem("itcom:" + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem("itcom:" + key, JSON.stringify(value)); } catch { /* ignore */ } },
  };

  /* ================================================================ icons */
  const ICON = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    desktop: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 6h4M10 9h4"/><circle cx="12" cy="17" r="1"/>',
    monitor: '<rect x="2" y="3" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 16v5"/>',
    tablet: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M11 18h2"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19.5" r="1"/>',
    storage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>',
    server: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01"/>',
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    undo: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    store: '<path d="M3 9 4.5 3h15L21 9M3 9v12h18V9M3 9h18M9 21v-6h6v6"/>',
    compare: '<path d="M16 3h5v5M8 21H3v-5M21 3l-7 7M3 21l7-7"/>',
  };
  const svg = (paths, cls = "icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const catIcon = (id) => ICON[CATS.find((c) => c.id === id)?.icon] || ICON.grid;

  /* ================================================================ product helpers */
  const media = (p, cls = "") =>
    `<div class="media ${cls}">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" />` : window.productArt(p)}</div>`;

  const stars = (r) => `<span class="stars" style="--pct:${(r / 5) * 100}%" aria-label="Rated ${r} out of 5"></span>`;

  const stockLabel = (p) => {
    if (!p.stock) return '<span class="stock stock--out">Out of stock</span>';
    if (p.stock <= 5) return `<span class="stock stock--low">Only ${p.stock} left</span>`;
    return '<span class="stock stock--in">In stock</span>';
  };

  const priceHTML = (p) =>
    `<span class="price ${p.old ? "price--sale" : ""}">${fmt(p.price)}</span>${p.old ? `<span class="price-old">${fmt(p.old)}</span>` : ""}`;

  const inst = (p) => `or ${S.installments} × ${fmt(p.price / S.installments)}`;

  const facetDef = (cat, key) => (FACETS[cat] || []).find((f) => f.key === key);
  const fmtVal = (cat, key, v) => { const d = facetDef(cat, key); return d && d.fmt ? d.fmt(Number(v)) : String(v); };

  function keySpecs(p) {
    return (FACETS[p.cat] || [])
      .filter((f) => p.attrs[f.key] !== undefined && !["None", "No"].includes(p.attrs[f.key]) && !(p.cat === "Laptops" && f.key === "type"))
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
    return d.toLocaleDateString(S.locale, { weekday: "short", day: "numeric", month: "short" });
  }

  /* ================================================================ state */
  const catMax = (cat) => Math.ceil(Math.max(...PRODUCTS.filter((p) => cat === "All" || p.cat === cat).map((p) => p.price)) / 50) * 50;
  const blankFilters = (cat = "All") => ({ q: "", cat, brands: new Set(), f: {}, min: 0, max: catMax(cat), inStock: false, onSale: false, rating: 0 });
  const state = Object.assign(blankFilters(), { sort: "featured", per: 24, page: 1, view: saved.get("view", "grid") });
  const closedFacets = new Set(saved.get("closedFacets", ["rating"]));
  const expandedFacets = new Set();

  let cart = saved.get("cart", []).filter((l) => byId[l.id] && byId[l.id].stock > 0);
  let wish = new Set(saved.get("wish", []).filter((id) => byId[id]));
  let compare = saved.get("cmp", []).filter((id) => byId[id]);
  const cartQty = (id) => cart.find((l) => l.id === id)?.qty || 0;

  /* ================================================================ filtering */
  function matches(p, skip = "") {
    if (skip !== "cat" && state.cat !== "All" && p.cat !== state.cat) return false;
    if (skip !== "brand" && state.brands.size && !state.brands.has(p.brand)) return false;
    if (skip !== "price" && (p.price < state.min || p.price > state.max)) return false;
    if (skip !== "inStock" && state.inStock && !p.stock) return false;
    if (skip !== "onSale" && state.onSale && !p.old) return false;
    if (skip !== "rating" && state.rating && p.rating < state.rating) return false;
    for (const [k, set] of Object.entries(state.f)) {
      if (!set.size || skip === "f:" + k) continue;
      const v = p.attrs[k];
      if (v === undefined || !set.has(String(v))) return false;
    }
    if (state.q && !textMatch(p, state.q)) return false;
    return true;
  }

  const SORTS = {
    featured: (a, b) => (b.stock > 0) - (a.stock > 0) || (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || b.rating * Math.log(b.reviews + 1) - a.rating * Math.log(a.reviews + 1),
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    discount: (a, b) => discount(b) - discount(a) || b.price - a.price,
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    reviews: (a, b) => b.reviews - a.reviews,
    name: (a, b) => a.name.localeCompare(b.name),
  };

  const priceActive = () => state.min > 0 || state.max < catMax(state.cat);

  function activeFilters() {
    const out = [];
    if (state.q) out.push(["q", "Search", `“${state.q}”`]);
    if (state.cat !== "All") out.push(["cat", "Category", state.cat]);
    state.brands.forEach((b) => out.push(["brand:" + b, "Brand", b]));
    for (const [k, set] of Object.entries(state.f)) {
      const label = facetDef(state.cat, k)?.label || k;
      set.forEach((v) => out.push([`f:${k}:${v}`, label, fmtVal(state.cat, k, v)]));
    }
    if (priceActive()) out.push(["price", "Price", `${fmt0(state.min)} – ${fmt0(state.max)}`]);
    if (state.inStock) out.push(["inStock", "", "In stock"]);
    if (state.onSale) out.push(["onSale", "", "On sale"]);
    if (state.rating) out.push(["rating", "Rating", `${state.rating}★ and up`]);
    return out;
  }

  function removeFilter(key) {
    if (key === "q") { state.q = ""; $("#search").value = ""; }
    else if (key === "cat") return setCat("All");
    else if (key.startsWith("brand:")) state.brands.delete(key.slice(6));
    else if (key.startsWith("f:")) { const [, k, ...v] = key.split(":"); state.f[k]?.delete(v.join(":")); }
    else if (key === "price") { state.min = 0; state.max = catMax(state.cat); }
    else if (key === "rating") state.rating = 0;
    else state[key] = false;
    state.page = 1;
    render();
  }

  function resetFilters(cat = "All") {
    const keep = { sort: state.sort, per: state.per, view: state.view };
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

  /* ================================================================ facets (sidebar) */
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
        <span>${esc(it.label)}</span><span class="count">${it.count}</span>
      </label>`).join("");
    const btn = items.length > limit ? `<button type="button" class="link-btn facet__more" data-more="${esc(fid)}">${more ? "Show less" : `Show all ${items.length}`}</button>` : "";
    return rows + btn;
  }

  const PRESETS = [[0, 200], [200, 500], [500, 1000], [1000, 2000], [2000, Infinity]];

  function renderFacets() {
    const focusKey = document.activeElement?.dataset?.fk;
    const pool = PRODUCTS.filter((p) => state.cat === "All" || p.cat === state.cat);
    const groups = [];

    if (state.cat === "All") {
      const items = CATS.map((c) => ({ fk: "cat:" + c.id, label: c.id, count: PRODUCTS.filter((p) => p.cat === c.id && matches(p, "cat")).length, checked: false }));
      groups.push(facetGroup("cat", "Category", checkList("cat", items, 10)));
    }

    const max = catMax(state.cat);
    const presets = PRESETS.filter(([a]) => a < max).map(([a, b]) => {
      const hi = Math.min(b, max);
      const label = a === 0 ? `Under ${fmt0(b)}` : b === Infinity || b >= max ? `${fmt0(a)}+` : `${fmt0(a)}–${fmt0(b)}`;
      return `<button type="button" data-preset="${a}-${hi}" aria-pressed="${state.min === a && state.max === hi}">${label}</button>`;
    }).join("");
    groups.push(facetGroup("price", "Price", `
      <div class="price-inputs">
        <input type="number" id="pmin" inputmode="numeric" min="0" max="${max}" value="${state.min}" aria-label="Minimum price in euros" />
        <span class="muted">–</span>
        <input type="number" id="pmax" inputmode="numeric" min="0" max="${max}" value="${state.max}" aria-label="Maximum price in euros" />
      </div>
      <div class="dual">
        <div class="dual__track"></div><div class="dual__fill" id="dualFill"></div>
        <input type="range" id="rmin" min="0" max="${max}" step="10" value="${state.min}" aria-label="Minimum price" />
        <input type="range" id="rmax" min="0" max="${max}" step="10" value="${state.max}" aria-label="Maximum price" />
      </div>
      <div class="presets">${presets}</div>`, priceActive() ? 1 : 0));

    const brands = [...new Set(pool.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
    const brandItems = brands.map((b) => ({ fk: "brand:" + b, label: b, count: PRODUCTS.filter((p) => p.brand === b && matches(p, "brand")).length, checked: state.brands.has(b) }));
    groups.push(facetGroup("brand", "Brand",
      (brands.length > 8 ? `<input type="search" class="facet__search" data-bsearch placeholder="Search ${brands.length} brands" aria-label="Search brands" />` : "") + checkList("brand", brandItems, 8),
      state.brands.size));

    if (state.cat !== "All") {
      for (const def of FACETS[state.cat] || []) {
        const values = [...new Set(pool.map((p) => p.attrs[def.key]).filter((v) => v !== undefined))]
          .sort((a, b) => (def.num ? a - b : String(a).localeCompare(String(b), undefined, { numeric: true })));
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
    groups.push(facetGroup("avail", "Availability", checkList("avail", [
      { fk: "inStock", label: "In stock", count: inStockCount, checked: state.inStock },
      { fk: "onSale", label: "On sale", count: saleCount, checked: state.onSale },
    ]), (state.inStock ? 1 : 0) + (state.onSale ? 1 : 0)));

    const ratingRows = [0, 4.5, 4].map((r) => {
      const n = PRODUCTS.filter((p) => p.rating >= r && matches(p, "rating")).length;
      return `<label class="check"><input type="radio" name="rating" data-fk="rating:${r}" ${state.rating === r ? "checked" : ""} /> <span>${r ? `${stars(r)} ${r} and up` : "Any rating"}</span><span class="count">${n}</span></label>`;
    }).join("");
    groups.push(facetGroup("rating", "Customer rating", ratingRows, state.rating ? 1 : 0));

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

  /* ================================================================ results */
  function card(p) {
    const w = wish.has(p.id), inCart = cartQty(p.id) > 0, cmp = compare.includes(p.id), d = discount(p);
    const addBtn = (label) => `<button class="btn btn--primary add ${inCart ? "added" : ""}" data-add="${p.id}" ${p.stock ? "" : "disabled"} aria-label="Add ${esc(p.name)} to cart">${svg(inCart ? ICON.check : ICON.cart)}${p.stock ? (inCart ? "In cart" : label) : "Sold out"}</button>`;
    const cmpBox = `<label class="card__cmp"><input type="checkbox" data-cmp="${p.id}" ${cmp ? "checked" : ""} /> Compare</label>`;
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media" data-open="${p.id}">
          ${media(p)}
          <div class="tags">${d ? `<span class="tag tag--sale">−${d}%</span>` : ""}${p.badge ? `<span class="tag ${p.badge === "New" ? "tag--new" : ""}">${esc(p.badge)}</span>` : ""}</div>
        </div>
        <button class="icon-btn wish ${w ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${w}" aria-label="${w ? "Remove from" : "Add to"} wishlist">${svg(ICON.heart)}</button>
        <div class="card__body">
          <span class="card__brand">${esc(p.brand)}</span>
          <h3 class="card__title" data-open="${p.id}">${esc(p.name)}</h3>
          <div class="rating">${stars(p.rating)} ${p.rating.toFixed(1)} <span>(${p.reviews})</span></div>
          <div class="card__specs">${keySpecs(p).map((s) => `<span>${esc(s)}</span>`).join("")}</div>
          <p class="card__desc">${esc(p.desc)}</p>
          <div class="card__price"><div>${priceHTML(p)}</div><div class="card__inst">${inst(p)}</div>${stockLabel(p)}</div>
          <div class="card__foot">${cmpBox}${addBtn("Add")}</div>
        </div>
        <div class="card__side"><div>${priceHTML(p)}</div><div class="card__inst">${inst(p)}</div>${stockLabel(p)}${addBtn("Add to cart")}${cmpBox}</div>
      </article>`;
  }

  function renderResults() {
    const list = PRODUCTS.filter((p) => matches(p)).sort(SORTS[state.sort]);
    const pages = Math.max(1, Math.ceil(list.length / state.per));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * state.per, state.page * state.per);

    const grid = $("#grid");
    grid.classList.toggle("grid--list", state.view === "list");
    grid.innerHTML = slice.map(card).join("");
    $("#empty").hidden = list.length > 0;

    $("#resultsTitle").textContent = state.q && state.cat === "All" ? `Results for “${state.q}”` : state.cat === "All" ? "All products" : state.cat;
    const from = list.length ? (state.page - 1) * state.per + 1 : 0;
    $("#resultsCount").textContent = list.length > state.per ? `${from}–${from + slice.length - 1} of ${list.length} products` : `${list.length} ${list.length === 1 ? "product" : "products"}`;

    // breadcrumbs
    const crumbs = [`<button type="button" data-crumb="home">Home</button>`, "›", `<button type="button" data-crumb="all">Products</button>`];
    if (state.cat !== "All") crumbs.push("›", `<span aria-current="page">${esc(state.cat)}</span>`);
    else crumbs[2] = `<span aria-current="page">Products</span>`;
    $("#crumbs").innerHTML = crumbs.map((c) => (c === "›" ? '<span aria-hidden="true">›</span>' : c)).join("");

    // chips
    const act = activeFilters();
    $("#chips").innerHTML = act.map(([k, label, val]) =>
      `<button type="button" class="chip" data-chip="${esc(k)}" aria-label="Remove ${esc(label)} ${esc(val)}">${label ? `<b>${esc(label)}:</b>` : ""} ${esc(val)}${svg(ICON.x)}</button>`).join("") +
      (act.length > 1 ? `<button type="button" class="chip chip--clear" data-chip="all">Clear all</button>` : "");
    const pill = $("#filterCount");
    pill.textContent = act.length;
    pill.hidden = !act.length;

    // pager
    const pager = $("#pager");
    if (pages <= 1) { pager.innerHTML = ""; }
    else {
      const nums = [];
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - state.page) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== "…") nums.push("…");
      }
      pager.innerHTML = `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">‹</button>` +
        nums.map((n) => (n === "…" ? `<button type="button" disabled>…</button>` : `<button type="button" data-page="${n}" ${n === state.page ? 'aria-current="page"' : ""}>${n}</button>`)).join("") +
        `<button type="button" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""} aria-label="Next page">›</button>`;
    }

    $("#sort").value = state.sort;
    $("#perPage").value = String(state.per);
    $("#viewGrid").setAttribute("aria-pressed", state.view === "grid");
    $("#viewList").setAttribute("aria-pressed", state.view === "list");
    $("#applyFilters").textContent = `Show ${list.length} ${list.length === 1 ? "result" : "results"}`;
  }

  function renderCatNav() {
    $("#catNav").innerHTML = [{ id: "All" }, ...CATS].map((c) =>
      `<li><button type="button" data-cat="${esc(c.id)}" aria-pressed="${state.cat === c.id}">${svg(c.id === "All" ? ICON.grid : catIcon(c.id))}${c.id === "All" ? "All products" : esc(c.id)}</button></li>`).join("");
  }

  function render() {
    renderCatNav();
    renderFacets();
    renderResults();
  }

  const goCatalog = () => $("#catalog").scrollIntoView({ block: "start" });

  /* ================================================================ home sections */
  const SLIDES = [
    { id: "lp-mba13m4", eyebrow: "New · Apple M4", title: "MacBook Air 13\" M4", text: "16 GB of memory as standard, a silent fanless design and up to 18 hours of battery.", glow: "#5b6dff" },
    { id: "mn-g80sd", eyebrow: "4K · 240 Hz · QD‑OLED", title: "Samsung Odyssey OLED G8", text: "The sharpest high‑refresh monitor you can buy, with a glare‑free OLED panel.", glow: "#a23cff" },
    { id: "lp-x1c12", eyebrow: "Business flagship", title: "ThinkPad X1 Carbon Gen 12", text: "Just over a kilo, with a 2.8K OLED screen and enterprise security. Now €250 off.", glow: "#ff5a3c" },
  ];
  let slide = 0, slideTimer;

  function renderHero() {
    $("#slides").innerHTML = SLIDES.map((s, i) => {
      const p = byId[s.id];
      return `<div class="slide" style="--glow:${s.glow}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${SLIDES.length}">
        <div>
          <span class="eyebrow">${esc(s.eyebrow)}</span>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.text)}</p>
          <div class="slide__price"><b>${fmt(p.price)}</b>${p.old ? `<s>${fmt(p.old)}</s>` : ""}</div>
          <div class="slide__cta">
            <button type="button" class="btn btn--white btn--lg" data-open="${p.id}">View details</button>
            <button type="button" class="btn btn--primary btn--lg" data-add="${p.id}">${svg(ICON.cart)} Add to cart</button>
          </div>
        </div>
        <div class="slide__art" data-open="${p.id}">${window.productArt(p)}</div>
      </div>`;
    }).join("");
    $("#dots").innerHTML = SLIDES.map((s, i) => `<button type="button" role="tab" data-slide="${i}" aria-label="Show ${esc(s.title)}"></button>`).join("");
    goSlide(0);

    const maxStorage = Math.max(...PRODUCTS.filter((p) => p.cat === "Storage").map(discount));
    const PROMOS = [
      { small: "Networking", title: "Upgrade to Wi‑Fi 7", link: "Shop access points →", art: "nw-u7pro", key: "wifi7" },
      { small: "Storage deals", title: `SSDs and drives up to −${maxStorage}%`, link: "See the offers →", art: "st-990pro2", key: "storage" },
    ];
    $("#promos").innerHTML = PROMOS.map((pr) => `
      <button type="button" class="promo" data-promo="${pr.key}">
        <span><small>${esc(pr.small)}</small><span class="promo__title">${esc(pr.title)}</span><span class="link">${esc(pr.link)}</span></span>
        <span class="promo__art">${window.productArt(byId[pr.art])}</span>
      </button>`).join("");
  }

  function goSlide(i) {
    slide = (i + SLIDES.length) % SLIDES.length;
    $("#slides").style.transform = `translateX(-${slide * 100}%)`;
    $$("#slides .slide").forEach((el, j) => { el.inert = j !== slide; });
    $$("#dots button").forEach((b, j) => b.setAttribute("aria-selected", j === slide));
  }
  function autoSlide() {
    clearInterval(slideTimer);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    slideTimer = setInterval(() => goSlide(slide + 1), 6500);
  }

  function renderHome() {
    $("#catTiles").innerHTML = CATS.map((c) => {
      const items = PRODUCTS.filter((p) => p.cat === c.id).sort(SORTS.featured);
      return `<button type="button" class="cat-tile" data-cat="${esc(c.id)}">${media(items[0])}<b>${esc(c.id)}</b><small>${items.length} products</small></button>`;
    }).join("");

    const deals = PRODUCTS.filter((p) => p.old && p.stock).sort(SORTS.discount).slice(0, 10);
    $("#dealsRail").innerHTML = deals.map(card).join("");

    const counts = {};
    PRODUCTS.forEach((p) => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
    $("#brandRail").innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 16)
      .map(([b, n]) => `<button type="button" class="brand-tile" data-brand="${esc(b)}"><span>${esc(b)}<small>${n} products</small></span></button>`).join("");

    $("#footerCats").innerHTML = CATS.map((c) => `<li><button type="button" data-cat="${esc(c.id)}">${esc(c.id)}</button></li>`).join("");
    $("#year").textContent = new Date().getFullYear();
    $("#phoneText").textContent = S.phone;
  }

  function tickCountdown() {
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    let s = Math.max(0, Math.floor((end - now) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, "0"); s %= 3600;
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    $("#countdown").textContent = `${h}:${m}:${String(s % 60).padStart(2, "0")}`;
  }

  /* ================================================================ mega menu */
  function renderMega() {
    $("#megaInner").innerHTML = CATS.map((c) => {
      const def = (FACETS[c.id] || [])[0];
      const items = PRODUCTS.filter((p) => p.cat === c.id);
      const vals = {};
      if (def) items.forEach((p) => { const v = p.attrs[def.key]; if (v !== undefined) vals[v] = (vals[v] || 0) + 1; });
      const list = Object.entries(vals).sort((a, b) => (def.num ? a[0] - b[0] : b[1] - a[1])).slice(0, 6);
      return `<div class="mega__col">
        <h3><button type="button" data-cat="${esc(c.id)}">${svg(catIcon(c.id))}${esc(c.id)}</button></h3>
        <ul>${list.map(([v, n]) => `<li><button type="button" data-mega="${esc(c.id)}|${def.key}|${esc(v)}">${esc(def.fmt ? def.fmt(Number(v)) : v)} <span>${n}</span></button></li>`).join("")}</ul>
      </div>`;
    }).join("");
  }
  function toggleMega(open) {
    const btn = $("#megaBtn");
    const on = open ?? btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", on);
    $("#mega").hidden = !on;
  }

  /* ================================================================ search suggestions */
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
    const score = (p) => (p.name.toLowerCase().startsWith(ql) ? 4 : 0) + (p.name.toLowerCase().includes(ql) ? 2 : 0) + (p.brand.toLowerCase() === ql ? 1 : 0) + p.reviews / 10000;
    const hits = PRODUCTS.filter((p) => textMatch(p, q)).sort((a, b) => score(b) - score(a));
    const cats = {};
    hits.forEach((p) => { cats[p.cat] = (cats[p.cat] || 0) + 1; });
    box.innerHTML = hits.length
      ? `${Object.keys(cats).length > 1 ? `<div class="suggest__label">Categories</div><div class="suggest__cats">${Object.entries(cats).map(([c, n]) => `<button type="button" data-sgcat="${esc(c)}">${esc(c)} (${n})</button>`).join("")}</div>` : ""}
         <div class="suggest__label">Products</div>
         ${hits.slice(0, 6).map((p) => `<button type="button" class="sg-item" role="option" data-open="${p.id}">${media(p)}<span><b>${highlight(p.name, q)}</b><small>${esc(p.cat)} · ${stockLabel(p).replace(/<[^>]+>/g, "")}</small></span><span class="price ${p.old ? "price--sale" : ""}">${fmt(p.price)}</span></button>`).join("")}
         <button type="button" class="suggest__all" data-sgall>See all ${hits.length} results for “${esc(q)}”</button>`
      : `<div class="suggest__none">No products found for “${esc(q)}”. Try a brand, model or spec, like “Wi‑Fi 7” or “32 GB”.</div>`;
    box.hidden = false;
  }
  function hideSuggest() { $("#suggest").hidden = true; }
  function applySearch(q, cat = "All") {
    resetFilters(cat);
    state.q = q.trim();
    $("#search").value = state.q;
    hideSuggest();
    $("#search").blur();
    render();
    goCatalog();
  }

  /* ================================================================ cart */
  const saveCart = () => saved.set("cart", cart);

  function addToCart(id, qty = 1, quiet = false) {
    const p = byId[id];
    if (!p || !p.stock) return false;
    const line = cart.find((l) => l.id === id);
    const cur = line ? line.qty : 0;
    const next = Math.min(p.stock, cur + qty);
    if (next === cur) { toast(`Only ${p.stock} of this item in stock`); return false; }
    if (line) line.qty = next; else cart.push({ id, qty: next });
    saveCart();
    renderCart();
    refreshCards();
    bump("#cartCount");
    if (!quiet) toast(`Added <b>${esc(p.name)}</b> to cart`, { label: "View cart", fn: openCart });
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
    toast(`Removed ${esc(byId[id].name)}`, { label: "Undo", fn: () => { cart.splice(idx, 0, removed); saveCart(); renderCart(); refreshCards(); } });
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
    <dt>Subtotal (${t.items} ${t.items === 1 ? "item" : "items"})</dt><dd>${fmt(t.subtotal)}</dd>
    ${t.savings > 0 ? `<dt>You save</dt><dd class="save">−${fmt(t.savings)}</dd>` : ""}
    <dt>Delivery</dt><dd>${t.shipping === 0 ? "Free" : fmt(t.shipping)}</dd>
    <dt>incl. VAT ${Math.round(S.vatRate * 100)}%</dt><dd>${fmt(t.vat)}</dd>
    <dt class="grand">Total</dt><dd class="grand">${fmt(t.total)}</dd>`;

  function renderCart() {
    const t = totals();
    $("#cart").classList.toggle("is-empty", !cart.length);
    const count = $("#cartCount");
    count.textContent = t.items;
    count.hidden = !t.items;
    $("#cartTotalMini").textContent = fmt(t.subtotal);

    const left = S.freeShippingFrom - t.subtotal;
    $("#shipMeter").innerHTML = (left > 0 ? `Add <b>${fmt(left)}</b> more for free delivery` : "<strong>Free delivery unlocked</strong>") +
      `<div class="bar"><i style="width:${Math.min(100, (t.subtotal / S.freeShippingFrom) * 100)}%"></i></div>`;

    $("#cartList").innerHTML = cart.map((l) => {
      const p = byId[l.id];
      return `<li class="cart-item">
        ${media(p)}
        <div>
          <h4>${esc(p.name)}</h4>
          <span class="muted">${fmt(p.price)} each</span>
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" data-qty="${p.id}" data-d="-1" aria-label="Decrease quantity">−</button>
            <span>${l.qty}</span>
            <button type="button" data-qty="${p.id}" data-d="1" ${l.qty >= p.stock ? "disabled" : ""} aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-item__right"><b class="num">${fmt(p.price * l.qty)}</b><button type="button" class="remove" data-remove="${p.id}">Remove</button></div>
      </li>`;
    }).join("");
    $("#cartTotals").innerHTML = totalsHTML(t);
  }

  // Update add/wish/compare state on visible cards without re-rendering everything.
  function refreshCards() {
    $$("[data-add]").forEach((b) => {
      const id = b.dataset.add, p = byId[id];
      if (!b.classList.contains("add")) return;
      const inCart = cartQty(id) > 0;
      b.classList.toggle("added", inCart);
      const long = b.closest(".card__side");
      b.innerHTML = `${svg(inCart ? ICON.check : ICON.cart)}${p.stock ? (inCart ? "In cart" : long ? "Add to cart" : "Add") : "Sold out"}`;
    });
    $$("[data-cmp]").forEach((c) => { c.checked = compare.includes(c.dataset.cmp); });
  }

  /* ================================================================ overlays */
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

  /* ================================================================ product page */
  function openProduct(id) {
    const p = byId[id];
    if (!p) return;
    hideSuggest();
    toggleMega(false);
    const d = discount(p);
    const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 6);
    const specRows = [
      ["Brand", p.brand], ["Model", p.name], ["SKU", p.id.toUpperCase()],
      ...(FACETS[p.cat] || []).filter((f) => p.attrs[f.key] !== undefined).map((f) => [f.label, f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]]),
      ["Highlights", p.specs.join(" · ")],
      ["Warranty", "24 months"],
    ];
    const w = wish.has(p.id), cmp = compare.includes(p.id);
    openModal(`
      <div class="pdp">
        <div class="pdp__media">${media(p)}</div>
        <div class="pdp__info">
          <div class="pdp__meta"><span class="card__brand">${esc(p.brand)}</span><span>${esc(p.cat)}</span><span class="mono">SKU ${esc(p.id.toUpperCase())}</span></div>
          <h2>${esc(p.name)}</h2>
          <div class="pdp__meta"><span class="rating">${stars(p.rating)} ${p.rating.toFixed(1)} · ${p.reviews} reviews</span>${stockLabel(p)}</div>
          <div class="card__specs">${p.specs.map((s) => `<span>${esc(s)}</span>`).join("")}</div>
          <div class="pdp__buybox">
            <div class="pdp__price">${priceHTML(p)}${d ? `<span class="pdp__save">Save ${fmt(p.old - p.price)} (−${d}%)</span>` : ""}</div>
            <div class="pdp__inst">or <b>${S.installments} × ${fmt(p.price / S.installments)}</b> in monthly instalments · incl. ${Math.round(S.vatRate * 100)}% VAT</div>
            <div class="pdp__buy">
              <div class="qty" role="group" aria-label="Quantity">
                <button type="button" id="pdpMinus" aria-label="Decrease quantity">−</button>
                <span id="pdpQty">1</span>
                <button type="button" id="pdpPlus" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="btn btn--primary btn--lg" id="pdpAdd" ${p.stock ? "" : "disabled"}>${svg(ICON.cart)} ${p.stock ? "Add to cart" : "Out of stock"}</button>
              <button type="button" class="btn btn--ghost btn--lg" id="pdpBuy" ${p.stock ? "" : "disabled"}>Buy now</button>
              <button type="button" class="icon-btn ${w ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${w}" aria-label="${w ? "Remove from" : "Add to"} wishlist">${svg(ICON.heart)}</button>
              <button type="button" class="icon-btn" id="pdpCmp" aria-pressed="${cmp}" aria-label="${cmp ? "Remove from" : "Add to"} compare" style="${cmp ? "color:var(--brand);border-color:var(--brand)" : ""}">${svg(ICON.compare)}</button>
            </div>
            <ul class="pdp__ship">
              <li>${svg(ICON.truck)} ${p.stock ? `Order now, delivered by <b>${deliveryDate(2)}</b>` : "Currently unavailable"} · ${p.price >= S.freeShippingFrom ? "free delivery" : `delivery ${fmt(S.shippingFee)}, free over ${fmt0(S.freeShippingFrom)}`}</li>
              <li>${svg(ICON.store)} Free pickup from the ITCOM store</li>
              <li>${svg(ICON.shield)} 24‑month warranty · 14‑day returns</li>
            </ul>
          </div>
        </div>
      </div>
      <div class="pdp__tabs">
        <div class="tabs" role="tablist">
          <button type="button" role="tab" aria-selected="true" data-tab="specs">Specifications</button>
          <button type="button" role="tab" aria-selected="false" data-tab="about">Overview</button>
        </div>
        <div data-pane="specs"><table class="spec-table"><tbody>${specRows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
        <div data-pane="about" hidden><p>${esc(p.desc)}</p></div>
      </div>
      ${related.length ? `<div class="related"><h3>Similar products</h3><div class="rail">${related.map(card).join("")}</div></div>` : ""}
    `, "modal--product");

    let qty = 1;
    const room = () => p.stock - cartQty(p.id);
    const sync = () => {
      $("#pdpQty").textContent = qty;
      $("#pdpMinus").disabled = qty <= 1;
      $("#pdpPlus").disabled = qty >= room();
    };
    sync();
    $("#pdpMinus").onclick = () => { qty = Math.max(1, qty - 1); sync(); };
    $("#pdpPlus").onclick = () => { qty = Math.min(room(), qty + 1); sync(); };
    $("#pdpAdd").onclick = () => { addToCart(p.id, qty); qty = 1; sync(); };
    $("#pdpBuy").onclick = () => { if (cartQty(p.id) === 0) addToCart(p.id, qty, true); openCheckout(); };
    $("#pdpCmp").onclick = () => { toggleCompare(p.id); openProduct(p.id); };
    $$("[data-tab]", modal).forEach((t) => t.addEventListener("click", () => {
      $$("[data-tab]", modal).forEach((x) => x.setAttribute("aria-selected", x === t));
      $$("[data-pane]", modal).forEach((pane) => { pane.hidden = pane.dataset.pane !== t.dataset.tab; });
    }));
  }

  /* ================================================================ compare */
  function toggleCompare(id) {
    const p = byId[id];
    if (compare.includes(id)) compare = compare.filter((x) => x !== id);
    else if (compare.length && byId[compare[0]].cat !== p.cat) {
      toast(`You can compare products from one category at a time`, { label: "Start new comparison", fn: () => { compare = [id]; saveCompare(); } });
      refreshCards();
      return;
    } else if (compare.length >= 4) { toast("You can compare up to 4 products"); refreshCards(); return; }
    else compare.push(id);
    saveCompare();
  }
  function saveCompare() { saved.set("cmp", compare); renderTray(); refreshCards(); }

  function renderTray() {
    const tray = $("#cmpTray");
    tray.hidden = !compare.length;
    document.body.classList.toggle("has-tray", compare.length > 0);
    const c = $("#cmpCount");
    c.textContent = compare.length;
    c.hidden = !compare.length;
    $("#cmpItems").innerHTML = compare.map((id) => {
      const p = byId[id];
      return `<div class="cmp-chip">${media(p)}<span>${esc(p.name)}</span><button type="button" data-uncmp="${id}" aria-label="Remove ${esc(p.name)} from compare">${svg(ICON.x)}</button></div>`;
    }).join("") + Array.from({ length: 4 - compare.length }, () => `<div class="cmp-slot">Add a product</div>`).join("");
    $("#cmpOpen").textContent = `Compare (${compare.length})`;
    $("#cmpOpen").disabled = compare.length < 2;
  }

  function openCompare(onlyDiff = false) {
    if (compare.length < 2) { toast("Tick “Compare” on at least two products"); return; }
    const ps = compare.map((id) => byId[id]);
    const cat = ps[0].cat;
    const minPrice = Math.min(...ps.map((p) => p.price));
    const maxRating = Math.max(...ps.map((p) => p.rating));
    const rows = [
      ["Price", ps.map((p) => `<span class="${p.price === minPrice ? "best" : ""}">${fmt(p.price)}</span>`), ps.map((p) => p.price)],
      ["Rating", ps.map((p) => `<span class="${p.rating === maxRating ? "best" : ""}">${p.rating.toFixed(1)} ★</span> <span class="muted">(${p.reviews})</span>`), ps.map((p) => p.rating)],
      ["Availability", ps.map(stockLabel), ps.map((p) => (p.stock ? (p.stock <= 5 ? 1 : 2) : 0))],
      ["Brand", ps.map((p) => esc(p.brand)), ps.map((p) => p.brand)],
      ...(FACETS[cat] || []).map((f) => [f.label, ps.map((p) => (p.attrs[f.key] === undefined ? "—" : esc(f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]))), ps.map((p) => String(p.attrs[f.key]))]),
      ["Highlights", ps.map((p) => p.specs.map(esc).join("<br>")), ps.map((p) => p.specs.join())],
    ];
    const body = rows.map(([label, cells, raw]) => {
      const diff = new Set(raw).size > 1;
      if (onlyDiff && !diff) return "";
      return `<tr class="${diff ? "diff" : ""}"><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    }).join("");
    openModal(`
      <div class="cmp">
        <h2>Compare ${esc(cat.toLowerCase())}</h2>
        <div class="cmp__opts"><label class="check"><input type="checkbox" id="cmpDiff" ${onlyDiff ? "checked" : ""} /> Only show differences</label><span>Highlighted rows differ.</span></div>
        <table>
          <thead><tr><td></td>${ps.map((p) => `<td><div class="cmp-head">${media(p)}<b>${esc(p.name)}</b><div class="row"><button type="button" class="btn btn--primary" data-add="${p.id}" ${p.stock ? "" : "disabled"}>${svg(ICON.cart)} Add</button><button type="button" class="btn btn--ghost" data-uncmp="${p.id}" data-reopen>Remove</button></div></div></td>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>`, "modal--compare");
    $("#cmpDiff").onchange = (e) => openCompare(e.target.checked);
  }

  /* ================================================================ wishlist */
  function toggleWish(id) {
    if (wish.has(id)) wish.delete(id); else wish.add(id);
    saved.set("wish", [...wish]);
    renderWishCount();
    $$(`[data-wish="${id}"]`).forEach((b) => {
      const on = wish.has(id);
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", `${on ? "Remove from" : "Add to"} wishlist`);
    });
    toast(wish.has(id) ? `Saved <b>${esc(byId[id].name)}</b> to your wishlist` : "Removed from your wishlist");
  }
  function renderWishCount() { const el = $("#wishCount"); el.textContent = wish.size; el.hidden = !wish.size; }
  function openWishlist() {
    const items = PRODUCTS.filter((p) => wish.has(p.id));
    openModal(`<div class="wishlist"><h2>Wishlist</h2>${items.length
      ? `<div class="grid">${items.map(card).join("")}</div>`
      : `<div class="empty">${svg(ICON.heart, "icon icon--xl")}<h3>Nothing saved yet</h3><p class="muted">Tap the heart on any product to keep it here.</p></div>`}</div>`, "modal--wish");
  }

  /* ================================================================ checkout */
  function openCheckout() {
    if (!cart.length) return;
    closeCart();
    const draft = saved.get("checkout", {});
    const f = (id, label, type = "text", extra = "", cls = "") => `
      <label class="field ${cls}" for="co-${id}">${label}
        <input id="co-${id}" name="${id}" type="${type}" value="${esc(draft[id] || "")}" ${extra} />
        <span class="err"></span>
      </label>`;
    openModal(`
      <form class="checkout" id="checkoutForm" novalidate>
        <div>
          <h2>Checkout</h2>
          <p class="muted">Demo store: no order is placed and no payment is taken.</p>
          <h3>Contact</h3>
          <div class="form-grid">
            ${f("name", "Full name", "text", 'autocomplete="name"')}
            ${f("company", "Company (optional)", "text", 'autocomplete="organization"')}
            ${f("email", "Email", "email", 'autocomplete="email"')}
            ${f("phone", "Phone", "tel", 'autocomplete="tel" placeholder="+383 4x xxx xxx"')}
          </div>
          <h3>Delivery</h3>
          <div class="form-grid">
            ${f("address", "Street and number", "text", 'autocomplete="street-address"', "full")}
            ${f("city", "City", "text", 'autocomplete="address-level2"')}
            ${f("zip", "Postcode", "text", 'autocomplete="postal-code" inputmode="numeric"')}
          </div>
          <div class="options" style="margin-top:12px">
            <label class="option"><input type="radio" name="delivery" value="standard" checked /><span>Standard delivery<small>Delivered by ${deliveryDate(2)}</small></span><b id="dStd"></b></label>
            <label class="option"><input type="radio" name="delivery" value="express" /><span>Express delivery<small>Delivered by ${deliveryDate(1)}</small></span><b id="dExp"></b></label>
            <label class="option"><input type="radio" name="delivery" value="pickup" /><span>Pick up in store<small>Ready in 2 hours</small></span><b>Free</b></label>
          </div>
          <h3>Payment</h3>
          <div class="options">
            <label class="option"><input type="radio" name="pay" value="cod" checked /><span>Pay on delivery<small>Cash or card to the courier</small></span></label>
            <label class="option"><input type="radio" name="pay" value="inst" /><span>Monthly instalments<small>Up to ${S.installments} months with participating bank cards</small></span></label>
            <label class="option"><input type="radio" name="pay" value="bank" /><span>Bank transfer<small>Pro‑forma invoice by email</small></span></label>
          </div>
        </div>
        <aside class="summary">
          <h3>Order summary</h3>
          <ul>${cart.map((l) => `<li><span>${l.qty} × ${esc(byId[l.id].name)}</span><span class="num">${fmt(byId[l.id].price * l.qty)}</span></li>`).join("")}</ul>
          <dl class="totals" id="coTotals"></dl>
          <button class="btn btn--primary btn--block btn--lg" type="submit">Place order</button>
        </aside>
      </form>`, "modal--checkout");

    const form = $("#checkoutForm");
    const delivery = () => form.delivery.value;
    const update = () => {
      $("#coTotals").innerHTML = totalsHTML(totals(delivery()));
      const base = totals("standard").shipping;
      $("#dStd").textContent = base === 0 ? "Free" : fmt(base);
      $("#dExp").textContent = fmt(base + S.expressFee);
    };
    update();
    form.addEventListener("change", update);
    form.addEventListener("input", (e) => {
      if (!e.target.name || e.target.type === "radio") return;
      const d = saved.get("checkout", {});
      d[e.target.name] = e.target.value;
      saved.set("checkout", d);
      e.target.closest(".field")?.classList.remove("invalid");
    });

    const rules = {
      name: (v) => v.trim().length >= 2 || "Enter your full name",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Enter a valid email, like name@company.com",
      phone: (v) => v.replace(/\D/g, "").length >= 8 || "Enter a phone number with at least 8 digits",
      address: (v) => v.trim().length >= 4 || "Enter your street and number",
      city: (v) => v.trim().length >= 2 || "Enter your city",
      zip: (v) => /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) || "Enter a valid postcode, like 10000",
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
        if (res !== true && !firstBad) firstBad = input;
      }
      if (firstBad) { firstBad.focus(); return; }
      const t = totals(delivery());
      const orderNo = "ITC-" + Date.now().toString(36).toUpperCase().slice(-6);
      const email = form.email.value.trim();
      cart = [];
      saveCart();
      renderCart();
      refreshCards();
      openModal(`
        <div class="success">
          <div class="success__icon">${svg(ICON.check)}</div>
          <h2>Order placed</h2>
          <p class="muted">Your order number is</p>
          <code>${orderNo}</code>
          <p>Total <b>${fmt(t.total)}</b>. In a live store the confirmation would go to <b>${esc(email)}</b>.</p>
          <button type="button" class="btn btn--primary btn--lg" data-close-modal>Continue shopping</button>
        </div>`, "modal--success");
    });
  }

  /* ================================================================ toast */
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

  /* ================================================================ theme */
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  applyTheme(saved.get("theme", null));
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    applyTheme(dark ? "light" : "dark");
    saved.set("theme", dark ? "light" : "dark");
  });

  /* ================================================================ events */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-open],[data-wish],[data-qty],[data-remove],[data-cat],[data-chip],[data-page],[data-brand],[data-promo],[data-mega],[data-deals],[data-crumb],[data-slide],[data-rail],[data-uncmp],[data-sgall],[data-sgcat],[data-close],[data-close-modal]");
    if (!e.target.closest(".search")) hideSuggest();
    if (!e.target.closest("#mega, #megaBtn")) toggleMega(false);
    if (!t) return;
    const d = t.dataset;
    if (d.add) addToCart(d.add);
    else if (d.wish) toggleWish(d.wish);
    else if (d.open) openProduct(d.open);
    else if (d.qty) setQty(d.qty, cartQty(d.qty) + Number(d.d));
    else if (d.remove) removeLine(d.remove);
    else if (d.uncmp) { compare = compare.filter((x) => x !== d.uncmp); saveCompare(); if ("reopen" in d) compare.length >= 2 ? openCompare() : closeModal(); }
    else if (d.cat) { closeModal(); toggleMega(false); resetFilters(d.cat); render(); goCatalog(); }
    else if (d.mega) { const [c, k, v] = d.mega.split("|"); toggleMega(false); resetFilters(c); state.f[k] = new Set([v]); render(); goCatalog(); }
    else if (d.brand) { resetFilters(); state.brands.add(d.brand); render(); goCatalog(); }
    else if ("deals" in d) { resetFilters(); state.onSale = true; state.sort = "discount"; render(); goCatalog(); }
    else if (d.promo) {
      if (d.promo === "wifi7") { resetFilters("Networking"); state.f.wifi = new Set(["Wi‑Fi 7"]); }
      else { resetFilters("Storage"); state.onSale = true; state.sort = "discount"; }
      render(); goCatalog();
    }
    else if (d.chip) { d.chip === "all" ? (resetFilters(), render()) : removeFilter(d.chip); }
    else if (d.page) { state.page = Number(d.page); renderResults(); goCatalog(); }
    else if (d.crumb) { resetFilters(); render(); if (d.crumb === "home") window.scrollTo({ top: 0 }); else goCatalog(); }
    else if (d.slide) { goSlide(Number(d.slide)); autoSlide(); }
    else if (d.rail) { const r = $("#dealsRail"); r.scrollBy({ left: Number(d.rail) * r.clientWidth * 0.8, behavior: "smooth" }); }
    else if ("sgall" in d) applySearch($("#search").value);
    else if (d.sgcat) applySearch($("#search").value, d.sgcat);
    else if ("close" in d) closeCart();
    else if ("closeModal" in d) closeModal();
  });

  // Compare checkboxes on cards
  document.addEventListener("change", (e) => { if (e.target.dataset.cmp) toggleCompare(e.target.dataset.cmp); });

  // Facets
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
    else if (fk.startsWith("rating:")) state.rating = Number(fk.slice(7));
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
  $("#perPage").addEventListener("change", (e) => { state.per = Number(e.target.value); state.page = 1; renderResults(); });
  $("#viewGrid").addEventListener("click", () => { state.view = "grid"; saved.set("view", "grid"); renderResults(); });
  $("#viewList").addEventListener("click", () => { state.view = "list"; saved.set("view", "list"); renderResults(); });
  $("#resetFilters").addEventListener("click", () => { resetFilters(); render(); });
  $("#emptyReset").addEventListener("click", () => { resetFilters(); render(); });
  $("#openFilters").addEventListener("click", openFilters);
  $("#closeFilters").addEventListener("click", closeFilters);
  $("#applyFilters").addEventListener("click", () => { closeFilters(); goCatalog(); });
  $("#cartBtn").addEventListener("click", openCart);
  $("#wishlistBtn").addEventListener("click", openWishlist);
  $("#compareBtn").addEventListener("click", () => openCompare());
  $("#cmpOpen").addEventListener("click", () => openCompare());
  $("#cmpClear").addEventListener("click", () => { compare = []; saveCompare(); });
  $("#checkoutBtn").addEventListener("click", openCheckout);
  $("#megaBtn").addEventListener("click", () => toggleMega());
  overlay.addEventListener("click", () => { closeCart(); closeFilters(); });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // Search box
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
      else applySearch(search.value);
    } else if (e.key === "Escape") { hideSuggest(); }
  });

  // Hero slider: hover pause + swipe
  const slider = $("#slider");
  slider.addEventListener("mouseenter", () => clearInterval(slideTimer));
  slider.addEventListener("mouseleave", autoSlide);
  slider.addEventListener("focusin", () => clearInterval(slideTimer));
  let sx = null, swiped = false;
  slider.addEventListener("pointerdown", (e) => { sx = e.clientX; swiped = false; });
  slider.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 50) { swiped = true; goSlide(slide + (dx < 0 ? 1 : -1)); autoSlide(); }
  });
  // A swipe shouldn't also count as a click on the product art.
  slider.addEventListener("click", (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);

  $("#b2bForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#b2bEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) { toast("Enter a work email, like you@company.com"); input.focus(); return; }
    toast("Thanks! This demo doesn't send quote requests yet.");
    input.value = "";
  });

  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing && !modal.open) { e.preventDefault(); search.focus(); }
    if (e.key === "Escape") { closeCart(); closeFilters(); toggleMega(false); hideSuggest(); }
  });

  /* ================================================================ boot */
  renderHero();
  autoSlide();
  renderHome();
  renderMega();
  render();
  renderCart();
  renderWishCount();
  renderTray();
  tickCountdown();
  setInterval(tickCountdown, 1000);

  // Deep link: index.html#lp-x1c12 opens that product.
  const hash = location.hash.slice(1);
  if (byId[hash]) openProduct(hash);
})();
