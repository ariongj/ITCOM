/* ITCOM — modeli 3D i PC‑së për ndërtuesin (three.js).
 *
 * createViewer(el)  → pamje interaktive me rrotullim (OrbitControls)
 * buildPart(kind, b) → modele të veçanta për fotot e katalogut
 *
 * Njësitë janë në centimetra. Kasa: thellësia sipas x (përpara = +x),
 * lartësia sipas y, gjerësia sipas z (paneli i xhamit = +z).
 */
import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/addons/OrbitControls.js";
import { RoundedBoxGeometry } from "./vendor/addons/RoundedBoxGeometry.js";
import { RoomEnvironment } from "./vendor/addons/RoomEnvironment.js";
import { Reflector } from "./vendor/addons/objects/Reflector.js";
import { EffectComposer } from "./vendor/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "./vendor/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./vendor/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "./vendor/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "./vendor/addons/postprocessing/GTAOPass.js";

/* ------------------------------------------------------------------ helpers */
const RB = (w, h, d, r = 0.3, s = 3) => new RoundedBoxGeometry(w, h, d, s, Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
const CYL = (rt, rb, h, seg = 48, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const col = (c) => new THREE.Color(c);
const isLight = (c) => { const hsl = {}; col(c).getHSL(hsl); return hsl.l > 0.55; };
const shade = (c, amt) => { const k = col(c); const hsl = {}; k.getHSL(hsl); k.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt))); return k; };

const M = {
  metal: (c, rough = 0.35, metal = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal }),
  plastic: (c, rough = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.05 }),
  // emissive is pushed well above 1 so only real lights cross the bloom threshold
  glow: (c, i = 2.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i * 1.8, roughness: 0.4 }),
  pcb: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.15 }),
};

function add(parent, geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Finned heatsink: a base plate with fins rising towards +z. Fins run along y ("y") or x ("x").
function finSink(parent, w, h, d, mat, x, y, z, along = "y", pitch = 0.42) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  add(g, RB(w, h, d * 0.35, 0.12, 1), mat, 0, 0, d * 0.175);
  const span = along === "y" ? w : h;
  const n = Math.max(2, Math.floor(span / pitch));
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(along === "y" ? 0.14 : w, along === "y" ? h : 0.14, d * 0.66), mat, n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const o = -span / 2 + (i + 0.5) * (span / n);
    m4.makeTranslation(along === "y" ? o : 0, along === "y" ? 0 : o, d * 0.66);
    fins.setMatrixAt(i, m4);
  }
  g.add(fins);
  return g;
}

// Braided sleeve: a flat ribbon of strands following a curve; `spread` is the ribbon direction.
const sleeveTex = {};
function sleeveMat(color) {
  const t = (sleeveTex[color] ||= canvasTex(32, 64, (c, w, h) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.strokeStyle = isLight(color) ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.12)"; c.lineWidth = 3;
    for (let y = -w; y < h + w; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + w); c.stroke(); }
  }));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.05 });
}
function cable(parent, pts, strands, spread, color, r = 0.17) {
  const mat = sleeveMat(color);
  const dir = spread.clone().normalize();
  for (let i = 0; i < strands; i++) {
    const off = dir.clone().multiplyScalar((i - (strands - 1) / 2) * r * 2.15);
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => p.clone().add(off)));
    const m = add(parent, new THREE.TubeGeometry(curve, 36, r, 8, false), mat);
    m.material.map.repeat.set(1, 30);
  }
}

const spinners = new Set(); // fan blade groups that rotate while the viewer runs

/* ------------------------------------------------------------------ fan */
// A fan facing +z, centred at the origin. size in cm (12 / 14).
function fan(size = 12, { frame = "#16171a", blades = "#1d1f23", rgb = null, depth = 2.5 } = {}) {
  const g = new THREE.Group();
  const r = size * 0.46;
  const frameMat = M.plastic(frame, 0.6);
  // square frame: four sides with a round opening look
  const t = size * 0.08;
  add(g, RB(size, t, depth, 0.4), frameMat, 0, size / 2 - t / 2, 0);
  add(g, RB(size, t, depth, 0.4), frameMat, 0, -size / 2 + t / 2, 0);
  add(g, RB(t, size, depth, 0.4), frameMat, size / 2 - t / 2, 0, 0);
  add(g, RB(t, size, depth, 0.4), frameMat, -size / 2 + t / 2, 0, 0);
  const shroud = add(g, CYL(r + 0.25, r + 0.25, depth * 0.95, 64, true), new THREE.MeshStandardMaterial({ color: frame, roughness: 0.6, side: THREE.DoubleSide }));
  shroud.rotation.x = Math.PI / 2;
  // corner fill so the frame reads as one piece
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) add(g, RB(size * 0.2, size * 0.2, depth, 0.2), frameMat, sx * size * 0.4, sy * size * 0.4, 0);
  // rotor
  const rotor = new THREE.Group();
  g.add(rotor);
  const bladeMat = M.plastic(blades, 0.45);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(RB(r * 0.78, r * 0.34, 0.12, 0.06, 1), bladeMat);
    b.geometry.translate(r * 0.5, 0, 0);
    b.rotation.z = (i / n) * Math.PI * 2;
    b.rotation.x = 0.35;
    rotor.add(b);
  }
  add(rotor, CYL(r * 0.32, r * 0.32, depth * 0.8, 32), M.plastic(shade(blades, 0.06), 0.4)).rotation.x = Math.PI / 2;
  add(rotor, CYL(r * 0.2, r * 0.2, 0.05, 32), M.plastic("#2a2c31", 0.3), 0, 0, depth * 0.41).rotation.x = Math.PI / 2;
  spinners.add(rotor);
  // RGB ring on the front edge
  if (rgb) {
    add(g, new THREE.TorusGeometry(r + 0.15, 0.22, 10, 72), M.glow(rgb, 2.6), 0, 0, depth / 2);
    add(g, CYL(r * 0.22, r * 0.22, 0.06, 24), M.glow(rgb, 1.2), 0, 0, depth * 0.42).rotation.x = Math.PI / 2;
  }
  g.userData.rotor = rotor;
  return g;
}

