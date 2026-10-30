// Appointments — CMS proposal pp.45–46: capacity per service, no overlaps per staff member.
import type { Booking, Service } from './types';

export type BookingConflict = 'invalid' | 'service' | 'staff' | 'staffBusy' | 'capacity';

const ms = (iso: string) => new Date(iso).getTime();
export const bookingEnd = (b: Pick<Booking, 'start' | 'durationMin'>) => new Date(ms(b.start) + b.durationMin * 60000).toISOString();

/** Half-open interval overlap [start, end). */
export function overlaps(a: Pick<Booking, 'start' | 'durationMin'>, b: Pick<Booking, 'start' | 'durationMin'>) {
  const a0 = ms(a.start);
  const b0 = ms(b.start);
  return a0 < b0 + b.durationMin * 60000 && b0 < a0 + a.durationMin * 60000;
}

/** Bookings that hold a slot (cancelled / no-show free it). */
export const holdsSlot = (b: Pick<Booking, 'status'>) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'done';

/**
 * Can this booking be placed? Checks the service exists, the staff member offers it, the staff member
 * is free, and the service still has capacity for that interval. `ignoreId` skips the booking being
 * rescheduled.
 */
export function checkBooking(
  candidate: Pick<Booking, 'serviceId' | 'staffId' | 'start' | 'durationMin'>,
  bookings: Booking[],
  services: Service[],
  ignoreId?: string,
): { ok: true } | { ok: false; reason: BookingConflict } {
  if (!candidate.start || Number.isNaN(ms(candidate.start)) || !(candidate.durationMin > 0)) return { ok: false, reason: 'invalid' };
  const service = services.find((s) => s.id === candidate.serviceId);
  if (!service) return { ok: false, reason: 'service' };
  if (service.staffIds.length && !service.staffIds.includes(candidate.staffId)) return { ok: false, reason: 'staff' };
  const live = bookings.filter((b) => b.id !== ignoreId && holdsSlot(b) && overlaps(b, candidate));
  if (live.some((b) => b.staffId === candidate.staffId)) return { ok: false, reason: 'staffBusy' };
  if (live.filter((b) => b.serviceId === candidate.serviceId).length >= Math.max(1, service.capacity)) return { ok: false, reason: 'capacity' };
  return { ok: true };
}

/** Bookings of one local calendar day (YYYY-MM-DD), sorted by start. */
export function bookingsOnDay(bookings: Booking[], day: string) {
  return bookings
    .filter((b) => {
      const d = new Date(b.start);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return local === day;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}
