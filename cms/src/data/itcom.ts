// ITCOM demo content for the CMS: store settings, staff, customer segments, info pages, home-page slides,
// inbox messages, stock movements, purchase orders and the audit log. Everything is relative to `now`.
// Prices, contact data and texts mirror the storefront (js/products.js, js/app.js); placeholders are marked.
import type {
  AuditEntry, CmsPage, Inquiry, InventoryMovement, L10n, Order, Placement, Product, PurchaseOrder, ReturnRequest, Segment, Settings, Staff,
} from '@/lib/types';
import { DEFAULT_SETTINGS } from './content';

// L10n order is (me, sq, en). The third storefront language slot ("me") is off; it carries the English copy.
const T = (sq: string, en: string): L10n => ({ me: en, sq, en });
const S = (v: string): L10n => ({ me: v, sq: v, en: v });
const DAY = 86400000;
const iso = (now: Date, days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * 3600000).toISOString();

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
export const ITCOM_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  companyName: 'ITCOM',
  legalName: 'ITCOM Sh.p.k.',
  tagline: T('Pajisje IT për biznese dhe shtëpi', 'IT equipment for business and home'),
  about: T(
    'ITCOM ofron laptopë, procesorë dhe kartela grafike nga markat më të njohura, si dhe PC të ndërtuara sipas porosisë, me dërgesë në gjithë Kosovën dhe garanci 24‑mujore.',
    'ITCOM sells laptops, processors and graphics cards from the leading brands, plus custom-built PCs, with delivery across Kosovo and a 24-month warranty.',
  ),
  email: 'info@itcom.example',
  phone: '+383 44 000 000',
  phone2: '',
  whatsapp: '',
  address: 'Adresa e dyqanit (plotësoni)',
  city: 'Prishtinë',
  mapUrl: '',
  hours: T('Hën–Sht 09:00–19:00 · E diel mbyllur', 'Mon–Sat 09:00–19:00 · Sun closed'),
  pib: '81XXXXXXX',
  pdv: '330XXXXXX',
  bankName: 'Banka (plotësoni)',
  bankAccount: 'XK05 XXXX XXXX XXXX XXXX',
  instagram: '',
  facebook: '',
  vatRate: 18,
  freeShippingThreshold: 300,
  shippingZones: [
    {
      id: 'z1',
      name: 'Gjithë Kosova',
      cities: ['Prishtinë', 'Fushë Kosovë', 'Obiliq', 'Lipjan', 'Podujevë', 'Drenas', 'Mitrovicë', 'Vushtrri', 'Pejë', 'Prizren', 'Gjakovë', 'Ferizaj', 'Gjilan', 'Suharekë', 'Rahovec', 'Kamenicë', 'Viti', 'Istog', 'Klinë', 'Deçan', 'Skenderaj', 'Malishevë'],
      fee: 3,
      days: '1–2',
    },
  ],
  pickupAddress: 'Dyqani ITCOM, Prishtinë',
  payments: { cod: true, bank: true, card: true },
  languages: { me: false, sq: true, en: true },
  announcements: [
    T('Dërgesë falas mbi 300 €', 'Free delivery over €300'),
    T('Pagesë në dorëzim', 'Cash on delivery'),
    T('Me këste deri në 12 muaj', 'Up to 12 monthly instalments'),
  ],
  brandColor: '#0a6cdf',
  demoBanner: false,
  seo: {
    title: 'ITCOM — Laptopë, procesorë dhe kartela grafike',
    description: 'Laptopë, procesorë, kartela grafike dhe PC të ndërtuara sipas porosisë. Dërgesë në gjithë Kosovën, garanci 24 muaj, pagesë me këste.',
  },
  adminEmail: 'admin@itcom.example',
  orderPrefix: 'IT-',
  locations: [{ id: 'loc-main', name: 'ITCOM', address: 'Adresa e dyqanit', city: 'Prishtinë', pickup: true, isDefault: true }],
  notifications: DEFAULT_SETTINGS.notifications.filter((n) => !n.event.startsWith('booking')),
  integrations: [
    { id: 'int-whatsapp', kind: 'email', name: 'Porosi me WhatsApp', status: 'disconnected', note: 'Shtoni numrin e WhatsApp te Konfigurimet → Dyqani: porositë dërgohen direkt në telefonin tuaj.' },
    { id: 'int-payment', kind: 'payment', name: 'Pagesa me kartelë (e-commerce i bankës)', status: 'test', note: 'Mënyra test — kartelat nuk ngarkohen. Çelësat e prodhimit pas kontratës me bankën.' },
    { id: 'int-courier', kind: 'courier', name: 'Shërbimi i kurierit', status: 'disconnected', note: 'API e kurierit sipas partnerit të zgjedhur.' },
    { id: 'int-fiscal', kind: 'fiscal', name: 'Fiskalizimi (ATK)', status: 'disconnected', note: 'Lidhja me sistemin e fiskalizimit të ATK-së — e planifikuar për fazën 2.' },
    { id: 'int-analytics', kind: 'analytics', name: 'Google Analytics 4', status: 'disconnected', note: 'Matja e vizitave dhe konvertimeve.' },
  ],
  markets: [{ id: 'mk-xk', name: T('Kosova', 'Kosovo'), countries: ['XK'], currency: 'EUR', languages: ['sq', 'en'], status: 'active' }],
};

