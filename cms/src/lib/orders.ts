// Derived order states (CMS proposal p.17: order, payment and fulfilment are three separate things)
// plus money helpers for returns/refunds. Pure — type imports only.
import type { FulfillmentState, Order, OrderLine, PaymentState } from './types';

export const FULFILLMENT_STATES: FulfillmentState[] = ['unfulfilled', 'partial', 'fulfilled', 'delivered'];
export const PAYMENT_STATES: PaymentState[] = ['pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed'];

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Fulfilment is derived from the order status:
 * new / confirmed / processing → unfulfilled · shipped / installation → fulfilled ·
 * completed → delivered · cancelled → unfulfilled. A shipment flagged partial → 'partial'.
 */
export function fulfillmentOf(o: Pick<Order, 'status' | 'fulfillment'>): FulfillmentState {
  switch (o.status) {
    case 'shipped':
    case 'installation':
      return o.fulfillment?.partial ? 'partial' : 'fulfilled';
    case 'completed':
      return 'delivered';
    default:
      return o.fulfillment?.partial && o.status !== 'cancelled' ? 'partial' : 'unfulfilled';
  }
}

/** Total refunded so far (EUR). */
export function refundedOf(o: Pick<Order, 'payment' | 'refunds' | 'total'>): number {
  if (o.payment.refunded != null) return r2(o.payment.refunded);
  const fromList = (o.refunds ?? []).reduce((s, x) => s + x.amount, 0);
  if (fromList) return r2(fromList);
  return o.payment.status === 'refunded' ? o.total : 0;
}

/**
 * Payment state, mapped from the stored payment:
 * failed → 'failed' · refunded (fully) → 'refunded' · some money refunded → 'partially_refunded' ·
 * paid → 'paid' · pending card authorisation → 'authorized' · otherwise 'pending'.
 */
export function paymentOf(o: Pick<Order, 'payment' | 'refunds' | 'total'>): PaymentState {
  const p = o.payment;
  if (p.failed && p.status === 'pending') return 'failed';
  const refunded = refundedOf(o);
  if (p.status === 'refunded' || (refunded > 0 && refunded >= o.total - 0.005)) return 'refunded';
  if (refunded > 0) return 'partially_refunded';
  if (p.status === 'paid') return 'paid';
  if (p.authorized || (p.method === 'card' && p.status === 'pending')) return 'authorized';
  return 'pending';
}

/** Units a line represents: m² for packaged products, otherwise the quantity. */
export const orderLineUnits = (l: OrderLine) => (l.unit === 'm2' && l.packSize ? r2(l.qty * l.packSize) : l.qty);

/** Installation amount of a line (EUR). */
export const orderLineInstallation = (l: OrderLine) => (l.installation && l.installationPrice ? r2(l.installationPrice * orderLineUnits(l)) : 0);

/**
 * Discount carried by a line. New orders store it (`line.discount`); older orders only have the
 * order total, so it is spread proportionally over the product lines.
 */
export function orderLineDiscount(o: Pick<Order, 'items' | 'discount' | 'subtotal'>, index: number): number {
  const l = o.items[index];
  if (!l) return 0;
  if (l.discount != null) return l.discount;
  if (!o.discount || !o.subtotal) return 0;
  return r2((o.discount * l.lineTotal) / o.subtotal);
}

/** What the customer actually paid for a line: products + installation − discounts (EUR). */
export function orderLineNet(o: Pick<Order, 'items' | 'discount' | 'subtotal'>, index: number): number {
  const l = o.items[index];
  if (!l) return 0;
  return Math.max(0, r2(l.lineTotal + orderLineInstallation(l) - orderLineDiscount(o, index)));
}

/**
 * Refund for returned quantities — uses the net paid amount of the returned lines (after discounts),
 * never the current offer (PDF p.24). Shipping is not refunded.
 */
export function refundForLines(o: Pick<Order, 'items' | 'discount' | 'subtotal'>, lines: { productId: string; qty: number }[]): number {
  let total = 0;
  for (const want of lines) {
    let left = want.qty;
    o.items.forEach((l, i) => {
      if (left <= 0 || l.productId !== want.productId || !l.qty) return;
      const take = Math.min(left, l.qty);
      total += (orderLineNet(o, i) / l.qty) * take;
      left -= take;
    });
  }
  return r2(total);
}

/** Order is still open for fulfilment (counts as "committed" stock). */
export const isOpenOrder = (o: Pick<Order, 'status'>) => o.status === 'new' || o.status === 'confirmed' || o.status === 'processing';
