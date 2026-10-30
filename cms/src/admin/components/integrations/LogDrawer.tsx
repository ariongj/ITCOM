// Connection log (PDF p.40 "status, histori"; p.47 "log, retry"). Demo entries derive from real orders,
// plus what was done on this screen (connect, rotate, test). Never contains secrets.
import { useState } from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { useL, useLang } from '@/i18n';
import { timeAgo } from '@/lib/format';
import { Segmented, StatusMark, StatusSymbol } from '@/admin/components/analytics/ui';
import { fmtDateTime } from '@/admin/components/analytics/fmt';
import { KIND_META, LEVEL_MARK, STATUS_KEY, STATUS_MARK, providerName, type IntegrationY, type LogEntry } from './model';
import { useIT } from './i18n';

type Filter = 'all' | 'warn';

export function LogDrawer({ open, x, entries, canTest, onTest, onClose }: { open: boolean; x: IntegrationY | null; entries: LogEntry[]; canTest: boolean; onTest: () => void; onClose: () => void }) {
  const t = useIT();
  const l = useL('admin');
  const lang = useLang('admin');
  const [filter, setFilter] = useState<Filter>('all');
  const warnings = entries.filter((e) => e.level !== 'ok');
  const list = filter === 'warn' ? warnings : entries;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[480px]"
      title={
        x ? (
          <span className="block min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{t('logTitle')}</span>
            <span className="block truncate text-[16px] font-semibold text-ink">{l(KIND_META[x.kind].title)}</span>
          </span>
        ) : (
          t('logTitle')
        )
      }
      footer={
        <div className="space-y-3">
          <p className="flex gap-2 text-[12px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('logNote')}
          </p>
          {canTest && (
            <Button size="sm" shape="rounded" icon={<Activity className="h-4 w-4" />} onClick={onTest} className="w-full">
              {t('test')}
            </Button>
          )}
        </div>
      }
    >
      {x && (
        <div className="px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-[12.5px] text-muted">
              <StatusMark state={STATUS_MARK[x.status]}>{t(STATUS_KEY[x.status])}</StatusMark>
              {providerName(x) && <span className="ml-2">· {providerName(x)}</span>}
            </div>
            <Segmented<Filter>
              label={t('logTitle')}
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'all', label: `${t('logAll')} · ${entries.length}` },
                { id: 'warn', label: `${t('logWarn')} · ${warnings.length}` },
              ]}
            />
          </div>

          {list.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">{t(filter === 'warn' && entries.length ? 'logEmptyWarn' : 'logEmpty')}</p>
          ) : (
            <ol className="relative mt-4 space-y-0.5 before:absolute before:bottom-3 before:left-[5.5px] before:top-3 before:w-px before:bg-line">
              {list.map((e, i) => (
                <li key={`${e.at}-${i}`} className="relative flex gap-3 rounded-lg py-2 pr-2">
                  <span className="relative z-10 mt-[3px] bg-paper py-0.5">
                    <StatusSymbol state={LEVEL_MARK[e.level]} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[13px] leading-snug text-ink">{l(e.text)}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      <span className="font-semibold">{t(e.level === 'ok' ? 'lv_ok' : e.level === 'warn' ? 'lv_warn' : 'lv_error')}</span>
                      {' · '}
                      <time dateTime={e.at} title={fmtDateTime(e.at, lang)}>
                        {timeAgo(e.at, lang)}
                      </time>
                      {' · '}
                      {fmtDateTime(e.at, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Drawer>
  );
}
