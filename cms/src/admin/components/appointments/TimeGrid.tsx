import { useMemo, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { useDict, useL } from '@/i18n';
import type { Booking, Service, Staff } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ap } from './i18n';
import { fromMin, minutesOf, timeRange } from './dates';
import { GRID_FROM, GRID_TO, type DayWindow } from './rules';
import { StatusMark, firstName, tint } from './shared';

export interface GridColumn {
  key: string;
  /** "YYYY-MM-DD" */
  day: string;
  title: ReactNode;
  sub?: ReactNode;
  bookings: Booking[];
  window: DayWindow;
  isToday?: boolean;
  /** Day view by staff: the column's staff member (pre-fills "add booking") */
  staffId?: string;
  /** Header accessory (avatar) */
  icon?: ReactNode;
}

const HATCH = 'repeating-linear-gradient(135deg, rgb(0 0 0 / 0.045) 0 6px, transparent 6px 12px)';

/** Overlapping bookings sit side by side: greedy lanes per cluster. */
function layout(list: Booking[]) {
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start) || b.durationMin - a.durationMin);
  const out: { b: Booking; lane: number; lanes: number }[] = [];
  let cluster: { b: Booking; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const c of cluster) out.push({ ...c, lanes });
    cluster = [];
    laneEnds = [];
  };
  for (const b of sorted) {
    const s = new Date(b.start).getTime();
    const e = s + b.durationMin * 60000;
    if (s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    cluster.push({ b, lane });
    clusterEnd = Math.max(clusterEnd, e);
  }
  flush();
  return out;
}

/**
 * Time grid 09:00–20:00 (store hours 10:00–19:30). Columns are days (week view) or staff members (day view).
 * Bookings are positioned by start/duration, coloured by service, and always carry a text status.
 */
