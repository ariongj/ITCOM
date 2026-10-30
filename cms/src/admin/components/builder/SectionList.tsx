import { useState, type DragEvent, type ReactNode } from 'react';
import { AlertCircle, AlertTriangle, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, GripVertical, Lock } from 'lucide-react';
import type { HomeSection } from '@/lib/types';
import { useDict, useL } from '@/i18n';
import { cn } from '@/lib/utils';
import { B } from './i18n';
import { SECTION_META, ICON_TILE, sectionSummary } from './meta';
import { IconBtn } from './fields';
import { rowChange } from './diff';
import { issueCounts, type Issue } from './validate';

/** Move item `from` so that it lands before index `to` (0…length). */
export function moveTo<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, x);
  return next;
}

const rowBase =
  'group flex w-full cursor-pointer items-center gap-2.5 rounded-lg py-2 pl-2 pr-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink/25';

/** Reorderable homepage sections (drag + up/down), show/hide, change + validation markers. */
export function SectionList({
  sections,
  live,
  issues,
  selectedId,
  readOnly,
  onReorder,
  onToggle,
  onSelect,
}: {
  sections: HomeSection[];
  /** Live sections JSON by id (row markers "New" / "Changed") */
  live: Map<string, string>;
  issues: Map<string, Issue[]>;
  selectedId: string | null;
  readOnly?: boolean;
  onReorder: (next: HomeSection[], movedId: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  const reset = () => {
    setDragFrom(null);
    setDropAt(null);
  };
  const onDragOver = (e: DragEvent<HTMLLIElement>, i: number) => {
    if (dragFrom === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const r = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (dragFrom !== null && dropAt !== null && dropAt !== dragFrom && dropAt !== dragFrom + 1) {
      onReorder(moveTo(sections, dragFrom, dropAt), sections[dragFrom].id);
    }
    reset();
  };
  const step = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    onReorder(moveTo(sections, i, dir === 1 ? j + 1 : j), sections[i].id);
  };

  return (
    <ul className="space-y-0.5" onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropAt(null)}>
      {sections.map((s, i) => {
        const meta = SECTION_META[s.type];
        const Icon = meta.icon;
        const sum = sectionSummary(s, l, t);
        const change = rowChange(s, live);
        const { errors, warnings } = issueCounts(issues.get(s.id));
        const selected = selectedId === s.id;
        const showLineBefore = dropAt === i && dragFrom !== null && dragFrom !== i && dragFrom !== i - 1;
        const showLineAfter = i === sections.length - 1 && dropAt === sections.length && dragFrom !== null && dragFrom !== i;
        return (
          <li
            key={s.id}
            draggable={!readOnly}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', s.id);
              setDragFrom(i);
            }}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={onDrop}
            onDragEnd={reset}
            className="relative"
          >
            {showLineBefore && <DropLine className="-top-[2px]" />}
            {showLineAfter && <DropLine className="-bottom-[2px]" />}
            <div
              role="button"
              tabIndex={0}
              aria-current={selected || undefined}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(s.id);
                }
              }}
              className={cn(rowBase, selected ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.035]', dragFrom === i && 'opacity-40')}
            >
              {readOnly ? (
                <span className="-mr-1 hidden w-4 shrink-0 sm:block" aria-hidden />
              ) : (
                <span className="-mr-1 hidden h-8 w-4 shrink-0 cursor-grab place-items-center text-ink/25 transition group-hover:text-ink/55 active:cursor-grabbing sm:grid" title={t('dragHandle')} aria-hidden>
                  <GripVertical className="h-4 w-4" />
                </span>
              )}
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md ring-1 ring-inset', meta.tone, !s.enabled && 'opacity-45')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn('truncate text-[13.5px] text-ink', selected ? 'font-bold' : 'font-semibold', !s.enabled && 'text-ink/55')}>{t(`type_${s.type}`)}</span>
                  {change && <ChangeTag kind={change} />}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
                  {!s.enabled && (
                    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink-soft">
                      <EyeOff className="h-3 w-3" /> {t('hidden')} ·
                    </span>
                  )}
                  {errors > 0 ? (
                    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-red-700">
                      <AlertCircle className="h-3 w-3" /> {t('stErrors', { n: errors })} ·
                    </span>
                  ) : warnings > 0 ? (
                    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> {warnings} ·
                    </span>
                  ) : null}
                  <span className="truncate">{sum.meta ? `${sum.meta} · ${sum.line}` : sum.line}</span>
                </span>
              </span>
              {!readOnly && (
                <span className="flex shrink-0 items-center transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <IconBtn label={t('moveUp')} disabled={i === 0} onClick={() => step(i, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label={t('moveDown')} disabled={i === sections.length - 1} onClick={() => step(i, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label={s.enabled ? t('hide') : t('show')} onClick={() => onToggle(s.id, !s.enabled)}>
                    {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconBtn>
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-ink/30 transition group-hover:text-ink/70" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** "• Changed" / "+ New" — text + symbol, never colour alone. */
export function ChangeTag({ kind }: { kind: 'new' | 'changed' }) {
  const t = useDict(B, 'admin');
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-ink/10 bg-white px-1.5 text-[10.5px] font-semibold leading-[17px] text-ink-soft">
      {kind === 'new' ? <span aria-hidden>+</span> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />}
      {kind === 'new' ? t('tagNew') : t('tagChanged')}
    </span>
  );
}

/** Header / Announcement bar / Footer: theme parts that can't be moved or removed. */
export function FixedRow({
  icon: Icon,
  label,
  summary,
  selected,
  onClick,
  trailing,
}: {
  icon: typeof Lock;
  label: ReactNode;
  summary: ReactNode;
  selected: boolean;
  onClick: () => void;
  trailing?: ReactNode;
}) {
  const t = useDict(B, 'admin');
  return (
    <button type="button" onClick={onClick} aria-current={selected || undefined} className={cn(rowBase, selected ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.035]')}>
      <span className="hidden w-4 shrink-0 sm:block" aria-hidden />
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md ring-1 ring-inset', ICON_TILE)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('truncate text-[13.5px] text-ink', selected ? 'font-bold' : 'font-semibold')}>{label}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted" title={t('fixedHint')}>
            <Lock className="h-2.5 w-2.5" /> {t('fixedTag')}
          </span>
        </span>
        <span className="block truncate text-[12px] text-muted">{summary}</span>
      </span>
      {trailing}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink/30 transition group-hover:text-ink/70" />
    </button>
  );
}

function DropLine({ className }: { className?: string }) {
  return (
    <span className={cn('pointer-events-none absolute inset-x-1 z-10 flex items-center', className)}>
      <span className="h-2 w-2 rounded-full border-2 border-ink bg-white" />
      <span className="h-0.5 flex-1 rounded-full bg-ink" />
    </span>
  );
}
