/**
 * Optika discount engine (inherited from the Selca build) — CMS proposal pp. 20–26.
 *
 * Pure and framework-free: this module only has *type* imports, so the very same code runs in the
 * storefront (pricing.ts → cart/checkout), in the store (placeOrder) and in plain Node for the check
 * script (`node --experimental-strip-types src/lib/__tests__/discounts.check.ts`).
 *
 * ─── Rules implemented ─────────────────────────────────────────────────────────────────────────
 *  • Money is handled in integer CENTS internally; inputs/outputs are EUR (2 decimals).
 *  • Calculation order (p.23):
 *      1. active variant price (the caller passes the line price — sale price + option deltas)
 *      2. product discounts on eligible lines           (kind 'products' and 'bxgy')
 *      3. order discounts on the revised subtotal        (kind 'order')
 *      4. shipping discount                              (kind 'shipping')
 *  • Threshold base per type (p.24):
 *      products → only the participating lines, after earlier allowed discounts
 *      order    → subtotal after product discounts, before order discounts
 *      shipping → the same subtotal, without the shipping fee
 *      bxgy     → only eligible X items, not counting the Y items
 *  • Combination is MUTUAL (p.23): A and B combine only if A allows B's class and B allows A's class.
 *    BXGY belongs to the 'products' class. When rules don't combine, the engine picks the set with
 *    the best MONETARY saving for this cart — not the highest percentage (p.25).
 *  • One product discount per line — two product rules that allow each other ('products' flag) apply to
 *    DIFFERENT lines of the same cart ("ulje të ndryshme për artikuj të ndryshëm"); on a shared line the
 *    rule with the larger standalone saving keeps it. Several order discounts only when they allow each
 *    other (percentages share the same base, fixed amounts come after); one shipping discount (p.23/p.26).
 *  • Fixed amounts never make a line, the order or shipping negative (p.22).
 *  • Order discounts are allocated proportionally to the lines (value after product discounts);
 *    left-over cents go deterministically by largest remainder, then line order (p.24).
 *  • BXGY: a unit is never X and Y in the same application; the cheapest eligible units become Y;
 *    without Y in the cart nothing is given (manual "add Y yourself" mode, p.22/p.26).
 *  • Automatic discounts apply without a code; codes are normalised (trim + uppercase).
 *  • Every rule that does not apply is explained with a reason code (p.23 "Arsyet e refuzimit").
 */
import type { AppliedDiscount, Discount, DiscountClass, DiscountKind, DiscountState, DiscountTarget } from './types';

/* ================================================================== */
/* Public types                                                        */
/* ================================================================== */

export type RejectReason =
  | 'notfound' // no discount with that code
  | 'inactive' // draft or paused
  | 'scheduled' // starts in the future
  | 'expired' // ended
  | 'minimum' // threshold not reached (see `missing`)
  | 'notCombinable' // a better / incompatible rule won (see `conflictsWith`)
  | 'notEligible' // nothing in the cart qualifies (e.g. BXGY without Y, wrong shipping zone)
  | 'usageLimit' // total limit reached, or already used by this customer
  | 'audience'; // customer is not in the required segment

export interface DiscountLineInput {
  /** Cart line key */
  id: string;
  productId: string;
  /** Countable items on the line (pieces, packs, metres) — used for qty minimums, per-item amounts and BXGY */
  qty: number;
  /** EUR per item at the active price (variant/sale price) */
  unitPrice: number;
  /** EUR line total — defaults to unitPrice × qty (pass it when the line total is rounded differently) */
  total?: number;
  /** Collections the product belongs to (smart + manual), for scope 'collections' */
  collectionIds?: string[];
}

export interface DiscountCustomer {
  segmentIds?: string[];
  /** Discount ids this customer already used (oncePerCustomer) */
  usedDiscountIds?: string[];
}

