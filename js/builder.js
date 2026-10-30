/* ITCOM — Ndërtuesi i PC‑së: zgjedhja e pjesëve, përputhshmëria dhe pamja 3D. */
(() => {
  "use strict";
  const A = window.ITCOM;
  const SPECS = window.BUILD_SPECS || {};
  if (!A) return;
  const { $, $$, fmt, esc, svg, byId } = A;

  const SLOTS = [
    { key: "cpu", label: "Procesori", icon: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>' },
    { key: "mb", label: "Pllaka amë", icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="5" height="5"/><path d="M15 7h2M15 10h2M7 15h10M7 18h6"/>' },
    { key: "ram", label: "Memoria RAM", icon: '<rect x="2" y="7" width="20" height="9" rx="1"/><path d="M6 16v3M10 16v3M14 16v3M18 16v3M6 10h2M11 10h2M16 10h2"/>' },
    { key: "gpu", label: "Kartela grafike", icon: '<rect x="2" y="6" width="20" height="11" rx="1.5"/><circle cx="9" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="3"/><path d="M5 17v2h8"/>' },
    { key: "cooler", label: "Ftohësi", icon: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 10c0-3 2-5 4-5M14 12c3 0 5 2 5 4M12 14c0 3-2 5-4 5M10 12c-3 0-5-2-5-4"/>' },
    { key: "ssd", label: "Disku SSD", icon: '<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M5 12h8M18 11v2"/>' },
    { key: "psu", label: "Furnizimi me rrymë", icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="10" cy="12" r="4"/><path d="M17 9v6M13 2l-2 4h3l-2 4"/>' },
    { key: "case", label: "Kasa", icon: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M9 9h6"/><circle cx="12" cy="17" r="1"/>' },
  ];
  const RGB = [[null, "Pa RGB"], ["#00d5ff", "Cian"], ["#2f6bff", "Blu"], ["#b04dff", "Vjollcë"], ["#ff3b9a", "Rozë"], ["#ff3b3b", "E kuqe"], ["#ffb020", "Portokalli"], ["#2fe07a", "Jeshile"], ["#ffffff", "E bardhë"]];
  const COLOR_NAMES = { "#16171a": "E zezë", "#e9eaee": "E bardhë", "#2c2e33": "Qymyr", "#e4e2dc": "E bardhë shkumës" };
  const PRESETS = [
    { key: "g1080", name: "Gaming 1080p", note: "Lojëra të shpejta me buxhet të arsyeshëm", rgb: "#2f6bff", color: 0,
      parts: { cpu: "cp-9600x", mb: "mb-tufb650", ram: "cp-veng32", gpu: "cp-4060dual", cooler: "cl-ak620d", ssd: "st-sn850x1", psu: "ps-rm750e", case: "cs-h5flow" } },
    { key: "g1440", name: "Gaming 1440p", note: "Ekuilibri më i mirë mes çmimit dhe performancës", rgb: "#00d5ff", color: 0,
      parts: { cpu: "cp-7800x3d", mb: "mb-b650tomahawk", ram: "cp-furyb32", gpu: "cp-4070s", cooler: "cl-lf3-360", ssd: "st-990pro2", psu: "ps-rm750e", case: "cs-4000d" } },
    { key: "g4k", name: "4K dhe krijues", note: "Për lojëra 4K, video dhe 3D", rgb: "#b04dff", color: 1,
      parts: { cpu: "cp-9800x3d", mb: "mb-b650tomahawk", ram: "cp-tz5rgb32", gpu: "cp-5080fe", cooler: "cl-lf3-360", ssd: "st-990pro2", psu: "ps-focusgx1000", case: "cs-o11evo" } },
  ];

  // Where pc3d.js lives: next to this file, or in js/ when this script is bundled inline.
  const BASE = document.currentScript && document.currentScript.src ? new URL(".", document.currentScript.src).href : new URL("js/", location.href).href;
  const spec = (id) => (id ? SPECS[id] : null);
  const options = (slot) => Object.keys(SPECS).filter((id) => SPECS[id].slot === slot && byId[id]);
  const draft = A.saved.get("builder", null);
  // Parts saved earlier may no longer be sold: fall back to the default build for those slots.
  const validParts = (parts) => Object.fromEntries(Object.entries(PRESETS[1].parts).map(([k, v]) => [k, parts?.[k] && SPECS[parts[k]] && byId[parts[k]] ? parts[k] : v]));
  let st = draft && draft.parts ? { ...draft, parts: validParts(draft.parts) } : { parts: { ...PRESETS[1].parts }, color: 0, rgb: PRESETS[1].rgb, assembly: true, open: "cpu" };
  const persist = () => A.saved.set("builder", st);

  /* ------------------------------------------------------------ rules */
  const watts = (parts) => (spec(parts.cpu)?.tdp || 0) + (spec(parts.gpu)?.tdp || 0) + 75;
  const recommendedPsu = (w) => Math.ceil((w * 1.4) / 50) * 50;

  function problems(parts) {
    const out = [];
    const cpu = spec(parts.cpu), mb = spec(parts.mb), ram = spec(parts.ram), gpu = spec(parts.gpu), cl = spec(parts.cooler), cs = spec(parts.case), psu = spec(parts.psu);
    for (const s of SLOTS) if (!parts[s.key]) out.push({ lvl: "missing", pair: [s.key], text: `Zgjidhni ${s.label.toLowerCase()}` });
    if (cpu && mb && cpu.socket !== mb.socket) out.push({ lvl: "error", pair: ["cpu", "mb"], text: `Procesori (${cpu.socket}) nuk përputhet me pllakën amë (${mb.socket}).` });
    if (ram && mb && ram.type !== mb.ram) out.push({ lvl: "error", pair: ["ram", "mb"], text: `Pllaka amë pranon vetëm ${mb.ram}.` });
    if (gpu && cs && gpu.len > cs.gpuMax) out.push({ lvl: "error", pair: ["gpu", "case"], text: `Kartela grafike (${gpu.len} mm) nuk hyn në kasë (maks. ${cs.gpuMax} mm).` });
    if (cl && cs && cl.kind === "air" && cl.height > cs.coolerMax) out.push({ lvl: "error", pair: ["cooler", "case"], text: `Ftohësi (${cl.height} mm) është më i lartë se kasa lejon (${cs.coolerMax} mm).` });
    if (cl && cs && cl.kind === "aio" && !cs.rads.includes(cl.rad)) out.push({ lvl: "error", pair: ["cooler", "case"], text: `Kasa nuk mban radiator ${cl.rad} mm (deri në ${Math.max(...cs.rads)} mm).` });
    const w = watts(parts);
    if (psu && (cpu || gpu)) {
      if (psu.watt < w * 1.2) out.push({ lvl: "error", pair: ["psu", "gpu", "cpu"], text: `Furnizimi ${psu.watt} W është i dobët për rreth ${w} W konsum. Rekomandohet ${recommendedPsu(w)} W.` });
      else if (psu.watt < w * 1.4) out.push({ lvl: "warn", pair: ["psu"], text: `Funksionon, por rekomandohet ${recommendedPsu(w)} W për rezervë dhe zhurmë më të ulët.` });
    }
    if (cpu && cl && cpu.tdp > 200 && cl.kind === "aio" && cl.rad < 360) out.push({ lvl: "warn", pair: ["cooler"], text: "Për këtë procesor rekomandohet ftohje me lëng 360 mm." });
    return out;
  }
  const errors = (parts) => problems(parts).filter((p) => p.lvl === "error");

  // Why a candidate clashes with the current selection (null if it fits).
  function conflict(slot, id) {
    const e = errors({ ...st.parts, [slot]: id }).find((p) => p.pair.includes(slot));
    return e ? e.text : null;
  }
  // Only a power supply that is too weak is blocked; other clashes are fixed automatically.
  const blocked = (slot, id) => slot === "psu" && !!conflict(slot, id);

  // After a change, swap any part that no longer fits, keeping the customer's latest choice.
  function autoFix(changed) {
    const swaps = [];
    for (let pass = 0; pass < 5; pass++) {
      let fixed = false;
      for (const p of errors(st.parts)) {
        const target = p.pair[0] === "psu" ? (changed === "psu" ? null : "psu") : p.pair.find((k) => k !== changed);
        if (!target) continue;
        const cur = byId[st.parts[target]];
        const ok = options(target)
          .filter((id) => !errors({ ...st.parts, [target]: id }).some((q) => q.pair.includes(target)))
          .sort((x, y) => target === "psu" ? byId[x].price - byId[y].price : Math.abs(byId[x].price - (cur?.price || 0)) - Math.abs(byId[y].price - (cur?.price || 0)));
        if (ok[0] && ok[0] !== st.parts[target]) {
          st.parts[target] = ok[0];
          swaps.push(`${SLOTS.find((s) => s.key === target).label}: ${byId[ok[0]].name}`);
          fixed = true;
          break;
        }
      }
      if (!fixed) break;
    }
    if (swaps.length) A.toast(`Përshtatëm pjesët që të përputhen — ${esc(swaps.join(" · "))}`);
  }

  const total = () => Object.values(st.parts).reduce((s, id) => s + (byId[id]?.price || 0), 0) + (st.assembly ? byId["srv-assembly"]?.price || 0 : 0);

  /* ------------------------------------------------------------ render */
  const root = $("#builder");
  function shortSpecs(p) { return p.specs.slice(0, 2).join(" · "); }

  function renderPresets() {
    $("#bPresets").innerHTML = PRESETS.map((p) => `<button type="button" class="bpreset" data-bpreset="${p.key}" title="${esc(p.note)}">${esc(p.name)}</button>`).join("");
  }

  function renderSteps() {
    const probs = problems(st.parts);
    $("#bSteps").innerHTML = SLOTS.map((s, i) => {
      const id = st.parts[s.key];
      const p = byId[id];
      const bad = probs.some((q) => q.lvl === "error" && q.pair.includes(s.key));
      const open = st.open === s.key;
      const opts = options(s.key).sort((a, b) => byId[a].price - byId[b].price);
      return `<section class="bstep ${open ? "is-open" : ""} ${bad ? "has-error" : ""}">
        <button type="button" class="bstep__head" data-bslot="${s.key}" aria-expanded="${open}">
          <span class="bstep__icon">${svg(s.icon)}</span>
          <span class="bstep__label"><small>${i + 1}. ${esc(s.label)}</small><b>${p ? esc(p.name) : "Zgjidhni"}</b></span>
          <span class="bstep__price">${p ? fmt(p.price) : ""}</span>
          ${svg('<path d="m6 9 6 6 6-6"/>', "icon bstep__chev")}
        </button>
        ${open ? `<div class="bstep__body">${opts.map((oid) => {
          const o = byId[oid];
          const why = oid === id ? null : conflict(s.key, oid);
          const stop = why && blocked(s.key, oid);
          const delta = p && oid !== id ? o.price - p.price : 0;
          return `<button type="button" class="bopt ${oid === id ? "is-sel" : ""} ${stop ? "is-bad" : why ? "is-warn" : ""}" data-bpick="${s.key}|${oid}" ${stop ? 'aria-disabled="true"' : ""}>
            ${A.media(o)}
            <span class="bopt__info"><b>${esc(o.name)}</b><small>${esc(shortSpecs(o))}</small>${why ? `<em>${esc(why)}${stop ? "" : " Do ta përshtatim automatikisht."}</em>` : ""}</span>
            <span class="bopt__price"><b>${fmt(o.price)}</b>${delta ? `<small class="${delta > 0 ? "up" : "down"}">${delta > 0 ? "+" : "−"}${fmt(Math.abs(delta))}</small>` : oid === id ? `<small class="sel">${svg('<path d="M20 6 9 17l-5-5"/>')} E zgjedhur</small>` : ""}</span>
          </button>`;
        }).join("")}</div>` : ""}
      </section>`;
    }).join("");
  }

  function renderLook() {
    const cs = spec(st.parts.case);
    const colors = cs?.colors || ["#16171a"];
    if (st.color >= colors.length) st.color = 0;
    $("#bColors").innerHTML = colors.map((c, i) => `<button type="button" class="swatch ${i === st.color ? "is-sel" : ""}" style="--sw:${c}" data-bcolor="${i}" aria-label="Kasa ${esc(COLOR_NAMES[c] || c)}" aria-pressed="${i === st.color}"></button>`).join("");
    $("#bRgb").innerHTML = RGB.map(([c, n]) => `<button type="button" class="swatch ${c ? "" : "swatch--off"} ${c === st.rgb ? "is-sel" : ""}" style="--sw:${c || "transparent"}" data-brgb="${c || ""}" aria-label="Ndriçimi: ${n}" aria-pressed="${c === st.rgb}" title="${n}"></button>`).join("");
    $("#bLookLabel").textContent = `${COLOR_NAMES[colors[st.color]] || ""} · ${RGB.find(([c]) => c === st.rgb)?.[1] || "Pa RGB"}`;
  }

  function renderSummary() {
    const probs = problems(st.parts);
    const errs = probs.filter((p) => p.lvl === "error"), warns = probs.filter((p) => p.lvl === "warn"), missing = probs.filter((p) => p.lvl === "missing");
    const w = watts(st.parts), psu = spec(st.parts.psu);
    const pct = psu ? Math.min(100, (w / psu.watt) * 100) : 0;
    $("#bChecks").innerHTML = errs.length || missing.length
      ? [...errs, ...missing].map((p) => `<li class="bad">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>')}${esc(p.text)}</li>`).join("")
      : `<li class="ok">${svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>')}Të gjitha pjesët përputhen</li>` + warns.map((p) => `<li class="warn">${svg('<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>')}${esc(p.text)}</li>`).join("");
    $("#bPower").innerHTML = `<div class="bpower__row"><span>Konsumi i vlerësuar</span><b>${w} W${psu ? ` / ${psu.watt} W` : ""}</b></div><div class="bpower__bar"><i style="width:${pct}%" class="${pct > 83 ? "hot" : pct > 71 ? "warm" : ""}"></i></div>`;
    const asm = byId["srv-assembly"];
    $("#bAssembly").innerHTML = asm ? `<label class="check"><input type="checkbox" id="bAsm" ${st.assembly ? "checked" : ""} /> <span>Montim dhe testim profesional <b>+${fmt(asm.price)}</b></span></label>` : "";
    $("#bTotal").innerHTML = `<small>Totali</small><b>${fmt(total())}</b><span>ose ${window.STORE.installments} × ${fmt(total() / window.STORE.installments)} në muaj</span>`;
    $("#bAdd").disabled = errs.length > 0 || missing.length > 0;
  }

  /* ------------------------------------------------------------ 3D */
  let viewer = null, loading = null, pending = false;
  function scene() {
    const b = { rgb: st.rgb };
    for (const s of SLOTS) if (st.parts[s.key]) b[s.key] = spec(st.parts[s.key]);
    const cs = spec(st.parts.case);
    b.caseColor = cs?.colors?.[st.color] || "#16171a";
    const gp = byId[st.parts.gpu];
    b.gpuLabel = gp ? (/radeon/i.test(gp.name) ? "RADEON" : "GEFORCE RTX") : "";
    return b;
  }
  function update3d() {
    if (!viewer || pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; try { viewer.setBuild(scene()); } catch (e) { console.error(e); } });
  }
  function load3d() {
    if (loading) return loading;
    $("#bLoading").hidden = false;
    loading = import(BASE + "pc3d.js").then((mod) => {
      viewer = mod.createViewer($("#bCanvas"));
      viewer.setBuild(scene());
      viewer.setAutoRotate($("#bSpin").getAttribute("aria-pressed") === "true");
      $("#bLoading").hidden = true;
    }).catch((err) => {
      console.error(err);
      $("#bLoading").innerHTML = "Pamja 3D nuk mund të ngarkohet në këtë pajisje. Mund ta ndërtoni PC‑në edhe pa të.";
    });
    return loading;
  }

  function renderAll() {
    renderSteps();
    renderLook();
    renderSummary();
    update3d();
    persist();
  }

  /* ------------------------------------------------------------ open / close */
  function open(saved) {
    if (saved && saved.parts) st = { ...st, parts: validParts(saved.parts), color: saved.color || 0, rgb: saved.rgb ?? st.rgb, assembly: saved.assembly ?? st.assembly };
    A.closeModal();
    root.hidden = false;
    document.body.classList.add("builder-open");
    if (location.hash !== "#builder") { try { history.replaceState(null, "", "#builder"); } catch { /* ignore */ } }
    renderPresets();
    renderAll();
    load3d().then(() => { viewer?.resume(); update3d(); });
    $("#bClose").focus();
  }
  function close() {
    root.hidden = true;
    document.body.classList.remove("builder-open");
    viewer?.pause();
    if (location.hash === "#builder") { try { history.replaceState(null, "", location.pathname + location.search); } catch { /* ignore */ } }
  }
  A.openBuilder = open;
  A.closeBuilder = close;

  /* ------------------------------------------------------------ actions */
  function pick(slot, id) {
    if (blocked(slot, id)) { A.toast("Ky furnizim është shumë i dobët për këtë konfigurim."); return; }
    st.parts[slot] = id;
    if (slot === "case") st.color = 0;
    autoFix(slot);
    const i = SLOTS.findIndex((s) => s.key === slot);
    st.open = SLOTS[i + 1]?.key || null;
    renderAll();
    root.querySelector(`[data-bslot="${slot}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function addAllToCart() {
    if (errors(st.parts).length) return;
    const ids = SLOTS.map((s) => st.parts[s.key]).filter(Boolean);
    if (st.assembly && byId["srv-assembly"]) ids.push("srv-assembly");
    let n = 0;
    for (const id of ids) if (A.addToCart(id, 1, true)) n++;
    A.toast(`U shtuan ${n} artikuj në shportë — totali i PC‑së ${fmt(total())}`, { label: "Shiko shportën", fn: () => { close(); A.openCart(); } });
  }

  function thumbnail() {
    try {
      const src = $("#bCanvas canvas");
      if (!src) return null;
      const c = document.createElement("canvas");
      const w = 320, h = Math.round((src.height / src.width) * w) || 220;
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      g.fillStyle = "#f1f3f6"; g.fillRect(0, 0, w, h);
      g.drawImage(src, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.72);
    } catch { return null; }
  }

  function saveBuild() {
    A.account.require("Hyni ose krijoni llogari për të ruajtur konfigurimin tuaj.", () => {
      const n = (A.account.user()?.builds?.length || 0) + 1;
      A.openModal(`
        <form class="bsave" id="bSaveForm">
          <h2>Ruaj konfigurimin</h2>
          <p class="muted">Do ta gjeni te “Llogaria ime”, gati për t'u hapur ose porositur më vonë.</p>
          <label class="field" for="bSaveName">Emri i konfigurimit<input id="bSaveName" type="text" value="PC‑ja ime ${n}" maxlength="40" /></label>
          <div class="bsave__row"><span>${SLOTS.filter((s) => st.parts[s.key]).length} pjesë</span><b>${fmt(total())}</b></div>
          <button class="btn btn--cta btn--block btn--lg" type="submit">Ruaj</button>
        </form>`, "modal--info");
      $("#bSaveName").select();
      $("#bSaveForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const name = $("#bSaveName").value.trim() || `PC‑ja ime ${n}`;
        A.account.saveBuild({ id: Date.now().toString(36), name, parts: { ...st.parts }, color: st.color, rgb: st.rgb, assembly: st.assembly, total: total(), date: Date.now(), thumb: thumbnail() });
        A.closeModal();
        A.toast(`U ruajt: <b>${esc(name)}</b>`, { label: "Llogaria ime", fn: () => A.openAccount() });
      });
    });
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-bslot],[data-bpick],[data-bpreset],[data-bcolor],[data-brgb]");
    if (!t) return;
    const d = t.dataset;
    if (d.bslot) { st.open = st.open === d.bslot ? null : d.bslot; renderSteps(); persist(); }
    else if (d.bpick) { const [slot, id] = d.bpick.split("|"); pick(slot, id); }
    else if (d.bpreset) { const p = PRESETS.find((x) => x.key === d.bpreset); st.parts = { ...p.parts }; st.rgb = p.rgb; st.color = p.color; st.open = null; renderAll(); A.toast(`U ngarkua konfigurimi “${esc(p.name)}”`); }
    else if (d.bcolor) { st.color = Number(d.bcolor); renderLook(); update3d(); persist(); }
    else if ("brgb" in d) { st.rgb = d.brgb || null; renderLook(); update3d(); persist(); }
  });
  root.addEventListener("change", (e) => { if (e.target.id === "bAsm") { st.assembly = e.target.checked; renderSummary(); persist(); } });
  $("#bClose").addEventListener("click", close);
  $("#bAdd").addEventListener("click", addAllToCart);
  $("#bSave").addEventListener("click", saveBuild);
  $("#bReset").addEventListener("click", () => viewer?.resetView());
  $("#bSpin").addEventListener("click", (e) => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on);
    viewer?.setAutoRotate(on);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !root.hidden && !document.querySelector("#modal[open]")) close(); });

  if (location.hash === "#builder") open();
})();
