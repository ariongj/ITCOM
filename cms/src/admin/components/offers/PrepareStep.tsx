// Step 1 — "Përgatit" (PDF p.29): name, period, participating products, commercial rule, audience/markets.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, BadgePercent, CalendarClock, Check, FileText, Layers, Link2, Plus, Search, Tag, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Overlay';
import { Card, Thumb } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { useL, useLang } from '@/i18n';
import { discountState } from '@/lib/discounts';
import { basePrice } from '@/lib/pricing';
import { stockLevels } from '@/lib/inventory';
import { money } from '@/lib/format';
import { fold } from '@/lib/search';
import { href } from '@/lib/paths';
import { cn, slugify } from '@/lib/utils';
import type { Discount, DiscountState, Product } from '@/lib/types';
import type { OfferData } from './hooks';
import { DAY, fmtDay, fromLocalInput, offerProducts, rangeLabel, sameMoment, sourceOf, toLocalInput, type OfferX, type ProductSource, type RuleMode } from './model';
import { FieldLabel, Help, Note, OfferStatusPill, SelectBox, TextInput, ruleLines, useOT } from './ui';

export interface PrepareProps {
  draft: OfferX;
  set: (patch: Partial<OfferX>) => void;
  mode: RuleMode;
  setMode: (m: RuleMode) => void;
  data: OfferData;
  isNew: boolean;
  slugTaken: boolean;
}

const STATE_ORDER: DiscountState[] = ['active', 'scheduled', 'draft', 'paused', 'expired'];

