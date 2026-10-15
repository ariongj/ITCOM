/* ITCOM — dyqani online (JavaScript i thjeshtë, pa build). */
(() => {
  "use strict";

  const S = window.STORE;
  const CATS = window.CATEGORIES;
  const FACETS = window.FACETS;
  const PRODUCTS = window.PRODUCTS;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // Format shqip: 1.199,00 €
  const fmt = (n) => { const [i, d] = Math.abs(n).toFixed(2).split("."); return `${n < 0 ? "−" : ""}${group(i)},${d} €`; };
  const fmt0 = (n) => `${group(String(Math.round(n)))} €`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const discount = (p) => (p.old ? Math.round((1 - p.price / p.old) * 100) : 0);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

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
  const media = (p, cls = "") =>
    `<div class="media ${cls}">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" />` : window.productArt(p)}</div>`;

  const rate = (r) => r.toFixed(1).replace(".", ",");
  const stars = (r) => `<span class="stars" style="--pct:${(r / 5) * 100}%" aria-label="Vlerësuar ${rate(r)} nga 5"></span>`;

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
  const blankFilters = (cat = "All") => ({ q: "", cat, brands: new Set(), f: {}, min: 0, max: catMax(cat), inStock: false, onSale: false, rating: 0 });
  const state = Object.assign(blankFilters(), { sort: "featured", per: 24, page: 1, view: saved.get("view", "grid") });
  const closedFacets = new Set(saved.get("closedFacets", ["rating"]));
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
    if (state.rating) out.push(["rating", "Vlerësimi", `${rate(state.rating)}★ e lart`]);
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
        <span>${esc(it.label)}</span><span class="count">${it.count}</span>
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
    const brandItems = brands.map((b) => ({ fk: "brand:" + b, label: b, count: PRODUCTS.filter((p) => p.brand === b && matches(p, "brand")).length, checked: state.brands.has(b) }));
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

    const ratingRows = [0, 4.5, 4].map((r) => {
      const n = PRODUCTS.filter((p) => p.rating >= r && matches(p, "rating")).length;
      return `<label class="check"><input type="radio" name="rating" data-fk="rating:${r}" ${state.rating === r ? "checked" : ""} /> <span>${r ? `${stars(r)} ${rate(r)} e lart` : "Çdo vlerësim"}</span><span class="count">${n}</span></label>`;
    }).join("");
    groups.push(facetGroup("rating", "Vlerësimi i klientëve", ratingRows, state.rating ? 1 : 0));

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

  function card(p) {
    const w = wish.has(p.id), inCart = cartQty(p.id) > 0, cmp = compare.includes(p.id), d = discount(p);
    const addBtn = `<button type="button" class="btn btn--outline add ${inCart ? "added" : ""}" data-add="${p.id}" ${p.stock ? "" : "disabled"} aria-label="Shto ${esc(p.name)} në shportë">${svg(inCart ? ICON.check : ICON.bag)}${addLabel(p, inCart)}</button>`;
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media" data-open="${p.id}">
          ${media(p)}
          <div class="tags">${d ? `<span class="tag tag--sale">−${d}%</span>` : ""}${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}</div>
        </div>
        <div class="card__actions">
          <button type="button" class="icon-btn ${w ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${w}" aria-label="${w ? "Hiq nga" : "Shto në"} listën e dëshirave">${svg(ICON.heart)}</button>
          <button type="button" class="icon-btn ${cmp ? "is-on" : ""}" data-cmp="${p.id}" aria-pressed="${cmp}" aria-label="${cmp ? "Hiq nga krahasimi" : "Shto për krahasim"}">${svg(ICON.compare)}</button>
        </div>
        <div class="card__body">
          <span class="card__brand">${esc(p.brand)}</span>
          <h3 class="card__title" data-open="${p.id}">${esc(p.name)}</h3>
          <div class="rating">${stars(p.rating)} ${rate(p.rating)} <span>(${p.reviews})</span></div>
          <p class="card__specs">${esc(keySpecs(p).join(" · "))}</p>
          <p class="card__desc">${esc(p.desc)}</p>
          <div class="card__price"><div>${priceHTML(p)}</div><div class="card__inst">${inst(p)}</div>${stockLabel(p)}</div>
          <div class="card__foot">${addBtn}</div>
        </div>
        <div class="card__side"><div>${priceHTML(p)}</div><div class="card__inst">${inst(p)}</div>${stockLabel(p)}${addBtn}</div>
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

    $("#resultsTitle").textContent = state.q && state.cat === "All" ? `Rezultatet për “${state.q}”` : state.cat === "All" ? "Të gjitha produktet" : state.cat;
    const from = list.length ? (state.page - 1) * state.per + 1 : 0;
    $("#resultsCount").textContent = list.length > state.per ? `${from}–${from + slice.length - 1} nga ${list.length} produkte` : plural(list.length, "produkt", "produkte");

    const crumbs = [`<button type="button" data-crumb="home">Ballina</button>`, "/", state.cat === "All" ? `<span aria-current="page">Produktet</span>` : `<button type="button" data-crumb="all">Produktet</button>`];
    if (state.cat !== "All") crumbs.push("/", `<span aria-current="page">${esc(state.cat)}</span>`);
    $("#crumbs").innerHTML = crumbs.map((c) => (c === "/" ? '<span aria-hidden="true">/</span>' : c)).join("");

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
    $("#perPage").value = String(state.per);
    $("#viewGrid").setAttribute("aria-pressed", state.view === "grid");
    $("#viewList").setAttribute("aria-pressed", state.view === "list");
    $("#applyFilters").textContent = `Shfaq ${plural(list.length, "rezultat", "rezultate")}`;
  }

  function renderCatNav() {
    $("#catNav").innerHTML = [{ id: "All" }, ...CATS].map((c) =>
      `<li><button type="button" data-cat="${esc(c.id)}" aria-pressed="${state.cat === c.id}">${c.id === "All" ? "Të gjitha" : esc(c.id)}</button></li>`).join("");
  }

  function render() {
    renderCatNav();
    renderFacets();
    renderResults();
  }

  const goCatalog = () => $("#catalog").scrollIntoView({ block: "start" });

  /* ================================================================ ballina */
  const SLIDES = [
    { id: "lp-mba13m4", eyebrow: "E re · Apple M4", title: "MacBook Air 13\" M4", text: "16 GB memorie si standard, dizajn i heshtur pa ventilator dhe deri në 18 orë bateri.", tint: "#7d93b8" },
    { id: "lp-x1c12", eyebrow: "Për biznes", title: "ThinkPad X1 Carbon Gen 12", text: "Pak më shumë se një kilogram, me ekran 2.8K OLED dhe siguri të nivelit korporativ.", tint: "#9aa3b0" },
    { id: "mn-g80sd", eyebrow: "4K · 240 Hz · QD‑OLED", title: "Samsung Odyssey OLED G8", text: "Monitori më i qartë me frekuencë të lartë, me panel OLED kundër reflektimit.", tint: "#8a8fb5" },
  ];
  let slide = 0, slideTimer;

  function renderHero() {
    $("#slides").innerHTML = SLIDES.map((s, i) => {
      const p = byId[s.id];
      return `<div class="slide" style="--tint:${s.tint}" role="group" aria-roledescription="sllajd" aria-label="${i + 1} nga ${SLIDES.length}">
        <div>
          <span class="slide__eyebrow">${esc(s.eyebrow)}</span>
          <h2>${esc(s.title)}</h2>
          <p>${esc(s.text)}</p>
          <div class="slide__price"><b>${fmt(p.price)}</b>${p.old ? `<s>${fmt(p.old)}</s>` : ""}<small>${inst(p)}</small></div>
          <div class="slide__cta">
            <button type="button" class="btn btn--primary btn--lg" data-add="${p.id}">Shto në shportë</button>
            <button type="button" class="btn btn--ghost btn--lg" data-open="${p.id}">Shiko detajet</button>
          </div>
        </div>
        <div class="slide__art" data-open="${p.id}">${window.productArt(p)}</div>
      </div>`;
    }).join("");
    $("#dots").innerHTML = SLIDES.map((s, i) => `<button type="button" role="tab" data-slide="${i}" aria-label="Shfaq ${esc(s.title)}"></button>`).join("");
    goSlide(0);

    const maxStorage = Math.max(...PRODUCTS.filter((p) => p.cat === "Ruajtja e të dhënave").map(discount));
    const PROMOS = [
      { small: "Rrjeti", title: "Kaloni në Wi‑Fi 7", link: "Shiko access point‑et", art: "nw-u7pro", key: "wifi7" },
      { small: "Ruajtja e të dhënave", title: `SSD dhe disqe deri në −${maxStorage}%`, link: "Shiko ofertat", art: "st-990pro2", key: "storage" },
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
    slideTimer = setInterval(() => goSlide(slide + 1), 7000);
  }

  function renderHome() {
    $("#catTiles").innerHTML = CATS.map((c) => {
      const items = PRODUCTS.filter((p) => p.cat === c.id).sort(SORTS.featured);
      return `<button type="button" class="cat-tile" data-cat="${esc(c.id)}">${media(items[0])}<b>${esc(c.id)}</b><small>${plural(items.length, "produkt", "produkte")}</small></button>`;
    }).join("");

    const deals = PRODUCTS.filter((p) => p.old && p.stock).sort(SORTS.discount).slice(0, 10);
    $("#dealsRail").innerHTML = deals.map(card).join("");

    const counts = {};
    PRODUCTS.forEach((p) => { counts[p.brand] = (counts[p.brand] || 0) + 1; });
    $("#brandRail").innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 18)
      .map(([b, n]) => `<button type="button" class="brand-tile" data-brand="${esc(b)}"><span>${esc(b)}<small>${plural(n, "produkt", "produkte")}</small></span></button>`).join("");

    $("#footerCats").innerHTML = CATS.map((c) => `<li><button type="button" data-cat="${esc(c.id)}">${esc(c.id)}</button></li>`).join("");
    $("#year").textContent = new Date().getFullYear();
    $("#phoneText").textContent = S.phone;
    renderRecent();
  }

  function renderRecent() {
    const items = recent.map((id) => byId[id]).filter(Boolean);
    $("#recentBlock").hidden = !items.length;
    $("#recentRail").innerHTML = items.map(card).join("");
  }
  function addRecent(id) {
    recent = [id, ...recent.filter((x) => x !== id)].slice(0, 10);
    saved.set("recent", recent);
    renderRecent();
  }

  function tickCountdown() {
    const now = new Date();
    const end = new Date(now); end.setHours(24, 0, 0, 0);
    let s = Math.max(0, Math.floor((end - now) / 1000));
    const h = String(Math.floor(s / 3600)).padStart(2, "0"); s %= 3600;
    const m = String(Math.floor(s / 60)).padStart(2, "0");
    $("#countdown").textContent = `${h}:${m}:${String(s % 60).padStart(2, "0")}`;
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
    }).join("");
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
    const score = (p) => (p.name.toLowerCase().startsWith(ql) ? 4 : 0) + (p.name.toLowerCase().includes(ql) ? 2 : 0) + (p.brand.toLowerCase() === ql ? 1 : 0) + p.reviews / 10000;
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
    resetFilters(cat);
    state.q = q.trim();
    $("#search").value = state.q;
    hideSuggest();
    $("#search").blur();
    render();
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
    if (!quiet) toast(`U shtua në shportë: <b>${esc(p.name)}</b>`, { label: "Shiko shportën", fn: openCart });
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
  }

  // Përditëson butonat në kartat e dukshme pa i rindërtuar.
  function refreshCards() {
    $$(".add[data-add]").forEach((b) => {
      const p = byId[b.dataset.add];
      const inCart = cartQty(p.id) > 0;
      b.classList.toggle("added", inCart);
      b.innerHTML = `${svg(inCart ? ICON.check : ICON.bag)}${addLabel(p, inCart)}`;
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

  /* ================================================================ faqja e produktit */
  function openProduct(id) {
    const p = byId[id];
    if (!p) return;
    hideSuggest();
    toggleMega(false);
    addRecent(id);
    const d = discount(p);
    const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).sort((a, b) => Math.abs(a.price - p.price) - Math.abs(b.price - p.price)).slice(0, 6);
    const specRows = [
      ["Brendi", p.brand], ["Modeli", p.name], ["Kodi i produktit", p.id.toUpperCase()],
      ...(FACETS[p.cat] || []).filter((f) => p.attrs[f.key] !== undefined).map((f) => [f.label, f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]]),
      ["Veçoritë kryesore", p.specs.join(" · ")],
      ["Garancia", "24 muaj"],
    ];
    const w = wish.has(p.id), cmp = compare.includes(p.id);
    openModal(`
      <div class="pdp">
        <div class="pdp__media">${media(p)}</div>
        <div class="pdp__info">
          <div class="pdp__meta"><span class="card__brand">${esc(p.brand)}</span><span>${esc(p.cat)}</span><span class="mono">${esc(p.id.toUpperCase())}</span></div>
          <h2>${esc(p.name)}</h2>
          <div class="pdp__meta"><span class="rating">${stars(p.rating)} ${rate(p.rating)} · ${p.reviews} vlerësime</span>${stockLabel(p)}</div>
          <ul class="pdp__highlights">${p.specs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          <div class="pdp__buybox">
            <div class="pdp__price">${priceHTML(p)}${d ? `<span class="pdp__save">Kurseni ${fmt(p.old - p.price)}</span>` : ""}</div>
            <div class="pdp__inst">ose <b>${S.installments} × ${fmt(p.price / S.installments)}</b> në muaj · përfshirë TVSH ${Math.round(S.vatRate * 100)}%</div>
            <div class="pdp__buy">
              <div class="qty" role="group" aria-label="Sasia">
                <button type="button" id="pdpMinus" aria-label="Zvogëlo sasinë">−</button>
                <span id="pdpQty">1</span>
                <button type="button" id="pdpPlus" aria-label="Rrit sasinë">+</button>
              </div>
              <button type="button" class="btn btn--primary btn--lg" id="pdpAdd" ${p.stock ? "" : "disabled"}>${p.stock ? "Shto në shportë" : "Jashtë stokut"}</button>
              <button type="button" class="btn btn--ghost btn--lg" id="pdpBuy" ${p.stock ? "" : "disabled"}>Bli tani</button>
              <button type="button" class="icon-btn ${w ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${w}" aria-label="${w ? "Hiq nga" : "Shto në"} listën e dëshirave">${svg(ICON.heart)}</button>
              <button type="button" class="icon-btn ${cmp ? "is-on" : ""}" data-cmp="${p.id}" aria-pressed="${cmp}" aria-label="${cmp ? "Hiq nga krahasimi" : "Shto për krahasim"}">${svg(ICON.compare)}</button>
            </div>
            <ul class="pdp__ship">
              <li>${svg(ICON.truck)}<span>${p.stock ? `Porositni sot, arrin <b>${deliveryDate(2)}</b>` : "Aktualisht i padisponueshëm"} · ${p.price >= S.freeShippingFrom ? "dërgesë falas" : `dërgesa ${fmt(S.shippingFee)}, falas mbi ${fmt0(S.freeShippingFrom)}`}</span></li>
              <li>${svg(ICON.store)}<span>Marrje falas në dyqanin ITCOM</span></li>
              <li>${svg(ICON.shield)}<span>Garanci 24 muaj · Kthim brenda 14 ditëve</span></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="pdp__tabs">
        <div class="tabs" role="tablist">
          <button type="button" role="tab" aria-selected="true" data-tab="specs">Specifikimet</button>
          <button type="button" role="tab" aria-selected="false" data-tab="about">Përshkrimi</button>
        </div>
        <div data-pane="specs"><table class="spec-table"><tbody>${specRows.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table></div>
        <div data-pane="about" hidden><p>${esc(p.desc)}</p></div>
      </div>
      ${related.length ? `<div class="related"><h3>Produkte të ngjashme</h3><div class="rail">${related.map(card).join("")}</div></div>` : ""}
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
    $$("[data-tab]", modal).forEach((t) => t.addEventListener("click", () => {
      $$("[data-tab]", modal).forEach((x) => x.setAttribute("aria-selected", x === t));
      $$("[data-pane]", modal).forEach((pane) => { pane.hidden = pane.dataset.pane !== t.dataset.tab; });
    }));
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
    const maxRating = Math.max(...ps.map((p) => p.rating));
    const rows = [
      ["Çmimi", ps.map((p) => `<span class="${p.price === minPrice ? "best" : ""}">${fmt(p.price)}</span>`), ps.map((p) => p.price)],
      ["Vlerësimi", ps.map((p) => `<span class="${p.rating === maxRating ? "best" : ""}">${rate(p.rating)} ★</span> <span class="muted">(${p.reviews})</span>`), ps.map((p) => p.rating)],
      ["Disponueshmëria", ps.map(stockLabel), ps.map((p) => (p.stock ? (p.stock <= 5 ? 1 : 2) : 0))],
      ["Brendi", ps.map((p) => esc(p.brand)), ps.map((p) => p.brand)],
      ...(FACETS[cat] || []).map((f) => [f.label, ps.map((p) => (p.attrs[f.key] === undefined ? "—" : esc(f.fmt ? f.fmt(p.attrs[f.key]) : p.attrs[f.key]))), ps.map((p) => String(p.attrs[f.key]))]),
      ["Veçoritë kryesore", ps.map((p) => p.specs.map(esc).join("<br>")), ps.map((p) => p.specs.join())],
    ];
    const body = rows.map(([label, cells, raw]) => {
      const diff = new Set(raw).size > 1;
      if (onlyDiff && !diff) return "";
      return `<tr class="${diff ? "diff" : ""}"><th scope="row">${label}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    }).join("");
    openModal(`
      <div class="cmp">
        <h2>Krahasimi: ${esc(cat)}</h2>
        <div class="cmp__opts"><label class="check"><input type="checkbox" id="cmpDiff" ${onlyDiff ? "checked" : ""} /> Shfaq vetëm dallimet</label><span>Rreshtat me sfond ndryshojnë mes produkteve.</span></div>
        <table>
          <thead><tr><td></td>${ps.map((p) => `<td><div class="cmp-head">${media(p)}<b>${esc(p.name)}</b><div class="row"><button type="button" class="btn btn--primary" data-add="${p.id}" ${p.stock ? "" : "disabled"}>Shto në shportë</button><button type="button" class="btn btn--ghost" data-uncmp="${p.id}" data-reopen>Hiq</button></div></div></td>`).join("")}</tr></thead>
          <tbody>${body}</tbody>
        </table>
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

  /* ================================================================ porosia */
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
          <h2>Përfundo porosinë</h2>
          <p class="muted">Dyqan demo: nuk dërgohet asnjë porosi dhe nuk merret asnjë pagesë.</p>
          <h3>Të dhënat e kontaktit</h3>
          <div class="form-grid">
            ${f("name", "Emri dhe mbiemri", "text", 'autocomplete="name"')}
            ${f("company", "Kompania (opsionale)", "text", 'autocomplete="organization"')}
            ${f("email", "Email-i", "email", 'autocomplete="email"')}
            ${f("phone", "Telefoni", "tel", 'autocomplete="tel" placeholder="+383 4x xxx xxx"')}
          </div>
          <h3>Adresa e dërgesës</h3>
          <div class="form-grid">
            ${f("address", "Rruga dhe numri", "text", 'autocomplete="street-address"', "full")}
            ${f("city", "Qyteti", "text", 'autocomplete="address-level2"')}
            ${f("zip", "Kodi postar", "text", 'autocomplete="postal-code" inputmode="numeric"')}
          </div>
          <h3>Mënyra e dërgesës</h3>
          <div class="options">
            <label class="option"><input type="radio" name="delivery" value="standard" checked /><span>Dërgesë standarde<small>Arrin ${deliveryDate(2)}</small></span><b id="dStd"></b></label>
            <label class="option"><input type="radio" name="delivery" value="express" /><span>Dërgesë e shpejtë<small>Arrin ${deliveryDate(1)}</small></span><b id="dExp"></b></label>
            <label class="option"><input type="radio" name="delivery" value="pickup" /><span>Marrje në dyqan<small>Gati për 2 orë</small></span><b>Falas</b></label>
          </div>
          <h3>Mënyra e pagesës</h3>
          <div class="options">
            <label class="option"><input type="radio" name="pay" value="cod" checked /><span>Pagesë në dorëzim<small>Me para në dorë ose me kartelë te korrieri</small></span></label>
            <label class="option"><input type="radio" name="pay" value="inst" /><span>Me këste mujore<small>Deri në ${S.installments} muaj me kartelat e bankave partnere</small></span></label>
            <label class="option"><input type="radio" name="pay" value="bank" /><span>Transfertë bankare<small>Faturë pro‑forma me email</small></span></label>
          </div>
        </div>
        <aside class="summary">
          <h3>Përmbledhja e porosisë</h3>
          <ul>${cart.map((l) => `<li><span>${l.qty} × ${esc(byId[l.id].name)}</span><span class="num">${fmt(byId[l.id].price * l.qty)}</span></li>`).join("")}</ul>
          <dl class="totals" id="coTotals"></dl>
          <button class="btn btn--primary btn--block btn--lg" type="submit">Porosit</button>
        </aside>
      </form>`, "modal--checkout");

    const form = $("#checkoutForm");
    const delivery = () => form.delivery.value;
    const update = () => {
      $("#coTotals").innerHTML = totalsHTML(totals(delivery()));
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
      e.target.closest(".field")?.classList.remove("invalid");
    });

    const rules = {
      name: (v) => v.trim().length >= 2 || "Shkruani emrin dhe mbiemrin",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Shkruani një email të vlefshëm, p.sh. emri@kompania.com",
      phone: (v) => v.replace(/\D/g, "").length >= 8 || "Shkruani një numër telefoni me të paktën 8 shifra",
      address: (v) => v.trim().length >= 4 || "Shkruani rrugën dhe numrin",
      city: (v) => v.trim().length >= 2 || "Shkruani qytetin",
      zip: (v) => /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) || "Shkruani një kod postar të vlefshëm, p.sh. 10000",
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
          <h2>Porosia u pranua</h2>
          <p class="muted">Numri i porosisë suaj</p>
          <code>${orderNo}</code>
          <p>Totali <b>${fmt(t.total)}</b>. Në një dyqan real, konfirmimi do të dërgohej te <b>${esc(email)}</b>.</p>
          <button type="button" class="btn btn--primary btn--lg" data-close-modal>Vazhdo blerjen</button>
        </div>`, "modal--success");
    });
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

  /* ================================================================ tema */
  function applyTheme(t) { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
  applyTheme(saved.get("theme", null));
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    applyTheme(dark ? "light" : "dark");
    saved.set("theme", dark ? "light" : "dark");
  });

  /* ================================================================ ngjarjet */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-open],[data-wish],[data-cmp],[data-qty],[data-remove],[data-cat],[data-chip],[data-page],[data-brand],[data-promo],[data-mega],[data-deals],[data-crumb],[data-slide],[data-rail],[data-uncmp],[data-sgall],[data-sgcat],[data-close],[data-close-modal]");
    if (!e.target.closest(".search")) hideSuggest();
    if (!e.target.closest("#mega, #megaBtn")) toggleMega(false);
    if (!t) return;
    const d = t.dataset;
    if (d.add) addToCart(d.add);
    else if (d.wish) toggleWish(d.wish);
    else if (d.cmp) toggleCompare(d.cmp);
    else if (d.open) openProduct(d.open);
    else if (d.qty) setQty(d.qty, cartQty(d.qty) + Number(d.d));
    else if (d.remove) removeLine(d.remove);
    else if (d.uncmp) { compare = compare.filter((x) => x !== d.uncmp); saveCompare(); if ("reopen" in d) compare.length >= 2 ? openCompare() : closeModal(); }
    else if (d.cat) { closeModal(); toggleMega(false); resetFilters(d.cat); render(); goCatalog(); }
    else if (d.mega) { const [c, k, v] = d.mega.split("|"); toggleMega(false); resetFilters(c); state.f[k] = new Set([v]); render(); goCatalog(); }
    else if (d.brand) { resetFilters(); state.brands.add(d.brand); render(); goCatalog(); }
    else if ("deals" in d) { resetFilters(); state.onSale = true; state.sort = "discount"; render(); goCatalog(); }
    else if (d.promo) {
      if (d.promo === "wifi7") { resetFilters("Rrjeti"); state.f.wifi = new Set(["Wi‑Fi 7"]); }
      else { resetFilters("Ruajtja e të dhënave"); state.onSale = true; state.sort = "discount"; }
      render(); goCatalog();
    }
    else if (d.chip) { d.chip === "all" ? (resetFilters(), render()) : removeFilter(d.chip); }
    else if (d.page) { state.page = Number(d.page); renderResults(); goCatalog(); }
    else if (d.crumb) { resetFilters(); render(); if (d.crumb === "home") window.scrollTo({ top: 0 }); else goCatalog(); }
    else if (d.slide) { goSlide(Number(d.slide)); autoSlide(); }
    else if (d.rail) { const r = $("#" + d.rail); r.scrollBy({ left: Number(d.dir) * r.clientWidth * 0.8, behavior: "smooth" }); }
    else if ("sgall" in d) applySearch($("#search").value);
    else if (d.sgcat) applySearch($("#search").value, d.sgcat);
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
  $("#recentClear").addEventListener("click", () => { recent = []; saved.set("recent", recent); renderRecent(); });
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
      else applySearch(search.value);
    } else if (e.key === "Escape") { hideSuggest(); }
  });

  // Sllajderi: ndalon kur miu është sipër; rrëshqitje me gisht
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
  // Rrëshqitja nuk duhet të llogaritet edhe si klik mbi produkt.
  slider.addEventListener("click", (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);

  $("#b2bForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#b2bEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) { toast("Shkruani një email pune, p.sh. ju@kompania.com"); input.focus(); return; }
    toast("Faleminderit! Ky dyqan demo ende nuk dërgon kërkesa për ofertë.");
    input.value = "";
  });

  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing && !modal.open) { e.preventDefault(); search.focus(); }
    if (e.key === "Escape") { closeCart(); closeFilters(); toggleMega(false); hideSuggest(); }
  });

  /* ================================================================ nisja */
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

  // Lidhje e drejtpërdrejtë: index.html#lp-x1c12 hap produktin.
  const hash = location.hash.slice(1);
  if (byId[hash]) openProduct(hash);
})();
