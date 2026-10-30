import { Fragment, useEffect, useRef, useState, type ReactNode, type ImgHTMLAttributes } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, ChevronDown } from 'lucide-react';
import { cn, thumb } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */
const BADGE_TONES = {
  brand: 'bg-brand-600 text-white',
  dark: 'bg-ink text-paper',
  light: 'bg-white/95 text-ink',
  sand: 'bg-sand text-ink-soft',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
  blue: 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/15',
  violet: 'bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-600/15',
  red: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
  gray: 'bg-ink/[0.06] text-ink-soft',
  outline: 'border border-line bg-white text-ink-soft',
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ children, tone = 'gray', className, dot }: { children: ReactNode; tone?: BadgeTone; className?: string; dot?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide', BADGE_TONES[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Image with soft fade-in                                             */
/* ------------------------------------------------------------------ */
export function Img({ src, alt = '', className, small, eager, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { small?: boolean; eager?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const real = small ? thumb(src as string) : (src as string);
  // No image yet (e.g. a new product in the CMS preview) → render nothing instead of src="".
  if (!real) return null;
  return (
    <img
      src={real}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn('transition-[opacity,transform,filter] duration-700 ease-out', loaded ? 'opacity-100' : 'opacity-0', className)}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Reveal on scroll                                                    */
/* ------------------------------------------------------------------ */
export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' | 'article' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Comp = Tag as 'div';
  return (
    <Comp
      ref={ref}
      className={cn('transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.16,1,.3,1)]', shown ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}

/* ------------------------------------------------------------------ */
/* Quantity stepper                                                    */
/* ------------------------------------------------------------------ */
/** `label` names the field for screen readers (e.g. the visible "Quantity" heading next to it). */
export function QtyStepper({ value, onChange, min = 1, max = 999, size = 'md', className, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: 'sm' | 'md'; className?: string; label?: string }) {
  const h = size === 'sm' ? 'h-9' : 'h-11';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  return (
    <div className={cn('inline-flex items-center rounded-full border border-line bg-white', h, className)}>
      <button type="button" aria-label={label ? `${label} −` : '−'} className={cn('grid h-full place-items-center rounded-l-full text-ink-soft hover:text-ink disabled:opacity-30', w)} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        className={cn('h-full bg-transparent text-center text-sm font-semibold tabular-nums outline-none', size === 'sm' ? 'w-8' : 'w-10')}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
      />
      <button type="button" aria-label={label ? `${label} +` : '+'} className={cn('grid h-full place-items-center rounded-r-full text-ink-soft hover:text-ink disabled:opacity-30', w)} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accordion                                                           */
/* ------------------------------------------------------------------ */
export function Accordion({ items, className, defaultOpen = 0 }: { items: { title: ReactNode; content: ReactNode }[]; className?: string; defaultOpen?: number | null }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  return (
    <div className={cn('divide-y divide-line border-y border-line', className)}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-6 py-5 text-left" aria-expanded={isOpen}>
              <span className="text-[17px] font-semibold text-ink">{it.title}</span>
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line transition-transform duration-300', isOpen && 'rotate-180 bg-ink text-paper')}>
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                  <div className="pb-6 pr-12 text-[15px] leading-relaxed text-muted">{it.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs (underline style)                                              */
/* ------------------------------------------------------------------ */
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: ReactNode; badge?: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            '-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
            value === t.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({ icon, title, text, action, className }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {icon && <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-sand text-ink-soft">{icon}</div>}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Accent title: words in *asterisks* become italic brand-colour serif  */
/* ------------------------------------------------------------------ */
export function Accent({ text, className, accentClassName }: { text: string; className?: string; accentClassName?: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') ? (
          <em key={i} className={cn('font-display italic', accentClassName ?? 'text-brand-600')}>
            {p.slice(1, -1)}
          </em>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </span>
  );
}

/** Strip *accent* markers for plain-text contexts (alt text, meta). */
export const plain = (s: string) => s.replace(/\*/g, '');

/* ------------------------------------------------------------------ */
/* Countdown                                                           */
/* ------------------------------------------------------------------ */
export function useCountdown(to: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    done: diff === 0,
  };
}
