// Inventari — CMS proposal p.15: per-product levels (on hand / committed / unavailable / available / incoming),
// location, filters, "Korrigjo stokun" with reason + note, and a movement history drawer.
import { useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowUpDown, Ban, Boxes, Download, History, Lock, MapPin, PackageSearch, Plus, SlidersHorizontal, TriangleAlert, Truck, Wallet } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, FilterPills, PageHeader, SearchInput, Table, Td, Th, Thumb, Tr } from '@/admin/components/kit';
import { inv } from '@/admin/components/inventory/dict';
import { useInventoryRows, type InvRow } from '@/admin/components/inventory/useInventory';
import { LOW_STOCK, isOpenPo, stockUnit, toCsv, variantCount } from '@/admin/components/inventory/helpers';
import { Gate, IconBtn, SelectField, Stat, StockStateTag } from '@/admin/components/inventory/ui';
import { AdjustDialog } from '@/admin/components/inventory/AdjustDialog';
import { MovementsDrawer } from '@/admin/components/inventory/MovementsDrawer';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { money, num } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, download } from '@/lib/utils';

type Filter = 'all' | 'low' | 'out' | 'untracked' | 'incoming';
type Sort = 'name' | 'available' | 'onHand' | 'incoming';
const FILTERS: Filter[] = ['all', 'low', 'out', 'untracked', 'incoming'];
const COLLATOR: Record<string, string> = { me: 'sr-Latn', sq: 'sq', en: 'en' };

const matches = (r: InvRow, f: Filter) =>
  f === 'all' ||
  (f === 'low' && r.state === 'low') ||
  (f === 'out' && r.state === 'out') ||
  (f === 'untracked' && r.state === 'untracked') ||
  (f === 'incoming' && r.lv.incoming > 0);

/** Column header with an explanation on hover (title) — the proposal's definitions. */
function HintTh({ children, hint, className }: { children: ReactNode; hint: string; className?: string }) {
  return (
    <Th className={cn('px-3! text-right', className)} title={hint}>
      <span className="cursor-help underline decoration-dotted decoration-ink/25 underline-offset-[3px]">{children}</span>
    </Th>
  );
}

function Qty({ n, muted, strong, unit }: { n: number; muted?: boolean; strong?: boolean; unit?: string }) {
  const lang = useLang('admin');
  return (
    <span className={cn('tabular-nums', strong ? 'text-[14.5px] font-bold text-ink' : 'font-medium', muted && n === 0 && 'text-muted/60')}>
      {num(n, lang)}
      {unit && <span className="ml-1 text-[11.5px] font-medium text-muted">{unit}</span>}
    </span>
  );
}