/* ------------------------------------------------------------------ */
/* Staff and segments                                                  */
/* ------------------------------------------------------------------ */
export const ITCOM_STAFF: Staff[] = [
  { id: 'st-owner', name: 'Pronari ITCOM', email: 'admin@itcom.example', role: 'owner', color: '#0b0c0f', active: true, title: T('Pronar · menaxhim', 'Owner · management') },
  { id: 'st-sales', name: 'Shitja', email: 'shitja@itcom.example', role: 'manager', color: '#0a6cdf', active: true, title: T('Shitje dhe oferta për biznese', 'Sales and business quotes') },
  { id: 'st-service', name: 'Servisi', email: 'servisi@itcom.example', role: 'orders', color: '#1a7f37', active: true, title: T('Montim i PC‑ve, servis dhe garanci', 'PC assembly, service and warranty') },
  { id: 'st-shop', name: 'Dyqani', email: 'dyqani@itcom.example', role: 'reception', color: '#b25000', active: true, title: T('Pritja e klientëve dhe marrja në dyqan', 'Front desk and store pickup') },
];

export const ITCOM_SEGMENTS: Segment[] = [
  { id: 'seg-vip', name: T('Klientë VIP', 'VIP customers'), description: T('Kanë shpenzuar mbi 1.500 €.', 'Spent more than €1,500.'), match: 'all', rules: [{ field: 'spent', op: 'gt', value: '1500' }] },
  { id: 'seg-returning', name: T('Klientë që kthehen', 'Returning customers'), description: T('Më shumë se një porosi.', 'More than one order.'), match: 'all', rules: [{ field: 'orders', op: 'gt', value: '1' }] },
  {
    id: 'seg-prishtina',
    name: T('Prishtinë dhe rrethina', 'Prishtina area'),
    description: T('Klientë afër dyqanit — për marrje në dyqan dhe servis.', 'Customers close to the store — for pickup and service.'),
    match: 'any',
    rules: ['Prishtinë', 'Fushë Kosovë', 'Obiliq', 'Lipjan'].map((c) => ({ field: 'city' as const, op: 'eq' as const, value: c })),
  },
  { id: 'seg-passive', name: T('Pa porosi 60 ditë', 'No order in 60 days'), description: T('Porosia e fundit para më shumë se 60 ditësh.', 'Last order more than 60 days ago.'), match: 'all', rules: [{ field: 'lastOrderDays', op: 'gt', value: '60' }] },
];

