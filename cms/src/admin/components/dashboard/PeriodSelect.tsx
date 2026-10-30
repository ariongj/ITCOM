import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Check, ChevronDown } from 'lucide-react';
import { useDict, useLang } from '@/i18n';
import { cn } from '@/lib/utils';
import { addDays, periodDays, PERIODS, startOfDay, type Period } from './data';
import { fmtDate } from './dates';
import { D } from './i18n';

/** Period picker (PDF p.08 "Sot" box): one control scopes every KPI, chart and list below it. */
export function PeriodSelect({ value, onChange, now }: { value: Period; onChange: (p: Period) => void; now: Date }) {
  const t = useDict(D, 'admin');
  const lang = useLang('admin');
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const close = useCallback((focus = false) => {
    setOpen(false);
    if (focus) btn.current?.focus();
  }, []);

  // outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open, close]);

  // focus the selected option on open
  useEffect(() => {
    if (open) items.current[PERIODS.indexOf(value)]?.focus();
  }, [open, value]);

  const range = (p: Period) => {
    if (p === 'today') return fmtDate(now, lang, { day: 'numeric', month: 'short' });
    const from = addDays(startOfDay(now), -(periodDays(p) - 1));
    return `${fmtDate(from, lang, { day: 'numeric', month: 'short' })} – ${fmtDate(now, lang, { day: 'numeric', month: 'short' })}`;
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const i = items.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (i + 1) % PERIODS.length : (i - 1 + PERIODS.length) % PERIODS.length;
      items.current[next]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items.current[e.key === 'Home' ? 0 : PERIODS.length - 1]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      close(e.key === 'Escape');
    }
  };

  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        type="button"
        data-period-select=""
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('period')}: ${t(`p_${value}`)}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          'inline-flex h-9 min-w-[150px] items-center gap-2 rounded-lg border border-line bg-white pl-3 pr-2.5 text-[13.5px] font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none transition-colors hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-ink/20',
          open && 'border-ink/30',
        )}
      >
        <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
        <span className="flex-1 text-left">{t(`p_${value}`)}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            role="menu"
            aria-label={t('period')}
            onKeyDown={onMenuKey}
            className="absolute left-0 top-full z-30 mt-1.5 w-[230px] overflow-hidden rounded-xl border border-black/10 bg-white p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.3)] sm:left-auto sm:right-0"
          >
            {PERIODS.map((p, i) => {
              const on = p === value;
              return (
                <button
                  key={p}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    onChange(p);
                    close(true);
                  }}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-[#f1f1f1] focus-visible:bg-[#f1f1f1]', on && 'bg-[#f5f5f5]')}
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center">{on && <Check className="h-4 w-4 text-ink" strokeWidth={2.75} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-[13.5px] text-ink', on ? 'font-semibold' : 'font-medium')}>{t(`p_${p}`)}</span>
                    <span className="block text-[12px] tabular-nums text-muted">{range(p)}</span>
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
