/**
 * Discount engine checks — numeric examples from the CMS proposal p.26 plus edge cases (p.25–26).
 *
 *   node --experimental-strip-types src/lib/__tests__/discounts.check.ts
 *
 * The engine is imported at runtime through a URL so this file also type-checks under the
 * project's tsconfig (which forbids `.ts` import specifiers).
 */
import type * as Engine from '../discounts';
import type { Discount } from '../types';

const { applyDiscounts, allocateCents, normalizeCode } = (await import(new URL('../discounts.ts', import.meta.url).href)) as typeof Engine;

const BASE: Discount = {
  id: '',
  title: '',
  publicTitle: { me: '', sq: '', en: '' },
  kind: 'order',
  method: 'auto',
  valueType: 'percent',
  value: 0,
  appliesTo: { scope: 'all', ids: [] },
  minimum: { type: 'none', value: 0 },
  audience: { type: 'all' },
  combines: { products: true, order: true, shipping: true },
  startsAt: '2026-01-01T00:00:00.000Z',
  status: 'active',
  uses: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};
const D = (p: Partial<Discount> & { id: string }): Discount => ({ ...BASE, title: p.id, ...p });
const NOW = '2026-10-05T10:00:00.000Z';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
  }
}
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;
function section(title: string) {
  console.log(`\n${title}`);
}

/* ------------------------------------------------------------------ */
section('PDF p.26 · 01 Combination allowed — A €100, B €50, A −20%, order −10%, shipping €5 free → €117');
{
  const r = applyDiscounts({
    now: NOW,
    lines: [
      { id: 'A', productId: 'A', qty: 1, unitPrice: 100 },
      { id: 'B', productId: 'B', qty: 1, unitPrice: 50 },
    ],
    shipping: 5,
    discounts: [
      D({ id: 'prodA20', kind: 'products', valueType: 'percent', value: 20, appliesTo: { scope: 'products', ids: ['A'] } }),
      D({ id: 'order10', kind: 'order', valueType: 'percent', value: 10 }),
      D({ id: 'ship', kind: 'shipping', valueType: 'percent', value: 100 }),
    ],
  });
  check('product discount on A = €20', eq(r.productDiscount, 20), r.productDiscount);
  check('revised subtotal = €130', eq(r.subtotal - r.productDiscount, 130));
  check('order discount 10% of €130 = €13', eq(r.orderDiscount, 13), r.orderDiscount);
  check('shipping discount = €5 → shipping €0', eq(r.shippingDiscount, 5) && eq(r.shipping, 0));
  check('to pay = €117', eq(r.total, 117), r.total);
  check('all three rules applied, in calculation order', r.applied.map((a) => a.id).join(',') === 'prodA20,order10,ship', r.applied);
  const a = r.lines[0];
  const b = r.lines[1];
  check('order discount allocated proportionally (A 8.00 / B 5.00)', eq(a.orderDiscount, 8) && eq(b.orderDiscount, 5), [a.orderDiscount, b.orderDiscount]);
  check('line allocations stored per rule', a.allocations.length === 2 && b.allocations.length === 1);
}

/* ------------------------------------------------------------------ */
section('PDF p.26 · 02 No combination — €100 cart, code A −€20, code B −15% → A wins, €80');
{
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'l1', productId: 'X', qty: 1, unitPrice: 100 }],
    codes: ['a20', ' B15 '],
    discounts: [
      D({ id: 'A', method: 'code', code: 'A20', kind: 'order', valueType: 'fixed', value: 20, combines: { products: false, order: false, shipping: false } }),
      D({ id: 'B', method: 'code', code: 'B15', kind: 'order', valueType: 'percent', value: 15, combines: { products: false, order: false, shipping: false } }),
    ],
  });
  check('A applied (−€20)', r.applied.length === 1 && r.applied[0].id === 'A' && eq(r.applied[0].amount, 20), r.applied);
  check('to pay = €80 (B would give €85)', eq(r.total, 80), r.total);
  const rb = r.rejected.find((x) => x.id === 'B');
  check('B rejected as notCombinable, blocked by A', rb?.reason === 'notCombinable' && rb.conflictsWith === 'A', rb);
  check('codes normalised (trim + uppercase)', r.applied[0].code === 'A20' && rb?.code === 'B15');
}
{
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'l1', productId: 'X', qty: 1, unitPrice: 100 }],
    shipping: 10,
    codes: ['SHIP5'],
    discounts: [
      D({ id: 'shipFree', kind: 'shipping', valueType: 'percent', value: 100 }),
      D({ id: 'ship5', method: 'code', code: 'SHIP5', kind: 'shipping', valueType: 'fixed', value: 5 }),
    ],
  });
  check('two shipping discounts do not add up — best one (free) wins', eq(r.shippingDiscount, 10) && r.applied.length === 1 && r.applied[0].id === 'shipFree', r.applied);
  check('the other shipping code is explained (notCombinable)', r.rejected.find((x) => x.id === 'ship5')?.reason === 'notCombinable', r.rejected);
}

