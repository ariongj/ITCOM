// Integrime — CMS proposal p.06 ("Integrime: pagesa, korrier, email, ERP, analitikë"; a menu item does not create the
// technical integration) and p.40 ("Integrime dhe webhook endpoints me scopes, status, histori dhe rotacion secrets").
// Cards grouped by kind from settings.integrations; connect / configure / disconnect / rotate / test are SIMULATED and
// only update the stored status + log (updateSettings). Secrets never reach the browser.
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Lock, Network, ShieldCheck, Webhook } from 'lucide-react';
import { Card, PageHeader } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { timeAgo } from '@/lib/format';
import { Callout, DemoChip, StatusMark } from '@/admin/components/analytics/ui';
import { IntegrationCard } from '@/admin/components/integrations/IntegrationCard';
import { ConnectModal, DisconnectModal, type ConnectDraft } from '@/admin/components/integrations/Dialogs';
import { LogDrawer } from '@/admin/components/integrations/LogDrawer';
import { useIT, l10nOf, type ITKey } from '@/admin/components/integrations/i18n';
import {
  KIND_META, STATUS_MARK, WEBHOOK_EVENTS, groupsOf, lastSyncOf, logOf, newSecretTail, pushLog, webhookUrl, withIntegration,
  type IntegrationY,
} from '@/admin/components/integrations/model';

