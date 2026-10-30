import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BookOpen, Copy, ExternalLink, FilePlus2, Folder, ImageOff, MessageSquareOff, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Card, FilterPills, SearchInput, confirmDialog } from '@/admin/components/kit';
import { LangDots } from '@/admin/components/editorial/fields';
import { ed } from '@/admin/components/editorial/i18n';
import { cx } from '@/admin/components/editorial/dict';
import { contentState, type ContentState, type PostX } from '@/admin/components/editorial/meta';
import { ActionMenu, SelectField, StateChip, StatusPill } from '@/admin/components/editorial/ui';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Img } from '@/components/ui/misc';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { L10n } from '@/lib/types';
import { date } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, slugify, uid } from '@/lib/utils';
import { href } from '@/lib/paths';

const T = defineDict({
  me: {
    description: 'Članci sa savjetima — stranica „Savjeti“ i sekcija na početnoj. Kategorija, autor, sažetak, oznake, SEO i datum objave.',
    newPost: 'Novi članak',
    colPost: 'Članak',
    colCategory: 'Kategorija',
    colAuthor: 'Autor',
    colStatus: 'Status',
    colDate: 'Datum objave',
    scheduled: 'Zakazani',
    hidden: 'Skriveni',
    drafts: 'Nacrti',
    searchPh: 'Pretraži članke…',
    allCategories: 'Sve kategorije',
    empty: 'Još nema članaka',
    emptyText: 'Napišite prvi članak — kupci vole praktične vodiče za izbor i održavanje.',
    noMatch: 'Nijedan članak ne odgovara filterima.',
    deleteTitle: 'Obrisati članak „{name}“?',
    deleteText: 'Članak i svi njegovi prevodi biće trajno uklonjeni.',
    duplicate: 'Dupliraj kao nacrt',
    duplicated: 'Kopija je kreirana kao nacrt',
    copySuffix: '(kopija)',
    categories: 'Kategorije bloga',
    categoriesText: 'Kategorija se bira u članku i prikazuje kao tema na sajtu.',
    uncategorized: 'Bez kategorije',
    comments: 'Komentari',
    commentsOff: 'Isključeno',
    commentsText: 'Komentari se uključuju kao poseban modul, uz moderaciju prije javnog prikaza.',
    moduleMap: 'Mapa modula',
    articles: '{n} čl.',
  },
  sq: {
    description: 'Artikuj me këshilla — faqja „Këshilla“ dhe seksioni në ballinë. Kategoria, autori, përmbledhja, etiketat, SEO dhe data e publikimit.',
    newPost: 'Artikull i ri',
    colPost: 'Artikulli',
    colCategory: 'Kategoria',
    colAuthor: 'Autori',
    colStatus: 'Statusi',
    colDate: 'Data e publikimit',
    scheduled: 'Të planifikuar',
    hidden: 'Të fshehur',
    drafts: 'Draftet',
    searchPh: 'Kërko artikujt…',
    allCategories: 'Të gjitha kategoritë',
    empty: 'Ende nuk ka artikuj',
    emptyText: 'Shkruani artikullin e parë — klientët i duan udhëzuesit praktikë për zgjedhje dhe mirëmbajtje.',
    noMatch: 'Asnjë artikull nuk përputhet me filtrat.',
    deleteTitle: 'Të fshihet artikulli „{name}“?',
    deleteText: 'Artikulli dhe të gjitha përkthimet do të hiqen përgjithmonë.',
    duplicate: 'Dupliko si draft',
    duplicated: 'Kopja u krijua si draft',
    copySuffix: '(kopje)',
    categories: 'Kategoritë e blogut',
    categoriesText: 'Kategoria zgjidhet në artikull dhe shfaqet si temë në faqe.',
    uncategorized: 'Pa kategori',
    comments: 'Komentet',
    commentsOff: 'Joaktive',
    commentsText: 'Komentet aktivizohen si modul më vete, me moderim para shfaqjes publike.',
    moduleMap: 'Harta e moduleve',
    articles: '{n} art.',
  },
  en: {
    description: 'Advice articles — the “Advice” page and the homepage section. Category, author, excerpt, tags, SEO and publish date.',
    newPost: 'New article',
    colPost: 'Article',
    colCategory: 'Category',
    colAuthor: 'Author',
    colStatus: 'Status',
    colDate: 'Publish date',
    scheduled: 'Scheduled',
    hidden: 'Hidden',
    drafts: 'Drafts',
    searchPh: 'Search articles…',
    allCategories: 'All categories',
    empty: 'No articles yet',
    emptyText: 'Write your first article — customers love practical buying and care guides.',
    noMatch: 'No article matches the filters.',
    deleteTitle: 'Delete the article “{name}”?',
    deleteText: 'The article and all its translations will be removed permanently.',
    duplicate: 'Duplicate as draft',
    duplicated: 'Copy created as a draft',
    copySuffix: '(copy)',
    categories: 'Blog categories',
    categoriesText: 'The category is picked in the article and shown as its topic on the site.',
    uncategorized: 'Uncategorised',
    comments: 'Comments',
    commentsOff: 'Off',
    commentsText: 'Comments are enabled as a separate module, with moderation before anything is public.',
    moduleMap: 'Module map',
    articles: '{n}',
  },
});

