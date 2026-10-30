// Building blocks for the collections list + editor (PDF p.14). Neutral CMS look; statuses = text + symbol.
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, CircleDashed, GripVertical, ListChecks, Plus, Search, Sparkles, X } from 'lucide-react';
import { Thumb } from '@/admin/components/kit';
import { IconBtn, StatusLabel } from '@/admin/components/products/parts';
import { useDismiss } from '@/admin/layout/popover';
import { useDict, useL, useLang } from '@/i18n';
import { basePrice } from '@/lib/pricing';
import { fold } from '@/lib/search';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, Collection, Product } from '@/lib/types';
import { cd } from './dict';

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */
export function PublishedLabel({ published, className }: { published: boolean; className?: string }) {
  const t = useDict(cd, 'admin');
  const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold';
  return published ? (
    <span className={cn(base, 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-700/15', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
      {t('st_published')}
    </span>
  ) : (
    <span className={cn(base, 'bg-ink/[0.06] text-ink-soft', className)}>
      <CircleDashed className="h-3 w-3" aria-hidden />
      {t('st_draft')}
    </span>
  );
}

export function KindLabel({ kind, className }: { kind: Collection['kind']; className?: string }) {
  const t = useDict(cd, 'admin');
  const Icon = kind === 'smart' ? Sparkles : ListChecks;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-soft', className)}>
      <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
      {t(kind === 'smart' ? 'type_smart' : 'type_manual')}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Product search → add (manual collections)                           */
/* ------------------------------------------------------------------ */
export function ProductPicker({ products, categories, selected, onAdd }: { products: Product[]; categories: Category[]; selected: string[]; onAdd: (id: string) => void }) {
  const t = useDict(cd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  const results = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    const catName = (p: Product) => l(categories.find((c) => c.id === p.categoryId)?.name ?? { me: '', sq: '', en: '' });
    return products
      .filter((p) => p.status !== 'archived' || selected.includes(p.id))
      .filter((p) => {
        if (!terms.length) return true;
        const hay = fold(`${p.name.me} ${p.name.sq} ${p.name.en} ${p.sku} ${catName(p)} ${(p.tags ?? []).join(' ')} ${p.vendor ?? ''}`);
        return terms.every((x) => hay.includes(x));
      })
      .sort((a, b) => Number(selected.includes(a.id)) - Number(selected.includes(b.id)) || b.sold - a.sold)
      .slice(0, 8);
  }, [q, products, categories, selected, l]);

  return (
    <div ref={ref} className="relative">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5 hover:border-ink/20">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter') {
              e.preventDefault();
              const first = results.find((p) => !selected.includes(p.id));
              if (first) onAdd(first.id);
            }
          }}
          placeholder={t('pickerSearch')}
          aria-label={t('pickerSearch')}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted/70"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink" aria-label="×">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] animate-fade-in">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-muted">{t('pickerEmpty')}</p>
          ) : (
            <ul className="max-h-[340px] overflow-y-auto">
              {results.map((p) => {
                const added = selected.includes(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => onAdd(p.id)}
                      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors enabled:hover:bg-ink/[0.04] disabled:cursor-default"
                    >
                      <Thumb src={p.images[0]} className="h-9 w-9 rounded-md" />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[13.5px] font-medium', added ? 'text-muted' : 'text-ink')}>{l(p.name)}</span>
                        <span className="flex items-center gap-1.5 text-[12px] text-muted">
                          <span className="font-mono">{p.sku}</span>
                          <span>· {money(basePrice(p), lang)}</span>
                          {p.status !== 'active' && <span>· {t('notPublic')}</span>}
                        </span>
                      </span>
                      {added ? (
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-muted">
                          <Check className="h-3.5 w-3.5" /> {t('added')}
                        </span>
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line text-ink-soft">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hand-picked list: drag to reorder, arrows, remove                   */
/* ------------------------------------------------------------------ */
export function ManualList({ ids, products, onChange, sortable, disabled }: { ids: string[]; products: Product[]; onChange: (ids: string[]) => void; sortable: boolean; disabled?: boolean }) {
  const t = useDict(cd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const [drag, setDrag] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  const rows = ids.map((id) => ({ id, p: products.find((x) => x.id === id) }));

  if (!ids.length) return <p className="rounded-lg border border-dashed border-line bg-canvas/40 px-4 py-6 text-center text-[13px] text-muted">{t('manualEmpty')}</p>;

  return (
    <ol className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line">
      {rows.map(({ id, p }, i) => (
        <li
          key={id}
          draggable={sortable && !disabled}
          onDragStart={(e) => {
            setDrag(i);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnter={() => {
            if (drag === null || drag === i) return;
            move(drag, i);
            setDrag(i);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragEnd={() => setDrag(null)}
          className={cn('flex items-center gap-2.5 bg-white px-2.5 py-2 transition-colors sm:gap-3', drag === i && 'bg-canvas opacity-60', sortable && !disabled && 'cursor-grab active:cursor-grabbing')}
        >
          {sortable && <GripVertical className="h-4 w-4 shrink-0 text-muted/70 max-sm:hidden" aria-hidden />}
          <span className="w-5 shrink-0 text-center text-[12px] font-semibold tabular-nums text-muted">{i + 1}</span>
          <Thumb src={p?.images[0]} className="h-10 w-10 rounded-md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-ink">{p ? l(p.name) : id}</span>
            <span className="flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
              {p && <span className="font-mono">{p.sku}</span>}
              {p && <span>· {money(basePrice(p), lang)}</span>}
            </span>
          </span>
          {p && p.status !== 'active' && <StatusLabel status={p.status} className="max-sm:hidden" />}
          {!disabled && (
            <span className="flex shrink-0 items-center">
              {sortable && (
                <>
                  <IconBtn label={t('moveUp')} onClick={() => move(i, i - 1)} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label={t('moveDown')} onClick={() => move(i, i + 1)} disabled={i === ids.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                </>
              )}
              <IconBtn label={t('remove')} danger onClick={() => onChange(ids.filter((x) => x !== id))}>
                <X className="h-4 w-4" />
              </IconBtn>
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Preview tile (storefront order)                                     */
/* ------------------------------------------------------------------ */
export function PreviewTile({ product, category }: { product: Product; category?: Category }) {
  const l = useL('admin');
  const lang = useLang('admin');
  const sale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  return (
    <div className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-sand ring-1 ring-line">
        {product.images[0] && <img src={product.images[0].startsWith('/images/') ? product.images[0].replace(/\.webp$/, '-sm.webp') : product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />}
        {sale && <span className="absolute left-1.5 top-1.5 rounded-md bg-ink px-1.5 py-0.5 text-[10.5px] font-bold text-white">−{Math.round((1 - (product.salePrice as number) / product.price) * 100)}%</span>}
      </div>
      <p className="mt-1.5 line-clamp-2 text-[12.5px] font-medium leading-snug text-ink">{l(product.name)}</p>
      <p className="text-[12px] tabular-nums text-muted">
        <span className="font-semibold text-ink">{money(basePrice(product), lang)}</span>
        {sale && <span className="ml-1 line-through">{money(product.price, lang)}</span>}
      </p>
      {category && <p className="truncate text-[11.5px] text-muted">{l(category.name)}</p>}
    </div>
  );
}
