// CMS v2 demo data — collections, discounts, offers, placements, staff, appointments, segments,
// inventory, purchasing, drafts, returns, quotes, menus, content models and the audit log.
// Everything is relative to `now` so the demo always looks current, and coherent with the
// ITCOM catalogue (optical frames, sunglasses, prescription lenses from Optical Lab),
// Klinika Miftari and Mitrovicë / Kosovo.
import type {
  AuditEntry, Booking, Collection, ContentModel, Discount, DraftOrder, HomeSection, HomeVersion, Inquiry, InventoryMovement, L10n,
  Menu, Offer, Order, OrderLine, Placement, Product, Project, PurchaseOrder, Quote, ReturnRequest, Segment, Service, Staff,
} from '@/lib/types';
import { defaultOptions } from '@/lib/pricing';
import { refundForLines } from '@/lib/orders';
import { round2 } from '@/lib/utils';

// L10n order is (me, sq, en): `me` holds the Serbian (Latin) copy — switched off on the storefront by default.
const T = (me: string, sq: string, en: string): L10n => ({ me, sq, en });
const E = (): L10n => ({ me: '', sq: '', en: '' });
const DAY = 86400000;
const iso = (now: Date, days: number, hours = 0) => new Date(now.getTime() + days * DAY + hours * 3600000).toISOString();

/** Catalogue groups used across rules, offers and purchase orders. */
const OPTICAL = ['p-prism-m2', 'p-nova-n04', 'p-origin-o06'];

/* ================================================================== */
/* Products — tags, vendors, costs, barcodes, incoming, unavailable    */
/* ================================================================== */
/** Purchase cost as a share of the retail price — frames are bought in, lenses are surfaced in our own lab. */
const COST_FACTOR: Record<string, number> = { 'cat-optike': 0.42, 'cat-dielli': 0.46, 'cat-lente': 0.34 };

const FRAMES = 'Miftari Atelier';
const LAB = 'Optical Lab';
const OMNI: ('online' | 'pos')[] = ['online', 'pos'];

const EXTRAS: Record<string, { tags: string[]; vendor: string; incoming?: number; unavailable?: number; channels?: ('online' | 'pos')[] }> = {
  // optical frames
  'p-prism-m2': { tags: ['optike', 'titan', 'meshkuj', 'femra', 'e-re'], vendor: FRAMES, incoming: 20 },
  'p-nova-n04': { tags: ['optike', 'titan', 'acetat', 'femra', 'e-re'], vendor: FRAMES, incoming: 12 },
  'p-origin-o06': { tags: ['optike', 'karbon', 'meshkuj', 'progresive'], vendor: FRAMES },
  // sunglasses
  'p-vortex-x1': { tags: ['dielli', 'acetat', 'polarizuar', 'meshkuj', 'premium'], vendor: FRAMES, unavailable: 1 },
  'p-eclipse-e05': { tags: ['dielli', 'titan', 'polarizuar', 'aviator', 'meshkuj', 'femra'], vendor: FRAMES, unavailable: 1 },
  'p-solstice-s7': { tags: ['dielli', 'acetat', 'gradient', 'femra'], vendor: FRAMES },
  'p-riviera-r8': { tags: ['dielli', 'titan', 'cat-eye', 'femra'], vendor: FRAMES },
  'p-meridian-m9': { tags: ['dielli', 'titan', 'polarizuar', 'aviator', 'meshkuj'], vendor: FRAMES, incoming: 10 },
  'p-nera-n10': { tags: ['dielli', 'acetat', 'polarizuar', 'meshkuj', 'femra'], vendor: FRAMES },
  'p-lumen-l11': { tags: ['dielli', 'acetat', 'fotokromatike', 'femra'], vendor: FRAMES, incoming: 4 },
  'p-arc-v3': { tags: ['dielli', 'sport', 'polarizuar', 'meshkuj'], vendor: FRAMES },
  'p-atlas-a12': { tags: ['dielli', 'sport', 'polarizuar', 'meshkuj', 'femra'], vendor: FRAMES },
  // prescription-lens packages (made in Optical Lab, sold online and over the counter)
  'p-lens-single': { tags: ['lente', 'laborator', 'njevizore'], vendor: LAB, channels: OMNI },
  'p-lens-progressive': { tags: ['lente', 'laborator', 'progresive'], vendor: LAB, channels: OMNI },
  'p-lens-screen': { tags: ['lente', 'laborator', 'ekran', 'drite-blu'], vendor: LAB, channels: OMNI },
  'p-lens-photochromic': { tags: ['lente', 'laborator', 'fotokromatike'], vendor: LAB, channels: OMNI },
  'p-lens-sun-rx': { tags: ['lente', 'laborator', 'dielli-me-dioptri'], vendor: LAB, channels: OMNI },
  'p-lens-thin': { tags: ['lente', 'laborator', 'dioptri-te-larta'], vendor: LAB, channels: OMNI },
  // smart glasses — listed on request (price & availability confirmed by the store; brand names belong to their owners)
  'p-rayban-meta-wayfarer': { tags: ['smart', 'kamere', 'meta-ai', 'wayfarer'], vendor: 'Ray-Ban Meta' },
  'p-rayban-meta-aviator': { tags: ['smart', 'kamere', 'meta-ai', 'aviator'], vendor: 'Ray-Ban Meta' },
  'p-rayban-meta-zena': { tags: ['smart', 'kamere', 'meta-ai', 'cat-eye'], vendor: 'Ray-Ban Meta' },
  'p-meta-rayban-display': { tags: ['smart', 'ekran', 'byzylyk'], vendor: 'Meta' },
  'p-rayban-meta-audio': { tags: ['smart', 'audio', 'pa-kamere'], vendor: 'Ray-Ban Meta' },
  'p-oakley-meta-hstn': { tags: ['smart', 'kamere', 'oakley'], vendor: 'Oakley Meta' },
};

/**
 * EAN-13 with a valid check digit. Kosovo has no GS1 prefix of its own, so in-store codes use the
 * GS1 restricted-circulation range (200–299) — fine for shelf labels and the POS scanner.
 */
function ean13(n: number) {
  const body = `200${String(100000000 + n * 7919).slice(-9)}`;
  const sum = body.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}

/** Adds CMS v2 fields to the catalogue (cost, vendor, tags, barcode, incoming, channels, template). */
export function enrichProducts(products: Product[]): Product[] {
  return products.map((p, i): Product => {
    const x = EXTRAS[p.id];
    return {
      ...p,
      cost: round2(p.price * (COST_FACTOR[p.categoryId] ?? 0.45)),
      vendor: x?.vendor,
      tags: x?.tags ?? [],
      barcode: ean13(i + 1),
      incoming: x?.incoming ?? 0,
      unavailable: x?.unavailable ?? 0,
      template: p.quoteOnly ? 'quote' : 'standard',
      channels: x?.channels ?? OMNI,
    };
  });
}

/**
 * Discontinued line archived after it had sales. The current collection has none — every model in the
 * catalogue is live — so this id matches no product and the seed archives nothing.
 */
export const ARCHIVED_PRODUCT: string = '';

/* ================================================================== */
/* Collections                                                         */
/* ================================================================== */
export function buildCollections(now: Date): Collection[] {
  return [
    {
      id: 'col-dielli-fund-sezoni',
      slug: 'fund-sezoni-syze-dielli',
      title: T('Kraj sezone — naočare za sunce', 'Fund sezoni — syze dielli', 'End of season — sunglasses'),
      description: T(
        'Sve naočare za sunce iz kolekcije ovog leta — popust od 20% obračunava se automatski u korpi.',
        'Të gjitha syzet e diellit të koleksionit të kësaj vere — zbritja 20% llogaritet automatikisht në shportë.',
        'Every pair from this summer’s sunglasses collection — the 20% discount is applied automatically in the cart.',
      ),
      image: '/images/misc/sun-collection.webp',
      kind: 'smart',
      productIds: [],
      match: 'all',
      rules: [{ field: 'category', op: 'eq', value: 'cat-dielli' }],
      sort: 'bestselling',
      published: true,
      seo: { title: 'Fund sezoni: syze dielli −20% — ITCOM', description: 'Syze dielli të polarizuara dhe UV400 me 20% zbritje deri në fund të sezonit. Edhe me dioptri, nga laboratori ynë.' },
      createdAt: iso(now, -9),
    },
    {
      id: 'col-ekran',
      slug: 'syze-per-ekran',
      title: T('Naočare za ekran', 'Syze për ekran', 'Screen glasses'),
      description: T(
        'Lagani okviri i sočiva sa filterom plavog svetla — za kancelariju, učenje i duge dane ispred monitora.',
        'Korniza të lehta dhe lente me filtër drite blu — për zyrë, studim dhe ditë të gjata para monitorit.',
        'Light frames and blue-light filter lenses — for the office, studying and long days at the monitor.',
      ),
      image: '/images/p/prism-m2-2.webp',
      kind: 'manual',
      productIds: ['p-lens-screen', 'p-prism-m2', 'p-nova-n04', 'p-origin-o06'],
      match: 'all',
      rules: [],
      sort: 'manual',
      published: true,
      createdAt: iso(now, -34),
    },
    {
      id: 'col-titan',
      slug: 'titan-i-lehte',
      title: T('Lagani titan', 'Titan i lehtë', 'Featherweight titanium'),
      description: T(
        'Okviri od titana koji se jedva osete na licu — optički i za sunce.',
        'Korniza titani që mezi ndihen në fytyrë — optike dhe dielli.',
        'Titanium frames you barely feel on your face — optical and sun.',
      ),
      image: '/images/lookbook/atelier-optical.webp',
      kind: 'smart',
      productIds: [],
      match: 'all',
      rules: [{ field: 'tag', op: 'eq', value: 'titan' }],
      sort: 'price-asc',
      published: true,
      createdAt: iso(now, -48),
    },
    {
      id: 'col-polarizuara',
      slug: 'te-polarizuara',
      title: T('Polarizovane', 'Të polarizuara', 'Polarised'),
      description: T(
        'Sočiva koja uklanjaju odsjaj sa puta, vode i snega — za vožnju, more i planinu.',
        'Lente që e heqin shkëlqimin verbues nga rruga, uji dhe bora — për vozitje, det dhe mal.',
        'Lenses that remove glare from road, water and snow — for driving, the sea and the mountains.',
      ),
      image: '/images/hero/sun.webp',
      kind: 'smart',
      productIds: [],
      match: 'all',
      rules: [
        { field: 'category', op: 'eq', value: 'cat-dielli' },
        { field: 'tag', op: 'eq', value: 'polarizuar' },
      ],
      sort: 'bestselling',
      published: true,
      createdAt: iso(now, -70),
    },
    {
      id: 'col-vera',
      slug: 'koleksioni-i-veres',
      title: T('Letnja kolekcija', 'Koleksioni i verës', 'Summer collection'),
      description: T(
        'Ručno odabrani modeli za sunce ove sezone — od panto acetata do lakog cat-eye okvira.',
        'Modelet e diellit të zgjedhura me dorë për këtë sezon — nga acetati panto te cat-eye e lehtë.',
        'This season’s hand-picked sun styles — from panto acetate to a light cat-eye.',
      ),
      image: '/images/lookbook/riviera.webp',
      kind: 'manual',
      productIds: ['p-solstice-s7', 'p-riviera-r8', 'p-vortex-x1', 'p-lumen-l11', 'p-eclipse-e05', 'p-nera-n10'],
      match: 'all',
      rules: [],
      sort: 'manual',
      published: true,
      createdAt: iso(now, -110),
    },
    {
      id: 'col-bestseleri',
      slug: 'me-te-shiturat',
      title: T('Najprodavanije', 'Më të shiturat', 'Bestsellers'),
      description: T('Okviri i sočiva koje naši klijenti najčešće biraju.', 'Kornizat dhe lentet që klientët tanë zgjedhin më shpesh.', 'The frames and lenses our customers choose most often.'),
      image: '/images/p/origin-o06-2.webp',
      kind: 'manual',
      productIds: ['p-origin-o06', 'p-vortex-x1', 'p-meridian-m9', 'p-prism-m2', 'p-lens-single', 'p-lens-screen', 'p-eclipse-e05', 'p-nova-n04'],
      match: 'all',
      rules: [],
      sort: 'bestselling',
      published: true,
      createdAt: iso(now, -90),
    },
    {
      id: 'col-femra',
      slug: 'per-femra',
      title: T('Za žene', 'Për femra', 'For women'),
      description: T('Okviri koje najčešće biraju naše klijentkinje — optički i za sunce.', 'Kornizat që zgjedhin më shpesh klientet tona — optike dhe dielli.', 'The frames our female customers choose most — optical and sun.'),
      image: '/images/hero/family.webp',
      kind: 'smart',
      productIds: [],
      match: 'all',
      rules: [{ field: 'tag', op: 'eq', value: 'femra' }],
      sort: 'bestselling',
      published: true,
      createdAt: iso(now, -60),
    },
    {
      id: 'col-meshkuj',
      slug: 'per-meshkuj',
      title: T('Za muškarce', 'Për meshkuj', 'For men'),
      description: T('Pravougaoni, avijator i sportski modeli koje muškarci kod nas najčešće biraju.', 'Modelet drejtkëndore, aviator dhe sportive që meshkujt zgjedhin më shpesh te ne.', 'The rectangle, aviator and sport styles men choose most often with us.'),
      image: '/images/lookbook/sun-terrace.webp',
      kind: 'smart',
      productIds: [],
      match: 'all',
      rules: [{ field: 'tag', op: 'eq', value: 'meshkuj' }],
      sort: 'bestselling',
      published: true,
      createdAt: iso(now, -60),
    },
    {
      id: 'col-lente-lab',
      slug: 'lente-nga-laboratori',
      title: T('Sočiva iz laboratorije', 'Lente nga laboratori', 'Lenses from our lab'),
      description: T(
        'Sva sočiva po receptu koja brusimo, centriramo i proveravamo u Optical Lab u Mitrovici.',
        'Të gjitha lentet me recetë që i punojmë, i centrojmë dhe i kontrollojmë në Optical Lab në Mitrovicë.',
        'Every prescription lens we surface, centre and verify at Optical Lab in Mitrovica.',
      ),
      image: '/images/s/laboratori.webp',
      kind: 'smart',
      productIds: [],
      match: 'all',
      rules: [{ field: 'category', op: 'eq', value: 'cat-lente' }],
      sort: 'price-asc',
      published: true,
      createdAt: iso(now, -150),
    },
    {
      id: 'col-festat',
      slug: 'dhurata-per-festat',
      title: T('Pokloni za praznike', 'Dhurata për festat', 'Holiday gifts'),
      description: T(
        'Naočare koje se poklanjaju — u kutiji, sa vaučerom za pregled vida za onoga ko ih dobija.',
        'Syze që dhurohen — në kuti, me kupon për kontroll të syve për atë që i merr.',
        'Glasses made for gifting — boxed, with an eye-exam voucher for whoever receives them.',
      ),
      image: '/images/lookbook/still-life.webp',
      kind: 'manual',
      productIds: ['p-vortex-x1', 'p-solstice-s7', 'p-eclipse-e05', 'p-nova-n04', 'p-meridian-m9'],
      match: 'all',
      rules: [],
      sort: 'manual',
      published: false,
      createdAt: iso(now, -2),
    },
  ];
}

