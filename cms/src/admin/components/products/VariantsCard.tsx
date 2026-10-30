import { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ArrowUpRight, Check, ChevronDown, Eye, EyeOff, Infinity as InfinityIcon, Pencil, Wand2 } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { money, num, unitLabel } from '@/lib/format';
import type { Lang, Product, ProductOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { pd } from './dict';
import { OptionsFields } from './OptionsEditor';
import { FormField, IconBtn, LangTabs, NumInput, SelectInput, TextInput, TickBox, ToggleRow, missingCounts } from './parts';
import { LOW_STOCK, MAX_TRACKED, variantLabel, variantPrice, variantSku, variantSwatch, type Variant } from './model';

/**
 * "Variantet & inventari" (PDF p.11 / p.13): options generate the combinations; each combination has its own
 * SKU, stock and on/off switch (invalid combinations are taken out of sale). Bulk editing and grouping by an
 * option keep long tables manageable.
 */
export function VariantsCard({
  product,
  options,
  onOptions,
  variants,
  onVariants,
  tracked,
  onTracked,
  sku,
  onSku,
  barcode,
  onBarcode,
  stock,
  onStock,
  takenSkus,
  skuError,
}: {
  product: Pick<Product, 'price' | 'salePrice' | 'options' | 'unit' | 'incoming' | 'unavailable'>;
  options: ProductOption[];
  onOptions: (o: ProductOption[]) => void;
  variants: Variant[];
  onVariants: (v: Variant[]) => void;
  tracked: boolean;
  onTracked: (v: boolean) => void;
  sku: string;
  onSku: (v: string) => void;
  barcode: string;
  onBarcode: (v: string) => void;
  stock: number;
  onStock: (v: number) => void;
  /** SKU (upper-case) → name of the other product using it */
  takenSkus: Map<string, string>;
  skuError?: string;
}) {
  const t = useDict(pd, 'admin');
  const lang = useLang('admin');
  const [optLang, setOptLang] = useState<Lang>(lang);
  const [editing, setEditing] = useState(options.length === 0);
  const l = useL('admin');
  const missing = useMemo(() => missingCounts(options.flatMap((o) => [o.name, ...o.values.map((v) => v.label)])), [options]);
  const unit = product.unit === 'm2' ? t('packsUnit') : unitLabel(product.unit, lang);
  const incoming = product.incoming ?? 0;
  const blocked = product.unavailable ?? 0;
  const stockHint = !tracked ? undefined : stock <= 0 ? t('outOfStockWarn') : stock <= LOW_STOCK ? t('lowStockWarn') : product.unit === 'm2' ? t('stockPacksH') : undefined;

  return (
    <Card title={t('c_variants')} description={t('c_variants_d')} actions={options.length > 0 && editing && <LangTabs value={optLang} onChange={setOptLang} missing={missing} title={t('langHint')} />} padded={false}>
      {/* options — summary first, the editor on demand */}
      {editing ? (
        <div>
          <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t('options')}</span>
            {options.length > 0 && (
              <button type="button" onClick={() => setEditing(false)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink hover:border-ink/30">
                <Check className="h-3.5 w-3.5" /> {t('doneOptions')}
              </button>
            )}
          </div>
          <OptionsFields value={options} onChange={onOptions} lang={optLang} />
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t('options')}</span>
            <button type="button" onClick={() => setEditing(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink hover:border-ink/30">
              <Pencil className="h-3.5 w-3.5" /> {t('editOptions')}
            </button>
          </div>
          <ul className="divide-y divide-line/60 rounded-xl border border-line">
            {options.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                <span className="w-full text-[13px] font-semibold text-ink sm:w-40 sm:shrink-0">{l(o.name) || '—'}</span>
                <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {o.values.map((v) => (
                    <span key={v.id} className="inline-flex items-center gap-1.5 rounded-md bg-ink/[0.05] px-2 py-0.5 text-[12.5px] text-ink">
                      {o.type === 'swatch' && <span className="h-3 w-3 rounded-full ring-1 ring-inset ring-ink/15" style={{ background: v.swatch }} />}
                      {l(v.label) || '—'}
                      {!!v.priceDelta && <span className="tabular-nums text-muted">{v.priceDelta > 0 ? '+' : '−'}{money(Math.abs(v.priceDelta), lang, { decimals: false })}</span>}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* inventory */}
      <div className="space-y-4 border-t border-line/70 p-4 sm:p-5">
        <ToggleRow label={t('f_track')} hint={t('f_track_h')} checked={tracked} onChange={onTracked} icon={tracked ? undefined : <InfinityIcon className="h-4 w-4" />} />
        {!tracked && (
          <p className="flex items-start gap-2 rounded-lg bg-canvas px-3.5 py-2.5 text-[13px] text-ink-soft">
            <InfinityIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> {t('untracked_note')}
          </p>
        )}
        <div className={cn('grid gap-4', variants.length ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
          <FormField label={t('f_sku')} hint={variants.length ? t('f_sku_h') : undefined} error={skuError}>
            <TextInput value={sku} onChange={(e) => onSku(e.target.value.toUpperCase())} placeholder="SC-VR-101" mono spellCheck={false} invalid={!!skuError} aria-label={t('f_sku')} />
          </FormField>
          <FormField label={t('f_barcode')}>
            <TextInput value={barcode} onChange={(e) => onBarcode(e.target.value.replace(/[^\d]/g, ''))} placeholder="200…" mono inputMode="numeric" aria-label={t('f_barcode')} />
          </FormField>
          {!variants.length && (
            <FormField label={t('f_stock')} hint={stockHint}>
              {tracked ? (
                <NumInput integer value={stock} onChange={(v) => onStock(Math.min(MAX_TRACKED, v ?? 0))} suffix={unit} placeholder="0" aria-label={t('f_stock')} />
              ) : (
                <TextInput value="∞" disabled readOnly aria-label={t('f_stock')} />
              )}
            </FormField>
          )}
        </div>

        {variants.length > 0 && <VariantTable product={product} options={options} variants={variants} onVariants={onVariants} tracked={tracked} baseSku={sku} unit={unit} takenSkus={takenSkus} />}

        {(incoming > 0 || blocked > 0 || tracked) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
            {incoming > 0 && <span className="tabular-nums">{t('inv_incoming', { n: num(incoming, lang) })}</span>}
            {blocked > 0 && <span className="tabular-nums">{t('inv_blocked', { n: num(blocked, lang) })}</span>}
            <Link to="/admin/inventar" className="inline-flex items-center gap-1 font-semibold text-ink-soft hover:text-ink hover:underline hover:underline-offset-2">
              {t('inv_link')} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}

function VariantTable({
  product,
  options,
  variants,
  onVariants,
  tracked,
  baseSku,
  unit,
  takenSkus,
}: {
  product: Pick<Product, 'price' | 'salePrice' | 'options'>;
  options: ProductOption[];
  variants: Variant[];
  onVariants: (v: Variant[]) => void;
  tracked: boolean;
  baseSku: string;
  unit: string;
  takenSkus: Map<string, string>;
}) {
  const t = useDict(pd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const usable = options.filter((o) => o.values.length > 0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<string>(() => (variants.length > 8 && usable.length > 1 ? usable[0].id : ''));
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [bulkStock, setBulkStock] = useState<number | null>(null);
  const group = usable.find((o) => o.id === groupBy) ?? null;

  const skuCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of variants) {
      const k = v.sku.trim().toUpperCase();
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [variants]);
  const dupOf = (v: Variant) => {
    const k = v.sku.trim().toUpperCase();
    if (!k) return null;
    if ((skuCount.get(k) ?? 0) > 1) return t('v_dupSku');
    const other = takenSkus.get(k);
    return other ? t('e_skuDup', { sku: v.sku, name: other }) : null;
  };

  const patch = (ids: Set<string> | string[], fn: (v: Variant) => Variant) => {
    const set = ids instanceof Set ? ids : new Set(ids);
    onVariants(variants.map((v) => (set.has(v.id) ? fn(v) : v)));
  };
  const toggleSel = (ids: string[], on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });
  const allOn = variants.length > 0 && variants.every((v) => sel.has(v.id));
  const someOn = !allOn && variants.some((v) => sel.has(v.id));
  const total = variants.filter((v) => v.enabled).reduce((s, v) => s + v.stock, 0);
  const onSale = variants.filter((v) => v.enabled).length;

  const groups = useMemo(() => {
    if (!group) return [{ key: '', label: '', items: variants }];
    return group.values.map((gv) => ({ key: gv.id, label: l(gv.label) || '—', items: variants.filter((v) => v.values[group.id] === gv.id) })).filter((g) => g.items.length);
  }, [group, variants, l]);
  const rest = group ? options.filter((o) => o.id !== group.id) : options;

  const selectedIds = [...sel].filter((id) => variants.some((v) => v.id === id));

  return (
    <div className="overflow-hidden rounded-xl border border-line">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-canvas/60 px-3 py-2">
        {selectedIds.length > 0 ? (
          <>
            <span className="text-[12.5px] font-semibold text-ink">{t('v_selected', { n: selectedIds.length })}</span>
            {tracked && (
              <span className="flex items-center gap-1">
                <NumInput size="sm" integer value={bulkStock} onChange={setBulkStock} placeholder={t('v_setStock')} wrapClassName="w-[132px]" aria-label={t('v_setStock')} />
                <button
                  type="button"
                  disabled={bulkStock == null}
                  onClick={() => {
                    patch(selectedIds, (v) => ({ ...v, stock: Math.min(MAX_TRACKED, bulkStock ?? 0) }));
                    setBulkStock(null);
                  }}
                  className="h-9 rounded-lg bg-ink px-3 text-[12.5px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-40"
                >
                  {t('v_apply')}
                </button>
              </span>
            )}
            <button type="button" onClick={() => patch(selectedIds, (v) => ({ ...v, sku: variantSku(baseSku, options, v.values) }))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink hover:border-ink/30">
              <Wand2 className="h-3.5 w-3.5" /> {t('v_genSku')}
            </button>
            <button type="button" onClick={() => patch(selectedIds, (v) => ({ ...v, enabled: false }))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink hover:border-ink/30">
              <EyeOff className="h-3.5 w-3.5" /> {t('v_disable')}
            </button>
            <button type="button" onClick={() => patch(selectedIds, (v) => ({ ...v, enabled: true }))} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink hover:border-ink/30">
              <Eye className="h-3.5 w-3.5" /> {t('v_enable')}
            </button>
          </>
        ) : (
          <>
            <span className="text-[12.5px] font-medium text-muted">{t('v_combos', { n: variants.length, on: onSale })}</span>
            {usable.length > 1 && (
              <label className="ml-auto flex items-center gap-2 text-[12.5px] text-muted">
                <span className="max-sm:hidden">{t('v_groupBy')}</span>
                <SelectInput size="sm" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-40" aria-label={t('v_groupBy')}>
                  <option value="">{t('v_noGroup')}</option>
                  {usable.map((o) => (
                    <option key={o.id} value={o.id}>
                      {l(o.name) || '—'}
                    </option>
                  ))}
                </SelectInput>
              </label>
            )}
          </>
        )}
      </div>

      {/* head */}
      <div className="flex items-center gap-3 border-b border-line/70 px-3 py-2 text-[12px] font-semibold text-muted max-sm:hidden">
        <TickBox checked={allOn} indeterminate={someOn} onChange={() => setSel(allOn ? new Set() : new Set(variants.map((v) => v.id)))} label={t('v_selectAll')} />
        <span className="min-w-0 flex-1">{t('v_variant')}</span>
        <span className="w-[84px] text-right">{t('v_price')}</span>
        <span className="w-[188px]">{t('v_sku')}</span>
        <span className="w-[104px]">{t('v_available')}</span>
        <span className="w-8" />
      </div>

      <div className="divide-y divide-line/60">
        {groups.map((g) => {
          const isClosed = closed.has(g.key);
          const ids = g.items.map((v) => v.id);
          const gAll = ids.every((id) => sel.has(id));
          const gSome = !gAll && ids.some((id) => sel.has(id));
          const gStock = g.items.filter((v) => v.enabled).reduce((s, v) => s + v.stock, 0);
          return (
            <Fragment key={g.key || 'all'}>
              {group && (
                <div className="flex items-center gap-3 bg-canvas/40 px-3 py-2">
                  <TickBox checked={gAll} indeterminate={gSome} onChange={(on) => toggleSel(ids, on)} label={g.label} />
                  <button
                    type="button"
                    onClick={() =>
                      setClosed((c) => {
                        const n = new Set(c);
                        if (n.has(g.key)) n.delete(g.key);
                        else n.add(g.key);
                        return n;
                      })
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-semibold text-ink"
                    aria-expanded={!isClosed}
                  >
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', isClosed && '-rotate-90')} />
                    <span className="truncate">{g.label}</span>
                    <span className="shrink-0 text-[12px] font-medium text-muted">· {t('variantsN', { n: g.items.length })}</span>
                  </button>
                  {tracked && (
                    <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-soft">
                      {num(gStock, lang)} {unit}
                    </span>
                  )}
                </div>
              )}
              {!isClosed &&
                g.items.map((v) => {
                  const dup = dupOf(v);
                  const swatch = variantSwatch(options, v.values);
                  const on = sel.has(v.id);
                  return (
                    <div key={v.id} className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:flex-nowrap', group && 'sm:pl-6', !v.enabled && 'bg-canvas/40', on && 'bg-ink/[0.03]')}>
                      <TickBox checked={on} onChange={(x) => toggleSel([v.id], x)} label={variantLabel(options, v.values, l)} />
                      <div className={cn('flex min-w-0 flex-1 items-center gap-2', !v.enabled && 'opacity-55')}>
                        {swatch && <span className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-ink/15" style={{ background: swatch }} />}
                        <span className="truncate text-[13px] font-medium text-ink">{variantLabel(rest.length ? rest : options, v.values, l) || variantLabel(options, v.values, l)}</span>
                        {!v.enabled && <span className="shrink-0 rounded bg-ink/[0.06] px-1.5 py-px text-[10.5px] font-semibold text-muted">{t('v_disabled')}</span>}
                      </div>
                      <span className={cn('w-[84px] text-right text-[13px] tabular-nums text-ink-soft max-sm:ml-auto', !v.enabled && 'opacity-55')}>{money(variantPrice(product, v.values), lang)}</span>
                      <div className="flex basis-full items-start gap-2 pl-[30px] max-sm:order-last sm:contents">
                        <div className="min-w-0 flex-1 sm:w-[188px] sm:flex-none">
                          <TextInput
                            size="sm"
                            mono
                            value={v.sku}
                            invalid={!!dup}
                            title={dup ?? undefined}
                            spellCheck={false}
                            onChange={(e) => patch([v.id], (x) => ({ ...x, sku: e.target.value.toUpperCase() }))}
                            aria-label={`${t('v_sku')} ${variantLabel(options, v.values, l)}`}
                          />
                          {dup && (
                            <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-red-700">
                              <AlertTriangle className="h-3 w-3" /> {dup}
                            </span>
                          )}
                        </div>
                        <div className="w-[104px] shrink-0">
                          {tracked ? (
                            <NumInput size="sm" integer value={v.stock} disabled={!v.enabled} onChange={(n) => patch([v.id], (x) => ({ ...x, stock: Math.min(MAX_TRACKED, n ?? 0) }))} placeholder="0" aria-label={`${t('v_available')} ${variantLabel(options, v.values, l)}`} className={cn(v.enabled && v.stock <= 0 && 'text-red-700')} />
                          ) : (
                            <TextInput size="sm" value="∞" disabled readOnly aria-label={t('v_available')} />
                          )}
                        </div>
                      </div>
                      <IconBtn label={v.enabled ? t('v_disable') : t('v_enable')} onClick={() => patch([v.id], (x) => ({ ...x, enabled: !x.enabled }))}>
                        {v.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </IconBtn>
                    </div>
                  );
                })}
            </Fragment>
          );
        })}
      </div>

      {tracked && (
        <div className="flex items-center justify-between gap-3 border-t border-line/70 bg-canvas/50 px-3 py-2 text-[12.5px]">
          <span className="text-muted">{t('v_combos', { n: variants.length, on: onSale })}</span>
          <span className="font-semibold tabular-nums text-ink">
            {t('v_total')}: {num(total, lang)} {unit}
          </span>
        </div>
      )}
    </div>
  );
}
