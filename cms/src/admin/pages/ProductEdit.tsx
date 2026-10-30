import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, Check, Copy, ExternalLink, Keyboard, Lock, PackageSearch, Trash2 } from 'lucide-react';
import { Button, ButtonLink, buttonClass } from '@/components/ui/Button';
import { FieldError } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { GalleryField } from '@/admin/components/media';
import { pd } from '@/admin/components/products/dict';
import { RowMenu, StatusLabel, missingCounts, type MenuItem } from '@/admin/components/products/parts';
import { PricingCard } from '@/admin/components/products/PricingCard';
import { VariantsCard } from '@/admin/components/products/VariantsCard';
import { SpecsEditor } from '@/admin/components/products/SpecsEditor';
import { SeoCard } from '@/admin/components/products/SeoCard';
import { DisplayCard, InstallCard, OrganizationCard, PublishingCard, ShippingCard, StatusCard, TemplateCard } from '@/admin/components/products/EditorCards';
import { DeleteDialog } from '@/admin/components/products/DeleteDialog';
import {
  MAX_TRACKED, applyPricing, defaultVariants, distinct, isTracked, missingForPublish, pricingOf, skusOf, syncVariants, uniqueSlug, variantSku, variantsOf,
  type ProductX, type Variant,
} from '@/admin/components/products/model';
import { ProductCard } from '@/admin/shell/card/ProductCard';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useCategories } from '@/store/hooks';
import { inCollection } from '@/lib/collections';
import { UNTRACKED_STOCK } from '@/lib/inventory';
import { brandVars } from '@/lib/color';
import { date, num, timeAgo } from '@/lib/format';
import type { Collection, ProductOption, ProductStatus } from '@/lib/types';
import { cn, round2, slugify, uid } from '@/lib/utils';
import { href } from '@/lib/paths';

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */
interface Form {
  p: ProductX;
  /** Çmimi — what the customer pays */
  price: number | null;
  /** Çmimi referues — compare-at (empty ≠ 0) */
  compareAt: number | null;
  variants: Variant[];
  /** manual collections that list the product */
  manualCols: string[];
  /** keep the old URL working after a slug change */
  redirect: boolean;
}

const blankProduct = (): ProductX => ({
  id: '',
  slug: '',
  sku: '',
  categoryId: '',
  name: { me: '', sq: '', en: '' },
  short: { me: '', sq: '', en: '' },
  description: { me: '', sq: '', en: '' },
  price: 0,
  salePrice: null,
  unit: 'kom',
  stock: 0,
  images: [],
  options: [],
  specs: [],
  installation: { available: false, price: 0 },
  badges: [],
  featured: false,
  status: 'draft',
  quoteOnly: false,
  leadDays: 7,
  warrantyYears: 2,
  seo: {},
  createdAt: '',
  sold: 0,
  tags: [],
  channels: ['online', 'pos'],
  template: 'standard',
  incoming: 0,
  unavailable: 0,
  shipping: { physical: true },
});

function formFrom(source: ProductX | undefined, collections: Collection[]): Form {
  const raw = source ? structuredClone(source) : blankProduct();
  const p: ProductX = {
    ...raw,
    tags: raw.tags ?? [],
    channels: raw.channels ?? ['online'],
    template: raw.template ?? (raw.quoteOnly ? 'quote' : 'standard'),
    shipping: raw.shipping ?? { physical: true },
    installation: raw.installation ?? { available: false, price: 0 },
    seo: raw.seo ?? {},
  };
  const { price, compareAt } = pricingOf(p);
  return {
    p,
    price,
    compareAt,
    variants: variantsOf(p),
    manualCols: source ? collections.filter((c) => c.kind === 'manual' && c.productIds.includes(source.id)).map((c) => c.id) : [],
    redirect: true,
  };
}

/** Form → the product as it would be stored (pricing, stock = sum of enabled variants, template ↔ quoteOnly). */
function compose(f: Form): ProductX {
  const tracked = isTracked(f.p);
  const stock = !tracked ? UNTRACKED_STOCK : f.variants.length ? f.variants.filter((v) => v.enabled).reduce((s, v) => s + v.stock, 0) : f.p.stock;
  return {
    ...f.p,
    ...applyPricing(f.price, f.compareAt),
    stock: Math.min(tracked ? MAX_TRACKED : UNTRACKED_STOCK, stock),
    quoteOnly: f.p.template === 'quote',
    variants: f.variants.length ? f.variants : undefined,
  };
}

