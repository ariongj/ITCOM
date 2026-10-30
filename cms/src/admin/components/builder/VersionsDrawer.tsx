import { useMemo, type ReactNode } from 'react';
import { CircleDot, ExternalLink, History, PencilLine, RotateCcw } from 'lucide-react';
import type { HomeSection, HomeVersion } from '@/lib/types';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { useDict, useLang } from '@/i18n';
import { dateTime, date, timeAgo } from '@/lib/format';
import { href } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { B } from './i18n';
import { diffVersions, type VersionDiff } from './diff';

/**
 * Version history (PDF p.32 "histori versionesh dhe rollback").
 * publishHome() archives the previous live page as { at, by, sections }: `at`/`by` describe the publish that
 * REPLACED those sections. So history[0] = the publish that put the current page live, and version j was
 * published by history[j + 1] (unknown for the oldest one).
 */
export function VersionsDrawer({
  open,
  onClose,
  live,
  history,
  draft,
  canRestore,
  staffName,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  live: HomeSection[];
  history: HomeVersion[];
  /** Current draft (null = none) */
  draft: HomeSection[] | null;
  canRestore: boolean;
  staffName: (id: string) => string;
  onRestore: (index: number, label: string) => void;
}) {
  const t = useDict(B, 'admin');
  const lang = useLang('admin');
  const total = history.length + 1; // + the live version
  const thisYear = new Date().getFullYear();
  const short = (iso: string) => date(iso, lang, new Date(iso).getFullYear() === thisYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });

  const diffs = useMemo(() => history.map((v) => diffVersions(v.sections, live)), [history, live]);
  const draftDiff = useMemo(() => (draft ? diffVersions(draft, live) : null), [draft, live]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[480px]"
      title={
        <span className="flex items-center gap-2.5">
          <History className="h-5 w-5" /> {t('verTitle')}
        </span>
      }
    >
      <div className="px-5 py-5 sm:px-6">
        <p className="rounded-lg bg-[#F4F4F4] px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft ring-1 ring-black/[0.05]">{t('verText')}</p>

        <ol className="relative mt-6 space-y-3 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-line">
          {/* Draft */}
          <Entry
            marker={<PencilLine className="h-3.5 w-3.5" />}
            markerClass={draft ? 'bg-white text-ink ring-ink/25' : 'bg-white text-muted ring-line'}
            title={
              <>
                <span className="font-mono text-[12px] text-muted">v{total + 1}</span> {t('titleDraft')}
              </>
            }
            subtitle={draft ? t('verDraftText') : t('verNoDraft')}
          >
            {draftDiff && <DiffChips d={draftDiff} />}
          </Entry>

          {/* Live */}
          <Entry
            marker={<CircleDot className="h-3.5 w-3.5" />}
            markerClass="bg-ink text-white ring-ink"
            highlight
            title={
              <>
                <span className="font-mono text-[12px] text-muted">v{total}</span> {t('verLive')}
                <span className="ml-1 inline-flex items-center gap-1 rounded border border-ink/15 bg-white px-1.5 text-[10.5px] font-semibold uppercase leading-[17px] tracking-wide text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> {t('current')}
                </span>
              </>
            }
            subtitle={history[0] ? t('verPublishedBy', { when: dateTime(history[0].at, lang), who: staffName(history[0].by) }) : undefined}
            action={
              <a href={href('/')} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft ring-1 ring-line transition hover:bg-ink/[0.04] hover:text-ink">
                <ExternalLink className="h-3.5 w-3.5" /> {t('openSite')}
              </a>
            }
          >
            <span className="text-[12px] text-muted">
              {t('enabledCount', { n: live.filter((s) => s.enabled).length, total: live.length })}
            </span>
          </Entry>

          {/* Archived versions */}
          {history.length === 0 && <li className="pl-11 text-[13px] text-muted">{t('verEmpty')}</li>}
          {history.map((v, j) => {
            const n = total - 1 - j;
            const label = `v${n}`;
            const prev = history[j + 1];
            return (
              <Entry
                key={v.at + j}
                marker={<span className="text-[10.5px] font-bold tabular-nums">{n}</span>}
                markerClass="bg-white text-ink-soft ring-line"
                title={
                  <>
                    <span className="font-mono text-[12px] text-muted">{label}</span> {prev ? t('verRange', { from: short(prev.at), to: short(v.at) }) : t('verUntil', { to: short(v.at) })}
                  </>
                }
                subtitle={
                  <>
                    {prev && <span className="block">{t('verPubBy', { who: staffName(prev.by) })}</span>}
                    <span className="block">
                      {t('verReplacedBy', { who: staffName(v.by) })} · <span title={dateTime(v.at, lang)}>{timeAgo(v.at, lang)}</span>
                    </span>
                  </>
                }
                action={
                  canRestore && (
                    <Button variant="outline" size="xs" shape="rounded" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => onRestore(j, label)}>
                      {t('verRestore')}
                    </Button>
                  )
                }
              >
                <DiffChips d={diffs[j]} />
              </Entry>
            );
          })}
        </ol>
      </div>
    </Drawer>
  );
}

function Entry({
  marker,
  markerClass,
  title,
  subtitle,
  action,
  children,
  highlight,
}: {
  marker: ReactNode;
  markerClass: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  highlight?: boolean;
}) {
  return (
    <li className="relative flex gap-3">
      <span className={cn('relative z-10 mt-3 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full ring-1', markerClass)}>{marker}</span>
      <div className={cn('min-w-0 flex-1 rounded-xl border bg-white px-3.5 py-3', highlight ? 'border-ink/25 shadow-[0_1px_2px_rgb(0_0_0/0.05)]' : 'border-line')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13.5px] font-semibold text-ink">{title}</div>
            {subtitle && <div className="mt-0.5 text-[12px] leading-relaxed text-muted">{subtitle}</div>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

/** What differs from the live page — text chips (+ added, − removed, hidden / shown, content, order). */
function DiffChips({ d }: { d: VersionDiff }) {
  const t = useDict(B, 'admin');
  const name = (s: HomeSection) => t(`type_${s.type}`);
  if (d.same) return <span className="text-[12px] text-muted">= {t('verSame')}</span>;
  const chips: string[] = [
    ...d.added.map((s) => `+ ${name(s)}`),
    ...d.removed.map((s) => `− ${name(s)}`),
    ...d.hidden.map((s) => t('verHiddenX', { name: name(s) })),
    ...d.shown.map((s) => t('verShownX', { name: name(s) })),
    ...(d.content ? [t('verContent', { n: d.content })] : []),
    ...(d.reordered ? [t('verReordered')] : []),
  ];
  const shown = chips.slice(0, 5);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((c) => (
        <span key={c} className="rounded border border-line/80 bg-[#F7F7F7] px-1.5 text-[11.5px] leading-[19px] text-ink-soft">
          {c}
        </span>
      ))}
      {chips.length > shown.length && <span className="px-1 text-[11.5px] leading-[19px] text-muted">+{chips.length - shown.length}</span>}
    </span>
  );
}
