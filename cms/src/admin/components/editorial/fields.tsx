import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, ExternalLink, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Hint, Label, Switch } from '@/components/ui/Field';
import { Button, buttonClass } from '@/components/ui/Button';
import { useDict } from '@/i18n';
import type { L10n, Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { href as withBase } from '@/lib/paths';
import { adm } from '@/admin/i18n';
import { ed } from './i18n';

/* ------------------------------------------------------------------ */
/* Compact admin text input — matches the L10nInput control style       */
/* ------------------------------------------------------------------ */
export function TextField({
  label,
  hint,
  error,
  required,
  leading,
  trailing,
  mono,
  className,
  wrapClassName,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  mono?: boolean;
  wrapClassName?: string;
}) {
  const id = useId();
  return (
    <div className={wrapClassName}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      <div
        className={cn(
          'flex h-10 items-stretch overflow-hidden rounded-lg border bg-white transition focus-within:ring-4',
          error ? 'border-red-400 focus-within:ring-red-500/10' : 'border-line focus-within:border-ink/40 focus-within:ring-ink/5',
        )}
      >
        {leading && <span className="flex shrink-0 items-center pl-3 text-muted">{leading}</span>}
        <input
          id={id}
          aria-invalid={!!error || undefined}
          className={cn('min-w-0 flex-1 bg-transparent px-3 text-[14px] text-ink outline-none placeholder:text-muted/70', leading && 'pl-2', mono && 'font-mono text-[13px]', className)}
          {...rest}
        />
        {trailing}
      </div>
      {error ? <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slug input with a fixed URL prefix and "generate from title"         */
/* ------------------------------------------------------------------ */
/** Light cleanup while typing (keeps a trailing hyphen so words can be typed). */
export const typingSlug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/ë/g, 'e')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '');

export function SlugField({
  prefix,
  value,
  onChange,
  onBlur,
  auto,
  onRegenerate,
  canRegenerate,
  error,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  auto: boolean;
  onRegenerate: () => void;
  canRegenerate: boolean;
  error?: string;
}) {
  const t = useDict(ed, 'admin');
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} required>
        {t('slug')}
      </Label>
      <div
        className={cn(
          'flex h-10 items-stretch overflow-hidden rounded-lg border bg-white transition focus-within:ring-4',
          error ? 'border-red-400 focus-within:ring-red-500/10' : 'border-line focus-within:border-ink/40 focus-within:ring-ink/5',
        )}
      >
        <span className="flex shrink-0 items-center border-r border-line bg-canvas/70 px-3 font-mono text-[12.5px] text-muted">{prefix}</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(typingSlug(e.target.value))}
          onBlur={onBlur}
          spellCheck={false}
          aria-invalid={!!error || undefined}
          className="min-w-0 flex-1 bg-transparent px-3 font-mono text-[13px] text-ink outline-none"
        />
        {canRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            title={t('slugRegenerate')}
            aria-label={t('slugRegenerate')}
            className="grid w-10 shrink-0 place-items-center border-l border-line text-muted transition hover:bg-canvas hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          {auto && <Sparkles className="h-3 w-3 text-brand-600" />}
          {auto ? t('slugAuto') : t('slugManual')}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Translation completeness per language                               */
/* ------------------------------------------------------------------ */
const LANG_CODES: Lang[] = ['sq', 'en', 'me'];

export function TranslationStatus({ fields, className }: { fields: { label: string; value: L10n; optional?: boolean }[]; className?: string }) {
  const t = useDict(ed, 'admin');
  return (
    <div className={cn('space-y-1.5', className)}>
      {LANG_CODES.map((code) => {
        const missing = fields.filter((f) => !f.optional && !f.value?.[code]?.trim()).map((f) => f.label);
        const ok = missing.length === 0;
        return (
          <div key={code} className="flex items-center gap-2.5 rounded-lg bg-canvas/60 px-2.5 py-2">
            <span className="grid h-6 w-8 shrink-0 place-items-center rounded-md bg-white text-[10.5px] font-extrabold tracking-wide text-ink ring-1 ring-line">{(code === 'me' ? 'SR' : code.toUpperCase())}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-soft">{t(`lang_${code}`)}</span>
            {ok ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-emerald-700">
                <CircleCheck className="h-3.5 w-3.5" /> {t('complete')}
              </span>
            ) : (
              <span className="inline-flex min-w-0 items-center gap-1 text-[11.5px] font-semibold text-amber-700" title={missing.join(', ')}>
                <CircleAlert className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('missing', { fields: missing.join(', ') })}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header actions shared by the page / post editors                     */
/* ------------------------------------------------------------------ */
export function EditorActions({
  href,
  isNew,
  dirty,
  onSave,
  onDelete,
  saveLabel,
  keyLabel,
  canDelete = true,
  deleteTitle,
  canSave = true,
}: {
  /** Storefront path, e.g. "/faqe/dostava" (the base path is added here) */
  href: string;
  isNew: boolean;
  dirty: boolean;
  onSave: () => void;
  onDelete: () => void;
  saveLabel: string;
  keyLabel: string;
  canDelete?: boolean;
  /** Tooltip when delete is not allowed */
  deleteTitle?: string;
  canSave?: boolean;
}) {
  const t = useDict(ed, 'admin');
  const ta = useDict(adm, 'admin');
  return (
    <>
      {isNew ? (
        <span title={t('saveFirst')} className={buttonClass({ variant: 'outline', size: 'sm', shape: 'rounded', className: 'pointer-events-none opacity-45' })}>
          <ExternalLink className="h-3.5 w-3.5" /> {t('viewOnSite')}
        </span>
      ) : (
        <a href={withBase(href)} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline', size: 'sm', shape: 'rounded' })}>
          <ExternalLink className="h-3.5 w-3.5" /> {t('viewOnSite')}
        </a>
      )}
      {!isNew && (
        <span title={canDelete ? ta('delete') : deleteTitle}>
          <Button variant="outline" size="sm" shape="rounded" onClick={onDelete} disabled={!canDelete} className="text-red-600 hover:border-red-300 hover:text-red-700" aria-label={ta('delete')}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </span>
      )}
      {canSave && (
        <Button size="sm" shape="rounded" onClick={onSave} disabled={!dirty && !isNew}>
          {saveLabel}
          <kbd className="ml-1 hidden rounded bg-white/15 px-1.5 py-px font-sans text-[10.5px] font-semibold tracking-wide text-white/85 sm:inline">{keyLabel}</kbd>
        </Button>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Icon + label + hint + switch row (publishing panels)                 */
/* ------------------------------------------------------------------ */
export function SwitchRow({ icon, label, hint, checked, onChange }: { icon: ReactNode; label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors', checked ? 'bg-brand-50 text-brand-700' : 'bg-canvas text-ink-soft')}>{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink">{label}</div>
        {hint && <div className="text-[12.5px] leading-snug text-muted">{hint}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

/** Three tiny language markers — filled when every given field is translated. */
export function LangDots({ value }: { value: L10n[] }) {
  const te = useDict(ed, 'admin');
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {(['sq', 'en', 'me'] as const).map((code) => {
        const ok = value.every((v) => v[code]?.trim());
        return (
          <span
            key={code}
            title={`${te(`lang_${code}`)} — ${ok ? te('complete') : te('missingShort')}`}
            className={cn('rounded px-1 py-px text-[9.5px] font-extrabold tracking-wide', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}
          >
            {(code === 'me' ? 'SR' : code.toUpperCase())}
          </span>
        );
      })}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Google-style search result preview                                   */
/* ------------------------------------------------------------------ */
/** Plain-text summary of a markdown body (first paragraph, no syntax). */
export function mdSummary(md: string, max = 160) {
  const para =
    md
      .replace(/\r\n/g, '\n')
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .find((b) => b && !/^(#{2,3} |[-*] |\d+[.)] |> )/.test(b)) ?? '';
  const plainText = para
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.length > max ? plainText.slice(0, max - 1).replace(/\s+\S*$/, '') + ' …' : plainText;
}

export function SearchPreview({ domain, path, title, description, className }: { domain: string; path: string[]; title: string; description: string; className?: string }) {
  const t = useDict(ed, 'admin');
  return (
    <div className={className}>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('serpTitle')}</div>
      <div className="rounded-xl border border-line/80 bg-canvas/40 p-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold text-brand-700 ring-1 ring-line">S</span>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13px] font-medium text-ink">ITCOM</div>
            <div className="truncate text-[12px] text-muted">
              https://{domain}
              {path.filter(Boolean).map((p, i) => (
                <span key={i}> › {p}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-2 truncate text-[18px] font-medium leading-snug text-[#1a0dab]">{title || '—'}</div>
        <p className={cn('mt-1 line-clamp-2 text-[13px] leading-relaxed', description ? 'text-ink-soft' : 'italic text-muted')}>{description || t('serpEmpty')}</p>
      </div>
    </div>
  );
}