/* ------------------------------------------------------------------ motherboard (local: centred, z = 0 at the back of the PCB, components towards +z) */
const MB_W = 24.4, MB_H = 30.5;
const fx = (x) => x - MB_W / 2;
const fy = (y) => MB_H / 2 - y;
export const SOCKET = { x: fx(13), y: fy(9.5) };
export const PCIE_Y = fy(19.5);

function motherboard(spec = {}) {
  const g = new THREE.Group();
  const pcbCol = spec.color || "#1b1c1f";
  const acc = spec.accent || "#5b5f68";
  const light = isLight(pcbCol);
  // PCB with printed markings (no fake traces: real boards look calm from a distance)
  const print = canvasTex(512, 640, (c, w, h) => {
    c.fillStyle = pcbCol; c.fillRect(0, 0, w, h);
    const ink = light ? "rgba(0,0,0,.28)" : "rgba(255,255,255,.28)";
    c.fillStyle = ink; c.font = "bold 13px Arial";
    const k = w / MB_W;
    for (const [t, x, y] of [["PCIE_1", 1, 18.9], ["PCIE_2", 1, 26.4], ["M2_1", 3, 16.3], ["M2_2", 3, 23.9], ["DDR5_A1", 18, 1.6], ["CPU_FAN", 15.5, 2.8], ["ATX_24P", 22.2, 9.9]]) c.fillText(t, x * k, y * k);
    c.font = "bold 30px Arial"; c.fillText(spec.label || "", 1.2 * k, 29.6 * k);
    c.fillStyle = light ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.08)";
    for (let i = 0; i < 26; i++) c.fillRect((14 + (i % 13) * 0.55) * k, (12.5 + Math.floor(i / 13) * 0.5) * k, 3, 3); // SMD pads
  });
  add(g, RB(MB_W, MB_H, 0.18, 0.1, 1), new THREE.MeshStandardMaterial({ map: print, roughness: 0.78, metalness: 0.1 }), 0, 0, 0.09);
  const accMat = M.metal(acc, 0.38, 0.75);
  const darkMat = M.metal(light ? "#d9dce1" : "#141518", 0.45, 0.5);
  const black = M.plastic(light ? "#e4e6ea" : "#0d0e10", 0.55);
  // rear I/O cover with an accent line
  add(g, RB(3.4, 13, 3.6, 0.4), darkMat, fx(1.7), fy(6.5), 1.9);
  add(g, RB(0.2, 11.5, 0.2, 0.05, 1), accMat, fx(3.45), fy(6.5), 3.3);
  // VRM: chokes under finned heatsinks
  const choke = M.metal("#6d7178", 0.4, 0.8);
  for (let i = 0; i < 10; i++) add(g, RB(0.8, 0.8, 0.6, 0.08, 1), choke, fx(5.2 + i * 0.95), fy(4.4), 0.48);
  for (let i = 0; i < 8; i++) add(g, RB(0.8, 0.8, 0.6, 0.08, 1), choke, fx(7.4), fy(5.8 + i * 0.95), 0.48);
  finSink(g, 10.5, 2.8, 2.6, accMat, fx(9.6), fy(2.2), 0.2, "y");
  finSink(g, 2.6, 9, 2.6, accMat, fx(5.3), fy(8.9), 0.2, "x");
  for (let i = 0; i < 6; i++) add(g, CYL(0.28, 0.28, 0.9, 16), M.metal("#2b2d31", 0.3, 0.9), fx(9.4 + i * 0.7), fy(5.4), 0.6).rotation.x = Math.PI / 2;
  // CPU socket with retention frame
  add(g, RB(5.6, 5.6, 0.3, 0.15, 1), M.metal("#9ea3ab", 0.3, 0.9), SOCKET.x, SOCKET.y, 0.35);
  add(g, RB(4.2, 4.2, 0.5, 0.1), M.metal("#b9bdc4", 0.25, 0.9), SOCKET.x, SOCKET.y, 0.5);
  add(g, RB(0.2, 5, 0.2, 0.05, 1), M.metal("#c6cad1", 0.25, 0.9), SOCKET.x + 3.1, SOCKET.y, 0.5);
  // RAM slots with latches
  for (let i = 0; i < 4; i++) {
    const x = fx(18.6 + i * 0.95);
    add(g, RB(0.55, 13.3, 0.7, 0.05, 1), darkMat, x, fy(8.8), 0.55);
    for (const y of [fy(2.0), fy(15.6)]) add(g, RB(0.6, 0.5, 1.1, 0.05, 1), black, x, y, 0.75);
  }
  // power connectors: 24-pin and 8-pin EPS
  add(g, RB(1, 5.2, 1.3, 0.1, 1), black, fx(23.5), fy(13), 0.85);
  add(g, RB(2.2, 1, 1.2, 0.1, 1), black, fx(2.4), fy(0.9), 0.8);
  // PCIe: armoured main slot, plain second slot
  add(g, RB(8.9, 0.75, 1, 0.08, 1), M.metal(light ? "#d0d3d8" : "#8c9199", 0.25, 0.9), fx(1 + 4.45), fy(19.5), 0.6);
  add(g, RB(8.9, 0.7, 0.9, 0.08, 1), darkMat, fx(1 + 4.45), fy(27), 0.55);
  // M.2 heatsinks with grooves, chipset cover with a badge
  for (const y of [17.2, 24.8]) {
    add(g, RB(11, 1.7, 0.5, 0.15), accMat, fx(8.5), fy(y), 0.45);
    for (let k = 0; k < 3; k++) add(g, RB(10.4, 0.08, 0.06, 0.02, 1), darkMat, fx(8.5), fy(y) - 0.45 + k * 0.45, 0.72);
  }
  add(g, RB(5.6, 5.2, 1, 0.3), accMat, fx(18.5), fy(24.5), 0.65);
  const badge = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#0d0e10"; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, 7); c.fill(); c.strokeStyle = acc; c.lineWidth = 8; c.stroke(); c.fillStyle = "#e8e9ec"; c.font = "bold 46px Arial"; c.textAlign = "center"; c.fillText((spec.label || "").split(" ").pop() || "", w / 2, h / 2 + 16); });
  add(g, new THREE.CircleGeometry(1.8, 48), new THREE.MeshStandardMaterial({ map: badge, roughness: 0.3, metalness: 0.4 }), fx(18.5), fy(24.5), 1.16);
  // front‑panel headers + SATA
  for (let i = 0; i < 4; i++) add(g, RB(1.4, 0.6, 0.6, 0.05, 1), black, fx(12 + i * 2.2), fy(29.8), 0.4);
  for (let i = 0; i < 2; i++) add(g, RB(0.6, 1.2, 0.8, 0.05, 1), black, fx(23.7), fy(20 + i * 1.5), 0.5);
  return g;
}

