import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUpDown, ChevronDown, ChevronRight, Download, GitMerge, Info, MapPin, ShieldCheck, Tag, Upload, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/misc';
import { Card, FilterPills, PageHeader, SearchInput, Table, Td, Th, Tr } from '@/admin/components/kit';
import { CustomerDrawer } from '@/admin/components/crm/CustomerDrawer';
import { matches, pluralForm } from '@/admin/components/crm/shared';
import { cx } from '@/admin/components/customers/i18n';
import { exportCsv, isSubscribed, resolveKey, type CustomerRecord, type DuplicatePair } from '@/admin/components/customers/model';
import { Avatar, ConsentSummary, Gate, KpiStrip, LangChip, SelectBox, TagList } from '@/admin/components/customers/parts';
import { useCustomers, useSegmentCounts } from '@/admin/components/customers/useCustomers';
import { useExplain } from '@/admin/components/customers/explain';
import { MergeModal } from '@/admin/components/customers/MergeModal';
import { ImportModal } from '@/admin/components/customers/ImportModal';
import { AddCustomerModal } from '@/admin/components/customers/AddCustomerModal';
import { adm } from '@/admin/i18n';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { date, money, num, timeAgo } from '@/lib/format';
import { download } from '@/lib/utils';

const T = defineDict({
  me: {
    subtitle: 'Svi klijenti — iz web narudžbi, optike, termina i uvoza. Profil, istorija i saglasnosti na jednom mestu.',
    import: 'Uvezi',
    export: 'Izvezi',
    add: 'Dodaj kupca',
    exported: 'Izvezeno: {n}',
    exportedText: 'CSV bez privatnih bilješki.',
    kpiCustomers: 'Kupci',
    kpiCustomersSub: '+{n} novih za 30 dana',
    kpiRepeat: 'Stalni kupci',
    kpiRepeatSub: '{pct}% kupaca naručilo 2+ puta',
    kpiLtv: 'Prosječno po kupcu',
    kpiLtvSub: 'Prosječna narudžba {v}',
    kpiConsent: 'Saglasnost za e-mail',
    kpiConsentSub: '{n} kupaca prima kampanje',
    dup_one: '{n} mogući duplikat',
    dup_few: '{n} moguća duplikata',
    dup_many: '{n} mogućih duplikata',
    dupText: 'Isti telefon ili isto ime u istom gradu. Pregledajte prije spajanja — narudžbe ostaju netaknute.',
    dupReview: 'Pregledaj i spoji',
    manageSegments: 'Segmenti',
    searchPh: 'Ime, e-mail, telefon, grad ili oznaka…',
    mk_label: 'Marketing saglasnost',
    mk_all: 'Svi kanali',
    mk_email: 'Prijavljeni na e-mail',
    mk_sms: 'Prijavljeni na SMS',
    mk_any: 'Prijavljeni bilo gdje',
    mk_none: 'Bez saglasnosti',
    tag_label: 'Oznaka',
    tag_all: 'Sve oznake',
    sort_label: 'Sortiranje',
    sort_spent: 'Najveća potrošnja',
    sort_orders: 'Najviše narudžbi',
    sort_recent: 'Posljednja narudžba',
    sort_new: 'Najnoviji kupci',
    sort_name: 'Ime A–Ž',
    col_customer: 'Kupac',
    col_contact: 'Kontakt',
    col_city: 'Grad',
    col_lang: 'Jezik',
    col_orders: 'Narudžbe',
    col_spent: 'Potrošeno',
    col_last: 'Posljednja narudžba',
    col_tags: 'Oznake',
    col_marketing: 'Marketing',
    segInfo: '{n} kupaca u segmentu.',
    editSegment: 'Uredi segment',
    showing: 'Prikazano {n} od {total}',
    showMore: 'Prikaži još',
    emptyTitle: 'Nema kupaca za ove filtere',
    emptyText: 'Promijenite pretragu, segment ili filter saglasnosti.',
    clearFilters: 'Očisti filtere',
    noneTitle: 'Još nema kupaca',
    noneText: 'Kupci se pojavljuju automatski uz prvu web narudžbu — ili ih dodajte i uvezite ručno.',
  },
  sq: {
    subtitle: 'Të gjithë klientët — nga porositë online, optika, terminet dhe importi. Profili, historiku dhe pëlqimet në një vend.',
    import: 'Importo',
    export: 'Eksporto',
    add: 'Shto klient',
    exported: 'U eksportuan: {n}',
    exportedText: 'CSV pa shënimet private.',
    kpiCustomers: 'Klientët',
    kpiCustomersSub: '+{n} të rinj në 30 ditë',
    kpiRepeat: 'Klientë të rregullt',
    kpiRepeatSub: '{pct}% kanë porositur 2+ herë',
    kpiLtv: 'Mesatarja për klient',
    kpiLtvSub: 'Porosia mesatare {v}',
    kpiConsent: 'Pëlqim për e-mail',
    kpiConsentSub: '{n} klientë marrin fushata',
    dup_one: '{n} dyfishim i mundshëm',
    dup_few: '{n} dyfishime të mundshme',
    dup_many: '{n} dyfishime të mundshme',
    dupText: 'I njëjti telefon ose i njëjti emër në të njëjtin qytet. Shikoni parapamjen para bashkimit — porositë mbeten të paprekura.',
    dupReview: 'Shiko dhe bashko',
    manageSegments: 'Segmentet',
    searchPh: 'Emri, e-maili, telefoni, qyteti ose etiketa…',
    mk_label: 'Pëlqimi për marketing',
    mk_all: 'Të gjitha kanalet',
    mk_email: 'Abonuar në e-mail',
    mk_sms: 'Abonuar në SMS',
    mk_any: 'Abonuar në çdo kanal',
    mk_none: 'Pa pëlqim',
    tag_label: 'Etiketa',
    tag_all: 'Të gjitha etiketat',
    sort_label: 'Renditja',
    sort_spent: 'Shpenzimet më të larta',
    sort_orders: 'Më shumë porosi',
    sort_recent: 'Porosia më e fundit',
    sort_new: 'Klientët më të rinj',
    sort_name: 'Emri A–Zh',
    col_customer: 'Klienti',
    col_contact: 'Kontakti',
    col_city: 'Qyteti',
    col_lang: 'Gjuha',
    col_orders: 'Porositë',
    col_spent: 'Shpenzuar',
    col_last: 'Porosia e fundit',
    col_tags: 'Etiketat',
    col_marketing: 'Marketingu',
    segInfo: '{n} klientë në segment.',
    editSegment: 'Ndrysho segmentin',
    showing: 'Shfaqen {n} nga {total}',
    showMore: 'Shfaq më shumë',
    emptyTitle: 'Asnjë klient për këto filtra',
    emptyText: 'Ndryshoni kërkimin, segmentin ose filtrin e pëlqimit.',
    clearFilters: 'Pastro filtrat',
    noneTitle: 'Ende nuk ka klientë',
    noneText: 'Klientët shfaqen automatikisht me porosinë e parë online — ose shtojini dhe importojini vetë.',
  },
  en: {
    subtitle: 'Every customer — from web orders, the store, appointments and imports. Profile, history and consent in one place.',
    import: 'Import',
    export: 'Export',
    add: 'Add customer',
    exported: 'Exported: {n}',
    exportedText: 'CSV without private notes.',
    kpiCustomers: 'Customers',
    kpiCustomersSub: '+{n} new in 30 days',
    kpiRepeat: 'Repeat customers',
    kpiRepeatSub: '{pct}% ordered 2+ times',
    kpiLtv: 'Avg. per customer',
    kpiLtvSub: 'Average order {v}',
    kpiConsent: 'E-mail consent',
    kpiConsentSub: '{n} customers receive campaigns',
    dup_one: '{n} possible duplicate',
    dup_few: '{n} possible duplicates',
    dup_many: '{n} possible duplicates',
    dupText: 'Same phone, or the same name in the same city. Preview before merging — orders stay untouched.',
    dupReview: 'Review & merge',
    manageSegments: 'Segments',
    searchPh: 'Name, e-mail, phone, city or tag…',
    mk_label: 'Marketing consent',
    mk_all: 'All channels',
    mk_email: 'Subscribed to e-mail',
    mk_sms: 'Subscribed to SMS',
    mk_any: 'Subscribed anywhere',
    mk_none: 'No consent',
    tag_label: 'Tag',
    tag_all: 'All tags',
    sort_label: 'Sort',
    sort_spent: 'Highest spend',
    sort_orders: 'Most orders',
    sort_recent: 'Most recent order',
    sort_new: 'Newest customers',
    sort_name: 'Name A–Z',
    col_customer: 'Customer',
    col_contact: 'Contact',
    col_city: 'City',
    col_lang: 'Lang.',
    col_orders: 'Orders',
    col_spent: 'Spent',
    col_last: 'Last order',
    col_tags: 'Tags',
    col_marketing: 'Marketing',
    segInfo: '{n} customers in this segment.',
    editSegment: 'Edit segment',
    showing: 'Showing {n} of {total}',
    showMore: 'Show more',
    emptyTitle: 'No customers match these filters',
    emptyText: 'Change the search, the segment or the consent filter.',
    clearFilters: 'Clear filters',
    noneTitle: 'No customers yet',
    noneText: 'Customers appear automatically with their first web order — or add and import them yourself.',
  },
});

