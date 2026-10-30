// Booking rules — PDF p.45 "Konfigurimi": weekly opening hours, holidays/exceptions, minimum notice for
// booking and cancelling, buffer between appointments, manual confirmation.
//
// The shared `Settings` type has no field for these yet, so they live under `settings.booking`
// (written through updateSettings — persisted, exported, audited and reset with the demo data like any
// other setting). Missing → `defaultRules(now)`. Pure logic: also imported by the storefront MeasureForm.
import { checkBooking, holdsSlot, type BookingConflict } from '@/lib/bookings';
import type { Booking, L10n, Service, Settings } from '@/lib/types';
import { addDays, atMinutes, dayKey, fromMin, minutesOf, parseDay, toMin, weekdayIndex } from './dates';

export interface DayHours {
  open: boolean;
  /** "HH:MM" */
  from: string;
  to: string;
}

export interface BookingException {
  id: string;
  /** First day, "YYYY-MM-DD" */
  date: string;
  /** Last day (inclusive) for multi-day closures */
  dateTo?: string;
  label: L10n;
  /** true = closed all day; false = reduced hours from–to */
  closed: boolean;
  from?: string;
  to?: string;
}

export interface BookingRules {
  /** Monday … Sunday */
  hours: DayHours[];
  exceptions: BookingException[];
  /** Customers (web) can book no sooner than this many hours ahead */
  minNoticeHours: number;
  /** Free cancellation until this many hours before the start */
  cancelNoticeHours: number;
  /** Minutes kept free before/after each appointment of the same staff member */
  bufferMin: number;
  /** Grid of offered start times */
  slotStepMin: number;
  /** Web requests stay "pending" until the team confirms them by phone */
  manualConfirm: boolean;
  /** Deposit for paid services (needs the card-payment integration) */
  deposit: boolean;
}

export type SettingsWithBooking = Settings & { booking?: Partial<BookingRules> };

/** Calendar grid bounds (09:00–20:00) — the store opens 10:00–19:30, Mon–Sat. */
export const GRID_FROM = 9 * 60;
export const GRID_TO = 20 * 60;

export function defaultRules(now = new Date()): BookingRules {
  const y = now.getFullYear();
  const nextFriday = addDays(now, ((4 - weekdayIndex(now) + 7) % 7) + 7);
  // 17 February — the next one still ahead
  const indepYear = now.getMonth() > 1 || (now.getMonth() === 1 && now.getDate() > 17) ? y + 1 : y;
  return {
    // ITCOM: Mon–Sat 10:00–19:30, Sunday closed
    hours: [
      { open: true, from: '10:00', to: '19:30' },
      { open: true, from: '10:00', to: '19:30' },
      { open: true, from: '10:00', to: '19:30' },
      { open: true, from: '10:00', to: '19:30' },
      { open: true, from: '10:00', to: '19:30' },
      { open: true, from: '10:00', to: '19:30' },
      { open: false, from: '10:00', to: '14:00' },
    ],
    exceptions: [
      { id: 'ex-trajnim', date: dayKey(nextFriday), label: { me: 'Obuka osoblja — Optical Lab', sq: 'Trajnim i stafit — Optical Lab', en: 'Staff training — Optical Lab' }, closed: false, from: '10:00', to: '15:00' },
      { id: 'ex-pavaresia', date: `${indepYear}-02-17`, label: { me: 'Dan nezavisnosti', sq: 'Dita e Pavarësisë', en: 'Independence Day' }, closed: true },
      { id: 'ex-nova', date: `${y}-12-31`, dateTo: `${y + 1}-01-02`, label: { me: 'Nova godina', sq: 'Viti i Ri', en: 'New Year' }, closed: true },
    ],
    minNoticeHours: 12,
    cancelNoticeHours: 24,
    bufferMin: 15,
    slotStepMin: 30,
    manualConfirm: true,
    deposit: false,
  };
}

export function readRules(settings: Settings, now = new Date()): BookingRules {
  const saved = (settings as SettingsWithBooking).booking;
  const base = defaultRules(now);
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    hours: base.hours.map((h, i) => ({ ...h, ...(saved.hours?.[i] ?? {}) })),
    exceptions: saved.exceptions ?? base.exceptions,
  };
}

/** Patch for updateSettings */
export const rulesPatch = (rules: BookingRules) => ({ booking: rules }) as unknown as Partial<Settings>;

/* ------------------------------------------------------------------ */
/* Opening hours of one day                                            */
/* ------------------------------------------------------------------ */
export interface DayWindow {
  open: boolean;
  from: number;
  to: number;
  exception?: BookingException;
}

export function exceptionOn(rules: BookingRules, day: string) {
  return rules.exceptions.find((e) => day >= e.date && day <= (e.dateTo || e.date));
}

export function windowFor(rules: BookingRules, day: string | Date): DayWindow {
  const key = typeof day === 'string' ? day : dayKey(day);
  const d = parseDay(key);
  const ex = exceptionOn(rules, key);
  if (ex) {
    if (ex.closed || !ex.from || !ex.to) return { open: false, from: 0, to: 0, exception: ex };
    return { open: true, from: toMin(ex.from), to: toMin(ex.to), exception: ex };
  }
  const h = rules.hours[weekdayIndex(d)];
  if (!h?.open) return { open: false, from: 0, to: 0 };
  return { open: true, from: toMin(h.from), to: toMin(h.to) };
}

/* ------------------------------------------------------------------ */
/* Slot check = store capacity check + the business rules              */
/* ------------------------------------------------------------------ */
export type SlotProblem = BookingConflict | 'past' | 'closed' | 'holiday' | 'outside' | 'notice' | 'buffer';