/* ------------------------------------------------------------------ RAM (local to the motherboard) */
function ramSticks(spec = {}, rgb) {
  const g = new THREE.Group();
  const c = spec.color || "#1d1e22";
  const body = M.metal(c, 0.42, 0.65);
  const edge = M.metal(shade(c, isLight(c) ? -0.12 : 0.1), 0.3, 0.8);
  for (const i of [1, 3]) {
    const x = fx(18.6 + i * 0.95);
    add(g, RB(0.18, 13.3, 3.4, 0.05, 1), M.pcb("#0f3d24"), x, fy(8.8), 2.5);                      // module PCB
    for (const s of [-1, 1]) add(g, RB(0.2, 13.3, 3.6, 0.08, 1), body, x + s * 0.24, fy(8.8), 2.7); // heat spreaders
    add(g, RB(0.75, 13.3, 0.35, 0.1, 1), edge, x, fy(8.8), 4.45);                                   // top rail
    if (spec.rgb) add(g, RB(0.6, 12.9, 0.55, 0.12, 1), M.glow(rgb || "#ffffff", rgb ? 2.2 : 1), x, fy(8.8), 4.85);
  }
  return g;
}

/* ------------------------------------------------------------------ CPU coolers (local: origin at the socket, extending towards +z) */
function airCooler(spec = {}, rgb) {
  const g = new THREE.Group();
  const h = (spec.height || 160) / 10;
  const towers = spec.towers || 2;
  const finMat = M.metal(spec.color || "#b8bcc4", 0.32, 0.85);
  const tw = 4.6, gap = 2.9;
  const fanSize = 14;
  const xs = towers === 2 ? [-(tw / 2 + gap / 2), tw / 2 + gap / 2] : [0];
  add(g, RB(4.2, 4.2, 2, 0.2), M.metal("#c9a46a", 0.3, 0.95), 0, 0, 1); // copper base
  for (const x of xs) {
    const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(tw, 0.08, h - 3), finMat, 44);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 44; i++) { m4.makeTranslation(x, -7.2 + i * 0.33, 2.5 + (h - 3) / 2); fins.setMatrixAt(i, m4); }
    g.add(fins);
    add(g, RB(tw + 0.15, 0.5, h - 2.9, 0.15), M.metal(spec.display ? "#141518" : spec.color || "#b8bcc4", 0.3, 0.8), x, 7.4, 2.5 + (h - 3) / 2);
    for (let p = 0; p < 3; p++) add(g, CYL(0.3, 0.3, 15.5, 16), M.metal("#d8dbe0", 0.2, 1), x - 1.2 + p * 1.2, 0, 4 + p * 2.8);
  }
  // fans: centre + front, facing +x
  const fanOpts = { frame: spec.fan === "#8b5a3c" ? "#c9b49a" : spec.fan || "#16171a", blades: spec.fan || "#1d1f23", rgb: spec.rgb ? rgb : null, depth: 2.5 };
  const fpos = towers === 2 ? [0, tw + gap / 2 + 1.5] : [tw / 2 + 1.4];
  for (const x of fpos) {
    const f = fan(fanSize, fanOpts);
    f.rotation.y = Math.PI / 2;
    f.position.set(x, 0, 2.5 + (h - 3) / 2);
    g.add(f);
  }
  if (spec.display) {
    const tex = canvasTex(256, 64, (c, w, hh) => { c.fillStyle = "#000"; c.fillRect(0, 0, w, hh); c.fillStyle = rgb || "#7fe0ff"; c.font = "bold 46px Arial"; c.textAlign = "center"; c.fillText("47°C", w / 2, 48); });
    add(g, new THREE.PlaneGeometry(4.2, 1.1), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2 }), xs[1], 7.67, 2.5 + (h - 3) / 2 + 3).rotation.x = -Math.PI / 2;
    if (rgb) add(g, RB(tw * 2 + gap + 0.3, 0.25, 0.25, 0.1, 1), M.glow(rgb, 2.4), 0, 7.6, h - 0.3);
  }
  return g;
}

