// Operational reports (PDF p.38, col. 02): what needs doing now — each card links to the filtered list.
import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CalendarClock, CircleDollarSign, Hourglass, PackageMinus, PackageX, RotateCcw, Truck, UserX, PackageOpen, ArrowLeftRight } from 'lucide-react';
import { OrderStatusBadge } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useCan } from '@/store/hooks';
import { money, timeAgo } from '@/lib/format';
import { paymentOf } from '@/lib/orders';
import type { Module } from '@/lib/permissions';
import type { Booking, Inquiry, Order, Product, ReturnRequest, Service, Staff } from '@/lib/types';
import { cn } from '@/lib/utils';
import { A } from './i18n';
import { InfoTip, StatusMark } from './ui';
import { fmtDateTime, fmtDayYear } from './fmt';
import type { Ops } from './metrics';

const LIST_N = 4;

interface Item {
  key: string;
  title: ReactNode;
  meta?: ReactNode;
  right?: ReactNode;
  to?: string;
}

export function Operational({ ops, services, staff }: { ops: Ops; services: Service[]; staff: Staff[] }) {
  const t = useDict(A, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const can = useCan();
  const svc = new Map(services.map((s) => [s.id, s]));
  const who = new Map(staff.map((s) => [s.id, s]));

  const productItem = (p: Product): Item => ({
    key: p.id,
    title: l(p.name),
    meta: p.sku,
    right: <span className="font-semibold tabular-nums text-ink">{t('avail_n', { n: Math.max(0, p.stock - (p.unavailable ?? 0)) })}</span>,
    to: `/admin/proizvodi/${p.id}`,
  });
  const orderItem = (o: Order, right: ReactNode): Item => ({
    key: o.id,
    title: (
      <>
        <span className="font-mono text-[12.5px]">{o.number}</span> · {o.customer.firstName} {o.customer.lastName}
      </>
    ),
    meta: timeAgo(o.createdAt, lang),
    right,
    to: `/admin/narudzbe/${o.id}`,
  });
  const inquiryItem = (q: Inquiry): Item => ({
    key: q.id,
    title: q.name,
    meta: [tc(`inq_${q.type}`), q.service, q.city].filter(Boolean).join(' · '),
    right: <span className="text-[12px] text-muted">{timeAgo(q.createdAt, lang)}</span>,
    to: `/admin/kontakti?id=${q.id}`,
  });
  const bookingItem = (b: Booking): Item => ({
    key: b.id,
    title: b.customerName,
    meta: [svc.get(b.serviceId) ? l(svc.get(b.serviceId)!.name) : '', who.get(b.staffId)?.name].filter(Boolean).join(' · '),
    right: <span className="whitespace-nowrap text-[12px] font-semibold text-ink-soft">{fmtDateTime(b.start, lang)}</span>,
    to: `/admin/termini?id=${b.id}`,
  });
  const returnItem = (r: ReturnRequest): Item => ({
    key: r.id,
    title: <span className="font-mono text-[12.5px]">{r.number}</span>,
    meta: r.reason,
    right: <span className="font-semibold tabular-nums">{money(r.refundAmount, lang)}</span>,
    to: '/admin/povrati',
  });
  const payLabel = (o: Order) => {
    const s = paymentOf(o);
    return t(s === 'failed' ? 'pay_failed' : s === 'authorized' ? 'pay_authorized' : 'pay_pending');
  };

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">{t('ops_note')}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OpsCard
          icon={PackageMinus}
          title={t('op_low')}
          def={t('d_low')}
          count={ops.lowStock.length}
          items={ops.lowStock.map(productItem)}
          module="products"
          links={[{ to: '/admin/proizvodi?zalihe=low', label: t('open_list') }]}
          footer={
            can('inventory', 'view') ? (
              <Link to="/admin/inventar" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                {t('movements', { n: ops.movements7 })}
              </Link>
            ) : undefined
          }
        />
        <OpsCard icon={PackageX} title={t('op_out')} def={t('d_out')} count={ops.outOfStock.length} items={ops.outOfStock.map(productItem)} module="products" links={[{ to: '/admin/proizvodi?zalihe=low', label: t('open_list') }]} />
        <OpsCard
          icon={Truck}
          title={t('op_incoming')}
          def={t('d_incoming')}
          count={ops.incoming.length}
          countSuffix={ops.incomingUnits ? t('units_n', { n: ops.incomingUnits }) : undefined}
          items={ops.incoming.map(({ po, units }) => ({
            key: po.id,
            title: (
              <>
                <span className="font-mono text-[12.5px]">{po.number}</span> · {po.supplier}
              </>
            ),
            meta: t('po_line', { n: units, date: po.expectedAt ? fmtDayYear(po.expectedAt, lang) : '—' }),
            right: (
              <StatusMark state={po.status === 'partial' ? 'partial' : 'off'} className="text-[11.5px]">
                {t(po.status === 'partial' ? 'po_partial' : 'po_sent')}
              </StatusMark>
            ),
            to: '/admin/nabavke',
          }))}
          module="purchasing"
          links={[{ to: '/admin/nabavke', label: t('open_list') }]}
        />
        <OpsCard
          icon={PackageOpen}
          title={t('op_unfulfilled')}
          def={t('d_unfulfilled')}
          count={ops.unfulfilled.length}
          items={ops.unfulfilled.map((o) => orderItem(o, <OrderStatusBadge status={o.status} />))}
          module="orders"
          links={(['new', 'confirmed', 'processing'] as const).filter((s) => ops.unfulfilledBy[s] > 0).map((s) => ({ to: `/admin/narudzbe?status=${s}`, label: `${tc(`status_${s}`)} · ${ops.unfulfilledBy[s]}` }))}
        />
        <OpsCard
          icon={CircleDollarSign}
          title={t('op_payments')}
          def={t('d_payments')}
          count={ops.pendingPayments.length}
          countSuffix={ops.pendingPayments.length ? money(ops.pendingAmount, lang, { decimals: false }) : undefined}
          items={ops.pendingPayments.map((o) =>
            orderItem(
              o,
              <span className="flex flex-col items-end">
                <span className="font-semibold tabular-nums text-ink">{money(o.total, lang)}</span>
                <StatusMark state={paymentOf(o) === 'failed' ? 'bad' : 'partial'} className="text-[11.5px]">
                  {payLabel(o)}
                </StatusMark>
              </span>,
            ),
          )}
          module="orders"
          links={[{ to: '/admin/narudzbe', label: t('open_list') }]}
        />
        <OpsCard
          icon={UserX}
          title={t('op_unassigned')}
          def={t('d_unassigned')}
          count={ops.unassigned.length}
          items={ops.unassigned.map(inquiryItem)}
          module="contacts"
          links={[{ to: '/admin/kontakti', label: t('open_list') }]}
        />
        <OpsCard
          icon={CalendarClock}
          title={t('op_bookings')}
          def={t('d_bookings')}
          count={ops.pendingBookings.length}
          items={ops.pendingBookings.map(bookingItem)}
          module="appointments"
          links={[{ to: '/admin/termini', label: t('open_list') }]}
        />
        <OpsCard
          icon={Hourglass}
          title={t('op_expiring')}
          def={t('d_expiring')}
          count={ops.expiring.length}
          items={ops.expiring.map((e) => ({
            key: e.id,
            title: typeof e.name === 'string' ? e.name : l(e.name),
            meta: t(e.kind === 'offer' ? 'kind_offer' : 'kind_discount'),
            right: <span className="whitespace-nowrap text-[12px] font-semibold text-ink-soft">{t('ends', { date: fmtDateTime(e.endsAt, lang) })}</span>,
            to: e.kind === 'offer' ? `/admin/ponude/${e.id}` : `/admin/popusti/${e.id}`,
          }))}
          module={null}
          moduleFor={(it) => (it.to?.startsWith('/admin/ponude') ? 'offers' : 'discounts')}
          links={[
            { to: '/admin/ponude', label: t('kind_offer'), module: 'offers' },
            { to: '/admin/popusti', label: t('kind_discount'), module: 'discounts' },
          ]}
        />
        <OpsCard icon={RotateCcw} title={t('op_returns')} def={t('d_returnsOpen')} count={ops.openReturns.length} items={ops.openReturns.map(returnItem)} module="returns" links={[{ to: '/admin/povrati', label: t('open_list') }]} />
      </div>
    </div>
  );
}

