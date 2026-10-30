// ITCOM seed for the marketing, content and CRM modules: collections, discounts, campaigns (offers), blog guides,
// menus, B2B quotes and the service calendar. Everything is relative to `now`.
//
// Honesty rules (visual report P01): nothing here invents a sale. Discounts and campaigns start as drafts, so the
// shop shows them only after staff switch them on. Prices in quotes are the shop's own prices.
import type { Booking, Collection, Discount, Inquiry, L10n, Menu, MenuItem, Offer, Post, Product, Quote, Service } from '@/lib/types';

const T = (sq: string, en: string): L10n => ({ me: en, sq, en });
const DAY = 86400000;
/** Shop files under the deployment base (/ITCOM/assets/…), as the catalogue stores them. */
const BASE = import.meta.env.BASE_URL || '/';
const pic = (src: string) => BASE + src.replace(/^\//, '');
const iso = (now: Date, days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * 3600000).toISOString();

/* ------------------------------------------------------------------ */
/* Collections — groupings the shop shows on the home page and as catalogue views */
/* ------------------------------------------------------------------ */
export function buildItcomCollections(now: Date): Collection[] {
  const col = (x: Omit<Collection, 'match' | 'rules' | 'productIds' | 'published' | 'image'> & Partial<Collection>): Collection => ({
    match: 'all', rules: [], productIds: [], published: true, image: '', createdAt: iso(now, -20), ...x,
  });
  return [
    col({
      id: 'col-studente',
      slug: 'per-studente',
      title: T('Për studentë', 'For students'),
      description: T('Laptopë nën 1.000 € për mësim, projekte dhe shumë orë bateri.', 'Laptops under €1,000 for study, projects and long battery life.'),
      image: pic('/assets/products/photo/lp-zb14amd.webp'),
      kind: 'smart',
      rules: [{ field: 'category', op: 'eq', value: 'cat-laptop' }, { field: 'price', op: 'lt', value: '1000' }],
      sort: 'price-asc',
      seo: { title: 'Laptopë për studentë — ITCOM', description: 'Laptopë nën 1.000 € për mësim dhe projekte, me dërgesë në gjithë Kosovën.' },
    }),
    col({
      id: 'col-kreatore',
      slug: 'per-krijues',
      title: T('Për krijues', 'For creators'),
      description: T('Ekrane OLED, grafikë RTX dhe procesorë me shumë bërthama për video, foto dhe 3D.', 'OLED screens, RTX graphics and many-core processors for video, photo and 3D.'),
      image: pic('/assets/products/photo/lp-proartp16.webp'),
      kind: 'manual',
      productIds: ['lp-proartp16', 'lp-proartp14', 'lp-proartpx13', 'lp-mbp14m4p', 'lp-zbduo25', 'cp-9950x', 'cp-5080fe'],
      sort: 'manual',
    }),
    col({
      id: 'col-gaming',
      slug: 'gaming',
      title: T('Gaming', 'Gaming'),
      description: T('Kartela grafike RTX dhe Radeon, procesorë X3D dhe laptopë gaming.', 'RTX and Radeon graphics cards, X3D processors and gaming laptops.'),
      image: pic('/assets/products/photo/cp-4070s.webp'),
      kind: 'manual',
      productIds: ['cp-5070fe', 'cp-rx9070xt', 'cp-4070s', 'cp-9800x3d', 'cp-7800x3d', 'cp-rx9060xt', 'cp-5080fe', 'lp-g16'],
      sort: 'manual',
    }),
    col({
      id: 'col-biznes',
      slug: 'per-biznes',
      title: T('Për biznes', 'For business'),
      description: T('Laptopë të lehtë dhe të sigurt për ekipe, me Windows 11 Pro ose macOS.', 'Light, secure laptops for teams, with Windows 11 Pro or macOS.'),
      image: pic('/assets/products/photo/lp-x1c12.webp'),
      kind: 'manual',
      productIds: ['lp-x1c12', 'lp-xps13', 'lp-mbp14m4p', 'lp-zbs14', 'lp-sl7', 'lp-omniflip14'],
      sort: 'manual',
    }),
    col({
      id: 'col-zbritje',
      slug: 'ne-zbritje',
      title: T('Në zbritje', 'On sale'),
      description: T('Produktet me çmim të ulur tani. Lista ndryshon vetë kur ndryshon çmimi.', 'Products with a reduced price right now. The list updates itself when prices change.'),
      kind: 'smart',
      rules: [{ field: 'onSale', op: 'eq', value: 'true' }],
      sort: 'price-asc',
      published: false,
    }),
  ];
}

/* ------------------------------------------------------------------ */
/* Discounts — all drafts until the store decides                       */
/* ------------------------------------------------------------------ */
const ALL = { scope: 'all' as const, ids: [] };
const EVERYONE = { type: 'all' as const };
const NO_MIN = { type: 'none' as const, value: 0 };

export function buildItcomDiscounts(now: Date): Discount[] {
  const base = { audience: EVERYONE, uses: 0, createdAt: iso(now, -4), startsAt: iso(now, -4), status: 'draft' as const };
  return [
    {
      ...base,
      id: 'd-mireseardhje',
      title: 'Mirëseardhje — MIRESEVINI5 (draft)',
      publicTitle: T('Mirëseardhje −5%', 'Welcome −5%'),
      kind: 'order',
      method: 'code',
      code: 'MIRESEVINI5',
      valueType: 'percent',
      value: 5,
      appliesTo: ALL,
      minimum: { type: 'amount', value: 300 },
      combines: { products: true, order: false, shipping: true },
      oncePerCustomer: true,
      tags: ['mireseardhje'],
    },
    {
      ...base,
      id: 'd-studente',
      title: 'Studentë — laptopë −5% me kod STUDENT (draft)',
      publicTitle: T('Zbritje për studentë', 'Student discount'),
      kind: 'products',
      method: 'code',
      code: 'STUDENT',
      valueType: 'percent',
      value: 5,
      appliesTo: { scope: 'collections', ids: ['col-studente'] },
      minimum: NO_MIN,
      combines: { products: false, order: false, shipping: true },
      usageLimit: 100,
      tags: ['studente'],
    },
    {
      ...base,
      id: 'd-montim',
      title: 'Montim falas — PCMONTIM, porosi mbi 800 € (draft)',
      publicTitle: T('Montim i PC‑së falas', 'Free PC assembly'),
      kind: 'order',
      method: 'code',
      code: 'PCMONTIM',
      valueType: 'fixed',
      value: 39,
      appliesTo: ALL,
      minimum: { type: 'amount', value: 800 },
      combines: { products: true, order: false, shipping: true },
      tags: ['ndertuesi'],
    },
    {
      ...base,
      id: 'd-dergesa',
      title: 'Dërgesë falas mbi 150 € (draft)',
      publicTitle: T('Dërgesë falas', 'Free delivery'),
      kind: 'shipping',
      method: 'auto',
      valueType: 'percent',
      value: 100,
      appliesTo: ALL,
      minimum: { type: 'amount', value: 150 },
      shipping: { maxRate: 10 },
      combines: { products: true, order: true, shipping: false },
      tags: ['dergesa'],
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Campaigns (offers centre)                                            */
/* ------------------------------------------------------------------ */
const ZERO = { visits: 0, ctaClicks: 0, codeUses: 0, orders: 0, revenue: 0, discountTotal: 0 };

export function buildItcomOffers(now: Date): Offer[] {
  return [
    {
      id: 'of-studente',
      slug: 'kthimi-ne-shkolle',
      name: T('Kthimi në shkollë', 'Back to school'),
      description: T(
        'Laptopët për studentë me kodin STUDENT. Draft: aktivizoni zbritjen dhe fushatën kur të vendosni periudhën.',
        'Student laptops with the STUDENT code. Draft: switch on the discount and the campaign once the dates are set.',
      ),
      status: 'draft',
      startsAt: iso(now, 3),
      endsAt: iso(now, 33),
      discountId: 'd-studente',
      collectionId: 'col-studente',
      productIds: [],
      badge: T('Studentë −5%', 'Students −5%'),
      image: pic('/assets/products/photo/lp-zb14amd.webp'),
      landing: {
        title: T('Gati për semestrin', 'Ready for the semester'),
        text: T(
          'Laptopë nën 1.000 €, të zgjedhur për mësim dhe projekte. Shkruani kodin STUDENT te porosia dhe zbritja llogaritet menjëherë.',
          'Laptops under €1,000 picked for study and projects. Enter the code STUDENT at checkout and the discount is applied straight away.',
        ),
      },
      placements: ['announcement', 'home-block'],
      owner: 'st-sales',
      utm: 'utm_source=itcom&utm_medium=site&utm_campaign=kthimi-ne-shkolle',
      metrics: ZERO,
      createdAt: iso(now, -2),
    },
    {
      id: 'of-ndertuesi',
      slug: 'nderto-pc-ne',
      name: T('Ndërto PC‑në tënde', 'Build your PC'),
      description: T(
        'Montim falas (−39 €) me kodin PCMONTIM për porosi mbi 800 €. Draft: aktivizoni zbritjen “Montim i PC‑së falas”.',
        'Free assembly (−€39) with the code PCMONTIM on orders over €800. Draft: switch on the “Free PC assembly” discount.',
      ),
      status: 'draft',
      startsAt: iso(now, 1),
      discountId: 'd-montim',
      collectionId: 'col-gaming',
      productIds: [],
      badge: T('Montim falas', 'Free assembly'),
      image: pic('/assets/products/photo/cp-5070fe.webp'),
      landing: {
        title: T('Ne e montojmë dhe e testojmë', 'We assemble and test it'),
        text: T(
          'Zgjidhni pjesët në konfiguruesin 3D dhe shkruani kodin PCMONTIM te porosia: për porosi mbi 800 €, montimi dhe testimi janë falas.',
          'Pick the parts in the 3D configurator and enter the code PCMONTIM at checkout: on orders over €800, assembly and testing are free.',
        ),
      },
      placements: ['banner'],
      owner: 'st-service',
      utm: 'utm_source=itcom&utm_medium=site&utm_campaign=nderto-pc',
      metrics: ZERO,
      createdAt: iso(now, -1),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Blog — practical buying guides (Këshilla)                            */
/* ------------------------------------------------------------------ */
export function buildItcomPosts(now: Date): Post[] {
  const post = (id: string, slug: string, days: number, x: Omit<Post, 'id' | 'slug' | 'publishedAt' | 'published' | 'author'>): Post => ({
    id, slug, publishedAt: iso(now, -days), published: true, author: 'Ekipi ITCOM', ...x,
  });
  return [
    post('post-laptopi', 'si-ta-zgjidhni-laptopin', 6, {
      title: T('Si ta zgjidhni laptopin për punë dhe studim', 'How to choose a laptop for work and study'),
      excerpt: T(
        'Memoria, disku, ekrani dhe bateria: katër pyetje që e ngushtojnë zgjedhjen më shumë se emri i procesorit.',
        'Memory, storage, screen and battery: four questions that narrow the choice more than the processor name.',
      ),
      tag: T('Laptopë', 'Laptops'),
      cover: pic('/assets/products/photo/lp-zbs14.webp'),
      readMinutes: 4,
      body: T(
        `Para se të krahasoni procesorë, vendosni si do ta përdorni laptopin. Katër pyetje e bëjnë zgjedhjen shumë më të lehtë.

## 1. Sa memorie RAM?
Për shfletim, dokumente dhe video‑thirrje, **16 GB** janë sot pika e sigurt. Për montazh video, programim me makina virtuale ose shumë programe njëherësh, zgjidhni **32 GB**. Te shumë laptopë të hollë memoria është e ngjitur në pllakë dhe nuk shtohet më vonë.

## 2. Sa hapësirë në disk?
**512 GB** mjaftojnë për shumicën. Nëse ruani foto, video ose lojëra, shkoni te **1 TB**. Ruajtja në cloud ndihmon, por disku i shpejtë lokal mbetet më i rehatshëm.

## 3. Çfarë ekrani?
Ekrani 14" është kompromisi më i mirë mes peshës dhe hapësirës. Për krijim përmbajtjeje, një panel OLED ose me ngjyra të kalibruara bën dallim të madh.

## 4. Sa bateri dhe peshë?
Nëse e merrni çdo ditë në shkollë ose zyrë, kërkoni më pak se 1,4 kg dhe bateri për një ditë të plotë pune.

> Për laptopët ku RAM‑i dhe disku varen nga konfigurimi, verifikoni variantin sipas kodit të artikullit para porosisë — ekipi ITCOM ju ndihmon.`,
        `Before comparing processors, decide how you will use the laptop. Four questions make the choice much easier.

## 1. How much RAM?
For browsing, documents and video calls, **16 GB** is today's safe point. For video editing, programming with virtual machines or many apps at once, choose **32 GB**. In many thin laptops the memory is soldered and cannot be added later.

## 2. How much storage?
**512 GB** is enough for most people. If you keep photos, video or games, go for **1 TB**. Cloud storage helps, but a fast local drive is still more comfortable.

## 3. Which screen?
A 14" screen is the best compromise between weight and space. For content creation, an OLED or colour-calibrated panel makes a big difference.

## 4. How much battery and weight?
If you carry it to school or the office every day, look for under 1.4 kg and a battery that lasts a full working day.

> For laptops whose RAM and storage depend on the configuration, check the variant by its item code before ordering — the ITCOM team will help.`,
      ),
    }),
    post('post-furnizuesi', 'sa-vat-duhet-furnizuesi', 12, {
      title: T('Sa vat duhet të ketë furnizuesi i PC‑së?', 'How many watts does your PC power supply need?'),
      excerpt: T(
        'Mblidhni konsumin e procesorit dhe të kartelës grafike, shtoni rezervë dhe zgjidhni një furnizues me certifikatë.',
        'Add up the processor and graphics card power, leave headroom and pick a certified power supply.',
      ),
      tag: T('Ndërto PC', 'Build a PC'),
      cover: pic('/assets/products/photo/cp-9800x3d.webp'),
      readMinutes: 3,
      body: T(
        `Furnizuesi i rrymës (PSU) është pjesa që më shpesh zgjidhet “sa për të qenë”. Ja si ta llogaritni.

## Llogaritja e shpejtë
- Merrni konsumin (TDP/TBP) e procesorit dhe të kartelës grafike nga faqja e prodhuesit.
- Shtoni rreth **75 W** për pllakën amë, memorien, disqet dhe ventilatorët.
- Shumëzojeni me **1,4**: kjo jep rezervë për majat e konsumit dhe e mban furnizuesin të qetë.

Konfiguruesi 3D i ITCOM e bën këtë llogaritje vetë dhe ju paralajmëron kur furnizuesi është i dobët.

## Çfarë tjetër të shikoni
- Certifikatë **80 PLUS Gold** ose më e mirë: më pak nxehtësi dhe zhurmë.
- Kabllo **12V‑2x6 / 12VHPWR** për kartelat e reja NVIDIA.
- Garanci e gjatë nga prodhuesi.`,
        `The power supply (PSU) is the part most often chosen as an afterthought. Here is how to size it.

## The quick calculation
- Take the processor and graphics card power (TDP/TBP) from the manufacturer's page.
- Add about **75 W** for the motherboard, memory, drives and fans.
- Multiply by **1.4**: this leaves headroom for power spikes and keeps the PSU quiet.

The ITCOM 3D configurator does this for you and warns you when the power supply is too weak.

## What else to check
- **80 PLUS Gold** certification or better: less heat and noise.
- A **12V-2x6 / 12VHPWR** cable for newer NVIDIA cards.
- A long manufacturer warranty.`,
      ),
    }),
    post('post-platforma', 'am5-apo-lga1851', 20, {
      title: T('AM5 apo LGA1851: cilën platformë të zgjidhni?', 'AM5 or LGA1851: which platform should you choose?'),
      excerpt: T(
        'Soketi përcakton cilën pllakë amë dhe memorie blini. Ja dallimet që kanë rëndësi në praktikë.',
        'The socket decides which motherboard and memory you buy. Here are the differences that matter in practice.',
      ),
      tag: T('Procesorë', 'Processors'),
      cover: pic('/assets/products/photo/cp-285k.webp'),
      readMinutes: 3,
      body: T(
        `Para se të zgjidhni procesorin, zgjidhni platformën: ajo përcakton pllakën amë, memorien dhe mundësinë për ta përmirësuar më vonë.

## AMD AM5
- Për procesorët **Ryzen 7000 dhe 9000**, përfshirë modelet **X3D** që janë shumë të forta në lojëra.
- Përdor vetëm memorie **DDR5**.
- AMD e ka paralajmëruar mbështetjen e soketit për disa breza, ndaj përmirësimi i procesorit më vonë është i thjeshtë.

## Intel LGA1851
- Për procesorët **Core Ultra 200S** (p.sh. Core Ultra 9 285K), të fortë në punë me shumë bërthama.
- Edhe ky përdor **DDR5**.

## Si të vendosni
- Kryesisht lojëra: një Ryzen X3D në AM5.
- Montazh, renderim dhe shumë detyra njëherësh: Ryzen 9 me shumë bërthama ose Core Ultra 9.
- Në konfiguruesin 3D, pllaka amë dhe memoria kontrollohen automatikisht që të përputhen me procesorin.`,
        `Before choosing a processor, choose the platform: it decides the motherboard, the memory and how easily you can upgrade later.

## AMD AM5
- For **Ryzen 7000 and 9000** processors, including the **X3D** models that are very strong in games.
- Uses **DDR5** memory only.
- AMD has announced socket support across several generations, so a later processor upgrade is simple.

## Intel LGA1851
- For **Core Ultra 200S** processors (e.g. Core Ultra 9 285K), strong in many-core work.
- Also uses **DDR5**.

## How to decide
- Mainly games: a Ryzen X3D on AM5.
- Editing, rendering and heavy multitasking: a many-core Ryzen 9 or Core Ultra 9.
- In the 3D configurator, the motherboard and memory are checked automatically against the processor.`,
      ),
    }),
  ];
}

/* ------------------------------------------------------------------ */
/* Menus — header links and footer columns of the shop                  */
/* ------------------------------------------------------------------ */
export function buildItcomMenus(): Menu[] {
  const url = (id: string, label: L10n, target: string, children?: MenuItem[]): MenuItem => ({ id, label, type: 'url', target, ...(children ? { children } : {}) });
  const cat = (id: string, label: L10n, target: string): MenuItem => ({ id, label, type: 'category', target });
  const page = (id: string, label: L10n, target: string): MenuItem => ({ id, label, type: 'page', target });
  const col = (id: string, label: L10n, target: string): MenuItem => ({ id, label, type: 'collection', target });
  return [
    {
      id: 'menu-main',
      handle: 'main',
      title: 'Menyja kryesore',
      items: [
        url('mi-builder', T('Ndërto PC', 'Build a PC'), '#builder'),
        url('mi-service', T('Servisi', 'Service'), '#/servisi'),
        url('mi-blog', T('Këshilla', 'Advice'), '#/blog'),
        url('mi-offers', T('Ofertat', 'Offers'), '#/ofertat'),
      ],
    },
    {
      id: 'menu-footer',
      handle: 'footer',
      title: 'Fundi i faqes',
      items: [
        url('mi-f-shop', T('Dyqani', 'Shop'), '#/produktet', [
          cat('mi-f-lp', T('Laptopë', 'Laptops'), 'cat-laptop'),
          cat('mi-f-cpu', T('Procesorë', 'Processors'), 'cat-cpu'),
          cat('mi-f-gpu', T('Kartela grafike', 'Graphics cards'), 'cat-gpu'),
          col('mi-f-students', T('Për studentë', 'For students'), 'col-studente'),
          url('mi-f-offers', T('Ofertat', 'Offers'), '#/ofertat'),
          url('mi-f-builder', T('Ndërto PC', 'Build a PC'), '#builder'),
        ]),
        url('mi-f-help', T('Ndihmë', 'Help'), '', [
          url('mi-f-delivery', T('Dërgesa', 'Delivery'), '#info-delivery'),
          page('mi-f-returns', T('Kthimi i produkteve', 'Returns'), 'pg-returns'),
          page('mi-f-warranty', T('Garancia dhe servisi', 'Warranty and service'), 'pg-warranty'),
          url('mi-f-pay', T('Pagesat', 'Payments'), '#info-installments'),
          url('mi-f-service', T('Rezervo servis', 'Book a service'), '#/servisi'),
        ]),
        url('mi-f-company', T('Kompania', 'Company'), '', [
          page('mi-f-about', T('Rreth ITCOM', 'About ITCOM'), 'pg-about'),
          url('mi-f-business', T('ITCOM Business', 'ITCOM Business'), '#business'),
          url('mi-f-blog', T('Këshilla', 'Advice'), '#/blog'),
          url('mi-f-contact', T('Kontakti', 'Contact'), '#info-contact'),
          page('mi-f-careers', T('Karriera', 'Careers'), 'pg-careers'),
        ]),
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/* B2B quotes — answers to the business requests in the inbox           */
/* ------------------------------------------------------------------ */
export function buildItcomQuotes(now: Date, products: Product[]): Quote[] {
  const price = (id: string) => products.find((p) => p.id === id)?.salePrice ?? products.find((p) => p.id === id)?.price ?? 0;
  const name = (id: string) => products.find((p) => p.id === id)?.name.sq ?? id;
  const line = (id: string, qty: number) => ({ productId: id, title: name(id), qty, price: price(id) });
  const terms = T(
    'Çmimet janë në euro dhe përfshijnë TVSH 18%. Pagesa me transfertë bankare brenda 15 ditëve nga fatura. Garanci 24 muaj. Oferta vlen deri në datën e shënuar.',
    'Prices are in euros and include 18% VAT. Payment by bank transfer within 15 days of invoice. 24-month warranty. The quote is valid until the date shown.',
  );
  return [
    {
      id: 'q-001',
      number: 'Q-2026-001',
      inquiryId: 'inq_102',
      customer: { name: 'Arbër Krasniqi', company: 'Studio Pixel', email: 'arber@example.com', phone: '+383 49 552 301' },
      lines: [
        line('cp-9950x', 3),
        line('cp-5080fe', 3),
        { title: 'Montim dhe testim profesional', qty: 3, price: 39 },
      ],
      validUntil: iso(now, 14),
      terms,
      version: 1,
      status: 'sent',
      createdAt: iso(now, -0.3),
      owner: 'st-sales',
    },
    {
      id: 'q-002',
      number: 'Q-2026-002',
      inquiryId: 'inq_103',
      customer: { name: 'Valon Bytyqi', company: 'Kompania Logjistike Sh.p.k.', email: 'valon@example.com', phone: '+383 45 318 662' },
      lines: [line('lp-x1c12', 10)],
      validUntil: iso(now, 10),
      terms,
      version: 2,
      status: 'draft',
      createdAt: iso(now, -1),
      owner: 'st-sales',
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Services and the appointment calendar                                */
/* ------------------------------------------------------------------ */
export const ITCOM_SERVICES: Service[] = [
  {
    id: 'sv-montim',
    name: T('Montim dhe testim i PC‑së', 'PC assembly and testing'),
    description: T('Montojmë pjesët tuaja ose ato të blera te ne, instalojmë drajverët dhe e testojmë nën ngarkesë.', 'We assemble your parts or those bought from us, install drivers and stress-test the PC.'),
    durationMin: 120,
    capacity: 2,
    price: 39,
    color: '#0a6cdf',
    staffIds: ['st-service'],
    location: 'loc-main',
  },
  {
    id: 'sv-diagnostikim',
    name: T('Diagnostikim laptopi ose PC‑je', 'Laptop or PC diagnostics'),
    description: T('Kontrollojmë pajisjen dhe ju tregojmë problemin dhe koston para çdo riparimi.', 'We check the device and tell you the problem and the cost before any repair.'),
    durationMin: 30,
    capacity: 2,
    color: '#1a7f37',
    staffIds: ['st-service'],
    location: 'loc-main',
  },
  {
    id: 'sv-mirembajtje',
    name: T('Pastrim dhe mirëmbajtje', 'Cleaning and maintenance'),
    description: T('Pastrim nga pluhuri dhe ndërrim i pastës termike, për PC dhe laptopë.', 'Dust cleaning and thermal paste replacement for PCs and laptops.'),
    durationMin: 60,
    capacity: 1,
    color: '#b25000',
    staffIds: ['st-service'],
    location: 'loc-main',
  },
  {
    id: 'sv-konsulte',
    name: T('Konsultë për biznes', 'Business consultation'),
    description: T('Takim për pajisjet e ekipit: laptopë, stacione pune dhe ofertë me faturë. Falas.', 'A meeting about your team’s equipment: laptops, workstations and an invoiced quote. Free.'),
    durationMin: 30,
    capacity: 1,
    price: 0,
    color: '#0b0c0f',
    staffIds: ['st-sales'],
    location: 'onsite',
  },
];

function mondayOf(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Bookings for this week and next. The scheduled business request (inq_103) gets the consultation slot. */
export function buildItcomBookings(now: Date, inquiries: Inquiry[]): { bookings: Booking[]; inquiries: Inquiry[] } {
  const monday = mondayOf(now);
  const people: [string, string, string][] = [
    ['Driton Berisha', '+383 44 615 220', 'Prishtinë'],
    ['Liridona Shala', '+383 49 318 704', 'Fushë Kosovë'],
    ['Gentrit Kelmendi', '+383 45 220 931', 'Prishtinë'],
    ['Albina Rama', '+383 44 902 115', 'Lipjan'],
    ['Kushtrim Hasani', '+383 43 551 860', 'Podujevë'],
    ['Teuta Zeqiri', '+383 49 773 402', 'Prishtinë'],
  ];
  // [day from Monday, hour, minute, service, note]
  const slots: [number, number, number, string, string][] = [
    [0, 10, 0, 'sv-diagnostikim', 'Laptopi fiket vetë pas 10 minutash.'],
    [1, 11, 0, 'sv-montim', 'Pjesët i ka blerë te ne (porosia në internet).'],
    [2, 15, 30, 'sv-mirembajtje', 'PC gaming, temperatura të larta.'],
    [3, 9, 30, 'sv-diagnostikim', 'Ekrani nuk ndizet.'],
    [4, 13, 0, 'sv-konsulte', ''],
    [7, 10, 30, 'sv-montim', 'Konfigurim “Gaming 1440p” nga konfiguruesi 3D.'],
    [8, 14, 0, 'sv-diagnostikim', 'Tastiera nuk punon pjesërisht.'],
    [9, 11, 0, 'sv-mirembajtje', ''],
  ];
  const bookings: Booking[] = slots.map(([day, h, m, serviceId, note], i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + day);
    start.setHours(h, m, 0, 0);
    const service = ITCOM_SERVICES.find((s) => s.id === serviceId)!;
    const past = start.getTime() + service.durationMin * 60000 < now.getTime();
    const [customerName, phone, city] = people[i % people.length];
    return {
      id: `bk-${201 + i}`,
      serviceId,
      staffId: service.staffIds[0],
      customerName,
      phone,
      city,
      start: start.toISOString(),
      durationMin: service.durationMin,
      status: past ? (i === 2 ? 'noshow' : 'done') : i === 7 ? 'pending' : 'confirmed',
      ...(note ? { note } : {}),
      location: service.location === 'onsite' ? 'onsite' : 'loc-main',
      createdAt: new Date(start.getTime() - (2 + (i % 4)) * DAY).toISOString(),
    };
  });

  // The business request marked "scheduled" gets the next free consultation.
  const out = inquiries.map((q) => ({ ...q }));
  const req = out.find((q) => q.id === 'inq_103');
  if (req) {
    const start = new Date(Math.max(now.getTime() + DAY, monday.getTime() + 8 * DAY));
    start.setHours(10, 0, 0, 0);
    if (start.getDay() === 0) start.setDate(start.getDate() + 1);
    bookings.push({
      id: 'bk-301',
      serviceId: 'sv-konsulte',
      staffId: 'st-sales',
      customerName: req.name,
      phone: req.phone,
      email: req.email,
      city: req.city,
      start: start.toISOString(),
      durationMin: 30,
      status: 'confirmed',
      inquiryId: req.id,
      note: '10 laptopë biznesi me Windows 11 Pro — oferta Q-2026-002.',
      location: 'onsite',
      address: 'Ferizaj',
      createdAt: iso(now, -1),
    });
    req.scheduledAt = start.toISOString();
  }
  return { bookings, inquiries: out };
}
