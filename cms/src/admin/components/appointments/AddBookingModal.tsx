import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CalendarPlus, Inbox, Link2, Search, User, X } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { aggregateCustomers } from '@/admin/components/crm/customers';
import { matches } from '@/admin/components/crm/shared';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { money } from '@/lib/format';
import type { Booking, BookingStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ap } from './i18n';
import { addDays, atMinutes, dayKey, dayName, dayMonth, fromMin, longDate, timeRange, weekdayIndex } from './dates';
import { checkSlot, slotsForDay, windowFor } from './rules';
import { CHEVRON, ServiceDot, StaffAvatar, useBookingRules, useLocationLabel, useReasonText } from './shared';

const T = defineDict({
  me: {
    title: 'Nova rezervacija',
    desc: 'Usluga → osoblje/lokacija → termin → kontakt → potvrda. Preklapanja preko kapaciteta se odbijaju.',
    s1: 'Usluga',
    s2: 'Osoblje i lokacija',
    s3: 'Termin',
    s4: 'Kontakt',
    s5: 'Potvrda',
    capacityN: 'kapacitet {n}',
    hoursOf: 'Radno vrijeme: {from}–{to}',
    noSlots: 'Nema slobodnih termina ovog dana — izaberite drugi dan ili osobu.',
    freeN: '{n} slobodnih od {total}',
    autoStaff: 'Dodjeljuje se: {name}',
    contactSearch: 'Postojeći upit ili kupac — ime, telefon, e-mail…',
    fromInquiry: 'Upit',
    fromCustomer: 'Kupac',
    linked: 'Povezano sa upitom',
    unlink: 'Ukloni vezu',
    noMatch: 'Nema postojećeg kontakta — unesite novi ispod.',
    name: 'Ime i prezime',
    phone: 'Telefon',
    email: 'E-mail',
    city: 'Grad',
    address: 'Adresa za dolazak',
    required: 'Obavezno polje',
    initial: 'Status',
    notePh: 'Napomena za tim (npr. donosi stari recept, nosi kontaktna sočiva)…',
    pickSlot: 'Izaberite termin',
    submit: 'Dodaj rezervaciju',
    added: 'Rezervacija je dodata — {name}, {when}',
    rejected: 'Rezervacija nije moguća',
    summaryEmpty: 'Izaberite termin da biste vidjeli pregled.',
    pendingHint: 'Klijent još treba da potvrdi',
    confirmedHint: 'Dogovoreno sa klijentom',
    close: 'Zatvori',
  },
  sq: {
    title: 'Rezervim i ri',
    desc: 'Shërbim → staf/lokacion → interval → kontakt → konfirmim. Mbivendosjet përtej kapacitetit refuzohen.',
    s1: 'Shërbimi',
    s2: 'Stafi & lokacioni',
    s3: 'Intervali',
    s4: 'Kontakti',
    s5: 'Konfirmimi',
    capacityN: 'kapaciteti {n}',
    hoursOf: 'Orari: {from}–{to}',
    noSlots: 'Nuk ka intervale të lira këtë ditë — zgjidhni një ditë ose person tjetër.',
    freeN: '{n} të lira nga {total}',
    autoStaff: 'Caktohet: {name}',
    contactSearch: 'Kërkesë ose klient ekzistues — emri, telefoni, e-maili…',
    fromInquiry: 'Kërkesë',
    fromCustomer: 'Klient',
    linked: 'Lidhur me kërkesën',
    unlink: 'Hiq lidhjen',
    noMatch: 'Asnjë kontakt ekzistues — shkruani një të ri më poshtë.',
    name: 'Emri dhe mbiemri',
    phone: 'Telefoni',
    email: 'E-mail',
    city: 'Qyteti',
    address: 'Adresa e vizitës',
    required: 'Fushë e detyrueshme',
    initial: 'Statusi',
    notePh: 'Shënim për ekipin (p.sh. sjell recetën e vjetër, mban lente kontakti)…',
    pickSlot: 'Zgjidhni intervalin',
    submit: 'Shto rezervim',
    added: 'Rezervimi u shtua — {name}, {when}',
    rejected: 'Rezervimi nuk është i mundur',
    summaryEmpty: 'Zgjidhni një interval për të parë përmbledhjen.',
    pendingHint: 'Klienti duhet ta konfirmojë',
    confirmedHint: 'Rënë dakord me klientin',
    close: 'Mbyll',
  },
  en: {
    title: 'New booking',
    desc: 'Service → staff/location → slot → contact → confirm. Overlaps beyond capacity are rejected.',
    s1: 'Service',
    s2: 'Staff & location',
    s3: 'Time slot',
    s4: 'Contact',
    s5: 'Confirmation',
    capacityN: 'capacity {n}',
    hoursOf: 'Opening hours: {from}–{to}',
    noSlots: 'No free slots this day — pick another day or person.',
    freeN: '{n} of {total} free',
    autoStaff: 'Assigned to: {name}',
    contactSearch: 'Existing enquiry or customer — name, phone, e-mail…',
    fromInquiry: 'Enquiry',
    fromCustomer: 'Customer',
    linked: 'Linked to enquiry',
    unlink: 'Unlink',
    noMatch: 'No existing contact — enter a new one below.',
    name: 'Full name',
    phone: 'Phone',
    email: 'E-mail',
    city: 'City',
    address: 'Visit address',
    required: 'Required',
    initial: 'Status',
    notePh: 'Note for the team (e.g. bringing an old prescription, wears contact lenses)…',
    pickSlot: 'Pick a slot',
    submit: 'Add booking',
    added: 'Booking added — {name}, {when}',
    rejected: 'Booking not possible',
    summaryEmpty: 'Pick a slot to see the summary.',
    pendingHint: 'The client still has to confirm',
    confirmedHint: 'Agreed with the client',
    close: 'Close',
  },
});

