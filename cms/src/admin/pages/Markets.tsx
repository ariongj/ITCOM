// Tregjet — CMS proposal p.37 (Kanalet dhe tregjet): Online Store is the base channel; markets = countries/regions with
// status, currency, languages, domain, catalogue and shipping rules; default configuration + per-market overrides;
// fixed amounts in other currencies need a stored conversion + rounding policy.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Coins, Globe, Languages, Lock, Plus, Store, Trash2, Truck, Boxes, X } from 'lucide-react';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select } from '@/components/ui/Field';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { money } from '@/lib/format';
import type { Lang } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { COUNTRIES, CURRENCIES, ROUNDINGS, convert, marketX, moneyIn, type MarketX, type Rounding, type ShippingMode } from '@/admin/components/analytics/markets';
import { Callout, Segmented, StatusMark } from '@/admin/components/analytics/ui';

const T = defineDict({
  me: {
    all: 'Sva tržišta',
    desc: 'Države i regioni, status, valuta, jezici, domen, katalog i pravila dostave. Podrazumijevana konfiguracija + izmjene po tržištu.',
    add: 'Dodaj tržište',
    readOnly: 'Samo pregled',
    readOnlyText: 'Vaša uloga može da pregleda tržišta, ali ne i da ih mijenja.',
    channels: 'Kanali prodaje',
    channelsDesc: 'Online prodavnica je prvi kanal; dodatni kanali traže integraciju koja se može provjeriti i status sinhronizacije.',
    ch_online: 'Online prodavnica',
    ch_online_t: 'Tema, editor, stranice, slajdovi i baneri, SEO i domen. Kontrolisano objavljivanje.',
    ch_pos: 'POS',
    ch_pos_t: 'Mapiranje proizvoda, varijanti, cijena i zaliha — jedan izvor istine za stanje.',
    ch_social: 'Društvene mreže i marketplace',
    ch_social_t: 'Bez obećanja „svih kanala“ dok API nije specifikovan. Red čekanja, greške i ponovni pokušaj.',
    st_base: 'Osnovni kanal',
    st_need: 'Po potrebi',
    st_integration: 'Traži integraciju',
    open: 'Otvori',
    markets: 'Tržišta',
    active: 'Aktivno',
    draft: 'Nacrt',
    primary: 'Primarno',
    orders30: '{n} narudžbi · {sum} u 30 dana',
    noOrders: 'Još bez narudžbi',
    general: 'Opšte',
    name: 'Naziv tržišta',
    status: 'Status',
    activateNo: 'Aktivaciju odobrava uloga sa dozvolom za objavu',
    countries: 'Države i regioni',
    addCountry: 'Dodaj državu…',
    domain: 'Domen',
    domainHint: 'Primarni domen ili putanja za ovo tržište, npr. itcom.example/al ili itcom.example/lab.',
    currency: 'Valuta i cijene',
    currencyDesc: 'Cijene se čuvaju u EUR; tržište ih prikazuje u svojoj valuti po sačuvanom kursu.',
    currencyField: 'Valuta',
    rate: 'Kurs (1 EUR = ?)',
    rateHint: 'Sačuvani kurs — ne mijenja se sam od sebe.',
    rounding: 'Zaokruživanje',
    r_none: 'Bez zaokruživanja',
    'r_0.99': 'Na ,99',
    r_1: 'Na cijeli iznos',
    r_10: 'Na 10',
    r_100: 'Na 100',
    policyTitle: 'Politika konverzije i zaokruživanja',
    policy: 'Fiksni iznosi u drugoj valuti (npr. popust 10 € ili prag za besplatnu dostavu) preračunavaju se istim sačuvanim kursom i pravilom zaokruživanja — ili se unose posebno za tržište. Popusti se ograničavaju po publici/tržištu.',
    preview: 'Primjer cijena',
    col_product: 'Proizvod',
    col_base: 'Osnovna (EUR)',
    col_market: 'Na tržištu',
    languages: 'Jezici',
    languagesDesc: 'Jezici sajta za ovo tržište i podrazumijevani jezik.',
    defaultLang: 'Podrazumijevani jezik',
    lang_me: 'Srpski',
    lang_sq: 'Albanski',
    lang_en: 'Engleski',
    shipping: 'Dostava',
    shippingDesc: 'Pravila dostave za tržište; zone Kosova se uređuju u Konfiguraciji.',
    shipMode: 'Način',
    ship_zones: 'Zone dostave (Kosovo)',
    ship_flat: 'Fiksna cijena',
    ship_none: 'Bez dostave — samo preuzimanje',
    fee: 'Cijena dostave',
    days: 'Rok (dana)',
    zone: '{name} · {n} gradova · {days} dana',
    freeFrom: 'Besplatna dostava od {sum} (automatski popust)',
    editZones: 'Uredi zone',
    catalog: 'Katalog i popusti',
    catalogField: 'Katalog na tržištu',
    cat_all: 'Cijeli katalog',
    cat_stock: 'Samo proizvodi na stanju (bez sočiva po receptu)',
    discountsNote: 'Aktivni popusti važe za tržišta koja su im dodijeljena kroz publiku. U demo verziji svi popusti važe za Kosovo.',
    saved: 'Tržište je sačuvano',
    added: 'Dodato je novo tržište (nacrt)',
    newMarket: 'Novo tržište',
    deleteTitle: 'Obrisati tržište „{name}“?',
    deleteText: 'Briše se samo konfiguracija tržišta; narudžbe ostaju.',
    deleted: 'Tržište je obrisano',
    switchTitle: 'Odbaciti izmjene?',
    switchText: 'Izmjene na ovom tržištu nisu sačuvane.',
    discardYes: 'Odbaci izmjene',
    needLang: 'Izaberite bar jedan jezik',
    needCountry: 'Dodajte bar jednu državu',
    timezone: 'Vremenska zona {tz}',
    baseCurrency: 'Osnovna valuta EUR',
  },
  sq: {
    all: 'Të gjitha tregjet',
    desc: 'Shtete/rajone, status, valutë, gjuhë, domen, katalog dhe rregulla dërgese. Konfigurim default dhe overrides për çdo treg.',
    add: 'Shto treg',
    readOnly: 'Vetëm shikim',
    readOnlyText: 'Roli juaj mund t’i shikojë tregjet, por jo t’i ndryshojë.',
    channels: 'Kanale shitjeje',
    channelsDesc: 'Online Store është kanali i parë; kanalet shtesë duhet të kenë integrim të verifikueshëm dhe status sinkronizimi.',
    ch_online: 'Online Store',
    ch_online_t: 'Tema, editori, faqet, slideshow/bannerë, SEO dhe domeni. Publikim i kontrolluar.',
    ch_pos: 'POS',
    ch_pos_t: 'Mapim produktesh, variante, çmime dhe stok — një burim i qartë për stokun.',
    ch_social: 'Rrjete sociale dhe marketplace',
    ch_social_t: 'Jo premtim për integrim „me çdo kanal“ pa specifikim të API-ve. Queue, gabime dhe riprovim.',
    st_base: 'Kanali bazë',
    st_need: 'Sipas nevojës',
    st_integration: 'Kërkon integrim',
    open: 'Hap',
    markets: 'Tregjet',
    active: 'Aktiv',
    draft: 'Draft',
    primary: 'Primar',
    orders30: '{n} porosi · {sum} në 30 ditë',
    noOrders: 'Ende pa porosi',
    general: 'Të përgjithshme',
    name: 'Emri i tregut',
    status: 'Statusi',
    activateNo: 'Aktivizimin e miraton një rol me leje publikimi',
    countries: 'Shtete dhe rajone',
    addCountry: 'Shto shtet…',
    domain: 'Domeni',
    domainHint: 'Domeni primar ose shtegu për këtë treg, p.sh. itcom.example/al ose itcom.example/lab.',
    currency: 'Valuta dhe çmimet',
    currencyDesc: 'Çmimet ruhen në EUR; tregu i shfaq në valutën e vet sipas kursit të ruajtur.',
    currencyField: 'Valuta',
    rate: 'Kursi (1 EUR = ?)',
    rateHint: 'Kurs i ruajtur — nuk ndryshon vetvetiu.',
    rounding: 'Rrumbullakimi',
    r_none: 'Pa rrumbullakim',
    'r_0.99': 'Në ,99',
    r_1: 'Në numër të plotë',
    r_10: 'Në 10',
    r_100: 'Në 100',
    policyTitle: 'Politika e konvertimit dhe rrumbullakimit',
    policy: 'Shumat fikse në valutë tjetër (p.sh. zbritje 10 € ose pragu i dërgesës falas) konvertohen me të njëjtin kurs të ruajtur dhe rregull rrumbullakimi — ose vendosen veçmas për tregun. Zbritjet kufizohen sipas audiencës/tregut.',
    preview: 'Shembull çmimesh',
    col_product: 'Produkti',
    col_base: 'Bazë (EUR)',
    col_market: 'Në treg',
    languages: 'Gjuhët',
    languagesDesc: 'Gjuhët e faqes për këtë treg dhe gjuha default.',
    defaultLang: 'Gjuha default',
    lang_me: 'Serbisht',
    lang_sq: 'Shqip',
    lang_en: 'Anglisht',
    shipping: 'Dërgesa',
    shippingDesc: 'Rregullat e dërgesës për tregun; zonat e Kosovës ndryshohen te Konfigurimet.',
    shipMode: 'Mënyra',
    ship_zones: 'Zonat e dërgesës (Kosova)',
    ship_flat: 'Tarifë fikse',
    ship_none: 'Pa dërgesë — vetëm marrje',
    fee: 'Tarifa e dërgesës',
    days: 'Afati (ditë)',
    zone: '{name} · {n} qytete · {days} ditë',
    freeFrom: 'Dërgesë falas nga {sum} (zbritje automatike)',
    editZones: 'Ndrysho zonat',
    catalog: 'Katalogu dhe zbritjet',
    catalogField: 'Katalogu në treg',
    cat_all: 'I gjithë katalogu',
    cat_stock: 'Vetëm produktet në stok (pa lente me recetë)',
    discountsNote: 'Zbritjet aktive vlejnë për tregjet që u caktohen përmes audiencës. Në demo të gjitha zbritjet vlejnë për Kosovën.',
    saved: 'Tregu u ruajt',
    added: 'U shtua një treg i ri (draft)',
    newMarket: 'Treg i ri',
    deleteTitle: 'Të fshihet tregu „{name}“?',
    deleteText: 'Fshihet vetëm konfigurimi i tregut; porositë mbeten.',
    deleted: 'Tregu u fshi',
    switchTitle: 'Të hidhen poshtë ndryshimet?',
    switchText: 'Ndryshimet në këtë treg nuk janë ruajtur.',
    discardYes: 'Hidh poshtë',
    needLang: 'Zgjidhni të paktën një gjuhë',
    needCountry: 'Shtoni të paktën një shtet',
    timezone: 'Zona kohore {tz}',
    baseCurrency: 'Valuta bazë EUR',
  },
  en: {
    all: 'All markets',
    desc: 'Countries/regions, status, currency, languages, domain, catalogue and shipping rules. Default configuration plus per-market overrides.',
    add: 'Add market',
    readOnly: 'View only',
    readOnlyText: 'Your role can view markets but not change them.',
    channels: 'Sales channels',
    channelsDesc: 'Online Store is the first channel; extra channels need a verifiable integration and a sync status.',
    ch_online: 'Online Store',
    ch_online_t: 'Theme, editor, pages, slideshow/banners, SEO and domain. Controlled publishing.',
    ch_pos: 'POS',
    ch_pos_t: 'Product, variant, price and stock mapping — one clear source for stock.',
    ch_social: 'Social and marketplaces',
    ch_social_t: 'No promise of “every channel” without an API specification. Queue, errors and retries.',
    st_base: 'Base channel',
    st_need: 'When needed',
    st_integration: 'Needs integration',
    open: 'Open',
    markets: 'Markets',
    active: 'Active',
    draft: 'Draft',
    primary: 'Primary',
    orders30: '{n} orders · {sum} in 30 days',
    noOrders: 'No orders yet',
    general: 'General',
    name: 'Market name',
    status: 'Status',
    activateNo: 'Activation is approved by a role with publish permission',
    countries: 'Countries and regions',
    addCountry: 'Add country…',
    domain: 'Domain',
    domainHint: 'Primary domain or path for this market, e.g. itcom.example/al or itcom.example/lab.',
    currency: 'Currency and prices',
    currencyDesc: 'Prices are stored in EUR; the market shows them in its own currency at the stored rate.',
    currencyField: 'Currency',
    rate: 'Rate (1 EUR = ?)',
    rateHint: 'Stored rate — it never changes on its own.',
    rounding: 'Rounding',
    r_none: 'No rounding',
    'r_0.99': 'To .99',
    r_1: 'To whole amounts',
    r_10: 'To 10',
    r_100: 'To 100',
    policyTitle: 'Conversion and rounding policy',
    policy: 'Fixed amounts in another currency (e.g. a €10 discount or the free-shipping threshold) are converted with the same stored rate and rounding rule — or set separately for the market. Discounts are limited by audience/market.',
    preview: 'Price examples',
    col_product: 'Product',
    col_base: 'Base (EUR)',
    col_market: 'In market',
    languages: 'Languages',
    languagesDesc: 'Site languages for this market and the default language.',
    defaultLang: 'Default language',
    lang_me: 'Serbian',
    lang_sq: 'Albanian',
    lang_en: 'English',
    shipping: 'Shipping',
    shippingDesc: 'Shipping rules for the market; Kosovo zones are edited in Settings.',
    shipMode: 'Method',
    ship_zones: 'Shipping zones (Kosovo)',
    ship_flat: 'Flat rate',
    ship_none: 'No delivery — pickup only',
    fee: 'Shipping fee',
    days: 'Lead time (days)',
    zone: '{name} · {n} cities · {days} days',
    freeFrom: 'Free shipping from {sum} (automatic discount)',
    editZones: 'Edit zones',
    catalog: 'Catalogue and discounts',
    catalogField: 'Catalogue in market',
    cat_all: 'Whole catalogue',
    cat_stock: 'In-stock products only (no prescription lenses)',
    discountsNote: 'Active discounts apply to the markets assigned through their audience. In the demo every discount applies to Kosovo.',
    saved: 'Market saved',
    added: 'A new market was added (draft)',
    newMarket: 'New market',
    deleteTitle: 'Delete the market “{name}”?',
    deleteText: 'Only the market configuration is deleted; orders stay.',
    deleted: 'Market deleted',
    switchTitle: 'Discard changes?',
    switchText: 'Changes to this market are not saved.',
    discardYes: 'Discard',
    needLang: 'Pick at least one language',
    needCountry: 'Add at least one country',
    timezone: 'Time zone {tz}',
    baseCurrency: 'Base currency EUR',
  },
});

