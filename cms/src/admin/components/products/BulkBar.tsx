import type { ComponentType } from 'react';
import { X } from 'lucide-react';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import { pd } from './dict';
import { TickBox } from './parts';

export interface BulkAction {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  /** permission granted */
  ok: boolean;
  /** tooltip when not allowed */
  reason?: string;
  danger?: boolean;
}

/**
 * Inline bulk-action bar that replaces the table toolbar while rows are selected (PDF p.09 / p.12
 * "Veprime në grup pas përzgjedhjes"). Actions the role may not use stay visible but disabled.
 */
export function BulkBar({
  count,
  pageAll,
  pageSome,
  onTogglePage,
  actions,
  onClear,
  filteredTotal,
  allFiltered,
  onSelectFiltered,
}: {
  count: number;
  pageAll: boolean;
  pageSome: boolean;
  onTogglePage: () => void;
  actions: BulkAction[];
  onClear: () => void;
  filteredTotal: number;
  allFiltered: boolean;
  onSelectFiltered: () => void;
}) {
  const t = useDict(pd, 'admin');
  return (
    <div className="border-b border-line/80 bg-canvas/80">
      <div className="flex items-center gap-2 px-4 py-2 sm:px-5">
        <TickBox checked={pageAll} indeterminate={pageSome} onChange={onTogglePage} label={t('selectAll')} />
        <span className="ml-1 shrink-0 whitespace-nowrap text-[13px] font-semibold text-ink">{t('selectedN', { n: count })}</span>
        <span className="mx-1 h-5 w-px shrink-0 bg-line" />
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          {actions.map((a) => (
            <span key={a.id} title={a.ok ? undefined : a.reason} className={cn('inline-flex shrink-0', !a.ok && 'cursor-not-allowed')}>
              <button
                type="button"
                onClick={a.onClick}
                disabled={!a.ok}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border bg-white px-2.5 text-[12.5px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40',
                  a.danger ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-line text-ink hover:border-ink/30',
                )}
              >
                <a.icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClear} title={t('clearSelection')} aria-label={t('clearSelection')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-ink/[0.06] hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      </div>
      {pageAll && filteredTotal > count && !allFiltered && (
        <div className="border-t border-line/60 bg-white/60 px-5 py-1.5 text-center text-[12.5px]">
          <button type="button" onClick={onSelectFiltered} className="font-semibold text-ink underline underline-offset-2 hover:no-underline">
            {t('selectAllFiltered', { n: filteredTotal })}
          </button>
        </div>
      )}
      {allFiltered && filteredTotal > 0 && <div className="border-t border-line/60 bg-white/60 px-5 py-1.5 text-center text-[12.5px] text-muted">{t('allSelected', { n: filteredTotal })}</div>}
    </div>
  );
}