type Sort = 'spent' | 'orders' | 'recent' | 'new' | 'name';
type Mk = 'all' | 'email' | 'sms' | 'any' | 'none';
const PAGE = 25;
const COLLATOR: Record<string, string> = { me: 'sr-Latn', sq: 'sq', en: 'en' };
const DAY = 86400000;

export default function Customers() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const tx = useDict(cx, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const explain = useExplain();
  const segments = useDb((s) => s.segments);
  const { customers, duplicates, data, now } = useCustomers();
  const segCounts = useSegmentCounts(customers, now);

  // Filters live in the URL (deep links from Segments and the command palette: ?segment=, ?c=, ?q=)
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const segParam = params.get('segment') ?? 'all';
  const segment = segments.some((s) => s.id === segParam) ? segParam : 'all';
  const tag = params.get('tag') ?? 'all';
  const mk = (params.get('mk') ?? 'all') as Mk;
  const sort = (params.get('sort') ?? 'spent') as Sort;
  const setParam = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '' || v === 'all' || (k === 'sort' && v === 'spent')) n.delete(k);
          else n.set(k, v);
        }
        return n;
      },
      { replace: true },
    );
  const [limit, setLimit] = useState(PAGE);
  const [mergeOpen, setMergeOpen] = useState<{ focus?: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  /* ---------------------------- derived ---------------------------- */
  const allTags = useMemo(() => [...new Set(customers.flatMap((c) => c.tags ?? []).filter(Boolean))].sort(), [customers]);
  const cities = useMemo(() => [...new Set(customers.map((c) => c.city).filter(Boolean))].sort(), [customers]);

  const stats = useMemo(() => {
    const buyers = customers.filter((c) => c.valid > 0);
    const spent = buyers.reduce((s, c) => s + c.spent, 0);
    const validOrders = buyers.reduce((s, c) => s + c.valid, 0);
    const repeat = buyers.filter((c) => c.valid > 1).length;
    const emailOk = customers.filter((c) => isSubscribed(c, 'email')).length;
    return {
      n: customers.length,
      fresh: customers.filter((c) => now - new Date(c.since).getTime() < 30 * DAY).length,
      repeat,
      repeatPct: buyers.length ? Math.round((repeat / buyers.length) * 100) : 0,
      ltv: buyers.length ? spent / buyers.length : 0,
      aov: validOrders ? spent / validOrders : 0,
      emailOk,
      emailPct: customers.length ? Math.round((emailOk / customers.length) * 100) : 0,
    };
  }, [customers, now]);

  const filtered = useMemo(() => {
    const inSeg = segment !== 'all' ? new Set((segCounts.get(segment) ?? []).map((c) => c.key)) : null;
    const coll = new Intl.Collator(COLLATOR[lang] ?? 'en');
    const list = customers.filter((c) => {
      if (inSeg && !inSeg.has(c.key)) return false;
      if (tag !== 'all' && !c.tags.includes(tag)) return false;
      if (mk === 'email' && !isSubscribed(c, 'email')) return false;
      if (mk === 'sms' && !isSubscribed(c, 'sms')) return false;
      if (mk === 'any' && !isSubscribed(c)) return false;
      if (mk === 'none' && isSubscribed(c)) return false;
      return matches(q, [c.name, c.company, c.city, ...c.emails, ...c.phones, ...c.tags]);
    });
    const cmp: Record<Sort, (a: CustomerRecord, b: CustomerRecord) => number> = {
      spent: (a, b) => b.spent - a.spent || (b.last ?? '').localeCompare(a.last ?? ''),
      orders: (a, b) => b.valid - a.valid || b.spent - a.spent,
      recent: (a, b) => (b.last ?? '').localeCompare(a.last ?? ''),
      new: (a, b) => b.since.localeCompare(a.since),
      name: (a, b) => coll.compare(a.name, b.name),
    };
    return list.sort(cmp[sort] ?? cmp.spent);
  }, [customers, segCounts, segment, tag, mk, q, sort, lang]);

  const visible = filtered.slice(0, limit);
  const filtersActive = !!q || segment !== 'all' || tag !== 'all' || mk !== 'all';
  const clearFilters = () => setParam({ q: null, segment: null, tag: null, mk: null });
  const selectedSeg = segments.find((s) => s.id === segment);

  /* ------------------------- profile drawer ------------------------ */
  const cParam = params.get('c');
  const current = cParam ? customers.find((c) => c.key === resolveKey(cParam, data.merges)) : undefined;
  const last = useRef<CustomerRecord | undefined>(undefined);
  if (current) last.current = current;
  const shown = current ?? last.current;
  const openCustomer = (key: string) => setParam({ c: key });
  const closeCustomer = () => setParam({ c: null });
  const currentSegments = useMemo(() => (shown ? segments.filter((s) => segCounts.get(s.id)?.some((m) => m.key === shown.key)) : []), [shown, segments, segCounts]);
  const currentDups = useMemo(() => (shown ? duplicates.filter((d) => d.a.key === shown.key || d.b.key === shown.key) : []), [shown, duplicates]);
  const reviewMerge = (d: DuplicatePair) => {
    closeCustomer();
    setMergeOpen({ focus: d.id });
  };

  const doExport = () => {
    download(`optika-klientet-${new Date().toISOString().slice(0, 10)}.csv`, exportCsv(filtered), 'text/csv;charset=utf-8');
    toast.success(t('exported', { n: filtered.length }), { description: t('exportedText') });
  };

  const recent = (iso?: string) => (iso ? now - new Date(iso).getTime() < 30 * DAY : false);
  const canEdit = can('customers', 'edit');
  const canImport = can('customers', 'import');
  const canExport = can('customers', 'export');

  return (
    <div className="pb-16">
      <PageHeader
        breadcrumbs={[ta('nav_customers'), selectedSeg ? l(selectedSeg.name) : ta('all')]}
        title={ta('nav_customers')}
        badge={<Badge tone="gray">{num(customers.length, lang)}</Badge>}
        description={t('subtitle')}
        actions={
          <>
            <Gate allowed={canImport} reason={tx('noPermission')}>
              <Button variant="outline" shape="rounded" size="sm" icon={<Upload className="h-4 w-4" />} disabled={!canImport} onClick={() => setImportOpen(true)}>
                {t('import')}
              </Button>
            </Gate>
            <Gate allowed={canExport} reason={tx('noPermission')}>
              <Button variant="outline" shape="rounded" size="sm" icon={<Download className="h-4 w-4" />} disabled={!canExport || filtered.length === 0} onClick={doExport}>
                {t('export')}
              </Button>
            </Gate>
            <Gate allowed={canEdit} reason={tx('noPermission')}>
              <Button shape="rounded" size="sm" icon={<UserPlus className="h-4 w-4" />} disabled={!canEdit} onClick={() => setAddOpen(true)}>
                {t('add')}
              </Button>
            </Gate>
          </>
        }
      />

      {customers.length === 0 ? (
        <Card>
          <EmptyState icon={<Users className="h-6 w-6" />} title={t('noneTitle')} text={t('noneText')} />
        </Card>
      ) : (
        <>
          <KpiStrip
            className="mb-4"
            items={[
              { label: t('kpiCustomers'), value: num(stats.n, lang), sub: t('kpiCustomersSub', { n: stats.fresh }) },
              { label: t('kpiRepeat'), value: num(stats.repeat, lang), sub: t('kpiRepeatSub', { pct: stats.repeatPct }) },
              { label: t('kpiLtv'), value: money(stats.ltv, lang, { decimals: false }), sub: t('kpiLtvSub', { v: money(stats.aov, lang, { decimals: false }) }) },
              { label: t('kpiConsent'), value: `${stats.emailPct}%`, sub: t('kpiConsentSub', { n: stats.emailOk }) },
            ]}
          />

          {duplicates.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-600/25 bg-amber-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <div className="min-w-0 text-[13px]">
                  <span className="font-semibold text-ink">{t(`dup_${pluralForm(duplicates.length, lang)}`, { n: duplicates.length })}</span>
                  <span className="text-ink-soft"> — {t('dupText')}</span>
                </div>
              </div>
              <Gate allowed={canEdit} reason={tx('noPermission')} className="shrink-0">
                <Button variant="outline" shape="rounded" size="sm" icon={<GitMerge className="h-4 w-4" />} disabled={!canEdit} onClick={() => setMergeOpen({})} className="w-full bg-white! sm:w-auto">
                  {t('dupReview')}
                </Button>
              </Gate>
            </div>
          )}

          <Card padded={false}>
            {/* Toolbar */}
            <div className="space-y-3 border-b border-line/70 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <FilterPills
                  className="min-w-0 flex-1 p-px"
                  value={segment}
                  onChange={(v) => {
                    setParam({ segment: v });
                    setLimit(PAGE);
                  }}
                  options={[
                    { id: 'all', label: ta('all'), count: customers.length },
                    ...segments.map((s) => ({ id: s.id, label: l(s.name), count: segCounts.get(s.id)?.length ?? 0 })),
                  ]}
                />
                {can('segments') && (
                  <Link to="/admin/segmenti" className="hidden shrink-0 items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink sm:inline-flex">
                    {t('manageSegments')} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
                <SearchInput
                  value={q}
                  onChange={(v) => {
                    setParam({ q: v });
                    setLimit(PAGE);
                  }}
                  placeholder={t('searchPh')}
                  className="col-span-2 lg:flex-1"
                />
                <SelectBox label={t('mk_label')} value={mk} onChange={(v) => setParam({ mk: v })} active={mk !== 'all'} icon={<ShieldCheck className="h-4 w-4" />} className="lg:w-52">
                  <option value="all">{t('mk_all')}</option>
                  <option value="email">{t('mk_email')}</option>
                  <option value="sms">{t('mk_sms')}</option>
                  <option value="any">{t('mk_any')}</option>
                  <option value="none">{t('mk_none')}</option>
                </SelectBox>
                <SelectBox label={t('tag_label')} value={tag} onChange={(v) => setParam({ tag: v })} active={tag !== 'all'} icon={<Tag className="h-4 w-4" />} className="lg:w-44">
                  <option value="all">{t('tag_all')}</option>
                  {allTags.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </SelectBox>
                <SelectBox label={t('sort_label')} value={sort} onChange={(v) => setParam({ sort: v })} icon={<ArrowUpDown className="h-4 w-4" />} className="col-span-2 lg:w-52">
                  <option value="spent">{t('sort_spent')}</option>
                  <option value="orders">{t('sort_orders')}</option>
                  <option value="recent">{t('sort_recent')}</option>
                  <option value="new">{t('sort_new')}</option>
                  <option value="name">{t('sort_name')}</option>
                </SelectBox>
              </div>
              {selectedSeg && (
                <div className="flex flex-col gap-2 rounded-lg bg-canvas px-3.5 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex min-w-0 items-start gap-2 text-ink-soft">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                    <span>
                      {explain(selectedSeg)} <span className="text-muted">{t('segInfo', { n: segCounts.get(selectedSeg.id)?.length ?? 0 })}</span>
                    </span>
                  </p>
                  {can('segments') && (
                    <Link to={`/admin/segmenti?id=${selectedSeg.id}`} className="shrink-0 pl-5 font-semibold text-ink underline underline-offset-2 hover:no-underline sm:pl-0">
                      {t('editSegment')}
                    </Link>
                  )}
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title={t('emptyTitle')}
                text={t('emptyText')}
                action={
                  filtersActive && (
                    <Button variant="outline" shape="rounded" size="sm" onClick={clearFilters}>
                      {t('clearFilters')}
                    </Button>
                  )
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <Table className="hidden md:block">
                  <thead>
                    <tr>
                      <Th className="pr-3!">{t('col_customer')}</Th>
                      <Th className="hidden px-3! xl:table-cell">{t('col_contact')}</Th>
                      <Th className="px-3!">{t('col_city')}</Th>
                      <Th className="hidden px-3! lg:table-cell">{t('col_lang')}</Th>
                      <Th className="px-3! text-right">{t('col_orders')}</Th>
                      <Th className="px-3! text-right">{t('col_spent')}</Th>
                      <Th className="px-3!">{t('col_last')}</Th>
                      <Th className="hidden px-3! min-[1400px]:table-cell">{t('col_tags')}</Th>
                      <Th className="hidden px-3! lg:table-cell">{t('col_marketing')}</Th>
                      <Th className="w-8 px-0!" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <Tr key={c.key} onClick={() => openCustomer(c.key)} className="group">
                        <Td className="pr-3!">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar name={c.name} size="sm" />
                            <div className="min-w-0">
                              <div className="max-w-[190px] truncate font-semibold text-ink">{c.name}</div>
                              <div className="max-w-[190px] truncate text-[12px] text-muted xl:hidden">{c.email || c.phone}</div>
                              {(c.company || c.source !== 'web') && <div className="hidden max-w-[190px] truncate text-[12px] text-muted xl:block">{c.company ?? tx(`src_${c.source}`)}</div>}
                            </div>
                          </div>
                        </Td>
                        <Td className="hidden px-3! xl:table-cell">
                          <div className="max-w-[200px] truncate text-[13px] text-ink-soft">{c.email || '—'}</div>
                          <div className="text-[12px] tabular-nums text-muted">{c.phone || '—'}</div>
                        </Td>
                        <Td className="whitespace-nowrap px-3! text-[13px] text-ink-soft">{c.city || '—'}</Td>
                        <Td className="hidden px-3! lg:table-cell">
                          <LangChip lang={c.lang} />
                        </Td>
                        <Td className="px-3! text-right tabular-nums">{c.valid > 0 ? c.valid : <span className="text-muted">0</span>}</Td>
                        <Td className="whitespace-nowrap px-3! text-right font-semibold tabular-nums">{money(c.spent, lang)}</Td>
                        <Td className="whitespace-nowrap px-3!">
                          {c.last ? (
                            <>
                              <div className="text-[13px] text-ink">{date(c.last, lang)}</div>
                              {recent(c.last) && <div className="text-[11.5px] text-muted">{timeAgo(c.last, lang)}</div>}
                            </>
                          ) : (
                            <span className="text-[13px] text-muted">{tx('noOrders')}</span>
                          )}
                        </Td>
                        <Td className="hidden px-3! min-[1400px]:table-cell">
                          <TagList tags={c.tags} max={1} className="max-w-[150px]" />
                        </Td>
                        <Td className="hidden px-3! lg:table-cell">
                          <ConsentSummary marketing={c.marketing} max={2} className="max-w-[170px]" />
                        </Td>
                        <Td className="w-8 px-0! pr-3!">
                          <ChevronRight className="h-4 w-4 text-muted/50 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>

                {/* Mobile list */}
                <ul className="divide-y divide-line/70 md:hidden">
                  {visible.map((c) => (
                    <li key={c.key}>
                      <button type="button" onClick={() => openCustomer(c.key)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-canvas/70">
                        <Avatar name={c.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-[14.5px] font-semibold text-ink">{c.name}</span>
                              <LangChip lang={c.lang} className="shrink-0" />
                            </div>
                            <span className="shrink-0 text-[14.5px] font-semibold tabular-nums text-ink">{money(c.spent, lang, { decimals: false })}</span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2 text-[12.5px] text-muted">
                            <span className="flex min-w-0 items-center gap-1 truncate">
                              {c.city && (
                                <>
                                  <MapPin className="h-3 w-3 shrink-0" /> {c.city} ·{' '}
                                </>
                              )}
                              {c.last ? (recent(c.last) ? timeAgo(c.last, lang) : date(c.last, lang, { day: 'numeric', month: 'short' })) : tx('noOrders')}
                            </span>
                            <span className="shrink-0">{tx(`orders_${pluralForm(c.valid, lang)}`, { n: c.valid })}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <ConsentSummary marketing={c.marketing} className="min-w-0" />
                            {c.tags.length > 0 && <TagList tags={c.tags} max={1} className="shrink-0 justify-end" />}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-line/70 px-4 py-3.5 text-[13px] text-muted sm:flex-row sm:px-5">
                  <span>
                    {t('showing', { n: visible.length, total: filtered.length })}
                    {filtersActive && (
                      <button type="button" onClick={clearFilters} className="ml-3 font-semibold text-ink-soft hover:text-ink">
                        {t('clearFilters')}
                      </button>
                    )}
                  </span>
                  {filtered.length > visible.length && (
                    <Button variant="outline" shape="rounded" size="sm" icon={<ChevronDown className="h-4 w-4" />} onClick={() => setLimit((n) => n + PAGE)}>
                      {t('showMore')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card>
        </>
      )}

      <CustomerDrawer customer={shown} open={!!current} onClose={closeCustomer} segments={currentSegments} duplicates={currentDups} allTags={allTags} onReviewMerge={reviewMerge} />
      <MergeModal open={!!mergeOpen} onClose={() => setMergeOpen(null)} pairs={duplicates} focusId={mergeOpen?.focus} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} customers={customers} />
      <AddCustomerModal open={addOpen} onClose={() => setAddOpen(false)} customers={customers} cities={cities} onCreated={openCustomer} />
    </div>
  );
}
