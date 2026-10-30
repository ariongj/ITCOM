import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { Eye, FileText, MessageSquare } from 'lucide-react';
import { defineDict } from '@/i18n';
import { fold } from '@/lib/search';
import type { InquiryType, Lang } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Strings shared by the CRM screens (customers + inquiries)           */
/* ------------------------------------------------------------------ */
export const crm = defineDict({
  me: {
    call: 'Pozovi',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    sendEmail: 'Pošalji e-mail',
    phone: 'Telefon',
    city: 'Grad',
    address: 'Adresa',
    noEmail: 'E-mail nije naveden',
    today: 'Danas',
    tomorrow: 'Sutra',
    yesterday: 'Juče',
  },
  sq: {
    call: 'Telefono',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    sendEmail: 'Dërgo e-mail',
    phone: 'Telefoni',
    city: 'Qyteti',
    address: 'Adresa',
    noEmail: 'Pa e-mail',
    today: 'Sot',
    tomorrow: 'Nesër',
    yesterday: 'Dje',
  },
  en: {
    call: 'Call',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    sendEmail: 'Send e-mail',
    phone: 'Phone',
    city: 'City',
    address: 'Address',
    noEmail: 'No e-mail given',
    today: 'Today',
    tomorrow: 'Tomorrow',
    yesterday: 'Yesterday',
  },
});

/* ------------------------------------------------------------------ */
/* Plurals: Serbian (`me`) has one / few (2–4) / many; SQ + EN one / many */
/* ------------------------------------------------------------------ */
export type PluralForm = 'one' | 'few' | 'many';
export function pluralForm(n: number, lang: Lang): PluralForm {
  const abs = Math.abs(Math.trunc(n));
  if (lang === 'me') {
    const d = abs % 10;
    const h = abs % 100;
    if (d === 1 && h !== 11) return 'one';
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'few';
    return 'many';
  }
  return abs === 1 ? 'one' : 'many';
}

/* ------------------------------------------------------------------ */
/* Contact links                                                       */
/* ------------------------------------------------------------------ */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** wa.me link — local "044 …" numbers are assumed to be from Kosovo (+383). */
export function waHref(phone: string) {
  let d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = `383${d.slice(1)}`;
  return `https://wa.me/${d}`;
}

export function mailHref(email: string, subject?: string) {
  return `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */
/** Every whitespace-separated term must appear in at least one field (diacritics-insensitive). */
export function matches(query: string, fields: (string | undefined | null)[]) {
  const q = fold(query.trim());
  if (!q) return true;
  const hay = fold(fields.filter(Boolean).join(' '));
  const hayDigits = hay.replace(/\s+/g, '');
  return q.split(/\s+/).every((term) => hay.includes(term) || (/^\+?\d+$/.test(term) && hayDigits.includes(term)));
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */
/** Re-render periodically so relative times ("5 min ago") stay fresh. */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function startOfDay(d: Date | number) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Local "YYYY-MM-DD" key for grouping by calendar day. */
export function dayKey(d: Date | string) {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** ISO → value for <input type="datetime-local"> (local time). */
export function toLocalInput(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fromLocalInput(v: string) {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Parse a "YYYY-MM-DD" (date-only) value as a local date, not UTC. */
export function parseDay(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
}

/* ------------------------------------------------------------------ */
/* Avatar with initials — tone derived from the name so it is stable   */
/* ------------------------------------------------------------------ */
const AVATAR_TONES = [
  'bg-brand-50 text-brand-700 ring-brand-600/15',
  'bg-sky-50 text-sky-800 ring-sky-600/15',
  'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  'bg-amber-50 text-amber-800 ring-amber-600/20',
  'bg-violet-50 text-violet-800 ring-violet-600/15',
  'bg-sand text-ink-soft ring-ink/10',
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-9 w-9 text-[12px]', md: 'h-10 w-10 text-[13px]', lg: 'h-14 w-14 text-lg' }[size];
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full font-bold tracking-wide ring-1 ring-inset', s, AVATAR_TONES[hash(name) % AVATAR_TONES.length], className)}>
      {initials(name) || '?'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Inquiry type visuals                                                */
/* ------------------------------------------------------------------ */
export const INQ_TYPE_ICON: Record<InquiryType, ComponentType<{ className?: string }>> = {
  // `measurement` = eye-exam booking request
  measurement: Eye,
  quote: FileText,
  contact: MessageSquare,
};

export const INQ_TYPE_TONE: Record<InquiryType, string> = {
  measurement: 'bg-brand-50 text-brand-700 ring-brand-600/15',
  quote: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  contact: 'bg-sky-50 text-sky-800 ring-sky-600/15',
};

export function InquiryTypeIcon({ type, className }: { type: InquiryType; className?: string }) {
  const Icon = INQ_TYPE_ICON[type];
  return (
    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset', INQ_TYPE_TONE[type], className)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */
export function StatTile({ icon: Icon, label, value, sub, tone = 'bg-sand text-ink-soft' }: { icon: ComponentType<{ className?: string }>; label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-line/80 bg-white p-3.5 shadow-[0_1px_2px_rgb(28_26_23/0.04)] sm:flex-row sm:items-start sm:gap-3.5 sm:p-5">
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl', tone)}>
        <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] font-bold uppercase leading-snug tracking-[0.1em] text-muted sm:truncate sm:text-[11px] sm:tracking-[0.12em]">{label}</div>
        <div className="mt-1 truncate text-lg font-extrabold leading-tight tracking-tight text-ink tabular-nums sm:text-[22px]">{value}</div>
        {sub && <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted sm:truncate sm:text-[12.5px]">{sub}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact action (tel / mailto / WhatsApp) rendered as a button link  */
/* ------------------------------------------------------------------ */
export function ContactAction({ href, icon, children, variant = 'outline', external, disabled, className }: { href: string; icon: ReactNode; children: ReactNode; variant?: 'primary' | 'outline' | 'whatsapp'; external?: boolean; disabled?: boolean; className?: string }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[inset_0_1px_0_rgb(255_255_255/0.14)]',
    outline: 'border border-ink/15 bg-white text-ink hover:border-ink/35',
    whatsapp: 'bg-[#1f9d55] text-white hover:bg-[#188247]',
  }[variant];
  if (disabled) {
    return (
      <span className={cn('inline-flex h-10 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-line bg-white/60 px-3 text-[13px] font-semibold text-muted/70', className)}>
        {icon}
        {children}
      </span>
    );
  }
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      onClick={(e) => e.stopPropagation()}
      className={cn('inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-colors active:scale-[0.98]', styles, className)}
    >
      {icon}
      {children}
    </a>
  );
}
