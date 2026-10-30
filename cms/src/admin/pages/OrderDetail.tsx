import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import {
  Archive, ArchiveRestore, ArrowRight, Ban, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Lock, Mail, MapPin, PackageCheck, PackageX,
  Glasses, Phone, Plus, Printer, RotateCcw, SearchX, ShieldCheck, Store, Tag, Truck, X,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, Thumb, confirmDialog } from '@/admin/components/kit';
import { OrderTimeline } from '@/admin/components/orders/OrderTimeline';
import { FulfilDialog } from '@/admin/components/orders/FulfilDialog';
import { RefundDialog } from '@/admin/components/orders/RefundDialog';
import {
  PAY_ICON, archivePatch, archivedAtOf, channelOf, customerLink, customerName, discountName, installationAmount, isCarrierKey, localizeLine, mapsUrl,
  pluralKey, qtyLabel,
} from '@/admin/components/orders/helpers';
import { ArchivedBadge, CancelledBadge, FulfilBadge, PayBadge, ReturnBadge, StatusGlyph } from '@/admin/components/orders/status';
import { ActionMenu, CodeChip, Eyebrow, SumRow, Tip, type MenuItem } from '@/admin/components/orders/ui';
import { od } from '@/admin/components/orders/dict';
import { adm } from '@/admin/i18n';
import { LANGS, defineDict, useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan, useSettings } from '@/store/hooks';
import { fulfillmentOf, orderLineNet, paymentOf, refundedOf } from '@/lib/orders';
import { zoneForCity } from '@/lib/pricing';
import { customerKeyOf } from '@/lib/crm';
import { date, dateTime, money, perUnit } from '@/lib/format';
import { href } from '@/lib/paths';
import { cn, round2 } from '@/lib/utils';
import type { Order, OrderStatus } from '@/lib/types';

