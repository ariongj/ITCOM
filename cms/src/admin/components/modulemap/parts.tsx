// Building blocks of the module map — neutral (black / grey / white), statuses as symbol + text, print-friendly.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useL } from '@/i18n';
import { href } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { StatusMark, type MarkState } from '@/admin/components/analytics/ui';
import type { Criterion, CritState, Decision, ModStatus, ModuleItem, Phase } from './data';
import { useMT, type MTKey } from './i18n';

export const MOD_KEY: Record<ModStatus, MTKey> = { demo: 'st_demo', phase2: 'st_phase2', need: 'st_need' };
export const CRIT_KEY: Record<CritState, MTKey> = { demo: 'cs_demo', partial: 'cs_partial', impl: 'cs_impl' };
export const CRIT_SHORT: Record<CritState, MTKey> = { demo: 'cs_demo_s', partial: 'cs_partial_s', impl: 'cs_impl_s' };
export type DecisionState = 'open' | 'discussed' | 'decided';
export const DEC_MARK: Record<DecisionState, MarkState> = { open: 'off', discussed: 'partial', decided: 'on' };
export const DEC_KEY: Record<DecisionState, MTKey> = { open: 'ds_open', discussed: 'ds_discussed', decided: 'ds_decided' };

/* ------------------------------------------------------------------ */
/* Status chips                                                        */
/* ------------------------------------------------------------------ */
function Dot({ kind, className }: { kind: 'full' | 'half' | 'empty'; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={cn('h-2.5 w-2.5 shrink-0', className)} aria-hidden>
      <circle cx="6" cy="6" r="4.6" fill={kind === 'full' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" />
      {kind === 'half' && <path d="M6 1.4a4.6 4.6 0 0 1 0 9.2z" fill="currentColor" />}
    </svg>
  );
}

/** "Në demo" (black, filled ●) · "Faza 2" (◐, outlined) · "Sipas nevojës" (○, dashed). */
export function ModChip({ status, className }: { status: ModStatus; className?: string }) {
  const t = useMT();
  return (
    <span
      className={cn(
        'mm-chip inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-[11px] font-bold leading-none',
        status === 'demo' && 'bg-ink text-white',
        status === 'phase2' && 'border border-ink/25 bg-white text-ink',
        status === 'need' && 'border border-dashed border-ink/30 bg-white text-ink-soft',
        className,
      )}
    >
      <Dot kind={status === 'demo' ? 'full' : status === 'phase2' ? 'half' : 'empty'} />
      {t(MOD_KEY[status])}
    </span>
  );
}

/** Criterion symbol: ✓ in a filled circle · half circle · dashed circle. */
export function CritSymbol({ state, className }: { state: CritState; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cn('h-5 w-5 shrink-0', className)} aria-hidden>
      {state === 'demo' && (
        <>
          <circle cx="10" cy="10" r="9" className="fill-ink" />
          <path d="M6 10.4l2.6 2.6L14 7.6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {state === 'partial' && (
        <>
          <circle cx="10" cy="10" r="8.2" fill="white" className="stroke-ink" strokeWidth="1.6" />
          <path d="M10 1.8a8.2 8.2 0 0 1 0 16.4z" className="fill-ink" />
        </>
      )}
      {state === 'impl' && <circle cx="10" cy="10" r="8.2" fill="white" className="stroke-ink/40" strokeWidth="1.6" strokeDasharray="3 2.4" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Section title                                                       */
/* ------------------------------------------------------------------ */
export function SectionTitle({ id, num, kicker, title, text, aside, page }: { id: string; num: string; kicker: string; title: string; text: string; aside?: ReactNode; page: string }) {
  const t = useMT();
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          <span className="tabular-nums text-ink">{num}</span>
          <span aria-hidden>/</span>
          <span>{kicker}</span>
        </div>
        <h2 id={id} className="mt-1.5 text-[20px] font-bold leading-tight tracking-tight text-ink sm:text-[22px]">
          {title}
        </h2>
        <p className="mt-1 max-w-3xl text-[13.5px] text-muted">{text}</p>
        <p className="mt-1 text-[11.5px] text-ink/40">{t('source', { p: page })}</p>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Phase column (p.49)                                                 */
/* ------------------------------------------------------------------ */
export function PhaseColumn({ phase, num, all, shown }: { phase: Phase; num: string; all: ModuleItem[]; shown: ModuleItem[] }) {
  const t = useMT();
  const l = useL('admin');
  const demo = all.filter((m) => m.status === 'demo').length;
  return (
    <section aria-labelledby={`ph-${phase.id}`} className="mm-card flex min-w-0 flex-col rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="border-b border-line/70 px-5 pb-4 pt-4">
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-[12px] font-semibold text-muted">{num}</span>
          <h3 id={`ph-${phase.id}`} className="text-[16px] font-semibold text-ink">
            {l(phase.title)}
          </h3>
        </div>
        <p className="mt-0.5 text-[12.5px] text-muted">{l(phase.text)}</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas ring-1 ring-line/60" aria-hidden>
            <div className="mm-fill h-full rounded-full bg-ink" style={{ width: `${all.length ? (demo / all.length) * 100 : 0}%` }} />
          </div>
          <span className="shrink-0 text-[11.5px] font-semibold tabular-nums text-ink-soft">{t('phaseCount', { n: all.length, d: demo })}</span>
        </div>
      </header>
      {shown.length ? (
        <ul className="divide-y divide-line/60">
          {shown.map((m) => (
            <li key={m.id}>
              <ModuleRow m={m} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-[12.5px] text-muted">{t('phaseEmpty')}</p>
      )}
    </section>
  );
}

function ModuleRow({ m }: { m: ModuleItem }) {
  const t = useMT();
  const l = useL('admin');
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[13.5px] font-semibold leading-snug text-ink">{l(m.name)}</span>
        <span className="flex shrink-0 items-center gap-1">
          <ModChip status={m.status} />
          {m.to && (m.site ? <ArrowUpRight className="mm-noprint h-3.5 w-3.5 text-muted transition-colors group-hover:text-ink" /> : <ArrowRight className="mm-noprint h-3.5 w-3.5 text-muted transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-ink" />)}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">{l(m.text)}</p>
    </>
  );
  const cls = 'group block px-5 py-3 transition-colors hover:bg-canvas/60 focus-visible:bg-canvas/60 focus-visible:outline-none';
  if (m.to && m.site)
    return (
      <a href={href(m.to)} target="_blank" rel="noreferrer" title={t('openSite')} className={cls}>
        {body}
      </a>
    );
  if (m.to)
    return (
      <Link to={m.to} className={cls}>
        {body}
      </Link>
    );
  return (
    <div className="px-5 py-3">
      {body}
      {m.related && (
        <Link to={m.related} className="mm-noprint mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-ink-soft underline-offset-2 hover:text-ink hover:underline">
          {t('related')} <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Acceptance criteria (p.50)                                          */
/* ------------------------------------------------------------------ */
export function CriteriaCard({ title, items }: { title: string; items: Criterion[] }) {
  const t = useMT();
  const l = useL('admin');
  const demo = items.filter((c) => c.state === 'demo').length;
  return (
    <section className="mm-card flex min-w-0 flex-col rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="flex items-baseline justify-between gap-3 border-b border-line/70 px-5 py-3.5">
        <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted">
          {demo}/{items.length}
        </span>
      </header>
      <ul className="divide-y divide-line/60">
        {items.map((c) => (
          <li key={c.id} className="flex gap-3 px-5 py-3">
            <CritSymbol state={c.state} className="mt-px" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-snug text-ink">{l(c.text)}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-muted">{l(c.how)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                <span className="font-bold uppercase tracking-[0.06em] text-ink-soft">{t(CRIT_SHORT[c.state])}</span>
                {c.to &&
                  (c.site ? (
                    <a href={href(c.to)} target="_blank" rel="noreferrer" className="mm-noprint inline-flex items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline">
                      {t('see')} <ArrowUpRight className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link to={c.to} className="mm-noprint inline-flex items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline">
                      {t('see')} <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Decisions (p.51)                                                    */
/* ------------------------------------------------------------------ */
export function DecisionCard({
  num,
  title,
  items,
  states,
  hint,
  onCycle,
}: {
  num: string;
  title: string;
  items: Decision[];
  states: Record<string, DecisionState>;
  hint: (d: Decision) => string | null;
  onCycle: (id: string) => void;
}) {
  const t = useMT();
  const l = useL('admin');
  return (
    <section className="mm-card flex min-w-0 flex-col rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="flex items-baseline gap-2.5 border-b border-line/70 px-5 py-3.5">
        <span className="font-mono text-[12px] font-semibold text-muted">{num}</span>
        <h3 className="text-[14.5px] font-semibold text-ink">{title}</h3>
      </header>
      <ol className="divide-y divide-line/60">
        {items.map((d) => {
          const st = states[d.id] ?? 'open';
          const h = hint(d);
          return (
            <li key={d.id} className="px-5 py-3">
              <p className="text-[13.5px] font-semibold leading-snug text-ink">{l(d.q)}</p>
              {h && <p className="mt-1 text-[12.5px] leading-snug text-muted">{h}</p>}
              <button
                type="button"
                onClick={() => onCycle(d.id)}
                title={t('ds_hint')}
                className="mt-2 inline-flex h-7 items-center rounded-md border border-line bg-white px-2 transition-colors hover:border-ink/30 hover:bg-canvas/60"
              >
                <StatusMark state={DEC_MARK[st]} className="text-[12px]">
                  {t(DEC_KEY[st])}
                </StatusMark>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

