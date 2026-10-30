import { useEffect, useId, useState, type ComponentType, type InputHTMLAttributes, type ReactNode } from 'react';
import { Label, Hint, Switch } from '@/components/ui/Field';
import { useDict } from '@/i18n';
import type { Settings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { T } from './i18n';

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */
export type SetSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => void;
export type Errors = Partial<Record<string, string>>;
export interface SectionProps {
  s: Settings;
  set: SetSetting;
  errors: Errors;
}

/** Legacy section ids (SiteSections.tsx); the settings space uses model.ts. */
export type SectionId = string;

/* ------------------------------------------------------------------ */
/* Demo placeholder detection ("Shembull" chip)                        */
/* ------------------------------------------------------------------ */
const SAMPLE_EXACT = ['81XXXXXXX', '330XXXXXX', 'XK05 XXXX XXXX XXXX XXXX'];
const SAMPLE_PART = ['XXXX'];

/**
 * True when a contact/legal value is still a seeded demo placeholder.
 * A capital X counts as a placeholder digit unless it starts an Albanian word (Xh…, Xe…).
 */
export function isExample(value?: string | null) {
  const v = (value ?? '').trim();
  if (!v) return false;
  return SAMPLE_EXACT.includes(v) || SAMPLE_PART.some((p) => v.includes(p)) || /X(?![a-zçë])/.test(v);
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */
export function ExampleChip({ className }: { className?: string }) {
  const t = useDict(T, 'admin');
  return (
    <span
      title={t('exampleTitle')}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-amber-800 ring-1 ring-inset ring-amber-600/25',
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-amber-500" />
      {t('example')}
    </span>
  );
}

export function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  actions,
  children,
  bodyClassName,
}: {
  id: SectionId;
  icon: ComponentType<{ className?: string }>;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section id={`s-${id}`} data-section={id} className="scroll-mt-[136px] xl:scroll-mt-24">
      <div className="rounded-2xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(28_26_23/0.04)]">
        <header className="flex items-start gap-3.5 border-b border-line/70 px-5 py-4 sm:px-6">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-canvas text-ink-soft ring-1 ring-inset ring-line/80">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1 pt-px">
            <h2 className="text-[15px] font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <div className={cn('p-5 sm:p-6', bodyClassName)}>{children}</div>
      </div>
    </section>
  );
}

/** Small uppercase sub-heading with a hairline, used to group fields inside a card. */
export function Group({ title, hint, actions, children, className }: { title: ReactNode; hint?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className={cn('flex items-center gap-3', hint ? 'mb-1' : 'mb-4')}>
        <h3 className="min-w-0 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{title}</h3>
        <span className="h-px min-w-6 flex-1 bg-line/70" />
        {actions}
      </div>
      {hint && <p className="mb-4 text-[12.5px] leading-snug text-muted">{hint}</p>}
      {children}
    </div>
  );
}

export function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors disabled:opacity-30',
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-ink/[0.06] hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

/** Icon tile + title + description + switch. */
export function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
  disabled,
  badge,
}: {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 py-3.5 first:pt-0 last:pb-0 sm:gap-4">
      <span
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-colors',
          checked ? 'bg-brand-50 text-brand-700 ring-brand-600/15' : 'bg-canvas text-muted ring-line/80',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
          {title}
          {badge}
        </div>
        {description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{description}</p>}
      </div>
      {/* The visually hidden label gives the switch an accessible name; gap-0 keeps it flush right. */}
      <span className="flex shrink-0 [&>label]:gap-0">
        <Switch checked={checked} onChange={onChange} disabled={disabled} label={<span className="sr-only">{title}</span>} />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs (compact admin size — matches L10nInput)                      */
/* ------------------------------------------------------------------ */
const control =
  'w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-muted/60 focus:border-ink/40 focus:ring-4 focus:ring-ink/5';

const exampleCls = 'border-amber-300 bg-amber-50/40 focus:border-amber-500/70 focus:ring-amber-500/10';
const errorCls = 'border-red-400 focus:border-red-500 focus:ring-red-500/10';

type BaseProps = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  /** Check the value for demo placeholders and show the "Primjer" chip. */
  example?: boolean;
  optional?: boolean;
  className?: string;
  labelAside?: ReactNode;
};

