import type { ReactNode } from 'react';
import { Archive, Check, CheckCircle2, CircleDashed, ClipboardList, Lock, Monitor, Package, ShieldCheck, ShoppingBag, Star, Store, XCircle, Zap } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { Checkbox } from '@/components/ui/Field';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { perUnit } from '@/lib/format';
import type { Badge as BadgeT, Category, Collection, Lang, ProductStatus, SalesChannel, Unit } from '@/lib/types';
import { cn } from '@/lib/utils';
import { pd } from './dict';
import { EDIT_LANGS, FormField, NumInput, SelectInput, TextInput, ToggleRow, langCode } from './parts';
import { TagsInput } from './TagsInput';
import type { Requirement, ShippingInfo } from './model';

/* ------------------------------------------------------------------ */
/* Status + publishing checklist                                       */
/* ------------------------------------------------------------------ */
const REQS: Requirement[] = ['name', 'category', 'price', 'image'];

export function StatusCard({
  status,
  original,
  onStatus,
  canPublish,
  canArchive,
  missing,
  translations,
}: {
  status: ProductStatus;
  original: ProductStatus | null;
  onStatus: (s: ProductStatus) => void;
  canPublish: boolean;
  canArchive: boolean;
  missing: Requirement[];
  translations: { total: number; miss: Record<Lang, number> };
}) {
  const t = useDict(pd, 'admin');
  const icon = status === 'active' ? <span className="block h-2 w-2 rounded-full bg-emerald-600" /> : status === 'draft' ? <CircleDashed className="h-4 w-4" /> : <Archive className="h-4 w-4" />;
  const blockActive = !canPublish && original !== 'active';
  const blockArchive = !canArchive && original !== 'archived';
  const ready = missing.length === 0;
  return (
    <Card title={t('c_status')}>
      <div className="space-y-4">
        <div>
          <SelectInput value={status} onChange={(e) => onStatus(e.target.value as ProductStatus)} icon={<span className="grid h-4 w-4 place-items-center">{icon}</span>} aria-label={t('c_status')}>
            <option value="active" disabled={blockActive}>
              {t('st_active')}
            </option>
            <option value="draft">{t('st_draft')}</option>
            <option value="archived" disabled={blockArchive}>
              {t('st_archived')}
            </option>
          </SelectInput>
          <p className="mt-2 text-[12.5px] leading-snug text-muted">{status === 'active' ? t('status_active_h') : status === 'draft' ? t('status_draft_h') : t('status_archived_h')}</p>
          {blockActive && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
              <Lock className="h-3.5 w-3.5" /> {t('needPublishPerm')}
            </p>
          )}
        </div>

        <div className={cn('rounded-lg px-3 py-2.5', ready ? 'bg-emerald-50/70' : status === 'active' ? 'bg-amber-50 ring-1 ring-inset ring-amber-600/20' : 'bg-canvas')}>
          {ready ? (
            <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" /> {t('ready')}
            </div>
          ) : (
            <>
              <div className={cn('text-[12.5px] font-semibold', status === 'active' ? 'text-amber-900' : 'text-ink-soft')}>{t('missingTitle')}</div>
              <ul className="mt-1.5 space-y-1">
                {REQS.map((r) => {
                  const miss = missing.includes(r);
                  return (
                    <li key={r} className={cn('flex items-center gap-2 text-[12.5px]', miss ? 'font-medium text-ink' : 'text-muted line-through decoration-ink/20')}>
                      {miss ? <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600" /> : <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                      {t(`req_${r}`)}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {translations.total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-line/70 pt-3.5">
            <span className="text-[13px] font-semibold text-ink-soft">{t('translations')}</span>
            <div className="flex gap-1.5">
              {EDIT_LANGS.map((lg) => {
                const miss = translations.miss[lg];
                return (
                  <span
                    key={lg}
                    title={miss ? `${translations.total - miss}/${translations.total}` : undefined}
                    className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums', miss ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20' : 'bg-ink/[0.05] text-ink-soft')}
                  >
                    {langCode(lg)}
                    {miss ? <span className="font-semibold">{translations.total - miss}/{translations.total}</span> : <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Publishing — sales channels                                         */
/* ------------------------------------------------------------------ */
export function PublishingCard({ channels, onChannels, status }: { channels: SalesChannel[]; onChannels: (c: SalesChannel[]) => void; status: ProductStatus }) {
  const t = useDict(pd, 'admin');
  const toggle = (c: SalesChannel, on: boolean) => onChannels(on ? (['online', 'pos'] as SalesChannel[]).filter((x) => x === c || channels.includes(x)) : channels.filter((x) => x !== c));
  const row = (c: SalesChannel, icon: ReactNode, label: string, hint: string) => (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft">{icon}</span>
      <Checkbox className="min-w-0 flex-1" checked={channels.includes(c)} onChange={(on) => toggle(c, on)} label={label} description={hint} />
    </div>
  );
  return (
    <Card title={t('c_publishing')}>
      <div className="space-y-3.5">
        {row('online', <Monitor className="h-4 w-4" />, t('ch_online'), t('ch_online_h'))}
        {row('pos', <Store className="h-4 w-4" />, t('ch_pos'), t('ch_pos_h'))}
        {(status !== 'active' || !channels.length) && <p className="rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-muted">{!channels.length ? t('noChannel') : t('channelsInactive')}</p>}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Organisation — category, vendor, tags, collections                  */
/* ------------------------------------------------------------------ */
export function OrganizationCard({
  categoryId,
  onCategory,
  categories,
  categoryError,
  vendor,
  onVendor,
  vendors,
  tags,
  onTags,
  tagSuggestions,
  collections,
  manualCols,
  onManualCols,
  smartMatches,
  canEditCollections,
}: {
  categoryId: string;
  onCategory: (id: string) => void;
  categories: Category[];
  categoryError?: string;
  vendor: string;
  onVendor: (v: string) => void;
  vendors: string[];
  tags: string[];
  onTags: (v: string[]) => void;
  tagSuggestions: string[];
  collections: Collection[];
  manualCols: string[];
  onManualCols: (ids: string[]) => void;
  smartMatches: Collection[];
  canEditCollections: boolean;
}) {
  const t = useDict(pd, 'admin');
  const l = useL('admin');
  const manual = collections.filter((c) => c.kind === 'manual');
  return (
    <Card title={t('c_org')}>
      <div className="space-y-4">
        <FormField label={t('f_category')} required error={categoryError}>
          <SelectInput value={categoryId} onChange={(e) => onCategory(e.target.value)} invalid={!!categoryError} aria-label={t('f_category')}>
            <option value="" disabled>
              {t('chooseCategory')}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {l(c.name)}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label={t('f_vendor')}>
          <TextInput value={vendor} onChange={(e) => onVendor(e.target.value)} placeholder={t('f_vendor_ph')} list="product-vendors" aria-label={t('f_vendor')} />
          <datalist id="product-vendors">
            {vendors.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </FormField>
        <FormField label={t('f_tags')}>
          <TagsInput value={tags} onChange={onTags} suggestions={tagSuggestions} placeholder={t('f_tags_ph')} removeLabel={t('remove')} />
        </FormField>

        <div className="border-t border-line/70 pt-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-ink-soft">{t('f_collections')}</span>
            {!canEditCollections && (
              <span title={t('col_noPerm')} className="text-muted">
                <Lock className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{t('col_manual')}</div>
          {manual.length ? (
            <ul className="mt-1.5 space-y-1.5" title={canEditCollections ? undefined : t('col_noPerm')}>
              {manual.map((c) => (
                <li key={c.id}>
                  <Checkbox
                    disabled={!canEditCollections}
                    checked={manualCols.includes(c.id)}
                    onChange={(on) => onManualCols(on ? [...manualCols, c.id] : manualCols.filter((x) => x !== c.id))}
                    label={
                      <span className="text-[13px] font-medium">
                        {l(c.title)}
                        {!c.published && <span className="ml-1.5 text-[11.5px] font-normal text-muted">({t('col_unpublished')})</span>}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[12.5px] text-muted">{t('col_noManual')}</p>
          )}
          <div className="mt-3.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{t('col_smart')}</div>
          {smartMatches.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {smartMatches.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-md bg-ink/[0.06] px-2 py-1 text-[12px] font-medium text-ink" title={t('col_smart_h')}>
                  <Zap className="h-3 w-3 text-muted" />
                  {l(c.title)}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[12.5px] text-muted">{t('col_none')}</p>
          )}
          <p className="mt-2 text-[12px] leading-snug text-muted">{t('col_smart_h')}</p>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Template                                                            */
/* ------------------------------------------------------------------ */
export function TemplateCard({ value, onChange }: { value: 'standard' | 'quote'; onChange: (v: 'standard' | 'quote') => void }) {
  const t = useDict(pd, 'admin');
  const opt = (id: 'standard' | 'quote', icon: ReactNode, title: string, hint: string) => (
    <button
      type="button"
      aria-pressed={value === id}
      onClick={() => onChange(id)}
      className={cn('flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition', value === id ? 'border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line bg-white hover:border-ink/30')}
    >
      <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2', value === id ? 'border-ink' : 'border-ink/25')}>{value === id && <span className="h-2 w-2 rounded-full bg-ink" />}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
          {icon}
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{hint}</span>
      </span>
    </button>
  );
  return (
    <Card title={t('c_template')}>
      <div className="space-y-2">
        {opt('standard', <ShoppingBag className="h-3.5 w-3.5 text-muted" />, t('tpl_standard'), t('tpl_standard_h'))}
        {opt('quote', <ClipboardList className="h-3.5 w-3.5 text-muted" />, t('tpl_quote'), t('tpl_quote_h'))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Care+ (stored in the `installation` add-on slot) & lead time        */
/* ------------------------------------------------------------------ */
export function InstallCard({
  installation,
  onInstallation,
  leadDays,
  onLeadDays,
  warranty,
  onWarranty,
  unit,
}: {
  installation: { available: boolean; price: number };
  onInstallation: (v: { available: boolean; price: number }) => void;
  leadDays: number | null;
  onLeadDays: (v: number | null) => void;
  warranty: number | null;
  onWarranty: (v: number | null) => void;
  unit: Unit;
}) {
  const t = useDict(pd, 'admin');
  const lang = useLang('admin');
  return (
    <Card title={t('c_install')}>
      <div className="space-y-4">
        <ToggleRow label={t('f_install')} hint={t('f_install_h')} checked={installation.available} onChange={(v) => onInstallation({ ...installation, available: v })} icon={<ShieldCheck className="h-4 w-4" />} />
        {installation.available && (
          <FormField label={t('f_installPrice')}>
            <NumInput money zeroAsEmpty value={installation.price} onChange={(v) => onInstallation({ ...installation, price: v ?? 0 })} prefix="€" suffix={perUnit(unit, lang)} placeholder="0" aria-label={t('f_installPrice')} />
          </FormField>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-line/70 pt-4">
          <FormField label={t('f_lead')}>
            <NumInput integer value={leadDays} onChange={onLeadDays} suffix={t('daysUnit')} placeholder="7" aria-label={t('f_lead')} />
          </FormField>
          <FormField label={t('f_warranty')}>
            <NumInput integer value={warranty} onChange={onWarranty} suffix={t('yearsUnit')} placeholder="2" aria-label={t('f_warranty')} />
          </FormField>
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Storefront display — badges + featured                              */
/* ------------------------------------------------------------------ */
const BADGES: BadgeT[] = ['new', 'sale', 'bestseller', 'premium'];

export function DisplayCard({ badges, onBadges, featured, onFeatured }: { badges: BadgeT[]; onBadges: (b: BadgeT[]) => void; featured: boolean; onFeatured: (v: boolean) => void }) {
  const t = useDict(pd, 'admin');
  const tc = useDict(common, 'admin');
  const toggle = (b: BadgeT) => onBadges(badges.includes(b) ? badges.filter((x) => x !== b) : BADGES.filter((x) => x === b || badges.includes(x)));
  return (
    <Card title={t('c_display')}>
      <div className="space-y-4">
        <FormField label={t('f_badges')}>
          <div className="flex flex-wrap gap-1.5">
            {BADGES.map((b) => {
              const on = badges.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(b)}
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold transition-all', on ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-inset ring-line hover:ring-ink/30')}
                >
                  {on ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-ink/25" />}
                  {tc(`badge_${b}`)}
                </button>
              );
            })}
          </div>
        </FormField>
        <ToggleRow label={t('f_featured')} hint={t('f_featured_h')} checked={featured} onChange={onFeatured} icon={<Star className={cn('h-4 w-4', featured && 'fill-current')} />} />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Shipping (Dërgesa) — weight / dimensions optional                   */
/* ------------------------------------------------------------------ */
export function ShippingCard({ value, onChange }: { value: ShippingInfo; onChange: (v: ShippingInfo) => void }) {
  const t = useDict(pd, 'admin');
  const set = (patch: Partial<ShippingInfo>) => onChange({ ...value, ...patch });
  const opt = (v: number | null) => (v == null || v <= 0 ? undefined : v);
  return (
    <Card title={t('c_shipping')}>
      <div className="space-y-4">
        <ToggleRow label={t('f_physical')} hint={value.physical ? t('f_physical_h') : t('f_physicalOff')} checked={value.physical} onChange={(physical) => set({ physical })} icon={<Package className="h-4 w-4" />} />
        {value.physical && (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
            <FormField label={`${t('f_weight')} (${t('optional')})`}>
              <NumInput value={value.weight ?? null} onChange={(v) => set({ weight: opt(v) })} suffix="kg" placeholder="—" aria-label={t('f_weight')} />
            </FormField>
            <FormField label={`${t('f_dims')} (${t('optional')})`}>
              <div className="grid grid-cols-3 gap-2">
                <NumInput value={value.length ?? null} onChange={(v) => set({ length: opt(v) })} suffix="cm" placeholder={t('dim_l')} aria-label={t('dim_l')} />
                <NumInput value={value.width ?? null} onChange={(v) => set({ width: opt(v) })} suffix="cm" placeholder={t('dim_w')} aria-label={t('dim_w')} />
                <NumInput value={value.height ?? null} onChange={(v) => set({ height: opt(v) })} suffix="cm" placeholder={t('dim_h')} aria-label={t('dim_h')} />
              </div>
            </FormField>
          </div>
        )}
      </div>
    </Card>
  );
}
