// Realistic demo activity (orders + inquiries) so the CMS dashboard looks alive.
// Deterministic for a given seed, always relative to "now".
import type { CartItem, Collection, Customer, Discount, Inquiry, Lang, Order, OrderEvent, OrderStatus, PaymentMethod, Product, Settings } from '@/lib/types';
import { priceCart, defaultOptions } from '@/lib/pricing';
import { lt } from '@/i18n';
import { pick, rng, slugify, weighted } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Customers — Mitrovicë and the rest of Kosovo                        */
/* ------------------------------------------------------------------ */
const FIRST = [
  'Arta', 'Blerina', 'Drilon', 'Erza', 'Fjolla', 'Gentrit', 'Ilir', 'Jeta', 'Kaltrina', 'Labinot', 'Leutrim', 'Majlinda', 'Njomza', 'Rinor', 'Shpresa',
  'Valon', 'Vjosa', 'Agon', 'Dafina', 'Egzon', 'Albana', 'Besart', 'Donika', 'Fatos', 'Granit', 'Lirije', 'Mimoza', 'Arbër', 'Teuta', 'Ardian',
];
const LAST = ['Krasniqi', 'Gashi', 'Berisha', 'Morina', 'Hoxha', 'Shala', 'Kastrati', 'Bytyqi', 'Rexhepi', 'Hasani', 'Ahmeti', 'Kelmendi', 'Zeka', 'Mustafa', 'Osmani', 'Jashari', 'Sejdiu', 'Halili'];
/** Mitrovica is a mixed town — a few Serbian customers too. */
const FIRST_SR = ['Nikola', 'Jelena', 'Milan', 'Ivana', 'Stefan', 'Dragana'];
const LAST_SR = ['Jovanović', 'Petrović', 'Nikolić', 'Stojanović', 'Ilić', 'Marković'];
const STREETS = ['Bulevardi Nëna Terezë', 'Bulevardi Bill Clinton', 'Rruga Agim Ramadani', 'Rruga Adem Jashari', 'Rruga Skënderbeu', 'Rruga Bislim Bajgora', 'Rruga Nëna Terezë'];
const CITIES: (readonly [string, number])[] = [
  ['Prishtinë', 30], ['Fushë Kosovë', 6], ['Mitrovicë', 7], ['Vushtrri', 3], ['Podujevë', 4], ['Drenas', 3], ['Lipjan', 3],
  ['Pejë', 5], ['Prizren', 5], ['Gjakovë', 3], ['Ferizaj', 4], ['Gjilan', 3],
];

function customer(r: () => number): Customer {
  const serbian = r() < 0.08;
  const firstName = pick(serbian ? FIRST_SR : FIRST, r);
  const lastName = pick(serbian ? LAST_SR : LAST, r);
  const city = serbian ? 'Graçanicë' : weighted(CITIES, r);
  const digits = () => String(Math.floor(r() * 900) + 100);
  return {
    firstName,
    lastName,
    email: `${slugify(firstName)}.${slugify(lastName)}@example.com`,
    phone: `+383 4${pick(['3', '4', '5', '8', '9'], r)} ${digits()} ${digits()}`,
    city,
    address: `${pick(STREETS, r)} ${Math.floor(r() * 220) + 1}`,
  };
}

/** Optical Lab partners — opticians who order prescription lenses from our lab. */
const PARTNERS: Customer[] = [
  { firstName: 'Besnik', lastName: 'Morina', company: 'Optika Vizioni Sh.p.k.', pib: '811023457', email: 'porosi.vizioni@example.com', phone: '+383 44 552 301', city: 'Prizren', address: 'Rruga Adem Jashari 12' },
  { firstName: 'Liridon', lastName: 'Rexhepi', company: 'Optik Studio Sh.p.k.', pib: '811204563', email: 'lab.optikstudio@example.com', phone: '+383 49 220 517', city: 'Ferizaj', address: 'Rruga Adem Jashari 41' },
  { firstName: 'Arbnora', lastName: 'Halili', company: 'Optika Qendra', pib: '811377120', email: 'info.optikaqendra@example.com', phone: '+383 45 318 662', city: 'Gjilan', address: 'Rruga Skënderbeu 7' },
  { firstName: 'Fatos', lastName: 'Kryeziu', company: 'Optika Linea', pib: '811450981', email: 'optikalinea@example.com', phone: '+383 44 731 204', city: 'Pejë', address: 'Rruga Nëna Terezë 33' },
];

