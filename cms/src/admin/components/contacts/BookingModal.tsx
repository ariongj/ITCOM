import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AlertTriangle, CalendarPlus, Clock, MapPin } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { adm } from '@/admin/i18n';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useSettings } from '@/store/hooks';
import { checkBooking, type BookingConflict } from '@/lib/bookings';
import { dateTime } from '@/lib/format';
import { CInput, CSelect, CTextarea } from './fields';
import { defaultSlot, kindOf, type InquiryX } from './model';

const T = defineDict({
  me: {
    title: 'Kreiraj termin',
    subtitle: 'Termin se popunjava iz upita — provjerite uslugu, osobu i vrijeme.',
    service: 'Usluga',
    staff: 'Osoba',
    day: 'Datum',
    time: 'Vrijeme',
    duration: '{n} min',
    location: 'Lokacija',
    onsite: 'Kod klijenta (van optike)',
    address: 'Adresa',
    note: 'Bilješka za termin',
    free: 'Termin je slobodan',
    c_invalid: 'Izaberite ispravan datum i vrijeme.',
    c_service: 'Usluga ne postoji.',
    c_staff: 'Ova osoba ne radi ovu uslugu.',
    c_staffBusy: 'Osoba je zauzeta u to vrijeme.',
    c_capacity: 'Kapacitet usluge je popunjen za taj termin.',
    create: 'Kreiraj termin',
    created: 'Termin je kreiran — {when}',
    openCal: 'Otvori u kalendaru',
  },
  sq: {
    title: 'Krijo termin',
    subtitle: 'Termini plotësohet nga kërkesa — kontrolloni shërbimin, personin dhe orën.',
    service: 'Shërbimi',
    staff: 'Personi',
    day: 'Data',
    time: 'Ora',
    duration: '{n} min',
    location: 'Vendndodhja',
    onsite: 'Te klienti (jashtë optikës)',
    address: 'Adresa',
    note: 'Shënim për terminin',
    free: 'Orari është i lirë',
    c_invalid: 'Zgjidhni një datë dhe orë të saktë.',
    c_service: 'Shërbimi nuk ekziston.',
    c_staff: 'Ky person nuk e ofron këtë shërbim.',
    c_staffBusy: 'Personi është i zënë në këtë orar.',
    c_capacity: 'Kapaciteti i shërbimit është plot për këtë orar.',
    create: 'Krijo terminin',
    created: 'Termini u krijua — {when}',
    openCal: 'Hap në kalendar',
  },
  en: {
    title: 'Create appointment',
    subtitle: 'Prefilled from the request — check the service, person and time.',
    service: 'Service',
    staff: 'Person',
    day: 'Date',
    time: 'Time',
    duration: '{n} min',
    location: 'Location',
    onsite: 'At the customer’s (outside the store)',
    address: 'Address',
    note: 'Appointment note',
    free: 'The slot is free',
    c_invalid: 'Pick a valid date and time.',
    c_service: 'The service does not exist.',
    c_staff: 'This person does not offer the service.',
    c_staffBusy: 'This person is busy at that time.',
    c_capacity: 'The service is fully booked for that slot.',
    create: 'Create appointment',
    created: 'Appointment created — {when}',
    openCal: 'Open in calendar',
  },
});

// Store hours: 10:00–19:30 (last start 19:00).
const TIMES = Array.from({ length: 19 }, (_, i) => {
  const h = 10 + Math.floor(i / 2);
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
});

const p2 = (n: number) => String(n).padStart(2, '0');

/** "Krijo termin" — a booking prefilled from the request, checked against staff/capacity before it is saved. */
export function BookingModal({ inquiry, open, onClose }: { inquiry: InquiryX; open: boolean; onClose: () => void }) {
  const t = useDict(T, 'admin');
  return (
    <Modal open={open} onClose={onClose} size="md" title={t('title')} description={t('subtitle')}>
      {open && <BookingForm inquiry={inquiry} onClose={onClose} />}
    </Modal>
  );
}