type Filter = 'all' | ContentState;
const COLS = 'md:grid-cols-[72px_minmax(0,1fr)_128px_118px_104px_40px] lg:grid-cols-[72px_minmax(0,1fr)_128px_120px_118px_104px_40px]';
const catKey = (tag: L10n) => slugify(tag.me) || '_';

export default function Posts() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const te = useDict(ed, 'admin');
  const tc = useDict(cx, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const posts = useDb((s) => s.posts) as PostX[];
  const upsertPost = useDb((s) => s.upsertPost);
  const deletePost = useDb((s) => s.deletePost);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [cat, setCat] = useState('all');

  const canEdit = can('content', 'edit');
  const canDelete = can('content', 'delete');

  const states = useMemo(() => new Map(posts.map((p) => [p.id, contentState(p, p.publishedAt)])), [posts]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: posts.length, published: 0, scheduled: 0, hidden: 0, draft: 0 };
    states.forEach((s) => c[s]++);
    return c;
  }, [posts, states]);

  const categories = useMemo(() => {
    const map = new Map<string, { tag: L10n; count: number }>();
    for (const p of posts) {
      const k = catKey(p.tag);
      const cur = map.get(k);
      if (cur) cur.count++;
      else map.set(k, { tag: p.tag, count: 1 });
    }
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [posts]);

  const list = useMemo(() => {
    const needle = fold(q.trim());
    return [...posts]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .filter((p) => {
        if (filter !== 'all' && states.get(p.id) !== filter) return false;
        if (cat !== 'all' && catKey(p.tag) !== cat) return false;
        if (!needle) return true;
        return fold(`${p.title.me} ${p.title.sq} ${p.title.en} ${p.slug} ${p.tag.me} ${p.author} ${(p.tags ?? []).join(' ')}`).includes(needle);
      });
  }, [posts, q, filter, cat, states]);

  const duplicate = (p: PostX) => {
    const copy: PostX = {
      ...structuredClone(p),
      id: uid('post'),
      slug: `${p.slug}-kopija`.slice(0, 80),
      title: { me: `${p.title.me} ${T.me.copySuffix}`, sq: p.title.sq ? `${p.title.sq} ${T.sq.copySuffix}` : '', en: p.title.en ? `${p.title.en} ${T.en.copySuffix}` : '' },
      published: false,
      hidden: false,
      publishedAt: new Date().toISOString(),
    };
    upsertPost(copy);
    toast.success(t('duplicated'), { description: l(copy.title) });
    navigate(`/admin/savjeti/${copy.id}`);
  };

  const remove = async (p: PostX) => {
    const name = l(p.title);
    if (!(await confirmDialog({ title: t('deleteTitle', { name }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true }))) return;
    deletePost(p.id);
    toast.success(te('deletedToast', { name }));
  };

  const newBtn = canEdit && (
    <ButtonLink to="/admin/savjeti/novi" shape="rounded" size="sm" icon={<FilePlus2 className="h-4 w-4" />}>
      {t('newPost')}
    </ButtonLink>
  );

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: ta('all'), count: counts.all },
    { id: 'published', label: tc('st_published'), count: counts.published },
    ...(counts.scheduled ? [{ id: 'scheduled' as const, label: t('scheduled'), count: counts.scheduled }] : []),
    { id: 'hidden', label: t('hidden'), count: counts.hidden },
    { id: 'draft', label: t('drafts'), count: counts.draft },
  ];

  const actions = (p: PostX) => (
    <ActionMenu
      label={ta('actions')}
      items={[
        { label: te('viewOnSite'), icon: ExternalLink, onSelect: () => window.open(href(`/keshilla/${p.slug}`), '_blank', 'noopener') },
        { label: ta('edit'), icon: Pencil, onSelect: () => navigate(`/admin/savjeti/${p.id}`) },
        { label: t('duplicate'), icon: Copy, onSelect: () => duplicate(p), disabled: !canEdit },
        { label: ta('delete'), icon: Trash2, onSelect: () => remove(p), danger: true, divider: true, disabled: !canDelete, title: canDelete ? undefined : tc('noDeletePerm') },
      ]}
    />
  );

  return (
    <div>
      <PageHeader breadcrumbs={[ta('nav_content'), ta('nav_blog')]} title={ta('nav_blog')} description={t('description')} actions={newBtn} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Card padded={false} className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line/70 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            <FilterPills<Filter> value={filter} onChange={setFilter} options={filters} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SelectField value={cat} onChange={(e) => setCat(e.target.value)} wrapClassName="sm:w-48" aria-label={t('colCategory')}>
                <option value="all">{t('allCategories')}</option>
                {categories.map(([k, { tag }]) => (
                  <option key={k} value={k}>
                    {l(tag) || t('uncategorized')}
                  </option>
                ))}
              </SelectField>
              <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="sm:w-60" />
            </div>
          </div>

          {posts.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t('empty')} text={t('emptyText')} action={newBtn || undefined} />
          ) : list.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-6 w-6" />} title={ta('noResults')} text={t('noMatch')} />
          ) : (
            <>
              <div className={cn('hidden items-center gap-4 border-b border-line bg-canvas/60 px-5 py-2 text-[12.5px] font-semibold text-muted md:grid', COLS)}>
                <span className="col-span-2">{t('colPost')}</span>
                <span>{t('colCategory')}</span>
                <span className="hidden lg:block">{t('colAuthor')}</span>
                <span>{t('colStatus')}</span>
                <span>{t('colDate')}</span>
                <span className="sr-only">{ta('actions')}</span>
              </div>
              <ul className="divide-y divide-line/70">
                {list.map((p) => {
                  const state = states.get(p.id)!;
                  return (
                    <li
                      key={p.id}
                      onClick={() => navigate(`/admin/savjeti/${p.id}`)}
                      className={cn('grid cursor-pointer grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-canvas/60 sm:px-5 md:gap-x-4', COLS)}
                    >
                      <span className="relative block aspect-[4/3] overflow-hidden rounded-md bg-canvas ring-1 ring-inset ring-line">
                        {p.cover ? (
                          <Img small src={p.cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-muted">
                            <ImageOff className="h-4 w-4" />
                          </span>
                        )}
                      </span>

                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <Link to={`/admin/savjeti/${p.id}`} onClick={(e) => e.stopPropagation()} className="truncate text-[14px] font-semibold text-ink hover:underline">
                            {l(p.title)}
                          </Link>
                          <span className="hidden sm:inline-flex">
                            <LangDots value={[p.title, p.excerpt, p.body]} />
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{l(p.excerpt)}</p>
                      </div>

                      <span className="md:hidden" onClick={(e) => e.stopPropagation()}>
                        {actions(p)}
                      </span>

                      {/* Mobile meta */}
                      <div className="col-span-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[76px] text-[12.5px] text-muted md:hidden">
                        <StatusPill state={state} />
                        <span>{l(p.tag) || t('uncategorized')}</span>
                        <span>{date(p.publishedAt, lang)}</span>
                      </div>

                      <span className="hidden min-w-0 items-center gap-1.5 text-[13px] text-ink-soft md:flex">
                        <Folder className="h-3.5 w-3.5 shrink-0 text-muted" />
                        <span className="truncate">{l(p.tag) || t('uncategorized')}</span>
                      </span>
                      <span className="hidden truncate text-[13px] text-ink-soft lg:block">{p.author}</span>
                      <span className="hidden md:block">
                        <StatusPill state={state} />
                      </span>
                      <span className="hidden text-[13px] tabular-nums text-ink-soft md:block">{date(p.publishedAt, lang)}</span>
                      <span className="hidden justify-end md:flex" onClick={(e) => e.stopPropagation()}>
                        {actions(p)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <aside className="space-y-6">
          <Card title={t('categories')} description={t('categoriesText')} padded={false}>
            <ul className="p-2">
              <li>
                <button type="button" onClick={() => setCat('all')} className={cn('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors', cat === 'all' ? 'bg-ink/[0.06] font-semibold text-ink' : 'text-ink-soft hover:bg-canvas')}>
                  {t('allCategories')}
                  <span className="text-[12px] tabular-nums text-muted">{posts.length}</span>
                </button>
              </li>
              {categories.map(([k, { tag, count }]) => (
                <li key={k}>
                  <button type="button" onClick={() => setCat(k)} className={cn('flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors', cat === k ? 'bg-ink/[0.06] font-semibold text-ink' : 'text-ink-soft hover:bg-canvas')}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Folder className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="truncate">{l(tag) || t('uncategorized')}</span>
                    </span>
                    <span className="text-[12px] tabular-nums text-muted">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card title={t('comments')} actions={<StateChip icon={MessageSquareOff} tone="muted">{t('commentsOff')}</StateChip>}>
            <p className="text-[13px] leading-relaxed text-muted">{t('commentsText')}</p>
            <Link to="/admin/moduli" className="mt-3 inline-flex text-[13px] font-semibold text-ink hover:underline">
              {t('moduleMap')} →
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
