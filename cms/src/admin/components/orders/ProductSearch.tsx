import { useCallback, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Thumb } from '@/admin/components/kit';
import { useDismiss } from '@/admin/layout/popover';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCategories } from '@/store/hooks';
import { searchProducts } from '@/lib/search';
import { basePrice } from '@/lib/pricing';
import { isTracked } from '@/lib/inventory';
import { money, perUnit } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

const T = defineDict({
  me: {
    placeholder: 'Pretraži katalog — naziv, šifra ili kategorija',
    popular: 'Najprodavanije',
    results: 'Rezultati',
    none: 'Nema proizvoda za „{q}“',
    stock: 'Stanje: {n}',
    toOrder: 'Po narudžbi',
    quote: 'Na upit',
  },
  sq: {
    placeholder: 'Kërko në katalog — emri, kodi ose kategoria',
    popular: 'Më të shiturat',
    results: 'Rezultatet',
    none: 'Nuk ka produkte për „{q}“',
    stock: 'Stoku: {n}',
    toOrder: 'Me porosi',
    quote: 'Sipas ofertës',
  },
  en: {
    placeholder: 'Search the catalogue — name, SKU or category',
    popular: 'Best sellers',
    results: 'Results',
    none: 'No products for “{q}”',
    stock: 'Stock: {n}',
    toOrder: 'Made to order',
    quote: 'Quote only',
  },
});

/** Catalogue search with a results dropdown (keyboard: ↑ ↓ Enter, Esc). */
export function ProductSearch({ onPick, disabled }: { onPick: (p: Product) => void; disabled?: boolean }) {
  const t = useDict(T, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const categories = useCategories();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const sellable = useMemo(() => products.filter((p) => p.status === 'active'), [products]);
  const list = useMemo(() => (q.trim() ? searchProducts(sellable, categories, q, lang).slice(0, 8) : [...sellable].sort((a, b) => b.sold - a.sold).slice(0, 6)), [q, sellable, categories, lang]);

  const pick = (p: Product) => {
    onPick(p);
    setQ('');
    setOpen(false);
    setActive(0);
  };

  return (
    <div ref={ref} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        disabled={disabled}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(list.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter' && list[active]) {
            e.preventDefault();
            pick(list[active]);
          }
        }}
        placeholder={t('placeholder')}
        className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[13.5px] outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas"
      />
      {open && !disabled && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]">
          <p className="border-b border-line/70 px-3 py-2 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{q.trim() ? t('results') : t('popular')}</p>
          {list.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-muted">{t('none', { q })}</p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto py-1">
              {list.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(p)}
                    className={cn('flex w-full items-center gap-3 px-3 py-2 text-left', i === active && 'bg-ink/[0.05]')}
                  >
                    <Thumb src={p.images[0]} className="h-9 w-9 rounded-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{l(p.name)}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {p.sku} · {p.quoteOnly ? t('quote') : isTracked(p) ? t('stock', { n: p.stock }) : t('toOrder')}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[13px] tabular-nums text-ink">
                      {money(basePrice(p), lang)}
                      <span className="block text-[11.5px] text-muted">{perUnit(p.unit, lang)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