export interface DiscountInput {
  lines: DiscountLineInput[];
  /** All known rules — automatic ones are picked up, code ones only when their code is entered */
  discounts: Discount[];
  /** Codes typed by the shopper (any case / spacing) */
  codes?: string[];
  /** Shipping fee before any shipping discount, EUR (0 for pickup / free-by-business-rule) */
  shipping?: number;
  /** settings.shippingZones id of the destination, when known */
  shippingZoneId?: string | null;
  customer?: DiscountCustomer | null;
  now?: Date | string | number;
}

export interface DiscountLineResult {
  id: string;
  productId: string;
  qty: number;
  /** EUR before discounts */
  subtotal: number;
  productDiscount: number;
  orderDiscount: number;
  /** productDiscount + orderDiscount */
  discount: number;
  /** subtotal − discount (never negative) */
  total: number;
  allocations: { discountId: string; amount: number }[];
}

export interface RejectedDiscount {
  /** Normalised code as entered ('' for automatic rules) */
  code: string;
  id?: string;
  title?: string;
  kind?: DiscountKind;
  /** true for automatic rules (useful for hints like "add €21 for free delivery"), false for typed codes */
  auto: boolean;
  reason: RejectReason;
  /** For 'minimum': what is missing — EUR when minimumType = 'amount', items when 'qty' */
  missing?: number;
  minimumType?: 'amount' | 'qty';
  /** For 'notCombinable': the applied rule that blocked this one */
  conflictsWith?: string;
}

export interface DiscountResult {
  lines: DiscountLineResult[];
  /** EUR before discounts */
  subtotal: number;
  productDiscount: number;
  orderDiscount: number;
  shippingDiscount: number;
  /** productDiscount + orderDiscount (shipping excluded) */
  discountTotal: number;
  /** Shipping fee after the shipping discount */
  shipping: number;
  /** subtotal − discountTotal + shipping */
  total: number;
  /** In calculation order: products/bxgy → order → shipping */
  applied: AppliedDiscount[];
  rejected: RejectedDiscount[];
}

/* ================================================================== */
/* Small helpers (exported for the UI)                                 */
/* ================================================================== */

export const toCents = (eur: number) => Math.round((Number.isFinite(eur) ? eur : 0) * 100);
export const fromCents = (cents: number) => cents / 100;

/** Codes are compared trimmed, without inner spaces, uppercase. */
export const normalizeCode = (code: string | null | undefined) => (code ?? '').trim().replace(/\s+/g, '').toUpperCase();

/** Combination class of a rule — BXGY is a product discount. */
export function discountClass(d: Pick<Discount, 'kind'>): DiscountClass {
  return d.kind === 'bxgy' ? 'products' : d.kind;
}

const time = (v: Date | string | number | undefined) => (v === undefined ? Date.now() : v instanceof Date ? v.getTime() : typeof v === 'number' ? v : new Date(v).getTime());

/** Lifecycle state: stored status + dates. 'scheduled' / 'expired' are never stored. */
export function discountState(d: Pick<Discount, 'status' | 'startsAt' | 'endsAt'>, now?: Date | string | number): DiscountState {
  if (d.status === 'draft' || d.status === 'paused') return d.status;
  const t = time(now);
  if (d.startsAt && new Date(d.startsAt).getTime() > t) return 'scheduled';
  if (d.endsAt && new Date(d.endsAt).getTime() <= t) return 'expired';
  return 'active';
}

/** Mutual combination check (p.23 "Lejimi duhet të jetë i ndërsjellë"). Two shipping rules never stack. */
export function canCombine(a: Discount, b: Discount): boolean {
  if (a.id === b.id) return false;
  const ca = discountClass(a);
  const cb = discountClass(b);
  if (ca === 'shipping' && cb === 'shipping') return false;
  return !!a.combines?.[cb] && !!b.combines?.[ca];
}

/**
 * Split `total` cents over `weights` proportionally. Cents left after flooring go to the largest
 * remainders, ties by position — fully deterministic. Never gives a line more than its weight
 * when total ≤ Σweights.
 */
