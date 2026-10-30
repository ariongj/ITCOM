// Koleksionet — editor (PDF p.14): manual (editorial pick + order) or smart (rules with ALL/ANY, live preview).
// Draft/archived products never show publicly, even when they match. SaveBar + Ctrl/⌘+S, leave guard.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, Eye, EyeOff, FolderSearch, Globe, Keyboard, Link2, ListChecks, Lock, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { Button, ButtonLink, buttonClass } from '@/components/ui/Button';
import { FieldError, Switch, Textarea } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { FormField, RowMenu, SelectInput, TextInput, type MenuItem } from '@/admin/components/products/parts';
import { distinct } from '@/admin/components/products/model';
import { pd } from '@/admin/components/products/dict';
import { cd, type CdKey } from '@/admin/components/collections/dict';
import { collectionUsage, ruleText, uniqueCollectionSlug, usageCount } from '@/admin/components/collections/model';
import { RulesEditor } from '@/admin/components/collections/RulesEditor';
import { ManualList, PreviewTile, ProductPicker, PublishedLabel } from '@/admin/components/collections/ui';
import { adm } from '@/admin/i18n';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan, useCategories } from '@/store/hooks';
import { collectionProducts, inCollection } from '@/lib/collections';
import { date, money } from '@/lib/format';
import { href } from '@/lib/paths';
import type { Collection, CollectionSort, Product } from '@/lib/types';
import { cn, slugify, uid } from '@/lib/utils';

const SORTS: CollectionSort[] = ['manual', 'bestselling', 'price-asc', 'price-desc', 'newest'];
const PREVIEW = 12;

const blank = (): Collection => ({
  id: '',
  slug: '',
  title: { me: '', sq: '', en: '' },
  description: { me: '', sq: '', en: '' },
  image: '',
  kind: 'manual',
  productIds: [],
  match: 'all',
  rules: [],
  sort: 'manual',
  published: false,
  seo: {},
});

