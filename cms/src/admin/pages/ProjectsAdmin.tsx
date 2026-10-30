import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Database, Eye, ImageOff, Images, MapPin, Pencil, Plus, Star, StarOff, Trash2 } from 'lucide-react';
import { PageHeader, FilterPills, SearchInput, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { SwitchRow, TextField } from '@/admin/components/editorial/fields';
import { TagsEditor } from '@/admin/components/editorial/TagsEditor';
import { ed } from '@/admin/components/editorial/i18n';
import { cx } from '@/admin/components/editorial/dict';
import { ActionMenu, Notice } from '@/admin/components/editorial/ui';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { EmptyState, Img } from '@/components/ui/misc';
import { defineDict, useDict, useL, emptyL10n } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { allCities } from '@/lib/pricing';
import type { L10n, Project } from '@/lib/types';
import { fold } from '@/lib/search';
import { cn, uid } from '@/lib/utils';

const T = defineDict({
  me: {
    description: 'Lookbook — uredničke priče kampanja i kolekcija (unosi modela „Lookbook“). Izdvojene (★) se prikazuju na početnoj, sve na stranici „Lookbook“.',
    newProject: 'Nova priča',
    model: 'Model sadržaja',
    featured: 'Na početnoj',
    featuredBadge: 'Na početnoj',
    featureAdd: 'Izdvoji na početnoj',
    featureRemove: 'Ukloni sa početne',
    nowFeatured: 'Priča je izdvojena na početnoj',
    nowUnfeatured: 'Priča više nije na početnoj',
    searchPh: 'Pretraži po naslovu ili mestu…',
    empty: 'Još nema priča u lookbooku',
    emptyText: 'Dodajte prvu priču sa fotografijom — kampanju, kolekciju ili trenutak iz naše radionice.',
    noMatch: 'Nijedna priča ne odgovara filteru.',
    addCard: 'Dodaj priču',
    addCardText: 'Fotografija, mesto snimanja i kratak opis',
    editTitle: 'Uredi priču',
    newTitle: 'Nova priča',
    modalText: 'Prikazuje se u lookbooku na sajtu, na sva tri jezika.',
    fTitle: 'Naslov priče',
    fTitlePh: 'npr. Riviera — leto među kamenim ulicama',
    fSummary: 'Kratak opis',
    fSummaryHint: 'Jedna do dve rečenice — tema priče, kolekcija i atmosfera.',
    fLocation: 'Mesto snimanja',
    fLocationPh: 'npr. Mitrovica',
    fYear: 'Godina',
    fImage: 'Fotografija',
    fImageHint: 'Najbolje pejzažna fotografija (3:2), najmanje 1600 px širine.',
    fFeatured: 'Izdvoji na početnoj',
    fFeaturedHint: 'Prikazuje se u sekciji „Lookbook“ na početnoj.',
    saved: 'Priča je sačuvana',
    created: 'Priča je dodata u lookbook',
    deleteTitle: 'Obrisati priču „{name}“?',
    deleteText: 'Priča će biti uklonjena iz lookbooka na sajtu.',
    locationRequired: 'Unesite mesto snimanja.',
    yearInvalid: 'Unesite ispravnu godinu.',
    imageRequired: 'Izaberite fotografiju.',
    stats: '{n} priča · {f} na početnoj · {c} mesta',
  },
  sq: {
    description: 'Lookbook — histori editoriale të fushatave dhe koleksioneve (regjistrimet e modelit „Lookbook“). Të veçuarat (★) shfaqen në ballinë, të gjitha në faqen „Lookbook“.',
    newProject: 'Histori e re',
    model: 'Modeli i përmbajtjes',
    featured: 'Në ballinë',
    featuredBadge: 'Në ballinë',
    featureAdd: 'Veço në ballinë',
    featureRemove: 'Hiq nga ballina',
    nowFeatured: 'Historia u veçua në ballinë',
    nowUnfeatured: 'Historia nuk është më në ballinë',
    searchPh: 'Kërko sipas titullit ose vendit…',
    empty: 'Ende nuk ka histori në lookbook',
    emptyText: 'Shtoni historinë e parë me foto — një fushatë, një koleksion ose një moment nga punëtoria jonë.',
    noMatch: 'Asnjë histori nuk përputhet me filtrin.',
    addCard: 'Shto histori',
    addCardText: 'Foto, vendi i xhirimit dhe përshkrim i shkurtër',
    editTitle: 'Ndrysho historinë',
    newTitle: 'Histori e re',
    modalText: 'Shfaqet në lookbook-un e faqes, në të tri gjuhët.',
    fTitle: 'Titulli i historisë',
    fTitlePh: 'p.sh. Riviera — verë mes rrugëve me gurë',
    fSummary: 'Përshkrim i shkurtër',
    fSummaryHint: 'Një deri në dy fjali — tema e historisë, koleksioni dhe atmosfera.',
    fLocation: 'Vendi i xhirimit',
    fLocationPh: 'p.sh. Mitrovicë',
    fYear: 'Viti',
    fImage: 'Fotografia',
    fImageHint: 'Më mirë foto horizontale (3:2), të paktën 1600 px e gjerë.',
    fFeatured: 'Veço në ballinë',
    fFeaturedHint: 'Shfaqet në seksionin „Lookbook“ në ballinë.',
    saved: 'Historia u ruajt',
    created: 'Historia u shtua në lookbook',
    deleteTitle: 'Të fshihet historia „{name}“?',
    deleteText: 'Historia do të hiqet nga lookbook-u në faqe.',
    locationRequired: 'Shkruani vendin e xhirimit.',
    yearInvalid: 'Shkruani një vit të saktë.',
    imageRequired: 'Zgjidhni një fotografi.',
    stats: '{n} histori · {f} në ballinë · {c} vende',
  },
  en: {
    description: 'Lookbook — editorial stories about campaigns and collections (entries of the “Lookbook” model). Featured ones (★) appear on the homepage, all of them on the “Lookbook” page.',
    newProject: 'New story',
    model: 'Content model',
    featured: 'On homepage',
    featuredBadge: 'On homepage',
    featureAdd: 'Feature on homepage',
    featureRemove: 'Remove from homepage',
    nowFeatured: 'Story featured on the homepage',
    nowUnfeatured: 'Story removed from the homepage',
    searchPh: 'Search by title or place…',
    empty: 'No lookbook stories yet',
    emptyText: 'Add your first story with a photo — a campaign, a collection or a moment from our workshop.',
    noMatch: 'No story matches the filter.',
    addCard: 'Add a story',
    addCardText: 'Photo, location and a short description',
    editTitle: 'Edit story',
    newTitle: 'New story',
    modalText: 'Shown in the lookbook on the site, in all three languages.',
    fTitle: 'Story title',
    fTitlePh: 'e.g. Riviera — summer on stone streets',
    fSummary: 'Short description',
    fSummaryHint: 'One or two sentences — the story’s theme, the collection and the mood.',
    fLocation: 'Location',
    fLocationPh: 'e.g. Mitrovica',
    fYear: 'Year',
    fImage: 'Photo',
    fImageHint: 'Ideally a landscape photo (3:2), at least 1600 px wide.',
    fFeatured: 'Feature on homepage',
    fFeaturedHint: 'Shown in the “Lookbook” section on the homepage.',
    saved: 'Story saved',
    created: 'Story added to the lookbook',
    deleteTitle: 'Delete the story “{name}”?',
    deleteText: 'The story will be removed from the lookbook on the site.',
    locationRequired: 'Enter a location.',
    yearInvalid: 'Enter a valid year.',
    imageRequired: 'Choose a photo.',
    stats: '{n} stories · {f} on homepage · {c} locations',
  },
});

const blankProject = (): Project => ({
  id: uid('pr'),
  title: emptyL10n(),
  location: '',
  year: new Date().getFullYear(),
  tags: [],
  summary: emptyL10n(),
  image: '',
  featured: false,
});

const tagKey = (tag: L10n) => (tag.sq.trim() || tag.me.trim()).toLowerCase();

export default function ProjectsAdmin() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const te = useDict(ed, 'admin');
  const tc = useDict(cx, 'admin');
  const l = useL('admin');
  const can = useCan();
  const projects = useDb((s) => s.projects);
  const upsertProject = useDb((s) => s.upsertProject);
  const deleteProject = useDb((s) => s.deleteProject);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Project | null>(null);
  const [isNew, setIsNew] = useState(false);

  const canEdit = can('content', 'edit');
  const canDelete = can('content', 'delete');

  // Deep links: /admin/projekti?id=<story> (media usage, content models) and ?novi=1
  const deepId = params.get('id');
  const deepNew = params.get('novi');
  useEffect(() => {
    if (deepId) {
      const p = projects.find((x) => x.id === deepId);
      if (p) {
        setIsNew(false);
        setEditing(structuredClone(p));
      }
    } else if (deepNew && canEdit) {
      setIsNew(true);
      setEditing(blankProject());
    }
    // open once per link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepId, deepNew]);

  const close = () => {
    setEditing(null);
    if (deepId || deepNew) setParams({}, { replace: true });
  };

  /** Every tag used across the lookbook (deduplicated on the Albanian label). */
  const allTags = useMemo(() => {
    const map = new Map<string, { tag: L10n; count: number }>();
    projects.forEach((p) =>
      p.tags.forEach((tag) => {
        const k = tagKey(tag);
        if (!k) return;
        const cur = map.get(k);
        if (cur) cur.count++;
        else map.set(k, { tag, count: 1 });
      }),
    );
    return [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [projects]);

  const featuredCount = useMemo(() => projects.filter((p) => p.featured).length, [projects]);
  const cityCount = useMemo(() => new Set(projects.map((p) => p.location.trim().toLowerCase()).filter(Boolean)).size, [projects]);

  const list = useMemo(() => {
    const needle = fold(q.trim());
    return [...projects]
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.year - a.year)
      .filter((p) => {
        if (filter === 'featured' && !p.featured) return false;
        if (filter.startsWith('tag:') && !p.tags.some((tag) => tagKey(tag) === filter.slice(4))) return false;
        if (!needle) return true;
        return fold(`${p.title.me} ${p.title.sq} ${p.title.en} ${p.location} ${p.year}`).includes(needle);
      });
  }, [projects, q, filter]);

  const toggleFeatured = (p: Project) => {
    upsertProject({ ...p, featured: !p.featured });
    toast.success(!p.featured ? t('nowFeatured') : t('nowUnfeatured'), { description: l(p.title) });
  };

  const remove = async (p: Project) => {
    const name = l(p.title);
    if (!(await confirmDialog({ title: t('deleteTitle', { name }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true }))) return false;
    deleteProject(p.id);
    toast.success(te('deletedToast', { name }));
    return true;
  };

  const openNew = () => {
    setIsNew(true);
    setEditing(blankProject());
  };
  const openEdit = (p: Project) => {
    setIsNew(false);
    setEditing(structuredClone(p));
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[ta('nav_content'), ta('nav_projects')]}
        title={ta('nav_projects')}
        description={t('description')}
        actions={
          <>
            <ButtonLink to="/admin/modeli?model=cm-projekti" variant="outline" shape="rounded" size="sm" icon={<Database className="h-4 w-4" />}>
              {t('model')}
            </ButtonLink>
            {canEdit && (
              <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openNew}>
                {t('newProject')}
              </Button>
            )}
          </>
        }
      />

      {!canEdit && (
        <Notice icon={Eye} className="mb-5">
          <span className="font-semibold text-ink">{tc('readOnly')}.</span> {tc('readOnlyText')}
        </Notice>
      )}

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FilterPills
          value={filter}
          onChange={setFilter}
          className="min-w-0"
          options={[
            { id: 'all', label: ta('all'), count: projects.length },
            {
              id: 'featured',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {t('featured')}
                </span>
              ),
              count: featuredCount,
            },
            ...allTags.map(([k, { tag, count }]) => ({ id: `tag:${k}`, label: l(tag), count })),
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="shrink-0 lg:w-72" />
      </div>

      {projects.length > 0 && <p className="-mt-1 mb-4 text-[12.5px] text-muted">{t('stats', { n: projects.length, f: featuredCount, c: cityCount })}</p>}

      {projects.length === 0 ? (
        <div className="rounded-xl border border-line/80 bg-white">
          <EmptyState
            icon={<Images className="h-6 w-6" />}
            title={t('empty')}
            text={t('emptyText')}
            action={
              canEdit ? (
                <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={openNew}>
                  {t('newProject')}
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-line/80 bg-white">
          <EmptyState icon={<Images className="h-6 w-6" />} title={ta('noResults')} text={t('noMatch')} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {list.map((p) => (
            <ProjectCard key={p.id} p={p} canEdit={canEdit} canDelete={canDelete} onEdit={() => openEdit(p)} onToggle={() => toggleFeatured(p)} onDelete={() => remove(p)} />
          ))}
          {filter === 'all' && !q && canEdit && (
            <button
              type="button"
              onClick={openNew}
              className="group flex min-h-[260px] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-ink/20 bg-white/50 p-6 text-center transition hover:border-ink/40 hover:bg-white"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink-soft ring-1 ring-line transition group-hover:bg-ink group-hover:text-white group-hover:ring-ink">
                <Plus className="h-5 w-5" />
              </span>
              <span className="text-[14px] font-semibold text-ink">{t('addCard')}</span>
              <span className="text-[12.5px] text-muted">{t('addCardText')}</span>
            </button>
          )}
        </div>
      )}

      <ProjectModal
        project={editing}
        isNew={isNew}
        canEdit={canEdit}
        canDelete={canDelete}
        suggestions={allTags.map(([, v]) => v.tag)}
        onClose={close}
        onSave={(p) => {
          upsertProject(p);
          toast.success(isNew ? t('created') : t('saved'), { description: l(p.title) });
          close();
        }}
        onDelete={async (p) => {
          if (await remove(p)) close();
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
function ProjectCard({ p, canEdit, canDelete, onEdit, onToggle, onDelete }: { p: Project; canEdit: boolean; canDelete: boolean; onEdit: () => void; onToggle: () => void; onDelete: () => void }) {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const tc = useDict(cx, 'admin');
  const l = useL('admin');
  return (
    <article
      onClick={onEdit}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-[0_10px_30px_-18px_rgb(0_0_0/0.35)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
        {p.image ? (
          <Img small src={p.image} alt={l(p.title)} className="h-full w-full object-cover duration-700 group-hover:scale-[1.03]" />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted">
            <ImageOff className="h-6 w-6" />
          </span>
        )}
        {p.featured && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Star className="h-3 w-3 fill-current" />
            {t('featuredBadge')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[12px] text-muted">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {p.location} · {p.year}
              </span>
            </div>
            <h3 className="mt-1 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">{l(p.title)}</h3>
          </div>
          <span onClick={(e) => e.stopPropagation()} className="-mr-1 -mt-0.5">
            <ActionMenu
              label={ta('actions')}
              items={[
                { label: canEdit ? ta('edit') : ta('preview'), icon: Pencil, onSelect: onEdit },
                { label: p.featured ? t('featureRemove') : t('featureAdd'), icon: p.featured ? StarOff : Star, onSelect: onToggle, disabled: !canEdit },
                { label: ta('delete'), icon: Trash2, onSelect: onDelete, danger: true, divider: true, disabled: !canDelete, title: canDelete ? undefined : tc('noDeletePerm') },
              ]}
            />
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{l(p.summary)}</p>
        {p.tags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1 pt-3">
            {p.tags.map((tag, i) => (
              <span key={i} className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 text-[11.5px] font-medium text-ink-soft">
                {l(tag)}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Create / edit modal                                                 */
/* ------------------------------------------------------------------ */
function ProjectModal({
  project,
  isNew,
  canEdit,
  canDelete,
  suggestions,
  onClose,
  onSave,
  onDelete,
}: {
  project: Project | null;
  isNew: boolean;
  canEdit: boolean;
  canDelete: boolean;
  suggestions: L10n[];
  onClose: () => void;
  onSave: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const te = useDict(ed, 'admin');
  const tc = useDict(cx, 'admin');
  const settings = useDb((s) => s.settings);
  const cityList = useMemo(() => allCities(settings), [settings]);
  const [draft, setDraft] = useState<Project | null>(project);
  const [showErrors, setShowErrors] = useState(false);
  const [prevProject, setPrevProject] = useState<Project | null>(project);

  // Reset local state whenever a different project is opened.
  // (Keeps the last project while the modal animates out.)
  if (project !== prevProject) {
    setPrevProject(project);
    if (project) {
      setDraft(project);
      setShowErrors(false);
    }
  }

  const d = draft ?? project;
  const patch = (p: Partial<Project>) => setDraft((cur) => (cur ? { ...cur, ...p } : cur));
  const currentYear = new Date().getFullYear();
  const errors = d
    ? {
        title: !d.title.sq.trim() ? te('titleRequired') : undefined,
        location: !d.location.trim() ? t('locationRequired') : undefined,
        year: !d.year || d.year < 1990 || d.year > currentYear + 1 ? t('yearInvalid') : undefined,
        image: !d.image ? t('imageRequired') : undefined,
      }
    : {};
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = () => {
    if (!d || !canEdit) return;
    if (hasErrors) {
      setShowErrors(true);
      toast.error(te('fixErrors'));
      return;
    }
    onSave({ ...d, location: d.location.trim() });
  };

  return (
    <Modal
      open={!!project}
      onClose={onClose}
      size="lg"
      title={isNew ? t('newTitle') : t('editTitle')}
      description={t('modalText')}
      footer={
        d && (
          <>
            {!isNew && (
              <span className="mr-auto" title={canDelete ? undefined : tc('noDeletePerm')}>
                <Button variant="ghost" shape="rounded" size="sm" className="text-red-600 hover:bg-red-50" icon={<Trash2 className="h-4 w-4" />} disabled={!canDelete} onClick={() => onDelete(d)}>
                  {ta('delete')}
                </Button>
              </span>
            )}
            <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
              {canEdit ? ta('cancel') : ta('close')}
            </Button>
            {canEdit && (
              <Button shape="rounded" size="sm" onClick={submit}>
                {isNew ? ta('create') : ta('save')}
              </Button>
            )}
          </>
        )
      }
    >
      {d && (
        <form
          className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_250px]"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <fieldset disabled={!canEdit} className="min-w-0 space-y-5">
            <div>
              <L10nInput label={t('fTitle')} value={d.title} onChange={(title) => patch({ title })} placeholder={t('fTitlePh')} required />
              {showErrors && errors.title && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.title}</p>}
            </div>
            <L10nInput label={t('fSummary')} value={d.summary} onChange={(summary) => patch({ summary })} multiline rows={3} hint={t('fSummaryHint')} />
            <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
              <TextField
                label={t('fLocation')}
                required
                value={d.location}
                list="lookbook-places"
                placeholder={t('fLocationPh')}
                leading={<MapPin className="h-4 w-4" />}
                onChange={(e) => patch({ location: e.target.value })}
                error={showErrors ? errors.location : undefined}
              />
              <TextField
                label={t('fYear')}
                required
                type="number"
                inputMode="numeric"
                min={1990}
                max={currentYear + 1}
                value={d.year || ''}
                onChange={(e) => patch({ year: Number(e.target.value) })}
                error={showErrors ? errors.year : undefined}
              />
              <datalist id="lookbook-places">
                {cityList.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <TagsEditor value={d.tags} onChange={(tags) => patch({ tags })} suggestions={suggestions} />
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </fieldset>

          <fieldset disabled={!canEdit} className="space-y-5">
            <div>
              <ImageField label={<span>{t('fImage')} <span className="text-ink">*</span></span>} value={d.image} onChange={(image) => patch({ image })} aspect="aspect-[4/3]" hint={t('fImageHint')} />
              {showErrors && errors.image && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.image}</p>}
            </div>
            <div className={cn('rounded-lg border border-line/80 bg-canvas/40 p-3.5')}>
              <SwitchRow icon={<Star className={cn('h-4 w-4', d.featured && 'fill-current')} />} label={t('fFeatured')} hint={t('fFeaturedHint')} checked={d.featured} onChange={(featured) => patch({ featured })} />
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  );
}
