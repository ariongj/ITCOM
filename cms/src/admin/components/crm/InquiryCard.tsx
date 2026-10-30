import { Copy } from 'lucide-react';
import { useDict, useLang } from '@/i18n';
import { date, timeAgo } from '@/lib/format';
import type { Staff } from '@/lib/types';
import { cn } from '@/lib/utils';
import { cx } from '@/admin/components/contacts/i18n';
import { AssigneeLabel, DueLabel, KindLabel, StatusLabel, TickBox } from '@/admin/components/contacts/atoms';
import type { ContactKind, Due, InquiryX } from '@/admin/components/contacts/model';

/**
 * One contact request as a compact list row — the phone layout of the inbox table
 * (Kërkesa · Lloji · Përgjegjësi · Statusi · Afati · Data).
 */
export function InquiryCard({
  inquiry: q,
  kind,
  assignee,
  due,
  now,
  duplicate,
  selected,
  onSelect,
  selectLabel,
  active,
  onOpen,
}: {
  inquiry: InquiryX;
  kind: ContactKind;
  assignee?: Staff | null;
  due: Due | null;
  now: number;
  duplicate?: boolean;
  selected?: boolean;
  onSelect?: (v: boolean) => void;
  selectLabel?: string;
  active?: boolean;
  onOpen: () => void;
}) {
  const t = useDict(cx, 'admin');
  const lang = useLang('admin');
  const unseen = !q.seen;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
      className={cn('relative flex cursor-pointer gap-3 px-4 py-3.5 text-left outline-none transition-colors active:bg-canvas focus-visible:bg-canvas', (selected || active) && 'bg-canvas/80')}
    >
      {unseen && <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-ink" aria-hidden />}
      {onSelect && (
        <div className="pt-0.5">
          <TickBox checked={!!selected} onChange={onSelect} label={selectLabel ?? ''} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn('truncate text-[14px] text-ink', unseen ? 'font-bold' : 'font-semibold')}>{q.name}</div>
            {q.company && <div className="truncate text-[12px] text-muted">{q.company}</div>}
          </div>
          <span className="shrink-0 pt-0.5 text-[12px] text-muted" title={date(q.createdAt, lang, { dateStyle: 'medium', timeStyle: 'short' })}>
            {timeAgo(q.createdAt, lang)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink-soft">{q.message}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
          <StatusLabel status={q.status} className="text-[12.5px]" />
          <KindLabel kind={kind} className="text-[12.5px]" />
          {due && <DueLabel due={due} now={now} className="text-[12.5px]" />}
          {duplicate && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-800">
              <Copy className="h-3 w-3" /> {t('duplicate')}
            </span>
          )}
        </div>
        <div className="mt-2">
          <AssigneeLabel staff={assignee} className="text-[12.5px]" />
        </div>
      </div>
    </div>
  );
}
