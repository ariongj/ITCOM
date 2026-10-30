import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Clock3, Eye, FileQuestion, Wand2 } from 'lucide-react';
import { PageHeader, Card, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { MarkdownEditor } from '@/admin/components/editorial/MarkdownEditor';
import { EditorActions, SlugField, TextField, TranslationStatus } from '@/admin/components/editorial/fields';
import { readMinutesFor, useDraft, useSaveKeyLabel, useSaveShortcut, useUnsavedGuard } from '@/admin/components/editorial/hooks';
import { ed } from '@/admin/components/editorial/i18n';
import { cx } from '@/admin/components/editorial/dict';
import { MetaRow, OrganizationCard, PublishCard, SeoCard } from '@/admin/components/editorial/panels';
import { POST_TEMPLATES, contentState, visibilityOf, withVisibility, type PostTemplate, type PostX } from '@/admin/components/editorial/meta';
import { Notice, StatusPill } from '@/admin/components/editorial/ui';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { defineDict, interpolate, useDict, useL, useLang, emptyL10n, lt } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { L10n } from '@/lib/types';
import { date, timeAgo } from '@/lib/format';
import { cn, slugify, thumb, uid } from '@/lib/utils';

const T = defineDict({
  me: {
    newPost: 'Novi članak',
    newPostText: 'Članak za blog „Savjeti“ — vodiči, savjeti i inspiracija za kupce.',
    title: 'Naslov članka',
    titlePh: 'npr. Kako izabrati okvir prema obliku lica',
    category: 'Kategorija',
    categoryHint: 'Prikazuje se kao tema članka na sajtu.',
    quickPick: 'Postojeće:',
    body: 'Tekst članka',
    cover: 'Naslovna fotografija',
    coverHint: 'Preporučeno 1600 × 1000 px, pejzažni format.',
    readMinutes: 'Vrijeme čitanja',
    min: 'min',
    auto: 'Izračunaj iz teksta (~{n} min)',
    saved: 'Članak je sačuvan',
    created: 'Članak je kreiran',
    deleteTitle: 'Obrisati članak „{name}“?',
    deleteText: 'Članak i svi njegovi prevodi biće trajno uklonjeni.',
    fieldTitle: 'Naslov',
    fieldExcerpt: 'Sažetak',
    fieldBody: 'Tekst',
    fieldTag: 'Kategorija',
    readMeta: '{n} min čitanja',
  },
  sq: {
    newPost: 'Artikull i ri',
    newPostText: 'Artikull për blogun „Këshilla“ — udhëzues, këshilla dhe frymëzim për klientët.',
    title: 'Titulli i artikullit',
    titlePh: 'p.sh. Si ta zgjidhni kornizën sipas formës së fytyrës',
    category: 'Kategoria',
    categoryHint: 'Shfaqet si tema e artikullit në faqe.',
    quickPick: 'Ekzistuese:',
    body: 'Teksti i artikullit',
    cover: 'Fotoja kryesore',
    coverHint: 'Rekomandohet 1600 × 1000 px, format horizontal.',
    readMinutes: 'Koha e leximit',
    min: 'min',
    auto: 'Llogarit nga teksti (~{n} min)',
    saved: 'Artikulli u ruajt',
    created: 'Artikulli u krijua',
    deleteTitle: 'Të fshihet artikulli „{name}“?',
    deleteText: 'Artikulli dhe të gjitha përkthimet do të hiqen përgjithmonë.',
    fieldTitle: 'Titulli',
    fieldExcerpt: 'Përmbledhja',
    fieldBody: 'Teksti',
    fieldTag: 'Kategoria',
    readMeta: '{n} min lexim',
  },
  en: {
    newPost: 'New article',
    newPostText: 'An article for the “Advice” blog — guides, tips and inspiration for customers.',
    title: 'Article title',
    titlePh: 'e.g. How to choose frames for your face shape',
    category: 'Category',
    categoryHint: 'Shown as the article topic on the site.',
    quickPick: 'Existing:',
    body: 'Article text',
    cover: 'Cover photo',
    coverHint: 'Recommended 1600 × 1000 px, landscape.',
    readMinutes: 'Reading time',
    min: 'min',
    auto: 'Calculate from text (~{n} min)',
    saved: 'Article saved',
    created: 'Article created',
    deleteTitle: 'Delete the article “{name}”?',
    deleteText: 'The article and all its translations will be removed permanently.',
    fieldTitle: 'Title',
    fieldExcerpt: 'Excerpt',
    fieldBody: 'Text',
    fieldTag: 'Category',
    readMeta: '{n} min read',
  },
});

const blankPost = (): PostX => ({
  id: uid('post'),
  slug: '',
  title: emptyL10n(),
  excerpt: emptyL10n(),
  body: emptyL10n(),
  cover: '',
  tag: emptyL10n(),
  author: 'ITCOM',
  readMinutes: 3,
  publishedAt: new Date().toISOString(),
  published: false,
  hidden: false,
  tags: [],
  template: 'article',
});

export default function PostEdit() {
  const { id = 'novi' } = useParams();
  return <PostEditor key={id} id={id} />;
}

function PostEditor({ id }: { id: string }) {
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
  const posts = useDb((s) => s.posts) as PostX[];
  const staff = useDb((s) => s.staff);
  const adminEmail = useDb((s) => s.settings.adminEmail);
  const upsertPost = useDb((s) => s.upsertPost);
  const deletePost = useDb((s) => s.deletePost);
  const source = useMemo(() => (isNew ? undefined : posts.find((p) => p.id === id)), [isNew, posts, id]);

  const canEdit = can('content', 'edit');
  const canPublish = can('content', 'publish');
  const canDelete = can('content', 'delete');
  const readOnly = !canEdit;

  const { draft, setDraft, patch, dirty, reset } = useDraft<PostX>(source, blankPost);
  const [slugAuto, setSlugAuto] = useState(isNew);
  const [showErrors, setShowErrors] = useState(false);
  const allowNav = useUnsavedGuard(dirty && !readOnly);

  const slugTaken = useMemo(() => !!draft.slug && posts.some((p) => p.id !== draft.id && p.slug === draft.slug), [posts, draft.slug, draft.id]);
  const errors = {
    title: !draft.title.sq.trim() ? te('titleRequired') : undefined,
    slug: !draft.slug.trim() ? te('slugRequired') : slugTaken ? te('slugTaken') : undefined,
  };

  /** Categories already used by other articles — one-click reuse keeps them consistent. */
  const knownCats = useMemo(() => {
    const seen = new Map<string, L10n>();
    posts.forEach((p) => p.tag.me.trim() && !seen.has(p.tag.me.trim().toLowerCase()) && seen.set(p.tag.me.trim().toLowerCase(), p.tag));
    return [...seen.values()];
  }, [posts]);
  const authors = useMemo(() => Array.from(new Set(['ITCOM', ...staff.filter((s) => s.active).map((s) => s.name), ...posts.map((p) => p.author)].filter(Boolean))), [staff, posts]);
  const tagSuggestions = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags ?? []))), [posts]);

  const suggestedMinutes = readMinutesFor(draft.body.sq || draft.body.me);
  const setTitle = (title: L10n) => patch(slugAuto ? { title, slug: slugify(title.sq) } : { title });

  const save = () => {
    if (readOnly || (!dirty && !isNew)) return;
    const clean: PostX = { ...draft, slug: slugify(draft.slug), readMinutes: Math.max(1, Math.round(draft.readMinutes || 1)) };
    if (!clean.title.sq.trim() || !clean.slug || slugTaken) {
      setShowErrors(true);
      toast.error(te('fixErrors'));
      return;
    }
    upsertPost(clean);
    setDraft(clean);
    toast.success(isNew ? t('created') : t('saved'));
    if (isNew) {
      allowNav();
      navigate(`/admin/savjeti/${clean.id}`, { replace: true });
    }
  };
  useSaveShortcut(save);

  const remove = async () => {
    const name = l(draft.title) || draft.slug;
    const ok = await confirmDialog({ title: t('deleteTitle', { name }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    deletePost(draft.id);
    toast.success(te('deletedToast', { name }));
    allowNav();
    navigate('/admin/savjeti');
  };

  if (!isNew && !source) {
    return (
      <Card>
        <EmptyState
          icon={<FileQuestion className="h-6 w-6" />}
          title={te('notFound')}
          text={te('notFoundText')}
          action={
            <ButtonLink to="/admin/savjeti" variant="dark" shape="rounded" size="sm">
              {te('backToList')}
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const url = `/keshilla/${draft.slug || '…'}`;

  return (
    <div className="pb-24">
      <PageHeader
        back="/admin/savjeti"
        breadcrumbs={[ta('nav_content'), { label: ta('nav_blog'), to: '/admin/savjeti' }, isNew ? t('newPost') : l(draft.title)]}
        title={l(draft.title) || t('newPost')}
        badge={<StatusPill state={isNew ? 'draft' : contentState(source!, source!.publishedAt)} />}
        description={
          isNew ? (
            t('newPostText')
          ) : (
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-[12.5px] text-ink-soft">{url}</span>
              <span className="text-ink/20">•</span>
              <span>{tc('by', { name: source!.author })}</span>
              <span className="text-ink/20">•</span>
              <span>{timeAgo(source!.publishedAt, lang)}</span>
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
              <L10nInput label={tc('excerpt')} value={draft.excerpt} onChange={(excerpt) => patch({ excerpt })} multiline rows={3} hint={tc('excerptHint')} />
            </fieldset>
          </Card>

          <fieldset disabled={readOnly} className="min-w-0">
            <MarkdownEditor
              title={t('body')}
              value={draft.body}
              onChange={(body) => patch({ body })}
              rows={16}
              previewHeader={(lng) => {
                const title = lt(draft.title, lng);
                const excerpt = lt(draft.excerpt, lng);
                const tag = lt(draft.tag, lng);
                return (
                  <div className="mb-6">
                    {draft.cover && (
                      <div className="mb-5 aspect-[16/9] overflow-hidden rounded-2xl bg-sand">
                        <img src={thumb(draft.cover)} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                      {tag && <span className="eyebrow">{tag}</span>}
                      <span>{date(draft.publishedAt, lng)}</span>
                      <span>·</span>
                      <span>{draft.author}</span>
                      <span>·</span>
                      <span>{interpolate(T[lng].readMeta, { n: draft.readMinutes || 1 })}</span>
                    </div>
                    {title && <h1 className="display mt-2 text-[2rem] leading-[1.1] text-ink sm:text-[2.3rem]">{title}</h1>}
                    {excerpt && <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{excerpt}</p>}
                    <div className="mt-6 h-px bg-line" />
                  </div>
                );
              }}
            />
          </fieldset>

          <SeoCard
            seo={draft.seo}
            onChange={(seo) => patch({ seo })}
            fallbackTitle={l(draft.title) || t('newPost')}
            fallbackDescription={l(draft.excerpt)}
            domain={adminEmail.split('@')[1] || 'itcom.example'}
            path={['keshilla', draft.slug]}
            readOnly={readOnly}
            slugField={
              <SlugField
                prefix="/keshilla/"
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
            visibility={visibilityOf(draft)}
            onVisibility={(v) => setDraft((d) => withVisibility(d, v))}
            publishedAt={draft.publishedAt}
            onPublishedAt={(publishedAt) => patch({ publishedAt })}
            canPublish={canPublish}
            readOnly={readOnly}
          >
            {!isNew && (
              <div className="border-t border-line/70 pt-3">
                <MetaRow label={tc('st_published')}>{date(source!.publishedAt, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</MetaRow>
              </div>
            )}
          </PublishCard>

          <OrganizationCard<PostTemplate>
            template={draft.template ?? 'article'}
            templates={POST_TEMPLATES.map((id) => ({ id, label: tc(`tpl_${id}`) }))}
            onTemplate={(template) => patch({ template })}
            author={draft.author}
            authors={authors}
            onAuthor={(author) => patch({ author })}
            tags={draft.tags ?? []}
            tagSuggestions={tagSuggestions}
            onTags={(tags) => patch({ tags })}
            readOnly={readOnly}
          >
            <div>
              <L10nInput label={t('category')} value={draft.tag} onChange={(tag) => patch({ tag })} hint={t('categoryHint')} />
              {knownCats.length > 0 && !readOnly && (
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <span className="mr-0.5 text-xs text-muted">{t('quickPick')}</span>
                  {knownCats.map((tag) => {
                    const on = tag.me === draft.tag.me;
                    return (
                      <button
                        key={tag.me}
                        type="button"
                        onClick={() => patch({ tag: { ...tag } })}
                        className={cn('rounded-md px-2 py-0.5 text-[12px] font-semibold transition-colors', on ? 'bg-ink text-white' : 'text-ink-soft ring-1 ring-inset ring-line hover:bg-white hover:text-ink')}
                      >
                        {lt(tag, lang)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <TextField
              label={t('readMinutes')}
              type="number"
              min={1}
              max={60}
              value={draft.readMinutes || ''}
              leading={<Clock3 className="h-4 w-4" />}
              onChange={(e) => patch({ readMinutes: Number(e.target.value) })}
              trailing={
                <span className="flex items-stretch">
                  <span className="flex items-center pr-3 text-[13px] text-muted">{t('min')}</span>
                  <button
                    type="button"
                    onClick={() => patch({ readMinutes: suggestedMinutes })}
                    title={t('auto', { n: suggestedMinutes })}
                    aria-label={t('auto', { n: suggestedMinutes })}
                    className="grid w-10 place-items-center border-l border-line text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              }
            />
          </OrganizationCard>

          <Card title={t('cover')}>
            <fieldset disabled={readOnly}>
              <ImageField value={draft.cover} onChange={(cover) => patch({ cover })} aspect="aspect-[16/10]" hint={t('coverHint')} />
            </fieldset>
          </Card>

          <Card title={te('translations')}>
            <TranslationStatus
              fields={[
                { label: t('fieldTitle'), value: draft.title },
                { label: t('fieldExcerpt'), value: draft.excerpt },
                { label: t('fieldBody'), value: draft.body },
                { label: t('fieldTag'), value: draft.tag },
              ]}
            />
          </Card>
        </div>
      </div>

      {!readOnly && <SaveBar dirty={dirty} onSave={save} onDiscard={reset} />}
    </div>
  );
}
