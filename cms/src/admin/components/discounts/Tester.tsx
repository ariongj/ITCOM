// "Provo me shportë shembull" — sample-cart tester (PDF p.21 "Preview me shportë prove dhe shpjegim pse një rregull
// aplikohet ose refuzohet"). Runs the real engine (lib/discounts.ts) on the UNSAVED form state.
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Check, Minus, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Thumb } from '@/admin/components/kit';
import { useDb } from '@/store/db';
import { applyDiscounts, discountClass, lineMatches, normalizeCode, type DiscountResult } from '@/lib/discounts';
import { membershipIndex } from '@/lib/collections';
import { defaultOptions, qtyUnits, unitPrice } from '@/lib/pricing';
import { money, num, unitLabel } from '@/lib/format';
import { fold } from '@/lib/search';
import type { Discount, DiscountTarget, Product } from '@/lib/types';
import { cn, round2 } from '@/lib/utils';
import { useDiscountText } from './text';
import { fmtDate } from './meta';
import { SelectField, Tick } from './ui';

interface Item {
  key: string;
  productId: string;
  qty: number;
}

const keyOf = () => Math.random().toString(36).slice(2, 9);

/* ------------------------------------------------------------------ */
/* Sample cart that satisfies the rule (autofill)                      */
/* ------------------------------------------------------------------ */
function eligible(target: Pick<DiscountTarget, 'scope' | 'ids'>, products: Product[], memberOf: (p: Product) => string[]) {
  const live = products.filter((p) => p.status === 'active' && !p.quoteOnly).sort((a, b) => b.sold - a.sold);
  if (target.scope === 'all') return live;
  if (target.scope === 'products') return target.ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  return live.filter((p) => memberOf(p).some((c) => target.ids.includes(c)));
}

