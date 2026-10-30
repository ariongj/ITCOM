// Zbritja — rule editor (CMS proposal pp.21–27, mock-up p.27): method, value, scope, minimum with its explicit base,
// BXGY / shipping specifics, audience, mutual combinations, usage limits, schedule in the store time zone and status.
// Right column: "Përmbledhja" in plain language + "Provo me shportë shembull" (the real engine on the unsaved form).
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Check, Copy, FileQuestion, RefreshCw, ShieldAlert, Shapes, Trash2, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { dd } from '@/admin/components/discounts/i18n';
import { useDiscountText } from '@/admin/components/discounts/text';
import { CODE_RE, KIND_ICON, copyToClipboard, fmtDate, generateCode, isKind, isoToZoned, newDiscount, perfByDiscount, tzLabel, zonedToIso } from '@/admin/components/discounts/meta';
import { Choice, FHint, FLabel, Note, NumberField, Segmented, SelectField, StatePill, StateSymbol, TextField, Tick, WithTip } from '@/admin/components/discounts/ui';
import { ScopePicker } from '@/admin/components/discounts/ItemPicker';
import { TypeChooser, TypeGrid } from '@/admin/components/discounts/TypeChooser';
import { HistoryCard, PerformanceCard, SummaryCard } from '@/admin/components/discounts/Summary';
import { Tester } from '@/admin/components/discounts/Tester';
import { useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { discountClass, discountState, isDuplicateCode, normalizeCode } from '@/lib/discounts';
import { segmentMembers, segmentSubjects } from '@/lib/crm';
import type { Discount, DiscountClass, DiscountKind } from '@/lib/types';
import { cn } from '@/lib/utils';

type Errors = Partial<Record<'code' | 'value' | 'applies' | 'buy' | 'get' | 'getValue' | 'buyQty' | 'getQty' | 'zones' | 'minimum' | 'segment' | 'usageLimit' | 'start' | 'end', string>>;
const CLASSES: DiscountClass[] = ['products', 'order', 'shipping'];

/* ================================================================== */
/* Route wrapper: not found / type chooser / editor                    */
/* ================================================================== */
export default function DiscountEdit() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const t = useDict(dd, 'admin');
  const ta = useDict(adm, 'admin');
  const can = useCan();
  const discounts = useDb((s) => s.discounts);
  const isNew = id === 'novi';
  const existing = isNew ? undefined : discounts.find((d) => d.id === id);
  const kindParam = params.get('lloji');
  const crumbs = [{ label: ta('nav_discounts'), to: '/admin/popusti' }];

  if (!isNew && !existing)
    return (
      <div className="pb-24">
        <PageHeader back="/admin/popusti" breadcrumbs={[...crumbs, t('notFoundTitle')]} title={t('notFoundTitle')} />
        <Card>
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-canvas text-ink-soft ring-1 ring-inset ring-line">
              <FileQuestion className="h-5 w-5" />
            </div>
            <p className="max-w-sm text-[13.5px] text-muted">{t('notFoundText')}</p>
            <ButtonLink to="/admin/popusti" variant="outline" shape="rounded" size="sm" className="mt-5">
              {t('backToList')}
            </ButtonLink>
          </div>
        </Card>
      </div>
    );

  if (isNew && (!isKind(kindParam) || !can('discounts', 'edit')))
    return (
      <div className="pb-24">
        <PageHeader back="/admin/popusti" breadcrumbs={[...crumbs, t('crumbCreate')]} title={t('chooseTitle')} description={t('chooseText')} />
        {can('discounts', 'edit') ? <TypeGrid onChoose={(k) => setParams({ lloji: k }, { replace: true })} className="max-w-4xl" /> : <Note icon={<ShieldAlert className="h-3.5 w-3.5" />}>{t('readOnly')}</Note>}
      </div>
    );

  const initial = existing ?? newDiscount(kindParam as DiscountKind);
  return <Editor key={existing?.id ?? `new-${kindParam}`} initial={initial} isNew={isNew} />;
}

/* ================================================================== */
/* Validation                                                          */
/* ================================================================== */
type TFn = (key: keyof typeof dd.me & string, vars?: Record<string, string | number>) => string;

