// Campaign report per offer (PDF p.29/p.38): visits, CTA clicks, code uses, orders, discount totals — with the
// attribution caveat ("Një vizitë përmes bannerit nuk provon vetë ndikim shkakor në shitje").
import { useState } from 'react';
import { Link } from 'react-router';
import { Info, Plug } from 'lucide-react';
import { Card, Table, Td, Th } from '@/admin/components/kit';
import { buttonClass } from '@/components/ui/Button';
import { useDict, useL, useLang } from '@/i18n';
import { useCan } from '@/store/hooks';
import { money, num } from '@/lib/format';
import type { Integration, OfferState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { A, type AKey } from './i18n';
import { Callout, InfoTip, StatusMark, type MarkState } from './ui';
import { shareLabel } from './fmt';
import type { CampaignRow } from './metrics';

export const OFFER_MARK: Record<OfferState, MarkState> = { active: 'on', scheduled: 'partial', paused: 'partial', draft: 'off', expired: 'off' };

export function Campaigns({ rows, analytics }: { rows: CampaignRow[]; analytics?: Integration }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const can = useCan();
  const firstWithData = rows.find((r) => r.visits > 0) ?? rows[0];
  const [sel, setSel] = useState<string | undefined>(firstWithData?.offer.id);
  const current = rows.find((r) => r.offer.id === sel) ?? firstWithData;
  const allMatch = rows.every((r) => r.matches);
  const m = (v: number) => money(v, lang, { decimals: false });

  const head = (label: AKey, def: AKey, right = true) => (
    <Th className={right ? 'text-right' : undefined}>
      <span className={cn('inline-flex items-center gap-1', right && 'justify-end')}>
        {t(label)}
        <InfoTip title={t('how')}>{t(def)}</InfoTip>
      </span>
    </Th>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      <Callout icon={Info} title={t('cp_caveat_title')}>
        {t('cp_caveat')} <span className="text-muted">{t('cp_demo')}</span>
      </Callout>

      <Card title={t('cp_title')} description={t('cp_desc')} padded={false}>
        <ul className="divide-y divide-line/70 sm:hidden">
          {rows.map((r) => {
            const active = current?.offer.id === r.offer.id;
            const stat = (label: AKey, value: string, sub?: string) => (
              <div>
                <div className="text-[11.5px] font-semibold text-muted">{t(label)}</div>
                <div className="text-[14px] font-bold tabular-nums text-ink">{value}</div>
                {sub && <div className="text-[11px] text-muted">{sub}</div>}
              </div>
            );
            return (
              <li key={r.offer.id}>
                <button type="button" onClick={() => setSel(r.offer.id)} aria-pressed={active} className={cn('block w-full px-4 py-3 text-left transition-colors', active && 'bg-canvas')}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-ink">{l(r.offer.name)}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                        <StatusMark state={OFFER_MARK[r.state]} className="text-[12px]">
                          {t(`os_${r.state}` as AKey)}
                        </StatusMark>
                        <span>· {r.discount ? (r.discount.method === 'code' && r.discount.code ? t('rule_code', { code: r.discount.code }) : t('auto')) : t('no_rule')}</span>
                      </span>
                    </span>
                    {active && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink" />}
                  </span>
                  <span className="mt-2.5 grid grid-cols-4 gap-2">
                    {stat('col_visits', num(r.visits, lang))}
                    {stat('col_clicks', num(r.ctaClicks, lang), r.ctr === null ? undefined : shareLabel(r.ctr, lang, 1))}
                    {stat('col_orders', r.discount ? num(r.orders, lang) : '—', r.discount && r.conversion !== null ? shareLabel(r.conversion, lang, 1) : undefined)}
                    {stat('col_discount', r.discount && r.orders > 0 ? m(r.discountTotal) : '—')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden sm:block">
        <Table>
          <thead>
            <tr>
              <Th>{t('col_offer')}</Th>
              {head('col_visits', 'd_visits')}
              {head('col_clicks', 'd_clicks')}
              {head('col_codes', 'd_codes')}
              {head('col_orders', 'd_cOrders')}
              <Th className="text-right">{t('col_revenue')}</Th>
              {head('col_discount', 'd_cDiscount')}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = current?.offer.id === r.offer.id;
              const rule = r.discount ? (r.discount.method === 'code' && r.discount.code ? t('rule_code', { code: r.discount.code }) : t('auto')) : t('no_rule');
              return (
                <tr
                  key={r.offer.id}
                  onClick={() => setSel(r.offer.id)}
                  aria-selected={active}
                  className={cn('cursor-pointer transition-colors', active ? 'bg-canvas' : 'hover:bg-canvas/60')}
                >
                  <Td className="min-w-[220px]">
                    <div className="flex items-start gap-2.5">
                      <span className={cn('mt-1 h-8 w-1 shrink-0 rounded-full', active ? 'bg-ink' : 'bg-transparent')} />
                      <div className="min-w-0">
                        {can('offers', 'view') ? (
                          <Link to={`/admin/ponude/${r.offer.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:underline">
                            {l(r.offer.name)}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink">{l(r.offer.name)}</span>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
                          <StatusMark state={OFFER_MARK[r.state]} className="text-[12px]">
                            {t(`os_${r.state}` as AKey)}
                          </StatusMark>
                          <span>· {rule}</span>
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-right tabular-nums">{num(r.visits, lang)}</Td>
                  <Td className="text-right tabular-nums">
                    {num(r.ctaClicks, lang)}
                    <span className="block text-[11.5px] text-muted">{r.ctr === null ? '—' : `${t('col_ctr')} ${shareLabel(r.ctr, lang, 1)}`}</span>
                  </Td>
                  <Td className="text-right tabular-nums">{r.discount?.method === 'code' ? num(r.codeUses, lang) : <span className="text-muted">—</span>}</Td>
                  <Td className="text-right tabular-nums">
                    {r.discount ? num(r.orders, lang) : <span className="text-muted">—</span>}
                    <span className="block text-[11.5px] text-muted">{r.conversion === null || !r.discount ? '' : `${shareLabel(r.conversion, lang, 1)}`}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{r.discount && r.orders > 0 ? m(r.revenue) : <span className="font-normal text-muted">—</span>}</Td>
                  <Td className="whitespace-nowrap text-right tabular-nums">{r.discount && r.orders > 0 ? `−${money(r.discountTotal, lang)}` : <span className="text-muted">—</span>}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        </div>
        <div className="border-t border-line/70 px-5 py-3">
          <StatusMark state={allMatch ? 'on' : 'bad'} className="whitespace-normal text-[12.5px]">
            {t(allMatch ? 'match_ok' : 'match_bad')}
          </StatusMark>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        {current && <Funnel row={current} />}
        <Traffic analytics={analytics} />
      </div>
    </div>
  );
}

/** Ordered stages → ordinal grey ramp (lightest step still clears 2:1 on white). */
const STAGE_FILL = ['bg-[#a3a3a3]', 'bg-[#5c5c5c]', 'bg-ink'];

function Funnel({ row }: { row: CampaignRow }) {
  const t = useDict(A, 'admin');
  const lang = useLang('admin');
  const l = useL('admin');
  const stages = [
    { label: t('f_visits'), value: row.visits },
    { label: t('f_clicks'), value: row.ctaClicks },
    { label: t('f_orders'), value: row.discount ? row.orders : 0 },
  ];
  const top = Math.max(stages[0].value, 1);
  return (
    <Card title={t('funnel_title')} description={`${l(row.offer.name)} — ${t('funnel_desc')}`}>
      <ol className="space-y-4">
        {stages.map((s, i) => {
          const prev = i > 0 ? stages[i - 1].value : 0;
          return (
            <li key={i}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="font-semibold text-ink">{s.label}</span>
                <span className="font-bold tabular-nums text-ink">{num(s.value, lang)}</span>
              </div>
              <div className="mt-1.5 h-6 w-full">
                {s.value > 0 && <div className={cn('h-6 rounded-r-[4px]', STAGE_FILL[i])} style={{ width: `${Math.max((s.value / top) * 100, 1.5)}%` }} />}
              </div>
              {i > 0 && <div className="mt-1 text-[11.5px] text-muted">{t('of_prev', { p: prev > 0 ? shareLabel(s.value / prev, lang, 1) : '—' })}</div>}
            </li>
          );
        })}
      </ol>
      {!row.discount && <p className="mt-4 text-[12.5px] text-muted">{t('no_rule')}</p>}
    </Card>
  );
}

function Traffic({ analytics }: { analytics?: Integration }) {
  const t = useDict(A, 'admin');
  const can = useCan();
  const name = analytics?.name ?? 'Google Analytics 4';
  const state: MarkState = analytics?.status === 'connected' ? 'on' : analytics?.status === 'test' ? 'partial' : 'off';
  const metrics: AKey[] = ['tr_visits', 'tr_cart', 'tr_checkout', 'tr_conv', 'tr_utm'];
  return (
    <Card title={t('tr_title')} description={t('tr_desc')} actions={<StatusMark state={state}>{name}</StatusMark>}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {metrics.map((k) => (
          <div key={k} className="rounded-lg border border-dashed border-line px-3 py-2.5">
            <dt className="text-[12px] font-semibold text-muted">{t(k)}</dt>
            <dd className="mt-0.5 text-[18px] font-bold text-ink/30">—</dd>
            <dd className="text-[11px] text-muted">{t('na')}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-[12.5px] leading-relaxed text-muted">{t('tr_needs', { name })}</p>
      {can('integrations', 'view') && (
        <Link to="/admin/integracije" className={buttonClass({ variant: 'outline', size: 'xs', shape: 'rounded', className: 'mt-3 bg-white' })}>
          <Plug className="h-3.5 w-3.5" />
          {t('tr_open')}
        </Link>
      )}
    </Card>
  );
}
