// Simulated "Lidh / Konfiguro / Shkëput" flow. Nothing is sent anywhere and no key is typed: the dialog explains
// what the real connection needs (provider account, server-side secret, signed webhook, test before live).
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Copy, FlaskConical, Lock, Unplug } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Checkbox, RadioCard } from '@/components/ui/Field';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { cn } from '@/lib/utils';
import { Segmented, StatusMark } from '@/admin/components/analytics/ui';
import { KIND_META, WEBHOOK_EVENTS, webhookUrl, type Env, type IntegrationY } from './model';
import { useIT, type ITKey } from './i18n';

export interface ConnectDraft {
  provider: string;
  env: Env;
  scopes: string[];
}

export function draftFor(x: IntegrationY): ConnectDraft {
  const meta = KIND_META[x.kind];
  return {
    provider: x.provider ?? meta.providers[0].id,
    env: x.env ?? 'test',
    scopes: x.scopes?.length ? x.scopes : meta.scopes.map((s) => s.id),
  };
}

export function ConnectModal({
  open,
  x,
  mode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  x: IntegrationY | null;
  mode: 'connect' | 'configure';
  onClose: () => void;
  onSubmit: (d: ConnectDraft) => void;
}) {
  const t = useIT();
  const l = useL('admin');
  const name = x ? l(KIND_META[x.kind].title) : '';
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t(mode === 'connect' ? 'm_connectTitle' : 'm_configureTitle', { name })}
      description={x ? l(KIND_META[x.kind].desc) : undefined}
    >
      {x && <ConnectForm key={`${x.id}:${mode}`} x={x} mode={mode} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function ConnectForm({ x, mode, onClose, onSubmit }: { x: IntegrationY; mode: 'connect' | 'configure'; onClose: () => void; onSubmit: (d: ConnectDraft) => void }) {
  const t = useIT();
  const l = useL('admin');
  const meta = KIND_META[x.kind];
  const [d, setD] = useState<ConnectDraft>(() => draftFor(x));
  const required = new Set(meta.scopes.filter((s) => s.required).map((s) => s.id));
  const url = webhookUrl(x.kind);
  const hasWebhook = WEBHOOK_EVENTS[x.kind].length > 0;

  return (
    <>
      <div className="space-y-5 px-6 py-5">
        <SimNotice />

        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-ink-soft">{t('provider')}</legend>
          <div className={cn('grid gap-2', meta.providers.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {meta.providers.map((p) => (
              <RadioCard key={p.id} checked={d.provider === p.id} onSelect={() => setD({ ...d, provider: p.id })} title={<span className="text-[14px]">{p.name}</span>} description={l(p.note)} />
            ))}
          </div>
        </fieldset>

        <div>
          <span className="mb-2 block text-[13px] font-semibold text-ink-soft">{t('env')}</span>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<Env>
              label={t('env')}
              value={d.env}
              onChange={(env) => setD({ ...d, env })}
              options={[
                { id: 'test', label: <StatusMark state="partial">{t('env_test')}</StatusMark> },
                { id: 'live', label: <StatusMark state="on">{t('env_live')}</StatusMark> },
              ]}
            />
            <span className="text-[12.5px] text-muted">{t(d.env === 'live' ? 'm_envHint_live' : 'm_envHint_test')}</span>
          </div>
        </div>

        <fieldset>
          <legend className="mb-1 text-[13px] font-semibold text-ink-soft">{t('scopes')}</legend>
          <p className="mb-2.5 text-[12.5px] text-muted">{t('m_scopesHint')}</p>
          <div className="space-y-2.5 rounded-xl border border-line px-4 py-3">
            {meta.scopes.map((s) => (
              <Checkbox
                key={s.id}
                checked={d.scopes.includes(s.id)}
                disabled={required.has(s.id)}
                onChange={(v) => setD({ ...d, scopes: v ? meta.scopes.map((x) => x.id).filter((id) => id === s.id || d.scopes.includes(id)) : d.scopes.filter((id) => id !== s.id) })}
                label={
                  <span className="flex flex-wrap items-center gap-x-2 text-[13.5px]">
                    {l(s.label)}
                    <code className="font-mono text-[11px] font-medium text-muted">{s.id}</code>
                    {s.required && <span className="text-[11px] font-medium text-muted">· {t('required')}</span>}
                  </span>
                }
              />
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t('m_secret')}</span>
            <div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-ink/20 bg-canvas/70 px-3 text-[13px] text-muted">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t('m_secretValue')}</span>
            </div>
            <p className="mt-1.5 text-xs text-muted">{t('m_secretHint')}</p>
          </div>
          {hasWebhook && (
            <div className="min-w-0">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-soft">{t('m_webhook')}</span>
              <div className="flex h-10 items-center gap-1 rounded-lg border border-line bg-white pl-3 pr-1 text-[12.5px]">
                <code className="min-w-0 flex-1 truncate font-mono text-ink-soft">{url}</code>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(url).catch(() => undefined);
                    toast.success(t('copied'), { description: url });
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink"
                  aria-label={t('copy')}
                  title={t('copy')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">{t('m_webhookHint')}</p>
            </div>
          )}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" shape="rounded" onClick={onClose} className="bg-white">
          <CancelLabel />
        </Button>
        <Button size="sm" shape="rounded" icon={<FlaskConical className="h-4 w-4" />} onClick={() => onSubmit(d)}>
          {t(mode === 'connect' ? 'm_connectBtn' : 'm_saveBtn')}
        </Button>
      </DialogFooter>
    </>
  );
}

export function DisconnectModal({ open, x, onClose, onConfirm }: { open: boolean; x: IntegrationY | null; onClose: () => void; onConfirm: () => void }) {
  const t = useIT();
  const l = useL('admin');
  const name = x ? l(KIND_META[x.kind].title) : '';
  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('m_disconnectTitle', { name })}>
      {x && (
        <>
          <div className="space-y-4 px-6 py-5 text-[13.5px] leading-relaxed text-ink-soft">
            <p>{t('m_disconnectText')}</p>
            <p className="rounded-lg bg-canvas/80 px-3 py-2.5 text-[13px]">{t(`effect_${x.kind}` as ITKey)}</p>
            <SimNotice compact />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" shape="rounded" onClick={onClose} className="bg-white">
              <CancelLabel />
            </Button>
            <Button variant="danger" size="sm" shape="rounded" icon={<Unplug className="h-4 w-4" />} onClick={onConfirm}>
              {t('m_disconnectBtn')}
            </Button>
          </DialogFooter>
        </>
      )}
    </Modal>
  );
}

function SimNotice({ compact }: { compact?: boolean }) {
  const t = useIT();
  return (
    <div className={cn('flex gap-3 rounded-xl border border-dashed border-ink/25 bg-white px-4', compact ? 'py-2.5' : 'py-3')}>
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
      <div className="text-[12.5px] leading-relaxed text-ink-soft">
        <div className="font-semibold text-ink">{t('m_simTitle')}</div>
        {!compact && t('m_sim')}
      </div>
    </div>
  );
}

function CancelLabel() {
  const ta = useDict(adm, 'admin');
  return <>{ta('cancel')}</>;
}

function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/95 px-6 py-4 backdrop-blur">{children}</div>;
}
