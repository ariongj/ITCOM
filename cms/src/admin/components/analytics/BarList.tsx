import type { ReactNode } from 'react';
import { useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { shareLabel } from './fmt';
import { DeltaChip } from './ui';

export interface BarRow {
  key: string;
  label: ReactNode;
  value: number;
  sub?: ReactNode;
  delta?: number | null;
  /** inactive row (e.g. POS not switched on) — no bar, muted text */
  inactive?: boolean;
}

/**
 * One-series horizontal bars (magnitude → one colour for every bar): 8 px marks with a 4 px rounded data end,
 * square at the baseline, value at the end of the row and the share of the total next to the bar.
 */
export function BarList({ rows, format, empty }: { rows: BarRow[]; format: (v: number) => string; empty?: ReactNode }) {
  const lang = useLang('admin');
  const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0);
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (!rows.length || (max <= 0 && rows.every((r) => !r.inactive))) return <div className="py-6 text-center text-[13px] text-muted">{empty}</div>;
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const w = max > 0 ? Math.max(0, r.value) / max : 0;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className={cn('min-w-0 truncate font-semibold', r.inactive ? 'text-muted' : 'text-ink')}>{r.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                {r.delta !== undefined && <DeltaChip value={r.delta} />}
                <span className={cn('font-semibold tabular-nums', r.inactive ? 'text-muted' : 'text-ink')}>{r.inactive ? '—' : format(r.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2 min-w-0 flex-1">
                {r.inactive ? (
                  <div className="h-2 rounded-[4px] border border-dashed border-ink/20" />
                ) : (
                  w > 0 && <div className="h-2 rounded-r-[4px] bg-ink" style={{ width: `${Math.max(w * 100, 1.5)}%` }} />
                )}
              </div>
              <span className="w-10 shrink-0 text-right text-[11.5px] font-medium tabular-nums text-muted">{r.inactive || total <= 0 ? '' : shareLabel(Math.max(0, r.value) / total, lang)}</span>
            </div>
            {r.sub && <div className="mt-1 text-[11.5px] text-muted">{r.sub}</div>}
          </li>
        );
      })}
    </ul>
  );
}