function OpsCard({
  icon: Icon,
  title,
  def,
  count,
  countSuffix,
  items,
  module,
  moduleFor,
  links,
  footer,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  def: string;
  count: number;
  countSuffix?: string;
  items: Item[];
  module: Module | null;
  moduleFor?: (it: Item) => Module;
  links: { to: string; label: string; module?: Module }[];
  footer?: ReactNode;
}) {
  const t = useDict(A, 'admin');
  const can = useCan();
  const allowed = (m: Module | null | undefined) => !m || can(m, 'view');
  const shown = items.slice(0, LIST_N);
  const visibleLinks = links.filter((x) => allowed(x.module ?? module));
  return (
    <section className="flex flex-col rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <Icon className="h-4 w-4 shrink-0 text-ink-soft" />
            <span className="truncate">{title}</span>
            <InfoTip title={t('how')}>{def}</InfoTip>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[26px] font-bold leading-tight tracking-tight text-ink">{count}</span>
            {countSuffix && <span className="text-[13px] font-semibold text-muted">{countSuffix}</span>}
          </div>
        </div>
        {count === 0 && <StatusMark state="on" className="mt-1">{t('all_clear')}</StatusMark>}
      </header>
      <ul className="mt-2 flex-1 px-2">
        {shown.map((it) => {
          const m = moduleFor ? moduleFor(it) : module;
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{it.title}</span>
                {it.meta && <span className="block truncate text-[12px] text-muted">{it.meta}</span>}
              </span>
              {it.right && <span className="shrink-0 text-right text-[12.5px]">{it.right}</span>}
            </>
          );
          const cls = 'flex items-center gap-3 rounded-lg px-3 py-2';
          return (
            <li key={it.key}>
              {it.to && allowed(m) ? (
                <Link to={it.to} className={cn(cls, 'transition-colors hover:bg-canvas')}>
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
        {items.length > LIST_N && <li className="px-3 pb-1 pt-0.5 text-[12px] text-muted">{t('more_n', { n: items.length - LIST_N })}</li>}
      </ul>
      {(visibleLinks.length > 0 || footer) && (
        <footer className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line/70 px-5 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {visibleLinks.map((x) => (
              <Link key={x.to} to={x.to} className="inline-flex h-7 items-center gap-1 rounded-md bg-canvas px-2.5 text-[12px] font-semibold text-ink-soft ring-1 ring-line/70 transition-colors hover:bg-white hover:text-ink">
                {x.label}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ))}
          </div>
          {footer}
        </footer>
      )}
    </section>
  );
}