export function PrepareStep({ draft, set, mode, setMode, data, isNew, slugTaken }: PrepareProps) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const discount = draft.discountId ? data.discountById.get(draft.discountId) : undefined;
  const [slugAuto, setSlugAuto] = useState(isNew && !draft.slug);

  const setName = (name: OfferX['name']) => {
    const patch: Partial<OfferX> = { name };
    if (slugAuto) patch.slug = slugify(name.sq || name.en || name.me);
    set(patch);
  };

  /** Choosing a rule pre-fills what the rule already knows (dates for a new offer, the targeted collection/products). */
  const pickDiscount = (id: string) => {
    const d = data.discountById.get(id);
    if (!d) return set({ discountId: undefined });
    const patch: Partial<OfferX> = { discountId: id };
    if (isNew) {
      patch.startsAt = new Date(Math.max(new Date(d.startsAt).getTime(), Date.now())).toISOString();
      patch.endsAt = d.endsAt;
      if (sameMoment(d.startsAt, patch.startsAt)) patch.startsAt = d.startsAt;
    }
    if (!draft.collectionId && !draft.productIds.length) {
      if (d.appliesTo.scope === 'collections' && d.appliesTo.ids[0]) patch.collectionId = d.appliesTo.ids[0];
      else if (d.appliesTo.scope === 'products') patch.productIds = [...d.appliesTo.ids];
      else if (d.kind === 'bxgy' && d.bxgy?.buyScope === 'products') patch.productIds = [...d.bxgy.buyIds];
    }
    set(patch);
  };

  return (
    <div className="space-y-5">
      {/* ---------------- basics ---------------- */}
      <Card title={t('basics')} description={t('basicsText')} bodyClassName="space-y-4">
        <div id="of-basics" className="scroll-mt-32" />
        <L10nInput label={t('f_name')} value={draft.name} onChange={setName} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="of-slug">{t('f_slug')}</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[14px] text-muted">/oferta/</span>
              <TextInput
                id="of-slug"
                value={draft.slug}
                invalid={slugTaken}
                onChange={(e) => {
                  setSlugAuto(false);
                  set({ slug: slugify(e.target.value.replace(/\s/g, '-')) || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                }}
                className="pl-[62px]"
              />
            </div>
            {slugTaken ? <Help tone="error">{t('f_slugTaken')}</Help> : <Help>{t('f_slugHint', { url: `itcom.example/oferta/${draft.slug || '…'}` })}</Help>}
          </div>
          <div>
            <FieldLabel htmlFor="of-owner">{t('f_owner')}</FieldLabel>
            <SelectBox id="of-owner" value={draft.owner} onChange={(e) => set({ owner: e.target.value })}>
              {data.staff
                .filter((s) => s.active || s.id === draft.owner)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.title ? ` — ${l(s.title)}` : ''}
                  </option>
                ))}
            </SelectBox>
            <Help>{t('f_ownerHint')}</Help>
          </div>
        </div>
        <L10nInput label={t('f_description')} value={draft.description} onChange={(description) => set({ description })} multiline rows={2} />
      </Card>

      {/* ---------------- period ---------------- */}
      <PeriodCard draft={draft} set={set} discount={mode === 'link' ? discount : undefined} tz={data.settings.timezone || 'Europe/Belgrade'} />

      {/* ---------------- products ---------------- */}
      <ProductsCard draft={draft} set={set} data={data} discount={mode === 'link' ? discount : undefined} />

      {/* ---------------- rule ---------------- */}
      <Card title={t('rule')} description={t('ruleText')} bodyClassName="space-y-4">
        <div id="of-rule" className="scroll-mt-32" />
        <div className="grid gap-2 md:grid-cols-3" role="radiogroup" aria-label={t('rule')}>
          <ModeCard on={mode === 'link'} icon={<Link2 className="h-4 w-4" />} title={t('mode_link')} text={t('mode_linkText')} onSelect={() => setMode('link')} />
          <ModeCard on={mode === 'new'} icon={<Plus className="h-4 w-4" />} title={t('mode_new')} text={t('mode_newText')} onSelect={() => setMode('new')} />
          <ModeCard on={mode === 'none'} icon={<FileText className="h-4 w-4" />} title={t('mode_none')} text={t('mode_noneText')} onSelect={() => setMode('none')} />
        </div>

        {mode === 'link' && (
          <div className="space-y-3">
            <div>
              <FieldLabel htmlFor="of-discount">{t('pickDiscount')}</FieldLabel>
              <SelectBox id="of-discount" value={draft.discountId ?? ''} onChange={(e) => pickDiscount(e.target.value)}>
                <option value="">{t('pickDiscount')}…</option>
                {STATE_ORDER.map((st) => {
                  const group = data.discounts.filter((d) => discountState(d) === st);
                  if (!group.length) return null;
                  return (
                    <optgroup key={st} label={t(`st_${st}`)}>
                      {group.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} — {ruleLines(d, t, lang).head}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </SelectBox>
            </div>
            {discount ? <DiscountSummary d={discount} data={data} offerId={draft.id} /> : draft.discountId && <Help tone="error">{t('ck_ruleDeleted')}</Help>}
          </div>
        )}
        {mode === 'new' && (
          <Note icon={BadgePercent}>
            <p>{t('newHint')}</p>
            <a
              href={href('/admin/popusti/novi')}
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-semibold text-white transition hover:bg-black"
            >
              {t('openEngine')}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Note>
        )}
        {mode === 'none' && <Note icon={Tag}>{t('editorialNote', { badge: l(draft.badge) || t('editorialBadgeFallback') })}</Note>}
      </Card>

      {/* ---------------- audience, markets, combinations ---------------- */}
      <AudienceCard draft={draft} set={set} data={data} discount={mode === 'link' ? discount : undefined} />
    </div>
  );
}

/* ================================================================== */
function ModeCard({ on, icon, title, text, onSelect }: { on: boolean; icon: ReactNode; title: string; text: string; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition-colors',
        on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30',
      )}
    >
      <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md', on ? 'bg-ink text-white' : 'bg-canvas text-ink-soft')}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold leading-snug text-ink">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{text}</span>
      </span>
    </button>
  );
}

