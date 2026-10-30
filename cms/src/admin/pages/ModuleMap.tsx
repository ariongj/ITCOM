// Harta e moduleve — the page the agency walks the client through (CMS proposal pp.47–51):
// 01 module map by phase (p.49 + p.47) with "Në demo / Faza 2 / Sipas nevojës" and links to the working screens,
// 02 acceptance criteria (p.50) marked honestly as shown here vs verified during implementation,
// 03 decisions to start (p.51) as open questions for the client. Neutral, printable (Printo → only this page prints).
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Printer, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/admin/components/kit';
import { Button } from '@/components/ui/Button';
import { interpolate, useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { ROLES } from '@/lib/permissions';
import { StatTile, StatusMark } from '@/admin/components/analytics/ui';
import { cn } from '@/lib/utils';
import { fmtDayYear } from '@/admin/components/analytics/fmt';
import { CRITERIA, DECISIONS, MODULES_MAP, PHASES, type CritState, type Decision, type ModStatus } from '@/admin/components/modulemap/data';
import { CRIT_KEY, CritSymbol, CriteriaCard, DecisionCard, ModChip, PhaseColumn, SectionTitle, type DecisionState } from '@/admin/components/modulemap/parts';
import { useMT } from '@/admin/components/modulemap/i18n';

type Filter = 'all' | ModStatus;
const STORE_KEY = 'optika-module-decisions';
const CYCLE: Record<DecisionState, DecisionState> = { open: 'discussed', discussed: 'decided', decided: 'open' };
const num = (i: number) => String(i + 1).padStart(2, '0');

function readStates(): Record<string, DecisionState> {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// Print only the map: everything else (top bar, sidebar, toasts) is hidden; cards don't split across pages.
const PRINT_CSS = `
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #module-map, #module-map * { visibility: visible !important; }
  #module-map { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
  #module-map .mm-noprint { display: none !important; }
  #module-map .mm-card { break-inside: avoid; box-shadow: none !important; }
  #module-map section > ul > li, #module-map section > ol > li { break-inside: avoid; }
  #module-map .mm-chip, #module-map .mm-fill, #module-map svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export default function ModuleMap() {
  const t = useMT();
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');

  const settings = useDb((s) => s.settings);
  const staff = useDb((s) => s.staff);
  const products = useDb((s) => s.products);

  const [filter, setFilter] = useState<Filter>('all');
  const [states, setStates] = useState<Record<string, DecisionState>>(readStates);

  const counts = useMemo(() => {
    const c = { demo: 0, phase2: 0, need: 0 };
    for (const m of MODULES_MAP) c[m.status]++;
    return c;
  }, []);
  const crit = useMemo(() => {
    const c: Record<CritState, number> = { demo: 0, partial: 0, impl: 0 };
    for (const g of CRITERIA) for (const x of g.items) c[x.state]++;
    return c;
  }, []);
  const critTotal = crit.demo + crit.partial + crit.impl;

  // values the decision hints quote from the live demo
  const ctx = useMemo(() => {
    const langs = (['sq', 'en', 'me'] as const).filter((x) => settings.languages[x]).map((x) => (x === 'me' ? 'SR' : x.toUpperCase()));
    return {
      staff: staff.filter((s) => s.active).length,
      roles: ROLES.length,
      langs: langs.join(' / '),
      tz: settings.timezone,
      products: products.filter((p) => p.status !== 'archived').length,
      connected: settings.integrations.filter((i) => i.status === 'connected').length,
      test: settings.integrations.filter((i) => i.status === 'test').length,
    };
  }, [settings, staff, products]);
  const hint = (d: Decision) => (d.hint ? interpolate(l(d.hint), ctx) : null);

  const allDecisions = DECISIONS.flatMap((g) => g.items);
  const decided = allDecisions.filter((d) => states[d.id] === 'decided').length;

  const persist = (next: Record<string, DecisionState>) => {
    setStates(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* private mode — keep it in memory */
    }
  };
  const cycle = (id: string) => persist({ ...states, [id]: CYCLE[states[id] ?? 'open'] });
  const reset = () => {
    persist({});
    toast(t('resetDone'));
  };

  return (
    <div id="module-map" className="space-y-10 pb-12">
      <style>{PRINT_CSS}</style>
      <div>
        <p className="mb-3 hidden border-b border-line pb-2 text-[11px] text-muted print:block">{t('printHead', { company: settings.companyName, date: fmtDayYear(new Date(), lang) })}</p>
        <PageHeader
          breadcrumbs={[ta('nav_moduleMap')]}
          title={ta('nav_moduleMap')}
          description={t('desc')}
          actions={
            <span className="mm-noprint">
              <Button variant="outline" size="sm" shape="rounded" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()} className="bg-white">
                {t('print')}
              </Button>
            </span>
          }
        />
      </div>

      {/* Summary */}
      <div className="-mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatTile label={t('tile_demo')} value={`${counts.demo}/${MODULES_MAP.length}`} caption={t('tile_demo_cap', { n: MODULES_MAP.length })} className="mm-card" />
          <StatTile label={t('tile_phase2')} value={counts.phase2} caption={t('tile_phase2_cap')} className="mm-card" />
          <StatTile label={t('tile_need')} value={counts.need} caption={t('tile_need_cap')} className="mm-card" />
          <StatTile label={t('tile_crit')} value={`${crit.demo}/${critTotal}`} caption={t('tile_crit_cap', { p: crit.partial, i: crit.impl })} className="mm-card" />
        </div>
        <nav aria-label={ta('breadcrumb')} className="mm-noprint flex flex-wrap gap-2">
          {(
            [
              ['mm-modules', 'nav_modules'],
              ['mm-criteria', 'nav_criteria'],
              ['mm-decisions', 'nav_decisions'],
            ] as const
          ).map(([id, key], i) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
            >
              <span className="font-mono text-[11px] text-muted">{num(i)}</span>
              {t(key)}
            </a>
          ))}
        </nav>
      </div>

      {/* 01 — Module map (p.49 + p.47) */}
      <section aria-labelledby="mm-modules" className="scroll-mt-20 space-y-4">
        <SectionTitle
          id="mm-modules"
          num="01"
          kicker={t('s1_kicker')}
          title={t('s1_title')}
          text={t('s1_text')}
          page="47, 49"
          aside={
            <div role="group" aria-label={t('filter')} className="mm-noprint flex flex-wrap gap-1 rounded-lg bg-canvas p-0.5 ring-1 ring-line/70">
              {(
                [
                  ['all', t('f_all'), MODULES_MAP.length],
                  ['demo', t('st_demo'), counts.demo],
                  ['phase2', t('st_phase2'), counts.phase2],
                  ['need', t('st_need'), counts.need],
                ] as const
              ).map(([id, label, n]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[12.5px] font-semibold transition-colors',
                    filter === id ? 'bg-white text-ink shadow-sm ring-1 ring-line/70' : 'text-muted hover:text-ink',
                  )}
                >
                  {label}
                  <span className="tabular-nums text-muted">{n}</span>
                </button>
              ))}
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
          <ModChip status="demo" />
          <ModChip status="phase2" />
          <ModChip status="need" />
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {PHASES.map((p, i) => {
            const all = MODULES_MAP.filter((m) => m.phase === p.id);
            return <PhaseColumn key={p.id} phase={p} num={num(i)} all={all} shown={filter === 'all' ? all : all.filter((m) => m.status === filter)} />;
          })}
        </div>
        <div className="space-y-1 text-[12.5px] leading-relaxed text-muted">
          <p>{t('s1_note')}</p>
          <p>{t('s1_budget')}</p>
        </div>
      </section>

      {/* 02 — Acceptance criteria (p.50) */}
      <section aria-labelledby="mm-criteria" className="scroll-mt-20 space-y-4">
        <SectionTitle id="mm-criteria" num="02" kicker={t('s2_kicker')} title={t('s2_title')} text={t('s2_text')} page="50" />
        <div className="space-y-2.5">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-canvas ring-1 ring-line/70" aria-hidden>
            <div className="mm-fill h-full bg-ink" style={{ width: `${(crit.demo / critTotal) * 100}%` }} />
            <div className="mm-fill h-full bg-ink/35" style={{ width: `${(crit.partial / critTotal) * 100}%` }} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-soft">
            {(['demo', 'partial', 'impl'] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-2">
                <CritSymbol state={s} className="h-4 w-4" />
                <span className="font-semibold">{t(CRIT_KEY[s])}</span>
                <span className="tabular-nums text-muted">{crit[s]}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {CRITERIA.map((g) => (
            <CriteriaCard key={g.id} title={l(g.title)} items={g.items} />
          ))}
        </div>
        <p className="text-[12.5px] leading-relaxed text-muted">{t('s2_note')}</p>
      </section>

      {/* 03 — Decisions (p.51) */}
      <section aria-labelledby="mm-decisions" className="scroll-mt-20 space-y-4">
        <SectionTitle
          id="mm-decisions"
          num="03"
          kicker={t('s3_kicker')}
          title={t('s3_title')}
          text={t('s3_text')}
          page="51"
          aside={
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <StatusMark state={decided === allDecisions.length ? 'on' : decided ? 'partial' : 'off'}>{t('decided', { d: decided, n: allDecisions.length })}</StatusMark>
              {Object.keys(states).length > 0 && (
                <Button variant="ghost" size="xs" shape="rounded" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={reset} className="mm-noprint">
                  {t('reset')}
                </Button>
              )}
            </div>
          }
        />
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {DECISIONS.map((g, i) => (
            <DecisionCard key={g.id} num={num(i)} title={l(g.title)} items={g.items} states={states} hint={hint} onCycle={cycle} />
          ))}
        </div>
        <p className="text-[12.5px] leading-relaxed text-muted">
          {t('s3_note')} <span className="mm-noprint">· {t('ds_hint')}</span>
        </p>
      </section>
    </div>
  );
}
