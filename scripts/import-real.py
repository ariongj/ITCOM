#!/usr/bin/env python3
"""Importon paketën "ITCOM 100 produkte me foto reale" (01.11.2026) në dyqan.

Përdorimi: python3 -I scripts/import-real.py <dosja e paketës ITCOM_100_Produkte_Foto_Reale>

Rregullat (LEZERO.txt i paketës + raporti Raundi 03, f. 16–17):
- Çmimet e paketës janë referenca nga Buton / Macintoks / Startech24 në datën e marrjes, JO oferta të ITCOM.
  Dyqani nuk i shfaq: produktet dalin me "Çmimi me ofertë" dhe butonin "Kërko ofertë" derisa ekipi të vendosë
  çmimin, stokun dhe garancinë e ITCOM në CMS. Referencat ruhen vetëm për ekipin (cms/scripts/real-refs.json).
- SKU-të aktuale kanë përparësi: produktet që i kemi tashmë dhe dublikatat brenda paketës nuk importohen.
- Asnjë vlerësim, koment apo numër shitjesh. Atributet dhe pikat kryesore nxirren vetëm nga emri i produktit.
- Fotot optimizohen për web (WebP, deri 1200 px) pa ndryshuar pamjen; burimi dhe hash-i i origjinalit dokumentohen.

Dalja: js/products-real.js, assets/products/real/*.webp, assets/products/real/SOURCES.md, cms/scripts/real-refs.json
"""
import json, re, sys, unicodedata
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PACK = Path(sys.argv[1]).resolve()
OUT_IMG = ROOT / "assets/products/real"

# Dublikata: modeli është tashmë në katalog (cp-9900x3d) ose i njëjti SKU dy herë në paketë.
SKIP = {
    "itcom-real-019": "AMD Ryzen 9 9900X3D është tashmë në katalog (cp-9900x3d)",
    "itcom-real-060": "I njëjti Logitech G PRO X Superlight 2 i zi si itcom-real-058",
    "itcom-real-084": "I njëjti Google Fitbit Air Obsidian si itcom-real-082",
}

# Kategoria e dyqanit për secilin produkt (emrat përputhen me nënkategoritë te js/categories.js).
def category(r):
    n, c = r["name"].lower(), r["cat"]
    if c == "Laptopë": return "Laptopë"
    if c == "Monitorë": return "Monitorë"
    if c == "Procesorë": return "Procesorë"
    if c == "Kartela grafike": return "Kartela grafike"
    if c == "Memorie RAM": return "Memorie RAM"
    if c == "Pllaka amë": return "Pllaka amë"
    if c == "Ruajtje":
        if "nas" in n: return "NAS"
        if "lacie" in n or "hard drive" in n: return "Disqe të jashtme"
        return "SSD"
    if c == "Periferikë": return "Tastiera" if ("tastier" in n) else "Maus"
    if c == "Audio & video": return "Kufje"
    if c == "Rrjet":
        if "switch" in n: return "Switch"
        if "mesh" in n and "ruter mesh" in n: return "Rrjet mesh"
        return "Routerë"
    if c == "Aksesorë & energji":
        if "hub" in n: return "Hub & dock"
        if "adapter" in n: return "Karikues"
        return "Kabllo"
    if c == "Printim & zyra": return "Printerë" if "termik" in n else "Multifunksionale"
    if c.startswith("Telefona"):
        if "ipad" in n or "tablet" in n: return "Tabletë"
        if "telefon" in n: return "Telefona"
        return "Orë të mençura"
    if c.startswith("Kasa"):
        if "ftohës" in n or "aio" in n: return "Ftohje & ventilatorë"
        if "psu" in n or "power supply" in n or "80 plus" in n: return "Furnizues rryme"
        return "Kasa"
    if c == "Kompjuterë": return "PC gaming"
    if c.startswith("Siguri"): return "Kamera sigurie"
    raise SystemExit(f"Kategori pa vend: {c} / {r['id']}")

BRAND = {"DELL": "Dell", "Ubiquiti Networks .": "Ubiquiti", "HUAWEI": "Huawei", "D-link": "D-Link", "Deepcool": "DeepCool", "ibesky": "iBesky", "Ocom": "OCOM", "Thermaltak": "Thermaltake"}

def num(s): return float(s.replace(",", "."))