function autofillItems(d: Discount, products: Product[], memberOf: (p: Product) => string[]): Item[] {
  const lineTotal = (p: Product, q: number) => unitPrice(p, defaultOptions(p)) * qtyUnits(p, q);
  const reach = (p: Product, base: number, target: number) => {
    let q = 1;
    while (base + lineTotal(p, q) < target && q < 40) q++;
    return q;
  };
  if (d.kind === 'bxgy' && d.bxgy) {
    const b = d.bxgy;
    const x = eligible({ scope: b.buyScope, ids: b.buyIds }, products, memberOf)[0];
    const y = eligible({ scope: b.getScope, ids: b.getIds }, products, memberOf).find((p) => p.id !== x?.id) ?? eligible({ scope: b.getScope, ids: b.getIds }, products, memberOf)[0];
    const out: Item[] = [];
    if (x) out.push({ key: keyOf(), productId: x.id, qty: Math.max(1, b.buyQty) });
    if (y) out.push({ key: keyOf(), productId: y.id, qty: Math.max(1, b.getQty) });
    return out;
  }
  const pool = d.kind === 'products' || d.kind === 'order' ? eligible(d.appliesTo, products, memberOf) : eligible({ scope: 'all', ids: [] }, products, memberOf);
  const first = pool[0];
  if (!first) return [];
  const second = pool.find((p) => p.id !== first.id && p.categoryId !== first.categoryId) ?? pool[1];
  const items: Item[] = [{ key: keyOf(), productId: first.id, qty: first.unit === 'm2' ? 6 : 1 }];
  if (second) items.push({ key: keyOf(), productId: second.id, qty: 1 });
  const m = d.minimum;
  const sum = () => items.reduce((s, it) => s + lineTotal(products.find((p) => p.id === it.productId)!, it.qty), 0);
  if (m.type === 'amount' && m.value > 0 && sum() < m.value) {
    const rest = sum() - lineTotal(first, items[0].qty);
    items[0].qty = reach(first, rest, m.value * 1.05);
  }
  if (m.type === 'qty' && m.value > 0) {
    const have = items.reduce((s, it) => s + it.qty, 0);
    if (have < m.value) items[0].qty += Math.ceil(m.value - have);
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export function Tester({ open, onClose, draft }: { open: boolean; onClose: () => void; draft: Discount }) {
  const x = useDiscountText();
  const { t, l, lang, tz } = x;
  const products = useDb((s) => s.products);
  const collections = useDb((s) => s.collections);
  const discounts = useDb((s) => s.discounts);
  const segments = useDb((s) => s.segments);
  const zones = useDb((s) => s.settings.shippingZones);

  const membership = useMemo(() => membershipIndex(collections, products), [collections, products]);
  const memberOf = useCallback((p: Product) => membership.get(p.id) ?? [], [membership]);
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const defaultZone = (draft.kind === 'shipping' && draft.shipping?.zoneIds?.[0]) || zones[0]?.id || 'pickup';
  const [items, setItems] = useState<Item[]>([]);
  const [zoneId, setZoneId] = useState<string>(defaultZone);
  const [segmentId, setSegmentId] = useState<string>(draft.audience.type === 'segment' ? (draft.audience.segmentId ?? '') : '');
  const [usedBefore, setUsedBefore] = useState(false);
  const [includeOthers, setIncludeOthers] = useState(true);
  const [codes, setCodes] = useState<string[]>([]);
  const [codeInput, setCodeInput] = useState('');

  // Autofill every time the dialog opens with an empty cart
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setItems(autofillItems(draft, products, memberOf));
      setZoneId((draft.kind === 'shipping' && draft.shipping?.zoneIds?.[0]) || zones[0]?.id || 'pickup');
      setSegmentId(draft.audience.type === 'segment' ? (draft.audience.segmentId ?? '') : '');
      setUsedBefore(false);
    }
  }

  /* ---------------- evaluation ---------------- */
  const ownCode = draft.method === 'code' ? normalizeCode(draft.code) : '';
  const evalNow = useMemo(() => {
    const now = Date.now();
    const start = draft.startsAt ? new Date(draft.startsAt).getTime() : now;
    const end = draft.endsAt ? new Date(draft.endsAt).getTime() : Infinity;
    if (start > now) return start + 60_000;
    if (end <= now) return end - 60_000;
    return now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.startsAt, draft.endsAt, open]);

  const zone = zones.find((z) => z.id === zoneId) ?? null;
  const fee = zone ? zone.fee : 0;

  const lines = useMemo(
    () =>
      items
        .map((it) => {
          const p = byId.get(it.productId);
          if (!p) return null;
          const up = unitPrice(p, defaultOptions(p));
          const units = qtyUnits(p, it.qty);
          const total = round2(up * units);
          return { it, p, up, units, total };
        })
        .filter((v): v is NonNullable<typeof v> => !!v),
    [items, byId],
  );

  const testRule: Discount = useMemo(() => ({ ...draft, status: 'active', code: ownCode || draft.code }), [draft, ownCode]);
  const allCodes = useMemo(() => [...(ownCode ? [ownCode] : []), ...codes.filter((c) => c !== ownCode)], [ownCode, codes]);

  const res: DiscountResult | null = useMemo(() => {
    if (!lines.length) return null;
    const others = discounts.filter((d) => d.id !== draft.id && (includeOthers || (d.method === 'code' && codes.includes(normalizeCode(d.code)))));
    return applyDiscounts({
      lines: lines.map((ln) => ({ id: ln.it.key, productId: ln.p.id, qty: ln.it.qty, unitPrice: ln.it.qty ? ln.total / ln.it.qty : 0, total: ln.total, collectionIds: memberOf(ln.p) })),
      discounts: [testRule, ...others],
      codes: allCodes,
      shipping: fee,
      shippingZoneId: zone?.id ?? null,
      customer: { segmentIds: segmentId ? [segmentId] : [], usedDiscountIds: usedBefore ? [draft.id] : [] },
      now: evalNow,
    });
  }, [lines, discounts, draft.id, includeOthers, codes, testRule, allCodes, fee, zone, segmentId, usedBefore, evalNow, memberOf]);

  const titleOf = (id: string) => (id === draft.id ? draft.title.trim() || ownCode || t('newRule') : (discounts.find((d) => d.id === id)?.title ?? id));
  const ruleById = (id: string) => (id === draft.id ? testRule : discounts.find((d) => d.id === id));
  const eur = (v: number) => money(v, lang);

  /* ---------------- cart editing ---------------- */
  const setQty = (key: string, qty: number) => setItems((s) => s.map((it) => (it.key === key ? { ...it, qty: Math.max(1, Math.min(999, qty)) } : it)));
  const removeItem = (key: string) => setItems((s) => s.filter((it) => it.key !== key));
  const addProduct = (p: Product) =>
    setItems((s) => {
      const ex = s.find((it) => it.productId === p.id);
      if (ex) return s.map((it) => (it === ex ? { ...it, qty: it.qty + 1 } : it));
      return [...s, { key: keyOf(), productId: p.id, qty: 1 }];
    });
  const addCode = () => {
    const c = normalizeCode(codeInput);
    if (c && !codes.includes(c) && c !== ownCode) setCodes((s) => [...s, c]);
    setCodeInput('');
  };

  const own = res ? { applied: res.applied.find((a) => a.id === draft.id), rejected: res.rejected.find((r) => r.id === draft.id) } : null;
  const productApplied = res?.applied.filter((a) => discountClass(a) === 'products') ?? [];
  const orderApplied = res?.applied.filter((a) => a.kind === 'order') ?? [];
  const shipApplied = res?.applied.find((a) => a.kind === 'shipping');
  const lineName = (key: string) => {
    const ln = lines.find((v) => v.it.key === key);
    return ln ? l(ln.p.name) : key;
  };
  const revised = res ? round2(res.subtotal - res.productDiscount) : 0;

  return (
    <Modal open={open} onClose={onClose} size="full" title={t('testTitle')} description={t('testDesc')}>
      <div className="grid lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* ------------------------------ cart builder ------------------------------ */}
        <div className="space-y-5 border-b border-line p-4 sm:p-6 lg:border-b-0 lg:border-r">
          <section>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{t('sampleCart')}</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setItems(autofillItems(draft, products, memberOf))} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('autofill')}
                </button>
                {items.length > 0 && (
                  <button type="button" onClick={() => setItems([])} className="inline-flex h-7 items-center rounded-md px-2 text-[12.5px] font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink">
                    {t('clearCart')}
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-line">
              {lines.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-muted">{t('emptyCart')}</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {lines.map(({ it, p, up, units, total }) => (
                    <li key={it.key} className="flex items-center gap-2.5 px-3 py-2.5">
                      <Thumb src={p.images[0]} className="h-9 w-9 rounded-md" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-ink">{l(p.name)}</div>
                        <div className="truncate text-[12px] tabular-nums text-muted">
                          {p.unit === 'm2' ? `${money(up, lang)} / m² · ${t('packsEq', { v: num(units, lang) })}` : `${money(up, lang)} / ${unitLabel(p.unit, lang)}`}
                        </div>
                      </div>
                      <Stepper value={it.qty} onChange={(v) => setQty(it.key, v)} />
                      <div className="w-[76px] shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">{eur(total)}</div>
                      <button type="button" onClick={() => removeItem(it.key)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink" aria-label="×">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <ProductSearch products={products} onPick={addProduct} />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-ink">{t('extraCodes')}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ownCode && (
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ink px-2 font-mono text-[12px] font-semibold text-white" title={t('enterThisCode', { code: ownCode })}>
                    <Check className="h-3 w-3" />
                    {ownCode}
                  </span>
                )}
                {codes.map((c) => (
                  <span key={c} className="inline-flex h-7 items-center gap-1 rounded-md bg-canvas pl-2 pr-1 font-mono text-[12px] font-semibold text-ink ring-1 ring-inset ring-line">
                    {c}
                    <button type="button" onClick={() => setCodes((s) => s.filter((v) => v !== c))} className="grid h-5 w-5 place-items-center rounded text-muted hover:bg-white hover:text-ink" aria-label="×">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCode();
                    }
                  }}
                  placeholder={t('extraCodesPh')}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 font-mono text-[13px] uppercase outline-none transition placeholder:font-sans placeholder:normal-case focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
                />
                <Button variant="outline" shape="rounded" size="sm" onClick={addCode} disabled={!codeInput.trim()}>
                  {t('addCode')}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label={t('delivery')} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} · {money(z.fee, lang)}
                  </option>
                ))}
                <option value="pickup">{t('pickup')} · {money(0, lang)}</option>
              </SelectField>
              <SelectField label={t('customer')} value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
                <option value="">{t('guest')}</option>
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t('inSegment', { s: l(s.name) })}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="space-y-0.5">
              <Tick checked={includeOthers} onChange={setIncludeOthers} label={t('includeOthers')} />
              {draft.method === 'code' && draft.oncePerCustomer && <Tick checked={usedBefore} onChange={setUsedBefore} label={t('usedBefore')} />}
            </div>
            <p className="text-[12px] leading-snug text-muted">
              {t('testAsActive')}
              {Math.abs(evalNow - Date.now()) > 120_000 && <> {t('testAt', { d: fmtDate(new Date(evalNow).toISOString(), lang, tz, true) })}.</>}
            </p>
          </section>
        </div>

        {/* ------------------------------ calculation ------------------------------ */}
        <div className="min-w-0 p-4 sm:p-6">
          {!res ? (
            <div className="grid h-full min-h-[240px] place-items-center rounded-xl border border-dashed border-line text-center text-[13.5px] text-muted">{t('emptyCart')}</div>
          ) : (
            <div className="space-y-4">
              {/* This rule verdict */}
              <div className={cn('flex items-start gap-3 rounded-xl px-4 py-3 ring-1 ring-inset', own?.applied ? 'bg-emerald-50 ring-emerald-600/20' : 'bg-canvas ring-line')}>
                <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', own?.applied ? 'bg-emerald-600 text-white' : 'bg-white text-ink ring-1 ring-ink/15')}>
                  {own?.applied ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{t('thisRule')}</div>
                  <div className="mt-0.5 text-[14.5px] font-semibold text-ink">{own?.applied ? t('ruleApplied', { v: eur(own.applied.amount) }) : t('ruleRejected')}</div>
                  {!own?.applied && own?.rejected && <div className="mt-0.5 text-[13px] text-ink-soft">{x.reason(own.rejected, titleOf)}</div>}
                </div>
              </div>

              <ol className="overflow-hidden rounded-xl border border-line">
                {/* 1 — active price */}
                <Step n={1} title={t('step1')} amount={eur(res.subtotal)} amountLabel={t('subtotal')}>
                  <ul className="space-y-1">
                    {lines.map((ln) => (
                      <li key={ln.it.key} className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-ink-soft">
                          {l(ln.p.name)} <span className="text-muted">· {t('eachUnit', { q: ln.p.unit === 'm2' ? `${num(ln.units, lang)} m²` : ln.it.qty, p: eur(ln.up) })}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-ink">{eur(ln.total)}</span>
                      </li>
                    ))}
                  </ul>
                </Step>

                {/* 2 — product discounts */}
                <Step n={2} title={t('step2')} amount={res.productDiscount ? `−${eur(res.productDiscount)}` : eur(0)} total={{ label: t('revised'), value: eur(revised) }}>
                  {productApplied.length === 0 ? (
                    <p className="text-[13px] text-muted">{t('noneApplied')}</p>
                  ) : (
                    productApplied.map((a) => (
                      <AppliedRow key={a.id} title={titleOf(a.id)} code={a.code} mine={a.id === draft.id} amount={`−${eur(a.amount)}`}>
                        {res.lines
                          .map((rl) => ({ rl, v: rl.allocations.find((x2) => x2.discountId === a.id)?.amount ?? 0 }))
                          .filter((v) => v.v > 0)
                          .map(({ rl, v }) => (
                            <li key={rl.id} className="flex justify-between gap-3">
                              <span className="truncate">{lineName(rl.id)}</span>
                              <span className="shrink-0 tabular-nums">−{eur(v)}</span>
                            </li>
                          ))}
                      </AppliedRow>
                    ))
                  )}
                </Step>

                {/* 3 — order discounts */}
                <Step n={3} title={t('step3')} amount={res.orderDiscount ? `−${eur(res.orderDiscount)}` : eur(0)} total={{ label: t('subtotal'), value: eur(round2(res.subtotal - res.discountTotal)) }}>
                  {orderApplied.length === 0 ? (
                    <p className="text-[13px] text-muted">{t('noneApplied')}</p>
                  ) : (
                    orderApplied.map((a) => {
                      const rule = ruleById(a.id);
                      const base = res.lines.filter((rl) => !rule || lineMatches(rule.appliesTo, { productId: rl.productId, collectionIds: memberOf(byId.get(rl.productId)!) })).reduce((s, rl) => s + rl.subtotal - rl.productDiscount, 0);
                      return (
                        <AppliedRow key={a.id} title={titleOf(a.id)} code={a.code} mine={a.id === draft.id} amount={`−${eur(a.amount)}`} meta={t('baseOf', { v: eur(round2(base)) })}>
                          {res.lines
                            .map((rl) => ({ rl, v: rl.allocations.find((x2) => x2.discountId === a.id)?.amount ?? 0 }))
                            .filter((v) => v.v > 0)
                            .map(({ rl, v }) => (
                              <li key={rl.id} className="flex justify-between gap-3">
                                <span className="truncate">{lineName(rl.id)}</span>
                                <span className="shrink-0 tabular-nums">−{eur(v)}</span>
                              </li>
                            ))}
                        </AppliedRow>
                      );
                    })
                  )}
                </Step>

                {/* 4 — shipping */}
                <Step n={4} title={t('step4')} amount={eur(res.shipping)}>
                  <div className="space-y-1 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-ink-soft">
                        {t('fee')} · {zone ? zone.name : t('pickup')}
                      </span>
                      <span className="tabular-nums text-ink">{eur(fee)}</span>
                    </div>
                    {shipApplied ? (
                      <AppliedRow title={titleOf(shipApplied.id)} code={shipApplied.code} mine={shipApplied.id === draft.id} amount={`−${eur(shipApplied.amount)}`} />
                    ) : (
                      <p className="text-muted">{t('noneApplied')}</p>
                    )}
                  </div>
                </Step>

                {/* total */}
                <li className="flex flex-wrap items-end justify-between gap-3 bg-ink px-4 py-3.5 text-white sm:px-5">
                  <div>
                    <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/60">{t('stepTotal')}</div>
                    <div className="text-[22px] font-bold tabular-nums leading-tight">{eur(res.total)}</div>
                  </div>
                  <div className="text-right text-[13px] text-white/75">
                    {t('saving')}: <span className="font-semibold tabular-nums text-white">−{eur(round2(res.discountTotal + res.shippingDiscount))}</span>
                  </div>
                </li>
              </ol>

              {/* allocation table */}
              <section>
                <h4 className="mb-2 text-[13px] font-semibold text-ink">{t('allocations')}</h4>
                <div className="overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[520px] text-left text-[13px]">
                    <thead className="bg-canvas/70 text-[12px] text-muted">
                      <tr>
                        <th className="px-4 py-2 font-semibold">{t('al_item')}</th>
                        <th className="px-3 py-2 text-right font-semibold">{t('al_before')}</th>
                        <th className="px-3 py-2 text-right font-semibold">{t('al_prod')}</th>
                        <th className="px-3 py-2 text-right font-semibold">{t('al_order')}</th>
                        <th className="px-4 py-2 text-right font-semibold">{t('al_net')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/70 tabular-nums">
                      {res.lines.map((rl) => (
                        <tr key={rl.id}>
                          <td className="max-w-[240px] truncate px-4 py-2 font-sans text-ink">{lineName(rl.id)}</td>
                          <td className="px-3 py-2 text-right text-ink-soft">{eur(rl.subtotal)}</td>
                          <td className="px-3 py-2 text-right text-ink-soft">{rl.productDiscount ? `−${eur(rl.productDiscount)}` : '—'}</td>
                          <td className="px-3 py-2 text-right text-ink-soft">{rl.orderDiscount ? `−${eur(rl.orderDiscount)}` : '—'}</td>
                          <td className="px-4 py-2 text-right font-semibold text-ink">{eur(rl.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[12px] leading-snug text-muted">{t('allocNote')}</p>
              </section>

              {/* rejected */}
              {res.rejected.length > 0 && (
                <section>
                  <h4 className="mb-2 text-[13px] font-semibold text-ink">{t('rejectedTitle')}</h4>
                  <ul className="divide-y divide-line/70 rounded-xl border border-line">
                    {res.rejected.map((r, i) => (
                      <li key={`${r.id ?? r.code}-${i}`} className={cn('flex items-start gap-3 px-4 py-2.5', r.id === draft.id && 'bg-canvas/70')}>
                        <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2.6} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                            <span className="font-semibold text-ink">{r.id ? titleOf(r.id) : r.code}</span>
                            {r.code && r.id && <span className="rounded bg-canvas px-1.5 font-mono text-[11.5px] text-ink-soft ring-1 ring-inset ring-line">{r.code}</span>}
                            {r.auto && <span className="text-[12px] text-muted">· {t('autoTag')}</span>}
                            {r.id === draft.id && <span className="text-[12px] font-semibold text-ink">· {t('thisRule')}</span>}
                          </div>
                          <div className="text-[12.5px] text-ink-soft">{x.reason(r, titleOf)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Small parts                                                         */
/* ------------------------------------------------------------------ */
function Step({ n, title, amount, amountLabel, total, children }: { n: number; title: string; amount: string; amountLabel?: string; total?: { label: string; value: string }; children: ReactNode }) {
  return (
    <li className="border-b border-line/80 px-4 py-3.5 last:border-b-0 sm:px-5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-canvas text-[11px] font-bold text-ink ring-1 ring-inset ring-line">{n}</span>
          <span className="text-[13.5px] font-semibold text-ink">{title}</span>
        </div>
        <span className="text-[13.5px] font-semibold tabular-nums text-ink" title={amountLabel}>
          {amount}
        </span>
      </div>
      <div className="pl-[30px]">{children}</div>
      {total && (
        <div className="mt-2.5 flex justify-between gap-3 border-t border-dashed border-line pl-[30px] pt-2 text-[13px]">
          <span className="text-muted">{total.label}</span>
          <span className="font-semibold tabular-nums text-ink">{total.value}</span>
        </div>
      )}
    </li>
  );
}

function AppliedRow({ title, code, amount, mine, meta, children }: { title: string; code?: string; amount: string; mine?: boolean; meta?: string; children?: ReactNode }) {
  const x = useDiscountText();
  return (
    <div className={cn('mt-1 rounded-lg px-2.5 py-2 first:mt-0', mine ? 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-600/15' : 'bg-canvas/60')}>
      <div className="flex items-start justify-between gap-3 text-[13px]">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" strokeWidth={2.6} />
          <span className="font-semibold text-ink">{title}</span>
          {code && <span className="rounded bg-white px-1.5 font-mono text-[11.5px] text-ink-soft ring-1 ring-inset ring-line">{code}</span>}
          {mine && <span className="text-[12px] font-semibold text-emerald-800">· {x.t('thisRule')}</span>}
          {meta && <span className="text-[12px] text-muted">· {meta}</span>}
        </div>
        <span className="shrink-0 font-semibold tabular-nums text-ink">{amount}</span>
      </div>
      {children && <ul className="mt-1 space-y-0.5 pl-[22px] text-[12.5px] text-muted">{children}</ul>}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex h-8 shrink-0 items-center rounded-lg border border-line bg-white">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} className="grid h-full w-7 place-items-center text-ink-soft hover:text-ink disabled:opacity-30" aria-label="−">
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="h-full w-8 bg-transparent text-center text-[13px] font-semibold tabular-nums outline-none"
      />
      <button type="button" onClick={() => onChange(value + 1)} className="grid h-full w-7 place-items-center text-ink-soft hover:text-ink" aria-label="+">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function ProductSearch({ products, onPick }: { products: Product[]; onPick: (p: Product) => void }) {
  const x = useDiscountText();
  const { t, l, lang } = x;
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const results = useMemo(() => {
    const live = products.filter((p) => p.status === 'active');
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    const list = terms.length ? live.filter((p) => terms.every((term) => fold(`${p.name.me} ${p.name.sq} ${p.name.en} ${p.sku}`).includes(term))) : [...live].sort((a, b) => b.sold - a.sold);
    return list.slice(0, 6);
  }, [products, q]);
  return (
    <div className="relative border-t border-line/70">
      <Search className="pointer-events-none absolute left-3 top-[13px] h-4 w-4 text-muted" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => window.setTimeout(() => setFocus(false), 150)}
        placeholder={t('addProduct')}
        className="h-[42px] w-full bg-white pl-9 pr-3 text-[13.5px] outline-none placeholder:font-medium placeholder:text-ink-soft focus:bg-canvas/40"
      />
      {focus && results.length > 0 && (
        <ul className="border-t border-line/70 bg-white">
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(p);
                  setQ('');
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-canvas/70"
              >
                <Thumb src={p.images[0]} className="h-7 w-7 rounded" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{l(p.name)}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-muted">{money(unitPrice(p), lang)}</span>
                <Plus className="h-3.5 w-3.5 shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
