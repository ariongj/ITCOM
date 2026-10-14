/* Studio‑style product renders (SVG), used until a real photo (`img`) is set.
 * window.productArt(product) → SVG markup string.
 */
(() => {
  "use strict";
  let uid = 0;

  // Mix a hex colour toward white (amt > 0) or black (amt < 0).
  function sh(hex, amt) {
    const h = hex.replace("#", "");
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    return "#" + [0, 2, 4].map((i) => {
      const v = parseInt(h.substr(i, 2), 16);
      return Math.round((t - v) * p + v).toString(16).padStart(2, "0");
    }).join("");
  }
  const isLight = (hex) => {
    const h = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 150;
  };

  const lin = (id, a, b, x2 = 0, y2 = 1) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

  const shadow = (id, cx = 200, cy = 270, rx = 150, ry = 12, o = 0.28) =>
    `<radialGradient id="${id}"><stop offset="0" stop-color="#000" stop-opacity="${o}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>` +
    `</defs><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"/><defs>`;

  // Abstract "modern OS" wallpaper clipped to a rect.
  function screen(k, x, y, w, h, r, wall) {
    const [a, b] = wall || ["#3a7bff", "#7a2cff"];
    return `<defs>${lin(k + "w", a, b, 1, 1)}<clipPath id="${k}c"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath></defs>
      <g clip-path="url(#${k}c)">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${k}w)"/>
        <ellipse cx="${x + w * 0.72}" cy="${y + h * 0.78}" rx="${w * 0.55}" ry="${h * 0.42}" fill="${b}" opacity=".75" transform="rotate(-18 ${x + w * 0.72} ${y + h * 0.78})"/>
        <ellipse cx="${x + w * 0.2}" cy="${y + h * 0.15}" rx="${w * 0.45}" ry="${h * 0.35}" fill="${sh(a, 0.35)}" opacity=".55" transform="rotate(-18 ${x + w * 0.2} ${y + h * 0.15})"/>
        <ellipse cx="${x + w * 0.55}" cy="${y + h * 0.5}" rx="${w * 0.3}" ry="${h * 0.12}" fill="#fff" opacity=".12" transform="rotate(-18 ${x + w * 0.55} ${y + h * 0.5})"/>
        <polygon points="${x},${y} ${x + w * 0.45},${y} ${x + w * 0.15},${y + h} ${x},${y + h}" fill="#fff" opacity=".07"/>
      </g>`;
  }

  const R = {};

  R.laptop = (k, c, a) => {
    const d = sh(c, -0.35), l = sh(c, 0.25);
    return `<defs>${lin(k + "b", l, c)}${lin(k + "d", sh(c, 0.12), sh(c, -0.18))}${shadow(k + "s", 200, 226, 175, 9, 0.35)}</defs>
      <rect x="76" y="24" width="248" height="176" rx="11" fill="url(#${k}b)"/>
      <rect x="82" y="30" width="236" height="164" rx="7" fill="#0b0c0f"/>
      ${screen(k, 89, 38, 222, 148, 2, a.w)}
      <circle cx="200" cy="34" r="1.6" fill="#2b2f38"/>
      <rect x="76" y="196" width="248" height="5" fill="${d}"/>
      <path d="M34 200 H366 L378 214 Q380 222 368 222 H32 Q20 222 22 214 Z" fill="url(#${k}d)"/>
      <path d="M34 200 H366 L368 203 H32 Z" fill="${l}" opacity=".7"/>
      <rect x="172" y="200" width="56" height="5" rx="2.5" fill="${d}" opacity=".6"/>`;
  };

  R.monitor = (k, c, a) => {
    const d = sh(c, -0.3), l = sh(c, 0.2);
    return `<defs>${lin(k + "b", l, c)}${lin(k + "n", c, d, 1, 0)}${shadow(k + "s", 200, 268, 120, 9, 0.35)}</defs>
      <path d="M186 214 H214 L218 258 H182 Z" fill="url(#${k}n)"/>
      <path d="M124 258 Q200 250 276 258 L282 266 Q200 274 118 266 Z" fill="url(#${k}b)"/>
      <rect x="40" y="20" width="320" height="196" rx="8" fill="url(#${k}b)"/>
      <rect x="45" y="25" width="310" height="180" rx="4" fill="#0b0c0f"/>
      ${screen(k, 48, 28, 304, 174, 2, a.w)}
      <rect x="190" y="208" width="20" height="2.5" rx="1.25" fill="${d}"/>`;
  };

  R.imac = (k, c, a) => {
    const d = sh(c, -0.25), l = sh(c, 0.35);
    return `<defs>${lin(k + "b", l, c)}${lin(k + "n", sh(c, 0.15), d, 1, 0)}${shadow(k + "s", 200, 270, 110, 8, 0.3)}</defs>
      <path d="M168 222 H232 L246 266 H154 Z" fill="url(#${k}n)"/>
      <rect x="56" y="16" width="288" height="210" rx="12" fill="url(#${k}b)"/>
      <rect x="56" y="16" width="288" height="176" rx="12" fill="#f4f5f7"/>
      <rect x="56" y="180" width="288" height="12" fill="#f4f5f7"/>
      ${screen(k, 66, 26, 268, 156, 3, a.w)}`;
  };

  R.macmini = (k, c) => {
    const d = sh(c, -0.22), l = sh(c, 0.3);
    return `<defs>${lin(k + "t", l, c)}${lin(k + "f", c, d)}${shadow(k + "s", 200, 236, 160, 12, 0.3)}</defs>
      <path d="M116 118 Q120 108 132 108 H268 Q280 108 284 118 L320 172 H80 Z" fill="url(#${k}t)"/>
      <path d="M80 172 H320 V214 Q320 228 306 228 H94 Q80 228 80 214 Z" fill="url(#${k}f)"/>
      <rect x="126" y="196" width="10" height="5" rx="2" fill="${sh(c, -0.55)}"/><rect x="142" y="196" width="10" height="5" rx="2" fill="${sh(c, -0.55)}"/>
      <circle cx="166" cy="198.5" r="3" fill="${sh(c, -0.55)}"/><circle cx="292" cy="198" r="2" fill="#7dff9e"/>`;
  };

  R.minipc = (k, c, a) => {
    const d = sh(c, -0.35), l = sh(c, 0.2);
    return `<defs>${lin(k + "t", l, c)}${lin(k + "f", sh(c, 0.05), d)}${shadow(k + "s", 200, 240, 150, 12, 0.3)}</defs>
      <path d="M124 92 H276 L318 140 H82 Z" fill="url(#${k}t)"/>
      <path d="M82 140 H318 V222 Q318 230 310 230 H90 Q82 230 82 222 Z" fill="url(#${k}f)"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${200 + i * 11}" y="158" width="6" height="52" rx="3" fill="${d}" opacity=".7"/>`).join("")}
      <circle cx="108" cy="160" r="6" fill="none" stroke="${sh(c, 0.45)}" stroke-width="1.5"/><circle cx="108" cy="160" r="1.8" fill="#6ec1ff"/>
      <rect x="100" y="186" width="16" height="6" rx="2" fill="${sh(c, -0.6)}"/><rect x="100" y="200" width="16" height="6" rx="2" fill="${sh(c, -0.6)}"/>
      <rect x="124" y="186" width="10" height="5" rx="2" fill="${sh(c, -0.6)}"/>
      ${a.l ? `<text x="150" y="214" font-family="Archivo, sans-serif" font-weight="800" font-size="13" fill="${sh(c, 0.6)}">${a.l.toUpperCase()}</text>` : ""}`;
  };

  R.tower = (k, c, a) => {
    const d = sh(c, -0.35), l = sh(c, 0.25);
    return `<defs>${lin(k + "f", l, c)}${lin(k + "s2", sh(c, -0.1), d, 1, 0)}${shadow(k + "s", 210, 262, 120, 10, 0.32)}</defs>
      <path d="M262 36 L302 54 V246 L262 258 Z" fill="url(#${k}s2)"/>
      <path d="M150 36 H262 L302 54 H190 Z" fill="${sh(c, 0.35)}"/>
      <rect x="140" y="36" width="122" height="222" rx="6" fill="url(#${k}f)"/>
      ${Array.from({ length: 16 }, (_, i) => `<rect x="158" y="${96 + i * 8}" width="86" height="3" rx="1.5" fill="${d}" opacity=".55"/>`).join("")}
      <circle cx="201" cy="64" r="8" fill="none" stroke="${sh(c, 0.5)}" stroke-width="2"/><circle cx="201" cy="64" r="2.5" fill="#6ec1ff"/>
      <rect x="166" y="80" width="12" height="5" rx="2" fill="${sh(c, -0.6)}"/><rect x="184" y="80" width="12" height="5" rx="2" fill="${sh(c, -0.6)}"/>
      ${a.l ? `<text x="201" y="246" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="14" fill="${sh(c, 0.6)}">${a.l}</text>` : ""}`;
  };

  R.server = (k, c) => {
    const d = sh(c, -0.35), l = sh(c, 0.22);
    return `<defs>${lin(k + "f", l, c)}${lin(k + "s2", sh(c, -0.1), d, 1, 0)}${shadow(k + "s", 210, 264, 125, 10, 0.32)}</defs>
      <path d="M266 30 L308 50 V250 L266 262 Z" fill="url(#${k}s2)"/>
      <path d="M140 30 H266 L308 50 H182 Z" fill="${sh(c, 0.3)}"/>
      <rect x="130" y="30" width="136" height="232" rx="6" fill="url(#${k}f)"/>
      <rect x="142" y="44" width="112" height="44" rx="3" fill="${sh(c, -0.5)}"/>
      ${[0, 1].map((i) => `<rect x="146" y="${48 + i * 20}" width="104" height="16" rx="2" fill="${sh(c, 0.12)}"/><circle cx="240" cy="${56 + i * 20}" r="2" fill="#7dff9e"/>`).join("")}
      ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 9 }, (_, i) => `<circle cx="${150 + i * 12}" cy="${104 + r * 11}" r="2.2" fill="${d}"/>`).join("")).join("")}
      <circle cx="198" cy="244" r="6" fill="none" stroke="${sh(c, 0.5)}" stroke-width="1.6"/><circle cx="198" cy="244" r="2" fill="#6ec1ff"/>`;
  };

  R.ups = (k, c, a) => {
    const d = sh(c, -0.35), l = sh(c, 0.22);
    return `<defs>${lin(k + "f", l, c)}${lin(k + "s2", sh(c, -0.1), d, 1, 0)}${shadow(k + "s", 210, 258, 120, 10, 0.32)}</defs>
      <path d="M262 70 L306 86 V244 L262 254 Z" fill="url(#${k}s2)"/>
      <path d="M144 70 H262 L306 86 H188 Z" fill="${sh(c, 0.3)}"/>
      <rect x="138" y="70" width="124" height="184" rx="8" fill="url(#${k}f)"/>
      <rect x="160" y="92" width="80" height="36" rx="4" fill="#0e1a12"/>
      <rect x="166" y="98" width="68" height="24" rx="2" fill="#2fbf71" opacity=".85"/>
      <text x="200" y="115" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" fill="#08321b">230V 64%</text>
      <circle cx="176" cy="146" r="6" fill="${sh(c, 0.3)}"/><circle cx="200" cy="146" r="6" fill="${sh(c, 0.3)}"/><circle cx="224" cy="146" r="6" fill="#2fbf71"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="156" y="${170 + i * 9}" width="88" height="3" rx="1.5" fill="${d}" opacity=".6"/>`).join("")}
      <text x="200" y="244" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="11" fill="${sh(c, 0.55)}" letter-spacing="1">${a.l === "smart" ? "SMART-UPS" : "BACK-UPS"}</text>`;
  };

  R.router = (k, c, a) => {
    const d = sh(c, isLight(c) ? -0.25 : -0.4), l = sh(c, 0.18);
    const ant = isLight(c) ? [] : [70, 140, 260, 330];
    return `<defs>${lin(k + "t", l, c)}${lin(k + "f", c, d)}${shadow(k + "s", 200, 238, 170, 10, 0.3)}</defs>
      ${ant.map((x, i) => `<rect x="${x - 7}" y="${60 + (i % 2) * 8}" width="14" height="${110 - (i % 2) * 8}" rx="7" fill="${sh(c, i % 2 ? -0.05 : 0.08)}" transform="rotate(${(i - 1.5) * 6} ${x} 170)"/>`).join("")}
      <path d="M60 162 Q62 150 76 150 H324 Q338 150 340 162 L356 200 H44 Z" fill="url(#${k}t)"/>
      <path d="M44 200 H356 V214 Q356 226 344 226 H56 Q44 226 44 214 Z" fill="url(#${k}f)"/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="${150 + i * 20}" cy="212" r="2.4" fill="${i < 4 ? "#38d39f" : "#5aa9ff"}"/>`).join("")}
      ${a.l ? `<text x="200" y="185" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="700" font-size="13" fill="${d}">${a.l}</text>` : ""}`;
  };

  R.ap = (k, c) => {
    const d = sh(c, -0.18);
    return `<defs><radialGradient id="${k}t" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${d}"/></radialGradient>${shadow(k + "s", 200, 214, 165, 14, 0.3)}</defs>
      <path d="M62 150 A138 46 0 0 0 338 150 V166 A138 46 0 0 1 62 166 Z" fill="${sh(c, -0.28)}"/>
      <ellipse cx="200" cy="150" rx="138" ry="46" fill="url(#${k}t)"/>
      <ellipse cx="200" cy="148" rx="26" ry="9" fill="none" stroke="#3b8cff" stroke-width="4" opacity=".9"/>
      <ellipse cx="200" cy="148" rx="26" ry="9" fill="none" stroke="#a9d1ff" stroke-width="1.2"/>`;
  };

  R.mesh = (k, c) => {
    const unit = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-40" y="0" width="80" height="150" rx="34" fill="url(#${k}b)"/>
      <ellipse cx="0" cy="22" rx="34" ry="12" fill="${sh(c, -0.06)}"/>
      <rect x="-14" y="124" width="28" height="3" rx="1.5" fill="#38d39f"/></g>`;
    return `<defs>${lin(k + "b", "#ffffff", sh(c, -0.16), 1, 0)}${shadow(k + "s", 200, 250, 170, 12, 0.28)}</defs>
      ${unit(110, 92, 0.92)}${unit(290, 92, 0.92)}${unit(200, 70, 1.12)}`;
  };

  R.switch = (k, c, a) => {
    const n = a.l === "24" ? 24 : 8;
    const d = sh(c, isLight(c) ? -0.2 : -0.45), l = sh(c, 0.2);
    const portW = n === 24 ? 18 : 22, startX = n === 24 ? 70 : 140;
    const ports = Array.from({ length: n }, (_, i) => {
      const col = n === 24 ? Math.floor(i / 2) : i, row = n === 24 ? i % 2 : 0;
      const x = startX + col * (portW + 3), y = n === 24 ? 140 + row * 22 : 150;
      return `<rect x="${x}" y="${y}" width="${portW}" height="17" rx="2" fill="#15171b"/><rect x="${x + portW / 2 - 4}" y="${y + 11}" width="8" height="4" fill="#3a3e47"/><circle cx="${x + 4}" cy="${y - 3}" r="1.4" fill="${i % 3 ? "#38d39f" : "#f5b638"}"/>`;
    }).join("");
    const udm = a.l === "UDM PRO";
    return `<defs>${lin(k + "t", l, c)}${lin(k + "f", c, d)}${shadow(k + "s", 200, 210, 185, 10, 0.3)}</defs>
      <path d="M38 108 H362 L384 128 H16 Z" fill="url(#${k}t)"/>
      <rect x="16" y="128" width="368" height="70" rx="4" fill="url(#${k}f)"/>
      <rect x="16" y="128" width="20" height="70" fill="${d}"/><rect x="364" y="128" width="20" height="70" fill="${d}"/>
      <circle cx="26" cy="140" r="3" fill="${sh(c, -0.5)}"/><circle cx="26" cy="186" r="3" fill="${sh(c, -0.5)}"/><circle cx="374" cy="140" r="3" fill="${sh(c, -0.5)}"/><circle cx="374" cy="186" r="3" fill="${sh(c, -0.5)}"/>
      ${udm ? `<rect x="56" y="140" width="62" height="40" rx="3" fill="#0c0d10"/><rect x="60" y="144" width="54" height="32" rx="2" fill="#1b5cff" opacity=".8"/><rect x="66" y="156" width="30" height="3" rx="1.5" fill="#fff" opacity=".8"/>` : ""}
      ${ports}
      <rect x="${n === 24 ? 330 : 330}" y="146" width="22" height="22" rx="2" fill="#15171b" stroke="#6b7280" stroke-width="1"/>`;
  };

  R.nas = (k, c, a) => {
    const bays = Number(a.l) || 2;
    const d = sh(c, -0.35), l = sh(c, 0.22);
    const w = bays === 4 ? 230 : 150, x0 = 200 - w / 2 - 15;
    const bw = (w - 20 - (bays - 1) * 6) / bays;
    return `<defs>${lin(k + "f", l, c)}${lin(k + "s2", sh(c, -0.1), d, 1, 0)}${shadow(k + "s", 210, 258, w / 2 + 60, 10, 0.32)}</defs>
      <path d="M${x0 + w} 46 L${x0 + w + 36} 62 V240 L${x0 + w} 252 Z" fill="url(#${k}s2)"/>
      <path d="M${x0 + 6} 46 H${x0 + w} L${x0 + w + 36} 62 H${x0 + 42} Z" fill="${sh(c, 0.3)}"/>
      <rect x="${x0}" y="46" width="${w}" height="206" rx="10" fill="url(#${k}f)"/>
      ${Array.from({ length: bays }, (_, i) => {
        const bx = x0 + 10 + i * (bw + 6);
        return `<rect x="${bx}" y="74" width="${bw}" height="156" rx="4" fill="${sh(c, -0.5)}"/>
          ${Array.from({ length: 10 }, (_, j) => `<rect x="${bx + 6}" y="${84 + j * 12}" width="${bw - 12}" height="4" rx="2" fill="${sh(c, 0.08)}"/>`).join("")}
          <circle cx="${bx + bw / 2}" cy="222" r="2.2" fill="#38d39f"/>`;
      }).join("")}
      <circle cx="${x0 + 18}" cy="60" r="4" fill="#5aa9ff"/>`;
  };

  R.m2 = (k, c, a) =>
    `<defs>${lin(k + "p", sh(c, 0.18), c)}${shadow(k + "s", 200, 214, 175, 10, 0.3)}</defs>
      <g transform="rotate(-8 200 160)">
        <rect x="30" y="118" width="340" height="80" rx="5" fill="url(#${k}p)"/>
        ${Array.from({ length: 30 }, (_, i) => i === 5 ? "" : `<rect x="20" y="${122 + i * 2.4}" width="14" height="1.6" fill="#d9a82e"/>`).join("")}
        <rect x="70" y="128" width="64" height="60" rx="3" fill="#0a0b0c"/>
        <rect x="150" y="128" width="64" height="60" rx="3" fill="#0a0b0c"/>
        <rect x="230" y="134" width="44" height="48" rx="3" fill="#0a0b0c"/>
        <rect x="64" y="126" width="230" height="64" rx="4" fill="${sh(c, 0.06)}" opacity=".96"/>
        <text x="80" y="164" font-family="Archivo, sans-serif" font-weight="800" font-size="22" fill="#e9ebf0" letter-spacing=".5">${a.l || "NVMe"}</text>
        <text x="80" y="180" font-family="IBM Plex Mono, monospace" font-size="9" fill="#9aa1b3">PCIe 4.0 NVMe M.2</text>
        <path d="M352 140 A18 18 0 0 1 352 176" fill="none" stroke="#c9a54a" stroke-width="5"/>
        <circle cx="360" cy="158" r="7" fill="#f3f4f8"/>
      </g>`;

  R.sata = (k, c, a) =>
    `<defs>${lin(k + "b", sh(c, 0.2), c, 1, 1)}${shadow(k + "s", 200, 246, 150, 12, 0.3)}</defs>
      <g transform="rotate(-10 200 150)">
        <rect x="88" y="52" width="224" height="170" rx="8" fill="url(#${k}b)"/>
        <rect x="104" y="70" width="192" height="134" rx="4" fill="${sh(c, 0.1)}"/>
        <text x="120" y="130" font-family="Archivo, sans-serif" font-weight="800" font-size="26" fill="#eef0f6">${a.l || "SSD"}</text>
        <text x="120" y="152" font-family="IBM Plex Mono, monospace" font-size="10" fill="#9aa1b3">SATA 6 Gb/s · 2.5"</text>
        <rect x="260" y="80" width="26" height="26" rx="13" fill="none" stroke="#9aa1b3" stroke-width="1.4"/>
      </g>`;

  R.hdd = (k, c, a) => {
    const red = /red/i.test(a.l || "");
    const lab = red ? "#b3202e" : "#1f2a3a";
    return `<defs>${lin(k + "m", "#e7e9ee", "#a9aeb8", 1, 1)}${shadow(k + "s", 200, 262, 140, 11, 0.3)}</defs>
      <g transform="rotate(-6 200 150)">
        <rect x="96" y="30" width="208" height="230" rx="8" fill="url(#${k}m)"/>
        <circle cx="200" cy="96" r="54" fill="none" stroke="#c4c8d0" stroke-width="2"/>
        <rect x="108" y="130" width="184" height="118" rx="5" fill="${lab}"/>
        <text x="122" y="176" font-family="Archivo, sans-serif" font-weight="800" font-size="22" fill="#fff">${a.l || "HDD"}</text>
        <text x="122" y="196" font-family="IBM Plex Mono, monospace" font-size="10" fill="#ffffffb0">NAS HARD DRIVE · CMR</text>
        <rect x="122" y="214" width="120" height="16" fill="#fff" opacity=".9"/>
        ${Array.from({ length: 22 }, (_, i) => `<rect x="${125 + i * 5}" y="216" width="${i % 3 ? 2 : 3}" height="12" fill="#111"/>`).join("")}
        ${[[106, 40], [294, 40], [106, 250], [294, 250]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#8e939e"/>`).join("")}
      </g>`;
  };

  R.portable = (k, c, a) => {
    const orange = a.l === "orange";
    return `<defs>${lin(k + "b", sh(c, 0.25), c, 1, 1)}${shadow(k + "s", 200, 256, 110, 11, 0.32)}</defs>
      <g transform="rotate(-12 200 150)">
        <rect x="128" y="44" width="144" height="206" rx="${orange ? 28 : 18}" fill="url(#${k}b)"/>
        ${orange
          ? `<path d="M148 44 Q128 44 128 70 V92 Q150 92 160 70 Q166 56 176 44 Z" fill="#ff6a13"/><circle cx="146" cy="64" r="9" fill="#f3f4f8"/>`
          : Array.from({ length: 9 }, (_, i) => `<path d="M136 ${76 + i * 18} Q200 ${66 + i * 18} 264 ${76 + i * 18}" fill="none" stroke="${sh(c, -0.25)}" stroke-width="3"/>`).join("")}
        <rect x="186" y="240" width="28" height="6" rx="3" fill="${sh(c, -0.5)}"/>
        <text x="200" y="${orange ? 170 : 236}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="${orange ? 16 : 11}" fill="${sh(c, 0.55)}">${orange ? "EXTREME" : "T7 SHIELD"}</text>
      </g>`;
  };

  R.keyboard = (k, c) => {
    const keys = [];
    for (let r = 0; r < 5; r++) {
      const y = 140 + r * 15, inset = 52 - r * 6, w = 400 - inset * 2;
      const n = r === 4 ? 9 : 14, gap = 3.5;
      const kw = (w - (n - 1) * gap) / n;
      let x = inset;
      for (let i = 0; i < n; i++) {
        const ww = r === 4 && i === 4 ? kw * 5 + gap * 4 : kw;
        if (r === 4 && i > 4 && i < 9 && x > 400 - inset) break;
        keys.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${ww.toFixed(1)}" height="12" rx="3" fill="${sh(c, -0.25)}"/><rect x="${(x + 1).toFixed(1)}" y="${y + 0.5}" width="${(ww - 2).toFixed(1)}" height="9" rx="2.5" fill="${sh(c, 0.12)}"/>`);
        x += ww + gap;
      }
    }
    return `<defs>${lin(k + "b", sh(c, 0.2), sh(c, -0.2))}${shadow(k + "s", 200, 230, 185, 10, 0.3)}</defs>
      <path d="M48 128 Q50 122 58 122 H342 Q350 122 352 128 L380 214 Q382 222 372 222 H28 Q18 222 20 214 Z" fill="url(#${k}b)"/>
      <path d="M20 214 Q18 222 28 222 H372 Q382 222 380 214 L381 220 Q382 228 372 228 H28 Q18 228 19 220 Z" fill="${sh(c, -0.4)}"/>
      ${keys.join("")}`;
  };

  R.mouse = (k, c, a) => {
    const light = isLight(c), d = sh(c, light ? -0.18 : -0.4), l = sh(c, light ? 0.6 : 0.3);
    const gaming = a.l === "gaming";
    const body = gaming
      ? "M200 36 C262 36 278 112 276 178 C274 236 244 262 200 262 C156 262 126 236 124 178 C122 112 138 36 200 36 Z"
      : "M196 34 C268 30 292 110 288 176 C284 236 246 266 196 264 C150 262 118 236 116 186 C112 132 128 38 196 34 Z";
    return `<defs><radialGradient id="${k}b" cx=".42" cy=".3" r=".85"><stop offset="0" stop-color="${l}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>${shadow(k + "s", 204, 262, 110, 11, 0.32)}</defs>
      <path d="${body}" fill="url(#${k}b)"/>
      <path d="M200 38 V128" stroke="${d}" stroke-width="2"/>
      <rect x="193" y="62" width="14" height="36" rx="7" fill="${sh(c, -0.5)}"/><rect x="196" y="66" width="8" height="28" rx="4" fill="${sh(c, light ? -0.3 : 0.2)}"/>
      <path d="M128 132 C140 128 160 130 170 136" stroke="${d}" stroke-width="2" fill="none"/>
      ${gaming ? "" : `<path d="M118 168 Q116 150 124 140" stroke="${sh(c, 0.35)}" stroke-width="7" stroke-linecap="round" fill="none"/>`}
      <circle cx="${gaming ? 200 : 214}" cy="${gaming ? 214 : 210}" r="5" fill="${sh(c, light ? -0.25 : 0.25)}" opacity=".7"/>`;
  };

  R.headset = (k, c) => {
    const d = sh(c, isLight(c) ? -0.2 : -0.4), l = sh(c, 0.25);
    const cup = (x, flip) => `<g transform="translate(${x} 0)${flip ? " scale(-1 1)" : ""}">
      <ellipse cx="0" cy="186" rx="44" ry="62" fill="url(#${k}b)"/>
      <ellipse cx="${flip ? 10 : 10}" cy="186" rx="30" ry="48" fill="${d}"/>
      <ellipse cx="14" cy="186" rx="20" ry="36" fill="${sh(c, isLight(c) ? -0.35 : -0.6)}"/></g>`;
    return `<defs>${lin(k + "b", l, d, 1, 1)}${shadow(k + "s", 200, 258, 150, 10, 0.3)}</defs>
      <path d="M104 170 C100 38 300 38 296 170" fill="none" stroke="${d}" stroke-width="22" stroke-linecap="round"/>
      <path d="M104 170 C100 38 300 38 296 170" fill="none" stroke="${l}" stroke-width="12" stroke-linecap="round"/>
      <path d="M112 160 C112 66 288 66 288 160" fill="none" stroke="${sh(c, -0.5)}" stroke-width="8" stroke-linecap="round" opacity=".6"/>
      ${cup(98, false)}${cup(302, true)}`;
  };

  R.webcam = (k, c, a) => {
    const d = sh(c, -0.4), l = sh(c, 0.25);
    return `<defs>${lin(k + "b", l, c)}<radialGradient id="${k}l" cx=".35" cy=".35"><stop offset="0" stop-color="#4b6bb3"/><stop offset=".55" stop-color="#121a33"/><stop offset="1" stop-color="#05070d"/></radialGradient>${shadow(k + "s", 200, 250, 110, 9, 0.3)}</defs>
      <path d="M170 160 L160 236 H240 L230 160 Z" fill="${d}"/>
      <rect x="146" y="232" width="108" height="12" rx="6" fill="${c}"/>
      <rect x="${a.l === "4k" ? 92 : 104}" y="94" width="${a.l === "4k" ? 216 : 192}" height="72" rx="${a.l === "4k" ? 14 : 36}" fill="url(#${k}b)"/>
      <circle cx="200" cy="130" r="27" fill="${sh(c, -0.6)}"/><circle cx="200" cy="130" r="20" fill="url(#${k}l)"/>
      <circle cx="193" cy="123" r="5" fill="#fff" opacity=".55"/><circle cx="207" cy="138" r="2" fill="#fff" opacity=".3"/>
      <circle cx="248" cy="130" r="3" fill="${sh(c, -0.6)}"/><circle cx="152" cy="130" r="3" fill="${sh(c, -0.6)}"/>
      ${a.l === "4k" ? `<text x="276" y="135" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="11" fill="${sh(c, 0.6)}">4K</text>` : ""}`;
  };

  R.dock = (k, c) => {
    const d = sh(c, -0.3), l = sh(c, 0.25), port = sh(c, isLight(c) ? -0.65 : -0.7);
    return `<defs>${lin(k + "t", l, c)}${lin(k + "f", c, d)}${shadow(k + "s", 200, 232, 170, 10, 0.3)}</defs>
      <path d="M86 134 Q90 124 102 124 H298 Q310 124 314 134 L338 170 H62 Z" fill="url(#${k}t)"/>
      <path d="M62 170 H338 V210 Q338 224 324 224 H76 Q62 224 62 210 Z" fill="url(#${k}f)"/>
      ${[92, 120, 148].map((x) => `<rect x="${x}" y="190" width="18" height="8" rx="4" fill="${port}"/>`).join("")}
      ${[182, 206].map((x) => `<rect x="${x}" y="188" width="16" height="11" rx="1.5" fill="${port}"/>`).join("")}
      <rect x="234" y="190" width="26" height="4" rx="1" fill="${port}"/><rect x="234" y="198" width="20" height="3" rx="1" fill="${port}"/>
      <circle cx="290" cy="194" r="5" fill="${port}"/><circle cx="314" cy="194" r="3" fill="#5aa9ff"/>`;
  };

  R.gpu = (k, c, a) => {
    const fans = Number(a.l) || 2;
    const r = fans === 3 ? 46 : 56;
    const xs = fans === 3 ? [100, 200, 300] : [130, 270];
    const blades = (cx, cy) => Array.from({ length: 9 }, (_, i) =>
      `<path d="M${cx} ${cy} q${r * 0.25} ${-r * 0.55} ${r * 0.85} ${-r * 0.42}" stroke="${sh(c, 0.18)}" stroke-width="${r * 0.22}" stroke-linecap="round" fill="none" opacity=".9" transform="rotate(${i * 40} ${cx} ${cy})"/>`).join("");
    return `<defs>${lin(k + "b", sh(c, 0.22), sh(c, -0.25))}${shadow(k + "s", 200, 250, 185, 10, 0.32)}</defs>
      <rect x="22" y="70" width="12" height="166" rx="2" fill="#b7bcc6"/>
      <rect x="112" y="226" width="200" height="12" rx="2" fill="#d4a72c"/>
      <rect x="30" y="80" width="352" height="150" rx="14" fill="url(#${k}b)"/>
      <path d="M30 104 L80 80 H140 L110 104 Z" fill="${sh(c, 0.3)}" opacity=".35"/>
      <path d="M382 200 L330 230 H270 L310 200 Z" fill="${sh(c, 0.3)}" opacity=".25"/>
      ${xs.map((x) => `<circle cx="${x + 6}" cy="155" r="${r + 4}" fill="${sh(c, -0.55)}"/>${blades(x + 6, 155)}<circle cx="${x + 6}" cy="155" r="${r * 0.28}" fill="${sh(c, 0.12)}"/><circle cx="${x + 6}" cy="155" r="${r * 0.12}" fill="${sh(c, 0.4)}"/>`).join("")}`;
  };

  R.cpu = (k, c, a) => {
    const intel = /intel/i.test(a.l || "");
    return `<defs>${lin(k + "m", "#f2f3f6", "#a3a8b2", 1, 1)}${lin(k + "g", "#2c6a3c", "#1d4a2a", 1, 1)}${shadow(k + "s", 200, 262, 130, 11, 0.32)}</defs>
      <g transform="rotate(-8 200 150)">
        <rect x="88" y="38" width="224" height="224" rx="8" fill="url(#${k}g)"/>
        ${Array.from({ length: 12 }, (_, i) => `<rect x="${96 + i * 18}" y="44" width="8" height="5" fill="#d4a72c"/><rect x="${96 + i * 18}" y="251" width="8" height="5" fill="#d4a72c"/>`).join("")}
        <rect x="108" y="58" width="184" height="184" rx="${intel ? 6 : 14}" fill="url(#${k}m)"/>
        ${intel ? "" : `<path d="M108 98 h10 v-20 h-10 M292 98 h-10 v-20 h10 M108 222 h10 v-20 h-10 M292 222 h-10 v-20 h10" fill="#2c6a3c"/>`}
        <text x="200" y="${intel ? 140 : 146}" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="${intel ? 26 : 22}" fill="#3a3f4b">${intel ? "intel" : "AMD"}</text>
        <text x="200" y="${intel ? 164 : 170}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-weight="600" font-size="12" fill="#5a606d">${intel ? "CORE i5" : a.l || "RYZEN"}</text>
        <text x="200" y="196" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" fill="#7a808c">${intel ? "LGA1700 · 14TH GEN" : "AM5 · ZEN 4"}</text>
        <path d="M100 250 l14 0 l-14 -14 Z" fill="#d4a72c"/>
      </g>`;
  };

  R.ram = (k, c, a) => {
    const stick = (dx, dy) => `<g transform="translate(${dx} ${dy})">
      <rect x="34" y="120" width="332" height="70" rx="3" fill="#121316"/>
      ${Array.from({ length: 64 }, (_, i) => i === 30 ? "" : `<rect x="${38 + i * 5}" y="180" width="3" height="10" fill="#d4a72c"/>`).join("")}
      <rect x="30" y="96" width="340" height="80" rx="4" fill="url(#${k}b)"/>
      <path d="M30 96 H370 V106 L350 112 H50 L30 106 Z" fill="${sh(c, 0.25)}"/>
      <text x="56" y="152" font-family="Archivo, sans-serif" font-weight="800" font-size="20" fill="${sh(c, 0.75)}" letter-spacing="1">${a.l || "DDR5"}</text>
      <text x="56" y="166" font-family="IBM Plex Mono, monospace" font-size="9" fill="${sh(c, 0.5)}">DDR5 · 6000 MT/s</text></g>`;
    return `<defs>${lin(k + "b", sh(c, 0.18), sh(c, -0.2))}${shadow(k + "s", 200, 236, 180, 10, 0.3)}</defs>
      <g transform="rotate(-6 200 150)">${stick(18, -36)}${stick(0, 0)}</g>`;
  };

  R.printer = (k, c, a) => {
    const light = isLight(c), d = sh(c, light ? -0.18 : -0.35), l = sh(c, light ? 0.5 : 0.22);
    const mfp = a.l === "mfp", ink = a.l === "ink";
    return `<defs>${lin(k + "f", l, c)}${lin(k + "t", sh(c, light ? 0.6 : 0.3), sh(c, light ? 0 : 0.1))}${shadow(k + "s", 200, 256, 170, 11, 0.3)}</defs>
      ${mfp ? `<path d="M120 54 H290 L312 78 H98 Z" fill="${sh(c, light ? -0.08 : 0.1)}"/><rect x="98" y="78" width="214" height="16" rx="3" fill="${d}"/><path d="M150 54 L160 30 H250 L262 54 Z" fill="#fff" stroke="${d}"/>` : ""}
      <path d="M86 94 H314 L340 122 H60 Z" fill="url(#${k}t)"/>
      <rect x="60" y="122" width="280" height="124" rx="10" fill="url(#${k}f)"/>
      <rect x="96" y="148" width="208" height="10" rx="5" fill="${sh(c, -0.55)}"/>
      <path d="M110 153 H290 L300 186 H100 Z" fill="#fff"/><path d="M110 153 H290 L292 160 H108 Z" fill="#e3e6ec"/>
      ${[0, 1, 2].map((i) => `<rect x="${130 + i * 10}" y="${166 + i * 6}" width="${120 - i * 30}" height="2.5" rx="1.2" fill="#c3c8d2"/>`).join("")}
      <rect x="84" y="206" width="232" height="30" rx="6" fill="${d}"/><rect x="176" y="218" width="48" height="5" rx="2.5" fill="${sh(c, -0.5)}"/>
      <rect x="262" y="128" width="58" height="14" rx="3" fill="#0c0d10"/><rect x="266" y="131" width="30" height="8" rx="1" fill="#3d8bff"/>
      ${ink ? ["#00a6d6", "#e0007a", "#ffd200", "#111"].map((col, i) => `<rect x="342" y="${130 + i * 26}" width="12" height="22" rx="3" fill="${col}" stroke="#fff" stroke-width="1.5"/>`).join("") : ""}`;
  };

  R.tablet = (k, c, a) =>
    `<defs>${lin(k + "b", sh(c, 0.3), sh(c, -0.15), 1, 1)}${shadow(k + "s", 200, 274, 110, 10, 0.3)}</defs>
      <g transform="rotate(-6 200 150)">
        <rect x="106" y="22" width="188" height="254" rx="18" fill="url(#${k}b)"/>
        <rect x="112" y="28" width="176" height="242" rx="13" fill="#0b0c0f"/>
        ${screen(k, 119, 35, 162, 228, 8, a.w)}
        <circle cx="200" cy="31.5" r="1.6" fill="#2b2f38"/>
      </g>`;

  window.productArt = function productArt(p) {
    const a = p.art || { s: "laptop", c: "#3a3d45" };
    const draw = R[a.s] || R.laptop;
    const k = "pa" + (++uid);
    return `<svg class="art" viewBox="0 0 400 300" role="img" aria-label="${p.name.replace(/"/g, "&quot;")}"><defs></defs>${draw(k, a.c, a)}</svg>`;
  };
})();
