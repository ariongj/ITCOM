// "Përmbledhja" — plain-language summary of the rule being edited (PDF p.27 right column).
import { CalendarClock, FlaskConical, Layers, Scale, Tag, Users, Repeat, Truck, Gift } from 'lucide-react';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/admin/components/kit';
import { useDb } from '@/store/db';
import { normalizeCode } from '@/lib/discounts';
import type { Discount, DiscountState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDiscountText } from './text';
import { KIND_ICON, fmtDate, type DiscountPerf } from './meta';
import { StatePill } from './ui';

function Line({ icon, children, strong }: { icon: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-[3px] shrink-0 text-muted">{icon}</span>
      <span className={cn('min-w-0 text-[13.5px] leading-snug', strong ? 'font-semibold text-ink' : 'text-ink-soft')}>{children}</span>
    </li>
  );
}

export function SummaryCard({ d, state, onTest }: { d: Discount; state: DiscountState; onTest: () => void }) {
  const x = useDiscountText();
  const { t } = x;
  const KindIcon = KIND_ICON[d.kind];
  const code = normalizeCode(d.code);
  const ic = 'h-3.5 w-3.5';
  return (
    <Card title={t('summary')} actions={<StatePill state={state} />}>
      <div className="mb-4">
        {d.method === 'code' ? (
          code ? (
            <div className="break-all font-mono text-[19px] font-bold tracking-wide text-ink">{code}</div>
          ) : (
            <div className="text-[14px] italic text-muted">{t('sumCodeEmpty')}</div>
          )
        ) : (
          <div className="text-[16px] font-bold text-ink">{d.title.trim() || t('sumAuto')}</div>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
          <KindIcon className="h-3.5 w-3.5" />
          {x.kind(d.kind)} · {d.method === 'code' ? t('m_code') : t('m_auto')}
        </div>
      </div>
      <ul className="space-y-2.5">
        <Line icon={d.kind === 'bxgy' ? <Gift className={ic} /> : d.kind === 'shipping' ? <Truck className={ic} /> : <Tag className={ic} />} strong>
          {x.headline(d)}
        </Line>
        {d.kind === 'bxgy' && d.bxgy && d.bxgy.maxUses > 0 && <Line icon={<Repeat className={ic} />}>{t('sum_bxgyMax', { n: d.bxgy.maxUses })}</Line>}
        {d.kind === 'shipping' && d.shipping?.maxRate != null && d.shipping.maxRate > 0 && <Line icon={<Truck className={ic} />}>{t('sum_maxRate', { v: x.eur(d.shipping.maxRate) })}</Line>}
        <Line icon={<Scale className={ic} />}>{x.minimum(d)}</Line>
        <Line icon={<Users className={ic} />}>{x.audience(d)}</Line>
        {x.usage(d) && <Line icon={<Repeat className={ic} />}>{x.usage(d)}</Line>}
        <Line icon={<CalendarClock className={ic} />}>{x.period(d)}</Line>
        <Line icon={<Layers className={ic} />}>{x.combines(d)}</Line>
      </ul>
      <Button variant="outline" shape="rounded" size="sm" className="mt-5 w-full" icon={<FlaskConical className="h-4 w-4" />} onClick={onTest}>
        {t('tryCart')}
      </Button>
    </Card>
  );
}

/** Uses / discount given / sales from real orders + the linked offer. */
export function PerformanceCard({ d, perf }: { d: Discount; perf?: DiscountPerf }) {
  const x = useDiscountText();
  const { t, l } = x;
  const offers = useDb((s) => s.offers);
  const offer = offers.find((o) => o.discountId === d.id);
  const cell = (label: string, value: ReactNode) => (
    <div className="min-w-0">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 truncate text-[16px] font-bold tabular-nums text-ink">{value}</div>
    </div>
  );
  return (
    <Card title={t('perfTitle')}>
      <div className="grid grid-cols-3 gap-3">
        {cell(t('perfUses'), d.uses)}
        {cell(t('perfGiven'), x.eur(perf?.given ?? 0))}
        {cell(t('perfSales'), x.eur(perf?.sales ?? 0))}
      </div>
      {offer && (
        <Link to={`/admin/ponude/${offer.id}`} className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-ink/[0.06]">
          <span className="truncate">{t('linkedOffer', { name: l(offer.name) })}</span>
          <span aria-hidden className="text-muted">→</span>
        </Link>
      )}
    </Card>
  );
}

/** Audit trail for this discount (PDF p.21 "Tags, histori, numër përdorimesh dhe eksport"). */
export function HistoryCard({ id }: { id: string }) {
  const x = useDiscountText();
  const { t, lang, tz } = x;
  const audit = useDb((s) => s.audit);
  const staff = useDb((s) => s.staff);
  const rows = audit.filter((a) => a.object === 'discount' && a.objectId === id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  if (!rows.length) return null;
  const verb = (a: string) => (a === 'create' ? t('h_create') : a === 'update' ? t('h_update') : a === 'status' ? t('h_status') : a === 'publish' ? t('h_publish') : a === 'delete' ? t('h_delete') : t('h_other'));
  return (
    <Card title={t('history')}>
      <ol className="relative space-y-3 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-line">
        {rows.map((a) => {
          const who = staff.find((s) => s.id === a.actor)?.name ?? a.actor;
          return (
            <li key={a.id} className="relative pl-5 text-[13px]">
              <span className="absolute left-0 top-[5px] h-[11px] w-[11px] rounded-full border-2 border-white bg-ink/30 ring-1 ring-line" />
              <div className="text-ink">
                <span className="font-semibold">{who}</span> {verb(a.action)}
              </div>
              <div className="text-[12px] text-muted">{fmtDate(a.at, lang, tz, true)}</div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
