// Offer editor chrome: the 3-step flow header (PDF p.29) and the sticky summary (like the discount mock-up p.27).
import type { ReactNode } from 'react';
import { AlertTriangle, Check, ChevronRight, CircleDot, Clock3, Flag, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step } from './model';
import { useOT } from './ui';

export type StepTone = 'done' | 'todo' | 'error' | 'live' | 'muted';
export interface StepInfo {
  title: string;
  text: string;
  status: string;
  tone: StepTone;
}

const TONE: Record<StepTone, { icon: typeof Check; cls: string }> = {
  done: { icon: Check, cls: 'text-emerald-800' },
  todo: { icon: AlertTriangle, cls: 'text-amber-800' },
  error: { icon: XCircle, cls: 'text-red-700' },
  live: { icon: CircleDot, cls: 'text-emerald-800' },
  muted: { icon: Clock3, cls: 'text-muted' },
};

export function Stepper({ step, onStep, steps }: { step: Step; onStep: (s: Step) => void; steps: StepInfo[] }) {
  const t = useOT();
  return (
    <nav aria-label={t('stepsNav')} className="mb-5 overflow-hidden rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <ol className="grid grid-cols-3 divide-x divide-line/70">
        {steps.map((s, i) => {
          const n = (i + 1) as Step;
          const on = n === step;
          const T = TONE[s.tone];
          return (
            <li key={n} className="min-w-0">
              <button
                type="button"
                onClick={() => onStep(n)}
                aria-current={on ? 'step' : undefined}
                className={cn('group relative flex h-full w-full min-w-0 items-start gap-2.5 px-3 py-3 text-left transition-colors sm:gap-3 sm:px-4 sm:py-3.5', on ? 'bg-white' : 'bg-canvas/40 hover:bg-canvas/80')}
              >
                <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold sm:h-7 sm:w-7 sm:text-[13px]', on ? 'bg-ink text-white' : s.tone === 'done' || s.tone === 'live' ? 'bg-white text-ink ring-1 ring-ink/25' : 'bg-white text-muted ring-1 ring-line')}>
                  {s.tone === 'done' && !on ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13px] font-semibold leading-tight sm:text-[14px]', on ? 'text-ink' : 'text-ink-soft')}>{s.title}</span>
                  <span className="mt-0.5 hidden truncate text-[12.5px] text-muted md:block">{s.text}</span>
                  <span className={cn('mt-1 hidden items-center gap-1 text-[12px] font-medium sm:inline-flex', T.cls)}>
                    <T.icon className="h-3.5 w-3.5" />
                    {s.status}
                  </span>
                </span>
                {i < 2 && <ChevronRight className="mt-1 hidden h-4 w-4 shrink-0 text-ink/20 xl:block" aria-hidden />}
                {on && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-[13px]">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

export function EndedBanner({ text }: { text: string }) {
  return (
    <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13.5px] text-ink-soft">
      <Flag className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
      {text}
    </div>
  );
}

export function useStepTitles() {
  const t = useOT();
  return [
    { title: t('step1'), text: t('step1Text') },
    { title: t('step2'), text: t('step2Text') },
    { title: t('step3'), text: t('step3Text') },
  ];
}
