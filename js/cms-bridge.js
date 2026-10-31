/* Lidhja e dyqanit me CMS-in (/admin).
 *
 * Burimi i të dhënave, sipas radhës:
 *   1. CMS-i në këtë shfletues (localStorage "itcom-cms-db") — stafi sheh menjëherë ndryshimet e veta;
 *   2. versioni i publikuar (js/cms-data.js, window.ITCOM_PUBLISHED) — çdo vizitor, pasi stafi shtyp "Publiko";
 *   3. katalogu i js/products.js.
 * Prej andej merren produktet, çmimet, stoku, fotot, kategoritë, konfigurimet, faqet, banerët, koleksionet,
 * zbritjet, fushatat, blogu, menutë dhe shërbimet. Porositë, pyetjet dhe terminet shkojnë në CMS (ose presin te
 * "itcom-shop-outbox" derisa CMS-i të hapet) dhe, kur është caktuar, edhe te kanali i porosive (webhook).
 *
 * Ngarkohet pas products.js dhe cms-data.js, para app.js.
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

  var CMS = {
    active: false, source: null, preview: false, pages: {}, slides: null, slugToId: {}, md: md,
    collections: [], discounts: [], offers: [], announcements: [], banners: [], posts: [], services: [], menus: null, endpoint: "",
  };
  window.CMS = CMS;

  /* ---------------------------------------------------------------- CMS → dyqani */
  var parsed = readDb();
  CMS.source = parsed ? "local" : null;
  var pub = window.ITCOM_PUBLISHED;
  if (!parsed && pub && pub.state && Array.isArray(pub.state.products)) { parsed = pub; CMS.source = "published"; }
  // ?preview=1 nga CMS-i: stafi sheh edhe draftet (vetëm me të dhënat e veta, jo te vizitorët).
  CMS.preview = CMS.source === "local" && /[?&]preview=1(&|$)/.test(location.search);
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

    var shop = [], parts = [], featured = [];
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
        imgs: (p.images || []).map(localSrc),
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
      if (p.featured && !builder) featured.push(p.id);
      (builder ? parts : shop).push(item);
    });

    CMS.featured = featured;
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
    if ((s.shippingZones || []).length) S.zones = s.shippingZones;
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
          type: pl.slideType || "",
          label: sq(pl.eyebrow),
          title: sq(pl.title),
          text: sq(pl.subtitle),
          img: pl.image ? localSrc(pl.image) : "",
          href: (pl.cta && pl.cta.href) || "",
          cta: sq(pl.cta && pl.cta.label),
          caption: pl.slideType === "launch" ? sq(pl.alt) : "",
        };
      });

    /* ---- Moduli i marketingut dhe përmbajtjes ---- */
    var live = function (x) {
      if (!x) return false;
      if (CMS.preview && x.status !== "archived") return true;
      return (x.status === "active" || x.published === true) &&
        (!x.startsAt || Date.parse(x.startsAt) <= now) && (!x.endsAt || Date.parse(x.endsAt) > now);
    };
    var slugify = function (t) { return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
    var shopIds = {};
    shop.forEach(function (p) { shopIds[p.id] = true; });
    var rawById = {};
    (db.products || []).forEach(function (p) { rawById[p.id] = p; });

    // Koleksionet: të zgjedhura me dorë ose sipas rregullave (kategoria, çmimi, zbritja, marka …)
    var fieldOf = function (p, f) {
      var sale = p.salePrice != null && p.salePrice < p.price;
      switch (f) {
        case "category": return p.categoryId;
        case "price": return sale ? p.salePrice : p.price;
        case "compareAt": return sale ? p.price : 0;
        case "stock": return p.stock;
        case "status": return p.status;
        case "title": return sq(p.name);
        case "vendor": return p.vendor || "";
        case "onSale": return sale ? "true" : "false";
        case "tag": return (p.tags || []).join("|");
        case "badge": return (p.badges || []).join("|");
        default: return "";
      }
    };
    var ruleOk = function (p, r) {
      var v = fieldOf(p, r.field), want = r.value;
      if (r.field === "tag" || r.field === "badge") { var has = String(v).split("|").indexOf(want) >= 0; return r.op === "neq" ? !has : has; }
      if (r.op === "gt") return Number(v) > Number(want);
      if (r.op === "lt") return Number(v) < Number(want);
      if (r.op === "contains") return String(v).toLowerCase().indexOf(String(want).toLowerCase()) >= 0;
      if (r.op === "neq") return String(v) !== String(want);
      return String(v) === String(want);
    };
    function members(c) {
      var ids;
      if (c.kind === "manual") ids = (c.productIds || []).slice();
      else ids = (db.products || []).filter(function (p) {
        var rules = c.rules || [];
        if (!rules.length) return false;
        return c.match === "any" ? rules.some(function (r) { return ruleOk(p, r); }) : rules.every(function (r) { return ruleOk(p, r); });
      }).map(function (p) { return p.id; });
      ids = ids.filter(function (id) { return shopIds[id]; });
      var price = function (id) { var p = rawById[id]; return p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price; };
      if (c.sort === "price-asc") ids.sort(function (a, b) { return price(a) - price(b); });
      else if (c.sort === "price-desc") ids.sort(function (a, b) { return price(b) - price(a); });
      else if (c.sort === "bestselling") ids.sort(function (a, b) { return (rawById[b].sold || 0) - (rawById[a].sold || 0); });
      else if (c.sort === "newest") ids.sort(function (a, b) { return String(rawById[b].createdAt).localeCompare(String(rawById[a].createdAt)); });
      return ids;
    }
    var colById = {};
    (db.collections || []).forEach(function (c) {
      var item = { id: c.id, slug: c.slug, title: sq(c.title), tagline: sq(c.tagline), description: sq(c.description), guide: sq(c.guide), image: c.image ? localSrc(c.image) : "", productIds: members(c), published: !!c.published };
      colById[c.id] = item;
      if (c.published || CMS.preview) CMS.collections.push(item);
    });
    var targetIds = function (t) {
      if (!t || t.scope === "all") return null;
      if (t.scope === "products") return (t.ids || []).slice();
      var out = [];
      (t.ids || []).forEach(function (cid) { var c = colById[cid]; if (c) out = out.concat(c.productIds); });
      return out;
    };

    // Zbritjet aktive (vetëm për të gjithë klientët: dyqani nuk i njeh segmentet e klientëve)
    (db.discounts || []).forEach(function (d) {
      var ok = CMS.preview ? d.status !== "paused" : live(d);
      if (!ok || (d.audience && d.audience.type !== "all")) return;
      if (d.usageLimit && (d.uses || 0) >= d.usageLimit) return;
      CMS.discounts.push({
        id: d.id, title: sq(d.publicTitle) || d.title, kind: d.kind, method: d.method, code: d.code ? String(d.code).toUpperCase() : "",
        valueType: d.valueType, value: Number(d.value) || 0, eligible: targetIds(d.appliesTo), perItem: !!d.perItem,
        minimum: d.minimum || { type: "none", value: 0 }, combines: d.combines || { products: false, order: false, shipping: false },
        maxRate: d.shipping && d.shipping.maxRate,
        bxgy: d.bxgy ? {
          buy: targetIds({ scope: d.bxgy.buyScope, ids: d.bxgy.buyIds }), buyQty: d.bxgy.buyQty || 1,
          get: targetIds({ scope: d.bxgy.getScope, ids: d.bxgy.getIds }), getQty: d.bxgy.getQty || 1,
          free: d.bxgy.getType === "free", pct: d.bxgy.getValue || 0, max: d.bxgy.maxUses || 0,
        } : null,
      });
    });
    var discById = {};
    CMS.discounts.forEach(function (d) { discById[d.id] = d; });

    // Fushatat (qendra e ofertave): faqe e vetë, shiriti i njoftimeve, baner në katalog, blloku në ballinë
    (db.offers || []).forEach(function (o) {
      if (!live(o)) return;
      var d = o.discountId && (db.discounts || []).find(function (x) { return x.id === o.discountId; });
      var ids = o.productIds && o.productIds.length ? o.productIds.filter(function (id) { return shopIds[id]; }) : o.collectionId && colById[o.collectionId] ? colById[o.collectionId].productIds : [];
      CMS.offers.push({
        id: o.id, slug: o.slug, name: sq(o.name), badge: sq(o.badge), image: o.image ? localSrc(o.image) : "",
        title: sq(o.landing && o.landing.title) || sq(o.name), text: sq(o.landing && o.landing.text) || sq(o.description),
        placements: o.placements || [], productIds: ids, code: d && d.method === "code" && discById[d.id] ? discById[d.id].code : "",
        endsAt: o.endsAt || "",
      });
    });
    CMS.offers.forEach(function (o) {
      if (o.placements.indexOf("announcement") >= 0) CMS.announcements.push({ text: o.badge ? o.badge + " · " + o.name : o.name, href: "#/oferta/" + o.slug });
    });
    (db.placements || []).forEach(function (pl) {
      if (!live(pl)) return;
      var item = { title: sq(pl.title), text: sq(pl.subtitle), eyebrow: sq(pl.eyebrow), image: pl.image ? localSrc(pl.image) : "", href: (pl.cta && pl.cta.href) || "", cta: sq(pl.cta && pl.cta.label), order: pl.order || 0, position: pl.position };
      if (pl.kind === "announcement") CMS.announcements.push({ text: item.title || item.text, href: item.href });
      else if (pl.kind === "banner") CMS.banners.push(item);
    });
    CMS.offers.forEach(function (o) {
      if (o.placements.indexOf("banner") >= 0) CMS.banners.push({ title: o.title, text: o.text, eyebrow: o.badge, image: o.image, href: "#/oferta/" + o.slug, cta: "Shiko ofertën", order: 99, position: "catalog" });
      if (o.placements.indexOf("home-block") >= 0) CMS.banners.push({ title: o.title, text: o.text, eyebrow: o.badge, image: o.image, href: "#/oferta/" + o.slug, cta: "Shiko ofertën", order: 99, position: "home-banner" });
    });
    CMS.banners.sort(function (a, b) { return a.order - b.order; });
    // Ofertat me vendin "hero" bëhen slajde me kushtet dhe afatin e tyre (lloji "offer").
    CMS.offers.forEach(function (o) {
      if (o.placements.indexOf("hero") < 0) return;
      slides.push({ type: "offer", label: o.badge || "Ofertë", title: o.title, text: o.text, img: o.image, href: "#/oferta/" + o.slug, cta: "Shiko ofertën", ends: o.endsAt, code: o.code });
    });
    if (slides.length) CMS.slides = slides;

    // Blogu (Këshilla)
    CMS.posts = (db.posts || []).filter(function (p) { return (p.published && Date.parse(p.publishedAt) <= now) || CMS.preview; })
      .sort(function (a, b) { return String(b.publishedAt).localeCompare(String(a.publishedAt)); })
      .map(function (p) {
        return { slug: p.slug, title: sq(p.title), excerpt: sq(p.excerpt), html: md(sq(p.body)), cover: p.cover ? localSrc(p.cover) : "", tag: sq(p.tag), author: p.author || "ITCOM", minutes: p.readMinutes || 3, date: p.publishedAt, draft: !p.published };
      });

    // Shërbimet që klientët mund t'i rezervojnë
    CMS.services = (db.services || []).map(function (sv) {
      return { id: sv.id, name: sq(sv.name), description: sq(sv.description), duration: sv.durationMin || 30, price: sv.price, onsite: sv.location === "onsite" };
    });
    CMS.hours = sq(s.hours);
    CMS.endpoint = String(s.orderEndpoint || "");

    // Menutë: lidhjet e kokës dhe kolonat e fundit të faqes
    var pageSlug = {};
    (db.pages || []).forEach(function (pg) { pageSlug[pg.id] = pg.slug; });
    var link = function (it) {
      var t = String(it.target || "");
      switch (it.type) {
        case "page": return "#info-" + (pageSlug[t] || t);
        case "category": return catName[t] ? "#/kategoria/" + slugify(catName[t]) : "#/produktet";
        case "collection": return colById[t] ? "#/koleksioni/" + colById[t].slug : "#/produktet";
        case "product": return "p/" + t + "/";
        case "offer": { var o = (db.offers || []).find(function (x) { return x.id === t || x.slug === t; }); return o ? "#/oferta/" + o.slug : "#/ofertat"; }
        default: return t.replace(/^\/(?=#)/, "");
      }
    };
    var mapItems = function (items) { return (items || []).map(function (it) { return { label: sq(it.label), href: link(it), children: mapItems(it.children) }; }); };
    (db.menus || []).forEach(function (m) {
      CMS.menus = CMS.menus || {};
      CMS.menus[m.handle] = mapItems(m.items);
    });
    // Menuja "Kategoritë": grupe (lidhje #/kategoria/<grupi>) me nënkategori (kategori produktesh ose lidhje).
    var catMenu = (db.menus || []).find(function (m) { return m.handle === "categories"; });
    if (catMenu && catMenu.items && catMenu.items.length) {
      var defaults = {};
      (window.CATEGORY_GROUPS || []).forEach(function (g) { defaults[g.slug] = g; g.subs.forEach(function (x) { defaults["sub:" + x.slug] = x; }); });
      var slugOf = function (it) {
        if (it.type === "category" && catName[it.target]) return slugify(catName[it.target]);
        var m2 = String(it.target || "").match(/#\/kategoria\/([^/?]+)/);
        return m2 ? m2[1] : slugify(sq(it.label));
      };
      CMS.categoryGroups = catMenu.items.map(function (g) {
        var slug = slugOf(g), d = defaults[slug] || {};
        return {
          slug: slug, name: sq(g.label), nav: d.nav, icon: d.icon || "layers",
          subs: (g.children || []).map(function (c) {
            var cs = slugOf(c), dd = defaults["sub:" + cs] || {};
            return { slug: cs, name: sq(c.label), cat: c.type === "category" ? catName[c.target] : undefined, builder: !!dd.builder };
          }),
        };
      });
    }
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
        (record.discounts || []).forEach(function (a) {
          var d = (st.discounts || []).find(function (x) { return x.id === a.id; });
          if (d) d.uses = (d.uses || 0) + 1;
        });
      } else if (kind === "booking") {
        st.bookings = [record.booking].concat(st.bookings || []);
        st.inquiries = [record.inquiry].concat(st.inquiries || []);
      } else {
        st.inquiries = [record].concat(st.inquiries || []);
      }
      if (writeDb(current)) { sendOut(kind, record); return true; }
    }
    try {
      var box = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "{}");
      var key = kind === "order" ? "orders" : kind === "booking" ? "bookings" : "inquiries";
      box[key] = (box[key] || []).concat([record]);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(box));
      sendOut(kind, record);
      return true;
    } catch (e) { sendOut(kind, record); return CMS.hasChannel(); }
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
        productId: service ? "" : p.id, sku: p.id.toUpperCase(), name: p.name, image: p.img ? (/^(data:|https?:)/.test(p.img) ? p.img : new URL(p.img, document.baseURI).pathname) : "",
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
      coupon: o.totals.code ? { code: o.totals.code, discount: round2(o.totals.discount || 0) } : null,
      subtotal: round2(o.totals.subtotal),
      installationTotal: 0,
      discount: round2(o.totals.discount || 0),
      discounts: (o.totals.applied || []).map(function (a) { return { id: a.id, title: a.title, kind: a.kind, code: a.code, amount: round2(a.amount) }; }),
      shippingBeforeDiscount: round2(o.totals.shippingBefore != null ? o.totals.shippingBefore : o.totals.shipping),
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
  /** Saves a quote request or a product question in the CMS inbox. */
  CMS.saveInquiry = function (q) {
    return push("inquiry", {
      id: "inq_web_" + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      type: q.type || "quote",
      name: q.name || q.email || "",
      phone: q.phone || "",
      email: q.email || undefined,
      company: q.company || undefined,
      productId: q.productId || undefined,
      message: q.message || "Kërkesë për ofertë nga seksioni ITCOM Business.",
      status: "new",
      seen: false,
      source: "web-form",
      tags: q.tags || ["b2b"],
    });
  };

  /* ---------------------------------------------------------------- zbritjet në shportë */
  var CLASS = { products: "products", bxgy: "products", order: "order", shipping: "shipping" };
  var inSet = function (ids, id) { return !ids || ids.indexOf(id) >= 0; };

  /** Llogarit zbritjet për shportën. lines: [{ id, price, qty }], opts: { code, shipping }.
   *  Kthen { applied: [{ id, title, code, kind, amount }], products, order, shipping, codeError, codeOk }. */
  CMS.priceCart = function (lines, opts) {
    opts = opts || {};
    var code = String(opts.code || "").trim().toUpperCase();
    var ship = Number(opts.shipping) || 0;
    var res = { applied: [], products: 0, order: 0, shipping: 0, codeError: "", codeOk: false };
    if (!lines.length || !CMS.discounts.length) { if (code) res.codeError = "Ky kod nuk është i vlefshëm."; return res; }
    var subtotal = lines.reduce(function (n, l) { return n + l.price * l.qty; }, 0);

    function amountOf(d, productOff) {
      var el = lines.filter(function (l) { return inSet(d.eligible, l.id); });
      var base = el.reduce(function (n, l) { return n + l.price * l.qty; }, 0);
      var qty = el.reduce(function (n, l) { return n + l.qty; }, 0);
      var min = d.minimum || {};
      if (min.type === "amount" && (d.kind === "order" || d.kind === "shipping" ? subtotal : base) < min.value) return { amount: 0, why: "Kodi vlen për porosi mbi " + min.value + " €." };
      if (min.type === "qty" && qty < min.value) return { amount: 0, why: "Kodi vlen kur shporta ka të paktën " + min.value + " artikuj." };
      var pct = d.valueType === "percent";
      if (d.kind === "products") {
        if (!el.length) return { amount: 0, why: "Kodi nuk vlen për produktet në shportë." };
        if (pct) return { amount: base * d.value / 100 };
        if (d.perItem) return { amount: el.reduce(function (n, l) { return n + Math.min(d.value, l.price) * l.qty; }, 0) };
        return { amount: Math.min(d.value, base) };
      }
      if (d.kind === "order") {
        var b = Math.max(0, (d.eligible ? base : subtotal) - productOff);
        return { amount: pct ? b * d.value / 100 : Math.min(d.value, b) };
      }
      if (d.kind === "shipping") {
        if (!ship) return { amount: 0, why: "Dërgesa juaj është tashmë falas." };
        if (d.maxRate && ship > d.maxRate) return { amount: 0, why: "Kodi nuk vlen për këtë mënyrë dërgese." };
        return { amount: pct ? ship * d.value / 100 : Math.min(d.value, ship) };
      }
      if (d.kind === "bxgy" && d.bxgy) {
        var x = d.bxgy;
        var bought = lines.filter(function (l) { return inSet(x.buy, l.id); }).reduce(function (n, l) { return n + l.qty; }, 0);
        var times = Math.floor(bought / x.buyQty);
        if (x.max) times = Math.min(times, x.max);
        var units = [];
        lines.filter(function (l) { return inSet(x.get, l.id); }).forEach(function (l) { for (var i = 0; i < l.qty; i++) units.push(l.price); });
        units.sort(function (a, b) { return a - b; });
        var free = units.slice(0, times * x.getQty);
        if (!free.length) return { amount: 0, why: "Shtoni produktet e ofertës në shportë." };
        return { amount: free.reduce(function (n, v) { return n + v * (x.free ? 1 : x.pct / 100); }, 0) };
      }
      return { amount: 0 };
    }

    var codeRule = null;
    if (code) {
      codeRule = CMS.discounts.find(function (d) { return d.method === "code" && d.code === code; }) || null;
      if (!codeRule) res.codeError = "Ky kod nuk është i vlefshëm ose ka skaduar.";
    }
    var autos = CMS.discounts.filter(function (d) { return d.method === "auto"; });
    var fits = function (a, b) { return a.combines[CLASS[b.kind]] && b.combines[CLASS[a.kind]]; };
    // Rregulli me kod ka përparësi (klienti e zgjodhi); automatiket shtohen kur lejohen ta kombinojnë.
    var picked = codeRule ? [codeRule] : [];
    var rank = autos.map(function (d) { return { d: d, a: amountOf(d, 0).amount }; }).filter(function (x) { return x.a > 0; }).sort(function (a, b) { return b.a - a.a; });
    rank.forEach(function (x) {
      if (picked.every(function (p) { return CLASS[p.kind] !== CLASS[x.d.kind] ? fits(p, x.d) : fits(p, x.d) && p.combines[CLASS[p.kind]]; })) picked.push(x.d);
    });
    // Rendi: produktet → porosia → dërgesa
    var order = { products: 0, order: 1, shipping: 2 };
    picked.sort(function (a, b) { return order[CLASS[a.kind]] - order[CLASS[b.kind]]; });
    var productOff = 0;
    picked.forEach(function (d) {
      var r = amountOf(d, productOff);
      var amt = Math.round(r.amount * 100) / 100;
      if (d === codeRule && !amt) { res.codeError = r.why || "Kodi nuk vlen për këtë shportë."; return; }
      if (!amt) return;
      if (d === codeRule) res.codeOk = true;
      var cls = CLASS[d.kind];
      if (cls === "products") { productOff += amt; res.products += amt; }
      else if (cls === "order") res.order += amt;
      else res.shipping += Math.min(amt, ship - res.shipping);
      res.applied.push({ id: d.id, title: d.title, code: d.method === "code" ? d.code : undefined, kind: d.kind, amount: cls === "shipping" ? Math.min(amt, ship) : amt });
    });
    res.products = Math.round(res.products * 100) / 100;
    res.order = Math.min(Math.round(res.order * 100) / 100, Math.max(0, subtotal - res.products));
    res.shipping = Math.round(res.shipping * 100) / 100;
    return res;
  };

  /* ---------------------------------------------------------------- kanali i porosive (webhook) */
  // Kur CMS-i ka një adresë te Integrimet → Kanali i porosive, çdo porosi, pyetje dhe termin dërgohet edhe atje
  // (p.sh. një Google Apps Script që i ruan në Sheets dhe ia kthen CMS-it). Pa të, mbeten vetëm në këtë shfletues.
  function sendOut(kind, record) {
    if (!CMS.endpoint || !/^https:\/\//.test(CMS.endpoint)) return;
    try {
      fetch(CMS.endpoint, { method: "POST", mode: "no-cors", keepalive: true, headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ kind: kind, record: record, site: location.origin + location.pathname.replace(/p\/[^/]+\/?$/, "") }) });
    } catch (e) { /* ignore */ }
  }
  CMS.hasChannel = function () { return /^https:\/\//.test(CMS.endpoint); };

  /** Rezervim termini nga faqja e servisit: termin në pritje + mesazh në inbox. */
  CMS.saveBooking = function (b) {
    var at = new Date().toISOString();
    var id = Date.now().toString(36);
    var inquiry = {
      id: "inq_web_" + id, createdAt: at, type: "measurement", name: b.name, phone: b.phone, email: b.email || undefined, city: b.city || undefined,
      service: b.serviceName, preferredDate: b.start, message: b.note || "Rezervim termini nga faqja e servisit.", status: "scheduled", scheduledAt: b.start,
      seen: false, source: "web-form", tags: ["termin"],
    };
    var booking = {
      id: "bk_web_" + id, serviceId: b.serviceId, staffId: b.staffId || "", customerName: b.name, phone: b.phone, email: b.email || undefined, city: b.city || undefined,
      start: b.start, durationMin: b.duration, status: "pending", inquiryId: inquiry.id, note: b.note || undefined, location: b.onsite ? "onsite" : "loc-main",
      address: b.onsite ? b.address || undefined : undefined, createdAt: at,
    };
    var ok = push("booking", { booking: booking, inquiry: inquiry });
    return ok ? booking.id : null;
  };

  // When the CMS changes data in another tab, reload so the shop shows it.
  var stale = false;
  window.addEventListener("storage", function (e) {
    if (e.key !== DB_KEY) return;
    if (document.hidden) stale = true; else location.reload();
  });
  document.addEventListener("visibilitychange", function () { if (stale && !document.hidden) location.reload(); });
})();
