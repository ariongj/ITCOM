import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowUpRight, CheckCircle2, FileText, Lock, PackagePlus, Plus, RotateCcw, Send, ShoppingBag, Trash2, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, Thumb, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { adm } from '@/admin/i18n';
import { defineDict, lt, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff, useSettings } from '@/store/hooks';
import { basePrice } from '@/lib/pricing';
import { date, dateTime, money, unitLabel } from '@/lib/format';
import type { L10n, Quote } from '@/lib/types';
import { cn, round2, uid } from '@/lib/utils';
import { cx } from './i18n';
import { CInput, CSelect, Chip } from './fields';
import { QuoteStatusPill, StaffAvatar, useNoPermText } from './atoms';
import { ProductPicker } from './ProductPicker';
import { daysLeft, draftFromQuote, isoDayFromNow, nextQuoteNumber, quoteOwners, quoteState, quoteTotals } from './model';

const T = defineDict({
  me: {
    newTitle: 'Nova B2B ponuda',
    lines: 'Stavke',
    col_item: 'Proizvod / opis',
    col_qty: 'Količina',
    col_price: 'Cijena / jed.',
    col_total: 'Ukupno',
    custom: 'Slobodna stavka',
    fromCatalog: 'Iz kataloga',
    addCustom: 'Slobodna stavka',
    linesEmpty: 'Dodajte sočiva iz kataloga ili slobodnu stavku (npr. „Progresivna sočiva 1.6 — par“, „Montaža + kontrola“, dostava…).',
    itemPh: 'npr. Progresivna sočiva 1.6 — par',
    subtotal: 'Ukupno bez PDV-a',
    vat: 'PDV {rate}% (uključen)',
    total: 'Ukupno',
    terms: 'Uslovi',
    termsHint: 'Rok izrade, plaćanje, garancija — prikazuje se optici-partneru uz ponudu.',
    customer: 'Klijent',
    name: 'Kontakt osoba',
    company: 'Optika / firma',
    email: 'E-mail',
    phone: 'Telefon',
    fromInquiry: 'Iz upita: {name}',
    validity: 'Važenje i verzija',
    validUntil: 'Važi do',
    plus14: '+14 dana',
    plus30: '+30 dana',
    daysLeft: 'Ističe za {n} d.',
    lastDay: 'Ističe danas',
    expired: 'Važenje je isteklo',
    version: 'Verzija',
    versionHint: 'Svaka sačuvana izmjena pravi novu verziju.',
    owner: 'Odgovorni',
    history: 'Istorija',
    historyEmpty: 'Istorija se popunjava kad sačuvate ponudu.',
    h_create: 'Kreirana',
    h_update: 'Izmijenjena',
    h_send: 'Poslata klijentu',
    h_status: 'Status',
    h_convert: 'Pretvorena u narudžbu',
    h_delete: 'Obrisana',
    send: 'Pošalji',
    resend: 'Pošalji ponovo',
    accept: 'Prihvaćeno',
    decline: 'Odbijeno',
    convert: 'Pretvori u narudžbu',
    reopen: 'Otvori za izmjene',
    openDraft: 'Otvori nacrt {number}',
    saveFirst: 'Prvo sačuvajte izmjene',
    needAccepted: 'Najprije označite ponudu kao prihvaćenu',
    sendTitle: 'Poslati ponudu {number}?',
    sendText: 'Verzija {v} ide na {email} sa PDF-om i linkom za prihvatanje.',
    sentToast: 'Ponuda {number} v{v} je poslata na {email}',
    noEmail: 'Dodajte e-mail klijenta prije slanja',
    acceptedToast: 'Ponuda je prihvaćena — sada je možete pretvoriti u narudžbu',
    declinedToast: 'Ponuda je označena kao odbijena',
    convertTitle: 'Pretvoriti u narudžbu?',
    convertText: 'Kreira se nacrt narudžbe {draft} sa stavkama i dogovorenim cijenama ponude ({total}). Ponuda se zaključava.',
    convertedToast: 'Kreiran nacrt narudžbe {number}',
    draftNote: 'Iz B2B ponude {number} (v{v}), prihvaćene {date}.',
    reopenedToast: 'Ponuda je otvorena kao verzija {v}',
    savedNew: 'Ponuda {number} je kreirana',
    saved: 'Sačuvano kao verzija {v}',
    savedResend: 'Sačuvano kao verzija {v} — pošaljite je ponovo klijentu',
    savedSame: 'Promjene su sačuvane',
    errName: 'Unesite kontakt osobu',
    errLines: 'Dodajte bar jednu stavku sa količinom',
    errEmail: 'E-mail nije ispravan',
    locked: 'Prihvaćena ili pretvorena ponuda je zaključana. Za izmjene je otvorite kao novu verziju.',
    readOnly: 'Samo pregled — nemate dozvolu za izmjenu ponuda.',
    delete: 'Obriši ponudu',
    deleteTitle: 'Obrisati ponudu {number}?',
    deleteText: 'Nacrt ponude biće trajno uklonjen.',
    deleted: 'Ponuda je obrisana',
    notFound: 'Ponuda nije pronađena',
    notFoundText: 'Možda je obrisana. Vratite se na listu B2B ponuda.',
    back: 'Nazad na ponude',
    remove: 'Ukloni stavku',
  },
  sq: {
    newTitle: 'Ofertë e re B2B',
    lines: 'Linjat',
    col_item: 'Produkti / përshkrimi',
    col_qty: 'Sasia',
    col_price: 'Çmimi / njësi',
    col_total: 'Totali',
    custom: 'Linjë e lirë',
    fromCatalog: 'Nga katalogu',
    addCustom: 'Linjë e lirë',
    linesEmpty: 'Shtoni lente nga katalogu ose një linjë të lirë (p.sh. „Lente progresive 1.6 — palë“, „Montim + kontroll“, dërgesë…).',
    itemPh: 'p.sh. Lente progresive 1.6 — palë',
    subtotal: 'Totali pa TVSH',
    vat: 'TVSH {rate}% (e përfshirë)',
    total: 'Totali',
    terms: 'Kushtet',
    termsHint: 'Afati i punimit, pagesa, garancia — i shfaqen optikës partnere bashkë me ofertën.',
    customer: 'Klienti',
    name: 'Personi i kontaktit',
    company: 'Optika / kompania',
    email: 'E-mail',
    phone: 'Telefoni',
    fromInquiry: 'Nga kërkesa: {name}',
    validity: 'Vlefshmëria & versioni',
    validUntil: 'E vlefshme deri',
    plus14: '+14 ditë',
    plus30: '+30 ditë',
    daysLeft: 'Skadon për {n} ditë',
    lastDay: 'Skadon sot',
    expired: 'Vlefshmëria ka skaduar',
    version: 'Versioni',
    versionHint: 'Çdo ndryshim i ruajtur krijon një version të ri.',
    owner: 'Përgjegjësi',
    history: 'Historiku',
    historyEmpty: 'Historiku plotësohet pasi ta ruani ofertën.',
    h_create: 'U krijua',
    h_update: 'U ndryshua',
    h_send: 'U dërgua te klienti',
    h_status: 'Statusi',
    h_convert: 'U konvertua në porosi',
    h_delete: 'U fshi',
    send: 'Dërgo',
    resend: 'Dërgo sërish',
    accept: 'Pranuar',
    decline: 'Refuzuar',
    convert: 'Konverto në porosi',
    reopen: 'Rihap për ndryshime',
    openDraft: 'Hap draftin {number}',
    saveFirst: 'Ruani ndryshimet fillimisht',
    needAccepted: 'Shënojeni ofertën si të pranuar fillimisht',
    sendTitle: 'Të dërgohet oferta {number}?',
    sendText: 'Versioni {v} i dërgohet {email} me PDF dhe lidhje për pranim.',
    sentToast: 'Oferta {number} v{v} u dërgua te {email}',
    noEmail: 'Shtoni e-mailin e klientit para dërgimit',
    acceptedToast: 'Oferta u pranua — tani mund ta konvertoni në porosi',
    declinedToast: 'Oferta u shënua si e refuzuar',
    convertTitle: 'Të konvertohet në porosi?',
    convertText: 'Krijohet draft-porosia {draft} me linjat dhe çmimet e rëna dakord të ofertës ({total}). Oferta kyçet.',
    convertedToast: 'U krijua draft-porosia {number}',
    draftNote: 'Nga oferta B2B {number} (v{v}), e pranuar më {date}.',
    reopenedToast: 'Oferta u rihap si versioni {v}',
    savedNew: 'Oferta {number} u krijua',
    saved: 'U ruajt si versioni {v}',
    savedResend: 'U ruajt si versioni {v} — dërgojeni sërish te klienti',
    savedSame: 'Ndryshimet u ruajtën',
    errName: 'Shkruani personin e kontaktit',
    errLines: 'Shtoni të paktën një linjë me sasi',
    errEmail: 'E-maili nuk është i saktë',
    locked: 'Oferta e pranuar ose e konvertuar është e kyçur. Për ndryshime rihapeni si version të ri.',
    readOnly: 'Vetëm shikim — nuk keni leje për të ndryshuar ofertat.',
    delete: 'Fshij ofertën',
    deleteTitle: 'Të fshihet oferta {number}?',
    deleteText: 'Drafti i ofertës do të hiqet përgjithmonë.',
    deleted: 'Oferta u fshi',
    notFound: 'Oferta nuk u gjet',
    notFoundText: 'Mund të jetë fshirë. Kthehuni te lista e ofertave B2B.',
    back: 'Kthehu te ofertat',
    remove: 'Hiq linjën',
  },
  en: {
    newTitle: 'New B2B quote',
    lines: 'Lines',
    col_item: 'Product / description',
    col_qty: 'Qty',
    col_price: 'Unit price',
    col_total: 'Total',
    custom: 'Custom line',
    fromCatalog: 'From catalogue',
    addCustom: 'Custom line',
    linesEmpty: 'Add lenses from the catalogue or a custom line (e.g. “Progressive lenses 1.6 — pair”, “Mounting + check”, delivery…).',
    itemPh: 'e.g. Progressive lenses 1.6 — pair',
    subtotal: 'Total excl. VAT',
    vat: 'VAT {rate}% (included)',
    total: 'Total',
    terms: 'Terms',
    termsHint: 'Lead time, payment, warranty — shown to the partner optician with the quote.',
    customer: 'Customer',
    name: 'Contact person',
    company: 'Optician / company',
    email: 'E-mail',
    phone: 'Phone',
    fromInquiry: 'From request: {name}',
    validity: 'Validity & version',
    validUntil: 'Valid until',
    plus14: '+14 days',
    plus30: '+30 days',
    daysLeft: 'Expires in {n} d',
    lastDay: 'Expires today',
    expired: 'Validity has expired',
    version: 'Version',
    versionHint: 'Every saved change creates a new version.',
    owner: 'Owner',
    history: 'History',
    historyEmpty: 'History fills in once you save the quote.',
    h_create: 'Created',
    h_update: 'Edited',
    h_send: 'Sent to the customer',
    h_status: 'Status',
    h_convert: 'Converted to an order',
    h_delete: 'Deleted',
    send: 'Send',
    resend: 'Send again',
    accept: 'Accepted',
    decline: 'Declined',
    convert: 'Convert to order',
    reopen: 'Reopen for changes',
    openDraft: 'Open draft {number}',
    saveFirst: 'Save your changes first',
    needAccepted: 'Mark the quote as accepted first',
    sendTitle: 'Send quote {number}?',
    sendText: 'Version {v} goes to {email} with a PDF and an acceptance link.',
    sentToast: 'Quote {number} v{v} sent to {email}',
    noEmail: "Add the customer's e-mail before sending",
    acceptedToast: 'Quote accepted — you can now convert it to an order',
    declinedToast: 'Quote marked as declined',
    convertTitle: 'Convert to an order?',
    convertText: 'Creates draft order {draft} with the lines and agreed prices of the quote ({total}). The quote gets locked.',
    convertedToast: 'Draft order {number} created',
    draftNote: 'From B2B quote {number} (v{v}), accepted on {date}.',
    reopenedToast: 'Quote reopened as version {v}',
    savedNew: 'Quote {number} created',
    saved: 'Saved as version {v}',
    savedResend: 'Saved as version {v} — send it to the customer again',
    savedSame: 'Changes saved',
    errName: 'Enter the contact person',
    errLines: 'Add at least one line with a quantity',
    errEmail: 'E-mail is not valid',
    locked: 'An accepted or converted quote is locked. Reopen it as a new version to change it.',
    readOnly: 'View only — you do not have permission to edit quotes.',
    delete: 'Delete quote',
    deleteTitle: 'Delete quote {number}?',
    deleteText: 'The draft quote will be removed permanently.',
    deleted: 'Quote deleted',
    notFound: 'Quote not found',
    notFoundText: 'It may have been deleted. Go back to the B2B quotes list.',
    back: 'Back to quotes',
    remove: 'Remove line',
  },
});