const T = defineDict({
  me: {
    placed: '{date}',
    customerLang: 'Jezik kupca: {lang}',
    actions: 'Akcije',
    prev: 'Novija narudžba',
    next: 'Starija narudžba',
    printInvoice: 'Štampaj račun',
    refund: 'Refundiraj…',
    createReturn: 'Kreiraj povrat',
    archive: 'Arhiviraj',
    unarchive: 'Vrati iz arhive',
    cancelOrder: 'Otkaži narudžbu',
    nothingToRefund: 'Nema uplate koja se može refundirati',
    cancelTitle: 'Otkazati narudžbu #{n}?',
    cancelText: 'Rezervisana roba se vraća na stanje. Ako je narudžba plaćena, uplata se označava kao refundirana.',
    cancelConfirm: 'Da, otkaži',
    cancelled: 'Narudžba #{n} je otkazana',
    archived: 'Narudžba #{n} je arhivirana',
    unarchived: 'Narudžba #{n} je vraćena u listu',
    archivedBanner: 'Arhivirana {date} — skrivena iz radnih lista. Plaćanje i isporuka nisu promijenjeni.',
    cancelledBanner: 'Otkazana {date}.',
    // items card
    items: 'Stavke narudžbe',
    colQty: 'Količina',
    colTotal: 'Ukupno',
    sku: 'Šifra',
    installation: 'Nega+ {price}',
    custom: 'Posebna stavka',
    orderStatus: 'Status narudžbe',
    prepare: 'Pripremi isporuku',
    confirm: 'Potvrdi narudžbu',
    startProcessing: 'Počni pripremu',
    scheduleInstall: 'Spremno za prilagođavanje',
    markDelivered: 'Označi kao isporučeno',
    advanced: 'Status: „{s}“',
    shippedOn: 'Poslato {date}',
    deliveredOn: 'Isporučeno {date}',
    trackingNo: 'Praćenje: {n}',
    // payment card
    payment: 'Plaćanje i istorija',
    subtotal: 'Međuzbir',
    itemsCount: '{n}',
    shippingRow: 'Dostava · {method}',
    freeBy: 'Besplatno: {name}',
    freeInstall: 'Besplatno uz Nega+',
    total: 'Ukupno',
    vat: 'Uključen PDV {rate}%',
    paidByCustomer: 'Platio kupac',
    due: 'Za naplatu',
    refundedRow: 'Refundirano {date}',
    net: 'Neto',
    cost: 'Nabavna vrijednost',
    margin: 'Bruto marža',
    costHint: 'Vidljivo samo ulogama sa pravom „Kosto“',
    markPaid: 'Označi kao plaćeno',
    markedPaid: 'Uplata je evidentirana',
    history: 'Istorija',
    // side cards
    customer: 'Kupac',
    ordersOf: '{n}',
    noEmail: 'Bez e-maila',
    delivery: 'Dostava',
    pickupAt: 'Preuzimanje: {addr}',
    zone: 'Zona: {zone} · {days} dana',
    trackingLater: 'Praćenje se dodjeljuje nakon slanja',
    deliveryDate: 'Termin: {date}',
    openMap: 'Mapa',
    notes: 'Napomene',
    customerNote: 'Napomena kupca',
    internalNote: 'Interna napomena',
    noNotes: 'Bez napomena',
    addNote: 'Dodaj internu napomenu',
    editNote: 'Uredi',
    save: 'Sačuvaj',
    noteSaved: 'Napomena je sačuvana',
    tags: 'Oznake',
    addTag: 'Dodaj oznaku…',
    discount: 'Popust',
    noDiscount: 'Bez popusta',
    returns: 'Povrati',
    company: 'Firma',
    pib: 'NUI',
    notFound: 'Narudžba nije pronađena',
    notFoundText: 'Možda je obrisana ili link nije ispravan.',
    backToOrders: 'Nazad na narudžbe',
  },
  sq: {
    placed: '{date}',
    customerLang: 'Gjuha e klientit: {lang}',
    actions: 'Veprime',
    prev: 'Porosia më e re',
    next: 'Porosia më e vjetër',
    printInvoice: 'Printo faturën',
    refund: 'Rimburso…',
    createReturn: 'Krijo kthim',
    archive: 'Arkivo',
    unarchive: 'Hiq nga arkivi',
    cancelOrder: 'Anulo porosinë',
    nothingToRefund: 'Nuk ka pagesë që mund të rimbursohet',
    cancelTitle: 'Të anulohet porosia #{n}?',
    cancelText: 'Malli i rezervuar kthehet në stok. Nëse porosia është paguar, pagesa shënohet si e rimbursuar.',
    cancelConfirm: 'Po, anuloje',
    cancelled: 'Porosia #{n} u anulua',
    archived: 'Porosia #{n} u arkivua',
    unarchived: 'Porosia #{n} u kthye në listë',
    archivedBanner: 'E arkivuar më {date} — e fshehur nga listat e punës. Pagesa dhe përmbushja nuk ndryshojnë.',
    cancelledBanner: 'E anuluar më {date}.',
    items: 'Artikujt e porosisë',
    colQty: 'Sasi',
    colTotal: 'Totali',
    sku: 'Kodi',
    installation: 'Kujdes+ {price}',
    custom: 'Artikull custom',
    orderStatus: 'Statusi i porosisë',
    prepare: 'Përgatit dërgesën',
    confirm: 'Konfirmo porosinë',
    startProcessing: 'Fillo përgatitjen',
    scheduleInstall: 'Gati për përshtatje',
    markDelivered: 'Shëno si të dorëzuar',
    advanced: 'Statusi: „{s}“',
    shippedOn: 'Dërguar më {date}',
    deliveredOn: 'Dorëzuar më {date}',
    trackingNo: 'Gjurmimi: {n}',
    payment: 'Pagesa dhe historiku',
    subtotal: 'Nëntotali',
    itemsCount: '{n}',
    shippingRow: 'Dërgesa · {method}',
    freeBy: 'Falas: {name}',
    freeInstall: 'Falas me Kujdes+',
    total: 'Totali',
    vat: 'TVSH {rate}% e përfshirë',
    paidByCustomer: 'Paguar nga klienti',
    due: 'Për t’u paguar',
    refundedRow: 'Rimbursuar më {date}',
    net: 'Neto',
    cost: 'Kosto e mallit',
    margin: 'Marzha bruto',
    costHint: 'E dukshme vetëm për rolet me leje „Kosto“',
    markPaid: 'Shëno si të paguar',
    markedPaid: 'Pagesa u regjistrua',
    history: 'Historiku',
    customer: 'Klienti',
    ordersOf: '{n}',
    noEmail: 'Pa e-mail',
    delivery: 'Dërgesa',
    pickupAt: 'Marrje: {addr}',
    zone: 'Zona: {zone} · {days} ditë',
    trackingLater: 'Gjurmimi caktohet pas dërgimit',
    deliveryDate: 'Termini: {date}',
    openMap: 'Harta',
    notes: 'Shënime',
    customerNote: 'Shënimi i klientit',
    internalNote: 'Shënim i brendshëm',
    noNotes: 'Pa shënime',
    addNote: 'Shto shënim të brendshëm',
    editNote: 'Ndrysho',
    save: 'Ruaj',
    noteSaved: 'Shënimi u ruajt',
    tags: 'Etiketat',
    addTag: 'Shto etiketë…',
    discount: 'Zbritja',
    noDiscount: 'Pa zbritje',
    returns: 'Kthimet',
    company: 'Kompania',
    pib: 'NUI',
    notFound: 'Porosia nuk u gjet',
    notFoundText: 'Mund të jetë fshirë ose lidhja nuk është e saktë.',
    backToOrders: 'Kthehu te porositë',
  },
  en: {
    placed: '{date}',
    customerLang: 'Customer language: {lang}',
    actions: 'Actions',
    prev: 'Newer order',
    next: 'Older order',
    printInvoice: 'Print invoice',
    refund: 'Refund…',
    createReturn: 'Create return',
    archive: 'Archive',
    unarchive: 'Unarchive',
    cancelOrder: 'Cancel order',
    nothingToRefund: 'There is no payment left to refund',
    cancelTitle: 'Cancel order #{n}?',
    cancelText: 'Reserved stock goes back to inventory. If the order was paid, the payment is marked as refunded.',
    cancelConfirm: 'Yes, cancel it',
    cancelled: 'Order #{n} was cancelled',
    archived: 'Order #{n} archived',
    unarchived: 'Order #{n} is back in the list',
    archivedBanner: 'Archived on {date} — hidden from the working lists. Payment and fulfilment are unchanged.',
    cancelledBanner: 'Cancelled on {date}.',
    items: 'Order items',
    colQty: 'Qty',
    colTotal: 'Total',
    sku: 'SKU',
    installation: 'Care+ {price}',
    custom: 'Custom item',
    orderStatus: 'Order status',
    prepare: 'Prepare shipment',
    confirm: 'Confirm order',
    startProcessing: 'Start preparing',
    scheduleInstall: 'Ready for fitting',
    markDelivered: 'Mark as delivered',
    advanced: 'Status: “{s}”',
    shippedOn: 'Shipped {date}',
    deliveredOn: 'Delivered {date}',
    trackingNo: 'Tracking: {n}',
    payment: 'Payment & history',
    subtotal: 'Subtotal',
    itemsCount: '{n}',
    shippingRow: 'Delivery · {method}',
    freeBy: 'Free: {name}',
    freeInstall: 'Free with Care+',
    total: 'Total',
    vat: 'Includes {rate}% VAT',
    paidByCustomer: 'Paid by customer',
    due: 'Amount due',
    refundedRow: 'Refunded {date}',
    net: 'Net',
    cost: 'Cost of goods',
    margin: 'Gross margin',
    costHint: 'Only visible to roles with the “Cost” permission',
    markPaid: 'Mark as paid',
    markedPaid: 'Payment recorded',
    history: 'History',
    customer: 'Customer',
    ordersOf: '{n}',
    noEmail: 'No e-mail',
    delivery: 'Delivery',
    pickupAt: 'Pickup: {addr}',
    zone: 'Zone: {zone} · {days} days',
    trackingLater: 'Tracking is assigned once shipped',
    deliveryDate: 'Scheduled: {date}',
    openMap: 'Map',
    notes: 'Notes',
    customerNote: 'Customer note',
    internalNote: 'Internal note',
    noNotes: 'No notes',
    addNote: 'Add an internal note',
    editNote: 'Edit',
    save: 'Save',
    noteSaved: 'Note saved',
    tags: 'Tags',
    addTag: 'Add tag…',
    discount: 'Discount',
    noDiscount: 'No discount',
    returns: 'Returns',
    company: 'Company',
    pib: 'Business no. (NUI)',
    notFound: 'Order not found',
    notFoundText: 'It may have been deleted or the link is incorrect.',
    backToOrders: 'Back to orders',
  },
});

