import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Copy, ExternalLink, FilePlus2, FileText, LayoutTemplate, ListTree, PanelBottom, PanelBottomClose, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Card, FilterPills, SearchInput, confirmDialog } from '@/admin/components/kit';
import { ed } from '@/admin/components/editorial/i18n';
import { cx } from '@/admin/components/editorial/dict';
import { LangDots } from '@/admin/components/editorial/fields';
import { contentState, type ContentState, type PageX } from '@/admin/components/editorial/meta';
import { ActionMenu, StatusPill } from '@/admin/components/editorial/ui';
import { addPageToFooter, menuRefs, removeTarget } from '@/admin/components/menus/links';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { date, timeAgo } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, uid } from '@/lib/utils';
import { href } from '@/lib/paths';

const T = defineDict({
  me: {
    description: 'Informativne stranice — dostava, uslovi, reklamacije, privatnost. Svaka ima status, datum objave, šablon i SEO, na tri jezika.',
    newPage: 'Nova stranica',
    colPage: 'Stranica',
    colStatus: 'Status',
    colTemplate: 'Šablon',
    colMenus: 'Meniji',
    colUpdated: 'Ažurirano',
    hidden: 'Skrivene',
    drafts: 'Nacrti',
    scheduled: 'Zakazane',
    empty: 'Nema stranica',
    emptyText: 'Kreirajte prvu informativnu stranicu — npr. „Dostava i povrat“.',
    noMatch: 'Nijedna stranica ne odgovara pretrazi.',
    searchPh: 'Pretraži stranice…',
    deleteTitle: 'Obrisati stranicu „{name}“?',
    deleteText: 'Stranica i svi njeni prevodi biće trajno uklonjeni. Linkovi u menijima prestaju da se prikazuju.',
    removeFromFooter: 'Ukloni iz podnožja',
    removedFromFooter: 'Link je uklonjen iz podnožja',
    duplicate: 'Dupliraj kao nacrt',
    duplicated: 'Kopija je kreirana kao nacrt',
    copySuffix: '(kopija)',
    themePages: 'Stranice teme',
    themePagesText: 'Standardne stranice prodavnice — raspored daje tema, a sadržaj se uređuje u modulu navedenom desno.',
    editIn: 'Uređuje se u: {where}',
    tp_home: 'Početna',
    tp_about: 'O nama',
    tp_contact: 'Kontakt',
    tp_services: 'Usluge',
    tp_projects: 'Lookbook',
    tp_tryon: 'Virtuelna proba',
    tp_blog: 'Savjeti (blog)',
    tp_faq: 'Česta pitanja',
    w_editor: 'Editor',
    w_settings: 'Konfiguracija',
    w_projects: 'Lookbook',
    w_products: 'Proizvodi (fotografije)',
    w_blog: 'Blog',
    w_models: 'Modeli',
    w_services: 'Usluge (termini)',
    faqWhere: 'sekcija na početnoj',
    menusManage: 'Meniji',
    noMenus: '—',
    noFooterPerm: 'Promjena menija se odmah objavljuje — potrebna je dozvola za objavu.',
  },
  sq: {
    description: 'Faqet informative — dërgesa, kushtet, reklamacionet, privatësia. Secila ka status, datë publikimi, shabllon dhe SEO, në tre gjuhë.',
    newPage: 'Faqe e re',
    colPage: 'Faqja',
    colStatus: 'Statusi',
    colTemplate: 'Shablloni',
    colMenus: 'Menutë',
    colUpdated: 'Përditësuar',
    hidden: 'Të fshehura',
    drafts: 'Draftet',
    scheduled: 'Të planifikuara',
    empty: 'Nuk ka faqe',
    emptyText: 'Krijoni faqen e parë informative — p.sh. „Dërgesa dhe kthimi“.',
    noMatch: 'Asnjë faqe nuk përputhet me kërkimin.',
    searchPh: 'Kërko faqet…',
    deleteTitle: 'Të fshihet faqja „{name}“?',
    deleteText: 'Faqja dhe të gjitha përkthimet do të hiqen përgjithmonë. Lidhjet në menu nuk shfaqen më.',
    removeFromFooter: 'Hiq nga footer-i',
    removedFromFooter: 'Lidhja u hoq nga footer-i',
    duplicate: 'Dupliko si draft',
    duplicated: 'Kopja u krijua si draft',
    copySuffix: '(kopje)',
    themePages: 'Faqet e temës',
    themePagesText: 'Faqet standarde të dyqanit — paraqitjen e jep tema, ndërsa përmbajtja redaktohet në modulin djathtas.',
    editIn: 'Redaktohet te: {where}',
    tp_home: 'Ballina',
    tp_about: 'Rreth nesh',
    tp_contact: 'Kontakt',
    tp_services: 'Shërbimet',
    tp_projects: 'Lookbook',
    tp_tryon: 'Provo virtualisht',
    tp_blog: 'Këshilla (blog)',
    tp_faq: 'Pyetje të shpeshta',
    w_editor: 'Editori',
    w_settings: 'Konfigurimet',
    w_projects: 'Lookbook',
    w_products: 'Produktet (fotot)',
    w_blog: 'Blogu',
    w_models: 'Modelet',
    w_services: 'Shërbimet (terminet)',
    faqWhere: 'seksion në ballinë',
    menusManage: 'Menutë',
    noMenus: '—',
    noFooterPerm: 'Ndryshimi i menusë publikohet menjëherë — kërkohet leje publikimi.',
  },
  en: {
    description: 'Information pages — delivery, terms, returns, privacy. Each has a status, publish date, template and SEO, in three languages.',
    newPage: 'New page',
    colPage: 'Page',
    colStatus: 'Status',
    colTemplate: 'Template',
    colMenus: 'Menus',
    colUpdated: 'Updated',
    hidden: 'Hidden',
    drafts: 'Drafts',
    scheduled: 'Scheduled',
    empty: 'No pages yet',
    emptyText: 'Create your first information page — e.g. “Delivery & returns”.',
    noMatch: 'No page matches your search.',
    searchPh: 'Search pages…',
    deleteTitle: 'Delete the page “{name}”?',
    deleteText: 'The page and all its translations will be removed permanently. Menu links to it stop showing.',
    removeFromFooter: 'Remove from footer',
    removedFromFooter: 'Link removed from the footer',
    duplicate: 'Duplicate as draft',
    duplicated: 'Copy created as a draft',
    copySuffix: '(copy)',
    themePages: 'Theme pages',
    themePagesText: 'Standard store pages — the theme provides the layout, the content is edited in the module on the right.',
    editIn: 'Edited in: {where}',
    tp_home: 'Home',
    tp_about: 'About us',
    tp_contact: 'Contact',
    tp_services: 'Services',
    tp_projects: 'Lookbook',
    tp_tryon: 'Virtual try-on',
    tp_blog: 'Advice (blog)',
    tp_faq: 'FAQ',
    w_editor: 'Editor',
    w_settings: 'Settings',
    w_projects: 'Lookbook',
    w_products: 'Products (photos)',
    w_blog: 'Blog',
    w_models: 'Models',
    w_services: 'Services (appointments)',
    faqWhere: 'homepage section',
    menusManage: 'Menus',
    noMenus: '—',
    noFooterPerm: 'Menu changes go live immediately — publish permission is required.',
  },
});

