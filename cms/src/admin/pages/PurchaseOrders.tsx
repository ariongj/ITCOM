// Furnizimet — CMS proposal p.16: purchase orders from suppliers (draft / sent / partially received / closed),
// editor at ?id=<po> (?id=novi = new), receiving with differences, and the Transfers explainer.
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CircleAlert, ClipboardList, PackageOpen, Plus, Truck, Wallet } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, FilterPills, PageHeader, SearchInput, Table, Td, Th, Tr } from '@/admin/components/kit';
import { inv } from '@/admin/components/inventory/dict';
import { PO_STATUSES, isOpenPo, isOverdue, poLeft } from '@/admin/components/inventory/helpers';
import { Gate, PoStatusTag, ReceiveBar, Stat, Tag } from '@/admin/components/inventory/ui';
import { PurchaseOrderEditor } from '@/admin/components/inventory/PurchaseOrderEditor';
import { TransfersCard } from '@/admin/components/inventory/TransfersCard';
import { useDict, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { purchaseOrderTotals } from '@/lib/inventory';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/lib/types';
import { date, money, moneyCompact, num } from '@/lib/format';
import { fold } from '@/lib/search';

type StatusF = 'all' | PurchaseOrderStatus;

export default function PurchaseOrders() {
  const [params] = useSearchParams();
  const id = params.get('id');
  if (id) return <PurchaseOrderEditor key={id} id={id} />;
  return <PurchaseOrderList />;
}

function PurchaseOrderList() {
  const t = useDict(inv, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const locations = useDb((s) => s.settings.locations);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = ((['all', ...PO_STATUSES] as string[]).includes(params.get('status') ?? '') ? params.get('status') : 'all') as StatusF;
  const setParam = (k: string, v: string) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        if (!v || v === 'all') n.delete(k);
        else n.set(k, v);
        return n;
      },
      { replace: true },
    );

  const canEdit = can('purchasing', 'edit');
  const canCost = can('purchasing', 'viewCost');
  const locName = (lid: string) => locations.find((x) => x.id === lid)?.name ?? '—';

  const sorted = useMemo(
    () =>
      [...purchaseOrders].sort((a, b) => {
        // open first, then newest
        const rank = (p: PurchaseOrder) => (isOpenPo(p) ? 0 : p.status === 'draft' ? 1 : 2);
        return rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt);
      }),
    [purchaseOrders],
  );
  const base = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) return sorted;
    return sorted.filter((p) => {
      const hay = fold(`${p.number} ${p.supplier} ${p.reference ?? ''} ${p.note ?? ''}`);
      return terms.every((x) => hay.includes(x));
    });
  }, [sorted, q]);
  const list = useMemo(() => base.filter((p) => status === 'all' || p.status === status), [base, status]);
  const counts = useMemo(() => Object.fromEntries((['all', ...PO_STATUSES] as StatusF[]).map((s) => [s, base.filter((p) => s === 'all' || p.status === s).length])) as Record<StatusF, number>, [base]);

  const kpi = useMemo(() => {
    const open = purchaseOrders.filter(isOpenPo);
    return {
      open: open.length,
      units: open.reduce((s, p) => s + poLeft(p), 0),
      value: open.reduce((s, p) => s + p.lines.reduce((v, x) => v + Math.max(0, x.ordered - x.received - x.rejected) * x.cost, 0), 0),
      overdue: purchaseOrders.filter((p) => isOverdue(p)).length,
    };
  }, [purchaseOrders]);

  const open = (p: PurchaseOrder) => navigate(`/admin/nabavke?id=${p.id}`);
  const expected = (p: PurchaseOrder) => (p.expectedAt ? date(p.expectedAt, lang, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="space-y-5 pb-16">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_products'), to: '/admin/proizvodi' }, ta('nav_purchasing')]}
        title={t('po_title')}
        description={t('po_subtitle')}
        actions={
          <Gate allowed={canEdit} reason={t('ed_noPermEdit')}>
            <ButtonLink to="/admin/nabavke?id=novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} aria-disabled={!canEdit} tabIndex={canEdit ? undefined : -1}>
              {t('po_new')}
            </ButtonLink>
          </Gate>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ClipboardList} label={t('po_kpiOpen')} value={kpi.open} hint={t('po_kpiOpenHint')} />
        <Stat icon={Truck} label={t('po_kpiUnits')} value={num(kpi.units, lang)} hint={t('po_kpiUnitsHint')} />
        {canCost ? (
          <Stat icon={Wallet} label={t('po_kpiValue')} value={moneyCompact(kpi.value, lang)} hint={t('po_kpiValueHint')} />
        ) : (
          <Stat icon={Wallet} label={t('po_kpiValue')} value={<span className="text-muted">—</span>} hint={t('ed_supplierHint')} />
        )}
        <Stat icon={CircleAlert} tone={kpi.overdue ? 'red' : undefined} label={t('po_kpiOverdue')} value={kpi.overdue} hint={t('po_kpiOverdueHint')} />
      </div>

      <Card padded={false}>
        <div className="space-y-3 border-b border-line/70 p-4 sm:p-5">
          <FilterPills<StatusF>
            value={status}
            onChange={(v) => setParam('status', v)}
            options={(['all', ...PO_STATUSES] as StatusF[]).map((s) => ({ id: s, label: s === 'all' ? t('f_all') : t(`st_${s}`), count: counts[s] }))}
          />
          <SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder={t('po_searchPh')} />
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title={t('po_emptyTitle')}
            text={t('po_emptyText')}
            action={
              q || status !== 'all' ? (
                <Button
                  variant="outline"
                  shape="rounded"
                  size="sm"
                  onClick={() =>
                    setParams(
                      (prev) => {
                        const n = new URLSearchParams(prev);
                        n.delete('q');
                        n.delete('status');
                        return n;
                      },
                      { replace: true },
                    )
                  }
                >
                  {t('clearFilters')}
                </Button>
              ) : (
                canEdit && (
                  <ButtonLink to="/admin/nabavke?id=novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />}>
                    {t('po_new')}
                  </ButtonLink>
                )
              )
            }
          />
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t('po_number')}</Th>
                  <Th>{t('po_supplier')}</Th>
                  <Th className="max-xl:hidden">{t('po_destination')}</Th>
                  <Th>{t('po_status')}</Th>
                  <Th>{t('po_received')}</Th>
                  <Th>{t('po_expected')}</Th>
                  {canCost && <Th className="text-right">{t('po_total')}</Th>}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const tot = purchaseOrderTotals(p);
                  const late = isOverdue(p);
                  return (
                    <Tr key={p.id} onClick={() => open(p)}>
                      <Td>
                        <div className="font-mono text-[13px] font-semibold text-ink">{p.number}</div>
                        <div className="mt-0.5 font-mono text-[11.5px] text-muted">{p.reference || '—'}</div>
                      </Td>
                      <Td>
                        <div className="font-semibold text-ink">{p.supplier}</div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {t('po_lines', { n: p.lines.length })} · {ta('created')} {date(p.createdAt, lang, { day: 'numeric', month: 'short' })}
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft max-xl:hidden">{locName(p.location)}</Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          <PoStatusTag status={p.status} />
                          {late && (
                            <Tag icon={CircleAlert} tone="red">
                              {t('po_overdue')}
                            </Tag>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <div className="w-[140px]">
                          <div className="text-[13px] tabular-nums">
                            <span className="font-semibold text-ink">{num(tot.received, lang)}</span>
                            <span className="text-muted"> / {num(tot.ordered, lang)}</span>
                            {tot.rejected > 0 && <span className="ml-1.5 text-[12px] font-semibold text-red-700">−{num(tot.rejected, lang)}</span>}
                          </div>
                          <ReceiveBar className="mt-1" ordered={tot.ordered} received={tot.received} rejected={tot.rejected} />
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft">{p.status === 'closed' ? <span className="text-muted">—</span> : expected(p)}</Td>
                      {canCost && <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(tot.cost, lang)}</Td>}
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            <ul className="divide-y divide-line/70 md:hidden">
              {list.map((p) => {
                const tot = purchaseOrderTotals(p);
                const late = isOverdue(p);
                return (
                  <li key={p.id} onClick={() => open(p)} className="cursor-pointer space-y-2.5 px-4 py-4 transition-colors active:bg-canvas">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-[13px] font-semibold text-ink">{p.number}</div>
                        <div className="mt-0.5 truncate text-[14px] font-semibold text-ink">{p.supplier}</div>
                        <div className="mt-0.5 text-[12px] text-muted">
                          {locName(p.location)} · {t('po_lines', { n: p.lines.length })}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <PoStatusTag status={p.status} />
                        {late && (
                          <Tag icon={CircleAlert} tone="red">
                            {t('po_overdue')}
                          </Tag>
                        )}
                      </div>
                    </div>
                    <ReceiveBar ordered={tot.ordered} received={tot.received} rejected={tot.rejected} />
                    <div className="flex items-center justify-between gap-2 text-[12.5px] text-muted">
                      <span className="tabular-nums">
                        {t('ed_progress', { r: num(tot.received, lang), o: num(tot.ordered, lang) })}
                        {tot.rejected > 0 && <span className="ml-1 font-semibold text-red-700">· {t('ed_rejectedN', { n: tot.rejected })}</span>}
                      </span>
                      {canCost ? <span className="font-semibold tabular-nums text-ink">{money(tot.cost, lang)}</span> : p.status !== 'closed' && <span>{expected(p)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-line/70 px-5 py-3.5 text-[13px] text-muted">{t('showing', { n: list.length, total: purchaseOrders.length })}</div>
          </>
        )}
      </Card>

      <TransfersCard />
    </div>
  );
}
