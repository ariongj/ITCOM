import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useDb } from '@/store/db';
import { useNow } from '@/admin/components/crm/shared';
import { buildCustomers, findDuplicates, membersOf, seedCustomerData, type CustomerRecord } from './model';
import { useCustomerStore, type CustomerData } from './store';

/**
 * Every customer (web orders + staff-created / imported records) with the profile layer applied.
 * Seeds the profile store the first time (and again after the demo data is reset).
 */
export function useCustomers() {
  const orders = useDb((s) => s.orders);
  const inquiries = useDb((s) => s.inquiries);
  const bookings = useDb((s) => s.bookings);
  const quotes = useDb((s) => s.quotes);
  const seededAt = useDb((s) => s.seededAt);
  const stored = useCustomerStore(useShallow((s) => ({ seed: s.seed, profiles: s.profiles, manual: s.manual, merges: s.merges, dismissed: s.dismissed })));

  // Until the store is seeded for this db, render from a freshly computed seed (no empty flash).
  const pending = useMemo<CustomerData | null>(
    () => (stored.seed === seededAt ? null : seedCustomerData(orders, bookings, inquiries, seededAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stored.seed, seededAt],
  );
  useEffect(() => {
    if (pending) useCustomerStore.getState().load(seededAt, pending);
  }, [pending, seededAt]);

  const data: CustomerData = pending ?? stored;
  const customers = useMemo(() => buildCustomers({ orders, inquiries, bookings, quotes, data }), [orders, inquiries, bookings, quotes, data]);
  const duplicates = useMemo(() => findDuplicates(customers, data.dismissed), [customers, data.dismissed]);
  const now = useNow();
  return { customers, duplicates, data, now };
}

/** Members per segment id (dynamic — recomputed whenever customers change). */
export function useSegmentCounts(customers: CustomerRecord[], now: number) {
  const segments = useDb((s) => s.segments);
  return useMemo(() => {
    const out = new Map<string, CustomerRecord[]>();
    for (const seg of segments) out.set(seg.id, membersOf(seg, customers, now));
    return out;
  }, [segments, customers, now]);
}
