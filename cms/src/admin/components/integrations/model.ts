// Integrime — view model on top of settings.integrations (PDF p.40: scopes, status, history, secret rotation).
// The catalogue of kinds/providers/scopes lives in analytics/integrations.ts (shared with the Analytics screen).
// Everything is SIMULATED: no request ever leaves the browser and no secret is stored.
import type { Integration, IntegrationKind, L10n, Order } from '@/lib/types';
import type { MarkState } from '@/admin/components/analytics/ui';
import { DEFAULT_PROVIDER, KINDS, KIND_META, demoLog, type IntegrationX } from '@/admin/components/analytics/integrations';

export { KINDS, KIND_META };

export type LogLevel = 'ok' | 'warn' | 'error';
export interface LogEntry {
  at: string;
  level: LogLevel;
  text: L10n;
}

/** Stored integration + the extra demo fields this screen persists (all optional). */
export interface IntegrationY extends IntegrationX {
  /** Last 4 characters of the server-side secret (never the secret itself) */
  secretTail?: string;
  rotatedAt?: string;
}

export type Env = 'test' | 'live';

export const STATUS_MARK: Record<Integration['status'], MarkState> = { connected: 'on', test: 'partial', disconnected: 'off' };
export const STATUS_KEY = { connected: 'st_connected', test: 'st_test', disconnected: 'st_disconnected' } as const;
export const LEVEL_MARK: Record<LogLevel, MarkState> = { ok: 'on', warn: 'partial', error: 'bad' };

/** Small deterministic hash so demo values (sync time, key tail) stay stable between renders. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Fills the demo defaults a seeded integration does not carry (provider, scopes, environment). */
export function normalize(x: IntegrationY): IntegrationY {
  const on = x.status !== 'disconnected';
  return {
    ...x,
    provider: x.provider ?? (on ? DEFAULT_PROVIDER[x.kind] ?? KIND_META[x.kind].providers[0]?.id : undefined),
    scopes: x.scopes ?? (on ? KIND_META[x.kind].scopes.map((s) => s.id) : []),
    env: on ? x.env ?? (x.status === 'connected' ? 'live' : 'test') : undefined,
  };
}

export interface Group {
  kind: IntegrationKind;
  items: IntegrationY[];
}

/** One group per kind (PDF p.06 order); a kind without a stored integration shows a "not connected" placeholder. */
export function groupsOf(stored: Integration[]): Group[] {
  return KINDS.map((kind) => {
    const list = (stored as IntegrationY[]).filter((i) => i.kind === kind);
    const items = list.length ? list : [{ id: `int-${kind}`, kind, name: KIND_META[kind].title.sq, status: 'disconnected' as const, note: '' }];
    return { kind, items: items.map(normalize) };
  });
}

export const providerName = (x: IntegrationY) => KIND_META[x.kind].providers.find((p) => p.id === x.provider)?.name;

/** Last successful sync — stored after a simulated connect/test, otherwise a stable "a few minutes ago". */
export function lastSyncOf(x: IntegrationY, now: Date): string | undefined {
  if (x.status === 'disconnected') return undefined;
  return x.lastSync ?? new Date(now.getTime() - (2 + (hash(x.id) % 17)) * 60000).toISOString();
}

export function secretTailOf(x: IntegrationY) {
  return x.secretTail ?? hash(`${x.id}:${x.provider ?? ''}`).toString(16).slice(-4).padStart(4, '0');
}

export function rotatedAtOf(x: IntegrationY, now: Date) {
  return x.rotatedAt ?? new Date(now.getTime() - (18 + (hash(x.id) % 40)) * 86400000).toISOString();
}

export const newSecretTail = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');

/** Events each provider pushes to the CMS (analytics only receives events, it does not send any). */
export const WEBHOOK_EVENTS: Record<IntegrationKind, string[]> = {
  payment: ['payment.succeeded', 'payment.failed', 'refund.updated'],
  courier: ['shipment.created', 'shipment.delivered'],
  email: ['message.delivered', 'message.bounced'],
  fiscal: ['invoice.fiscalized', 'invoice.rejected'],
  analytics: [],
  erp: ['stock.updated', 'invoice.posted'],
};

export const webhookUrl = (kind: IntegrationKind) => `https://itcom.example/api/webhooks/${kind}`;

const T = (me: string, sq: string, en: string): L10n => ({ me, sq, en });

/**
 * Activity log: stored entries (connect, rotate, test…) + demo entries derived from real store data
 * (analytics/integrations.ts → demoLog), extended here for the kinds that log nothing there.
 */
export function logOf(x: IntegrationY, orders: Order[], now: Date): LogEntry[] {
  const out: LogEntry[] = demoLog(x, orders, now);
  if (x.status === 'disconnected') return out;
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shipped = recent.filter((o) => o.fulfillment?.shippedAt).slice(0, 4);
  if (x.kind === 'courier')
    for (const o of shipped)
      out.push({ at: o.fulfillment!.shippedAt!, level: 'ok', text: T(`shipment.created — ${o.number} · naljepnica kreirana`, `shipment.created — ${o.number} · etiketa u krijua`, `shipment.created — ${o.number} · label created`) });
  if (x.kind === 'fiscal')
    for (const o of recent.filter((o) => o.payment.status === 'paid').slice(0, 4))
      out.push({ at: o.createdAt, level: 'ok', text: T(`invoice.fiscalized — ${o.number} · fiskalni broj sačuvan`, `invoice.fiscalized — ${o.number} · numri fiskal u ruajt`, `invoice.fiscalized — ${o.number} · fiscal number stored`) });
  if (x.kind === 'erp') {
    out.push({ at: new Date(now.getTime() - 35 * 60000).toISOString(), level: 'ok', text: T('stock.updated — 42 artikla sinhronizovana', 'stock.updated — 42 artikuj u sinkronizuan', 'stock.updated — 42 items synced') });
    out.push({ at: new Date(now.getTime() - 6 * 3600000).toISOString(), level: 'warn', text: T('2 artikla bez šifre u knjigovodstvu — preskočeni', '2 artikuj pa kod në kontabilitet — u anashkaluan', '2 items without an accounting code — skipped') });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

/** Replace (or add) one integration in the stored list. */
export function withIntegration(stored: Integration[], next: IntegrationY): Integration[] {
  return stored.some((i) => i.id === next.id) ? stored.map((i) => (i.id === next.id ? next : i)) : [...stored, next];
}

export const pushLog = (x: IntegrationY, entry: LogEntry): IntegrationY => ({ ...x, log: [entry, ...(x.log ?? [])].slice(0, 30) });
