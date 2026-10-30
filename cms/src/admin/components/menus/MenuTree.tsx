// Editable menu tree: drag & drop or ↑/↓ within the same level, one level of sub-links (indent / outdent),
// per-row status (text + symbol) and validation messages.
import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, CornerDownRight, GripVertical, ListIndentDecrease, ListIndentIncrease, Pencil, Plus, Trash2 } from 'lucide-react';
import { ActionMenu } from '@/admin/components/editorial/ui';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import type { MenuItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { resolveLink, type LinkSources } from './links';
import { canIndent, indentItem, moveItem, moveNextTo, outdentItem, type ItemError } from './tree';
import { mn } from './dict';
import { IssueChip, TypeIcon } from './ui';

interface Props {
  items: MenuItem[];
  src: LinkSources;
  /** Only filled once the user tried to save / apply */
  errors: Map<string, ItemError[]>;
  readOnly: boolean;
  onChange: (items: MenuItem[]) => void;
  onEdit: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

interface Drag {
  id: string;
  parentId: string | null;
}

export function MenuTree(props: Props) {
  const { items } = props;
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);

  const dnd = { drag, over, setDrag, setOver };
  return (
    <ul className="divide-y divide-line/70">
      {items.map((it, i) => (
        <TopItem key={it.id} item={it} index={i} count={items.length} {...props} dnd={dnd} />
      ))}
    </ul>
  );
}

type Dnd = {
  drag: Drag | null;
  over: { id: string; after: boolean } | null;
  setDrag: (d: Drag | null) => void;
  setOver: (o: { id: string; after: boolean } | null) => void;
};

/** Drop handlers for a node that accepts items of the same parent. */
function dropZone(id: string, parentId: string | null, p: Props, dnd: Dnd) {
  return {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!dnd.drag || dnd.drag.parentId !== parentId) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      if (dnd.drag.id === id) return dnd.setOver(null);
      const r = e.currentTarget.getBoundingClientRect();
      const after = e.clientY > r.top + r.height / 2;
      if (dnd.over?.id !== id || dnd.over.after !== after) dnd.setOver({ id, after });
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      if (!dnd.drag || dnd.drag.parentId !== parentId) return;
      e.preventDefault();
      e.stopPropagation();
      if (dnd.over && dnd.over.id === id) p.onChange(moveNextTo(p.items, dnd.drag.id, id, dnd.over.after));
      dnd.setDrag(null);
      dnd.setOver(null);
    },
  };
}

function DropLine({ show, after }: { show: boolean; after: boolean }) {
  if (!show) return null;
  return <span aria-hidden className={cn('pointer-events-none absolute inset-x-3 z-10 h-0.5 rounded-full bg-ink', after ? '-bottom-px' : '-top-px')} />;
}

