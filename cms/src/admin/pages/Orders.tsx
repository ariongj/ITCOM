import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, CheckCheck, ChevronDown, Download, Eye, Plus, ShoppingBag, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SearchInput, Table, Td, Th } from '@/admin/components/kit';
import { ALL_STATUSES, archivePatch, channelOf, csvNum, customerName, discountName, isArchived, localizeLine, matchesOrder, pluralKey, qtyLabel, toCsv } from '@/admin/components/orders/helpers';
import { ArchivedBadge, CancelledBadge, FulfilBadge, PayBadge } from '@/admin/components/orders/status';
import { Check, SelectInput, Stat, Tabs, Tip } from '@/admin/components/orders/ui';
import { od } from '@/admin/components/orders/dict';
import { adm } from '@/admin/i18n';
import { defineDict, useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { FULFILLMENT_STATES, PAYMENT_STATES, fulfillmentOf, paymentOf, refundedOf } from '@/lib/orders';
import { date, money } from '@/lib/format';
import { cn, download, round2 } from '@/lib/utils';
import type { FulfillmentState, Lang, Order, OrderStatus, PaymentState } from '@/lib/types';

const T = defineDict({
  me: {
    description: 'Sve narudžbe iz web prodavnice i ručne narudžbe tima. Plaćanje, isporuka i povrati prate se odvojeno.',
    create: 'Kreiraj narudžbu',
    exportCsv: 'Izvezi CSV',
    exported: 'CSV je preuzet: {n}',
    markAllSeen: 'Označi sve kao pregledano',
    markedSeen: 'Sve narudžbe su označene kao pregledane',
    tab_all: 'Sve',
    tab_unfulfilled: 'Za slanje',
    tab_unpaid: 'Neplaćene',
    tab_archived: 'Arhivirane',
    searchPh: 'Pretraži broj, kupca, e-mail, telefon ili grad',
    f_payment: 'Plaćanje',
    f_fulfilment: 'Isporuka',
    f_status: 'Status',
    f_channel: 'Kanal',
    f_period: 'Period',
    f_any: 'Sve',
    period_7: 'Posljednjih 7 dana',
    period_30: 'Posljednjih 30 dana',
    period_90: 'Posljednjih 90 dana',
    period_all: 'Cijeli period',
    clearFilters: 'Poništi filtere',
    col_order: 'Narudžba',
    col_date: 'Datum',
    col_customer: 'Kupac',
    col_payment: 'Plaćanje',
    col_fulfilment: 'Isporuka',
    col_total: 'Ukupno',
    col_channel: 'Kanal',
    unseen: 'Nova — nije pregledana',
    refundedShort: '−{amount} refund.',
    selectAll: 'Izaberi sve prikazane',
    selectRow: 'Izaberi {n}',
    archive: 'Arhiviraj',
    unarchive: 'Vrati iz arhive',
    exportSelected: 'Izvezi izabrane',
    markSeen: 'Označi kao pregledano',
    archivedToast: 'Arhivirano: {n}. Plaćanje i isporuka su nepromijenjeni.',
    unarchivedToast: 'Vraćeno u listu: {n}',
    undo: 'Poništi',
    stat_unfulfilled: 'Čeka slanje',
    stat_unfulfilledHint: 'potvrđene, nisu poslate',
    stat_unpaid: 'Čeka uplatu',
    stat_net: 'Neto prodaja · 30 dana',
    stat_netHint: 'nakon popusta i refundacija',
    stat_returns: 'Otvoreni povrati',
    stat_returnsHint: 'čekaju odluku ili robu',
    emptyAllTitle: 'Još nema narudžbi',
    emptyAllText: 'Kada kupci naruče iz web prodavnice, ili tim konvertuje nacrt, narudžbe se pojavljuju ovdje.',
    emptyTitle: 'Nema narudžbi za ove filtere',
    emptyText: 'Promijenite karticu, filtere ili pojam pretrage.',
    emptyArchivedTitle: 'Arhiva je prazna',
    emptyArchivedText: 'Arhivirajte završene narudžbe da lista ostane pregledna — arhiviranje ne mijenja plaćanje ni isporuku.',
    showMore: 'Prikaži još',
    showing: 'Prikazano {n} od {total}',
    csvFile: 'narudzbe',
    csv_number: 'Broj',
    csv_date: 'Datum',
    csv_customer: 'Kupac',
    csv_email: 'E-mail',
    csv_phone: 'Telefon',
    csv_city: 'Grad',
    csv_address: 'Adresa',
    csv_company: 'Firma',
    csv_items: 'Stavke',
    csv_channel: 'Kanal',
    csv_delivery: 'Isporuka',
    csv_method: 'Način plaćanja',
    csv_payment: 'Plaćanje',
    csv_fulfilment: 'Ispunjenje',
    csv_discounts: 'Primijenjeni popusti',
    csv_vat: 'PDV',
    csv_refunded: 'Refundirano',
    csv_status: 'Status',
    csv_archived: 'Arhivirana',
  },
  sq: {
    description: 'Të gjitha porositë nga Online Store dhe porositë manuale të ekipit. Pagesa, përmbushja dhe kthimet ndiqen veçmas.',
    create: 'Krijo porosi',
    exportCsv: 'Eksporto CSV',
    exported: 'CSV u shkarkua: {n}',
    markAllSeen: 'Shëno të gjitha si të shikuara',
    markedSeen: 'Të gjitha porositë u shënuan si të shikuara',
    tab_all: 'Të gjitha',
    tab_unfulfilled: 'Të papërmbushura',
    tab_unpaid: 'Të papaguara',
    tab_archived: 'Të arkivuara',
    searchPh: 'Kërko numrin, klientin, e-mailin, telefonin ose qytetin',
    f_payment: 'Pagesa',
    f_fulfilment: 'Përmbushja',
    f_status: 'Statusi',
    f_channel: 'Kanali',
    f_period: 'Periudha',
    f_any: 'Të gjitha',
    period_7: '7 ditët e fundit',
    period_30: '30 ditët e fundit',
    period_90: '90 ditët e fundit',
    period_all: 'E gjithë periudha',
    clearFilters: 'Pastro filtrat',
    col_order: 'Porosia',
    col_date: 'Data',
    col_customer: 'Klienti',
    col_payment: 'Pagesa',
    col_fulfilment: 'Përmbushja',
    col_total: 'Totali',
    col_channel: 'Kanali',
    unseen: 'E re — e pashikuar',
    refundedShort: '−{amount} rimburs.',
    selectAll: 'Zgjidh të gjitha të shfaqurat',
    selectRow: 'Zgjidh {n}',
    archive: 'Arkivo',
    unarchive: 'Hiq nga arkivi',
    exportSelected: 'Eksporto të zgjedhurat',
    markSeen: 'Shëno si të shikuara',
    archivedToast: 'U arkivuan: {n}. Pagesa dhe përmbushja mbeten të pandryshuara.',
    unarchivedToast: 'U kthyen në listë: {n}',
    undo: 'Zhbëj',
    stat_unfulfilled: 'Presin dërgesën',
    stat_unfulfilledHint: 'të konfirmuara, ende pa u dërguar',
    stat_unpaid: 'Në pritje të pagesës',
    stat_net: 'Shitje neto · 30 ditë',
    stat_netHint: 'pas zbritjeve dhe rimbursimeve',
    stat_returns: 'Kthime të hapura',
    stat_returnsHint: 'presin vendim ose mallin',
    emptyAllTitle: 'Ende nuk ka porosi',
    emptyAllText: 'Kur klientët porosisin nga Online Store, ose ekipi konverton një draft, porositë shfaqen këtu.',
    emptyTitle: 'Nuk ka porosi për këta filtra',
    emptyText: 'Ndryshoni skedën, filtrat ose termin e kërkimit.',
    emptyArchivedTitle: 'Arkivi është bosh',
    emptyArchivedText: 'Arkivoni porositë e mbyllura që lista të mbetet e pastër — arkivimi nuk ndryshon pagesën as përmbushjen.',
    showMore: 'Shfaq më shumë',
    showing: 'Shfaqen {n} nga {total}',
    csvFile: 'porosite',
    csv_number: 'Numri',
    csv_date: 'Data',
    csv_customer: 'Klienti',
    csv_email: 'E-mail',
    csv_phone: 'Telefoni',
    csv_city: 'Qyteti',
    csv_address: 'Adresa',
    csv_company: 'Kompania',
    csv_items: 'Artikujt',
    csv_channel: 'Kanali',
    csv_delivery: 'Dërgesa',
    csv_method: 'Mënyra e pagesës',
    csv_payment: 'Pagesa',
    csv_fulfilment: 'Përmbushja',
    csv_discounts: 'Zbritjet e aplikuara',
    csv_vat: 'TVSH',
    csv_refunded: 'Rimbursuar',
    csv_status: 'Statusi',
    csv_archived: 'E arkivuar',
  },
  en: {
    description: 'Every Online Store order and the team’s manual orders. Payment, fulfilment and returns are tracked separately.',
    create: 'Create order',
    exportCsv: 'Export CSV',
    exported: 'CSV downloaded: {n}',
    markAllSeen: 'Mark all as viewed',
    markedSeen: 'All orders marked as viewed',
    tab_all: 'All',
    tab_unfulfilled: 'Unfulfilled',
    tab_unpaid: 'Unpaid',
    tab_archived: 'Archived',
    searchPh: 'Search number, customer, e-mail, phone or city',
    f_payment: 'Payment',
    f_fulfilment: 'Fulfilment',
    f_status: 'Status',
    f_channel: 'Channel',
    f_period: 'Period',
    f_any: 'All',
    period_7: 'Last 7 days',
    period_30: 'Last 30 days',
    period_90: 'Last 90 days',
    period_all: 'All time',
    clearFilters: 'Clear filters',
    col_order: 'Order',
    col_date: 'Date',
    col_customer: 'Customer',
    col_payment: 'Payment',
    col_fulfilment: 'Fulfilment',
    col_total: 'Total',
    col_channel: 'Channel',
    unseen: 'New — not viewed yet',
    refundedShort: '−{amount} refunded',
    selectAll: 'Select all shown',
    selectRow: 'Select {n}',
    archive: 'Archive',
    unarchive: 'Unarchive',
    exportSelected: 'Export selected',
    markSeen: 'Mark as viewed',
    archivedToast: 'Archived: {n}. Payment and fulfilment are unchanged.',
    unarchivedToast: 'Back in the list: {n}',
    undo: 'Undo',
    stat_unfulfilled: 'Awaiting shipment',
    stat_unfulfilledHint: 'confirmed, not shipped yet',
    stat_unpaid: 'Awaiting payment',
    stat_net: 'Net sales · 30 days',
    stat_netHint: 'after discounts and refunds',
    stat_returns: 'Open returns',
    stat_returnsHint: 'awaiting a decision or the goods',
    emptyAllTitle: 'No orders yet',
    emptyAllText: 'When customers order from the Online Store, or the team converts a draft, orders appear here.',
    emptyTitle: 'No orders match these filters',
    emptyText: 'Try another tab, filter or search term.',
    emptyArchivedTitle: 'The archive is empty',
    emptyArchivedText: 'Archive closed orders to keep the list tidy — archiving does not change payment or fulfilment.',
    showMore: 'Show more',
    showing: 'Showing {n} of {total}',
    csvFile: 'orders',
    csv_number: 'Number',
    csv_date: 'Date',
    csv_customer: 'Customer',
    csv_email: 'E-mail',
    csv_phone: 'Phone',
    csv_city: 'City',
    csv_address: 'Address',
    csv_company: 'Company',
    csv_items: 'Items',
    csv_channel: 'Channel',
    csv_delivery: 'Delivery',
    csv_method: 'Payment method',
    csv_payment: 'Payment',
    csv_fulfilment: 'Fulfilment',
    csv_discounts: 'Applied discounts',
    csv_vat: 'VAT',
    csv_refunded: 'Refunded',
    csv_status: 'Status',
    csv_archived: 'Archived',
  },
});

type Tab = 'all' | 'unfulfilled' | 'unpaid' | 'archived';
type Period = '7' | '30' | '90' | 'all';
type Channel = 'online' | 'draft';
type SortKey = 'date' | 'total';
const TABS: Tab[] = ['all', 'unfulfilled', 'unpaid', 'archived'];
const PERIODS: Period[] = ['all', '7', '30', '90'];
const PAGE = 25;
const DAY = 86400000;

const isUnfulfilled = (o: Order) => o.status !== 'cancelled' && (fulfillmentOf(o) === 'unfulfilled' || fulfillmentOf(o) === 'partial');
const isUnpaid = (o: Order) => o.status !== 'cancelled' && ['pending', 'authorized', 'failed'].includes(paymentOf(o));

function inTab(o: Order, tab: Tab) {
  if (tab === 'archived') return isArchived(o);
  if (isArchived(o)) return false;
  if (tab === 'unfulfilled') return isUnfulfilled(o);
  if (tab === 'unpaid') return isUnpaid(o);
  return true;
}

const dayOf = (iso: string, lang: Lang) => date(iso, lang, { day: 'numeric', month: 'short' });
const timeOf = (iso: string, lang: Lang) => date(iso, lang, { hour: '2-digit', minute: '2-digit' });

export default function Orders() {
  const t = useDict(T, 'admin');
  const to = useDict(od, 'admin');
  const ta = useDict(adm, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const orders = useDb((s) => s.orders);
  const products = useDb((s) => s.products);
  const discounts = useDb((s) => s.discounts);
  const returns = useDb((s) => s.returns);
  const updateOrder = useDb((s) => s.updateOrder);
  const markOrderSeen = useDb((s) => s.markOrderSeen);
  const markAllOrdersSeen = useDb((s) => s.markAllOrdersSeen);
  const logAudit = useDb((s) => s.logAudit);

  /* ---------------- filters (tab, q and status live in the URL) ---------------- */
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as Tab | null;
  const tab: Tab = rawTab && TABS.includes(rawTab) ? rawTab : 'all';
  const rawStatus = params.get('status');
  const status: OrderStatus | '' = rawStatus && (ALL_STATUSES as string[]).includes(rawStatus) ? (rawStatus as OrderStatus) : '';
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(PAGE);
    setSelected(new Set());
  };
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [pay, setPay] = useState<PaymentState | ''>('');
  const [ful, setFul] = useState<FulfillmentState | ''>('');
  const [channel, setChannel] = useState<Channel | ''>('');
  const [period, setPeriod] = useState<Period>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const plural = (base: 'orders' | 'items', n: number) => to(pluralKey(base, n, lang), { n });

  // search + filters first, so tab counts reflect them
  const base = useMemo(() => {
    const from = period === 'all' ? 0 : Date.now() - Number(period) * DAY;
    return orders.filter(
      (o) =>
        matchesOrder(o, query) &&
        (!pay || paymentOf(o) === pay) &&
        (!ful || fulfillmentOf(o) === ful) &&
        (!status || o.status === status) &&
        (!channel || channelOf(o) === channel) &&
        (!from || new Date(o.createdAt).getTime() >= from),
    );
  }, [orders, query, pay, ful, status, channel, period]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((k) => [k, base.filter((o) => inTab(o, k)).length])) as Record<Tab, number>, [base]);

  const filtered = useMemo(() => {
    const list = base.filter((o) => inTab(o, tab));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => dir * (sort.key === 'total' ? a.total - b.total : a.createdAt.localeCompare(b.createdAt)));
  }, [base, tab, sort]);
  const visible = filtered.slice(0, limit);

  const stats = useMemo(() => {
    const live = orders.filter((o) => !isArchived(o) && o.status !== 'cancelled');
    const unpaid = live.filter(isUnpaid);
    const from = Date.now() - 30 * DAY;
    const recent = orders.filter((o) => o.status !== 'cancelled' && new Date(o.createdAt).getTime() >= from);
    return {
      unfulfilled: live.filter(isUnfulfilled).length,
      unpaidCount: unpaid.length,
      unpaidSum: unpaid.reduce((s, o) => s + o.total, 0),
      net: round2(recent.reduce((s, o) => s + o.total - refundedOf(o), 0)),
      returns: returns.filter((r) => r.status === 'requested' || r.status === 'approved' || r.status === 'received').length,
    };
  }, [orders, returns]);

  const unseen = useMemo(() => orders.filter((o) => !o.seen).length, [orders]);
  const filtersActive = !!(query.trim() || pay || ful || status || channel || period !== 'all');
  const resetFilters = () => {
    setQuery('');
    setPay('');
    setFul('');
    setChannel('');
    setPeriod('all');
    const next = new URLSearchParams(params);
    next.delete('status');
    next.delete('q');
    setParams(next, { replace: true });
  };

  /* ---------------- selection + bulk actions ---------------- */
  const selectedOrders = filtered.filter((o) => selected.has(o.id));
  const allShown = visible.length > 0 && visible.every((o) => selected.has(o.id));
  const someShown = visible.some((o) => selected.has(o.id));
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (on: boolean) => setSelected(on ? new Set(visible.map((o) => o.id)) : new Set());

  const setArchived = (list: Order[], archived: boolean) => {
    const at = archived ? new Date().toISOString() : null;
    for (const o of list) {
      updateOrder(o.id, archivePatch(at));
      logAudit({ action: archived ? 'archive' : 'restore', object: 'order', objectId: o.id, detail: o.number });
    }
    setSelected(new Set());
    const n = plural('orders', list.length);
    toast.success(archived ? t('archivedToast', { n }) : t('unarchivedToast', { n }), {
      action: { label: t('undo'), onClick: () => list.forEach((o) => updateOrder(o.id, archivePatch(archived ? null : new Date().toISOString()))) },
    });
  };

  const exportCsv = (list: Order[]) => {
    const header = [
      t('csv_number'), t('csv_date'), t('csv_customer'), t('csv_email'), t('csv_phone'), t('csv_city'), t('csv_address'), t('csv_company'), t('csv_items'),
      t('csv_channel'), t('csv_delivery'), t('csv_method'), t('csv_payment'), t('csv_fulfilment'),
      tc('subtotal'), tc('installation'), tc('discount'), t('csv_discounts'), tc('shipping'), tc('total'), t('csv_vat'), t('csv_refunded'), t('csv_status'), t('csv_archived'),
    ];
    const rows = list.map((o) => [
      o.number,
      `${date(o.createdAt, lang, { year: 'numeric', month: '2-digit', day: '2-digit' })} ${timeOf(o.createdAt, lang)}`,
      customerName(o), o.customer.email, o.customer.phone, o.customer.city, o.customer.address, o.customer.company ?? '',
      o.items.map((l) => `${localizeLine(l, products.find((p) => p.id === l.productId), o.lang, lang).name} × ${qtyLabel(l, lang, tc('packs'))}`).join(' | '),
      to(`channel_${channelOf(o)}`), tc(`delivery_${o.delivery.method}`), tc(`pay_${o.payment.method}`), to(`pay_${paymentOf(o)}`), to(`ful_${fulfillmentOf(o)}`),
      csvNum(o.subtotal, lang), csvNum(o.installationTotal, lang), csvNum(o.discount, lang),
      (o.discounts ?? []).map((d) => `${discountName(d.id, d.title, discounts, lang)}${d.code ? ` (${d.code})` : ''} −${csvNum(d.amount, lang)}`).join(' | '),
      csvNum(o.shipping, lang), csvNum(o.total, lang), csvNum(o.vat, lang), csvNum(refundedOf(o), lang), tc(`status_${o.status}`), isArchived(o) ? ta('yes') : ta('no'),
    ]);
    download(`${t('csvFile')}-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + toCsv([header, ...rows]), 'text/csv;charset=utf-8');
    toast.success(t('exported', { n: plural('orders', rows.length) }));
  };

  const canArchive = can('orders', 'archive');
  const canExport = can('orders', 'export');
  const open = (o: Order) => navigate(`/admin/narudzbe/${o.id}`);
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? sort.dir === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" /> : null);

  const tabs = TABS.map((k) => ({ id: k, label: t(`tab_${k}`), count: counts[k] }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[ta('nav_orders'), t(`tab_${tab}`)]}
        title={ta('nav_orders')}
        description={t('description')}
        actions={
          <>
            {unseen > 0 && (
              <Button
                variant="ghost"
                size="sm"
                shape="rounded"
                icon={<CheckCheck className="h-4 w-4" />}
                onClick={() => {
                  markAllOrdersSeen();
                  toast.success(t('markedSeen'));
                }}
              >
                <span className="hidden sm:inline">{t('markAllSeen')}</span>
              </Button>
            )}
            {canExport && (
              <Button variant="outline" size="sm" shape="rounded" icon={<Download className="h-4 w-4" />} onClick={() => exportCsv(filtered)} disabled={!filtered.length}>
                {t('exportCsv')}
              </Button>
            )}
            {can('drafts', 'edit') && (
              <ButtonLink to="/admin/nacrti/novi" size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />}>
                {t('create')}
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t('stat_unfulfilled')} value={stats.unfulfilled} hint={t('stat_unfulfilledHint')} onClick={() => setParam('tab', 'unfulfilled')} active={tab === 'unfulfilled'} />
        <Stat label={t('stat_unpaid')} value={money(stats.unpaidSum, lang, { decimals: false })} hint={plural('orders', stats.unpaidCount)} onClick={() => setParam('tab', 'unpaid')} active={tab === 'unpaid'} />
        <Stat label={t('stat_net')} value={money(stats.net, lang, { decimals: false })} hint={t('stat_netHint')} />
        <Stat label={t('stat_returns')} value={stats.returns} hint={t('stat_returnsHint')} onClick={() => navigate('/admin/povrati')} />
      </div>

      <Card padded={false}>
        <Tabs tabs={tabs} value={tab} onChange={(v) => setParam('tab', v === 'all' ? '' : v)} />

        {/* toolbar: search + filters */}
        <div className="flex flex-col gap-2 border-b border-line/70 px-4 py-3 sm:px-5 xl:flex-row xl:items-center">
          <SearchInput
            value={query}
            onChange={(v) => {
              setQuery(v);
              setLimit(PAGE);
            }}
            placeholder={t('searchPh')}
            className="min-w-0 xl:flex-1 [&_input]:h-9"
          />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center xl:flex-nowrap">
            <FilterSelect width="sm:w-[150px]" label={t('f_payment')} value={pay} onChange={(v) => setPay(v as PaymentState | '')} options={PAYMENT_STATES.map((s) => [s, to(`pay_${s}`)])} any={t('f_any')} />
            <FilterSelect width="sm:w-[150px]" label={t('f_fulfilment')} value={ful} onChange={(v) => setFul(v as FulfillmentState | '')} options={FULFILLMENT_STATES.map((s) => [s, to(`ful_${s}`)])} any={t('f_any')} />
            <FilterSelect width="sm:w-[140px]" label={t('f_status')} value={status} onChange={(v) => setParam('status', v)} options={ALL_STATUSES.map((s) => [s, tc(`status_${s}`)])} any={t('f_any')} />
            <FilterSelect width="sm:w-[140px]" label={t('f_channel')} value={channel} onChange={(v) => setChannel(v as Channel | '')} options={[['online', to('channel_online')], ['draft', to('channel_draft')]]} any={t('f_any')} />
            <FilterSelect width="col-span-2 sm:w-[160px]" label={t('f_period')} value={period === 'all' ? '' : period} onChange={(v) => setPeriod((v || 'all') as Period)} options={PERIODS.filter((p) => p !== 'all').map((p) => [p, t(`period_${p}`)])} any={t('period_all')} />
            {filtersActive && (
              <button type="button" onClick={resetFilters} title={t('clearFilters')} className="col-span-2 inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-muted hover:bg-ink/[0.05] hover:text-ink sm:col-span-1">
                <X className="h-3.5 w-3.5" /> <span className="xl:hidden">{t('clearFilters')}</span>
              </button>
            )}
          </div>
        </div>

        {/* bulk bar */}
        {selectedOrders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-canvas/70 px-4 py-2.5 sm:px-5">
            <Check checked={allShown} indeterminate={!allShown && someShown} onChange={toggleAll} label={t('selectAll')} />
            <span className="mr-1 text-[13px] font-semibold text-ink">{to('selected', { n: selectedOrders.length })}</span>
            {tab === 'archived' ? (
              <BulkButton icon={<ArchiveRestore className="h-4 w-4" />} disabled={!canArchive} tip={!canArchive && to('noPermission')} onClick={() => setArchived(selectedOrders, false)}>
                {t('unarchive')}
              </BulkButton>
            ) : (
              <BulkButton icon={<Archive className="h-4 w-4" />} disabled={!canArchive} tip={!canArchive && to('noPermission')} onClick={() => setArchived(selectedOrders, true)}>
                {t('archive')}
              </BulkButton>
            )}
            {canExport && (
              <BulkButton icon={<Download className="h-4 w-4" />} onClick={() => exportCsv(selectedOrders)}>
                {t('exportSelected')}
              </BulkButton>
            )}
            {selectedOrders.some((o) => !o.seen) && (
              <BulkButton
                icon={<Eye className="h-4 w-4" />}
                onClick={() => {
                  selectedOrders.forEach((o) => markOrderSeen(o.id));
                  setSelected(new Set());
                }}
              >
                {t('markSeen')}
              </BulkButton>
            )}
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-[13px] font-semibold text-muted hover:text-ink">
              {to('clearSelection')}
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={tab === 'archived' && !filtersActive ? <Archive className="h-6 w-6" /> : <ShoppingBag className="h-6 w-6" />}
            title={orders.length === 0 ? t('emptyAllTitle') : tab === 'archived' && !filtersActive ? t('emptyArchivedTitle') : t('emptyTitle')}
            text={orders.length === 0 ? t('emptyAllText') : tab === 'archived' && !filtersActive ? t('emptyArchivedText') : t('emptyText')}
            action={
              filtersActive && (
                <Button variant="outline" size="sm" shape="rounded" onClick={resetFilters}>
                  {t('clearFilters')}
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* desktop table */}
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th className="w-10">
                    <Check checked={allShown} indeterminate={!allShown && someShown} onChange={toggleAll} label={t('selectAll')} />
                  </Th>
                  <Th>{t('col_order')}</Th>
                  <Th>
                    <button type="button" onClick={() => sortBy('date')} className="inline-flex items-center gap-1 hover:text-ink">
                      {t('col_date')} <SortIcon k="date" />
                    </button>
                  </Th>
                  <Th>{t('col_customer')}</Th>
                  <Th>{t('col_payment')}</Th>
                  <Th>{t('col_fulfilment')}</Th>
                  <Th className="text-right">
                    <button type="button" onClick={() => sortBy('total')} className="inline-flex items-center gap-1 hover:text-ink">
                      <SortIcon k="total" /> {t('col_total')}
                    </button>
                  </Th>
                  <Th>{t('col_channel')}</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => {
                  const sel = selected.has(o.id);
                  const refunded = refundedOf(o);
                  return (
                    <tr key={o.id} onClick={() => open(o)} className={cn('group cursor-pointer transition-colors', sel ? 'bg-ink/[0.035]' : 'hover:bg-canvas/70')}>
                      <Td className="w-10">
                        <Check checked={sel} onChange={(v) => toggle(o.id, v)} label={t('selectRow', { n: o.number })} />
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn('tabular-nums', o.seen ? 'font-semibold' : 'font-bold')}>#{o.number}</span>
                          {!o.seen && <span title={t('unseen')} className="h-2 w-2 rounded-full bg-ink" />}
                        </span>
                        <span className="block text-[12px] text-muted">{plural('items', o.items.length)}</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="block">{dayOf(o.createdAt, lang)}</span>
                        <span className="block text-[12px] tabular-nums text-muted">{timeOf(o.createdAt, lang)}</span>
                      </Td>
                      <Td className="max-w-[220px]">
                        <span className={cn('block truncate', o.seen ? 'font-medium' : 'font-semibold')}>{customerName(o)}</span>
                        <span className="block truncate text-[12px] text-muted">{o.customer.city}</span>
                      </Td>
                      <Td className="whitespace-nowrap">
                        <PayBadge state={paymentOf(o)} />
                      </Td>
                      <Td className="whitespace-nowrap">
                        <span className="flex flex-wrap items-center gap-1">
                          {o.status === 'cancelled' ? <CancelledBadge /> : <FulfilBadge state={fulfillmentOf(o)} />}
                          {isArchived(o) && tab !== 'archived' && <ArchivedBadge />}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">
                        <span className={cn('block', o.status === 'cancelled' ? 'text-muted line-through' : 'font-semibold')}>{money(o.total, lang)}</span>
                        {refunded > 0 && o.status !== 'cancelled' && <span className="block text-[12px] text-muted">{t('refundedShort', { amount: money(refunded, lang) })}</span>}
                      </Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft">{to(`channel_${channelOf(o)}`)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            {/* mobile cards */}
            <ul className="divide-y divide-line/70 md:hidden">
              {visible.map((o) => {
                const sel = selected.has(o.id);
                return (
                  <li key={o.id} className={cn('flex gap-3 px-4 py-3.5', sel && 'bg-ink/[0.035]')}>
                    <Check checked={sel} onChange={(v) => toggle(o.id, v)} label={t('selectRow', { n: o.number })} className="mt-0.5" />
                    <button type="button" onClick={() => open(o)} className="min-w-0 flex-1 text-left">
                      <span className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2">
                          <span className={cn('text-[14.5px] tabular-nums', o.seen ? 'font-semibold' : 'font-bold')}>#{o.number}</span>
                          {!o.seen && <span className="h-2 w-2 rounded-full bg-ink" />}
                        </span>
                        <span className={cn('text-[14.5px] tabular-nums', o.status === 'cancelled' ? 'text-muted line-through' : 'font-semibold')}>{money(o.total, lang)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate text-ink">
                          {customerName(o)} <span className="text-muted">· {o.customer.city}</span>
                        </span>
                        <span className="shrink-0 text-[12px] text-muted">
                          {dayOf(o.createdAt, lang)} · {timeOf(o.createdAt, lang)}
                        </span>
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        <PayBadge state={paymentOf(o)} />
                        {o.status === 'cancelled' ? <CancelledBadge /> : <FulfilBadge state={fulfillmentOf(o)} />}
                        <span className="text-[12px] text-muted">· {to(`channel_${channelOf(o)}`)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 px-4 py-3 text-[13px] text-muted sm:flex-row sm:px-5">
              <span>{t('showing', { n: visible.length, total: filtered.length })}</span>
              {visible.length < filtered.length && (
                <Button variant="outline" size="sm" shape="rounded" iconRight={<ChevronDown className="h-4 w-4" />} onClick={() => setLimit((l) => l + PAGE)}>
                  {t('showMore')}
                </Button>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/** Compact filter: shows the filter name until a value is picked, then the value (bold border = active). */
function FilterSelect({ label, value, onChange, options, any, width }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; any: string; width: string }) {
  return (
    <SelectInput aria-label={label} title={label} value={value} onChange={(e) => onChange(e.target.value)} wrapClassName={cn('min-w-0', width)} className={cn('truncate', value ? 'border-ink/50 font-semibold' : 'text-ink-soft')}>
      <option value="">{label}</option>
      <optgroup label={label}>
        <option value="">{any}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </optgroup>
    </SelectInput>
  );
}

function BulkButton({ icon, children, onClick, disabled, tip }: { icon: ReactNode; children: ReactNode; onClick: () => void; disabled?: boolean; tip?: string | false }) {
  return (
    <Tip tip={tip}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:border-ink/35 disabled:pointer-events-none disabled:opacity-45"
      >
        {icon}
        {children}
      </button>
    </Tip>
  );
}
