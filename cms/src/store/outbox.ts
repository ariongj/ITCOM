import type { Inquiry, InventoryMovement, Order } from '@/lib/types';
import { useDb } from './db';

/**
 * ITCOM: orders and quote requests sent from the shop before the CMS was first opened in this browser wait in
 * localStorage["itcom-shop-outbox"] (see js/cms-bridge.js). They are imported once, keeping the number the customer
 * saw (renumbered only on a clash), with stock taken off the products they contain.
 */
const KEY = 'itcom-shop-outbox';

export function importShopOutbox() {
  let box: { orders?: Order[]; inquiries?: Inquiry[] } | null = null;
  try {
    box = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    box = null;
  }
  if (!box || (!box.orders?.length && !box.inquiries?.length)) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  useDb.setState((s) => {
    const prefix = s.settings.orderPrefix || 'IT-';
    let next = Math.max(1000, ...s.orders.map((o) => parseInt(o.number.replace(/\D/g, ''), 10) || 0), ...(box!.orders ?? []).map((o) => parseInt(o.number.replace(/\D/g, ''), 10) || 0)) + 1;
    const products = s.products.map((p) => ({ ...p }));
    const movements: InventoryMovement[] = [];
    const orders = (box!.orders ?? [])
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
    return {
      orders: [...orders, ...s.orders],
      inquiries: [...(box!.inquiries ?? []), ...s.inquiries],
      products,
      movements: [...movements, ...s.movements],
    };
  });
}