export function allocateCents(total: number, weights: number[]): number[] {
  const out = weights.map(() => 0);
  const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0 || sum <= 0) return out;
  const amount = Math.min(total, sum);
  const rems: { i: number; r: number }[] = [];
  let given = 0;
  weights.forEach((w, i) => {
    if (w <= 0) return;
    const share = Math.floor((amount * w) / sum);
    out[i] = share;
    given += share;
    rems.push({ i, r: (amount * w) % sum });
  });
  rems.sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; k < amount - given && k < rems.length; k++) out[rems[k].i] += 1;
  return out;
}

/** Does a line fall inside a target (all / products / collections)? */
export function lineMatches(target: Pick<DiscountTarget, 'scope' | 'ids'> | undefined, line: Pick<DiscountLineInput, 'productId' | 'collectionIds'>): boolean {
  if (!target || target.scope === 'all') return true;
  if (target.scope === 'products') return target.ids.includes(line.productId);
  return (line.collectionIds ?? []).some((c) => target.ids.includes(c));
}

/* ================================================================== */
/* Engine                                                              */
/* ================================================================== */

interface Line {
  id: string;
  productId: string;
  qty: number;
  cents: number;
  collectionIds: string[];
}

interface Candidate {
  d: Discount;
  /** Entered code ('' for automatic) */
  code: string;
  auto: boolean;
  idx: number;
}

interface Fail {
  reason: RejectReason;
  missing?: number;
  minimumType?: 'amount' | 'qty';
  conflictsWith?: string;
}

interface Evaluation {
  saving: number;
  product: number[];
  order: number[];
  /** per line: discountId → cents */
  alloc: Map<string, number>[];
  /** discountId → cents actually given */
  amounts: Map<string, number>;
  shipping: number;
  fails: Map<string, Fail>;
}

const KIND_RANK: Record<DiscountKind, number> = { products: 0, bxgy: 1, order: 2, shipping: 3 };
const MAX_EXHAUSTIVE = 12;

function minimumFail(d: Discount, amountCents: number, qty: number): Fail | null {
  const m = d.minimum;
  if (!m || m.type === 'none' || !(m.value > 0)) return null;
  if (m.type === 'amount') {
    const need = toCents(m.value);
    return amountCents >= need ? null : { reason: 'minimum', minimumType: 'amount', missing: fromCents(need - amountCents) };
  }
  return qty >= m.value ? null : { reason: 'minimum', minimumType: 'qty', missing: Math.ceil(m.value - qty) };
}

const pct = (v: number) => Math.min(100, Math.max(0, v || 0));

