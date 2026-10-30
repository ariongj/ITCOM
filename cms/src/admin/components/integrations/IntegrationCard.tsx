// One integration (PDF p.40): what it does, provider + environment, status (symbol + text), scopes, last sync,
// secret tail + rotation, and the actions the current role may take.
import { KeyRound, ListTree, Plug, RefreshCw, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useL, useLang } from '@/i18n';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusMark } from '@/admin/components/analytics/ui';
import { fmtDayYear } from '@/admin/components/analytics/fmt';
import { SEEDED_NOTES } from '@/admin/components/analytics/integrations';
import { KIND_META, STATUS_KEY, STATUS_MARK, providerName, rotatedAtOf, secretTailOf, type IntegrationY } from './model';
import { useIT } from './i18n';

export function IntegrationCard({
  x,
  now,
  lastSync,
  logCount,
  canEdit,
  onLog,
  onConnect,
  onDisconnect,
  onRotate,
}: {
  x: IntegrationY;
  now: Date;
  lastSync?: string;
  logCount: number;
  canEdit: boolean;
  onLog: () => void;
  onConnect: (mode: 'connect' | 'configure') => void;
  onDisconnect: () => void;
  onRotate: () => void;
}) {
  const t = useIT();
  const l = useL('admin');
  const lang = useLang('admin');
  const meta = KIND_META[x.kind];
  const Icon = meta.icon;
  const on = x.status !== 'disconnected';
  const provider = providerName(x);
  // The stored note is in one language (Albanian in the seed) — the seeded ones have translations.
  const seed = SEEDED_NOTES[x.id];
  const note = x.note ? (seed && [seed.sq, seed.me, seed.en].includes(x.note) ? l(seed) : x.note) : on ? '' : t('notConfigured');
  const scopes = meta.scopes.filter((s) => x.scopes?.includes(s.id));

  return (
    <article className="flex h-full flex-col rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] hover:border-ink/20 hover:shadow-[0_6px_20px_-14px_rgb(0_0_0/0.25)] print:shadow-none">
      <header className="flex items-start gap-3 px-5 pb-3 pt-4">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1', on ? 'bg-ink text-white ring-ink' : 'bg-canvas text-ink-soft ring-line/70')}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">{l(meta.title)}</h3>
            <StatusMark state={STATUS_MARK[x.status]} className="pt-0.5">
              {t(STATUS_KEY[x.status])}
            </StatusMark>
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-muted">
            {provider ?? t('noProvider')}
            {x.env && (
              <>
                {' · '}
                <span className="font-semibold text-ink-soft">{t(x.env === 'live' ? 'env_live' : 'env_test')}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 px-5 pb-4">
        <p className="text-[13px] leading-relaxed text-ink-soft">{l(meta.desc)}</p>
        {note && <p className={cn('rounded-lg px-3 py-2 text-[12.5px] leading-relaxed', on ? 'bg-canvas/80 text-ink-soft' : 'border border-dashed border-line text-muted')}>{note}</p>}

        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{t('scopes')}</div>
          {scopes.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {scopes.map((s) => (
                <li key={s.id} title={l(s.label)} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-[12px] text-ink-soft">
                  <KeyRound className="h-3 w-3 shrink-0 text-muted" />
                  <span className="truncate">{l(s.label)}</span>
                  <code className="hidden shrink-0 font-mono text-[10.5px] text-muted sm:inline">{s.id}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-muted">{t('scopesNone')}</p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-px border-y border-line/70 bg-line/70 text-[12.5px]">
        <div className="bg-white px-5 py-2.5">
          <dt className="text-muted">{t('lastSync')}</dt>
          <dd className="mt-0.5 font-semibold text-ink" title={lastSync ? new Date(lastSync).toLocaleString() : undefined}>
            {lastSync ? timeAgo(lastSync, lang) : t('never')}
          </dd>
        </div>
        <div className="bg-white px-5 py-2.5">
          <dt className="text-muted">{t('secret')}</dt>
          <dd className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 font-semibold text-ink">
            {!on ? (
              <span className="text-muted">—</span>
            ) : canEdit ? (
              <>
                <span className="font-mono tracking-wider">••••{secretTailOf(x)}</span>
                <span className="text-[11.5px] font-medium text-muted">{t('rotated', { date: fmtDayYear(rotatedAtOf(x, now), lang) })}</span>
              </>
            ) : (
              <span className="font-medium text-muted">{t('secretHidden')}</span>
            )}
          </dd>
        </div>
      </dl>

      <footer className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Button variant="ghost" size="xs" shape="rounded" icon={<ListTree className="h-3.5 w-3.5" />} onClick={onLog}>
          {t('log')}
          {logCount > 0 && <span className="rounded bg-ink/[0.07] px-1.5 text-[11px] font-bold tabular-nums text-ink-soft">{logCount}</span>}
        </Button>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-1.5">
            {on ? (
              <>
                <Button variant="ghost" size="xs" shape="rounded" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={onRotate} title={t('rotate')}>
                  <span className="max-sm:sr-only">{t('rotate')}</span>
                </Button>
                <Button variant="outline" size="xs" shape="rounded" onClick={() => onConnect('configure')} className="bg-white">
                  {t('configure')}
                </Button>
                <Button variant="outline" size="xs" shape="rounded" icon={<Unplug className="h-3.5 w-3.5" />} onClick={onDisconnect} className="bg-white">
                  {t('disconnect')}
                </Button>
              </>
            ) : (
              <Button size="xs" shape="rounded" icon={<Plug className="h-3.5 w-3.5" />} onClick={() => onConnect('connect')}>
                {t('connect')}
              </Button>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}
