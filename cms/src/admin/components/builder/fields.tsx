import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, Info, Link2, Plus, Trash2 } from 'lucide-react';
import type { Cta, L10n } from '@/lib/types';
import { Label, Hint } from '@/components/ui/Field';
import { Accent } from '@/components/ui/misc';
import { L10nInput } from '@/admin/components/L10nInput';
import { useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useCategories } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { B } from './i18n';
import { TRUST_ICONS } from './meta';

export const ctl =
  'w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-muted/60 focus:border-ink/40 focus:ring-4 focus:ring-ink/5';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */
export function Group({ title, children, aside, className }: { title: ReactNode; children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{title}</h3>
        <span className="h-px flex-1 bg-line/80" />
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Hint that explains the *accent* syntax, with a rendered example. */
export function AccentHint() {
  const t = useDict(B, 'admin');
  const word = t('accentWord');
  const [before, after] = t('accentHint').split('{word}');
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
      <span>{before}</span>
      <code className="rounded bg-canvas px-1 py-px font-mono text-[11px] text-ink-soft">*{word}*</code>
      <span>{after}</span>
      <ArrowRight className="h-3 w-3 text-muted/70" />
      <Accent text={`*${word}*`} className="text-[13px]" />
    </span>
  );
}

/** Localized title with the accent hint. */
export function TitleField({ value, onChange, label, multiline }: { value: L10n; onChange: (v: L10n) => void; label?: ReactNode; multiline?: boolean }) {
  const t = useDict(B, 'admin');
  return <L10nInput label={label ?? t('title')} value={value} onChange={onChange} hint={<AccentHint />} multiline={multiline} rows={2} />;
}

/* ------------------------------------------------------------------ */
/* Plain inputs in the same compact style as L10nInput                 */
/* ------------------------------------------------------------------ */
export function TextField({
  label,
  hint,
  leading,
  className,
  wrapClassName,
  value,
  onChange,
  ...inputProps
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label?: ReactNode;
  hint?: ReactNode;
  leading?: ReactNode;
  wrapClassName?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className={wrapClassName}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">{leading}</span>}
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(ctl, 'h-10', leading && 'pl-9', className)} {...inputProps} />
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/** Internal link with suggestions for storefront routes and categories. */
export function HrefField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: ReactNode }) {
  const t = useDict(B, 'admin');
  const cats = useCategories();
  const listId = useId();
  const routes = ['/produktet', '/produktet?akcija=1', ...cats.map((c) => `/produktet/${c.slug}`), '/syze-inteligjente', '/provo-virtualisht', '/gjej-kornizen', '/lentet', '/sherbimet', '/rezervo', '/rezervo?sherbimi=sv-smart','/klinika', '/optical-lab', '/lookbook', '/keshilla', '/rreth-nesh', '/kontakt', '/gjurmo-porosine', '/#rezervo'];
  return (
    <>
      <TextField label={label ?? t('href')} value={value} onChange={onChange} leading={<Link2 className="h-4 w-4" />} list={listId} placeholder="/produktet" spellCheck={false} />
      <datalist id={listId}>
        {routes.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </>
  );
}

/** Button label (3 languages) + link, grouped in a soft sub-card. Side by side only when the panel is wide enough. */
export function CtaFields({ value, onChange, title }: { value: Cta; onChange: (v: Cta) => void; title?: ReactNode }) {
  const t = useDict(B, 'admin');
  return (
    <div className="@container rounded-xl bg-canvas/50 p-3 ring-1 ring-line/70">
      {title && (
        <div className="mb-2.5 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-600" />
          {title}
        </div>
      )}
      <div className="grid gap-3 @md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] @md:items-end">
        <L10nInput label={t('ctaLabel')} value={value.label} onChange={(label) => onChange({ ...value, label })} />
        <HrefField value={value.href} onChange={(href) => onChange({ ...value, href })} />
      </div>
    </div>
  );
}

/** Compact on/off switch with an accessible name (same look as the shared Switch, size sm). */
export function ToggleSwitch({ checked, onChange, label, title }: { checked: boolean; onChange: (v: boolean) => void; label: string; title?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title ?? label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-brand-600/20',
        checked ? 'bg-brand-600' : 'bg-ink/20',
      )}
    >
      <span className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200', checked && 'translate-x-4')} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Icon picker (trust bar)                                             */
/* ------------------------------------------------------------------ */
export function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useDict(B, 'admin');
  return (
    <div>
      <Label>{t('icon')}</Label>
      <div className="grid grid-cols-6 gap-1.5">
        {TRUST_ICONS.map(({ name, icon: Icon }) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            aria-label={name}
            aria-pressed={value === name}
            className={cn(
              'grid h-9 place-items-center rounded-lg ring-1 transition',
              value === name ? 'bg-ink text-paper ring-ink' : 'bg-white text-ink-soft ring-line hover:bg-canvas hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Note that points to where related content is managed                */
/* ------------------------------------------------------------------ */
export function SourceNote({ text, to, linkLabel }: { text: ReactNode; to?: string; linkLabel?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl bg-canvas/80 p-3.5 ring-1 ring-line/70">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div className="min-w-0 text-[13px] leading-relaxed text-ink-soft">
        {text}
        {to && linkLabel && (
          <Link to={to} className="mt-1.5 flex w-fit items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:underline">
            {linkLabel} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Generic list editor: collapsible rows, add / remove / reorder       */
/* ------------------------------------------------------------------ */
export function ListEditor<T>({
  items,
  onChange,
  render,
  title,
  subtitle,
  thumb,
  newItem,
  addLabel,
  min = 0,
  max = 24,
  defaultOpen = null,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  title: (item: T, index: number) => string;
  subtitle?: (item: T, index: number) => string;
  thumb?: (item: T, index: number) => ReactNode;
  newItem: () => T;
  addLabel: string;
  min?: number;
  max?: number;
  defaultOpen?: number | null;
}) {
  const t = useDict(B, 'admin');
  const ta = useDict(adm, 'admin');
  const [open, setOpen] = useState<number | null>(defaultOpen);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpen((o) => (o === i ? j : o === j ? i : o));
  };
  const remove = (i: number) => {
    onChange(items.filter((_, k) => k !== i));
    setOpen((o) => (o === null || o < i ? o : o === i ? null : o - 1));
  };
  const add = () => {
    onChange([...items, newItem()]);
    setOpen(items.length);
  };
  const update = (i: number) => (patch: Partial<T>) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">{t('emptyList')}</p>}
      {items.map((it, i) => {
        const isOpen = open === i;
        const sub = subtitle?.(it, i);
        return (
          <div key={i} className={cn('rounded-xl border bg-white transition-shadow', isOpen ? 'border-ink/15 shadow-[0_8px_24px_-16px_rgb(28_26_23/0.35)]' : 'border-line')}>
            <div className="flex items-center gap-1 py-1.5 pl-2 pr-1.5">
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-0.5 text-left" aria-expanded={isOpen} title={t('expand')}>
                {thumb ? thumb(it, i) : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-[12px] font-bold tabular-nums text-ink-soft">{i + 1}</span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{title(it, i)}</span>
                  {sub && <span className="block truncate text-[12px] text-muted">{sub}</span>}
                </span>
                <ChevronDown className={cn('mr-1 h-4 w-4 shrink-0 text-muted transition-transform', isOpen && 'rotate-180')} />
              </button>
              <span className="flex shrink-0 items-center border-l border-line/70 pl-1">
                <IconBtn label={t('moveUp')} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={t('moveDown')} disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={ta('remove')} disabled={items.length <= min} onClick={() => remove(i)} danger>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </span>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                  <div className="space-y-4 border-t border-line/70 px-3.5 pb-4 pt-3.5">{render(it, update(i), i)}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {items.length < max && (
        <button
          type="button"
          onClick={add}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-ink/20 text-[13px] font-semibold text-ink-soft transition hover:border-brand-600/50 hover:bg-brand-50/50 hover:text-brand-700"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  );
}

export function IconBtn({ children, label, onClick, disabled, danger, className }: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-30',
        danger && 'hover:bg-red-50 hover:text-red-600',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* datetime-local helpers                                              */
/* ------------------------------------------------------------------ */
export function isoToLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function localInputToIso(v: string) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}
