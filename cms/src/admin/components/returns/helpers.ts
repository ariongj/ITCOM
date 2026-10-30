// Returns helpers (PDF p.17 "Kthim: kërkesë, miratim, pranim, kontroll dhe vendim për stok" · p.24 "Rimbursimi përdor
// pagesën neto të artikullit të kthyer; nuk rillogarit ofertën aktuale").
import { lt } from '@/i18n';
import { fold } from '@/lib/search';
import { orderLineDiscount, orderLineInstallation, refundForLines, refundedOf } from '@/lib/orders';
import type { Lang, Order, OrderLine, Product, ReturnRequest, ReturnStatus } from '@/lib/types';

export const RETURN_FLOW: ReturnStatus[] = ['requested', 'approved', 'received', 'refunded'];
export const RETURN_STATUSES: ReturnStatus[] = [...RETURN_FLOW, 'rejected'];

/** `surplus` is kept as the stored key; for the optician it means a lens adaptation / prescription issue. */
export const REASONS = ['damaged', 'shade', 'size', 'surplus', 'mind', 'other'] as const;
export type ReasonKey = (typeof REASONS)[number];

/** Best-effort reason category from free text (seeded/imported reasons are written by people in any language). */
export function reasonKey(text: string): ReasonKey {
  const f = fold(text);
  if (/ostecen|demtu|damag|broken|thyer|slomljen|ogreb/.test(f)) return 'damaged';
  if (/nijans|nuanc|shade|model|boj[aeu]|ngjyr|colou?r/.test(f)) return 'shade';
  if (/mjer|\bmase\b|size|dimenz|velicin|madhesi|pristaj|pershtat|gjere|ngusht|sirok|uzak|\bfit\b|wide|narrow/.test(f)) return 'size';
  if (/adapt|recet|dioptri|prescription|navik|visak|tepert|surplus/.test(f)) return 'surplus';
  if (/odusta|mendje|changed (their|his|her) mind|predomisl/.test(f)) return 'mind';
  return 'other';
}

/** Order lines grouped by product (a return line references a product, an order may list it twice with other options). */
export interface ReturnableGroup {
  productId: string;
  lines: { line: OrderLine; index: number }[];
  qty: number;
  /** net paid per unit (after discounts), EUR */
  unitNet: number;
}

export function returnableGroups(order: Order): ReturnableGroup[] {
  const map = new Map<string, ReturnableGroup>();
  order.items.forEach((line, index) => {
    if (!line.productId || line.custom || !line.qty) return;
    const g = map.get(line.productId) ?? { productId: line.productId, lines: [], qty: 0, unitNet: 0 };
    g.lines.push({ line, index });
    g.qty += line.qty;
    map.set(line.productId, g);
  });
  for (const g of map.values()) g.unitNet = g.qty ? refundForLines(order, [{ productId: g.productId, qty: g.qty }]) / g.qty : 0;
  return [...map.values()];
}

/** Units already in non-rejected returns of an order, per product (optionally ignoring one return). */
export function returnedQty(returns: ReturnRequest[], orderId: string, ignoreId?: string) {
  const map = new Map<string, number>();
  for (const r of returns) {
    if (r.orderId !== orderId || r.status === 'rejected' || r.id === ignoreId) continue;
    for (const l of r.lines) map.set(l.productId, (map.get(l.productId) ?? 0) + l.qty);
  }
  return map;
}

/**
 * Gross / discount / net for returned quantities — walks the order lines exactly like refundForLines,
 * so the breakdown always adds up to the computed refund.
 */
export function refundBreakdown(order: Order, lines: { productId: string; qty: number }[]) {
  let gross = 0;
  let discount = 0;
  for (const want of lines) {
    let left = want.qty;
    order.items.forEach((l, i) => {
      if (left <= 0 || l.productId !== want.productId || !l.qty) return;
      const take = Math.min(left, l.qty);
      gross += ((l.lineTotal + orderLineInstallation(l)) / l.qty) * take;
      discount += (orderLineDiscount(order, i) / l.qty) * take;
      left -= take;
    });
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const net = refundForLines(order, lines);
  return { gross: r2(gross), discount: r2(Math.max(0, r2(gross) - net)), net, rawDiscount: r2(discount) };
}

/** What may still be refunded on this return: the computed net, capped by the order's remaining paid amount. */
export function refundCap(order: Order, ret: ReturnRequest) {
  const computed = refundForLines(order, ret.lines);
  const remaining = Math.max(0, Math.round((order.total - refundedOf(order)) * 100) / 100);
  return { computed, remaining, max: Math.min(computed, remaining), capped: remaining < computed };
}

/** Product name in the admin language (falls back to the order snapshot). */
export function lineName(productId: string, order: Order | undefined, products: Product[], lang: Lang) {
  const p = products.find((x) => x.id === productId);
  if (p) return lt(p.name, lang);
  return order?.items.find((l) => l.productId === productId)?.name ?? productId;
}

export const lineImage = (productId: string, order: Order | undefined, products: Product[]) =>
  order?.items.find((l) => l.productId === productId)?.image ?? products.find((x) => x.id === productId)?.images[0];

/** Moment a return reached a status (latest entry). */
export const reachedAt = (r: ReturnRequest, s: ReturnStatus) => [...r.timeline].reverse().find((e) => e.status === s)?.at;
