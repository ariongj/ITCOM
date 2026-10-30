// Step 3 — "Mat dhe përfundo" (PDF p.29): UTM, visits, CTA clicks, code uses, orders, revenue, discount total;
// attributed traffic is kept apart from sales where the discount was really used. Ending deactivates linked content.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Check, Copy, Download, Flag, Info, Link2, MousePointerClick, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Card, confirmDialog } from '@/admin/components/kit';
import { useL, useLang } from '@/i18n';
import { offerRates } from '@/lib/offers';
import { discountState } from '@/lib/discounts';
import { money, num } from '@/lib/format';
import { href } from '@/lib/paths';
import { cn, download } from '@/lib/utils';
import type { Discount, Lang, OfferState, Placement } from '@/lib/types';
import type { OfferData } from './hooks';
import { buildUtm, fmtDay, fullDate, parseUtm, type OfferX, type UtmFields } from './model';
import { FieldLabel, Note, SelectBox, TextInput, useOT } from './ui';

const pct = (v: number, lang: Lang) => `${num(v * 100, lang, 1)}%`;
const MEDIUMS = ['email', 'newsletter', 'social', 'facebook', 'instagram', 'banner', 'hero', 'sms', 'qr'];

export function MeasureStep({
  offer,
  state,
  discount,
  data,
  linked,
  onUtm,
  onEnd,
  canEnd,
  canExport,
  canPauseRule,
}: {
  offer: OfferX;
  state: OfferState;
  discount?: Discount;
  data: OfferData;
  linked: Placement[];
  onUtm: (utm: string) => void;
  onEnd: (opts: { content: boolean; rule: boolean }) => void;
  canEnd: boolean;
  canExport: boolean;
  canPauseRule: boolean;
}) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const m = offer.metrics;
  const r = offerRates(offer);
  const started = state !== 'draft' && state !== 'scheduled';

  const orders = useMemo(
    () =>
      discount
        ? data.orders
            .filter((o) => o.status !== 'cancelled' && o.discounts?.some((a) => a.id === discount.id))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 6)
        : [],
    [data.orders, discount],
  );

  const exportCsv = () => {
    const rows = [
      ['metric', 'value'],
      ['offer', l(offer.name)],
      ['slug', offer.slug],
      ['utm', offer.utm],
      ['visits', m.visits],
      ['cta_clicks', m.ctaClicks],
      ['code_uses', m.codeUses],
      ['orders', m.orders],
      ['revenue_eur', m.revenue],
      ['discount_total_eur', m.discountTotal],
    ];
    download(`oferta-${offer.slug}.csv`, rows.map((x) => x.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
  };

  return (
    <div className="space-y-5">
      <Note icon={Info} title={t('attrTitle')}>
        {t('attrText')}
      </Note>
      {!started && <Note>{t('notStarted', { d: fullDate(offer.startsAt, lang) })}</Note>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('g_traffic')} description={t('g_trafficText')} bodyClassName="grid grid-cols-2 gap-3">
          <Stat icon={MousePointerClick} label={t('m_visits')} value={num(m.visits, lang)} hint="UTM · banner · hero" />
          <Stat icon={MousePointerClick} label={t('m_cta')} value={num(m.ctaClicks, lang)} hint={t('m_ctr', { p: pct(r.ctr, lang) })} />
        </Card>
        <Card
          title={t('g_sales')}
          description={t('g_salesText')}
          bodyClassName="grid grid-cols-2 gap-3"
          actions={
            canExport && (
              <Button size="xs" shape="rounded" variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv}>
                CSV
              </Button>
            )
          }
        >
          <Stat icon={ShoppingBag} label={t('m_orders')} value={num(m.orders, lang)} hint={t('m_conv', { p: pct(r.conversion, lang) })} />
          <Stat icon={ShoppingBag} label={t('m_codeUses')} value={discount?.method === 'auto' ? '—' : num(m.codeUses, lang)} hint={discount?.method === 'auto' ? t('m_codeAuto') : discount?.code ?? '—'} />
          <Stat icon={ShoppingBag} label={t('m_revenue')} value={money(m.revenue, lang, { decimals: false })} hint={t('m_aov', { v: money(r.avgOrder, lang, { decimals: false }) })} />
          <Stat icon={ShoppingBag} label={t('m_discount')} value={money(m.discountTotal, lang, { decimals: false })} hint={t('m_discountShare', { p: pct(m.revenue ? m.discountTotal / m.revenue : 0, lang) })} />
        </Card>
      </div>
      {!discount && <Note>{t('editorialMetrics')}</Note>}

      {/* funnel — one series, direct labels */}
      <Card title={t('funnel')} description={t('funnelNote')}>
        <div className="space-y-3">
          <FunnelBar label={t('m_visits')} value={m.visits} max={m.visits} rate="100%" lang={lang} />
          <FunnelBar label={t('m_cta')} value={m.ctaClicks} max={m.visits} rate={pct(r.ctr, lang)} lang={lang} />
          <FunnelBar label={t('m_orders')} value={m.orders} max={m.visits} rate={pct(r.conversion, lang)} lang={lang} />
        </div>
      </Card>

      {discount && (
        <Card title={t('recentOrders')} padded={false}>
          {orders.length === 0 ? (
            <p className="px-5 py-6 text-center text-[13px] text-muted">{t('noOrders')}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {orders.map((o) => {
                const a = o.discounts!.find((x) => x.id === discount.id)!;
                return (
                  <li key={o.id}>
                    <Link to={`/admin/narudzbe/${o.id}`} className="flex items-center gap-3 px-5 py-2.5 text-[13.5px] transition-colors hover:bg-canvas/70">
                      <span className="w-20 shrink-0 font-semibold text-ink">{o.number}</span>
                      <span className="hidden w-24 shrink-0 text-muted sm:block">{fmtDay(o.createdAt, lang)}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-soft">
                        {o.customer.firstName} {o.customer.lastName}
                      </span>
                      <span className="shrink-0 text-[12.5px] text-muted tabular-nums">−{money(a.amount, lang)}</span>
                      <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-ink">{money(o.total, lang)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <UtmBuilder offer={offer} data={data} onUtm={onUtm} />

      <EndCard offer={offer} state={state} discount={discount} data={data} linked={linked} onEnd={onEnd} canEnd={canEnd} canPauseRule={canPauseRule} />
    </div>
  );
}

/* ================================================================== */
function Stat({ icon: Icon, label, value, hint }: { icon: typeof Info; label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="rounded-lg border border-line/80 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-[20px] font-bold leading-tight tracking-tight text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 truncate text-[12px] text-muted">{hint}</div>
    </div>
  );
}

function FunnelBar({ label, value, max, rate, lang }: { label: string; value: number; max: number; rate: string; lang: Lang }) {
  const w = max ? Math.max(value ? 1.5 : 0, (value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)_92px] items-center gap-3 text-[13px] sm:grid-cols-[140px_minmax(0,1fr)_110px]" title={`${label}: ${num(value, lang)} (${rate})`}>
      <span className="truncate text-ink-soft">{label}</span>
      <span className="h-3 overflow-hidden rounded bg-canvas">
        <span className="block h-full rounded-r bg-ink" style={{ width: `${w}%` }} />
      </span>
      <span className="text-right tabular-nums">
        <span className="font-semibold text-ink">{num(value, lang)}</span> <span className="text-muted">· {rate}</span>
      </span>
    </div>
  );
}

/* ================================================================== */
function UtmBuilder({ offer, data, onUtm }: { offer: OfferX; data: OfferData; onUtm: (utm: string) => void }) {
  const t = useOT();
  const l = useL('admin');
  const collection = offer.collectionId ? data.collections.find((c) => c.id === offer.collectionId) : undefined;
  const parsed = parseUtm(offer.utm);
  const [f, setF] = useState<UtmFields>({ source: parsed.source || 'optikamiftari', medium: parsed.medium || 'email', campaign: parsed.campaign || offer.slug, content: parsed.content });
  const [dest, setDest] = useState<'landing' | 'collection' | 'catalog'>('landing');
  const path = dest === 'collection' && collection ? `/koleksioni/${collection.slug}` : dest === 'catalog' ? '/produktet' : `/oferta/${offer.slug}`;
  const qs = buildUtm(f);
  const full = `${window.location.origin}${href(path)}${qs ? `?${qs}` : ''}`;
  const isCurrent = qs === offer.utm;
  const field = (k: keyof UtmFields, label: string, extra?: { list?: string; optional?: boolean }) => (
    <div>
      <FieldLabel htmlFor={`utm-${k}`} hint={extra?.optional ? t('utm_optional') : undefined}>
        {label}
      </FieldLabel>
      <TextInput id={`utm-${k}`} value={f[k]} list={extra?.list} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="font-mono text-[13px]" />
    </div>
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      toast.success(t('copied'));
    } catch {
      toast(full);
    }
  };
  return (
    <Card title={t('utm')} description={t('utmText')} bodyClassName="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="utm-dest">{t('utm_dest')}</FieldLabel>
          <SelectBox id="utm-dest" value={dest} onChange={(e) => setDest(e.target.value as typeof dest)}>
            <option value="landing">
              {t('dest_landing')} — /oferta/{offer.slug}
            </option>
            {collection && (
              <option value="collection">
                {t('dest_collection')} — {l(collection.title)}
              </option>
            )}
            <option value="catalog">{t('dest_catalog')} — /proizvodi</option>
          </SelectBox>
        </div>
        {field('source', t('utm_source'))}
        {field('medium', t('utm_medium'), { list: 'utm-mediums' })}
        {field('campaign', t('utm_campaign'))}
        {field('content', t('utm_content'), { optional: true })}
        <datalist id="utm-mediums">
          {MEDIUMS.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </div>
      <div>
        <FieldLabel>{t('utm_result')}</FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <code className="min-w-0 flex-1 break-all rounded-lg border border-line bg-canvas/60 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink">{full}</code>
          <div className="flex shrink-0 gap-2 sm:flex-col">
            <Button size="sm" shape="rounded" variant="outline" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>
              {t('copyLink')}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-3 text-[12.5px] text-muted">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          {t('utm_current')}: <code className="truncate font-mono text-ink-soft">{offer.utm || '—'}</code>
        </span>
        {isCurrent ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
            <Check className="h-3.5 w-3.5" />
            {t('utm_isCurrent')}
          </span>
        ) : (
          <Button
            size="xs"
            shape="rounded"
            variant="outline"
            onClick={() => {
              onUtm(qs);
              toast(t('utm_saved'));
            }}
          >
            {t('utm_save')}
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ================================================================== */
function EndCard({
  offer,
  state,
  discount,
  data,
  linked,
  onEnd,
  canEnd,
  canPauseRule,
}: {
  offer: OfferX;
  state: OfferState;
  discount?: Discount;
  data: OfferData;
  linked: Placement[];
  onEnd: (opts: { content: boolean; rule: boolean }) => void;
  canEnd: boolean;
  canPauseRule: boolean;
}) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const active = linked.filter((p) => p.status === 'active');
  const shared = discount ? data.offers.find((o) => o.id !== offer.id && o.discountId === discount.id && o.status === 'active' && (!o.endsAt || new Date(o.endsAt).getTime() > Date.now())) : undefined;
  const ruleLive = !!discount && discountState(discount) === 'active';
  const [content, setContent] = useState(true);
  const [rule, setRule] = useState(false);
  const live = state === 'active' || state === 'paused';

  if (state === 'expired')
    return (
      <Card title={t('end')}>
        <Note icon={Flag}>{t('endedOn', { d: offer.endsAt ? fullDate(offer.endsAt, lang) : '—' })}</Note>
      </Card>
    );

  return (
    <Card title={t('end')} description={t('endText')} bodyClassName="space-y-3">
      <p className="text-[13px] font-medium text-ink">{offer.endsAt ? t('endAuto', { d: fullDate(offer.endsAt, lang) }) : t('endNoDate')}</p>
      {live && (
        <>
          <Checkbox checked={content} onChange={setContent} label={<span className="text-[13.5px]">{t('endContent', { n: active.length })}</span>} description={t('endContentHint')} disabled={!active.length} />
          {discount && ruleLive && (
            <Checkbox
              checked={rule && !shared && canPauseRule}
              onChange={setRule}
              disabled={!!shared || !canPauseRule}
              label={<span className="text-[13.5px]">{t('endRule', { name: discount.title })}</span>}
              description={shared ? t('endRuleShared', { name: l(shared.name) }) : canPauseRule ? t('endRuleHint') : t('noRulePerm')}
            />
          )}
          <div className={cn('flex flex-wrap items-center gap-3 pt-1')}>
            <Button
              size="sm"
              shape="rounded"
              variant="outline"
              icon={<Flag className="h-3.5 w-3.5" />}
              disabled={!canEnd}
              title={canEnd ? undefined : t('noPerm')}
              onClick={async () => {
                if (await confirmDialog({ title: t('endConfirmTitle', { name: l(offer.name) }), text: t('endConfirmText'), confirmLabel: t('endNow'), danger: false })) onEnd({ content, rule: rule && !shared && canPauseRule });
              }}
            >
              {t('endNow')}
            </Button>
            {!canEnd && <span className="text-[12.5px] text-muted">{t('noPerm')}</span>}
          </div>
        </>
      )}
    </Card>
  );
}
