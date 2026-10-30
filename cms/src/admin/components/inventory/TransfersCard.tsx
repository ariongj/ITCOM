// "Transferimet" (PDF p.16): explained, not yet switched on — for a small shop one location plus
// stock adjustments with a reason is enough; transfers are enabled when there is a real need.
import { Link } from 'react-router';
import { ArrowLeftRight, ChevronRight, MapPin, Settings2 } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { inv } from './dict';
import { Tag } from './ui';

export function TransfersCard() {
  const t = useDict(inv, 'admin');
  const can = useCan();
  const locations = useDb((s) => s.settings.locations);
  const steps = [t('tr_s1'), t('tr_s2'), t('tr_s3'), t('tr_s4'), t('tr_s5')];

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-muted" />
          {t('tr_title')}
        </span>
      }
      actions={<Tag tone="muted">{t('tr_badge')}</Tag>}
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:gap-8">
        <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-soft">
          <p>{t('tr_text')}</p>
          <p className="text-muted">{t('tr_small')}</p>
          <div>
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{t('tr_flow')}</div>
            <ol className="flex flex-wrap items-center gap-1.5">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className="rounded-md bg-canvas px-2 py-0.5 text-[12px] font-semibold text-ink-soft ring-1 ring-inset ring-line/80">{s}</span>
                  {i < steps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted/60" />}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[12px] text-muted">{t('tr_rule')}</p>
          </div>
        </div>
        <div className="rounded-xl bg-canvas/60 p-4 ring-1 ring-inset ring-line/70">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">{t('tr_locations')}</div>
          <ul className="space-y-2">
            {locations.map((x) => (
              <li key={x.id} className="flex items-start gap-2.5 text-[13px]">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{x.name}</span>
                  {x.isDefault && <span className="ml-1.5 text-[11.5px] text-muted">({t('defaultLoc')})</span>}
                  <span className="block text-[12px] text-muted">
                    {x.address}, {x.city}
                    {x.pickup && ` · ${t('tr_pickup')}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line/70 pt-3 text-[12.5px] text-ink-soft">{locations.length > 1 ? t('tr_ready', { n: locations.length }) : t('tr_one')}</p>
          {can('settings') && (
            <Link to="/admin/konfiguracija" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink hover:underline">
              <Settings2 className="h-3.5 w-3.5" />
              {t('tr_manage')}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
