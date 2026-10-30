import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  Archive, ArchiveRestore, ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, CircleDashed, Copy, Download, ExternalLink, Eye, FolderTree, Layers, Monitor,
  PackageSearch, Pencil, Plus, Store, Trash2, Truck, Upload,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SearchInput, Td, Th, Thumb, Tr } from '@/admin/components/kit';
import { InventoryCell, RowMenu, SelectInput, StatusLabel, TickBox, type MenuItem } from '@/admin/components/products/parts';
import { BulkBar, type BulkAction } from '@/admin/components/products/BulkBar';
import { ColumnsMenu, useColumns, type OptionalColumn } from '@/admin/components/products/ColumnsMenu';
import { DeleteDialog } from '@/admin/components/products/DeleteDialog';
import { ImportModal } from '@/admin/components/products/ImportModal';
import { exportProducts } from '@/admin/components/products/exporter';
import { pd } from '@/admin/components/products/dict';
import { LOW_STOCK, distinct, isTracked, missingForPublish, pricingOf, skusOf, type ProductX } from '@/admin/components/products/model';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan, useCategories } from '@/store/hooks';
import { membershipIndex } from '@/lib/collections';
import { basePrice } from '@/lib/pricing';
import { money, num, perUnit, timeAgo } from '@/lib/format';
import { fold } from '@/lib/search';
import type { ProductStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { href } from '@/lib/paths';

type Tab = 'all' | ProductStatus;
type StockF = 'all' | 'in' | 'low' | 'out' | 'untracked';
type ChannelF = 'all' | 'online' | 'pos' | 'none';
type SortKey = 'newest' | 'updated' | 'name' | 'price' | 'stock' | 'sold';
const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = { newest: 'desc', updated: 'desc', name: 'asc', price: 'asc', stock: 'asc', sold: 'desc' };
const COLLATOR: Record<string, string> = { me: 'sr-Latn', sq: 'sq', en: 'en' };
const PAGE = 25;

/** Price with the compare-at price struck through, a unit suffix and "from" for quote products. */
function PriceCell({ p }: { p: ProductX }) {
  const lang = useLang('admin');
  const t = useDict(pd, 'admin');
  const { price, compareAt } = pricingOf(p);
  const fmt = (v: number) => money(v, lang, { decimals: v % 1 !== 0 });
  if (!price) return <span className="text-muted">—</span>;
  const quote = p.template === 'quote' || p.quoteOnly;
  return (
    <div className="whitespace-nowrap text-right tabular-nums">
      <span className="font-semibold text-ink">{quote ? t('fromPrice', { price: fmt(price) }) : fmt(price)}</span>
      {(p.unit === 'm2' || p.unit === 'm') && <span className="ml-0.5 text-[12px] text-muted">{perUnit(p.unit, lang)}</span>}
      {compareAt != null && <div className="text-[12px] text-muted line-through">{fmt(compareAt)}</div>}
    </div>
  );
}

function SortTh({ label, k, sort, dir, onSort, className }: { label: ReactNode; k: SortKey; sort: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void; className?: string }) {
  const on = sort === k;
  const Icon = on ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <Th className={className} aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" onClick={() => onSort(k)} className={cn('group inline-flex items-center gap-1 hover:text-ink', on && 'text-ink')}>
        {label}
        <Icon className={cn('h-3 w-3 transition-opacity', on ? 'opacity-100' : 'opacity-0 group-hover:opacity-60')} />
      </button>
    </Th>
  );
}