/* ================================================================== */
function PeriodCard({ draft, set, discount, tz }: { draft: OfferX; set: (p: Partial<OfferX>) => void; discount?: Discount; tz: string }) {
  const t = useOT();
  const lang = useLang('admin');
  const invalid = !!draft.endsAt && new Date(draft.endsAt).getTime() <= new Date(draft.startsAt).getTime();
  const days = draft.endsAt && !invalid ? Math.max(1, Math.round((new Date(draft.endsAt).getTime() - new Date(draft.startsAt).getTime()) / DAY)) : null;
  const matches = !discount || (sameMoment(draft.startsAt, discount.startsAt) && sameMoment(draft.endsAt, discount.endsAt));
  return (
    <Card title={t('period')} description={t('periodText')} bodyClassName="space-y-4">
      <div id="of-period" className="scroll-mt-32" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="of-start">{t('f_start')}</FieldLabel>
          <TextInput id="of-start" type="datetime-local" value={toLocalInput(draft.startsAt)} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) ?? draft.startsAt })} />
        </div>
        <div>
          <FieldLabel htmlFor="of-end">{t('f_end')}</FieldLabel>
          <TextInput id="of-end" type="datetime-local" invalid={invalid} disabled={!draft.endsAt} value={toLocalInput(draft.endsAt)} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })} />
          {invalid && <Help tone="error">{t('f_endBeforeStart')}</Help>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Checkbox
          checked={!draft.endsAt}
          onChange={(v) => set({ endsAt: v ? undefined : new Date(new Date(draft.startsAt).getTime() + 14 * DAY).toISOString() })}
          label={<span className="text-[13.5px] font-medium">{t('f_noEnd')}</span>}
        />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
          <CalendarClock className="h-3.5 w-3.5" />
          {t('f_tz', { tz })}
          {days !== null && <> · {t('duration', { n: days })}</>}
        </span>
      </div>
      {discount && (
        <div className={cn('flex flex-col gap-2 rounded-lg border px-3.5 py-2.5 text-[13px] sm:flex-row sm:items-center sm:justify-between', matches ? 'border-line bg-canvas/50' : 'border-amber-600/25 bg-amber-50')}>
          <span className={cn('inline-flex items-center gap-2', matches ? 'text-ink-soft' : 'text-amber-900')}>
            {matches ? <Check className="h-4 w-4 text-emerald-700" /> : <CalendarClock className="h-4 w-4" />}
            {matches ? t('ck_datesMatch') : t('datesFromRule', { a: fmtDay(discount.startsAt, lang, { time: true }), b: discount.endsAt ? fmtDay(discount.endsAt, lang, { time: true }) : '∞' })}
          </span>
          {!matches && (
            <Button size="xs" shape="rounded" variant="outline" onClick={() => set({ startsAt: discount.startsAt, endsAt: discount.endsAt })}>
              {t('syncDates')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

/* ================================================================== */
function ProductsCard({ draft, set, data, discount }: { draft: OfferX; set: (p: Partial<OfferX>) => void; data: OfferData; discount?: Discount }) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const [src, setSrc] = useState<ProductSource>(() => sourceOf(draft, discount));
  const [picker, setPicker] = useState(false);
  const { collection, list } = useMemo(() => offerProducts(draft, data.products, data.collections), [draft, data.products, data.collections]);
  const nP = (n: number) => t(n === 1 ? 'nProduct_one' : 'nProduct_many', { n });

  const choose = (s: ProductSource) => {
    setSrc(s);
    if (s === 'collection') set({ productIds: [] });
    else if (s === 'products') set({ collectionId: undefined });
    else set({ collectionId: undefined, productIds: [] });
  };

  const tabs: { id: ProductSource; label: string }[] = [
    { id: 'collection', label: t('src_collection') },
    { id: 'products', label: t('src_products') },
    { id: 'all', label: t('src_all') },
  ];

  return (
    <Card title={t('products')} description={t('productsText')} bodyClassName="space-y-4">
      <div id="of-products" className="scroll-mt-32" />
      <div className="inline-flex flex-wrap rounded-lg bg-canvas p-0.5" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={src === x.id}
            onClick={() => choose(x.id)}
            className={cn('h-8 rounded-md px-3 text-[13px] font-semibold transition-colors', src === x.id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}
          >
            {x.label}
          </button>
        ))}
      </div>

      {src === 'collection' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <FieldLabel htmlFor="of-col">{t('pickCollection')}</FieldLabel>
            <SelectBox id="of-col" value={draft.collectionId ?? ''} onChange={(e) => set({ collectionId: e.target.value || undefined })}>
              <option value="">{t('pickCollection')}…</option>
              {data.collections.map((c) => {
                const n = offerProducts({ collectionId: c.id, productIds: [] }, data.products, data.collections).list.length;
                return (
                  <option key={c.id} value={c.id}>
                    {l(c.title)} · {nP(n)} · {c.kind === 'smart' ? t('colSmart') : t('colManual')}
                    {c.published ? '' : ` · ${t('colUnpublished')}`}
                  </option>
                );
              })}
            </SelectBox>
          </div>
          {collection ? (
            <ButtonLink to={`/admin/kolekcije/${collection.id}`} variant="outline" shape="rounded" size="sm" iconRight={<ArrowUpRight className="h-3.5 w-3.5" />}>
              {t('openCollection')}
            </ButtonLink>
          ) : (
            <ButtonLink to="/admin/kolekcije/novi" variant="outline" shape="rounded" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
              {t('newCollection')}
            </ButtonLink>
          )}
        </div>
      )}

      {src === 'all' && <Note icon={Layers}>{t('src_allText')}</Note>}

      {src !== 'all' && (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink-soft">{nP(list.length)}</span>
            {src === 'products' && (
              <Button size="xs" shape="rounded" variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setPicker(true)}>
                {t('addProducts')}
              </Button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">{t('noProducts')}</p>
          ) : (
            <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line/80">
              {list.slice(0, 6).map((p) => (
                <ProductRow key={p.id} p={p} lang={lang} onRemove={src === 'products' ? () => set({ productIds: draft.productIds.filter((x) => x !== p.id) }) : undefined} data={data} />
              ))}
              {list.length > 6 && <li className="bg-canvas/40 px-3 py-2 text-[12.5px] font-medium text-muted">{t('showMore', { n: list.length - 6 })}</li>}
            </ul>
          )}
        </div>
      )}

      <ProductPicker open={picker} onClose={() => setPicker(false)} selected={draft.productIds} onChange={(ids) => set({ productIds: ids })} products={data.products} />
    </Card>
  );
}

function ProductRow({ p, lang, onRemove, data }: { p: Product; lang: 'me' | 'sq' | 'en'; onRemove?: () => void; data: OfferData }) {
  const t = useOT();
  const l = useL('admin');
  const st = stockLevels(p, data.committed);
  const flag =
    p.status !== 'active' ? { text: t('inactive'), cls: 'text-red-700' } : !st.tracked ? { text: t('madeToOrder'), cls: 'text-muted' } : st.available <= 0 ? { text: t('outOfStock'), cls: 'text-red-700' } : { text: t('lowStock', { n: st.available }), cls: st.available <= 5 ? 'text-amber-800' : 'text-muted' };
  return (
    <li className="flex items-center gap-3 bg-white px-3 py-2">
      <Thumb src={p.images[0]} className="h-9 w-9" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-ink">{l(p.name)}</div>
        <div className="truncate text-[12px] text-muted">
          {p.sku} · <span className={flag.cls}>{flag.text}</span>
        </div>
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{money(basePrice(p), lang)}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="×" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-canvas hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function ProductPicker({ open, onClose, selected, onChange, products }: { open: boolean; onClose: () => void; selected: string[]; onChange: (ids: string[]) => void; products: Product[] }) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const [q, setQ] = useState('');
  const shown = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    return products.filter((p) => p.status !== 'archived' && (!terms.length || terms.every((term) => fold(`${p.name.me} ${p.name.sq} ${p.name.en} ${p.sku}`).includes(term))));
  }, [products, q]);
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('addProducts')}
      footer={
        <Button shape="rounded" size="sm" onClick={onClose}>
          {t('done')} · {selected.length}
        </Button>
      }
    >
      <div className="sticky top-0 z-10 border-b border-line bg-white px-5 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchProducts')} className="pl-9" />
        </div>
      </div>
      <ul className="divide-y divide-line/70">
        {shown.map((p) => {
          const on = selected.includes(p.id);
          return (
            <li key={p.id}>
              <button type="button" onClick={() => toggle(p.id)} className={cn('flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-canvas/70', on && 'bg-canvas/50')}>
                <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md border', on ? 'border-ink bg-ink text-white' : 'border-ink/25 bg-white')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                <Thumb src={p.images[0]} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-ink">{l(p.name)}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {p.sku}
                    {p.status !== 'active' && ` · ${t('inactive')}`}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">{money(basePrice(p), lang)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/* ================================================================== */
function DiscountSummary({ d, data, offerId }: { d: Discount; data: OfferData; offerId: string }) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const r = ruleLines(d, t, lang);
  const state = discountState(d);
  const scope =
    d.kind === 'shipping' || d.appliesTo.scope === 'all'
      ? t('scope_all')
      : d.appliesTo.scope === 'collections'
        ? t('scope_collections', { list: d.appliesTo.ids.map((id) => data.collections.find((c) => c.id === id)).filter(Boolean).map((c) => l(c!.title)).join(', ') })
        : t(d.appliesTo.ids.length === 1 ? 'nProduct_one' : 'nProduct_many', { n: d.appliesTo.ids.length });
  const other = data.offers.find((o) => o.id !== offerId && o.discountId === d.id);
  const rows: [string, ReactNode][] = [
    [t('d_method'), d.method === 'code' ? <span className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[12.5px] font-semibold">{d.code}</span> : t('rule_auto')],
    [t('d_value'), r.sub],
    [t('d_minimum'), d.minimum.type === 'none' ? t('d_noMinimum') : d.minimum.type === 'amount' ? money(d.minimum.value, lang, { decimals: false }) : t('min_qty', { v: d.minimum.value })],
    [t('d_period'), rangeLabel(d.startsAt, d.endsAt, lang, t('period_open'))],
    [t('d_appliesTo'), d.kind === 'bxgy' ? t('kind_bxgy') : scope],
    [t('d_uses'), d.usageLimit ? t('d_usesOf', { n: d.uses, max: d.usageLimit }) : String(d.uses)],
  ];
  return (
    <div className="rounded-lg border border-line/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13.5px] font-semibold text-ink">{d.title}</span>
          <OfferStatusPill state={state} size="sm" />
        </div>
        <Link to={`/admin/popusti/${d.id}`} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink hover:underline">
          {t('openDiscount')}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <dl className="grid gap-x-6 px-4 py-2 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/50 py-1.5 text-[13px] last:border-0 sm:[&:nth-last-child(2)]:border-0">
            <dt className="shrink-0 text-muted">{k}</dt>
            <dd className="min-w-0 text-right font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      {other && <p className="border-t border-line/70 px-4 py-2 text-[12.5px] text-muted">{t('usedByOther', { name: l(other.name) })}</p>}
    </div>
  );
}

/* ================================================================== */
function AudienceCard({ draft, set, data, discount }: { draft: OfferX; set: (p: Partial<OfferX>) => void; data: OfferData; discount?: Discount }) {
  const t = useOT();
  const l = useL('admin');
  const markets = draft.markets ?? ['mk-me'];
  const seg = discount?.audience.type === 'segment' ? data.segments.find((s) => s.id === discount.audience.segmentId) : undefined;
  const combos = discount ? (['products', 'order', 'shipping'] as const).filter((k) => discount.combines[k]) : [];
  const toggle = (id: string) => set({ markets: markets.includes(id) ? markets.filter((x) => x !== id) : [...markets, id] });
  return (
    <Card title={t('audience')} description={t('audienceText')} bodyClassName="divide-y divide-line/70 py-1!">
      <Row label={t('aud_price')}>
        <span className="font-medium text-ink">{discount ? (seg ? t('aud_segment', { name: l(seg.name) }) : t('aud_all')) : t('aud_visitors')}</span>
        {discount && <span className="ml-2 text-[12px] text-muted">({t('aud_inRule')})</span>}
      </Row>
      <Row label={t('markets')}>
        <div className="flex flex-wrap gap-1.5">
          {data.settings.markets.map((m) => {
            const on = markets.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(m.id)}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors', on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30')}
              >
                {on && <Check className="h-3.5 w-3.5" />}
                {l(m.name)}
                <span className={cn('text-[11.5px]', on ? 'text-white/70' : 'text-muted')}>
                  {m.currency}
                  {m.status === 'draft' && ` · ${t('marketDraft')}`}
                </span>
              </button>
            );
          })}
        </div>
        {!markets.length && <Help tone="error">{t('noMarket')}</Help>}
      </Row>
      <Row label={t('combinations')}>
        {!discount ? (
          <span className="text-muted">—</span>
        ) : combos.length ? (
          <div className="flex flex-wrap gap-1.5">
            {combos.map((k) => (
              <span key={k} className="inline-flex h-7 items-center gap-1 rounded-md bg-canvas px-2 text-[12.5px] font-medium text-ink-soft">
                <Check className="h-3.5 w-3.5" />
                {t(`comb_${k}`)}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-ink-soft">{t('comb_none')}</span>
        )}
      </Row>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 py-3 text-[13.5px] sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center sm:gap-4">
      <div className="text-[13px] font-semibold text-ink-soft">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