function pumpHead(spec = {}, rgb) {
  const g = new THREE.Group();
  add(g, CYL(3.4, 3.4, 3.2, 64), M.plastic("#141518", 0.35), 0, 0, 1.8).rotation.x = Math.PI / 2;
  add(g, new THREE.TorusGeometry(3.25, 0.2, 10, 64), M.glow(rgb || "#9aa0aa", rgb ? 2.6 : 0.4), 0, 0, 3.35);
  const face = spec.lcd
    ? canvasTex(256, 256, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "#1a1d2e"); gr.addColorStop(1, "#05060a"); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = rgb || "#ffffff"; c.font = "bold 70px Arial"; c.textAlign = "center"; c.fillText("38°", w / 2, h / 2 + 10); c.font = "bold 26px Arial"; c.fillStyle = "#ffffff"; c.fillText("ITCOM", w / 2, h / 2 + 56); })
    : canvasTex(256, 256, (c, w, h) => { for (let i = 8; i > 0; i--) { c.beginPath(); c.arc(w / 2, h / 2, i * 15, 0, Math.PI * 2); c.fillStyle = i % 2 ? (rgb || "#555") : "#07080b"; c.globalAlpha = 0.25 + i * 0.06; c.fill(); } });
  face.center.set(0.5, 0.5); face.rotation = Math.PI / 2;
  const disc = add(g, CYL(2.95, 2.95, 0.1, 64), new THREE.MeshStandardMaterial({ map: face, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.9, roughness: 0.15 }), 0, 0, 3.42);
  disc.rotation.x = Math.PI / 2;
  return g;
}

function radiator(size = 360, spec = {}, rgb) {
  const g = new THREE.Group(); // along x, fans hanging below (−y)
  const n = Math.round(size / 120) || 2;
  const fs = size === 280 ? 14 : 12;
  const len = n * fs + 3.2;
  add(g, RB(len, 2.7, fs + 0.6, 0.2), M.metal("#141518", 0.5, 0.4), 0, 0, 0);
  const fins = canvasTex(512, 64, (c, w, h) => { c.fillStyle = "#101114"; c.fillRect(0, 0, w, h); c.strokeStyle = "#2a2c31"; for (let x = 0; x < w; x += 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 2, h); c.stroke(); } });
  add(g, new THREE.PlaneGeometry(len - 3, fs), new THREE.MeshStandardMaterial({ map: fins, roughness: 0.7 }), 0, -1.36, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const f = fan(fs, { rgb, frame: "#141518", blades: "#1b1c20" });
    f.rotation.x = Math.PI / 2;
    f.position.set(-len / 2 + 1.6 + fs / 2 + i * fs, -2.7, 0);
    g.add(f);
  }
  g.userData.len = len;
  return g;
}

