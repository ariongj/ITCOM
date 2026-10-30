// "Shportë prove" (PDF p.28/29): price preview at the offer start through the real discount engine.
import { useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Card, Thumb } from '@/admin/components/kit';
import { QtyStepper } from '@/components/ui/misc';
import { useL, useLang } from '@/i18n';
import { basePrice, defaultOptions, priceCart } from '@/lib/pricing';
import { money } from '@/lib/format';
import type { CartItem, Discount, Product } from '@/lib/types';
import type { OfferData } from './hooks';
import type { OfferX, RuleMode } from './model';
import { Note, useOT } from './ui';

const sellable = (p: Product) => p.status === 'active' && !p.quoteOnly && basePrice(p) > 0;
const defaultQty = (p: Product) => (p.unit === 'm2' && p.packSize ? Math.max(1, Math.ceil(20 / p.packSize)) : 1);

function suggest(discount: Discount | undefined, participating: Product[], products: Product[]): CartItem[] {
  const item = (p: Product, qty: number): CartItem => ({ key: `tc-${p.id}`, productId: p.id, qty, options: defaultOptions(p), installation: false });
  if (discount?.kind === 'bxgy' && discount.bxgy) {
    const b = discount.bxgy;
    const buy = products.find((p) => b.buyIds.includes(p.id) && sellable(p));
    const get = products.find((p) => b.getIds.includes(p.id) && sellable(p));
    return [buy && item(buy, b.buyQty), get && item(get, b.getQty)].filter((x): x is CartItem => !!x);
  }
  let pool = participating.filter(sellable);
  if (!pool.length) pool = [...products].filter(sellable).sort((a, b) => b.sold - a.sold);
  return pool.slice(0, 2).map((p) => item(p, defaultQty(p)));
}

export function TestCart({ draft, discount, mode, participating, data }: { draft: OfferX; discount?: Discount; mode: RuleMode; participating: Product[]; data: OfferData }) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const seedKey = `${discount?.id ?? 'none'}|${participating.map((p) => p.id).join(',')}`;
  const [state, setState] = useState<{ key: string; items: CartItem[] }>(() => ({ key: seedKey, items: suggest(discount, participating, data.products) }));
  // re-seed when the rule or the products change
  const items = state.key === seedKey ? state.items : suggest(discount, participating, data.products);
  const setQty = (key: string, qty: number) => setState({ key: seedKey, items: items.map((i) => (i.key === key ? { ...i, qty } : i)) });

  const totals = useMemo(() => {
    if (!items.length) return null;
    // simulate the moment the offer starts, with the linked rule switched on (as joint publishing would do)
    const at = Math.max(Date.now(), new Date(draft.startsAt).getTime() + 60000);
    const discounts = mode === 'link' && discount ? data.discounts.map((d) => (d.id === discount.id && d.status !== 'active' ? { ...d, status: 'active' as const } : d)) : data.discounts;
    const city = data.settings.shippingZones[0]?.cities[0];
    return priceCart(items, data.products, data.settings, { lang, codes: mode === 'link' && discount?.code ? [discount.code] : [], discounts, collections: data.collections, delivery: 'delivery', city, now: at });
  }, [items, draft.startsAt, mode, discount, data, lang]);

  const rejected = discount && totals ? totals.rejected.find((r) => r.id === discount.id) : undefined;
  const applied = discount && totals ? totals.applied.find((a) => a.id === discount.id) : undefined;
  const reason = rejected
    ? rejected.reason === 'minimum'
      ? `${t('reason_minimum')}${rejected.missing ? ` (${t('tc_missing', { v: rejected.minimumType === 'qty' ? String(rejected.missing) : money(rejected.missing, lang) })})` : ''}`
      : rejected.reason === 'notEligible' || rejected.reason === 'audience' || rejected.reason === 'notCombinable' || rejected.reason === 'usageLimit'
        ? t(`reason_${rejected.reason}`)
        : t('reason_other')
    : '';

  return (
    <Card title={t('testCart')} description={t('testCartText')} padded={false}>
      {!totals ? (
        <p className="px-5 py-6 text-center text-[13px] text-muted">{t('tc_empty')}</p>
      ) : (
        <div>
          <ul className="divide-y divide-line/70">
            {totals.lines.map((line) => (
              <li key={line.item.key} className="flex items-center gap-3 px-5 py-2.5">
                <Thumb src={line.product.images[0]} className="h-9 w-9" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium text-ink">{l(line.product.name)}</div>
                  <div className="text-[12px] text-muted tabular-nums">
                    {money(line.unitPrice, lang)} × {line.units}
                    {line.product.unit === 'm2' ? ' m²' : ''}
                  </div>
                </div>
                <QtyStepper value={line.item.qty} onChange={(v) => setQty(line.item.key, v)} size="sm" min={1} max={99} />
                <div className="w-24 shrink-0 text-right tabular-nums">
                  {line.discount > 0 && <div className="text-[11.5px] text-muted line-through">{money(line.lineTotal, lang)}</div>}
                  <div className="text-[13.5px] font-semibold text-ink">{money(line.lineTotal - line.discount, lang)}</div>
                </div>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t border-line/70 bg-canvas/40 px-5 py-3 text-[13px]">
            <Line label={t('tc_subtotal')} value={money(totals.subtotal, lang)} />
            {totals.discount > 0 && <Line label={t('tc_discount')} value={`−${money(totals.discount, lang)}`} />}
            <Line label={t('tc_shipping')} value={totals.shipping === 0 ? t('tc_free') : money(totals.shipping, lang)} strike={totals.shippingDiscount > 0 ? money(totals.shippingBeforeDiscount, lang) : undefined} />
            <Line label={t('tc_total')} value={money(totals.total, lang)} bold />
          </dl>
          <div className="space-y-2 border-t border-line/70 px-5 py-3">
            {mode !== 'link' || !discount ? (
              <Note icon={ShoppingCart}>{t('tc_noRule')}</Note>
            ) : applied ? (
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-soft">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden />
                  {t('tc_applied')}:
                </span>
                {totals.applied.map((a) => `${a.title} (−${money(a.amount, lang)})`).join(' · ')}
              </p>
            ) : (
              <p className="text-[13px] font-medium text-amber-900">{t('tc_notApplied', { reason })}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Line({ label, value, bold, strike }: { label: string; value: string; bold?: boolean; strike?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${bold ? 'pt-1 text-[14px] font-bold text-ink' : 'text-ink-soft'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">
        {strike && <span className="mr-2 text-[12px] text-muted line-through">{strike}</span>}
        {value}
      </dd>
    </div>
  );
}