/* ------------------------------------------------------------------ */
/* Info pages (the shop's footer pages read these by slug)             */
/* ------------------------------------------------------------------ */
export function buildItcomPages(now: Date): CmsPage[] {
  const at = now.toISOString();
  const page = (id: string, slug: string, title: L10n, sq: string, en: string): CmsPage => ({ id, slug, title, body: T(sq, en), published: true, showInFooter: true, updatedAt: at });
  return [
    page('pg-returns', 'returns', T('Kthimi i produkteve', 'Returns'),
      `Mund ta ktheni produktin brenda **14 ditëve** nga pranimi, pa pasur nevojë të jepni arsye.

## Kushtet
- Produkti duhet të jetë i paprekur, me të gjitha pjesët dhe me paketimin origjinal.
- Bashkëngjitni faturën ose numrin e porosisë.
- Softueri dhe licencat e aktivizuara, si dhe produktet e hapura për arsye higjienike, nuk kthehen.

## Hapat
- Na kontaktoni dhe na jepni numrin e porosisë.
- Sillni produktin në dyqan ose ne organizojmë marrjen e tij.
- Pas kontrollit, paratë kthehen brenda 14 ditëve me të njëjtën mënyrë pagese.`,
      `You can return a product within **14 days** of delivery, no reason needed.

## Conditions
- The product must be unused, complete and in its original packaging.
- Include the invoice or the order number.
- Activated software and licences are not returnable.

## Steps
- Contact us with your order number.
- Bring the product to the store or we arrange a pickup.
- After inspection the money is refunded within 14 days, the same way you paid.`),
    page('pg-warranty', 'warranty', T('Garancia dhe servisi', 'Warranty and service'),
      `Çdo produkt vjen me **garanci 24‑mujore**. Disa prodhues ofrojnë edhe më gjatë, dhe kjo shënohet te specifikimet.

## Çfarë mbulon garancia
- Defektet e fabrikës dhe prishjet gjatë përdorimit normal.
- Riparimin ose zëvendësimin e pjesës, pa pagesë.

## Çfarë nuk mbulon
- Dëmtimet fizike, nga lëngjet ose nga rryma.
- Ndërhyrjet nga servise të paautorizuara.
- Konsumin normal, si bateritë pas ciklit të tyre të jetës.

## Si të aplikoni
- Sillni produktin me faturën ose fletën e garancisë, ose na kontaktoni që ta marrim ne.`,
      `Every product comes with a **24-month warranty**. Some manufacturers offer longer; this is noted in the specifications.

## Covered
- Factory defects and failures during normal use.
- Repair or replacement of the part, free of charge.

## Not covered
- Physical, liquid or power damage.
- Work by unauthorised service centres.
- Normal wear, such as batteries at the end of their life.

## How to claim
- Bring the product with the invoice or warranty card, or contact us and we collect it.`),
    page('pg-about', 'about', T('Rreth ITCOM', 'About ITCOM'),
      `ITCOM ofron pajisje IT për biznese dhe shtëpi: laptopë, procesorë dhe kartela grafike nga markat më të njohura, si dhe konfigurime PC të ndërtuara sipas porosisë.

Zgjedhim produktet me kujdes, i përshkruajmë me specifika të sakta dhe ju ndihmojmë të gjeni pajisjen e duhur, qoftë për një student apo për një zyrë të tërë.`,
      `ITCOM sells IT equipment for business and home: laptops, processors and graphics cards from the leading brands, plus custom-built PCs.

We choose products carefully, describe them with accurate specifications and help you find the right device, for a student or a whole office.`),
    page('pg-business', 'business', T('Llogari biznesi', 'Business accounts'),
      `Për kompani, institucione dhe shkolla që blejnë rregullisht.

- Çmime për sasi dhe oferta të personalizuara.
- Faturë me TVSH dhe pagesë me transfertë bankare.
- Konfigurim i pajisjeve, instalim në vend dhe mirëmbajtje.
- Një person kontakti për të gjitha porositë tuaja.

Kërkoni ofertë te seksioni ITCOM Business në fund të faqes, ose na kontaktoni në telefon.`,
      `For companies, institutions and schools that buy regularly.

- Volume pricing and tailored quotes.
- VAT invoices and payment by bank transfer.
- Device setup, on-site installation and maintenance.
- One contact person for all your orders.

Request a quote in the ITCOM Business section at the bottom of the page, or call us.`),
    page('pg-careers', 'careers', T('Karriera', 'Careers'),
      `Aktualisht nuk kemi pozita të hapura.

Nëse dëshironi të punoni me ne në shitje, servis ose logjistikë, na kontaktoni dhe do t'ju njoftojmë kur të hapet një pozitë.`,
      `We have no open positions right now.

If you would like to work with us in sales, service or logistics, get in touch and we will let you know when a position opens.`),
    page('pg-privacy', 'privacy', T('Politika e privatësisë', 'Privacy policy'),
      `Mbledhim vetëm të dhënat që na duhen për të përpunuar dhe dërguar porosinë tuaj.

- Emrin, telefonin, email‑in dhe adresën i përdorim vetëm për porosinë dhe komunikimin me ju.
- Nuk i shesim dhe nuk i ndajmë të dhënat tuaja me palë të treta, përveç korrierit që dërgon porosinë.
- Shporta, lista e dëshirave dhe produktet e shikuara ruhen vetëm në shfletuesin tuaj.
- Mund të kërkoni në çdo kohë që të dhënat tuaja të fshihen.`,
      `We only collect the data we need to process and deliver your order.

- Your name, phone, e-mail and address are used only for the order and for contacting you.
- We never sell or share your data, except with the courier who delivers the order.
- Your cart, wishlist and recently viewed products stay in your browser.
- You can ask us to delete your data at any time.`),
  ];
}