/* ------------------------------------------------------------------ GPU (local: x from bracket 0 → length, y from top 0 down, z from board 0 out) */
function graphicsCard(spec = {}, rgb) {
  const g = new THREE.Group();
  const L = (spec.len || 260) / 10;
  const th = (spec.slots || 2) * 2;
  const shroudCol = spec.color || "#202226";
  const light = isLight(shroudCol);
  const shroud = M.plastic(shroudCol, 0.42);
  const trim = M.metal(light ? "#c9ccd2" : "#3b3e45", 0.3, 0.85);
  const ft = L * 0.24; // flow-through section at the end: fins visible
  const body = L - ft;
  // shroud
  add(g, RB(body, th - 0.8, 12, 0.6), shroud, body / 2, -th / 2 - 0.2, 6.4);
  // outer (glass-facing) face: sculpted trim panel + dark slot
  add(g, RB(body - 2, th * 0.5, 0.3, 0.12, 1), trim, body / 2 + 0.4, -th * 0.42, 12.45);
  add(g, RB(body - 4, 0.18, 0.12, 0.05, 1), M.plastic("#050506"), body / 2 + 0.6, -th * 0.72, 12.5);
  if (rgb || light) add(g, RB(L * 0.42, 0.28, 0.12, 0.05, 1), M.glow(rgb || "#ffffff", rgb ? 2 : 0.8), body * 0.6, -th * 0.18, 12.62);
  const logo = canvasTex(512, 96, (c, w, h) => { c.fillStyle = light ? "#2a2c31" : "#e8e9ec"; c.font = "bold 58px Arial"; c.fillText(spec.label || "GEFORCE RTX", 10, 70); });
  add(g, new THREE.PlaneGeometry(L * 0.34, L * 0.34 * 96 / 512), new THREE.MeshStandardMaterial({ map: logo, transparent: true }), L * 0.21, -th * 0.42, 12.62);
  // flow-through: fin stack between top and bottom frames
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, th - 1.4, 11.4), M.metal("#b9bec6", 0.3, 0.9), Math.floor(ft / 0.32));
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < fins.count; i++) { m4.makeTranslation(body + 0.2 + i * 0.32, -th / 2 - 0.2, 6.4); fins.setMatrixAt(i, m4); }
  g.add(fins);
  add(g, RB(ft, 0.5, 12, 0.2, 1), shroud, body + ft / 2, -th + 0.45, 6.4);
  add(g, RB(0.6, th - 0.8, 12, 0.2, 1), shroud, L - 0.3, -th / 2 - 0.2, 6.4);
  // backplate (top) with vents over the flow-through
  add(g, RB(L, 0.3, 12, 0.15, 1), M.metal(light ? "#d7dade" : "#1f2125", 0.35, 0.85), L / 2, 0.1, 6.4);
  for (let i = 0; i < 6; i++) add(g, RB(0.35, 0.06, 9, 0.03, 1), M.plastic("#050506"), body + 0.8 + i * (ft - 1.6) / 5, 0.27, 6.4);
  // PCIe bracket with vents
  add(g, RB(0.15, th + 1.2, 12.8, 0.05, 1), M.metal("#43474e", 0.4, 0.85), -0.1, -th / 2 + 0.3, 6.4);
  // fans underneath
  const n = spec.fans || 2;
  const fs = Math.min(9.6, (L - 2) / n - 0.4);
  for (let i = 0; i < n; i++) {
    const f = fan(fs, { frame: shroudCol, blades: light ? "#e9eaee" : "#1a1b1f", depth: 1.2 });
    f.rotation.x = Math.PI / 2;
    f.position.set(1 + (L - 2) * (i + 0.5) / n, -th + 0.1, 6.4);
    g.add(f);
  }
  // 16-pin power socket on the outer edge
  add(g, RB(2.2, 1, 0.9, 0.1, 1), M.plastic("#0b0c0e"), body * 0.7, -0.75, 12.5);
  g.userData.power = new THREE.Vector3(body * 0.7, -0.75, 13);
  return g;
}

/* ------------------------------------------------------------------ PSU (catalogue model) */
function powerSupply(spec = {}) {
  const g = new THREE.Group();
  add(g, RB(15, 8.6, 14, 0.4), M.metal("#16171a", 0.55, 0.5), 0, 4.3, 0);
  add(g, CYL(6.6, 6.6, 0.12, 64), M.plastic("#0b0c0e", 0.7), 0, 8.66, 0);
  add(g, CYL(1.6, 1.6, 0.2, 32), M.plastic("#202226", 0.5), 0, 8.72, 0);
  for (let i = 1; i <= 5; i++) add(g, new THREE.TorusGeometry(i * 1.3, 0.07, 6, 64), M.metal("#3a3d44", 0.4, 0.8), 0, 8.8, 0).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) add(g, RB(13, 0.12, 0.12, 0.05, 1), M.metal("#3a3d44", 0.4, 0.8), 0, 8.82, 0).rotation.y = (i * Math.PI) / 4;
  const label = canvasTex(512, 300, (c, w, h) => { c.fillStyle = "#1c1d21"; c.fillRect(0, 0, w, h); c.fillStyle = "#e8e9ec"; c.font = "bold 120px Arial"; c.fillText(`${spec.watt || 750}W`, 30, 150); c.fillStyle = "#c9a227"; c.font = "bold 44px Arial"; c.fillText("80 PLUS GOLD", 34, 230); });
  add(g, new THREE.PlaneGeometry(12, 7), new THREE.MeshStandardMaterial({ map: label, roughness: 0.5 }), 0, 4.3, 7.01);
  for (let i = 0; i < 6; i++) add(g, RB(1.6, 0.9, 0.3, 0.1, 1), M.plastic("#050506"), 7.6, 6.5 - (i % 3) * 1.6, -4 + Math.floor(i / 3) * 3).rotation.y = Math.PI / 2;
  return g;
}

/* ------------------------------------------------------------------ case */
export const CASE = { W: 23, H: 47, D: 45 };

