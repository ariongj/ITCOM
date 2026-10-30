// Small neutral building blocks for the inventory + purchasing screens (CMS v2 design, PDF p.07):
// statuses are always text + a symbol, never colour alone.
import { useState, type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleDotDashed,
  ClipboardCheck,
  Infinity as InfinityIcon,
  Minus,
  PackageCheck,
  Plus,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { useDict, useLang } from '@/i18n';
import type { MovementReason, PurchaseOrderStatus } from '@/lib/types';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import { inv } from './dict';
import type { StockState } from './helpers';

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/* ------------------------------------------------------------------ */
/* Status tags                                                         */
/* ------------------------------------------------------------------ */
const TAG = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-semibold leading-5 ring-1 ring-inset';

const TONES = {
  neutral: 'bg-ink/[0.04] text-ink-soft ring-ink/10',
  dark: 'bg-white text-ink ring-ink/25',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/15',
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  muted: 'bg-transparent text-muted ring-line',
} as const;
export type TagTone = keyof typeof TONES;

export function Tag({ icon: I, tone = 'neutral', children, className, title }: { icon?: Icon; tone?: TagTone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span className={cn(TAG, TONES[tone], className)} title={title}>
      {I && <I className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />}
      {children}
    </span>
  );
}

/** Stock state next to the available quantity: low ▲, out ⊘, made to order ∞. */
export function StockStateTag({ state, className }: { state: StockState; className?: string }) {
  const t = useDict(inv, 'admin');
  if (state === 'ok') return null;
  if (state === 'untracked')
    return (
      <Tag icon={InfinityIcon} tone="muted" className={className} title={t('untrackedHint')}>
        {t('untracked')}
      </Tag>
    );
  if (state === 'out')
    return (
      <Tag icon={Ban} tone="red" className={className}>
        {t('outTag')}
      </Tag>
    );
  return (
    <Tag icon={TriangleAlert} tone="amber" className={className}>
      {t('lowTag')}
    </Tag>
  );
}

export const PO_STATUS_META: Record<PurchaseOrderStatus, { icon: Icon; tone: TagTone }> = {
  draft: { icon: CircleDashed, tone: 'muted' },
  sent: { icon: Send, tone: 'dark' },
  partial: { icon: CircleDotDashed, tone: 'amber' },
  closed: { icon: CircleCheck, tone: 'green' },
};

export function PoStatusTag({ status, className }: { status: PurchaseOrderStatus; className?: string }) {
  const t = useDict(inv, 'admin');
  const m = PO_STATUS_META[status];
  return (
    <Tag icon={m.icon} tone={m.tone} className={className}>
      {t(`st_${status}`)}
    </Tag>
  );
}

export const REASON_ICON: Record<MovementReason, Icon> = {
  sale: ShoppingCart,
  received: PackageCheck,
  correction: SlidersHorizontal,
  count: ClipboardCheck,
  damaged: TriangleAlert,
  return: Undo2,
};

export function ReasonLabel({ reason, className }: { reason: MovementReason; className?: string }) {
  const t = useDict(inv, 'admin');
  const I = REASON_ICON[reason];
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-semibold text-ink', className)}>
      <I className="h-3.5 w-3.5 shrink-0 text-muted" />
      {t(`r_${reason}`)}
    </span>
  );
}