/* ------------------------------------------------------------------ */
/* Home-page slides (the shop's hero banner reads these)               */
/* ------------------------------------------------------------------ */
export function buildItcomSlides(products: Product[]): Placement[] {
  const img = (id: string) => products.find((p) => p.id === id)?.images[0] ?? '';
  const slide = (order: number, id: string, eyebrow: L10n, title: L10n, subtitle: L10n): Placement => ({
    id: `pl-hero-${order}`,
    kind: 'slide',
    position: 'home-hero',
    name: `Banner — ${title.sq}`,
    eyebrow,
    title,
    subtitle,
    cta: { label: T('Shto në shportë', 'Add to cart'), href: `#${id}` },
    secondary: { label: T('Shiko detajet', 'View details'), href: `#${id}` },
    image: img(id),
    alt: S(title.sq),
    textAlign: 'left',
    overlay: 0,
    status: 'active',
    order,
  });
  return [
    slide(1, 'lp-mba13m4', T('E re', 'New'), T('MacBook Air 13" me çipin M4', 'MacBook Air 13" with M4'),
      T('16 GB memorie, deri në 18 orë bateri. Tani në stok, me dërgesë falas.', '16 GB memory, up to 18 hours of battery. In stock with free delivery.')),
    slide(2, 'cp-5090fe', T('E re', 'New'), T('GeForce RTX 5090 Founders Edition', 'GeForce RTX 5090 Founders Edition'),
      T('32 GB GDDR7 dhe DLSS 4 për lojëra 4K dhe punë me AI.', '32 GB GDDR7 and DLSS 4 for 4K gaming and AI work.')),
    slide(3, 'lp-proartp16', T('Për krijues', 'For creators'), T('ASUS ProArt P16', 'ASUS ProArt P16'),
      T('Ekran 4K OLED 16" dhe grafikë NVIDIA RTX për video, foto dhe 3D.', '16" 4K OLED display and NVIDIA RTX graphics for video, photo and 3D.')),
  ];
}

