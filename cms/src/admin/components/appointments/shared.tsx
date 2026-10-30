import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { CheckCheck, CircleCheck, CircleDashed, CircleX, UserX } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/misc';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { bookingEnd } from '@/lib/bookings';
import type { Booking, BookingStatus, Service, Settings, Staff } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { ap } from './i18n';
import { dayName, fromMin, timeRange, weekdayIndex } from './dates';
import { readRules, type SlotCandidate, type SlotCheck } from './rules';

/* ------------------------------------------------------------------ */
/* Rules from settings                                                 */
/* ------------------------------------------------------------------ */
export function useBookingRules() {
  const settings = useDb((s) => s.settings);
  return useMemo(() => readRules(settings), [settings]);
}

/* ------------------------------------------------------------------ */
/* Status — always text + symbol (PDF p.07)                            */
/* ------------------------------------------------------------------ */
export const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'done', 'noshow', 'cancelled'];

export const STATUS_ICON: Record<BookingStatus, ComponentType<{ className?: string }>> = {
  pending: CircleDashed,
  confirmed: CircleCheck,
  done: CheckCheck,
  noshow: UserX,
  cancelled: CircleX,
};

const STATUS_TONE: Record<BookingStatus, BadgeTone> = { pending: 'amber', confirmed: 'green', done: 'gray', noshow: 'red', cancelled: 'outline' };

export function BookingStatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const t = useDict(ap, 'admin');
  const Icon = STATUS_ICON[status];
  return (
    <Badge tone={STATUS_TONE[status]} className={cn('gap-1!', className)}>
      <Icon className="h-3 w-3" />
      {t(`st_${status}`)}
    </Badge>
  );
}

/** Inline "◌ Na čekanju" used inside calendar blocks. */
export function StatusMark({ status, className }: { status: BookingStatus; className?: string }) {
  const t = useDict(ap, 'admin');
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1', className)}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{t(`st_${status}`)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* People, services, places                                            */
/* ------------------------------------------------------------------ */
export function StaffAvatar({ staff, size = 'sm', className }: { staff?: Staff | null; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const s = size === 'xs' ? 'h-5 w-5 text-[9px]' : size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-[11.5px]';
  return (
    <span
      title={staff?.name}
      className={cn('grid shrink-0 place-items-center rounded-full font-bold text-white ring-2 ring-white', s, className)}
      style={{ background: staff?.color ?? '#8a8a8a' }}
    >
      {staff ? initials(staff.name) : '?'}
    </span>
  );
}

export const firstName = (s?: Staff | null) => s?.name.split(' ')[0] ?? '—';

export function ServiceDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]', className)} style={{ background: color }} />;
}

/** Neutral chevron for <select appearance-none> (inline SVG, no asset). */
export const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23777' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/** 24-hour time picker (native <input type=time> follows the OS locale and may show AM/PM). */
export function TimeSelect({ value, onChange, disabled, label, from = 6 * 60, to = 22 * 60, step = 30, className }: { value: string; onChange: (v: string) => void; disabled?: boolean; label?: string; from?: number; to?: number; step?: number; className?: string }) {
  const opts: string[] = [];
  for (let m = from; m <= to; m += step) opts.push(fromMin(m));
  if (value && !opts.includes(value)) opts.push(value);
  opts.sort();
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      style={{ backgroundImage: CHEVRON }}
      className={cn('h-9 w-[84px] cursor-pointer appearance-none rounded-lg border border-line bg-white bg-[length:13px] bg-[right_8px_center] bg-no-repeat pl-2.5 pr-6 text-[13.5px] tabular-nums text-ink outline-none transition focus:border-ink/40 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted', className)}
    >
      {opts.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

/** Soft background tint of a service colour (works in the neutral admin theme). */
export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, white)`;

export function useLocationLabel() {
  const t = useDict(ap, 'admin');
  const locations = useDb((s) => s.settings.locations);
  return useCallback((id?: string) => (!id ? '—' : id === 'onsite' ? t('onsite') : (locations.find((x) => x.id === id)?.name ?? id)), [locations, t]);
}

export function locationOptions(settings: Settings) {
  return [...settings.locations.map((x) => ({ id: x.id, name: x.name, isDefault: x.isDefault })), { id: 'onsite', name: '', isDefault: false }];
}

/* ------------------------------------------------------------------ */
/* Human reason for a rejected slot                                    */
/* ------------------------------------------------------------------ */
export function useReasonText() {
  const t = useDict(ap, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const staff = useDb((s) => s.staff);
  const services = useDb((s) => s.services);
  const bookings = useDb((s) => s.bookings);
  return useCallback(
    (check: SlotCheck, c: SlotCandidate, rules: { minNoticeHours: number; bufferMin: number }) => {
      if (check.ok) return '';
      const member = staff.find((m) => m.id === c.staffId);
      const service = services.find((s) => s.id === c.serviceId);
      const other = (b?: Booking) => {
        if (!b) return '—';
        const svc = services.find((s) => s.id === b.serviceId);
        return `${svc ? l(svc.name) : ''} ${timeRange(b.start, b.durationMin)} (${b.customerName})`.trim();
      };
      switch (check.reason) {
        case 'staff':
          return t('r_staff', { staff: member?.name ?? '—', service: service ? l(service.name) : '—' });
        case 'staffBusy':
          return t('r_staffBusy', { staff: member?.name ?? '—', other: other(check.conflict) });
        case 'capacity': {
          const s0 = new Date(c.start).getTime();
          const s1 = s0 + c.durationMin * 60000;
          const used = bookings.filter(
            (b) => b.serviceId === c.serviceId && (b.status === 'pending' || b.status === 'confirmed' || b.status === 'done') && new Date(b.start).getTime() < s1 && new Date(bookingEnd(b)).getTime() > s0,
          ).length;
          return t('r_capacity', { service: service ? l(service.name) : '—', time: timeRange(c.start, c.durationMin), used, cap: service?.capacity ?? 1 });
        }
        case 'closed':
          return t('r_closed', { day: dayName(weekdayIndex(new Date(c.start)), lang) });
        case 'holiday':
          return t('r_holiday', { label: l(check.exception?.label) });
        case 'outside':
          return t('r_outside', { from: fromMin(check.window?.from ?? 0), to: fromMin(check.window?.to ?? 0) });
        case 'notice':
          return t('r_notice', { h: rules.minNoticeHours });
        case 'buffer':
          return t('r_buffer', { staff: member?.name ?? '—', min: rules.bufferMin, other: other(check.conflict) });
        default:
          return t(`r_${check.reason}`);
      }
    },
    [t, l, lang, staff, services, bookings],
  );
}

/* ------------------------------------------------------------------ */
/* Responsive switch                                                   */
/* ------------------------------------------------------------------ */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMatch(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [query]);
  return match;
}

/** Bookings that hold capacity (cancelled / no-show free it). */
export const isLive = (b: Booking) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'done';

export const serviceById = (services: Service[]) => new Map(services.map((s) => [s.id, s]));

