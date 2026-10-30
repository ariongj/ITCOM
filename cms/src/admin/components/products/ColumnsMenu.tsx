import { useCallback, useRef, useState } from 'react';
import { Check, Columns3 } from 'lucide-react';
import { useDismiss } from '@/admin/layout/popover';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import { pd } from './dict';

export type OptionalColumn = 'category' | 'vendor' | 'channels' | 'sold' | 'cost' | 'updated';
export const DEFAULT_COLUMNS: OptionalColumn[] = ['category'];
const KEY = 'optika-admin-product-columns';

/** Remembered per browser (a viewer convenience) — falls back to the defaults when storage is blocked. */
export function useColumns() {
  const [cols, setCols] = useState<OptionalColumn[]>(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const v = raw ? (JSON.parse(raw) as OptionalColumn[]) : null;
      return Array.isArray(v) ? v : DEFAULT_COLUMNS;
    } catch {
      return DEFAULT_COLUMNS;
    }
  });
  const toggle = useCallback((c: OptionalColumn) => {
    setCols((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — keep it for this session only */
      }
      return next;
    });
  }, []);
  return [cols, toggle] as const;
}

export function ColumnsMenu({ value, onToggle, available }: { value: OptionalColumn[]; onToggle: (c: OptionalColumn) => void; available: OptionalColumn[] }) {
  const t = useDict(pd, 'admin');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  const label: Record<OptionalColumn, string> = {
    category: t('col_category'),
    vendor: t('col_vendor'),
    channels: t('col_channels'),
    sold: t('col_sold'),
    cost: t('col_cost'),
    updated: t('col_updated'),
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft transition hover:bg-ink/[0.06] hover:text-ink', open && 'bg-ink/[0.06] text-ink')}
      >
        <Columns3 className="h-4 w-4" />
        <span className="max-sm:sr-only">{t('columns')}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-1.5 w-56 rounded-xl border border-line bg-white p-1.5 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.28)]">
          <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{t('columnsHint')}</div>
          {available.map((c) => {
            const on = value.includes(c);
            return (
              <button
                key={c}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                onClick={() => onToggle(c)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
              >
                <span className={cn('grid h-4 w-4 place-items-center rounded border', on ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-white')}>{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                {label[c]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