function evaluate(set: Candidate[], lines: Line[], shippingCents: number, zoneId: string | null | undefined, standalone: Map<string, number>): Evaluation {
  const n = lines.length;
  const product = new Array<number>(n).fill(0);
  const order = new Array<number>(n).fill(0);
  const alloc = lines.map(() => new Map<string, number>());
  const amounts = new Map<string, number>();
  const fails = new Map<string, Fail>();
  const owner = new Array<string | null>(n).fill(null);

  const give = (i: number, id: string, cents: number, bucket: number[]) => {
    if (cents <= 0) return;
    bucket[i] += cents;
    alloc[i].set(id, (alloc[i].get(id) ?? 0) + cents);
    amounts.set(id, (amounts.get(id) ?? 0) + cents);
  };

  /* ---------- 2. product discounts (best standalone first) ---------- */
  const productSet = set
    .filter((c) => discountClass(c.d) === 'products')
    .sort((a, b) => (standalone.get(b.d.id) ?? 0) - (standalone.get(a.d.id) ?? 0) || a.idx - b.idx);

  for (const { d } of productSet) {
    if (d.kind === 'products') {
      const matching = lines.map((l, i) => (lineMatches(d.appliesTo, l) ? i : -1)).filter((i) => i >= 0);
      if (!matching.length) {
        fails.set(d.id, { reason: 'notEligible' });
        continue;
      }
      const free = matching.filter((i) => owner[i] === null);
      if (!free.length) {
        fails.set(d.id, { reason: 'notCombinable', conflictsWith: owner[matching[0]] ?? undefined });
        continue;
      }
      const base = free.reduce((s, i) => s + lines[i].cents - product[i], 0);
      const qty = free.reduce((s, i) => s + lines[i].qty, 0);
      const mf = minimumFail(d, base, qty);
      if (mf) {
        fails.set(d.id, mf);
        continue;
      }
      let given = 0;
      if (d.valueType === 'percent') {
        for (const i of free) {
          const c = Math.min(lines[i].cents, Math.round((lines[i].cents * pct(d.value)) / 100));
          give(i, d.id, c, product);
          given += c;
        }
      } else if (d.perItem) {
        for (const i of free) {
          const c = Math.min(lines[i].cents, toCents(d.value) * Math.max(0, Math.floor(lines[i].qty)));
          give(i, d.id, c, product);
          given += c;
        }
      } else {
        const shares = allocateCents(Math.min(toCents(d.value), base), free.map((i) => lines[i].cents));
        free.forEach((i, k) => {
          give(i, d.id, shares[k], product);
          given += shares[k];
        });
      }
      if (given <= 0) fails.set(d.id, { reason: 'notEligible' });
      else for (const i of free) if ((alloc[i].get(d.id) ?? 0) > 0) owner[i] = d.id;
      continue;
    }

    /* ----- Buy X get Y ----- */
    const b = d.bxgy;
    if (!b || !(b.buyQty > 0) || !(b.getQty > 0)) {
      fails.set(d.id, { reason: 'notEligible' });
      continue;
    }
    const isX = (l: Line) => lineMatches({ scope: b.buyScope, ids: b.buyIds }, l);
    const isY = (l: Line) => lineMatches({ scope: b.getScope, ids: b.getIds }, l);
    type Unit = { line: number; k: number; price: number; x: boolean; y: boolean };
    const units: Unit[] = [];
    lines.forEach((l, i) => {
      const count = Math.max(0, Math.floor(l.qty));
      if (!count) return;
      const x = isX(l);
      // Y units only on lines that don't already carry another product discount (one per line)
      const y = isY(l) && owner[i] === null;
      if (!x && !y) return;
      const unitBase = Math.floor(l.cents / count);
      const extra = l.cents - unitBase * count;
      for (let k = 0; k < count; k++) units.push({ line: i, k, price: unitBase + (k < extra ? 1 : 0), x, y });
    });
    const xTotal = units.filter((u) => u.x).length;
    if (!xTotal) {
      fails.set(d.id, { reason: 'notEligible' });
      continue;
    }
    if (xTotal < b.buyQty) {
      fails.set(d.id, { reason: 'minimum', minimumType: 'qty', missing: b.buyQty - xTotal });
      continue;
    }
    const used = new Set<Unit>();
    const yUnits: Unit[] = [];
    const xUnits: Unit[] = [];
    const maxApps = b.maxUses > 0 ? b.maxUses : Infinity;
    let apps = 0;
    while (apps < maxApps) {
      // X: units that can't be Y first, then the most expensive dual units — keeps the cheapest for Y
      const xs = units
        .filter((u) => u.x && !used.has(u))
        .sort((p, q) => Number(p.y) - Number(q.y) || q.price - p.price || p.line - q.line || p.k - q.k)
        .slice(0, b.buyQty);
      if (xs.length < b.buyQty) break;
      const xSet = new Set(xs);
      const ys = units
        .filter((u) => u.y && !used.has(u) && !xSet.has(u))
        .sort((p, q) => p.price - q.price || p.line - q.line || p.k - q.k)
        .slice(0, b.getQty);
      if (ys.length < b.getQty) break;
      xs.forEach((u) => used.add(u));
      ys.forEach((u) => used.add(u));
      xUnits.push(...xs);
      yUnits.push(...ys);
      apps++;
    }
    if (!apps) {
      // enough X but no (cheaper) Y in the cart → manual mode gives nothing
      fails.set(d.id, { reason: 'notEligible' });
      continue;
    }
    // optional extra minimum on the X items only (Y never counts)
    const xBase = units.filter((u) => u.x && !yUnits.includes(u)).reduce((s, u) => s + u.price, 0);
    const xQty = units.filter((u) => u.x && !yUnits.includes(u)).length;
    const mf = minimumFail(d, xBase, xQty);
    if (mf) {
      fails.set(d.id, mf);
      continue;
    }
    const perLine = new Map<number, number>();
    for (const u of yUnits) {
      const c = b.getType === 'free' ? u.price : Math.min(u.price, Math.round((u.price * pct(b.getValue)) / 100));
      perLine.set(u.line, (perLine.get(u.line) ?? 0) + c);
    }
    let given = 0;
    for (const [i, c] of perLine) {
      const cap = lines[i].cents - product[i];
      const v = Math.min(cap, c);
      give(i, d.id, v, product);
      given += v;
      if (v > 0) owner[i] = d.id;
    }
    if (given <= 0) fails.set(d.id, { reason: 'notEligible' });
  }

  /* ---------- 3. order discounts on the revised subtotal ---------- */
  const revised = lines.map((l, i) => l.cents - product[i]);
  const revisedTotal = revised.reduce((s, v) => s + v, 0);
  const orderSet = set
    .filter((c) => c.d.kind === 'order')
    // percentages first (same base), fixed amounts after
    .sort((a, b) => Number(a.d.valueType === 'fixed') - Number(b.d.valueType === 'fixed') || a.idx - b.idx);
  for (const { d } of orderSet) {
    const idxs = lines.map((l, i) => (lineMatches(d.appliesTo, l) ? i : -1)).filter((i) => i >= 0);
    const base = idxs.reduce((s, i) => s + revised[i], 0);
    if (!idxs.length || base <= 0) {
      fails.set(d.id, { reason: 'notEligible' });
      continue;
    }
    const mf = minimumFail(d, base, idxs.reduce((s, i) => s + lines[i].qty, 0));
    if (mf) {
      fails.set(d.id, mf);
      continue;
    }
    const cap = idxs.map((i) => revised[i] - order[i]);
    const capTotal = cap.reduce((s, v) => s + v, 0);
    const want = d.valueType === 'percent' ? Math.round((base * pct(d.value)) / 100) : toCents(d.value);
    const amount = Math.min(want, capTotal);
    if (amount <= 0) {
      fails.set(d.id, { reason: 'notEligible' });
      continue;
    }
    const shares = allocateCents(amount, cap);
    idxs.forEach((i, k) => give(i, d.id, shares[k], order));
  }

  /* ---------- 4. shipping (one rule) ---------- */
  let shipping = 0;
  const ship = set.find((c) => c.d.kind === 'shipping');
  if (ship) {
    const d = ship.d;
    const qty = lines.reduce((s, l) => s + l.qty, 0);
    const mf = minimumFail(d, revisedTotal, qty);
    if (shippingCents <= 0) fails.set(d.id, { reason: 'notEligible' });
    else if (d.shipping?.zoneIds?.length && (!zoneId || !d.shipping.zoneIds.includes(zoneId))) fails.set(d.id, { reason: 'notEligible' });
    else if (d.shipping?.maxRate != null && d.shipping.maxRate > 0 && shippingCents > toCents(d.shipping.maxRate)) fails.set(d.id, { reason: 'notEligible' });
    else if (mf) fails.set(d.id, mf);
    else {
      shipping = d.valueType === 'percent' ? Math.min(shippingCents, Math.round((shippingCents * pct(d.value)) / 100)) : Math.min(shippingCents, toCents(d.value));
      if (shipping > 0) amounts.set(d.id, shipping);
      else fails.set(d.id, { reason: 'notEligible' });
    }
  }

  const saving = product.reduce((s, v) => s + v, 0) + order.reduce((s, v) => s + v, 0) + shipping;
  return { saving, product, order, alloc, amounts, shipping, fails };
}

