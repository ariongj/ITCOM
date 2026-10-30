import { useMemo } from 'react';
import { useDb } from '@/store/db';
import { committedByProduct, incomingByProduct, stockLevels, type StockLevels } from '@/lib/inventory';
import type { Product } from '@/lib/types';
import { locationIdFor, stockState, type StockState } from './helpers';

export interface InvRow {
  p: Product;
  /** levels with `incoming` taken from open purchase orders */
  lv: StockLevels;
  state: StockState;
  locationId?: string;
}

/** Stock levels for every product: committed from open orders, incoming from open purchase orders. */
export function useInventoryRows(): InvRow[] {
  const products = useDb((s) => s.products);
  const orders = useDb((s) => s.orders);
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const locations = useDb((s) => s.settings.locations);
  return useMemo(() => {
    const committed = committedByProduct(orders);
    const incoming = incomingByProduct(purchaseOrders);
    return products.map((p) => {
      const lv = { ...stockLevels(p, committed), incoming: incoming.get(p.id) ?? 0 };
      return { p, lv, state: stockState(lv), locationId: lv.tracked ? locationIdFor(p, purchaseOrders, locations) : undefined };
    });
  }, [products, orders, purchaseOrders, locations]);
}

/** One product's row (or undefined). */
export function useInventoryRow(productId: string | null | undefined): InvRow | undefined {
  const rows = useInventoryRows();
  return useMemo(() => (productId ? rows.find((r) => r.p.id === productId) : undefined), [rows, productId]);
}
