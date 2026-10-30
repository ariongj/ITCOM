import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  AlertTriangle, Building2, CalendarDays, ChevronRight, FileText, Globe2, GitMerge, Lock, Mail, MapPin, MessageCircle, MessagesSquare, Phone,
  ShieldCheck, Split, Tag, Trash2, Users,
} from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { InquiryStatusBadge, OrderStatusBadge, confirmDialog } from '@/admin/components/kit';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { date, dateTime, money, timeAgo } from '@/lib/format';
import type { Booking, Quote, Segment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ContactAction, crm, mailHref, pluralForm, telHref, waHref } from './shared';
import { cx } from '@/admin/components/customers/i18n';
import type { CustomerRecord, DuplicatePair } from '@/admin/components/customers/model';
import { ActionMenu, Avatar, CHANNEL_ICON, ConsentState, Gate, KpiStrip, LangChip, SectionTitle, TagEditor } from '@/admin/components/customers/parts';
import { CHANNELS, useCustomerStore, type Channel, type Consent } from '@/admin/components/customers/store';

const T = defineDict({
  me: {
    title: 'Profil kupca',
    since: 'Kupac od {date}',
    kpiOrders: 'Narudžbe',
    kpiSpent: 'Potrošeno',
    kpiAvg: 'Prosječna narudžba',
    kpiLast: 'Posljednja narudžba',
    never: 'Još nije naručivao',
    notes: 'Privatne bilješke',
    notesHint: 'Vidljivo samo osoblju — ne prikazuje se kupcu, ne izvozi se i nije u javnom API-ju.',
    notePh: 'Dodajte bilješku za kolege…',
    addNote: 'Sačuvaj bilješku',
    noNotes: 'Još nema bilješki.',
    noteAdded: 'Bilješka je sačuvana',
    noteDeleted: 'Bilješka je obrisana',
    deleteNote: 'Obriši bilješku',
    tags: 'Oznake',
    tagPh: 'Nova oznaka…',
    addTag: 'Dodaj',
    tagsSaved: 'Oznake su ažurirane',
    noTags: 'Bez oznaka',
    contact: 'Kontakt',
    email: 'E-mail',
    phone: 'Telefon',
    language: 'Jezik komunikacije',
    company: 'Firma',
    pib: 'NUI',
    addresses: 'Adrese',
    addrDefault: 'Glavna',
    noAddress: 'Nema sačuvane adrese.',
    marketing: 'Marketing saglasnosti',
    marketingHint: 'Saglasnost se čuva posebno za svaki kanal. Segmenti ne šalju poruke automatski.',
    subscribe: 'Prijavi',
    unsubscribe: 'Odjavi',
    consentTitle: 'Potvrda saglasnosti — {ch}',
    consentText: 'Prijavite kupca samo ako je dao izričitu saglasnost (potpisan obrazac, e-mail ili lično u prodavnici). Bilježe se datum i vaše ime.',
    consentConfirm: 'Kupac je dao saglasnost',
    consentSaved: '{ch}: {status}',
    history: 'Istorija narudžbi',
    noOrdersYet: 'Kupac još nema web narudžbi.',
    cancelledNote: 'Otkazane narudžbe ({n}) nisu uračunate u potrošnju.',
    cancelledN: '+{n} otkazano',
    linked: 'Povezani upiti i termini',
    linkedHint: 'Povezano automatski po e-mailu ili telefonu.',
    noLinked: 'Nema upita, termina ni ponuda za ovog kupca.',
    kind_booking: 'Termin',
    kind_quote: 'B2B ponuda',
    segments: 'Segmenti',
    noSegments: 'Nije ni u jednom segmentu.',
    merged: 'Spojeni zapisi',
    unmerge: 'Razdvoji',
    unmerged: 'Zapisi su razdvojeni',
    dupHint: 'Mogući duplikat: {name}',
    reviewMerge: 'Pregledaj spajanje',
    deleteCustomer: 'Obriši kupca',
    deleteBlocked: 'Kupci sa narudžbama se ne brišu — istorija narudžbi ostaje sačuvana.',
    deleteTitle: 'Obrisati kupca {name}?',
    deleteText: 'Profil, oznake i bilješke biće uklonjeni. Upiti i termini ostaju.',
    deleted: 'Kupac je obrisan',
    staff: 'Osoblje',
    mailSubject: 'ITCOM',
    lines_one: '{n} stavka',
    lines_few: '{n} stavke',
    lines_many: '{n} stavki',
  },
  sq: {
    title: 'Profili i klientit',
    since: 'Klient që nga {date}',
    kpiOrders: 'Porositë',
    kpiSpent: 'Shpenzuar',
    kpiAvg: 'Porosia mesatare',
    kpiLast: 'Porosia e fundit',
    never: 'Ende pa porosi',
    notes: 'Shënime private',
    notesHint: 'Të dukshme vetëm për stafin — nuk i shfaqen klientit, nuk eksportohen dhe nuk dalin në API-n publike.',
    notePh: 'Shkruani një shënim për kolegët…',
    addNote: 'Ruaj shënimin',
    noNotes: 'Ende nuk ka shënime.',
    noteAdded: 'Shënimi u ruajt',
    noteDeleted: 'Shënimi u fshi',
    deleteNote: 'Fshij shënimin',
    tags: 'Etiketat',
    tagPh: 'Etiketë e re…',
    addTag: 'Shto',
    tagsSaved: 'Etiketat u përditësuan',
    noTags: 'Pa etiketa',
    contact: 'Kontakti',
    email: 'E-mail',
    phone: 'Telefoni',
    language: 'Gjuha e komunikimit',
    company: 'Kompania',
    pib: 'NUI',
    addresses: 'Adresat',
    addrDefault: 'Kryesore',
    noAddress: 'Nuk ka adresë të ruajtur.',
    marketing: 'Preferencat e marketingut',
    marketingHint: 'Pëlqimi ruhet veçmas për çdo kanal. Segmentet nuk dërgojnë mesazhe automatikisht.',
    subscribe: 'Abono',
    unsubscribe: 'Çabono',
    consentTitle: 'Konfirmo pëlqimin — {ch}',
    consentText: 'Abonojeni klientin vetëm nëse ka dhënë pëlqim të qartë (formular i nënshkruar, e-mail ose personalisht në dyqan). Regjistrohen data dhe emri juaj.',
    consentConfirm: 'Klienti ka dhënë pëlqimin',
    consentSaved: '{ch}: {status}',
    history: 'Historiku i porosive',
    noOrdersYet: 'Klienti ende nuk ka porosi online.',
    cancelledNote: 'Porositë e anuluara ({n}) nuk llogariten në shpenzime.',
    cancelledN: '+{n} të anuluara',
    linked: 'Kontakte dhe termine të lidhura',
    linkedHint: 'Të lidhura automatikisht sipas e-mailit ose telefonit.',
    noLinked: 'Nuk ka kontakte, termine apo oferta për këtë klient.',
    kind_booking: 'Termin',
    kind_quote: 'Ofertë B2B',
    segments: 'Segmentet',
    noSegments: 'Nuk bën pjesë në asnjë segment.',
    merged: 'Regjistrime të bashkuara',
    unmerge: 'Ndaj',
    unmerged: 'Regjistrimet u ndanë',
    dupHint: 'Dyfishim i mundshëm: {name}',
    reviewMerge: 'Shiko bashkimin',
    deleteCustomer: 'Fshij klientin',
    deleteBlocked: 'Klientët me porosi nuk fshihen — historiku i porosive ruhet.',
    deleteTitle: 'Të fshihet klienti {name}?',
    deleteText: 'Profili, etiketat dhe shënimet do të hiqen. Kontaktet dhe terminet mbeten.',
    deleted: 'Klienti u fshi',
    staff: 'Stafi',
    mailSubject: 'ITCOM',
    lines_one: '{n} artikull',
    lines_few: '{n} artikuj',
    lines_many: '{n} artikuj',
  },
  en: {
    title: 'Customer profile',
    since: 'Customer since {date}',
    kpiOrders: 'Orders',
    kpiSpent: 'Spent',
    kpiAvg: 'Average order',
    kpiLast: 'Last order',
    never: 'No orders yet',
    notes: 'Private notes',
    notesHint: 'Staff only — never shown to the customer, never exported, not in the public API.',
    notePh: 'Write a note for your colleagues…',
    addNote: 'Save note',
    noNotes: 'No notes yet.',
    noteAdded: 'Note saved',
    noteDeleted: 'Note deleted',
    deleteNote: 'Delete note',
    tags: 'Tags',
    tagPh: 'New tag…',
    addTag: 'Add',
    tagsSaved: 'Tags updated',
    noTags: 'No tags',
    contact: 'Contact',
    email: 'E-mail',
    phone: 'Phone',
    language: 'Preferred language',
    company: 'Company',
    pib: 'Business no. (NUI)',
    addresses: 'Addresses',
    addrDefault: 'Default',
    noAddress: 'No saved address.',
    marketing: 'Marketing preferences',
    marketingHint: 'Consent is stored separately per channel. Segments never send messages automatically.',
    subscribe: 'Subscribe',
    unsubscribe: 'Unsubscribe',
    consentTitle: 'Confirm consent — {ch}',
    consentText: 'Only subscribe the customer if they gave explicit consent (a signed form, an e-mail or in person at the store). The date and your name are recorded.',
    consentConfirm: 'Customer gave consent',
    consentSaved: '{ch}: {status}',
    history: 'Order history',
    noOrdersYet: 'No web orders yet.',
    cancelledNote: 'Cancelled orders ({n}) are not counted towards spend.',
    cancelledN: '+{n} cancelled',
    linked: 'Linked enquiries & appointments',
    linkedHint: 'Linked automatically by e-mail or phone.',
    noLinked: 'No enquiries, appointments or quotes for this customer.',
    kind_booking: 'Appointment',
    kind_quote: 'B2B quote',
    segments: 'Segments',
    noSegments: 'Not in any segment.',
    merged: 'Merged records',
    unmerge: 'Split',
    unmerged: 'Records split',
    dupHint: 'Possible duplicate: {name}',
    reviewMerge: 'Review merge',
    deleteCustomer: 'Delete customer',
    deleteBlocked: 'Customers with orders can’t be deleted — order history is kept.',
    deleteTitle: 'Delete customer {name}?',
    deleteText: 'The profile, tags and notes will be removed. Enquiries and appointments stay.',
    deleted: 'Customer deleted',
    staff: 'Staff',
    mailSubject: 'ITCOM',
    lines_one: '{n} item',
    lines_few: '{n} items',
    lines_many: '{n} items',
  },
});

