/* ITCOM product catalogue.
 * Edit this file to manage the store's products. Prices are in EUR, VAT included.
 * `oldPrice` marks an item as on sale; `stock: 0` shows it as out of stock.
 */
window.STORE = {
  currency: "EUR",
  locale: "en-IE",
  vatRate: 0.18,
  freeShippingFrom: 300,
  shippingFee: 9.9,
};

window.PRODUCTS = [
  // Laptops
  { id: "lp-001", name: "ThinkPad X1 Carbon Gen 12", brand: "Lenovo", category: "Laptops", price: 1899, oldPrice: 2149, rating: 4.8, reviews: 214, stock: 12, badge: "Best seller",
    specs: ["14\" 2.8K OLED", "Intel Core Ultra 7 155U", "32 GB LPDDR5X", "1 TB NVMe SSD", "1.09 kg"],
    desc: "Ultralight business flagship with legendary keyboard, MIL‑STD durability and all‑day battery life." },
  { id: "lp-002", name: "MacBook Air 15\" M3", brand: "Apple", category: "Laptops", price: 1549, rating: 4.9, reviews: 388, stock: 20,
    specs: ["15.3\" Liquid Retina", "Apple M3 8‑core", "16 GB unified memory", "512 GB SSD", "18 h battery"],
    desc: "Fanless, silent and remarkably thin — the perfect everyday laptop for creatives and professionals." },
  { id: "lp-003", name: "Dell Latitude 7450", brand: "Dell", category: "Laptops", price: 1429, rating: 4.6, reviews: 97, stock: 8,
    specs: ["14\" FHD+ IPS", "Intel Core Ultra 5 135U", "16 GB DDR5", "512 GB SSD", "vPro"],
    desc: "Secure, manageable and built for hybrid work with Dell Optimizer and premium collaboration features." },
  { id: "lp-004", name: "HP EliteBook 840 G11", brand: "HP", category: "Laptops", price: 1349, oldPrice: 1499, rating: 4.5, reviews: 63, stock: 5,
    specs: ["14\" WUXGA IPS", "Intel Core Ultra 7 165U", "16 GB DDR5", "1 TB SSD", "Wolf Security"],
    desc: "Enterprise‑class protection and a 5MP camera with AI noise cancelling for crystal‑clear calls." },
  { id: "lp-005", name: "ASUS ROG Zephyrus G16", brand: "ASUS", category: "Laptops", price: 2399, rating: 4.7, reviews: 142, stock: 0,
    specs: ["16\" 240 Hz OLED", "Intel Core Ultra 9 185H", "RTX 4070 8 GB", "32 GB DDR5", "1 TB SSD"],
    desc: "Creator and gaming powerhouse in a sleek aluminium chassis." },

  // Desktops & workstations
  { id: "dt-001", name: "Dell OptiPlex Micro 7020", brand: "Dell", category: "Desktops", price: 799, rating: 4.5, reviews: 58, stock: 25, badge: "Office pick",
    specs: ["Intel Core i5‑14500T", "16 GB DDR5", "512 GB SSD", "Wi‑Fi 6E", "Windows 11 Pro"],
    desc: "Tiny footprint, full desktop performance — mounts behind a monitor or under a desk." },
  { id: "dt-002", name: "HP Z2 Tower G9 Workstation", brand: "HP", category: "Desktops", price: 2890, rating: 4.8, reviews: 31, stock: 3,
    specs: ["Intel Core i9‑14900K", "64 GB DDR5 ECC", "RTX 4000 Ada 20 GB", "2 TB NVMe", "ISV certified"],
    desc: "Certified workstation for CAD, 3D and data science workloads." },
  { id: "dt-003", name: "Mac mini M4", brand: "Apple", category: "Desktops", price: 729, rating: 4.9, reviews: 176, stock: 14,
    specs: ["Apple M4 10‑core", "16 GB unified memory", "256 GB SSD", "Thunderbolt 4", "Wi‑Fi 6E"],
    desc: "Remarkably small, remarkably capable. The most affordable way into the Mac." },

  // Monitors
  { id: "mn-001", name: "Dell UltraSharp U2724D", brand: "Dell", category: "Monitors", price: 449, oldPrice: 519, rating: 4.7, reviews: 129, stock: 30,
    specs: ["27\" QHD IPS Black", "120 Hz", "98% DCI‑P3", "USB‑C hub", "Height adjustable"],
    desc: "Exceptional contrast and colour with ComfortView Plus for long working days." },
  { id: "mn-002", name: "LG UltraFine 32UQ850", brand: "LG", category: "Monitors", price: 699, rating: 4.6, reviews: 74, stock: 9,
    specs: ["31.5\" 4K UHD", "Nano IPS", "HDR400", "USB‑C 90W PD", "KVM switch"],
    desc: "4K detail with one‑cable USB‑C docking for laptops." },
  { id: "mn-003", name: "Samsung Odyssey G7 32\"", brand: "Samsung", category: "Monitors", price: 549, rating: 4.4, reviews: 211, stock: 16,
    specs: ["32\" 4K VA", "144 Hz", "1 ms", "HDR400", "1000R curve"],
    desc: "Immersive curved 4K display for gaming and multitasking." },
  { id: "mn-004", name: "ASUS ProArt PA278CGV", brand: "ASUS", category: "Monitors", price: 399, rating: 4.6, reviews: 88, stock: 11,
    specs: ["27\" QHD IPS", "144 Hz", "Calman verified", "USB‑C 90W", "ΔE < 2"],
    desc: "Factory‑calibrated colour accuracy for designers and photographers." },

  // Networking
  { id: "nw-001", name: "UniFi Dream Machine Pro", brand: "Ubiquiti", category: "Networking", price: 419, rating: 4.8, reviews: 156, stock: 7, badge: "Pro choice",
    specs: ["10G SFP+ WAN/LAN", "8‑port GbE switch", "IDS/IPS 3.5 Gbps", "UniFi OS", "1U rackmount"],
    desc: "All‑in‑one enterprise gateway, controller and NVR for a fully managed network." },
  { id: "nw-002", name: "UniFi U7 Pro Access Point", brand: "Ubiquiti", category: "Networking", price: 199, rating: 4.7, reviews: 92, stock: 40,
    specs: ["Wi‑Fi 7", "6 GHz support", "2.5 GbE PoE+", "140 m² coverage", "300+ clients"],
    desc: "Ceiling‑mounted Wi‑Fi 7 access point with tri‑band performance." },
  { id: "nw-003", name: "TP‑Link Omada SG3428X", brand: "TP-Link", category: "Networking", price: 329, oldPrice: 369, rating: 4.5, reviews: 47, stock: 13,
    specs: ["24× GbE + 4× 10G SFP+", "L2+ managed", "Omada SDN", "Static routing", "Rackmount"],
    desc: "Affordable managed switching with 10G uplinks for growing offices." },
  { id: "nw-004", name: "Cisco Catalyst 1000‑8P", brand: "Cisco", category: "Networking", price: 489, rating: 4.6, reviews: 39, stock: 6,
    specs: ["8× GbE PoE+", "2× SFP uplinks", "67 W PoE budget", "Fanless", "Lifetime warranty"],
    desc: "Silent, compact enterprise switch ideal for meeting rooms and small branches." },

  // Storage
  { id: "st-001", name: "Synology DS923+ NAS", brand: "Synology", category: "Storage", price: 629, rating: 4.8, reviews: 133, stock: 10, badge: "Best seller",
    specs: ["4 bays (diskless)", "AMD Ryzen R1600", "4 GB ECC", "10GbE upgradeable", "M.2 NVMe cache"],
    desc: "Centralised file sharing, backup and surveillance for small businesses." },
  { id: "st-002", name: "Samsung 990 PRO 2 TB", brand: "Samsung", category: "Storage", price: 189, oldPrice: 229, rating: 4.9, reviews: 512, stock: 60,
    specs: ["PCIe 4.0 NVMe", "7,450 MB/s read", "6,900 MB/s write", "M.2 2280", "5‑year warranty"],
    desc: "Flagship NVMe SSD for workstations, gaming and content creation." },
  { id: "st-003", name: "WD Red Plus 8 TB", brand: "WD", category: "Storage", price: 219, rating: 4.7, reviews: 301, stock: 45,
    specs: ["3.5\" SATA", "5,640 RPM CMR", "256 MB cache", "NASware 3.0", "3‑year warranty"],
    desc: "Purpose‑built hard drive for 24/7 NAS operation." },
  { id: "st-004", name: "SanDisk Extreme Portable SSD 2 TB", brand: "SanDisk", category: "Storage", price: 159, rating: 4.6, reviews: 288, stock: 33,
    specs: ["1,050 MB/s", "USB‑C 3.2 Gen 2", "IP65", "3 m drop protection", "256‑bit AES"],
    desc: "Rugged pocket‑sized storage for work on the move." },

  // Peripherals
  { id: "pr-001", name: "Logitech MX Keys S Combo", brand: "Logitech", category: "Peripherals", price: 199, rating: 4.8, reviews: 420, stock: 50,
    specs: ["MX Keys S + MX Master 3S", "Multi‑device", "Backlit keys", "USB‑C rechargeable", "Logi Bolt"],
    desc: "The ultimate productivity keyboard and mouse pairing." },
  { id: "pr-002", name: "Jabra Evolve2 65 Flex", brand: "Jabra", category: "Peripherals", price: 249, oldPrice: 289, rating: 4.5, reviews: 76, stock: 22,
    specs: ["ANC", "Teams certified", "Foldable", "32 h battery", "Wireless charging"],
    desc: "Portable professional headset with hybrid active noise cancellation." },
  { id: "pr-003", name: "Logitech Brio 505 Webcam", brand: "Logitech", category: "Peripherals", price: 129, rating: 4.4, reviews: 143, stock: 28,
    specs: ["1080p", "Auto light correction", "Show Mode", "Privacy shutter", "USB‑C"],
    desc: "Look your best on every call with RightLight 5 and auto‑framing." },
  { id: "pr-004", name: "CalDigit TS4 Thunderbolt Dock", brand: "CalDigit", category: "Peripherals", price: 399, rating: 4.8, reviews: 189, stock: 4,
    specs: ["18 ports", "98 W charging", "2.5 GbE", "Thunderbolt 4", "Single 8K / dual 6K"],
    desc: "The most connected Thunderbolt dock — one cable for everything." },

  // Components
  { id: "cp-001", name: "NVIDIA GeForce RTX 4070 SUPER", brand: "NVIDIA", category: "Components", price: 649, rating: 4.7, reviews: 241, stock: 9,
    specs: ["12 GB GDDR6X", "DLSS 3.5", "Ray tracing", "220 W TGP", "3× DP, 1× HDMI"],
    desc: "Excellent 1440p performance and AI acceleration for creators and gamers." },
  { id: "cp-002", name: "AMD Ryzen 7 9700X", brand: "AMD", category: "Components", price: 359, oldPrice: 399, rating: 4.8, reviews: 167, stock: 18,
    specs: ["8 cores / 16 threads", "Up to 5.5 GHz", "AM5", "65 W TDP", "Zen 5"],
    desc: "Efficient Zen 5 performance for productivity and gaming builds." },
  { id: "cp-003", name: "Kingston FURY Beast 32 GB DDR5", brand: "Kingston", category: "Components", price: 109, rating: 4.7, reviews: 354, stock: 70,
    specs: ["2× 16 GB", "DDR5‑6000", "CL36", "XMP 3.0 / EXPO", "Low profile"],
    desc: "Fast, reliable DDR5 memory kit with lifetime warranty." },

  // Servers & power
  { id: "sv-001", name: "Dell PowerEdge T160", brand: "Dell", category: "Servers", price: 1290, rating: 4.5, reviews: 18, stock: 2,
    specs: ["Intel Xeon E‑2434", "16 GB DDR5 ECC", "2× 2 TB HDD", "iDRAC9", "Tower"],
    desc: "Compact, quiet entry server for file, print and line‑of‑business apps." },
  { id: "sv-002", name: "APC Smart‑UPS 1500VA", brand: "APC", category: "Servers", price: 579, rating: 4.7, reviews: 85, stock: 7,
    specs: ["1500 VA / 1000 W", "Line interactive", "Pure sine wave", "LCD", "SmartConnect"],
    desc: "Protect critical equipment from power outages and surges." },
];