/* ================================================================== */
/* Discounts — all 4 types, code + automatic, every lifecycle state    */
/* ================================================================== */
const ALL_LINES = { scope: 'all' as const, ids: [] };
const NO_MIN = { type: 'none' as const, value: 0 };
const EVERYONE = { type: 'all' as const };

/** End of the sunglasses end-of-season sale — same moment as the homepage promo countdown. */
export const autumnSaleEnd = (now: Date) => new Date(now.getTime() + 12 * DAY + 5 * 3600000).toISOString();

export function buildDiscounts(now: Date): Discount[] {
  return [
    {
      id: 'd-miftari10',
      title: 'Mirëseardhje — MIFTARI10',
      publicTitle: T('Dobrodošlica −10%', 'Mirëseardhje −10%', 'Welcome −10%'),
      kind: 'order',
      method: 'code',
      code: 'MIFTARI10',
      valueType: 'percent',
      value: 10,
      appliesTo: ALL_LINES,
      minimum: { type: 'amount', value: 100 },
      audience: EVERYONE,
      combines: { products: true, order: false, shipping: true },
      oncePerCustomer: false,
      startsAt: iso(now, -120),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -120),
      tags: ['mireseardhje'],
    },
    {
      id: 'd-dielli20',
      title: 'Fund sezoni — syze dielli −20% (automatike)',
      publicTitle: T('Kraj sezone: naočare za sunce −20%', 'Fund sezoni: syze dielli −20%', 'End of season: sunglasses −20%'),
      kind: 'products',
      method: 'auto',
      valueType: 'percent',
      value: 20,
      appliesTo: { scope: 'collections', ids: ['col-dielli-fund-sezoni'] },
      minimum: NO_MIN,
      audience: EVERYONE,
      combines: { products: true, order: true, shipping: true },
      startsAt: iso(now, -9),
      endsAt: autumnSaleEnd(now),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -10),
      tags: ['fund-sezoni', 'dielli'],
    },
    {
      id: 'd-korniza-lente',
      title: 'Kornizë optike → −50% në lentet njëvizore',
      publicTitle: T(
        'Uz optički okvir: jednožižna sočiva −50%',
        'Me kornizë optike: lentet njëvizore −50%',
        'With an optical frame: single-vision lenses −50%',
      ),
      kind: 'bxgy',
      method: 'auto',
      valueType: 'percent',
      value: 50,
      appliesTo: ALL_LINES,
      minimum: NO_MIN,
      bxgy: { buyIds: OPTICAL, buyScope: 'products', buyQty: 1, getIds: ['p-lens-single'], getScope: 'products', getQty: 1, getType: 'percent', getValue: 50, maxUses: 2 },
      audience: EVERYONE,
      combines: { products: true, order: true, shipping: true },
      startsAt: iso(now, -30),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -31),
      tags: ['korniza', 'lente'],
    },
    {
      id: 'd-dergesa150',
      title: 'Transport falas mbi 150 €',
      publicTitle: T('Besplatna dostava preko 150 €', 'Transport falas mbi 150 €', 'Free delivery over €150'),
      kind: 'shipping',
      method: 'auto',
      valueType: 'percent',
      value: 100,
      appliesTo: ALL_LINES,
      minimum: { type: 'amount', value: 150 },
      shipping: { zoneIds: [] },
      audience: EVERYONE,
      combines: { products: true, order: true, shipping: false },
      startsAt: iso(now, -200),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -200),
    },
    {
      id: 'd-vjeshta25',
      title: 'Vjeshta — 25 € mbi 250 €',
      publicTitle: T('Jesenji popust 25 €', 'Zbritje vjeshte 25 €', 'Autumn €25 off'),
      kind: 'order',
      method: 'code',
      code: 'VJESHTA25',
      valueType: 'fixed',
      value: 25,
      appliesTo: ALL_LINES,
      minimum: { type: 'amount', value: 250 },
      audience: EVERYONE,
      combines: { products: true, order: false, shipping: true },
      usageLimit: 200,
      startsAt: iso(now, -10),
      endsAt: iso(now, 20),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -11),
      tags: ['vjeshta'],
    },
    {
      id: 'd-lab-b2b',
      title: 'Optical Lab B2B — lente −15% për optikë partnere',
      publicTitle: T('Partnerski popust laboratorije −15%', 'Zbritje partneri e laboratorit −15%', 'Lab partner discount −15%'),
      kind: 'products',
      method: 'code',
      code: 'LABB2B15',
      valueType: 'percent',
      value: 15,
      appliesTo: { scope: 'collections', ids: ['col-lente-lab'] },
      minimum: { type: 'qty', value: 4 },
      audience: { type: 'segment', segmentId: 'seg-b2b' },
      combines: { products: false, order: false, shipping: true },
      startsAt: iso(now, -180),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -180),
      tags: ['b2b', 'optical-lab'],
    },
    {
      id: 'd-bf-optike',
      title: 'Black Friday — korniza optike −25%',
      publicTitle: T('Black Friday: optički okviri −25%', 'Black Friday: korniza optike −25%', 'Black Friday: optical frames −25%'),
      kind: 'products',
      method: 'auto',
      valueType: 'percent',
      value: 25,
      appliesTo: { scope: 'products', ids: OPTICAL },
      minimum: NO_MIN,
      audience: EVERYONE,
      combines: { products: true, order: true, shipping: true },
      startsAt: iso(now, 21),
      endsAt: iso(now, 28),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -2),
      tags: ['black-friday', 'optike'],
    },
    {
      id: 'd-vera15',
      title: 'Vera — VERA15',
      publicTitle: T('Letnja akcija −15%', 'Oferta e verës −15%', 'Summer sale −15%'),
      kind: 'order',
      method: 'code',
      code: 'VERA15',
      valueType: 'percent',
      value: 15,
      appliesTo: ALL_LINES,
      minimum: { type: 'amount', value: 200 },
      audience: EVERYONE,
      combines: { products: true, order: false, shipping: true },
      startsAt: iso(now, -75),
      endsAt: iso(now, -25),
      status: 'active',
      uses: 0,
      createdAt: iso(now, -76),
      tags: ['vera'],
    },
    {
      id: 'd-vip50',
      title: 'Klientë VIP — 50 € mbi 600 €',
      publicTitle: T('VIP popust 50 €', 'Zbritje VIP 50 €', 'VIP €50 off'),
      kind: 'order',
      method: 'code',
      code: 'VIP50',
      valueType: 'fixed',
      value: 50,
      appliesTo: ALL_LINES,
      minimum: { type: 'amount', value: 600 },
      audience: { type: 'segment', segmentId: 'seg-vip' },
      combines: { products: true, order: false, shipping: true },
      oncePerCustomer: true,
      startsAt: iso(now, 0),
      status: 'draft',
      uses: 0,
      createdAt: iso(now, -1),
      tags: ['vip'],
    },
  ];
}

/** Recount uses from the generated orders (cancelled orders excluded). */
export function countDiscountUses(discounts: Discount[], orders: Order[]): Discount[] {
  const uses = new Map<string, number>();
  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    for (const a of o.discounts ?? []) uses.set(a.id, (uses.get(a.id) ?? 0) + 1);
  }
  return discounts.map((d) => ({ ...d, uses: uses.get(d.id) ?? 0 }));
}

/* ================================================================== */
/* Offers — campaign centre (active / active / active / draft / scheduled) */
/* ================================================================== */
const ZERO = { visits: 0, ctaClicks: 0, codeUses: 0, orders: 0, revenue: 0, discountTotal: 0 };
const UTM = (medium: string, campaign: string) => `utm_source=optikamiftari&utm_medium=${medium}&utm_campaign=${campaign}`;