/** +120 / −3 with an in/out arrow (symbol, not only colour). */
export function DeltaQty({ delta, unit, className }: { delta: number; unit?: string; className?: string }) {
  const lang = useLang('admin');
  const I = delta >= 0 ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap font-bold tabular-nums', delta >= 0 ? 'text-emerald-700' : 'text-ink', className)}>
      <I className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
      {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
      {num(Math.abs(delta), lang)}
      {unit && <span className="ml-0.5 text-[11.5px] font-medium text-muted">{unit}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* KPI tile (clickable = filter)                                       */
/* ------------------------------------------------------------------ */
export function Stat({ label, value, hint, icon: I, active, onClick, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: Icon; active?: boolean; onClick?: () => void; tone?: 'amber' | 'red' }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'group min-w-0 rounded-xl border bg-white p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow]',
        active ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line/80',
        onClick && !active && 'hover:border-ink/30',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-semibold text-muted">{label}</span>
        {I && (
          <I
            className={cn('h-4 w-4 shrink-0', tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-red-600' : 'text-muted/80')}
            strokeWidth={2}
          />
        )}
      </div>
      <div className="mt-1.5 truncate text-[22px] font-bold leading-tight tracking-tight text-ink tabular-nums sm:text-[24px]">{value}</div>
      {hint && <div className="mt-0.5 truncate text-[12px] text-muted">{hint}</div>}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* Compact form controls (h-9/h-10, rounded-lg)                        */
/* ------------------------------------------------------------------ */
export const controlClass =
  'w-full rounded-lg border border-line bg-white text-[14px] text-ink outline-none transition placeholder:text-muted/60 hover:border-ink/20 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:cursor-not-allowed disabled:bg-canvas/70 disabled:text-muted disabled:hover:border-line';

export function FieldLabel({ children, htmlFor, aside }: { children: ReactNode; htmlFor?: string; aside?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-ink-soft">
        {children}
      </label>
      {aside && <span className="text-[12px] text-muted">{aside}</span>}
    </div>
  );
}

export function TextField({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(controlClass, 'h-10 px-3', invalid && 'border-red-500! ring-4 ring-red-500/10', className)} {...rest} />;
}

export function SelectField({ className, children, icon, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { icon?: ReactNode }) {
  return (
    <div className={cn('relative', className)}>
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
      <select className={cn(controlClass, 'h-10 cursor-pointer appearance-none truncate pr-9', icon ? 'pl-9' : 'pl-3')} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

/**
 * Integer field that tolerates an empty value while typing. `signed` allows a leading minus.
 * Re-syncs when the value changes from outside.
 */
export function IntField({
  value,
  onChange,
  signed,
  min,
  max,
  invalid,
  className,
  size = 'md',
  stepper,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'min' | 'max'> & {
  value: number | null;
  onChange: (v: number | null) => void;
  signed?: boolean;
  min?: number;
  max?: number;
  invalid?: boolean;
  size?: 'sm' | 'md';
  stepper?: boolean;
}) {
  const show = (v: number | null) => (v == null ? '' : String(v));
  const [text, setText] = useState(() => show(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if (value !== (text === '' || text === '-' ? null : Number(text))) setText(show(value));
  }
  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min ?? (signed ? -Infinity : 0), n));
  const commit = (raw: string) => {
    const clean = raw.replace(signed ? /[^\d-]/g : /[^\d]/g, '').replace(/(?!^)-/g, '');
    setText(clean);
    if (clean === '' || clean === '-') {
      setPrev(null);
      onChange(null);
      return;
    }
    const n = parseInt(clean, 10);
    if (!Number.isNaN(n)) {
      setPrev(n);
      onChange(n);
    }
  };
  const h = size === 'sm' ? 'h-9' : 'h-10';
  const input = (
    <input
      type="text"
      inputMode={signed ? 'text' : 'numeric'}
      value={text}
      aria-invalid={invalid || undefined}
      onChange={(e) => commit(e.target.value)}
      onBlur={() => {
        if (value != null && clamp(value) !== value) onChange(clamp(value));
      }}
      className={cn(
        controlClass,
        h,
        'px-2.5 tabular-nums',
        stepper ? 'text-center' : 'text-right',
        size === 'sm' && 'text-[13.5px]',
        stepper && 'rounded-none border-x-0 hover:border-line focus:border-line focus:ring-0!',
        invalid && 'border-red-500! ring-4 ring-red-500/10',
        className,
      )}
      {...rest}
    />
  );
  if (!stepper) return input;
  const step = (d: number) => onChange(clamp((value ?? 0) + d));
  const btn = cn('grid w-9 shrink-0 place-items-center border border-line bg-white text-ink-soft transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40', h);
  return (
    <div className="flex items-stretch">
      <button type="button" aria-label="−1" className={cn(btn, 'rounded-l-lg')} onClick={() => step(-1)} disabled={rest.disabled || (min != null && (value ?? 0) <= min)}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      {input}
      <button type="button" aria-label="+1" className={cn(btn, 'rounded-r-lg')} onClick={() => step(1)} disabled={rest.disabled || (max != null && (value ?? 0) >= max)}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Euro amount with a "€" prefix; accepts "12,90" and "12.90", shows the admin locale's separator. */
export function MoneyField({ value, onChange, invalid, className, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & { value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const lang = useLang('admin');
  const sep = lang === 'en' ? '.' : ',';
  const show = (v: number) => (v % 1 ? v.toFixed(2) : String(v)).replace('.', sep);
  const [text, setText] = useState(() => show(value));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(show(value));
  }
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[12.5px] text-muted">€</span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.,]/g, '');
          setText(raw);
          const n = Number(raw.replace(',', '.'));
          const v = raw.trim() === '' || Number.isNaN(n) ? 0 : Math.round(n * 100) / 100;
          setPrev(v);
          onChange(v);
        }}
        onBlur={() => setText(show(value))}
        className={cn(controlClass, 'h-9 pl-6 pr-2.5 text-right text-[13.5px] tabular-nums', invalid && 'border-red-500! ring-4 ring-red-500/10')}
        {...rest}
      />
    </div>
  );
}

/** Segmented control (two to three short choices). */
export function Segmented<T extends string>({ value, onChange, options, className, full }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; icon?: Icon }[]; className?: string; full?: boolean }) {
  return (
    <div role="tablist" className={cn('inline-flex rounded-lg bg-canvas p-0.5 ring-1 ring-inset ring-line/70', full && 'flex w-full', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-all',
            full && 'flex-1',
            value === o.id ? 'bg-white text-ink shadow-sm ring-1 ring-line/80' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon && <o.icon className="h-3.5 w-3.5" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Wraps a control the current role may not use: disabled look + a tooltip explaining why. */
export function Gate({ allowed, reason, children, className }: { allowed: boolean; reason: string; children: ReactNode; className?: string }) {
  if (allowed) return <>{children}</>;
  return (
    <span title={reason} className={cn('inline-flex cursor-not-allowed', className)} tabIndex={0} aria-label={reason}>
      <span className="pointer-events-none inline-flex opacity-50">{children}</span>
    </span>
  );
}

/** Received / rejected / remaining bar (rejected is hatched so it never relies on colour alone). */
export function ReceiveBar({ ordered, received, rejected, className }: { ordered: number; received: number; rejected: number; className?: string }) {
  const pct = (n: number) => (ordered ? Math.min(100, (n / ordered) * 100) : 0);
  return (
    <div className={cn('flex h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.08]', className)} aria-hidden>
      <div className="h-full bg-ink" style={{ width: `${pct(received)}%` }} />
      <div className="h-full bg-[repeating-linear-gradient(135deg,#9ca3af_0_2px,transparent_2px_4px)]" style={{ width: `${pct(rejected)}%` }} />
    </div>
  );
}

/** Small icon-only button. */
export function IconBtn({ label, onClick, children, disabled, className }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:pointer-events-none disabled:opacity-30', className)}
    >
      {children}
    </button>
  );
}
