/* ITCOM storefront — vanilla JS, no build step. */
(() => {
  "use strict";

  const S = window.STORE;
  const PRODUCTS = window.PRODUCTS;
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = new Intl.NumberFormat(S.locale, { style: "currency", currency: S.currency });
  const fmt = (n) => money.format(n);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Storage can be unavailable (private mode, blocked site data) — the store still works, it just won't remember.
  const saved = {
    get(key, fallback) {
      try { const v = localStorage.getItem("itcom:" + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem("itcom:" + key, JSON.stringify(value)); } catch { /* ignore */ }
    },
  };

  /* ---------------------------------------------------------------- icons */
  const ICON = {
    All: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    Laptops: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    Desktops: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 6h4M10 9h4"/><circle cx="12" cy="17" r="1"/>',
    Monitors: '<rect x="2" y="3" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 16v5"/>',
    Networking: '<rect x="2" y="13" width="20" height="7" rx="2"/><path d="M6 16.5h.01M10 16.5h.01M8.5 9.5a5 5 0 0 1 7 0M5.5 6.5a9 9 0 0 1 13 0"/>',
    Storage: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    Peripherals: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    Components: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    Servers: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="18" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6"/>',
  };
  const svg = (paths, cls = "icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const I = {
    cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    undo: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  };

  const CATEGORIES = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
  const PRICE_CEIL = Math.ceil(Math.max(...PRODUCTS.map((p) => p.price)) / 100) * 100;

  /* ---------------------------------------------------------------- state */
  const state = { q: "", cat: "All", brands: new Set(), maxPrice: PRICE_CEIL, inStock: false, onSale: false, sort: "featured" };
  let cart = saved.get("cart", []).filter((l) => byId[l.id] && byId[l.id].stock > 0);
  let wish = new Set(saved.get("wish", []).filter((id) => byId[id]));

  /* ---------------------------------------------------------------- helpers */
  const thumb = (p, extra = "") =>
    `<div class="thumb ${extra}" data-kind="${esc(p.category)}">${svg(ICON[p.category] || ICON.All, "thumb__icon")}<span class="thumb__brand">${esc(p.brand)}</span><span class="thumb__sku">${esc(p.id.toUpperCase())}</span></div>`;

  const stars = (r) => `<span class="stars" style="--pct:${(r / 5) * 100}%" aria-label="Rated ${r} out of 5"></span>`;

  const stockLabel = (p) => {
    if (p.stock === 0) return '<span class="stock stock--out">Out of stock</span>';
    if (p.stock <= 5) return `<span class="stock stock--low">Only ${p.stock} left</span>`;
    return '<span class="stock stock--in">In stock</span>';
  };

  const priceBlock = (p) =>
    p.oldPrice
      ? `<div><span class="price--old">${fmt(p.oldPrice)}</span><span class="price price--sale">${fmt(p.price)}</span></div>`
      : `<div><span class="price">${fmt(p.price)}</span></div>`;

  const cartQty = (id) => cart.find((l) => l.id === id)?.qty || 0;

  /* ---------------------------------------------------------------- filtering */
  function matches(p, { ignoreBrand = false } = {}) {
    if (state.cat !== "All" && p.category !== state.cat) return false;
    if (!ignoreBrand && state.brands.size && !state.brands.has(p.brand)) return false;
    if (p.price > state.maxPrice) return false;
    if (state.inStock && p.stock === 0) return false;
    if (state.onSale && !p.oldPrice) return false;
    if (state.q) {
      const hay = [p.name, p.brand, p.category, p.id, ...p.specs].join(" ").toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    return true;
  }

  const SORTS = {
    featured: (a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || (b.stock > 0) - (a.stock > 0) || b.reviews - a.reviews,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
    name: (a, b) => a.name.localeCompare(b.name),
  };

  /* ---------------------------------------------------------------- rendering: catalogue */
  function renderCategoryNav() {
    $("#categoryNav").innerHTML = CATEGORIES.map(
      (c) => `<li><button type="button" data-cat="${esc(c)}" aria-pressed="${state.cat === c}">${svg(ICON[c])}${c === "All" ? "All products" : esc(c)}</button></li>`
    ).join("");
  }

  function renderFilters() {
    const countIn = (c) => PRODUCTS.filter((p) => c === "All" || p.category === c).length;
    $("#catFilters").innerHTML = CATEGORIES.map(
      (c) => `<label class="check"><input type="radio" name="cat" value="${esc(c)}" ${state.cat === c ? "checked" : ""}/> ${c === "All" ? "All products" : esc(c)} <span class="count">${countIn(c)}</span></label>`
    ).join("");

    const pool = PRODUCTS.filter((p) => matches(p, { ignoreBrand: true }));
    const brands = [...new Set(PRODUCTS.filter((p) => state.cat === "All" || p.category === state.cat).map((p) => p.brand))].sort();
    $("#brandFilters").innerHTML = brands.map((b) => {
      const n = pool.filter((p) => p.brand === b).length;
      return `<label class="check"><input type="checkbox" value="${esc(b)}" ${state.brands.has(b) ? "checked" : ""}/> ${esc(b)} <span class="count">${n}</span></label>`;
    }).join("");

    const range = $("#priceRange");
    range.max = PRICE_CEIL;
    range.value = state.maxPrice;
    $("#priceOut").textContent = state.maxPrice >= PRICE_CEIL ? "Any" : "≤ " + fmt(state.maxPrice);
    $("#inStock").checked = state.inStock;
    $("#onSale").checked = state.onSale;
    $("#sort").value = state.sort;
  }

  function card(p) {
    const wished = wish.has(p.id);
    const inCart = cartQty(p.id) > 0;
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media" data-open="${p.id}">
          ${thumb(p)}
          ${p.oldPrice ? `<span class="tag tag--sale">−${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ""}
          ${p.badge ? `<span class="tag">${esc(p.badge)}</span>` : ""}
        </div>
        <button class="icon-btn wish ${wished ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${wished}" aria-label="${wished ? "Remove from" : "Add to"} wishlist">${svg(I.heart)}</button>
        <div class="card__body">
          <span class="card__cat">${esc(p.category)} · ${esc(p.brand)}</span>
          <h3 class="card__title" data-open="${p.id}">${esc(p.name)}</h3>
          <p class="card__specs">${esc(p.specs.slice(0, 3).join(" · "))}</p>
          <div class="rating">${stars(p.rating)} ${p.rating} <span>(${p.reviews})</span></div>
          <div class="card__foot">
            <div>${priceBlock(p)}${stockLabel(p)}</div>
            <button class="btn btn--primary add-btn ${inCart ? "added" : ""}" data-add="${p.id}" ${p.stock === 0 ? "disabled" : ""} aria-label="Add ${esc(p.name)} to cart">${svg(inCart ? I.check : I.plus)}</button>
          </div>
        </div>
      </article>`;
  }

  function renderChips() {
    const chips = [];
    if (state.q) chips.push(["q", `“${esc(state.q)}”`]);
    if (state.cat !== "All") chips.push(["cat", esc(state.cat)]);
    state.brands.forEach((b) => chips.push(["brand:" + b, esc(b)]));
    if (state.maxPrice < PRICE_CEIL) chips.push(["price", "≤ " + fmt(state.maxPrice)]);
    if (state.inStock) chips.push(["inStock", "In stock"]);
    if (state.onSale) chips.push(["onSale", "On sale"]);
    $("#activeChips").innerHTML = chips.map(([k, label]) => `<button class="chip" data-chip="${esc(k)}" aria-label="Remove filter ${label}">${label}${svg(I.x)}</button>`).join("");
  }

  function renderGrid() {
    const list = PRODUCTS.filter((p) => matches(p)).sort(SORTS[state.sort]);
    $("#grid").innerHTML = list.map(card).join("");
    $("#empty").hidden = list.length > 0;
    $("#resultsTitle").textContent = state.cat === "All" ? "All products" : state.cat;
    $("#resultsCount").textContent = `${list.length} ${list.length === 1 ? "product" : "products"}`;
    renderChips();
  }

  function render() {
    renderCategoryNav();
    renderFilters();
    renderGrid();
  }

  function setCat(c) {
    state.cat = c;
    // Brand selections that no longer exist in this category would hide everything.
    const valid = new Set(PRODUCTS.filter((p) => c === "All" || p.category === c).map((p) => p.brand));
    state.brands.forEach((b) => valid.has(b) || state.brands.delete(b));
    render();
  }

  function resetFilters() {
    Object.assign(state, { q: "", cat: "All", maxPrice: PRICE_CEIL, inStock: false, onSale: false });
    state.brands.clear();
    $("#search").value = "";
    render();
  }

  /* ---------------------------------------------------------------- cart */
  function saveCart() { saved.set("cart", cart); }

  function addToCart(id, qty = 1) {
    const p = byId[id];
    if (!p || p.stock === 0) return;
    const line = cart.find((l) => l.id === id);
    const current = line ? line.qty : 0;
    const next = Math.min(p.stock, current + qty);
    if (next === current) { toast(`Only ${p.stock} of this item in stock`); return; }
    if (line) line.qty = next; else cart.push({ id, qty: next });
    saveCart();
    renderCart();
    renderGrid();
    bump("#cartCount");
    toast(`Added <b>${esc(p.name)}</b> to cart`, { label: "View cart", fn: openCart });
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
    renderGrid();
    toast(`Removed ${esc(byId[id].name)}`, {
      label: "Undo",
      fn: () => { cart.splice(idx, 0, removed); saveCart(); renderCart(); renderGrid(); },
    });
  }

  function totals(delivery = "standard") {
    const items = cart.reduce((n, l) => n + l.qty, 0);
    const subtotal = cart.reduce((s, l) => s + byId[l.id].price * l.qty, 0);
    const savings = cart.reduce((s, l) => s + ((byId[l.id].oldPrice || byId[l.id].price) - byId[l.id].price) * l.qty, 0);
    let shipping = subtotal >= S.freeShippingFrom ? 0 : S.shippingFee;
    if (delivery === "express") shipping += 14.9;
    if (delivery === "pickup") shipping = 0;
    const total = subtotal + shipping;
    const vat = total - total / (1 + S.vatRate);
    return { items, subtotal, savings, shipping, total, vat };
  }

  function totalsHTML(t) {
    return `
      <dt>Subtotal (${t.items} ${t.items === 1 ? "item" : "items"})</dt><dd>${fmt(t.subtotal)}</dd>
      ${t.savings > 0 ? `<dt>You save</dt><dd class="save">−${fmt(t.savings)}</dd>` : ""}
      <dt>Delivery</dt><dd>${t.shipping === 0 ? "Free" : fmt(t.shipping)}</dd>
      <dt>incl. VAT ${Math.round(S.vatRate * 100)}%</dt><dd>${fmt(t.vat)}</dd>
      <dt class="grand">Total</dt><dd class="grand">${fmt(t.total)}</dd>`;
  }

  function renderCart() {
    const t = totals();
    const drawer = $("#cart");
    drawer.classList.toggle("is-empty", cart.length === 0);

    const count = $("#cartCount");
    count.textContent = t.items;
    count.hidden = t.items === 0;

    const left = S.freeShippingFrom - t.subtotal;
    const pct = Math.min(100, (t.subtotal / S.freeShippingFrom) * 100);
    $("#shipMeter").innerHTML = (left > 0
      ? `Add <b>${fmt(left)}</b> more for free delivery`
      : `<strong>You've unlocked free delivery</strong>`) + `<div class="bar"><i style="width:${pct}%"></i></div>`;

    $("#cartList").innerHTML = cart.map((l) => {
      const p = byId[l.id];
      return `
        <li class="cart-item">
          ${thumb(p, "thumb--sm")}
          <div>
            <h4>${esc(p.name)}</h4>
            <span class="muted">${fmt(p.price)} each</span>
            <div class="qty" role="group" aria-label="Quantity">
              <button type="button" data-qty="${p.id}" data-d="-1" aria-label="Decrease quantity">−</button>
              <span>${l.qty}</span>
              <button type="button" data-qty="${p.id}" data-d="1" ${l.qty >= p.stock ? "disabled" : ""} aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="cart-item__right">
            <b class="num">${fmt(p.price * l.qty)}</b>
            <button type="button" class="remove" data-remove="${p.id}">Remove</button>
          </div>
        </li>`;
    }).join("");

    $("#cartTotals").innerHTML = totalsHTML(t);
  }

  /* ---------------------------------------------------------------- drawers & modal */
  const overlay = $("#overlay");
  let lastFocus = null;

  function openCart() {
    closeModal();
    lastFocus = document.activeElement;
    $("#cart").classList.add("open");
    $("#cart").setAttribute("aria-hidden", "false");
    overlay.hidden = false;
    $("#cart [data-close]").focus();
  }
  function closeCart() {
    $("#cart").classList.remove("open");
    $("#cart").setAttribute("aria-hidden", "true");
    if (!$("#filters").classList.contains("open")) overlay.hidden = true;
    lastFocus?.focus?.();
  }
  function openFilters() { $("#filters").classList.add("open"); overlay.hidden = false; }
  function closeFilters() {
    $("#filters").classList.remove("open");
    if (!$("#cart").classList.contains("open")) overlay.hidden = true;
  }

  const modal = $("#modal");
  function openModal(html, cls = "") {
    $("#modalBody").innerHTML = html;
    modal.className = "modal " + cls;
    if (!modal.open) modal.showModal();
    modal.scrollTop = 0;
  }
  function closeModal() { if (modal.open) modal.close(); }

  function openProduct(id) {
    const p = byId[id];
    if (!p) return;
    const related = [
      ...PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id),
      ...PRODUCTS.filter((x) => x.category !== p.category && x.brand === p.brand),
    ].slice(0, 4);
    const wished = wish.has(p.id);
    openModal(`
      <div class="pdp">
        <div>${thumb(p, "thumb--lg")}</div>
        <div class="pdp__info">
          <span class="card__cat">${esc(p.category)} · ${esc(p.brand)} · <span class="mono">SKU ${esc(p.id.toUpperCase())}</span></span>
          <h2>${esc(p.name)}</h2>
          <div class="rating">${stars(p.rating)} ${p.rating} · ${p.reviews} reviews</div>
          <div class="pdp__price">
            <span class="price ${p.oldPrice ? "price--sale" : ""}">${fmt(p.price)}</span>
            ${p.oldPrice ? `<span class="price--old">${fmt(p.oldPrice)}</span><span class="pdp__save">Save ${fmt(p.oldPrice - p.price)}</span>` : ""}
          </div>
          <p class="pdp__vat">incl. ${Math.round(S.vatRate * 100)}% VAT · ${stockLabel(p)}</p>
          <p>${esc(p.desc)}</p>
          <ul class="pdp__specs">${p.specs.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
          <div class="pdp__buy">
            <div class="qty" role="group" aria-label="Quantity">
              <button type="button" id="pdpMinus" aria-label="Decrease quantity">−</button>
              <span id="pdpQty">1</span>
              <button type="button" id="pdpPlus" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn btn--primary btn--lg" id="pdpAdd" ${p.stock === 0 ? "disabled" : ""}>${svg(I.cart)} ${p.stock === 0 ? "Out of stock" : "Add to cart"}</button>
            <button class="icon-btn wish-lg ${wished ? "is-active" : ""}" data-wish="${p.id}" aria-pressed="${wished}" aria-label="${wished ? "Remove from" : "Add to"} wishlist">${svg(I.heart)}</button>
          </div>
          <ul class="pdp__perks">
            <li>${svg(I.truck)} Delivery in 2–3 working days, free over ${fmt(S.freeShippingFrom)}</li>
            <li>${svg(I.shield)} 24‑month manufacturer warranty</li>
            <li>${svg(I.undo)} 30‑day returns</li>
          </ul>
        </div>
      </div>
      ${related.length ? `
      <div class="related">
        <h3>You may also need</h3>
        <div class="related__grid">
          ${related.map((r) => `<button type="button" class="mini" data-open="${r.id}">${thumb(r)}<h4>${esc(r.name)}</h4><span class="price">${fmt(r.price)}</span></button>`).join("")}
        </div>
      </div>` : ""}
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
  }

  function openWishlist() {
    const items = PRODUCTS.filter((p) => wish.has(p.id));
    openModal(`
      <div class="wishlist">
        <h2>Wishlist</h2>
        ${items.length
          ? `<div class="grid">${items.map(card).join("")}</div>`
          : `<div class="empty">${svg(I.heart, "icon icon--xl")}<h3>Nothing saved yet</h3><p class="muted">Tap the heart on any product to keep it here.</p></div>`}
      </div>`, "modal--wish");
  }

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
    toast(wish.has(id) ? `Saved <b>${esc(byId[id].name)}</b> to wishlist` : "Removed from wishlist");
  }

  function renderWishCount() {
    const el = $("#wishCount");
    el.textContent = wish.size;
    el.hidden = wish.size === 0;
  }

  /* ---------------------------------------------------------------- checkout */
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
          <p class="muted">Demo store — no order is placed and no payment is taken.</p>

          <h3>Contact</h3>
          <div class="form-grid">
            ${f("name", "Full name", "text", 'autocomplete="name" required')}
            ${f("company", "Company (optional)", "text", 'autocomplete="organization"')}
            ${f("email", "Email", "email", 'autocomplete="email" required')}
            ${f("phone", "Phone", "tel", 'autocomplete="tel" required')}
          </div>

          <h3>Delivery</h3>
          <div class="form-grid">
            ${f("address", "Street address", "text", 'autocomplete="street-address" required', "full")}
            ${f("city", "City", "text", 'autocomplete="address-level2" required')}
            ${f("zip", "Postcode", "text", 'autocomplete="postal-code" required inputmode="numeric"')}
          </div>
          <div class="options" style="margin-top:12px">
            <label class="option"><input type="radio" name="delivery" value="standard" checked /><span>Standard delivery<small>2–3 working days</small></span><b id="dStd"></b></label>
            <label class="option"><input type="radio" name="delivery" value="express" /><span>Express delivery<small>Next working day</small></span><b id="dExp"></b></label>
            <label class="option"><input type="radio" name="delivery" value="pickup" /><span>Store pickup<small>Ready in 2 hours</small></span><b>Free</b></label>
          </div>

          <h3>Payment</h3>
          <div class="options">
            <label class="option"><input type="radio" name="pay" value="cod" checked /><span>Pay on delivery<small>Cash or card to the courier</small></span></label>
            <label class="option"><input type="radio" name="pay" value="bank" /><span>Bank transfer<small>Pro‑forma invoice sent by email</small></span></label>
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
    const updateTotals = () => {
      const t = totals(delivery());
      $("#coTotals").innerHTML = totalsHTML(t);
      const base = totals("standard").shipping;
      $("#dStd").textContent = base === 0 ? "Free" : fmt(base);
      $("#dExp").textContent = fmt(base + 14.9);
    };
    updateTotals();
    form.addEventListener("change", updateTotals);
    form.addEventListener("input", (e) => {
      if (!e.target.name || e.target.type === "radio") return;
      const d = saved.get("checkout", {});
      d[e.target.name] = e.target.value;
      saved.set("checkout", d);
      e.target.closest(".field")?.classList.remove("invalid");
    });

    const rules = {
      name: (v) => v.trim().length >= 2 || "Enter your full name",
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email, like name@company.com",
      phone: (v) => v.replace(/\D/g, "").length >= 8 || "Enter a phone number with at least 8 digits",
      address: (v) => v.trim().length >= 4 || "Enter your street and number",
      city: (v) => v.trim().length >= 2 || "Enter your city",
      zip: (v) => /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) || "Enter a valid postcode",
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
      renderGrid();
      openModal(`
        <div class="success">
          <div class="success__icon">${svg(I.check)}</div>
          <h2>Order placed</h2>
          <p class="muted">Your order number is</p>
          <code>${orderNo}</code>
          <p>Total <b>${fmt(t.total)}</b>. In a live store, the confirmation would go to <b>${esc(email)}</b>.</p>
          <button class="btn btn--primary btn--lg" data-close-modal>Continue shopping</button>
        </div>`, "modal--success");
    });
  }

  /* ---------------------------------------------------------------- toast */
  let toastTimer;
  function toast(html, action) {
    const el = $("#toast");
    el.innerHTML = `<span>${html}</span>` + (action ? `<button type="button">${action.label}</button>` : "");
    if (action) el.querySelector("button").onclick = () => { el.classList.remove("show"); action.fn(); };
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
  }

  function bump(sel) {
    const el = $(sel);
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  /* ---------------------------------------------------------------- theme */
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme(saved.get("theme", null));
  $("#themeToggle").addEventListener("click", () => {
    const root = document.documentElement;
    const dark = root.dataset.theme === "dark" || (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    applyTheme(next);
    saved.set("theme", next);
  });

  /* ---------------------------------------------------------------- events */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-add],[data-open],[data-wish],[data-qty],[data-remove],[data-cat],[data-chip],[data-jump-cat],[data-close],[data-close-modal]");
    if (!t) return;
    const d = t.dataset;
    if (d.add) addToCart(d.add);
    else if (d.wish) toggleWish(d.wish);
    else if (d.open) openProduct(d.open);
    else if (d.qty) setQty(d.qty, cartQty(d.qty) + Number(d.d));
    else if (d.remove) removeLine(d.remove);
    else if (d.cat) setCat(d.cat);
    else if (d.jumpCat) { setCat(d.jumpCat); $("#catalog").scrollIntoView(); }
    else if (d.chip) {
      const k = d.chip;
      if (k === "q") { state.q = ""; $("#search").value = ""; }
      else if (k === "cat") state.cat = "All";
      else if (k.startsWith("brand:")) state.brands.delete(k.slice(6));
      else if (k === "price") state.maxPrice = PRICE_CEIL;
      else state[k] = false;
      render();
    }
    else if ("close" in d) closeCart();
    else if ("closeModal" in d) closeModal();
  });

  // Category clicks in the header/footer also bring the grid into view.
  $("#categoryNav").addEventListener("click", (e) => { if (e.target.closest("[data-cat]")) $("#catalog").scrollIntoView(); });

  $("#catFilters").addEventListener("change", (e) => setCat(e.target.value));
  $("#brandFilters").addEventListener("change", (e) => {
    if (e.target.checked) state.brands.add(e.target.value); else state.brands.delete(e.target.value);
    render();
  });
  $("#priceRange").addEventListener("input", (e) => {
    state.maxPrice = Number(e.target.value);
    $("#priceOut").textContent = state.maxPrice >= PRICE_CEIL ? "Any" : "≤ " + fmt(state.maxPrice);
    renderGrid();
  });
  $("#priceRange").addEventListener("change", renderFilters);
  $("#inStock").addEventListener("change", (e) => { state.inStock = e.target.checked; render(); });
  $("#onSale").addEventListener("change", (e) => { state.onSale = e.target.checked; render(); });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = e.target.value.trim(); render(); }, 120);
  });
  $("#search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); $("#catalog").scrollIntoView(); }
  });

  $("#resetFilters").addEventListener("click", resetFilters);
  $("#emptyReset").addEventListener("click", resetFilters);
  $("#openFilters").addEventListener("click", openFilters);
  $("#closeFilters").addEventListener("click", closeFilters);
  $("#cartBtn").addEventListener("click", openCart);
  $("#wishlistBtn").addEventListener("click", openWishlist);
  $("#checkoutBtn").addEventListener("click", openCheckout);
  overlay.addEventListener("click", () => { closeCart(); closeFilters(); });
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  $("#b2bForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#b2bEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
      toast("Enter a work email, like you@company.com");
      input.focus();
      return;
    }
    toast(`Thanks! This demo doesn't send quote requests yet.`);
    input.value = "";
  });

  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (e.key === "/" && !typing && !modal.open) { e.preventDefault(); $("#search").focus(); }
    if (e.key === "Escape") { closeCart(); closeFilters(); }
  });

  /* ---------------------------------------------------------------- static bits */
  $("#footerCats").innerHTML = CATEGORIES.slice(1).map((c) => `<li><button type="button" data-jump-cat="${esc(c)}">${esc(c)}</button></li>`).join("");
  $("#year").textContent = new Date().getFullYear();

  const heroPicks = [byId["lp-001"], byId["mn-001"]].filter(Boolean);
  ["#heroCardA", "#heroCardB"].forEach((sel, i) => {
    const p = heroPicks[i];
    if (!p) return;
    const el = $(sel);
    el.dataset.open = p.id;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `View ${p.name}`);
    el.innerHTML = `${thumb(p)}<h3>${esc(p.name)}</h3><div class="hero__card-row">${priceBlock(p)}${stockLabel(p)}</div>`;
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProduct(p.id); } });
  });

  render();
  renderCart();
  renderWishCount();

  // Deep link: #lp-001 opens that product.
  const hash = location.hash.slice(1);
  if (byId[hash]) openProduct(hash);
})();