export function TimeGrid({
  columns,
  services,
  staff,
  selectedId,
  onSelect,
  onSlot,
  now,
  pxPerMin = 1,
  highlight,
}: {
  columns: GridColumn[];
  services: Service[];
  staff: Staff[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  /** Click on an empty, open slot */
  onSlot?: (day: string, minutes: number, staffId?: string) => void;
  now: number;
  pxPerMin?: number;
  /** Search: ids to emphasise (others are dimmed) */
  highlight?: Set<string> | null;
}) {
  const t = useDict(ap, 'admin');
  const l = useL('admin');
  const [hover, setHover] = useState<{ col: string; min: number } | null>(null);
  const svc = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const team = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const height = (GRID_TO - GRID_FROM) * pxPerMin;
  const hours = useMemo(() => Array.from({ length: (GRID_TO - GRID_FROM) / 60 + 1 }, (_, i) => GRID_FROM + i * 60), []);
  const nowDate = new Date(now);
  const nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();

  const slotAt = (col: GridColumn, y: number) => {
    const min = GRID_FROM + Math.floor(y / pxPerMin / 30) * 30;
    if (!col.window.open || min < col.window.from || min + 30 > col.window.to) return null;
    return min;
  };

  return (
    <div className="min-w-0">
      {/* Column headers */}
      <div className="flex border-b border-line/80">
        <div className="w-12 shrink-0 sm:w-14" />
        {columns.map((c) => (
          <div key={c.key} className={cn('min-w-0 flex-1 border-l border-line/60 px-2 py-2.5 first-of-type:border-l-0 sm:px-3', !c.window.open && 'bg-canvas/50')}>
            <div className="flex min-w-0 items-center gap-2">
              {c.icon}
              <span className={cn('truncate text-[13px] font-semibold', c.isToday ? 'text-ink' : 'text-ink-soft')}>{c.title}</span>
              {c.isToday && !c.icon && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-hidden />}
            </div>
            {c.sub && <div className="mt-0.5 truncate text-[11.5px] text-muted">{c.sub}</div>}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="relative flex">
        {/* Hour gutter */}
        <div className="relative w-12 shrink-0 sm:w-14" style={{ height }}>
          {hours.map((h, i) => (
            <span
              key={h}
              className={cn('absolute right-2 text-[11px] tabular-nums text-muted sm:right-2.5', i === 0 ? 'top-1' : '-translate-y-1/2')}
              style={i === 0 ? undefined : { top: (h - GRID_FROM) * pxPerMin }}
            >
              {i === hours.length - 1 ? '' : fromMin(h)}
            </span>
          ))}
        </div>

        {columns.map((c) => {
          const items = layout(c.bookings);
          const ghost = hover?.col === c.key ? hover.min : null;
          return (
            <div
              key={c.key}
              className={cn('relative min-w-0 flex-1 border-l border-line/60', onSlot && c.window.open && 'cursor-cell')}
              style={{
                height,
                backgroundImage: `linear-gradient(to bottom, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, rgb(0 0 0 / 0.03) 1px, transparent 1px)`,
                backgroundSize: `100% ${60 * pxPerMin}px, 100% ${30 * pxPerMin}px`,
              }}
              onMouseMove={(e) => {
                if (!onSlot) return;
                if ((e.target as HTMLElement).closest('[data-booking]')) return setHover(null);
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                const min = slotAt(c, y);
                if (min === null) return setHover(null);
                if (hover?.col !== c.key || hover.min !== min) setHover({ col: c.key, min });
              }}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                if (!onSlot || (e.target as HTMLElement).closest('[data-booking]')) return;
                const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                const min = slotAt(c, y);
                if (min !== null) onSlot(c.day, min, c.staffId);
              }}
            >
              {/* Closed / outside opening hours — hatched */}
              {!c.window.open ? (
                <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ backgroundImage: HATCH }}>
                  <span className="rounded-md bg-white/90 px-2 py-1 text-[11.5px] font-semibold text-muted ring-1 ring-line">
                    {c.window.exception ? l(c.window.exception.label) : t('closed')}
                  </span>
                </div>
              ) : (
                <>
                  {c.window.from > GRID_FROM && <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: (Math.min(c.window.from, GRID_TO) - GRID_FROM) * pxPerMin, backgroundImage: HATCH }} />}
                  {c.window.to < GRID_TO && <div className="pointer-events-none absolute inset-x-0 bottom-0" style={{ height: (GRID_TO - Math.max(c.window.to, GRID_FROM)) * pxPerMin, backgroundImage: HATCH }} />}
                </>
              )}

              {/* Hover ghost → click to add */}
              {ghost !== null && (
                <div className="pointer-events-none absolute inset-x-1 z-[1] flex items-center gap-1 rounded-md border border-dashed border-ink/30 bg-white/70 px-2 text-[11.5px] font-semibold text-ink-soft" style={{ top: (ghost - GRID_FROM) * pxPerMin + 1, height: 30 * pxPerMin - 2 }}>
                  <Plus className="h-3 w-3" /> {fromMin(ghost)}
                </div>
              )}

              {/* Bookings */}
              {items.map(({ b, lane, lanes }) => {
                const s = svc.get(b.serviceId);
                const color = s?.color ?? '#6b6b6b';
                const start = Math.max(GRID_FROM, minutesOf(b.start));
                const end = Math.min(GRID_TO, minutesOf(b.start) + b.durationMin);
                if (end <= GRID_FROM || start >= GRID_TO) return null;
                const top = (start - GRID_FROM) * pxPerMin;
                const h = Math.max(22, (end - start) * pxPerMin - 2);
                const off = b.status === 'cancelled' || b.status === 'noshow';
                const pending = b.status === 'pending';
                const dim = highlight ? !highlight.has(b.id) : false;
                const member = team.get(b.staffId);
                const name = s ? l(s.name) : '—';
                const tall = h >= 64;
                const short = h < 40;
                // several bookings side by side in a narrow day column → client first, status below
                const narrow = lanes >= 2 && columns.length >= 4;
                return (
                  <button
                    key={b.id}
                    type="button"
                    data-booking
                    onClick={() => onSelect(b.id)}
                    title={`${name} / ${b.customerName}\n${timeRange(b.start, b.durationMin)} · ${member?.name ?? ''} · ${t(`st_${b.status}`)}`}
                    className={cn(
                      'group absolute z-[2] flex flex-col justify-start overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-[box-shadow,transform,opacity] hover:z-[3] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink sm:px-2',
                      pending && 'border-y border-r border-dashed',
                      selectedId === b.id && 'z-[3] ring-2 ring-ink ring-offset-1',
                      dim && 'opacity-30',
                    )}
                    style={{
                      top: top + 1,
                      height: h,
                      left: `calc(${(lane / lanes) * 100}% + 3px)`,
                      width: `calc(${100 / lanes}% - 6px)`,
                      background: off ? '#f4f4f4' : tint(color, 13),
                      borderLeftColor: off ? '#b5b5b5' : color,
                      ...(pending ? { borderTopColor: tint(color, 60), borderRightColor: tint(color, 60), borderBottomColor: tint(color, 60) } : {}),
                    }}
                  >
                    <span className={cn('block truncate text-[12px] font-semibold leading-4 text-ink', off && 'text-muted line-through decoration-ink/30')}>
                      {narrow ? b.customerName : `${name} / ${b.customerName}`}
                    </span>
                    {!short && (
                      <span className={cn('mt-0.5 flex min-w-0 items-center gap-1 text-[11px] leading-4', off ? 'text-muted' : 'text-ink-soft')}>
                        <StatusMark status={b.status} className="font-medium" />
                        {!narrow && <span className="truncate text-muted">· {firstName(member)}</span>}
                      </span>
                    )}
                    {tall && <span className="mt-0.5 block truncate text-[11px] leading-4 text-muted tabular-nums">{timeRange(b.start, b.durationMin)}{b.city ? ` · ${b.city}` : ''}</span>}
                  </button>
                );
              })}

              {/* Now line */}
              {c.isToday && nowMin > GRID_FROM && nowMin < GRID_TO && (
                <div className="pointer-events-none absolute inset-x-0 z-[4] flex items-center" style={{ top: (nowMin - GRID_FROM) * pxPerMin }}>
                  <span className="-ml-1 h-2 w-2 rounded-full bg-ink" />
                  <span className="h-px flex-1 bg-ink" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