export default function Inventory() {
  const t = useDict(inv, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const rowsAll = useInventoryRows();
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const locations = useDb((s) => s.settings.locations);

  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const filter = (FILTERS.includes(params.get('f') as Filter) ? params.get('f') : 'all') as Filter;
  const loc = params.get('lok') ?? 'all';
  const sort = (params.get('sort') ?? 'name') as Sort;
  const drawerPid = params.get('p');
  const allMovesOpen = params.get('mv') === 'all';
  const adjustPid = params.get('korigjo');
  const setParam = useCallback(
    (patch: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '' || v === 'all' || (k === 'sort' && v === 'name')) n.delete(k);
            else n.set(k, v);
          }
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );

  const locName = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      return locations.find((x) => x.id === id)?.name;
    },
    [locations],
  );

  const rows = useMemo(() => rowsAll.filter((r) => r.p.status !== 'archived'), [rowsAll]);
  const archivedCount = rowsAll.length - rows.length;
  const rowById = useMemo(() => new Map(rowsAll.map((r) => [r.p.id, r])), [rowsAll]);

  // search + location (pills show live counts for these)
  const base = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (loc !== 'all' && r.locationId !== loc) return false;
      if (terms.length) {
        const hay = fold(`${r.p.name.me} ${r.p.name.sq} ${r.p.name.en} ${r.p.sku} ${r.p.vendor ?? ''}`);
        if (!terms.every((x) => hay.includes(x))) return false;
      }
      return true;
    });
  }, [rows, q, loc]);

  const list = useMemo(() => {
    const coll = new Intl.Collator(COLLATOR[lang] ?? 'en');
    const out = base.filter((r) => matches(r, filter));
    const byName = (a: InvRow, b: InvRow) => coll.compare(l(a.p.name), l(b.p.name));
    const trackedFirst = (a: InvRow, b: InvRow) => Number(!a.lv.tracked) - Number(!b.lv.tracked);
    const cmp: Record<Sort, (a: InvRow, b: InvRow) => number> = {
      name: byName,
      available: (a, b) => trackedFirst(a, b) || a.lv.available - b.lv.available || byName(a, b),
      onHand: (a, b) => trackedFirst(a, b) || b.lv.onHand - a.lv.onHand || byName(a, b),
      incoming: (a, b) => b.lv.incoming - a.lv.incoming || byName(a, b),
    };
    return [...out].sort(cmp[sort] ?? byName);
  }, [base, filter, sort, l, lang]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, base.filter((r) => matches(r, f)).length])) as Record<Filter, number>, [base]);

  const kpi = useMemo(() => {
    const tracked = rows.filter((r) => r.lv.tracked);
    return {
      tracked: tracked.length,
      units: tracked.reduce((s, r) => s + r.lv.onHand, 0),
      value: tracked.reduce((s, r) => s + r.lv.onHand * (r.p.cost ?? 0), 0),
      low: rows.filter((r) => r.state === 'low').length,
      out: rows.filter((r) => r.state === 'out').length,
      incoming: rows.reduce((s, r) => s + r.lv.incoming, 0),
      openPos: purchaseOrders.filter(isOpenPo).length,
    };
  }, [rows, purchaseOrders]);

  const canEdit = can('inventory', 'edit');
  const canExport = can('inventory', 'export');
  const canCost = can('inventory', 'viewCost');
  const filtersActive = !!q || filter !== 'all' || loc !== 'all';
  const clearFilters = () => setParam({ q: null, f: null, lok: null });
  const toggleFilter = (f: Filter) => setParam({ f: filter === f ? null : f });

  const openHistory = (id: string) => setParam({ p: id, mv: null });
  const openAdjust = (id: string) => canEdit && setParam({ korigjo: id });

  const exportCsv = () => {
    const header = [t('col_sku'), t('col_product'), t('col_onHand'), t('col_committed'), t('col_unavailable'), t('col_available'), t('col_incoming'), t('col_location'), ...(canCost ? ['EUR / unit'] : [])];
    const body = list.map((r) => [
      r.p.sku,
      l(r.p.name),
      r.lv.tracked ? r.lv.onHand : t('untracked'),
      r.lv.committed,
      r.lv.unavailable,
      r.lv.tracked ? r.lv.available : t('untracked'),
      r.lv.incoming,
      locName(r.locationId) ?? '',
      ...(canCost ? [String(r.p.cost ?? '').replace('.', lang === 'en' ? '.' : ',')] : []),
    ]);
    download(`inventar-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...body]), 'text/csv;charset=utf-8');
    toast.success(t('exported'), { description: t('showing', { n: list.length, total: rows.length }) });
  };

  const sub = (r: InvRow) => {
    const v = variantCount(r.p);
    const bits: ReactNode[] = [];
    if (r.p.status === 'draft')
      bits.push(
        <span key="d" className="rounded bg-ink/[0.06] px-1.5 py-px text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
          {t('draftTag')}
        </span>,
      );
    if (v > 1) bits.push(<span key="v">{t('variants', { n: v })}</span>);
    bits.push(<span key="u">{stockUnit(r.p, lang)}</span>);
    return bits;
  };

  const adjustBtn = (r: InvRow, full?: boolean) =>
    r.lv.tracked ? (
      <Gate allowed={canEdit} reason={t('noPermInventory')}>
        <Button
          variant="outline"
          size="xs"
          shape="rounded"
          className={cn('bg-white', full && 'w-full')}
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          disabled={!canEdit}
          onClick={(e) => {
            e.stopPropagation();
            openAdjust(r.p.id);
          }}
        >
          {t('adjust')}
        </Button>
      </Gate>
    ) : null;

  const drawerRow = drawerPid ? rowById.get(drawerPid) : undefined;
  const adjustRow = adjustPid && canEdit ? rowById.get(adjustPid) : undefined;

  return (
    <div className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_products'), to: '/admin/proizvodi' }, ta('nav_inventory')]}
        title={t('title')}
        description={t('subtitle')}
        actions={
          <>
            <Button variant="outline" shape="rounded" size="sm" className="bg-white" icon={<History className="h-4 w-4" />} onClick={() => setParam({ mv: 'all', p: null })} aria-label={t('allMovements')} title={t('allMovements')}>
              <span className="max-sm:sr-only">{t('allMovements')}</span>
            </Button>
            <Gate allowed={canExport} reason={t('noPermExport')}>
              <Button variant="outline" shape="rounded" size="sm" className="bg-white" icon={<Download className="h-4 w-4" />} onClick={exportCsv} disabled={!canExport} aria-label={t('exportCsv')} title={t('exportCsv')}>
                <span className="max-sm:sr-only">{t('exportCsv')}</span>
              </Button>
            </Gate>
            {can('purchasing', 'edit') && (
              <ButtonLink to="/admin/nabavke?id=novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />}>
                {t('newPo')}
              </ButtonLink>
            )}
          </>
        }
      />

      {/* KPIs — clicking one filters the table */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canCost ? (
          <Stat icon={Wallet} label={t('kpi_value')} value={money(kpi.value, lang, { decimals: false })} hint={t('kpi_valueHint', { n: num(kpi.units, lang) })} />
        ) : (
          <Stat icon={Boxes} label={t('kpi_units')} value={num(kpi.units, lang)} hint={t('kpi_unitsHint', { n: kpi.tracked })} />
        )}
        <Stat icon={TriangleAlert} tone="amber" label={t('kpi_low')} value={kpi.low} hint={t('kpi_lowHint', { n: LOW_STOCK })} active={filter === 'low'} onClick={() => toggleFilter('low')} />
        <Stat icon={Ban} tone="red" label={t('kpi_out')} value={kpi.out} hint={t('kpi_outHint')} active={filter === 'out'} onClick={() => toggleFilter('out')} />
        <Stat icon={Truck} label={t('kpi_incoming')} value={num(kpi.incoming, lang)} hint={t('kpi_incomingHint', { n: kpi.openPos })} active={filter === 'incoming'} onClick={() => toggleFilter('incoming')} />
      </div>

      <Card padded={false}>
        {/* Toolbar */}
        <div className="space-y-3 border-b border-line/70 p-4 sm:p-5">
          <FilterPills<Filter>
            value={filter}
            onChange={(v) => setParam({ f: v })}
            options={FILTERS.map((f) => ({ id: f, label: t(`f_${f}`), count: counts[f] }))}
          />
          <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
            <SearchInput value={q} onChange={(v) => setParam({ q: v })} placeholder={t('searchPh')} className="col-span-2 md:flex-1" />
            <SelectField value={loc} onChange={(e) => setParam({ lok: e.target.value })} icon={<MapPin className="h-4 w-4" />} className="md:w-56" aria-label={t('col_location')}>
              <option value="all">{t('allLocations')}</option>
              {locations.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                  {x.isDefault ? ` (${t('defaultLoc')})` : ''}
                </option>
              ))}
            </SelectField>
            <SelectField value={sort} onChange={(e) => setParam({ sort: e.target.value })} icon={<ArrowUpDown className="h-4 w-4" />} className="md:w-52" aria-label={t('sortBy')}>
              <option value="name">{t('sort_name')}</option>
              <option value="available">{t('sort_available')}</option>
              <option value="onHand">{t('sort_onHand')}</option>
              <option value="incoming">{t('sort_incoming')}</option>
            </SelectField>
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
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
                  <Th>{t('col_product')}</Th>
                  <Th className="px-3! max-lg:hidden">{t('col_sku')}</Th>
                  <HintTh hint={t('hint_onHand')}>{t('col_onHand')}</HintTh>
                  <HintTh hint={t('hint_committed')}>{t('col_committed')}</HintTh>
                  <HintTh hint={t('hint_unavailable')} className="max-lg:hidden">
                    {t('col_unavailable')}
                  </HintTh>
                  <HintTh hint={t('hint_available')}>{t('col_available')}</HintTh>
                  <HintTh hint={t('hint_incoming')}>{t('col_incoming')}</HintTh>
                  <Th className="max-xl:hidden">{t('col_location')}</Th>
                  <Th className="w-[1%]" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const u = stockUnit(r.p, lang);
                  return (
                    <Tr key={r.p.id} onClick={() => openHistory(r.p.id)} className="group">
                      <Td className="max-w-[250px] 2xl:max-w-[340px]">
                        <div className="flex min-w-0 items-center gap-3">
                          <Thumb src={r.p.images[0]} className="h-10 w-10" />
                          <div className="min-w-0">
                            <div className="line-clamp-2 font-semibold leading-snug text-ink" title={l(r.p.name)}>
                              {l(r.p.name)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                              <span className="font-mono lg:hidden">{r.p.sku} ·</span>
                              {sub(r).map((b, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                  {i > 0 && <span className="text-ink/20">·</span>}
                                  {b}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td className="whitespace-nowrap px-3! font-mono text-[12.5px] text-ink-soft max-lg:hidden">{r.p.sku}</Td>
                      {r.lv.tracked ? (
                        <>
                          <Td className="px-3! text-right">
                            <Qty n={r.lv.onHand} />
                          </Td>
                          <Td className="px-3! text-right">
                            <Qty n={r.lv.committed} muted />
                          </Td>
                          <Td className="px-3! text-right max-lg:hidden">
                            {r.lv.unavailable > 0 ? (
                              <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                                <Lock className="h-3 w-3 text-muted" />
                                {num(r.lv.unavailable, lang)}
                              </span>
                            ) : (
                              <Qty n={0} muted />
                            )}
                          </Td>
                          <Td className="px-3! text-right">
                            <div className="flex flex-col items-end gap-1">
                              <Qty n={r.lv.available} strong unit={u} />
                              <StockStateTag state={r.state} className="py-0! text-[11px]" />
                            </div>
                          </Td>
                        </>
                      ) : (
                        <>
                          <Td className="px-3! text-right text-muted/60">—</Td>
                          <Td className="px-3! text-right text-muted/60">—</Td>
                          <Td className="px-3! text-right text-muted/60 max-lg:hidden">—</Td>
                          <Td className="px-3! text-right">
                            <StockStateTag state="untracked" />
                          </Td>
                        </>
                      )}
                      <Td className="px-3! text-right">
                        {r.lv.incoming > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-ink">
                            <Truck className="h-3.5 w-3.5 text-muted" />+{num(r.lv.incoming, lang)}
                          </span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft max-xl:hidden">
                        {r.locationId ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted" />
                            {locName(r.locationId)}
                          </span>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap pl-2! text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {adjustBtn(r)}
                          <IconBtn label={t('history')} onClick={() => openHistory(r.p.id)}>
                            <History className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            {/* Mobile cards */}
            <ul className="divide-y divide-line/70 md:hidden">
              {list.map((r) => {
                const u = stockUnit(r.p, lang);
                return (
                  <li key={r.p.id} onClick={() => openHistory(r.p.id)} className="cursor-pointer px-4 py-4 transition-colors active:bg-canvas">
                    <div className="flex gap-3">
                      <Thumb src={r.p.images[0]} className="h-12 w-12" />
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{l(r.p.name)}</div>
                        <div className="mt-0.5 font-mono text-[12px] text-muted">{r.p.sku}</div>
                        {r.locationId && (
                          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
                            <MapPin className="h-3 w-3" />
                            {locName(r.locationId)}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {r.lv.tracked ? (
                          <>
                            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{t('col_available')}</div>
                            <Qty n={r.lv.available} strong unit={u} />
                          </>
                        ) : (
                          <StockStateTag state="untracked" />
                        )}
                      </div>
                    </div>
                    {r.lv.tracked && (
                      <dl className="mt-2.5 grid grid-cols-4 gap-1 rounded-lg bg-canvas/70 px-2 py-2 text-center">
                        {(
                          [
                            [t('col_onHand'), r.lv.onHand],
                            [t('col_committed'), r.lv.committed],
                            [t('col_unavailable'), r.lv.unavailable],
                            [t('col_incoming'), r.lv.incoming],
                          ] as const
                        ).map(([label, n]) => (
                          <div key={label} className="min-w-0">
                            <dt className="truncate text-[10.5px] font-semibold text-muted">{label}</dt>
                            <dd className={cn('text-[14px] font-semibold tabular-nums', n === 0 && 'text-muted/60')}>{num(n, lang)}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <div className="mt-2.5 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                        {r.lv.tracked && <StockStateTag state={r.state} />}
                      </div>
                      <div className="flex items-center gap-1">
                        {adjustBtn(r)}
                        <IconBtn label={t('history')} onClick={() => openHistory(r.p.id)}>
                          <History className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-5 py-3.5 text-[13px] text-muted">
              <span>
                {t('showing', { n: list.length, total: rows.length })}
                {archivedCount > 0 && <span className="ml-2 text-muted/80">· {t('archivedHidden', { n: archivedCount })}</span>}
              </span>
              <span className="flex items-center gap-4">
                <span className="hidden text-[12px] sm:inline">{t('formula')}</span>
                {filtersActive && (
                  <button type="button" onClick={clearFilters} className="font-semibold text-ink-soft hover:text-ink">
                    {t('clearFilters')}
                  </button>
                )}
              </span>
            </div>
          </>
        )}
      </Card>

      <MovementsDrawer
        open={!!drawerRow || allMovesOpen}
        row={drawerRow}
        locationName={locName}
        productLocation={(id) => locName(rowById.get(id)?.locationId)}
        onClose={() => setParam({ p: null, mv: null })}
        onAdjust={(id) => setParam({ korigjo: id })}
      />
      <AdjustDialog row={adjustRow} locationName={locName(adjustRow?.locationId)} onClose={() => setParam({ korigjo: null })} />
    </div>
  );
}
