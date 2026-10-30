// Compact admin controls for the orders area (PDF p.07: base text 13–14 px, compact tables, tabs, action menus).
import { forwardRef, useCallback, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link } from 'react-router';
import { Check as CheckIcon, ChevronDown, Minus, Plus } from 'lucide-react';
import { useDismiss } from '@/admin/layout/popover';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Underline tabs with counts                                          */
/* ------------------------------------------------------------------ */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line/80 px-2 sm:px-3', className)}>
      {tabs.map((tab) => {
        const on = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative inline-flex h-11 shrink-0 items-center gap-2 px-2.5 text-[13.5px] font-semibold transition-colors',
              on ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className={cn('rounded-md px-1.5 py-px text-[11.5px] tabular-nums', on ? 'bg-ink text-white' : 'bg-ink/[0.06] text-ink-soft')}>{tab.count}</span>}
            <span aria-hidden className={cn('absolute inset-x-1.5 -bottom-px h-0.5 rounded-full transition-colors', on ? 'bg-ink' : 'bg-transparent')} />
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small square checkbox for tables (supports "some selected")         */
/* ------------------------------------------------------------------ */
export function Check({ checked, indeterminate, onChange, label, disabled, className }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink/10 disabled:opacity-40',
        checked || indeterminate ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-white hover:border-ink/60',
        className,
      )}
    >
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : checked ? <CheckIcon className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tooltip wrapper for disabled actions (title on a span — disabled     */
/* buttons swallow hover events)                                       */
/* ------------------------------------------------------------------ */
export function Tip({ tip, children, className }: { tip?: string | false | null; children: ReactNode; className?: string }) {
  if (!tip) return <>{children}</>;
  return (
    <span title={tip} className={cn('inline-flex cursor-not-allowed', className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Action menu ("Veprime")                                             */
/* ------------------------------------------------------------------ */
export type MenuItem =
  | { type?: 'item'; label: ReactNode; icon?: ReactNode; onClick?: () => void; to?: string; danger?: boolean; disabled?: boolean; hint?: string }
  | { type: 'separator' };

export function ActionMenu({ label, items, align = 'right', className, buttonClassName }: { label: ReactNode; items: MenuItem[]; align?: 'left' | 'right'; className?: string; buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink/35',
          open && 'border-ink/35 bg-canvas',
          buttonClassName,
        )}
      >
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            'absolute top-full z-40 mt-1.5 min-w-[236px] overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it, i) => {
            if (it.type === 'separator') return <div key={i} className="my-1 h-px bg-line/80" />;
            const cls = cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors',
              it.disabled ? 'cursor-not-allowed text-ink/35' : it.danger ? 'text-[#B42318] hover:bg-[#FDE3DF]/60' : 'text-ink hover:bg-ink/[0.05]',
            );
            const body = (
              <>
                {it.icon && <span className="grid h-4 w-4 shrink-0 place-items-center [&>svg]:h-4 [&>svg]:w-4">{it.icon}</span>}
                <span className="min-w-0 flex-1">{it.label}</span>
              </>
            );
            if (it.to && !it.disabled)
              return (
                <Link key={i} role="menuitem" to={it.to} className={cls} onClick={close}>
                  {body}
                </Link>
              );
            return (
              <button
                key={i}
                role="menuitem"
                type="button"
                title={it.disabled ? it.hint : undefined}
                aria-disabled={it.disabled || undefined}
                className={cls}
                onClick={() => {
                  if (it.disabled) return;
                  close();
                  it.onClick?.();
                }}
              >
                {body}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact form controls                                               */
/* ------------------------------------------------------------------ */
const control =
  'w-full rounded-lg border border-line bg-white px-3 text-[13.5px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-[#B42318]';

export function FieldLabel({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1 block text-[12.5px] font-semibold text-ink-soft', className)}>
      {children}
    </label>
  );
}

type Wrap = { label?: ReactNode; hint?: ReactNode; error?: ReactNode; wrapClassName?: string };

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Wrap & { leading?: ReactNode; trailing?: ReactNode }>(function TextInput(
  { label, hint, error, wrapClassName, className, id, leading, trailing, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && <FieldLabel htmlFor={fid}>{label}</FieldLabel>}
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted [&>svg]:h-4 [&>svg]:w-4">{leading}</span>}
        <input ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, 'h-9', leading && 'pl-9', trailing && 'pr-10', className)} {...rest} />
        {trailing && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] text-muted">{trailing}</span>}
      </div>
      {error ? <p className="mt-1 text-[12px] font-medium text-[#B42318]">{error}</p> : hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
});

export function SelectInput({ label, hint, wrapClassName, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & Wrap) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && <FieldLabel htmlFor={fid}>{label}</FieldLabel>}
      <div className="relative">
        <select id={fid} className={cn(control, 'h-9 cursor-pointer appearance-none pr-8', className)} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, hint, wrapClassName, className, id, rows = 3, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && <FieldLabel htmlFor={fid}>{label}</FieldLabel>}
      <textarea id={fid} rows={rows} className={cn(control, 'resize-y py-2 leading-relaxed', className)} {...rest} />
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

/** Number field that keeps the typed text while editing and commits a clamped number. */
export function NumberInput({ value, onChange, min = 0, max, step = 1, className, suffix, ariaLabel, disabled }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; className?: string; suffix?: string; ariaLabel?: string; disabled?: boolean }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const n = parseFloat(raw.replace(',', '.'));
    if (Number.isNaN(n)) return setText(String(value));
    const v = Math.min(max ?? Infinity, Math.max(min, n));
    onChange(v);
    setText(String(v));
  };
  return (
    <div className={cn('relative', className)}>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        disabled={disabled}
        value={text}
        step={step}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
        className={cn(control, 'h-9 text-right tabular-nums', suffix && 'pr-8')}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[12.5px] text-muted">{suffix}</span>}
    </div>
  );
}

/** Compact − n + stepper. */
export function Stepper({ value, onChange, min = 0, max = 9999, ariaLabel, disabled }: { value: number; onChange: (v: number) => void; min?: number; max?: number; ariaLabel?: string; disabled?: boolean }) {
  return (
    <div className={cn('inline-flex h-8 items-center rounded-lg border border-line bg-white', disabled && 'opacity-50')}>
      <button type="button" aria-label="−" disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-full w-7 place-items-center rounded-l-lg text-ink-soft hover:bg-ink/[0.04] hover:text-ink disabled:opacity-30">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        aria-label={ariaLabel}
        inputMode="numeric"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        className="h-full w-9 bg-transparent text-center text-[13px] font-semibold tabular-nums outline-none"
      />
      <button type="button" aria-label="+" disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))} className="grid h-full w-7 place-items-center rounded-r-lg text-ink-soft hover:bg-ink/[0.04] hover:text-ink disabled:opacity-30">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout bits                                                         */
/* ------------------------------------------------------------------ */
/** KPI tile — neutral, compact. */
export function Stat({ label, value, hint, onClick, active }: { label: ReactNode; value: ReactNode; hint?: ReactNode; onClick?: () => void; active?: boolean }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'block w-full min-w-0 rounded-xl border bg-white px-4 py-3.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors',
        active ? 'border-ink' : 'border-line/80',
        onClick && 'hover:border-ink/40',
      )}
    >
      <div className="truncate text-[12.5px] font-medium text-muted">{label}</div>
      <div className="mt-1 truncate text-[20px] font-bold tracking-tight text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[12px] text-muted">{hint}</div>}
    </Comp>
  );
}

/** Label / value row for money summaries. */
export function SumRow({ label, value, sub, strong, muted, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; strong?: boolean; muted?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-1.5 text-[13.5px]', className)}>
      <div className="min-w-0">
        <div className={cn(strong ? 'font-semibold text-ink' : muted ? 'text-muted' : 'text-ink-soft')}>{label}</div>
        {sub && <div className="mt-0.5 text-[12px] text-muted">{sub}</div>}
      </div>
      <div className={cn('shrink-0 text-right tabular-nums', strong ? 'font-bold text-ink' : 'font-medium text-ink')}>{value}</div>
    </div>
  );
}

/** Small uppercase label used inside side cards. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted', className)}>{children}</p>;
}

/** Inline code chip, e.g. MIFTARI10. */
export function CodeChip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-[20px] items-center rounded-md border border-line bg-canvas px-1.5 font-mono text-[11.5px] font-semibold tracking-wide text-ink', className)}>{children}</span>;
}