function FieldLabel({ id, label, optional, chip, aside }: { id: string; label?: ReactNode; optional?: boolean; chip: boolean; aside?: ReactNode }) {
  const t = useDict(T, 'admin');
  if (!label && !chip && !aside) return null;
  return (
    // Same label→control rhythm as L10nInput (whose label row is ~26px + 6px gap).
    <div className="mb-2.5 flex min-h-6 items-center justify-between gap-2">
      <Label htmlFor={id} className="mb-0!">
        {label}
        {optional && <span className="ml-1 font-normal text-muted/80">({t('optional')})</span>}
      </Label>
      <span className="flex items-center gap-2">
        {aside}
        {chip && <ExampleChip />}
      </span>
    </div>
  );
}

function Foot({ error, hint }: { error?: string; hint?: ReactNode }) {
  if (error) return <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>;
  if (hint) return <Hint>{hint}</Hint>;
  return null;
}

export function TextField({
  label,
  hint,
  error,
  example,
  optional,
  className,
  labelAside,
  value,
  onChange,
  leading,
  trailing,
  inputClassName,
  ...rest
}: BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'> & {
    value: string;
    onChange: (v: string) => void;
    leading?: ReactNode;
    trailing?: ReactNode;
    inputClassName?: string;
  }) {
  const id = useId();
  const chip = !!example && isExample(value);
  return (
    <div className={className}>
      <FieldLabel id={id} label={label} optional={optional} chip={chip} aside={labelAside} />
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{leading}</span>}
        <input
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          data-example={chip || undefined}
          data-error={!!error || undefined}
          aria-invalid={!!error || undefined}
          className={cn(control, 'h-10', leading && 'pl-9', trailing && !/(^|\s)pr-/.test(inputClassName ?? '') && 'pr-10', chip && exampleCls, error && errorCls, inputClassName)}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-3 flex items-center text-[13px] font-semibold text-muted">{trailing}</span>}
      </div>
      <Foot error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  className,
  labelAside,
  value,
  onChange,
  rows = 3,
  placeholder,
}: BaseProps & { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <FieldLabel id={id} label={label} optional={optional} chip={false} aside={labelAside} />
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        data-error={!!error || undefined}
        aria-invalid={!!error || undefined}
        className={cn(control, 'resize-y py-2.5 leading-relaxed', error && errorCls)}
      />
      <Foot error={error} hint={hint} />
    </div>
  );
}

/* Numbers keep their own text while typing ("12," / empty) and commit only valid values. */
const parseNum = (s: string): number | null => {
  const v = s.trim().replace(',', '.');
  if (!v || !/^\d*\.?\d*$/.test(v) || v === '.') return null;
  return Number(v);
};
const fmtNum = (n: number) => (Number.isFinite(n) ? String(n) : '');

export function NumberField({
  value,
  onChange,
  ...rest
}: BaseProps & { value: number; onChange: (n: number) => void; trailing?: ReactNode; leading?: ReactNode; placeholder?: string; inputClassName?: string }) {
  const [raw, setRaw] = useState(() => fmtNum(value));
  useEffect(() => {
    setRaw((r) => (parseNum(r) === value ? r : fmtNum(value)));
  }, [value]);
  return (
    <TextField
      {...rest}
      value={raw}
      inputMode="decimal"
      onChange={(v) => {
        const clean = v.replace(/[^\d.,]/g, '');
        setRaw(clean);
        const n = parseNum(clean);
        if (n !== null) onChange(n);
      }}
      onBlur={() => setRaw(fmtNum(value))}
    />
  );
}

/* Comma-separated list (cities) — the raw text is kept while typing so commas and spaces work. */
const splitList = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
const joinList = (a: string[]) => a.join(', ');

export function ListField({ value, onChange, ...rest }: BaseProps & { value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const [raw, setRaw] = useState(() => joinList(value));
  useEffect(() => {
    setRaw((r) => (joinList(splitList(r)) === joinList(value) ? r : joinList(value)));
  }, [value]);
  return (
    <TextAreaField
      {...rest}
      value={raw}
      onChange={(v) => {
        setRaw(v);
        const next = splitList(v);
        if (joinList(next) !== joinList(value)) onChange(next);
      }}
    />
  );
}

/** "12 / 60 characters" counter that turns amber past the recommended length. */
export function CharCount({ n, max }: { n: number; max: number }) {
  const t = useDict(T, 'admin');
  const over = n > max;
  return (
    <span className="flex items-center justify-between gap-3">
      <span className={cn(over ? 'font-medium text-amber-700' : 'text-muted')}>{over ? t('tooLong') : ''}</span>
      <span className={cn('tabular-nums', over ? 'font-semibold text-amber-700' : 'text-muted')}>{t('chars', { n, max })}</span>
    </span>
  );
}
