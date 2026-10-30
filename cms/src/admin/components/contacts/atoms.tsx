import type { ComponentType, ReactNode, SelectHTMLAttributes } from 'react';
import { AlertCircle, Building2, CalendarCheck2, CalendarClock, Check, CheckCircle2, Clock, MessageSquare, Minus, PencilLine, Eye, Send, ShoppingBag, Users, XCircle, ChevronDown } from 'lucide-react';
import { useDict, useL, useLang } from '@/i18n';
import { ROLE_META } from '@/lib/permissions';
import { date } from '@/lib/format';
import type { InquiryStatus, Staff } from '@/lib/types';
import { useUi } from '@/store/ui';
import { cn, initials } from '@/lib/utils';
import { cx } from './i18n';
import { dueState, type ContactKind, type Due, type QuoteState } from './model';

type Icon = ComponentType<{ className?: string }>;

/* ------------------------------------------------------------------ */
/* Inbox status: text + symbol (never colour alone — PDF p.07)          */
/* ------------------------------------------------------------------ */
function HalfDot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={className} aria-hidden>
      <circle cx="6" cy="6" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1.25a4.75 4.75 0 0 1 0 9.5z" fill="currentColor" />
    </svg>
  );
}

export function StatusSymbol({ status, className }: { status: InquiryStatus; className?: string }) {
  if (status === 'new') return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full bg-ink', className)} aria-hidden />;
  if (status === 'contacted') return <HalfDot className={cn('h-3 w-3 shrink-0 text-ink-soft', className)} />;
  if (status === 'scheduled') return <CalendarCheck2 className={cn('h-3.5 w-3.5 shrink-0 text-ink-soft', className)} aria-hidden />;
  return <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0 text-muted', className)} aria-hidden />;
}

