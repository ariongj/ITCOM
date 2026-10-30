// Search-and-add for purchase order lines: stock-tracked, non-archived products not already on the order.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { money, num } from '@/lib/format';
import { fold } from '@/lib/search';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';
import { inv } from './dict';
import { stockUnit } from './helpers';
import type { InvRow } from './useInventory';
import { StockStateTag, controlClass } from './ui';

export function ProductPicker({ rows, exclude, onPick, showCost, className }: { rows: InvRow[]; exclude: Set<string>; onPick: (p: Product) => void; showCost: boolean; className?: string }) {
  const t = useDict(inv, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const results = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    return rows
      .filter((r) => r.lv.tracked && r.p.status !== 'archived' && !exclude.has(r.p.id))
      .filter((r) => {
        if (!terms.length) return true;
        const hay = fold(`${r.p.name.me} ${r.p.name.sq} ${r.p.name.en} ${r.p.sku} ${r.p.vendor ?? ''}`);
        return terms.every((x) => hay.includes(x));
      })
      .sort((a, b) => a.lv.available - b.lv.available)
      .slice(0, 8);
  }, [rows, exclude, q]);

  const pick = (p: Product) => {
    onPick(p);
    setQ('');
    setHi(0);
  };

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHi((i) => Math.min(results.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHi((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter' && open && results[hi]) {
            e.preventDefault();
            pick(results[hi].p);
          } else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={t('ed_searchProduct')}
        aria-label={t('ed_addProduct')}
        role="combobox"
        aria-expanded={open}
        className={cn(controlClass, 'h-10 pl-9 pr-3')}
      />
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[340px] overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.25)]">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[13px] text-muted">{t('ed_noMatch')}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.p.id}
                type="button"
                role="option"
                aria-selected={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => pick(r.p)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors', i === hi ? 'bg-canvas' : 'hover:bg-canvas')}
              >
                <Thumb src={r.p.images[0]} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{l(r.p.name)}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
                    <span className="font-mono">{r.p.sku}</span>
                    <span>
                      {t('ed_available', { n: num(r.lv.available, lang) })} {stockUnit(r.p, lang)}
                    </span>
                    {showCost && r.p.cost != null && <span>· {money(r.p.cost, lang)}</span>}
                  </span>
                </span>
                <StockStateTag state={r.state} className="hidden sm:inline-flex" />
                <Plus className="h-4 w-4 shrink-0 text-muted" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