function TopItem({ item, index, count, dnd, ...p }: Props & { item: MenuItem; index: number; count: number; dnd: Dnd }) {
  const t = useDict(mn, 'admin');
  const kids = item.children ?? [];
  const isOver = dnd.over?.id === item.id;
  return (
    <li className={cn('relative transition-opacity', dnd.drag?.id === item.id && 'opacity-40')} {...(p.readOnly ? {} : dropZone(item.id, null, p, dnd))}>
      <DropLine show={isOver} after={!!dnd.over?.after} />
      <Row item={item} parentId={null} index={index} count={count} dnd={dnd} {...p} />
      {kids.length > 0 && (
        <ul className="relative mb-2 ml-[42px] mr-3 border-l border-line pl-2 sm:ml-[50px]">
          {kids.map((c, j) => (
            <li key={c.id} className={cn('relative transition-opacity', dnd.drag?.id === c.id && 'opacity-40')} {...(p.readOnly ? {} : dropZone(c.id, item.id, p, dnd))}>
              <DropLine show={dnd.over?.id === c.id} after={!!dnd.over?.after} />
              <Row item={c} parentId={item.id} index={j} count={kids.length} dnd={dnd} {...p} />
            </li>
          ))}
          {!p.readOnly && (
            <li>
              <button
                type="button"
                onClick={() => p.onAddChild(item.id)}
                className="ml-1 mt-0.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <Plus className="h-3.5 w-3.5" /> {t('addChild')}
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function Row({ item, parentId, index, count, dnd, ...p }: Props & { item: MenuItem; parentId: string | null; index: number; count: number; dnd: Dnd }) {
  const t = useDict(mn, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const res = resolveLink(item, p.src);
  const errs = p.errors.get(item.id) ?? [];
  const kids = item.children?.length ?? 0;
  const child = parentId !== null;
  const indentable = !child && canIndent(p.items, item.id);
  const heading = item.type === 'url' && !item.target.trim();

  const move = (dir: -1 | 1) => p.onChange(moveItem(p.items, item.id, dir));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      if (p.readOnly) return;
      e.preventDefault();
      move(e.key === 'ArrowUp' ? -1 : 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onEdit(item.id);
    }
  };

  const errText = errs.map((e) => (e === 'label' ? t('labelRequired') : e === 'url' ? t('urlInvalid') : t('targetRequired'))).join(' · ');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${ta('edit')}: ${l(item.label) || t('newLink')}`}
      draggable={!p.readOnly}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        dnd.setDrag({ id: item.id, parentId });
      }}
      onDragEnd={() => {
        dnd.setDrag(null);
        dnd.setOver(null);
      }}
      onClick={() => p.onEdit(item.id)}
      onKeyDown={onKey}
      className={cn(
        'group flex cursor-pointer items-center gap-2.5 rounded-lg outline-none transition-colors hover:bg-canvas/70 focus-visible:ring-2 focus-visible:ring-ink/40',
        child ? 'my-px px-2 py-1.5' : 'px-3 py-2.5 sm:px-4',
        errs.length > 0 && 'bg-red-50/60 ring-1 ring-inset ring-red-200 hover:bg-red-50',
      )}
    >
      {!p.readOnly && (
        <span title={t('dragHint')} className="-ml-1 hidden cursor-grab text-ink/25 transition-colors group-hover:text-ink/60 active:cursor-grabbing sm:block" onClick={(e) => e.stopPropagation()}>
          <GripVertical className="h-4 w-4" />
        </span>
      )}
      <TypeIcon type={item.type} size={child ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('truncate font-semibold', child ? 'text-[13.5px]' : 'text-[14px]', l(item.label) ? 'text-ink' : 'italic text-muted')}>{l(item.label) || t('newLink')}</span>
          {kids > 0 && (
            <span title={t('hasChildren', { n: kids })} className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-ink/[0.05] px-1.5 py-px text-[11.5px] font-semibold text-muted">
              <CornerDownRight className="h-3 w-3" />
              {kids}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
          <span className="shrink-0">{t(`type_${item.type}`)}</span>
          <span className="text-ink/20">·</span>
          <span className={cn('truncate', heading ? 'italic' : 'font-mono text-[11.5px]')}>{heading ? t('noLink') : res.to || item.target || '—'}</span>
        </div>
        {res.issue && <IssueChip issue={res.issue} className="mt-1.5 sm:hidden" />}
        {errs.length > 0 && <div className="mt-1 text-[12px] font-medium text-red-700">{errText}</div>}
      </div>
      {res.issue && <IssueChip issue={res.issue} className="hidden sm:inline-flex" />}
      {!p.readOnly && (
        <div className="flex shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
          <IconBtn label={t('moveUp')} disabled={index === 0} onClick={() => move(-1)}>
            <ChevronUp className="h-4 w-4" />
          </IconBtn>
          <IconBtn label={t('moveDown')} disabled={index === count - 1} onClick={() => move(1)}>
            <ChevronDown className="h-4 w-4" />
          </IconBtn>
          <ActionMenu
            label={ta('actions')}
            items={[
              { label: ta('edit'), icon: Pencil, onSelect: () => p.onEdit(item.id) },
              ...(!child ? [{ label: t('addChild'), icon: Plus, onSelect: () => p.onAddChild(item.id) }] : []),
              ...(child
                ? [{ label: t('outdent'), icon: ListIndentDecrease, onSelect: () => p.onChange(outdentItem(p.items, item.id)) }]
                : [{ label: t('indent'), icon: ListIndentIncrease, onSelect: () => p.onChange(indentItem(p.items, item.id)), disabled: !indentable, title: kids ? t('hasChildren', { n: kids }) : undefined }]),
              { label: t('moveUp'), icon: ArrowUp, onSelect: () => move(-1), disabled: index === 0, divider: true },
              { label: t('moveDown'), icon: ArrowDown, onSelect: () => move(1), disabled: index === count - 1 },
              { label: ta('delete'), icon: Trash2, onSelect: () => p.onDelete(item.id), danger: true, divider: true },
            ]}
          />
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:pointer-events-none disabled:opacity-25"
    >
      {children}
    </button>
  );
}
