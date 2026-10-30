// Joint publishing (PDF p.29 "Planifiko publikimin e përbashkët; vetëm roli me leje e aktivizon").
import { useState } from 'react';
import { CalendarCheck2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Overlay';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { discountState } from '@/lib/discounts';
import type { Discount, Placement } from '@/lib/types';
import { checkStats, fullDate, type Check, type OfferX } from './model';
import { checkText, LEVEL_ICON } from './ChecksCard';
import { useOT } from './ui';
import { cn } from '@/lib/utils';

export interface PublishOptions {
  rule: boolean;
  content: boolean;
}

export function PublishModal({
  open,
  onClose,
  offer,
  discount,
  linked,
  checks,
  canPublishRule,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  offer: OfferX;
  discount?: Discount;
  linked: Placement[];
  checks: Check[];
  canPublishRule: boolean;
  onConfirm: (o: PublishOptions) => void;
}) {
  const t = useOT();
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const stats = checkStats(checks);
  const future = new Date(offer.startsAt).getTime() > Date.now();
  const ruleState = discount ? discountState(discount) : null;
  const ruleOff = !!discount && (discount.status === 'draft' || discount.status === 'paused');
  const drafts = linked.filter((p) => p.status === 'draft');
  const [rule, setRule] = useState(true);
  const [content, setContent] = useState(true);
  const [accept, setAccept] = useState(false);
  const blocked = stats.fail > 0 || (stats.warn > 0 && !accept);
  const issues = checks.filter((c) => c.level !== 'ok');

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={future ? t('scheduleTitle') : t('publishTitle')}
      description={t('publishText')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {ta('cancel')}
          </Button>
          <Button
            shape="rounded"
            size="sm"
            disabled={blocked}
            icon={future ? <CalendarCheck2 className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
            onClick={() => onConfirm({ rule: ruleOff && rule && canPublishRule, content: content && drafts.length > 0 })}
          >
            {future ? t('schedule') : t('publish')}
          </Button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        <div className="rounded-lg border border-line/80 px-4 py-3">
          <div className="text-[14px] font-semibold text-ink">{l(offer.name)}</div>
          <div className="mt-1 text-[13px] text-ink-soft">{future ? t('pubAt', { d: fullDate(offer.startsAt, lang) }) : t('pubNow')}</div>
          {offer.endsAt && <div className="text-[13px] text-muted">{t('pubEnds', { d: fullDate(offer.endsAt, lang) })}</div>}
        </div>

        {(ruleOff || drafts.length > 0) && (
          <div className="space-y-3">
            {discount && ruleOff && (
              <Checkbox
                checked={rule && canPublishRule}
                onChange={setRule}
                disabled={!canPublishRule}
                label={<span className="text-[13.5px]">{t('pubActivateRule', { name: discount.title, state: t(`dst_${ruleState!}`) })}</span>}
                description={canPublishRule ? undefined : t('noRulePerm')}
              />
            )}
            {drafts.length > 0 && (
              <Checkbox checked={content} onChange={setContent} label={<span className="text-[13.5px]">{t('pubActivateContent', { n: drafts.length })}</span>} description={drafts.map((p) => p.name).join(' · ')} />
            )}
          </div>
        )}

        {issues.length > 0 && (
          <div className={cn('rounded-lg border px-4 py-3', stats.fail ? 'border-red-600/20 bg-red-50/60' : 'border-amber-600/25 bg-amber-50/70')}>
            <ul className="space-y-1.5">
              {issues.map((c) => {
                const L = LEVEL_ICON[c.level];
                return (
                  <li key={c.id} className="flex items-start gap-2 text-[13px] text-ink">
                    <L.icon className={cn('mt-0.5 h-4 w-4 shrink-0', L.cls)} />
                    {checkText(c, t)}
                  </li>
                );
              })}
            </ul>
            {stats.fail > 0 ? (
              <p className="mt-2.5 text-[13px] font-semibold text-red-800">{t('pubBlocked', { n: stats.fail })}</p>
            ) : (
              <div className="mt-3">
                <Checkbox checked={accept} onChange={setAccept} label={<span className="text-[13.5px]">{t('pubWarnings', { n: stats.warn })}</span>} />
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