type Dict = ReturnType<typeof useDict<(typeof T)['me']>>;

export default function OrderDetail() {
  const { id } = useParams();
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const order = useDb((s) => s.orders.find((o) => o.id === id || o.number === id));
  const markOrderSeen = useDb((s) => s.markOrderSeen);

  useEffect(() => {
    if (order && !order.seen) markOrderSeen(order.id);
  }, [order, markOrderSeen]);

  if (!order) {
    return (
      <div className="animate-fade-in">
        <PageHeader back="/admin/narudzbe" breadcrumbs={[{ label: ta('nav_orders'), to: '/admin/narudzbe' }, t('notFound')]} title={t('notFound')} />
        <Card>
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title={t('notFound')}
            text={t('notFoundText')}
            action={
              <ButtonLink to="/admin/narudzbe" size="sm" shape="rounded">
                {t('backToOrders')}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }
  return <OrderView order={order} />;
}

function OrderView({ order }: { order: Order }) {
  const t = useDict(T, 'admin');
  const to = useDict(od, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const orders = useDb((s) => s.orders);
  const setOrderStatus = useDb((s) => s.setOrderStatus);
  const updateOrder = useDb((s) => s.updateOrder);
  const logAudit = useDb((s) => s.logAudit);
  const [fulfilOpen, setFulfilOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const pay = paymentOf(order);
  const ful = fulfillmentOf(order);
  const cancelled = order.status === 'cancelled';
  const archivedAt = archivedAtOf(order);
  const refundable = round2(order.total - refundedOf(order)) > 0 && (pay === 'paid' || pay === 'partially_refunded');
  const lastAt = (s: OrderStatus) => [...order.timeline].reverse().find((e) => e.status === s)?.at ?? order.createdAt;

  // prev = newer, next = older (list order)
  const nav = useMemo(() => {
    const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const i = sorted.findIndex((o) => o.id === order.id);
    return { prev: i > 0 ? sorted[i - 1] : null, next: i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : null };
  }, [orders, order.id]);

  const cancel = async () => {
    const ok = await confirmDialog({ title: t('cancelTitle', { n: order.number }), text: t('cancelText'), confirmLabel: t('cancelConfirm'), danger: true });
    if (!ok) return;
    setOrderStatus(order.id, 'cancelled');
    toast.success(t('cancelled', { n: order.number }));
  };

  const setArchived = (on: boolean) => {
    updateOrder(order.id, archivePatch(on ? new Date().toISOString() : null));
    logAudit({ action: on ? 'archive' : 'restore', object: 'order', objectId: order.id, detail: order.number });
    toast.success(on ? t('archived', { n: order.number }) : t('unarchived', { n: order.number }));
  };

  const menu: MenuItem[] = [
    { label: t('printInvoice'), icon: <Printer />, onClick: () => window.open(href(`/admin/faktura/${order.id}`), '_blank', 'noopener') },
    {
      label: t('refund'),
      icon: <RotateCcw />,
      onClick: () => setRefundOpen(true),
      disabled: !can('orders', 'refund') || !refundable,
      hint: !can('orders', 'refund') ? to('noPermission') : t('nothingToRefund'),
    },
    ...(can('returns', 'edit') && !cancelled ? [{ label: t('createReturn'), icon: <PackageX />, to: `/admin/povrati?order=${order.id}&new=1` } as MenuItem] : []),
    { type: 'separator' },
    archivedAt
      ? { label: t('unarchive'), icon: <ArchiveRestore />, onClick: () => setArchived(false), disabled: !can('orders', 'archive'), hint: to('noPermission') }
      : { label: t('archive'), icon: <Archive />, onClick: () => setArchived(true), disabled: !can('orders', 'archive'), hint: to('noPermission') },
    ...(!cancelled && order.status !== 'completed'
      ? [{ label: t('cancelOrder'), icon: <Ban />, danger: true, onClick: cancel, disabled: !can('orders', 'cancel'), hint: to('noPermission') } as MenuItem]
      : []),
  ];

  const orderLang = LANGS.find((l) => l.code === order.lang)?.label ?? order.lang;

  return (
    <div className="animate-fade-in">
      <PageHeader
        back="/admin/narudzbe"
        breadcrumbs={[{ label: ta('nav_orders'), to: '/admin/narudzbe' }, `#${order.number}`]}
        title={`#${order.number}`}
        badge={
          <span className="flex flex-wrap items-center gap-1.5">
            <PayBadge state={pay} />
            {cancelled ? <CancelledBadge /> : <FulfilBadge state={ful} />}
            {archivedAt && <ArchivedBadge />}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{dateTime(order.createdAt, lang)}</span>
            <span className="text-ink/25">·</span>
            <span>{to(`channel_${channelOf(order)}`)}</span>
            {order.lang !== lang && (
              <>
                <span className="text-ink/25">·</span>
                <span>{t('customerLang', { lang: orderLang })}</span>
              </>
            )}
          </span>
        }
        actions={
          <>
            <span className="hidden items-center sm:inline-flex">
              <NavArrow to={nav.prev ? `/admin/narudzbe/${nav.prev.id}` : null} label={t('prev')} icon={<ChevronLeft className="h-4 w-4" />} className="rounded-l-lg" />
              <NavArrow to={nav.next ? `/admin/narudzbe/${nav.next.id}` : null} label={t('next')} icon={<ChevronRight className="h-4 w-4" />} className="-ml-px rounded-r-lg" />
            </span>
            <ActionMenu label={t('actions')} items={menu} />
          </>
        }
      />

      {(archivedAt || cancelled) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-white px-4 py-3 text-[13.5px] text-ink-soft">
          <StatusGlyph glyph={cancelled ? 'cross' : 'dash'} className={cancelled ? 'text-[#8A1B0A]' : 'text-ink'} />
          <span className="min-w-0 flex-1">{cancelled ? t('cancelledBanner', { date: dateTime(lastAt('cancelled'), lang) }) : t('archivedBanner', { date: dateTime(archivedAt!, lang) })}</span>
          {archivedAt && can('orders', 'archive') && (
            <Button variant="outline" size="xs" shape="rounded" icon={<ArchiveRestore className="h-3.5 w-3.5" />} onClick={() => setArchived(false)}>
              {t('unarchive')}
            </Button>
          )}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <ItemsCard order={order} t={t} onFulfil={() => setFulfilOpen(true)} />
          <PaymentCard order={order} t={t} onRefund={() => setRefundOpen(true)} refundable={refundable} />
        </div>
        <div className="grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <CustomerCard order={order} t={t} />
          <DeliveryCard order={order} t={t} />
          <NotesCard order={order} t={t} />
          <DiscountCard order={order} t={t} />
          <ReturnsCard order={order} t={t} />
        </div>
      </div>

      {can('orders', 'edit') && <FulfilDialog order={order} open={fulfilOpen} onClose={() => setFulfilOpen(false)} />}
      {can('orders', 'refund') && <RefundDialog order={order} open={refundOpen} onClose={() => setRefundOpen(false)} />}
    </div>
  );
}

function NavArrow({ to, label, icon, className }: { to: string | null; label: string; icon: ReactNode; className?: string }) {
  const cls = cn('grid h-9 w-9 place-items-center border border-ink/15 bg-white text-ink transition-colors', className);
  if (!to)
    return (
      <span className={cn(cls, 'cursor-not-allowed text-ink/25')} aria-disabled>
        {icon}
      </span>
    );
  return (
    <Link to={to} title={label} aria-label={label} className={cn(cls, 'hover:border-ink/35 hover:bg-canvas')}>
      {icon}
    </Link>
  );
}

/* ================================================================== */
/* Artikujt e porosisë                                                 */
/* ================================================================== */
function ItemsCard({ order, t, onFulfil }: { order: Order; t: Dict; onFulfil: () => void }) {
  const to = useDict(od, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const products = useDb((s) => s.products);
  const discounts = useDb((s) => s.discounts);
  const setOrderStatus = useDb((s) => s.setOrderStatus);
  const ful = fulfillmentOf(order);
  const s = order.status;
  const editable = can('orders', 'edit') && s !== 'cancelled' && s !== 'completed';
  // Pickup orders follow the in-store flow: processing (lab) → ready for fitting → handed over; no shipment step.
  const pickup = order.delivery.method === 'pickup';
  const f = order.fulfillment;

  const advance = (next: OrderStatus) => {
    setOrderStatus(order.id, next);
    toast.success(t('advanced', { s: tc(`status_${next}`) }));
  };

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t('items')}
          {s === 'cancelled' ? <CancelledBadge /> : <FulfilBadge state={ful} />}
        </span>
      }
      actions={
        <span className="hidden items-center gap-1.5 text-[12.5px] text-muted sm:inline-flex">
          {t('orderStatus')}: <span className="font-semibold text-ink">{tc(`status_${s}`)}</span>
        </span>
      }
      padded={false}
    >
      <ul className="divide-y divide-line/70">
        {order.items.map((l, i) => {
          const product = products.find((p) => p.id === l.productId);
          const loc = localizeLine(l, product, order.lang, lang);
          const inst = installationAmount(l);
          const gross = round2(l.lineTotal + inst);
          const net = orderLineNet(order, i);
          const allocations = l.allocations ?? [];
          return (
            <li key={`${l.productId}-${i}`} className="flex gap-3 px-4 py-3.5 sm:px-5">
              <Thumb src={l.image} className="h-12 w-12 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0">
                    {product && can('products') ? (
                      <Link to={`/admin/proizvodi/${product.id}`} className="font-semibold leading-snug text-ink hover:underline">
                        {loc.name}
                      </Link>
                    ) : (
                      <span className="font-semibold leading-snug text-ink">{loc.name}</span>
                    )}
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {l.custom ? t('custom') : `${t('sku')} ${l.sku}`}
                      {loc.options && <> · {loc.options}</>}
                    </p>
                    {inst > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('installation', { price: `${money(l.installationPrice, lang)} ${perUnit(l.unit, lang)}` })} = {money(inst, lang)}
                      </p>
                    )}
                    {allocations.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {allocations.map((a) => {
                          const applied = order.discounts?.find((d) => d.id === a.discountId);
                          return (
                            <li key={a.discountId} className="inline-flex items-center gap-1 rounded-md bg-canvas px-1.5 py-0.5 text-[12px] text-ink-soft">
                              <Tag className="h-3 w-3" />
                              {applied?.code ?? discountName(a.discountId, applied?.title ?? '', discounts, lang)}
                              <span className="tabular-nums">−{money(a.amount, lang)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="flex shrink-0 items-baseline justify-between gap-6 sm:justify-end">
                    <span className="text-[13px] tabular-nums text-ink-soft">
                      {qtyLabel(l, lang, tc('packs'))} × {money(l.unitPrice, lang)}
                    </span>
                    <span className="min-w-[88px] text-right tabular-nums">
                      {net < gross - 0.004 && <span className="block text-[12px] text-muted line-through">{money(gross, lang)}</span>}
                      <span className="block font-semibold text-ink">{money(net, lang)}</span>
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* fulfilment footer */}
      <div className="flex flex-col gap-3 border-t border-line/70 bg-canvas/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0 text-[13px] text-ink-soft">
          {f?.shippedAt ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Truck className="h-4 w-4 text-ink" />
              <span>{t('shippedOn', { date: date(f.shippedAt, lang, { day: 'numeric', month: 'short' }) })}</span>
              {f.carrier && <span>· {isCarrierKey(f.carrier) ? to(`carrier_${f.carrier}`) : f.carrier}</span>}
              {f.tracking && <span>· {t('trackingNo', { n: f.tracking })}</span>}
              {f.deliveredAt && <span>· {t('deliveredOn', { date: date(f.deliveredAt, lang, { day: 'numeric', month: 'short' }) })}</span>}
            </span>
          ) : (
            <span className="sm:hidden">
              {t('orderStatus')}: <span className="font-semibold text-ink">{tc(`status_${s}`)}</span>
            </span>
          )}
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {s === 'new' && (
              <Button variant="outline" size="sm" shape="rounded" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => advance('confirmed')}>
                {t('confirm')}
              </Button>
            )}
            {s === 'confirmed' && (
              <Button variant="outline" size="sm" shape="rounded" icon={<ArrowRight className="h-4 w-4" />} onClick={() => advance('processing')}>
                {t('startProcessing')}
              </Button>
            )}
            {(ful === 'unfulfilled' || ful === 'partial') && !pickup && (
              <Button size="sm" shape="rounded" icon={<PackageCheck className="h-4 w-4" />} onClick={onFulfil}>
                {t('prepare')}
              </Button>
            )}
            {pickup && (s === 'processing' || s === 'shipped') && (
              <Button size="sm" shape="rounded" icon={<Glasses className="h-4 w-4" />} onClick={() => advance('installation')}>
                {t('scheduleInstall')}
              </Button>
            )}
            {(s === 'shipped' || s === 'installation') && ful !== 'partial' && (
              <Button size="sm" shape="rounded" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => advance('completed')}>
                {t('markDelivered')}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ================================================================== */
/* Pagesa dhe historiku                                                */
/* ================================================================== */
function PaymentCard({ order, t, onRefund, refundable }: { order: Order; t: Dict; onRefund: () => void; refundable: boolean }) {
  const to = useDict(od, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const settings = useSettings();
  const products = useDb((s) => s.products);
  const discounts = useDb((s) => s.discounts);
  const updateOrder = useDb((s) => s.updateOrder);
  const logAudit = useDb((s) => s.logAudit);
  const pay = paymentOf(order);
  const PayIcon = PAY_ICON[order.payment.method];
  const refunded = refundedOf(order);
  const applied = order.discounts ?? [];
  const lineDiscounts = applied.filter((d) => d.kind !== 'shipping');
  const shipDiscount = applied.find((d) => d.kind === 'shipping');
  const shipBefore = order.shippingBeforeDiscount ?? order.shipping;
  const paidAmount = pay === 'paid' || pay === 'partially_refunded' || pay === 'refunded' ? order.total : 0;
  const itemCount = to(pluralKey('items', order.items.length, lang), { n: order.items.length });

  // cost & margin — internal, permission "viewCost"
  const cost = useMemo(() => {
    let sum = 0;
    for (const l of order.items) {
      const p = products.find((x) => x.id === l.productId);
      if (!p?.cost) return null;
      sum += p.cost * (l.unit === 'm2' && l.packSize ? l.qty * l.packSize : l.qty);
    }
    return round2(sum);
  }, [order.items, products]);
  const goodsNet = round2(order.items.reduce((s, _, i) => s + orderLineNet(order, i), 0));
  const showCost = can('products', 'viewCost') && cost != null && order.status !== 'cancelled';

  const markPaid = () => {
    updateOrder(order.id, { payment: { ...order.payment, status: 'paid', failed: false }, timeline: [...order.timeline, { at: new Date().toISOString(), status: 'payment', by: 'admin' }] });
    logAudit({ action: 'status', object: 'order', objectId: order.id, detail: `${order.number}: payment → paid` });
    toast.success(t('markedPaid'));
  };

  const canMarkPaid = (pay === 'pending' || pay === 'authorized' || pay === 'failed') && order.status !== 'cancelled' && can('orders', 'edit');

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t('payment')}
          <PayBadge state={pay} />
        </span>
      }
      actions={
        <span className="hidden items-center gap-1.5 text-[12.5px] text-muted sm:inline-flex">
          <PayIcon className="h-4 w-4" />
          {tc(`pay_${order.payment.method}`)}
        </span>
      }
    >
      <dl>
        <SumRow label={t('subtotal')} sub={itemCount} value={money(order.subtotal, lang)} />
        {order.installationTotal > 0 && <SumRow label={tc('installation')} value={money(order.installationTotal, lang)} />}
        {lineDiscounts.length > 0
          ? lineDiscounts.map((d) => (
              <SumRow
                key={d.id}
                label={
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    {tc('discount')} · {discountName(d.id, d.title, discounts, lang)}
                    {d.code && <CodeChip>{d.code}</CodeChip>}
                  </span>
                }
                sub={`${to(`kind_${d.kind}`)} · ${d.code ? to('code') : to('auto')}`}
                value={`−${money(d.amount, lang)}`}
              />
            ))
          : order.discount > 0 && <SumRow label={order.coupon?.code ? <span className="inline-flex items-center gap-1.5">{tc('discount')} <CodeChip>{order.coupon.code}</CodeChip></span> : tc('discount')} value={`−${money(order.discount, lang)}`} />}
        <SumRow
          label={t('shippingRow', { method: tc(`delivery_${order.delivery.method}`) })}
          sub={shipDiscount ? t('freeBy', { name: discountName(shipDiscount.id, shipDiscount.title, discounts, lang) }) : order.shipping === 0 && order.installationTotal > 0 && order.delivery.method !== 'pickup' ? t('freeInstall') : undefined}
          value={
            shipDiscount && shipBefore > order.shipping ? (
              <span>
                <span className="mr-1.5 text-muted line-through">{money(shipBefore, lang)}</span>
                {order.shipping > 0 ? money(order.shipping, lang) : tc('free')}
              </span>
            ) : order.shipping > 0 ? (
              money(order.shipping, lang)
            ) : (
              tc('free')
            )
          }
        />
        <div className="my-1.5 border-t border-line/70" />
        <SumRow strong label={t('total')} sub={t('vat', { rate: settings.vatRate }) + ` · ${money(order.vat, lang)}`} value={<span className={cn('text-[16px]', order.status === 'cancelled' && 'text-muted line-through')}>{money(order.total, lang)}</span>} />
      </dl>

      <div className="mt-3 rounded-lg bg-canvas/70 px-3.5 py-2">
        <SumRow label={paidAmount > 0 ? t('paidByCustomer') : t('due')} value={money(paidAmount > 0 ? paidAmount : order.total, lang)} />
        {(order.refunds ?? []).map((r) => (
          <SumRow key={r.id} muted label={t('refundedRow', { date: date(r.at, lang, { day: 'numeric', month: 'short' }) })} sub={r.note} value={`−${money(r.amount, lang)}`} />
        ))}
        {!order.refunds?.length && refunded > 0 && <SumRow muted label={to('pay_refunded')} value={`−${money(refunded, lang)}`} />}
        {refunded > 0 && <SumRow strong label={t('net')} value={money(round2(paidAmount - refunded), lang)} />}
      </div>

      {showCost && (
        <div className="mt-3 rounded-lg border border-dashed border-line px-3.5 py-1.5" title={t('costHint')}>
          <SumRow label={<span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> {t('cost')}</span>} value={money(cost!, lang)} />
          <SumRow label={t('margin')} value={`${money(round2(goodsNet - cost!), lang)} · ${goodsNet > 0 ? Math.round(((goodsNet - cost!) / goodsNet) * 100) : 0}%`} />
        </div>
      )}

      {(canMarkPaid || refundable) && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {canMarkPaid && (
            <Button variant="outline" size="sm" shape="rounded" icon={<CheckCircle2 className="h-4 w-4" />} onClick={markPaid}>
              {t('markPaid')}
            </Button>
          )}
          {refundable && (
            <Tip tip={!can('orders', 'refund') && to('noPermission')}>
              <Button variant="outline" size="sm" shape="rounded" icon={<RotateCcw className="h-4 w-4" />} onClick={onRefund} disabled={!can('orders', 'refund')}>
                {t('refund')}
              </Button>
            </Tip>
          )}
        </div>
      )}

      <div className="-mx-5 mt-5 border-t border-line/70 px-5 pt-4">
        <h3 className="mb-3 text-[13.5px] font-semibold text-ink">{t('history')}</h3>
        <OrderTimeline order={order} />
      </div>
    </Card>
  );
}

/* ================================================================== */
/* Right column                                                        */
/* ================================================================== */
function CustomerCard({ order, t }: { order: Order; t: Dict }) {
  const to = useDict(od, 'admin');
  const orders = useDb((s) => s.orders);
  const can = useCan();
  const c = order.customer;
  const count = useMemo(() => {
    const key = customerKeyOf(order);
    return orders.filter((o) => customerKeyOf(o) === key).length;
  }, [orders, order]);
  const lang = useLang('admin');
  return (
    <Card title={t('customer')}>
      <div className="space-y-3 text-[13.5px]">
        <div>
          {can('customers') ? (
            <Link to={customerLink(order)} className="font-semibold text-ink hover:underline">
              {customerName(order)}
            </Link>
          ) : (
            <span className="font-semibold text-ink">{customerName(order)}</span>
          )}
          <Link to={`/admin/narudzbe?q=${encodeURIComponent(c.email || c.phone)}`} className="block text-[12.5px] text-muted hover:text-ink hover:underline">
            {to(pluralKey('orders', count, lang), { n: count })}
          </Link>
        </div>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-ink-soft">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
            {c.email ? (
              <a href={`mailto:${c.email}?subject=${encodeURIComponent(`#${order.number}`)}`} className="truncate hover:text-ink hover:underline">
                {c.email}
              </a>
            ) : (
              <span className="text-muted">{t('noEmail')}</span>
            )}
          </li>
          {c.phone && (
            <li className="flex items-center gap-2 text-ink-soft">
              <Phone className="h-3.5 w-3.5 shrink-0 text-muted" />
              <a href={`tel:${c.phone.replace(/\s+/g, '')}`} className="hover:text-ink hover:underline">
                {c.phone}
              </a>
            </li>
          )}
        </ul>
        {(c.company || c.pib) && (
          <div className="border-t border-line/70 pt-3">
            {c.company && <p className="font-medium text-ink">{c.company}</p>}
            {c.pib && (
              <p className="text-[12.5px] text-muted">
                {t('pib')}: {c.pib}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function DeliveryCard({ order, t }: { order: Order; t: Dict }) {
  const to = useDict(od, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const settings = useSettings();
  const c = order.customer;
  const pickup = order.delivery.method === 'pickup';
  const zone = pickup ? null : zoneForCity(settings, c.city);
  const f = order.fulfillment;
  return (
    <Card title={t('delivery')}>
      <div className="space-y-3 text-[13.5px]">
        <p className="flex items-center gap-2 font-medium text-ink">
          {pickup ? <Store className="h-4 w-4 text-muted" /> : <Truck className="h-4 w-4 text-muted" />}
          {tc(`delivery_${order.delivery.method}`)}
        </p>
        {pickup ? (
          <p className="text-ink-soft">{t('pickupAt', { addr: settings.pickupAddress })}</p>
        ) : (
          <div className="text-ink-soft">
            <p>{customerName(order)}</p>
            <p>{c.address}</p>
            <p>
              {c.city}, {to('country')}
            </p>
            <a href={mapsUrl(c.address, c.city)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink hover:underline">
              <MapPin className="h-3.5 w-3.5" /> {t('openMap')} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {zone && <p className="text-[12.5px] text-muted">{t('zone', { zone: zone.name, days: zone.days })}</p>}
        {order.delivery.date && (
          <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft">
            <CalendarClock className="h-3.5 w-3.5" />
            {t('deliveryDate', { date: date(order.delivery.date, lang, { weekday: 'short', day: 'numeric', month: 'short' }) })}
          </p>
        )}
        {/* pickup in store: nothing is shipped, so there is no tracking to wait for */}
        {(!pickup || f?.tracking || f?.carrier) && (
          <div className="border-t border-line/70 pt-3 text-[12.5px]">
            {f?.tracking ? (
              <p className="text-ink-soft">
                {f.carrier && <span className="font-medium text-ink">{isCarrierKey(f.carrier) ? to(`carrier_${f.carrier}`) : f.carrier} · </span>}
                {t('trackingNo', { n: f.tracking })}
              </p>
            ) : f?.carrier ? (
              <p className="text-ink-soft">{isCarrierKey(f.carrier) ? to(`carrier_${f.carrier}`) : f.carrier}</p>
            ) : (
              <p className="text-muted">{t('trackingLater')}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function NotesCard({ order, t }: { order: Order; t: Dict }) {
  const can = useCan();
  const updateOrder = useDb((s) => s.updateOrder);
  const editable = can('orders', 'edit');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(order.internalNote ?? '');
  const [tag, setTag] = useState('');
  const tags = order.tags ?? [];

  useEffect(() => setDraft(order.internalNote ?? ''), [order.internalNote]);

  const saveNote = () => {
    updateOrder(order.id, { internalNote: draft.trim() || undefined });
    setEditing(false);
    toast.success(t('noteSaved'));
  };
  const addTag = () => {
    const v = tag.trim().toLowerCase();
    if (!v || tags.includes(v)) return setTag('');
    updateOrder(order.id, { tags: [...tags, v] });
    setTag('');
  };

  return (
    <Card
      title={t('notes')}
      actions={
        editable && !editing ? (
          <button type="button" onClick={() => setEditing(true)} className="text-[12.5px] font-semibold text-ink-soft hover:text-ink hover:underline">
            {order.internalNote ? t('editNote') : <span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" />{t('internalNote')}</span>}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3 text-[13.5px]">
        {order.customer.note && (
          <div>
            <Eyebrow>{t('customerNote')}</Eyebrow>
            <p className="mt-1 whitespace-pre-line text-ink">{order.customer.note}</p>
          </div>
        )}
        {editing ? (
          <div>
            <Eyebrow>{t('internalNote')}</Eyebrow>
            <textarea
              autoFocus
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-1 w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[13.5px] leading-relaxed outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="xs"
                shape="rounded"
                onClick={() => {
                  setEditing(false);
                  setDraft(order.internalNote ?? '');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="xs" shape="rounded" onClick={saveNote}>
                {t('save')}
              </Button>
            </div>
          </div>
        ) : (
          order.internalNote && (
            <div>
              <Eyebrow>{t('internalNote')}</Eyebrow>
              <p className="mt-1 whitespace-pre-line text-ink">{order.internalNote}</p>
            </div>
          )
        )}
        {!order.customer.note && !order.internalNote && !editing && <p className="text-muted">{t('noNotes')}</p>}

        <div className="border-t border-line/70 pt-3">
          <Eyebrow>{t('tags')}</Eyebrow>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((tg) => (
              <span key={tg} className="inline-flex h-6 items-center gap-1 rounded-md bg-[#EBEBEB] pl-2 pr-1 text-[12px] font-medium text-ink">
                {tg}
                {editable && (
                  <button type="button" aria-label={`× ${tg}`} onClick={() => updateOrder(order.id, { tags: tags.filter((x) => x !== tg) })} className="grid h-4 w-4 place-items-center rounded hover:bg-black/10">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {editable && (
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder={t('addTag')}
                className="h-6 min-w-[110px] flex-1 rounded-md border border-dashed border-line bg-transparent px-2 text-[12px] outline-none focus:border-ink/40"
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function DiscountCard({ order, t }: { order: Order; t: Dict }) {
  const to = useDict(od, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const discounts = useDb((s) => s.discounts);
  const applied = order.discounts ?? [];
  const legacy = !applied.length && order.coupon?.code ? order.coupon : null;
  return (
    <Card title={t('discount')}>
      {applied.length === 0 && !legacy ? (
        <p className="text-[13.5px] text-muted">{t('noDiscount')}</p>
      ) : (
        <ul className="space-y-2.5 text-[13.5px]">
          {legacy && (
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                {to('code')} <CodeChip>{legacy.code}</CodeChip>
              </span>
              <span className="tabular-nums text-ink">−{money(legacy.discount, lang)}</span>
            </li>
          )}
          {applied.map((d) => {
            const exists = discounts.some((x) => x.id === d.id);
            const name = discountName(d.id, d.title, discounts, lang);
            return (
              <li key={d.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-ink-soft">
                    {d.code ? (
                      <>
                        {to('code')} <CodeChip>{d.code}</CodeChip>
                      </>
                    ) : (
                      to('auto')
                    )}
                  </span>
                  {exists && can('discounts') ? (
                    <Link to={`/admin/popusti/${d.id}`} className="mt-0.5 block truncate text-[12.5px] text-muted hover:text-ink hover:underline">
                      {name}
                    </Link>
                  ) : (
                    <span className="mt-0.5 block truncate text-[12.5px] text-muted">{name}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-ink">−{money(d.amount, lang)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ReturnsCard({ order, t }: { order: Order; t: Dict }) {
  const lang = useLang('admin');
  const can = useCan();
  const all = useDb((s) => s.returns);
  const returns = useMemo(() => all.filter((r) => r.orderId === order.id), [all, order.id]);
  if (!returns.length || !can('returns')) return null;
  return (
    <Card title={t('returns')}>
      <ul className="space-y-2.5 text-[13.5px]">
        {returns.map((r) => (
          <li key={r.id}>
            <Link to={`/admin/povrati?id=${r.id}`} className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 hover:bg-canvas">
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-semibold text-ink">{r.number}</span>
                <ReturnBadge status={r.status} />
              </span>
              <span className="shrink-0 tabular-nums text-ink-soft">{money(r.refundAmount, lang)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
