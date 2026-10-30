// Customers, segments and the contacts inbox — CMS proposal p.19 and p.43.
import type { Inquiry, InquiryKind, Lang, Order, Segment, SegmentRule } from './types';

/** Inbox kind derived from the inquiry type: contact form · B2B quote request · meeting (measurement). */
export function inquiryKind(i: Pick<Inquiry, 'type'>): InquiryKind {
  return i.type === 'quote' ? 'b2b' : i.type === 'measurement' ? 'meeting' : 'contact';
}

/** What a segment rule is evaluated against — one row per customer. */
export interface SegmentSubject {
  key: string;
  name: string;
  email: string;
  phone: string;
  /** Orders, cancelled excluded */
  orders: number;
  /** Lifetime spend EUR, cancelled excluded */
  spent: number;
  city: string;
  /** Days since the last order */
  lastOrderDays: number;
  lang: Lang;
  tags: string[];
}

export const customerKeyOf = (o: Pick<Order, 'customer'>) =>
  (o.customer.email || o.customer.phone || `${o.customer.firstName} ${o.customer.lastName}`).trim().toLowerCase();

/** One subject per customer (grouped by e-mail / phone), newest data wins. */
export function segmentSubjects(orders: Order[], now: Date | number = Date.now()): SegmentSubject[] {
  const t = typeof now === 'number' ? now : now.getTime();
  const map = new Map<string, Order[]>();
  for (const o of orders) {
    const k = customerKeyOf(o);
    const list = map.get(k);
    if (list) list.push(o);
    else map.set(k, [o]);
  }
  const out: SegmentSubject[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const valid = sorted.filter((o) => o.status !== 'cancelled');
    const c = sorted[0].customer;
    const tags = new Set<string>();
    for (const o of sorted) for (const tg of o.tags ?? []) tags.add(tg);
    if (sorted.some((o) => o.customer.company)) tags.add('b2b');
    out.push({
      key,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      phone: c.phone,
      orders: valid.length,
      spent: Math.round(valid.reduce((s, o) => s + o.total, 0) * 100) / 100,
      city: c.city,
      lastOrderDays: Math.floor((t - new Date(sorted[0].createdAt).getTime()) / 86400000),
      lang: sorted[0].lang,
      tags: [...tags],
    });
  }
  return out;
}

function ruleMatches(s: SegmentSubject, r: SegmentRule): boolean {
  const num = Number(String(r.value).replace(',', '.'));
  const numeric = (v: number) => (r.op === 'gt' ? v > num : r.op === 'lt' ? v < num : v === num);
  const text = (v: string) => v.trim().toLowerCase() === String(r.value).trim().toLowerCase();
  switch (r.field) {
    case 'orders':
      return numeric(s.orders);
    case 'spent':
      return numeric(s.spent);
    case 'lastOrderDays':
      return numeric(s.lastOrderDays);
    case 'city':
      return text(s.city);
    case 'lang':
      return text(s.lang);
    case 'tag':
      return s.tags.some(text);
    default:
      return false;
  }
}

/** Dynamic membership (a segment is a filter, not a copy of customers). */
export function matchesSegment(s: SegmentSubject, seg: Pick<Segment, 'match' | 'rules'>): boolean {
  if (!seg.rules.length) return false;
  return seg.match === 'any' ? seg.rules.some((r) => ruleMatches(s, r)) : seg.rules.every((r) => ruleMatches(s, r));
}

export function segmentMembers(seg: Segment, subjects: SegmentSubject[]): SegmentSubject[] {
  return subjects.filter((s) => matchesSegment(s, seg));
}

/** Segment ids for one customer — feed into the discount engine's `customer.segmentIds`. */
export function segmentIdsFor(s: SegmentSubject, segments: Segment[]): string[] {
  return segments.filter((seg) => matchesSegment(s, seg)).map((seg) => seg.id);
}
