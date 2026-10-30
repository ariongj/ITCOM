import type { Lang, Order } from '@/lib/types';
import { round2 } from '@/lib/utils';

/** A customer derived from web orders (grouped by e-mail). */
export interface CustomerRow {
  key: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  company?: string;
  pib?: string;
  /** Newest first */
  orders: Order[];
  /** All orders, including cancelled */
  count: number;
  cancelled: number;
  /** Lifetime spend — cancelled orders excluded */
  spent: number;
  first: string;
  last: string;
  lang: Lang;
}

export const customerKey = (o: Order) => (o.customer.email || o.customer.phone || `${o.customer.firstName} ${o.customer.lastName}`).trim().toLowerCase();

export function aggregateCustomers(orders: Order[]): CustomerRow[] {
  const map = new Map<string, Order[]>();
  for (const o of orders) {
    const k = customerKey(o);
    const list = map.get(k);
    if (list) list.push(o);
    else map.set(k, [o]);
  }
  const rows: CustomerRow[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = sorted[0];
    const c = latest.customer;
    const valid = sorted.filter((o) => o.status !== 'cancelled');
    rows.push({
      key,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      phone: c.phone || sorted.find((o) => o.customer.phone)?.customer.phone || '',
      city: c.city,
      address: c.address,
      company: sorted.find((o) => o.customer.company)?.customer.company,
      pib: sorted.find((o) => o.customer.pib)?.customer.pib,
      orders: sorted,
      count: sorted.length,
      cancelled: sorted.length - valid.length,
      spent: round2(valid.reduce((s, o) => s + o.total, 0)),
      first: sorted[sorted.length - 1].createdAt,
      last: latest.createdAt,
      lang: latest.lang,
    });
  }
  return rows;
}

export type CustomerSort = 'spent' | 'orders' | 'recent';

export function sortCustomers(rows: CustomerRow[], sort: CustomerSort) {
  const list = [...rows];
  if (sort === 'spent') list.sort((a, b) => b.spent - a.spent || b.last.localeCompare(a.last));
  else if (sort === 'orders') list.sort((a, b) => b.count - a.count || b.spent - a.spent);
  else list.sort((a, b) => b.last.localeCompare(a.last));
  return list;
}

/** Spend threshold for the top 10% of customers (needs at least 5 paying customers). */
export function topThreshold(rows: CustomerRow[]) {
  const spends = rows.map((r) => r.spent).filter((v) => v > 0).sort((a, b) => b - a);
  if (spends.length < 5) return Infinity;
  return spends[Math.max(0, Math.ceil(spends.length * 0.1) - 1)];
}

export function customersCsv(rows: CustomerRow[]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['name', 'email', 'phone', 'city', 'address', 'orders', 'spent_eur', 'first_order', 'last_order'];
  const lines = rows.map((r) => [r.name, r.email, r.phone, r.city, r.address, r.count, r.spent.toFixed(2), r.first.slice(0, 10), r.last.slice(0, 10)].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}