function caseShell(spec = {}, color = "#16171a", rgb, { withFans = true } = {}) {
  const { W, H, D } = CASE;
  const g = new THREE.Group();
  const light = isLight(color);
  // satin aluminium for dark cases, powder‑coated steel for light ones
  const shell = light ? M.metal(shade(color, -0.1), 0.45, 0.1) : M.metal(shade(color, -0.03), 0.5, 0.35);
  const inner = light ? M.metal(shade(color, -0.16), 0.6, 0.1) : M.metal("#0f1013", 0.65, 0.25);
  const t = 0.5;
  add(g, RB(D, H, t, 0.2), inner, 0, H / 2, -W / 2 + t / 2);               // back
  add(g, RB(D, t, W, 0.25), shell, 0, H - t / 2, 0);                      // top
  add(g, RB(D, t, W, 0.25), shell, 0, t / 2, 0);                          // bottom
  add(g, RB(t, H, W, 0.25), shell, -D / 2 + t / 2, H / 2, 0);             // rear
  for (const [x, z] of [[-D / 2 + 3, -W / 2 + 3], [-D / 2 + 3, W / 2 - 3], [D / 2 - 3, -W / 2 + 3], [D / 2 - 3, W / 2 - 3]]) add(g, RB(4, 1.2, 3, 0.4), M.plastic("#0c0d0f"), x, -0.5, z);
  // top dust filter
  const mesh = canvasTex(256, 256, (c, w, h) => { c.fillStyle = light ? "#c8cbd1" : "#0b0c0e"; c.fillRect(0, 0, w, h); c.fillStyle = light ? "#eef0f3" : "#202226"; for (let y = 0; y < h; y += 10) for (let x = (y / 10) % 2 ? 5 : 0; x < w; x += 10) { c.beginPath(); c.arc(x, y, 3.2, 0, 7); c.fill(); } });
  mesh.wrapS = mesh.wrapT = THREE.RepeatWrapping; mesh.repeat.set(4, 2);
  add(g, new THREE.PlaneGeometry(D - 8, W - 6), new THREE.MeshStandardMaterial({ map: mesh, roughness: 0.8 }), 0, H + 0.01, 0).rotation.x = -Math.PI / 2;
  // rear I/O area + expansion slots
  add(g, RB(0.2, 15, 6, 0.1), M.plastic("#0b0c0e"), -D / 2 - 0.02, H - 11, -W / 2 + 6);

  // front panel
  const front = spec.front || "mesh";
  if (front === "glass") {
    add(g, RB(0.4, H - 1, W - 0.6, 0.1), glassMat(light), D / 2 - 0.2, H / 2, 0);
    add(g, RB(1, H, 1, 0.2), shell, D / 2 - 0.5, H / 2, -W / 2 + 0.5);
    add(g, RB(1, H, 1, 0.2), shell, D / 2 - 0.5, H / 2, W / 2 - 0.5);
  } else if (front === "wood") {
    add(g, RB(1.2, H, W, 0.3), shell, D / 2 - 0.6, H / 2, 0);
    const woodTex = canvasTex(64, 512, (c, w, h) => { c.fillStyle = "#6b4426"; c.fillRect(0, 0, w, h); for (let i = 0; i < 26; i++) { c.strokeStyle = `rgba(40,20,8,${0.15 + Math.random() * 0.25})`; c.lineWidth = 1 + Math.random() * 2; c.beginPath(); const x = Math.random() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 6, h * 0.3, x - 6, h * 0.6, x + 3, h); c.stroke(); } });
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.65 });
    for (let i = 0; i < 13; i++) add(g, RB(1.2, H - 3, 1.1, 0.25, 2), wood, D / 2 + 0.4, H / 2, -W / 2 + 1.6 + i * ((W - 3.2) / 12));
  } else {
    add(g, RB(1.4, H, W, 0.4), shell, D / 2 - 0.7, H / 2, 0);
    const pat = canvasTex(256, 512, (c, w, h) => {
      c.fillStyle = light ? "#d2d5da" : "#0e0f11"; c.fillRect(0, 0, w, h); c.fillStyle = light ? "#f3f4f6" : "#26282d";
      if (front === "mesh") for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) { c.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; c.lineTo(x + 4.5 * Math.cos(a), y + 4.5 * Math.sin(a)); } c.fill(); }
      else for (let y = 20; y < h - 20; y += 10) for (let x = 0; x < 36; x += 10) { c.beginPath(); c.arc(x + 8, y, 2.5, 0, 7); c.fill(); }
    });
    add(g, new THREE.PlaneGeometry(W - 3, H - 3), new THREE.MeshStandardMaterial({ map: pat, roughness: 0.75, metalness: 0.2 }), D / 2 + 0.02, H / 2, 0).rotation.y = Math.PI / 2;
  }
  // glass side panel + frame
  add(g, RB(D - 0.6, H - 0.6, 0.35, 0.15, 1), glassMat(light), 0, H / 2, W / 2 - 0.2);
  for (const [w, h, x, y] of [[D, 0.9, 0, H - 0.45], [D, 0.9, 0, 0.45], [0.9, H, -D / 2 + 0.45, H / 2], [0.9, H, D / 2 - 0.45, H / 2]]) add(g, RB(w, h, 0.5, 0.15, 1), shell, x, y, W / 2 - 0.25);

  // PSU shroud
  add(g, RB(D - 1, 10, W - 1.2, 0.3), shell, 0, 5, -0.4);
  const shroudLabel = canvasTex(512, 96, (c, w, h) => { c.fillStyle = light ? "rgba(0,0,0,.35)" : "rgba(255,255,255,.35)"; c.font = "bold 54px Arial"; c.fillText("ITCOM", 8, 66); });
  add(g, new THREE.PlaneGeometry(9, 1.7), new THREE.MeshStandardMaterial({ map: shroudLabel, transparent: true }), D / 2 - 9, 5, W / 2 - 1.01);
  // cable grommets
  for (const y of [15, 24, 33]) add(g, RB(1, 4, 0.2, 0.4, 2), M.plastic("#08090a"), 5.2, y, -W / 2 + 0.62);

  if (withFans) {
    const fanCol = light ? "#e9eaee" : "#141518";
    const blade = light ? "#f4f5f7" : "#1b1c20";
    const rear = fan(12, { frame: fanCol, blades: blade, rgb });
    rear.rotation.y = Math.PI / 2; rear.position.set(-D / 2 + 1.8, H - 10, -1.5); g.add(rear);
    for (const y of [16.5, 28.5, 40.5]) {
      if (front === "glass") continue;
      const f = fan(12, { frame: fanCol, blades: blade, rgb });
      f.rotation.y = -Math.PI / 2; f.position.set(D / 2 - 2.6, y, 0); g.add(f);
    }
    if (front === "glass") for (const x of [-8, 5, 18]) { const f = fan(12, { frame: fanCol, blades: blade, rgb }); f.rotation.x = -Math.PI / 2; f.position.set(x, 10.6, 3); g.add(f); }
  }
  return g;
}