export default function Integrations() {
  const t = useIT();
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const canEdit = can('integrations', 'edit');
  const staff = useCurrentStaff();
  const by = staff?.name ?? 'Admin';

  const stored = useDb((s) => s.settings.integrations);
  const orders = useDb((s) => s.orders);
  const updateSettings = useDb((s) => s.updateSettings);

  // "now" follows the data so relative times refresh after every simulated action
  const now = useMemo(() => new Date(), [stored, orders]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupsOf(stored), [stored]);
  const all = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const logs = useMemo(() => new Map(all.map((x) => [x.id, logOf(x, orders, now)])), [all, orders, now]);

  const counts = { connected: 0, test: 0, disconnected: 0 };
  for (const x of all) counts[x.status]++;
  const events24h = [...logs.values()].flat().filter((e) => now.getTime() - new Date(e.at).getTime() < 86400000).length;

  /* ---------------- dialogs ---------------- */
  const [logId, setLogId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [connect, setConnect] = useState<{ id: string; mode: 'connect' | 'configure' } | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [discId, setDiscId] = useState<string | null>(null);
  const [discOpen, setDiscOpen] = useState(false);
  const byId = (id: string | null) => (id ? all.find((x) => x.id === id) ?? null : null);

  const save = (next: IntegrationY) => updateSettings({ integrations: withIntegration(stored, next) });
  const nameOf = (x: IntegrationY) => l(KIND_META[x.kind].title);

  const submitConnect = (d: ConnectDraft) => {
    const x = byId(connect?.id ?? null);
    if (!x || !connect) return;
    const at = new Date().toISOString();
    const provider = KIND_META[x.kind].providers.find((p) => p.id === d.provider)?.name ?? d.provider;
    const fresh = x.status === 'disconnected';
    const next = pushLog(
      {
        ...x,
        status: d.env === 'live' ? 'connected' : 'test',
        provider: d.provider,
        env: d.env,
        scopes: d.scopes,
        name: x.kind === 'analytics' ? provider : x.name,
        note: '',
        lastSync: at,
        ...(fresh ? { secretTail: newSecretTail(), rotatedAt: at } : {}),
      },
      {
        at,
        level: 'ok',
        text: l10nOf(connect.mode === 'connect' ? 'ev_connected' : 'ev_configured', { provider, by }, {
          me: { env: d.env === 'live' ? 'produkcija' : 'test' },
          sq: { env: d.env === 'live' ? 'live' : 'prove' },
          en: { env: d.env === 'live' ? 'live' : 'test' },
        }),
      },
    );
    save(next);
    setConnectOpen(false);
    toast.success(t(connect.mode === 'connect' ? 'connectedToast' : 'savedToast', { name: nameOf(x) }));
  };

  const confirmDisconnect = () => {
    const x = byId(discId);
    if (!x) return;
    const at = new Date().toISOString();
    save(pushLog({ ...x, status: 'disconnected', scopes: [], env: undefined, note: '', lastSync: undefined }, { at, level: 'warn', text: l10nOf('ev_disconnected', { by }) }));
    setDiscOpen(false);
    toast(t('disconnectedToast', { name: nameOf(x) }));
  };

  const rotate = (x: IntegrationY) => {
    const at = new Date().toISOString();
    save(pushLog({ ...x, secretTail: newSecretTail(), rotatedAt: at }, { at, level: 'ok', text: l10nOf('ev_rotated', { by }) }));
    toast.success(t('rotatedToast'));
  };

  const test = (x: IntegrationY) => {
    const at = new Date().toISOString();
    const ms = 120 + Math.floor(Math.random() * 180);
    save(pushLog({ ...x, lastSync: at }, { at, level: 'ok', text: l10nOf('ev_test', { ms }) }));
    toast.success(t('testToast'), { description: `200 OK · ${ms} ms` });
  };

  const logItem = byId(logId);
  const webhooks = all.filter((x) => x.status !== 'disconnected' && WEBHOOK_EVENTS[x.kind].length);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader breadcrumbs={[ta('nav_integrations')]} title={ta('nav_integrations')} description={t('desc')} actions={<DemoChip>{t('demo')}</DemoChip>} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] text-muted">
        <StatusMark state="on">{t('sum_connected', { n: counts.connected })}</StatusMark>
        <StatusMark state="partial">{t('sum_test', { n: counts.test })}</StatusMark>
        <StatusMark state="off">{t('sum_off', { n: counts.disconnected })}</StatusMark>
        <span>{t('sum_events', { n: events24h })}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Callout icon={Network} title={t('principleTitle')}>
          {t('principle')}
        </Callout>
        <Callout icon={ShieldCheck} title={t('secretsTitle')}>
          {t('secrets')}
        </Callout>
      </div>

      {!canEdit && (
        <Callout icon={Lock} title={t('readOnly')}>
          {t('readOnlyText')}
        </Callout>
      )}

      {/* Cards grouped by kind (PDF p.06: pagesa, korrier, email, fiskalizimi, analitikë, ERP) */}
      <div className="grid gap-x-5 gap-y-6 lg:grid-cols-2">
        {groups.map((g) => {
          const Icon = KIND_META[g.kind].icon;
          return (
            <section key={g.kind} aria-labelledby={`grp-${g.kind}`} className="flex min-w-0 flex-col">
              <h2 id={`grp-${g.kind}`} className="mb-2 flex items-center gap-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-muted">
                <Icon className="h-3.5 w-3.5" />
                {t(`g_${g.kind}` as ITKey)}
              </h2>
              <div className="grid flex-1 gap-3">
                {g.items.map((x) => (
                  <IntegrationCard
                    key={x.id}
                    x={x}
                    now={now}
                    lastSync={lastSyncOf(x, now)}
                    logCount={logs.get(x.id)?.length ?? 0}
                    canEdit={canEdit}
                    onLog={() => {
                      setLogId(x.id);
                      setLogOpen(true);
                    }}
                    onConnect={(mode) => {
                      setConnect({ id: x.id, mode });
                      setConnectOpen(true);
                    }}
                    onDisconnect={() => {
                      setDiscId(x.id);
                      setDiscOpen(true);
                    }}
                    onRotate={() => rotate(x)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Webhook endpoints (p.40) */}
      <Card
        title={
          <span className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-ink-soft" />
            {t('wh_title')}
          </span>
        }
        description={t('wh_desc')}
        padded={false}
      >
        {webhooks.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">{t('wh_none')}</p>
        ) : (
          <ul className="divide-y divide-line/70">
            <li className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_140px_130px] gap-4 bg-canvas/60 px-5 py-2 text-[12px] font-semibold text-muted md:grid">
              <span>{t('wh_endpoint')}</span>
              <span>{t('wh_events')}</span>
              <span>{t('wh_status')}</span>
              <span>{t('wh_last')}</span>
            </li>
            {webhooks.map((x) => {
              const last = lastSyncOf(x, now);
              return (
                <li key={x.id} className="grid gap-2 px-5 py-3 text-[13px] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_140px_130px] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{nameOf(x)}</div>
                    <code className="block truncate font-mono text-[11.5px] text-muted">{webhookUrl(x.kind).replace('https://', '')}</code>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {WEBHOOK_EVENTS[x.kind].map((e) => (
                      <code key={e} className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-ink-soft ring-1 ring-line/70">
                        {e}
                      </code>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 md:block">
                    <StatusMark state={STATUS_MARK[x.status]}>{t(x.env === 'live' ? 'env_live' : 'env_test')}</StatusMark>
                    <span className="text-[12px] text-muted md:hidden">· {last ? timeAgo(last, lang) : '—'}</span>
                  </div>
                  <span className="hidden text-[12.5px] text-muted md:block">{last ? timeAgo(last, lang) : '—'}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <LogDrawer
        open={logOpen}
        x={logItem}
        entries={logId ? logs.get(logId) ?? [] : []}
        canTest={canEdit && !!logItem && logItem.status !== 'disconnected'}
        onTest={() => logItem && test(logItem)}
        onClose={() => setLogOpen(false)}
      />
      <ConnectModal open={connectOpen} x={byId(connect?.id ?? null)} mode={connect?.mode ?? 'connect'} onClose={() => setConnectOpen(false)} onSubmit={submitConnect} />
      <DisconnectModal open={discOpen} x={byId(discId)} onClose={() => setDiscOpen(false)} onConfirm={confirmDisconnect} />
    </div>
  );
}
