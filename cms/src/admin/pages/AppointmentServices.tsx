import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Ban, BellRing, CalendarOff, CalendarRange, Clock3, CreditCard, Globe2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Field';
import { Badge } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, Table, Td, Th, Tr } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { ap } from '@/admin/components/appointments/i18n';
import { ServiceEditor, newService } from '@/admin/components/appointments/ServiceEditor';
import { dayMonth, dayName, dayKey, parseDay, toMin } from '@/admin/components/appointments/dates';
import { rulesPatch, type BookingException, type BookingRules } from '@/admin/components/appointments/rules';
import { ServiceDot, StaffAvatar, TimeSelect, isLive, useBookingRules, useLocationLabel } from '@/admin/components/appointments/shared';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { money } from '@/lib/format';
import type { Lang, Service } from '@/lib/types';
import { cn, uid } from '@/lib/utils';

const T = defineDict({
  me: {
    title: 'Usluge i radno vrijeme',
    desc: 'Usluge, kapacitet i osoblje, sedmični raspored, praznici i pravila rezervacije — kalendar i forma na sajtu ih poštuju.',
    newService: 'Nova usluga',
    services: 'Usluge',
    servicesDesc: 'Trajanje, kapacitet, cijena, boja i ko radi uslugu.',
    colService: 'Usluga',
    colUpcoming: 'Predstojeći',
    upcomingN: '{n}',
    noPrice: '—',
    hours: 'Sedmično radno vrijeme',
    hoursDesc: 'Važi za sve usluge i online zahtjeve.',
    open: 'Otvoreno',
    closed: 'Zatvoreno',
    to: 'do',
    hoursInvalid: 'Kraj mora biti poslije početka',
    exceptions: 'Praznici i izuzeci',
    exceptionsDesc: 'Neradni dani i skraćeno radno vrijeme — u kalendaru su šrafirani.',
    exFrom: 'Od',
    exTo: 'Do (opciono)',
    exLabel: 'Naziv',
    exLabelPh: 'npr. Godišnji popis okvira',
    exClosed: 'Zatvoreno',
    exReduced: 'Skraćeno',
    exAdd: 'Dodaj izuzetak',
    exPast: 'Prošlo',
    exNone: 'Nema praznika ni izuzetaka.',
    exInvalid: 'Unesite datum i naziv',
    rules: 'Pravila rezervacije',
    rulesDesc: 'Zona, minimalno vrijeme i razmak između termina.',
    minNotice: 'Minimalno vrijeme za rezervaciju',
    minNoticeHint: 'Online zahtjevi ne mogu biti za manje od ovoga.',
    cancelNotice: 'Minimalno vrijeme za otkazivanje',
    cancelNoticeHint: 'Kasnije otkazivanje se označava kao kasno.',
    buffer: 'Pauza između termina',
    bufferHint: 'Vreme za pripremu i dezinfekciju opreme, po osobi.',
    step: 'Korak termina',
    stepHint: 'Ponuđena vremena: 10:00, 10:30…',
    manual: 'Ručna potvrda',
    manualHint: 'Zahtjevi sa sajta ostaju „Na čekanju“ dok ih tim ne potvrdi telefonom.',
    timezone: 'Vremenska zona',
    tzHint: 'Ljetnje/zimsko računanje vremena se primjenjuje automatski.',
    pay: 'Plaćanje i podsjetnici',
    payDesc: 'Avans za plaćene usluge, e-mail potvrda i podsjetnik.',
    deposit: 'Avans / depozit',
    depositHint: 'Za plaćene usluge, sa posebnom referencom transakcije. Kartično plaćanje: {status}.',
    intConnected: 'povezano',
    intTest: 'test način',
    intOff: 'nije povezano',
    emailConfirm: 'E-mail potvrde termina',
    emailReminder: 'Podsjetnik dan ranije',
    on: 'Uključeno',
    off: 'Isključeno',
    manageNotif: 'Uredi obavještenja',
    reminderNote: 'Podsjetnici se otkazuju kada se termin pomjeri ili otkaže.',
    saved: 'Pravila su sačuvana',
    readOnly: 'Samo pregled — vaša uloga ne može mijenjati podešavanja termina.',
    onsiteShort: 'Kod klijenta',
    hoursUnit: 'h',
  },
  sq: {
    title: 'Shërbimet & orari',
    desc: 'Shërbimet, kapaciteti dhe stafi, orari javor, pushimet dhe rregullat e rezervimit — kalendari dhe formulari në faqe i respektojnë.',
    newService: 'Shërbim i ri',
    services: 'Shërbimet',
    servicesDesc: 'Kohëzgjatja, kapaciteti, çmimi, ngjyra dhe kush e ofron.',
    colService: 'Shërbimi',
    colUpcoming: 'Të ardhshme',
    upcomingN: '{n}',
    noPrice: '—',
    hours: 'Orari javor',
    hoursDesc: 'Vlen për të gjitha shërbimet dhe kërkesat online.',
    open: 'Hapur',
    closed: 'Mbyllur',
    to: 'deri',
    hoursInvalid: 'Mbarimi duhet të jetë pas fillimit',
    exceptions: 'Pushime & përjashtime',
    exceptionsDesc: 'Ditë pushimi dhe orar i shkurtuar — në kalendar shfaqen me vija.',
    exFrom: 'Nga',
    exTo: 'Deri (opsionale)',
    exLabel: 'Përshkrimi',
    exLabelPh: 'p.sh. Inventari vjetor i kornizave',
    exClosed: 'Mbyllur',
    exReduced: 'I shkurtuar',
    exAdd: 'Shto përjashtim',
    exPast: 'Kaluar',
    exNone: 'Asnjë pushim apo përjashtim.',
    exInvalid: 'Shkruani datën dhe përshkrimin',
    rules: 'Rregullat e rezervimit',
    rulesDesc: 'Zona kohore, koha minimale dhe intervali mes takimeve.',
    minNotice: 'Koha minimale për rezervim',
    minNoticeHint: 'Kërkesat online nuk mund të jenë më afër se kaq.',
    cancelNotice: 'Koha minimale për anulim',
    cancelNoticeHint: 'Anulimi më vonë shënohet si i vonë.',
    buffer: 'Interval mes takimeve',
    bufferHint: 'Kohë për përgatitje dhe dezinfektim të pajisjeve, për person.',
    step: 'Hapi i intervaleve',
    stepHint: 'Oraret e ofruara: 10:00, 10:30…',
    manual: 'Konfirmim manual',
    manualHint: 'Kërkesat nga faqja mbeten „Në pritje“ derisa ekipi t’i konfirmojë me telefon.',
    timezone: 'Zona kohore',
    tzHint: 'Kalimi i orës verë/dimër zbatohet automatikisht.',
    pay: 'Pagesa & kujtesat',
    payDesc: 'Pagesë paraprake për shërbimet me pagesë, email konfirmimi dhe kujtese.',
    deposit: 'Pagesë paraprake / depozitë',
    depositHint: 'Për shërbimet me pagesë, me referencë të veçantë transaksioni. Pagesa me kartë: {status}.',
    intConnected: 'e lidhur',
    intTest: 'në provë',
    intOff: 'e palidhur',
    emailConfirm: 'Email konfirmimi i terminit',
    emailReminder: 'Kujtesë një ditë më parë',
    on: 'Aktiv',
    off: 'Joaktiv',
    manageNotif: 'Ndrysho njoftimet',
    reminderNote: 'Kujtesat anulohen kur termini ndryshon ose anulohet.',
    saved: 'Rregullat u ruajtën',
    readOnly: 'Vetëm shikim — roli juaj nuk mund të ndryshojë konfigurimin e termineve.',
    onsiteShort: 'Te klienti',
    hoursUnit: 'orë',
  },
  en: {
    title: 'Services & hours',
    desc: 'Services, capacity and staff, weekly hours, holidays and booking rules — the calendar and the website form follow them.',
    newService: 'New service',
    services: 'Services',
    servicesDesc: 'Duration, capacity, price, colour and who offers it.',
    colService: 'Service',
    colUpcoming: 'Upcoming',
    upcomingN: '{n}',
    noPrice: '—',
    hours: 'Weekly opening hours',
    hoursDesc: 'Applies to every service and online request.',
    open: 'Open',
    closed: 'Closed',
    to: 'to',
    hoursInvalid: 'End must be after start',
    exceptions: 'Holidays & exceptions',
    exceptionsDesc: 'Closed days and short hours — hatched in the calendar.',
    exFrom: 'From',
    exTo: 'To (optional)',
    exLabel: 'Label',
    exLabelPh: 'e.g. Annual frame stock-take',
    exClosed: 'Closed',
    exReduced: 'Short hours',
    exAdd: 'Add exception',
    exPast: 'Past',
    exNone: 'No holidays or exceptions.',
    exInvalid: 'Enter a date and a label',
    rules: 'Booking rules',
    rulesDesc: 'Time zone, minimum notice and the gap between appointments.',
    minNotice: 'Minimum booking notice',
    minNoticeHint: 'Online requests cannot be sooner than this.',
    cancelNotice: 'Minimum cancellation notice',
    cancelNoticeHint: 'Later cancellations are flagged as late.',
    buffer: 'Buffer between appointments',
    bufferHint: 'Preparation and equipment cleaning time, per person.',
    step: 'Slot step',
    stepHint: 'Offered times: 10:00, 10:30…',
    manual: 'Manual confirmation',
    manualHint: 'Website requests stay “Pending” until the team confirms them by phone.',
    timezone: 'Time zone',
    tzHint: 'Summer/winter time is applied automatically.',
    pay: 'Payment & reminders',
    payDesc: 'Deposit for paid services, confirmation e-mail and reminder.',
    deposit: 'Deposit / prepayment',
    depositHint: 'For paid services, with its own transaction reference. Card payments: {status}.',
    intConnected: 'connected',
    intTest: 'test mode',
    intOff: 'not connected',
    emailConfirm: 'Booking confirmation e-mail',
    emailReminder: 'Reminder the day before',
    on: 'On',
    off: 'Off',
    manageNotif: 'Edit notifications',
    reminderNote: 'Reminders are cancelled when a booking moves or is cancelled.',
    saved: 'Rules saved',
    readOnly: 'View only — your role cannot change the appointment setup.',
    onsiteShort: 'At the client',
    hoursUnit: 'h',
  },
});

