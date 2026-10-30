import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowUpRight, Ban, CheckCircle2, Clock, Building2, CalendarClock, CalendarPlus, Copy, ExternalLink, FileText, Lock, Mail, MapPin, Package, Phone, Stethoscope, Trash2, UserRound, XCircle } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/brand/Social';
import { Thumb, confirmDialog } from '@/admin/components/kit';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { basePrice } from '@/lib/pricing';
import { date, dateTime, money, perUnit } from '@/lib/format';
import { href } from '@/lib/paths';
import type { InquiryStatus, Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { cx } from '@/admin/components/contacts/i18n';
import { AssigneeLabel, DueLabel, KindLabel, QuoteStatusLabel, SectionTitle, StatusLabel, StatusSymbol, useNoPermText } from '@/admin/components/contacts/atoms';
import { CSelect, Chip, Segmented } from '@/admin/components/contacts/fields';
import { TagsField } from '@/admin/components/contacts/TagsField';
import { Conversation } from '@/admin/components/contacts/Conversation';
import { CustomerLink } from '@/admin/components/contacts/CustomerLink';
import { BookingModal } from '@/admin/components/contacts/BookingModal';
import { STATUSES, assignableStaff, bookingsFor, dueOf, kindOf, quoteState, sourceKey, sourceOf, sourcePath, type CustomerIndex, type InquiryX } from '@/admin/components/contacts/model';
import { fromLocalInput, mailHref, parseDay, telHref, toLocalInput, useNow, waHref } from './shared';

const T = defineDict({
  me: {
    request: 'Upit',
    received: 'Primljeno {date}',
    from: 'sa',
    message: 'Poruka',
    product: 'Proizvod',
    service: 'Usluga',
    preferred: 'Željeni datum',
    city: 'Grad',
    priceFrom: 'od {price}',
    onRequest: 'Cijena na upit',
    manage: 'Obrada',
    status: 'Status',
    assignee: 'Odgovorni',
    takeIt: 'Preuzmi',
    followUp: 'Rok za praćenje',
    noDue: 'Ukloni rok',
    today17: 'Danas 17h',
    tomorrow: 'Sutra',
    in3: '+3 dana',
    week: '+1 sedmica',
    tags: 'Oznake',
    tagsPh: 'Dodaj oznaku i Enter…',
    links: 'Termini i ponude',
    linksEmpty: 'Još nema termina ni B2B ponude za ovaj upit.',
    open: 'Otvori',
    customer: 'Profil kupca',
    createBooking: 'Kreiraj termin',
    createQuote: 'Kreiraj B2B ponudu',
    openQuote: 'Otvori ponudu {number}',
    statusSaved: 'Status: {status}',
    assigned: 'Dodijeljeno: {name}',
    unassignedToast: 'Upit više nema odgovornog',
    dupTitle: 'Mogući duplikat',
    dupText: 'Isti telefon ili e-mail kao upit od {date} ({name}).',
    dupOpen: 'Otvori original',
    dupClose: 'Označi kao duplikat i zatvori',
    dupClosed: 'Zatvoreno kao duplikat',
    close: 'Zatvori upit',
    reopen: 'Ponovo otvori',
    spam: 'Označi kao spam',
    spamDone: 'Označeno kao spam i zatvoreno',
    delete: 'Obriši',
    deleteTitle: 'Obrisati ovaj upit?',
    deleteText: 'Upit od {name} biće trajno uklonjen. Profil kupca i narudžbe ostaju.',
    deleted: 'Upit je obrisan',
    archiveNote: 'Zatvaranje ili arhiviranje upita ne briše kupca.',
    readOnly: 'Samo pregled',
    mailSubject: 'ITCOM — vaš upit',
    bk_pending: 'Čeka potvrdu',
    bk_confirmed: 'Potvrđen',
    bk_done: 'Održan',
    bk_cancelled: 'Otkazan',
    bk_noshow: 'Nije došao',
  },
  sq: {
    request: 'Kërkesa',
    received: 'Pranuar më {date}',
    from: 'nga',
    message: 'Mesazhi',
    product: 'Produkti',
    service: 'Shërbimi',
    preferred: 'Data e dëshiruar',
    city: 'Qyteti',
    priceFrom: 'nga {price}',
    onRequest: 'Çmimi sipas kërkesës',
    manage: 'Trajtimi',
    status: 'Statusi',
    assignee: 'Përgjegjësi',
    takeIt: 'Merre vetë',
    followUp: 'Afati i ndjekjes',
    noDue: 'Hiq afatin',
    today17: 'Sot 17:00',
    tomorrow: 'Nesër',
    in3: '+3 ditë',
    week: '+1 javë',
    tags: 'Etiketat',
    tagsPh: 'Shto etiketë dhe Enter…',
    links: 'Terminet & ofertat',
    linksEmpty: 'Ende nuk ka termin as ofertë B2B për këtë kërkesë.',
    open: 'Hap',
    customer: 'Profili i klientit',
    createBooking: 'Krijo termin',
    createQuote: 'Krijo ofertë B2B',
    openQuote: 'Hap ofertën {number}',
    statusSaved: 'Statusi: {status}',
    assigned: 'U caktua: {name}',
    unassignedToast: 'Kërkesa mbeti pa përgjegjës',
    dupTitle: 'Dyfish i mundshëm',
    dupText: 'I njëjti telefon ose e-mail si kërkesa e {date} ({name}).',
    dupOpen: 'Hap origjinalen',
    dupClose: 'Shëno si dyfish dhe mbyll',
    dupClosed: 'U mbyll si dyfish',
    close: 'Mbyll kërkesën',
    reopen: 'Rihap',
    spam: 'Shëno si spam',
    spamDone: 'U shënua si spam dhe u mbyll',
    delete: 'Fshij',
    deleteTitle: 'Të fshihet kjo kërkesë?',
    deleteText: 'Kërkesa nga {name} do të hiqet përgjithmonë. Profili i klientit dhe porositë mbeten.',
    deleted: 'Kërkesa u fshi',
    archiveNote: 'Mbyllja ose arkivimi i kërkesës nuk e fshin klientin.',
    readOnly: 'Vetëm shikim',
    mailSubject: 'ITCOM — kërkesa juaj',
    bk_pending: 'Në pritje',
    bk_confirmed: 'Konfirmuar',
    bk_done: 'Kryer',
    bk_cancelled: 'Anuluar',
    bk_noshow: 'Nuk erdhi',
  },
  en: {
    request: 'Request',
    received: 'Received {date}',
    from: 'from',
    message: 'Message',
    product: 'Product',
    service: 'Service',
    preferred: 'Preferred date',
    city: 'City',
    priceFrom: 'from {price}',
    onRequest: 'Price on request',
    manage: 'Handling',
    status: 'Status',
    assignee: 'Assignee',
    takeIt: 'Take it',
    followUp: 'Follow-up due',
    noDue: 'Clear',
    today17: 'Today 5 pm',
    tomorrow: 'Tomorrow',
    in3: '+3 days',
    week: '+1 week',
    tags: 'Tags',
    tagsPh: 'Add a tag and press Enter…',
    links: 'Appointments & quotes',
    linksEmpty: 'No appointment or B2B quote for this request yet.',
    open: 'Open',
    customer: 'Customer profile',
    createBooking: 'Create appointment',
    createQuote: 'Create B2B quote',
    openQuote: 'Open quote {number}',
    statusSaved: 'Status: {status}',
    assigned: 'Assigned: {name}',
    unassignedToast: 'The request has no assignee now',
    dupTitle: 'Possible duplicate',
    dupText: 'Same phone or e-mail as the request from {date} ({name}).',
    dupOpen: 'Open original',
    dupClose: 'Mark duplicate & close',
    dupClosed: 'Closed as duplicate',
    close: 'Close request',
    reopen: 'Reopen',
    spam: 'Mark as spam',
    spamDone: 'Marked as spam and closed',
    delete: 'Delete',
    deleteTitle: 'Delete this request?',
    deleteText: 'The request from {name} will be removed permanently. The customer profile and orders stay.',
    deleted: 'Request deleted',
    archiveNote: 'Closing or archiving a request does not delete the customer.',
    readOnly: 'View only',
    mailSubject: 'ITCOM — your request',
    bk_pending: 'Pending',
    bk_confirmed: 'Confirmed',
    bk_done: 'Done',
    bk_cancelled: 'Cancelled',
    bk_noshow: 'No-show',
  },
});

/** Follow-up quick pick: `days` from today at `hour`:00 (local). */
function at(days: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function InquiryDrawer({
  inquiry: q,
  product,
  open,
  onClose,
  index,
  duplicateOf,
  onOpenInquiry,
}: {
  inquiry: InquiryX | undefined;
  product?: Product;
  open: boolean;
  onClose: () => void;
  index: CustomerIndex;
  duplicateOf?: InquiryX;
  onOpenInquiry: (id: string) => void;
}) {
  const t = useDict(T, 'admin');
  const lang = useLang('admin');
  return (
    <Drawer
      open={open && !!q}
      onClose={onClose}
      width="max-w-[600px]"
      title={
        q && (
          <span className="flex min-w-0 items-center gap-2 text-[14px] font-semibold text-ink">
            <span className="text-muted">{t('request')}</span>
            <span className="text-ink/25">/</span>
            <span className="truncate">{q.name}</span>
            <span className="hidden text-[12.5px] font-normal text-muted sm:inline">· {date(q.createdAt, lang)}</span>
          </span>
        )
      }
      footer={q && <Footer inquiry={q} />}
    >
      {q && <Body key={q.id} inquiry={q} product={product} index={index} duplicateOf={duplicateOf} onClose={onClose} onOpenInquiry={onOpenInquiry} />}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* Footer: the two hand-offs (p.43/45) — appointment and B2B quote      */
/* ------------------------------------------------------------------ */
function Footer({ inquiry: q }: { inquiry: InquiryX }) {
  const t = useDict(T, 'admin');
  const can = useCan();
  const noPerm = useNoPermText();
  const navigate = useNavigate();
  const quotes = useDb((s) => s.quotes);
  const [booking, setBooking] = useState(false);
  const quote = useMemo(() => quotes.filter((x) => x.inquiryId === q.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0], [quotes, q.id]);
  const canBook = can('appointments', 'edit');
  const canQuote = can('quotes', 'edit') || (!!quote && can('quotes', 'view'));
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <span title={canBook ? undefined : noPerm}>
          <Button variant="outline" shape="rounded" size="sm" className="w-full" icon={<CalendarPlus className="h-4 w-4" />} disabled={!canBook || q.status === 'done'} onClick={() => setBooking(true)}>
            {t('createBooking')}
          </Button>
        </span>
        <span title={canQuote ? undefined : noPerm}>
          <Button
            variant="primary"
            shape="rounded"
            size="sm"
            className="w-full"
            icon={<FileText className="h-4 w-4" />}
            disabled={!canQuote}
            onClick={() => navigate(quote ? `/admin/kontakti/ponude?id=${quote.id}` : `/admin/kontakti/ponude?id=new&inquiry=${q.id}`)}
          >
            <span className="truncate">{quote ? t('openQuote', { number: quote.number }) : t('createQuote')}</span>
          </Button>
        </span>
      </div>
      <BookingModal inquiry={q} open={booking} onClose={() => setBooking(false)} />
    </>
  );
}

/* ------------------------------------------------------------------ */
function Body({ inquiry: q, product, index, duplicateOf, onClose, onOpenInquiry }: { inquiry: InquiryX; product?: Product; index: CustomerIndex; duplicateOf?: InquiryX; onClose: () => void; onOpenInquiry: (id: string) => void }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const noPerm = useNoPermText();
  const me = useCurrentStaff();
  const now = useNow();
  const staff = useDb((s) => s.staff);
  const allBookings = useDb((s) => s.bookings);
  const allQuotes = useDb((s) => s.quotes);
  const inquiries = useDb((s) => s.inquiries);
  const services = useDb((s) => s.services);
  const canEdit = can('contacts', 'edit');
  const assignable = useMemo(() => assignableStaff(staff), [staff]);
  const assignee = staff.find((m) => m.id === q.assignee);
  const bookings = useMemo(() => bookingsFor(q.id, allBookings), [q.id, allBookings]);
  const quotes = useMemo(() => allQuotes.filter((x) => x.inquiryId === q.id), [allQuotes, q.id]);
  const kind = kindOf(q, bookings.length > 0);
  const src = sourceOf(q);
  const path = sourcePath(q, product?.slug);
  const due = dueOf(q);
  const tagPool = useMemo(() => [...new Set(inquiries.flatMap((x) => x.tags ?? []))].sort(), [inquiries]);
  const [booking, setBooking] = useState(false);

  const db = () => useDb.getState();
  const setStatus = (status: InquiryStatus, msg?: string, extraTags?: string[]) => {
    if (q.status === status && !extraTags) return;
    if (status === 'scheduled' && !bookings.some((b) => new Date(b.start).getTime() > Date.now() && b.status !== 'cancelled')) {
      if (can('appointments', 'edit')) setBooking(true);
      return;
    }
    db().updateInquiry(q.id, { status, seen: true, ...(extraTags ? { tags: [...new Set([...(q.tags ?? []), ...extraTags])] } : {}) });
    if (q.status !== status) db().logAudit({ action: 'status', object: 'inquiry', objectId: q.id, detail: `${q.status} → ${status}` });
    toast.success(msg ?? t('statusSaved', { status: tx(`st_${status}`) }));
  };
  const assign = (id: string) => {
    db().assignInquiry(q.id, id || null);
    const m = staff.find((x) => x.id === id);
    toast.success(m ? t('assigned', { name: m.name }) : t('unassignedToast'));
  };
  const setFollow = (iso: string | undefined) => db().updateInquiry(q.id, { followUpAt: iso });

  const remove = async () => {
    const ok = await confirmDialog({ title: t('deleteTitle'), text: t('deleteText', { name: q.name }), confirmLabel: t('delete'), danger: true });
    if (!ok) return;
    onClose();
    db().deleteInquiry(q.id);
    db().logAudit({ action: 'delete', object: 'inquiry', objectId: q.id, detail: q.name });
    toast.success(t('deleted'));
  };

  return (
    <div className="space-y-6 px-5 py-5 sm:px-6">
      {/* Who */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-bold tracking-tight text-ink">{q.name}</h2>
            {q.company && (
              <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
                <Building2 className="h-3.5 w-3.5 text-muted" /> {q.company}
              </div>
            )}
          </div>
          {!canEdit && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11.5px] font-semibold text-muted" title={noPerm}>
              <Lock className="h-3 w-3" /> {t('readOnly')}
            </span>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <StatusLabel status={q.status} />
          <KindLabel kind={kind} />
          <span className="text-[13px] text-ink-soft">{tx(sourceKey(src))}</span>
          {due && <DueLabel due={due} now={now} />}
        </div>
        <p className="mt-1.5 text-[12.5px] text-muted">
          {t('received', { date: dateTime(q.createdAt, lang) })}
          {path && (
            <>
              {' '}
              {t('from')}{' '}
              <a href={href(path)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink">
                {path}
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ContactLink href={telHref(q.phone)} icon={<Phone className="h-3.5 w-3.5" />}>
            {q.phone}
          </ContactLink>
          <ContactLink href={waHref(q.phone)} icon={<WhatsAppIcon className="h-3.5 w-3.5" />} external>
            WhatsApp
          </ContactLink>
          {q.email ? (
            <ContactLink href={mailHref(q.email, t('mailSubject'))} icon={<Mail className="h-3.5 w-3.5" />}>
              <span className="max-w-[220px] truncate">{q.email}</span>
            </ContactLink>
          ) : null}
        </div>
      </div>

      {duplicateOf && (
        <div className="rounded-xl border border-amber-600/25 bg-amber-50 p-3.5 text-[13px] text-amber-900">
          <div className="flex items-start gap-2.5">
            <Copy className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{t('dupTitle')}</div>
              <div className="mt-0.5 text-amber-900/80">{t('dupText', { date: dateTime(duplicateOf.createdAt, lang), name: duplicateOf.name })}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => onOpenInquiry(duplicateOf.id)} className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-700/25 bg-white px-2.5 text-[12px] font-semibold text-amber-900 hover:border-amber-700/50">
                  {t('dupOpen')} <ArrowUpRight className="h-3 w-3" />
                </button>
                {canEdit && q.status !== 'done' && (
                  <button type="button" onClick={() => setStatus('done', t('dupClosed'), ['dyfish'])} className="inline-flex h-7 items-center rounded-md px-2 text-[12px] font-semibold text-amber-900 hover:bg-amber-100">
                    {t('dupClose')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      <section>
        <SectionTitle>{t('message')}</SectionTitle>
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <p className="whitespace-pre-line px-4 py-3.5 text-[14px] leading-relaxed text-ink">{q.message}</p>
          {(product || q.service || q.preferredDate || q.city) && (
            <div className="divide-y divide-line/70 border-t border-line/70 bg-canvas/30">
              {product && (
                <a href={href(`/produkt/${product.slug}`)} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-canvas">
                  <Thumb src={product.images[0]} className="h-10 w-10 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                      <Package className="h-3 w-3" /> {t('product')}
                    </span>
                    <span className="block truncate text-[13px] font-semibold text-ink group-hover:underline">{l(product.name)}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">{product.quoteOnly ? t('onRequest') : t('priceFrom', { price: `${money(basePrice(product), lang)} ${perUnit(product.unit, lang)}` })}</span>
                </a>
              )}
              {q.service && <MetaRow icon={<Stethoscope className="h-3.5 w-3.5" />} label={t('service')} value={q.service} />}
              {q.preferredDate && <MetaRow icon={<CalendarClock className="h-3.5 w-3.5" />} label={t('preferred')} value={date(parseDay(q.preferredDate), lang, { weekday: 'short', day: 'numeric', month: 'long' })} />}
              {q.city && <MetaRow icon={<MapPin className="h-3.5 w-3.5" />} label={t('city')} value={q.city} />}
            </div>
          )}
        </div>
      </section>

      {/* Handling: status, assignee, follow-up, tags */}
      <section>
        <SectionTitle>{t('manage')}</SectionTitle>
        <div className="space-y-4 rounded-xl border border-line bg-white p-4" title={canEdit ? undefined : noPerm}>
          <div>
            <div className="mb-1 text-[12.5px] font-semibold text-ink-soft">{t('status')}</div>
            <Segmented<InquiryStatus>
              value={q.status}
              onChange={(s) => setStatus(s)}
              disabled={!canEdit}
              cols="grid-cols-2 sm:grid-cols-4"
              options={STATUSES.map((s) => ({ id: s, label: tx(`st_${s}`), icon: <span className="grid w-3.5 place-items-center"><StatusSymbol status={s} /></span> }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-semibold text-ink-soft">{t('assignee')}</span>
                {canEdit && me && q.assignee !== me.id && assignable.some((m) => m.id === me.id) && (
                  <button type="button" onClick={() => assign(me.id)} className="text-[12px] font-semibold text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink">
                    {t('takeIt')}
                  </button>
                )}
              </div>
              {canEdit ? (
                <CSelect value={q.assignee ?? ''} onChange={(e) => assign(e.target.value)} aria-label={t('assignee')}>
                  <option value="">{tx('unassigned')}</option>
                  {assignable.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.title ? ` — ${l(m.title)}` : ''}
                    </option>
                  ))}
                </CSelect>
              ) : (
                <div className="flex h-10 items-center">
                  <AssigneeLabel staff={assignee} />
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-[12.5px] font-semibold text-ink-soft">{t('followUp')}</div>
              <input
                type="datetime-local"
                value={toLocalInput(q.followUpAt)}
                disabled={!canEdit}
                onChange={(e) => setFollow(fromLocalInput(e.target.value))}
                className="h-10 w-full rounded-lg border border-line bg-white px-3 text-[13.5px] text-ink outline-none transition-colors focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas/70 disabled:text-muted"
              />
            </div>
          </div>
          {canEdit && (
            <div className="-mt-2 flex flex-wrap gap-1.5 sm:justify-end">
              <Chip onClick={() => setFollow(at(0, 17))}>{t('today17')}</Chip>
              <Chip onClick={() => setFollow(at(1, 10))}>{t('tomorrow')}</Chip>
              <Chip onClick={() => setFollow(at(3, 10))}>{t('in3')}</Chip>
              <Chip onClick={() => setFollow(at(7, 10))}>{t('week')}</Chip>
              {q.followUpAt && <Chip onClick={() => setFollow(undefined)}>{t('noDue')}</Chip>}
            </div>
          )}
          <div>
            <div className="mb-1 text-[12.5px] font-semibold text-ink-soft">{t('tags')}</div>
            <TagsField value={q.tags ?? []} onChange={(tags) => db().updateInquiry(q.id, { tags })} suggestions={tagPool} placeholder={t('tagsPh')} disabled={!canEdit} />
          </div>
        </div>
      </section>

      {/* Linked appointments & quotes */}
      <section>
        <SectionTitle>{t('links')}</SectionTitle>
        {bookings.length === 0 && quotes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-3.5 text-[13px] text-muted">{t('linksEmpty')}</p>
        ) : (
          <ul className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line bg-white">
            {bookings.map((b) => {
              const svc = services.find((s) => s.id === b.serviceId);
              const who = staff.find((m) => m.id === b.staffId);
              return (
                <li key={b.id}>
                  <Link to={`/admin/termini?id=${b.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-canvas/70">
                    <CalendarClock className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-ink">{dateTime(b.start, lang)}</span>
                      <span className="block truncate text-[12px] text-muted">{[svc && l(svc.name), who?.name].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 text-[12px]', b.status === 'cancelled' || b.status === 'noshow' ? 'text-muted' : 'text-ink-soft')}>
                      {b.status === 'cancelled' || b.status === 'noshow' ? <XCircle className="h-3.5 w-3.5" /> : b.status === 'pending' ? <Clock className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {t(`bk_${b.status}`)}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </Link>
                </li>
              );
            })}
            {quotes.map((x) => (
              <li key={x.id}>
                <Link to={`/admin/kontakti/ponude?id=${x.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-canvas/70">
                  <FileText className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      {x.number} · v{x.version}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{x.customer.company || x.customer.name}</span>
                  </span>
                  <QuoteStatusLabel state={quoteState(x, now)} className="text-[12px]" />
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Replies · private notes · history */}
      <Conversation inquiry={q} canEdit={canEdit} bookings={bookings} quotes={quotes} />

      {/* Customer */}
      <section>
        <SectionTitle icon={<UserRound className="h-3.5 w-3.5" />}>{t('customer')}</SectionTitle>
        <CustomerLink inquiry={q} index={index} canEdit={canEdit} canOpenProfile={can('customers', 'view')} onOpenInquiry={onOpenInquiry} />
      </section>

      {/* Close / spam / delete */}
      <div className="border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {canEdit &&
            (q.status === 'done' ? (
              <Button size="xs" shape="rounded" variant="outline" onClick={() => setStatus('contacted')}>
                {t('reopen')}
              </Button>
            ) : (
              <Button size="xs" shape="rounded" variant="outline" icon={<StatusSymbol status="done" className="text-ink" />} onClick={() => setStatus('done')}>
                {t('close')}
              </Button>
            ))}
          {canEdit && !(q.tags ?? []).includes('spam') && (
            <Button size="xs" shape="rounded" variant="ghost" icon={<Ban className="h-3.5 w-3.5" />} onClick={() => setStatus('done', t('spamDone'), ['spam'])}>
              {t('spam')}
            </Button>
          )}
          {can('contacts', 'delete') && (
            <button type="button" onClick={remove} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> {t('delete')}
            </button>
          )}
        </div>
        <p className="mt-2 text-[12px] text-muted">{t('archiveNote')}</p>
      </div>

      <BookingModal inquiry={q} open={booking} onClose={() => setBooking(false)} />
    </div>
  );
}

function ContactLink({ href: to, icon, children, external }: { href: string; icon: ReactNode; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={to}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/30"
    >
      <span className="shrink-0 text-muted">{icon}</span>
      {children}
    </a>
  );
}

function MetaRow({ icon, label, value }: { icon: ReactNode; label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-[13px]">
      <span className="text-muted">{icon}</span>
      <span className="text-muted">{label}</span>
      <span className="ml-auto text-right font-medium text-ink">{value}</span>
    </div>
  );
}