export function StatusLabel({ status, className }: { status: InquiryStatus; className?: string }) {
  const t = useDict(cx, 'admin');
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]', status === 'new' ? 'font-semibold text-ink' : status === 'done' ? 'text-muted' : 'text-ink-soft', className)}>
      <span className="grid w-3.5 place-items-center">
        <StatusSymbol status={status} />
      </span>
      {t(`st_${status}`)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Kind (Lloji)                                                        */
/* ------------------------------------------------------------------ */
export const KIND_ICON: Record<ContactKind, Icon> = { contact: MessageSquare, b2b: Building2, meeting: Users, measurement: Eye };

export function KindLabel({ kind, className }: { kind: ContactKind; className?: string }) {
  const t = useDict(cx, 'admin');
  const I = KIND_ICON[kind];
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-soft', className)}>
      <I className="h-3.5 w-3.5 shrink-0 text-muted" />
      {t(`kind_${kind}`)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Due (Afati)                                                         */
/* ------------------------------------------------------------------ */
export function DueLabel({ due, now, className, empty = '—' }: { due: Due | null; now: number; className?: string; empty?: ReactNode }) {
  const t = useDict(cx, 'admin');
  const lang = useLang('admin');
  if (!due) return <span className={cn('text-[13px] text-muted/60', className)}>{empty}</span>;
  const state = dueState(due.at, now);
  const time = date(due.at, lang, { hour: '2-digit', minute: '2-digit' });
  const diff = now - new Date(due.at).getTime();
  const label =
    state === 'overdue'
      ? diff < 86400000
        ? t('due_overH', { n: Math.max(1, Math.floor(diff / 3600000)) })
        : t('due_overD', { n: Math.floor(diff / 86400000) })
      : state === 'today'
        ? t('due_today', { time })
        : state === 'tomorrow'
          ? t('due_tomorrow', { time })
          : date(due.at, lang, { day: 'numeric', month: 'short' });
  const I = state === 'overdue' ? AlertCircle : due.kind === 'visit' ? CalendarCheck2 : state === 'later' ? CalendarClock : Clock;
  const title = `${t(due.kind === 'reply' ? 'due_reply' : due.kind === 'visit' ? 'due_visit' : 'due_followUp')} · ${date(due.at, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] tabular-nums',
        state === 'overdue' ? 'font-semibold text-red-700' : state === 'today' ? 'font-semibold text-ink' : state === 'tomorrow' ? 'text-ink-soft' : 'text-muted',
        className,
      )}
    >
      <I className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */
export function StaffAvatar({ name, size = 'sm', className }: { name: string; size?: 'xs' | 'sm' | 'md'; className?: string }) {
  const s = { xs: 'h-5 w-5 text-[9px]', sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-[11.5px]' }[size];
  return <span className={cn('grid shrink-0 place-items-center rounded-full bg-ink/[0.08] font-bold text-ink-soft ring-1 ring-inset ring-ink/5', s, className)}>{initials(name) || '?'}</span>;
}

export function AssigneeLabel({ staff, className }: { staff?: Staff | null; className?: string }) {
  const t = useDict(cx, 'admin');
  if (!staff) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-muted', className)}>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-dashed border-ink/25" aria-hidden>
          <Minus className="h-3 w-3" />
        </span>
        {t('unassigned')}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-[13px] text-ink', className)}>
      <StaffAvatar name={staff.name} />
      <span className="truncate">{staff.name}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* B2B quote status                                                    */
/* ------------------------------------------------------------------ */
const QUOTE_ICON: Record<QuoteState, Icon> = { draft: PencilLine, sent: Send, accepted: CheckCircle2, declined: XCircle, converted: ShoppingBag, expired: AlertCircle };

export function QuoteStatusLabel({ state, className }: { state: QuoteState; className?: string }) {
  const t = useDict(cx, 'admin');
  const I = QUOTE_ICON[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px]',
        state === 'accepted' || state === 'converted' ? 'font-semibold text-ink' : state === 'expired' ? 'font-semibold text-amber-800' : state === 'declined' || state === 'draft' ? 'text-muted' : 'text-ink-soft',
        className,
      )}
    >
      <I className="h-3.5 w-3.5 shrink-0" />
      {t(`q_${state}`)}
    </span>
  );
}

/** Pill version of the quote status for headers. */
export function QuoteStatusPill({ state }: { state: QuoteState }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-1">
      <QuoteStatusLabel state={state} className="text-[12px]" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Compact labelled select ("Përgjegjësi: Të gjithë")                  */
/* ------------------------------------------------------------------ */
export function FilterSelect({ label, active, className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; active?: boolean }) {
  return (
    <label
      className={cn(
        'relative inline-flex h-9 min-w-0 cursor-pointer items-center gap-1 rounded-lg border bg-white pl-3 pr-8 text-[13px] transition-colors focus-within:ring-4 focus-within:ring-ink/5',
        active ? 'border-ink/40' : 'border-line hover:border-ink/25',
        className,
      )}
    >
      <span className="shrink-0 whitespace-nowrap text-muted">{label}:</span>
      <select {...rest} className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent font-semibold text-ink outline-none">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Checkbox for row selection                                          */
/* ------------------------------------------------------------------ */
export function TickBox({ checked, indeterminate, onChange, label, disabled }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked || indeterminate ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-white hover:border-ink/50',
      )}
    >
      {indeterminate ? <Minus className="h-3 w-3" strokeWidth={3} /> : checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Section title used in drawers / editors                             */
/* ------------------------------------------------------------------ */
export function SectionTitle({ children, aside, icon }: { children: ReactNode; aside?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-6 items-center justify-between gap-3">
      <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {icon}
        {children}
      </h3>
      {aside}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Permission tooltip                                                  */
/* ------------------------------------------------------------------ */
/** "Nuk keni leje (roli: Recepsion)" — title for disabled actions. */
export function useNoPermText() {
  const t = useDict(cx, 'admin');
  const l = useL('admin');
  const role = useUi((s) => s.adminRole);
  return t('noPerm', { role: l(ROLE_META[role].name) });
}

