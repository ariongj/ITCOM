import { useEffect, useRef, useState, type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Archive, Check, ChevronDown, CircleDashed, Ellipsis, Infinity as InfinityIcon, Minus, XCircle } from 'lucide-react';
import { Label, Hint, FieldError, Switch } from '@/components/ui/Field';
import { Badge } from '@/components/ui/misc';
import { useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import type { L10n, Lang, Product, ProductStatus } from '@/lib/types';
import { discountPct } from '@/lib/pricing';
import { num, unitLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import { pd } from './dict';
import { LOW_STOCK, isTracked, variantCount, type ProductX } from './model';

/* ------------------------------------------------------------------ */
/* Status — text + symbol, never colour alone (PDF p.07)               */
/* ------------------------------------------------------------------ */
export function StatusLabel({ status, className }: { status: ProductStatus; className?: string }) {
  const t = useDict(pd, 'admin');
  const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold';
  if (status === 'active')
    return (
      <span className={cn(base, 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-700/15', className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />
        {t('st_active')}
      </span>
    );
  if (status === 'draft')
    return (
      <span className={cn(base, 'bg-ink/[0.06] text-ink-soft', className)}>
        <CircleDashed className="h-3 w-3" aria-hidden />
        {t('st_draft')}
      </span>
    );
  return (
    <span className={cn(base, 'bg-white text-muted ring-1 ring-inset ring-line', className)}>
      <Archive className="h-3 w-3" aria-hidden />
      {t('st_archived')}
    </span>
  );
}

/** "36 në 2 variante" (PDF p.12) — or "14 copë", "Me porosi", with a symbol for low / out of stock. */
export function InventoryCell({ product, className }: { product: ProductX; className?: string }) {
  const t = useDict(pd, 'admin');
  const lang = useLang('admin');
  const v = variantCount(product);
  if (!isTracked(product))
    return (
      <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-muted', className)}>
        <InfinityIcon className="h-3.5 w-3.5" aria-hidden />
        {t('madeToOrder')}
        {v > 1 && <span className="text-[12px]">· {t('variantsN', { n: v })}</span>}
      </span>
    );
  const s = product.stock;
  const unit = product.unit === 'm2' ? t('packsUnit') : unitLabel(product.unit, lang);
  const text = v > 0 ? t(v === 1 ? 'inv_in_one' : 'inv_in_many', { n: num(s, lang), v }) : `${num(s, lang)} ${unit}`;
  const out = s <= 0;
  const low = !out && s <= LOW_STOCK;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums', out ? 'text-red-700' : low ? 'text-amber-800' : 'text-ink', className)} title={out ? t('outOfStock') : low ? t('lowStock') : undefined}>
      {out ? <XCircle className="h-3.5 w-3.5" aria-hidden /> : low ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : null}
      {text}
      {(out || low) && <span className="sr-only">({out ? t('outOfStock') : t('lowStock')})</span>}
    </span>
  );
}

/** Wrap a control the current role may not use: keeps it visible, disabled, with the reason as tooltip. */
export function PermWrap({ ok, reason, children, className }: { ok: boolean; reason: string; children: ReactNode; className?: string }) {
  if (ok) return <>{children}</>;
  return (
    <span title={reason} className={cn('inline-flex cursor-not-allowed', className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Compact admin form controls (h-10, rounded-lg — matches L10nInput)  */
/* ------------------------------------------------------------------ */

export function FormField({ label, hint, error, required, children, className, aside }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; required?: boolean; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <div className={className}>
      {(label || aside) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {label ? (
            <Label required={required} className="mb-0!">
              {label}
            </Label>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> & { prefix?: ReactNode; suffix?: ReactNode; invalid?: boolean; mono?: boolean; size?: 'sm' | 'md'; wrapClassName?: string };

export function TextInput({ prefix, suffix, invalid, mono, size = 'md', wrapClassName, className, disabled, ...rest }: TextInputProps) {
  return (
    <div
      className={cn(
        'flex items-stretch overflow-hidden rounded-lg border bg-white transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5',
        size === 'sm' ? 'h-9' : 'h-10',
        invalid ? 'border-red-500 ring-4 ring-red-500/10' : 'border-line hover:border-ink/20',
        disabled && 'bg-canvas/70 hover:border-line',
        wrapClassName,
      )}
    >
      {prefix && <span className="flex shrink-0 items-center pl-3 text-[13px] text-muted">{prefix}</span>}
      <input
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted/60 disabled:text-muted',
          size === 'sm' ? 'text-[13.5px]' : 'text-[14px]',
          prefix ? 'pl-1.5' : 'pl-3',
          suffix ? 'pr-1.5' : 'pr-3',
          mono && 'font-mono text-[13px] tracking-tight',
          className,
        )}
        {...rest}
      />
      {suffix && <span className="flex shrink-0 items-center pr-3 text-[13px] font-medium text-muted">{suffix}</span>}
    </div>
  );
}

/**
 * Numeric text field that accepts "12,90" as well as "12.90" and allows an empty value.
 * Values are shown with the admin locale's decimal separator (12,90 in ME/SQ, 12.90 in EN);
 * `money` pads fractions to two decimals. `zeroAsEmpty` shows 0 as an empty field (with the placeholder).
 */
export function NumInput({
  value,
  onChange,
  integer,
  zeroAsEmpty,
  money,
  ...rest
}: Omit<TextInputProps, 'value' | 'onChange' | 'type'> & { value: number | null | undefined; onChange: (v: number | null) => void; integer?: boolean; zeroAsEmpty?: boolean; money?: boolean }) {
  const lang = useLang('admin');
  const norm = (v: number | null | undefined) => (v == null || Number.isNaN(v) || (zeroAsEmpty && v === 0) ? null : v);
  const show = (v: number | null) => (v == null ? '' : (money && v % 1 !== 0 ? v.toFixed(2) : String(v)).replace('.', lang === 'en' ? '.' : ','));
  const [text, setText] = useState(() => show(norm(value)));
  const [prev, setPrev] = useState<number | null>(() => norm(value));
  // Re-sync when the value is changed from outside (e.g. a toggle sets 999, or "discard").
  if (norm(value) !== prev) {
    setPrev(norm(value));
    setText(show(norm(value)));
  }
  return (
    <TextInput
      {...rest}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(integer ? /[^\d]/g : /[^\d.,]/g, '');
        setText(raw);
        const clean = raw.replace(',', '.');
        if (!clean.trim()) {
          setPrev(null);
          onChange(null);
          return;
        }
        const n = integer ? parseInt(clean, 10) : Number(clean);
        if (!Number.isNaN(n)) {
          setPrev(norm(n));
          onChange(n);
        }
      }}
    />
  );
}

export function SelectInput({ invalid, className, children, icon, active, size = 'md', ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { invalid?: boolean; icon?: ReactNode; active?: boolean; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('relative', className)}>
      {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>}
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full cursor-pointer appearance-none truncate rounded-lg border bg-white pr-9 text-[14px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5',
          size === 'sm' ? 'h-9' : 'h-10',
          icon ? 'pl-9' : 'pl-3',
          invalid ? 'border-red-500 ring-4 ring-red-500/10' : active ? 'border-ink/35 bg-ink/[0.025] font-semibold' : 'border-line hover:border-ink/20',
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** Label + hint on the left, switch on the right. */
export function ToggleRow({ label, hint, checked, onChange, icon }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 gap-2.5">
        {icon && <span className={cn('mt-0.5 shrink-0 transition-colors', checked ? 'text-brand-600' : 'text-muted')}>{icon}</span>}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink">{label}</div>
          {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</p>}
        </div>
      </div>
      <Switch checked={checked} onChange={onChange} size="sm" />
    </div>
  );
}

/** Segmented control (two to four short choices). */
export function Segmented<T extends string>({ value, onChange, options, size = 'md', className }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; icon?: ReactNode }[]; size?: 'sm' | 'md'; className?: string }) {
  return (
    <div className={cn('inline-flex shrink-0 rounded-lg bg-canvas p-0.5 ring-1 ring-inset ring-line/70', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md font-semibold transition-all',
            size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[13px]',
            value === o.id ? 'bg-white text-ink shadow-sm ring-1 ring-line/80' : 'text-muted hover:text-ink',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Editing languages, Albanian first (source), English second, Serbian (the `me` slot) third. */
export const EDIT_LANGS: Lang[] = ['sq', 'en', 'me'];
/** Short code shown on language tabs — the `me` slot holds Serbian. */
export const langCode = (l: Lang) => (l === 'me' ? 'SR' : l.toUpperCase());

/** SQ / EN / SR switch for a whole card; amber dot = translations missing in that language. */
export function LangTabs({ value, onChange, missing, title }: { value: Lang; onChange: (l: Lang) => void; missing?: Partial<Record<Lang, number>>; title?: string }) {
  return (
    <div className="flex rounded-lg bg-canvas p-0.5" title={title}>
      {EDIT_LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn('relative rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide transition-colors', value === l ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}
        >
          {langCode(l)}
          {!!missing?.[l] && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
        </button>
      ))}
    </div>
  );
}

/** Single-line localized input driven by an external language (see LangTabs). Shows the SQ text as a hint when a translation is missing. */
export function MiniL10n({ value, lang, onChange, placeholder, className, invalid }: { value: L10n; lang: Lang; onChange: (v: L10n) => void; placeholder?: string; className?: string; invalid?: boolean }) {
  const v = value ?? { me: '', sq: '', en: '' };
  const missing = lang !== 'sq' && !v[lang]?.trim() && !!v.sq?.trim();
  return (
    <div className={cn('relative min-w-0', className)}>
      <input
        value={v[lang] ?? ''}
        placeholder={missing ? v.sq : placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange({ ...v, [lang]: e.target.value })}
        className={cn(
          'h-9 w-full rounded-lg border bg-white pl-3 pr-10 text-[13.5px] text-ink outline-none transition placeholder:text-muted/55 focus:border-ink/40 focus:ring-4 focus:ring-ink/5',
          missing ? 'border-amber-300 placeholder:italic' : invalid ? 'border-red-400' : 'border-line hover:border-ink/20',
        )}
      />
      <span className={cn('pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 py-px text-[9.5px] font-bold tracking-wide', missing ? 'bg-amber-100 text-amber-800' : 'bg-canvas text-muted')}>{langCode(lang)}</span>
    </div>
  );
}

/** Count empty translations per language among a set of localized values. */
export function missingCounts(values: L10n[]): Record<Lang, number> {
  const out: Record<Lang, number> = { me: 0, sq: 0, en: 0 };
  for (const v of values) {
    if (!v || !(v.me?.trim() || v.sq?.trim() || v.en?.trim())) continue;
    for (const l of ['me', 'sq', 'en'] as Lang[]) if (!v[l]?.trim()) out[l] += 1;
  }
  return out;
}

/** Small icon button used for reorder / remove. */
export function IconBtn({ label, onClick, disabled, children, danger, className }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode; danger?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors disabled:pointer-events-none disabled:opacity-30',
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-ink/[0.06] hover:text-ink',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Table helpers                                                       */
/* ------------------------------------------------------------------ */

/** Compact checkbox with an indeterminate state (header "select all"). */
export function TickBox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string }) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors focus-visible:ring-4 focus-visible:ring-brand-600/20 focus-visible:outline-none',
        on ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink/25 bg-white hover:border-ink/50',
      )}
    >
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3.2} /> : checked ? <Check className="h-3 w-3" strokeWidth={3.2} /> : null}
    </button>
  );
}

/** Stock level, colour-coded. 999+ = made to order. */
export function StockPill({ product, className }: { product: Product; className?: string }) {
  const t = useDict(pd, 'admin');
  const lang = useLang('admin');
  const s = product.stock;
  const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset tabular-nums';
  if (s >= 999)
    return (
      <span className={cn(base, 'bg-sky-50 text-sky-800 ring-sky-600/15', className)}>
        <InfinityIcon className="h-3.5 w-3.5" /> {t('madeToOrder')}
      </span>
    );
  if (s <= 0)
    return (
      <span className={cn(base, 'bg-red-50 text-red-700 ring-red-600/15', className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {t('outOfStock')}
      </span>
    );
  const low = s <= 5;
  const unit = product.unit === 'm2' ? t('packsUnit') : unitLabel(product.unit, lang);
  return (
    <span className={cn(base, low ? 'bg-amber-50 text-amber-800 ring-amber-600/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', low ? 'bg-amber-500' : 'bg-emerald-500')} />
      {num(s, lang)} {unit}
    </span>
  );
}

/** Admin-tone badges for a product (discount, new, bestseller, premium). */
export function AdminBadges({ product, className, empty }: { product: Product; className?: string; empty?: ReactNode }) {
  const tc = useDict(common, 'admin');
  const pct = discountPct(product);
  const items: ReactNode[] = [];
  if (pct > 0)
    items.push(
      <Badge key="pct" tone="red">
        −{pct}%
      </Badge>,
    );
  else if (product.badges.includes('sale')) items.push(<Badge key="sale" tone="red">{tc('badge_sale')}</Badge>);
  if (product.badges.includes('new')) items.push(<Badge key="new" tone="blue">{tc('badge_new')}</Badge>);
  if (product.badges.includes('bestseller')) items.push(<Badge key="best" tone="amber">{tc('badge_bestseller')}</Badge>);
  if (product.badges.includes('premium')) items.push(<Badge key="prem" tone="violet">{tc('badge_premium')}</Badge>);
  if (!items.length) return <>{empty ?? null}</>;
  return <div className={cn('flex flex-wrap gap-1', className)}>{items}</div>;
}

/* ------------------------------------------------------------------ */
/* Dropdown menu (portal — never clipped by scrolling tables)          */
/* ------------------------------------------------------------------ */
export type MenuItem = { label: string; icon: ComponentType<{ className?: string }>; onSelect: () => void; danger?: boolean; divider?: boolean; disabled?: boolean; hint?: string };

export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < items.length * 40 + 40;
    setPos({ x: window.innerWidth - r.right, y: up ? window.innerHeight - r.top + 6 : r.bottom + 6, up });
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!menu.current?.contains(n) && !btn.current?.contains(n)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
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
              className="z-[70] min-w-[210px] rounded-xl border border-line bg-white p-1 shadow-[0_18px_48px_-12px_rgb(28_26_23/0.28)]"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it) => (
                <div key={it.label}>
                  {it.divider && <div className="my-1 h-px bg-line/80" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    title={it.disabled ? it.hint : undefined}
                    onClick={() => {
                      setPos(null);
                      it.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      it.danger ? 'text-red-600 enabled:hover:bg-red-50' : 'text-ink enabled:hover:bg-canvas',
                    )}
                  >
                    <it.icon className={cn('h-4 w-4', it.danger ? 'text-red-500' : 'text-muted')} />
                    {it.label}
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