/* ------------------------------------------------------------------ */
/* Order lines                                                         */
/* ------------------------------------------------------------------ */
/** How often each option value is chosen (by value id); unlisted values (colours, tints) weigh 1. */
const CHOICE: Record<string, number> = {
  // optical frames: lenses
  frame: 2, single: 4, screen: 2.5, progressive: 1.5,
  // sunglasses: lenses
  original: 8.5, rx: 1.5,
  // lens index / progressive level / polarisation
  '150': 5, '160': 3, '167': 1.5, standard: 5, premium: 3, individual: 1, no: 1, yes: 1.5,
};
const isLens = (p: Product) => p.categoryId === 'cat-lente';

function lineFor(p: Product, r: () => number): CartItem {
  const options = defaultOptions(p);
  for (const o of p.options) options[o.id] = weighted(o.values.map((v) => [v.id, CHOICE[v.id] ?? 1] as const), r);
  const qty = !isLens(p) && r() < 0.05 ? 2 : 1;
  // Care+ (12-month breakage cover) on about a third of the frames; lens packages have no add-on
  const installation = !!p.installation?.available && r() < 0.32;
  return { key: '', productId: p.id, qty, options, installation };
}

/** A lens package in the cart means the frames go to the lab bare (frame only / original sun lenses). */
function bareFrames(cart: CartItem[], byId: Map<string, Product>) {
  if (!cart.some((c) => byId.get(c.productId) && isLens(byId.get(c.productId)!))) return;
  for (const c of cart) {
    const p = byId.get(c.productId);
    const lenses = p?.options.find((o) => o.id === 'lenses');
    if (lenses?.values[0]) c.options = { ...c.options, lenses: lenses.values[0].id };
  }
}

/** Lenses made in Optical Lab (lens packages or prescription lens choices on a frame). */
const needsLab = (cart: CartItem[], byId: Map<string, Product>) =>
  cart.some((c) => {
    const p = byId.get(c.productId);
    return !!p && (isLens(p) || (!!c.options.lenses && c.options.lenses !== 'frame' && c.options.lenses !== 'original'));
  });

function statusFor(ageDays: number, r: () => number): OrderStatus {
  if (ageDays < 0.6) return r() < 0.75 ? 'new' : 'confirmed';
  if (ageDays < 3) return weighted([['confirmed', 4], ['processing', 4], ['new', 1]] as const, r);
  if (ageDays < 9) return weighted([['processing', 3], ['shipped', 3], ['installation', 3], ['completed', 2], ['cancelled', 0.4]] as const, r);
  if (ageDays < 20) return weighted([['shipped', 2], ['installation', 2], ['completed', 6], ['cancelled', 0.6]] as const, r);
  return weighted([['completed', 15], ['cancelled', 1]] as const, r);
}

/** Delivered by courier vs. picked up and fitted at the store ("installation" = ready for fitting). */
const FLOW_DELIVERY: OrderStatus[] = ['new', 'confirmed', 'processing', 'shipped', 'completed'];
const FLOW_PICKUP: OrderStatus[] = ['new', 'confirmed', 'processing', 'installation', 'completed'];

const WELCOME_CODE = 'MIFTARI10';

/**
 * Orders over the last 75 days. Every cart goes through the real pricing + discount engine with the
 * order date as "now", so automatic rules only apply inside their window (e.g. the end-of-season sale).
 */
