import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { AlertCircle, ArrowRightLeft, CheckCircle2, FileText, Plus, Search, Send, ShieldCheck, Store, Tag, Trash2, Truck, UserRound, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, Thumb, confirmDialog } from '@/admin/components/kit';
import { ProductSearch } from '@/admin/components/orders/ProductSearch';
import { blankDraft, draftCustomerName, draftProblems, draftTotals, knownCustomers, nextDraftNumber, normalizeItems, type KnownCustomer } from '@/admin/components/orders/drafts';
import { actorName, discountName, rejectText } from '@/admin/components/orders/helpers';
import { DraftBadge } from '@/admin/components/orders/status';
import { ActionMenu, Check, CodeChip, NumberInput, SelectInput, Stepper, SumRow, TextArea, TextInput } from '@/admin/components/orders/ui';
import { od } from '@/admin/components/orders/dict';
import { adm } from '@/admin/i18n';
import { LANGS, defineDict, useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { allCities, defaultOptions, zoneForCity } from '@/lib/pricing';
import { normalizeCode } from '@/lib/discounts';
import { fold } from '@/lib/search';
import { dateTime, money, num, perUnit } from '@/lib/format';
import { cn, uid } from '@/lib/utils';
import type { CartItem, DraftOrder, Lang, PaymentMethod, Product } from '@/lib/types';

const T = defineDict({
  me: {
    newTitle: 'Novi nacrt',
    title: 'Nacrt {n}',
    createdBy: 'Kreirao {name} · {date}',
    newDesc: 'Sastavite narudžbu za kupca koji zove telefonom ili je u prodavnici.',
    sendInvoice: 'Pošalji predračun',
    resendInvoice: 'Pošalji ponovo',
    convert: 'Konvertuj u narudžbu',
    more: 'Više',
    deleteDraft: 'Obriši nacrt',
    deleteTitle: 'Obrisati nacrt {n}?',
    deleteText: 'Nacrt se briše trajno.',
    deleted: 'Nacrt {n} je obrisan',
    saved: 'Nacrt {n} je sačuvan',
    invoiceSent: 'Predračun za {n} je poslat na {email}',
    convertTitle: 'Konvertovati {n} u narudžbu?',
    convertText: 'Kreira se narudžba sa ovim cijenama, popustima i dostavom ({total}); roba se rezerviše, a nacrt se zatvara.',
    convertConfirm: 'Konvertuj',
    converted: 'Kreirana je narudžba #{n}',
    convertedBanner: 'Nacrt je konvertovan u narudžbu #{n}. Izmjene više nisu moguće.',
    openOrder: 'Otvori narudžbu',
    sentBanner: 'Predračun je poslat {date}. Kupac još nije potvrdio — konvertujte nacrt kada potvrdi ili uplati.',
    readOnly: 'Samo pregled — vaša uloga ne može da mijenja nacrte.',
    fixFirst: 'Dopunite: {list}',
    p_lines: 'bar jedna stavka',
    p_name: 'ime kupca',
    p_contact: 'telefon ili e-mail',
    p_email: 'e-mail za predračun',
    p_city: 'grad',
    p_address: 'adresa dostave',
    required: 'Obavezno',
    // products
    products: 'Proizvodi',
    noLines: 'Dodajte proizvode iz kataloga ili posebnu stavku (npr. popravka, zamena drške).',
    addCustom: 'Dodaj posebnu stavku',
    customTitle: 'Naziv posebne stavke',
    customPh: 'npr. Zamena drške i podešavanje okvira',
    price: 'Cijena',
    qty: 'Količina',
    custom: 'Posebna stavka · bez popusta',
    installation: 'Nega+ {price}',
    remove: 'Ukloni',
    packsArea: '{packs} pak. = {area} m²',
    // payment
    payment: 'Plaćanje',
    codes: 'Kodovi popusta',
    codePh: 'Unesite kod, npr. MIFTARI10',
    apply: 'Primijeni',
    codeExists: 'Kod je već dodat',
    applied: 'Primijenjen',
    autoHint: '{name}: {reason}',
    subtotal: 'Međuzbir',
    customLines: 'Posebne stavke',
    shippingRow: 'Dostava',
    freeInstall: 'Besplatno uz Nega+',
    pickupFree: 'Preuzimanje u prodavnici',
    estimate: 'procjena — izaberite grad',
    total: 'Ukupno',
    vat: 'Uključen PDV {rate}% · {amount}',
    method: 'Način plaćanja',
    engineNote: 'Popusti se računaju istim motorom kao u web prodavnici — rezultat je isti i nakon konverzije.',
    // customer
    customer: 'Kupac',
    findCustomer: 'Pronađi postojećeg kupca…',
    noMatch: 'Nema kupca — upišite podatke ispod',
    ordersN: '{n} narudž.',
    clearCustomer: 'Novi kupac',
    firstName: 'Ime',
    lastName: 'Prezime',
    phone: 'Telefon',
    email: 'E-mail',
    company: 'Firma',
    pib: 'NUI',
    customerLang: 'Jezik kupca (stavke, predračun)',
    // delivery
    delivery: 'Dostava',
    city: 'Grad',
    chooseCity: 'Izaberite grad',
    address: 'Adresa',
    zone: '{zone} · {fee} · {days} dana',
    pickupAt: 'Preuzimanje: {addr}',
    // tags & notes
    tags: 'Oznake',
    addTag: 'Dodaj oznaku i Enter',
    notes: 'Napomena',
    notesPh: 'Dogovor sa kupcem, rokovi, avans…',
    notesHint: 'Prelazi u napomenu kupca na narudžbi.',
    notFound: 'Nacrt nije pronađen',
    notFoundText: 'Možda je obrisan ili link nije ispravan.',
    back: 'Svi nacrti',
  },
  sq: {
    newTitle: 'Draft i ri',
    title: 'Drafti {n}',
    createdBy: 'Krijuar nga {name} · {date}',
    newDesc: 'Përgatitni një porosi për klientin që telefonon ose është në optikë.',
    sendInvoice: 'Dërgo faturën',
    resendInvoice: 'Ridërgo faturën',
    convert: 'Konverto në porosi',
    more: 'Më shumë',
    deleteDraft: 'Fshij draftin',
    deleteTitle: 'Të fshihet drafti {n}?',
    deleteText: 'Drafti fshihet përfundimisht.',
    deleted: 'Drafti {n} u fshi',
    saved: 'Drafti {n} u ruajt',
    invoiceSent: 'Fatura për {n} u dërgua te {email}',
    convertTitle: 'Të konvertohet {n} në porosi?',
    convertText: 'Krijohet porosia me këto çmime, zbritje dhe dërgesë ({total}); malli rezervohet dhe drafti mbyllet.',
    convertConfirm: 'Konverto',
    converted: 'U krijua porosia #{n}',
    convertedBanner: 'Drafti u konvertua në porosinë #{n}. Ndryshimet nuk janë më të mundshme.',
    openOrder: 'Hap porosinë',
    sentBanner: 'Fatura u dërgua më {date}. Klienti ende nuk ka konfirmuar — konvertojeni draftin kur të konfirmojë ose të paguajë.',
    readOnly: 'Vetëm shikim — roli juaj nuk mund të ndryshojë draftet.',
    fixFirst: 'Plotësoni: {list}',
    p_lines: 'të paktën një artikull',
    p_name: 'emrin e klientit',
    p_contact: 'telefonin ose e-mailin',
    p_email: 'e-mailin për faturën',
    p_city: 'qytetin',
    p_address: 'adresën e dërgesës',
    required: 'E detyrueshme',
    products: 'Produktet',
    noLines: 'Shtoni produkte nga katalogu ose një artikull custom (p.sh. riparim, ndërrim bishti).',
    addCustom: 'Shto artikull custom',
    customTitle: 'Emri i artikullit custom',
    customPh: 'p.sh. Ndërrimi i bishtit dhe rregullimi i kornizës',
    price: 'Çmimi',
    qty: 'Sasia',
    custom: 'Artikull custom · pa zbritje',
    installation: 'Kujdes+ {price}',
    remove: 'Hiq',
    packsArea: '{packs} pako = {area} m²',
    payment: 'Pagesa',
    codes: 'Kodet e zbritjes',
    codePh: 'Shkruani kodin, p.sh. MIFTARI10',
    apply: 'Apliko',
    codeExists: 'Kodi është shtuar tashmë',
    applied: 'I aplikuar',
    autoHint: '{name}: {reason}',
    subtotal: 'Nëntotali',
    customLines: 'Artikuj custom',
    shippingRow: 'Dërgesa',
    freeInstall: 'Falas me Kujdes+',
    pickupFree: 'Marrje në dyqan',
    estimate: 'vlerësim — zgjidhni qytetin',
    total: 'Totali',
    vat: 'TVSH {rate}% e përfshirë · {amount}',
    method: 'Mënyra e pagesës',
    engineNote: 'Zbritjet llogariten me të njëjtin motor si në Online Store — rezultati mbetet i njëjtë pas konvertimit.',
    customer: 'Klienti',
    findCustomer: 'Gjej klient ekzistues…',
    noMatch: 'Nuk ka klient — plotësoni të dhënat më poshtë',
    ordersN: '{n} porosi',
    clearCustomer: 'Klient i ri',
    firstName: 'Emri',
    lastName: 'Mbiemri',
    phone: 'Telefoni',
    email: 'E-mail',
    company: 'Kompania',
    pib: 'NUI',
    customerLang: 'Gjuha e klientit (artikujt, fatura)',
    delivery: 'Dërgesa',
    city: 'Qyteti',
    chooseCity: 'Zgjidhni qytetin',
    address: 'Adresa',
    zone: '{zone} · {fee} · {days} ditë',
    pickupAt: 'Marrje: {addr}',
    tags: 'Etiketat',
    addTag: 'Shto etiketë dhe Enter',
    notes: 'Shënime',
    notesPh: 'Marrëveshja me klientin, afatet, avansi…',
    notesHint: 'Kalon si shënim i klientit në porosi.',
    notFound: 'Drafti nuk u gjet',
    notFoundText: 'Mund të jetë fshirë ose lidhja nuk është e saktë.',
    back: 'Të gjitha draftet',
  },
  en: {
    newTitle: 'New draft',
    title: 'Draft {n}',
    createdBy: 'Created by {name} · {date}',
    newDesc: 'Build an order for a customer calling by phone or visiting the store.',
    sendInvoice: 'Send invoice',
    resendInvoice: 'Resend invoice',
    convert: 'Convert to order',
    more: 'More',
    deleteDraft: 'Delete draft',
    deleteTitle: 'Delete draft {n}?',
    deleteText: 'The draft is deleted permanently.',
    deleted: 'Draft {n} deleted',
    saved: 'Draft {n} saved',
    invoiceSent: 'Invoice for {n} sent to {email}',
    convertTitle: 'Convert {n} into an order?',
    convertText: 'An order is created with these prices, discounts and delivery ({total}); stock is reserved and the draft is closed.',
    convertConfirm: 'Convert',
    converted: 'Order #{n} created',
    convertedBanner: 'This draft was converted into order #{n}. It can no longer be edited.',
    openOrder: 'Open order',
    sentBanner: 'Invoice sent on {date}. The customer has not confirmed yet — convert the draft once they confirm or pay.',
    readOnly: 'View only — your role cannot edit drafts.',
    fixFirst: 'Please add: {list}',
    p_lines: 'at least one item',
    p_name: 'customer name',
    p_contact: 'phone or e-mail',
    p_email: 'e-mail for the invoice',
    p_city: 'city',
    p_address: 'delivery address',
    required: 'Required',
    products: 'Products',
    noLines: 'Add catalogue products or a custom item (e.g. a repair, a replacement temple).',
    addCustom: 'Add custom item',
    customTitle: 'Custom item name',
    customPh: 'e.g. Temple replacement and frame adjustment',
    price: 'Price',
    qty: 'Quantity',
    custom: 'Custom item · no discounts',
    installation: 'Care+ {price}',
    remove: 'Remove',
    packsArea: '{packs} packs = {area} m²',
    payment: 'Payment',
    codes: 'Discount codes',
    codePh: 'Enter a code, e.g. MIFTARI10',
    apply: 'Apply',
    codeExists: 'Code already added',
    applied: 'Applied',
    autoHint: '{name}: {reason}',
    subtotal: 'Subtotal',
    customLines: 'Custom items',
    shippingRow: 'Delivery',
    freeInstall: 'Free with Care+',
    pickupFree: 'Pickup in store',
    estimate: 'estimate — choose a city',
    total: 'Total',
    vat: 'Includes {rate}% VAT · {amount}',
    method: 'Payment method',
    engineNote: 'Discounts use the same engine as the Online Store — the result stays the same after converting.',
    customer: 'Customer',
    findCustomer: 'Find an existing customer…',
    noMatch: 'No customer — fill in the details below',
    ordersN: '{n} orders',
    clearCustomer: 'New customer',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    email: 'E-mail',
    company: 'Company',
    pib: 'Business no. (NUI)',
    customerLang: 'Customer language (items, invoice)',
    delivery: 'Delivery',
    city: 'City',
    chooseCity: 'Choose a city',
    address: 'Address',
    zone: '{zone} · {fee} · {days} days',
    pickupAt: 'Pickup: {addr}',
    tags: 'Tags',
    addTag: 'Add a tag and press Enter',
    notes: 'Notes',
    notesPh: 'Agreement with the customer, deadlines, deposit…',
    notesHint: 'Carried over as the customer note on the order.',
    notFound: 'Draft not found',
    notFoundText: 'It may have been deleted or the link is incorrect.',
    back: 'All drafts',
  },
});

type Dict = ReturnType<typeof useDict<(typeof T)['me']>>;
type Problem = ReturnType<typeof draftProblems>[number];

export default function DraftOrderEdit() {
  const { id } = useParams();
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const isNew = id === 'novi';
  const stored = useDb((s) => (isNew ? undefined : s.drafts.find((d) => d.id === id || d.number === id)));

  if (!isNew && !stored) {
    return (
      <div className="animate-fade-in">
        <PageHeader back="/admin/nacrti" breadcrumbs={[{ label: ta('nav_orders'), to: '/admin/narudzbe' }, { label: ta('nav_drafts'), to: '/admin/nacrti' }, t('notFound')]} title={t('notFound')} />
        <Card>
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title={t('notFound')}
            text={t('notFoundText')}
            action={
              <ButtonLink to="/admin/nacrti" size="sm" shape="rounded">
                {t('back')}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }
  return <Editor key={stored?.id ?? 'new'} stored={stored ?? null} />;
}

function Editor({ stored }: { stored: DraftOrder | null }) {
  const t = useDict(T, 'admin');
  const to = useDict(od, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const me = useCurrentStaff();
  const drafts = useDb((s) => s.drafts);
  const orders = useDb((s) => s.orders);
  const staff = useDb((s) => s.staff);
  const audit = useDb((s) => s.audit);
  const products = useDb((s) => s.products);
  const settings = useDb((s) => s.settings);
  const discounts = useDb((s) => s.discounts);
  const collections = useDb((s) => s.collections);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);
  const logAudit = useDb((s) => s.logAudit);
  const convertDraft = useDb((s) => s.convertDraft);

  const [base, setBase] = useState<DraftOrder>(() => stored ?? blankDraft(lang, me?.id));
  const [draft, setDraft] = useState<DraftOrder>(base);
  const [showErrors, setShowErrors] = useState<Problem[]>([]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);

  // follow store updates (status change, another tab) while there are no local edits
  useEffect(() => {
    if (!stored || JSON.stringify(stored) === JSON.stringify(base)) return;
    setBase(stored);
    if (!dirty) setDraft(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  const converted = draft.status === 'converted';
  const readOnly = converted || !can('drafts', 'edit');
  const totals = useMemo(() => draftTotals(draft, { products, settings, discounts, collections }), [draft, products, settings, discounts, collections]);
  const order = draft.convertedOrderId ? orders.find((o) => o.id === draft.convertedOrderId) : undefined;
  const sentAt = useMemo(() => (stored ? audit.find((a) => a.object === 'draft' && a.objectId === stored.id && a.action === 'send')?.at : undefined), [audit, stored]);
  const problems = showErrors;
  const has = (p: Problem) => problems.includes(p);

  const patch = (p: Partial<DraftOrder>) => setDraft((d) => ({ ...d, ...p }));
  const patchCustomer = (p: Partial<DraftOrder['customer']>) => setDraft((d) => ({ ...d, customer: { ...d.customer, ...p } }));

  /* ---------------- persistence ---------------- */
  const persist = (next: DraftOrder): DraftOrder => {
    const saved: DraftOrder = next.id ? next : { ...next, id: uid('dr'), number: nextDraftNumber(drafts), createdAt: new Date().toISOString() };
    upsert('drafts', saved);
    setBase(saved);
    setDraft(saved);
    if (!next.id) navigate(`/admin/nacrti/${saved.id}`, { replace: true });
    return saved;
  };

  const save = () => {
    const saved = persist(draft);
    toast.success(t('saved', { n: saved.number }));
  };

  const check = (needEmail = false) => {
    const p = draftProblems(draft, { needEmail });
    setShowErrors(p);
    if (p.length) toast.error(t('fixFirst', { list: p.map((x) => t(`p_${x}`)).join(', ') }));
    return p.length === 0;
  };

  const sendInvoice = () => {
    if (!check(true)) return;
    const saved = persist({ ...draft, status: 'invoice_sent' });
    logAudit({ action: 'send', object: 'draft', objectId: saved.id, detail: `${saved.number} → ${saved.customer.email}` });
    toast.success(t('invoiceSent', { n: saved.number, email: saved.customer.email ?? '' }));
  };

  const convert = async () => {
    if (!check()) return;
    const ok = await confirmDialog({
      title: t('convertTitle', { n: draft.number || t('newTitle') }),
      text: t('convertText', { total: money(totals.grandTotal, lang) }),
      confirmLabel: t('convertConfirm'),
      danger: false,
    });
    if (!ok) return;
    const saved = persist(draft);
    const created = convertDraft(saved.id);
    if (!created) return;
    toast.success(t('converted', { n: created.number }));
    navigate(`/admin/narudzbe/${created.id}`);
  };

  const del = async () => {
    const ok = await confirmDialog({ title: t('deleteTitle', { n: draft.number }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    remove('drafts', draft.id);
    toast.success(t('deleted', { n: draft.number }));
    navigate('/admin/nacrti');
  };

  const creator = actorName(draft.createdBy, staff, { web: to('by_web'), admin: to('by_admin') });
  const title = draft.number ? t('title', { n: draft.number }) : t('newTitle');

  return (
    <div className="animate-fade-in pb-24">
      <PageHeader
        back="/admin/nacrti"
        breadcrumbs={[{ label: ta('nav_orders'), to: '/admin/narudzbe' }, { label: ta('nav_drafts'), to: '/admin/nacrti' }, draft.number || t('newTitle')]}
        title={title}
        badge={draft.id ? <DraftBadge status={draft.status} /> : undefined}
        description={draft.id ? t('createdBy', { name: creator || '—', date: dateTime(draft.createdAt, lang) }) : t('newDesc')}
        actions={
          !readOnly && (
            <>
              <Button variant="outline" size="sm" shape="rounded" icon={<Send className="h-4 w-4" />} onClick={sendInvoice}>
                {draft.status === 'invoice_sent' ? t('resendInvoice') : t('sendInvoice')}
              </Button>
              <Button size="sm" shape="rounded" icon={<ArrowRightLeft className="h-4 w-4" />} onClick={convert}>
                {t('convert')}
              </Button>
              {draft.id && (
                <ActionMenu
                  label={t('more')}
                  items={[{ label: t('deleteDraft'), icon: <Trash2 />, danger: true, onClick: del, disabled: !can('drafts', 'delete'), hint: to('noPermission') }]}
                />
              )}
            </>
          )
        }
      />

      {converted && (
        <Banner icon={<CheckCircle2 className="h-4 w-4" />}>
          <span className="flex-1">{t('convertedBanner', { n: order?.number ?? '—' })}</span>
          {order && (
            <ButtonLink to={`/admin/narudzbe/${order.id}`} size="xs" shape="rounded">
              {t('openOrder')}
            </ButtonLink>
          )}
        </Banner>
      )}
      {draft.status === 'invoice_sent' && <Banner icon={<Send className="h-4 w-4" />}>{t('sentBanner', { date: sentAt ? dateTime(sentAt, lang) : '—' })}</Banner>}
      {!converted && !can('drafts', 'edit') && <Banner icon={<AlertCircle className="h-4 w-4" />}>{t('readOnly')}</Banner>}
      {problems.length > 0 && !readOnly && (
        <Banner tone="critical" icon={<AlertCircle className="h-4 w-4" />}>
          {t('fixFirst', { list: problems.map((x) => t(`p_${x}`)).join(', ') })}
        </Banner>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <ProductsCard draft={draft} setDraft={setDraft} totals={totals} readOnly={readOnly} error={has('lines')} t={t} />
          <PaymentCard draft={draft} patch={patch} totals={totals} readOnly={readOnly} t={t} />
        </div>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <CustomerCard draft={draft} patch={patch} patchCustomer={patchCustomer} readOnly={readOnly} problems={problems} t={t} />
          <DeliveryCard draft={draft} patch={patch} patchCustomer={patchCustomer} readOnly={readOnly} problems={problems} t={t} />
          <Card title={t('tags')}>
            <TagsInput value={draft.tags} onChange={(tags) => patch({ tags })} placeholder={t('addTag')} disabled={readOnly} />
          </Card>
          <Card title={t('notes')}>
            <TextArea value={draft.note} onChange={(e) => patch({ note: e.target.value })} placeholder={t('notesPh')} hint={t('notesHint')} rows={3} disabled={readOnly} />
          </Card>
        </div>
      </div>

      {!readOnly && <SaveBar dirty={dirty} onSave={save} onDiscard={() => { setDraft(base); setShowErrors([]); }} />}
    </div>
  );
}

function Banner({ icon, children, tone = 'neutral' }: { icon: ReactNode; children: ReactNode; tone?: 'neutral' | 'critical' }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-3 text-[13.5px]', tone === 'critical' ? 'border-[#F4C7BF] bg-[#FDF1EF] text-[#8A1B0A]' : 'border-line bg-white text-ink-soft')}>
      <span className="shrink-0">{icon}</span>
      {children}
    </div>
  );
}

/* ================================================================== */
/* Products                                                            */
/* ================================================================== */
function ProductsCard({ draft, setDraft, totals, readOnly, error, t }: { draft: DraftOrder; setDraft: (fn: (d: DraftOrder) => DraftOrder) => void; totals: ReturnType<typeof draftTotals>; readOnly: boolean; error: boolean; t: Dict }) {
  const lang = useLang('admin');
  const l = useL('admin');
  const products = useDb((s) => s.products);

  const setItems = (fn: (items: CartItem[]) => CartItem[]) => setDraft((d) => ({ ...d, items: normalizeItems(fn(d.items)) }));
  const add = (p: Product) => setItems((items) => [...items, { key: '', productId: p.id, qty: 1, options: defaultOptions(p), installation: false }]);
  const setCustom = (fn: (c: DraftOrder['customLines']) => DraftOrder['customLines']) => setDraft((d) => ({ ...d, customLines: fn(d.customLines) }));

  return (
    <Card title={t('products')} padded={false}>
      <div className="border-b border-line/70 px-4 py-3 sm:px-5">
        <ProductSearch onPick={add} disabled={readOnly} />
      </div>
      {draft.items.length === 0 && draft.customLines.length === 0 ? (
        <p className={cn('px-5 py-8 text-center text-[13.5px]', error ? 'font-medium text-[#B42318]' : 'text-muted')}>{t('noLines')}</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {draft.items.map((it, i) => {
            const p = products.find((x) => x.id === it.productId);
            const priced = totals.lines.find((x) => x.item.key === it.key);
            if (!p) return null;
            const gross = priced ? priced.lineTotal + priced.installationTotal : 0;
            const net = priced ? gross - priced.discount : 0;
            return (
              <li key={it.key} className="flex gap-3 px-4 py-3.5 sm:px-5">
                <Thumb src={p.images[0]} className="h-12 w-12 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug text-ink">{l(p.name)}</p>
                      <p className="text-[12.5px] text-muted">
                        {p.sku} · {priced ? `${money(priced.unitPrice, lang)} ${perUnit(p.unit, lang)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      {priced && priced.discount > 0 && <span className="block text-[12px] text-muted line-through">{money(gross, lang)}</span>}
                      <span className="block font-semibold text-ink">{money(net, lang)}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Stepper value={it.qty} min={1} onChange={(n) => setItems((items) => items.map((x, k) => (k === i ? { ...x, qty: n } : x)))} ariaLabel={t('qty')} disabled={readOnly} />
                    {p.unit === 'm2' && p.packSize ? <span className="text-[12px] text-muted">{t('packsArea', { packs: it.qty, area: num(it.qty * p.packSize, lang) })}</span> : null}
                    {p.options.map((o) => (
                      <SelectInput
                        key={o.id}
                        aria-label={l(o.name)}
                        value={it.options[o.id] ?? ''}
                        disabled={readOnly}
                        onChange={(e) => setItems((items) => items.map((x, k) => (k === i ? { ...x, options: { ...x.options, [o.id]: e.target.value } } : x)))}
                        wrapClassName="min-w-0"
                        className="h-8 max-w-[220px] text-[12.5px]"
                      >
                        {o.values.map((v) => (
                          <option key={v.id} value={v.id}>
                            {l(o.name)}: {l(v.label)}
                            {v.priceDelta ? ` (+${money(v.priceDelta, lang)})` : ''}
                          </option>
                        ))}
                      </SelectInput>
                    ))}
                    {p.installation?.available && (
                      <label className={cn('inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line px-2.5 text-[12.5px] text-ink-soft', it.installation && 'border-ink/40 text-ink', readOnly && 'cursor-not-allowed opacity-60')}>
                        <Check checked={it.installation} disabled={readOnly} onChange={(v) => setItems((items) => items.map((x, k) => (k === i ? { ...x, installation: v } : x)))} label={t('installation', { price: '' })} />
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('installation', { price: `${money(p.installation.price, lang)} ${perUnit(p.unit, lang)}` })}
                      </label>
                    )}
                    {priced?.allocations.map((a) => (
                      <AllocationChip key={a.discountId} id={a.discountId} amount={a.amount} applied={totals.applied} />
                    ))}
                    {!readOnly && (
                      <button type="button" onClick={() => setItems((items) => items.filter((_, k) => k !== i))} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-muted hover:bg-ink/[0.05] hover:text-ink">
                        <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('remove')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
          {draft.customLines.map((c, i) => (
            <li key={`c${i}`} className="flex gap-3 px-4 py-3.5 sm:px-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-dashed border-line text-muted">
                <Plus className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <TextInput
                    aria-label={t('customTitle')}
                    value={c.title}
                    disabled={readOnly}
                    placeholder={t('customPh')}
                    onChange={(e) => setCustom((list) => list.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))}
                    wrapClassName="min-w-0 flex-1"
                  />
                  <span className="shrink-0 pt-2 text-right font-semibold tabular-nums text-ink">{money(c.price * c.qty, lang)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Stepper value={c.qty} min={1} onChange={(n) => setCustom((list) => list.map((x, k) => (k === i ? { ...x, qty: n } : x)))} ariaLabel={t('qty')} disabled={readOnly} />
                  <span className="text-[12.5px] text-muted">×</span>
                  <NumberInput value={c.price} min={0} onChange={(v) => setCustom((list) => list.map((x, k) => (k === i ? { ...x, price: v } : x)))} suffix="€" ariaLabel={t('price')} className="w-[120px]" disabled={readOnly} />
                  <span className="text-[12px] text-muted">{t('custom')}</span>
                  {!readOnly && (
                    <button type="button" onClick={() => setCustom((list) => list.filter((_, k) => k !== i))} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-muted hover:bg-ink/[0.05] hover:text-ink">
                      <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('remove')}</span>
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!readOnly && (
        <div className="border-t border-line/70 px-4 py-2.5 sm:px-5">
          <button type="button" onClick={() => setCustom((list) => [...list, { title: '', price: 0, qty: 1 }])} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-ink hover:bg-ink/[0.05]">
            <Plus className="h-4 w-4" /> {t('addCustom')}
          </button>
        </div>
      )}
    </Card>
  );
}

function AllocationChip({ id, amount, applied }: { id: string; amount: number; applied: ReturnType<typeof draftTotals>['applied'] }) {
  const lang = useLang('admin');
  const discounts = useDb((s) => s.discounts);
  const a = applied.find((x) => x.id === id);
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md bg-canvas px-1.5 text-[12px] text-ink-soft">
      <Tag className="h-3 w-3" />
      {a?.code ?? discountName(id, a?.title ?? '', discounts, lang)} <span className="tabular-nums">−{money(amount, lang)}</span>
    </span>
  );
}

/* ================================================================== */
/* Payment: codes + summary                                            */
/* ================================================================== */
function PaymentCard({ draft, patch, totals, readOnly, t }: { draft: DraftOrder; patch: (p: Partial<DraftOrder>) => void; totals: ReturnType<typeof draftTotals>; readOnly: boolean; t: Dict }) {
  const to = useDict(od, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const settings = useDb((s) => s.settings);
  const discounts = useDb((s) => s.discounts);
  const [code, setCode] = useState('');
  const nameOf = (id: string) => discountName(id, discounts.find((d) => d.id === id)?.title ?? id, discounts, lang);

  const addCode = () => {
    const c = normalizeCode(code);
    if (!c) return;
    if (draft.discountCodes.map(normalizeCode).includes(c)) {
      toast.error(t('codeExists'));
      return;
    }
    patch({ discountCodes: [...draft.discountCodes, c] });
    setCode('');
  };

  const lineDiscounts = totals.applied.filter((a) => a.kind !== 'shipping');
  const ship = totals.applied.find((a) => a.kind === 'shipping');
  const autoHints = totals.rejected.filter((r) => r.auto && r.reason === 'minimum' && r.id);
  const methods = (['bank', 'cod', 'card'] as PaymentMethod[]).filter((m) => settings.payments[m] || draft.payment === m);

  return (
    <Card title={t('payment')}>
      {/* discount codes */}
      <div>
        <p className="mb-1 text-[12.5px] font-semibold text-ink-soft">{t('codes')}</p>
        {!readOnly && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addCode();
            }}
          >
            <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder={t('codePh')} leading={<Tag />} wrapClassName="min-w-0 flex-1" className="uppercase placeholder:normal-case" />
            <Button type="submit" variant="outline" size="sm" shape="rounded" disabled={!code.trim()}>
              {t('apply')}
            </Button>
          </form>
        )}
        {draft.discountCodes.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {draft.discountCodes.map((c) => {
              const nc = normalizeCode(c);
              const ok = totals.applied.find((a) => a.code === nc);
              const rej = totals.rejected.find((r) => r.code === nc);
              return (
                <li key={c} className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2 text-[13px]', ok ? 'border-line bg-white' : 'border-[#F4C7BF] bg-[#FDF1EF]')}>
                  <CodeChip className="mt-px">{nc}</CodeChip>
                  <span className="min-w-0 flex-1">
                    {ok ? (
                      <span className="text-ink">
                        <span className="font-semibold">{t('applied')}</span> · {nameOf(ok.id)} · <span className="tabular-nums">−{money(ok.amount, lang)}</span>
                      </span>
                    ) : (
                      <span className="text-[#8A1B0A]">{rej ? rejectText(rej, to, lang, nameOf) : to('rej_notfound')}</span>
                    )}
                  </span>
                  {!readOnly && (
                    <button type="button" aria-label={`× ${nc}`} onClick={() => patch({ discountCodes: draft.discountCodes.filter((x) => x !== c) })} className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted hover:bg-black/5 hover:text-ink">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* summary */}
      <dl className="mt-4 border-t border-line/70 pt-2">
        <SumRow label={t('subtotal')} value={money(totals.subtotal, lang)} />
        {totals.installationTotal > 0 && <SumRow label={tc('installation')} value={money(totals.installationTotal, lang)} />}
        {totals.customTotal > 0 && <SumRow label={t('customLines')} value={money(totals.customTotal, lang)} />}
        {lineDiscounts.map((d) => (
          <SumRow
            key={d.id}
            label={
              <span className="inline-flex flex-wrap items-center gap-1.5">
                {tc('discount')} · {nameOf(d.id)}
                {d.code && <CodeChip>{d.code}</CodeChip>}
              </span>
            }
            sub={`${to(`kind_${d.kind}`)} · ${d.code ? to('code') : to('auto')}`}
            value={`−${money(d.amount, lang)}`}
          />
        ))}
        <SumRow
          label={t('shippingRow')}
          sub={
            draft.delivery === 'pickup'
              ? t('pickupFree')
              : ship
                ? nameOf(ship.id)
                : totals.hasInstallation
                  ? t('freeInstall')
                  : totals.shippingEstimate
                    ? t('estimate')
                    : undefined
          }
          value={
            ship && totals.shippingBeforeDiscount > totals.shipping ? (
              <span>
                <span className="mr-1.5 text-muted line-through">{money(totals.shippingBeforeDiscount, lang)}</span>
                {totals.shipping > 0 ? money(totals.shipping, lang) : tc('free')}
              </span>
            ) : totals.shipping > 0 ? (
              money(totals.shipping, lang)
            ) : (
              tc('free')
            )
          }
        />
        {autoHints.map((r) => (
          <p key={r.id} className="py-0.5 text-[12px] text-muted">
            {t('autoHint', { name: nameOf(r.id!), reason: rejectText(r, to, lang, nameOf) })}
          </p>
        ))}
        <div className="my-1.5 border-t border-line/70" />
        <SumRow strong label={t('total')} sub={t('vat', { rate: settings.vatRate, amount: money(totals.grandVat, lang) })} value={<span className="text-[16px]">{money(totals.grandTotal, lang)}</span>} />
      </dl>

      <div className="mt-4 grid gap-3 border-t border-line/70 pt-4 sm:grid-cols-[220px_1fr] sm:items-end">
        <SelectInput label={t('method')} value={draft.payment ?? 'bank'} onChange={(e) => patch({ payment: e.target.value as PaymentMethod })} disabled={readOnly}>
          {methods.map((m) => (
            <option key={m} value={m}>
              {tc(`pay_${m}`)}
            </option>
          ))}
        </SelectInput>
        <p className="text-[12px] leading-snug text-muted">{t('engineNote')}</p>
      </div>
    </Card>
  );
}

/* ================================================================== */
/* Customer                                                            */
/* ================================================================== */
function CustomerCard({ draft, patch, patchCustomer, readOnly, problems, t }: { draft: DraftOrder; patch: (p: Partial<DraftOrder>) => void; patchCustomer: (p: Partial<DraftOrder['customer']>) => void; readOnly: boolean; problems: Problem[]; t: Dict }) {
  const orders = useDb((s) => s.orders);
  const known = useMemo(() => knownCustomers(orders), [orders]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const c = draft.customer;
  const err = (p: Problem) => (problems.includes(p) ? t('required') : undefined);

  const hits = useMemo(() => {
    const f = fold(q.trim());
    if (!f) return [];
    return known.filter((k) => fold(`${k.customer.firstName} ${k.customer.lastName} ${k.customer.email} ${k.customer.phone} ${k.customer.company ?? ''} ${k.customer.city}`).includes(f)).slice(0, 6);
  }, [q, known]);

  const pick = (k: KnownCustomer) => {
    const x = k.customer;
    patch({ customer: { firstName: x.firstName, lastName: x.lastName, email: x.email, phone: x.phone, city: x.city, address: x.address, ...(x.company ? { company: x.company } : {}), ...(x.pib ? { pib: x.pib } : {}) }, lang: k.lang });
    setQ('');
    setOpen(false);
  };

  return (
    <Card
      title={t('customer')}
      actions={
        !readOnly && draftCustomerName(draft) ? (
          <button type="button" onClick={() => patch({ customer: { firstName: '', lastName: '', email: '', phone: '', city: '', address: '' } })} className="text-[12.5px] font-semibold text-ink-soft hover:text-ink hover:underline">
            {t('clearCustomer')}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {!readOnly && (
          <div className="relative">
            <TextInput value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={t('findCustomer')} leading={<Search />} />
            {open && q.trim() && (
              <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]">
                {hits.length === 0 ? (
                  <p className="px-3 py-3 text-[12.5px] text-muted">{t('noMatch')}</p>
                ) : (
                  <ul className="py-1">
                    {hits.map((k) => (
                      <li key={k.key}>
                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(k)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-ink/[0.05]">
                          <UserRound className="h-4 w-4 shrink-0 text-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-ink">
                              {k.customer.firstName} {k.customer.lastName}
                            </span>
                            <span className="block truncate text-[12px] text-muted">{[k.customer.phone, k.customer.city].filter(Boolean).join(' · ')}</span>
                          </span>
                          <span className="shrink-0 text-[12px] text-muted">{t('ordersN', { n: k.orders })}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <TextInput label={t('firstName')} value={c.firstName ?? ''} onChange={(e) => patchCustomer({ firstName: e.target.value })} disabled={readOnly} error={err('name')} />
          <TextInput label={t('lastName')} value={c.lastName ?? ''} onChange={(e) => patchCustomer({ lastName: e.target.value })} disabled={readOnly} />
          <TextInput label={t('phone')} type="tel" value={c.phone ?? ''} onChange={(e) => patchCustomer({ phone: e.target.value })} disabled={readOnly} error={err('contact')} wrapClassName="col-span-2" />
          <TextInput label={t('email')} type="email" value={c.email ?? ''} onChange={(e) => patchCustomer({ email: e.target.value })} disabled={readOnly} error={err('email')} wrapClassName="col-span-2" />
          <TextInput label={t('company')} value={c.company ?? ''} onChange={(e) => patchCustomer({ company: e.target.value || undefined })} disabled={readOnly} />
          <TextInput label={t('pib')} value={c.pib ?? ''} onChange={(e) => patchCustomer({ pib: e.target.value || undefined })} disabled={readOnly} />
          <SelectInput label={t('customerLang')} value={draft.lang ?? 'me'} onChange={(e) => patch({ lang: e.target.value as Lang })} disabled={readOnly} wrapClassName="col-span-2">
            {LANGS.map((x) => (
              <option key={x.code} value={x.code}>
                {x.label}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>
    </Card>
  );
}

/* ================================================================== */
/* Delivery                                                            */
/* ================================================================== */
function DeliveryCard({ draft, patch, patchCustomer, readOnly, problems, t }: { draft: DraftOrder; patch: (p: Partial<DraftOrder>) => void; patchCustomer: (p: Partial<DraftOrder['customer']>) => void; readOnly: boolean; problems: Problem[]; t: Dict }) {
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const settings = useDb((s) => s.settings);
  const cities = useMemo(() => allCities(settings), [settings]);
  const zone = zoneForCity(settings, draft.customer.city);
  const err = (p: Problem) => (problems.includes(p) ? t('required') : undefined);
  const city = draft.customer.city ?? '';

  return (
    <Card title={t('delivery')}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-canvas p-1">
          {(['delivery', 'pickup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={readOnly}
              onClick={() => patch({ delivery: m })}
              className={cn('inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-semibold transition-colors', draft.delivery === m ? 'bg-white text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink')}
            >
              {m === 'delivery' ? <Truck className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
              <span className="truncate">{tc(`delivery_${m}`)}</span>
            </button>
          ))}
        </div>
        {draft.delivery === 'pickup' ? (
          <p className="text-[13px] text-ink-soft">{t('pickupAt', { addr: settings.pickupAddress })}</p>
        ) : (
          <>
            <SelectInput label={t('city')} value={cities.includes(city) ? city : ''} onChange={(e) => patchCustomer({ city: e.target.value })} disabled={readOnly} hint={zone ? t('zone', { zone: zone.name, fee: money(zone.fee, lang), days: zone.days }) : undefined}>
              <option value="">{t('chooseCity')}</option>
              {city && !cities.includes(city) && <option value={city}>{city}</option>}
              {cities.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </SelectInput>
            {err('city') && <p className="-mt-2 text-[12px] font-medium text-[#B42318]">{err('city')}</p>}
            <TextInput label={t('address')} value={draft.customer.address ?? ''} onChange={(e) => patchCustomer({ address: e.target.value })} disabled={readOnly} error={err('address')} />
          </>
        )}
      </div>
    </Card>
  );
}

/* ================================================================== */
/* Tags                                                                */
/* ================================================================== */
function TagsInput({ value, onChange, placeholder, disabled }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; disabled?: boolean }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim().toLowerCase();
    if (v && !value.includes(v)) onChange([...value, v]);
    setText('');
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {value.map((tg) => (
        <span key={tg} className="inline-flex h-6 items-center gap-1 rounded-md bg-[#EBEBEB] pl-2 pr-1 text-[12px] font-medium text-ink">
          {tg}
          {!disabled && (
            <button type="button" aria-label={`× ${tg}`} onClick={() => onChange(value.filter((x) => x !== tg))} className="grid h-4 w-4 place-items-center rounded hover:bg-black/10">
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder={placeholder}
            className="h-6 min-w-[150px] flex-1 rounded-md border border-dashed border-line bg-transparent px-2 text-[12px] outline-none focus:border-ink/40"
          />
      )}
    </div>
  );
}