// Smoked tempered glass: dark tint, sharp reflections.
function glassMat(light = false) {
  return new THREE.MeshPhysicalMaterial({ color: light ? "#e6ebf2" : "#3a4250", transparent: true, opacity: light ? 0.07 : 0.1, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.9, depthWrite: false });
}

/* ------------------------------------------------------------------ full PC */
const sleeve = (b) => (isLight(b.caseColor || "#16171a") ? "#e9eaee" : "#17181b");
// b = { case, caseColor, mb, cpu, ram, gpu, cooler, psu, rgb }  (each a BUILD spec object, possibly null)
export function assemble(b) {
  const { W, H, D } = CASE;
  const root = new THREE.Group();
  const rgb = b.rgb || null;
  const cs = b.case || { front: "mesh" };
  root.add(caseShell(cs, b.caseColor || "#16171a", rgb));

  const zb = -W / 2 + 1.4;
  const mbX = -D / 2 + 2.2 + MB_W / 2;
  const mbY = H - 3.2 - MB_H / 2;
  if (b.mb) {
    const mb = motherboard(b.mb);
    mb.position.set(mbX, mbY, zb);
    root.add(mb);
    if (b.ram) { const r = ramSticks(b.ram, rgb); r.position.copy(mb.position); root.add(r); }
  }
  const sock = new THREE.Vector3(mbX + SOCKET.x, mbY + SOCKET.y, zb + 0.7);
  if (b.cpu) add(root, RB(3.9, 3.9, 0.35, 0.1), M.metal("#c9ccd2", 0.25, 0.95), sock.x, sock.y, sock.z);
  if (b.cooler) {
    if (b.cooler.kind === "aio") {
      const pump = pumpHead(b.cooler, rgb);
      pump.position.copy(sock); root.add(pump);
      const rad = radiator(b.cooler.rad, b.cooler, rgb);
      rad.position.set(D / 2 - 3.5 - rad.userData.len / 2, H - 2.3, 2.2);
      root.add(rad);
      const end = new THREE.Vector3(rad.position.x - rad.userData.len / 2 + 1.6, H - 3.6, 2.2);
      for (const dz of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(sock.x + 3, sock.y + 1.2 * dz, sock.z + 2),
          new THREE.Vector3(sock.x + 6, sock.y + 3 + dz, sock.z + 5),
          new THREE.Vector3(end.x + 2, end.y - 4, end.z + dz * 1.2),
          new THREE.Vector3(end.x, end.y, end.z + dz * 1.2),
        ]);
        add(root, new THREE.TubeGeometry(curve, 40, 0.55, 12, false), M.plastic("#0e0f11", 0.7));
      }
    } else {
      const c = airCooler(b.cooler, rgb);
      c.position.copy(sock); root.add(c);
    }
  }
  if (b.gpu) {
    const gpu = graphicsCard({ ...b.gpu, label: b.gpuLabel }, rgb);
    gpu.position.set(-D / 2 + 1.2, mbY + PCIE_Y + 0.3, zb + 0.5);
    root.add(gpu);
    if (b.psu) {
      const p = gpu.userData.power.clone().add(gpu.position);
      cable(root, [p, new THREE.Vector3(p.x, p.y + 0.3, p.z + 2.2), new THREE.Vector3(p.x + 1.5, 13.5, p.z + 1.2), new THREE.Vector3(p.x + 2.5, 10.2, zb + 3.5)], 6, new THREE.Vector3(1, 0, 0), sleeve(b), 0.15);
    }
  }
  if (b.mb && b.psu) {
    const s24 = new THREE.Vector3(mbX + fx(23.5) + 0.6, mbY + fy(13), zb + 0.9);
    cable(root, [new THREE.Vector3(5.6, 24, zb), new THREE.Vector3(6.6, 25.5, zb + 2.6), new THREE.Vector3(6.4, s24.y, zb + 2.4), new THREE.Vector3(s24.x + 0.3, s24.y, s24.z)], 12, new THREE.Vector3(0, 1, 0), sleeve(b), 0.19);
    const eps = new THREE.Vector3(mbX + fx(2.4), mbY + fy(0.9) + 0.6, zb + 0.9);
    cable(root, [new THREE.Vector3(eps.x - 1, H - 1.2, zb + 0.2), new THREE.Vector3(eps.x - 0.5, H - 1.6, zb + 1.8), new THREE.Vector3(eps.x, eps.y + 0.8, zb + 1.4), eps], 8, new THREE.Vector3(1, 0, 0), sleeve(b), 0.13);
  }
  if (rgb) {
    const glowLight = new THREE.PointLight(rgb, isLight(b.caseColor || "#16171a") ? 18 : 55, 60, 1.6);
    glowLight.position.set(0, 26, 4);
    root.add(glowLight);
  }
  return root;
}

