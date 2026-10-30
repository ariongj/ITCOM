// Inventory levels — CMS proposal p.15: Available = On hand − Committed − Unavailable.
// Storefront orders reserve stock at checkout (product.stock already excludes them), so:
//   committed = units in open orders (new / confirmed / processing)
//   onHand    = stock + committed   (still physically in the warehouse until shipped)
//   available = stock − unavailable
import type { Order, Product, PurchaseOrder } from './types';
import { isOpenOrder } from './orders';

/** Products with stock ≥ 999 are made to order / not stock-tracked. */
export const UNTRACKED_STOCK = 999;
export const isTracked = (p: Pick<Product, 'stock'>) => p.stock < UNTRACKED_STOCK;

export interface StockLevels {
  onHand: number;
  committed: number;
  unavailable: number;
  available: number;
  incoming: number;
  tracked: boolean;
}

/** productId → units in open orders */
export function committedByProduct(orders: Order[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (!isOpenOrder(o)) continue;
    for (const l of o.items) if (l.productId) map.set(l.productId, (map.get(l.productId) ?? 0) + l.qty);
  }
  return map;
}

export function stockLevels(p: Product, committed: Map<string, number> | number = 0): StockLevels {
  const c = typeof committed === 'number' ? committed : committed.get(p.id) ?? 0;
  const tracked = isTracked(p);
  const unavailable = p.unavailable ?? 0;
  return {
    tracked,
    committed: c,
    unavailable,
    onHand: tracked ? p.stock + c : p.stock,
    available: tracked ? Math.max(0, p.stock - unavailable) : p.stock,
    incoming: p.incoming ?? 0,
  };
}

/** Units still expected from open purchase orders, per product. */
export function incomingByProduct(pos: PurchaseOrder[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const po of pos) {
    if (po.status === 'draft' || po.status === 'closed') continue;
    for (const l of po.lines) {
      const left = Math.max(0, l.ordered - l.received - l.rejected);
      if (left) map.set(l.productId, (map.get(l.productId) ?? 0) + left);
    }
  }
  return map;
}

/** PO totals for lists. */
export function purchaseOrderTotals(po: PurchaseOrder) {
  const ordered = po.lines.reduce((s, l) => s + l.ordered, 0);
  const received = po.lines.reduce((s, l) => s + l.received, 0);
  const rejected = po.lines.reduce((s, l) => s + l.rejected, 0);
  const cost = Math.round(po.lines.reduce((s, l) => s + l.ordered * l.cost, 0) * 100) / 100;
  return { ordered, received, rejected, cost, progress: ordered ? (received + rejected) / ordered : 0 };
}
