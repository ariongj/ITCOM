import { useMemo, useState, type KeyboardEvent } from 'react';
import { ChartColumn, Rows3 } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict, useLang } from '@/i18n';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/types';
import { addDays, niceTicks, type Bucket, type Step } from './data';
import { fmtDate } from './dates';
import { D, capitalize, pluralKey } from './i18n';
import { useWidth } from './useWidth';

const PLOT_H_MAX = 272;
const PLOT_H_SM = 196; // phones: a shorter plot keeps the card in one screen
const TOP = 22; // room for the peak label
const AXIS = 28; // x-axis label band (part of the container height)
const GUTTER = 58; // y-axis labels

const hh = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:00`;

function bucketLabel(b: Bucket, step: Step, lang: Lang) {
  if (step === 'hour') return `${hh(b.start)}–${hh(b.end).replace('00:00', '24:00')}`;
  if (step === 'day') return capitalize(fmtDate(b.start, lang, { weekday: 'long', day: 'numeric', month: 'long' }));
  const last = addDays(b.end, -1);
  return `${fmtDate(b.start, lang, { day: 'numeric', month: 'short' })} – ${fmtDate(last, lang, { day: 'numeric', month: 'short' })}`;
}

/** Top-rounded bar (4px data end), square at the baseline. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Net sales over the selected period — one series, so one ink colour and no legend (the title names it).
 * Hover / arrow keys show a tooltip; the table view is the accessible twin.
 */
export function RevenueChart({ buckets, step, periodLabel, className }: { buckets: Bucket[]; step: Step; periodLabel: string; className?: string }) {
  const t = useDict(D, 'admin');
  const lang = useLang('admin');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const total = buckets.reduce((s, b) => s + b.net, 0);
  const desc = step === 'hour' ? t('chart_hourly') : t(step === 'day' ? 'chart_daily' : 'chart_weekly', { p: periodLabel });

  return (
    <Card
      className={className}
      title={t('chart_title')}
      description={desc}
      actions={
        <div className="flex rounded-lg bg-[#f1f1f1] p-0.5" role="group" aria-label={`${t('view_chart')} / ${t('view_table')}`}>
          {(['chart', 'table'] as const).map((v) => {
            const Icon = v === 'chart' ? ChartColumn : Rows3;
            const label = v === 'chart' ? t('view_chart') : t('view_table');
            return (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                title={label}
                aria-label={label}
                className={cn('grid h-7 w-8 place-items-center rounded-md transition-colors', view === v ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-muted hover:text-ink')}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="text-[13px] font-medium text-muted">{t('chart_total')}</span>
        <span className="text-[20px] font-bold tracking-tight text-ink">{money(total, lang)}</span>
        <span className="basis-full text-[12.5px] text-muted sm:basis-auto sm:text-[13px]" title={t('net_def')}>
          <span className="hidden sm:inline">· </span>
          {t('chart_note')}
        </span>
      </div>
      {view === 'chart' ? <Bars buckets={buckets} step={step} periodLabel={periodLabel} total={total} /> : <BucketTable buckets={buckets} step={step} />}
    </Card>
  );
}

function Bars({ buckets, step, periodLabel, total }: { buckets: Bucket[]; step: Step; periodLabel: string; total: number }) {
  const t = useDict(D, 'admin');
  const lang = useLang('admin');
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const PLOT_H = width > 0 && width < 520 ? PLOT_H_SM : PLOT_H_MAX;

  const n = buckets.length;
  const max = Math.max(...buckets.map((b) => b.net), 0);
  const ticks = useMemo(() => niceTicks(max, 4), [max]);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = Math.max(width - GUTTER, 10);
  const slot = plotW / n;
  const barW = Math.max(3, Math.min(24, slot * 0.62));
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H;
  const cx = (i: number) => GUTTER + slot * i + slot / 2;
  const peak = buckets.reduce((m, b, i) => (b.net > buckets[m].net ? i : m), 0);
  const nowIdx = buckets.findIndex((b) => b.current);

  // x labels: hours every 3 (6 when narrow) from midnight; days/weeks anchored on the newest bucket
  const labelEvery = step === 'hour' ? (slot < 16 ? 6 : 3) : step === 'day' ? (n <= 7 ? 1 : slot < 16 ? 7 : slot < 28 ? 5 : 3) : slot < 44 ? 3 : 2;
  const showLabel = (i: number) => (step === 'hour' ? i % labelEvery === 0 : (n - 1 - i) % labelEvery === 0);
  const xLabel = (b: Bucket) =>
    step === 'hour'
      ? hh(b.start)
      : step === 'day' && n <= 7
        ? capitalize(fmtDate(b.start, lang, { weekday: 'short' }).replace('.', ''))
        : fmtDate(b.start, lang, { day: 'numeric', month: 'short' });

  // keyboard steps over the buckets that already happened
  const lastIdx = step === 'hour' && nowIdx >= 0 ? nowIdx : n - 1;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setActive((a) => {
        const cur = a ?? lastIdx;
        return e.key === 'ArrowRight' ? Math.min(lastIdx, cur + 1) : Math.max(0, cur - 1);
      });
    } else if (e.key === 'Escape') setActive(null);
  };

  const a = active !== null ? buckets[active] : null;
  const tipLeft = active !== null ? Math.min(Math.max(cx(active), 84), width - 84) : 0;
  const currentLabel = step === 'hour' ? t('this_hour') : step === 'day' ? t('today') : t('this_week');

  return (
    <div
      ref={ref}
      className="relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ink/20 focus-visible:ring-offset-4"
      style={{ height: TOP + PLOT_H + AXIS }}
      tabIndex={0}
      role="img"
      aria-label={t('chart_aria', { p: periodLabel, total: money(total, lang) })}
      onKeyDown={onKey}
      onFocus={() => setActive((v) => v ?? lastIdx)}
      onBlur={() => setActive(null)}
      onMouseLeave={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={TOP + PLOT_H + AXIS} className="block overflow-visible select-none" aria-hidden>
          {/* grid + y labels — hairlines, recessive */}
          {ticks.map((v) => (
            <g key={v}>
              <line x1={GUTTER} x2={width} y1={y(v) + 0.5} y2={y(v) + 0.5} stroke={v === 0 ? '#bdbdbd' : '#ececec'} strokeWidth={1} />
              <text x={GUTTER - 10} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] font-medium tabular-nums">
                {money(v, lang, { decimals: false })}
              </text>
            </g>
          ))}

          {/* later hours of today: a faint band so the empty space reads as "not yet" */}
          {step === 'hour' && nowIdx >= 0 && nowIdx < n - 1 && (
            <rect x={GUTTER + slot * (nowIdx + 1)} y={TOP} width={slot * (n - nowIdx - 1)} height={PLOT_H} fill="#f7f7f7" />
          )}

          {/* bars + hit areas */}
          {buckets.map((b, i) => {
            const h = (b.net / top) * PLOT_H;
            const x = cx(i) - barW / 2;
            const on = active === i;
            return (
              <g key={i}>
                {on && <rect x={GUTTER + slot * i} y={TOP} width={slot} height={PLOT_H} rx={4} fill="rgb(0 0 0 / 0.04)" />}
                {h > 0 && <path d={barPath(x, y(b.net), barW, h)} fill={on ? '#000000' : active !== null ? '#5f5f5f' : '#1a1a1a'} className="transition-[fill] duration-150" />}
                {!b.future && (
                  <rect x={GUTTER + slot * i} y={0} width={slot} height={TOP + PLOT_H + AXIS} fill="transparent" onMouseEnter={() => setActive(i)} onMouseMove={() => active !== i && setActive(i)} />
                )}
              </g>
            );
          })}

          {/* direct label on the peak only */}
          {max > 0 && active === null && (
            <text x={cx(peak)} y={y(max) - 7} textAnchor="middle" className="pointer-events-none fill-ink-soft text-[11px] font-semibold tabular-nums">
              {money(max, lang, { decimals: false })}
            </text>
          )}

          {/* x labels */}
          {buckets.map((b, i) => {
            if (!showLabel(i)) return null;
            const label = xLabel(b);
            const half = label.length * 3.1;
            let x = cx(i);
            let anchor: 'middle' | 'end' | 'start' = 'middle';
            if (x + half > width) {
              x = width;
              anchor = 'end';
            } else if (x - half < GUTTER - 6) {
              x = GUTTER - 6;
              anchor = 'start';
            }
            return (
              <text key={i} x={x} y={TOP + PLOT_H + 19} textAnchor={anchor} className={cn('text-[11px] font-medium tabular-nums', active === i ? 'fill-ink' : 'fill-muted')}>
                {label}
              </text>
            );
          })}
        </svg>
      )}

      {max === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-[34%] text-center" style={{ paddingLeft: GUTTER }}>
          <div className="text-sm font-semibold text-ink">{t('no_sales')}</div>
          <div className="mx-auto mt-1 max-w-xs text-[13px] text-muted">{t('no_sales_text')}</div>
        </div>
      )}

      {/* tooltip */}
      {a && active !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[150px] -translate-x-1/2 -translate-y-full rounded-lg border border-black/10 bg-white px-3 py-2.5 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]"
          style={{ left: tipLeft, top: Math.max(y(a.net) - 10, 64) }}
        >
          <div className="text-[15px] font-bold tabular-nums text-ink">{money(a.net, lang)}</div>
          <div className="mt-0.5 text-[12px] text-muted">{t(`ord_${pluralKey(lang, a.orders)}`, { n: a.orders })}</div>
          <div className="mt-1.5 whitespace-nowrap border-t border-black/[0.08] pt-1.5 text-[11.5px] font-medium text-ink-soft">
            {a.current ? `${currentLabel} · ${t('in_progress')}` : bucketLabel(a, step, lang)}
          </div>
        </div>
      )}
    </div>
  );
}

function BucketTable({ buckets, step }: { buckets: Bucket[]; step: Step }) {
  const t = useDict(D, 'admin');
  const lang = useLang('admin');
  const rows = [...buckets].filter((b) => !b.future).reverse();
  return (
    <div className="overflow-y-auto rounded-lg border border-line/80" style={{ maxHeight: TOP + PLOT_H_MAX + AXIS }}>
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead className="sticky top-0 bg-[#f7f7f7]">
          <tr className="text-[12.5px] font-semibold text-muted">
            <th className="px-4 py-2.5 font-semibold">{t('col_period')}</th>
            <th className="px-4 py-2.5 text-right font-semibold">{t('col_orders')}</th>
            <th className="px-4 py-2.5 text-right font-semibold">{t('col_net')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={i} className="border-t border-line/70">
              <td className="px-4 py-2 text-ink-soft">
                {bucketLabel(b, step, lang)}
                {b.current && <span className="ml-2 text-[11.5px] text-muted">({t('in_progress')})</span>}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-ink-soft">{b.orders}</td>
              <td className="px-4 py-2 text-right font-semibold tabular-nums text-ink">{money(b.net, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