export function generateOrders(products: Product[], settings: Settings, discounts: Discount[], collections: Collection[], now = new Date(), seed = 42): Order[] {
  const r = rng(seed);
  const byId = new Map(products.map((p) => [p.id, p] as const));
  const sellable = products.filter((p) => !p.quoteOnly && p.status === 'active');
  const weights = sellable.map((p) => [p, Math.sqrt(p.sold + 5) * (isLens(p) ? 0.6 : 1)] as const);
  const lensWeights = sellable.filter(isLens).map((p) => [p, Math.sqrt(p.sold + 5)] as const);
  const b2b = discounts.find((d) => d.method === 'code' && d.audience.type === 'segment' && d.audience.segmentId === 'seg-b2b' && d.status === 'active');
  const prefix = settings.orderPrefix || 'IT-';
  const orders: Order[] = [];
  const past: Customer[] = [];
  let seq = 1001;
  const DAYS = 75;
  for (let day = DAYS; day >= 0; day--) {
    // gentle growth trend + weekly rhythm (store closed on Sundays — only a trickle of web orders)
    const date = new Date(now.getTime() - day * 86400000);
    const dow = date.getDay();
    const base = 0.35 + ((DAYS - day) / DAYS) * 0.75;
    const mean = dow === 0 ? base * 0.3 : dow === 6 ? base * 0.8 : base;
    let count = 0;
    let x = r();
    let p = Math.exp(-mean);
    let cdf = p;
    while (x > cdf && count < 5) {
      count++;
      p = (p * mean) / count;
      cdf += p;
    }
    if (day === 0) count = Math.max(count, 3);
    for (let i = 0; i < count; i++) {
      const hour = 9 + Math.floor(r() * 13);
      const created = new Date(date);
      created.setHours(hour, Math.floor(r() * 60), Math.floor(r() * 60), 0);
      if (created > now) created.setTime(now.getTime() - (i + 1) * 47 * 60000);
      const ageDays = (now.getTime() - created.getTime()) / 86400000;

      // about one order in eleven is an Optical Lab B2B order from a partner optician
      const isB2b = !!b2b && lensWeights.length > 0 && r() < 0.09;
      const cart: CartItem[] = [];
      const used = new Set<string>();
      if (isB2b) {
        const nLines = weighted([[1, 3], [2, 4], [3, 2]] as const, r);
        for (let k = 0; k < nLines; k++) {
          const prod = weighted(lensWeights, r);
          if (used.has(prod.id)) continue;
          used.add(prod.id);
          cart.push({ ...lineFor(prod, r), qty: weighted([[2, 3], [3, 3], [4, 2], [6, 1]] as const, r) });
        }
      } else {
        const nLines = weighted([[1, 7], [2, 2.5], [3, 0.6]] as const, r);
        for (let k = 0; k < nLines; k++) {
          const prod = weighted(weights, r);
          if (used.has(prod.id)) continue;
          used.add(prod.id);
          cart.push(lineFor(prod, r));
        }
        // shoppers following the "buy X get Y" promo (frame → lenses −50%) add the Y item themselves
        for (const d of discounts) {
          const b = d.bxgy;
          if (d.kind !== 'bxgy' || !b || d.method !== 'auto' || b.getScope !== 'products' || new Date(d.startsAt) > created) continue;
          const xQty = cart.filter((c) => b.buyScope === 'products' && b.buyIds.includes(c.productId)).reduce((n, c) => n + c.qty, 0);
          const y = byId.get(b.getIds[0]);
          if (y && xQty >= b.buyQty && !cart.some((c) => c.productId === y.id) && r() < 0.5) {
            cart.push({ ...lineFor(y, r), qty: b.getQty * Math.min(b.maxUses || 1, Math.floor(xQty / b.buyQty)), installation: false });
          }
        }
        bareFrames(cart, byId);
      }

      // about one retail order in six comes from a returning customer
      const cust = isB2b ? { ...pick(PARTNERS, r) } : past.length > 4 && r() < 0.16 ? { ...pick(past, r) } : customer(r);
      if (!isB2b) past.push(cust);
      const lab = needsLab(cart, byId);
      const delivery = isB2b ? 'delivery' : r() < (lab ? 0.55 : 0.3) ? 'pickup' : 'delivery';
      const lang: Lang = isB2b ? 'sq' : weighted([['sq', 9], ['en', 1]] as const, r);
      // codes people typed: the welcome code, plus the seasonal code that was live on that day
      const x2 = r();
      const seasonal = discounts.find(
        (d) => d.method === 'code' && d.code !== WELCOME_CODE && d.audience.type !== 'segment' && d.status === 'active' && new Date(d.startsAt) <= created && (!d.endsAt || new Date(d.endsAt) > created),
      );
      const couponCode = isB2b ? b2b!.code! : x2 < 0.12 ? WELCOME_CODE : x2 < 0.25 && seasonal ? seasonal.code! : null;
      const totals = priceCart(cart, products, settings, {
        lang,
        couponCode,
        discounts,
        collections,
        delivery,
        city: cust.city,
        now: created,
        ...(isB2b ? { customer: { segmentIds: ['seg-b2b'] } } : {}),
      });
      const payMethod: PaymentMethod = isB2b ? 'bank' : weighted([['cod', 4], ['bank', 1.5], ['card', 3.5]] as const, r);
      const flow = delivery === 'pickup' ? FLOW_PICKUP : FLOW_DELIVERY;
      let status = statusFor(ageDays, r);
      if (status === 'shipped' && delivery === 'pickup') status = 'installation';
      if (status === 'installation' && delivery === 'delivery') status = 'shipped';

      const idx = flow.indexOf(status);
      const timeline: OrderEvent[] = [{ at: created.toISOString(), status: 'new', by: 'web' }];
      if (status === 'cancelled') {
        timeline.push({ at: new Date(created.getTime() + 5 * 3600000).toISOString(), status: 'cancelled', note: 'Klienti anuloi me telefon', by: 'admin' });
      } else {
        for (let s = 1; s <= idx; s++) {
          const at = new Date(created.getTime() + s * Math.min(ageDays / (idx + 1), 2.2) * 86400000);
          const st = flow[s];
          const note =
            st === 'processing' && lab
              ? 'Lentet në punim në Optical Lab'
              : st === 'installation'
                ? 'Gati për përshtatje — klienti u njoftua me SMS'
                : st === 'shipped'
                  ? 'Dërguar me korrier'
                  : undefined;
          timeline.push({ at: at.toISOString(), status: st, by: 'admin', ...(note ? { note } : {}) });
        }
      }
      const paid = payMethod === 'card' ? true : payMethod === 'bank' ? idx >= 1 : status === 'completed';
      orders.push({
        id: `o_${seq}`,
        number: `${prefix}${seq}`,
        createdAt: created.toISOString(),
        status,
        customer: cust,
        items: totals.lines.map((l) => ({
          productId: l.product.id,
          sku: l.product.sku,
          name: lt(l.product.name, lang),
          image: l.product.images[0] ?? '',
          unit: l.product.unit,
          packSize: l.product.packSize,
          qty: l.item.qty,
          options: l.optionsLabel,
          unitPrice: l.unitPrice,
          installation: l.item.installation,
          installationPrice: l.installationUnitPrice,
          lineTotal: l.lineTotal,
          discount: l.discount,
          allocations: l.allocations,
        })),
        delivery: { method: delivery, fee: totals.shipping },
        payment: { method: payMethod, status: status === 'cancelled' ? (paid && payMethod === 'card' ? 'refunded' : 'pending') : paid ? 'paid' : 'pending' },
        coupon: totals.coupon ? { code: totals.coupon.code, discount: totals.discount } : null,
        discounts: totals.applied,
        shippingBeforeDiscount: totals.shippingBeforeDiscount,
        subtotal: totals.subtotal,
        installationTotal: totals.installationTotal,
        discount: totals.discount,
        shipping: totals.shipping,
        total: totals.total,
        vat: totals.vat,
        lang,
        timeline,
        seen: ageDays > 0.6,
        demo: true,
        ...(isB2b ? { tags: ['b2b', 'optical-lab'] } : {}),
        ...(status === 'shipped' || status === 'installation' || status === 'completed'
          ? { fulfillment: { shippedAt: timeline.find((e) => e.status === 'shipped' || e.status === 'installation')?.at ?? created.toISOString(), ...(status === 'completed' ? { deliveredAt: timeline[timeline.length - 1].at } : {}) } }
          : {}),
      });
      seq++;
    }
  }
  // number in date order (today's orders are back-dated above, so generation order ≠ time order)
  orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((o, i) => {
    o.id = `o_${1001 + i}`;
    o.number = `${prefix}${1001 + i}`;
  });
  return orders.reverse();
}

