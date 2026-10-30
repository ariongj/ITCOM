// Plain-language descriptions of a discount rule (list cells, "Përmbledhja", tester reasons).
import { useCallback, useMemo } from 'react';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { money } from '@/lib/format';
import { discountClass, type RejectedDiscount } from '@/lib/discounts';
import type { Discount, DiscountClass, DiscountKind, DiscountState, DiscountTarget } from '@/lib/types';
import { dd } from './i18n';
import { fmtDate, fmtRange } from './meta';

export function useDiscountText() {
  const t = useDict(dd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const collections = useDb((s) => s.collections);
  const segments = useDb((s) => s.segments);
  const tz = useDb((s) => s.settings.timezone) || 'Europe/Belgrade';
  const zones = useDb((s) => s.settings.shippingZones);
  const discounts = useDb((s) => s.discounts);

  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products]);
  const collectionName = useMemo(() => new Map(collections.map((c) => [c.id, c.title])), [collections]);

  const eur = useCallback((v: number) => money(v, lang, { decimals: v % 1 !== 0 }), [lang]);

  const kind = useCallback((k: DiscountKind) => t(`kind_${k}`), [t]);
  const state = useCallback((s: DiscountState) => t(`st_${s}`), [t]);
  const cls = useCallback((c: DiscountClass) => t(`cls_${c}`), [t]);

  /** "−10%", "−25 €", "−5 € / art.", "Falas", "3 + 1" */
  const value = useCallback(
    (d: Discount) => {
      if (d.kind === 'bxgy') {
        const b = d.bxgy;
        if (!b) return '—';
        return `${b.buyQty} + ${b.getQty}${b.getType === 'percent' ? ` −${b.getValue}%` : ''}`;
      }
      if (d.kind === 'shipping') return d.valueType === 'percent' && d.value >= 100 ? t('getFree') : d.valueType === 'percent' ? `−${d.value}%` : `−${eur(d.value)}`;
      if (d.valueType === 'percent') return `−${d.value}%`;
      return d.kind === 'products' && d.perItem ? `−${eur(d.value)} / ${t('itemsUnit')}` : `−${eur(d.value)}`;
    },
    [t, eur],
  );

  /** "all products" / "the “Syze dielli” collection" / "3 products" */
  const scope = useCallback(
    (target: Pick<DiscountTarget, 'scope' | 'ids'>) => {
      if (target.scope === 'all') return t('scope_all');
      if (!target.ids.length) return t('scope_nothing');
      if (target.scope === 'collections') {
        if (target.ids.length === 1) return t('scope_oneCollection', { n: l(collectionName.get(target.ids[0])) || target.ids[0] });
        return t('scope_collections', { n: target.ids.length });
      }
      if (target.ids.length === 1) return t('scope_oneProduct', { n: l(productName.get(target.ids[0])) || target.ids[0] });
      return t('scope_products', { n: target.ids.length });
    },
    [t, l, collectionName, productName],
  );

  /** First line of the summary: what the customer gets. */
  const headline = useCallback(
    (d: Discount) => {
      if (d.kind === 'products') {
        const v = d.valueType === 'fixed' ? `−${eur(d.value)} ${d.perItem ? t('sum_perItem') : t('sum_onceOrder')}` : value(d);
        return t('sum_products', { v, scope: scope(d.appliesTo) });
      }
      if (d.kind === 'order') return d.appliesTo.scope === 'all' ? t('sum_order', { v: value(d) }) : t('sum_orderScoped', { v: value(d), scope: scope(d.appliesTo) });
      if (d.kind === 'bxgy') {
        const b = d.bxgy;
        if (!b) return kind('bxgy');
        return t('sum_bxgy', {
          x: b.buyQty,
          xs: scope({ scope: b.buyScope, ids: b.buyIds }),
          y: b.getQty,
          ys: scope({ scope: b.getScope, ids: b.getIds }),
          get: b.getType === 'free' ? t('sum_free') : t('sum_pctOff', { p: b.getValue }),
        });
      }
      const ids = d.shipping?.zoneIds ?? [];
      const zoneNames = ids.length ? zones.filter((z) => ids.includes(z.id)).map((z) => z.name).join(', ') : t('sum_zonesAll');
      return t('sum_shipping', { zones: zoneNames || t('sum_zonesAll') });
    },
    [t, eur, value, scope, kind, zones],
  );

  const minimum = useCallback(
    (d: Discount) => {
      const m = d.minimum;
      if (!m || m.type === 'none' || !(m.value > 0)) return t('sum_minNone');
      const base = t(`sb_${d.kind}`);
      return m.type === 'amount' ? t('sum_minAmount', { v: eur(m.value), base }) : t('sum_minQty', { n: m.value, base });
    },
    [t, eur],
  );

  const segmentName = useCallback((id?: string) => l(segments.find((s) => s.id === id)?.name) || '—', [segments, l]);

  const audience = useCallback((d: Discount) => (d.audience.type === 'segment' ? t('sum_audSeg', { s: segmentName(d.audience.segmentId) }) : t('sum_audAll')), [t, segmentName]);

  const usage = useCallback(
    (d: Discount) => {
      if (d.method === 'auto') return null;
      const lim = d.usageLimit && d.usageLimit > 0 ? d.usageLimit : 0;
      if (lim && d.oncePerCustomer) return t('sum_limitOnce', { n: lim });
      if (lim) return t('sum_limit', { n: lim });
      if (d.oncePerCustomer) return t('sum_once');
      return t('sum_noLimit');
    },
    [t],
  );

  /** "1 – 7 Oct 2026" or "from 5 Oct 2026, no end date" */
  const periodRange = useCallback(
    (d: Pick<Discount, 'startsAt' | 'endsAt'>) => {
      if (!d.startsAt) return '—';
      if (d.endsAt) return fmtRange(d.startsAt, d.endsAt, lang, tz);
      return `${t('from', { d: fmtDate(d.startsAt, lang, tz) })} · ${t('noEnd')}`;
    },
    [lang, tz, t],
  );

  const period = useCallback((d: Discount) => t('sum_period', { range: periodRange(d) }), [t, periodRange]);

  const combines = useCallback(
    (d: Discount) => {
      const own = discountClass(d);
      const list = (['products', 'order', 'shipping'] as const).filter((c) => d.combines[c] && !(own === 'shipping' && c === 'shipping')).map((c) => cls(c));
      return list.length ? t('sum_combines', { list: list.join(' / ') }) : t('sum_combinesNone');
    },
    [t, cls],
  );

  /** Human reason for a rejected rule (tester + list hints). */
  const reason = useCallback(
    (r: RejectedDiscount, titleOf?: (id: string) => string) => {
      switch (r.reason) {
        case 'minimum':
          return r.minimumType === 'qty' ? t('r_minQty', { n: r.missing ?? 0 }) : t('r_minAmount', { v: money(r.missing ?? 0, lang) });
        case 'notCombinable': {
          const w = r.conflictsWith ? (titleOf?.(r.conflictsWith) ?? discounts.find((x) => x.id === r.conflictsWith)?.title) : undefined;
          return w ? t('r_notCombinable', { w }) : t('r_notCombinableAny');
        }
        case 'notEligible':
          return t(`r_notEligible_${r.kind ?? 'products'}`);
        case 'notfound':
          return t('r_notfound');
        case 'inactive':
          return t('r_inactive');
        case 'scheduled':
          return t('r_scheduled');
        case 'expired':
          return t('r_expired');
        case 'usageLimit':
          return t('r_usageLimit');
        case 'audience':
          return t('r_audience');
      }
    },
    [t, lang, discounts],
  );

  return { t, l, lang, tz, eur, kind, state, cls, value, scope, headline, minimum, audience, usage, period, periodRange, combines, reason, segmentName };
}