export default function Products() {
  const t = useDict(pd, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const products = useDb((s) => s.products) as ProductX[];
  const collections = useDb((s) => s.collections);
  const upsertProduct = useDb((s) => s.upsertProduct);
  const duplicateProduct = useDb((s) => s.duplicateProduct);
  const categories = useCategories();
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const members = useMemo(() => membershipIndex(collections, products), [collections, products]);
  const vendors = useMemo(() => distinct(products.map((p) => p.vendor)), [products]);
  const [cols, toggleCol] = useColumns();
  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ProductX[]>([]);

  const canEdit = can('products', 'edit');
  const canPublish = can('products', 'publish');
  const canArchive = can('products', 'archive');
  const canDelete = can('products', 'delete');
  const canExport = can('products', 'export');
  const canImport = can('products', 'import');
  const canCost = can('products', 'viewCost');
  const show = (c: OptionalColumn) => cols.includes(c) && (c !== 'cost' || canCost);

  /* ----------------------------- filters (in the URL) ----------------------------- */
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const tab = (params.get('status') ?? 'all') as Tab;
  const cat = params.get('kategorija') ?? 'all';
  const col = params.get('kolekcija') ?? 'all';
  const vendor = params.get('dobavljac') ?? 'all';
  const stock = (params.get('zalihe') ?? 'all') as StockF;
  const channel = (params.get('kanal') ?? 'all') as ChannelF;
  const sort = (params.get('sort') ?? 'newest') as SortKey;
  const dir = (params.get('dir') ?? DEFAULT_DIR[sort]) as 'asc' | 'desc';
  const page = Math.max(1, Number(params.get('strana') ?? 1) || 1);
  const setParam = (patch: Record<string, string | null>, keepPage = false) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '' || v === 'all') n.delete(k);
          else n.set(k, v);
        }
        if (!keepPage) n.delete('strana');
        return n;
      },
      { replace: true },
    );
  const setSort = (k: SortKey, d?: 'asc' | 'desc') => setParam({ sort: k === 'newest' ? null : k, dir: d && d !== DEFAULT_DIR[k] ? d : null });
  const onHeaderSort = (k: SortKey) => setSort(k, sort === k ? (dir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR[k]);
  const filtersActive = !!q || cat !== 'all' || col !== 'all' || vendor !== 'all' || stock !== 'all' || channel !== 'all';
  const clearFilters = () => setParam({ q: null, kategorija: null, kolekcija: null, dobavljac: null, zalihe: null, kanal: null });

  // Everything except the status tab, so the tabs show live counts.
  const base = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (cat !== 'all' && p.categoryId !== cat) return false;
      if (col !== 'all' && !(members.get(p.id) ?? []).includes(col)) return false;
      if (vendor !== 'all' && (p.vendor ?? '') !== vendor) return false;
      if (stock !== 'all') {
        const tracked = isTracked(p);
        if (stock === 'untracked' && tracked) return false;
        if (stock === 'in' && !(tracked && p.stock > 0)) return false;
        if (stock === 'low' && !(tracked && p.stock > 0 && p.stock <= LOW_STOCK)) return false;
        if (stock === 'out' && !(tracked && p.stock <= 0)) return false;
      }
      if (channel !== 'all') {
        const ch = p.channels ?? ['online'];
        if (channel === 'none' ? ch.length > 0 : !ch.includes(channel)) return false;
      }
      if (terms.length) {
        const hay = fold([p.name.me, p.name.sq, p.name.en, ...skusOf(p), p.barcode ?? '', ...(p.tags ?? []), p.vendor ?? ''].join(' '));
        if (!terms.every((term) => hay.includes(term))) return false;
      }
      return true;
    });
  }, [products, q, cat, col, vendor, stock, channel, members]);

  const list = useMemo(() => {
    const out = base.filter((p) => tab === 'all' || p.status === tab);
    const sign = dir === 'asc' ? 1 : -1;
    const coll = new Intl.Collator(COLLATOR[lang] ?? 'en');
    const stockOf = (p: ProductX) => (isTracked(p) ? p.stock : Number.MAX_SAFE_INTEGER);
    const cmp: Record<SortKey, (a: ProductX, b: ProductX) => number> = {
      newest: (a, b) => a.createdAt.localeCompare(b.createdAt),
      updated: (a, b) => (a.updatedAt ?? a.createdAt).localeCompare(b.updatedAt ?? b.createdAt),
      name: (a, b) => coll.compare(l(a.name), l(b.name)),
      price: (a, b) => basePrice(a) - basePrice(b),
      stock: (a, b) => stockOf(a) - stockOf(b),
      sold: (a, b) => a.sold - b.sold,
    };
    return [...out].sort((a, b) => sign * cmp[sort](a, b));
  }, [base, tab, sort, dir, l, lang]);

  const counts = useMemo(
    () => ({
      all: base.length,
      active: base.filter((p) => p.status === 'active').length,
      draft: base.filter((p) => p.status === 'draft').length,
      archived: base.filter((p) => p.status === 'archived').length,
    }),
    [base],
  );
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages);
  const pageItems = list.slice((current - 1) * PAGE, current * PAGE);

  /* ----------------------------- selection ----------------------------- */
  const [sel, setSel] = useState<Set<string>>(new Set());
  const selected = useMemo(() => list.filter((p) => sel.has(p.id)), [list, sel]);
  const pageAll = pageItems.length > 0 && pageItems.every((p) => sel.has(p.id));
  const pageSome = !pageAll && pageItems.some((p) => sel.has(p.id));
  const allFiltered = list.length > pageItems.length && list.every((p) => sel.has(p.id));
  const toggle = (id: string, on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const togglePage = () =>
    setSel((s) => {
      const n = new Set(s);
      if (pageAll) pageItems.forEach((p) => n.delete(p.id));
      else pageItems.forEach((p) => n.add(p.id));
      return n;
    });
  const clearSel = () => setSel(new Set());

  /* ----------------------------- actions ----------------------------- */
  const statusName = (s: ProductStatus) => t(s === 'active' ? 'st_active' : s === 'draft' ? 'st_draft' : 'st_archived');
  const setStatus = (items: ProductX[], status: ProductStatus) => {
    let done = 0;
    let skipped = 0;
    for (const p of items) {
      if (p.status === status) continue;
      if (status === 'active' && missingForPublish(p, categories).length) {
        skipped++;
        continue;
      }
      upsertProduct({ ...p, status });
      done++;
    }
    return { done, skipped };
  };
  const bulkPublish = () => {
    const { done, skipped } = setStatus(selected, 'active');
    if (done) toast.success(t('toast_published', { n: done }));
    if (skipped) toast.error(t('toast_publishSkipped', { n: skipped }));
    clearSel();
  };
  const bulkDraft = () => {
    const { done } = setStatus(selected.filter((p) => p.status === 'active'), 'draft');
    toast.success(t('toast_drafted', { n: done }));
    clearSel();
  };
  const bulkArchive = () => {
    const { done } = setStatus(selected, 'archived');
    toast.success(t('toast_archived', { n: done }));
    clearSel();
  };
  const bulkRestore = () => {
    const { done } = setStatus(selected.filter((p) => p.status === 'archived'), 'draft');
    toast.success(t('toast_restored', { n: done }));
    clearSel();
  };
  const runExport = (items: ProductX[]) => {
    const n = exportProducts(items, { t, l, lang, categories, withCost: canCost });
    toast.success(t('toast_exported', { n }));
  };
  const one = (p: ProductX, status: ProductStatus) => {
    const { done, skipped } = setStatus([p], status);
    if (skipped) toast.error(t('publishBlocked'), { description: t('publishBlockedText', { list: missingForPublish(p, categories).map((r) => t(`req_${r}`)).join(', ') }) });
    else if (done) toast.success(t('toast_status', { name: l(p.name), status: statusName(status) }));
  };
  const duplicate = (p: ProductX) => {
    const id = duplicateProduct(p.id);
    if (!id) return;
    toast.success(t('duplicated'), { description: l(p.name) });
    navigate(`/admin/proizvodi/${id}`);
  };

  const anyNotActive = selected.some((p) => p.status !== 'active');
  const anyActive = selected.some((p) => p.status === 'active');
  const anyArchived = selected.some((p) => p.status === 'archived');
  const anyLive = selected.some((p) => p.status !== 'archived');
  const bulkActions: BulkAction[] = [
    ...(anyNotActive ? [{ id: 'pub', label: t('bulk_publish'), icon: Eye, onClick: bulkPublish, ok: canPublish, reason: t('noPermPublish') }] : []),
    ...(anyActive ? [{ id: 'draft', label: t('bulk_draft'), icon: CircleDashed, onClick: bulkDraft, ok: canEdit, reason: t('noPerm') }] : []),
    ...(anyLive ? [{ id: 'arch', label: t('bulk_archive'), icon: Archive, onClick: bulkArchive, ok: canArchive, reason: t('noPerm') }] : []),
    ...(anyArchived ? [{ id: 'rest', label: t('bulk_restore'), icon: ArchiveRestore, onClick: bulkRestore, ok: canArchive, reason: t('noPerm') }] : []),
    { id: 'exp', label: t('bulk_export'), icon: Download, onClick: () => runExport(selected), ok: canExport, reason: t('noPerm') },
    { id: 'del', label: t('bulk_delete'), icon: Trash2, onClick: () => setToDelete(selected), ok: canDelete, reason: t('noPerm'), danger: true },
  ];

  const menuFor = (p: ProductX): MenuItem[] => {
    const items: MenuItem[] = [{ label: canEdit ? t('edit') : ta('open'), icon: Pencil, onSelect: () => navigate(`/admin/proizvodi/${p.id}`) }];
    if (canEdit) items.push({ label: t('duplicate'), icon: Copy, onSelect: () => duplicate(p) });
    if (p.status === 'active') items.push({ label: t('viewOnSite'), icon: ExternalLink, onSelect: () => window.open(href(`/produkt/${p.slug}`), '_blank', 'noopener') });
    if (p.status !== 'active') items.push({ label: t('publish'), icon: Eye, onSelect: () => one(p, 'active'), disabled: !canPublish, hint: t('noPermPublish'), divider: true });
    if (p.status === 'active') items.push({ label: t('toDraft'), icon: CircleDashed, onSelect: () => one(p, 'draft'), disabled: !canEdit, hint: t('noPerm'), divider: true });
    if (p.status === 'archived') items.push({ label: t('restore'), icon: ArchiveRestore, onSelect: () => one(p, 'draft'), disabled: !canArchive, hint: t('noPerm') });
    else items.push({ label: t('archive'), icon: Archive, onSelect: () => one(p, 'archived'), disabled: !canArchive, hint: t('noPerm') });
    items.push({ label: t('delete'), icon: Trash2, onSelect: () => setToDelete([p]), danger: true, divider: true, disabled: !canDelete, hint: t('noPerm') });
    return items;
  };
  const open = (p: ProductX) => navigate(`/admin/proizvodi/${p.id}`);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const catLabel = (p: ProductX) => {
    const c = catById.get(p.categoryId);
    return c ? l(c.name) : t('noCategory');
  };
  const channelsCell = (p: ProductX) => {
    const ch = p.channels ?? ['online'];
    if (!ch.length) return <span className="text-muted">{t('ch_none')}</span>;
    return (
      <span className="flex items-center gap-2 text-[12.5px] text-ink-soft">
        {ch.includes('online') && (
          <span className="inline-flex items-center gap-1" title={t('ch_online')}>
            <Monitor className="h-3.5 w-3.5 text-muted" /> Online
          </span>
        )}
        {ch.includes('pos') && (
          <span className="inline-flex items-center gap-1" title={t('ch_pos')}>
            <Store className="h-3.5 w-3.5 text-muted" /> POS
          </span>
        )}
      </span>
    );
  };
  const costCell = (p: ProductX) => {
    const price = basePrice(p);
    if (p.cost == null || !price) return <span className="text-muted">—</span>;
    const margin = Math.round(((price - p.cost) / price) * 100);
    return (
      <span className="whitespace-nowrap tabular-nums text-ink-soft">
        {money(p.cost, lang)} <span className="text-muted">· {margin}%</span>
      </span>
    );
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: t('tab_all'), count: counts.all },
    { id: 'active', label: t('tab_active'), count: counts.active },
    { id: 'draft', label: t('tab_draft'), count: counts.draft },
    { id: 'archived', label: t('tab_archived'), count: counts.archived },
  ];
  const tabLabel = tabs.find((x) => x.id === tab)?.label ?? t('tab_all');
  const optionalCols: OptionalColumn[] = ['category', 'vendor', 'channels', 'sold', ...(canCost ? (['cost'] as OptionalColumn[]) : []), 'updated'];

  return (
    <div className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: t('title'), to: '/admin/proizvodi' }, tabLabel]}
        title={t('title')}
        actions={
          <>
            {canExport && (
              <Button variant="outline" shape="rounded" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => runExport(list)} disabled={!list.length} className="max-sm:px-3">
                <span className="max-sm:sr-only">{t('export')}</span>
              </Button>
            )}
            {canImport && (
              <Button variant="outline" shape="rounded" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
                {t('import')}
              </Button>
            )}
            {canEdit && (
              <ButtonLink to="/admin/proizvodi/novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />}>
                {t('addProduct')}
              </ButtonLink>
            )}
          </>
        }
      />

      <Card padded={false}>
        {/* tabs (PDF p.12: Të gjitha · Aktive · Draft · Arkivuara) */}
        <div className="flex items-center justify-between gap-2 border-b border-line/80 pl-2 pr-2 sm:pl-3">
          <div className="no-scrollbar -mb-px flex min-w-0 overflow-x-auto" role="tablist">
            {tabs.map((x) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={tab === x.id}
                onClick={() => {
                  setParam({ status: x.id });
                  clearSel();
                }}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[13.5px] font-semibold transition-colors',
                  tab === x.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {x.label}
                <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', tab === x.id ? 'bg-ink/[0.08] text-ink' : 'bg-ink/[0.05] text-muted')}>{x.count}</span>
              </button>
            ))}
          </div>
          <ColumnsMenu value={cols} onToggle={toggleCol} available={optionalCols} />
        </div>

        {/* search + filters */}
        <div className="space-y-2.5 border-b border-line/70 p-3 sm:p-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <SearchInput value={q} onChange={(v) => setParam({ q: v })} placeholder={t('searchPh')} className="md:flex-1" />
            <SelectInput
              value={sort === 'price' ? `price-${dir}` : sort}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'price-asc' || v === 'price-desc') setSort('price', v === 'price-asc' ? 'asc' : 'desc');
                else setSort(v as SortKey);
              }}
              icon={<ArrowUpDown className="h-4 w-4" />}
              className="md:w-56"
              aria-label={t('sort_newest')}
            >
              <option value="newest">{t('sort_newest')}</option>
              <option value="updated">{t('sort_updated')}</option>
              <option value="name">{t('sort_name')}</option>
              <option value="price-asc">{t('sort_price_asc')}</option>
              <option value="price-desc">{t('sort_price_desc')}</option>
              <option value="stock">{t('sort_stock')}</option>
              <option value="sold">{t('sort_sold')}</option>
            </SelectInput>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <SelectInput size="sm" value={cat} onChange={(e) => setParam({ kategorija: e.target.value })} active={cat !== 'all'} icon={<FolderTree className="h-3.5 w-3.5" />} className="sm:w-44" aria-label={t('col_category')}>
              <option value="all">{t('f_category_all')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {l(c.name)}
                </option>
              ))}
            </SelectInput>
            <SelectInput size="sm" value={col} onChange={(e) => setParam({ kolekcija: e.target.value })} active={col !== 'all'} icon={<Layers className="h-3.5 w-3.5" />} className="sm:w-48" aria-label={t('f_collection_all')}>
              <option value="all">{t('f_collection_all')}</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {l(c.title)}
                </option>
              ))}
            </SelectInput>
            <SelectInput size="sm" value={vendor} onChange={(e) => setParam({ dobavljac: e.target.value })} active={vendor !== 'all'} icon={<Truck className="h-3.5 w-3.5" />} className="sm:w-44" aria-label={t('col_vendor')}>
              <option value="all">{t('f_vendor_all')}</option>
              {vendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </SelectInput>
            <SelectInput size="sm" value={stock} onChange={(e) => setParam({ zalihe: e.target.value })} active={stock !== 'all'} icon={<PackageSearch className="h-3.5 w-3.5" />} className="sm:w-44" aria-label={t('col_inventory')}>
              <option value="all">{t('f_stock_all')}</option>
              <option value="in">{t('f_stock_in')}</option>
              <option value="low">{t('f_stock_low')}</option>
              <option value="out">{t('f_stock_out')}</option>
              <option value="untracked">{t('f_stock_untracked')}</option>
            </SelectInput>
            <SelectInput size="sm" value={channel} onChange={(e) => setParam({ kanal: e.target.value })} active={channel !== 'all'} icon={<Store className="h-3.5 w-3.5" />} className="sm:w-44" aria-label={t('col_channels')}>
              <option value="all">{t('f_channel_all')}</option>
              <option value="online">{t('ch_online')}</option>
              <option value="pos">{t('ch_pos')}</option>
              <option value="none">{t('ch_none')}</option>
            </SelectInput>
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="col-span-2 h-9 rounded-lg px-2.5 text-left text-[12.5px] font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline sm:col-span-1">
                {t('clearFilters')}
              </button>
            )}
          </div>
        </div>

        {selected.length > 0 && (
          <BulkBar
            count={selected.length}
            pageAll={pageAll}
            pageSome={pageSome}
            onTogglePage={togglePage}
            actions={bulkActions}
            onClear={clearSel}
            filteredTotal={list.length}
            allFiltered={allFiltered}
            onSelectFiltered={() => setSel(new Set(list.map((p) => p.id)))}
          />
        )}

        {products.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title={t('emptyCatalogTitle')}
            text={t('emptyCatalogText')}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {canImport && (
                  <Button variant="outline" shape="rounded" size="sm" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
                    {t('import')}
                  </Button>
                )}
                {canEdit && (
                  <ButtonLink to="/admin/proizvodi/novi" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />}>
                    {t('addProduct')}
                  </ButtonLink>
                )}
              </div>
            }
          />
        ) : list.length === 0 ? (
          <EmptyState
            icon={tab === 'archived' && !filtersActive ? <Archive className="h-6 w-6" /> : <PackageSearch className="h-6 w-6" />}
            title={tab === 'archived' && !filtersActive ? t('emptyArchived') : t('emptyTitle')}
            text={tab === 'archived' && !filtersActive ? t('emptyArchivedText') : t('emptyText')}
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
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-[13.5px]">
                {selected.length === 0 && (
                  <thead>
                    <tr>
                      <Th className="w-10 pr-0!">
                        <TickBox checked={pageAll} indeterminate={pageSome} onChange={togglePage} label={t('selectAll')} />
                      </Th>
                      <SortTh label={t('col_product')} k="name" sort={sort} dir={dir} onSort={onHeaderSort} />
                      <Th>{t('col_status')}</Th>
                      <SortTh label={t('col_inventory')} k="stock" sort={sort} dir={dir} onSort={onHeaderSort} />
                      {show('category') && <Th className="max-lg:hidden">{t('col_category')}</Th>}
                      {show('vendor') && <Th className="max-lg:hidden">{t('col_vendor')}</Th>}
                      {show('channels') && <Th className="max-xl:hidden">{t('col_channels')}</Th>}
                      {show('sold') && <SortTh label={t('col_sold')} k="sold" sort={sort} dir={dir} onSort={onHeaderSort} className="text-right" />}
                      {show('cost') && <Th className="max-xl:hidden">{t('col_cost')}</Th>}
                      {show('updated') && <SortTh label={t('col_updated')} k="updated" sort={sort} dir={dir} onSort={onHeaderSort} className="max-xl:hidden" />}
                      <SortTh label={t('col_price')} k="price" sort={sort} dir={dir} onSort={onHeaderSort} className="text-right [&>button]:justify-end" />
                      <Th className="w-12" />
                    </tr>
                  </thead>
                )}
                <tbody>
                  {pageItems.map((p) => {
                    const on = sel.has(p.id);
                    return (
                      <Tr key={p.id} onClick={() => open(p)} className={cn('group', on && 'bg-ink/[0.035] hover:bg-ink/[0.05]!', p.status === 'archived' && 'text-muted')}>
                        <Td className="w-10 pr-0!" onClick={stop}>
                          <TickBox checked={on} onChange={(v) => toggle(p.id, v)} label={t('selectRow')} />
                        </Td>
                        <Td>
                          <div className="flex min-w-0 items-center gap-3">
                            <Thumb src={p.images[0]} className={cn('h-10 w-10', p.status === 'archived' && 'opacity-60 grayscale')} />
                            <div className="min-w-0">
                              <Link to={`/admin/proizvodi/${p.id}`} onClick={stop} className={cn('block max-w-[340px] truncate font-semibold hover:underline hover:underline-offset-2', p.status === 'archived' ? 'text-ink-soft' : 'text-ink')}>
                                {l(p.name) || '—'}
                              </Link>
                              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
                                <span className="font-mono tracking-tight">{p.sku || '—'}</span>
                                {!show('vendor') && p.vendor && <span className="truncate max-xl:hidden">· {p.vendor}</span>}
                                {!show('category') && <span className="truncate">· {catLabel(p)}</span>}
                              </div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <StatusLabel status={p.status} />
                        </Td>
                        <Td>
                          <InventoryCell product={p} />
                          {(p.incoming ?? 0) > 0 && <div className="mt-0.5 text-[11.5px] text-muted tabular-nums">{t('incomingN', { n: num(p.incoming ?? 0, lang) })}</div>}
                        </Td>
                        {show('category') && <Td className="whitespace-nowrap text-[13px] text-ink-soft max-lg:hidden">{catLabel(p)}</Td>}
                        {show('vendor') && <Td className="whitespace-nowrap text-[13px] text-ink-soft max-lg:hidden">{p.vendor || '—'}</Td>}
                        {show('channels') && <Td className="max-xl:hidden">{channelsCell(p)}</Td>}
                        {show('sold') && <Td className="text-right tabular-nums text-ink-soft">{num(p.sold, lang)}</Td>}
                        {show('cost') && <Td className="max-xl:hidden">{costCell(p)}</Td>}
                        {show('updated') && <Td className="whitespace-nowrap text-[12.5px] text-muted max-xl:hidden">{timeAgo(p.updatedAt ?? p.createdAt, lang)}</Td>}
                        <Td>
                          <PriceCell p={p} />
                        </Td>
                        <Td className="w-12 text-right" onClick={stop}>
                          <RowMenu items={menuFor(p)} label={t('moreActions')} />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* mobile list */}
            <div className="md:hidden">
              {selected.length === 0 && (
                <div className="flex items-center gap-3 border-b border-line/70 bg-canvas/50 px-4 py-2.5">
                  <TickBox checked={pageAll} indeterminate={pageSome} onChange={togglePage} label={t('selectAll')} />
                  <span className="text-[12px] font-semibold text-muted">{t('selectAll')}</span>
                </div>
              )}
              <ul className="divide-y divide-line/70">
                {pageItems.map((p) => {
                  const on = sel.has(p.id);
                  return (
                    <li key={p.id} onClick={() => open(p)} className={cn('flex cursor-pointer gap-3 px-4 py-3.5 transition-colors active:bg-canvas', on && 'bg-ink/[0.035]')}>
                      <div className="pt-0.5" onClick={stop}>
                        <TickBox checked={on} onChange={(v) => toggle(p.id, v)} label={t('selectRow')} />
                      </div>
                      <Thumb src={p.images[0]} className={cn('h-14 w-14', p.status === 'archived' && 'opacity-60 grayscale')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{l(p.name) || '—'}</div>
                            <div className="mt-0.5 truncate text-[12px] text-muted">
                              <span className="font-mono">{p.sku}</span> · {catLabel(p)}
                            </div>
                          </div>
                          <div className="-mr-1.5 -mt-1" onClick={stop}>
                            <RowMenu items={menuFor(p)} label={t('moreActions')} />
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px]">
                          <StatusLabel status={p.status} />
                          <InventoryCell product={p} />
                          <span className="ml-auto">
                            <PriceCell p={p} />
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* footer (PDF p.12: "5 produkte | Veprime në grup pas përzgjedhjes") */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-4 py-3 text-[12.5px] text-muted sm:px-5">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-ink-soft">{t('footerCount', { n: list.length })}</span>
                <span className="text-line max-sm:hidden">|</span>
                <span className="max-sm:hidden">{t('footerBulkHint')}</span>
                {filtersActive && (
                  <button type="button" onClick={clearFilters} className="font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline">
                    {t('clearFilters')}
                  </button>
                )}
              </span>
              {pages > 1 && (
                <span className="flex items-center gap-1.5">
                  <span className="tabular-nums">{t('pageOf', { from: (current - 1) * PAGE + 1, to: Math.min(current * PAGE, list.length), total: list.length })}</span>
                  <button type="button" disabled={current <= 1} onClick={() => setParam({ strana: String(current - 1) }, true)} aria-label={t('prevPage')} title={t('prevPage')} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink transition hover:border-ink/30 disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={current >= pages} onClick={() => setParam({ strana: String(current + 1) }, true)} aria-label={t('nextPage')} title={t('nextPage')} className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-ink transition hover:border-ink/30 disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setParam({ status: 'draft', sort: 'newest' });
        }}
      />
      <DeleteDialog products={toDelete} onClose={() => setToDelete([])} onDone={clearSel} />
    </div>
  );
}
