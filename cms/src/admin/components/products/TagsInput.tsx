import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { slugify } from '@/lib/utils';

/** Chips + input: Enter / comma adds a tag (normalised like the seeded ones: "e-lehte"), Backspace removes the last. */
export function TagsInput({ value, onChange, suggestions, placeholder, removeLabel }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[]; placeholder?: string; removeLabel: string }) {
  const [text, setText] = useState('');
  const listId = useId();
  const add = (raw: string) => {
    const tags = raw
      .split(',')
      .map((s) => slugify(s))
      .filter(Boolean);
    const next = [...value];
    for (const tag of tags) if (!next.includes(tag)) next.push(tag);
    if (next.length !== value.length) onChange(next);
    setText('');
  };
  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1.5 transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5 hover:border-ink/20">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-ink/[0.06] py-0.5 pl-2 pr-1 text-[12.5px] font-medium text-ink">
          {tag}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} aria-label={`${removeLabel} ${tag}`} className="grid h-4 w-4 place-items-center rounded text-muted hover:bg-ink/10 hover:text-ink">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={text}
        list={listId}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(',')) add(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (text.trim()) add(text);
          } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text.trim() && add(text)}
        placeholder={value.length ? '' : placeholder}
        className="h-7 min-w-[110px] flex-1 bg-transparent px-1 text-[13.5px] text-ink outline-none placeholder:text-muted/60"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  );
}