function BookingForm({ inquiry: q, onClose }: { inquiry: InquiryX; onClose: () => void }) {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const settings = useSettings();
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);

  const initial = useMemo(() => {
    // Eye-exam requests → exam (or the clinic / contact lenses when asked for); other requests → fitting or adjustment.
    const text = `${q.service ?? ''} ${q.message}`;
    const wanted =
      kindOf(q) === 'measurement'
        ? /klinik|clinic/i.test(text) ? 'sv-klinika' : /lente kontakti|kontaktn|contact lens/i.test(text) ? 'sv-lente-kontakti' : 'sv-kontrolli'
        : /riparim|rregullim|popravk|repair|adjust/i.test(text) ? 'sv-marrja' : 'sv-pershtatja';
    const svc = services.find((s) => s.id === wanted) ?? services[0];
    const slot = defaultSlot(q);
    const person = svc && q.assignee && svc.staffIds.includes(q.assignee) ? q.assignee : (svc?.staffIds[0] ?? staff[0]?.id ?? '');
    return {
      serviceId: svc?.id ?? '',
      staffId: person,
      day: `${slot.getFullYear()}-${p2(slot.getMonth() + 1)}-${p2(slot.getDate())}`,
      time: '10:00',
      address: '',
      note: q.message.length > 140 ? `${q.message.slice(0, 137)}…` : q.message,
    };
  }, [q, services, staff]);
  const [f, setF] = useState(initial);
  const service = services.find((s) => s.id === f.serviceId);
  const people = staff.filter((m) => m.active && (!service || !service.staffIds.length || service.staffIds.includes(m.id)));
  const onsite = (service?.location ?? 'onsite') === 'onsite';
  const location = settings.locations.find((x) => x.id === service?.location);

  const startIso = useMemo(() => {
    const d = f.day && f.time ? new Date(`${f.day}T${f.time}`) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
  }, [f.day, f.time]);
  const start = startIso ? new Date(startIso) : null;
  const check = useMemo((): { ok: true } | { ok: false; reason: BookingConflict } => {
    if (!startIso || !service) return { ok: false, reason: 'invalid' };
    return checkBooking({ serviceId: f.serviceId, staffId: f.staffId, start: startIso, durationMin: service.durationMin }, bookings, services);
  }, [startIso, f.serviceId, f.staffId, service, bookings, services]);

  const submit = () => {
    if (!start || !service) return;
    const res = useDb.getState().addBooking({
      serviceId: f.serviceId,
      staffId: f.staffId,
      customerName: q.name,
      phone: q.phone,
      email: q.email,
      city: q.city,
      start: start.toISOString(),
      inquiryId: q.id,
      note: f.note.trim() || undefined,
      location: service.location ?? 'onsite',
      ...(onsite && f.address.trim() ? { address: f.address.trim() } : {}),
    });
    if (!res.ok) {
      toast.error(t(`c_${res.reason}`));
      return;
    }
    const id = res.booking.id;
    onClose();
    toast.success(t('created', { when: dateTime(res.booking.start, lang) }), { action: { label: t('openCal'), onClick: () => navigate(`/admin/termini?id=${id}`) } });
    navigate(`/admin/termini?id=${id}`);
  };

  return (
    <>
      <div className="space-y-3.5 px-6 py-5">
        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <CSelect
            label={t('service')}
            value={f.serviceId}
            onChange={(e) => {
              const svc = services.find((s) => s.id === e.target.value);
              setF((x) => ({ ...x, serviceId: e.target.value, staffId: svc && !svc.staffIds.includes(x.staffId) ? (svc.staffIds[0] ?? x.staffId) : x.staffId }));
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {l(s.name)} · {t('duration', { n: s.durationMin })}
              </option>
            ))}
          </CSelect>
          <CSelect label={t('staff')} value={f.staffId} onChange={(e) => setF((x) => ({ ...x, staffId: e.target.value }))}>
            {people.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </CSelect>
          <CInput label={t('day')} type="date" value={f.day} onChange={(e) => setF((x) => ({ ...x, day: e.target.value }))} />
          <CSelect label={t('time')} value={f.time} onChange={(e) => setF((x) => ({ ...x, time: e.target.value }))}>
            {TIMES.map((tm) => (
              <option key={tm} value={tm}>
                {tm}
              </option>
            ))}
          </CSelect>
        </div>

        <div className="rounded-lg border border-line bg-canvas/50 px-3.5 py-2.5 text-[13px] text-ink-soft">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted" />
            <span className="font-semibold text-ink">{t('location')}:</span>
            <span className="truncate">{onsite ? t('onsite') : location ? `${location.name} · ${location.address}, ${location.city}` : '—'}</span>
          </div>
          {onsite && <CInput value={f.address} onChange={(e) => setF((x) => ({ ...x, address: e.target.value }))} placeholder={[t('address'), q.city].filter(Boolean).join(' · ')} wrapClassName="mt-2" />}
        </div>

        <CTextarea label={t('note')} rows={2} value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} />

        <div className={check.ok ? 'flex items-center gap-2 text-[13px] text-ink-soft' : 'flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700'}>
          {check.ok ? <Clock className="h-4 w-4 text-muted" /> : <AlertTriangle className="h-4 w-4" />}
          {check.ok ? `${t('free')} · ${start ? dateTime(start.toISOString(), lang) : ''}` : t(`c_${check.reason}`)}
        </div>
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas px-6 py-4">
        <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
          {ta('cancel')}
        </Button>
        <Button variant="primary" shape="rounded" size="sm" icon={<CalendarPlus className="h-4 w-4" />} disabled={!check.ok} onClick={submit}>
          {t('create')}
        </Button>
      </div>
    </>
  );
}
