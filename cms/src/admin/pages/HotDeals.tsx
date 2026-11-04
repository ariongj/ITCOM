// Online Store → Hot Deals: the offers the shop shows on the home page, in the same order and by the same rules as the
// storefront (js/app.js hotDeals): price > 0, a higher previous price, stock, not excluded, still valid. Order: pinned by
// the team, then discount %, then € saved, then freshness. Target 8, at most 12 (visual reports Raundi 04–05).
import { useMemo } from 'react';
import { Link } from 'react-router';
import { ExternalLink, Pin, TriangleAlert } from 'lucide-react';
import { Card, PageHeader, Td, Th, Thumb, Tr } from '@/admin/components/kit';
import { Checkbox, Input } from '@/components/ui/Field';
import { defineDict, interpolate, useDict } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { BASE } from '@/lib/paths';
import type { Product } from '@/lib/types';

const sq = {
  title: 'Hot Deals',
  intro: 'Ofertat që dyqani shfaq në ballinë, në renditjen e dyqanit. Ndryshimet ruhen këtu dhe shfaqen te vizitorët pas publikimit.',
  shown: 'Në ballinë', shownDesc: '{n} oferta shfaqen · objektivi 8, deri në 12. Renditja: të fiksuarat, pastaj përqindja, kursimi dhe freskia.',
  fewer: 'Më pak se 8 oferta: dyqani i shfaq me karta më të gjera, pa përsëritur produkte. Për më shumë, vendosni çmim të mëparshëm më të lartë dhe stok te produktet.',
  none: 'Asnjë ofertë nuk plotëson kushtet. Dyqani shfaq “Produkte të përzgjedhura” në vend të Hot Deals.',
  others: 'Nuk shfaqen', othersDesc: 'Produkte me zbritje ose me cilësime Hot Deals që nuk plotësojnë kushtet tani.',
  othersNone: 'Asnjë produkt tjetër me zbritje.',
  pos: '#', product: 'Produkti', price: 'Çmimi', pct: 'Zbritja', stock: 'Stoku', pin: 'Fiksuar', until: 'Vlen deri', flags: 'Shënime', reason: 'Arsyeja',
  exclude: 'Përjashto', demo: 'Demo', hidden: 'jashtë 12 të parave', open: 'Hap dyqanin',
  rNoPrice: 'pa çmim të ITCOM', rNoOld: 'pa çmim të mëparshëm më të lartë', rNoStock: 'pa stok', rExcluded: 'e përjashtuar', rExpired: 'afati ka kaluar', rInactive: 'joaktiv ose jo online',
};
const en: typeof sq = {
  title: 'Hot Deals',
  intro: 'The offers the shop shows on the home page, in the shop’s order. Changes are saved here and reach visitors after publishing.',
  shown: 'On the home page', shownDesc: '{n} offers shown · target 8, up to 12. Order: pinned, then discount %, saving and freshness.',
  fewer: 'Fewer than 8 offers: the shop shows wider cards without repeating products. For more, set a higher previous price and stock on products.',
  none: 'No offer meets the rules. The shop shows “Produkte të përzgjedhura” instead of Hot Deals.',
  others: 'Not shown', othersDesc: 'Products with a discount or Hot Deals settings that do not meet the rules right now.',
  othersNone: 'No other discounted products.',
  pos: '#', product: 'Product', price: 'Price', pct: 'Discount', stock: 'Stock', pin: 'Pinned', until: 'Valid until', flags: 'Notes', reason: 'Reason',
  exclude: 'Exclude', demo: 'Demo', hidden: 'beyond the first 12', open: 'Open the shop',
  rNoPrice: 'no ITCOM price', rNoOld: 'no higher previous price', rNoStock: 'out of stock', rExcluded: 'excluded', rExpired: 'expired', rInactive: 'inactive or not online',
};
const dict = defineDict({ me: en, sq, en });