type Key = keyof (typeof T)['me'];
const LANGS: Lang[] = ['sq', 'en', 'me'];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export default function Markets() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const can = useCan();
  const canEdit = can('markets', 'edit');
  const canPublish = can('markets', 'publish');
  const canDelete = can('markets', 'delete');

  const settings = useDb((s) => s.settings);
  const updateSettings = useDb((s) => s.updateSettings);
  const orders = useDb((s) => s.orders);
  const products = useDb((s) => s.products);
  const discounts = useDb((s) => s.discounts);

  const markets = useMemo(() => settings.markets.map(marketX), [settings.markets]);
  const [selId, setSelId] = useState<string | undefined>(() => markets[0]?.id);
  const selected = markets.find((m) => m.id === selId) ?? markets[0];
  const [draft, setDraft] = useState<MarketX | null>(null);
  const current = draft && draft.id === selected?.id ? draft : selected;
  const dirty = !!draft && !!selected && draft.id === selected.id && !same(draft, selected);

  const patch = (p: Partial<MarketX>) => current && setDraft({ ...current, ...p });

  // orders per market: every recorded order ships inside Kosovo
  const stats = useMemo(() => {
    const from = Date.now() - 30 * 86400000;
    const live = orders.filter((o) => o.status !== 'cancelled' && new Date(o.createdAt).getTime() >= from);
    return { n: live.length, sum: live.reduce((s, o) => s + o.total, 0) };
  }, [orders]);
  const marketOrders = (m: MarketX) => (m.countries.includes('XK') && m.status === 'active' ? stats : { n: 0, sum: 0 });

  const freeRule = useMemo(() => discounts.find((d) => d.kind === 'shipping' && d.method === 'auto' && d.status === 'active' && d.minimum.type === 'amount'), [discounts]);
  const samples = useMemo(() => {
    const pick = (id: string) => products.find((p) => p.id === id && p.status === 'active');
    const list = [pick('p-prism-m2'), pick('p-vortex-x1'), pick('p-lens-progressive')].filter((p): p is NonNullable<typeof p> => !!p);
    return list.length ? list : products.filter((p) => p.status === 'active').slice(0, 3);
  }, [products]);

  const select = async (id: string) => {
    if (id === selected?.id) return;
    if (dirty && !(await confirmDialog({ title: t('switchTitle'), text: t('switchText'), confirmLabel: t('discardYes'), danger: false }))) return;
    setDraft(null);
    setSelId(id);
  };

  const save = () => {
    if (!draft) return;
    if (!draft.languages.length) return void toast.error(t('needLang'));
    if (!draft.countries.length) return void toast.error(t('needCountry'));
    const clean: MarketX = { ...draft, defaultLang: draft.languages.includes(draft.defaultLang ?? 'sq') ? draft.defaultLang : draft.languages[0] };
    updateSettings({ markets: settings.markets.map((m) => (m.id === clean.id ? clean : m)) });
    setDraft(null);
    toast.success(t('saved'));
  };

  const add = () => {
    const m: MarketX = { id: uid('mk'), name: { me: 'Novo tržište', sq: 'Treg i ri', en: 'New market' }, countries: [], currency: 'EUR', languages: ['sq', 'en'], status: 'draft', domain: '', defaultLang: 'sq', fxRate: 1, rounding: 'none', shipping: { mode: 'flat', fee: 0, days: '' }, catalog: 'stock' };
    updateSettings({ markets: [...settings.markets, m] });
    setDraft(null);
    setSelId(m.id);
    toast.success(t('added'));
  };

  const remove = async () => {
    if (!current) return;
    if (!(await confirmDialog({ title: t('deleteTitle', { name: l(current.name) }), text: t('deleteText') }))) return;
    updateSettings({ markets: settings.markets.filter((m) => m.id !== current.id) });
    setDraft(null);
    setSelId(markets.find((m) => m.id !== current.id)?.id);
    toast.success(t('deleted'));
  };

  const activeCount = markets.filter((m) => m.status === 'active').length;
  const primaryId = markets.find((m) => m.status === 'active')?.id;

  return (
    <div className="space-y-5 pb-20">
      <PageHeader
        breadcrumbs={[ta('nav_markets'), t('all')]}
        title={ta('nav_markets')}
        description={t('desc')}
        actions={
          canEdit ? (
            <Button size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />} onClick={add}>
              {t('add')}
            </Button>
          ) : (
            <StatusMark state="off" className="rounded-lg border border-line bg-white px-3 py-2">
              <Lock className="h-3.5 w-3.5" /> {t('readOnly')}
            </StatusMark>
          )
        }
      />

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
        <StatusMark state="on">
          {activeCount} {t('active').toLowerCase()}
        </StatusMark>
        <StatusMark state="off">
          {markets.length - activeCount} {t('draft').toLowerCase()}
        </StatusMark>
        <span>{t('baseCurrency')}</span>
        <span>{t('timezone', { tz: settings.timezone })}</span>
      </div>

      {/* Channels (p.37 col. 01–02) */}
      <Card title={t('channels')} description={t('channelsDesc')} padded={false}>
        <div className="grid divide-y divide-line/70 md:grid-cols-3 md:divide-x md:divide-y-0">
          <Channel icon={Store} title={t('ch_online')} text={t('ch_online_t')} status={<StatusMark state="on">{t('st_base')}</StatusMark>} action={can('onlineStore', 'view') ? <Link to="/admin/prodavnica" className="text-[12.5px] font-semibold text-ink underline-offset-2 hover:underline">{t('open')} →</Link> : null} />
          <Channel icon={Boxes} title={t('ch_pos')} text={t('ch_pos_t')} status={<StatusMark state="off">{t('st_need')}</StatusMark>} />
          <Channel icon={Globe} title={t('ch_social')} text={t('ch_social_t')} status={<StatusMark state="off">{t('st_integration')}</StatusMark>} />
        </div>
      </Card>

      {!canEdit && (
        <Callout icon={Lock} title={t('readOnly')}>
          {t('readOnlyText')}
        </Callout>
      )}

      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[320px_1fr]">
        {/* Market list */}
        <Card title={t('markets')} padded={false} className="lg:sticky lg:top-[72px]">
          <ul className="p-2">
            {markets.map((m) => {
              const on = m.id === selected?.id;
              const o = marketOrders(m);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => select(m.id)}
                    aria-pressed={on}
                    className={cn('w-full rounded-lg px-3 py-3 text-left transition-colors', on ? 'bg-canvas ring-1 ring-line' : 'hover:bg-canvas/70')}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[14px] font-semibold text-ink">{l(m.name)}</span>
                        {m.id === primaryId && <span className="rounded border border-line bg-white px-1.5 py-px text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">{t('primary')}</span>}
                      </span>
                      <StatusMark state={m.status === 'active' ? 'on' : 'off'}>{t(m.status === 'active' ? 'active' : 'draft')}</StatusMark>
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      {m.countries.map((c) => (
                        <span key={c} className="rounded bg-white px-1.5 py-px font-mono text-[11px] font-semibold text-ink-soft ring-1 ring-line">
                          {c}
                        </span>
                      ))}
                      <span className="ml-1 text-[12px] text-muted">
                        {m.currency} · {m.languages.map((x) => (x === 'me' ? 'SR' : x.toUpperCase())).join(' / ')}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-[12px] text-muted">
                      {m.domain || '—'} · {o.n ? t('orders30', { n: o.n, sum: money(o.sum, lang, { decimals: false }) }) : t('noOrders')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Editor */}
        {current && (
          <fieldset disabled={!canEdit} className="min-w-0 space-y-4 sm:space-y-5">
            <Card
              title={
                <span className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-ink-soft" />
                  {t('general')}
                </span>
              }
              actions={
                canDelete && current.id !== primaryId ? (
                  <Button size="xs" variant="ghost" shape="rounded" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={remove} className="text-red-700 hover:bg-red-50">
                    {ta('delete')}
                  </Button>
                ) : undefined
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <L10nInput label={t('name')} value={current.name} onChange={(v) => patch({ name: v })} />
                </div>
                <div>
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t('status')}</span>
                  <span title={!canPublish && current.status === 'draft' ? t('activateNo') : undefined} className="inline-block">
                    <Segmented
                      label={t('status')}
                      value={current.status}
                      onChange={(v) => (v === 'active' && !canPublish ? toast.error(t('activateNo')) : patch({ status: v }))}
                      options={[
                        { id: 'active', label: <StatusMark state="on">{t('active')}</StatusMark> },
                        { id: 'draft', label: <StatusMark state="off">{t('draft')}</StatusMark> },
                      ]}
                    />
                  </span>
                </div>
                <Input label={t('domain')} value={current.domain ?? ''} onChange={(e) => patch({ domain: e.target.value.trim() })} hint={t('domainHint')} placeholder="itcom.example" />
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t('countries')}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {current.countries.map((c) => (
                      <span key={c} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white pl-2.5 pr-1 text-[13px] font-semibold text-ink">
                        <span className="font-mono text-[11.5px] text-muted">{c}</span>
                        {COUNTRIES[c] ? l(COUNTRIES[c]) : c}
                        {canEdit && (
                          <button type="button" onClick={() => patch({ countries: current.countries.filter((x) => x !== c) })} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink" aria-label={ta('remove')}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                    {canEdit && Object.keys(COUNTRIES).some((c) => !current.countries.includes(c)) && (
                      <select
                        value=""
                        onChange={(e) => e.target.value && patch({ countries: [...current.countries, e.target.value] })}
                        className="h-9 cursor-pointer rounded-lg border border-dashed border-ink/25 bg-white px-3 text-[13px] font-semibold text-ink-soft outline-none hover:border-ink/40"
                        aria-label={t('addCountry')}
                      >
                        <option value="">{t('addCountry')}</option>
                        {Object.keys(COUNTRIES)
                          .filter((c) => !current.countries.includes(c))
                          .map((c) => (
                            <option key={c} value={c}>
                              {c} — {l(COUNTRIES[c])}
                            </option>
                          ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title={
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-ink-soft" />
                  {t('currency')}
                </span>
              }
              description={t('currencyDesc')}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Select label={t('currencyField')} value={current.currency} onChange={(e) => patch({ currency: e.target.value, fxRate: e.target.value === 'EUR' ? 1 : current.fxRate && current.fxRate !== 1 ? current.fxRate : 100 })}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                <Input
                  label={t('rate')}
                  type="number"
                  min={0}
                  step="0.01"
                  value={current.currency === 'EUR' ? 1 : current.fxRate ?? 1}
                  disabled={current.currency === 'EUR'}
                  onChange={(e) => patch({ fxRate: Math.max(0, Number(e.target.value) || 0) })}
                  trailing={current.currency}
                  hint={t('rateHint')}
                />
                <Select label={t('rounding')} value={current.rounding ?? 'none'} onChange={(e) => patch({ rounding: e.target.value as Rounding })}>
                  {ROUNDINGS.map((r) => (
                    <option key={r} value={r}>
                      {t(`r_${r}` as Key)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-line/80">
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-canvas/70 text-[12px] font-semibold text-muted">
                    <tr>
                      <th className="px-3 py-2">{t('preview')}</th>
                      <th className="px-3 py-2 text-right">{t('col_base')}</th>
                      <th className="px-3 py-2 text-right">{t('col_market')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((p) => {
                      const eur = p.salePrice ?? p.price;
                      return (
                        <tr key={p.id} className="border-t border-line/70">
                          <td className="max-w-0 truncate px-3 py-2 text-ink-soft">{l(p.name)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-ink-soft">{money(eur, lang)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ink">{moneyIn(convert(eur, current), current.currency, lang)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 rounded-lg bg-canvas/70 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
                <div className="font-semibold text-ink">{t('policyTitle')}</div>
                {t('policy')}
              </div>
            </Card>

            <div className="grid gap-4 sm:gap-5 xl:grid-cols-2">
              <Card
                title={
                  <span className="flex items-center gap-2">
                    <Languages className="h-4 w-4 text-ink-soft" />
                    {t('languages')}
                  </span>
                }
                description={t('languagesDesc')}
              >
                <div className="space-y-3">
                  {LANGS.map((x) => (
                    <Checkbox
                      key={x}
                      checked={current.languages.includes(x)}
                      disabled={!canEdit}
                      onChange={(v) => patch({ languages: v ? LANGS.filter((y) => y === x || current.languages.includes(y)) : current.languages.filter((y) => y !== x) })}
                      label={
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[11.5px] text-muted">{x === 'me' ? 'SR' : x.toUpperCase()}</span>
                          {t(`lang_${x}` as Key)}
                        </span>
                      }
                    />
                  ))}
                  <Select label={t('defaultLang')} value={current.defaultLang} onChange={(e) => patch({ defaultLang: e.target.value as Lang })} wrapClassName="pt-1">
                    {current.languages.map((x) => (
                      <option key={x} value={x}>
                        {t(`lang_${x}` as Key)}
                      </option>
                    ))}
                  </Select>
                </div>
              </Card>

              <Card
                title={
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-ink-soft" />
                    {t('shipping')}
                  </span>
                }
                description={t('shippingDesc')}
              >
                <div className="space-y-4">
                  <Select label={t('shipMode')} value={current.shipping?.mode ?? 'flat'} onChange={(e) => patch({ shipping: { ...current.shipping, mode: e.target.value as ShippingMode } })}>
                    {(['zones', 'flat', 'none'] as const).map((x) => (
                      <option key={x} value={x} disabled={x === 'zones' && !current.countries.includes('XK')}>
                        {t(`ship_${x}` as Key)}
                      </option>
                    ))}
                  </Select>
                  {current.shipping?.mode === 'zones' && (
                    <ul className="space-y-1.5 text-[12.5px] text-ink-soft">
                      {settings.shippingZones.map((z) => (
                        <li key={z.id} className="flex items-baseline justify-between gap-3 rounded-lg bg-canvas/70 px-3 py-2">
                          <span className="min-w-0 truncate">{t('zone', { name: z.name, n: z.cities.length, days: z.days })}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-ink">{money(z.fee, lang)}</span>
                        </li>
                      ))}
                      {freeRule && <li className="px-1 pt-1 text-muted">{t('freeFrom', { sum: money(freeRule.minimum.value, lang, { decimals: false }) })}</li>}
                      {can('settings', 'view') && (
                        <li className="px-1">
                          <Link to="/admin/konfiguracija" className="font-semibold text-ink underline-offset-2 hover:underline">
                            {t('editZones')} →
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                  {current.shipping?.mode === 'flat' && (
                    <div className="grid grid-cols-2 gap-3">
                      <Input label={t('fee')} type="number" min={0} value={current.shipping.fee ?? 0} onChange={(e) => patch({ shipping: { ...current.shipping!, fee: Math.max(0, Number(e.target.value) || 0) } })} trailing={current.currency} />
                      <Input label={t('days')} value={current.shipping.days ?? ''} onChange={(e) => patch({ shipping: { ...current.shipping!, days: e.target.value } })} placeholder="3–5" />
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Card
              title={
                <span className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-ink-soft" />
                  {t('catalog')}
                </span>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                <Select label={t('catalogField')} value={current.catalog ?? 'all'} onChange={(e) => patch({ catalog: e.target.value as MarketX['catalog'] })}>
                  <option value="all">{t('cat_all')}</option>
                  <option value="stock">{t('cat_stock')}</option>
                </Select>
                <p className="text-[12.5px] leading-relaxed text-muted sm:pt-7">{t('discountsNote')}</p>
              </div>
            </Card>
          </fieldset>
        )}
      </div>

      <SaveBar dirty={dirty} onSave={save} onDiscard={() => setDraft(null)} />
    </div>
  );
}

function Channel({ icon: Icon, title, text, status, action }: { icon: typeof Store; title: string; text: string; status: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <Icon className="h-4 w-4 text-ink-soft" />
          {title}
        </span>
        {status}
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">{text}</p>
      {action}
    </div>
  );
}

