// Small neutral building blocks shared by Analitika, Tregjet, Integrime and Harta e moduleve (PDF p.07:
// black / grey / white, statuses as text + symbol, never colour alone).
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { ArrowDownRight, ArrowUpRight, Info, Minus } from 'lucide-react';
import { useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { pctLabel } from './fmt';

/* ------------------------------------------------------------------ */
/* Status = symbol + text                                              */
/* ------------------------------------------------------------------ */
export type MarkState = 'on' | 'partial' | 'off' | 'bad';

/** ● on · ◐ partial · ○ off · ▲ bad — the symbol carries the state together with the text, so colour is never alone. */
export function StatusMark({ state, children, className }: { state: MarkState; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-semibold text-ink-soft', className)}>
      <StatusSymbol state={state} />
      {children}
    </span>
  );
}

export function StatusSymbol({ state, className }: { state: MarkState; className?: string }) {
  if (state === 'bad')
    return (
      <svg viewBox="0 0 12 12" className={cn('h-3 w-3 shrink-0 text-red-600', className)} aria-hidden>
        <path d="M6 1.2 11 10.4H1z" fill="currentColor" />
      </svg>
    );
  return (
    <svg viewBox="0 0 12 12" className={cn('h-3 w-3 shrink-0', state === 'on' ? 'text-emerald-600' : state === 'partial' ? 'text-amber-500' : 'text-ink/35', className)} aria-hidden>
      <circle cx="6" cy="6" r="4.6" fill={state === 'on' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
      {state === 'partial' && <path d="M6 1.4a4.6 4.6 0 0 1 0 9.2z" fill="currentColor" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* "Si llogaritet" — definition popover (hover, keyboard focus, tap)   */
/* ------------------------------------------------------------------ */
export function InfoTip({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  const [pos, setPos] = useState<{ left: number; top: number; up: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();
  const open = !!pos;

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const W = Math.min(300, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.left + r.width / 2 - W / 2), window.innerWidth - W - 8);
    const up = r.bottom + 190 > window.innerHeight && r.top > 200;
    setPos({ left, top: up ? r.top - 8 : r.bottom + 8, up });
  };
  const hide = () => setPos(null);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={title}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={(e) => e.pointerType === 'mouse' && hide()}
        onFocus={() => ref.current?.matches(':focus-visible') && show()}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (open) hide();
          else show();
        }}
        className={cn('-m-1 inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink/35 transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-ink/40', open && 'text-ink', className)}
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ left: pos.left, top: pos.top, width: Math.min(300, window.innerWidth - 16), transform: pos.up ? 'translateY(-100%)' : undefined }}
            className="pointer-events-none fixed z-[120] rounded-xl border border-line bg-white px-3.5 py-3 text-left shadow-[0_14px_36px_-14px_rgb(0_0_0/0.35)] animate-fade-in"
          >
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">{title}</div>
            <div className="mt-1 text-[12.5px] font-medium leading-relaxed text-ink-soft">{children}</div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { id: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('inline-flex shrink-0 rounded-lg bg-canvas p-0.5 ring-1 ring-line/70', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          title={o.title}
          aria-label={o.title}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex h-7 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[12.5px] font-semibold transition-colors',
            value === o.id ? 'bg-white text-ink shadow-sm ring-1 ring-line/70' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Delta chip — arrow + sign + %, colour = direction × "up is good"    */
/* ------------------------------------------------------------------ */
export function DeltaChip({ value, upIsGood = true, className }: { value: number | null; upIsGood?: boolean; className?: string }) {
  const lang = useLang('admin');
  if (value === null || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < 0.05;
  const up = value > 0;
  const good = up === upIsGood;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12px] font-bold tabular-nums',
        flat ? 'bg-ink/[0.06] text-ink-soft' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
      {pctLabel(value, lang)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */
export function StatTile({
  label,
  info,
  infoTitle,
  value,
  delta,
  upIsGood,
  caption,
  footer,
  to,
  className,
}: {
  label: ReactNode;
  info?: ReactNode;
  infoTitle?: string;
  value: ReactNode;
  delta?: number | null;
  upIsGood?: boolean;
  caption?: ReactNode;
  footer?: ReactNode;
  to?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-snug text-muted">
        <span className="min-w-0">{label}</span>
        {info && infoTitle && <InfoTip title={infoTitle}>{info}</InfoTip>}
      </div>
      <div className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight text-ink sm:text-[26px]">{value}</div>
      <div className="mt-1.5 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
        {delta !== undefined && <DeltaChip value={delta} upIsGood={upIsGood} />}
        {caption && <span className="text-[12px] leading-snug text-muted">{caption}</span>}
      </div>
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </>
  );
  const cls = cn('flex h-full flex-col rounded-xl border border-line/80 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5', className);
  return to ? (
    <Link to={to} className={cn(cls, 'transition-[border-color,box-shadow] hover:border-ink/20 hover:shadow-[0_6px_20px_-12px_rgb(0_0_0/0.25)]')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Callout — demo notes, caveats                                       */
/* ------------------------------------------------------------------ */
export function Callout({ icon: Icon, title, children, action, className }: { icon: ComponentType<{ className?: string }>; title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border border-line/80 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4', className)}>
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-ink ring-1 ring-line/70">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-[13px] leading-relaxed text-ink-soft">
          {title && <div className="font-semibold text-ink">{title}</div>}
          {children}
        </div>
      </div>
      {action && <div className="shrink-0 pl-11 sm:pl-0">{action}</div>}
    </div>
  );
}

/** "DEMO" chip used on simulated screens. */
export function DemoChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border border-dashed border-ink/30 bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft', className)}>
      <svg viewBox="0 0 8 8" className="h-1.5 w-1.5" aria-hidden>
        <circle cx="4" cy="4" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      {children}
    </span>
  );
}