export function buildOffers(now: Date, discounts: Discount[], orders: Order[]): Offer[] {
  const d = (id: string) => discounts.find((x) => x.id === id)!;
  const metrics = (discountId: string, visitsPerOrder: number, baseVisits: number) => {
    const list = orders.filter((o) => o.status !== 'cancelled' && o.discounts?.some((a) => a.id === discountId));
    const discountTotal = round2(list.reduce((s, o) => s + (o.discounts?.find((a) => a.id === discountId)?.amount ?? 0), 0));
    const visits = baseVisits + list.length * visitsPerOrder;
    return {
      visits,
      ctaClicks: Math.round(visits * 0.17),
      codeUses: list.filter((o) => o.discounts?.some((a) => a.id === discountId && a.code)).length,
      orders: list.length,
      revenue: round2(list.reduce((s, o) => s + o.total, 0)),
      discountTotal,
    };
  };
  return [
    {
      id: 'of-dielli',
      slug: 'fund-sezoni-syze-dielli',
      name: T('Kraj sezone — naočare za sunce', 'Fund sezoni — syze dielli', 'End of season — sunglasses'),
      description: T(
        'Automatski −20% na sve naočare za sunce do kraja sezone. Prikazuje se u banneru kataloga, traci obaveštenja i promo bloku početne.',
        'Automatikisht −20% për të gjitha syzet e diellit deri në fund të sezonit. Shfaqet në banerin e katalogut, shiritin e njoftimeve dhe bllokun promo të ballinës.',
        'Automatic −20% on every pair of sunglasses until the end of the season. Shown in the catalogue banner, announcement bar and homepage promo block.',
      ),
      status: 'active',
      startsAt: d('d-dielli20').startsAt,
      endsAt: d('d-dielli20').endsAt,
      discountId: 'd-dielli20',
      collectionId: 'col-dielli-fund-sezoni',
      productIds: [],
      badge: T('Kraj sezone −20%', 'Fund sezoni −20%', 'End of season −20%'),
      image: '/images/misc/sun-collection.webp',
      landing: {
        title: T('Sunce traje duže od *leta*', 'Dielli zgjat më shumë se *vera*', 'The sun outlasts the *summer*'),
        text: T(
          'Do kraja sezone sve naočare za sunce su 20% jeftinije — popust vidite odmah u korpi, bez koda. Većinu modela izrađujemo i sa vašom dioptrijom.',
          'Deri në fund të sezonit të gjitha syzet e diellit janë 20% më lirë — zbritjen e shihni menjëherë në shportë, pa kod. Shumicën e modeleve i punojmë edhe me dioptrinë tuaj.',
          'Until the season ends, every pair of sunglasses is 20% off — you see the discount straight away in the cart, no code needed. Most models can be made to your prescription.',
        ),
      },
      placements: ['banner', 'announcement', 'home-block'],
      owner: 'st-drita',
      utm: UTM('banner', 'fund-sezoni-dielli'),
      metrics: metrics('d-dielli20', 38, 260),
      createdAt: iso(now, -10),
    },
    {
      id: 'of-mireseardhja',
      slug: 'mireseardhje-miftari10',
      name: T('Dobrodošlica — MIFTARI10', 'Mirëseardhje — MIFTARI10', 'Welcome — MIFTARI10'),
      description: T(
        'Kod MIFTARI10 daje 10% na narudžbe od 100 € (posle popusta na proizvode). Kombinuje se sa popustima na proizvode i dostavu.',
        'Kodi MIFTARI10 jep 10% për porosi nga 100 € (pas zbritjeve të produkteve). Kombinohet me zbritjet e produkteve dhe të transportit.',
        'Code MIFTARI10 gives 10% on orders from €100 (after product discounts). Combines with product and delivery discounts.',
      ),
      status: 'active',
      startsAt: d('d-miftari10').startsAt,
      discountId: 'd-miftari10',
      productIds: [],
      badge: T('−10% uz MIFTARI10', '−10% me MIFTARI10', '−10% with MIFTARI10'),
      image: '/images/misc/about.webp',
      landing: {
        title: T('Dobro došli u *ITCOM*', 'Mirë se vini te *ITCOM*', 'Welcome to *ITCOM*'),
        text: T(
          'Za prvu kupovinu unesite kod MIFTARI10 u korpi i ostvarite 10% popusta na narudžbe od 100 €. Pregled vida uz kupovinu okvira je besplatan.',
          'Për blerjen e parë shkruani kodin MIFTARI10 në shportë dhe përfitoni 10% zbritje për porosi nga 100 €. Kontrolli i syve me blerjen e kornizës është falas.',
          'For your first purchase enter code MIFTARI10 in the cart and get 10% off orders from €100. The eye exam is free when you buy a frame.',
        ),
      },
      placements: ['banner', 'home-block'],
      owner: 'st-drita',
      utm: UTM('landing', 'mireseardhje'),
      metrics: metrics('d-miftari10', 46, 900),
      createdAt: iso(now, -120),
    },
    {
      id: 'of-korniza-lente',
      slug: 'kornize-plus-lente',
      name: T('Okvir + sočiva −50%', 'Kornizë + lente −50%', 'Frame + lenses −50%'),
      description: T(
        'Uz svaki optički okvir jednožižna sočiva sa antirefleksom su upola cene. Popust se obračunava automatski kada su oba u korpi.',
        'Me çdo kornizë optike lentet njëvizore me antirefleks kushtojnë gjysmë çmimi. Zbritja llogaritet automatikisht kur të dyja janë në shportë.',
        'With every optical frame, single-vision anti-reflective lenses are half price. Applied automatically when both are in the cart.',
      ),
      status: 'active',
      startsAt: d('d-korniza-lente').startsAt,
      discountId: 'd-korniza-lente',
      productIds: [...OPTICAL, 'p-lens-single'],
      badge: T('Sočiva −50%', 'Lentet −50%', 'Lenses −50%'),
      image: '/images/lookbook/atelier-optical.webp',
      landing: {
        title: T('Okvir po vašem ukusu, sočiva *upola cene*', 'Korniza sipas shijes suaj, lentet *gjysmë çmimi*', 'The frame you love, lenses at *half price*'),
        text: T(
          'Izaberite optički okvir i dodajte jednožižna sočiva — izrađujemo ih u našoj laboratoriji za 2–4 radna dana, a pregled vida je besplatan.',
          'Zgjidhni një kornizë optike dhe shtoni lentet njëvizore — i punojmë në laboratorin tonë për 2–4 ditë pune, ndërsa kontrolli i syve është falas.',
          'Choose an optical frame and add single-vision lenses — we make them in our lab in 2–4 working days, and the eye exam is free.',
        ),
      },
      placements: ['home-block'],
      owner: 'st-arta',
      utm: UTM('home', 'kornize-lente'),
      metrics: metrics('d-korniza-lente', 30, 180),
      createdAt: iso(now, -31),
    },
    {
      id: 'of-kontrolli',
      slug: 'muaji-i-kontrollit',
      name: T('Mesec pregleda vida', 'Muaji i kontrollit të syve', 'Eye-exam month'),
      description: T(
        'Editorijalna kampanja bez popusta: podsetnik za godišnji pregled vida, slajd na početnoj i blok sa zakazivanjem termina.',
        'Fushatë editoriale pa zbritje: kujtesë për kontrollin vjetor të syve, slide në ballinë dhe bllok për rezervimin e terminit.',
        'Editorial campaign without a discount: a reminder for the yearly eye exam, a homepage slide and a booking block.',
      ),
      status: 'draft',
      startsAt: iso(now, 22),
      endsAt: iso(now, 52),
      productIds: OPTICAL, // the exam is free with any optical frame
      badge: T('Pregled vida', 'Kontroll i syve', 'Eye exam'),
      image: '/images/s/kontrolli.webp',
      landing: {
        title: T('Jednom godišnje — *za jasan pogled*', 'Një herë në vit — *për shikim të qartë*', 'Once a year — *for clear sight*'),
        text: T(
          'Pregled vida traje 30 minuta i besplatan je uz kupovinu okvira. Zakažite termin online ili na +383 43 777 667.',
          'Kontrolli i syve zgjat 30 minuta dhe është falas me blerjen e kornizës. Rezervoni terminin online ose në +383 43 777 667.',
          'The eye exam takes 30 minutes and is free when you buy a frame. Book online or call +383 43 777 667.',
        ),
      },
      placements: ['hero', 'home-block'],
      owner: 'st-gent',
      utm: UTM('hero', 'muaji-i-kontrollit'),
      metrics: { ...ZERO },
      createdAt: iso(now, -1),
    },
    {
      id: 'of-blackfriday',
      slug: 'black-friday-syze-optike',
      name: T('Black Friday — optički okviri −25%', 'Black Friday — korniza optike −25%', 'Black Friday — optical frames −25%'),
      description: T(
        'Planirano: sedam dana −25% na sve optičke okvire. Slajd i traka se uključuju sami sa početkom akcije.',
        'E planifikuar: shtatë ditë −25% për të gjitha kornizat optike. Slide-i dhe shiriti aktivizohen vetë me fillimin e ofertës.',
        'Scheduled: seven days of −25% on all optical frames. The slide and bar switch on by themselves when the sale starts.',
      ),
      status: 'active',
      startsAt: d('d-bf-optike').startsAt,
      endsAt: d('d-bf-optike').endsAt,
      discountId: 'd-bf-optike',
      productIds: OPTICAL,
      badge: T('Black Friday −25%', 'Black Friday −25%', 'Black Friday −25%'),
      image: '/images/lookbook/optical-portrait.webp',
      landing: {
        title: T('Black Friday: *optički okviri −25%*', 'Black Friday: *korniza optike −25%*', 'Black Friday: *optical frames −25%*'),
        text: T(
          'Sedam dana, besplatan pregled vida i sočiva iz naše laboratorije za 2–7 radnih dana.',
          'Shtatë ditë, kontroll falas i syve dhe lente nga laboratori ynë për 2–7 ditë pune.',
          'Seven days, a free eye exam and lenses from our own lab in 2–7 working days.',
        ),
      },
      placements: ['hero', 'announcement'],
      owner: 'st-drita',
      utm: UTM('hero', 'black-friday-optike'),
      metrics: { ...ZERO },
      createdAt: iso(now, -2),
    },
  ];
}

/* ================================================================== */
/* Placements — hero slides, catalogue banners, announcement bar       */
/* ================================================================== */
const plain = (s: string) => s.replace(/\*/g, '').trim();

/** Alt text for the bundled hero photographs (fallback: the slide title). */
const HERO_ALT: Record<string, L10n> = {
  '/images/hero/optical.webp': T(
    'Žena sa naočarima boje kornjačevine na tamnoj pozadini',
    'Grua me syze në ngjyrë breshke, në sfond të errët',
    'Woman wearing tortoiseshell glasses against a dark background',
  ),
  '/images/hero/sun.webp': T(
    'Muškarac sa crnim naočarima za sunce na sunčanoj kamenoj terasi',
    'Burrë me syze dielli të zeza në një tarracë guri me diell',
    'Man in black sunglasses on a sunny stone terrace',
  ),
  '/images/hero/exam.webp': T('Pregled vida na biomikroskopu', 'Kontroll i syve me biomikroskop', 'Eye examination at the slit lamp'),
  '/images/hero/family.webp': T(
    'Dve generacije žena sa naočarima u toploj svetlosti',
    'Dy breza grash me syze, në dritë të ngrohtë',
    'Two generations of women wearing glasses in warm light',
  ),
};