const MAX = 12;
const eur = (n: number) => `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

type Deal = { p: Product; price: number; old: number; pct: number; save: number; stock: number; reasons: string[] };

export default function HotDeals() {
  const t = useDict(dict, 'admin');
  const products = useDb((s) => s.products);
  const upsert = useDb((s) => s.upsertProduct);
  const can = useCan();
  const canEdit = can('products', 'edit');
  const today = new Date().toISOString().slice(0, 10);

  const { shown, rest } = useMemo(() => {
    const all: Deal[] = [];
    for (const p of products) {
      // Pjesët vetëm të konfiguruesit 3D nuk janë në katalogun e dyqanit, prandaj as te Hot Deals.
      if (!p.itcom || (p.tags || []).includes('ndërtuesi')) continue;
      const sale = p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
      const deal = p.itcom.deal ?? {};
      if (!sale && !deal.pin && !deal.exclude && !deal.until && !deal.demo) continue;
      const price = sale ? (p.salePrice as number) : p.price;
      const old = sale ? p.price : 0;
      const stock = Math.max(0, (p.stock || 0) - (p.unavailable || 0));
      const reasons: string[] = [];
      if (p.status !== 'active' || (p.channels && !p.channels.includes('online'))) reasons.push(t('rInactive'));
      if (!(price > 0) || p.template === 'quote' || p.quoteOnly) reasons.push(t('rNoPrice'));
      if (!sale) reasons.push(t('rNoOld'));
      if (!(stock > 0)) reasons.push(t('rNoStock'));
      if (deal.exclude) reasons.push(t('rExcluded'));
      if (deal.until && deal.until < today) reasons.push(t('rExpired'));
      all.push({ p, price, old, pct: old ? ((old - price) / old) * 100 : 0, save: old ? old - price : 0, stock, reasons });
    }
    const fresh = (p: Product) => Date.parse(p.updatedAt || p.createdAt || '') || 0;
    const ok = all.filter((d) => !d.reasons.length).sort((a, b) =>
      ((a.p.itcom?.deal?.pin || 1e9) - (b.p.itcom?.deal?.pin || 1e9)) || b.pct - a.pct || b.save - a.save || fresh(b.p) - fresh(a.p) || a.p.id.localeCompare(b.p.id));
    return { shown: ok, rest: all.filter((d) => d.reasons.length) };
  }, [products, t, today]);

  const setDeal = (p: Product, patch: NonNullable<NonNullable<Product['itcom']>['deal']>) =>
    upsert({ ...p, itcom: { ...p.itcom!, deal: { ...(p.itcom?.deal ?? {}), ...patch } } });

  const controls = (d: Deal) => {
    const deal = d.p.itcom?.deal ?? {};
    return (
      <>
        <Td className="w-24">
          <Input aria-label={`${t('pin')}: ${d.p.name.sq}`} type="number" min={1} max={MAX} inputMode="numeric" placeholder="—" disabled={!canEdit} value={deal.pin ?? ''}
            onChange={(e) => setDeal(d.p, { pin: e.target.value ? Math.max(1, Math.round(Number(e.target.value))) : null })} />
        </Td>
        <Td className="w-36 min-w-[9rem]">
          <Input aria-label={`${t('until')}: ${d.p.name.sq}`} type="date" disabled={!canEdit} value={deal.until ?? ''} onChange={(e) => setDeal(d.p, { until: e.target.value || null })} />
        </Td>
        <Td className="w-44">
          <div className="grid gap-1">
            <Checkbox checked={!!deal.exclude} disabled={!canEdit} onChange={(v) => setDeal(d.p, { exclude: v })} label={t('exclude')} />
            <Checkbox checked={!!deal.demo} disabled={!canEdit} onChange={(v) => setDeal(d.p, { demo: v })} label={t('demo')} />
          </div>
        </Td>
      </>
    );
  };
  const productCell = (d: Deal) => (
    <Td>
      <Link to={`/admin/proizvodi/${d.p.id}`} className="flex items-center gap-3 hover:underline">
        <Thumb src={d.p.images[0]} className="h-10 w-10" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{d.p.name.sq}</span>
          <span className="block font-mono text-[11.5px] text-muted">{d.p.sku || d.p.id.toUpperCase()}</span>
        </span>
      </Link>
    </Td>
  );

  return (
    <div className="mx-auto min-w-0 max-w-6xl">
      <PageHeader
        title={t('title')}
        description={t('intro')}
        actions={
          <a href={BASE} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-ink-soft ring-1 ring-line hover:bg-ink/[0.04] hover:text-ink">
            <ExternalLink className="h-3.5 w-3.5" /> {t('open')}
          </a>
        }
      />
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        <Card title={t('shown')} description={interpolate(t('shownDesc'), { n: Math.min(shown.length, MAX) })} padded={false} className="min-w-0">
          {shown.length > 0 && shown.length < 8 && (
            <p className="mx-5 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{t('fewer')}</p>
          )}
          {shown.length === 0 ? (
            <p className="px-5 py-6 text-[13.5px] text-muted">{t('none')}</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13.5px]" data-hotdeals>
                <thead><tr><Th>{t('pos')}</Th><Th>{t('product')}</Th><Th>{t('price')}</Th><Th>{t('pct')}</Th><Th>{t('stock')}</Th><Th>{t('pin')}</Th><Th>{t('until')}</Th><Th>{t('flags')}</Th></tr></thead>
                <tbody>
                  {shown.map((d, i) => (
                    <Tr key={d.p.id} className={i >= MAX ? 'opacity-50' : ''}>
                      <Td className="w-12 font-semibold tabular-nums">{i < MAX ? i + 1 : <span title={t('hidden')}>—</span>}{d.p.itcom?.deal?.pin ? <Pin className="ml-1 inline h-3.5 w-3.5 text-brand" aria-label={t('pin')} /> : null}</Td>
                      {productCell(d)}
                      <Td className="whitespace-nowrap tabular-nums"><b>{eur(d.price)}</b> <s className="text-muted">{eur(d.old)}</s></Td>
                      <Td className="whitespace-nowrap tabular-nums">−{Math.round(d.pct)}% <span className="text-muted">({eur(d.save)})</span>{d.p.itcom?.deal?.demo ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-semibold text-amber-900">Demo</span> : null}</Td>
                      <Td className="tabular-nums">{d.stock}</Td>
                      {controls(d)}
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title={t('others')} description={t('othersDesc')} padded={false} className="min-w-0">
          {rest.length === 0 ? (
            <p className="px-5 py-6 text-[13.5px] text-muted">{t('othersNone')}</p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse text-left text-[13.5px]">
                <thead><tr><Th>{t('product')}</Th><Th>{t('reason')}</Th><Th>{t('stock')}</Th><Th>{t('pin')}</Th><Th>{t('until')}</Th><Th>{t('flags')}</Th></tr></thead>
                <tbody>
                  {rest.map((d) => (
                    <Tr key={d.p.id}>
                      {productCell(d)}
                      <Td className="text-[13px] text-amber-900">{d.reasons.join(', ')}</Td>
                      <Td className="tabular-nums">{d.stock}</Td>
                      {controls(d)}
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
