// Line chart: current period (ink, with a 6% wash) against the comparison period (grey) on ONE axis.
// Crosshair snaps to the nearest bucket; the tooltip lists both series; arrow keys walk the points.
import { useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils';
import { useWidth } from './fmt';
import { DeltaChip } from './ui';

const PLOT_H = 210;
const TOP = 14;
const AXIS = 28;
const PAD_X = 10;

export interface TrendProps {
  current: (number | null)[];
  previous?: (number | null)[] | null;
  /** short x-axis label per bucket */
  labels: string[];
  /** tooltip label per bucket (current period) */
  longLabels: string[];
  /** tooltip label per bucket (comparison period) */
  prevLabels?: string[];
  format: (v: number) => string;
  axisFormat: (v: number) => string;
  ariaLabel: string;
  /** y-range used when every value is 0 */
  emptyMax?: number;
  className?: string;
}

/**
 * Clean ticks covering [min, max] — zero is always included. A small negative dip (a refund day) does not get a
 * whole tick band of its own: the domain just extends a little below zero.
 */
export function niceScale(min: number, max: number, emptyMax = 1000, count = 4): { ticks: number[]; lo: number; hi: number } {
  let lo = Math.min(0, min);
  let hi = Math.max(0, max);
  if (hi - lo <= 0) hi = emptyMax;
  const raw = (hi - lo) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const smallDip = lo < 0 && -lo < step * 0.6;
  const tickLo = smallDip ? 0 : Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = tickLo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { ticks, lo: smallDip ? lo * 1.25 : tickLo, hi };
}

function linePath(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export function TrendChart({ current, previous, labels, longLabels, prevLabels, format, axisFormat, ariaLabel, emptyMax, className }: TrendProps) {
  const [ref, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const n = current.length;
  const prev = previous ?? null;

  const values = useMemo(() => [...current, ...(prev ?? [])].filter((v): v is number => v !== null), [current, prev]);
  const { ticks, lo, hi } = useMemo(() => niceScale(Math.min(...values, 0), Math.max(...values, 0), emptyMax), [values, emptyMax]);
  const gutter = Math.max(...ticks.map((v) => axisFormat(v).length)) * 6.3 + 14;
  const plotW = Math.max(width - gutter - PAD_X * 2, 10);
  const x = (i: number) => gutter + PAD_X + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => TOP + PLOT_H - ((v - lo) / (hi - lo || 1)) * PLOT_H;

  const curPath = linePath(current, x, y);
  const prevPath = prev ? linePath(prev.slice(0, n), x, y) : '';
  const lastIdx = current.reduce<number>((m, v, i) => (v !== null ? i : m), -1);
  const areaPath = lastIdx >= 0 && current[0] !== null ? `${curPath}L${x(lastIdx).toFixed(1)},${y(0).toFixed(1)}L${x(0).toFixed(1)},${y(0).toFixed(1)}Z` : '';

  // x labels: anchored to the newest bucket, every k-th so they never collide
  const maxLabel = Math.max(...labels.map((l) => l.length), 1) * 6.4 + 14;
  const slot = n > 1 ? plotW / (n - 1) : plotW;
  const every = Math.max(1, Math.ceil(maxLabel / slot));

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - box.left;
    const i = n <= 1 ? 0 : Math.round(((px - gutter - PAD_X) / plotW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      if (e.key === 'Escape') setActive(null);
      return;
    }
    e.preventDefault();
    setActive((a) => {
      const cur = a ?? Math.max(lastIdx, 0);
      return e.key === 'ArrowRight' ? Math.min(n - 1, cur + 1) : Math.max(0, cur - 1);
    });
  };

  const a = active;
  const cv = a !== null ? current[a] : null;
  const pv = a !== null && prev ? prev[a] ?? null : null;
  const tipW = 196;
  const tipLeft = a !== null ? Math.min(Math.max(x(a) - tipW / 2, 0), Math.max(width - tipW, 0)) : 0;

  return (
    <div
      ref={ref}
      className={cn('relative rounded-lg outline-offset-4', className)}
      style={{ height: TOP + PLOT_H + AXIS }}
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
      onKeyDown={onKey}
      onFocus={() => setActive((v) => v ?? Math.max(lastIdx, 0))}
      onBlur={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={TOP + PLOT_H + AXIS} className="block select-none overflow-visible" aria-hidden>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={gutter} x2={width} y1={Math.round(y(v)) + 0.5} y2={Math.round(y(v)) + 0.5} className={v === 0 ? 'stroke-ink/25' : 'stroke-line/80'} strokeWidth={1} />
              <text x={gutter - 10} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] font-medium tabular-nums">
                {axisFormat(v)}
              </text>
            </g>
          ))}

          {areaPath && <path d={areaPath} className="fill-ink/[0.06]" />}
          {prevPath && <path d={prevPath} className="fill-none stroke-[#a3a3a3]" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {curPath && <path d={curPath} className="fill-none stroke-ink" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}

          {/* end marker on the newest real point */}
          {a === null && lastIdx >= 0 && current[lastIdx] !== null && <circle cx={x(lastIdx)} cy={y(current[lastIdx] as number)} r={4} className="fill-ink stroke-white" strokeWidth={2} />}

          {a !== null && (
            <g className="pointer-events-none">
              <line x1={x(a) + 0.5} x2={x(a) + 0.5} y1={TOP} y2={TOP + PLOT_H} className="stroke-ink/25" strokeWidth={1} />
              {pv !== null && <circle cx={x(a)} cy={y(pv)} r={4} className="fill-[#a3a3a3] stroke-white" strokeWidth={2} />}
              {cv !== null && <circle cx={x(a)} cy={y(cv)} r={4.5} className="fill-ink stroke-white" strokeWidth={2} />}
            </g>
          )}

          {labels.map((l, i) => {
            if ((n - 1 - i) % every !== 0) return null;
            const half = l.length * 3.2;
            let lx = x(i);
            let anchor: 'middle' | 'start' | 'end' = 'middle';
            if (lx + half > width) {
              lx = width;
              anchor = 'end';
            } else if (lx - half < gutter) {
              lx = gutter;
              anchor = 'start';
            }
            return (
              <text key={i} x={lx} y={TOP + PLOT_H + 19} textAnchor={anchor} className={cn('text-[11px] font-medium tabular-nums', a === i ? 'fill-ink' : 'fill-muted')}>
                {l}
              </text>
            );
          })}

          <rect x={gutter} y={0} width={Math.max(width - gutter, 0)} height={TOP + PLOT_H + AXIS} fill="transparent" onPointerMove={pick} onPointerDown={pick} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)} />
        </svg>
      )}

      {a !== null && (
        <div className="pointer-events-none absolute z-10 rounded-xl border border-line bg-white px-3.5 py-2.5 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]" style={{ left: tipLeft, top: -6, width: tipW, transform: 'translateY(-100%)' }}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-2 text-[15px] font-bold tabular-nums text-ink">
              <span className="h-0.5 w-3 rounded-full bg-ink" />
              {cv !== null ? format(cv) : '—'}
            </span>
            {prev && cv !== null && pv !== null && pv !== 0 && <DeltaChip value={((cv - pv) / Math.abs(pv)) * 100} />}
          </div>
          <div className="mt-0.5 pl-5 text-[11.5px] font-medium text-muted">{longLabels[a]}</div>
          {prev && (
            <>
              <div className="mt-2 flex items-center gap-2 border-t border-line/70 pt-2 text-[13px] font-semibold tabular-nums text-ink-soft">
                <span className="h-0.5 w-3 rounded-full bg-[#a3a3a3]" />
                {pv !== null ? format(pv) : '—'}
              </div>
              <div className="mt-0.5 pl-5 text-[11.5px] font-medium text-muted">{prevLabels?.[a] ?? '—'}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Legend with line keys (two series → a legend is always present). */
export function TrendLegend({ current, previous }: { current: string; previous?: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-ink-soft">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-0.5 w-4 rounded-full bg-ink" />
        {current}
      </span>
      {previous && (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[#a3a3a3]" />
          {previous}
        </span>
      )}
    </div>
  );
}