def attrs_for(cat, name):
    n = name
    a = {}
    def m(rx, flags=re.I):
        return re.search(rx, n, flags)
    if cat in ("Laptopë", "PC gaming"):
        if x := m(r"Apple (M\d(?: Pro| Max)?)"): a["cpu"] = f"Apple {x.group(1)}"
        elif x := m(r"\bM(\d)\b(?=[ ,])"): a["cpu"] = f"Apple M{x.group(1)}"
        elif x := m(r"Core\S* (i\d)-"): a["cpu"] = f"Intel Core {x.group(1)}"
        elif x := m(r"Ryzen\S* (\d)"): a["cpu"] = f"AMD Ryzen {x.group(1)}"
        # RAM: "16GB RAM" ka përparësi; pastaj "8GB DDR4"; kurrë memoria e kartelës grafike ("RTX 3050 6GB").
        if x := (m(r"(\d+)\s?GB RAM") or m(r"(\d+)\s?GB DDR\d") or m(r"(\d+)\s?GB(?=,)(?<!RTX \d{4} \d{1}GB)")):
            if int(x.group(1)) <= 128: a["ram"] = int(x.group(1))
        if x := m(r"(\d+)\s?(GB|TB) SSD"): a["storage"] = int(x.group(1)) * (1000 if x.group(2).upper() == "TB" else 1)
        if cat == "Laptopë":
            if x := m(r'(\d{2}(?:[.,]\d)?)\s?(?:"|-inch| -inch|”)') or m(r'\((\d{2})"\)'): a["screen"] = num(x.group(1))
            if m(r"Windows 11 Pro"): a["os"] = "Windows 11 Pro"
            elif m(r"Windows 10"): a["os"] = "Windows 10 Home"
            elif m(r"macOS|MacBook"): a["os"] = "macOS"
            elif m(r"NoOS"): a["os"] = "Pa sistem operativ"
            if m(r"RTX \d{4}"): a["gpu"] = "GeForce RTX"
            elif m(r"Radeon Graphics|Iris Xe|MacBook"): a["gpu"] = "E integruar"
            if m(r"Gaming|VICTUS"): a["type"] = "Gaming"
            elif m(r"ThinkPad|Vostro"): a["type"] = "Biznes"
            elif m(r"MacBook Pro"): a["type"] = "Për profesionistë"
            elif m(r"MacBook Air"): a["type"] = "Ultrabook"
        else:
            if x := m(r"(RTX \d{4}(?: Ti)?|RX \d{4}(?: XT)?)"): a["gpu"] = x.group(1)
    elif cat == "Monitorë":
        if x := m(r'(\d{2}(?:[.,]\d)?)\s?(?:"|-inch)'): a["size"] = num(x.group(1))
        if x := m(r"\b(WQHD|WFHD|QHD|UHD|4K|Full HD|FHD)\b"): a["res"] = {"Full HD": "FHD"}.get(x.group(1), x.group(1))
        if x := m(r"(\d{2,3})\s?Hz"): a["hz"] = int(x.group(1))
        if x := m(r"\b(QD OLED|OLED|Fast IPS|IPS|VA)\b"): a["panel"] = {"Fast IPS": "IPS", "QD OLED": "OLED"}.get(x.group(1), x.group(1))
    elif cat == "Procesorë":
        if x := m(r"Ryzen \d (?:Pro )?(\d)\d{3}"): a["series"] = f"Ryzen {x.group(1)}000"
        elif x := m(r"EPYC (\d)\d{3}"): a["series"] = f"EPYC {x.group(1)}000"
    elif cat == "Kasa":
        if x := m(r"(Mid Tower|Full Tower|Mini Tower)"): a["form"] = x.group(1)
    elif cat == "Kartela grafike":
        a["chip"] = "AMD Radeon" if m(r"Radeon|\bRX\b") else "NVIDIA GeForce"
        if x := m(r"RTX (\d{2})\d{2}"): a["series"] = f"RTX {x.group(1)}"
        elif x := m(r"RX (\d)\d{3}"): a["series"] = f"RX {x.group(1)}000"
        elif m(r"GTX ?10\d0"): a["series"] = "GTX 10"
        elif m(r"GT 7\d0"): a["series"] = "GT 700"
        elif m(r"GeForce 210"): a["series"] = "GeForce 200"
        if x := m(r"(\d+)\s?GB"): a["vram"] = int(x.group(1))
    elif cat == "Memorie RAM":
        if x := m(r"\b(DDR\d)\b"): a["ddr"] = x.group(1).upper()
        if x := m(r"(\d+) GB(?::| -)"): a["cap"] = int(x.group(1))
        a["form"] = "SO-DIMM" if m(r"SO-DIMM") else "DIMM"
        a["kit"] = "Kit 2 module" if m(r"2 x \d+ GB") else "1 modul"
    elif cat == "Pllaka amë":
        if x := m(r"(LGA\s?\d{4}|AM\d)"): a["socket"] = x.group(1).replace(" ", "")
        if x := m(r"\b([ABHXZ]\d{3}M?)\b"): a["chipset"] = re.sub(r"M$", "", x.group(1))
        a["form"] = "Micro-ATX" if m(r"micro ATX|mATX|\d{3}M[- ]") else "ATX"
        if x := m(r"(DDR\d)"): a["ddr"] = x.group(1)
    elif cat in ("SSD", "Disqe të jashtme"):
        if x := m(r"(\d+(?:\.\d+)?)\s?(TB|GB)"): a["cap"] = int(round(num(x.group(1)) * (1000 if x.group(2) == "TB" else 1)))
        if cat == "SSD":
            a["iface"] = "NVMe PCIe 5.0" if m(r"PCI Express 5|PCIe 5") else "SATA"
            a["form"] = "M.2" if m(r"M\.2|NVMe|PCI Express") else '2,5"'
        else:
            if m(r"USB 3"): a["iface"] = "USB 3.0"
    elif cat == "NAS":
        if x := m(r"(\d+) Bay"): a["bays"] = int(x.group(1))
        elif x := m(r"(\d+) × M\.2"): a["bays"] = int(x.group(1))
        if x := m(r"(10GbE|2\.5GbE)"): a["lan"] = x.group(1).replace(".", ",")
    elif cat in ("Maus", "Tastiera"):
        a["conn"] = "Pa tel" if m(r"Wireless|Lightspeed|Bluetooth") else "Me kabllo USB"
        a["use"] = "Gaming" if m(r"Gaming|G Pro|HyperX|Razer|SuperLight") else "Zyrë"
    elif cat == "Kufje":
        a["conn"] = "USB-C" if m(r"USB-C") else "3,5 mm / USB"
        a["use"] = "Gaming" if m(r"HyperX|Razer|gaming") else "Zyrë"
    elif cat in ("Routerë", "Rrjet mesh"):
        if x := m(r"Wi-Fi (\d)"): a["wifi"] = f"Wi-Fi {x.group(1)}"
    elif cat == "Switch":
        if x := m(r"(\d+)× Gigabit"): a["ports"] = int(x.group(1))
        a["managed"] = "Managed" if m(r"Managed") else "Unmanaged"
    elif cat in ("Kabllo", "Karikues", "Hub & dock"):
        a["conn"] = "Lightning" if m(r"Lightning") else "USB-C"
    elif cat in ("Printerë", "Multifunksionale"):
        a["tech"] = "Termik" if m(r"Termik") else "Bojë" if m(r"Deskjet") else "Lazer"
        a["net"] = "Rrjet (LAN)" if m(r"LAN|_NI") else "USB"
    elif cat == "Furnizues rryme":
        if x := m(r"(\d{3,4})\s?(?:W\b|Watt)"): a["watt"] = int(x.group(1))
        if x := m(r"80 PLUS (\w+)"): a["cert"] = f"80 PLUS {x.group(1)}"
    elif cat == "Kamera sigurie":
        if x := m(r"\b(4K|2K|1080p)\b"): a["res"] = x.group(1)
        a["power"] = "Solare" if m(r"Solar") else "Bateri" if m(r"Battery") else "PoE" if m(r"PoE") else "Wi-Fi"
        a["place"] = "Brenda" if m(r"Indoor") else "Jashtë"
    elif cat == "Tabletë" or cat == "Telefona":
        if x := m(r"(\d+)\s?GB\b(?!.*GB)"): a["storage"] = int(x.group(1))
    return a

