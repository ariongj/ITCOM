// Offers centre — small shared UI: status pills (text + symbol), rule/content summaries, compact form controls, row menu.
import { useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes, type InputHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, CircleDashed, CircleSlash2, Clock3, Ellipsis, Info, Pause, type LucideIcon } from 'lucide-react';
import type { Discount, Lang, OfferState, Placement, PlacementState, Staff } from '@/lib/types';
import { useDict, useLang } from '@/i18n';
import { discountValueLabel } from '@/lib/discounts';
import { money, timeAgo } from '@/lib/format';
import { cn, initials } from '@/lib/utils';
import { OF, type OfKey } from './i18n';
import { countKinds, DAY, pluralForm, rangeLabel } from './model';

export const useOT = () => useDict(OF, 'admin');
export type OT = ReturnType<typeof useOT>;

/* ------------------------------------------------------------------ */
/* Status pills — text + symbol, never colour alone (PDF p.07)         */
/* ------------------------------------------------------------------ */
const STATE_STYLE: Record<OfferState, { cls: string; icon?: LucideIcon }> = {
  active: { cls: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' },
  scheduled: { cls: 'bg-white text-ink ring-ink/20', icon: Clock3 },
  draft: { cls: 'bg-ink/[0.06] text-ink-soft ring-transparent', icon: CircleDashed },
  paused: { cls: 'bg-amber-50 text-amber-900 ring-amber-600/25', icon: Pause },
  expired: { cls: 'bg-white text-muted ring-line', icon: CircleSlash2 },
};

function Pill({ state, label, size = 'md' }: { state: OfferState; label: string; size?: 'sm' | 'md' }) {
  const s = STATE_STYLE[state];
  const Icon = s.icon;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1 ring-inset', size === 'sm' ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-2.5 text-[12.5px]', s.cls)}>
      {Icon ? <Icon className="h-3.5 w-3.5" strokeWidth={2.2} /> : <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />}
      {label}
    </span>
  );
}

export function OfferStatusPill({ state, size }: { state: OfferState; size?: 'sm' | 'md' }) {
  const t = useOT();
  return <Pill state={state} label={t(`st_${state}`)} size={size} />;
}

export function PlacementStatusPill({ state }: { state: PlacementState }) {
  const t = useOT();
  return <Pill state={state} label={t(`pl_${state}`)} size="sm" />;
}

/* ------------------------------------------------------------------ */
/* Rule summary ("Automatike / produkte", "Kodi MIFTARI10", "Pa zbritje") */
/* ------------------------------------------------------------------ */
export function ruleLines(d: Discount | undefined, t: OT, lang: Lang): { head: string; sub: string } {
  if (!d) return { head: t('rule_none'), sub: t('rule_editorial') };
  const v = discountValueLabel(d);
  const val = v.type === 'fixed' ? money(v.value, lang, { decimals: v.value % 1 !== 0 }) : `${v.value}%`;
  const auto = d.method === 'auto';
  const code = t('rule_code', { code: d.code ?? '' });
  const minAmount = d.minimum.type === 'amount' ? money(d.minimum.value, lang, { decimals: false }) : '';
  const min = d.minimum.type === 'amount' ? t('min_amount', { v: minAmount }) : d.minimum.type === 'qty' ? t('min_qty', { v: d.minimum.value }) : '';
  const join = (...xs: string[]) => xs.filter(Boolean).join(' · ');
  switch (d.kind) {
    case 'products':
      return { head: auto ? `${t('rule_auto')} / ${t('kind_products')}` : code, sub: join(t('val_onProducts', { v: val }), min) };
    case 'order':
      return { head: auto ? `${t('rule_auto')} / ${t('kind_order')}` : code, sub: join(t('val_onOrder', { v: val }), min) };
    case 'shipping':
      return {
        head: auto ? (minAmount ? t('rule_shippingOver', { v: minAmount }) : `${t('rule_auto')} / ${t('kind_shipping')}`) : code,
        sub: v.type === 'free' ? t('val_free') : join(`−${val}`, min),
      };
    case 'bxgy': {
      const b = d.bxgy;
      const what = b?.getType === 'percent' ? t('what_pct', { v: b.getValue }) : t('what_free');
      return { head: auto ? `${t('rule_auto')} / ${t('kind_bxgy')}` : code, sub: t('val_bxgy', { buy: b?.buyQty ?? 1, get: b?.getQty ?? 1, what }) };
    }
  }
}

