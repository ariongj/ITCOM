import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';
import { defineDict, useDict } from '@/i18n';
import type { Lang } from '@/lib/types';
import { cn } from '@/lib/utils';

const T = defineDict({
  me: { copy: 'Kopiraj', copied: 'Kopirano u međuspremnik', copyFailed: 'Kopiranje nije uspjelo' },
  sq: { copy: 'Kopjo', copied: 'U kopjua në kujtesë', copyFailed: 'Kopjimi dështoi' },
  en: { copy: 'Copy', copied: 'Copied to clipboard', copyFailed: 'Could not copy' },
});

/** Write text to the clipboard with a graceful fallback for non-secure contexts. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Copy button with a short "check" confirmation. `label` renders a text button, otherwise icon-only. */
export function CopyButton({ text, label, toastText, className, tone = 'default' }: { text: string; label?: ReactNode; toastText?: string; className?: string; tone?: 'default' | 'onDark' }) {
  const t = useDict(T, 'admin');
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = async () => {
    const ok = await copyText(text);
    if (!ok) {
      toast.error(t('copyFailed'));
      return;
    }
    setDone(true);
    toast.success(toastText ?? t('copied'));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1600);
  };
  const Icon = done ? Check : Copy;
  if (label) {
    return (
      <button
        type="button"
        onClick={run}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 text-[13px] font-semibold text-ink transition hover:border-ink/35',
          done && 'border-emerald-600/30 text-emerald-700',
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={run}
      title={t('copy')}
      aria-label={t('copy')}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition',
        tone === 'onDark' ? 'text-paper/70 hover:bg-white/10 hover:text-white' : 'text-muted hover:bg-canvas hover:text-ink',
        done && (tone === 'onDark' ? 'text-emerald-300' : 'text-emerald-600'),
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** Small square icon button for row actions. */
export function IconBtn({ icon, label, onClick, danger, disabled, className }: { icon: ReactNode; label: string; onClick?: () => void; danger?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors disabled:opacity-30',
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-canvas hover:text-ink',
        className,
      )}
    >
      {icon}
    </button>
  );
}

/** KPI tile used at the top of catalog pages. */
export function StatTile({ icon, label, value, hint, accent }: { icon: ReactNode; label: ReactNode; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line/80 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12.5px] font-semibold leading-tight text-muted">{label}</span>
        <span className={cn('grid h-7 w-7 shrink-0 place-items-center rounded-md', accent ? 'bg-ink text-white' : 'bg-canvas text-ink-soft')}>{icon}</span>
      </div>
      <div className="mt-1.5 text-[24px] font-bold leading-none tracking-tight text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 truncate text-xs text-muted">{hint}</div>}
    </div>
  );
}

const SIZE_LOCALE: Record<Lang, string> = { me: 'de-DE', sq: 'de-DE', en: 'en-GB' };

/** 1,2 MB · 340 KB */
export function formatBytes(bytes: number, lang: Lang) {
  const f = (n: number, d = 1) => new Intl.NumberFormat(SIZE_LOCALE[lang], { maximumFractionDigits: d }).format(n);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${f(bytes / 1024, 0)} KB`;
  return `${f(bytes / (1024 * 1024))} MB`;
}
