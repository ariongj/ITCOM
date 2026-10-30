import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ChevronRight, Eye, FileQuestion, ListTree, PanelBottom } from 'lucide-react';
import { PageHeader, Card, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { MarkdownEditor } from '@/admin/components/editorial/MarkdownEditor';
import { EditorActions, SlugField, TranslationStatus, mdSummary } from '@/admin/components/editorial/fields';
import { useDraft, useSaveKeyLabel, useSaveShortcut, useUnsavedGuard } from '@/admin/components/editorial/hooks';
import { ed } from '@/admin/components/editorial/i18n';
import { cx } from '@/admin/components/editorial/dict';
import { OrganizationCard, PublishCard, SeoCard, MetaRow } from '@/admin/components/editorial/panels';
import { PAGE_TEMPLATES, contentState, visibilityOf, withVisibility, type PageTemplate, type PageX } from '@/admin/components/editorial/meta';
import { Notice, StatusPill } from '@/admin/components/editorial/ui';
import { addPageToFooter, menuRefs } from '@/admin/components/menus/links';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { defineDict, useDict, useL, useLang, emptyL10n } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { date, timeAgo } from '@/lib/format';
import { slugify, uid } from '@/lib/utils';

const T = defineDict({
  me: {
    newPage: 'Nova stranica',
    newPageText: 'Informativna stranica — dostava, uslovi, reklamacije, privatnost…',
    title: 'Naslov stranice',
    titlePh: 'npr. Dostava i povrat',
    body: 'Sadržaj stranice',
    saved: 'Stranica je sačuvana',
    created: 'Stranica je kreirana',
    deleteTitle: 'Obrisati stranicu „{name}“?',
    deleteText: 'Stranica i svi njeni prevodi biće trajno uklonjeni, a linkovi u menijima prestaju da se prikazuju.',
    fieldTitle: 'Naslov',
    fieldBody: 'Tekst',
    fieldExcerpt: 'Sažetak',
    created_at: 'Ažurirano',
    menuFooterAdd: 'Dodaj u podnožje',
  },
  sq: {
    newPage: 'Faqe e re',
    newPageText: 'Faqe informative — dërgesa, kushtet, reklamacionet, privatësia…',
    title: 'Titulli i faqes',
    titlePh: 'p.sh. Dërgesa dhe kthimi',
    body: 'Përmbajtja e faqes',
    saved: 'Faqja u ruajt',
    created: 'Faqja u krijua',
    deleteTitle: 'Të fshihet faqja „{name}“?',
    deleteText: 'Faqja dhe të gjitha përkthimet do të hiqen përgjithmonë, ndërsa lidhjet në menu nuk shfaqen më.',
    fieldTitle: 'Titulli',
    fieldBody: 'Teksti',
    fieldExcerpt: 'Përmbledhja',
    created_at: 'Përditësuar',
    menuFooterAdd: 'Shto në footer',
  },
  en: {
    newPage: 'New page',
    newPageText: 'Information page — delivery, terms, returns, privacy…',
    title: 'Page title',
    titlePh: 'e.g. Delivery & returns',
    body: 'Page content',
    saved: 'Page saved',
    created: 'Page created',
    deleteTitle: 'Delete the page “{name}”?',
    deleteText: 'The page and all its translations will be removed permanently and menu links to it stop showing.',
    fieldTitle: 'Title',
    fieldBody: 'Text',
    fieldExcerpt: 'Excerpt',
    created_at: 'Updated',
    menuFooterAdd: 'Add to footer',
  },
});

const blankPage = (): PageX => ({
  id: uid('pg'),
  slug: '',
  title: emptyL10n(),
  body: emptyL10n(),
  published: false,
  hidden: false,
  showInFooter: false,
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
  excerpt: emptyL10n(),
  template: 'page',
  author: '',
  tags: [],
});

export default function PageEdit() {
  const { id = 'novi' } = useParams();
  return <PageEditor key={id} id={id} />;
}

function PageEditor({ id }: { id: string }) {
  const t = useDict(T, 'admin');
  const te = useDict(ed, 'admin');
  const ta = useDict(adm, 'admin');
  const tc = useDict(cx, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const keyLabel = useSaveKeyLabel();

  const isNew = id === 'novi';
  const pages = useDb((s) => s.pages) as PageX[];
  const posts = useDb((s) => s.posts);
  const staff = useDb((s) => s.staff);
  const menus = useDb((s) => s.menus);
  const adminEmail = useDb((s) => s.settings.adminEmail);
  const upsertPage = useDb((s) => s.upsertPage);
  const deletePage = useDb((s) => s.deletePage);
  const upsert = useDb((s) => s.upsert);
  const source = useMemo(() => (isNew ? undefined : pages.find((p) => p.id === id)), [isNew, pages, id]);

  const canEdit = can('content', 'edit');
  const canPublish = can('content', 'publish');
  const canDelete = can('content', 'delete');
  const readOnly = !canEdit;

  const { draft, setDraft, patch, dirty, reset } = useDraft<PageX>(source, blankPage);
  const [slugAuto, setSlugAuto] = useState(isNew);
  const [showErrors, setShowErrors] = useState(false);
  const allowNav = useUnsavedGuard(dirty && !readOnly);

  const slugTaken = useMemo(() => !!draft.slug && pages.some((p) => p.id !== draft.id && p.slug === draft.slug), [pages, draft.slug, draft.id]);
  const errors = {
    title: !draft.title.sq.trim() ? te('titleRequired') : undefined,
    slug: !draft.slug.trim() ? te('slugRequired') : slugTaken ? te('slugTaken') : undefined,
  };

  const authors = useMemo(
    () => Array.from(new Set(['ITCOM', ...staff.filter((s) => s.active).map((s) => s.name), ...posts.map((p) => p.author), ...pages.map((p) => p.author ?? '')].filter(Boolean))),
    [staff, posts, pages],
  );
  const tagSuggestions = useMemo(() => Array.from(new Set(pages.flatMap((p) => p.tags ?? []))), [pages]);
  const refs = useMemo(() => (isNew ? [] : menuRefs(menus, 'page', [draft.id, source?.slug ?? draft.slug])), [isNew, menus, draft.id, draft.slug, source?.slug]);
  const footer = menus.find((m) => m.handle === 'footer');

  const setTitle = (title: PageX['title']) => patch(slugAuto ? { title, slug: slugify(title.sq) } : { title });

  const save = () => {
    if (readOnly || (!dirty && !isNew)) return;
    const clean: PageX = { ...draft, slug: slugify(draft.slug), publishedAt: draft.publishedAt ?? new Date().toISOString() };
    if (!clean.title.sq.trim() || !clean.slug || slugTaken) {
      setShowErrors(true);
      toast.error(te('fixErrors'));
      return;
    }
    upsertPage(clean);
    const saved = (useDb.getState().pages.find((p) => p.id === clean.id) ?? clean) as PageX;
    setDraft(saved);
    toast.success(isNew ? t('created') : t('saved'));
    if (isNew) {
      allowNav();
      navigate(`/admin/stranice/${saved.id}`, { replace: true });
    }
  };
  useSaveShortcut(save);

  const remove = async () => {
    const name = l(draft.title) || draft.slug;
    const ok = await confirmDialog({ title: t('deleteTitle', { name }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    deletePage(draft.id);
    toast.success(te('deletedToast', { name }));
    allowNav();
    navigate('/admin/stranice');
  };

  const addToFooter = () => {
    if (!footer || !source) return;
    // Only the menu changes here, so unsaved edits in this form stay untouched.
    upsert('menus', addPageToFooter(footer, source, uid('mi')));
    toast.success(tc('addedToFooter'), { description: l(source.title) });
  };

  if (!isNew && !source) {
    return (
      <Card>
        <EmptyState
          icon={<FileQuestion className="h-6 w-6" />}
          title={te('notFound')}
          text={te('notFoundText')}
          action={
            <ButtonLink to="/admin/stranice" variant="dark" shape="rounded" size="sm">
              {te('backToList')}
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const url = `/faqe/${draft.slug || '…'}`;
  const vis = visibilityOf(draft);
  const state = contentState(draft, draft.publishedAt);
  const excerpt = draft.excerpt ?? emptyL10n();

  return (
    <div className="pb-24">
      <PageHeader
        back="/admin/stranice"
        breadcrumbs={[ta('nav_content'), { label: ta('nav_pages'), to: '/admin/stranice' }, isNew ? t('newPage') : l(draft.title)]}
        title={l(draft.title) || t('newPage')}
        badge={isNew ? <StatusPill state="draft" /> : <StatusPill state={contentState(source!, source!.publishedAt)} />}
        description={
          isNew ? (
            t('newPageText')
          ) : (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-[12.5px] text-ink-soft">{url}</span>
              <span className="text-ink/20">•</span>
              <span>{te('updatedAgo', { ago: timeAgo(source!.updatedAt, lang) })}</span>
            </span>
          )
        }
        actions={
          <EditorActions
            href={url}
            isNew={isNew}
            dirty={dirty}
            onSave={save}
            onDelete={remove}
            saveLabel={isNew ? ta('create') : ta('save')}
            keyLabel={keyLabel}
            canDelete={canDelete}
            deleteTitle={tc('noDeletePerm')}
            canSave={!readOnly}
          />
        }
      />

      {readOnly && (
        <Notice icon={Eye} className="mb-5">
          <span className="font-semibold text-ink">{tc('readOnly')}.</span> {tc('readOnlyText')}
        </Notice>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card title={te('basics')}>
            <fieldset disabled={readOnly} className="space-y-5">
              <div>
                <L10nInput label={t('title')} value={draft.title} onChange={setTitle} placeholder={t('titlePh')} required />
                {showErrors && errors.title && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.title}</p>}
              </div>
              <L10nInput label={tc('excerpt')} value={excerpt} onChange={(v) => patch({ excerpt: v })} multiline rows={2} hint={tc('excerptHint')} />
            </fieldset>
          </Card>

          <fieldset disabled={readOnly} className="min-w-0">
            <MarkdownEditor
              title={t('body')}
              value={draft.body}
              onChange={(body) => patch({ body })}
              rows={16}
              previewHeader={(lng) => {
                const title = draft.title[lng]?.trim() || draft.title.sq;
                return title ? <h1 className="display mb-2 text-[2rem] leading-tight text-ink sm:text-[2.4rem]">{title}</h1> : null;
              }}
            />
          </fieldset>

          <SeoCard
            seo={draft.seo}
            onChange={(seo) => patch({ seo })}
            fallbackTitle={l(draft.title) || t('newPage')}
            fallbackDescription={l(excerpt) || mdSummary(l(draft.body))}
            domain={adminEmail.split('@')[1] || 'itcom.example'}
            path={['faqe', draft.slug]}
            readOnly={readOnly}
            slugField={
              <SlugField
                prefix="/faqe/"
                value={draft.slug}
                onChange={(slug) => {
                  setSlugAuto(false);
                  patch({ slug });
                }}
                onBlur={() => patch({ slug: slugify(draft.slug) })}
                auto={slugAuto}
                canRegenerate={!readOnly && !!draft.title.sq.trim() && draft.slug !== slugify(draft.title.sq)}
                onRegenerate={() => {
                  setSlugAuto(true);
                  patch({ slug: slugify(draft.title.sq) });
                }}
                error={slugTaken || showErrors ? errors.slug : undefined}
              />
            }
          />
        </div>

        <div className="space-y-6">
          <PublishCard
            title={te('publishing')}
            visibility={vis}
            onVisibility={(v) => setDraft((d) => withVisibility(d, v))}
            publishedAt={draft.publishedAt ?? draft.updatedAt}
            onPublishedAt={(publishedAt) => patch({ publishedAt })}
            canPublish={canPublish}
            readOnly={readOnly}
          >
            <div className="space-y-2 border-t border-line/70 pt-3">
              <MetaRow label={tc('lastChange')}>{isNew ? te('neverSaved') : date(source!.updatedAt, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</MetaRow>
              {state === 'scheduled' && <MetaRow label={tc('st_scheduled')}>{date(draft.publishedAt!, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</MetaRow>}
            </div>
          </PublishCard>

          <OrganizationCard<PageTemplate>
            template={draft.template ?? 'policy'}
            templates={PAGE_TEMPLATES.map((id) => ({ id, label: tc(`tpl_${id}`) }))}
            onTemplate={(template) => patch({ template })}
            author={draft.author ?? ''}
            authors={authors}
            onAuthor={(author) => patch({ author })}
            tags={draft.tags ?? []}
            tagSuggestions={tagSuggestions}
            onTags={(tags) => patch({ tags })}
            readOnly={readOnly}
          />

          <Card title={tc('photo')}>
            <fieldset disabled={readOnly}>
              <ImageField value={draft.cover ?? ''} onChange={(cover) => patch({ cover })} aspect="aspect-[16/9]" hint={tc('photoHint')} />
            </fieldset>
          </Card>

          {!isNew && (
            <Card
              title={tc('inMenus')}
              actions={
                <Link to="/admin/meniji" className="text-[12.5px] font-semibold text-ink-soft hover:text-ink hover:underline">
                  {tc('manageMenus')}
                </Link>
              }
              bodyClassName="space-y-3"
            >
              {refs.length ? (
                <ul className="space-y-1.5">
                  {refs.map((r) => (
                    <li key={`${r.menu.id}-${r.item.id}`}>
                      <Link to={`/admin/meniji?menu=${r.menu.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] ring-1 ring-inset ring-line transition hover:bg-canvas">
                        <ListTree className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="font-semibold text-ink">{r.menu.handle === 'main' ? tc('menu_main') : r.menu.handle === 'footer' ? tc('menu_footer') : r.menu.title}</span>
                        {r.parent && (
                          <>
                            <ChevronRight className="h-3 w-3 text-muted" />
                            <span className="truncate text-ink-soft">{l(r.parent.label)}</span>
                          </>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">{tc('notInMenus')}</p>
              )}
              {refs.length > 0 && vis !== 'published' && <Notice icon={Eye} tone="warn">{vis === 'hidden' ? tc('menuIssueHidden') : tc('menuIssueDraft')}</Notice>}
              {footer && !refs.some((r) => r.menu.handle === 'footer') && canEdit && canPublish && (
                <Button variant="outline" size="sm" shape="rounded" icon={<PanelBottom className="h-3.5 w-3.5" />} onClick={addToFooter}>
                  {t('menuFooterAdd')}
                </Button>
              )}
            </Card>
          )}

          <Card title={te('translations')}>
            <TranslationStatus
              fields={[
                { label: t('fieldTitle'), value: draft.title },
                { label: t('fieldBody'), value: draft.body },
                { label: t('fieldExcerpt'), value: excerpt, optional: true },
              ]}
            />
          </Card>
        </div>
      </div>

      {!readOnly && <SaveBar dirty={dirty} onSave={save} onDiscard={reset} />}
    </div>
  );
}