export function buildPlacements(home: HomeSection[]): Placement[] {
  const hero = home.find((h) => h.type === 'hero');
  const slides = hero && hero.type === 'hero' ? hero.data.slides : [];
  const base = { textAlign: 'left' as const, status: 'active' as const };
  const fromHero: Placement[] = slides.map((s, i) => ({
    ...base,
    id: `pl-${s.id}`,
    kind: 'slide',
    position: 'home-hero',
    name: `Hero — ${plain(s.eyebrow.sq) || plain(s.title.sq) || i + 1}`,
    eyebrow: s.eyebrow,
    title: s.title,
    subtitle: s.subtitle,
    cta: s.primary,
    secondary: s.secondary,
    image: s.image,
    alt: HERO_ALT[s.image] ?? T(plain(s.title.me), plain(s.title.sq), plain(s.title.en)),
    overlay: 35,
    order: i + 1,
  }));
  const ann = (id: string, order: number, title: L10n, offerId?: string, href = ''): Placement => ({
    ...base,
    id,
    kind: 'announcement',
    position: 'bar',
    name: `Shiriti — ${title.sq.slice(0, 36)}`,
    eyebrow: E(),
    title,
    subtitle: E(),
    cta: { label: E(), href },
    image: '',
    alt: E(),
    overlay: 0,
    order,
    ...(offerId ? { offerId } : {}),
  });
  const n = fromHero.length;
  return [
    ...fromHero,
    {
      ...base,
      id: 'pl-s-bf',
      kind: 'slide',
      position: 'home-hero',
      name: 'Hero — Black Friday korniza optike',
      eyebrow: T('Black Friday', 'Black Friday', 'Black Friday'),
      title: T('Optički okviri *−25%*.', 'Korniza optike *−25%*.', 'Optical frames *−25%*.'),
      subtitle: T(
        'Titan, acetat i karbon — uz besplatan pregled vida i sočiva iz naše laboratorije. Samo sedam dana.',
        'Titan, acetat dhe karbon — me kontroll falas të syve dhe lente nga laboratori ynë. Vetëm shtatë ditë.',
        'Titanium, acetate and carbon — with a free eye exam and lenses from our own lab. Seven days only.',
      ),
      cta: { label: T('Pogledajte okvire', 'Shikoni kornizat', 'Shop frames'), href: '/produktet/syze-optike' },
      secondary: { label: T('Zakažite pregled', 'Rezervo kontrollin', 'Book an eye exam'), href: '/#rezervo' },
      image: '/images/lookbook/optical-portrait.webp',
      alt: T('Portret sa optičkim naočarima', 'Portret me syze optike', 'Portrait wearing optical glasses'),
      overlay: 45,
      offerId: 'of-blackfriday',
      order: n + 1,
    },
    {
      ...base,
      id: 'pl-s-kontrolli',
      kind: 'slide',
      position: 'home-hero',
      status: 'draft',
      name: 'Hero — Muaji i kontrollit (draft)',
      eyebrow: T('Mesec pregleda vida', 'Muaji i kontrollit', 'Eye-exam month'),
      title: T('Jednom godišnje, *za jasan pogled*.', 'Një herë në vit, *për shikim të qartë*.', 'Once a year, *for clear sight*.'),
      subtitle: T(
        'Pregled vida od 30 minuta kod našeg optometriste — besplatan uz kupovinu okvira.',
        'Kontroll i syve 30 minuta te optometristi ynë — falas me blerjen e kornizës.',
        'A 30-minute eye exam with our optometrist — free when you buy a frame.',
      ),
      cta: { label: T('Zakažite pregled', 'Rezervo kontrollin', 'Book an eye exam'), href: '/#rezervo' },
      image: '/images/s/kontrolli.webp',
      alt: T('Optometrista tokom pregleda vida', 'Optometristi gjatë kontrollit të syve', 'Optometrist during an eye exam'),
      textAlign: 'center',
      overlay: 40,
      offerId: 'of-kontrolli',
      order: n + 2,
    },
    {
      ...base,
      id: 'pl-b1',
      kind: 'banner',
      position: 'catalog',
      name: 'Katalogu — fund sezoni syze dielli',
      eyebrow: T('Kraj sezone', 'Fund sezoni', 'End of season'),
      title: T('Naočare za sunce *−20%*', 'Syze dielli *−20%*', 'Sunglasses *−20%*'),
      subtitle: T('Popust se obračunava automatski u korpi — bez koda.', 'Zbritja llogaritet automatikisht në shportë — pa kod.', 'The discount is applied automatically in the cart — no code needed.'),
      cta: { label: T('Pogledajte naočare', 'Shikoni syzet', 'Shop sunglasses'), href: '/produktet/syze-dielli' },
      image: '/images/misc/sun-collection.webp',
      alt: T('Šest modela naočara za sunce', 'Gjashtë modele syzesh dielli', 'Six pairs of sunglasses'),
      overlay: 30,
      offerId: 'of-dielli',
      order: 1,
    },
    {
      ...base,
      id: 'pl-b2',
      kind: 'banner',
      position: 'catalog',
      name: 'Katalogu — mirëseardhje MIFTARI10',
      eyebrow: T('Za prvu kupovinu', 'Për blerjen e parë', 'For your first order'),
      title: T('−10% uz kod *MIFTARI10*', '−10% me kodin *MIFTARI10*', '−10% with code *MIFTARI10*'),
      subtitle: T('Za narudžbe od 100 € — kombinuje se sa besplatnom dostavom.', 'Për porosi nga 100 € — kombinohet me transportin falas.', 'On orders from €100 — combines with free delivery.'),
      cta: { label: T('Kupujte sada', 'Blini tani', 'Shop now'), href: '/produktet' },
      image: '/images/misc/about.webp',
      alt: T('ITCOM u Mitrovici', 'ITCOM në Mitrovicë', 'ITCOM in Mitrovica'),
      overlay: 40,
      offerId: 'of-mireseardhja',
      order: 2,
    },
    ann('pl-a1', 1, T('Pregled vida po terminu — zakažite online', 'Kontroll i syve me termin — rezervoni online', 'Eye exams by appointment — book online'), undefined, '/#rezervo'),
    ann('pl-a2', 2, T('Besplatna dostava širom Kosova za narudžbe preko 150 €', 'Transport falas në gjithë Kosovën për porosi mbi 150 €', 'Free delivery across Kosovo on orders over €150'), undefined, '/produktet'),
    ann('pl-a3', 3, T('Kraj sezone: naočare za sunce −20%, automatski u korpi', 'Fund sezoni: syze dielli −20%, automatikisht në shportë', 'End of season: sunglasses −20%, applied in the cart'), 'of-dielli', '/produktet/syze-dielli'),
    ann('pl-a4', 4, T('Black Friday: optički okviri −25% — samo sedam dana', 'Black Friday: korniza optike −25% — vetëm shtatë ditë', 'Black Friday: optical frames −25% — seven days only'), 'of-blackfriday', '/produktet/syze-optike'),
  ];
}

/* ================================================================== */
/* Staff, services, bookings                                           */
/* ================================================================== */
export const STAFF: Staff[] = [
  { id: 'st-gent', name: 'Gent Berisha', email: 'gent@itcom.example', role: 'owner', color: '#776440', active: true, phone: '+383 44 120 456', title: T('Optometrista · rukovodilac optike', 'Optometrist · drejtues i optikës', 'Optometrist · store lead') },
  { id: 'st-arta', name: 'Arta Krasniqi', email: 'arta@itcom.example', role: 'manager', color: '#7a5c3e', active: true, phone: '+383 44 210 334', title: T('Optičarka · menadžerka prodaje', 'Optike · menaxhere e shitjes', 'Optician · sales manager') },
  { id: 'st-milica', name: 'Milica Jovanović', email: 'info@itcom.example', role: 'reception', color: '#4f6d7a', active: true, phone: '+383 43 777 667', title: T('Optičarka · prijem klijenata', 'Optike · pritja e klientëve', 'Optician · front desk') },
  { id: 'st-blerim', name: 'Blerim Gashi', email: 'lab@itcom.example', role: 'orders', color: '#5b6b3a', active: true, phone: '+383 49 330 118', title: T('Tehničar laboratorije — Optical Lab', 'Teknik laboratori — Optical Lab', 'Lab technician — Optical Lab') },
  { id: 'st-vjosa', name: 'Vjosa Kelmendi', email: 'klinika@itcom.example', role: 'reception', color: '#8a4f5a', active: true, phone: '+383 45 602 210', title: T('Dr. med. · oftalmolog, Klinika Miftari', 'Dr. med. · oftalmologe, Klinika Miftari', 'MD · ophthalmologist, Klinika Miftari') },
  { id: 'st-drita', name: 'Drita Hoxha', email: 'drita@itcom.example', role: 'marketing', color: '#b5651d', active: true, title: T('Marketing i društvene mreže', 'Marketing dhe rrjete sociale', 'Marketing & social media') },
];

