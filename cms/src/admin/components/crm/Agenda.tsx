import { useMemo, type ComponentType } from 'react';
import { Link } from 'react-router';
import { AlarmClock, ArrowUpRight, CalendarDays, Inbox, UserRoundX } from 'lucide-react';
import { defineDict, useDict } from '@/i18n';
import { holdsSlot } from '@/lib/bookings';
import type { Booking, Inquiry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { dueOf, dueState } from '@/admin/components/contacts/model';

const T = defineDict({
  me: {
    new: 'Novi upiti',
    newSub: '{n} nepregledano',
    newSubNone: 'Sve je pregledano',
    unassigned: 'Bez odgovornog',
    unassignedSub: 'Otvoreni upiti bez osobe',
    overdue: 'Rok je prošao',
    overdueSub: 'Danas na redu: {n}',
    visits: 'Termini (7 dana)',
    visitsSub: 'Iz upita · otvori kalendar',
    filterOn: 'Filter je uključen — kliknite da ga uklonite',
  },
  sq: {
    new: 'Kërkesa të reja',
    newSub: '{n} të palexuara',
    newSubNone: 'Të gjitha janë lexuar',
    unassigned: 'Pa përgjegjës',
    unassignedSub: 'Kërkesa të hapura pa person',
    overdue: 'Afati ka kaluar',
    overdueSub: 'Sot në radhë: {n}',
    visits: 'Termine (7 ditë)',
    visitsSub: 'Nga kërkesat · hap kalendarin',
    filterOn: 'Filtri është aktiv — klikoni për ta hequr',
  },
  en: {
    new: 'New requests',
    newSub: '{n} unread',
    newSubNone: 'All read',
    unassigned: 'No assignee',
    unassignedSub: 'Open requests without an owner',
    overdue: 'Overdue',
    overdueSub: 'Due today: {n}',
    visits: 'Appointments (7 days)',
    visitsSub: 'From requests · open calendar',
    filterOn: 'Filter on — click to clear',
  },
});

export type AgendaFilter = 'new' | 'unassigned' | 'overdue';

/**
 * Today's workload for the contacts inbox: new, unassigned and overdue requests (each tile filters the
 * table) plus the appointments booked from requests in the next 7 days (opens the calendar).
 */
export function Agenda({ inquiries, bookings, now, active, onPick, className }: { inquiries: Inquiry[]; bookings: Booking[]; now: number; active: AgendaFilter | null; onPick: (f: AgendaFilter | null) => void; className?: string }) {
  const t = useDict(T, 'admin');

  const s = useMemo(() => {
    const open = inquiries.filter((q) => q.status !== 'done');
    let overdue = 0;
    let today = 0;
    for (const q of open) {
      const d = dueOf(q);
      if (!d) continue;
      const st = dueState(d.at, now);
      if (st === 'overdue') overdue++;
      else if (st === 'today') today++;
    }
    const week = now + 7 * 86400000;
    return {
      newCount: inquiries.filter((q) => q.status === 'new').length,
      unseen: inquiries.filter((q) => !q.seen).length,
      unassigned: open.filter((q) => !q.assignee).length,
      overdue,
      today,
      visits: bookings.filter((b) => b.inquiryId && holdsSlot(b) && new Date(b.start).getTime() >= now && new Date(b.start).getTime() < week).length,
    };
  }, [inquiries, bookings, now]);

  return (
    <div className={cn('grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3', className)}>
      <Tile icon={Inbox} label={t('new')} value={s.newCount} sub={s.unseen ? t('newSub', { n: s.unseen }) : t('newSubNone')} on={active === 'new'} onClick={() => onPick(active === 'new' ? null : 'new')} hint={active === 'new' ? t('filterOn') : undefined} />
      <Tile icon={UserRoundX} label={t('unassigned')} value={s.unassigned} sub={t('unassignedSub')} on={active === 'unassigned'} onClick={() => onPick(active === 'unassigned' ? null : 'unassigned')} hint={active === 'unassigned' ? t('filterOn') : undefined} />
      <Tile icon={AlarmClock} label={t('overdue')} value={s.overdue} sub={t('overdueSub', { n: s.today })} alert={s.overdue > 0} on={active === 'overdue'} onClick={() => onPick(active === 'overdue' ? null : 'overdue')} hint={active === 'overdue' ? t('filterOn') : undefined} />
      <Link
        to="/admin/termini"
        className="group flex min-w-0 items-start gap-3 rounded-xl border border-line/80 bg-white px-3.5 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-ink/25 sm:px-4"
      >
        <TileBody icon={CalendarDays} label={t('visits')} value={s.visits} sub={t('visitsSub')} />
        <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-ink" />
      </Link>
    </div>
  );
}

function Tile({ icon, label, value, sub, on, alert, onClick, hint }: { icon: ComponentType<{ className?: string }>; label: string; value: number; sub: string; on: boolean; alert?: boolean; onClick: () => void; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={hint}
      className={cn(
        'flex min-w-0 items-start gap-3 rounded-xl border px-3.5 py-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors sm:px-4',
        on ? 'border-ink bg-white ring-1 ring-ink' : 'border-line/80 bg-white hover:border-ink/25',
      )}
    >
      <TileBody icon={icon} label={label} value={value} sub={sub} alert={alert} />
    </button>
  );
}

function TileBody({ icon: I, label, value, sub, alert }: { icon: ComponentType<{ className?: string }>; label: string; value: number; sub: string; alert?: boolean }) {
  return (
    <>
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg max-sm:hidden', alert ? 'bg-red-50 text-red-700' : 'bg-ink/[0.05] text-ink-soft')}>
        <I className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium text-muted">{label}</span>
        <span className={cn('mt-0.5 flex items-center gap-1.5 text-[22px] font-bold leading-none tracking-tight tabular-nums', alert ? 'text-red-700' : 'text-ink')}>
          {alert && <I className="h-4 w-4 sm:hidden" />}
          {value}
        </span>
        <span className="mt-1 block truncate text-[12px] text-muted">{sub}</span>
      </span>
    </>
  );
}
