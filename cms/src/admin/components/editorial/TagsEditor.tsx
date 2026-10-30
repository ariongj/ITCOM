import { useState, type KeyboardEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { useDict, useL } from '@/i18n';
import type { L10n, Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ed } from './i18n';

// Albanian first (required), English second, `me` = Serbian.
const LANGS: { code: Lang; short: string; ph: string }[] = [
  { code: 'sq', short: 'SQ', ph: 'p.sh. Laptopë gaming' },
  { code: 'en', short: 'EN', ph: 'e.g. Sunglasses' },
  { code: 'me', short: 'SR', ph: 'npr. Naočare za sunce' },
];

const empty = (): L10n => ({ me: '', sq: '', en: '' });
const key = (t: L10n) => (t.sq.trim() || t.me.trim()).toLowerCase();

/** Localized tag chips: add (SQ/EN/SR at once), click to edit, × to remove, plus quick picks. */
export function TagsEditor({ value, onChange, suggestions = [] }: { value: L10n[]; onChange: (v: L10n[]) => void; suggestions?: L10n[] }) {
  const t = useDict(ed, 'admin');
  const l = useL('admin');
  const [form, setForm] = useState<L10n>(empty);
  const [editing, setEditing] = useState<number | null>(null);

  const used = new Set(value.map(key));
  const quick = suggestions.filter((s) => !used.has(key(s)));
  const canSubmit = !!form.sq.trim() && (editing !== null || !used.has(key(form)));

  const submit = () => {
    if (!canSubmit) return;
    const tag: L10n = { me: form.me.trim(), sq: form.sq.trim(), en: form.en.trim() };
    onChange(editing === null ? [...value, tag] : value.map((x, i) => (i === editing ? tag : x)));
    setForm(empty());
    setEditing(null);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
    if (e.key === 'Escape' && editing !== null) {
      e.stopPropagation();
      setEditing(null);
      setForm(empty());
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <Label className="mb-0">{t('tags')}</Label>
        {value.length > 0 && <span className="text-[11.5px] text-muted">{t('tagsHint')}</span>}
      </div>
      <div className="space-y-3 rounded-xl border border-line bg-white p-3">
        {value.length ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((tag, i) => {
              const incomplete = !tag.en.trim() || !tag.me.trim();
              return (
                <span
                  key={`${key(tag)}-${i}`}
                  className={cn(
                    'inline-flex items-center rounded-full text-[12.5px] font-semibold ring-1 transition-colors',
                    editing === i ? 'bg-ink text-paper ring-ink' : 'bg-sand text-ink-soft ring-transparent hover:ring-ink/20',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(i);
                      setForm({ ...tag });
                    }}
                    title={`SQ: ${tag.sq}\nEN: ${tag.en || '—'}\nSR: ${tag.me || '—'}`}
                    className="relative py-1 pl-3 pr-1.5"
                  >
                    {l(tag)}
                    {incomplete && <span className="absolute -top-0.5 right-0 h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(value.filter((_, k) => k !== i));
                      if (editing === i) {
                        setEditing(null);
                        setForm(empty());
                      }
                    }}
                    aria-label={t('tagRemove')}
                    title={t('tagRemove')}
                    className={cn('mr-1 grid h-5 w-5 place-items-center rounded-full transition-colors', editing === i ? 'hover:bg-white/15' : 'text-muted hover:bg-white hover:text-red-600')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">{t('noTags')}</p>
        )}

        <div className="grid gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          {LANGS.map(({ code, short, ph }) => (
            <label key={code} className="flex h-9 items-center overflow-hidden rounded-lg border border-line bg-white transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5">
              <span className="grid h-full w-9 shrink-0 place-items-center border-r border-line bg-canvas/70 text-[10.5px] font-extrabold tracking-wide text-muted">{short}</span>
              <input
                value={form[code]}
                onChange={(e) => setForm((f) => ({ ...f, [code]: e.target.value }))}
                onKeyDown={onKey}
                placeholder={ph}
                className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[13.5px] text-ink outline-none placeholder:text-muted/60"
              />
            </label>
          ))}
          <div className="flex gap-1.5">
            <Button type="button" size="sm" shape="rounded" variant={editing === null ? 'dark' : 'primary'} disabled={!canSubmit} onClick={submit} icon={editing === null ? <Plus className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} className="flex-1">
              {editing === null ? t('tagAdd') : t('tagUpdate')}
            </Button>
            {editing !== null && (
              <Button
                type="button"
                size="sm"
                shape="rounded"
                variant="outline"
                className="w-9 px-0"
                aria-label={t('tagCancel')}
                title={t('tagCancel')}
                onClick={() => {
                  setEditing(null);
                  setForm(empty());
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {quick.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-3">
            <span className="mr-0.5 text-[11.5px] font-semibold text-muted">{t('tagSuggestions')}</span>
            {quick.map((s) => (
              <button
                key={key(s)}
                type="button"
                onClick={() => onChange([...value, { ...s }])}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-0.5 text-[12px] font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:bg-canvas hover:text-ink"
              >
                <Plus className="h-3 w-3" /> {l(s)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