function validate(d: Discount, all: Discount[], t: TFn): Errors {
  const e: Errors = {};
  if (d.method === 'code') {
    const c = normalizeCode(d.code);
    if (!c) e.code = t('codeRequired');
    else if (!CODE_RE.test(c)) e.code = t('codeInvalid');
    else if (isDuplicateCode(c, all, d.id)) e.code = t('codeDuplicate', { name: all.find((x) => x.id !== d.id && x.method === 'code' && normalizeCode(x.code) === c)?.title ?? c });
  }
  if (d.kind === 'products' || d.kind === 'order') {
    if (d.valueType === 'percent' && !(d.value > 0 && d.value <= 100)) e.value = t('valueErrPct');
    if (d.valueType === 'fixed' && !(d.value > 0)) e.value = t('valueErrFixed');
    if (d.appliesTo.scope !== 'all' && !d.appliesTo.ids.length) e.applies = t('pickRequired');
  }
  if (d.kind === 'bxgy') {
    const b = d.bxgy;
    if (!b?.buyIds.length) e.buy = t('pickRequired');
    if (!b?.getIds.length) e.get = t('pickRequired');
    if (!(b && b.buyQty >= 1)) e.buyQty = t('limitErr');
    if (!(b && b.getQty >= 1)) e.getQty = t('limitErr');
    if (b?.getType === 'percent' && !(b.getValue > 0 && b.getValue <= 100)) e.getValue = t('valueErrPct');
  }
  if (d.minimum.type !== 'none' && !(d.minimum.value > 0)) e.minimum = t('minErr');
  if (d.audience.type === 'segment' && !d.audience.segmentId) e.segment = t('segmentRequired');
  if (d.method === 'code' && d.usageLimit !== undefined && !(d.usageLimit > 0)) e.usageLimit = t('limitErr');
  if (!d.startsAt || Number.isNaN(new Date(d.startsAt).getTime())) e.start = t('startErr');
  if (d.endsAt !== undefined && (!d.endsAt || (d.startsAt && new Date(d.endsAt).getTime() <= new Date(d.startsAt).getTime()))) e.end = t('endErr');
  return e;
}

/** Shipping zones: [] = every zone; the editor keeps a separate "some" mode until zones are ticked. */
const zonesMode = (d: Discount) => ((d.shipping?.zoneIds ?? []).length ? 'some' : 'all');

