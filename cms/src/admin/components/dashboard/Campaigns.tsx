import { useMemo } from 'react';
import { Link } from 'react-router';
import { Megaphone, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { money, num } from '@/lib/format';
import { offerRates } from '@/lib/offers';
import { cn } from '@/lib/utils';
import { campaignSummary } from './data';
import { StatusIcon } from './badges';
import { fmtDate } from './dates';
import { D, pluralKey } from './i18n';
import { CardLink, Empty } from './lists';

/** "Fushatat aktive" — running offers ranked by the revenue they brought in (offer metrics, PDF p.28–30). */
export function Campaigns({ now, className }: { now: Date; className?: string }) {
  const t = useDict(D, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const offers = useDb((s) => s.offers);
  const { active, scheduled, drafts } = useMemo(() => campaignSummary(offers, now), [offers, now]);
  const max = Math.max(...active.map((o) => o.metrics.revenue), 1);
  const totals = active.reduce((s, o) => ({ revenue: s.revenue + o.metrics.revenue, orders: s.orders + o.metrics.orders, discount: s.discount + o.metrics.discountTotal }), { revenue: 0, orders: 0, discount: 0 });
  const canCreate = can('offers', 'edit');

  return (
    <Card
      className={cn('flex flex-col', className)}
      title={t('camp_title')}
      description={t('camp_desc')}
      actions={<CardLink to="/admin/ponude">{t('all_offers')}</CardLink>}
      padded={false}
      bodyClassName="flex flex-1 flex-col"
    >
      {active.length > 0 && (
        <dl className="grid grid-cols-3 divide-x divide-line/70 border-b border-line/70">
          {[
            [t('camp_sales'), money(totals.revenue, lang, { decimals: false })],
            [t('col_orders'), num(totals.orders, lang)],
            [t('camp_given'), money(totals.discount, lang, { decimals: false })],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 px-5 py-3">
              <dt className="truncate text-[12px] text-muted">{k}</dt>
              <dd className="mt-0.5 truncate text-[16px] font-bold tracking-tight text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {active.length === 0 ? (
        <Empty
          icon={<Megaphone className="h-5 w-5" />}
          title={t('camp_empty')}
          text={t('camp_empty_text')}
          action={
            canCreate && (
              <ButtonLink to="/admin/ponude/novi" size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />}>
                {t('camp_new')}
              </ButtonLink>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-line/70">
          {active.slice(0, 4).map((o) => {
            const m = o.metrics;
            const conv = offerRates(o).conversion;
            return (
              <li key={o.id}>
                <Link to={`/admin/ponude/${o.id}`} className="block px-5 py-3.5 transition-colors hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] focus-visible:outline-none">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium text-ink" title={l(o.name)}>
                      {l(o.name)}
                    </span>
                    <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink">{money(m.revenue, lang, { decimals: false })}</span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-3 text-[12px] text-muted">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <StatusIcon kind="done" className="h-2.5 w-2.5 text-ink" />
                      <span className="truncate">
                        <span className="font-medium text-ink-soft">{t('camp_active')}</span> · {o.endsAt ? t('camp_until', { date: fmtDate(new Date(o.endsAt), lang, { day: 'numeric', month: 'short' }) }) : t('camp_open')}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {t(`ord_${pluralKey(lang, m.orders)}`, { n: m.orders })}
                      {m.visits > 0 && <span className="hidden sm:inline"> · {t('camp_conv', { v: `${num(conv * 100, lang, 1)}%` })}</span>}
                    </span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#efefef]">
                    <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.max(3, (m.revenue / max) * 100)}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {(scheduled > 0 || drafts > 0) && (
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/70 px-5 py-3 text-[12.5px] text-muted">
          {scheduled > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StatusIcon kind="open" />
              {t('camp_scheduled', { n: scheduled })}
            </span>
          )}
          {drafts > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <StatusIcon kind="partial" />
              {t('camp_drafts', { n: drafts })}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