function Section({ title, icon, aside, hint, children }: { title: ReactNode; icon?: ReactNode; aside?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <SectionTitle icon={icon} aside={aside}>
        {title}
      </SectionTitle>
      {hint && <p className="-mt-1 mb-2.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
      {children}
    </section>
  );
}

const box = 'overflow-hidden rounded-xl border border-line/80 bg-white';

function Row({ icon, label, children }: { icon: ReactNode; label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-2.5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-muted">{label}</div>
        <div className="break-words text-[13.5px] font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

export function CustomerDrawer({
  customer,
  open,
  onClose,
  segments,
  duplicates = [],
  allTags = [],
  onReviewMerge,
}: {
  customer: CustomerRecord | null | undefined;
  open: boolean;
  onClose: () => void;
  /** Segments this customer belongs to */
  segments: Segment[];
  /** Duplicate pairs that involve this customer */
  duplicates?: DuplicatePair[];
  allTags?: string[];
  onReviewMerge?: (pair: DuplicatePair) => void;
}) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const tc = useDict(common, 'admin');
  const tcr = useDict(crm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const me = useCurrentStaff();
  const staff = useDb((s) => s.staff);
  const services = useDb((s) => s.services);
  const logAudit = useDb((s) => s.logAudit);
  const store = useCustomerStore;
  const [note, setNote] = useState('');
  const c = customer;
  const canEdit = can('customers', 'edit');
  const staffName = (id: string) => staff.find((s) => s.id === id)?.name ?? t('staff');
  const svcName = (id: string) => l(services.find((s) => s.id === id)?.name) || '—';

  const linked = useMemo(() => {
    if (!c) return [];
    type Item = { id: string; at: string; to: string; icon: ReactNode; kind: string; title: string; sub: string; status: ReactNode };
    const out: Item[] = [];
    for (const i of c.inquiries) {
      out.push({ id: i.id, at: i.createdAt, to: `/admin/kontakti?id=${i.id}`, icon: <MessagesSquare className="h-4 w-4" />, kind: tc(`inq_${i.type}`), title: i.message, sub: date(i.createdAt, lang), status: <InquiryStatusBadge status={i.status} /> });
    }
    for (const b of c.bookings) {
      out.push({ id: b.id, at: b.start, to: `/admin/termini?id=${b.id}`, icon: <CalendarDays className="h-4 w-4" />, kind: t('kind_booking'), title: `${svcName(b.serviceId)}${b.note ? ` — ${b.note}` : ''}`, sub: dateTime(b.start, lang), status: <BookingStatus status={b.status} /> });
    }
    for (const q of c.quotes) {
      const total = q.lines.reduce((s, x) => s + x.price * x.qty, 0);
      out.push({ id: q.id, at: q.createdAt, to: '/admin/kontakti/ponude', icon: <FileText className="h-4 w-4" />, kind: t('kind_quote'), title: `${q.number} · ${money(total, lang, { decimals: false })}`, sub: date(q.createdAt, lang), status: <QuoteStatus status={q.status} /> });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, lang, services]);

  if (!c) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;

  const avg = c.valid ? c.spent / c.valid : 0;
  const audit = (detail: string) => logAudit({ action: 'update', object: 'customer', objectId: c.key, detail: `${c.name}: ${detail}` });

  const saveNote = () => {
    const text = note.trim();
    if (!text) return;
    store.getState().addNote(c.key, text, me?.id ?? 'admin');
    audit('note');
    setNote('');
    toast.success(t('noteAdded'));
  };
  const removeNote = async (id: string) => {
    if (!(await confirmDialog({ title: t('deleteNote'), danger: true }))) return;
    store.getState().removeNote(c.key, id);
    toast.success(t('noteDeleted'));
  };
  const setTags = (tags: string[]) => {
    store.getState().setTags(c.key, tags);
    audit(`tags → ${tags.join(', ') || '∅'}`);
    toast.success(t('tagsSaved'));
  };
  const setConsent = async (ch: Channel, status: Consent['status']) => {
    if (status === 'subscribed' && !(await confirmDialog({ title: t('consentTitle', { ch: tx(`ch_${ch}`) }), text: t('consentText'), confirmLabel: t('consentConfirm'), danger: false }))) return;
    store.getState().setConsent(c.key, ch, { status, at: new Date().toISOString(), source: 'staff', by: me?.id });
    audit(`${ch} marketing → ${status}`);
    toast.success(t('consentSaved', { ch: tx(`ch_${ch}`), status: tx(`consent_${status}`) }));
  };
  const remove = async () => {
    if (!(await confirmDialog({ title: t('deleteTitle', { name: c.name }), text: t('deleteText'), confirmLabel: t('deleteCustomer'), danger: true }))) return;
    store.getState().removeCustomer(c.key);
    logAudit({ action: 'delete', object: 'customer', objectId: c.key, detail: c.name });
    toast.success(t('deleted'), { description: c.name });
    onClose();
  };
  const unmerge = (k: string) => {
    store.getState().unmerge(k);
    audit(`split ${k}`);
    toast.success(t('unmerged'));
  };

  const deletable = c.manual && c.count === 0;
  const canDelete = can('customers', 'delete');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[640px]"
      title={<span className="text-[15px] font-semibold text-ink">{t('title')}</span>}
      footer={
        <div className="grid grid-cols-3 gap-2">
          <ContactAction href={telHref(c.phone)} icon={<Phone className="h-4 w-4" />} variant="primary" disabled={!c.phone}>
            <span className="max-[380px]:hidden">{tcr('call')}</span>
          </ContactAction>
          <ContactAction href={mailHref(c.email, t('mailSubject'))} icon={<Mail className="h-4 w-4" />} disabled={!c.email}>
            <span className="max-[380px]:hidden">E-mail</span>
          </ContactAction>
          <ContactAction href={waHref(c.phone)} external icon={<MessageCircle className="h-4 w-4" />} disabled={!c.phone}>
            <span className="max-[380px]:hidden">WhatsApp</span>
          </ContactAction>
        </div>
      }
    >
      <div className="space-y-7 px-5 py-6 sm:px-6">
        {/* Identity */}
        <div className="flex items-start gap-4">
          <Avatar name={c.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 truncate text-[20px] font-semibold tracking-tight text-ink">{c.name}</h2>
              <ActionMenu
                label={tx('moreActions')}
                items={[
                  ...duplicates.map((d) => ({ label: t('reviewMerge'), icon: GitMerge, onSelect: () => onReviewMerge?.(d), disabled: !canEdit, hint: tx('noPermission') })),
                  {
                    label: t('deleteCustomer'),
                    icon: Trash2,
                    danger: true,
                    divider: duplicates.length > 0,
                    disabled: !deletable || !canDelete,
                    hint: !canDelete ? tx('noPermission') : t('deleteBlocked'),
                    onSelect: remove,
                  },
                ]}
              />
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-muted">
              {c.city && (
                <>
                  <MapPin className="h-3.5 w-3.5" /> {c.city} ·
                </>
              )}
              <span>{t('since', { date: date(c.since, lang) })}</span>
              <span>·</span>
              <span>{tx(`src_${c.source}`)}</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <LangChip lang={c.lang} />
              {c.company && (
                <span className="inline-flex h-5 items-center gap-1 rounded-md border border-line bg-white px-1.5 text-[11px] font-semibold text-ink-soft">
                  <Building2 className="h-3 w-3" /> {c.company}
                </span>
              )}
              {segments.map((s) => (
                <Link key={s.id} to={`/admin/segmenti?id=${s.id}`} onClick={onClose} className="inline-flex h-5 items-center gap-1 rounded-md bg-ink/[0.06] px-1.5 text-[11px] font-semibold text-ink-soft transition-colors hover:bg-ink/10 hover:text-ink">
                  <Users className="h-3 w-3" /> {l(s.name)}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {duplicates.length > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-600/25 bg-amber-50/70 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1 text-[13px] text-ink">
              {duplicates.map((d) => {
                const other = d.a.key === c.key ? d.b : d.a;
                return (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      {t('dupHint', { name: other.name })} <span className="text-muted">({other.email || other.phone})</span>
                    </span>
                    {canEdit && onReviewMerge && (
                      <button type="button" onClick={() => onReviewMerge(d)} className="font-semibold text-ink underline underline-offset-2 hover:no-underline">
                        {t('reviewMerge')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <KpiStrip
          compact
          items={[
            { label: t('kpiOrders'), value: c.valid, sub: c.cancelled ? t('cancelledN', { n: c.cancelled }) : undefined },
            { label: t('kpiSpent'), value: money(c.spent, lang) },
            { label: t('kpiAvg'), value: c.valid ? money(avg, lang) : '—' },
            { label: t('kpiLast'), value: c.last ? date(c.last, lang, { day: 'numeric', month: 'short' }) : '—', sub: c.last ? timeAgo(c.last, lang) : t('never') },
          ]}
        />

        {/* Private notes */}
        <Section title={t('notes')} icon={<Lock className="h-3.5 w-3.5" />} hint={t('notesHint')}>
          {canEdit && (
            <div className="mb-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote();
                }}
                rows={2}
                placeholder={t('notePh')}
                className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-[13.5px] leading-relaxed outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
              />
              {note.trim() && (
                <div className="mt-2 flex justify-end">
                  <Button size="sm" shape="rounded" onClick={saveNote}>
                    {t('addNote')}
                  </Button>
                </div>
              )}
            </div>
          )}
          {c.notes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{t('noNotes')}</p>
          ) : (
            <ul className="space-y-2">
              {c.notes.map((n) => (
                <li key={n.id} className="group rounded-xl border border-line/80 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
                      <Avatar name={staffName(n.by)} size="xs" />
                      <span className="truncate font-semibold text-ink-soft">{staffName(n.by)}</span>
                      <span>·</span>
                      <span className="shrink-0" title={dateTime(n.at, lang)}>
                        {timeAgo(n.at, lang)}
                      </span>
                    </div>
                    {canEdit && (n.by === me?.id || can('customers', 'delete')) && (
                      <button type="button" onClick={() => removeNote(n.id)} aria-label={t('deleteNote')} title={t('deleteNote')} className="grid h-7 w-7 place-items-center rounded-md text-muted opacity-60 transition hover:bg-ink/[0.06] hover:text-ink group-hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{n.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Tags */}
        <Section title={t('tags')} icon={<Tag className="h-3.5 w-3.5" />}>
          {canEdit ? (
            <TagEditor tags={c.tags} autoTags={c.autoTags} suggestions={allTags} onChange={setTags} placeholder={t('tagPh')} addLabel={t('addTag')} autoLabel={tx('autoTag')} />
          ) : c.tags.length ? (
            <TagEditor tags={c.tags} autoTags={c.autoTags} suggestions={[]} onChange={() => {}} disabled placeholder="" addLabel="" autoLabel={tx('autoTag')} />
          ) : (
            <p className="text-[13px] text-muted">{t('noTags')}</p>
          )}
        </Section>

        {/* Contact + addresses */}
        <div className="grid gap-7 sm:grid-cols-2 sm:gap-4">
          <Section title={t('contact')}>
            <div className={cn(box, 'divide-y divide-line/70')}>
              <Row icon={<Mail className="h-4 w-4" />} label={t('email')}>
                {c.emails.length ? (
                  c.emails.map((e) => (
                    <a key={e} href={mailHref(e)} className="block truncate hover:underline">
                      {e}
                    </a>
                  ))
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Row>
              <Row icon={<Phone className="h-4 w-4" />} label={t('phone')}>
                {c.phones.length ? (
                  c.phones.map((p) => (
                    <a key={p} href={telHref(p)} className="block tabular-nums hover:underline">
                      {p}
                    </a>
                  ))
                ) : (
                  <span className="text-muted">—</span>
                )}
              </Row>
              <Row icon={<Globe2 className="h-4 w-4" />} label={t('language')}>
                {tx(`lang_${c.lang}`)}
              </Row>
              {(c.company || c.pib) && (
                <Row icon={<Building2 className="h-4 w-4" />} label={t('company')}>
                  {c.company}
                  {c.pib && <span className="block text-[12.5px] font-normal text-muted">{t('pib')} {c.pib}</span>}
                </Row>
              )}
            </div>
          </Section>
          <Section title={t('addresses')}>
            {c.addresses.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{t('noAddress')}</p>
            ) : (
              <ul className={cn(box, 'divide-y divide-line/70')}>
                {c.addresses.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 px-4 py-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink">{a.address || '—'}</div>
                      <div className="text-[12.5px] text-muted">
                        {a.city}
                        {a.orders > 0 && ` · ${tx(`orders_${pluralForm(a.orders, lang)}`, { n: a.orders })}`}
                      </div>
                    </div>
                    {i === 0 && <span className="shrink-0 rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[11px] font-semibold text-ink-soft">{t('addrDefault')}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Marketing consent per channel */}
        <Section title={t('marketing')} icon={<ShieldCheck className="h-3.5 w-3.5" />} hint={t('marketingHint')}>
          <ul className={cn(box, 'divide-y divide-line/70')}>
            {CHANNELS.map((ch) => {
              const Icon = CHANNEL_ICON[ch];
              const cs = c.marketing[ch];
              return (
                <li key={ch} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium text-ink">{tx(`ch_${ch}`)}</div>
                    {cs.at && (
                      <div className="truncate text-[12px] text-muted">
                        {cs.source ? `${tx(`csrc_${cs.source}`)} · ` : ''}
                        {date(cs.at, lang)}
                        {cs.by ? ` · ${staffName(cs.by)}` : ''}
                      </div>
                    )}
                  </div>
                  <ConsentState consent={cs} className="shrink-0" />
                  <Gate allowed={canEdit} reason={tx('noPermission')}>
                    <Button variant="outline" shape="rounded" size="xs" className="w-[92px]" disabled={!canEdit} onClick={() => setConsent(ch, cs.status === 'subscribed' ? 'unsubscribed' : 'subscribed')}>
                      {cs.status === 'subscribed' ? t('unsubscribe') : t('subscribe')}
                    </Button>
                  </Gate>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Orders */}
        <Section title={t('history')} aside={c.count > 0 ? <span className="text-[12px] text-muted">{tx(`orders_${pluralForm(c.count, lang)}`, { n: c.count })}</span> : undefined}>
          {c.orders.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{t('noOrdersYet')}</p>
          ) : (
            <>
              <ul className={cn(box, 'divide-y divide-line/70')}>
                {c.orders.map((o) => {
                  const cancelled = o.status === 'cancelled';
                  return (
                    <li key={o.id}>
                      <Link to={`/admin/narudzbe/${o.id}`} onClick={onClose} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-canvas/70">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-ink">{o.number}</span>
                            <OrderStatusBadge status={o.status} />
                          </div>
                          <div className="mt-0.5 truncate text-[12.5px] text-muted">
                            {date(o.createdAt, lang)} · {t(`lines_${pluralForm(o.items.length, lang)}`, { n: o.items.length })}
                          </div>
                        </div>
                        <span className={cn('text-[13.5px] font-semibold tabular-nums', cancelled ? 'text-muted line-through' : 'text-ink')}>{money(o.total, lang)}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {c.cancelled > 0 && <p className="mt-2 text-[12px] text-muted">{t('cancelledNote', { n: c.cancelled })}</p>}
            </>
          )}
        </Section>

        {/* Linked enquiries, bookings, quotes */}
        <Section title={t('linked')} hint={t('linkedHint')}>
          {linked.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{t('noLinked')}</p>
          ) : (
            <ul className={cn(box, 'divide-y divide-line/70')}>
              {linked.map((it) => (
                <li key={it.id}>
                  <Link to={it.to} onClick={onClose} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-canvas/70">
                    <span className="mt-0.5 text-muted">{it.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12.5px] font-semibold text-ink-soft">{it.kind}</span>
                        {it.status}
                      </div>
                      <div className="mt-0.5 truncate text-[13.5px] text-ink">{it.title}</div>
                      <div className="text-[12px] text-muted">{it.sub}</div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Merged records */}
        {c.mergedKeys.length > 0 && (
          <Section title={t('merged')} icon={<GitMerge className="h-3.5 w-3.5" />}>
            <ul className={cn(box, 'divide-y divide-line/70')}>
              {c.mergedKeys.map((k) => (
                <li key={k} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{k}</span>
                  {canEdit && (
                    <Button variant="ghost" shape="rounded" size="xs" icon={<Split className="h-3.5 w-3.5" />} onClick={() => unmerge(k)}>
                      {t('unmerge')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
function BookingStatus({ status }: { status: Booking['status'] }) {
  const tx = useDict(cx, 'admin');
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold', status === 'cancelled' || status === 'noshow' ? 'bg-ink/[0.05] text-muted' : 'bg-ink/[0.07] text-ink-soft')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'pending' ? 'border border-current' : 'bg-current')} />
      {tx(`bk_${status}`)}
    </span>
  );
}

function QuoteStatus({ status }: { status: Quote['status'] }) {
  const tx = useDict(cx, 'admin');
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.07] px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'draft' ? 'border border-current' : 'bg-current')} />
      {tx(`q_${status}`)}
    </span>
  );
}
