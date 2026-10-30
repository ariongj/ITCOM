import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, PackageCheck, ShoppingCart } from 'lucide-react';
import { Card, Table, Td, Th, Thumb, Tr } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { fulfillmentOf, paymentOf } from '@/lib/orders';
import { money, num, timeAgo, unitLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Order, Product } from '@/lib/types';
import type { TopProduct } from './data';
import { FulfillmentBadge, PaymentBadge } from './badges';
import { D } from './i18n';

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */
export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-1 whitespace-nowrap rounded-md text-[13px] font-semibold text-ink hover:underline hover:underline-offset-4">
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-[#f1f1f1] text-ink-soft">{icon}</span>
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-[13px] text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent orders (PDF p.08: Porosia · Klienti · Pagesa · Përmbushja · Totali) */
/* ------------------------------------------------------------------ */
export function RecentOrders({ orders, unseen, className }: { orders: Order[]; unseen: number; className?: string }) {
  const t = useDict(D, 'admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const open = (o: Order) => navigate(`/admin/narudzbe/${o.id}`);

  return (
    <Card
      className={className}
      title={t('recent_title')}
      description={unseen ? t('recent_unseen', { n: unseen }) : t('recent_all_seen')}
      actions={<CardLink to="/admin/narudzbe">{t('all_orders')}</CardLink>}
      padded={false}
    >
      {orders.length === 0 ? (
        <Empty icon={<ShoppingCart className="h-5 w-5" />} title={t('no_orders')} text={t('no_orders_text')} />
      ) : (
        <>
          {/* ≥ md: compact table */}
          <Table className="hidden md:block">
            <thead>
              <tr>
                <Th>{t('col_order')}</Th>
                <Th>{t('col_customer')}</Th>
                <Th>{t('col_payment')}</Th>
                <Th>{t('col_fulfillment')}</Th>
                <Th className="text-right">{t('col_total')}</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Tr key={o.id} onClick={() => open(o)} className="[&:last-child>td]:border-b-0">
                  <Td className="w-[130px]">
                    <Link to={`/admin/narudzbe/${o.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-ink hover:underline hover:underline-offset-4">
                      {o.number}
                      {!o.seen && (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink" title={t('unseen')}>
                          <span className="sr-only">{t('unseen')}</span>
                        </span>
                      )}
                    </Link>
                    <span className="block text-[12px] text-muted">{timeAgo(o.createdAt, lang)}</span>
                  </Td>
                  <Td className="max-w-[220px]">
                    <span className={cn('block truncate', o.seen ? 'font-medium' : 'font-semibold')}>
                      {o.customer.firstName} {o.customer.lastName}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{o.customer.city}</span>
                  </Td>
                  <Td>
                    <PaymentBadge state={paymentOf(o)} />
                  </Td>
                  <Td>
                    <FulfillmentBadge state={fulfillmentOf(o)} />
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">{money(o.total, lang)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          {/* < md: stacked rows */}
          <ul className="divide-y divide-line/70 md:hidden">
            {orders.map((o) => (
              <li key={o.id}>
                <Link to={`/admin/narudzbe/${o.id}`} className="block px-4 py-3 transition-colors active:bg-[#f5f5f5]">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold tabular-nums text-ink">
                      {o.number}
                      {!o.seen && (
                        <span className="h-1.5 w-1.5 rounded-full bg-ink">
                          <span className="sr-only">{t('unseen')}</span>
                        </span>
                      )}
                    </span>
                    <span className="text-[14px] font-semibold tabular-nums text-ink">{money(o.total, lang)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted">
                    {o.customer.firstName} {o.customer.lastName} · {o.customer.city} · {timeAgo(o.createdAt, lang)}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <PaymentBadge state={paymentOf(o)} />
                    <FulfillmentBadge state={fulfillmentOf(o)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Top products                                                        */
/* ------------------------------------------------------------------ */
export function TopProducts({ rows, products, periodLabel, linkable, className }: { rows: TopProduct[]; products: Product[]; periodLabel: string; linkable: boolean; className?: string }) {
  const t = useDict(D, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const byId = new Map(products.map((p) => [p.id, p]));
  const max = rows[0]?.net || 1;
  return (
    <Card
      className={className}
      title={t('top_title')}
      description={t('top_desc', { p: periodLabel })}
      actions={linkable ? <CardLink to="/admin/proizvodi">{t('all_products')}</CardLink> : undefined}
      padded={false}
    >
      {rows.length === 0 ? (
        <Empty icon={<PackageCheck className="h-5 w-5" />} title={t('no_sales')} text={t('no_sales_text')} />
      ) : (
        <ol className="divide-y divide-line/70">
          {rows.map((r, i) => {
            const p = byId.get(r.productId);
            const name = p ? l(p.name) : r.name;
            const units = `${num(r.units, lang, 1)} ${unitLabel(r.unit, lang)}`;
            const inner = (
              <>
                <span className="w-4 shrink-0 text-center text-[12px] font-semibold tabular-nums text-muted">{i + 1}</span>
                <Thumb src={p?.images[0] ?? r.image} className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium text-ink" title={name}>
                      {name}
                    </span>
                    <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink">{money(r.net, lang, { decimals: false })}</span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#efefef]">
                      <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.max(3, (r.net / max) * 100)}%` }} />
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-right text-[12px] tabular-nums text-muted">
                      {units} {t('sold')}
                    </span>
                  </span>
                </span>
              </>
            );
            return (
              <li key={r.productId}>
                {p && linkable ? (
                  <Link to={`/admin/proizvodi/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f7f7f7]">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
