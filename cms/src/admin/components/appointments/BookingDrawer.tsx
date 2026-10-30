import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, CheckCheck, CircleCheck, CircleX, Clock, History, Inbox, MapPin, Phone, RotateCcw, StickyNote, Trash2, User, UserRound, UserX } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { WhatsAppIcon } from '@/components/brand/Social';
import { confirmDialog } from '@/admin/components/kit';
import { customerKey } from '@/admin/components/crm/customers';
import { telHref, waHref } from '@/admin/components/crm/shared';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { checkBooking } from '@/lib/bookings';
import { dateTime, money } from '@/lib/format';
import type { Booking, BookingStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ap } from './i18n';
import { addDays, dayKey, longDate, timeRange } from './dates';
import { checkSlot, slotsForDay } from './rules';
import { BookingStatusBadge, CHEVRON, ServiceDot, StaffAvatar, tint, useBookingRules, useLocationLabel, useReasonText } from './shared';

const T = defineDict({
  me: {
    when: 'Termin',
    actions: 'Radnje',
    confirm: 'Potvrdi',
    done: 'Završen',
    noshow: 'Nije došao',
    cancel: 'Otkaži',
    reopen: 'Vrati termin',
    reschedule: 'Pomjeri',
    afterStart: 'Moguće tek nakon početka termina',
    cancelTitle: 'Otkazati termin?',
    cancelText: 'Otkazivanje oslobađa kapacitet usluge. Javite klijentu telefonom.',
    lateCancel: 'Kasno otkazivanje — manje od {h} h prije termina.',
    cancelConfirm: 'Otkaži termin',
    deleteTitle: 'Obrisati termin?',
    deleteText: 'Termin za {name} biće trajno uklonjen. Ova radnja se ne može poništiti.',
    deleteBtn: 'Obriši',
    deleted: 'Termin je obrisan',
    statusSaved: 'Status: {status}',
    reopenBlocked: 'Termin se ne može vratiti',
    newTime: 'Novi termin',
    rescheduleHint: 'Provjera kapaciteta, zauzetosti osoblja i radnog vremena radi se ponovo.',
    noSlots: 'Nema slobodnih termina tog dana.',
    freeN: '{n} slobodno',
    save: 'Provjeri i pomjeri',
    moved: 'Termin je pomjeren: {when}',
    rejected: 'Termin nije pomjeren',
    client: 'Klijent',
    call: 'Pozovi',
    whatsapp: 'WhatsApp',
    openInquiry: 'Otvori upit',
    openCustomer: 'Profil kupca',
    findCustomer: 'Potraži među kupcima',
    customerOrders: '{n} narudžbi · {total}',
    notePh: 'Interna bilješka — vidi je samo tim…',
    noteSave: 'Sačuvaj bilješku',
    noteSaved: 'Bilješka je sačuvana',
    history: 'Istorija',
    createdAt: 'Kreirano {when}',
    web: 'Sajt',
    a_create: 'kreirao/la termin',
    a_update: 'izmijenio/la termin',
    a_status: 'promijenio/la status',
    a_delete: 'obrisao/la termin',
    close: 'Zatvori',
  },
  sq: {
    when: 'Termini',
    actions: 'Veprimet',
    confirm: 'Konfirmo',
    done: 'Përfunduar',
    noshow: 'Nuk u paraqit',
    cancel: 'Anulo',
    reopen: 'Riktheje',
    reschedule: 'Ricakto',
    afterStart: 'E mundur vetëm pas fillimit të terminit',
    cancelTitle: 'Ta anuloj terminin?',
    cancelText: 'Anulimi liron kapacitetin e shërbimit. Njoftojeni klientin me telefon.',
    lateCancel: 'Anulim i vonë — më pak se {h} orë para terminit.',
    cancelConfirm: 'Anulo terminin',
    deleteTitle: 'Ta fshij terminin?',
    deleteText: 'Termini për {name} do të fshihet përgjithmonë. Ky veprim nuk mund të zhbëhet.',
    deleteBtn: 'Fshi',
    deleted: 'Termini u fshi',
    statusSaved: 'Statusi: {status}',
    reopenBlocked: 'Termini nuk mund të rikthehet',
    newTime: 'Termini i ri',
    rescheduleHint: 'Kapaciteti, zënia e stafit dhe orari kontrollohen sërish.',
    noSlots: 'Nuk ka intervale të lira atë ditë.',
    freeN: '{n} të lira',
    save: 'Kontrollo & ricakto',
    moved: 'Termini u ricaktua: {when}',
    rejected: 'Termini nuk u ricaktua',
    client: 'Klienti',
    call: 'Telefono',
    whatsapp: 'WhatsApp',
    openInquiry: 'Hap kërkesën',
    openCustomer: 'Profili i klientit',
    findCustomer: 'Kërko te klientët',
    customerOrders: '{n} porosi · {total}',
    notePh: 'Shënim i brendshëm — e sheh vetëm ekipi…',
    noteSave: 'Ruaj shënimin',
    noteSaved: 'Shënimi u ruajt',
    history: 'Historia e veprimeve',
    createdAt: 'Krijuar {when}',
    web: 'Faqja',
    a_create: 'krijoi terminin',
    a_update: 'ndryshoi terminin',
    a_status: 'ndryshoi statusin',
    a_delete: 'fshiu terminin',
    close: 'Mbyll',
  },
  en: {
    when: 'Appointment',
    actions: 'Actions',
    confirm: 'Confirm',
    done: 'Completed',
    noshow: 'No-show',
    cancel: 'Cancel',
    reopen: 'Restore',
    reschedule: 'Reschedule',
    afterStart: 'Available once the appointment has started',
    cancelTitle: 'Cancel this appointment?',
    cancelText: 'Cancelling frees the service capacity. Let the client know by phone.',
    lateCancel: 'Late cancellation — less than {h} h before the start.',
    cancelConfirm: 'Cancel appointment',
    deleteTitle: 'Delete this appointment?',
    deleteText: 'The appointment for {name} will be removed permanently. This cannot be undone.',
    deleteBtn: 'Delete',
    deleted: 'Appointment deleted',
    statusSaved: 'Status: {status}',
    reopenBlocked: 'The appointment cannot be restored',
    newTime: 'New time',
    rescheduleHint: 'Capacity, staff availability and opening hours are checked again.',
    noSlots: 'No free slots that day.',
    freeN: '{n} free',
    save: 'Check & reschedule',
    moved: 'Rescheduled: {when}',
    rejected: 'Not rescheduled',
    client: 'Client',
    call: 'Call',
    whatsapp: 'WhatsApp',
    openInquiry: 'Open enquiry',
    openCustomer: 'Customer profile',
    findCustomer: 'Find in customers',
    customerOrders: '{n} orders · {total}',
    notePh: 'Internal note — only the team sees it…',
    noteSave: 'Save note',
    noteSaved: 'Note saved',
    history: 'History',
    createdAt: 'Created {when}',
    web: 'Website',
    a_create: 'created the appointment',
    a_update: 'changed the appointment',
    a_status: 'changed the status',
    a_delete: 'deleted the appointment',
    close: 'Close',
  },
});

