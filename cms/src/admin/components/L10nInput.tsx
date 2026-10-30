import { useId, useState, type ReactNode } from 'react';
import { Copy } from 'lucide-react';
import type { L10n, Lang } from '@/lib/types';
import { Label, Hint } from '@/components/ui/Field';
import { useDict, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { cn } from '@/lib/utils';

// Albanian first (source language), English second; the `me` slot holds the Serbian (Latin) copy.
const LANGS: { code: Lang; short: string }[] = [
  { code: 'sq', short: 'SQ' },
  { code: 'en', short: 'EN' },
  { code: 'me', short: 'SR' },
];

/**
 * One field, three languages. Tabs show a dot when a translation is missing.
 * Starts on the admin's panel language.
 */
export function L10nInput({
  label,
  value,
  onChange,
  multiline,
  rows = 3,
  placeholder,
  hint,
  required,
  className,
  mono,
}: {
  label?: ReactNode;
  value: L10n;
  onChange: (v: L10n) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  mono?: boolean;
}) {
  const adminLang = useLang('admin');
  const [lang, setLang] = useState<Lang>(adminLang);
  const t = useDict(adm, 'admin');
  const id = useId();
  const v = value ?? { me: '', sq: '', en: '' };
  const set = (text: string) => onChange({ ...v, [lang]: text });
  const ctl =
    'w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5';

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        {label ? (
          <Label htmlFor={id} required={required} className="mb-0">
            {label}
          </Label>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          {lang !== 'sq' && !v[lang]?.trim() && v.sq?.trim() && (
            <button type="button" onClick={() => set(v.sq)} className="mr-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted hover:bg-canvas hover:text-ink" title={t('copyFromMe')}>
              <Copy className="h-3 w-3" /> SQ
            </button>
          )}
          <div className="flex rounded-lg bg-canvas p-0.5">
            {LANGS.map((l) => {
              const missing = !v[l.code]?.trim();
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLang(l.code)}
                  title={missing ? t('missingTranslation') : undefined}
                  className={cn(
                    'relative rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide transition-colors',
                    lang === l.code ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink',
                  )}
                >
                  {l.short}
                  {missing && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {multiline ? (
        <textarea id={id} rows={rows} value={v[lang] ?? ''} placeholder={placeholder} onChange={(e) => set(e.target.value)} className={cn(ctl, 'resize-y py-2.5 leading-relaxed', mono && 'font-mono text-[13px]')} />
      ) : (
        <input id={id} value={v[lang] ?? ''} placeholder={placeholder} onChange={(e) => set(e.target.value)} className={cn(ctl, 'h-10')} />
      )}
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}