const numCls = 'h-9 w-full rounded-lg border border-line bg-white pl-3 pr-12 text-[13.5px] tabular-nums text-ink outline-none transition focus:border-ink/40 disabled:bg-canvas';

function exRange(e: BookingException, lang: Lang) {
  const a = parseDay(e.date);
  if (!e.dateTo || e.dateTo === e.date) return `${dayMonth(a, lang)} ${a.getFullYear()}`;
  const b = parseDay(e.dateTo);
  return `${dayMonth(a, lang, true)} – ${dayMonth(b, lang, true)} ${b.getFullYear()}`;
}

export default function AppointmentServices() {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const tadm = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);
  const settings = useDb((s) => s.settings);
  const updateSettings = useDb((s) => s.updateSettings);
  const saved = useBookingRules();
  const locLabel = useLocationLabel();
  const canEdit = can('appointments', 'edit');

  const [draft, setDraft] = useState<BookingRules>(() => structuredClone(saved));
  const [base, setBase] = useState(saved);
  if (base !== saved) {
    // settings changed elsewhere (another tab / demo reset) → follow it
    setBase(saved);
    setDraft(structuredClone(saved));
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const [editing, setEditing] = useState<Service | null>(null);
  const [exForm, setExForm] = useState({ date: '', dateTo: '', label: '', closed: true, from: '10:00', to: '14:00' });
  const [exError, setExError] = useState('');

  const upcoming = useMemo(() => {
    const now = Date.now();
    const m = new Map<string, number>();
    for (const b of bookings) if (isLive(b) && b.status !== 'done' && new Date(b.start).getTime() > now) m.set(b.serviceId, (m.get(b.serviceId) ?? 0) + 1);
    return m;
  }, [bookings]);

  const hoursErrors = draft.hours.map((h) => (h.open && toMin(h.to) <= toMin(h.from) ? t('hoursInvalid') : ''));
  const setHours = (i: number, patch: Partial<BookingRules['hours'][number]>) => setDraft((d) => ({ ...d, hours: d.hours.map((h, j) => (j === i ? { ...h, ...patch } : h)) }));
  const setRule = <K extends keyof BookingRules>(k: K, v: BookingRules[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    if (hoursErrors.some(Boolean)) {
      toast.error(t('hoursInvalid'));
      return;
    }
    updateSettings(rulesPatch(draft));
    toast.success(t('saved'));
  };

  const addException = () => {
    if (!exForm.date || !exForm.label.trim()) return setExError(t('exInvalid'));
    if (!exForm.closed && toMin(exForm.to) <= toMin(exForm.from)) return setExError(t('hoursInvalid'));
    const label = exForm.label.trim();
    const ex: BookingException = {
      id: uid('ex'),
      date: exForm.date,
      ...(exForm.dateTo && exForm.dateTo > exForm.date ? { dateTo: exForm.dateTo } : {}),
      label: { me: label, sq: label, en: label },
      closed: exForm.closed,
      ...(exForm.closed ? {} : { from: exForm.from, to: exForm.to }),
    };
    setDraft((d) => ({ ...d, exceptions: [...d.exceptions, ex].sort((a, b) => a.date.localeCompare(b.date)) }));
    setExForm({ date: '', dateTo: '', label: '', closed: true, from: '10:00', to: '14:00' });
    setExError('');
  };

  const card = settings.integrations.find((x) => x.kind === 'payment');
  const cardStatus = card?.status === 'connected' ? t('intConnected') : card?.status === 'test' ? t('intTest') : t('intOff');
  const notif = (event: string) => settings.notifications.find((n) => n.event === event);
  const today = dayKey(new Date());
  const exceptions = [...draft.exceptions].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="animate-fade-in pb-24">
      <PageHeader
        back="/admin/termini"
        breadcrumbs={[{ label: tadm('nav_appointments'), to: '/admin/termini' }, tadm('nav_services')]}
        title={t('title')}
        description={t('desc')}
        actions={
          <span title={canEdit ? undefined : ta('noPerm')}>
            <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!canEdit} onClick={() => setEditing(newService())}>
              {t('newService')}
            </Button>
          </span>
        }
      />

      {!canEdit && <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-muted">{t('readOnly')}</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left column */}
        <div className="min-w-0 space-y-5">
          <Card title={t('services')} description={t('servicesDesc')} padded={false}>
            {/* Table ≥ md */}
            <div className="hidden md:block">
              <Table className="[&_table]:min-w-0">
                <thead>
                  <tr>
                    <Th>{t('colService')}</Th>
                    <Th>{ta('duration')}</Th>
                    <Th>{ta('capacity')}</Th>
                    <Th>{ta('price')}</Th>
                    <Th>{ta('staff')}</Th>
                    <Th>{t('colUpcoming')}</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => {
                    const team = staff.filter((m) => s.staffIds.includes(m.id));
                    return (
                      <Tr key={s.id} onClick={() => setEditing(s)}>
                        <Td>
                          <div className="flex items-start gap-2.5">
                            <ServiceDot color={s.color} className="mt-1" />
                            <div className="min-w-0">
                              <div className="font-semibold text-ink">{l(s.name)}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                                <MapPin className="h-3 w-3" /> {s.location === 'onsite' ? t('onsiteShort') : locLabel(s.location)}
                              </div>
                            </div>
                          </div>
                        </Td>
                        <Td className="tabular-nums">{ta('min', { n: s.durationMin })}</Td>
                        <Td className="tabular-nums">
                          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted" />{s.capacity}</span>
                        </Td>
                        <Td className="tabular-nums">{s.price ? money(s.price, lang) : s.price === 0 ? ta('free') : t('noPrice')}</Td>
                        <Td>
                          <div className="flex -space-x-1">
                            {team.map((m) => (
                              <StaffAvatar key={m.id} staff={m} size="sm" />
                            ))}
                          </div>
                        </Td>
                        <Td className="tabular-nums">{upcoming.get(s.id) ?? 0}</Td>
                        <Td>
                          <span className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink">
                            <Pencil className="h-4 w-4" />
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
            {/* List on phones */}
            <ul className="divide-y divide-line/70 md:hidden">
              {services.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => setEditing(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <ServiceDot color={s.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink">{l(s.name)}</span>
                      <span className="block text-[12.5px] text-muted">
                        {ta('min', { n: s.durationMin })} · {ta('capacity').toLowerCase()} {s.capacity} · {s.price ? money(s.price, lang) : s.price === 0 ? ta('free') : '—'}
                      </span>
                    </span>
                    <span className="flex -space-x-1.5">
                      {staff.filter((m) => s.staffIds.includes(m.id)).map((m) => (
                        <StaffAvatar key={m.id} staff={m} size="xs" />
                      ))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted" />{t('rules')}</span>} description={t('rulesDesc')}>
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              {(
                [
                  ['minNoticeHours', t('minNotice'), t('minNoticeHint'), t('hoursUnit'), 0, 168, 1],
                  ['cancelNoticeHours', t('cancelNotice'), t('cancelNoticeHint'), t('hoursUnit'), 0, 168, 1],
                  ['bufferMin', t('buffer'), t('bufferHint'), 'min', 0, 120, 5],
                ] as const
              ).map(([key, label, hint, unit, min, max, step]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[13px] font-semibold text-ink-soft">{label}</span>
                  <span className="relative block">
                    <input type="number" min={min} max={max} step={step} disabled={!canEdit} value={draft[key]} onChange={(e) => setRule(key, Math.max(min, Math.min(max, Number(e.target.value) || 0)))} className={numCls} />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-muted">{unit}</span>
                  </span>
                  <span className="mt-1 block text-[12px] text-muted">{hint}</span>
                </label>
              ))}
              <div>
                <span className="mb-1 block text-[13px] font-semibold text-ink-soft">{t('step')}</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[15, 30, 60].map((s) => (
                    <button key={s} type="button" disabled={!canEdit} onClick={() => setRule('slotStepMin', s)} aria-pressed={draft.slotStepMin === s} className={cn('h-9 rounded-lg border text-[13px] font-semibold tabular-nums transition-colors disabled:opacity-60', draft.slotStepMin === s ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30')}>
                      {s} min
                    </button>
                  ))}
                </div>
                <span className="mt-1 block text-[12px] text-muted">{t('stepHint')}</span>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-canvas/40 p-3 sm:col-span-2">
                <span>
                  <span className="block text-[13.5px] font-semibold text-ink">{t('manual')}</span>
                  <span className="block text-[12px] text-muted">{t('manualHint')}</span>
                </span>
                <Switch size="sm" checked={draft.manualConfirm} disabled={!canEdit} onChange={(v) => setRule('manualConfirm', v)} />
              </div>
              <div className="flex items-start gap-3 border-t border-line/70 pt-4 sm:col-span-2">
                <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink-soft">{t('timezone')}</span>
                  <span className="block text-[13.5px] font-semibold text-ink">{settings.timezone}</span>
                  <span className="block text-[12px] text-muted">{t('tzHint')}</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Exceptions */}
          <Card title={<span className="inline-flex items-center gap-2"><CalendarOff className="h-4 w-4 text-muted" />{t('exceptions')}</span>} description={t('exceptionsDesc')} padded={false}>
            {exceptions.length === 0 ? (
              <p className="px-5 py-5 text-[13.5px] text-muted">{t('exNone')}</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {exceptions.map((e) => {
                  const past = (e.dateTo || e.date) < today;
                  return (
                    <li key={e.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5', past && 'opacity-55')}>
                      <span className="w-full text-[13px] font-semibold text-ink tabular-nums sm:w-52">{exRange(e, lang)}</span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-soft">{l(e.label)}</span>
                      {e.closed ? (
                        <Badge tone="gray" className="gap-1!"><Ban className="h-3 w-3" />{t('exClosed')}</Badge>
                      ) : (
                        <Badge tone="amber" className="gap-1!"><Clock3 className="h-3 w-3" />{ta('reduced', { from: e.from ?? '', to: e.to ?? '' })}</Badge>
                      )}
                      {past && <span className="text-[12px] text-muted">{t('exPast')}</span>}
                      <button type="button" disabled={!canEdit} title={canEdit ? tadm('remove') : ta('noPerm')} onClick={() => setDraft((d) => ({ ...d, exceptions: d.exceptions.filter((x) => x.id !== e.id) }))} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-40">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {canEdit && (
              <div className="border-t border-line/70 bg-canvas/40 px-4 py-4 sm:px-5">
                <div className="grid gap-2.5 sm:grid-cols-[150px_150px_minmax(0,1fr)]">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{t('exFrom')}</span>
                    <input type="date" value={exForm.date} onChange={(e) => setExForm((f) => ({ ...f, date: e.target.value }))} className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13.5px] outline-none focus:border-ink/40" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{t('exTo')}</span>
                    <input type="date" value={exForm.dateTo} min={exForm.date || undefined} onChange={(e) => setExForm((f) => ({ ...f, dateTo: e.target.value }))} className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13.5px] outline-none focus:border-ink/40" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{t('exLabel')}</span>
                    <input value={exForm.label} onChange={(e) => setExForm((f) => ({ ...f, label: e.target.value }))} placeholder={t('exLabelPh')} className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[13.5px] outline-none focus:border-ink/40" />
                  </label>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg bg-white p-0.5 ring-1 ring-line">
                    {[true, false].map((c) => (
                      <button key={String(c)} type="button" onClick={() => setExForm((f) => ({ ...f, closed: c }))} className={cn('h-8 rounded-md px-3 text-[12.5px] font-semibold', exForm.closed === c ? 'bg-ink text-white' : 'text-muted hover:text-ink')}>
                        {c ? t('exClosed') : t('exReduced')}
                      </button>
                    ))}
                  </div>
                  {!exForm.closed && (
                    <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                      <TimeSelect value={exForm.from} onChange={(v) => setExForm((f) => ({ ...f, from: v }))} label={t('exFrom')} />
                      {t('to')}
                      <TimeSelect value={exForm.to} onChange={(v) => setExForm((f) => ({ ...f, to: v }))} label={t('exTo')} />
                    </span>
                  )}
                  <Button size="sm" shape="rounded" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={addException} className="ml-auto">
                    {t('exAdd')}
                  </Button>
                </div>
                {exError && <p className="mt-2 text-[12.5px] font-medium text-red-700">{exError}</p>}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-5">
          <Card title={<span className="inline-flex items-center gap-2"><CalendarRange className="h-4 w-4 text-muted" />{t('hours')}</span>} description={t('hoursDesc')} padded={false}>
            <ul className="divide-y divide-line/60">
              {draft.hours.map((h, i) => (
                <li key={i} className="px-4 py-2.5 sm:px-5">
                  <div className="flex items-center gap-3">
                    <span className="w-[84px] shrink-0 text-[13.5px] font-semibold text-ink">{dayName(i, lang)}</span>
                    <Switch size="sm" checked={h.open} disabled={!canEdit} onChange={(v) => setHours(i, { open: v })} />
                    {h.open ? (
                      <span className="ml-auto flex items-center gap-1.5 text-[12.5px] text-muted">
                        <TimeSelect value={h.from} disabled={!canEdit} onChange={(v) => setHours(i, { from: v })} label={`${dayName(i, lang)} ${t('exFrom')}`} />
                        <span>–</span>
                        <TimeSelect value={h.to} disabled={!canEdit} onChange={(v) => setHours(i, { to: v })} label={`${dayName(i, lang)} ${t('exTo')}`} />
                      </span>
                    ) : (
                      <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-muted">
                        <Ban className="h-3.5 w-3.5" /> {t('closed')}
                      </span>
                    )}
                  </div>
                  {hoursErrors[i] && <p className="mt-1 text-right text-[12px] font-medium text-red-700">{hoursErrors[i]}</p>}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><BellRing className="h-4 w-4 text-muted" />{t('pay')}</span>} description={t('payDesc')}>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <span className="flex items-start gap-2.5">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <span>
                    <span className="block text-[13.5px] font-semibold text-ink">{t('deposit')}</span>
                    <span className="block text-[12px] text-muted">{t('depositHint', { status: cardStatus })}</span>
                  </span>
                </span>
                <Switch size="sm" checked={draft.deposit} disabled={!canEdit || card?.status === 'disconnected'} onChange={(v) => setRule('deposit', v)} />
              </div>
              {(
                [
                  ['booking_confirmed', t('emailConfirm')],
                  ['booking_reminder', t('emailReminder')],
                ] as const
              ).map(([ev, label]) => {
                const n = notif(ev);
                return (
                  <div key={ev} className="flex items-center justify-between gap-3 border-t border-line/60 pt-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">{label}</span>
                      {n && <span className="block truncate text-[12px] text-muted">„{l(n.subject)}“</span>}
                    </span>
                    <span className={cn('inline-flex shrink-0 items-center gap-1.5 text-[12.5px] font-semibold', n?.enabled ? 'text-emerald-700' : 'text-muted')}>
                      <span className={cn('h-2 w-2 rounded-full', n?.enabled ? 'bg-emerald-600' : 'border border-ink/30')} />
                      {n?.enabled ? t('on') : t('off')}
                    </span>
                  </div>
                );
              })}
              <p className="text-[12px] text-muted">{t('reminderNote')}</p>
              <Link to="/admin/konfiguracija" className="inline-flex text-[13px] font-semibold text-ink underline-offset-2 hover:underline">
                {t('manageNotif')} →
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <ServiceEditor service={editing} open={!!editing} onClose={() => setEditing(null)} />
      <SaveBar dirty={dirty && canEdit} onSave={save} onDiscard={() => setDraft(structuredClone(saved))} />
    </div>
  );
}