/* ------------------------------------------------------------------ */
section('PDF p.26 · 03 Fixed amount / Buy X get Y');
{
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'l1', productId: 'X', qty: 1, unitPrice: 30 }],
    codes: ['MINUS50'],
    discounts: [D({ id: 'm50', method: 'code', code: 'MINUS50', kind: 'order', valueType: 'fixed', value: 50 })],
  });
  check('€30 cart with −€50 code → items cost €0', eq(r.total, 0), r.total);
  check('discount capped at €30, no negative balance', eq(r.orderDiscount, 30) && r.lines[0].total >= 0, r.orderDiscount);
}
const bxgy = D({
  id: 'b2g1',
  kind: 'bxgy',
  combines: { products: false, order: true, shipping: true },
  bxgy: { buyIds: ['X'], buyScope: 'products', buyQty: 2, getIds: ['Y'], getScope: 'products', getQty: 1, getType: 'free', getValue: 100, maxUses: 1 },
});
{
  const r = applyDiscounts({
    now: NOW,
    lines: [
      { id: 'x', productId: 'X', qty: 2, unitPrice: 20 },
      { id: 'y', productId: 'Y', qty: 1, unitPrice: 10 },
    ],
    discounts: [bxgy],
  });
  check('X 2 × €20 + Y €10 → base €50', eq(r.subtotal, 50));
  check('Y free → discount €10', eq(r.productDiscount, 10), r.productDiscount);
  check('to pay = €40', eq(r.total, 40), r.total);
  check('discount sits on the Y line only', eq(r.lines[1].discount, 10) && eq(r.lines[0].discount, 0));
}
{
  const r = applyDiscounts({ now: NOW, lines: [{ id: 'x', productId: 'X', qty: 2, unitPrice: 20 }], discounts: [bxgy] });
  check('without Y in the cart → no discount (manual mode)', eq(r.productDiscount, 0) && eq(r.total, 40) && r.applied.length === 0);
  check('explained as notEligible', r.rejected[0]?.reason === 'notEligible', r.rejected);
}
{
  const r = applyDiscounts({ now: NOW, lines: [{ id: 'x', productId: 'X', qty: 1, unitPrice: 20 }, { id: 'y', productId: 'Y', qty: 1, unitPrice: 10 }], discounts: [bxgy] });
  check('only 1 of 2 X items → minimum, 1 item missing', r.rejected[0]?.reason === 'minimum' && r.rejected[0].missing === 1, r.rejected);
}
{
  // X and Y share products: buy 2 get 1 from the same group — no double counting, cheapest unit is Y
  const same = D({ id: 'same', kind: 'bxgy', bxgy: { buyIds: ['col'], buyScope: 'collections', buyQty: 2, getIds: ['col'], getScope: 'collections', getQty: 1, getType: 'free', getValue: 100, maxUses: 5 } });
  const r = applyDiscounts({
    now: NOW,
    lines: [
      { id: 'a', productId: 'A', qty: 2, unitPrice: 50, collectionIds: ['col'] },
      { id: 'b', productId: 'B', qty: 1, unitPrice: 30, collectionIds: ['col'] },
    ],
    discounts: [same],
  });
  check('shared X/Y: 3 units → one application, cheapest (€30) free', eq(r.productDiscount, 30) && eq(r.lines[1].discount, 30), r.lines);
}

