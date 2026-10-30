// "Kontrollet para aktivizimit" — dates vs rule, links, media, products/stock, content (PDF p.28, p.30 footnote).
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { cn } from '@/lib/utils';
import type { OfKey } from './i18n';
import { CHECK_GROUPS, checkStats, type Check, type FixTarget } from './model';
import { useOT, type OT } from './ui';

export function checkText(c: Check, t: OT) {
  const vars: Record<string, string | number> = { ...(c.vars ?? {}) };
  if (c.dstate) vars.state = t(`dst_${c.dstate}`);
  if (c.fields) vars.list = c.fields.map((f) => `${t(f.key as OfKey)} (${f.langs})`).join(', ');
  return t(c.key, vars);
}

export const LEVEL_ICON = {
  ok: { icon: CheckCircle2, cls: 'text-emerald-700' },
  warn: { icon: AlertTriangle, cls: 'text-amber-700' },
  fail: { icon: XCircle, cls: 'text-red-700' },
} as const;

export function ChecksCard({ checks, onFix, footer }: { checks: Check[]; onFix: (f: FixTarget) => void; footer?: ReactNode }) {
  const t = useOT();
  const s = checkStats(checks);
  return (
    <Card
      title={t('checks')}
      description={t('checksText')}
      padded={false}
      actions={
        <span className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold ring-1 ring-inset', s.fail ? 'bg-red-50 text-red-800 ring-red-600/20' : s.warn ? 'bg-amber-50 text-amber-900 ring-amber-600/25' : 'bg-emerald-50 text-emerald-800 ring-emerald-600/20')}>
          {s.fail ? <XCircle className="h-3.5 w-3.5" /> : s.warn ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {t('checksSummary', { ok: s.ok, total: s.total })}
        </span>
      }
    >
      <div id="of-checks" className="scroll-mt-32" />
      <div className="divide-y divide-line/70">
        {CHECK_GROUPS.map((g) => {
          const list = checks.filter((c) => c.group === g);
          if (!list.length) return null;
          return (
            <div key={g} className="grid gap-1 px-5 py-3 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-4">
              <div className="pt-1 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted">{t(`group_${g}`)}</div>
              <ul className="space-y-1">
                {list.map((c) => {
                  const L = LEVEL_ICON[c.level];
                  return (
                    <li key={c.id} className="flex items-start gap-2.5 py-1">
                      <L.icon className={cn('mt-0.5 h-4 w-4 shrink-0', L.cls)} aria-hidden />
                      <span className={cn('min-w-0 flex-1 text-[13.5px] leading-snug', c.level === 'ok' ? 'text-ink-soft' : 'text-ink')}>
                        <span className="sr-only">{c.level === 'ok' ? '✓ ' : c.level === 'warn' ? '! ' : '✕ '}</span>
                        {checkText(c, t)}
                      </span>
                      {c.level !== 'ok' && c.fix && (
                        <button type="button" onClick={() => onFix(c.fix!)} className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[12.5px] font-semibold text-ink hover:bg-canvas">
                          {c.fix === 'sync' ? t('syncDates') : t('fix_open')}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {footer && <div className="border-t border-line/70 bg-canvas/40 px-5 py-3.5">{footer}</div>}
    </Card>
  );
}
