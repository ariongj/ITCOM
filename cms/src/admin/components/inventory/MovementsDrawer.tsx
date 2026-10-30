// Movement history (PDF p.15): variant, location, quantity, reason, source document, user and time —
// per product (with its committed orders and incoming purchase orders) or across the whole catalogue.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ExternalLink, History, SlidersHorizontal } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { FilterPills, OrderStatusBadge, Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { isOpenOrder } from '@/lib/orders';
import type { InventoryMovement } from '@/lib/types';
import { date, dateTime, num } from '@/lib/format';
import { cn } from '@/lib/utils';
import { inv } from './dict';
import { actorName, docTarget, isOpenPo, lineLeft, stockUnit } from './helpers';
import type { InvRow } from './useInventory';
import { DeltaQty, Gate, ReasonLabel, StockStateTag } from './ui';

type Dir = 'all' | 'in' | 'out';
const PAGE = 40;

function Section({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-5 py-4 sm:px-6">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Level({ label, value, unit, strong, hint }: { label: string; value: number; unit: string; strong?: boolean; hint: string }) {
  const lang = useLang('admin');
  return (
    <div className={cn('flex min-w-0 flex-col justify-between rounded-lg px-3 py-2.5', strong ? 'bg-ink text-white' : 'bg-white ring-1 ring-inset ring-line/80')} title={hint}>
      <div className={cn('text-[11.5px] font-semibold leading-tight', strong ? 'text-white/70' : 'text-muted')}>{label}</div>
      <div className="mt-1 text-[19px] font-bold leading-tight tabular-nums">
        {num(value, lang)} <span className={cn('text-[11px] font-medium', strong ? 'text-white/60' : 'text-muted')}>{unit}</span>
      </div>
    </div>
  );
}

export function MovementsDrawer({
  open,
  row,
  locationName,
  productLocation,
  onClose,
  onAdjust,
}: {
  open: boolean;
  /** product mode; undefined = all movements */
  row?: InvRow;
  locationName: (id?: string) => string | undefined;
  /** usual stock location (name) of a product */
  productLocation: (productId: string) => string | undefined;
  onClose: () => void;
  onAdjust: (productId: string) => void;
}) {
  const t = useDict(inv, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const movements = useDb((s) => s.movements);
  const orders = useDb((s) => s.orders);
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const returns = useDb((s) => s.returns);
  const staff = useDb((s) => s.staff);
  const products = useDb((s) => s.products);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [dir, setDir] = useState<Dir>('all');
  const [limit, setLimit] = useState(PAGE);
  const [forKey, setForKey] = useState<string | null>(null);
  const key = open ? (row?.p.id ?? '*') : null;
  if (key && key !== forKey) {
    setForKey(key);
    setDir('all');
    setLimit(PAGE);
  }

  const pid = row?.p.id;
  const all = useMemo(() => {
    const list = pid ? movements.filter((m) => m.productId === pid) : movements;
    return [...list].sort((a, b) => b.at.localeCompare(a.at));
  }, [movements, pid]);
  const list = useMemo(() => all.filter((m) => dir === 'all' || (dir === 'in' ? m.delta > 0 : m.delta < 0)), [all, dir]);

  const committedOrders = useMemo(
    () =>
      pid
        ? orders
            .filter((o) => isOpenOrder(o) && o.items.some((i) => i.productId === pid))
            .map((o) => ({ o, qty: o.items.filter((i) => i.productId === pid).reduce((s, i) => s + i.qty, 0) }))
        : [],
    [orders, pid],
  );
  const incomingPos = useMemo(
    () =>
      pid
        ? purchaseOrders
            .filter(isOpenPo)
            .map((po) => ({ po, left: po.lines.filter((x) => x.productId === pid).reduce((s, x) => s + lineLeft(x), 0) }))
            .filter((x) => x.left > 0)
        : [],
    [purchaseOrders, pid],
  );

  const ctx = { orders, purchaseOrders, returns };
  const variantOf = (m: InventoryMovement) => {
    if (m.reason === 'sale' && m.ref) {
      const line = orders.find((o) => o.number === m.ref)?.items.find((i) => i.productId === m.productId);
      if (line?.options) return line.options;
    }
    return t('mv_allVariants');
  };
  const locationOf = (m: InventoryMovement) => {
    if (m.location) return locationName(m.location);
    if (m.reason === 'received' && m.ref) {
      const po = purchaseOrders.find((x) => x.number === m.ref);
      if (po) return locationName(po.location);
    }
    return productLocation(m.productId);
  };

  const docLink = (m: InventoryMovement) => {
    if (!m.ref) return <span className="text-muted/70">—</span>;
    const target = docTarget(m.ref, ctx);
    if (!target || !can(target.module)) return <span className="font-mono text-[12px] text-ink-soft">{m.ref}</span>;
    return (
      <Link to={target.to} onClick={onClose} className="font-mono text-[12px] font-semibold text-ink underline decoration-ink/25 underline-offset-2 hover:decoration-ink">
        {m.ref}
      </Link>
    );
  };

  const p = row?.p;
  const unit = p ? stockUnit(p, lang) : '';
  const canAdjust = can('inventory', 'edit');

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[680px]"
      title={
        p ? (
          <div className="flex min-w-0 items-center gap-3">
            <Thumb src={p.images[0]} className="h-10 w-10" />
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold leading-tight text-ink">{l(p.name)}</div>
              <div className="mt-0.5 truncate text-[12px] font-medium text-muted">
                <span className="font-mono">{p.sku}</span>
                {row?.locationId && <> · {locationName(row.locationId)}</>}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="text-[16px] font-bold leading-tight text-ink">{t('mv_allTitle')}</div>
            <div className="mt-0.5 text-[12px] font-medium text-muted">{t('mv_allSub', { n: movements.length })}</div>
          </div>
        )
      }
    >
      <div className="divide-y divide-line/70 bg-white/40">
        {row && p && (
          <>
            <section className="space-y-3 px-5 py-4 sm:px-6">
              {row.lv.tracked ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Level label={t('col_onHand')} value={row.lv.onHand} unit={unit} hint={t('hint_onHand')} />
                    <Level label={t('col_committed')} value={row.lv.committed} unit={unit} hint={t('hint_committed')} />
                    <Level label={t('col_unavailable')} value={row.lv.unavailable} unit={unit} hint={t('hint_unavailable')} />
                    <Level label={t('col_available')} value={row.lv.available} unit={unit} hint={t('hint_available')} strong />
                    <Level label={t('col_incoming')} value={row.lv.incoming} unit={unit} hint={t('hint_incoming')} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] text-muted">{t('formula')}</p>
                    <StockStateTag state={row.state} />
                  </div>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  <StockStateTag state="untracked" />
                  {t('untrackedHint')}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {row.lv.tracked && (
                  <Gate allowed={canAdjust} reason={t('noPermInventory')}>
                    <Button size="sm" shape="rounded" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => onAdjust(p.id)} disabled={!canAdjust}>
                      {t('adjustStock')}
                    </Button>
                  </Gate>
                )}
                {can('products') && (
                  <ButtonLink to={`/admin/proizvodi/${p.id}`} onClick={onClose} variant="outline" size="sm" shape="rounded" icon={<ExternalLink className="h-4 w-4" />}>
                    {t('openProduct')}
                  </ButtonLink>
                )}
              </div>
            </section>

            {row.lv.tracked && (
              <Section title={t('reservedBy')} aside={<span className="text-[12px] tabular-nums text-muted">{num(row.lv.committed, lang)} {unit}</span>}>
                {committedOrders.length === 0 ? (
                  <p className="text-[13px] text-muted">{t('noOpenOrders')}</p>
                ) : (
                  <ul className="divide-y divide-line/60 rounded-lg ring-1 ring-line/80">
                    {committedOrders.map(({ o, qty }) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-[13px] first:rounded-t-lg last:rounded-b-lg">
                        <div className="min-w-0">
                          {can('orders') ? (
                            <Link to={`/admin/narudzbe/${o.id}`} onClick={onClose} className="font-semibold text-ink hover:underline">
                              {o.number}
                            </Link>
                          ) : (
                            <span className="font-semibold text-ink">{o.number}</span>
                          )}
                          <span className="ml-2 truncate text-muted">
                            {o.customer.firstName} {o.customer.lastName} · {date(o.createdAt, lang, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <OrderStatusBadge status={o.status} />
                          <span className="w-12 text-right font-bold tabular-nums">{num(qty, lang)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            )}

            {incomingPos.length > 0 && (
              <Section title={t('incomingFrom')} aside={<span className="text-[12px] tabular-nums text-muted">{num(row.lv.incoming, lang)} {unit}</span>}>
                <ul className="divide-y divide-line/60 rounded-lg ring-1 ring-line/80">
                  {incomingPos.map(({ po, left }) => (
                    <li key={po.id} className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-[13px] first:rounded-t-lg last:rounded-b-lg">
                      <div className="min-w-0">
                        {can('purchasing') ? (
                          <Link to={`/admin/nabavke?id=${po.id}`} onClick={onClose} className="font-mono font-semibold text-ink hover:underline">
                            {po.number}
                          </Link>
                        ) : (
                          <span className="font-mono font-semibold text-ink">{po.number}</span>
                        )}
                        <span className="ml-2 text-muted">
                          {po.supplier}
                          {po.expectedAt && <> · {t('expectedOn', { d: date(po.expectedAt, lang, { day: 'numeric', month: 'short' }) })}</>}
                        </span>
                      </div>
                      <span className="shrink-0 font-bold tabular-nums">+{num(left, lang)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </>
        )}

        <Section
          title={t('movements')}
          aside={<span className="text-[12px] tabular-nums text-muted">{t('mv_count', { n: list.length })}</span>}
        >
          <FilterPills<Dir>
            className="mb-3"
            value={dir}
            onChange={(v) => {
              setDir(v);
              setLimit(PAGE);
            }}
            options={[
              { id: 'all', label: t('f_mvAll'), count: all.length },
              { id: 'in', label: t('f_mvIn'), count: all.filter((m) => m.delta > 0).length },
              { id: 'out', label: t('f_mvOut'), count: all.filter((m) => m.delta < 0).length },
            ]}
          />
          {list.length === 0 ? (
            <EmptyState className="py-10" icon={<History className="h-6 w-6" />} title={t('mv_empty')} text={t('mv_emptyText')} />
          ) : (
            <>
              <ol className="divide-y divide-line/60 rounded-xl bg-white ring-1 ring-line/80">
                {list.slice(0, limit).map((m) => {
                  const prod = productById.get(m.productId);
                  const u = prod ? stockUnit(prod, lang) : '';
                  return (
                    <li key={m.id} className="grid grid-cols-[76px_1fr] gap-x-3 px-3.5 py-3 sm:grid-cols-[88px_1fr_auto]">
                      <div className="pt-px">
                        <DeltaQty delta={m.delta} className="text-[14px]" />
                        <div className="mt-0.5 pl-[18px] text-[11px] text-muted">{u}</div>
                      </div>
                      <div className="min-w-0">
                        {!row && prod && (
                          <div className="mb-0.5 flex min-w-0 items-center gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink">{l(prod.name)}</span>
                            <span className="shrink-0 font-mono text-[11.5px] text-muted">{prod.sku}</span>
                          </div>
                        )}
                        <ReasonLabel reason={m.reason} className="text-[13px]" />
                        {m.note && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{m.note}</p>}
                        <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-muted">
                          <div className="flex gap-1">
                            <dt>{t('mv_variant')}:</dt>
                            <dd className="text-ink-soft">{variantOf(m)}</dd>
                          </div>
                          <div className="flex gap-1">
                            <dt>{t('mv_location')}:</dt>
                            <dd className="text-ink-soft">{locationOf(m) ?? '—'}</dd>
                          </div>
                          <div className="flex gap-1">
                            <dt>{t('mv_user')}:</dt>
                            <dd className="text-ink-soft">{actorName(m.by, staff, t('mv_web'))}</dd>
                          </div>
                        </dl>
                      </div>
                      <div className="col-start-2 mt-1.5 flex items-center gap-3 text-[12px] text-muted sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-1">
                        <span title={t('mv_doc')}>
                          {docLink(m)}
                        </span>
                        <time dateTime={m.at} className="whitespace-nowrap tabular-nums">
                          {dateTime(m.at, lang)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {list.length > limit && (
                <div className="mt-3 text-center">
                  <Button variant="outline" size="sm" shape="rounded" onClick={() => setLimit((n) => n + PAGE)}>
                    {t('mv_more')} ({list.length - limit})
                  </Button>
                </div>
              )}
            </>
          )}
        </Section>
      </div>
    </Drawer>
  );
}
