import { useId, useState } from 'react';
import { Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/^#/, '');

/** Tag chips + an input (Enter / comma adds, Backspace removes the last); suggestions from tags already in use. */
export function TagsField({ value, onChange, suggestions = [], placeholder, disabled, className }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string; disabled?: boolean; className?: string }) {
  const [draft, setDraft] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const tags = raw.split(',').map(norm).filter(Boolean);
    const next = [...value];
    for (const tg of tags) if (!next.includes(tg)) next.push(tg);
    if (next.length !== value.length) onChange(next);
    setDraft('');
  };
  const free = suggestions.filter((s) => !value.includes(s));
  return (
    <div className={className}>
      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 transition-colors focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5',
          disabled && 'cursor-not-allowed bg-canvas/70',
        )}
      >
        {value.map((tg) => (
          <span key={tg} className="inline-flex h-6 items-center gap-1 rounded-md bg-ink/[0.06] pl-1.5 pr-1 text-[12px] font-semibold text-ink-soft">
            <Hash className="h-3 w-3 text-muted" />
            {tg}
            {!disabled && (
              <button type="button" onClick={() => onChange(value.filter((x) => x !== tg))} className="grid h-4 w-4 place-items-center rounded text-muted hover:bg-ink/10 hover:text-ink" aria-label={`× ${tg}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            value={draft}
            list={listId}
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(',')) add(v);
              else setDraft(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (draft.trim()) add(draft);
              } else if (e.key === 'Backspace' && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={() => draft.trim() && add(draft)}
            placeholder={value.length ? '' : placeholder}
            className="h-6 min-w-[90px] flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-muted/70"
          />
        )}
      </div>
      <datalist id={listId}>
        {free.slice(0, 30).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {!disabled && free.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {free.slice(0, 6).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