export const SERVICES: Service[] = [
  {
    id: 'sv-kontrolli',
    name: T('Pregled vida', 'Kontroll i syve', 'Eye exam'),
    description: T(
      'Oštrina vida, refrakcija i novi recept kod optometriste. 15 € — besplatno uz kupovinu okvira.',
      'Mprehtësia e shikimit, refraksioni dhe recetë e re te optometristi. 15 € — falas me blerjen e kornizës.',
      'Visual acuity, refraction and a new prescription with our optometrist. €15 — free when you buy a frame.',
    ),
    durationMin: 30,
    capacity: 2,
    price: 15,
    color: '#776440',
    staffIds: ['st-gent', 'st-arta'],
    location: 'loc-mitrovice',
  },
  {
    id: 'sv-pershtatja',
    name: T('Prilagođavanje okvira i PD', 'Përshtatje & matje PD', 'Frame fitting & PD'),
    description: T(
      'Merenje pupilarne distance i visine montaže, podešavanje okvira na licu. Besplatno.',
      'Matja e distancës pupilare dhe e lartësisë së montimit, rregullimi i kornizës në fytyrë. Falas.',
      'Pupillary distance and fitting height measured, frame adjusted to your face. Free.',
    ),
    durationMin: 15,
    capacity: 2,
    price: 0,
    color: '#7a5c3e',
    staffIds: ['st-arta', 'st-milica', 'st-blerim'],
    location: 'loc-mitrovice',
  },
  {
    id: 'sv-lente-kontakti',
    name: T('Kontaktna sočiva', 'Lente kontakti', 'Contact lens fitting'),
    description: T(
      'Merenje rožnjače, probna sočiva i obuka za stavljanje i negu. Kontrola posle 7 dana uključena.',
      'Matja e kornesë, lente prove dhe udhëzime për vendosjen dhe kujdesin. Kontrolli pas 7 ditësh i përfshirë.',
      'Corneal measurements, trial lenses and a lesson in insertion and care. Follow-up after 7 days included.',
    ),
    durationMin: 45,
    capacity: 1,
    price: 20,
    color: '#4f6d7a',
    staffIds: ['st-gent'],
    location: 'loc-mitrovice',
  },
  {
    id: 'sv-femije',
    name: T('Pregled vida za decu', 'Kontroll i syve për fëmijë', 'Children’s eye exam'),
    description: T(
      'Prilagođen pregled za decu od 4 godine — vid na daljinu i blizinu, binokularni vid i boje.',
      'Kontroll i përshtatur për fëmijë nga 4 vjeç — shikimi për larg e afër, shikimi binokular dhe ngjyrat.',
      'A child-friendly exam from age 4 — distance and near vision, binocular vision and colour.',
    ),
    durationMin: 30,
    capacity: 1,
    price: 10,
    color: '#6b8f71',
    staffIds: ['st-gent'],
    location: 'loc-mitrovice',
  },
  {
    id: 'sv-klinika',
    name: T('Oftalmološki pregled — Klinika Miftari', 'Konsultë oftalmologjike — Klinika Miftari', 'Ophthalmology consultation — Klinika Miftari'),
    description: T(
      'Pregled kod oftalmologa: očni pritisak, očno dno, katarakta i praćenje dijabetesa.',
      'Vizitë te oftalmologu: presioni i syrit, fundusi, katarakti dhe ndjekja e diabetit.',
      'A visit with our ophthalmologist: eye pressure, retina, cataract and diabetic eye checks.',
    ),
    durationMin: 30,
    capacity: 1,
    price: 30,
    color: '#8a4f5a',
    staffIds: ['st-vjosa'],
    location: 'loc-klinika',
  },
  {
    id: 'sv-marrja',
    name: T('Preuzimanje, popravka i podešavanje naočara', 'Marrja, riparimi & rregullimi i syzeve', 'Glasses pickup, repair & adjustment'),
    description: T(
      'Predaja gotovih naočara uz proveru na fokometru, sitne popravke (šrafovi, jastučići) i podešavanje drški. Besplatno.',
      'Dorëzimi i syzeve të gatshme me kontroll në fokometër, riparime të vogla (vida, jastëkë) dhe rregullimi i bishtave. Falas.',
      'Handover of finished glasses with a lensmeter check, small repairs (screws, nose pads) and temple adjustment. Free.',
    ),
    durationMin: 15,
    capacity: 2,
    price: 0,
    color: '#5b6b3a',
    staffIds: ['st-milica', 'st-arta', 'st-blerim'],
    location: 'loc-mitrovice',
  },
  {
    id: 'sv-smart',
    name: T('Proba pametnih naočara', 'Provë e syzeve inteligjente', 'Smart glasses try-on'),
    description: T(
      'Probajte pametne naočare u optici: oblik i veličina, povezivanje sa telefonom i pitanja o dioptrijskim sočivima. Oko 20–30 minuta, besplatno.',
      'Provoni syzet inteligjente në optikë: forma dhe madhësia, lidhja me telefonin dhe pyetjet për lentet me dioptri. Rreth 20–30 minuta, falas.',
      'Try smart glasses in store: shape and size, pairing with your phone and questions about prescription lenses. About 20–30 minutes, free.',
    ),
    durationMin: 30,
    capacity: 1,
    price: 0,
    color: '#3f6b57',
    staffIds: ['st-arta', 'st-milica'],
    location: 'loc-mitrovice',
  },
];

/** The appointment service a scheduled inquiry is booked into. */
const SERVICE_FOR_INQUIRY: [RegExp, string][] = [
  [/inteligjent|smart|pametn/i, 'sv-smart'],
  [/klinik/i, 'sv-klinika'],
  [/kontakt|contact/i, 'sv-lente-kontakti'],
  [/pd|përshtat|fitting|prilago/i, 'sv-pershtatja'],
  [/riparim|rregullim|repair|adjust|popravk/i, 'sv-marrja'],
];

const BOOKING_PEOPLE: [string, string, string][] = [
  ['Blerina Hoxha', '+383 44 218 905', 'Mitrovicë'],
  ['Drilon Shala', '+383 49 330 712', 'Vushtrri'],
  ['Erza Kastrati', '+383 45 604 118', 'Mitrovicë'],
  ['Fjolla Rexhepi', '+383 44 715 260', 'Skenderaj'],
  ['Ilir Bytyqi', '+383 43 902 447', 'Mitrovicë'],
  ['Jeta Hasani', '+383 48 115 380', 'Prishtinë'],
  ['Kaltrina Zeka', '+383 44 663 019', 'Mitrovicë'],
  ['Labinot Ahmeti', '+383 49 287 554', 'Vushtrri'],
  ['Majlinda Mustafa', '+383 45 430 826', 'Mitrovicë'],
  ['Rinor Gashi', '+383 44 856 302', 'Drenas'],
  ['Shpresa Krasniqi', '+383 43 540 671', 'Mitrovicë'],
  ['Valon Berisha', '+383 49 128 935', 'Skenderaj'],
  ['Dragana Petrović', '+383 45 771 204', 'Mitrovicë'],
  ['Agon Kelmendi', '+383 44 309 786', 'Podujevë'],
  ['Dafina Morina', '+383 48 642 157', 'Mitrovicë'],
  ['Leutrim Hoxha', '+383 49 517 043', 'Fushë Kosovë'],
];

/**
 * [day offset from this Monday, hour, minute, service, staff, note] — Mon–Sat, inside opening hours
 * (10:00–19:30, Saturday mornings), no overlaps per staff member.
 */
const SLOTS: [number, number, number, string, string, string][] = [
  [0, 10, 0, 'sv-kontrolli', 'st-gent', 'Kontroll vjetor — syze për larg'],
  [0, 10, 30, 'sv-pershtatja', 'st-arta', 'Matje PD — Prism M2 me lente njëvizore'],
  [0, 14, 0, 'sv-klinika', 'st-vjosa', 'Presion i rritur i syrit — kontroll për glaukomë'],
  [1, 11, 0, 'sv-lente-kontakti', 'st-gent', 'Lente kontakti mujore — përshtatja e parë'],
  [1, 16, 0, 'sv-kontrolli', 'st-arta', 'Dhimbje koke pas punës në kompjuter'],
  [2, 10, 0, 'sv-femije', 'st-gent', 'Kontroll për fëmijë (8 vjeç) — afrohet te tabela'],
  [2, 12, 0, 'sv-marrja', 'st-milica', 'Marrja e syzeve progresive — rregullim i bishtave'],
  [3, 10, 30, 'sv-kontrolli', 'st-gent', 'Recetë e re për lente progresive'],
  [3, 15, 0, 'sv-klinika', 'st-vjosa', 'Kontroll pas operacionit të kataraktit'],
  [4, 11, 0, 'sv-pershtatja', 'st-milica', 'Nova N-04 — matje e lartësisë së montimit'],
  [4, 17, 0, 'sv-kontrolli', 'st-gent', 'Shofer profesional — kontroll për patentë'],
  [5, 10, 0, 'sv-kontrolli', 'st-arta', 'Syze dielli me dioptri — recetë e re'],
  [5, 11, 30, 'sv-marrja', 'st-blerim', 'Vidë e liruar te mentesha — riparim'],
  [7, 10, 0, 'sv-kontrolli', 'st-gent', 'Kontroll i syve — syze të para'],
  [7, 13, 0, 'sv-pershtatja', 'st-arta', 'Origin O-06 — matje PD për progresive'],
  [8, 10, 30, 'sv-kontrolli', 'st-arta', 'Lodhje e syve gjatë vozitjes natën'],
  [8, 14, 0, 'sv-klinika', 'st-vjosa', 'Kontroll i fundusit — diabet tip 2'],
  [9, 11, 0, 'sv-lente-kontakti', 'st-gent', 'Lente kontakti ditore — provë'],
  [9, 16, 0, 'sv-kontrolli', 'st-gent', 'Kontroll vjetor'],
  [10, 12, 0, 'sv-femije', 'st-gent', 'Kontroll për fëmijë (6 vjeç) — para shkollës'],
  [11, 10, 0, 'sv-kontrolli', 'st-arta', 'Recetë e re — syze për lexim'],
  [11, 11, 0, 'sv-marrja', 'st-milica', 'Marrja e syzeve — lente fotokromatike'],
  [12, 10, 30, 'sv-kontrolli', 'st-gent', 'Kontroll i syve — student'],
  [4, 12, 0, 'sv-smart', 'st-arta', 'Provë e Ray-Ban Meta Wayfarer — pyetje për lente me dioptri'],
  [9, 14, 0, 'sv-smart', 'st-milica', 'Syze inteligjente — krahasim Wayfarer / Audio'],
];

function mondayOf(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d;
}

/**
 * Bookings for this and next week. Scheduled inquiries are linked to future bookings of the matching
 * service (eye-exam requests → Kontroll i syve, Klinika → Klinika Miftari, contact lenses, fitting, repairs)
 * and get the same date.
 */
export function buildBookings(now: Date, inquiries: Inquiry[]): { bookings: Booking[]; inquiries: Inquiry[] } {
  const monday = mondayOf(now);
  const bookings: Booking[] = SLOTS.map(([day, h, m, serviceId, staffId, note], i) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + day);
    start.setHours(h, m, 0, 0);
    const service = SERVICES.find((s) => s.id === serviceId)!;
    const end = start.getTime() + service.durationMin * 60000;
    const [customerName, phone, city] = BOOKING_PEOPLE[i % BOOKING_PEOPLE.length];
    const past = end < now.getTime();
    const status: Booking['status'] = past ? (i === 4 ? 'noshow' : i === 6 ? 'cancelled' : 'done') : i === 14 || i === 17 ? 'pending' : 'confirmed';
    return {
      id: `bk-${101 + i}`,
      serviceId,
      staffId,
      customerName,
      phone,
      city,
      start: start.toISOString(),
      durationMin: service.durationMin,
      status,
      note,
      location: service.location ?? 'loc-mitrovice',
      createdAt: new Date(start.getTime() - (3 + (i % 5)) * DAY).toISOString(),
    };
  });

  const out = inquiries.map((q) => ({ ...q }));
  const free = (svc: string) => bookings.filter((b) => b.serviceId === svc && !b.inquiryId && new Date(b.start).getTime() > now.getTime() && b.status !== 'cancelled');
  // B2B lab requests are handled by phone/e-mail (no store appointment); a contact question becomes a try-on visit.
  const serviceFor = (q: Inquiry) => {
    if (q.type === 'quote') return undefined;
    if (q.type !== 'measurement') return 'sv-pershtatja';
    const text = `${q.service ?? ''} ${q.message}`;
    if (/fëmij|djali|vajza|child/i.test(text) && free('sv-femije').length) return 'sv-femije';
    return SERVICE_FOR_INQUIRY.find(([re]) => re.test(q.service ?? ''))?.[1] ?? 'sv-kontrolli';
  };
  for (const q of out.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (q.status !== 'scheduled') continue;
    const svc = serviceFor(q);
    const slot = svc ? (free(svc)[0] ?? (q.type === 'measurement' ? free('sv-kontrolli')[0] : undefined)) : undefined;
    if (!slot) {
      q.status = 'contacted';
      q.scheduledAt = undefined;
      continue;
    }
    slot.inquiryId = q.id;
    slot.customerName = q.name;
    slot.phone = q.phone;
    slot.email = q.email;
    slot.city = q.city;
    slot.status = 'confirmed';
    slot.note = q.message.length > 90 ? `${q.message.slice(0, 88).trimEnd()}…` : q.message;
    q.scheduledAt = slot.start;
  }
  return { bookings, inquiries: out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}