/* ------------------------------------------------------------------ */
/* Inbox: B2B quote requests and contact messages                      */
/* ------------------------------------------------------------------ */
export function buildItcomInquiries(now: Date): Inquiry[] {
  const q = (id: number, hours: number, x: Partial<Inquiry> & Pick<Inquiry, 'name' | 'phone' | 'message'>): Inquiry => ({
    id: `inq_${id}`,
    createdAt: new Date(now.getTime() - hours * 3600000).toISOString(),
    type: 'quote',
    status: 'new',
    seen: false,
    source: 'web-form',
    ...x,
  });
  return [
    q(101, 2, { company: 'Shkolla "Ardhmëria"', name: 'Blerta Hoxha', phone: '+383 44 210 334', email: 'blerta@example.com', city: 'Prishtinë', message: 'Na duhen 25 laptopë për klasën e informatikës, deri në 700 € copa. A keni ofertë me dërgesë dhe instalim?', tags: ['b2b', 'arsim'] }),
    q(102, 9, { company: 'Studio Pixel', name: 'Arbër Krasniqi', phone: '+383 49 552 301', email: 'arber@example.com', city: 'Prishtinë', message: 'Kërkojmë 3 stacione pune për montazh video: Ryzen 9 9950X me RTX 4080 SUPER ose 5080. Ju lutem ofertë me montim.', status: 'contacted', seen: true, assignee: 'st-sales', tags: ['b2b', 'pc-sipas-porosise'] }),
    q(103, 27, { company: 'Kompania Logjistike Sh.p.k.', name: 'Valon Bytyqi', phone: '+383 45 318 662', email: 'valon@example.com', city: 'Ferizaj', message: '10 laptopë biznesi me Windows 11 Pro dhe garanci të zgjatur. Faturë me TVSH.', status: 'scheduled', seen: true, assignee: 'st-sales', followUpAt: iso(now, 2), tags: ['b2b'] }),
    q(104, 50, { type: 'contact', source: 'phone', name: 'Drilon Gashi', phone: '+383 44 731 204', city: 'Pejë', message: 'A e keni RX 9070 XT në stok? Dua ta marr në dyqan të shtunën.', status: 'done', seen: true, assignee: 'st-shop' }),
    q(105, 70, { type: 'contact', name: 'Erza Morina', phone: '+383 43 220 517', email: 'erza@example.com', city: 'Gjilan', message: 'Laptopi më ka ardhur pa adapter në paketim. Si ta zgjidhim?', status: 'done', seen: true, assignee: 'st-service' }),
  ];
}

/* ------------------------------------------------------------------ */
/* Inventory: movements and purchase orders                            */
/* ------------------------------------------------------------------ */
export function buildItcomMovements(now: Date, orders: Order[], returns: ReturnRequest[]): InventoryMovement[] {
  const mv = (id: string, productId: string, delta: number, reason: InventoryMovement['reason'], days: number, by: string, note?: string, ref?: string): InventoryMovement => ({
    id, productId, delta, reason, at: iso(now, days), by, ...(note ? { note } : {}), ...(ref ? { ref } : {}),
  });
  const list: InventoryMovement[] = [
    mv('mv-1', 'cp-rx9070xt', 6, 'received', -3, 'st-shop', 'Furnitori — Sapphire', 'PO-2026-007'),
    mv('mv-2', 'cp-9800x3d', 8, 'received', -3, 'st-shop', 'Furnitori — AMD', 'PO-2026-007'),
    mv('mv-3', 'lp-zba14', 4, 'received', -6, 'st-shop', 'Furnitori — ASUS', 'PO-2026-006'),
    mv('mv-4', 'cp-4060dual', -1, 'damaged', -8, 'st-service', 'Paketim i dëmtuar në transport — kthehet te furnitori'),
    mv('mv-5', 'lp-mba13m4', -1, 'count', -10, 'st-owner', 'Inventari — copa e ekspozimit'),
  ];
  for (const r of returns) {
    if (!r.restocked) continue;
    const rec = r.timeline.find((t) => t.status === 'received');
    for (const l of r.lines) list.push({ id: `mv-${r.id}-${l.productId}`, productId: l.productId, delta: l.qty, reason: 'return', at: rec?.at ?? r.createdAt, by: rec?.by ?? 'st-service', note: 'Kthyer pa dëmtime — në stok', ref: r.number });
  }
  let n = 10;
  for (const o of orders.slice(0, 6)) {
    for (const l of o.items) {
      if (!l.productId) continue;
      list.push({ id: `mv-${n++}`, productId: l.productId, delta: -l.qty, reason: 'sale', at: o.createdAt, by: 'web', ref: o.number });
    }
  }
  return list.sort((a, b) => b.at.localeCompare(a.at));
}

