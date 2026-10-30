// Small UI pieces for the Online Store screens (neutral CMS look, PDF p.07).
import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarX2, ChevronDown, CircleDashed, CirclePause, Clock3, Ellipsis, type LucideIcon } from 'lucide-react';
import type { PlacementState } from '@/lib/types';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import { SD } from './i18n';

/* ------------------------------------------------------------------ */
/* Status: text + symbol, never colour alone                           */
/* ------------------------------------------------------------------ */
const STATE_META: Record<PlacementState, { icon: LucideIcon | null; cls: string }> = {
  active: { icon: null, cls: 'text-emerald-800 bg-emerald-50 ring-emerald-700/15' },
  scheduled: { icon: Clock3, cls: 'text-ink bg-white ring-ink/15' },
  draft: { icon: CircleDashed, cls: 'text-ink-soft bg-ink/[0.05] ring-ink/10' },
  expired: { icon: CalendarX2, cls: 'text-muted bg-ink/[0.04] ring-ink/10' },
  paused: { icon: CirclePause, cls: 'text-amber-900 bg-amber-50 ring-amber-700/20' },
};

export function StatePill({ state, className }: { state: PlacementState; className?: string }) {
  const t = useDict(SD, 'admin');
  const m = STATE_META[state];
  const Icon = m.icon;
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ring-1 ring-inset', m.cls, className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden /> : <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />}
      {t(`st_${state}`)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip wrapper for actions a role cannot perform                    */
/* ------------------------------------------------------------------ */
export function Tip({ text, children, className, side = 'top' }: { text?: ReactNode; children: ReactNode; className?: string; side?: 'top' | 'bottom' }) {
  if (!text) return <>{children}</>;
  return (
    <span className={cn('group/tip relative inline-flex', className)} tabIndex={0} aria-label={typeof text === 'string' ? text : undefined}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute right-0 z-40 w-max max-w-[240px] rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tip:opacity-100 group-focus-visible/tip:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {text}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  disabled,
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode; icon?: LucideIcon; title?: string }[];
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg bg-ink/[0.06] p-0.5', disabled && 'opacity-60', className)}>
      {options.map((o) => {
        const on = o.id === value;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors disabled:cursor-not-allowed',
              size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
              on ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-muted hover:text-ink',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter chip with a native select ("Pozicioni: Homepage / Kryesor ▾") */
/* ------------------------------------------------------------------ */
export function ChipSelect({ label, display, active, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; display: ReactNode; active?: boolean }) {
  return (
    <label
      className={cn(
        'relative inline-flex h-9 min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border bg-white pl-3 pr-8 text-[13px] transition-colors focus-within:ring-4 focus-within:ring-ink/5',
        active ? 'border-ink/60' : 'border-line hover:border-ink/30',
        className,
      )}
    >
      <span className="shrink-0 text-muted">{label}:</span>
      <span className="truncate font-semibold text-ink">{display}</span>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <select aria-label={label} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" {...rest}>
        {children}
      </select>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Row action menu (portal, flips up near the bottom)                   */
/* ------------------------------------------------------------------ */
export interface MenuAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  divider?: boolean;
  /** Disabled with a reason (permissions) */
  disabledReason?: string;
}

export function RowMenu({ items, label }: { items: MenuAction[]; label: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < items.length * 44 + 40;
    setPos({ x: Math.max(8, window.innerWidth - r.right), y: up ? window.innerHeight - r.top + 6 : r.bottom + 6, up });
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent | TouchEvent) => {
      const n = e.target as Node;
      if (!menu.current?.contains(n) && !btn.current?.contains(n)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={cn('grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink', pos && 'bg-ink/[0.06] text-ink')}
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              ref={menu}
              role="menu"
              initial={{ opacity: 0, scale: 0.96, y: pos.up ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              style={{ position: 'fixed', right: pos.x, ...(pos.up ? { bottom: pos.y } : { top: pos.y }), transformOrigin: pos.up ? 'bottom right' : 'top right' }}
              className="z-[70] min-w-[220px] rounded-xl border border-black/10 bg-white p-1 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => (
                <div key={i}>
                  {it.divider && <div className="mx-2 my-1 h-px bg-line" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!!it.disabledReason}
                    title={it.disabledReason}
                    onClick={() => {
                      setPos(null);
                      it.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      it.danger ? 'text-red-700 enabled:hover:bg-red-50' : 'text-ink enabled:hover:bg-ink/[0.05]',
                    )}
                  >
                    <it.icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="min-w-0 flex-1">
                      {it.label}
                      {it.disabledReason && <span className="mt-0.5 block text-[11.5px] font-normal leading-snug text-muted">{it.disabledReason}</span>}
                    </span>
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Compact form primitives                                             */
/* ------------------------------------------------------------------ */
export const ctl =
  'w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:cursor-not-allowed disabled:bg-ink/[0.03] disabled:text-muted';

export function FieldLabel({ children, htmlFor, aside }: { children: ReactNode; htmlFor?: string; aside?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-end justify-between gap-2">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-soft">
        {children}
      </label>
      {aside}
    </div>
  );
}

/** Compact native select (h-10) matching the admin inputs. */
export function SelectBox({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(ctl, 'h-10 cursor-pointer appearance-none pr-9')} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** Small uppercase group title inside a card (PDF: "forms in small labelled groups"). */
export function GroupTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted', className)}>{children}</div>;
}

/** Inline notice with an icon (info / warning / error) — text + symbol. */
export function Notice({ tone = 'info', icon: Icon, children, className }: { tone?: 'info' | 'warn' | 'error'; icon: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-[13px] leading-snug',
        tone === 'info' && 'bg-ink/[0.04] text-ink-soft',
        tone === 'warn' && 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-600/20',
        tone === 'error' && 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/15',
        className,
      )}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