const DEFAULT_TERMS: L10n = {
  me: 'Cene uključuju PDV 18%. Rok izrade 2–7 radnih dana od potvrde recepta. Plaćanje u roku od 15 dana od isporuke; dostava kurirom ili preuzimanje u laboratoriji.',
  sq: 'Çmimet përfshijnë TVSH 18%. Afati i punimit 2–7 ditë pune nga konfirmimi i recetës. Pagesa brenda 15 ditëve nga dorëzimi; dërgesë me korrier ose marrje në laborator.',
  en: 'Prices include 18% VAT. Lead time 2–7 working days from prescription confirmation. Payment within 15 days of delivery; courier delivery or collection at the lab.',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Line = Quote['lines'][number];
/** Everything the customer sees — a change here bumps the version (the owner is internal). */
const content = (q: Quote) => JSON.stringify([q.customer, q.lines, q.validUntil, q.terms ?? null]);

/** B2B quote editor (p.43): customer/company, catalogue or custom lines, validity, terms, versioned edits, send/accept/decline/convert. */
export function QuoteEditor({ id, inquiryId }: { id: string; inquiryId?: string | null }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const noPerm = useNoPermText();
  const me = useCurrentStaff();
  const settings = useSettings();
  const quotes = useDb((s) => s.quotes);
  const products = useDb((s) => s.products);
  const staff = useDb((s) => s.staff);
  const inquiries = useDb((s) => s.inquiries);
  const drafts = useDb((s) => s.drafts);
  const audit = useDb((s) => s.audit);

  const isNew = id === 'new';
  const saved = isNew ? undefined : quotes.find((x) => x.id === id);
  const inquiry = inquiries.find((x) => x.id === (saved?.inquiryId ?? inquiryId ?? ''));
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const owners = useMemo(() => quoteOwners(staff), [staff]);

  const buildBlank = (): Quote => {
    const prod = inquiry?.productId ? productById.get(inquiry.productId) : undefined;
    const lastTerms = [...quotes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.terms;
    return {
      id: '',
      number: nextQuoteNumber(quotes),
      ...(inquiry ? { inquiryId: inquiry.id } : {}),
      customer: { name: inquiry?.name ?? '', company: inquiry?.company ?? '', email: inquiry?.email ?? '', phone: inquiry?.phone ?? '' },
      lines: prod ? [{ productId: prod.id, title: lt(prod.name, lang), qty: 1, price: basePrice(prod) }] : [],
      validUntil: isoDayFromNow(14),
      terms: lastTerms ?? DEFAULT_TERMS,
      version: 1,
      status: 'draft',
      createdAt: '',
      owner: (me && owners.some((m) => m.id === me.id) ? me.id : undefined) ?? (inquiry?.assignee && owners.some((m) => m.id === inquiry.assignee) ? inquiry.assignee : owners[0]?.id),
    };
  };

  // built once per editor mount (the page keys the editor by id)
  const [draft, setDraft] = useState<Quote>(() => (saved ? structuredClone(saved) : buildBlank()));
  const [picker, setPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isNew && !saved) {
    return (
      <div className="animate-fade-in">
        <PageHeader back="/admin/kontakti/ponude" breadcrumbs={[{ label: ta('nav_contacts'), to: '/admin/kontakti' }, { label: ta('nav_quotes'), to: '/admin/kontakti/ponude' }]} title={t('notFound')} />
        <Card>
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t('notFound')} text={t('notFoundText')} action={<Link to="/admin/kontakti/ponude" className="text-[13px] font-semibold text-ink underline underline-offset-2">{t('back')}</Link>} />
        </Card>
      </div>
    );
  }

  const now = Date.now();
  const state = saved ? quoteState(saved, now) : 'draft';
  const canEdit = can('quotes', 'edit');
  const canSend = can('quotes', 'publish');
  const canConvert = can('quotes', 'publish') && can('drafts', 'edit');
  const lockedByState = !!saved && (saved.status === 'accepted' || saved.status === 'converted');
  const locked = !canEdit || lockedByState;
  const contentDirty = isNew || (!!saved && content(draft) !== content(saved));
  const dirty = isNew || contentDirty || (!!saved && draft.owner !== saved.owner);
  const totals = quoteTotals(draft.lines, settings.vatRate);
  const left = daysLeft(draft.validUntil, now);
  const linkedDraft = saved?.orderId ? drafts.find((d) => d.id === saved.orderId) : undefined;

  const db = () => useDb.getState();
  const patch = (p: Partial<Quote>) => setDraft((d) => ({ ...d, ...p }));
  const setCustomer = (k: keyof Quote['customer'], v: string) => setDraft((d) => ({ ...d, customer: { ...d.customer, [k]: v } }));
  const setLine = (i: number, p: Partial<Line>) => setDraft((d) => ({ ...d, lines: d.lines.map((x, k) => (k === i ? { ...x, ...p } : x)) }));
  const removeLine = (i: number) => setDraft((d) => ({ ...d, lines: d.lines.filter((_, k) => k !== i) }));

  const validate = () => {
    const err: Record<string, string> = {};
    if (!draft.customer.name.trim()) err.name = t('errName');
    if (draft.customer.email.trim() && !EMAIL_RE.test(draft.customer.email.trim())) err.email = t('errEmail');
    if (!draft.lines.some((x) => x.title.trim() && x.qty > 0)) err.lines = t('errLines');
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const clean = (q: Quote): Quote => ({
    ...q,
    customer: { name: q.customer.name.trim(), company: q.customer.company.trim(), email: q.customer.email.trim(), phone: q.customer.phone.trim() },
    lines: q.lines.filter((x) => x.title.trim() && x.qty > 0).map((x) => ({ ...x, title: x.title.trim(), qty: round2(x.qty), price: round2(x.price) })),
  });

  const save = () => {
    if (!validate()) return;
    if (isNew) {
      const q: Quote = { ...clean(draft), id: uid('q'), number: nextQuoteNumber(db().quotes), createdAt: new Date().toISOString(), version: 1, status: 'draft' };
      db().upsert('quotes', q);
      if (inquiry && inquiry.status === 'new') {
        db().updateInquiry(inquiry.id, { status: 'contacted', seen: true });
        db().logAudit({ action: 'status', object: 'inquiry', objectId: inquiry.id, detail: 'new → contacted' });
      }
      toast.success(t('savedNew', { number: q.number }));
      navigate(`/admin/kontakti/ponude?id=${q.id}`, { replace: true });
      return;
    }
    if (!saved) return;
    const bump = contentDirty;
    const resend = bump && saved.status !== 'draft';
    const next: Quote = { ...clean(draft), version: bump ? saved.version + 1 : saved.version, status: resend ? 'draft' : saved.status };
    db().upsert('quotes', next);
    setDraft(structuredClone(next));
    toast.success(bump ? t(resend ? 'savedResend' : 'saved', { v: next.version }) : t('savedSame'));
  };
  const discard = () => {
    if (isNew) navigate(inquiry ? `/admin/kontakti?id=${inquiry.id}` : '/admin/kontakti/ponude');
    else if (saved) {
      setDraft(structuredClone(saved));
      setErrors({});
    }
  };

  /* ---------------- status actions ---------------- */
  const setStatus = (status: Quote['status'], extra: Partial<Quote> = {}) => {
    if (!saved) return null;
    const next = { ...saved, ...extra, status };
    db().upsert('quotes', next);
    setDraft(structuredClone(next));
    return next;
  };
  const send = async () => {
    if (!saved) return;
    const email = saved.customer.email.trim();
    if (!email || !EMAIL_RE.test(email)) {
      toast.error(t('noEmail'));
      return;
    }
    const ok = await confirmDialog({ title: t('sendTitle', { number: saved.number }), text: t('sendText', { v: saved.version, email }), confirmLabel: t('send'), danger: false });
    if (!ok) return;
    setStatus('sent');
    db().logAudit({ action: 'send', object: 'quote', objectId: saved.id, detail: `${saved.number} v${saved.version}` });
    toast.success(t('sentToast', { number: saved.number, v: saved.version, email }));
  };
  const accept = () => {
    if (!saved) return;
    setStatus('accepted');
    db().logAudit({ action: 'status', object: 'quote', objectId: saved.id, detail: `${saved.number}: ${saved.status} → accepted` });
    toast.success(t('acceptedToast'));
  };
  const decline = () => {
    if (!saved) return;
    setStatus('declined');
    db().logAudit({ action: 'status', object: 'quote', objectId: saved.id, detail: `${saved.number}: ${saved.status} → declined` });
    toast.success(t('declinedToast'));
  };
  const reopen = () => {
    if (!saved) return;
    const next = setStatus('draft', { version: saved.version + 1 });
    db().logAudit({ action: 'status', object: 'quote', objectId: saved.id, detail: `${saved.number}: ${saved.status} → draft` });
    if (next) toast.success(t('reopenedToast', { v: next.version }));
  };
  const convert = async () => {
    if (!saved) return;
    const totalLabel = money(quoteTotals(saved.lines, settings.vatRate).total, lang);
    const preview = draftFromQuote(saved, { drafts: db().drafts, by: me?.id ?? 'admin', lang, note: '', skuOf: () => undefined });
    const ok = await confirmDialog({ title: t('convertTitle'), text: t('convertText', { draft: preview.number, total: totalLabel }), confirmLabel: t('convert'), danger: false });
    if (!ok) return;
    const d = draftFromQuote(saved, {
      drafts: db().drafts,
      by: me?.id ?? 'admin',
      lang,
      city: inquiry?.city,
      note: t('draftNote', { number: saved.number, v: saved.version, date: date(new Date(), lang) }),
      skuOf: (pid) => productById.get(pid)?.sku,
    });
    db().upsert('drafts', d);
    setStatus('converted', { orderId: d.id });
    db().logAudit({ action: 'convert', object: 'quote', objectId: saved.id, detail: `${saved.number} → ${d.number}` });
    toast.success(t('convertedToast', { number: d.number }));
    navigate(`/admin/nacrti/${d.id}`);
  };
  const remove = async () => {
    if (!saved) return;
    const ok = await confirmDialog({ title: t('deleteTitle', { number: saved.number }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    db().remove('quotes', saved.id);
    toast.success(t('deleted'));
    navigate('/admin/kontakti/ponude', { replace: true });
  };

  /* ---------------- header actions by state ---------------- */
  const gate = (allowed: boolean, extraBlock?: string) => ({ disabled: !allowed || dirty || !!extraBlock, title: !allowed ? noPerm : dirty ? t('saveFirst') : extraBlock });
  const actions: ReactNode = isNew ? null : (
    <>
      {(state === 'sent' || state === 'expired') && (
        <>
          <ActionBtn {...gate(canEdit)} icon={<XCircle className="h-4 w-4" />} onClick={decline}>
            {t('decline')}
          </ActionBtn>
          <ActionBtn {...gate(canSend)} icon={<Send className="h-4 w-4" />} onClick={send}>
            {t('resend')}
          </ActionBtn>
          <ActionBtn primary {...gate(canEdit)} icon={<CheckCircle2 className="h-4 w-4" />} onClick={accept}>
            {t('accept')}
          </ActionBtn>
        </>
      )}
      {state === 'draft' && (
        <ActionBtn primary {...gate(canSend)} icon={<Send className="h-4 w-4" />} onClick={send}>
          {t('send')}
        </ActionBtn>
      )}
      {state === 'declined' && (
        <ActionBtn {...gate(canEdit)} icon={<RotateCcw className="h-4 w-4" />} onClick={reopen}>
          {t('reopen')}
        </ActionBtn>
      )}
      {state === 'accepted' && (
        <>
          <ActionBtn {...gate(canEdit)} icon={<RotateCcw className="h-4 w-4" />} onClick={reopen}>
            {t('reopen')}
          </ActionBtn>
          <ActionBtn primary {...gate(canConvert)} icon={<ShoppingBag className="h-4 w-4" />} onClick={convert}>
            {t('convert')}
          </ActionBtn>
        </>
      )}
      {state === 'converted' && linkedDraft && (
        <Link to={`/admin/nacrti/${linkedDraft.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-[13px] font-semibold text-white hover:bg-brand-700">
          <ShoppingBag className="h-4 w-4" /> {t('openDraft', { number: linkedDraft.number })}
        </Link>
      )}
    </>
  );

  const history = saved ? audit.filter((a) => a.object === 'quote' && a.objectId === saved.id) : [];
  // an upsert logs "update" next to the explicit send/status/convert entry — keep only the meaningful one
  const shown = history.filter((a) => a.action !== 'update' || !history.some((b) => b !== a && b.action !== 'update' && Math.abs(new Date(b.at).getTime() - new Date(a.at).getTime()) < 3000));
  const staffName = (sid: string) => staff.find((m) => m.id === sid)?.name ?? (sid === 'web' ? 'Web' : sid);
  const hLabel = (action: string) =>
    action === 'create' ? t('h_create') : action === 'send' ? t('h_send') : action === 'convert' ? t('h_convert') : action === 'status' ? t('h_status') : action === 'delete' ? t('h_delete') : t('h_update');
  const statusDetail = (detail?: string) => {
    const m = /→\s*(\w+)$/.exec(detail ?? '');
    const s = m?.[1];
    return s && ['draft', 'sent', 'accepted', 'declined', 'converted'].includes(s) ? tx(`q_${s as 'draft'}`) : undefined;
  };

  return (
    <div className="animate-fade-in pb-24">
      <PageHeader
        back="/admin/kontakti/ponude"
        breadcrumbs={[{ label: ta('nav_contacts'), to: '/admin/kontakti' }, { label: ta('nav_quotes'), to: '/admin/kontakti/ponude' }, isNew ? t('newTitle') : saved!.number]}
        title={isNew ? t('newTitle') : saved!.number}
        badge={
          !isNew && (
            <span className="flex items-center gap-2">
              <QuoteStatusPill state={state} />
              <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[12px] font-semibold tabular-nums text-ink-soft">v{saved!.version}</span>
            </span>
          )
        }
        description={draft.customer.company || draft.customer.name ? [draft.customer.company, draft.customer.name].filter(Boolean).join(' · ') : undefined}
        actions={actions}
      />

      {(lockedByState || !canEdit) && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          {!canEdit ? t('readOnly') : t('locked')}
        </div>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-5">
        <div className="min-w-0 space-y-4">
          {/* Lines */}
          <Card
            padded={false}
            title={t('lines')}
            actions={
              !locked && (
                <>
                  <Button variant="outline" shape="rounded" size="xs" icon={<PackagePlus className="h-3.5 w-3.5" />} onClick={() => setPicker(true)}>
                    {t('fromCatalog')}
                  </Button>
                  <Button variant="outline" shape="rounded" size="xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDraft((d) => ({ ...d, lines: [...d.lines, { title: '', qty: 1, price: 0 }] }))}>
                    <span className="max-sm:hidden">{t('addCustom')}</span>
                  </Button>
                </>
              )
            }
          >
            {draft.lines.length === 0 ? (
              <p className={cn('px-5 py-8 text-center text-[13px]', errors.lines ? 'font-semibold text-red-700' : 'text-muted')}>{errors.lines ?? t('linesEmpty')}</p>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(0,1fr)_92px_120px_110px_32px] gap-3 border-b border-line bg-canvas/60 px-5 py-2 text-[12.5px] font-semibold text-muted md:grid">
                  <span>{t('col_item')}</span>
                  <span className="text-right">{t('col_qty')}</span>
                  <span className="text-right">{t('col_price')}</span>
                  <span className="text-right">{t('col_total')}</span>
                  <span />
                </div>
                <ul className="divide-y divide-line/70">
                  {draft.lines.map((line, i) => {
                    const p = line.productId ? productById.get(line.productId) : undefined;
                    return (
                      <li key={i} className="grid grid-cols-[minmax(0,1fr)_32px] items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1fr)_92px_120px_110px_32px]">
                        <div className="flex min-w-0 items-center gap-3">
                          {p ? <Thumb src={p.images[0]} className="h-10 w-10 rounded-md" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-dashed border-ink/20 text-muted"><FileText className="h-4 w-4" /></span>}
                          <div className="min-w-0 flex-1">
                            {locked ? (
                              <div className="truncate text-[13.5px] font-semibold text-ink">{line.title}</div>
                            ) : (
                              <input
                                value={line.title}
                                onChange={(e) => setLine(i, { title: e.target.value })}
                                placeholder={t('itemPh')}
                                className="h-8 w-full rounded-md border border-transparent bg-transparent px-1.5 text-[13.5px] font-semibold text-ink outline-none transition-colors hover:border-line focus:border-ink/40 focus:bg-white"
                              />
                            )}
                            <div className="truncate px-1.5 text-[12px] text-muted">{p ? <span className="font-mono">{p.sku}</span> : t('custom')}{p && ` · ${unitLabel(p.unit, lang)}`}</div>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeLine(i)} disabled={locked} className="order-2 grid h-8 w-8 place-items-center justify-self-end rounded-md text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:invisible md:order-none md:col-start-5 md:row-start-1" aria-label={t('remove')} title={t('remove')}>
                          <X className="h-4 w-4" />
                        </button>
                        <div className="order-3 col-span-2 grid grid-cols-3 gap-2 md:order-none md:col-span-3 md:col-start-2 md:row-start-1 md:grid-cols-[92px_120px_110px] md:gap-3">
                          <NumField label={t('col_qty')} value={line.qty} onChange={(v) => setLine(i, { qty: v })} locked={locked} step="1" suffix={p ? unitLabel(p.unit, lang) : undefined} />
                          <NumField label={t('col_price')} value={line.price} onChange={(v) => setLine(i, { price: v })} locked={locked} step="0.01" suffix="€" />
                          <div className="flex flex-col items-end justify-center">
                            <span className="text-[11px] text-muted md:hidden">{t('col_total')}</span>
                            <span className="text-[13.5px] font-semibold tabular-nums text-ink">{money(round2(line.qty * line.price), lang)}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {errors.lines && <p className="px-5 pb-1 pt-2 text-[12.5px] font-semibold text-red-700">{errors.lines}</p>}
              </>
            )}
            <dl className="space-y-1 border-t border-line bg-canvas/30 px-5 py-3.5 text-[13px]">
              <div className="flex justify-between text-muted">
                <dt>{t('subtotal')}</dt>
                <dd className="tabular-nums">{money(totals.net, lang)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>{t('vat', { rate: settings.vatRate })}</dt>
                <dd className="tabular-nums">{money(totals.vat, lang)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-[15px] font-bold text-ink">
                <dt>{t('total')}</dt>
                <dd className="tabular-nums">{money(totals.total, lang)}</dd>
              </div>
            </dl>
          </Card>

          {/* Terms */}
          <Card title={t('terms')} description={t('termsHint')}>
            {locked ? (
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{l(draft.terms) || '—'}</p>
            ) : (
              <L10nInput value={draft.terms ?? { me: '', sq: '', en: '' }} onChange={(terms) => patch({ terms })} multiline rows={3} />
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {/* Customer */}
          <Card title={t('customer')}>
            <div className="space-y-3">
              <CInput label={t('company')} value={draft.customer.company} onChange={(e) => setCustomer('company', e.target.value)} disabled={locked} placeholder="d.o.o." />
              <CInput label={t('name')} required value={draft.customer.name} onChange={(e) => setCustomer('name', e.target.value)} disabled={locked} error={errors.name} />
              <CInput label={t('email')} type="email" value={draft.customer.email} onChange={(e) => setCustomer('email', e.target.value)} disabled={locked} error={errors.email} />
              <CInput label={t('phone')} type="tel" value={draft.customer.phone} onChange={(e) => setCustomer('phone', e.target.value)} disabled={locked} />
              {inquiry && (
                <Link to={`/admin/kontakti?id=${inquiry.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink">
                  {t('fromInquiry', { name: inquiry.name })} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </Card>

          {/* Validity, version, owner */}
          <Card title={t('validity')}>
            <div className="space-y-3.5">
              <div>
                <CInput label={t('validUntil')} type="date" value={draft.validUntil.slice(0, 10)} onChange={(e) => e.target.value && patch({ validUntil: e.target.value })} disabled={locked} />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {!locked && (
                    <>
                      <Chip onClick={() => patch({ validUntil: isoDayFromNow(14) })}>{t('plus14')}</Chip>
                      <Chip onClick={() => patch({ validUntil: isoDayFromNow(30) })}>{t('plus30')}</Chip>
                    </>
                  )}
                  <span className={cn('ml-auto text-[12px]', left < 0 ? 'font-semibold text-amber-800' : 'text-muted')}>{left < 0 ? t('expired') : left === 0 ? t('lastDay') : t('daysLeft', { n: left })}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-canvas/60 px-3 py-2.5">
                <div>
                  <div className="text-[12.5px] font-semibold text-ink-soft">{t('version')}</div>
                  <div className="text-[11.5px] text-muted">{t('versionHint')}</div>
                </div>
                <span className="text-[18px] font-bold tabular-nums text-ink">
                  v{isNew ? 1 : contentDirty && saved ? saved.version + 1 : draft.version}
                </span>
              </div>
              <CSelect label={t('owner')} value={draft.owner ?? ''} onChange={(e) => patch({ owner: e.target.value || undefined })} disabled={!canEdit || saved?.status === 'converted'}>
                {owners.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </CSelect>
            </div>
          </Card>

          {/* History */}
          {!isNew && (
            <Card title={t('history')}>
              {shown.length === 0 ? (
                <p className="text-[13px] text-muted">{t('historyEmpty')}</p>
              ) : (
                <ol className="space-y-3">
                  {shown.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex gap-2.5">
                      <StaffAvatar name={staffName(a.actor)} size="xs" className="mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-ink">
                          {hLabel(a.action)}
                          {a.action === 'status' && statusDetail(a.detail) && `: ${statusDetail(a.detail)}`}
                          {a.action === 'send' && a.detail && <span className="text-muted"> · {a.detail.split(' ').pop()}</span>}
                          {a.action === 'convert' && a.detail && <span className="text-muted"> · {a.detail.split('→').pop()?.trim()}</span>}
                        </div>
                        <div className="text-[12px] text-muted">
                          {dateTime(a.at, lang)} · {staffName(a.actor)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}

          {!isNew && saved?.status === 'draft' && can('quotes', 'delete') && (
            <button type="button" onClick={remove} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-red-700 transition-colors hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> {t('delete')}
            </button>
          )}
        </div>
      </div>

      <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />
      <ProductPicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(p) => {
          setDraft((d) => ({ ...d, lines: [...d.lines, { productId: p.id, title: l(p.name), qty: 1, price: basePrice(p) }] }));
          setErrors((e) => ({ ...e, lines: '' }));
          setPicker(false);
        }}
      />
    </div>
  );
}

function ActionBtn({ primary, disabled, title, icon, onClick, children }: { primary?: boolean; disabled?: boolean; title?: string; icon: ReactNode; onClick: () => void; children: ReactNode }) {
  return (
    <span title={title}>
      <Button variant={primary ? 'primary' : 'outline'} shape="rounded" size="sm" icon={icon} disabled={disabled} onClick={onClick}>
        {children}
      </Button>
    </span>
  );
}

function NumField({ label, value, onChange, locked, step, suffix }: { label: string; value: number; onChange: (v: number) => void; locked: boolean; step: string; suffix?: string }) {
  return (
    <label className="flex min-w-0 flex-col items-end">
      <span className="text-[11px] text-muted md:hidden">{label}</span>
      {locked ? (
        <span className="text-[13.5px] tabular-nums text-ink">
          {value} {suffix}
        </span>
      ) : (
        <span className="relative w-full">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            value={Number.isFinite(value) ? value : 0}
            onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
            aria-label={label}
            className={cn('h-8 w-full rounded-md border border-line bg-white pl-2 text-right text-[13.5px] tabular-nums text-ink outline-none transition-colors focus:border-ink/40 focus:ring-4 focus:ring-ink/5', suffix ? 'pr-8' : 'pr-2')}
          />
          {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11.5px] text-muted">{suffix}</span>}
        </span>
      )}
    </label>
  );
}
