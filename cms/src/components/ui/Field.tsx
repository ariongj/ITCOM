import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 transition-colors outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-sand/50 disabled:text-muted aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/10';

export function Label({ children, htmlFor, className, required }: { children: ReactNode; htmlFor?: string; className?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-[13px] font-semibold text-ink-soft', className)}>
      {children}
      {required && <span className="ml-0.5 text-brand-600">*</span>}
    </label>
  );
}

export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-1.5 text-xs text-muted', className)}>{children}</p>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{children}</p>;
}

interface FieldWrap {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  wrapClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrap & { leading?: ReactNode; trailing?: ReactNode }>(function Input(
  { label, hint, error, required, wrapClassName, className, id, leading, trailing, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && (
        <Label htmlFor={fid} required={required}>
          {label}
        </Label>
      )}
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">{leading}</span>}
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error || undefined}
          className={cn(control, 'h-11', leading && 'pl-10', trailing && 'pr-12', className)}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-3 flex items-center text-sm text-muted">{trailing}</span>}
      </div>
      {error ? <FieldError>{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrap>(function Textarea(
  { label, hint, error, required, wrapClassName, className, id, rows = 4, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && (
        <Label htmlFor={fid} required={required}>
          {label}
        </Label>
      )}
      <textarea ref={ref} id={fid} rows={rows} aria-invalid={!!error || undefined} className={cn(control, 'resize-y py-3 leading-relaxed', className)} {...rest} />
      {error ? <FieldError>{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldWrap>(function Select(
  { label, hint, error, required, wrapClassName, className, id, children, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <div className={wrapClassName}>
      {label && (
        <Label htmlFor={fid} required={required}>
          {label}
        </Label>
      )}
      <div className="relative">
        <select ref={ref} id={fid} aria-invalid={!!error || undefined} className={cn(control, 'h-11 cursor-pointer appearance-none pr-10', className)} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {error ? <FieldError>{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
});

export function Checkbox({ checked, onChange, label, description, className, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 select-none', disabled && 'cursor-not-allowed opacity-60', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-brand-600/20',
          checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink/25 bg-white',
        )}
      >
        <svg viewBox="0 0 16 16" className={cn('h-3.5 w-3.5 transition-transform', checked ? 'scale-100' : 'scale-0')} fill="none" stroke="currentColor" strokeWidth={2.4}>
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm leading-snug">
        <span className="font-semibold text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Switch({ checked, onChange, label, size = 'md', disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; size?: 'sm' | 'md'; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex min-h-6 cursor-pointer items-center gap-2.5 select-none', disabled && 'cursor-not-allowed opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 rounded-full transition-colors duration-200',
          size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
          checked ? 'bg-brand-600' : 'bg-ink/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200',
            size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
            checked && (size === 'sm' ? 'translate-x-4' : 'translate-x-5'),
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-ink">{label}</span>}
    </label>
  );
}

/** Large selectable card used for delivery / payment choices. */
export function RadioCard({
  checked,
  onSelect,
  title,
  description,
  icon,
  aside,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  aside?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        'flex w-full items-start gap-3.5 rounded-2xl border bg-white p-4 text-left transition-all',
        checked ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30',
        disabled && 'opacity-50',
      )}
    >
      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors', checked ? 'border-ink' : 'border-ink/25')}>
        <span className={cn('h-2.5 w-2.5 rounded-full bg-ink transition-transform', checked ? 'scale-100' : 'scale-0')} />
      </span>
      {icon && <span className="mt-0.5 text-ink-soft">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>
      {aside && <span className="shrink-0 text-sm font-semibold text-ink">{aside}</span>}
    </button>
  );
}