/* ------------------------------------------------------------------ */
section('Threshold exactly at the boundary (order minimum €100 after product discounts)');
{
  const code = D({ id: 'M10', method: 'code', code: 'MIFTARI10', kind: 'order', valueType: 'percent', value: 10, minimum: { type: 'amount', value: 100 } });
  const at = applyDiscounts({ now: NOW, lines: [{ id: 'l', productId: 'P', qty: 1, unitPrice: 100 }], codes: ['miftari10'], discounts: [code] });
  check('€100.00 → applies (−€10)', eq(at.orderDiscount, 10), at.rejected);
  const below = applyDiscounts({ now: NOW, lines: [{ id: 'l', productId: 'P', qty: 1, unitPrice: 99.99 }], codes: ['MIFTARI10'], discounts: [code] });
  check('€99.99 → minimum, €0.01 missing', below.rejected[0]?.reason === 'minimum' && eq(below.rejected[0].missing ?? 0, 0.01), below.rejected);
  const afterProduct = applyDiscounts({
    now: NOW,
    lines: [{ id: 'l', productId: 'P', qty: 1, unitPrice: 110 }],
    codes: ['MIFTARI10'],
    discounts: [code, D({ id: 'auto15', kind: 'products', valueType: 'percent', value: 15 })],
  });
  check('€110 − 15% product discount = €93.50 → order code below minimum (€6.50 missing)', afterProduct.rejected.find((x) => x.id === 'M10')?.reason === 'minimum' && eq(afterProduct.rejected[0].missing ?? 0, 6.5), afterProduct.rejected);
  const ship = applyDiscounts({
    now: NOW,
    lines: [{ id: 'l', productId: 'P', qty: 1, unitPrice: 160 }],
    shipping: 4,
    discounts: [D({ id: 'free150', kind: 'shipping', valueType: 'percent', value: 100, minimum: { type: 'amount', value: 150 } }), D({ id: 'p10', kind: 'products', valueType: 'percent', value: 10 })],
  });
  check('free-shipping threshold uses subtotal after product discounts (€144 < €150)', eq(ship.shippingDiscount, 0) && ship.rejected.find((x) => x.id === 'free150')?.reason === 'minimum', ship.rejected);
}

/* ------------------------------------------------------------------ */
section('Cents — deterministic allocation, never negative');
{
  check('allocateCents(100, [333,333,333]) = [34,33,33]', allocateCents(100, [333, 333, 333]).join(',') === '34,33,33', allocateCents(100, [333, 333, 333]));
  const r = applyDiscounts({
    now: NOW,
    lines: [
      { id: 'a', productId: 'A', qty: 1, unitPrice: 3.33 },
      { id: 'b', productId: 'B', qty: 1, unitPrice: 3.33 },
      { id: 'c', productId: 'C', qty: 1, unitPrice: 3.33 },
    ],
    codes: ['ONE'],
    discounts: [D({ id: 'one', method: 'code', code: 'ONE', kind: 'order', valueType: 'fixed', value: 1 })],
  });
  const al = r.lines.map((l) => l.orderDiscount);
  check('€1 over 3 × €3.33 → 0.34 / 0.33 / 0.33 (sum exactly €1.00)', al.join(',') === '0.34,0.33,0.33' && eq(al.reduce((s, v) => s + v, 0), 1), al);
  const p = applyDiscounts({
    now: NOW,
    lines: [
      { id: 'a', productId: 'A', qty: 3, unitPrice: 10.9, total: 72.59 },
      { id: 'b', productId: 'B', qty: 1, unitPrice: 189 },
    ],
    discounts: [D({ id: 'o15', kind: 'order', valueType: 'percent', value: 15 })],
  });
  const sum = p.lines.reduce((s, l) => s + Math.round(l.orderDiscount * 100), 0);
  check('15% of €261.59 = €39.24 and line shares add up to the cent', eq(p.orderDiscount, 39.24) && sum === 3924, p.lines.map((l) => l.orderDiscount));
  const fx = applyDiscounts({
    now: NOW,
    lines: [{ id: 'a', productId: 'A', qty: 2, unitPrice: 4 }],
    discounts: [D({ id: 'per', kind: 'products', valueType: 'fixed', value: 5, perItem: true })],
  });
  check('fixed €5 per item on a €4 item → capped at the line (€8), total €0', eq(fx.productDiscount, 8) && eq(fx.total, 0));
}

