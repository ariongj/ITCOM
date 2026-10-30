// Small neutral controls for the CMS v2 content screens (PDF p.07: text + symbol statuses, compact controls).
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, CircleCheck, CircleDashed, Clock3, Ellipsis, EyeOff, Lock, X } from 'lucide-react';
import { Hint, Label } from '@/components/ui/Field';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import { cx } from './dict';
import type { ContentState } from './meta';

/* ------------------------------------------------------------------ */
/* Status: text + symbol (never colour alone)                           */
/* ------------------------------------------------------------------ */
const STATE_STYLE: Record<ContentState, { icon: ComponentType<{ className?: string }>; cls: string }> = {
  published: { icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-800 ring-emerald-700/15' },
  scheduled: { icon: Clock3, cls: 'bg-white text-ink ring-ink/20' },
  hidden: { icon: EyeOff, cls: 'bg-ink/[0.05] text-ink-soft ring-ink/10' },
  draft: { icon: CircleDashed, cls: 'bg-amber-50 text-amber-900 ring-amber-700/20' },
};

export function StatusPill({ state, className, title }: { state: ContentState; className?: string; title?: string }) {
  const t = useDict(cx, 'admin');
  const { icon: Icon, cls } = STATE_STYLE[state];
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset', cls, className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {t(`st_${state}`)}
    </span>
  );
}

/** Generic text + symbol status chip for other tones (active / draft / off). */
export function StateChip({ icon: Icon, children, tone = 'neutral', className, title }: { icon: ComponentType<{ className?: string }>; children: ReactNode; tone?: 'ok' | 'warn' | 'neutral' | 'muted'; className?: string; title?: string }) {
  const tones = {
    ok: 'bg-emerald-50 text-emerald-800 ring-emerald-700/15',
    warn: 'bg-amber-50 text-amber-900 ring-amber-700/20',
    neutral: 'bg-white text-ink ring-ink/15',
    muted: 'bg-ink/[0.05] text-ink-soft ring-ink/10',
  };
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset', tones[tone], className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({ value, onChange, options, className, size = 'md' }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; title?: string }[]; className?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="radiogroup" className={cn('inline-flex shrink-0 rounded-lg bg-ink/[0.05] p-0.5 ring-1 ring-inset ring-ink/[0.06]', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          title={o.title}
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-semibold transition-colors sm:flex-none',
            size === 'sm' ? 'h-7 px-2.5 text-[12px]' : 'h-8 px-3 text-[12.5px]',
            value === o.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact select                                                       */
/* ------------------------------------------------------------------ */
export function SelectField({ label, hint, className, wrapClassName, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label?: ReactNode; hint?: ReactNode; wrapClassName?: string }) {
  const id = useId();
  return (
    <div className={wrapClassName}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <select
          id={id}
          className={cn(
            'h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-white pl-3 pr-9 text-[14px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kebab action menu (portal, flips up near the bottom edge)            */
/* ------------------------------------------------------------------ */
export interface ActionItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Shown as a tooltip, e.g. why the action is disabled */
  title?: string;
  divider?: boolean;
}

export function ActionMenu({ items, label, className }: { items: ActionItem[]; label: string; className?: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < items.length * 38 + 40;
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
        className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink', pos && 'bg-ink/[0.06] text-ink', className)}
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              ref={menu}
              role="menu"
              initial={{ opacity: 0, scale: 0.97, y: pos.up ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', right: pos.x, ...(pos.up ? { bottom: pos.y } : { top: pos.y }), transformOrigin: pos.up ? 'bottom right' : 'top right' }}
              className="z-[95] min-w-[210px] rounded-xl border border-line bg-white p-1 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.28)]"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => (
                <div key={i}>
                  {it.divider && <div className="my-1 h-px bg-line/70" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    title={it.title}
                    onClick={() => {
                      setPos(null);
                      it.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-canvas',
                    )}
                  >
                    <it.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{it.label}</span>
                    {it.disabled && <Lock className="h-3 w-3 shrink-0" />}
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
/* Plain string chips (internal tags)                                   */
/* ------------------------------------------------------------------ */
export function ChipsInput({ label, hint, value, onChange, suggestions = [], placeholder, disabled }: { label?: ReactNode; hint?: ReactNode; value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string; disabled?: boolean }) {
  const id = useId();
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const v = raw.trim().replace(/,$/, '').trim();
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase())) return setText('');
    onChange([...value, v]);
    setText('');
  };
  const rest = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className={cn('flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5', disabled && 'bg-canvas')}>
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-ink/[0.06] py-0.5 pl-2 pr-1 text-[12.5px] font-semibold text-ink">
            {v}
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="grid h-4 w-4 place-items-center rounded text-muted hover:bg-ink/10 hover:text-ink" aria-label={`× ${v}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            value={text}
            placeholder={value.length ? '' : placeholder}
            onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(text);
              } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
            }}
            onBlur={() => text && add(text)}
            className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-[13.5px] text-ink outline-none placeholder:text-muted/70"
          />
        )}
      </div>
      {!disabled && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {rest.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted ring-1 ring-inset ring-line transition hover:bg-white hover:text-ink">
              + {s}
            </button>
          ))}
        </div>
      )}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

/** Small uppercase label used inside cards. */
export function MiniLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted', className)}>{children}</div>;
}

/** Neutral notice row (read-only role, hints). */
export function Notice({ icon: Icon, children, tone = 'neutral', className }: { icon: ComponentType<{ className?: string }>; children: ReactNode; tone?: 'neutral' | 'warn'; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-[13px] leading-snug ring-1 ring-inset', tone === 'warn' ? 'bg-amber-50 text-amber-900 ring-amber-700/15' : 'bg-ink/[0.035] text-ink-soft ring-ink/[0.07]', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
