import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Info, TriangleAlert } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Section card (mock-up p.41: title, description, labelled groups)     */
/* ------------------------------------------------------------------ */
export function Panel({
  lead,
  title,
  description,
  actions,
  footnote,
  children,
  flush,
  bodyClassName,
  className,
}: {
  /** First card of a section: large title, no header rule */
  lead?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footnote?: ReactNode;
  children?: ReactNode;
  /** No body padding (tables) */
  flush?: boolean;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]', className)}>
      {(title || actions) && (
        <header
          className={cn(
            'flex flex-col gap-3 px-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6',
            lead ? 'pt-5 sm:pt-6' : 'border-b border-line/70 py-3.5',
            lead && flush && 'border-b border-line/70 pb-4',
          )}
        >
          <div className="min-w-0">
            <h2 className={lead ? 'text-[20px] font-semibold leading-tight tracking-tight text-ink sm:text-[21px]' : 'text-[14.5px] font-semibold text-ink'}>{title}</h2>
            {description && <p className={cn('max-w-2xl text-muted', lead ? 'mt-1.5 text-[13.5px] leading-relaxed' : 'mt-0.5 text-[13px] leading-snug')}>{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children !== undefined && <div className={cn(!flush && 'px-5 pb-5 pt-5 sm:px-6 sm:pb-6', bodyClassName)}>{children}</div>}
      {footnote && <footer className="flex items-start gap-2 border-t border-line/70 px-5 py-3 text-[12.5px] leading-relaxed text-muted sm:px-6">{footnote}</footer>}
    </section>
  );
}

/** Labelled group inside a Panel, separated by a hairline ("Ofrues online", "Mënyra manuale", …). */
export function Block({ title, hint, aside, children, className, id }: { title?: ReactNode; hint?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={cn('border-t border-line/70 py-5 first:border-t-0 first:pt-0 last:pb-0', className)}>
      {(title || aside) && (
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>}
            {hint && <p className="mt-0.5 max-w-2xl text-[12.5px] leading-snug text-muted">{hint}</p>}
          </div>
          {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status as text + symbol (never colour alone)                         */
/* ------------------------------------------------------------------ */
export type StateTone = 'ok' | 'test' | 'off' | 'info' | 'warn';

export function StateText({ tone, children, className }: { tone: StateTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium', tone === 'off' ? 'text-muted' : 'text-ink-soft', className)}>
      {tone === 'warn' ? (
        <TriangleAlert className="h-3.5 w-3.5 text-amber-600" aria-hidden />
      ) : (
        <span
          aria-hidden
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            tone === 'ok' && 'bg-emerald-600',
            tone === 'test' && 'bg-amber-500 ring-2 ring-amber-500/20',
            tone === 'info' && 'bg-ink/45',
            tone === 'off' && 'border-[1.5px] border-ink/35 bg-transparent',
          )}
        />
      )}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode }[];
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-lg bg-[#f1f1f1] p-0.5 ring-1 ring-inset ring-black/[0.06]', disabled && 'opacity-60', className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              'h-8 flex-1 whitespace-nowrap rounded-md px-3 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed',
              on ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-black/[0.06]' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Compact radio card (capture policy, guest checkout…). */
export function Choice({ checked, onSelect, title, description, disabled, aside }: { checked: boolean; onSelect: () => void; title: ReactNode; description?: ReactNode; disabled?: boolean; aside?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border bg-white px-3.5 py-3 text-left transition-[border,box-shadow] disabled:cursor-not-allowed',
        checked ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30',
        disabled && !checked && 'opacity-60',
      )}
    >
      <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors', checked ? 'border-ink' : 'border-ink/30')}>
        <span className={cn('h-2 w-2 rounded-full bg-ink transition-transform', checked ? 'scale-100' : 'scale-0')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{description}</span>}
      </span>
      {aside}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Notes, link rows, avatars                                           */
/* ------------------------------------------------------------------ */
export function Note({ children, icon: Icon = Info, tone = 'neutral', className }: { children: ReactNode; icon?: ComponentType<{ className?: string }>; tone?: 'neutral' | 'amber'; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[12.5px] leading-relaxed',
        tone === 'amber' ? 'bg-amber-50/80 text-amber-950/80 ring-1 ring-inset ring-amber-600/15' : 'bg-[#f6f6f6] text-ink-soft ring-1 ring-inset ring-black/[0.05]',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone === 'amber' ? 'text-amber-700' : 'text-muted')} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** "This lives elsewhere" row with a link button. */
export function LinkRow({ icon: Icon, title, text, to, cta, aside }: { icon: ComponentType<{ className?: string }>; title: ReactNode; text?: ReactNode; to: string; cta: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3f3f3] text-ink-soft ring-1 ring-inset ring-black/[0.05]">
          <Icon className="h-[17px] w-[17px]" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] font-semibold text-ink">
            {title}
            {aside}
          </div>
          {text && <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{text}</p>}
        </div>
      </div>
      <Link
        to={to}
        className="ml-12 inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-ink/15 bg-white px-3 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/35 sm:ml-0 sm:self-center"
      >
        {cta}
        <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
      </Link>
    </div>
  );
}

export function Avatar({ name, color, size = 'md' }: { name: string; color?: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-full font-bold text-white', size === 'sm' ? 'h-6 w-6 text-[9.5px]' : 'h-8 w-8 text-[11px]')}
      style={{ background: color || '#5c5c5c' }}
    >
      {initials(name) || '?'}
    </span>
  );
}

/** Wraps a disabled control so its tooltip still shows (disabled buttons ignore the pointer). */
export function Gate({ allowed, reason, children }: { allowed: boolean; reason: string; children: ReactNode }) {
  if (allowed) return <>{children}</>;
  return (
    <span title={reason} className="inline-flex cursor-not-allowed">
      {children}
    </span>
  );
}

/** Small mono chip for template variables / codes. */
export function Code({ children, onClick, title }: { children: ReactNode; onClick?: () => void; title?: string }) {
  const cls = 'inline-flex items-center rounded-md bg-[#f1f1f1] px-1.5 py-0.5 font-mono text-[11.5px] font-medium text-ink-soft ring-1 ring-inset ring-black/[0.06]';
  if (!onClick) return <code className={cls}>{children}</code>;
  return (
    <button type="button" title={title} onClick={onClick} className={cn(cls, 'transition-colors hover:bg-ink hover:text-white')}>
      {children}
    </button>
  );
}