function Section({ title, icon, children, aside }: { title: ReactNode; icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
          {icon}
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-[13.5px]">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 text-right font-medium text-ink">{children}</span>
    </div>
  );
}

export function BookingDrawer({ bookingId, open, onClose }: { bookingId: string | null; open: boolean; onClose: () => void }) {
  const bookings = useDb((s) => s.bookings);
  const b = bookingId ? bookings.find((x) => x.id === bookingId) : undefined;
  const t = useDict(T, 'admin');
  return (
    <Drawer
      open={open && !!b}
      onClose={onClose}
      width="max-w-[500px]"
      title={b && <DrawerTitle booking={b} />}
      footer={b && <DrawerFooter booking={b} onClose={onClose} closeLabel={t('close')} />}
    >
      {b && <DrawerBody key={b.id} booking={b} />}
    </Drawer>
  );
}

function DrawerTitle({ booking: b }: { booking: Booking }) {
  const l = useL('admin');
  const services = useDb((s) => s.services);
  const svc = services.find((s) => s.id === b.serviceId);
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <ServiceDot color={svc?.color ?? '#888'} className="h-3 w-3" />
      <span className="truncate text-[15px] font-bold text-ink">{svc ? l(svc.name) : '—'}</span>
      <BookingStatusBadge status={b.status} />
    </span>
  );
}