type Filter = 'all' | ContentState;
const COLS = 'md:grid-cols-[minmax(0,1fr)_118px_150px_150px_96px_40px]';

export default function Pages() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const te = useDict(ed, 'admin');
  const tc = useDict(cx, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const pages = useDb((s) => s.pages) as PageX[];
  const menus = useDb((s) => s.menus);
  const upsertPage = useDb((s) => s.upsertPage);
  const deletePage = useDb((s) => s.deletePage);
  const upsert = useDb((s) => s.upsert);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const canEdit = can('content', 'edit');
  const canPublish = can('content', 'publish');
  const canDelete = can('content', 'delete');

  const states = useMemo(() => new Map(pages.map((p) => [p.id, contentState(p, p.publishedAt)])), [pages]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: pages.length, published: 0, scheduled: 0, hidden: 0, draft: 0 };
    states.forEach((s) => c[s]++);
    return c;
  }, [pages, states]);

  const list = useMemo(() => {
    const needle = fold(q.trim());
    return pages.filter((p) => {
      if (filter !== 'all' && states.get(p.id) !== filter) return false;
      if (!needle) return true;
      return fold(`${p.title.me} ${p.title.sq} ${p.title.en} ${p.slug} ${(p.tags ?? []).join(' ')}`).includes(needle);
    });
  }, [pages, q, filter, states]);

  const footer = menus.find((m) => m.handle === 'footer');

  const toggleFooter = (p: PageX, on: boolean) => {
    if (!footer) return;
    const next = on ? addPageToFooter(footer, p, uid('mi')) : removeTarget(footer, 'page', p.id);
    upsert('menus', next);
    upsertPage({ ...p, showInFooter: on });
    toast.success(on ? tc('addedToFooter') : t('removedFromFooter'), { description: l(p.title) });
  };

  const duplicate = (p: PageX) => {
    const copy: PageX = {
      ...structuredClone(p),
      id: uid('pg'),
      slug: `${p.slug}-kopija`.slice(0, 80),
      title: { me: `${p.title.me} ${T.me.copySuffix}`, sq: p.title.sq ? `${p.title.sq} ${T.sq.copySuffix}` : '', en: p.title.en ? `${p.title.en} ${T.en.copySuffix}` : '' },
      published: false,
      hidden: false,
      showInFooter: false,
    };
    upsertPage(copy);
    toast.success(t('duplicated'), { description: l(copy.title) });
    navigate(`/admin/stranice/${copy.id}`);
  };

  const remove = async (p: PageX) => {
    const name = l(p.title);
    if (!(await confirmDialog({ title: t('deleteTitle', { name }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true }))) return;
    deletePage(p.id);
    toast.success(te('deletedToast', { name }));
  };

  const newBtn = canEdit && (
    <ButtonLink to="/admin/stranice/novi" shape="rounded" size="sm" icon={<FilePlus2 className="h-4 w-4" />}>
      {t('newPage')}
    </ButtonLink>
  );

  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: ta('all'), count: counts.all },
    { id: 'published', label: tc('st_published'), count: counts.published },
    ...(counts.scheduled ? [{ id: 'scheduled' as const, label: t('scheduled'), count: counts.scheduled }] : []),
    { id: 'hidden', label: t('hidden'), count: counts.hidden },
    { id: 'draft', label: t('drafts'), count: counts.draft },
  ];

  return (
    <div>
      <PageHeader breadcrumbs={[ta('nav_content'), ta('nav_pages')]} title={ta('nav_pages')} description={t('description')} actions={newBtn} />

      <Card padded={false} className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line/70 p-3 sm:p-4 md:flex-row md:items-center md:justify-between">
          <FilterPills<Filter> value={filter} onChange={setFilter} options={filters} />
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="md:w-72" />
        </div>

        {pages.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t('empty')} text={t('emptyText')} action={newBtn || undefined} />
        ) : list.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={ta('noResults')} text={t('noMatch')} />
        ) : (
          <>
            <div className={cn('hidden items-center gap-4 border-b border-line bg-canvas/60 px-5 py-2 text-[12.5px] font-semibold text-muted md:grid', COLS)}>
              <span>{t('colPage')}</span>
              <span>{t('colStatus')}</span>
              <span>{t('colTemplate')}</span>
              <span>{t('colMenus')}</span>
              <span>{t('colUpdated')}</span>
              <span className="sr-only">{ta('actions')}</span>
            </div>
            <ul className="divide-y divide-line/70">
              {list.map((p) => {
                const refs = menuRefs(menus, 'page', [p.id, p.slug]);
                const inFooter = refs.some((r) => r.menu.handle === 'footer');
                const state = states.get(p.id)!;
                const menuNames = Array.from(new Set(refs.map((r) => (r.menu.handle === 'main' ? tc('menu_main') : r.menu.handle === 'footer' ? tc('menu_footer') : r.menu.title))));
                const footerLocked = !canEdit || !canPublish;
                return (
                  <li
                    key={p.id}
                    onClick={() => navigate(`/admin/stranice/${p.id}`)}
                    className={cn('grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-canvas/60 sm:px-5', COLS)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft ring-1 ring-inset ring-line">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <Link to={`/admin/stranice/${p.id}`} onClick={(e) => e.stopPropagation()} className="truncate text-[14px] font-semibold text-ink hover:underline">
                            {l(p.title)}
                          </Link>
                          <LangDots value={[p.title, p.body]} />
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[12px] text-muted">/faqe/{p.slug}</div>
                      </div>
                    </div>

                    <div className="md:hidden" onClick={(e) => e.stopPropagation()}>
                      <RowActions p={p} inFooter={inFooter} canFooter={!!footer} footerLocked={footerLocked} canEdit={canEdit} canDelete={canDelete} onFooter={toggleFooter} onDuplicate={duplicate} onDelete={remove} />
                    </div>

                    <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-12 md:col-span-1 md:pl-0">
                      <StatusPill state={state} title={p.publishedAt ? date(p.publishedAt, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined} />
                      <span className="text-[12.5px] text-muted md:hidden">
                        {tc(`tpl_${p.template ?? 'policy'}`)} · {timeAgo(p.updatedAt, lang)}
                      </span>
                    </div>
                    <span className="hidden items-center gap-1.5 truncate text-[13px] text-ink-soft md:flex">
                      <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-muted" />
                      <span className="truncate">{tc(`tpl_${p.template ?? 'policy'}`)}</span>
                    </span>
                    <span className="hidden min-w-0 flex-wrap gap-1 md:flex">
                      {menuNames.length ? (
                        menuNames.map((n) => (
                          <span key={n} className="inline-flex items-center gap-1 rounded-md bg-ink/[0.05] px-1.5 py-0.5 text-[12px] font-medium text-ink-soft">
                            <ListTree className="h-3 w-3" />
                            {n}
                          </span>
                        ))
                      ) : (
                        <span className="text-[13px] text-muted">{t('noMenus')}</span>
                      )}
                    </span>
                    <span className="hidden text-[13px] text-muted md:block" title={new Date(p.updatedAt).toLocaleString()}>
                      {timeAgo(p.updatedAt, lang)}
                    </span>
                    <span className="hidden justify-end md:flex" onClick={(e) => e.stopPropagation()}>
                      <RowActions p={p} inFooter={inFooter} canFooter={!!footer} footerLocked={footerLocked} canEdit={canEdit} canDelete={canDelete} onFooter={toggleFooter} onDuplicate={duplicate} onDelete={remove} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <ThemePages />
    </div>
  );
}

function RowActions({
  p,
  inFooter,
  canFooter,
  footerLocked,
  canEdit,
  canDelete,
  onFooter,
  onDuplicate,
  onDelete,
}: {
  p: PageX;
  inFooter: boolean;
  canFooter: boolean;
  footerLocked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onFooter: (p: PageX, on: boolean) => void;
  onDuplicate: (p: PageX) => void;
  onDelete: (p: PageX) => void;
}) {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const te = useDict(ed, 'admin');
  const tc = useDict(cx, 'admin');
  const navigate = useNavigate();
  return (
    <ActionMenu
      label={ta('actions')}
      items={[
        { label: te('viewOnSite'), icon: ExternalLink, onSelect: () => window.open(href(`/faqe/${p.slug}`), '_blank', 'noopener') },
        { label: ta('edit'), icon: Pencil, onSelect: () => navigate(`/admin/stranice/${p.id}`) },
        ...(canFooter
          ? [
              inFooter
                ? { label: t('removeFromFooter'), icon: PanelBottomClose, onSelect: () => onFooter(p, false), disabled: footerLocked, title: footerLocked ? t('noFooterPerm') : undefined }
                : { label: tc('addToFooter'), icon: PanelBottom, onSelect: () => onFooter(p, true), disabled: footerLocked, title: footerLocked ? t('noFooterPerm') : undefined },
            ]
          : []),
        { label: t('duplicate'), icon: Copy, onSelect: () => onDuplicate(p), disabled: !canEdit },
        { label: ta('delete'), icon: Trash2, onSelect: () => onDelete(p), danger: true, divider: true, disabled: !canDelete, title: canDelete ? undefined : tc('noDeletePerm') },
      ]}
    />
  );
}

/** Built-in storefront pages (PDF p.36 "Faqe standarde: rreth nesh, kontakt, FAQ dhe politika"). */
function ThemePages() {
  const t = useDict(T, 'admin');
  const te = useDict(ed, 'admin');
  const rows: { name: string; path: string; where: string; to: string }[] = [
    { name: t('tp_home'), path: '/', where: t('w_editor'), to: '/admin/prodavnica/editor' },
    { name: t('tp_about'), path: '/rreth-nesh', where: t('w_settings'), to: '/admin/konfiguracija' },
    { name: t('tp_contact'), path: '/kontakt', where: t('w_settings'), to: '/admin/konfiguracija' },
    { name: t('tp_services'), path: '/sherbimet', where: t('w_models'), to: '/admin/modeli?model=cm-usluge' },
    { name: t('tp_projects'), path: '/lookbook', where: t('w_projects'), to: '/admin/projekti' },
    { name: t('tp_tryon'), path: '/provo-virtualisht', where: t('w_products'), to: '/admin/proizvodi' },
    { name: t('tp_blog'), path: '/keshilla', where: t('w_blog'), to: '/admin/savjeti' },
    { name: `${t('tp_faq')} · ${t('faqWhere')}`, path: '/', where: t('w_models'), to: '/admin/modeli?model=cm-faq' },
  ];
  return (
    <Card title={t('themePages')} description={t('themePagesText')} padded={false} className="mt-6 overflow-hidden">
      <ul className="divide-y divide-line/70">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canvas text-muted ring-1 ring-inset ring-line">
              <LayoutTemplate className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-semibold text-ink">{r.name}</div>
              <div className="truncate font-mono text-[12px] text-muted">{r.path}</div>
            </div>
            <Link to={r.to} className="hidden shrink-0 rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-canvas hover:text-ink sm:inline-flex">
              {t('editIn', { where: r.where })}
            </Link>
            <a href={href(r.path)} target="_blank" rel="noreferrer" title={te('viewOnSite')} aria-label={te('viewOnSite')} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
              <ExternalLink className="h-4 w-4" />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
