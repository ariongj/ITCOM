import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Compact admin controls (13.5 px, 36–40 px high) — the storefront `Field` set is larger by design. */
export const control =
  'w-full rounded-lg border border-line bg-white px-3 text-[13.5px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:cursor-not-allowed disabled:bg-canvas/70 disabled:text-muted aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10';

interface Wrap {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  wrapClassName?: string;
}

function FieldShell({ id, label, hint, error, required, wrapClassName, children }: Wrap & { id: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', wrapClassName)}>
      {label && (
        <label htmlFor={id} className="mb-1 block text-[12.5px] font-semibold text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-muted">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-[12px] font-medium text-red-700">{error}</p> : hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export const CInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Wrap & { leading?: ReactNode; trailing?: ReactNode }>(function CInput(
  { label, hint, error, required, wrapClassName, className, id, leading, trailing, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} wrapClassName={wrapClassName}>
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{leading}</span>}
        <input ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, 'h-10', !!leading && 'pl-9', !!trailing && 'pr-10', className)} {...rest} />
        {trailing && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12.5px] text-muted">{trailing}</span>}
      </div>
    </FieldShell>
  );
});

export const CSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Wrap>(function CSelect({ label, hint, error, required, wrapClassName, className, id, children, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} wrapClassName={wrapClassName}>
      <div className="relative">
        <select ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, 'h-10 cursor-pointer appearance-none pr-9', className)} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </FieldShell>
  );
});

export const CTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Wrap>(function CTextarea({ label, hint, error, required, wrapClassName, className, id, rows = 3, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} wrapClassName={wrapClassName}>
      <textarea ref={ref} id={fid} rows={rows} aria-invalid={!!error || undefined} className={cn(control, 'resize-y py-2.5 leading-relaxed', className)} {...rest} />
    </FieldShell>
  );
});

/** Segmented single choice (Lloji, Statusi…). */
export function Segmented<T extends string>({ options, value, onChange, disabled, className, cols }: { options: { id: T; label: ReactNode; icon?: ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; disabled?: boolean; className?: string; cols?: string }) {
  return (
    <div role="radiogroup" className={cn('grid gap-1 rounded-lg bg-ink/[0.05] p-1', cols ?? 'grid-flow-col auto-cols-fr', className)}>
      {options.map((o) => {
        const on = o.id === value;
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
              'inline-flex min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed',
              on ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-ink-soft hover:text-ink disabled:hover:text-ink-soft',
            )}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Small rounded chip button (quick picks: "Nesër", "+7 ditë"…). */
export function Chip({ children, onClick, on, disabled, title }: { children: ReactNode; onClick: () => void; on?: boolean; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30 hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}
