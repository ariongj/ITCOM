// Compact form controls + status pill for the Discounts module (neutral CMS v2 style, 13–14 px).
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown, CircleDashed, Clock3, Info, Pause, TimerOff } from 'lucide-react';
import { useDict } from '@/i18n';
import type { DiscountState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { dd } from './i18n';

/* ------------------------------------------------------------------ */
/* Status: text + symbol (never colour alone — PDF p.07)               */
/* ------------------------------------------------------------------ */
const STATE_STYLE: Record<DiscountState, string> = {
  active: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  scheduled: 'bg-white text-ink ring-ink/15',
  draft: 'bg-canvas text-ink-soft ring-ink/10',
  paused: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  expired: 'bg-canvas text-muted ring-ink/10',
};

export function StateSymbol({ state, className }: { state: DiscountState; className?: string }) {
  if (state === 'active') return <span aria-hidden className={cn('h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20', className)} />;
  const Icon = state === 'scheduled' ? Clock3 : state === 'paused' ? Pause : state === 'expired' ? TimerOff : CircleDashed;
  return <Icon aria-hidden className={cn('h-3.5 w-3.5 shrink-0', state === 'paused' && 'fill-current', className)} strokeWidth={2.2} />;
}

export function StatePill({ state, className }: { state: DiscountState; className?: string }) {
  const t = useDict(dd, 'admin');
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12px] font-semibold ring-1 ring-inset', STATE_STYLE[state], className)}>
      <StateSymbol state={state} />
      {t(`st_${state}`)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Labels, hints, notes                                                */
/* ------------------------------------------------------------------ */
export function FLabel({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-[13px] font-semibold text-ink', className)}>
      {children}
    </label>
  );
}

export function FHint({ children, className, error }: { children?: ReactNode; className?: string; error?: boolean }) {
  if (!children) return null;
  return <p className={cn('mt-1.5 text-[12.5px] leading-snug', error ? 'font-medium text-red-600' : 'text-muted', className)}>{children}</p>;
}

/** Grey explanatory note with an info icon (base of the threshold, BXGY behaviour…). */
export function Note({ children, className, icon, tone = 'grey' }: { children: ReactNode; className?: string; icon?: ReactNode; tone?: 'grey' | 'white' }) {
  return (
    <div className={cn('flex gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft', tone === 'white' ? 'bg-white ring-1 ring-inset ring-line' : 'bg-canvas', className)}>
      <span className="mt-0.5 shrink-0 text-muted">{icon ?? <Info className="h-3.5 w-3.5" />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */
const CTL =
  'w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10';

type TextProps = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode; error?: ReactNode; suffix?: ReactNode; prefix?: ReactNode; wrapClassName?: string };

export const TextField = forwardRef<HTMLInputElement, TextProps>(function TextField({ label, hint, error, suffix, prefix, wrapClassName, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && <FLabel htmlFor={fid}>{label}</FLabel>}
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] font-medium text-muted">{prefix}</span>}
        <input ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(CTL, 'h-10', prefix && 'pl-8', suffix && 'pr-10', className)} {...rest} />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] font-semibold text-muted">{suffix}</span>}
      </div>
      {error ? <FHint error>{error}</FHint> : <FHint>{hint}</FHint>}
    </div>
  );
});

/** Number input that keeps an empty string while typing; emits numbers (NaN → 0). */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step,
  allowEmpty,
  ...rest
}: Omit<TextProps, 'value' | 'onChange' | 'type'> & { value: number | undefined; onChange: (v: number | undefined) => void; allowEmpty?: boolean }) {
  return (
    <TextField
      {...rest}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step ?? 'any'}
      value={value === undefined || Number.isNaN(value) ? '' : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange(allowEmpty ? undefined : 0);
        const n = Number(raw);
        if (!Number.isNaN(n)) onChange(n);
      }}
    />
  );
}

export function SelectField({ label, hint, error, wrapClassName, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; hint?: ReactNode; error?: ReactNode; wrapClassName?: string }) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && <FLabel htmlFor={fid}>{label}</FLabel>}
      <div className="relative">
        <select id={fid} aria-invalid={!!error || undefined} className={cn(CTL, 'h-10 cursor-pointer appearance-none pr-9', className)} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {error ? <FHint error>{error}</FHint> : <FHint>{hint}</FHint>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control ("Me kod | Automatike", "% | €")                  */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md', ariaLabel }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; disabled?: boolean; title?: string }[]; className?: string; size?: 'sm' | 'md'; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex rounded-lg bg-canvas p-0.5 ring-1 ring-inset ring-line', className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.id)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              size === 'sm' ? 'h-7 px-2.5 text-[12.5px]' : 'h-8 px-3.5 text-[13px]',
              on ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-ink/10' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radio row with description + optional nested content                */
/* ------------------------------------------------------------------ */
export function Choice({ checked, onSelect, label, description, children, disabled, title }: { checked: boolean; onSelect: () => void; label: ReactNode; description?: ReactNode; children?: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <div className={cn(disabled && 'opacity-55')} title={title}>
      <button type="button" role="radio" aria-checked={checked} disabled={disabled} onClick={onSelect} className="group flex w-full items-start gap-2.5 py-1 text-left disabled:cursor-not-allowed">
        <span className={cn('mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors', checked ? 'border-ink' : 'border-ink/30 group-hover:border-ink/50')}>
          <span className={cn('h-2 w-2 rounded-full bg-ink transition-transform', checked ? 'scale-100' : 'scale-0')} />
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-medium text-ink">{label}</span>
          {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{description}</span>}
        </span>
      </button>
      {checked && children && <div className="mb-1 ml-[26px] mt-2">{children}</div>}
    </div>
  );
}

/** Compact checkbox row (neutral). */
export function Tick({ checked, onChange, label, description, disabled, title, className }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; disabled?: boolean; title?: string; className?: string }) {
  return (
    <label className={cn('flex cursor-pointer select-none items-start gap-2.5 py-1', disabled && 'cursor-not-allowed opacity-55', className)} title={title}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={cn(
          'mt-[2px] grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-ink/10',
          checked ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-white',
        )}
      >
        <svg viewBox="0 0 16 16" className={cn('h-3 w-3 transition-transform', checked ? 'scale-100' : 'scale-0')} fill="none" stroke="currentColor" strokeWidth={2.6}>
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{description}</span>}
      </span>
    </label>
  );
}

/** A disabled control can't show a native tooltip (pointer-events: none) — wrap it. */
export function WithTip({ tip, children, className }: { tip?: string; children: ReactNode; className?: string }) {
  if (!tip) return <>{children}</>;
  return (
    <span title={tip} className={cn('inline-flex cursor-not-allowed', className)}>
      {children}
    </span>
  );
}
