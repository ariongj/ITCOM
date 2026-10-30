import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react';
import { useLang } from '@/i18n';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Delta — arrow + signed % (direction is never colour alone)           */
/* ------------------------------------------------------------------ */
export function Delta({ value }: { value: number | null }) {
  const lang = useLang('admin');
  if (value === null) return null;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold tabular-nums', flat ? 'text-muted' : up ? 'text-[#0b7a3b]' : 'text-[#b42318]')}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
      {flat ? '' : up ? '+' : '−'}
      {num(Math.abs(value), lang, 1)}%
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile (PDF p.08): label · value · delta/caption, links to a list */
/* ------------------------------------------------------------------ */
export function KpiCard({
  label,
  value,
  delta,
  caption,
  to,
  linkLabel,
  title,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: number | null;
  caption?: ReactNode;
  /** Filtered list the tile opens */
  to?: string;
  /** Accessible name of the link ("Open the filtered list") */
  linkLabel?: string;
  /** Metric definition — native tooltip on the tile */
  title?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-medium leading-snug text-muted">{label}</span>
        {to && <ChevronRight className="-mr-1 h-4 w-4 shrink-0 text-ink/25 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />}
      </div>
      <div className="mt-2 truncate text-[24px] font-bold leading-none tracking-tight text-ink sm:text-[28px]">{value}</div>
      <div className="mt-2.5 flex min-h-[20px] flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {delta !== undefined && <Delta value={delta} />}
        {caption && <span className="text-[12px] leading-snug text-muted">{caption}</span>}
      </div>
    </>
  );
  const cls = 'group flex h-full min-w-0 flex-col rounded-xl border border-line/80 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:px-5 sm:py-4.5';
  return to ? (
    <Link
      to={to}
      title={title}
      className={cn(cls, 'outline-none transition-[border-color,box-shadow] hover:border-ink/25 hover:shadow-[0_4px_14px_-8px_rgb(0_0_0/0.18)] focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-canvas')}
    >
      {body}
      {linkLabel && <span className="sr-only">{linkLabel}</span>}
    </Link>
  ) : (
    <div className={cls} title={title}>
      {body}
    </div>
  );
}