/* ------------------------------------------------------------------ */
/* Inquiries — eye-exam bookings, contact questions, Optical Lab B2B   */
/* ------------------------------------------------------------------ */
/** Service choices of the storefront booking form (stored as the label the visitor saw). */
const SVC = {
  exam: 'Kontroll i syve',
  fit: 'Përshtatje & matje PD',
  contact: 'Lente kontakti',
  repair: 'Riparim & rregullim',
  klinika: 'Konsultë në Klinikën Miftari',
  examEn: 'Eye exam',
};

type Partner = Pick<Customer, 'firstName' | 'lastName' | 'company' | 'email' | 'phone' | 'city'>;
const PARTNER_QENDRA: Partner = PARTNERS[2];
const PARTNER_LINEA: Partner = PARTNERS[3];
const PARTNER_WIEN: Partner = { firstName: 'Katharina', lastName: 'Brandl', company: 'Optik Brandl e.U.', email: 'einkauf.optikbrandl@example.com', phone: '+43 1 522 4180', city: 'Wien' };

const INQ_MSG: { type: Inquiry['type']; service?: string; productId?: string; message: string; from?: Partner; city?: string }[] = [
  { type: 'measurement', service: SVC.exam, message: 'Receta: Nuk kam ende recetë\nPërshëndetje, dua të bëj kontrollin e syve. Syzet i kam 3 vjet dhe kohët e fundit më lodhen sytë gjatë leximit. Më përshtatet pasdite pas orës 16.' },
  { type: 'measurement', service: SVC.contact, message: 'Receta: Kam recetë\nDo të doja të provoja lente kontakti ditore për herë të parë. Receta ime e fundit është −2.25 në të dy sytë.' },
  {
    type: 'quote',
    productId: 'p-lens-progressive',
    from: PARTNER_QENDRA,
    message: 'Jemi optikë në Gjilan dhe kërkojmë laborator partner për lente progresive 1.60 me antirefleks — rreth 25 palë në muaj, të montuara në kornizat tona. Na dërgoni çmimet B2B.',
  },
  { type: 'measurement', service: SVC.klinika, message: 'Kam diabet tip 2 dhe mjeku familjar më rekomandoi kontroll të fundusit të syrit. A mund të caktoj termin në Klinikën Miftari?' },
  { type: 'contact', message: 'Përshëndetje, a i keni syzet Vortex X1 në ngjyrën e zezë me ar në stok? Do të vija t’i provoja të shtunën.' },
  {
    type: 'measurement',
    service: SVC.examEn,
    city: 'Mitrovicë',
    message: 'Prescription: I have a prescription\nHi! I’m visiting family in Mitrovica for two weeks and would like an eye exam and new glasses before I fly back to Germany. Is that possible within a week?',
  },
  {
    type: 'quote',
    productId: 'p-lens-thin',
    from: PARTNER_LINEA,
    message: 'Na duhen 4 palë lente 1.74 për klientë me −8.00 dhe astigmatizëm. Sa është afati më i shkurtër dhe çmimi për optikë partnere?',
  },
  { type: 'measurement', service: SVC.exam, message: 'Djali im 7 vjeç i afrohet shumë tabelës në shkollë. Dëshirojmë kontroll të syve për fëmijë, mundësisht të shtunën paradite.' },
  { type: 'contact', message: 'A mund të paguhen syzet progresive me këste? Dhe a është kontrolli i syve falas nëse blej kornizë te ju?' },
  { type: 'measurement', service: SVC.repair, message: 'Mu lirua njëra vidë te korniza dhe syzet më rrëshqasin nga hunda. A mund të kaloj sot për rregullim?' },
  {
    type: 'quote',
    productId: 'p-lens-screen',
    from: PARTNER_WIEN,
    message: 'We are an independent optician in Vienna looking for a lab partner for blue-light screen lenses (1.60) — around 40 pairs a month. Could you send your B2B price list and lead times to Austria?',
  },
  { type: 'measurement', service: SVC.fit, message: 'Receta: Kam recetë\nKornizën Nova N-04 e kam blerë online dhe kam recetën nga oftalmologu. Kur mund të vij për matjen e PD-së dhe porosinë e lenteve?' },
];