export interface AddBookingPrefill {
  day?: string;
  minutes?: number;
  staffId?: string;
  serviceId?: string;
  inquiryId?: string;
}

interface Contact {
  name: string;
  phone: string;
  email: string;
  city: string;
  inquiryId?: string;
}

function Step({ n, title, children, aside }: { n: number; title: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="border-b border-line/70 px-5 py-5 last:border-b-0 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-[14px] font-bold text-ink">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11.5px] font-bold text-white tabular-nums">{n}</span>
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

const selectCls = 'h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-white bg-[length:14px] bg-[right_12px_center] bg-no-repeat pl-3 pr-9 text-[13.5px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5';

export function AddBookingModal({ open, onClose, prefill, onCreated }: { open: boolean; onClose: () => void; prefill?: AddBookingPrefill | null; onCreated?: (b: Booking) => void }) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      {open && <AddBookingForm key={JSON.stringify(prefill ?? {})} prefill={prefill ?? {}} onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

function AddBookingForm({ prefill, onClose, onCreated }: { prefill: AddBookingPrefill; onClose: () => void; onCreated?: (b: Booking) => void }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);
  const inquiries = useDb((s) => s.inquiries);
  const orders = useDb((s) => s.orders);
  const settings = useDb((s) => s.settings);
  const addBooking = useDb((s) => s.addBooking);
  const rules = useBookingRules();
  const reasonText = useReasonText();
  const locLabel = useLocationLabel();

  const fromInquiry = prefill.inquiryId ? inquiries.find((q) => q.id === prefill.inquiryId) : undefined;
  const defaultLoc = settings.locations.find((x) => x.isDefault)?.id ?? settings.locations[0]?.id ?? 'onsite';

  const [serviceId, setServiceId] = useState(() => {
    if (prefill.serviceId) return prefill.serviceId;
    const staffSvc = prefill.staffId ? services.find((s) => s.staffIds.includes(prefill.staffId!)) : undefined;
    if (fromInquiry) {
      const text = `${fromInquiry.service ?? ''} ${fromInquiry.message}`;
      const wanted = /klinik|clinic/i.test(text) ? 'sv-klinika' : /lente kontakti|kontaktn|contact lens/i.test(text) ? 'sv-lente-kontakti' : fromInquiry.type === 'measurement' ? 'sv-kontrolli' : 'sv-pershtatja';
      return services.find((s) => s.id === wanted)?.id ?? services[0]?.id ?? '';
    }
    return staffSvc?.id ?? services[0]?.id ?? '';
  });
  const service = services.find((s) => s.id === serviceId);
  const team = useMemo(() => staff.filter((m) => m.active && (!service || !service.staffIds.length || service.staffIds.includes(m.id))), [staff, service]);
  const [staffId, setStaffId] = useState(() => (prefill.staffId && (!service || service.staffIds.includes(prefill.staffId)) ? prefill.staffId : ''));
  const [location, setLocation] = useState(() => service?.location ?? defaultLoc);
  const [address, setAddress] = useState('');
  const [day, setDay] = useState(() => {
    if (prefill.day) return prefill.day;
    // first open day from today
    for (let i = 0; i < 14; i++) {
      const d = dayKey(addDays(new Date(), i));
      if (windowFor(rules, d).open) return d;
    }
    return dayKey(new Date());
  });
  const [pick, setPick] = useState<string | null>(() => (prefill.day && prefill.minutes != null ? atMinutes(prefill.day, prefill.minutes) : null));
  const [contact, setContact] = useState<Contact>(() => ({ name: fromInquiry?.name ?? '', phone: fromInquiry?.phone ?? '', email: fromInquiry?.email ?? '', city: fromInquiry?.city ?? '', inquiryId: fromInquiry?.id }));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<BookingStatus>('confirmed');
  const [note, setNote] = useState(() => (fromInquiry ? [fromInquiry.service, fromInquiry.message !== '—' ? fromInquiry.message : ''].filter(Boolean).join(' — ') : ''));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const ctx = { bookings, services, rules };
  const { window: win, slots } = useMemo(
    () => (service ? slotsForDay(day, service, staffId, { bookings, services, rules }) : { window: windowFor(rules, day), slots: [] }),
    [service, day, staffId, bookings, services, rules],
  );
  const chosen = pick ? slots.find((s) => s.start === pick) : undefined;
  const assigned = staffId || chosen?.staffId || '';
  const freeCount = slots.filter((s) => s.check.ok).length;
  const slotReason = (s: (typeof slots)[number]) => reasonText(s.check, { serviceId, staffId: staffId || service?.staffIds[0] || '', start: s.start, durationMin: service?.durationMin ?? 60 }, rules);

  /* next 7 open days as quick chips */
  const quickDays = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; out.length < 6 && i < 21; i++) {
      const d = dayKey(addDays(new Date(), i));
      if (windowFor(rules, d).open) out.push(d);
    }
    return out;
  }, [rules]);

  /* contacts: enquiries + customers from orders */
  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    const inq = inquiries
      .filter((x) => matches(q, [x.name, x.phone, x.email, x.city]))
      .slice(0, 4)
      .map((x) => ({ kind: 'inquiry' as const, id: x.id, name: x.name, phone: x.phone, email: x.email ?? '', city: x.city ?? '', sub: x.service ?? x.message }));
    const cus = aggregateCustomers(orders)
      .filter((c) => matches(q, [c.name, c.phone, c.email, c.city]))
      .slice(0, 4)
      .map((c) => ({ kind: 'customer' as const, id: c.key, name: c.name, phone: c.phone, email: c.email, city: c.city, sub: `${c.count} × · ${money(c.spent, lang)}` }));
    return [...inq, ...cus].slice(0, 6);
  }, [q, inquiries, orders, lang]);

  const changeService = (id: string) => {
    const s = services.find((x) => x.id === id);
    setServiceId(id);
    if (staffId && s && !s.staffIds.includes(staffId)) setStaffId('');
    setLocation(s?.location ?? defaultLoc);
    setPick(null);
    setError(null);
    setBlocked(null);
  };

  const submit = () => {
    const err: Record<string, string> = {};
    if (!contact.name.trim()) err.name = t('required');
    if (contact.phone.replace(/\D/g, '').length < 6) err.phone = t('required');
    if (location === 'onsite' && !address.trim()) err.address = t('required');
    setErrors(err);
    if (!service || !pick) return setError(t('pickSlot'));
    const sid = assigned || service.staffIds[0];
    const cand = { serviceId: service.id, staffId: sid, start: pick, durationMin: service.durationMin };
    const check = checkSlot(cand, ctx);
    if (!check.ok) return setError(reasonText(check, cand, rules));
    if (Object.keys(err).length) return;
    const res = addBooking({
      serviceId: service.id,
      staffId: sid,
      customerName: contact.name.trim(),
      phone: contact.phone.trim(),
      ...(contact.email.trim() ? { email: contact.email.trim() } : {}),
      ...(contact.city.trim() ? { city: contact.city.trim() } : {}),
      start: pick,
      location,
      ...(location === 'onsite' && address.trim() ? { address: address.trim() } : {}),
      ...(contact.inquiryId ? { inquiryId: contact.inquiryId } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
      status,
    });
    if (!res.ok) return setError(reasonText({ ok: false, reason: res.reason }, cand, rules));
    toast.success(t('added', { name: res.booking.customerName, when: `${dayName(weekdayIndex(new Date(pick)), lang)} ${timeRange(pick, service.durationMin)}` }));
    onCreated?.(res.booking);
    onClose();
  };

  const assignedMember = staff.find((m) => m.id === assigned);

  return (
    <div className="flex max-h-[92vh] flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
            <CalendarPlus className="h-5 w-5" /> {t('title')}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">{t('desc')}</p>
        </div>
        <button onClick={onClose} className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-ink/5" aria-label={t('close')}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 1 — service */}
        <Step n={1} title={t('s1')}>
          <div className="grid gap-2 sm:grid-cols-3">
            {services.map((s) => {
              const on = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => changeService(s.id)}
                  className={cn('flex items-start gap-2.5 rounded-xl border bg-white p-3 text-left transition-all', on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30')}
                >
                  <ServiceDot color={s.color} className="mt-1" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-tight text-ink">{l(s.name)}</span>
                    <span className="mt-1 block text-[12px] text-muted">
                      {ta('min', { n: s.durationMin })} · {t('capacityN', { n: s.capacity })} · {s.price ? money(s.price, lang) : s.price === 0 ? ta('free') : '—'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* 2 — staff & location */}
        <Step n={2} title={t('s2')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">{ta('staff')}</span>
              <select value={staffId} onChange={(e) => { setStaffId(e.target.value); setPick(null); setError(null); setBlocked(null); }} className={selectCls} style={{ backgroundImage: CHEVRON }}>
                <option value="">{ta('anyStaff')}</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-soft">{ta('location')}</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className={selectCls} style={{ backgroundImage: CHEVRON }}>
                {settings.locations.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
                <option value="onsite">{ta('onsite')}</option>
              </select>
            </label>
            {location === 'onsite' && (
              <Input label={t('address')} value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} wrapClassName="sm:col-span-2" className="h-10! text-[13.5px]!" placeholder="Rruga Mbretëresha Teutë 12, Mitrovicë" />
            )}
          </div>
        </Step>

        {/* 3 — slot */}
        <Step n={3} title={t('s3')} aside={win.open ? <span className="text-[12px] text-muted tabular-nums">{t('hoursOf', { from: fromMin(win.from), to: fromMin(win.to) })}</span> : null}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
              {quickDays.map((d) => {
                const date = new Date(`${d}T12:00:00`);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDay(d); setPick(null); setError(null); setBlocked(null); }}
                    className={cn('flex h-12 w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-center transition-colors', day === d ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/30')}
                  >
                    <span className={cn('text-[10.5px] font-semibold uppercase', day === d ? 'text-white/70' : 'text-muted')}>{dayName(weekdayIndex(date), lang, true)}</span>
                    <span className="text-[15px] font-bold leading-none tabular-nums">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <input type="date" value={day} min={dayKey(new Date())} onChange={(e) => { if (e.target.value) { setDay(e.target.value); setPick(null); setError(null); setBlocked(null); } }} className="h-12 rounded-lg border border-line bg-white px-3 text-[13.5px] outline-none focus:border-ink/40" aria-label={ta('date')} />
          </div>

          <div className="mt-3">
            {!win.open ? (
              <p className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2.5 text-[13px] text-ink-soft">
                <AlertTriangle className="h-4 w-4 text-muted" />
                {win.exception ? ta('r_holiday', { label: l(win.exception.label) }) : ta('r_closed', { day: dayName(weekdayIndex(new Date(`${day}T12:00:00`)), lang) })}
              </p>
            ) : freeCount === 0 ? (
              <p className="rounded-lg bg-canvas px-3 py-2.5 text-[13px] text-ink-soft">{t('noSlots')}</p>
            ) : null}
            {win.open && slots.length > 0 && (
              <>
                <p className="mb-1.5 mt-1 text-[12px] text-muted">
                  {longDate(day, lang)} · {t('freeN', { n: freeCount, total: slots.length })}
                </p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                  {slots.map((s) => (
                    <button
                      key={s.minutes}
                      type="button"
                      aria-disabled={!s.check.ok}
                      title={s.check.ok ? undefined : slotReason(s)}
                      onClick={() => {
                        if (s.check.ok) {
                          setPick(s.start);
                          setBlocked(null);
                        } else {
                          setPick(null);
                          setBlocked(`${s.label} — ${slotReason(s)}`);
                        }
                        setError(null);
                      }}
                      className={cn(
                        'h-9 rounded-md text-[13px] font-semibold tabular-nums transition-colors',
                        pick === s.start ? 'bg-ink text-white' : s.check.ok ? 'border border-line bg-white text-ink hover:border-ink/40' : 'cursor-help bg-canvas text-muted/60 line-through hover:text-muted',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                {blocked && (
                  <p role="status" className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-900 ring-1 ring-amber-600/20">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {blocked}
                  </p>
                )}
                {pick && !staffId && assignedMember && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                    <StaffAvatar staff={assignedMember} size="xs" className="ring-0" /> {t('autoStaff', { name: assignedMember.name })}
                  </p>
                )}
              </>
            )}
          </div>
        </Step>

        {/* 4 — contact */}
        <Step n={4} title={t('s4')}>
          {contact.inquiryId ? (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-[13px]">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-soft">
                <Link2 className="h-3.5 w-3.5 shrink-0" /> {t('linked')}: <b className="truncate text-ink">{contact.name}</b>
              </span>
              <button type="button" onClick={() => setContact((c) => ({ ...c, inquiryId: undefined }))} className="shrink-0 text-[12.5px] font-semibold text-muted hover:text-ink">
                {t('unlink')}
              </button>
            </div>
          ) : (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('contactSearch')} className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[13.5px] outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5" />
              {q.trim().length >= 2 && (
                <div className="mt-1.5 overflow-hidden rounded-lg border border-line bg-white">
                  {results.length === 0 ? (
                    <p className="px-3 py-2.5 text-[12.5px] text-muted">{t('noMatch')}</p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={`${r.kind}-${r.id}`}
                        type="button"
                        onClick={() => {
                          setContact({ name: r.name, phone: r.phone, email: r.email, city: r.city, inquiryId: r.kind === 'inquiry' ? r.id : undefined });
                          setQ('');
                        }}
                        className="flex w-full items-center gap-3 border-b border-line/60 px-3 py-2 text-left last:border-b-0 hover:bg-canvas/70"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-canvas text-ink-soft">{r.kind === 'inquiry' ? <Inbox className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-ink">{r.name}</span>
                          <span className="block truncate text-[12px] text-muted">{[r.phone, r.city, r.sub].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="shrink-0 rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">{r.kind === 'inquiry' ? t('fromInquiry') : t('fromCustomer')}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('name')} required value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} error={errors.name} className="h-10! text-[13.5px]!" />
            <Input label={t('phone')} required type="tel" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} error={errors.phone} placeholder="+383 4_ ___ ___" className="h-10! text-[13.5px]!" />
            <Input label={t('email')} type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} className="h-10! text-[13.5px]!" />
            <Input label={t('city')} value={contact.city} onChange={(e) => setContact((c) => ({ ...c, city: e.target.value }))} className="h-10! text-[13.5px]!" />
          </div>
        </Step>

        {/* 5 — confirm */}
        <Step n={5} title={t('s5')}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="rounded-xl border border-line bg-canvas/50 p-3.5 text-[13px]">
              {service && pick ? (
                <>
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <ServiceDot color={service.color} /> {l(service.name)}
                  </div>
                  <div className="mt-1.5 text-ink-soft">{longDate(pick, lang)}</div>
                  <div className="font-semibold text-ink tabular-nums">{timeRange(pick, service.durationMin)}</div>
                  <div className="mt-1.5 text-muted">
                    {assignedMember?.name ?? ta('anyStaff')} · {locLabel(location)}
                  </div>
                  {contact.name && <div className="mt-1 text-muted">{contact.name}{contact.phone ? ` · ${contact.phone}` : ''}</div>}
                </>
              ) : (
                <span className="text-muted">{t('summaryEmpty')}</span>
              )}
            </div>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t('initial')}>
                {(['confirmed', 'pending'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => setStatus(s)}
                    className={cn('rounded-lg border px-2.5 py-2 text-left transition-colors', status === s ? 'border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line bg-white hover:border-ink/30')}
                  >
                    <span className="block text-[13px] font-semibold text-ink">{ta(`st_${s}`)}</span>
                    <span className="block text-[11.5px] leading-tight text-muted">{s === 'pending' ? t('pendingHint') : t('confirmedHint')}</span>
                  </button>
                ))}
              </div>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('notePh')} className="text-[13.5px]!" />
            </div>
          </div>
        </Step>
      </div>

      {/* Footer */}
      <div className="border-t border-line bg-canvas/60 px-5 py-3.5 sm:px-6">
        {error && (
          <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-800 ring-1 ring-red-600/15">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <b>{t('rejected')}:</b> {error}
            </span>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[12.5px] text-muted">{service && pick ? `${l(service.name)} · ${dayMonth(new Date(pick), lang)} ${timeRange(pick, service.durationMin)}` : t('pickSlot')}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
              {ta('dismiss')}
            </Button>
            <Button shape="rounded" size="sm" icon={<CalendarPlus className="h-4 w-4" />} onClick={submit}>
              {t('submit')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