/* ------------------------------------------------------------------ */
section('One product discount per line · best value');
{
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'a', productId: 'A', qty: 1, unitPrice: 100, collectionIds: ['sun'] }],
    discounts: [
      D({ id: 'p10', kind: 'products', valueType: 'percent', value: 10 }),
      D({ id: 'p15', kind: 'products', valueType: 'percent', value: 15, appliesTo: { scope: 'collections', ids: ['sun'] } }),
    ],
  });
  check('two combinable product rules on one line → only the better one (15%)', eq(r.productDiscount, 15) && r.applied.length === 1 && r.applied[0].id === 'p15', r.applied);
  check('the other is explained', r.rejected[0]?.id === 'p10' && r.rejected[0].reason === 'notCombinable', r.rejected);
}
{
  // Different product discounts on different lines (p.23 base policy) — the demo's rules: sunglasses −20%
  // (smart collection col-dielli-fund-sezoni) + BXGY "optical frame → single-vision lenses −50%"
  const r = applyDiscounts({
    now: NOW,
    lines: [
      { id: 'sun', productId: 'p-lumen-l11', qty: 1, unitPrice: 285.45, collectionIds: ['col-dielli-fund-sezoni'] },
      { id: 'frame', productId: 'p-prism-m2', qty: 1, unitPrice: 320 },
      { id: 'lens', productId: 'p-lens-single', qty: 1, unitPrice: 80 },
    ],
    discounts: [
      D({ id: 'd-dielli20', kind: 'products', valueType: 'percent', value: 20, appliesTo: { scope: 'collections', ids: ['col-dielli-fund-sezoni'] } }),
      D({
        id: 'd-korniza-lente',
        kind: 'bxgy',
        bxgy: { buyIds: ['p-prism-m2', 'p-nova-n04', 'p-origin-o06'], buyScope: 'products', buyQty: 1, getIds: ['p-lens-single'], getScope: 'products', getQty: 1, getType: 'percent', getValue: 50, maxUses: 2 },
      }),
    ],
  });
  check(
    'two product rules on different lines both apply (−€57.09 sunglasses, −€40 lenses, frame untouched)',
    r.applied.length === 2 && eq(r.lines[0].productDiscount, 57.09) && eq(r.lines[2].productDiscount, 40) && eq(r.lines[1].productDiscount, 0),
    r.applied,
  );
}
{
  // Best monetary saving, not the highest percentage
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'a', productId: 'A', qty: 1, unitPrice: 60 }],
    codes: ['PCT20', 'EUR15'],
    discounts: [
      D({ id: 'pct', method: 'code', code: 'PCT20', kind: 'order', valueType: 'percent', value: 20, combines: { products: true, order: false, shipping: true } }),
      D({ id: 'eur', method: 'code', code: 'EUR15', kind: 'order', valueType: 'fixed', value: 15, combines: { products: true, order: false, shipping: true } }),
    ],
  });
  check('€60 cart: −€15 fixed beats −20% (€12)', r.applied[0]?.id === 'eur' && eq(r.total, 45), r.applied);
}
{
  // Mutual combination: A allows B but B does not allow A → no stacking
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'a', productId: 'A', qty: 1, unitPrice: 200 }],
    codes: ['ORD'],
    discounts: [
      D({ id: 'auto', kind: 'products', valueType: 'percent', value: 10, combines: { products: false, order: true, shipping: true } }),
      D({ id: 'ord', method: 'code', code: 'ORD', kind: 'order', valueType: 'percent', value: 10, combines: { products: false, order: false, shipping: true } }),
    ],
  });
  check('combination must be mutual — only one rule applies', r.applied.length === 1 && r.rejected[0]?.reason === 'notCombinable', { applied: r.applied, rejected: r.rejected });
}

/* ------------------------------------------------------------------ */
section('Rejection reasons');
{
  const r = applyDiscounts({
    now: NOW,
    lines: [{ id: 'a', productId: 'A', qty: 1, unitPrice: 100 }],
    codes: ['NOPE', 'DRAFT', 'LATER', 'OLD', 'FULL', 'VIP', 'draft'],
    customer: { segmentIds: [] },
    discounts: [
      D({ id: 'draft', method: 'code', code: 'DRAFT', status: 'draft', value: 5 }),
      D({ id: 'later', method: 'code', code: 'LATER', startsAt: '2026-12-01T00:00:00.000Z', value: 5 }),
      D({ id: 'old', method: 'code', code: 'OLD', endsAt: '2026-09-01T00:00:00.000Z', value: 5 }),
      D({ id: 'full', method: 'code', code: 'FULL', usageLimit: 10, uses: 10, value: 5 }),
      D({ id: 'vip', method: 'code', code: 'VIP', audience: { type: 'segment', segmentId: 'seg-vip' }, value: 5 }),
    ],
  });
  const reasons = Object.fromEntries(r.rejected.map((x) => [x.code, x.reason]));
  check('notfound', reasons.NOPE === 'notfound');
  check('inactive (draft)', reasons.DRAFT === 'inactive');
  check('scheduled', reasons.LATER === 'scheduled');
  check('expired', reasons.OLD === 'expired');
  check('usageLimit', reasons.FULL === 'usageLimit');
  check('audience', reasons.VIP === 'audience');
  check('duplicate code entered twice is ignored', r.rejected.filter((x) => x.code === 'DRAFT').length === 1);
  check('nothing applied, total unchanged', r.applied.length === 0 && eq(r.total, 100));
  check('normalizeCode(" miftari 10 ") = "MIFTARI10"', normalizeCode(' miftari 10 ') === 'MIFTARI10');
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