/* ------------------------------------------------------------------ catalogue parts */
export function buildPart(kind, spec = {}, rgb = null) {
  if (kind === "case") return caseShell(spec, spec.colors ? spec.colors[0] : "#16171a", rgb);
  if (kind === "mb") { const g = motherboard(spec); g.rotation.x = -1.2; return g; }
  if (kind === "psu") return powerSupply(spec);
  if (kind === "cooler") {
    if (spec.kind === "aio") {
      const g = new THREE.Group();
      const rad = radiator(spec.rad, spec, rgb);
      rad.rotation.z = Math.PI / 2; rad.rotation.y = -0.3; rad.position.set(0, rad.userData.len / 2 + 1, 0);
      g.add(rad);
      const pump = pumpHead(spec, rgb);
      pump.position.set(9, 3.4, 6); pump.rotation.x = -0.9;
      g.add(pump);
      return g;
    }
    const g = airCooler(spec, rgb);
    g.rotation.x = -Math.PI / 2;
    return g;
  }
  if (kind === "pc") return assemble(spec);
  return new THREE.Group();
}

/* ------------------------------------------------------------------ viewer */
// Dark product studio: graded backdrop, glossy reflective floor, key + rim lights,
// and bloom so RGB lighting glows like it does in a real build.
export function createViewer(container) {
  const small = (container.clientWidth || innerWidth) < 760;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const backdrop = canvasTex(1024, 1024, (c, w, h) => {
    const g = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, w * 0.75);
    g.addColorStop(0, "#2a2e37"); g.addColorStop(0.45, "#15171c"); g.addColorStop(1, "#060709");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  scene.background = backdrop;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(50, 90, 80);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 40, far: 220 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04; key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0x9db8ff, 2.6); rim.position.set(-70, 60, -60);
  const fill = new THREE.HemisphereLight(0xdfe6ff, 0x0b0c10, 0.35);
  scene.add(key, rim, fill);

  // glossy floor: a real reflection, faded into the backdrop at the edges
  const mirror = new Reflector(new THREE.CircleGeometry(160, 64), {
    textureWidth: Math.round((container.clientWidth || 800) * 0.6),
    textureHeight: Math.round((container.clientHeight || 600) * 0.6),
    color: 0x6b7280,
  });
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -1.15;
  scene.add(mirror);
  const veilTex = canvasTex(512, 512, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(9,10,13,.62)"); g.addColorStop(0.35, "rgba(9,10,13,.8)"); g.addColorStop(0.75, "rgba(7,8,10,.98)"); g.addColorStop(1, "rgba(6,7,9,1)");
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const veil = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshBasicMaterial({ map: veilTex, transparent: true, depthWrite: false }));
  veil.rotation.x = -Math.PI / 2; veil.position.y = -1.1;
  scene.add(veil);
  const contactTex = canvasTex(256, 256, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(0,0,0,.75)"); g.addColorStop(0.7, "rgba(0,0,0,.25)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(64, 40), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = -1.05;
  scene.add(contact);

  const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 60;
  controls.maxDistance = 170;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.autoRotateSpeed = 0.8;
  const home = () => { camera.position.set(58, 46, 108); controls.target.set(0, 21, 0); controls.update(); };
  home();

  let composer = null, bloom = null, ao = null;
  try {
    // multisampled target: the composer otherwise loses the canvas anti-aliasing
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(scene, camera));
    if (!small) {
      // contact shadows where parts meet; see-through materials are left out of the AO depth pass
      ao = new GTAOPass(scene, camera, 1, 1, undefined, { radius: 2.2, distanceExponent: 1.4, thickness: 1.5, scale: 1, samples: 12 });
      ao.blendIntensity = 0.85;
      const hide = ao.overrideVisibility.bind(ao);
      ao.overrideVisibility = () => { hide(); scene.traverse((o) => { if (o.isMesh && (o.material.transparent || o.userData.noAO)) o.visible = false; }); };
      composer.addPass(ao);
    }
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.4, 2.2);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  } catch (e) { composer = null; }

  let pc = null;
  function disposeTree(o) {
    o.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      if (n.material) [].concat(n.material).forEach((m) => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); });
    });
  }
  function setBuild(b) {
    if (pc) { scene.remove(pc); disposeTree(pc); spinners.clear(); }
    pc = assemble(b);
    pc.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      o.castShadow = !m.transparent && !(m.emissiveIntensity > 1);
      o.receiveShadow = !m.transparent;
      if (!m.transparent) m.envMapIntensity = 0.6; // deeper blacks: less studio sheen on dark parts
    });
    scene.add(pc);
  }

  function resize() {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w < 520 ? 38 : 30;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let running = true, last = performance.now();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) spinners.forEach((r) => { r.rotation.z += dt * 9; });
    controls.update();
    if (composer) composer.render(); else renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  return {
    setBuild,
    setAutoRotate(v) { controls.autoRotate = !!v && !reduce; },
    resetView: home,
    snapshot: () => renderer.domElement.toDataURL("image/jpeg", 0.85),
    pause() { running = false; },
    resume() { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } },
    dispose() { running = false; ro.disconnect(); controls.dispose(); if (pc) disposeTree(pc); composer?.dispose?.(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