function compatible(set: Candidate[]): boolean {
  for (let a = 0; a < set.length; a++) for (let b = a + 1; b < set.length; b++) if (!canCombine(set[a].d, set[b].d)) return false;
  return true;
}

/**
 * Apply automatic discounts + entered codes to a cart.
 * Deterministic: same input → same output (no randomness, stable tie-breaks).
 */
export function applyDiscounts(input: DiscountInput): DiscountResult {
  const now = time(input.now);
  const lines: Line[] = input.lines.map((l) => ({
    id: l.id,
    productId: l.productId,
    qty: Math.max(0, l.qty || 0),
    cents: Math.max(0, toCents(l.total ?? l.unitPrice * l.qty)),
    collectionIds: l.collectionIds ?? [],
  }));
  const shippingCents = Math.max(0, toCents(input.shipping ?? 0));
  const rejected: RejectedDiscount[] = [];
  const reject = (c: { d?: Discount; code: string; auto: boolean }, f: Fail) =>
    rejected.push({ code: c.code, id: c.d?.id, title: c.d?.title, kind: c.d?.kind, auto: c.auto, ...f });

  /* ---------- candidates ---------- */
  const raw: Candidate[] = [];
  const all = input.discounts ?? [];
  for (const d of all) if (d.method === 'auto' && discountState(d, now) === 'active') raw.push({ d, code: '', auto: true, idx: raw.length });
  const seen = new Set<string>();
  for (const entered of input.codes ?? []) {
    const code = normalizeCode(entered);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const d = all.find((x) => x.method === 'code' && normalizeCode(x.code) === code);
    if (!d) {
      reject({ code, auto: false }, { reason: 'notfound' });
      continue;
    }
    const st = discountState(d, now);
    if (st === 'draft' || st === 'paused') reject({ d, code, auto: false }, { reason: 'inactive' });
    else if (st === 'scheduled' || st === 'expired') reject({ d, code, auto: false }, { reason: st });
    else raw.push({ d, code, auto: false, idx: raw.length });
  }
  const candidates: Candidate[] = [];
  for (const c of raw) {
    const d = c.d;
    if ((d.usageLimit != null && d.usageLimit > 0 && d.uses >= d.usageLimit) || (d.oncePerCustomer && input.customer?.usedDiscountIds?.includes(d.id))) {
      reject(c, { reason: 'usageLimit' });
    } else if (d.audience?.type === 'segment' && !(d.audience.segmentId && input.customer?.segmentIds?.includes(d.audience.segmentId))) {
      reject(c, { reason: 'audience' });
    } else candidates.push({ ...c, idx: candidates.length });
  }

  /* ---------- choose the best combination ---------- */
  const standalone = new Map<string, number>();
  const empty = evaluate([], lines, shippingCents, input.shippingZoneId, standalone);
  const singles = new Map<string, Evaluation>();
  for (const c of candidates) {
    const ev = evaluate([c], lines, shippingCents, input.shippingZoneId, standalone);
    singles.set(c.d.id, ev);
    standalone.set(c.d.id, ev.saving);
  }
  let best: { set: Candidate[]; ev: Evaluation } = { set: [], ev: empty };
  const consider = (set: Candidate[]) => {
    if (!set.length || !compatible(set)) return;
    const ev = set.length === 1 ? singles.get(set[0].d.id)! : evaluate(set, lines, shippingCents, input.shippingZoneId, standalone);
    if (ev.saving > best.ev.saving) best = { set, ev };
  };
  if (candidates.length <= MAX_EXHAUSTIVE) {
    for (let mask = 1; mask < 1 << candidates.length; mask++) consider(candidates.filter((_, i) => mask & (1 << i)));
  } else {
    // Large rule sets: greedy by standalone saving (still mutual-combination safe)
    const order = [...candidates].sort((a, b) => (standalone.get(b.d.id) ?? 0) - (standalone.get(a.d.id) ?? 0) || a.idx - b.idx);
    let set: Candidate[] = [];
    for (const c of order) {
      const next = [...set, c];
      if (!compatible(next)) continue;
      const ev = evaluate(next, lines, shippingCents, input.shippingZoneId, standalone);
      if (ev.saving > (set.length ? evaluate(set, lines, shippingCents, input.shippingZoneId, standalone).saving : 0)) set = next;
    }
    if (set.length) best = { set, ev: evaluate(set, lines, shippingCents, input.shippingZoneId, standalone) };
  }

  /* ---------- explain the ones that did not make it ---------- */
  const ev = best.ev;
  const appliedSet = best.set.filter((c) => (ev.amounts.get(c.d.id) ?? 0) > 0);
  for (const c of candidates) {
    if (appliedSet.includes(c)) continue;
    if (best.set.includes(c)) {
      reject(c, ev.fails.get(c.d.id) ?? { reason: 'notEligible' });
      continue;
    }
    const blocker = appliedSet.find((a) => !canCombine(a.d, c.d));
    if (blocker) {
      reject(c, { reason: 'notCombinable', conflictsWith: blocker.d.id });
      continue;
    }
    // compatible with the winners: try it alongside them to find out why it gives nothing extra
    const trial = evaluate([...appliedSet, c], lines, shippingCents, input.shippingZoneId, standalone);
    const f = trial.fails.get(c.d.id);
    if (f) reject(c, f);
    else reject(c, { reason: 'notCombinable', conflictsWith: appliedSet.find((a) => discountClass(a.d) === discountClass(c.d))?.d.id });
  }

  /* ---------- result in EUR ---------- */
  const applied: AppliedDiscount[] = appliedSet
    .slice()
    .sort((a, b) => KIND_RANK[a.d.kind] - KIND_RANK[b.d.kind] || a.idx - b.idx)
    .map((c) => ({ id: c.d.id, title: c.d.title, kind: c.d.kind, ...(c.code ? { code: c.code } : c.d.code ? { code: normalizeCode(c.d.code) } : {}), amount: fromCents(ev.amounts.get(c.d.id) ?? 0) }));

  const outLines: DiscountLineResult[] = lines.map((l, i) => {
    const disc = ev.product[i] + ev.order[i];
    return {
      id: l.id,
      productId: l.productId,
      qty: l.qty,
      subtotal: fromCents(l.cents),
      productDiscount: fromCents(ev.product[i]),
      orderDiscount: fromCents(ev.order[i]),
      discount: fromCents(disc),
      total: fromCents(l.cents - disc),
      allocations: [...ev.alloc[i]].filter(([, c]) => c > 0).map(([discountId, c]) => ({ discountId, amount: fromCents(c) })),
    };
  });
  const subtotal = lines.reduce((s, l) => s + l.cents, 0);
  const productCents = ev.product.reduce((s, v) => s + v, 0);
  const orderCents = ev.order.reduce((s, v) => s + v, 0);
  return {
    lines: outLines,
    subtotal: fromCents(subtotal),
    productDiscount: fromCents(productCents),
    orderDiscount: fromCents(orderCents),
    shippingDiscount: fromCents(ev.shipping),
    discountTotal: fromCents(productCents + orderCents),
    shipping: fromCents(shippingCents - ev.shipping),
    total: fromCents(subtotal - productCents - orderCents + shippingCents - ev.shipping),
    applied,
    rejected,
  };
}

/* ================================================================== */
/* Convenience for the admin                                           */
/* ================================================================== */

/** Human summary helpers can use: "−10%", "−25 €", "Free", "Buy 3 get 1". Returns the numeric parts only. */
export function discountValueLabel(d: Discount): { type: 'percent' | 'fixed' | 'free' | 'bxgy'; value: number } {
  if (d.kind === 'bxgy') return { type: 'bxgy', value: d.bxgy?.getType === 'percent' ? d.bxgy.getValue : 100 };
  if (d.kind === 'shipping' && d.valueType === 'percent' && d.value >= 100) return { type: 'free', value: 100 };
  return { type: d.valueType, value: d.value };
}

/** True when a code is already used by another discount (case/space-insensitive). */
export function isDuplicateCode(code: string, discounts: Discount[], exceptId?: string) {
  const c = normalizeCode(code);
  return !!c && discounts.some((d) => d.id !== exceptId && d.method === 'code' && normalizeCode(d.code) === c);
}