/* ================================================================== */
/* Editor                                                              */
/* ================================================================== */
function Editor({ initial, isNew }: { initial: Discount; isNew: boolean }) {
  const t = useDict(dd, 'admin');
  const ta = useDict(adm, 'admin');
  const x = useDiscountText();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const can = useCan();
  const canEdit = can('discounts', 'edit');
  const canPublish = can('discounts', 'publish');
  const canDelete = can('discounts', 'delete');

  const discounts = useDb((s) => s.discounts);
  const segments = useDb((s) => s.segments);
  const orders = useDb((s) => s.orders);
  const zones = useDb((s) => s.settings.shippingZones);
  const upsert = useDb((s) => s.upsert);
  const removeItem = useDb((s) => s.remove);

  const [d, setD] = useState<Discount>(initial);
  const [saved, setSaved] = useState<Discount>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  // "Zona të caktuara" chosen but nothing ticked yet
  const [zonesSome, setZonesSome] = useState(zonesMode(initial) === 'some');

  const set = (patch: Partial<Discount>) => setD((p) => ({ ...p, ...patch }));
  const setB = (patch: Partial<NonNullable<Discount['bxgy']>>) => setD((p) => ({ ...p, bxgy: { ...(p.bxgy ?? newDiscount('bxgy').bxgy!), ...patch } }));

  const dirty = isNew || JSON.stringify(d) !== JSON.stringify(saved);
  const others = useMemo(() => discounts.filter((o) => o.id !== d.id), [discounts, d.id]);
  const allErrors = useMemo(() => {
    const e = validate(d, discounts, t);
    if (d.kind === 'shipping' && zonesSome && !(d.shipping?.zoneIds ?? []).length) e.zones = t('zonesRequired');
    return e;
  }, [d, discounts, t, zonesSome]);
  // duplicate / invalid code is shown live; everything else after the first save attempt
  const errors: Errors = showErrors ? allErrors : allErrors.code && normalizeCode(d.code) ? { code: allErrors.code } : {};
  const state = discountState(d);
  const perf = useMemo(() => perfByDiscount(orders).get(d.id), [orders, d.id]);
  const subjects = useMemo(() => segmentSubjects(orders), [orders]);
  const segCount = (id?: string) => {
    const s = segments.find((x2) => x2.id === id);
    return s ? segmentMembers(s, subjects).length : 0;
  };
  const tz = x.tz;
  const KindIcon = KIND_ICON[d.kind];
  const own = discountClass(d);
  const code = normalizeCode(d.code);

  /* ---------------------------- save / discard ---------------------------- */
  const fallbackTitle = (v: Discount) => (v.method === 'code' && normalizeCode(v.code) ? normalizeCode(v.code) : `${x.kind(v.kind)} ${x.value(v)}`);
  const clean = (v: Discount): Discount => {
    const title = v.title.trim() || fallbackTitle(v);
    const pub = v.publicTitle;
    const out: Discount = {
      ...v,
      title,
      publicTitle: pub.me.trim() || pub.sq.trim() || pub.en.trim() ? pub : { me: title, sq: title, en: title },
      code: v.method === 'code' ? normalizeCode(v.code) : undefined,
      tags: (v.tags ?? []).map((s) => s.trim()).filter(Boolean),
    };
    if (v.kind !== 'bxgy') delete out.bxgy;
    if (v.kind !== 'shipping') delete out.shipping;
    if (v.kind !== 'products') out.perItem = false;
    if (v.kind === 'bxgy' || v.kind === 'shipping') {
      out.appliesTo = { scope: 'all', ids: [] };
      out.valueType = 'percent';
      out.value = v.kind === 'bxgy' ? (v.bxgy?.getType === 'percent' ? v.bxgy.getValue : 100) : 100;
    }
    if (v.kind === 'shipping') out.combines = { ...v.combines, shipping: false };
    if (v.method === 'auto') {
      delete out.usageLimit;
      out.oncePerCustomer = false;
    }
    if (!canPublish) out.status = isNew ? 'draft' : saved.status;
    return out;
  };

  const save = () => {
    if (!canEdit) return;
    setShowErrors(true);
    if (Object.keys(allErrors).length) {
      toast.error(t('fixErrors'));
      requestAnimationFrame(() => document.querySelector('[data-error="true"], [aria-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    const out = clean(d);
    upsert('discounts', out);
    setSaved(out);
    setD(out);
    setShowErrors(false);
    if (isNew) {
      toast.success(canPublish ? t('savedNew') : t('savedPending'), { description: out.method === 'code' ? out.code : out.title });
      navigate(`/admin/popusti/${out.id}`, { replace: true });
    } else toast.success(ta('saved'), { description: out.method === 'code' ? out.code : out.title });
  };
  const discard = () => {
    if (isNew) return navigate('/admin/popusti');
    setD(saved);
    setZonesSome(zonesMode(saved) === 'some');
    setShowErrors(false);
  };
  const duplicate = () => {
    const id = `d-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
    const copy: Discount = { ...structuredClone(saved), id, title: `${saved.title}${t('copySuffix')}`, code: saved.method === 'code' ? generateCode({ ...saved, id }, discounts, saved.code) : undefined, status: 'draft', uses: 0, createdAt: new Date().toISOString() };
    upsert('discounts', copy);
    toast.success(t('duplicated'), { description: copy.method === 'code' ? copy.code : copy.title });
    navigate(`/admin/popusti/${id}`);
  };
  const remove = async () => {
    if (!(await confirmDialog({ title: t('deleteTitle', { name: saved.method === 'code' ? normalizeCode(saved.code) : saved.title }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true }))) return;
    removeItem('discounts', saved.id);
    toast.success(t('deletedToast'), { description: saved.title });
    navigate('/admin/popusti');
  };
  const changeType = (k: DiscountKind) => {
    setTypeOpen(false);
    if (k === d.kind) return;
    const fresh = newDiscount(k);
    setD((p) => ({ ...fresh, id: p.id, title: p.title, publicTitle: p.publicTitle, method: p.method, code: p.code, startsAt: p.startsAt, endsAt: p.endsAt, status: p.status, tags: p.tags, createdAt: p.createdAt }));
    setZonesSome(false);
    setParams({ lloji: k }, { replace: true });
  };

  /* ---------------------------- header ---------------------------- */
  const headTitle = isNew ? t('titleCreate') : saved.method === 'code' ? normalizeCode(saved.code) || saved.title : saved.title;
  const actions = (
    <>
      {!isNew && canEdit && (
        <Button variant="outline" shape="rounded" size="sm" icon={<Shapes className="h-4 w-4" />} onClick={duplicate}>
          {ta('duplicate')}
        </Button>
      )}
      {!isNew && (
        <WithTip tip={canDelete ? undefined : t('noDeletePerm')}>
          <Button variant="outline" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={remove} disabled={!canDelete} aria-label={ta('delete')}>
            <span className="max-sm:sr-only">{ta('delete')}</span>
          </Button>
        </WithTip>
      )}
      {canEdit && (
        <Button shape="rounded" size="sm" onClick={save} disabled={!dirty} className="min-w-[88px]">
          {ta('save')}
        </Button>
      )}
    </>
  );

  /* ---------------------------- small renderers ---------------------------- */
  const minimumBase = t(`base_${d.kind}`);
  const combineLabel = (c: DiscountClass) => (c === own && c !== 'shipping' ? t(c === 'products' ? 'cb_productsOther' : 'cb_orderOther') : t(`cb_${c}`));
  const combineHint = (c: DiscountClass) => (c === 'shipping' && own === 'shipping' ? t('cbHint_shippingNever') : t(`cbHint_${c}`));
  const cls = x.cls;
  const mutual = useMemo(() => {
    const now = Date.now();
    return others
      .map((o) => ({ o, st: discountState(o, now) }))
      .filter(({ st }) => st === 'active' || st === 'scheduled')
      .map(({ o, st }) => {
        const oc = discountClass(o);
        let ok = false;
        let why = '';
        if (own === 'shipping' && oc === 'shipping') why = t('mutualNoShip');
        else if (!d.combines[oc]) why = t('mutualNoThis', { c: cls(oc) });
        else if (!o.combines[own]) why = t('mutualNoOther', { c: cls(own) });
        else ok = true;
        return { o, st, ok, why };
      });
  }, [others, own, d.combines, t, cls]);

  return (
    <div className="pb-28">
      <PageHeader
        back="/admin/popusti"
        breadcrumbs={[{ label: ta('nav_discounts'), to: '/admin/popusti' }, isNew ? t('crumbCreate') : headTitle]}
        title={<span className={cn(!isNew && saved.method === 'code' && 'font-mono tracking-wide')}>{headTitle}</span>}
        badge={!isNew ? <StatePill state={discountState(saved)} /> : undefined}
        actions={actions}
      />

      {(!canEdit || !canPublish) && (
        <Note tone="white" className="mb-4" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
          <span className="font-semibold text-ink">{!canEdit ? t('readOnly') : t('needsApproval')}</span>
          {canEdit && <> — {t('noPublishPerm')}</>}
        </Note>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-5">
        <fieldset disabled={!canEdit} className="min-w-0 space-y-4">
          {/* ------------------------------ type + method + identity ------------------------------ */}
          <Card
            title={
              <span className="flex items-center gap-2">
                <KindIcon className="h-4 w-4 text-muted" />
                {x.kind(d.kind)}
              </span>
            }
            description={t(`kindHint_${d.kind}`)}
            actions={
              isNew && (
                <button type="button" onClick={() => setTypeOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-canvas hover:text-ink">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="max-sm:hidden">{t('changeType')}</span>
                </button>
              )
            }
          >
            <div className="space-y-4">
              <div>
                <Segmented
                  ariaLabel={t('col_method')}
                  value={d.method}
                  onChange={(m) => set({ method: m })}
                  options={[
                    { id: 'code', label: t('m_code') },
                    { id: 'auto', label: t('m_auto') },
                  ]}
                />
                <FHint>{d.method === 'code' ? t('mHint_code') : t('mHint_auto')}</FHint>
              </div>

              {d.method === 'code' && (
                <div data-error={!!errors.code || undefined}>
                  <FLabel htmlFor="disc-code">{t('code')}</FLabel>
                  <div className="flex gap-2">
                    <input
                      id="disc-code"
                      value={d.code ?? ''}
                      onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                      placeholder="MIFTARI10"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={!!errors.code || undefined}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 font-mono text-[15px] font-semibold uppercase tracking-wide text-ink outline-none transition placeholder:font-normal placeholder:text-muted/60 focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas aria-[invalid=true]:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => set({ code: generateCode(d, discounts, d.code) })}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink/35 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t('generate')}
                    </button>
                  </div>
                  {errors.code ? (
                    <FHint error>
                      <span className="inline-flex items-center gap-1">
                        <X className="h-3.5 w-3.5" strokeWidth={2.6} />
                        {errors.code}
                      </span>
                    </FHint>
                  ) : code && CODE_RE.test(code) ? (
                    <FHint>
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
                        {t('codeFree', { code })}
                      </span>{' '}
                      · {t('codeHint')}
                    </FHint>
                  ) : (
                    <FHint>{t('codeHint')}</FHint>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <TextField label={t('internalTitle')} hint={t('internalHint')} value={d.title} placeholder={fallbackTitle(d)} onChange={(e) => set({ title: e.target.value })} />
                <L10nInput label={t('publicTitle')} hint={t('publicHint')} value={d.publicTitle} onChange={(v) => set({ publicTitle: v })} />
              </div>
            </div>
          </Card>

          {/* ------------------------------ value + applies to ------------------------------ */}
          {(d.kind === 'products' || d.kind === 'order') && (
            <Card title={t('sec_value')}>
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start" data-error={!!errors.value || undefined}>
                  <Segmented
                    className="self-start"
                    value={d.valueType}
                    onChange={(v) => set({ valueType: v, value: v === 'percent' ? Math.min(100, d.value) : d.value })}
                    options={[
                      { id: 'percent', label: `${t('vt_percent')} %` },
                      { id: 'fixed', label: `${t('vt_fixed')} €` },
                    ]}
                  />
                  <NumberField
                    wrapClassName="sm:w-44"
                    aria-label={t('sec_value')}
                    value={d.value}
                    min={0}
                    max={d.valueType === 'percent' ? 100 : undefined}
                    suffix={d.valueType === 'percent' ? '%' : '€'}
                    onChange={(v) => set({ value: v ?? 0 })}
                    error={errors.value}
                  />
                </div>
                {d.kind === 'products' && d.valueType === 'fixed' && (
                  <div role="radiogroup" className="grid gap-1 sm:grid-cols-2">
                    <Choice checked={!!d.perItem} onSelect={() => set({ perItem: true })} label={t('perItem')} description={t('perItemHint')} />
                    <Choice checked={!d.perItem} onSelect={() => set({ perItem: false })} label={t('perOrder')} description={t('perOrderHint')} />
                  </div>
                )}
                {d.valueType === 'fixed' && <Note>{t('neverNegative')}</Note>}

                <div className="border-t border-line/70 pt-4">
                  <FLabel>{t('sec_applies')}</FLabel>
                  <div role="radiogroup" className="space-y-0.5" data-error={!!errors.applies || undefined}>
                    <Choice checked={d.appliesTo.scope === 'all'} onSelect={() => set({ appliesTo: { scope: 'all', ids: [] } })} label={t('sc_all')} />
                    <Choice checked={d.appliesTo.scope === 'collections'} onSelect={() => set({ appliesTo: { scope: 'collections', ids: d.appliesTo.scope === 'collections' ? d.appliesTo.ids : [] } })} label={t('sc_collections')}>
                      <ScopePicker kind="collections" ids={d.appliesTo.ids} onChange={(ids) => set({ appliesTo: { scope: 'collections', ids } })} error={errors.applies} />
                    </Choice>
                    <Choice checked={d.appliesTo.scope === 'products'} onSelect={() => set({ appliesTo: { scope: 'products', ids: d.appliesTo.scope === 'products' ? d.appliesTo.ids : [] } })} label={t('sc_products')}>
                      <ScopePicker kind="products" ids={d.appliesTo.ids} onChange={(ids) => set({ appliesTo: { scope: 'products', ids } })} error={errors.applies} />
                    </Choice>
                  </div>
                  {d.kind === 'order' && <FHint>{t('appliesOrderHint')}</FHint>}
                </div>
              </div>
            </Card>
          )}

          {/* ------------------------------ BXGY ------------------------------ */}
          {d.kind === 'bxgy' && d.bxgy && (
            <>
              <Card title={t('sec_buys')}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <NumberField wrapClassName="sm:w-40" label={t('qtyX')} value={d.bxgy.buyQty} min={1} step={1} suffix={t('itemsUnit')} onChange={(v) => setB({ buyQty: Math.floor(v ?? 0) })} error={errors.buyQty} />
                    <div>
                      <FLabel>{t('scopeFrom')}</FLabel>
                      <Segmented
                        value={d.bxgy.buyScope}
                        onChange={(v) => setB({ buyScope: v, buyIds: [] })}
                        options={[
                          { id: 'products', label: t('sc_products') },
                          { id: 'collections', label: t('sc_collections') },
                        ]}
                      />
                    </div>
                  </div>
                  <div data-error={!!errors.buy || undefined}>
                    <ScopePicker kind={d.bxgy.buyScope} ids={d.bxgy.buyIds} onChange={(ids) => setB({ buyIds: ids })} error={errors.buy} />
                  </div>
                </div>
              </Card>
              <Card title={t('sec_gets')}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <NumberField wrapClassName="sm:w-40" label={t('qtyY')} value={d.bxgy.getQty} min={1} step={1} suffix={t('itemsUnit')} onChange={(v) => setB({ getQty: Math.floor(v ?? 0) })} error={errors.getQty} />
                    <div>
                      <FLabel>{t('scopeFrom')}</FLabel>
                      <Segmented
                        value={d.bxgy.getScope}
                        onChange={(v) => setB({ getScope: v, getIds: [] })}
                        options={[
                          { id: 'products', label: t('sc_products') },
                          { id: 'collections', label: t('sc_collections') },
                        ]}
                      />
                    </div>
                  </div>
                  <div data-error={!!errors.get || undefined}>
                    <ScopePicker kind={d.bxgy.getScope} ids={d.bxgy.getIds} onChange={(ids) => setB({ getIds: ids })} error={errors.get} />
                  </div>
                  <div className="grid gap-4 border-t border-line/70 pt-4 md:grid-cols-2">
                    <div>
                      <FLabel>{t('getDiscount')}</FLabel>
                      <div role="radiogroup" className="space-y-0.5">
                        <Choice checked={d.bxgy.getType === 'free'} onSelect={() => setB({ getType: 'free', getValue: 100 })} label={t('getFree')} />
                        <Choice checked={d.bxgy.getType === 'percent'} onSelect={() => setB({ getType: 'percent', getValue: d.bxgy?.getType === 'percent' ? d.bxgy.getValue : 50 })} label={t('getPercent')}>
                          <NumberField wrapClassName="w-36" aria-label={t('getPercent')} value={d.bxgy.getValue} min={1} max={100} suffix="%" onChange={(v) => setB({ getValue: v ?? 0 })} error={errors.getValue} />
                        </Choice>
                      </div>
                    </div>
                    <NumberField label={t('maxUses')} hint={t('maxUsesHint')} value={d.bxgy.maxUses} min={0} step={1} onChange={(v) => setB({ maxUses: Math.max(0, Math.floor(v ?? 0)) })} wrapClassName="md:max-w-[220px]" />
                  </div>
                  <Note>
                    <p className="font-medium text-ink">{t('bxgyManualNote')}</p>
                    <p className="mt-1">{t('bxgyUnitNote')}</p>
                  </Note>
                </div>
              </Card>
            </>
          )}

          {/* ------------------------------ shipping ------------------------------ */}
          {d.kind === 'shipping' && (
            <Card title={t('sec_shipping')}>
              <div className="space-y-4">
                <div role="radiogroup" className="space-y-0.5" data-error={!!errors.zones || undefined}>
                  <Choice
                    checked={!zonesSome}
                    onSelect={() => {
                      setZonesSome(false);
                      set({ shipping: { ...d.shipping, zoneIds: [] } });
                    }}
                    label={t('zonesAll')}
                  />
                  <Choice checked={zonesSome} onSelect={() => setZonesSome(true)} label={t('zonesSome')}>
                    <div className="space-y-0.5 rounded-lg border border-line px-3 py-2">
                      {zones.map((z) => {
                        const ids = d.shipping?.zoneIds ?? [];
                        const on = ids.includes(z.id);
                        return (
                          <Tick
                            key={z.id}
                            checked={on}
                            onChange={(v) => set({ shipping: { ...d.shipping, zoneIds: v ? [...ids, z.id] : ids.filter((i) => i !== z.id) } })}
                            label={z.name}
                            description={t('zoneFee', { fee: x.eur(z.fee), days: z.days })}
                          />
                        );
                      })}
                    </div>
                    {errors.zones && <FHint error>{errors.zones}</FHint>}
                  </Choice>
                </div>
                <NumberField
                  wrapClassName="sm:max-w-[240px]"
                  label={t('maxRate')}
                  hint={t('maxRateHint')}
                  value={d.shipping?.maxRate}
                  allowEmpty
                  min={0}
                  suffix="€"
                  onChange={(v) => set({ shipping: { ...d.shipping, maxRate: v && v > 0 ? v : undefined } })}
                />
                <Note>{t('shippingNote')}</Note>
              </div>
            </Card>
          )}

          {/* ------------------------------ minimum ------------------------------ */}
          <Card title={t('sec_minimum')}>
            <div className="space-y-3">
              <div role="radiogroup" className="space-y-0.5" data-error={!!errors.minimum || undefined}>
                <Choice checked={d.minimum.type === 'none'} onSelect={() => set({ minimum: { type: 'none', value: 0 } })} label={t('min_none')} />
                <Choice checked={d.minimum.type === 'amount'} onSelect={() => set({ minimum: { type: 'amount', value: d.minimum.type === 'amount' ? d.minimum.value : 100 } })} label={t('min_amount')}>
                  <NumberField wrapClassName="w-44" aria-label={t('min_amount')} value={d.minimum.value} min={0} suffix="€" onChange={(v) => set({ minimum: { type: 'amount', value: v ?? 0 } })} error={errors.minimum} />
                </Choice>
                <Choice checked={d.minimum.type === 'qty'} onSelect={() => set({ minimum: { type: 'qty', value: d.minimum.type === 'qty' ? d.minimum.value : 2 } })} label={t('min_qty')}>
                  <NumberField wrapClassName="w-44" aria-label={t('min_qty')} value={d.minimum.value} min={1} step={1} suffix={t('itemsUnit')} onChange={(v) => set({ minimum: { type: 'qty', value: Math.floor(v ?? 0) } })} error={errors.minimum} />
                </Choice>
              </div>
              <Note>
                <p className="font-medium text-ink">{minimumBase}</p>
                <p className="mt-0.5">{t('baseExtra')}</p>
              </Note>
            </div>
          </Card>

          {/* ------------------------------ audience ------------------------------ */}
          <Card title={t('sec_audience')}>
            <div className="space-y-3">
              <div role="radiogroup" className="space-y-0.5" data-error={!!errors.segment || undefined}>
                <Choice checked={d.audience.type === 'all'} onSelect={() => set({ audience: { type: 'all' } })} label={t('aud_all')} />
                <Choice checked={d.audience.type === 'segment'} onSelect={() => set({ audience: { type: 'segment', segmentId: d.audience.segmentId ?? segments[0]?.id } })} label={t('aud_segment')}>
                  <SelectField
                    wrapClassName="max-w-sm"
                    aria-label={t('aud_segment')}
                    value={d.audience.segmentId ?? ''}
                    onChange={(e) => set({ audience: { type: 'segment', segmentId: e.target.value || undefined } })}
                    error={errors.segment}
                    hint={d.audience.segmentId ? t('segmentMembers', { n: segCount(d.audience.segmentId) }) : undefined}
                  >
                    <option value="">{t('segmentPh')}</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {x.l(s.name)}
                      </option>
                    ))}
                  </SelectField>
                </Choice>
              </div>
              <FHint className="mt-0">{t('guestNote')}</FHint>
            </div>
          </Card>

          {/* ------------------------------ combinations ------------------------------ */}
          <Card title={t('sec_combine')} description={t('combineIntro')}>
            <div className="space-y-4">
              <div className="grid gap-x-6 gap-y-1 md:grid-cols-3">
                {CLASSES.map((c) => {
                  const never = c === 'shipping' && own === 'shipping';
                  return (
                    <Tick
                      key={c}
                      checked={!never && d.combines[c]}
                      disabled={never}
                      title={never ? t('cbHint_shippingNever') : undefined}
                      onChange={(v) => set({ combines: { ...d.combines, [c]: v } })}
                      label={combineLabel(c)}
                      description={combineHint(c)}
                    />
                  );
                })}
              </div>
              <Note>{t('mutualNote')}</Note>
              <div>
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">{t('mutualCheck')}</div>
                {mutual.length === 0 ? (
                  <p className="text-[13px] text-muted">{t('mutualNone')}</p>
                ) : (
                  <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line">
                    {mutual.map(({ o, st, ok, why }) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                        <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full', ok ? 'bg-emerald-600 text-white' : 'bg-canvas text-ink ring-1 ring-inset ring-ink/15')} aria-hidden>
                          {ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('font-semibold text-ink', o.method === 'code' && 'font-mono')}>{o.method === 'code' ? normalizeCode(o.code) : o.title}</span>
                          <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-muted">
                            <StateSymbol state={st} className="h-3 w-3" />
                            {x.kind(o.kind)}
                          </span>
                        </span>
                        <span className={cn('text-[12.5px]', ok ? 'font-medium text-emerald-800' : 'text-ink-soft')}>{ok ? t('mutualYes') : why}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Card>

          {/* ------------------------------ usage limits ------------------------------ */}
          <Card title={t('sec_usage')}>
            {d.method === 'auto' ? (
              <Note>{t('autoNoLimits')}</Note>
            ) : (
              <div className="space-y-2" data-error={!!errors.usageLimit || undefined}>
                <Tick
                  checked={d.usageLimit !== undefined}
                  onChange={(v) => set({ usageLimit: v ? Math.max(100, d.uses + 50) : undefined })}
                  label={t('limitTotal')}
                  description={t('limitTotalHint', { n: d.uses })}
                />
                {d.usageLimit !== undefined && (
                  <NumberField wrapClassName="ml-[26px] w-44" aria-label={t('limitTotal')} value={d.usageLimit} min={1} step={1} onChange={(v) => set({ usageLimit: v === undefined ? 0 : Math.floor(v) })} error={errors.usageLimit} />
                )}
                <Tick checked={!!d.oncePerCustomer} onChange={(v) => set({ oncePerCustomer: v })} label={t('oncePerCustomer')} description={t('oncePerCustomerHint')} />
              </div>
            )}
          </Card>

          {/* ------------------------------ schedule ------------------------------ */}
          <Card title={t('sec_schedule')}>
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <DateTime label={t('startsAt')} value={isoToZoned(d.startsAt, tz)} onChange={(v) => set({ startsAt: zonedToIso(v, tz) ?? '' })} error={errors.start} />
                {d.endsAt !== undefined ? (
                  <DateTime label={t('endsAt')} value={isoToZoned(d.endsAt, tz)} onChange={(v) => set({ endsAt: zonedToIso(v, tz) ?? '' })} error={errors.end} min={isoToZoned(d.startsAt, tz)} />
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
              <Tick
                checked={d.endsAt !== undefined}
                onChange={(v) => {
                  if (!v) return set({ endsAt: undefined });
                  const start = new Date(d.startsAt || Date.now());
                  const end = new Date(Math.max(start.getTime(), Date.now()) + 14 * 86400000);
                  set({ endsAt: zonedToIso(`${isoToZoned(end.toISOString(), tz).slice(0, 10)}T23:59`, tz) });
                }}
                label={t('setEnd')}
              />
              <FHint className="mt-0">{t('tzNote', { tz: tzLabel(tz) })}</FHint>
            </div>
          </Card>

          {/* ------------------------------ status + tags ------------------------------ */}
          <Card title={t('sec_status')}>
            <div className="space-y-4">
              <div role="radiogroup" className="grid gap-1 md:grid-cols-3">
                {(['active', 'draft', 'paused'] as const).map((s) => (
                  <Choice
                    key={s}
                    checked={d.status === s}
                    onSelect={() => set({ status: s })}
                    disabled={!canPublish}
                    title={!canPublish ? t('noPublishPerm') : undefined}
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <StateSymbol state={s} className={s === 'active' ? 'h-1.5 w-1.5' : 'h-3 w-3'} />
                        {x.state(s)}
                      </span>
                    }
                    description={t(`status_${s}_hint`)}
                  />
                ))}
              </div>
              {d.status === 'active' && state === 'scheduled' && <Note>{t('derived_scheduled', { d: fmtDate(d.startsAt, x.lang, tz, true) })}</Note>}
              {d.status === 'active' && state === 'expired' && d.endsAt && <Note>{t('derived_expired', { d: fmtDate(d.endsAt, x.lang, tz, true) })}</Note>}
              <div className="border-t border-line/70 pt-4">
                <TextField
                  label={t('sec_tags')}
                  hint={t('tagsHint')}
                  placeholder={t('tagsPh')}
                  value={(d.tags ?? []).join(', ')}
                  onChange={(e) => set({ tags: e.target.value.split(',').map((s, i, a) => (i === a.length - 1 ? s.trimStart() : s.trim())) })}
                />
              </div>
            </div>
          </Card>
        </fieldset>

        {/* ------------------------------ right column ------------------------------ */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-[76px]">
          <SummaryCard d={d} state={state} onTest={() => setTestOpen(true)} />
          {!isNew && <PerformanceCard d={saved} perf={perf} />}
          {!isNew && <HistoryCard id={saved.id} />}
          {!isNew && saved.method === 'code' && saved.code && (
            <CopyRow code={normalizeCode(saved.code)} />
          )}
        </aside>
      </div>

      {canEdit && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
      <Tester open={testOpen} onClose={() => setTestOpen(false)} draft={d} />
      <TypeChooser open={typeOpen} onClose={() => setTypeOpen(false)} onChoose={changeType} />
    </div>
  );
}

/* ================================================================== */
/* Small parts                                                         */
/* ================================================================== */
function DateTime({ label, value, onChange, error, min }: { label: ReactNode; value: string; onChange: (v: string) => void; error?: string; min?: string }) {
  return (
    <div data-error={!!error || undefined}>
      <FLabel>{label}</FLabel>
      <input
        type="datetime-local"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error || undefined}
        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] tabular-nums text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas aria-[invalid=true]:border-red-500"
      />
      {error && <FHint error>{error}</FHint>}
    </div>
  );
}

function CopyRow({ code }: { code: string }) {
  const t = useDict(dd, 'admin');
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (!(await copyToClipboard(code))) return;
        setDone(true);
        toast.success(t('codeCopied', { code }));
        window.setTimeout(() => setDone(false), 1500);
      }}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-line/80 bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:border-ink/25"
    >
      <span className="min-w-0">
        <span className="block text-[12px] text-muted">{t('copyCode')}</span>
        <span className="block truncate font-mono text-[14px] font-semibold tracking-wide text-ink">{code}</span>
      </span>
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted" />}
    </button>
  );
}