/* ================================================================== */
/* Inquiries — CMS v2 fields + two extra (B2B lab order, delivery question) */
/* ================================================================== */
const SERVICE_TAG: [RegExp, string][] = [
  [/inteligjent|smart|pametn/i, 'smart-glasses'],
  [/klinik/i, 'klinika'],
  [/kontakt|contact/i, 'lente-kontakti'],
  [/pd|përshtat|fitting|prilago/i, 'pershtatje'],
  [/riparim|rregullim|repair|adjust|popravk/i, 'riparim'],
  [/kontroll|exam|pregled/i, 'kontroll-i-syve'],
];

export function enrichInquiries(now: Date, inquiries: Inquiry[]): Inquiry[] {
  const out: Inquiry[] = inquiries.map((q, i) => {
    const serviceTag = q.service ? SERVICE_TAG.find(([re]) => re.test(q.service!))?.[1] ?? 'tjeter' : q.type === 'quote' ? 'optical-lab' : 'pergjithshme';
    const assignee =
      q.status === 'new'
        ? undefined
        : q.type === 'quote'
          ? 'st-arta'
          : q.type === 'measurement'
            ? serviceTag === 'klinika'
              ? 'st-vjosa'
              : i % 2
                ? 'st-gent'
                : 'st-arta'
            : 'st-milica';
    return {
      ...q,
      source: q.type === 'measurement' ? 'measurement' : q.type === 'quote' ? 'quote' : 'web-form',
      assignee,
      tags: [serviceTag, ...(q.type === 'quote' ? ['b2b'] : [])],
    };
  });
  out.push(
    {
      id: 'inq_120',
      createdAt: iso(now, -4, -3),
      type: 'quote',
      name: 'Besnik Morina',
      company: 'Optika Vizioni Sh.p.k.',
      phone: '+383 44 552 301',
      email: 'porosi.vizioni@example.com',
      city: 'Prizren',
      service: 'Optical Lab B2B',
      productId: 'p-lens-progressive',
      message:
        'Kërkojmë ofertë për rreth 40 palë lente progresive 1.60 me antirefleks në muaj, të montuara në kornizat tona, me dërgesë në Prizren dy herë në javë.',
      status: 'contacted',
      seen: true,
      source: 'phone',
      assignee: 'st-arta',
      tags: ['b2b', 'progresive', 'prizren'],
      followUpAt: iso(now, 2),
    },
    {
      id: 'inq_121',
      createdAt: iso(now, 0, -5),
      type: 'contact',
      name: 'Egzon Shala',
      phone: '+383 44 419 207',
      email: 'egzon.shala@example.com',
      city: 'Podujevë',
      message: 'A dërgoni në Podujevë dhe sa ditë zgjat përgatitja e lenteve me recetë? Kornizën e kam tashmë.',
      status: 'new',
      seen: false,
      source: 'web-form',
      tags: ['dergesa', 'lente'],
    },
    {
      id: 'inq_122',
      createdAt: iso(now, -1, -6),
      type: 'contact',
      name: 'Leutrim Krasniqi',
      phone: '+383 49 615 228',
      email: 'leutrim.krasniqi@example.com',
      city: 'Vushtrri',
      service: 'Syze inteligjente',
      productId: 'p-rayban-meta-wayfarer',
      message:
        'Kërkoj disponueshmërinë: Ray-Ban Meta Wayfarer (Gen 3) · Ngjyra e kornizës: E zezë mat · Lentet: Me dioptri nga laboratori ynë.\nMbaj syze −2.50. A mund t’i provoj në optikë të shtunën?',
      status: 'contacted',
      seen: true,
      source: 'web-form',
      assignee: 'st-arta',
      tags: ['smart-glasses'],
      followUpAt: iso(now, 1),
    },
  );
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ================================================================== */
/* Segments                                                            */
/* ================================================================== */
export const SEGMENTS: Segment[] = [
  {
    id: 'seg-vip',
    name: T('VIP klijenti', 'Klientë VIP', 'VIP customers'),
    description: T('Potrošili više od 500 €.', 'Kanë shpenzuar mbi 500 €.', 'Spent more than €500.'),
    match: 'all',
    rules: [{ field: 'spent', op: 'gt', value: '500' }],
  },
  {
    id: 'seg-povratni',
    name: T('Klijenti koji se vraćaju', 'Klientë që kthehen', 'Returning customers'),
    description: T('Više od jedne narudžbe.', 'Më shumë se një porosi.', 'More than one order.'),
    match: 'all',
    rules: [{ field: 'orders', op: 'gt', value: '1' }],
  },
  {
    id: 'seg-mitrovice',
    name: T('Mitrovica i okolina', 'Mitrovicë dhe rrethina', 'Mitrovica area'),
    description: T('Klijenti koji mogu lako da svrate u optiku — za pozive na pregled.', 'Klientë që e kanë optikën afër — për ftesa në kontroll.', 'Customers close to the store — for eye-exam invitations.'),
    match: 'any',
    rules: ['Mitrovicë', 'Vushtrri', 'Skenderaj', 'Zveçan'].map((c) => ({ field: 'city' as const, op: 'eq' as const, value: c })),
  },
  {
    id: 'seg-pasive',
    name: T('Bez narudžbe 60 dana', 'Pa porosi 60 ditë', 'No order in 60 days'),
    description: T(
      'Poslednja narudžba pre više od 60 dana — podsetnik za kontrolu vida i nova sočiva.',
      'Porosia e fundit para më shumë se 60 ditësh — kujtesë për kontroll të syve dhe lente të reja.',
      'Last order more than 60 days ago — a reminder for an eye exam and new lenses.',
    ),
    match: 'all',
    rules: [{ field: 'lastOrderDays', op: 'gt', value: '60' }],
  },
  {
    id: 'seg-b2b',
    name: T('B2B klijenti (optike)', 'Klientë B2B (optika)', 'B2B customers (opticians)'),
    description: T('Optike partneri Optical Lab — narudžbe sa firmom i NUI brojem.', 'Optika partnere të Optical Lab — porosi me emër biznesi dhe NUI.', 'Optical Lab partner opticians — orders with a company name and business number.'),
    match: 'all',
    rules: [{ field: 'tag', op: 'eq', value: 'b2b' }],
  },
  {
    id: 'seg-en',
    name: T('Klijenti na engleskom', 'Anglisht-folës', 'English-speaking customers'),
    description: T('Naručivali na engleskom — dijaspora i posetioci.', 'Kanë porositur në anglisht — diaspora dhe vizitorë.', 'Ordered in English — diaspora and visitors.'),
    match: 'all',
    rules: [{ field: 'lang', op: 'eq', value: 'en' }],
  },
];

/* ================================================================== */
/* Purchasing & inventory movements                                    */
/* ================================================================== */
export function buildPurchaseOrders(now: Date): PurchaseOrder[] {
  return [
    {
      id: 'po-014',
      number: 'PO-2026-014',
      supplier: 'Acetati Italia Srl',
      location: 'loc-mitrovice',
      status: 'partial',
      lines: [
        { productId: 'p-solstice-s7', ordered: 12, received: 12, rejected: 0, cost: 108 },
        { productId: 'p-lumen-l11', ordered: 10, received: 6, rejected: 0, cost: 119 },
        { productId: 'p-nera-n10', ordered: 12, received: 10, rejected: 2, cost: 114 },
      ],
      reference: 'AI-2026/4471',
      note: 'Lumen L11 në ngjyrën Rubin vjen me dërgesën e dytë. 2 copë Nera N10 të refuzuara — gërvishtje në lente.',
      expectedAt: iso(now, 3),
      createdAt: iso(now, -12),
    },
    {
      id: 'po-015',
      number: 'PO-2026-015',
      supplier: 'Titan Optics Co.',
      location: 'loc-mitrovice',
      status: 'sent',
      lines: [
        { productId: 'p-prism-m2', ordered: 20, received: 0, rejected: 0, cost: 151 },
        { productId: 'p-nova-n04', ordered: 12, received: 0, rejected: 0, cost: 172 },
        { productId: 'p-meridian-m9', ordered: 10, received: 0, rejected: 0, cost: 143 },
      ],
      reference: 'TOC-88213',
      note: 'Për Black Friday — kornizat optike. Konfirmoni ngjyrat Olive dhe Champagne para nisjes.',
      expectedAt: iso(now, 9),
      createdAt: iso(now, -3),
    },
    {
      id: 'po-016',
      number: 'PO-2026-016',
      supplier: 'Lens Blank Supply GmbH',
      location: 'loc-lab',
      status: 'draft',
      lines: [
        { productId: 'p-lens-single', ordered: 120, received: 0, rejected: 0, cost: 14 },
        { productId: 'p-lens-progressive', ordered: 40, received: 0, rejected: 0, cost: 38 },
        { productId: 'p-lens-photochromic', ordered: 30, received: 0, rejected: 0, cost: 29 },
      ],
      reference: 'LBS-Q4-2026',
      note: 'Gjysmëfabrikate (blanks) për Optical Lab — porosia mujore, edhe për partnerët B2B. Pret miratimin e Gentit.',
      expectedAt: iso(now, 14),
      createdAt: iso(now, -1),
    },
  ];
}

export function buildMovements(now: Date, orders: Order[], returns: ReturnRequest[]): InventoryMovement[] {
  const mv = (id: string, productId: string, delta: number, reason: InventoryMovement['reason'], days: number, by: string, note?: string, ref?: string): InventoryMovement => ({
    id,
    productId,
    delta,
    reason,
    at: iso(now, days),
    by,
    ...(note ? { note } : {}),
    ...(ref ? { ref } : {}),
  });
  const list: InventoryMovement[] = [
    mv('mv-1', 'p-eclipse-e05', -1, 'damaged', -2, 'st-blerim', 'Lente e gërvishtur në vitrinë — hiqet nga shitja'),
    mv('mv-2', 'p-vortex-x1', -1, 'damaged', -4, 'st-blerim', 'Mentesha e lirë te copa e ekspozimit — kthehet te furnitori'),
    mv('mv-3', 'p-solstice-s7', 12, 'received', -5, 'st-arta', 'Acetati Italia Srl', 'PO-2026-014'),
    mv('mv-4', 'p-lumen-l11', 6, 'received', -5, 'st-arta', 'Acetati Italia Srl — pjesa e parë', 'PO-2026-014'),
    mv('mv-5', 'p-nera-n10', 10, 'received', -5, 'st-arta', 'Acetati Italia Srl — 2 copë të refuzuara', 'PO-2026-014'),
    mv('mv-6', 'p-origin-o06', -2, 'count', -7, 'st-arta', 'Inventari — diferencë në vitrinë'),
    mv('mv-7', 'p-riviera-r8', 1, 'count', -7, 'st-arta', 'Inventari — gjetur 1 copë në depo'),
    mv('mv-9', 'p-arc-v3', -1, 'correction', -11, 'st-gent', 'Copë demonstruese për vitrinën e syzeve sportive'),
  ];
  // restocked returns
  for (const r of returns) {
    if (!r.restocked) continue;
    const rec = r.timeline.find((t) => t.status === 'received');
    for (const l of r.lines) list.push({ id: `mv-${r.id}-${l.productId}`, productId: l.productId, delta: l.qty, reason: 'return', at: rec?.at ?? r.createdAt, by: rec?.by ?? 'st-blerim', note: 'Kthyer pa dëmtime — korniza në stok', ref: r.number });
  }
  // the most recent web orders as 'sale' movements
  let n = 10;
  for (const o of orders.slice(0, 6)) {
    for (const l of o.items) {
      if (!l.productId) continue;
      const days = (new Date(o.createdAt).getTime() - now.getTime()) / DAY;
      list.push({ id: `mv-${n++}`, productId: l.productId, delta: -l.qty, reason: 'sale', at: iso(now, days), by: 'web', ref: o.number });
    }
  }
  return list.sort((a, b) => b.at.localeCompare(a.at));
}

/* ================================================================== */
/* Draft orders, returns, quotes                                       */
/* ================================================================== */
export function buildDrafts(now: Date, products: Product[]): DraftOrder[] {
  const opts = (id: string, over: Record<string, string> = {}) => {
    const p = products.find((x) => x.id === id);
    return { ...(p ? defaultOptions(p) : {}), ...over };
  };
  const key = (id: string, o: Record<string, string>, inst: boolean) =>
    `${id}|${Object.keys(o)
      .sort()
      .map((k) => `${k}=${o[k]}`)
      .join('&')}|${inst ? 'i' : ''}`;
  const origin = opts('p-origin-o06', { color: 'navy', lenses: 'progressive' });
  const nova = opts('p-nova-n04', { color: 'champagne', lenses: 'screen' });
  const single = opts('p-lens-single', { index: '160' });
  const screen = opts('p-lens-screen', { index: '160' });
  return [
    {
      id: 'dr-1001',
      number: 'D-1001',
      createdAt: iso(now, -1, -2),
      customer: { firstName: 'Valon', lastName: 'Bytyqi', email: 'valon.bytyqi@example.com', phone: '+383 44 412 778', city: 'Mitrovicë', address: 'Rruga Bislim Bajgora 14' },
      items: [
        { key: key('p-origin-o06', origin, true), productId: 'p-origin-o06', qty: 1, options: origin, installation: true },
        { key: key('p-nova-n04', nova, true), productId: 'p-nova-n04', qty: 1, options: nova, installation: true },
      ],
      customLines: [{ title: 'Kuti lëkure me gravurë inicialesh', price: 12, qty: 2 }],
      discountCodes: ['MIFTARI10'],
      delivery: 'pickup',
      payment: 'card',
      note: 'Porositur pas kontrollit të syve për çiftin. Recetat janë në kartelën e klientit; marrja dhe përshtatja të shtunën paradite.',
      tags: ['familje', 'progresive'],
      status: 'open',
      createdBy: 'st-arta',
      lang: 'sq',
    },
    {
      id: 'dr-1002',
      number: 'D-1002',
      createdAt: iso(now, -4, -1),
      customer: { firstName: 'Liridon', lastName: 'Rexhepi', company: 'Optik Studio Sh.p.k.', pib: '811204563', email: 'lab.optikstudio@example.com', phone: '+383 49 220 517', city: 'Ferizaj', address: 'Rruga Adem Jashari 41' },
      items: [
        { key: key('p-lens-single', single, false), productId: 'p-lens-single', qty: 10, options: single, installation: false },
        { key: key('p-lens-screen', screen, false), productId: 'p-lens-screen', qty: 6, options: screen, installation: false },
      ],
      customLines: [{ title: 'Montim në kornizat e klientit + kontroll në fokometër', price: 6, qty: 16 }],
      discountCodes: [],
      delivery: 'delivery',
      payment: 'bank',
      note: 'Fatura proforma u dërgua me e-mail. Lentet përgatiten pas marrjes së recetave të skanuara dhe kornizave me korrier.',
      tags: ['b2b', 'optical-lab'],
      status: 'invoice_sent',
      createdBy: 'st-gent',
      lang: 'sq',
    },
  ];
}

/** Lens choices made to a prescription — such lines are custom work and cannot go back into stock. */
const CUSTOM_LENSES = /njëvizore|progresive|për ekran|me dioptri|single vision|progressive|screen|with prescription|jednožižna|progresivna|za ekran|sa dioptrijom/i;

/** Two returns from real generated orders; the refunded one is also recorded on its order. */
export function buildReturns(now: Date, orders: Order[]): { returns: ReturnRequest[]; orders: Order[] } {
  const age = (o: Order) => (now.getTime() - new Date(o.createdAt).getTime()) / DAY;
  // a frame bought as is (frame only / original sun lenses) — custom lenses are never restocked
  const frameLine = (o: Order): OrderLine | undefined => o.items.find((l) => l.unit === 'kom' && !CUSTOM_LENSES.test(l.options));
  const old = orders.find((o) => o.status === 'completed' && age(o) > 20 && frameLine(o));
  const recent = orders.find((o) => o !== old && (o.status === 'shipped' || o.status === 'installation' || o.status === 'completed') && age(o) < 15 && frameLine(o));
  const returns: ReturnRequest[] = [];
  let out = orders;
  if (old) {
    const line = frameLine(old)!;
    const lines = [{ productId: line.productId, qty: 1 }];
    const amount = refundForLines(old, lines);
    const t0 = new Date(Math.min(now.getTime() - 12 * DAY, new Date(old.createdAt).getTime() + 6 * DAY));
    const at = (h: number) => new Date(t0.getTime() + h * 3600000).toISOString();
    returns.push({
      id: 'rt-1001',
      number: 'RT-1001',
      orderId: old.id,
      lines,
      reason: 'Korniza nuk përshtatet — e gjerë te tëmthat, klienti kërkon rimbursim',
      status: 'refunded',
      refundAmount: amount,
      restock: true,
      restocked: true,
      createdAt: at(0),
      timeline: [
        { at: at(0), status: 'requested', by: 'st-milica', note: 'Lajmëruar me telefon brenda 14 ditëve' },
        { at: at(5), status: 'approved', by: 'st-arta' },
        { at: at(50), status: 'received', by: 'st-blerim', note: 'Marrë në optikë, pa gërvishtje — kthyer në stok' },
        { at: at(54), status: 'refunded', by: 'st-arta' },
      ],
    });
    out = out.map((o) =>
      o.id === old.id
        ? {
            ...o,
            refunds: [{ id: 'rf-1001', at: at(54), amount, lineIds: [String(o.items.indexOf(line))], note: 'RT-1001', by: 'st-arta' }],
            payment: { ...o.payment, status: 'paid', refunded: amount },
            timeline: [...o.timeline, { at: at(54), status: 'payment', note: `Rimbursim ${amount.toFixed(2)} € (RT-1001)`, by: 'admin' }],
          }
        : o,
    );
  }
  if (recent) {
    const line = frameLine(recent)!;
    const lines = [{ productId: line.productId, qty: 1 }];
    const at = iso(now, 0, -20);
    returns.push({
      id: 'rt-1002',
      number: 'RT-1002',
      orderId: recent.id,
      lines,
      reason: 'Ngjyra ndryshe nga fotografia — klienti kërkon ndërrim ose rimbursim',
      status: 'requested',
      refundAmount: refundForLines(recent, lines),
      restock: true,
      createdAt: at,
      timeline: [{ at, status: 'requested', by: 'web', note: 'Kërkesë me e-mail me numrin e porosisë' }],
    });
  }
  return { returns, orders: out };
}

export function buildQuotes(now: Date): Quote[] {
  const terms = T(
    'Cene uključuju PDV 18%. Plaćanje virmanom u roku od 15 dana od fakture. Sočiva se izrađuju za 2–5 radnih dana od prijema recepta i okvira.',
    'Çmimet përfshijnë TVSH 18%. Pagesa me transfertë bankare brenda 15 ditëve nga fatura. Lentet përgatiten për 2–5 ditë pune nga marrja e recetës dhe e kornizës.',
    'Prices include 18% VAT. Payment by bank transfer within 15 days of invoice. Lenses are made in 2–5 working days from receipt of prescription and frame.',
  );
  return [
    {
      id: 'q-031',
      number: 'Q-2026-031',
      inquiryId: 'inq_120',
      customer: { name: 'Besnik Morina', company: 'Optika Vizioni Sh.p.k., Prizren', email: 'porosi.vizioni@example.com', phone: '+383 44 552 301' },
      lines: [
        { productId: 'p-lens-progressive', title: 'Lente progresive 1.60 antirefleks — palë', qty: 40, price: 118 },
        { title: 'Montim në kornizën e klientit + kontroll në fokometër', qty: 40, price: 8 },
        { title: 'Dërgesë Mitrovicë–Prizren (2 herë në javë)', qty: 8, price: 12 },
      ],
      validUntil: iso(now, 14),
      terms,
      version: 2,
      status: 'sent',
      createdAt: iso(now, -3),
      owner: 'st-arta',
    },
    {
      id: 'q-032',
      number: 'Q-2026-032',
      customer: { name: 'Thomas Keller', company: 'Augenoptik Keller GmbH, Stuttgart', email: 'einkauf.keller@example.com', phone: '+49 711 480 2215' },
      lines: [
        { productId: 'p-lens-single', title: 'Single-vision lenses 1.67 AR — pair', qty: 60, price: 52 },
        { productId: 'p-lens-screen', title: 'Blue-light screen lenses 1.60 — pair', qty: 30, price: 49 },
        { title: 'Edging & mounting into customer frames', qty: 90, price: 6 },
        { title: 'Express courier to Stuttgart', qty: 2, price: 85 },
      ],
      validUntil: iso(now, 30),
      terms,
      version: 1,
      status: 'draft',
      createdAt: iso(now, -1),
      owner: 'st-gent',
    },
    {
      id: 'q-030',
      number: 'Q-2026-030',
      customer: { name: 'Liridon Rexhepi', company: 'Optik Studio Sh.p.k., Ferizaj', email: 'lab.optikstudio@example.com', phone: '+383 49 220 517' },
      lines: [
        { productId: 'p-lens-photochromic', title: 'Lente fotokromatike 1.60, gri — palë', qty: 20, price: 96 },
        { productId: 'p-lens-thin', title: 'Lente ultra të holla 1.74 — palë', qty: 6, price: 152 },
        { title: 'Montim + kontroll', qty: 26, price: 6 },
      ],
      validUntil: iso(now, -2),
      terms,
      version: 1,
      status: 'accepted',
      createdAt: iso(now, -16),
      owner: 'st-arta',
    },
  ];
}

/* ================================================================== */
/* Menus & content models                                              */
/* ================================================================== */
export function buildMenus(): Menu[] {
  const cat = (id: string, label: L10n, prefix = 'mi') => ({ id: `${prefix}-${id}`, label, type: 'category' as const, target: id });
  const url = (id: string, label: L10n, target: string, children?: Menu['items']) => ({ id, label, type: 'url' as const, target, ...(children ? { children } : {}) });
  const page = (id: string, label: L10n) => ({ id: `mi-${id}`, label, type: 'page' as const, target: id });
  const L = {
    optical: T('Optičke naočare', 'Syze optike', 'Optical frames'),
    smart: T('Pametne naočare', 'Syze inteligjente', 'Smart glasses'),
    sun: T('Naočare za sunce', 'Syze dielli', 'Sunglasses'),
    lenses: T('Sočiva po receptu', 'Lente me recetë', 'Prescription lenses'),
    finder: T('Pronađite svoj okvir', 'Gjeni kornizën tuaj', 'Find your frame'),
    lensGuide: T('Vodič kroz sočiva', 'Udhëzuesi i lenteve', 'Lens guide'),
    sale: T('Akcije', 'Ofertat', 'Offers'),
    tryOn: T('Probajte virtuelno', 'Provo virtualisht', 'Virtual try-on'),
    services: T('Usluge', 'Shërbimet', 'Services'),
    ourServices: T('Naše usluge', 'Shërbimet tona', 'Our services'),
    book: T('Zakažite termin', 'Rezervo termin', 'Book an appointment'),
    clinic: T('Klinika Miftari', 'Klinika Miftari', 'Klinika Miftari'),
    lab: T('Optical Lab', 'Optical Lab', 'Optical Lab'),
    track: T('Pratite porudžbinu', 'Gjurmo porosinë', 'Track your order'),
    lookbook: T('Lookbook', 'Lookbook', 'Lookbook'),
    about: T('O nama', 'Rreth nesh', 'About'),
    advice: T('Saveti', 'Këshilla', 'Advice'),
    contact: T('Kontakt', 'Kontakt', 'Contact'),
  };
  return [
    {
      id: 'menu-main',
      handle: 'main',
      title: 'Menyja kryesore',
      items: [
        url('mi-products', T('Proizvodi', 'Produktet', 'Products'), '/produktet', [
          cat('cat-optike', L.optical),
          cat('cat-dielli', L.sun),
          cat('cat-lente', L.lenses),
          url('mi-finder', L.finder, '/gjej-kornizen'),
          url('mi-lens-guide', L.lensGuide, '/lentet'),
          url('mi-sale', L.sale, '/produktet?akcija=1'),
        ]),
        // smart glasses have their own top-level item → the dark launch page (the header gives it a glowing "new" badge)
        url('mi-smart', L.smart, '/syze-inteligjente'),
        url('mi-try-on', L.tryOn, '/provo-virtualisht'),
        url('mi-services', L.services, '/sherbimet', [
          url('mi-services-all', L.ourServices, '/sherbimet'),
          url('mi-book', L.book, '/rezervo'),
          url('mi-clinic', L.clinic, '/klinika'),
          url('mi-lab', L.lab, '/optical-lab'),
        ]),
        url('mi-lookbook', L.lookbook, '/lookbook'),
        url('mi-about', L.about, '/rreth-nesh'),
        url('mi-blog', L.advice, '/keshilla'),
        url('mi-contact', L.contact, '/kontakt'),
      ],
    },
    {
      id: 'menu-footer',
      handle: 'footer',
      title: 'Fundi i faqes',
      items: [
        url('mi-f-shop', T('Kupovina', 'Blerja', 'Shop'), '/produktet', [
          cat('cat-optike', L.optical, 'mi-f'),
          // the landing page (models, guide, request) — the category listing is one click from there
          url('mi-f-smart', L.smart, '/syze-inteligjente'),
          cat('cat-dielli', L.sun, 'mi-f'),
          cat('cat-lente', L.lenses, 'mi-f'),
          url('mi-f-try-on', L.tryOn, '/provo-virtualisht'),
          url('mi-f-finder', L.finder, '/gjej-kornizen'),
          url('mi-f-lens-guide', L.lensGuide, '/lentet'),
          url('mi-f-sale', L.sale, '/produktet?akcija=1'),
        ]),
        url('mi-f-company', T('ITCOM', 'ITCOM', 'ITCOM'), '/rreth-nesh', [
          url('mi-f-about', L.about, '/rreth-nesh'),
          url('mi-f-services', L.services, '/sherbimet'),
          url('mi-f-clinic', L.clinic, '/klinika'),
          url('mi-f-lab', T('Optical Lab (B2B)', 'Optical Lab (B2B)', 'Optical Lab (B2B)'), '/optical-lab'),
          url('mi-f-lookbook', L.lookbook, '/lookbook'),
          url('mi-f-blog', L.advice, '/keshilla'),
          url('mi-f-contact', L.contact, '/kontakt'),
        ]),
        url('mi-f-help', T('Za klijente', 'Për klientët', 'Customer care'), '', [
          url('mi-f-book', T('Zakažite pregled vida', 'Rezervo kontrollin e syve', 'Book an eye exam'), '/rezervo'),
          url('mi-f-track', L.track, '/gjurmo-porosine'),
          page('pg-dostava', T('Dostava i plaćanje', 'Dërgesa dhe pagesa', 'Delivery & payment')),
          page('pg-reklamacije', T('Povrat i garancija', 'Kthimet dhe garancia', 'Returns & warranty')),
          page('pg-kujdes', T('Nega+', 'Kujdes+', 'Care+')),
          page('pg-receta', T('Recept i PD', 'Receta dhe PD', 'Prescription & PD')),
          page('pg-uslovi', T('Uslovi korišćenja', 'Kushtet e përdorimit', 'Terms of use')),
          page('pg-privatnost', T('Privatnost', 'Privatësia', 'Privacy')),
        ]),
      ],
    },
  ];
}

export function buildContentModels(projects: Project[], home: HomeSection[], locations: number): ContentModel[] {
  const faq = home.find((h) => h.type === 'faq');
  const services = home.find((h) => h.type === 'services');
  return [
    {
      id: 'cm-projekti',
      name: T('Lookbook', 'Lookbook', 'Lookbook'),
      source: 'projects',
      fields: [
        { key: 'title', label: T('Naslov', 'Titulli', 'Title'), type: 'text' },
        { key: 'location', label: T('Lokacija snimanja', 'Vendi i fotografimit', 'Shot on location'), type: 'text' },
        { key: 'year', label: T('Godina', 'Viti', 'Year'), type: 'number' },
        { key: 'tags', label: T('Oznake', 'Etiketat', 'Tags'), type: 'choice' },
        { key: 'summary', label: T('Priča', 'Historia', 'Story'), type: 'text' },
        { key: 'image', label: T('Fotografija', 'Fotografia', 'Photo'), type: 'image' },
        { key: 'featured', label: T('Izdvojeno', 'E veçuar', 'Featured'), type: 'boolean' },
      ],
      entries: projects.length,
    },
    {
      id: 'cm-faq',
      name: T('Česta pitanja', 'Pyetje të shpeshta', 'FAQ'),
      source: 'home.faq',
      fields: [
        { key: 'q', label: T('Pitanje', 'Pyetja', 'Question'), type: 'text' },
        { key: 'a', label: T('Odgovor', 'Përgjigjja', 'Answer'), type: 'text' },
      ],
      entries: faq && faq.type === 'faq' ? faq.data.items.length : 0,
    },
    {
      id: 'cm-sherbimet',
      name: T('Usluge', 'Shërbimet', 'Services'),
      source: 'home.services',
      fields: [
        { key: 'image', label: T('Fotografija', 'Fotografia', 'Photo'), type: 'image' },
        { key: 'title', label: T('Naziv', 'Titulli', 'Title'), type: 'text' },
        { key: 'text', label: T('Opis', 'Përshkrimi', 'Description'), type: 'text' },
        { key: 'service', label: T('Termin (usluga)', 'Termini (shërbimi)', 'Booking service'), type: 'reference' },
      ],
      entries: services && services.type === 'services' ? services.data.items.length : 0,
    },
    {
      id: 'cm-lokacionet',
      name: T('Lokacije', 'Lokacionet', 'Locations'),
      source: 'settings.locations',
      fields: [
        { key: 'name', label: T('Naziv', 'Emri', 'Name'), type: 'text' },
        { key: 'address', label: T('Adresa', 'Adresa', 'Address'), type: 'text' },
        { key: 'city', label: T('Grad', 'Qyteti', 'City'), type: 'text' },
        { key: 'pickup', label: T('Preuzimanje', 'Marrje në vend', 'Pickup'), type: 'boolean' },
        { key: 'map', label: T('Mapa', 'Harta', 'Map'), type: 'link' },
      ],
      entries: locations,
    },
  ];
}

/* ================================================================== */
/* Homepage history & audit log                                        */
/* ================================================================== */
export function buildHomeHistory(now: Date, home: HomeSection[]): HomeVersion[] {
  const v1 = structuredClone(home).map((s) => (s.type === 'instagram' ? { ...s, enabled: false } : s));
  const v2 = structuredClone(home)
    .filter((s) => s.type !== 'promo')
    .map((s) => (s.type === 'blog' ? { ...s, enabled: false } : s));
  return [
    { at: iso(now, -6, -4), by: 'st-gent', sections: v1 },
    { at: iso(now, -21, -2), by: 'st-drita', sections: v2 },
  ];
}

export function buildAudit(now: Date, orders: Order[]): AuditEntry[] {
  const o = (i: number) => orders[Math.min(i, orders.length - 1)];
  const a = (id: number, hours: number, actor: string, action: AuditEntry['action'], object: AuditEntry['object'], objectId: string, detail?: string): AuditEntry => ({
    id: `au-${id}`,
    at: new Date(now.getTime() - hours * 3600000).toISOString(),
    actor,
    action,
    object,
    objectId,
    ...(detail ? { detail } : {}),
  });
  const list: AuditEntry[] = [
    a(1, 0.4, 'st-gent', 'login', 'staff', 'st-gent', 'Hyrje në CMS'),
    a(2, 1.2, 'st-arta', 'status', 'order', o(3).id, `${o(3).number}: new → confirmed`),
    a(3, 3, 'st-milica', 'assign', 'inquiry', 'inq_120', 'Besnik Morina (Optika Vizioni) → Arta Krasniqi'),
    a(4, 20, 'st-arta', 'create', 'draft', 'dr-1001', 'D-1001 — Valon Bytyqi'),
    a(5, 26, 'st-blerim', 'fulfil', 'order', o(8).id, `${o(8).number} — lentet gati, kontrolluar në fokometër`),
    a(6, 30, 'st-milica', 'create', 'booking', 'bk-108', 'Kontroll i syve — e enjte 10:30'),
    a(7, 47, 'st-drita', 'create', 'offer', 'of-blackfriday', 'Black Friday — korniza optike −25%'),
    a(8, 48, 'st-drita', 'create', 'discount', 'd-bf-optike', 'Black Friday — korniza optike −25%'),
    a(9, 50, 'st-drita', 'create', 'placement', 'pl-s-bf', 'Hero — Black Friday korniza optike'),
    a(10, 70, 'st-gent', 'update', 'product', 'p-prism-m2', 'Prism M2 — çmimi në ofertë 320 €'),
    a(11, 74, 'st-arta', 'send', 'quote', 'q-031', 'Q-2026-031 v2 — Optika Vizioni'),
    a(12, 96, 'st-blerim', 'adjust', 'inventory', 'p-vortex-x1', 'OM-VTX-X1 −1 (damaged)'),
    a(13, 98, 'st-gent', 'send', 'draft', 'dr-1002', 'D-1002 — fatura proforma Optik Studio'),
    a(14, 120, 'st-arta', 'receive', 'purchaseOrder', 'po-014', 'PO-2026-014: +28'),
    a(15, 146, 'st-gent', 'publish', 'home', 'home', 'Ballina — blloku promo fund sezoni'),
    a(16, 150, 'st-drita', 'update', 'page', 'pg-dostava', 'Dërgesa dhe marrja në optikë'),
    a(17, 200, 'st-gent', 'update', 'settings', 'settings', 'shippingZones'),
    a(18, 214, 'st-gent', 'publish', 'offer', 'of-dielli', 'Fund sezoni — syze dielli'),
    a(19, 216, 'st-drita', 'create', 'discount', 'd-dielli20', 'Fund sezoni — syze dielli −20% (automatike)'),
    a(20, 218, 'st-drita', 'create', 'collection', 'col-dielli-fund-sezoni', 'Fund sezoni — syze dielli'),
    a(21, 230, 'st-arta', 'refund', 'return', 'rt-1001', 'RT-1001'),
    a(22, 240, 'st-drita', 'create', 'discount', 'd-vjeshta25', 'VJESHTA25'),
  ];
  return list;
}
