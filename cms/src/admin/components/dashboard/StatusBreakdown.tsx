import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/lib/types';
import { STATUS_ORDER } from './data';
import { D, capitalize, pluralKey } from './i18n';

/**
 * Orders by status in the period. The labels carry identity, so every bar shares one ink colour
 * (magnitude only) — no 7-step grey ramp to decode. Each row opens the orders list filtered by that status.
 */
export function StatusBreakdown({ byStatus, periodLabel, linkable, className }: { byStatus: Record<OrderStatus, number>; periodLabel: string; linkable: boolean; className?: string }) {
  const t = useDict(D, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const total = STATUS_ORDER.reduce((s, k) => s + byStatus[k], 0);
  const max = Math.max(...STATUS_ORDER.map((k) => byStatus[k]), 1);
  const pct = (k: OrderStatus) => (total ? (byStatus[k] / total) * 100 : 0);

  return (
    <Card className={className} title={t('status_title')} description={capitalize(periodLabel)} bodyClassName="flex flex-col">
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-bold leading-none tracking-tight text-ink">{total}</span>
        <span className="text-[13px] text-muted">{t(`status_total_${pluralKey(lang, total)}`)}</span>
      </div>

      {total === 0 ? (
        <p className="py-12 text-center text-sm text-muted">{t('status_empty')}</p>
      ) : (
        <ul className="-mx-2 mt-3 space-y-px">
          {STATUS_ORDER.map((k) => {
            const n = byStatus[k];
            const p = pct(k);
            const row: ReactNode = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={cn('truncate text-[13.5px]', n ? 'font-medium text-ink' : 'text-muted')}>{tc(`status_${k}`)}</span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className={cn('text-[13.5px] font-semibold', n ? 'text-ink' : 'text-muted/70')}>{n}</span>
                      <span className="w-9 text-right text-[12px] text-muted">{p > 0 && p < 1 ? '<1' : num(Math.round(p), lang)}%</span>
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#efefef]">
                    {n > 0 && <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.max(2, (n / max) * 100)}%` }} />}
                  </span>
                </span>
                {linkable && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-transparent transition-colors group-hover:text-muted" aria-hidden />}
              </>
            );
            return (
              <li key={k}>
                {linkable ? (
                  <Link to={`/admin/narudzbe?status=${k}`} className="group flex items-center gap-2 rounded-lg px-2 py-[7px] transition-colors hover:bg-[#f5f5f5] focus-visible:bg-[#f5f5f5] focus-visible:outline-none">
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-[7px]">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