type Errors = Partial<Record<'name' | 'price' | 'category' | 'image' | 'sku' | 'variants', string>>;

export default function ProductEdit() {
  const { id } = useParams();
  const product = useDb((s) => (id ? s.products.find((p) => p.id === id) : undefined)) as ProductX | undefined;
  const t = useDict(pd, 'admin');
  if (id && !product) {
    return (
      <div>
        <PageHeader back="/admin/proizvodi" breadcrumbs={[{ label: t('title'), to: '/admin/proizvodi' }, t('notFound')]} title={t('notFound')} />
        <Card>
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title={t('notFound')}
            text={t('notFoundText')}
            action={
              <ButtonLink to="/admin/proizvodi" variant="outline" shape="rounded" size="sm">
                {t('backToList')}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }
  // Keyed so a freshly created product (novi → /:id) remounts with its stored data.
  return <Editor key={id ?? 'new'} source={product} />;
}

function Editor({ source }: { source?: ProductX }) {
  const t = useDict(pd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const categories = useCategories();
  const allProducts = useDb((s) => s.products) as ProductX[];
  const collections = useDb((s) => s.collections);
  const settings = useDb((s) => s.settings);
  const upsertProduct = useDb((s) => s.upsertProduct);
  const duplicateProduct = useDb((s) => s.duplicateProduct);
  const isNew = !source;

  const canEdit = can('products', 'edit');
  const canPublish = can('products', 'publish');
  const canArchive = can('products', 'archive');
  const canDelete = can('products', 'delete');
  const canCost = can('products', 'viewCost');
  const canCollections = can('collections', 'edit');

  const [original, setOriginal] = useState<Form>(() => formFrom(source, collections));
  const [form, setForm] = useState<Form>(original);
  // Albanian is the source language: the URL handle follows the SQ name.
  const autoFor = (p: ProductX) => !p.slug || p.slug === slugify(p.name.sq);
  const [slugAuto, setSlugAuto] = useState(() => autoFor(original.p));
  const [tried, setTried] = useState(false);
  const [deleting, setDeleting] = useState<ProductX[]>([]);
  const lastStock = useRef(isTracked(original.p) ? original.p.stock : 0);
  const bypass = useRef(false);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);
  const setP = (patch: Partial<ProductX>) => setForm((f) => ({ ...f, p: { ...f.p, ...patch } }));
  const composed = useMemo(() => compose(form), [form]);
  const tracked = isTracked(form.p);

  /* ------------------------------ derived ------------------------------ */
  const takenSkus = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of allProducts) if (p.id !== form.p.id) for (const s of skusOf(p)) m.set(s.toUpperCase(), l(p.name));
    return m;
  }, [allProducts, form.p.id, l]);
  const missing = useMemo(() => missingForPublish(composed, categories), [composed, categories]);
  const smartMatches = useMemo(() => collections.filter((c) => c.kind === 'smart' && inCollection(c, composed)), [collections, composed]);
  const vendors = useMemo(() => distinct(allProducts.map((p) => p.vendor)), [allProducts]);
  const tagSuggestions = useMemo(() => distinct(allProducts.flatMap((p) => p.tags ?? [])), [allProducts]);
  const translations = useMemo(() => {
    const p = form.p;
    const all = [p.name, p.short, p.description, ...p.options.flatMap((o) => [o.name, ...o.values.map((v) => v.label)]), ...p.specs.flatMap((s) => [s.label, s.value])];
    return { total: all.filter((v) => v.me.trim() || v.sq.trim() || v.en.trim()).length, miss: missingCounts(all) };
  }, [form.p]);

  const validate = (f: Form): Errors => {
    const p = compose(f);
    const e: Errors = {};
    if (!p.name.sq.trim()) e.name = t('e_name');
    const own = p.sku.trim().toUpperCase();
    if (own && takenSkus.has(own)) e.sku = t('e_skuDup', { sku: p.sku.trim(), name: takenSkus.get(own) ?? '' });
    const vs = f.variants.map((v) => v.sku.trim().toUpperCase()).filter(Boolean);
    if (new Set(vs).size !== vs.length || vs.some((s) => takenSkus.has(s))) e.variants = t('e_variantSkuDup');
    if (p.status === 'active') {
      const miss = missingForPublish(p, categories);
      if (miss.includes('category')) e.category = t('req_category');
      if (miss.includes('price')) e.price = t('req_price');
      if (miss.includes('image')) e.image = t('req_image');
    }
    return e;
  };
  const errors: Errors = tried ? validate(form) : {};

  /* ------------------------------ save ------------------------------ */
  const save = (statusOverride?: ProductStatus) => {
    if (!canEdit) return;
    setTried(true);
    const f: Form = statusOverride ? { ...form, p: { ...form.p, status: statusOverride } } : form;
    const errs = validate(f);
    const next0 = compose(f);
    if (errs.name || errs.sku || errs.variants) {
      toast.error(t('fixErrors'), { description: [errs.name, errs.sku, errs.variants].filter(Boolean).join(' ') });
      document.getElementById(errs.name ? 'sec-title' : 'sec-variants')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (next0.status === 'active') {
      const miss = missingForPublish(next0, categories);
      if (miss.length) {
        toast.error(t('publishBlocked'), {
          description: t('publishBlockedText', { list: miss.map((r) => t(`req_${r}`)).join(', ') }),
          action: { label: t('saveAsDraft'), onClick: () => saveRef.current('draft') },
        });
        const first = miss[0] === 'image' ? 'sec-media' : miss[0] === 'price' ? 'sec-price' : miss[0] === 'name' ? 'sec-title' : 'sec-org';
        document.getElementById(first)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (!canPublish && source?.status !== 'active') {
        toast.error(t('noPermPublish'));
        return;
      }
    }
    const now = new Date().toISOString();
    const pid = next0.id || uid('p');
    const seo = { title: next0.seo?.title?.trim() || undefined, description: next0.seo?.description?.trim() || undefined };
    const slug = uniqueSlug(slugify(next0.slug) || slugify(next0.name.sq) || slugify(next0.name.me) || pid, pid, allProducts);
    const oldSlug = source?.slug;
    const redirects = [...(source?.redirects ?? [])];
    if (oldSlug && oldSlug !== slug && f.redirect && !redirects.includes(oldSlug)) redirects.push(oldSlug);
    const next: ProductX = {
      ...next0,
      id: pid,
      slug,
      sku: next0.sku.trim(),
      price: round2(next0.price),
      packSize: next0.unit === 'm2' ? next0.packSize || 1 : undefined,
      seo: seo.title || seo.description ? seo : undefined,
      vendor: next0.vendor?.trim() || undefined,
      redirects: redirects.filter((r) => r !== slug).length ? redirects.filter((r) => r !== slug) : undefined,
      createdAt: next0.createdAt || now,
      sold: isNew ? 0 : next0.sold,
    };
    upsertProduct(next);

    // manual collections toggled in "Organizimi"
    if (canCollections) {
      const st = useDb.getState();
      for (const c of st.collections) {
        if (c.kind !== 'manual') continue;
        const want = f.manualCols.includes(c.id);
        const has = c.productIds.includes(pid);
        if (want !== has) st.upsert('collections', { ...c, productIds: want ? [...c.productIds, pid] : c.productIds.filter((x) => x !== pid) });
      }
    }

    const stored = (useDb.getState().products.find((p) => p.id === pid) as ProductX | undefined) ?? next;
    const fresh = formFrom(stored, useDb.getState().collections);
    setOriginal(fresh);
    setForm(fresh);
    setTried(false);
    setSlugAuto(autoFor(stored));
    toast.success(isNew ? t('created') : t('saved'), { description: l(stored.name) });
    if (isNew) {
      bypass.current = true;
      navigate(`/admin/proizvodi/${pid}`, { replace: true });
    }
  };
  const discard = () => {
    setForm(original);
    setTried(false);
    setSlugAuto(autoFor(original.p));
  };

  // Ctrl/Cmd + S
  const saveRef = useRef(save);
  saveRef.current = save;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirtyRef.current || !source) saveRef.current();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [source]);

  // Guard unsaved changes (in-app navigation + tab close)
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !bypass.current && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirmDialog({ title: t('leaveTitle'), text: t('leaveText'), confirmLabel: t('leave'), danger: true }).then((ok) => (ok ? blocker.proceed() : blocker.reset()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocker.state]);
  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [dirty]);

  /* ------------------------------ handlers ------------------------------ */
  const setOptions = (options: ProductOption[]) =>
    setForm((f) => {
      const usable = options.some((o) => o.values.length);
      if (!usable) {
        const sum = f.variants.filter((v) => v.enabled).reduce((s, v) => s + v.stock, 0);
        return { ...f, p: { ...f.p, options, stock: isTracked(f.p) ? (f.variants.length ? sum : f.p.stock) : f.p.stock }, variants: [] };
      }
      const synced = f.variants.length ? syncVariants(options, f.variants, f.p.sku) : defaultVariants({ options, sku: f.p.sku, stock: f.p.stock });
      // keep automatic SKUs in step with renamed values; hand-edited SKUs stay
      const variants = synced.map((v) => (v.sku === variantSku(f.p.sku, f.p.options, v.values) ? { ...v, sku: variantSku(f.p.sku, options, v.values) } : v));
      return { ...f, p: { ...f.p, options }, variants };
    });
  const setSku = (sku: string) =>
    setForm((f) => ({
      ...f,
      p: { ...f.p, sku },
      variants: f.variants.map((v) => (v.sku === variantSku(f.p.sku, f.p.options, v.values) ? { ...v, sku: variantSku(sku, f.p.options, v.values) } : v)),
    }));
  const setTracked = (on: boolean) => {
    if (on) setP({ stock: Math.min(MAX_TRACKED, lastStock.current) });
    else {
      if (tracked) lastStock.current = form.p.stock;
      setP({ stock: UNTRACKED_STOCK });
    }
  };
  const duplicate = () => {
    if (!source) return;
    const id = duplicateProduct(source.id);
    if (!id) return;
    toast.success(t('duplicated'), { description: l(source.name) });
    navigate(`/admin/proizvodi/${id}`);
  };

  /* ------------------------------ header ------------------------------ */
  const origStatus = isNew ? null : original.p.status;
  const menu: MenuItem[] = isNew
    ? []
    : [
        { label: t('duplicate'), icon: Copy, onSelect: duplicate, disabled: !canEdit, hint: t('noPerm') },
        origStatus === 'archived'
          ? { label: t('restore'), icon: ArchiveRestore, onSelect: () => save('draft'), disabled: !canArchive, hint: t('noPerm') }
          : { label: t('archive'), icon: Archive, onSelect: () => save('archived'), disabled: !canArchive, hint: t('noPerm') },
        { label: t('delete'), icon: Trash2, onSelect: () => source && setDeleting([source]), danger: true, divider: true, disabled: !canDelete, hint: t('noPerm') },
      ];
  const headerDesc: ReactNode = isNew ? undefined : (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {original.p.sku && <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[12px] text-ink-soft ring-1 ring-line">{original.p.sku}</span>}
      <span>{t('createdOn', { date: date(original.p.createdAt, lang) })}</span>
      {original.p.updatedAt && (
        <>
          <span className="text-ink/20">•</span>
          <span>{t('updatedAgo', { ago: timeAgo(original.p.updatedAt, lang) })}</span>
        </>
      )}
      {original.p.sold > 0 && (
        <>
          <span className="text-ink/20">•</span>
          <span>{t('soldN', { n: num(original.p.sold, lang) })}</span>
        </>
      )}
    </span>
  );
  const preview = useMemo<ProductX>(() => ({ ...composed, id: composed.id || 'preview', name: composed.name.sq.trim() || composed.name.me.trim() ? composed.name : { me: t('f_title'), sq: t('f_title'), en: t('f_title') } }), [composed, t]);
  const slugChanged = !isNew && !!source?.slug && slugify(form.p.slug) !== source.slug && !!slugify(form.p.slug);

  return (
    <div className="pb-28">
      <PageHeader
        back="/admin/proizvodi"
        breadcrumbs={[{ label: t('title'), to: '/admin/proizvodi' }, l(original.p.name) || t('newTitle')]}
        title={<span className="line-clamp-2">{l(form.p.name) || t('newTitle')}</span>}
        badge={origStatus && <StatusLabel status={origStatus} />}
        description={headerDesc}
        actions={
          <>
            {!isNew && origStatus === 'active' && (
              <a href={href(`/produkt/${original.p.slug}`)} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline', size: 'sm', shape: 'rounded' })}>
                <ExternalLink className="h-4 w-4" /> <span className="max-sm:sr-only">{t('viewOnSite')}</span>
              </a>
            )}
            {menu.length > 0 && (
              <span className="rounded-lg border border-ink/15 bg-white">
                <RowMenu items={menu} label={t('moreActions')} />
              </span>
            )}
            {canEdit ? (
              <Button size="sm" shape="rounded" onClick={() => save()} disabled={!dirty && !isNew} icon={<Check className="h-4 w-4" />}>
                {t('save')}
              </Button>
            ) : (
              <span title={t('readOnly')} className="inline-flex cursor-not-allowed">
                <Button size="sm" shape="rounded" disabled icon={<Lock className="h-4 w-4" />}>
                  {t('save')}
                </Button>
              </span>
            )}
          </>
        }
      />

      {(!canEdit || origStatus === 'archived') && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
          {!canEdit ? <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> : <Archive className="mt-0.5 h-4 w-4 shrink-0 text-muted" />}
          <span>{!canEdit ? t('readOnly') : t('archivedBanner')}</span>
        </div>
      )}

      <fieldset disabled={!canEdit} className="contents">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_344px]">
          {/* ---------------------------- main ---------------------------- */}
          <div className="min-w-0 space-y-5">
            <div id="sec-title" className="scroll-mt-24">
              <Card title={t('c_title')}>
                <div className="space-y-5">
                  <div>
                    <L10nInput
                      label={t('f_title')}
                      required
                      value={form.p.name}
                      onChange={(name) => setForm((f) => ({ ...f, p: { ...f.p, name, slug: slugAuto ? slugify(name.sq) : f.p.slug } }))}
                      className={cn(errors.name && '[&_input]:border-red-500 [&_input]:ring-4 [&_input]:ring-red-500/10')}
                    />
                    <FieldError>{errors.name}</FieldError>
                  </div>
                  <L10nInput label={t('f_short')} multiline rows={2} value={form.p.short} onChange={(v) => setP({ short: v })} hint={t('f_short_h')} />
                  <L10nInput label={t('f_desc')} multiline rows={7} value={form.p.description} onChange={(v) => setP({ description: v })} hint={t('f_desc_h')} />
                </div>
              </Card>
            </div>

            <div id="sec-media" className="scroll-mt-24">
              <Card title={t('c_media')} description={t('c_media_d')} actions={form.p.images.length > 0 && <span className="text-[12.5px] font-semibold tabular-nums text-muted">{form.p.images.length}</span>}>
                <GalleryField value={form.p.images} onChange={(v) => setP({ images: v })} />
                {errors.image && <FieldError>{errors.image}</FieldError>}
              </Card>
            </div>

            <div id="sec-price" className="scroll-mt-24">
              <PricingCard
                price={form.price}
                compareAt={form.compareAt}
                cost={form.p.cost ?? null}
                unit={form.p.unit}
                packSize={form.p.packSize ?? null}
                vat={settings.vatRate}
                showCost={canCost}
                priceError={errors.price}
                onPrice={(price) => setForm((f) => ({ ...f, price }))}
                onCompareAt={(compareAt) => setForm((f) => ({ ...f, compareAt }))}
                onCost={(cost) => setP({ cost: cost ?? undefined })}
                onUnit={(unit) => setP({ unit, packSize: unit === 'm2' ? form.p.packSize || 1 : form.p.packSize })}
                onPackSize={(v) => setP({ packSize: v ?? undefined })}
              />
            </div>

            <div id="sec-variants" className="scroll-mt-24">
              <VariantsCard
                product={composed}
                options={form.p.options}
                onOptions={setOptions}
                variants={form.variants}
                onVariants={(variants) => setForm((f) => ({ ...f, variants }))}
                tracked={tracked}
                onTracked={setTracked}
                sku={form.p.sku}
                onSku={setSku}
                barcode={form.p.barcode ?? ''}
                onBarcode={(v) => setP({ barcode: v || undefined })}
                stock={form.p.stock}
                onStock={(stock) => setP({ stock })}
                takenSkus={takenSkus}
                skuError={errors.sku}
              />
              {errors.variants && <FieldError>{errors.variants}</FieldError>}
            </div>

            <SpecsEditor value={form.p.specs} onChange={(v) => setP({ specs: v })} />
            <ShippingCard value={form.p.shipping ?? { physical: true }} onChange={(shipping) => setP({ shipping })} />
            <SeoCard
              draft={composed}
              slugAuto={slugAuto}
              onSlug={(s) => {
                setSlugAuto(false);
                setP({ slug: s.toLowerCase().replace(/\s+/g, '-') });
              }}
              onResetSlug={() => {
                setSlugAuto(true);
                setP({ slug: slugify(form.p.name.sq) });
              }}
              onSeo={(seo) => setP({ seo })}
              redirectFrom={slugChanged ? source?.slug : undefined}
              redirect={form.redirect}
              onRedirect={(redirect) => setForm((f) => ({ ...f, redirect }))}
            />
          </div>

          {/* --------------------------- sidebar --------------------------- */}
          <div className="flex min-w-0 flex-col gap-5 self-stretch">
            <StatusCard status={form.p.status} original={origStatus} onStatus={(status) => setP({ status })} canPublish={canPublish} canArchive={canArchive} missing={missing} translations={translations} />
            <PublishingCard channels={form.p.channels ?? []} onChannels={(channels) => setP({ channels })} status={form.p.status} />
            <div id="sec-org" className="scroll-mt-24">
              <OrganizationCard
                categoryId={form.p.categoryId}
                onCategory={(categoryId) => setP({ categoryId })}
                categories={categories}
                categoryError={errors.category}
                vendor={form.p.vendor ?? ''}
                onVendor={(vendor) => setP({ vendor })}
                vendors={vendors}
                tags={form.p.tags ?? []}
                onTags={(tags) => setP({ tags })}
                tagSuggestions={tagSuggestions}
                collections={collections}
                manualCols={form.manualCols}
                onManualCols={(manualCols) => setForm((f) => ({ ...f, manualCols }))}
                smartMatches={smartMatches}
                canEditCollections={canCollections}
              />
            </div>
            <TemplateCard value={form.p.template ?? 'standard'} onChange={(template) => setP({ template })} />
            <InstallCard
              installation={form.p.installation ?? { available: false, price: 0 }}
              onInstallation={(installation) => setP({ installation })}
              leadDays={form.p.leadDays ?? null}
              onLeadDays={(v) => setP({ leadDays: v ?? undefined })}
              warranty={form.p.warrantyYears ?? null}
              onWarranty={(v) => setP({ warrantyYears: v ?? undefined })}
              unit={form.p.unit}
            />
            <DisplayCard badges={form.p.badges} onBadges={(badges) => setP({ badges })} featured={form.p.featured} onFeatured={(featured) => setP({ featured })} />

            <div className="lg:sticky lg:top-[76px]">
              <Card title={t('c_preview')} description={t('c_preview_d')}>
                <div className="rounded-xl bg-[#f7f3ee] px-6 py-6" style={brandVars(settings.brandColor)}>
                  <div
                    className="mx-auto max-w-[230px]"
                    onClickCapture={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <ProductCard product={preview} />
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted max-md:hidden">
                  <Keyboard className="h-3.5 w-3.5" /> {t('shortcutTip')}
                </p>
              </Card>
            </div>
          </div>
        </div>
      </fieldset>

      {canEdit && <SaveBar dirty={dirty} onSave={() => save()} onDiscard={discard} />}
      <DeleteDialog
        products={deleting}
        onClose={() => setDeleting([])}
        onDone={({ deleted }) => {
          if (source && deleted.includes(source.id)) {
            bypass.current = true;
            navigate('/admin/proizvodi');
            return;
          }
          const stored = useDb.getState().products.find((p) => p.id === source?.id) as ProductX | undefined;
          if (stored) {
            const fresh = formFrom(stored, useDb.getState().collections);
            setOriginal(fresh);
            setForm(fresh);
          }
        }}
      />
    </div>
  );
}
