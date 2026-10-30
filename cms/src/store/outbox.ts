import type { Booking, Inquiry, InventoryMovement, Order } from '@/lib/types';
import { useDb } from './db';

/**
 * ITCOM: orders and quote requests sent from the shop before the CMS was first opened in this browser wait in
 * localStorage["itcom-shop-outbox"] (see js/cms-bridge.js). They are imported once, keeping the number the customer
 * saw (renumbered only on a clash), with stock taken off the products they contain.
 */
const KEY = 'itcom-shop-outbox';

export function importShopOutbox() {
  let box: ShopRecords | null = null;
  try {
    box = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    box = null;
  }
  if (!box || (!box.orders?.length && !box.inquiries?.length && !box.bookings?.length)) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  importShopRecords(box);
}

/** Records sent by the shop: { orders, inquiries, bookings: [{ booking, inquiry }] } (outbox or the order channel). */
export interface ShopRecords {
  orders?: Order[];
  inquiries?: Inquiry[];
  bookings?: { booking: Booking; inquiry: Inquiry }[];
}

/** Merge shop records into the CMS, skipping ids that are already there. Returns how many were new. */
export function importShopRecords(input: ShopRecords): number {
  let added = 0;
  useDb.setState((s) => {
    const seen = new Set([...s.orders.map((o) => o.id), ...s.inquiries.map((q) => q.id), ...s.bookings.map((b) => b.id)]);
    // New ids only, once each (the channel can deliver the same record twice).
    const fresh = (id: string | undefined) => !!id && !seen.has(id) && !!seen.add(id);
    const box: ShopRecords = {
      orders: (input.orders ?? []).filter((o) => fresh(o?.id)),
      inquiries: (input.inquiries ?? []).filter((q) => fresh(q?.id)),
      bookings: (input.bookings ?? []).filter((b) => fresh(b?.booking?.id)),
    };
    added = box.orders!.length + box.inquiries!.length + box.bookings!.length;
    if (!added) return {};
    const prefix = s.settings.orderPrefix || 'IT-';
    let next = Math.max(1000, ...s.orders.map((o) => parseInt(o.number.replace(/\D/g, ''), 10) || 0), ...(box.orders ?? []).map((o) => parseInt(o.number.replace(/\D/g, ''), 10) || 0)) + 1;
    const products = s.products.map((p) => ({ ...p }));
    const movements: InventoryMovement[] = [];
    const orders = (box.orders ?? [])
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((o) => {
        // keep the number the customer was shown, unless it is already taken
        const taken = s.orders.some((x) => x.number === o.number);
        const order = taken ? { ...o, number: `${prefix}${next++}` } : o;
        for (const l of order.items) {
          const p = products.find((x) => x.id === l.productId);
          if (!p) continue;
          p.stock = Math.max(0, p.stock - l.qty);
          p.sold = (p.sold || 0) + l.qty;
          movements.push({ id: `mv-web-${order.id}-${p.id}`, productId: p.id, delta: -l.qty, reason: 'sale', at: order.createdAt, by: 'web', ref: order.number });
        }
        return order;
      })
      .reverse();
    const usage = new Map<string, number>();
    for (const o of orders) for (const a of o.discounts ?? []) usage.set(a.id, (usage.get(a.id) ?? 0) + 1);
    return {
      orders: [...orders, ...s.orders],
      inquiries: [...(box.bookings ?? []).map((b) => b.inquiry), ...(box.inquiries ?? []), ...s.inquiries],
      bookings: [...(box.bookings ?? []).map((b) => b.booking), ...s.bookings],
      discounts: usage.size ? s.discounts.map((d) => (usage.has(d.id) ? { ...d, uses: d.uses + usage.get(d.id)! } : d)) : s.discounts,
      products,
      movements: [...movements, ...s.movements],
    };
  });
  return added;
}