LEAD = re.compile(r"^(Laptop,?|Monitor|Kartelë Grafike|Maus( Gaming)?|Kufje( gaming)?|Tastierë( dhe maus,)?|Printer,?( Termik)?|Telefon|Tablet|Pllakë amë|Disk SSD|Konvertor|Ftohës për Procesor|Gjurmues Aktiviteti)\s+", re.I)

def clean_name(s):
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("Laptop, Apple", "Laptop Apple")
    return s

def slugify(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")

def make_id(r, used):
    base = LEAD.sub("", r["name"])
    # Merr segmente derisa emri të ketë të paktën 3 fjalë (p.sh. "MikroTik, L009UiGS-2HaxD-IN, Ruter").
    segs = [x for x in re.split(r"[(/,–]| - ", base) if x.strip()]
    words = []
    for seg in segs:
        words += [w for w in slugify(seg).split("-") if w]
        if len(words) >= 3: break
    variant = "oem" if re.search(r"\bOEM\b", r["name"]) else "box" if re.search(r"PIB|WOF", r["name"]) else ""
    if variant: words = [w for w in words if w not in ("amd", "dual", "edition")][:6] + [variant]
    if slugify(r["brand"]).split("-")[0] not in words[:2]: words = slugify(r["brand"]).split("-")[:1] + words
    sid = "-".join(words[:7])[:52].strip("-")
    out, i = sid, 2
    while out in used: out, i = f"{sid}-{i}", i + 1
    used.add(out)
    return out

def specs_for(name):
    inner = re.findall(r"\(([^)]+)\)", name)
    parts = []
    for chunk in (inner or [name]):
        parts += re.split(r"\s*(?:,|/| – | - )\s*", chunk)
    if not inner: parts = parts[1:]
    out = []
    WORDS = {"PIB": "Paketim në kuti", "WOF": "Pa ftohës në paketë", "OEM": "Paketim OEM (pa kuti)", "module": "", "unbuffered": "", "processor": ""}
    for p in parts:
        p = p.strip(" .")
        p = WORDS.get(p, p)
        p = re.sub(r"\s+processor$", " frekuenca bazë", p)
        if len(p) < 3 or p.lower() in ("black", "zezë", "white", "bardhë", "i zi", "e zezë", "të zeza", "de"): continue
        if p not in out: out.append(p)
    return out[:6]

ART = {"Laptopë": "laptop", "Monitorë": "monitor", "Procesorë": "cpu", "Kartela grafike": "gpu", "PC gaming": "desktop"}

def main():
    rows = json.loads((PACK / "products.json").read_text(encoding="utf-8"))
    manifest = {m["id"]: m for m in json.loads((PACK / "source-manifest.json").read_text(encoding="utf-8"))}
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    used, products, refs, sources = set(), [], {}, []
    for r in rows:
        if r["id"] in SKIP: continue
        cat = category(r)
        pid = make_id(r, used)
        src = PACK / r["img"]
        im = Image.open(src)
        im = im.convert("RGBA") if im.mode in ("P", "LA", "RGBA") else im.convert("RGB")
        im.thumbnail((1200, 1200))
        dest = OUT_IMG / f"{pid}.webp"
        im.save(dest, "WEBP", quality=84, method=6)
        name = clean_name(r["name"])
        brand = BRAND.get(r["brand"], r["brand"])
        p = {
            "id": pid, "img": f"assets/products/real/{pid}.webp", "name": name, "brand": brand, "cat": cat,
            # Çmimi i ITCOM ende nuk është caktuar: dyqani tregon "Çmimi me ofertë" (shih LEZERO.txt, pika 5–6).
            "price": 0, "quote": True, "stock": 0,
            "attrs": attrs_for(cat, name), "specs": specs_for(name), "desc": "",
        }
        if not p["specs"]:
            a = p["attrs"]
            p["specs"] = [x for x in [a.get("cpu"), f'{a["ram"]} GB RAM' if a.get("ram") else None, f'{a["storage"] // 1000} TB SSD' if a.get("storage", 0) >= 1000 else None, a.get("gpu")] if x]
        if cat in ART: p["art"] = {"s": ART[cat], "c": "#2b2d31"}
        products.append(p)
        m = manifest.get(r["id"], {})
        refs[pid] = {
            "packId": r["id"], "refPrice": r["price"], "refOld": r["old"], "site": r["source_site"], "url": r["source_url"],
            "sku": r.get("source_sku"), "captured": r.get("captured_on"),
        }
        sources.append(f"| `{pid}.webp` | {r['id']} | {r['source_site']} | {m.get('width', '')}×{m.get('height', '')} | `{m.get('sha256', '')[:16]}…` |")
    js = ("/* Produkte me foto reale (paketa ITCOM 01.11.2026), gjeneruar nga scripts/import-real.py — mos e ndryshoni me dorë.\n"
          " * Çmimi i ITCOM, stoku dhe garancia vendosen në CMS; deri atëherë produktet shfaqen me \"Çmimi me ofertë\". */\n"
          "window.PRODUCTS.push(\n" + ",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in products) + "\n);\n")
    (ROOT / "js/products-real.js").write_text(js, encoding="utf-8")
    (ROOT / "cms/scripts/real-refs.json").write_text(json.dumps(refs, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT_IMG / "SOURCES.md").write_text(
        "# Foto reale të produkteve (paketa 01.11.2026)\n\n"
        "Fotot janë marrë nga faqet publike të Buton, Macintoks dhe Startech24 dhe janë optimizuar për web (WebP, deri 1200 px) "
        "pa ndryshuar pamjen. Para përdorimit komercial konfirmoni autorizimin me furnitorin / pronarin përkatës.\n\n"
        "| Skedari | ID në paketë | Burimi | Origjinali | SHA-256 i origjinalit |\n|---|---|---|---|---|\n" + "\n".join(sources) + "\n\n"
        "Nuk u importuan (dublikata): " + "; ".join(f"{k}: {v}" for k, v in SKIP.items()) + ".\n", encoding="utf-8")
    cats = {}
    for p in products: cats[p["cat"]] = cats.get(p["cat"], 0) + 1
    print(len(products), "produkte;", cats)

main()