function DrawerFooter({ booking: b, onClose, closeLabel }: { booking: Booking; onClose: () => void; closeLabel: string }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const can = useCan();
  const remove = useDb((s) => s.remove);
  const del = async () => {
    const ok = await confirmDialog({ title: t('deleteTitle'), text: t('deleteText', { name: b.customerName }), confirmLabel: t('deleteBtn'), danger: true });
    if (!ok) return;
    onClose();
    remove('bookings', b.id);
    toast.success(t('deleted'));
  };
  const canDelete = can('appointments', 'delete');
  return (
    <div className="flex items-center justify-between gap-2">
      <span title={canDelete ? undefined : ta('noPerm')}>
        <Button variant="ghost" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled={!canDelete} onClick={del} className="text-red-700 hover:bg-red-50">
          {t('deleteBtn')}
        </Button>
      </span>
      <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
        {closeLabel}
      </Button>
    </div>
  );
}

function DrawerBody({ booking: b }: { booking: Booking }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);
  const orders = useDb((s) => s.orders);
  const audit = useDb((s) => s.audit);
  const setBookingStatus = useDb((s) => s.setBookingStatus);
  const rules = useBookingRules();
  const reasonText = useReasonText();
  const locLabel = useLocationLabel();
  const [resched, setResched] = useState(false);

  const svc = services.find((s) => s.id === b.serviceId);
  const member = staff.find((m) => m.id === b.staffId);
  const start = new Date(b.start).getTime();
  const started = start <= Date.now();
  const canEdit = can('appointments', 'edit');
  const canCancel = can('appointments', 'cancel');
  const open = b.status === 'pending' || b.status === 'confirmed';

  const customer = useMemo(() => {
    const digits = b.phone.replace(/\D/g, '').slice(-8);
    const email = b.email?.trim().toLowerCase();
    const list = orders.filter((o) => (email && o.customer.email.toLowerCase() === email) || (digits.length >= 6 && o.customer.phone.replace(/\D/g, '').endsWith(digits)));
    if (!list.length) return null;
    const valid = list.filter((o) => o.status !== 'cancelled');
    return { key: customerKey(list[0]), count: list.length, total: valid.reduce((s, o) => s + o.total, 0) };
  }, [orders, b.phone, b.email]);

  const history = useMemo(() => audit.filter((e) => e.object === 'booking' && e.objectId === b.id).slice(0, 8), [audit, b.id]);

  const setStatus = async (status: BookingStatus) => {
    if (status === 'cancelled') {
      const late = start - Date.now() < rules.cancelNoticeHours * 3600000 && start > Date.now();
      const ok = await confirmDialog({
        title: t('cancelTitle'),
        text: (
          <>
            {t('cancelText')}
            {late && <span className="mt-2 flex items-center gap-1.5 font-semibold text-amber-800"><AlertTriangle className="h-3.5 w-3.5" /> {t('lateCancel', { h: rules.cancelNoticeHours })}</span>}
          </>
        ),
        confirmLabel: t('cancelConfirm'),
        danger: true,
      });
      if (!ok) return;
    }
    // Restoring a cancelled / no-show booking takes capacity again → same check as a new booking.
    if ((b.status === 'cancelled' || b.status === 'noshow') && (status === 'pending' || status === 'confirmed')) {
      const check = checkBooking(b, bookings, services, b.id);
      if (!check.ok) {
        toast.error(t('reopenBlocked'), { description: reasonText(check, b, rules) });
        return;
      }
    }
    setBookingStatus(b.id, status);
    toast.success(t('statusSaved', { status: ta(`st_${status}`) }));
  };

  const action = (id: string, label: string, icon: ReactNode, onClick: () => void, opts: { allowed: boolean; disabledReason?: string; primary?: boolean; danger?: boolean }) => {
    const disabled = !opts.allowed || !!opts.disabledReason;
    return (
      <span key={id} title={!opts.allowed ? ta('noPerm') : opts.disabledReason} className="contents">
        <Button
          size="sm"
          shape="rounded"
          variant={opts.primary ? 'primary' : 'outline'}
          icon={icon}
          disabled={disabled}
          onClick={onClick}
          className={cn('w-full', opts.danger && 'text-red-700')}
        >
          {label}
        </Button>
      </span>
    );
  };

  return (
    <div className="space-y-6 px-5 py-5 sm:px-6">
      {/* When / who / where */}
      <div className="overflow-hidden rounded-xl border border-line/80 bg-white">
        <div className="flex items-start gap-3 border-b border-line/70 p-4" style={{ background: tint(svc?.color ?? '#888', 8) }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-ink ring-1 ring-line">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-ink">{longDate(b.start, lang)}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13.5px] text-ink-soft tabular-nums">
              <span className="font-semibold">{timeRange(b.start, b.durationMin)}</span>
              <span className="text-muted">· {ta('min', { n: b.durationMin })}</span>
            </div>
          </div>
        </div>
        <div className="divide-y divide-line/60">
          <Row label={ta('service')}>
            <span className="inline-flex items-center gap-1.5">
              <ServiceDot color={svc?.color ?? '#888'} /> {svc ? l(svc.name) : '—'}
              {svc?.price ? <span className="text-muted">· {money(svc.price, lang)}</span> : null}
            </span>
          </Row>
          <Row label={ta('staff')}>
            <span className="inline-flex items-center gap-2">
              <StaffAvatar staff={member} size="xs" className="ring-0" /> {member?.name ?? '—'}
            </span>
          </Row>
          <Row label={ta('location')}>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted" />
              {locLabel(b.location)}
            </span>
            {b.address && <span className="mt-0.5 block text-[12.5px] font-normal text-muted">{[b.address, b.city].filter(Boolean).join(', ')}</span>}
          </Row>
        </div>
      </div>

      {/* Actions */}
      <Section title={t('actions')}>
        {!canEdit && <p className="mb-2 rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-muted">{ta('readOnly')}</p>}
        <div className="grid grid-cols-2 gap-2">
          {b.status === 'pending' && action('confirm', t('confirm'), <CircleCheck className="h-4 w-4" />, () => setStatus('confirmed'), { allowed: canEdit, primary: true })}
          {open && action('done', t('done'), <CheckCheck className="h-4 w-4" />, () => setStatus('done'), { allowed: canEdit, disabledReason: started ? undefined : t('afterStart'), primary: b.status === 'confirmed' && started })}
          {open && action('noshow', t('noshow'), <UserX className="h-4 w-4" />, () => setStatus('noshow'), { allowed: canEdit, disabledReason: started ? undefined : t('afterStart') })}
          {open && action('resched', t('reschedule'), <CalendarClock className="h-4 w-4" />, () => setResched((v) => !v), { allowed: canEdit })}
          {open && action('cancel', t('cancel'), <CircleX className="h-4 w-4" />, () => setStatus('cancelled'), { allowed: canCancel, danger: true })}
          {!open && action('reopen', t('reopen'), <RotateCcw className="h-4 w-4" />, () => setStatus(started ? 'confirmed' : 'pending'), { allowed: canEdit })}
        </div>
        {resched && open && canEdit && <ReschedulePanel booking={b} onDone={() => setResched(false)} />}
      </Section>

      {/* Client */}
      <Section title={t('client')} icon={<User className="h-3.5 w-3.5" />}>
        <div className="overflow-hidden rounded-xl border border-line/80 bg-white">
          <div className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-canvas text-ink-soft">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-ink">{b.customerName}</div>
              <div className="truncate text-[13px] text-muted tabular-nums">{[b.phone, b.email, b.city].filter(Boolean).join(' · ')}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-line/60 p-3">
            <a href={telHref(b.phone)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-ink text-[13px] font-semibold text-white transition-colors hover:bg-black">
              <Phone className="h-4 w-4" /> {t('call')}
            </a>
            <a href={waHref(b.phone)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-white text-[13px] font-semibold text-ink transition-colors hover:border-ink/30">
              <WhatsAppIcon className="h-4 w-4" /> {t('whatsapp')}
            </a>
          </div>
          <div className="divide-y divide-line/60 border-t border-line/60 text-[13px]">
            {b.inquiryId && (
              <Link to={`/admin/kontakti?id=${b.inquiryId}`} className="flex items-center gap-2 px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-canvas/70">
                <Inbox className="h-4 w-4 text-muted" /> {t('openInquiry')}
                <span className="ml-auto text-muted">→</span>
              </Link>
            )}
            <Link
              to={customer ? `/admin/kupci?c=${encodeURIComponent(customer.key)}` : `/admin/kupci?q=${encodeURIComponent(b.customerName)}`}
              className="flex items-center gap-2 px-4 py-2.5 font-semibold text-ink transition-colors hover:bg-canvas/70"
            >
              <User className="h-4 w-4 text-muted" /> {customer ? t('openCustomer') : t('findCustomer')}
              {customer && <span className="font-normal text-muted">· {t('customerOrders', { n: customer.count, total: money(customer.total, lang) })}</span>}
              <span className="ml-auto text-muted">→</span>
            </Link>
          </div>
        </div>
      </Section>

      <NoteEditor booking={b} canEdit={canEdit} />

      {/* History */}
      <Section title={t('history')} icon={<History className="h-3.5 w-3.5" />}>
        <ol className="space-y-2.5 border-l border-line pl-4">
          {history.map((e) => {
            const who = e.actor === 'web' ? t('web') : (staff.find((m) => m.id === e.actor)?.name ?? e.actor);
            const verb = e.action === 'create' || e.action === 'update' || e.action === 'status' || e.action === 'delete' ? t(`a_${e.action}`) : e.action;
            return (
              <li key={e.id} className="relative text-[13px]">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ink/30 ring-2 ring-paper" />
                <span className="font-semibold text-ink">{who}</span> <span className="text-ink-soft">{verb}</span>
                {e.detail && <span className="block truncate text-[12px] text-muted">{e.detail}</span>}
                <span className="block text-[11.5px] text-muted">{dateTime(e.at, lang)}</span>
              </li>
            );
          })}
          <li className="relative text-[13px] text-muted">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-ink/15 ring-2 ring-paper" />
            <Clock className="mr-1 inline h-3.5 w-3.5" />
            {t('createdAt', { when: dateTime(b.createdAt, lang) })}
            {b.inquiryId && ` · ${t('web')}`}
          </li>
        </ol>
      </Section>
    </div>
  );
}

function NoteEditor({ booking: b, canEdit }: { booking: Booking; canEdit: boolean }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const upsert = useDb((s) => s.upsert);
  const [note, setNote] = useState(b.note ?? '');
  const dirty = note.trim() !== (b.note ?? '').trim();
  const save = () => {
    upsert('bookings', { ...b, note: note.trim() || undefined });
    toast.success(t('noteSaved'));
  };
  return (
    <Section title={ta('notes')} icon={<StickyNote className="h-3.5 w-3.5" />}>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notePh')} rows={3} disabled={!canEdit} className="text-sm" />
      <div className="mt-2 flex justify-end">
        <Button size="xs" shape="rounded" variant={dirty ? 'primary' : 'outline'} disabled={!dirty || !canEdit} onClick={save}>
          {t('noteSave')}
        </Button>
      </div>
    </Section>
  );
}

function ReschedulePanel({ booking: b, onDone }: { booking: Booking; onDone: () => void }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);
  const rescheduleBooking = useDb((s) => s.rescheduleBooking);
  const rules = useBookingRules();
  const reasonText = useReasonText();
  const svc = services.find((s) => s.id === b.serviceId);
  const [day, setDay] = useState(() => (new Date(b.start).getTime() < Date.now() ? dayKey(addDays(new Date(), 1)) : dayKey(b.start)));
  const [staffId, setStaffId] = useState(b.staffId);
  const [pick, setPick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const team = staff.filter((m) => !svc || !svc.staffIds.length || svc.staffIds.includes(m.id));
  const { window: win, slots } = useMemo(
    () => (svc ? slotsForDay(day, svc, staffId, { bookings, services, rules, ignoreId: b.id, durationMin: b.durationMin }) : { window: { open: false, from: 0, to: 0 }, slots: [] }),
    [svc, day, staffId, bookings, services, rules, b.id, b.durationMin],
  );
  const free = slots.filter((s) => s.check.ok).length;

  const submit = () => {
    if (!pick) return;
    const cand = { serviceId: b.serviceId, staffId, start: pick, durationMin: b.durationMin };
    const check = checkSlot(cand, { bookings, services, rules, ignoreId: b.id });
    if (!check.ok) return setError(reasonText(check, cand, rules));
    const res = rescheduleBooking(b.id, pick, staffId);
    if (!res.ok) return setError(reasonText({ ok: false, reason: res.reason }, cand, rules));
    toast.success(t('moved', { when: `${longDate(pick, lang)} ${timeRange(pick, b.durationMin)}` }));
    onDone();
  };

  return (
    <div className="mt-3 rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-[13.5px] font-bold text-ink">{t('newTime')}</h4>
        <span className="text-[12px] text-muted">{svc ? `${l(svc.name)} · ${ta('min', { n: b.durationMin })}` : ''}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{ta('date')}</span>
          <input type="date" value={day} min={dayKey(new Date())} onChange={(e) => { setDay(e.target.value); setPick(null); setError(null); }} className="h-9 w-full rounded-lg border border-line bg-white px-2.5 text-[13.5px] outline-none focus:border-ink/40" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-ink-soft">{ta('staff')}</span>
          <select value={staffId} onChange={(e) => { setStaffId(e.target.value); setPick(null); setError(null); }} className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-line bg-white bg-[length:14px] bg-[right_10px_center] bg-no-repeat pl-2.5 pr-8 text-[13.5px] outline-none focus:border-ink/40" style={{ backgroundImage: CHEVRON }}>
            {team.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3">
        {!win.open ? (
          <p className="rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-muted">{win.exception ? ta('r_holiday', { label: l(win.exception.label) }) : t('noSlots')}</p>
        ) : (
          <>
            <p className="mb-1.5 text-[12px] text-muted">{t('freeN', { n: free })}</p>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {slots.map((s) => (
                <button
                  key={s.minutes}
                  type="button"
                  aria-disabled={!s.check.ok}
                  title={s.check.ok ? undefined : reasonText(s.check, { serviceId: b.serviceId, staffId, start: s.start, durationMin: b.durationMin }, rules)}
                  onClick={() => {
                    if (s.check.ok) {
                      setPick(s.start);
                      setError(null);
                    } else {
                      setPick(null);
                      setError(`${s.label} — ${reasonText(s.check, { serviceId: b.serviceId, staffId, start: s.start, durationMin: b.durationMin }, rules)}`);
                    }
                  }}
                  className={cn(
                    'h-8 rounded-md text-[12.5px] font-semibold tabular-nums transition-colors',
                    pick === s.start ? 'bg-ink text-white' : s.check.ok ? 'border border-line bg-white text-ink hover:border-ink/40' : 'cursor-help bg-canvas text-muted/60 line-through hover:text-muted',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-800 ring-1 ring-red-600/15">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><span className="font-bold">{t('rejected')}:</span> {error}</span>
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-muted">{t('rescheduleHint')}</span>
        <Button size="sm" shape="rounded" disabled={!pick} onClick={submit}>
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