export function RuleCell({ discount, missing, className }: { discount?: Discount; missing?: boolean; className?: string }) {
  const t = useOT();
  const lang = useLang('admin');
  if (missing) return <span className={cn('text-[13px] text-red-700', className)}>{t('ruleMissing')}</span>;
  const r = ruleLines(discount, t, lang);
  return (
    <div className={cn('min-w-0', className)}>
      <div className={cn('truncate font-medium', discount ? 'text-ink' : 'text-ink-soft')}>{r.head}</div>
      <div className="truncate text-[12.5px] text-muted">{r.sub}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Content summary ("2 slide, 1 banner" · "Landing · Blloku në ballinë") */
/* ------------------------------------------------------------------ */
export function contentLines(linked: Placement[], homeBlock: boolean, hasLanding: boolean, t: OT) {
  const c = countKinds(linked);
  const parts: string[] = [];
  if (c.slide) parts.push(`${c.slide} ${t(`c_slide_${pluralForm(c.slide)}` as OfKey)}`);
  if (c.banner) parts.push(`${c.banner} ${t(`c_banner_${pluralForm(c.banner)}` as OfKey)}`);
  if (c.announcement) parts.push(c.announcement > 1 ? `${t('c_bar')} ×${c.announcement}` : t('c_bar'));
  const extra: string[] = [];
  if (hasLanding) extra.push(t('c_landing'));
  if (homeBlock) extra.push(t('c_homeBlock'));
  return { head: parts.length ? parts.join(', ') : extra.length ? extra.join(' + ') : t('c_nothing'), sub: parts.length ? extra.join(' · ') : '' };
}

/* ------------------------------------------------------------------ */
/* Period ("1 tet – 17 tet" · "skadon për 12 ditë")                    */
/* ------------------------------------------------------------------ */
export function periodLines(o: { startsAt: string; endsAt?: string }, state: OfferState, t: OT, lang: Lang, now = Date.now()) {
  const head = rangeLabel(o.startsAt, o.endsAt, lang, t('period_open'));
  const days = (iso: string) => Math.ceil((new Date(iso).getTime() - now) / DAY);
  let sub = '';
  if (state === 'scheduled') {
    const n = days(o.startsAt);
    sub = n <= 1 && new Date(o.startsAt).toDateString() === new Date(now).toDateString() ? t('rel_startsToday') : t('rel_startsIn', { n: Math.max(1, n) });
  } else if (state === 'expired' && o.endsAt) sub = t('rel_ended', { d: timeAgo(o.endsAt, lang) });
  else if (state === 'active' || state === 'paused') {
    if (!o.endsAt) sub = t('rel_open');
    else {
      const n = days(o.endsAt);
      sub = n <= 1 ? t('rel_endsToday') : t('rel_endsIn', { n });
    }
  }
  return { head, sub };
}

/* ------------------------------------------------------------------ */
/* Compact admin form controls (14 px, h-10, rounded-lg)               */
/* ------------------------------------------------------------------ */
export const CONTROL =
  'w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-red-500';

export function FieldLabel({ children, htmlFor, hint, className }: { children: ReactNode; htmlFor?: string; hint?: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-semibold text-ink-soft', className)}>
      <span>{children}</span>
      {hint && <span className="text-[12px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(CONTROL, 'h-10', className)} {...rest} />;
}

export function SelectBox({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(CONTROL, 'h-10 cursor-pointer appearance-none pr-9')} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Help({ children, className, tone = 'muted' }: { children: ReactNode; className?: string; tone?: 'muted' | 'error' }) {
  return <p className={cn('mt-1.5 text-[12.5px] leading-snug', tone === 'error' ? 'font-medium text-red-700' : 'text-muted', className)}>{children}</p>;
}

/** Neutral information callout (grey, icon + text). */
export function Note({ children, title, icon: Icon = Info, className }: { children: ReactNode; title?: ReactNode; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn('flex gap-3 rounded-lg border border-line bg-canvas/60 px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
      <div className="min-w-0">
        {title && <div className="font-semibold text-ink">{title}</div>}
        {children}
      </div>
    </div>
  );
}

export function StaffAvatar({ staff, size = 'md' }: { staff?: Staff | null; size?: 'sm' | 'md' }) {
  if (!staff) return null;
  return (
    <span
      className={cn('grid shrink-0 place-items-center rounded-full font-bold text-white', size === 'sm' ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[11px]')}
      style={{ background: staff.color }}
      aria-hidden
    >
      {initials(staff.name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Row / overflow menu (portal, so tables with overflow don't clip it)  */
/* ------------------------------------------------------------------ */
export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
  /** Tooltip shown when disabled (e.g. missing permission) */
  reason?: string;
}

export function ActionMenu({ items, label, trigger }: { items: MenuItem[]; label: string; trigger?: 'icon' | 'button' }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < items.length * 40 + 48;
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
        className={cn(
          'grid shrink-0 place-items-center rounded-lg transition-colors',
          trigger === 'button' ? 'h-9 w-9 border border-ink/15 bg-white text-ink hover:border-ink/35' : 'h-8 w-8 text-muted hover:bg-ink/[0.06] hover:text-ink',
          pos && 'bg-ink/[0.06] text-ink',
        )}
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
              className="z-[70] min-w-[220px] rounded-xl border border-line bg-white p-1 shadow-[0_18px_48px_-12px_rgb(0_0_0/0.28)]"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it) => (
                <div key={it.label}>
                  {it.divider && <div className="my-1 h-px bg-line/80" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={it.disabled}
                    title={it.disabled ? it.reason : undefined}
                    onClick={() => {
                      setPos(null);
                      it.onSelect();
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                      it.danger ? 'text-red-700 hover:bg-red-50' : 'text-ink hover:bg-canvas',
                    )}
                  >
                    {it.icon && <it.icon className="h-4 w-4 shrink-0 opacity-70" />}
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
