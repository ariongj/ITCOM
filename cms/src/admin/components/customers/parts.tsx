import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Circle, Mail, MessageCircle, MessageSquare, MoreHorizontal, Phone, Plus, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useDict } from '@/i18n';
import type { Lang } from '@/lib/types';
import { cn, initials } from '@/lib/utils';
import { cx } from './i18n';
import { CHANNELS, type Channel, type Consent, type Marketing } from './store';

/* ------------------------------------------------------------------ */
/* Neutral avatar (CMS v2: no colour coding)                           */
/* ------------------------------------------------------------------ */
export function Avatar({ name, size = 'md', className }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-[11.5px]', md: 'h-10 w-10 text-[13px]', lg: 'h-14 w-14 text-[17px]' }[size];
  return <span className={cn('grid shrink-0 place-items-center rounded-full bg-ink/[0.07] font-semibold tracking-wide text-ink-soft ring-1 ring-inset ring-ink/[0.06]', s, className)}>{initials(name) || '?'}</span>;
}

/* ------------------------------------------------------------------ */
/* Language                                                            */
/* ------------------------------------------------------------------ */
export function LangChip({ lang, className }: { lang: Lang; className?: string }) {
  const t = useDict(cx, 'admin');
  return (
    <span title={t(`lang_${lang}`)} className={cn('inline-flex h-5 items-center rounded-md border border-line bg-white px-1.5 text-[10.5px] font-bold tracking-wider text-ink-soft', className)}>
      {lang.toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */
export function TagChip({ tag, onRemove, auto, removeLabel }: { tag: string; onRemove?: () => void; auto?: string; removeLabel?: string }) {
  return (
    <span title={auto} className={cn('inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-ink/[0.06] pl-2 text-[12px] font-medium text-ink-soft', onRemove ? 'pr-0.5' : 'pr-2', auto && 'border border-dashed border-ink/20 bg-transparent')}>
      <span className="truncate">{tag}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel ?? 'Remove'} className="grid h-5 w-5 place-items-center rounded text-muted transition-colors hover:bg-ink/10 hover:text-ink">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function TagList({ tags, max = 2, className }: { tags: string[]; max?: number; className?: string }) {
  if (!tags.length) return <span className="text-muted/60">—</span>;
  const rest = tags.length - max;
  return (
    <div className={cn('flex min-w-0 flex-nowrap items-center gap-1', className)} title={tags.join(', ')}>
      {tags.slice(0, max).map((t, i) => (
        <span key={`${t}-${i}`} className="min-w-0">
          <TagChip tag={t} />
        </span>
      ))}
      {rest > 0 && <span className="shrink-0 text-[12px] font-medium text-muted">+{rest}</span>}
    </div>
  );
}

/** Chips + an input with suggestions. Enter / comma adds a tag. */
export function TagEditor({ tags, autoTags = [], suggestions, onChange, disabled, placeholder, addLabel, autoLabel }: { tags: string[]; autoTags?: string[]; suggestions: string[]; onChange: (tags: string[]) => void; disabled?: boolean; placeholder: string; addLabel: string; autoLabel: string }) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const own = tags.filter((t) => !autoTags.includes(t));
  const add = (raw: string) => {
    const v = raw.trim().toLowerCase().replace(/\s+/g, '-');
    setDraft('');
    if (!v || tags.includes(v)) return;
    onChange([...own, v]);
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) =>
          autoTags.includes(t) ? <TagChip key={t} tag={t} auto={autoLabel} /> : <TagChip key={t} tag={t} onRemove={disabled ? undefined : () => onChange(own.filter((x) => x !== t))} />,
        )}
      </div>
      {!disabled && (
        <div className={cn('flex gap-2', tags.length > 0 && 'mt-2.5')}>
          <input
            value={draft}
            list={listId}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(',')) add(v.slice(0, -1));
              else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder={placeholder}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[13.5px] outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
          />
          <datalist id={listId}>
            {suggestions.filter((s) => !tags.includes(s)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button variant="outline" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!draft.trim()} onClick={() => add(draft)}>
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marketing consent — always text + symbol                            */
/* ------------------------------------------------------------------ */
export const CHANNEL_ICON: Record<Channel, ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  viber: Phone,
};

export function ConsentState({ consent, className }: { consent: Consent; className?: string }) {
  const t = useDict(cx, 'admin');
  const Icon = consent.status === 'subscribed' ? CheckCircle2 : consent.status === 'unsubscribed' ? XCircle : Circle;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-medium', consent.status === 'subscribed' ? 'text-ink' : 'text-muted', className)}>
      <Icon className={cn('h-3.5 w-3.5 shrink-0', consent.status === 'none' && 'opacity-60')} strokeWidth={consent.status === 'subscribed' ? 2.4 : 2} />
      {t(`consent_${consent.status}`)}
    </span>
  );
}

/** Compact list cell: "✓ E-mail · SMS +1", "⊘ Unsubscribed" or "○ Not subscribed". */
export function ConsentSummary({ marketing, className, max = 4 }: { marketing: Marketing; className?: string; max?: number }) {
  const t = useDict(cx, 'admin');
  const on = CHANNELS.filter((c) => marketing[c].status === 'subscribed');
  const allOff = CHANNELS.every((c) => marketing[c].status === 'unsubscribed');
  const anyOff = CHANNELS.some((c) => marketing[c].status === 'unsubscribed');
  if (on.length) {
    const rest = on.length - max;
    return (
      <span className={cn('inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-ink', className)} title={on.map((c) => `${t(`ch_${c}`)}: ${t('consent_subscribed')}`).join('\n')}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
        <span className="truncate">{on.slice(0, max).map((c) => t(`ch_${c}`)).join(' · ')}</span>
        {rest > 0 && <span className="shrink-0 text-muted">+{rest}</span>}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] text-muted', className)}>
      {allOff || anyOff ? <XCircle className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0 opacity-60" />}
      {allOff || anyOff ? t('consent_unsubscribed') : t('consentNone')}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Permission-aware wrappers: disabled control + tooltip               */
/* ------------------------------------------------------------------ */
export function Gate({ allowed, reason, children, className }: { allowed: boolean; reason: string; children: ReactNode; className?: string }) {
  if (allowed) return <>{children}</>;
  return (
    <span title={reason} className={cn('inline-flex cursor-not-allowed', className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Row / header action menu (portal, so tables never clip it)          */
/* ------------------------------------------------------------------ */
export interface MenuAction {
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Tooltip when disabled */
  hint?: string;
  divider?: boolean;
}

export function ActionMenu({ items, label, trigger }: { items: MenuAction[]; label: string; trigger?: ReactNode }) {
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < items.length * 38 + 30;
    setPos({ right: Math.max(8, window.innerWidth - r.right), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
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
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
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
        className={cn(
          trigger ? 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:border-ink/35' : 'grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink',
          pos && !trigger && 'bg-ink/[0.06] text-ink',
        )}
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
      </button>
      {pos &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            style={{ right: pos.right, top: pos.top, bottom: pos.bottom }}
            className="fixed z-[100] min-w-[200px] overflow-hidden rounded-xl border border-black/10 bg-white py-1 text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <div key={i}>
                  {it.divider && <div className="my-1 h-px bg-line" />}
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
                      'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      it.danger ? 'text-red-700 hover:bg-red-50 disabled:hover:bg-transparent' : 'hover:bg-canvas disabled:hover:bg-transparent',
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" />}
                    {it.label}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Neutral KPI strip                                                   */
/* ------------------------------------------------------------------ */
/** 4 figures: 2×2 on phones, one row from `lg` (page) or from `sm` (compact, e.g. in a drawer). */
export function KpiStrip({ items, compact, className }: { items: { label: ReactNode; value: ReactNode; sub?: ReactNode }[]; compact?: boolean; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 overflow-hidden rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]', compact ? 'sm:grid-cols-4' : 'lg:grid-cols-4', className)}>
      {items.map((it, i) => (
        <div
          key={i}
          className={cn(
            'min-w-0',
            compact ? 'px-4 py-3' : 'px-4 py-3.5 sm:px-5 sm:py-4',
            i % 2 === 1 && 'border-l border-line/70',
            i >= 2 && (compact ? 'border-t border-line/70 sm:border-t-0' : 'border-t border-line/70 lg:border-t-0'),
            i === 2 && (compact ? 'sm:border-l' : 'lg:border-l'),
          )}
        >
          <div className="truncate text-[12.5px] font-medium text-muted">{it.label}</div>
          <div className={cn('mt-1 truncate font-semibold leading-tight tracking-tight text-ink tabular-nums', compact ? 'text-[17px]' : 'text-[20px] sm:text-[22px]')}>{it.value}</div>
          {it.sub && <div className="mt-0.5 truncate text-[12px] text-muted">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/** Compact native select for toolbars (shows an "active" state when filtering). */
export function SelectBox({ value, onChange, children, icon, active, label, className }: { value: string; onChange: (v: string) => void; children: ReactNode; icon?: ReactNode; active?: boolean; label: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      {icon && <span className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2', active ? 'text-ink' : 'text-muted')}>{icon}</span>}
      <select
        value={value}
        aria-label={label}
        title={label}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 w-full cursor-pointer appearance-none truncate rounded-lg border bg-white pr-8 text-[13.5px] outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5',
          icon ? 'pl-9' : 'pl-3',
          active ? 'border-ink/40 font-semibold text-ink' : 'border-line text-ink-soft',
        )}
      >
        {children}
      </select>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Small uppercase section heading used in drawers. */
export function SectionTitle({ icon, children, aside }: { icon?: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {icon}
        {children}
      </h3>
      {aside}
    </div>
  );
}
