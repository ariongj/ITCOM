/* Lidhja e dyqanit me CMS-in (/admin).
 *
 * CMS-i ruan të dhënat në localStorage të shfletuesit ("itcom-cms-db"), si te Selca dhe Miftari Vision. Kur ato
 * ekzistojnë, dyqani i merr prej andej: produktet, çmimet, stokun, fotot, kategoritë, konfigurimet e dyqanit,
 * faqet informuese dhe banerët e ballinës. Porositë dhe kërkesat për ofertë nga dyqani shkojnë në CMS; nëse
 * CMS-i nuk është hapur ende në këtë shfletues, presin te "itcom-shop-outbox" dhe importohen kur hapet.
 *
 * Ngarkohet pas products.js dhe para app.js. Pa të dhëna nga CMS-i, dyqani punon me katalogun e js/products.js.
 */
(function () {
  "use strict";
  var DB_KEY = "itcom-cms-db";
  var OUTBOX_KEY = "itcom-shop-outbox";
  var SHOP_CATS = { "cat-laptop": ["Laptopë", "laptop"], "cat-cpu": ["Procesorë", "chip"], "cat-gpu": ["Kartela grafike", "gpu"] };
  var BUILDER_CATS = ["cat-mb", "cat-ram", "cat-cooler", "cat-ssd", "cat-psu", "cat-case"];
  var BADGE = { bestseller: "Më i shituri", new: "I ri", premium: "Premium" };
  var KNOWN_BADGES = ["Më i shituri", "I ri", "Premium"];

  function readDb() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      var parsed = raw && JSON.parse(raw);
      return parsed && parsed.state && Array.isArray(parsed.state.products) ? parsed : null;
    } catch (e) { return null; }
  }
  function writeDb(parsed) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(parsed)); return true; } catch (e) { return false; }
  }
  var round2 = function (n) { return Math.round(n * 100) / 100; };
  var sq = function (l) { return (l && (l.sq || l.en || l.me)) || ""; };
  // "/ITCOM/assets/x.webp" → "assets/x.webp"; uploads (data:) and full URLs stay as they are.
  var localSrc = function (src) { return String(src || "").replace(/^(?:\/[^/]+)?\/assets\//, "assets/"); };

  /* ---------------------------------------------------------------- lightweight markdown (CMS pages) */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\[(.+?)\]\(((?:https?:\/\/|\/|#)[^)\s]*)\)/g, '<a href="$2">$1</a>');
  }
  function md(text) {
    var out = [], list = null, first = true;
    var flush = function () { if (list) { out.push("<ul>" + list.join("") + "</ul>"); list = null; } };
    String(text || "").split(/\n/).forEach(function (line) {
      var t = line.trim();
      if (!t) { flush(); return; }
      var m;
      if ((m = t.match(/^#{2,3}\s+(.*)/))) { flush(); out.push("<h3>" + inline(m[1]) + "</h3>"); return; }
      if ((m = t.match(/^[-*]\s+(.*)/))) { (list = list || []).push("<li>" + inline(m[1]) + "</li>"); return; }
      if ((m = t.match(/^>\s?(.*)/))) { flush(); out.push("<blockquote>" + inline(m[1]) + "</blockquote>"); return; }
      flush();
      out.push("<p" + (first ? ' class="lead"' : "") + ">" + inline(t) + "</p>");
      first = false;
    });
    flush();
    return out.join("\n");
  }

  var CMS = { active: false, pages: {}, slides: null, slugToId: {}, md: md };
  window.CMS = CMS;

  /* ---------------------------------------------------------------- CMS → dyqani */
  var parsed = readDb();
  if (parsed) {
    var db = parsed.state;
    var staticById = {};
    (window.PRODUCTS || []).concat(window.BUILDER_PARTS || []).forEach(function (p) { staticById[p.id] = p; });

    // Kategoritë e dyqanit (pjesët e ndërtuesit qëndrojnë jashtë katalogut)
    var cats = (db.categories || []).filter(function (c) { return BUILDER_CATS.indexOf(c.id) < 0; }).sort(function (a, b) { return a.order - b.order; });
    var catName = {};
    var facets = {};
    var categories = cats.map(function (c) {
      var name = sq(c.name) || c.id;
      catName[c.id] = name;
      var orig = SHOP_CATS[c.id];
      facets[name] = (orig && window.FACETS && window.FACETS[orig[0]]) || [];
      return { id: name, icon: orig ? orig[1] : "grid" };
    });

    var shop = [], parts = [];
    (db.products || []).forEach(function (p) {
      if (p.status !== "active" || (p.channels && p.channels.indexOf("online") < 0)) return;
      var builder = BUILDER_CATS.indexOf(p.categoryId) >= 0;
      if (!builder && !catName[p.categoryId]) return;
      var x = p.itcom || {};
      var base = staticById[p.id] || {};
      var sale = p.salePrice != null && p.salePrice < p.price;
      var fromBadges = (p.badges || []).map(function (b) { return BADGE[b]; }).filter(Boolean)[0] || "";
      var badge = fromBadges || (x.badge && KNOWN_BADGES.indexOf(x.badge) < 0 ? x.badge : "");
      var item = {
        id: p.id,
        img: p.images && p.images[0] ? localSrc(p.images[0]) : undefined,
        name: sq(p.name),
        brand: p.vendor || base.brand || "",
        cat: builder ? base.cat || "Komponentë" : catName[p.categoryId],
        price: sale ? p.salePrice : p.price,
        old: sale ? p.price : undefined,
        stock: Math.max(0, (p.stock || 0) - (p.unavailable || 0)),
        rating: x.rating || 0,
        reviews: x.reviews || 0,
        badge: badge || undefined,
        art: x.art || base.art || { s: builder ? "box" : p.categoryId === "cat-gpu" ? "gpu" : p.categoryId === "cat-cpu" ? "cpu" : "laptop", c: "#2b2d31" },
        attrs: x.attrs || base.attrs || {},
        specs: (p.specs || []).map(function (s) { var l = sq(s.label), v = sq(s.value); return l ? l + ": " + v : v; }).filter(Boolean),
        desc: sq(p.description),
      };
      if (p.slug && p.slug !== p.id) CMS.slugToId[p.slug] = p.id;
      (builder ? parts : shop).push(item);
    });

    window.CATEGORIES = categories;
    window.FACETS = facets;
    window.PRODUCTS = shop;
    window.BUILDER_PARTS = parts;

    // Konfigurimet e dyqanit
    var s = db.settings || {};
    var S = window.STORE;
    if (s.companyName) S.name = s.companyName;
    if (s.phone) S.phone = s.phone;
    S.email = s.email && !/\.example$/.test(s.email) ? s.email : S.email;
    S.whatsapp = String(s.whatsapp || "").replace(/\D/g, "") || S.whatsapp;
    if (typeof s.vatRate === "number") S.vatRate = s.vatRate / 100;
    if (typeof s.freeShippingThreshold === "number") S.freeShippingFrom = s.freeShippingThreshold;
    var zone = (s.shippingZones || [])[0];
    if (zone && typeof zone.fee === "number") S.shippingFee = zone.fee;

    // Faqet informuese (sipas slug-ut: returns, warranty, about, business, careers, privacy …)
    (db.pages || []).forEach(function (pg) { if (pg.published) CMS.pages[pg.slug] = { title: sq(pg.title), html: md(sq(pg.body)) }; });

    // Banerët e ballinës
    var now = Date.now();
    var slides = (db.placements || [])
      .filter(function (pl) {
        return pl.kind === "slide" && pl.position === "home-hero" && pl.status === "active" &&
          (!pl.startsAt || Date.parse(pl.startsAt) <= now) && (!pl.endsAt || Date.parse(pl.endsAt) > now);
      })
      .sort(function (a, b) { return a.order - b.order; })
      .map(function (pl) {
        var target = String((pl.cta && pl.cta.href) || "").replace(/^.*#/, "");
        return {
          id: target,
          label: sq(pl.eyebrow),
          title: sq(pl.title),
          text: sq(pl.subtitle),
          img: pl.image ? localSrc(pl.image) : "",
          href: (pl.cta && pl.cta.href) || "",
          cta: sq(pl.cta && pl.cta.label),
        };
      });
    if (slides.length) CMS.slides = slides;
    CMS.active = true;
  }

  /* ---------------------------------------------------------------- dyqani → CMS */
  function push(kind, record) {
    var current = readDb();
    if (current) {
      var st = current.state;
      if (kind === "order") {
        st.orders = [record].concat(st.orders || []);
        record.items.forEach(function (l) {
          var p = (st.products || []).find(function (x) { return x.id === l.productId; });
          if (!p) return;
          p.stock = Math.max(0, (p.stock || 0) - l.qty);
          p.sold = (p.sold || 0) + l.qty;
          st.movements = [{ id: "mv-web-" + record.id + "-" + p.id, productId: p.id, delta: -l.qty, reason: "sale", at: record.createdAt, by: "web", ref: record.number }].concat(st.movements || []);
        });
      } else {
        st.inquiries = [record].concat(st.inquiries || []);
      }
      if (writeDb(current)) return true;
    }
    try {
      var box = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "{}");
      box[kind === "order" ? "orders" : "inquiries"] = (box[kind === "order" ? "orders" : "inquiries"] || []).concat([record]);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(box));
      return true;
    } catch (e) { return false; }
  }

  function nextNumber() {
    var current = readDb();
    var prefix = (current && current.state.settings && current.state.settings.orderPrefix) || "IT-";
    // Before the CMS exists in this browser, orders get their own range (IT-5001…) so the number the customer
    // sees never clashes with the CMS demo orders and stays the same after import.
    var max = current ? 1000 : 5000;
    var all = ((current && current.state.orders) || []).concat((function () { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "{}").orders || []; } catch (e) { return []; } })());
    all.forEach(function (o) { var n = parseInt(String(o.number).replace(/\D/g, ""), 10); if (n > max) max = n; });
    return prefix + (max + 1);
  }

  /** Saves a checkout as a CMS order. `o`: { lines: [{ product, qty }], form, totals, delivery, pay }. Returns the order number. */
  CMS.saveOrder = function (o) {
    var at = new Date().toISOString();
    var number = nextNumber();
    var name = String(o.form.name || "").trim().split(/\s+/);
    var items = o.lines.map(function (l) {
      var p = l.product;
      var service = /^srv-/.test(p.id);
      return {
        productId: service ? "" : p.id, sku: p.id.toUpperCase(), name: p.name, image: p.img ? (/^(data:|https?:)/.test(p.img) ? p.img : new URL(p.img, location.href).pathname) : "",
        unit: "kom", qty: l.qty, options: "", unitPrice: p.price, installation: false, installationPrice: 0,
        lineTotal: round2(p.price * l.qty), discount: 0, allocations: [], custom: service || undefined,
      };
    });
    var notes = [];
    if (o.delivery === "express") notes.push("Dërgesë e shpejtë (+" + window.STORE.expressFee + " €)");
    if (o.pay === "inst") notes.push("Klienti zgjodhi pagesë me këste");
    if (o.form.zip) notes.push("Kodi postar: " + o.form.zip);
    var order = {
      id: "o_" + Date.now().toString(36),
      number: number,
      createdAt: at,
      status: "new",
      customer: {
        firstName: name[0] || "", lastName: name.slice(1).join(" "), email: o.form.email || "", phone: o.form.phone || "",
        city: o.form.city || "", address: o.form.address || "", company: o.form.company || undefined,
      },
      items: items,
      delivery: { method: o.delivery === "pickup" ? "pickup" : "delivery", fee: o.totals.shipping },
      payment: { method: o.pay === "bank" ? "bank" : o.pay === "inst" ? "card" : "cod", status: "pending" },
      coupon: null,
      subtotal: round2(o.totals.subtotal),
      installationTotal: 0,
      discount: 0,
      shipping: round2(o.totals.shipping),
      total: round2(o.totals.total),
      vat: round2(o.totals.vat),
      lang: "sq",
      timeline: [{ at: at, status: "new", by: "web", note: "Porosi nga dyqani online" }],
      internalNote: notes.join(" · ") || undefined,
      seen: false,
      tags: ["online"],
    };
    return push("order", order) ? number : null;
  };

  /** Saves a business quote request in the CMS inbox. */
  CMS.saveInquiry = function (q) {
    return push("inquiry", {
      id: "inq_web_" + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      type: "quote",
      name: q.name || q.email,
      phone: q.phone || "",
      email: q.email,
      message: q.message || "Kërkesë për ofertë nga seksioni ITCOM Business.",
      status: "new",
      seen: false,
      source: "web-form",
      tags: ["b2b"],
    });
  };

  // When the CMS changes data in another tab, reload so the shop shows it.
  var stale = false;
  window.addEventListener("storage", function (e) {
    if (e.key !== DB_KEY) return;
    if (document.hidden) stale = true; else location.reload();
  });
  document.addEventListener("visibilitychange", function () { if (stale && !document.hidden) location.reload(); });
})();