export function buildItcomPurchaseOrders(now: Date, products: Product[]): PurchaseOrder[] {
  const cost = (id: string) => products.find((p) => p.id === id)?.cost ?? 0;
  const line = (productId: string, ordered: number, received = 0, rejected = 0) => ({ productId, ordered, received, rejected, cost: cost(productId) });
  return [
    { id: 'po-8', number: 'PO-2026-008', supplier: 'NVIDIA / distributori', location: 'loc-main', status: 'sent', lines: [line('cp-5070fe', 6), line('cp-5080fe', 3), line('cp-5090fe', 2)], expectedAt: iso(now, 5), createdAt: iso(now, -2) },
    { id: 'po-7', number: 'PO-2026-007', supplier: 'Distributori AMD & Sapphire', location: 'loc-main', status: 'closed', lines: [line('cp-rx9070xt', 6, 6), line('cp-9800x3d', 8, 8)], reference: 'INV-55120', createdAt: iso(now, -9) },
    { id: 'po-6', number: 'PO-2026-006', supplier: 'ASUS Adriatic', location: 'loc-main', status: 'partial', lines: [line('lp-zba14', 6, 4), line('lp-zbs14', 4, 0)], expectedAt: iso(now, 3), createdAt: iso(now, -12) },
    { id: 'po-9', number: 'PO-2026-009', supplier: 'Apple — distributori', location: 'loc-main', status: 'draft', lines: [line('lp-mba13m4', 10), line('lp-mbp14m4p', 4)], createdAt: iso(now, 0, -3) },
  ];
}

export function buildItcomAudit(now: Date, orders: Order[]): AuditEntry[] {
  const o = (i: number) => orders[Math.min(i, orders.length - 1)];
  const a = (id: number, hours: number, actor: string, action: AuditEntry['action'], object: AuditEntry['object'], objectId: string, detail?: string): AuditEntry => ({
    id: `au-${id}`, at: new Date(now.getTime() - hours * 3600000).toISOString(), actor, action, object, objectId, ...(detail ? { detail } : {}),
  });
  return [
    a(1, 0.5, 'st-owner', 'login', 'staff', 'st-owner', 'Hyrje në CMS'),
    a(2, 1.5, 'st-sales', 'status', 'order', o(2).id, `${o(2).number}: new → confirmed`),
    a(3, 4, 'st-sales', 'assign', 'inquiry', 'inq_102', 'Studio Pixel → Shitja'),
    a(4, 22, 'st-owner', 'update', 'product', 'cp-4070s', 'MSI RTX 4070 SUPER — çmimi në ofertë 629 €'),
    a(5, 30, 'st-service', 'fulfil', 'order', o(7).id, `${o(7).number} — PC i montuar dhe testuar`),
    a(6, 52, 'st-shop', 'adjust', 'inventory', 'cp-4060dual', 'CP-4060DUAL −1 (damaged)'),
  ];
}
