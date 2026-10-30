import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, CircleCheck, Clock, Settings2, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader, SearchInput } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { ap } from '@/admin/components/appointments/i18n';
import { TimeGrid, type GridColumn } from '@/admin/components/appointments/TimeGrid';
import { BookingDrawer } from '@/admin/components/appointments/BookingDrawer';
import { AddBookingModal, type AddBookingPrefill } from '@/admin/components/appointments/AddBookingModal';
import { addDays, dayHeader, dayKey, dayMonth, fromMin, isoWeek, mondayOf, rangeLabel, timeRange, weekdayIndex } from '@/admin/components/appointments/dates';
import { windowFor } from '@/admin/components/appointments/rules';
import { CHEVRON, STATUSES, ServiceDot, StaffAvatar, StatusMark, firstName, isLive, tint, useBookingRules, useMedia } from '@/admin/components/appointments/shared';
import { matches } from '@/admin/components/crm/shared';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import type { Booking, BookingStatus, Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { num } from '@/lib/format';

const T = defineDict({
  me: {
    title: 'Kalendar termina',
    desc: 'Raspored tima, kapacitet usluga i status rezervacija na jednom mjestu.',
    add: 'Dodaj rezervaciju',
    services: 'Usluge i radno vrijeme',
    week: 'Sedmica {range}',
    today: 'Danas',
    prev: 'Prethodna',
    next: 'Sljedeća',
    viewDay: 'Dan',
    viewWeek: 'Sedmica',
    allStatuses: 'Svi statusi',
    searchPh: 'Klijent, telefon ili grad…',
    found: '{n} pronađeno',
    count_one: '{n} termin',
    count_few: '{n} termina',
    count_many: '{n} termina',
    statWeek: 'Ove sedmice',
    statToday: 'Danas',
    statPending: 'Čeka potvrdu',
    statHours: 'Rezervisani sati',
    statHoursHint: '{pct}% radnog vremena tima',
    filterHint: 'kliknite za filter',
    filterOn: 'filter je uključen',
    pendingTitle: 'Čeka potvrdu',
    pendingDesc: 'Zahtjevi sa sajta i termini koje treba potvrditi telefonom.',
    confirm: 'Potvrdi',
    confirmed: 'Termin je potvrđen — {name}',
    open: 'Otvori',
    legend: 'Usluge',
    capacity: 'kap. {n}',
    hatched: 'Šrafirano = zatvoreno / van radnog vremena',
    tz: 'Vremenska zona: {tz}',
    clickHint: 'Kliknite na prazno polje za novi termin.',
    noneDay: 'Nema termina za ovaj dan.',
    closedDay: 'Zatvoreno',
    web: 'sa sajta',
    noPending: 'Nema termina na čekanju — sve je potvrđeno.',
  },
  sq: {
    title: 'Kalendari i termineve',
    desc: 'Orari, stafi dhe gjendja e rezervimeve në të njëjtën hapësirë.',
    add: 'Shto rezervim',
    services: 'Shërbimet & orari',
    week: 'Java {range}',
    today: 'Sot',
    prev: 'E mëparshmja',
    next: 'Tjetra',
    viewDay: 'Ditë',
    viewWeek: 'Javë',
    allStatuses: 'Të gjitha statuset',
    searchPh: 'Klienti, telefoni ose qyteti…',
    found: '{n} të gjetura',
    count_one: '{n} termin',
    count_few: '{n} termine',
    count_many: '{n} termine',
    statWeek: 'Këtë javë',
    statToday: 'Sot',
    statPending: 'Në pritje',
    statHours: 'Orë të rezervuara',
    statHoursHint: '{pct}% e orarit të ekipit',
    filterHint: 'kliko për të filtruar',
    filterOn: 'filtri është aktiv',
    pendingTitle: 'Në pritje të konfirmimit',
    pendingDesc: 'Kërkesa nga faqja dhe termine që duhen konfirmuar me telefon.',
    confirm: 'Konfirmo',
    confirmed: 'Termini u konfirmua — {name}',
    open: 'Hap',
    legend: 'Shërbimet',
    capacity: 'kap. {n}',
    hatched: 'Me vija = mbyllur / jashtë orarit',
    tz: 'Zona kohore: {tz}',
    clickHint: 'Klikoni në një hapësirë bosh për termin të ri.',
    noneDay: 'Asnjë termin për këtë ditë.',
    closedDay: 'Mbyllur',
    web: 'nga faqja',
    noPending: 'Asnjë termin në pritje — gjithçka është konfirmuar.',
  },
  en: {
    title: 'Appointment calendar',
    desc: 'Team schedule, service capacity and booking status in one place.',
    add: 'Add booking',
    services: 'Services & hours',
    week: 'Week {range}',
    today: 'Today',
    prev: 'Previous',
    next: 'Next',
    viewDay: 'Day',
    viewWeek: 'Week',
    allStatuses: 'All statuses',
    searchPh: 'Client, phone or city…',
    found: '{n} found',
    count_one: '{n} booking',
    count_few: '{n} bookings',
    count_many: '{n} bookings',
    statWeek: 'This week',
    statToday: 'Today',
    statPending: 'Pending',
    statHours: 'Booked hours',
    statHoursHint: '{pct}% of team hours',
    filterHint: 'click to filter',
    filterOn: 'filter on',
    pendingTitle: 'Awaiting confirmation',
    pendingDesc: 'Website requests and bookings to confirm by phone.',
    confirm: 'Confirm',
    confirmed: 'Booking confirmed — {name}',
    open: 'Open',
    legend: 'Services',
    capacity: 'cap. {n}',
    hatched: 'Hatched = closed / outside opening hours',
    tz: 'Time zone: {tz}',
    clickHint: 'Click an empty slot to add a booking.',
    noneDay: 'No bookings this day.',
    closedDay: 'Closed',
    web: 'from the website',
    noPending: 'Nothing pending — everything is confirmed.',
  },
});

type View = 'week' | 'day';
type StatusFilter = 'all' | BookingStatus;

function plural(n: number, lang: Lang): 'one' | 'few' | 'many' {
  if (lang === 'me') {
    const d = n % 10;
    const h = n % 100;
    if (d === 1 && h !== 11) return 'one';
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'few';
    return 'many';
  }
  return n === 1 ? 'one' : 'many';
}

const DAYS_SHOWN = 6; // Mon–Sat (PDF p.46)

const selectCls =
  'h-9 min-w-0 cursor-pointer appearance-none rounded-lg border border-line bg-white bg-[length:14px] bg-[right_10px_center] bg-no-repeat pl-3 pr-8 text-[13px] font-medium text-ink outline-none transition hover:border-ink/30 focus:border-ink/40';

export default function Appointments() {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const tadm = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const me = useCurrentStaff();
  const bookings = useDb((s) => s.bookings);
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const settings = useDb((s) => s.settings);
  const setBookingStatus = useDb((s) => s.setBookingStatus);
  const rules = useBookingRules();
  const desktop = useMedia('(min-width: 768px)');
  const [params, setParams] = useSearchParams();

  const linked = params.get('id') ? bookings.find((b) => b.id === params.get('id')) : undefined;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [anchor, setAnchor] = useState(() => mondayOf(linked ? linked.start : new Date()));
  const [day, setDay] = useState(() => dayKey(linked ? linked.start : weekdayIndex(new Date()) > 5 ? addDays(mondayOf(new Date()), 7) : new Date()));
  const [view, setView] = useState<View>('week');
  const [loc, setLoc] = useState('all');
  const team = useMemo(() => staff.filter((m) => m.active && services.some((s) => s.staffIds.includes(m.id))), [staff, services]);
  const [staffF, setStaffF] = useState(() => (me && me.role === 'orders' && team.some((m) => m.id === me.id) ? me.id : 'all'));
  const [statusF, setStatusF] = useState<StatusFilter>('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string | null>(() => linked?.id ?? null);
  const [drawer, setDrawer] = useState(() => !!linked);
  const [addOpen, setAddOpen] = useState(() => params.get('new') === '1' && can('appointments', 'edit'));
  const [prefill, setPrefill] = useState<AddBookingPrefill | null>(() => (params.get('inquiry') ? { inquiryId: params.get('inquiry')! } : null));
  const canEdit = can('appointments', 'edit');

  /* week */
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(anchor, i)), [anchor]);
  const weekKeys = useMemo(() => new Set(days.map((d) => dayKey(d))), [days]);
  const todayKey = dayKey(now);
  useEffect(() => {
    if (!weekKeys.has(day)) setDay(weekKeys.has(todayKey) ? todayKey : dayKey(days[0]));
  }, [weekKeys, day, todayKey, days]);

  const svcById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        if (loc !== 'all' && b.location !== loc) return false;
        if (staffF !== 'all' && b.staffId !== staffF) return false;
        if (statusF !== 'all' && b.status !== statusF) return false;
        return true;
      }),
    [bookings, loc, staffF, statusF],
  );
  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of filtered) {
      const k = dayKey(b.start);
      if (!weekKeys.has(k)) continue;
      (m.get(k) ?? m.set(k, []).get(k)!).push(b);
    }
    for (const list of m.values()) list.sort((a, b) => a.start.localeCompare(b.start));
    return m;
  }, [filtered, weekKeys]);
  const highlight = useMemo(() => {
    if (!q.trim()) return null;
    return new Set(filtered.filter((b) => matches(q, [b.customerName, b.phone, b.email, b.city, b.address, b.note])).map((b) => b.id));
  }, [filtered, q]);

  /* stats (live bookings of the visible week, current staff filter) */
  const stats = useMemo(() => {
    const week = [...byDay.values()].flat();
    const live = week.filter(isLive);
    const people = staffF === 'all' ? Math.max(1, team.length) : 1;
    const openMin = days.reduce((sum, d) => {
      const w = windowFor(rules, dayKey(d));
      return sum + (w.open ? w.to - w.from : 0);
    }, 0);
    const bookedMin = live.reduce((s, b) => s + b.durationMin, 0);
    return {
      week: live.length,
      today: filtered.filter((b) => isLive(b) && dayKey(b.start) === todayKey).length,
      pending: bookings.filter((b) => b.status === 'pending' && new Date(b.start).getTime() + b.durationMin * 60000 > now).length,
      load: openMin ? Math.round((bookedMin / (openMin * people)) * 100) : 0,
      hours: bookedMin / 60,
    };
  }, [byDay, filtered, staffF, team.length, days, rules, todayKey, bookings, now]);

  const pending = useMemo(
    () => bookings.filter((b) => b.status === 'pending' && new Date(b.start).getTime() + b.durationMin * 60000 > now).sort((a, b) => a.start.localeCompare(b.start)),
    [bookings, now],
  );

  /* grid columns */
  const weekColumns: GridColumn[] = days.map((d) => {
    const k = dayKey(d);
    const list = byDay.get(k) ?? [];
    const win = windowFor(rules, k);
    const live = list.filter(isLive).length;
    return {
      key: k,
      day: k,
      title: dayHeader(d, lang),
      sub: !win.open ? (win.exception ? l(win.exception.label) : ta('closed')) : win.exception ? ta('reduced', { from: fromMin(win.from), to: fromMin(win.to) }) : live ? t(`count_${plural(live, lang)}`, { n: live }) : '—',
      bookings: list,
      window: win,
      isToday: k === todayKey,
    };
  });
  const dayList = byDay.get(day) ?? [];
  const dayWin = windowFor(rules, day);
  const staffCols: GridColumn[] = (staffF === 'all' ? team : team.filter((m) => m.id === staffF)).map((m) => {
    const list = dayList.filter((b) => b.staffId === m.id);
    const live = list.filter(isLive).length;
    return {
      key: `${day}-${m.id}`,
      day,
      title: m.name,
      icon: <StaffAvatar staff={m} size="xs" className="ring-0" />,
      sub: live ? t(`count_${plural(live, lang)}`, { n: live }) : '—',
      bookings: list,
      window: dayWin,
      isToday: day === todayKey,
      staffId: m.id,
    };
  });
  const singleCol: GridColumn[] = weekColumns.filter((c) => c.day === day);

  /* actions */
  const openBooking = (id: string) => {
    setSelected(id);
    setDrawer(true);
  };
  const closeDrawer = () => {
    setDrawer(false);
    if (params.has('id')) {
      params.delete('id');
      setParams(params, { replace: true });
    }
  };
  const openAdd = (p: AddBookingPrefill | null) => {
    setPrefill(p);
    setAddOpen(true);
  };
  const closeAdd = () => {
    setAddOpen(false);
    if (params.has('new') || params.has('inquiry')) {
      params.delete('new');
      params.delete('inquiry');
      setParams(params, { replace: true });
    }
  };
  const goWeek = (delta: number) => setAnchor((a) => addDays(a, delta * 7));
  const goToday = () => {
    setAnchor(mondayOf(new Date()));
    setDay(dayKey(new Date()));
  };
  const confirm = (b: Booking) => {
    setBookingStatus(b.id, 'confirmed');
    toast.success(t('confirmed', { name: b.customerName }));
  };

  const weekLabel = t('week', { range: rangeLabel(days[0], days[days.length - 1], lang) });
  const isThisWeek = weekKeys.has(todayKey);
  const effectiveView: View = view;

  const statItems = [
    { id: 'week', label: t('statWeek'), value: stats.week, hint: weekLabel },
    { id: 'today', label: t('statToday'), value: stats.today, hint: dayMonth(new Date(now), lang) },
    { id: 'pending', label: t('statPending'), value: stats.pending, hint: statusF === 'pending' ? t('filterOn') : t('filterHint'), onClick: () => setStatusF(statusF === 'pending' ? 'all' : 'pending'), active: statusF === 'pending' },
    { id: 'load', label: t('statHours'), value: `${num(stats.hours, lang, 1)} h`, hint: t('statHoursHint', { pct: stats.load }) },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[tadm('nav_appointments'), tadm('nav_calendar')]}
        title={t('title')}
        description={t('desc')}
        actions={
          <>
            <ButtonLink to="/admin/termini/usluge" variant="outline" shape="rounded" size="sm" icon={<Settings2 className="h-4 w-4" />}>
              <span className="hidden sm:inline">{t('services')}</span>
              <span className="sm:hidden">{tadm('nav_services')}</span>
            </ButtonLink>
            <span title={canEdit ? undefined : ta('noPerm')}>
              <Button shape="rounded" size="sm" icon={<CalendarPlus className="h-4 w-4" />} disabled={!canEdit} onClick={() => openAdd(view === 'day' || !desktop ? { day } : null)}>
                {t('add')}
              </Button>
            </span>
          </>
        }
      />

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-5 sm:gap-3 lg:grid-cols-4">
        {statItems.map((s) => {
          const Tag = s.onClick ? 'button' : 'div';
          return (
            <Tag
              key={s.id}
              {...(s.onClick ? { type: 'button' as const, onClick: s.onClick, 'aria-pressed': s.active } : {})}
              className={cn(
                'rounded-xl border bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors',
                s.active ? 'border-ink ring-1 ring-ink' : 'border-line/80',
                s.onClick && 'hover:border-ink/30',
              )}
            >
              <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
                {s.id === 'pending' && <Clock className="h-3.5 w-3.5" />}
                {s.label}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[22px] font-bold tracking-tight text-ink tabular-nums">{s.value}</span>
                <span className="truncate text-[12px] text-muted">{s.hint}</span>
              </div>
            </Tag>
          );
        })}
      </div>

      {/* Calendar */}
      <Card padded={false} className="overflow-hidden">
        {/* Toolbar: week · view / location · staff · status · search (PDF p.46) */}
        <div className="space-y-2.5 border-b border-line/70 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex shrink-0 items-center rounded-lg border border-line bg-white">
                <button type="button" onClick={() => goWeek(-1)} aria-label={t('prev')} title={t('prev')} className="grid h-9 w-9 place-items-center rounded-l-lg text-ink-soft hover:bg-canvas hover:text-ink">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={goToday} disabled={isThisWeek && day === todayKey} className="h-9 border-x border-line px-3 text-[13px] font-semibold text-ink hover:bg-canvas disabled:text-muted">
                  {t('today')}
                </button>
                <button type="button" onClick={() => goWeek(1)} aria-label={t('next')} title={t('next')} className="grid h-9 w-9 place-items-center rounded-r-lg text-ink-soft hover:bg-canvas hover:text-ink">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h2 className="flex min-w-0 items-baseline gap-2 text-[15px] font-bold text-ink">
                <span className="truncate">{weekLabel}</span>
                <span className="hidden text-[12px] font-medium text-muted sm:inline">W{isoWeek(anchor)}</span>
              </h2>
            </div>
              <div className="flex shrink-0 rounded-lg bg-canvas p-0.5" role="tablist">
                {(['day', 'week'] as const).map((v) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn('h-8 rounded-md px-3.5 text-[12.5px] font-semibold transition-colors', view === v ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}>
                    {v === 'day' ? t('viewDay') : t('viewWeek')}
                  </button>
                ))}
              </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select value={loc} onChange={(e) => setLoc(e.target.value)} className={selectCls} style={{ backgroundImage: CHEVRON }} aria-label={ta('location')}>
              <option value="all">{ta('allLocations')}</option>
              {settings.locations.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
              <option value="onsite">{ta('onsite')}</option>
            </select>
            <select value={staffF} onChange={(e) => setStaffF(e.target.value)} className={selectCls} style={{ backgroundImage: CHEVRON }} aria-label={ta('staff')}>
              <option value="all">{ta('allStaff')}</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select value={statusF} onChange={(e) => setStatusF(e.target.value as StatusFilter)} className={selectCls} style={{ backgroundImage: CHEVRON }} aria-label={ta('status')}>
              <option value="all">{t('allStatuses')}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{ta(`st_${s}`)}</option>
              ))}
            </select>
            <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="[&_input]:h-9! sm:ml-auto sm:w-64" />
          </div>
        </div>

        {highlight && (
          <div className="flex items-center justify-between gap-2 border-b border-line/70 bg-canvas/60 px-4 py-2 text-[12.5px] text-ink-soft">
            <span>{t('found', { n: highlight.size })}</span>
            <button type="button" onClick={() => setQ('')} className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink">
              <X className="h-3.5 w-3.5" /> {tadm('clear')}
            </button>
          </div>
        )}

        {/* Day strip (day view, and always on phones) */}
        {(effectiveView === 'day' || !desktop) && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-line/70 px-3 py-2.5 sm:px-4">
            {days.map((d) => {
              const k = dayKey(d);
              const list = (byDay.get(k) ?? []).filter(isLive);
              const win = windowFor(rules, k);
              const on = k === day;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDay(k)}
                  className={cn(
                    'flex min-w-[64px] flex-1 flex-col items-center rounded-lg border px-2 py-1.5 transition-colors',
                    on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/30',
                    !win.open && !on && 'bg-canvas/60 text-muted',
                  )}
                >
                  <span className={cn('text-[11px] font-semibold uppercase tracking-wide', on ? 'text-white/70' : 'text-muted')}>{dayHeader(d, lang, true).split(' ')[0]}</span>
                  <span className="text-[16px] font-bold leading-tight tabular-nums">{d.getDate()}</span>
                  <span className={cn('mt-0.5 h-4 text-[10.5px] font-semibold tabular-nums', on ? 'text-white/80' : 'text-muted')}>{!win.open ? '—' : list.length ? list.length : ''}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        {desktop ? (
          <div className="px-2 pb-3 pt-0 sm:px-3">
            <TimeGrid
              columns={effectiveView === 'week' ? weekColumns : staffCols}
              services={services}
              staff={staff}
              selectedId={drawer ? selected : null}
              onSelect={openBooking}
              onSlot={canEdit ? (d, minutes, staffId) => openAdd({ day: d, minutes, staffId }) : undefined}
              now={now}
              highlight={highlight}
            />
          </div>
        ) : effectiveView === 'day' ? (
          <div className="px-1.5 pb-3">
            <TimeGrid columns={singleCol} services={services} staff={staff} selectedId={drawer ? selected : null} onSelect={openBooking} onSlot={canEdit ? (d, minutes) => openAdd({ day: d, minutes }) : undefined} now={now} highlight={highlight} pxPerMin={1.1} />
          </div>
        ) : (
          <AgendaList days={days} byDay={byDay} rules={rules} onOpen={openBooking} highlight={highlight} todayKey={todayKey} />
        )}

        {/* Legend */}
        <div className="flex flex-col gap-2 border-t border-line/70 bg-canvas/40 px-4 py-3 text-[12px] text-muted md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="font-semibold text-ink-soft">{t('legend')}:</span>
            {services.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                <ServiceDot color={s.color} /> {l(s.name)} <span className="text-muted/80">· {t('capacity', { n: s.capacity })}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-5 rounded-sm ring-1 ring-line" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.12) 0 3px, transparent 3px 6px)' }} />
              {t('hatched')}
            </span>
            <span>{t('tz', { tz: settings.timezone })}</span>
            {canEdit && desktop && <span className="hidden 2xl:inline">· {t('clickHint')}</span>}
          </div>
        </div>
      </Card>

      {/* Pending queue */}
      <Card className="mt-5" padded={false} title={<span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-muted" /> {t('pendingTitle')} <span className="rounded-md bg-canvas px-1.5 text-[12px] tabular-nums text-ink-soft">{pending.length}</span></span>} description={t('pendingDesc')}>
        {pending.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-6 text-[13.5px] text-muted">
            <CircleCheck className="h-4 w-4" /> {t('noPending')}
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {pending.map((b) => {
              const s = svcById.get(b.serviceId);
              const m = staff.find((x) => x.id === b.staffId);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-5">
                  <button type="button" onClick={() => openBooking(b.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="flex w-[74px] shrink-0 flex-col rounded-lg border border-line bg-white px-2 py-1 text-center">
                      <span className="text-[10.5px] font-semibold uppercase text-muted">{dayHeader(new Date(b.start), lang, true)}</span>
                      <span className="text-[13px] font-bold text-ink tabular-nums">{timeRange(b.start, b.durationMin).split('–')[0]}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 truncate text-[13.5px] font-semibold text-ink">
                        <ServiceDot color={s?.color ?? '#888'} /> {s ? l(s.name) : '—'} / {b.customerName}
                      </span>
                      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted">
                        <StatusMark status={b.status} className="text-amber-800" />
                        <span className="truncate">· {firstName(m)} · {[b.city, b.phone].filter(Boolean).join(' · ')}{b.inquiryId ? ` · ${t('web')}` : ''}</span>
                      </span>
                    </span>
                  </button>
                  <div className="ml-auto flex shrink-0 gap-2">
                    <Button size="xs" shape="rounded" variant="outline" onClick={() => openBooking(b.id)}>
                      {t('open')}
                    </Button>
                    <span title={canEdit ? undefined : ta('noPerm')}>
                      <Button size="xs" shape="rounded" icon={<CircleCheck className="h-3.5 w-3.5" />} disabled={!canEdit} onClick={() => confirm(b)}>
                        {t('confirm')}
                      </Button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <BookingDrawer bookingId={selected} open={drawer} onClose={closeDrawer} />
      <AddBookingModal
        open={addOpen}
        onClose={closeAdd}
        prefill={prefill}
        onCreated={(b) => {
          setAnchor(mondayOf(b.start));
          setDay(dayKey(b.start));
          setSelected(b.id);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phone "week" view: a compact agenda grouped by day                  */
/* ------------------------------------------------------------------ */
function AgendaList({ days, byDay, rules, onOpen, highlight, todayKey }: { days: Date[]; byDay: Map<string, Booking[]>; rules: ReturnType<typeof useBookingRules>; onOpen: (id: string) => void; highlight: Set<string> | null; todayKey: string }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  return (
    <div className="divide-y divide-line/70">
      {days.map((d) => {
        const k = dayKey(d);
        const list = byDay.get(k) ?? [];
        const win = windowFor(rules, k);
        return (
          <section key={k} className="px-3 py-3">
            <h3 className="mb-2 flex items-center justify-between text-[13px] font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-muted" />
                {dayHeader(d, lang)} {dayMonth(d, lang).replace(/^\d+\.?\s*/, '')}
                {k === todayKey && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
              </span>
              <span className="text-[12px] font-medium text-muted">{!win.open ? t('closedDay') : `${fromMin(win.from)}–${fromMin(win.to)}`}</span>
            </h3>
            {list.length === 0 ? (
              <p className="rounded-lg bg-canvas/60 px-3 py-2 text-[12.5px] text-muted">{win.open ? t('noneDay') : win.exception ? l(win.exception.label) : ta('closed')}</p>
            ) : (
              <ul className="space-y-1.5">
                {list.map((b) => {
                  const s = services.find((x) => x.id === b.serviceId);
                  const off = b.status === 'cancelled' || b.status === 'noshow';
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(b.id)}
                        className={cn('flex w-full items-stretch gap-3 rounded-lg border-l-[3px] px-3 py-2 text-left', highlight && !highlight.has(b.id) && 'opacity-30', b.status === 'pending' && 'border-y border-r border-dashed')}
                        style={{ background: off ? '#f4f4f4' : tint(s?.color ?? '#888', 12), borderLeftColor: off ? '#b5b5b5' : s?.color }}
                      >
                        <span className="w-[86px] shrink-0 text-[12.5px] font-semibold text-ink tabular-nums">{timeRange(b.start, b.durationMin)}</span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block truncate text-[13px] font-semibold text-ink', off && 'text-muted line-through')}>
                            {s ? l(s.name) : '—'} / {b.customerName}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-ink-soft">
                            <StatusMark status={b.status} /> <span className="text-muted">· {firstName(staff.find((m) => m.id === b.staffId))}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
