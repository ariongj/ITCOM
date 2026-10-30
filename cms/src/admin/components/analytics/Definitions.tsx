// Metric glossary (PDF p.38: "Përkufizimi i çdo metrike dokumentohet që raportet të mos japin total të ndryshëm").
import { Card } from '@/admin/components/kit';
import { useDict } from '@/i18n';
import { A, type AKey } from './i18n';

export const DEF_GROUPS: { title: AKey; items: [AKey, AKey][] }[] = [
  {
    title: 'g_sales',
    items: [
      ['m_gross', 'd_gross'],
      ['m_discounts', 'd_discounts'],
      ['m_returns', 'd_returns'],
      ['m_net', 'd_net'],
      ['m_shipping', 'd_shipping'],
      ['m_total', 'd_total'],
      ['m_orderValue', 'd_orderValue'],
      ['k_orders', 'd_orders'],
      ['k_aov', 'd_aov'],
      ['k_returning', 'd_returning'],
      ['tp_title', 'd_top'],
      ['tp_variants', 'd_variant'],
      ['by_category', 'd_breakdown'],
      ['col_margin', 'd_margin'],
    ],
  },
  {
    title: 'g_ops',
    items: [
      ['op_low', 'd_low'],
      ['op_out', 'd_out'],
      ['op_incoming', 'd_incoming'],
      ['op_unfulfilled', 'd_unfulfilled'],
      ['op_payments', 'd_payments'],
      ['op_unassigned', 'd_unassigned'],
      ['op_bookings', 'd_bookings'],
      ['op_expiring', 'd_expiring'],
      ['op_returns', 'd_returnsOpen'],
    ],
  },
  {
    title: 'g_campaigns',
    items: [
      ['col_visits', 'd_visits'],
      ['col_clicks', 'd_clicks'],
      ['col_codes', 'd_codes'],
      ['col_orders', 'd_cOrders'],
      ['col_discount', 'd_cDiscount'],
    ],
  },
];

export function Definitions({ vatRate }: { vatRate: number }) {
  const t = useDict(A, 'admin');
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-xl border border-line/80 bg-white px-5 py-4">
        <div className="text-[13px] text-muted">{t('defs_desc')}</div>
        <div className="mt-2 font-mono text-[13.5px] font-semibold text-ink">{t('defs_identity')}</div>
        <div className="mt-1 font-mono text-[12.5px] text-ink-soft">
          {t('m_vat', { rate: vatRate })}: {t('m_total')} × {vatRate} / {100 + vatRate}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
        {DEF_GROUPS.map((g) => (
          <Card key={g.title} title={t(g.title)} padded={false}>
            <dl className="divide-y divide-line/70">
              {g.items.map(([name, def]) => (
                <div key={def} className="px-5 py-3">
                  <dt className="text-[13px] font-semibold text-ink">{t(name, { rate: vatRate })}</dt>
                  <dd className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{t(def)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      <p className="text-[12.5px] text-muted">{t('cp_caveat')}</p>
    </div>
  );
}