/** Preferred visit day — the store is closed on Sundays. */
function preferredDay(now: Date, days: number) {
  const d = new Date(now.getTime() + days * 86400000);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function generateInquiries(now = new Date(), seed = 7): Inquiry[] {
  const r = rng(seed);
  return INQ_MSG.map((m, i) => {
    const ageHours = i === 0 ? 2.5 : i === 1 ? 9 : Math.floor(14 + r() * 28 * 24);
    const created = new Date(now.getTime() - ageHours * 3600000);
    const c = m.from ?? customer(r);
    const ageDays = ageHours / 24;
    const status: Inquiry['status'] = ageDays < 1 ? 'new' : ageDays < 4 ? (r() < 0.5 ? 'contacted' : 'scheduled') : ageDays < 12 ? (r() < 0.6 ? 'scheduled' : 'done') : 'done';
    const scheduledAt = status === 'scheduled' ? new Date(now.getTime() + (1 + Math.floor(r() * 5)) * 86400000).toISOString() : undefined;
    return {
      id: `inq_${100 + i}`,
      createdAt: created.toISOString(),
      type: m.type,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      email: c.email,
      city: m.city ?? c.city,
      ...(m.from?.company ? { company: m.from.company } : {}),
      service: m.service,
      productId: m.productId,
      message: m.message,
      preferredDate: m.type === 'measurement' ? preferredDay(now, 2 + i) : undefined,
      status,
      seen: status !== 'new',
      scheduledAt,
    } satisfies Inquiry;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