export type SlotCheck =
  | { ok: true }
  | { ok: false; reason: SlotProblem; conflict?: Booking; exception?: BookingException; window?: DayWindow };

export interface SlotCandidate {
  serviceId: string;
  staffId: string;
  start: string;
  durationMin: number;
}

/**
 * Can this appointment be placed? Order of checks = the reason the user sees first:
 * past → closed/holiday → outside hours → minimum notice (web only) → staff/capacity (lib/bookings) → buffer.
 */
export function checkSlot(
  c: SlotCandidate,
  ctx: { bookings: Booking[]; services: Service[]; rules: BookingRules; now?: number; ignoreId?: string; web?: boolean },
): SlotCheck {
  const now = ctx.now ?? Date.now();
  const start = new Date(c.start).getTime();
  if (Number.isNaN(start) || !(c.durationMin > 0)) return { ok: false, reason: 'invalid' };
  if (start < now) return { ok: false, reason: 'past' };
  const day = dayKey(c.start);
  const win = windowFor(ctx.rules, day);
  if (!win.open) return { ok: false, reason: win.exception ? 'holiday' : 'closed', exception: win.exception, window: win };
  const from = minutesOf(c.start);
  if (from < win.from || from + c.durationMin > win.to) return { ok: false, reason: 'outside', window: win, exception: win.exception };
  if (ctx.web && start < now + ctx.rules.minNoticeHours * 3600000) return { ok: false, reason: 'notice' };

  const base = checkBooking(c, ctx.bookings, ctx.services, ctx.ignoreId);
  if (!base.ok) return { ok: false, reason: base.reason, conflict: conflictFor(c, ctx.bookings, base.reason, ctx.ignoreId) };

  const buffer = ctx.rules.bufferMin * 60000;
  if (buffer > 0) {
    const end = start + c.durationMin * 60000;
    const near = ctx.bookings.find((b) => {
      if (b.id === ctx.ignoreId || b.staffId !== c.staffId || !holdsSlot(b)) return false;
      const b0 = new Date(b.start).getTime();
      const b1 = b0 + b.durationMin * 60000;
      return start < b1 + buffer && b0 < end + buffer;
    });
    if (near) return { ok: false, reason: 'buffer', conflict: near };
  }
  return { ok: true };
}

/** The booking that blocks a slot — shown in the error ("Arta already has Kontroll i syve 10:00–10:30"). */
function conflictFor(c: SlotCandidate, bookings: Booking[], reason: BookingConflict, ignoreId?: string) {
  const s0 = new Date(c.start).getTime();
  const s1 = s0 + c.durationMin * 60000;
  const live = bookings.filter((b) => {
    if (b.id === ignoreId || !holdsSlot(b)) return false;
    const b0 = new Date(b.start).getTime();
    return s0 < b0 + b.durationMin * 60000 && b0 < s1;
  });
  if (reason === 'staffBusy') return live.find((b) => b.staffId === c.staffId);
  if (reason === 'capacity') return live.find((b) => b.serviceId === c.serviceId);
  return undefined;
}

/* ------------------------------------------------------------------ */
/* Slots of a day                                                      */
/* ------------------------------------------------------------------ */
export interface DaySlot {
  minutes: number;
  label: string;
  start: string;
  /** First staff member who can take it (auto-assign) */
  staffId?: string;
  check: SlotCheck;
}

/**
 * Every start time on `day` (opening hours, `slotStepMin` grid). With `staffId` = '' any staff member of the
 * service may take it — the first free one is assigned.
 */
export function slotsForDay(
  day: string,
  service: Service,
  staffId: string,
  ctx: { bookings: Booking[]; services: Service[]; rules: BookingRules; now?: number; ignoreId?: string; web?: boolean; durationMin?: number },
): { window: DayWindow; slots: DaySlot[] } {
  const win = windowFor(ctx.rules, day);
  if (!win.open) return { window: win, slots: [] };
  const duration = ctx.durationMin ?? service.durationMin;
  const step = Math.max(5, ctx.rules.slotStepMin || 30);
  const team = staffId ? [staffId] : service.staffIds;
  const slots: DaySlot[] = [];
  for (let m = win.from; m + duration <= win.to; m += step) {
    const start = atMinutes(day, m);
    let first: SlotCheck | null = null;
    let chosen: string | undefined;
    for (const sid of team) {
      const check = checkSlot({ serviceId: service.id, staffId: sid, start, durationMin: duration }, ctx);
      if (check.ok) {
        chosen = sid;
        first = check;
        break;
      }
      // a full service is the reason for everyone — report it over one person being busy
      if (!first || (check.reason === 'capacity' && !first.ok && first.reason !== 'capacity')) first = check;
    }
    slots.push({ minutes: m, label: fromMin(m), start, staffId: chosen, check: first ?? { ok: false, reason: 'staff' } });
  }
  return { window: win, slots };
}

/**
 * Storefront: the preferred day's 10:00 slot, else the next free one that day (later first, then earlier).
 * Null when the day is closed or full — the inquiry is then scheduled by hand.
 */
export function webSlot(day: string, service: Service, ctx: { bookings: Booking[]; services: Service[]; rules: BookingRules; now?: number }) {
  const { slots } = slotsForDay(day, service, '', { ...ctx, web: true });
  const free = slots.filter((s) => s.check.ok && s.staffId);
  if (!free.length) return null;
  const preferred = 10 * 60;
  return free.find((s) => s.minutes >= preferred) ?? free[free.length - 1];
}