export default function CollectionEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'novi';
  const source = useDb((s) => (isNew ? undefined : s.collections.find((c) => c.id === id)));
  const t = useDict(cd, 'admin');
  const ta = useDict(adm, 'admin');
  if (!isNew && !source) {
    return (
      <div>
        <PageHeader back="/admin/kolekcije" breadcrumbs={[{ label: ta('nav_products'), to: '/admin/proizvodi' }, { label: ta('nav_collections'), to: '/admin/kolekcije' }, t('notFound')]} title={t('notFound')} />
        <Card>
          <EmptyState
            icon={<FolderSearch className="h-6 w-6" />}
            title={t('notFound')}
            text={t('notFoundText')}
            action={
              <ButtonLink to="/admin/kolekcije" variant="outline" shape="rounded" size="sm">
                {t('backToList')}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }
  // keyed so "novi" → saved id remounts with the stored data
  return <Editor key={source?.id ?? 'new'} source={source} />;
}

function Editor({ source }: { source?: Collection }) {
  const t = useDict(cd, 'admin');
  const ta = useDict(adm, 'admin');
  const tc = useDict(common, 'admin');
  const tp = useDict(pd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const categories = useCategories();
  const products = useDb((s) => s.products);
  const collections = useDb((s) => s.collections);
  const discounts = useDb((s) => s.discounts);
  const offers = useDb((s) => s.offers);
  const menus = useDb((s) => s.menus);
  const companyName = useDb((s) => s.settings.companyName);
  const adminEmail = useDb((s) => s.settings.adminEmail);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);
  const isNew = !source;

  const canEdit = can('collections', 'edit');
  const canPublish = can('collections', 'publish');
  const canDelete = can('collections', 'delete');

  const [original, setOriginal] = useState<Collection>(() => structuredClone(source ?? blank()));
  const [form, setForm] = useState<Collection>(original);
  // Albanian is the source language: the URL handle follows the SQ title.
  const autoFor = (c: Collection) => !c.slug || c.slug === slugify(c.title.sq);
  const [slugAuto, setSlugAuto] = useState(() => autoFor(original));
  const [tried, setTried] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const bypass = useRef(false);

  const set = (patch: Partial<Collection>) => setForm((f) => ({ ...f, ...patch }));
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(original), [form, original]);

  /* ------------------------------ derived ------------------------------ */
  const publicList = useMemo(() => collectionProducts(form, products, { publicOnly: true }), [form, products]);
  const hiddenList = useMemo(() => products.filter((p) => p.status !== 'active' && inCollection(form, p)), [form, products]);
  const tags = useMemo(() => distinct(products.flatMap((p) => p.tags ?? [])), [products]);
  const vendors = useMemo(() => distinct(products.map((p) => p.vendor)), [products]);
  const usage = useMemo(() => (source ? collectionUsage(source, { discounts, offers, menus }) : { discounts: [], offers: [], menus: [] }), [source, discounts, offers, menus]);
  // smart → manual: offer to keep today's active matches as the hand-picked list
  const smartMatches = useMemo(() => (form.rules.length ? collectionProducts({ ...form, kind: 'smart' }, products, { publicOnly: true }).map((p) => p.id) : []), [form, products]);
  const domain = adminEmail.split('@')[1] || 'itcom.example';

  type Errors = Partial<Record<'title' | 'slug' | 'rules', string>>;
  const validate = (f: Collection): Errors => {
    const e: Errors = {};
    if (!f.title.sq.trim()) e.title = t('e_title');
    const slug = slugify(f.slug) || slugify(f.title.sq);
    if (slug && collections.some((c) => c.slug === slug && c.id !== f.id)) e.slug = t('e_slug');
    if (f.kind === 'smart') {
      if (!f.rules.length) e.rules = t('e_noRules');
      else if (f.rules.some((r) => !r.value.trim())) e.rules = t('e_rules');
    }
    return e;
  };
  const errors: Errors = tried ? validate(form) : {};

  /* ------------------------------ save ------------------------------ */
  const save = () => {
    if (!canEdit) return;
    setTried(true);
    const errs = validate(form);
    if (Object.keys(errs).length) {
      toast.error(t('fixErrors'), { description: Object.values(errs).join(' ') });
      document.getElementById(errs.title ? 'sec-title' : errs.rules ? 'sec-rules' : 'sec-seo')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const cid = form.id || uid('col');
    const seo = { title: form.seo?.title?.trim() || undefined, description: form.seo?.description?.trim() || undefined };
    const next: Collection = {
      ...form,
      id: cid,
      slug: uniqueCollectionSlug(slugify(form.slug) || slugify(form.title.sq) || slugify(form.title.me) || cid, cid, collections),
      published: canPublish ? form.published : original.published,
      seo: seo.title || seo.description ? seo : undefined,
      createdAt: form.createdAt || new Date().toISOString(),
    };
    upsert('collections', next);
    const stored = structuredClone(useDb.getState().collections.find((c) => c.id === cid) ?? next);
    setOriginal(stored);
    setForm(stored);
    setTried(false);
    setSlugAuto(autoFor(stored));
    toast.success(isNew ? t('created') : t('saved'), { description: l(stored.title) });
    if (isNew) {
      bypass.current = true;
      navigate(`/admin/kolekcije/${cid}`, { replace: true });
    }
  };
  const discard = () => {
    setForm(original);
    setTried(false);
    setSlugAuto(autoFor(original));
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
        if (dirtyRef.current || isNew) saveRef.current();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [isNew]);

  // guard unsaved changes (in-app navigation + closing the tab)
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

  /* ------------------------------ actions ------------------------------ */
  const del = async () => {
    if (!source) return;
    const used = [...usage.discounts.map((d) => d.title), ...usage.offers.map((o) => l(o.name)), ...usage.menus.map((m) => m.title)];
    const ok = await confirmDialog({
      title: t('deleteTitle', { name: l(source.title) }),
      text: (
        <>
          {t('deleteText')}
          {used.length > 0 && <span className="mt-2 block font-semibold text-ink">{t('deleteUsed', { list: used.join(', ') })}</span>}
        </>
      ),
      confirmLabel: t('delete'),
      danger: true,
    });
    if (!ok) return;
    remove('collections', source.id);
    toast.success(t('deleted'), { description: l(source.title) });
    bypass.current = true;
    navigate('/admin/kolekcije');
  };
  const duplicate = () => {
    if (!source) return;
    const cid = uid('col');
    const sfx = (v: string, add: string) => (v.trim() ? `${v} ${add}` : v);
    const copy: Collection = {
      ...structuredClone(source),
      id: cid,
      slug: uniqueCollectionSlug(`${source.slug}-2`, cid, collections),
      title: { me: sfx(source.title.me, cd.me.copySuffix), sq: sfx(source.title.sq, cd.sq.copySuffix), en: sfx(source.title.en, cd.en.copySuffix) },
      published: false,
      createdAt: new Date().toISOString(),
    };
    upsert('collections', copy);
    toast.success(t('duplicated'), { description: l(copy.title) });
    navigate(`/admin/kolekcije/${cid}`);
  };
  const setKind = (kind: Collection['kind']) =>
    setForm((f) => {
      if (kind === f.kind) return f;
      if (kind === 'smart') return { ...f, kind, rules: f.rules.length ? f.rules : [{ field: 'category', op: 'eq', value: categories[0]?.id ?? '' }], sort: f.sort === 'manual' ? 'bestselling' : f.sort };
      return { ...f, kind };
    });

  const siteUrl = href(`/koleksioni/${original.slug}${original.published ? '' : '?preview=1'}`);
  const menu: MenuItem[] = isNew
    ? []
    : [
        { label: t('duplicate'), icon: Copy, onSelect: duplicate, disabled: !canEdit, hint: t('noPerm') },
        { label: t('delete'), icon: Trash2, onSelect: del, danger: true, divider: true, disabled: !canDelete, hint: t('noPerm') },
      ];
  const sorts = form.kind === 'smart' ? SORTS.filter((s) => s !== 'manual') : SORTS;
  const shown = showAll ? publicList : publicList.slice(0, PREVIEW);
  const ctx = { t, l, categories, badge: (b: string) => tc(`badge_${b as 'new'}`), status: (s: string) => tp(`st_${s as 'active'}`), money: (v: number) => money(v, lang) };

  return (
    <div className="pb-28">
      <PageHeader
        back="/admin/kolekcije"
        breadcrumbs={[{ label: ta('nav_products'), to: '/admin/proizvodi' }, { label: ta('nav_collections'), to: '/admin/kolekcije' }, l(original.title) || t('newTitle')]}
        title={<span className="line-clamp-2">{l(form.title) || t('newTitle')}</span>}
        badge={!isNew && <PublishedLabel published={original.published} />}
        description={!isNew && original.createdAt ? t('createdOn', { date: date(original.createdAt, lang) }) : t('description')}
        actions={
          <>
            {!isNew && (
              <a href={siteUrl} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline', size: 'sm', shape: 'rounded' })}>
                <ExternalLink className="h-4 w-4" /> <span className="max-sm:sr-only">{original.published ? t('viewOnSite') : t('previewOnSite')}</span>
              </a>
            )}
            {menu.length > 0 && (
              <span className="rounded-lg border border-ink/15 bg-white">
                <RowMenu items={menu} label={t('moreActions')} />
              </span>
            )}
            {canEdit ? (
              <Button size="sm" shape="rounded" onClick={save} disabled={!dirty && !isNew} icon={<Check className="h-4 w-4" />}>
                {ta('save')}
              </Button>
            ) : (
              <span title={t('readOnly')} className="inline-flex cursor-not-allowed">
                <Button size="sm" shape="rounded" disabled icon={<Lock className="h-4 w-4" />}>
                  {ta('save')}
                </Button>
              </span>
            )}
          </>
        }
      />

      {!canEdit && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <span>{t('readOnly')}</span>
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
                      value={form.title}
                      onChange={(title) => setForm((f) => ({ ...f, title, slug: slugAuto ? slugify(title.sq) : f.slug }))}
                      className={cn(errors.title && '[&_input]:border-red-500 [&_input]:ring-4 [&_input]:ring-red-500/10')}
                    />
                    <FieldError>{errors.title}</FieldError>
                  </div>
                  <L10nInput label={t('f_desc')} multiline rows={3} value={form.description} onChange={(description) => set({ description })} hint={t('f_desc_h')} />
                </div>
              </Card>
            </div>

            {/* type */}
            <Card title={t('c_type')}>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['manual', 'smart'] as const).map((k) => {
                  const on = form.kind === k;
                  const Icon = k === 'smart' ? Sparkles : ListChecks;
                  return (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setKind(k)}
                      className={cn('flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition-all', on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30')}
                    >
                      <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', on ? 'border-ink' : 'border-ink/25')}>
                        <span className={cn('h-2.5 w-2.5 rounded-full bg-ink transition-transform', on ? 'scale-100' : 'scale-0')} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                          <Icon className="h-4 w-4 text-muted" /> {t(k === 'smart' ? 'smart_title' : 'manual_title')}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t(k === 'smart' ? 'smart_h' : 'manual_h')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {form.kind === 'manual' && form.productIds.length === 0 && form.rules.length > 0 && smartMatches.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    set({ productIds: smartMatches });
                    toast.success(t('copied', { n: smartMatches.length }));
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline-offset-2 hover:underline"
                >
                  <Copy className="h-3.5 w-3.5" /> {t('copyMatches', { n: smartMatches.length })}
                </button>
              )}
            </Card>

            {form.kind === 'smart' ? (
              <>
                <div id="sec-rules" className="scroll-mt-24">
                  <Card title={t('c_conditions')}>
                    <RulesEditor match={form.match} onMatch={(match) => set({ match })} rules={form.rules} onRules={(rules) => set({ rules })} categories={categories} tags={tags} vendors={vendors} showErrors={tried} />
                    {errors.rules && !form.rules.length && <FieldError>{errors.rules}</FieldError>}
                  </Card>
                </div>

                <Card title={t('c_preview')} description={t('c_preview_d')}>
                  {!form.rules.length ? (
                    <p className="text-[13px] text-muted">{t('preview_rulesFirst')}</p>
                  ) : (
                    <>
                      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                          <Eye className="h-4 w-4 shrink-0 text-muted" />
                          {publicList.length === 0 ? t('preview_none') : publicList.length === 1 ? t('preview_one') : t('preview_count', { n: publicList.length })}
                        </p>
                        <SortSelect value={form.sort} options={sorts} onChange={(sort) => set({ sort })} />
                      </div>
                      {publicList.length > 0 && (
                        <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 xl:grid-cols-6">
                          {shown.map((p) => (
                            <PreviewTile key={p.id} product={p} category={categories.find((c) => c.id === p.categoryId)} />
                          ))}
                        </div>
                      )}
                      {publicList.length > PREVIEW && (
                        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-4 text-[13px] font-semibold text-ink-soft hover:text-ink hover:underline">
                          {showAll ? t('showLess') : t('showMore', { n: publicList.length - PREVIEW })}
                        </button>
                      )}
                      <HiddenNote hidden={hiddenList} />
                    </>
                  )}
                </Card>
              </>
            ) : (
              <Card title={t('c_products')} description={t('c_products_d')}>
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {canEdit && (
                      <div className="min-w-0 flex-1">
                        <ProductPicker products={products} categories={categories} selected={form.productIds} onAdd={(pid) => set({ productIds: [...form.productIds, pid] })} />
                      </div>
                    )}
                    <SortSelect size="md" value={form.sort} options={sorts} onChange={(sort) => set({ sort })} />
                  </div>
                  <ManualList ids={form.productIds} products={products} onChange={(productIds) => set({ productIds })} sortable={form.sort === 'manual'} disabled={!canEdit} />
                  {form.productIds.length > 1 && <p className="text-[12.5px] text-muted">{form.sort === 'manual' ? t('dragHint') : `${t('sortedBy', { sort: t(`sort_${form.sort}` as CdKey) })} ${t('sortNote')}`}</p>}
                  <HiddenNote hidden={hiddenList} />
                </div>
              </Card>
            )}

            {/* SEO */}
            <div id="sec-seo" className="scroll-mt-24">
              <Card title={t('c_seo')} description={t('seo_d')}>
                <div className="space-y-5">
                  <FormField
                    label={t('f_slug')}
                    error={errors.slug}
                    hint={
                      slugAuto ? (
                        t('slugAuto')
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-x-2">
                          {t('slugManual')}
                          <button
                            type="button"
                            onClick={() => {
                              setSlugAuto(true);
                              set({ slug: slugify(form.title.sq) });
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-ink hover:underline"
                          >
                            <RotateCcw className="h-3 w-3" /> {t('slugReset')}
                          </button>
                        </span>
                      )
                    }
                  >
                    <TextInput
                      prefix={
                        <span className="flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5" />
                          <span>
                            <span className="max-sm:hidden">{domain}</span>/koleksioni/
                          </span>
                        </span>
                      }
                      value={form.slug}
                      invalid={!!errors.slug}
                      onChange={(e) => {
                        setSlugAuto(false);
                        set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                      }}
                      mono
                      spellCheck={false}
                      aria-label={t('f_slug')}
                    />
                  </FormField>
                  <FormField label={t('f_metaTitle')} hint={t('f_metaTitle_h')} aside={<Counter n={(form.seo?.title ?? '').length} max={60} />}>
                    <TextInput value={form.seo?.title ?? ''} placeholder={`${form.title.sq.trim() || t('f_title')} — ${companyName}`} onChange={(e) => set({ seo: { ...form.seo, title: e.target.value } })} aria-label={t('f_metaTitle')} />
                  </FormField>
                  <FormField label={t('f_metaDesc')} hint={t('f_metaDesc_h')} aside={<Counter n={(form.seo?.description ?? '').length} max={160} />}>
                    <Textarea rows={3} value={form.seo?.description ?? ''} placeholder={form.description.sq} onChange={(e) => set({ seo: { ...form.seo, description: e.target.value } })} aria-label={t('f_metaDesc')} className="rounded-lg! px-3! py-2.5! text-[14px]!" />
                  </FormField>
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                      <Globe className="h-3.5 w-3.5" /> {t('googlePreview')}
                    </div>
                    <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_6px_rgb(32_33_36/0.08)]" style={{ fontFamily: 'arial, sans-serif' }}>
                      <div className="truncate text-[12px] text-[#4d5156]">
                        https://{domain} › koleksioni › {slugify(form.slug) || slugify(form.title.sq) || '…'}
                      </div>
                      <div className="mt-1 line-clamp-1 text-[19px] leading-snug text-[#1a0dab]">{form.seo?.title?.trim() || `${form.title.sq.trim() || t('f_title')} — ${companyName}`}</div>
                      <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.55] text-[#4d5156]">{form.seo?.description?.trim() || form.description.sq.trim() || '—'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* --------------------------- sidebar --------------------------- */}
          <div className="flex min-w-0 flex-col gap-5">
            <Card title={t('c_publish')}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                    {form.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted" />}
                    {t('published_on')}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-muted">{form.published ? t('published_h', { slug: slugify(form.slug) || '…' }) : t('unpublished_h')}</p>
                </div>
                <span title={!canPublish ? t('needPublishPerm') : undefined} className={cn(!canPublish && 'cursor-not-allowed')}>
                  <Switch size="sm" checked={form.published} disabled={!canPublish || !canEdit} onChange={(published) => set({ published })} />
                </span>
              </div>
              {!canPublish && canEdit && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-canvas px-3 py-2 text-[12.5px] text-ink-soft">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('needPublishPerm')}
                </p>
              )}
            </Card>

            <Card title={t('c_image')}>
              <ImageField value={form.image} onChange={(image) => set({ image })} hint={t('image_h')} />
            </Card>

            <Card title={t('c_summary')}>
              <dl className="space-y-2 text-[13.5px]">
                <SumRow label={t('sum_public')} value={publicList.length} strong />
                <SumRow label={t('sum_total')} value={publicList.length + hiddenList.length} />
                <SumRow label={t('sum_type')} value={t(form.kind === 'smart' ? 'type_smart' : 'type_manual')} />
                <SumRow label={t('sort_label')} value={t(`sort_${form.sort}` as CdKey)} />
              </dl>
              {form.kind === 'smart' && form.rules.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-line/70 pt-3 text-[12.5px] text-ink-soft">
                  {form.rules.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="w-8 shrink-0 text-[10.5px] font-bold uppercase leading-5 tracking-wide text-muted">{i === 0 ? '' : t(form.match === 'all' ? 'and' : 'or')}</span>
                      <span className="min-w-0">{ruleText(r, ctx)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {!isNew && (
              <Card title={t('c_usage')} actions={usageCount(usage) > 0 && <span className="text-[12.5px] font-semibold tabular-nums text-muted">{usageCount(usage)}</span>}>
                {usageCount(usage) === 0 ? (
                  <p className="text-[13px] text-muted">{t('usage_none')}</p>
                ) : (
                  <ul className="space-y-1.5 text-[13.5px]">
                    {usage.discounts.map((d) => (
                      <UsageRow key={d.id} kind={t('usage_discount')} label={d.title} to={`/admin/popusti/${d.id}`} />
                    ))}
                    {usage.offers.map((o) => (
                      <UsageRow key={o.id} kind={t('usage_offer')} label={l(o.name)} to={`/admin/ponude/${o.id}`} />
                    ))}
                    {usage.menus.map((m) => (
                      <UsageRow key={m.id} kind={t('usage_menu')} label={m.title} to="/admin/meniji" />
                    ))}
                  </ul>
                )}
                <p className="mt-3 border-t border-line/70 pt-3 text-[12.5px] leading-snug text-muted">{form.kind === 'smart' ? t('usage_dynamic') : t('usage_static')}</p>
              </Card>
            )}

            <p className="flex items-center gap-1.5 px-1 text-[12px] text-muted max-md:hidden">
              <Keyboard className="h-3.5 w-3.5" /> {t('shortcutTip')}
            </p>
          </div>
        </div>
      </fieldset>

      {canEdit && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function SortSelect({ value, options, onChange, size = 'sm' }: { value: CollectionSort; options: CollectionSort[]; onChange: (v: CollectionSort) => void; size?: 'sm' | 'md' }) {
  const t = useDict(cd, 'admin');
  return (
    <label className="flex shrink-0 items-center gap-2">
      <span className="shrink-0 text-[12.5px] font-semibold text-muted">{t('sort_label')}</span>
      <SelectInput size={size} value={value} onChange={(e) => onChange(e.target.value as CollectionSort)} className="min-w-0 flex-1 sm:w-[176px] sm:flex-none" aria-label={t('sort_label')}>
        {options.map((s) => (
          <option key={s} value={s}>
            {t(`sort_${s}` as CdKey)}
          </option>
        ))}
      </SelectInput>
    </label>
  );
}

function HiddenNote({ hidden }: { hidden: Product[] }) {
  const t = useDict(cd, 'admin');
  const l = useL('admin');
  if (!hidden.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-dashed border-line bg-canvas/50 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft">
        <EyeOff className="h-3.5 w-3.5" /> {t('preview_hidden', { n: hidden.length })}
      </p>
      <p className="mt-1 text-[12px] leading-snug text-muted">{hidden.map((p) => l(p.name)).join(' · ')}</p>
      <p className="mt-1.5 text-[12px] leading-snug text-muted">{t('notPublicNote')}</p>
    </div>
  );
}

function SumRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-[15px] font-bold text-ink' : 'font-medium text-ink')}>{value}</dd>
    </div>
  );
}

function UsageRow({ kind, label, to }: { kind: string; label: string; to: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 hover:bg-canvas">
        <span className="min-w-0 truncate font-medium text-ink">{label}</span>
        <span className="shrink-0 text-[12px] text-muted">{kind}</span>
      </Link>
    </li>
  );
}

function Counter({ n, max }: { n: number; max: number }) {
  return <span className={cn('text-[11px] font-semibold tabular-nums', n > max ? 'text-amber-700' : 'text-muted')}>{`${n}/${max}`}</span>;
}
