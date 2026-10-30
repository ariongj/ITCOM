import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, ExternalLink, FolderTree, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Field';
import { Badge, EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, confirmDialog } from '@/admin/components/kit';
import { CategoryEditor } from '@/admin/components/catalog/CategoryEditor';
import { IconBtn } from '@/admin/components/catalog/shared';
import { defineDict, useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCategories } from '@/store/hooks';
import type { Category } from '@/lib/types';
import { cn, thumb } from '@/lib/utils';
import { href } from '@/lib/paths';

const T = defineDict({
  me: {
    title: 'Kategorije',
    subtitle: 'Glavne grupe proizvoda. Redoslijed sa ove liste važi za meni, početnu stranicu i prodavnicu.',
    newCategory: 'Nova kategorija',
    colOrder: 'Red',
    colCategory: 'Kategorija',
    colProducts: 'Proizvodi',
    colFeatured: 'Istaknuta',
    activeN: '{n} aktivnih',
    activeOne: '1 aktivan',
    draftsN: '+ {n} u nacrtu',
    noProducts: 'Bez proizvoda',
    moveUp: 'Pomjeri gore',
    moveDown: 'Pomjeri dolje',
    openOnSite: 'Otvori na sajtu',
    featuredOn: 'Kategorija „{name}“ je istaknuta',
    featuredOff: 'Kategorija „{name}“ više nije istaknuta',
    deleteBlocked: 'Kategorija „{name}“ ima proizvoda: {n}',
    deleteBlockedHint: 'Premjestite proizvode u drugu kategoriju ili ih obrišite, pa pokušajte ponovo.',
    deleteTitle: 'Obrisati kategoriju „{name}“?',
    deleteText: 'Kategorija će nestati iz menija i sa početne stranice. Ova radnja se ne može poništiti.',
    deletedToast: 'Kategorija je obrisana',
    previewTitle: 'Prikaz na početnoj',
    previewText: 'Ovim redoslijedom kupci vide kategorije na sajtu.',
    previewLink: 'Pogledaj početnu',
    emptyTitle: 'Još nema kategorija',
    emptyText: 'Dodajte prvu kategoriju da biste rasporedili proizvode u prodavnici.',
    tipTitle: 'Savjet',
    tipText: 'Strelicama mijenjate redoslijed — promjena je odmah vidljiva na sajtu.',
  },
  sq: {
    title: 'Kategoritë',
    subtitle: 'Grupet kryesore të produkteve. Renditja e kësaj liste vlen për menynë, faqen kryesore dhe dyqanin.',
    newCategory: 'Kategori e re',
    colOrder: 'Radha',
    colCategory: 'Kategoria',
    colProducts: 'Produktet',
    colFeatured: 'E veçuar',
    activeN: '{n} aktive',
    activeOne: '1 aktiv',
    draftsN: '+ {n} draft',
    noProducts: 'Pa produkte',
    moveUp: 'Lëviz lart',
    moveDown: 'Lëviz poshtë',
    openOnSite: 'Hap në faqe',
    featuredOn: 'Kategoria „{name}” u veçua',
    featuredOff: 'Kategoria „{name}” nuk është më e veçuar',
    deleteBlocked: 'Kategoria „{name}” ka produkte: {n}',
    deleteBlockedHint: 'Zhvendosni produktet në një kategori tjetër ose fshijini, pastaj provoni përsëri.',
    deleteTitle: 'Të fshihet kategoria „{name}”?',
    deleteText: 'Kategoria do të zhduket nga menyja dhe nga faqja kryesore. Ky veprim nuk mund të zhbëhet.',
    deletedToast: 'Kategoria u fshi',
    previewTitle: 'Pamja në faqen kryesore',
    previewText: 'Me këtë renditje klientët i shohin kategoritë në faqe.',
    previewLink: 'Shiko faqen kryesore',
    emptyTitle: 'Ende nuk ka kategori',
    emptyText: 'Shtoni kategorinë e parë për të organizuar produktet në dyqan.',
    tipTitle: 'Këshillë',
    tipText: 'Me shigjeta ndryshoni renditjen — ndryshimi shfaqet menjëherë në faqe.',
  },
  en: {
    title: 'Categories',
    subtitle: 'Your main product groups. The order of this list drives the menu, the homepage and the shop.',
    newCategory: 'New category',
    colOrder: 'Order',
    colCategory: 'Category',
    colProducts: 'Products',
    colFeatured: 'Featured',
    activeN: '{n} active',
    activeOne: '1 active',
    draftsN: '+ {n} draft',
    noProducts: 'No products',
    moveUp: 'Move up',
    moveDown: 'Move down',
    openOnSite: 'Open on site',
    featuredOn: '“{name}” is now featured',
    featuredOff: '“{name}” is no longer featured',
    deleteBlocked: '“{name}” still has products: {n}',
    deleteBlockedHint: 'Move the products to another category or delete them, then try again.',
    deleteTitle: 'Delete “{name}”?',
    deleteText: 'The category will disappear from the menu and the homepage. This cannot be undone.',
    deletedToast: 'Category deleted',
    previewTitle: 'Homepage preview',
    previewText: 'This is the order shoppers see on the site.',
    previewLink: 'View homepage',
    emptyTitle: 'No categories yet',
    emptyText: 'Add your first category to organise products in the shop.',
    tipTitle: 'Tip',
    tipText: 'Use the arrows to change the order — it updates on the site instantly.',
  },
});

type EditorState = { open: boolean; cat: Category | null; key: number };

export default function Categories() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const cats = useCategories();
  const products = useDb((s) => s.products);
  const upsertCategory = useDb((s) => s.upsertCategory);
  const deleteCategory = useDb((s) => s.deleteCategory);
  const moveCategory = useDb((s) => s.moveCategory);
  const [params, setParams] = useSearchParams();
  const [editor, setEditor] = useState<EditorState>({ open: false, cat: null, key: 0 });
  const [flash, setFlash] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map<string, { active: number; draft: number }>();
    for (const p of products) {
      const c = m.get(p.categoryId) ?? { active: 0, draft: 0 };
      if (p.status === 'active') c.active++;
      else c.draft++;
      m.set(p.categoryId, c);
    }
    return m;
  }, [products]);

  const openEditor = (cat: Category | null) => setEditor((e) => ({ open: true, cat, key: e.key + 1 }));

  // Deep link from the media library: /admin/kategorije?uredi=<id>
  const editParam = params.get('uredi');
  useEffect(() => {
    if (!editParam) return;
    const cat = cats.find((c) => c.id === editParam);
    if (cat) openEditor(cat);
    setParams({}, { replace: true });
  }, [editParam, cats, setParams]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 900);
    return () => window.clearTimeout(id);
  }, [flash]);

  const move = (c: Category, dir: -1 | 1) => {
    moveCategory(c.id, dir);
    setFlash(c.id);
  };

  const remove = async (c: Category) => {
    const n = (counts.get(c.id)?.active ?? 0) + (counts.get(c.id)?.draft ?? 0);
    if (n > 0) {
      toast.error(t('deleteBlocked', { name: l(c.name), n }), { description: t('deleteBlockedHint') });
      return;
    }
    const ok = await confirmDialog({ title: t('deleteTitle', { name: l(c.name) }), text: t('deleteText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    deleteCategory(c.id);
    toast.success(t('deletedToast'));
  };

  const toggleFeatured = (c: Category, featured: boolean) => {
    upsertCategory({ ...c, featured });
    toast.success(featured ? t('featuredOn', { name: l(c.name) }) : t('featuredOff', { name: l(c.name) }));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
        badge={<Badge tone="sand">{cats.length}</Badge>}
        actions={
          <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openEditor(null)}>
            {t('newCategory')}
          </Button>
        }
      />

      {cats.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderTree className="h-6 w-6" />}
            title={t('emptyTitle')}
            text={t('emptyText')}
            action={
              <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openEditor(null)}>
                {t('newCategory')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Card padded={false} className="overflow-hidden">
            {/* Column headings (desktop) */}
            <div className="hidden items-center gap-4 border-b border-line bg-canvas/60 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted md:flex">
              <span className="w-[68px]">{t('colOrder')}</span>
              <span className="min-w-0 flex-1">{t('colCategory')}</span>
              <span className="w-[104px]">{t('colProducts')}</span>
              <span className="w-[76px]">{t('colFeatured')}</span>
              <span className="w-[72px]" />
            </div>
            <ul>
              {cats.map((c, i) => {
                const n = counts.get(c.id) ?? { active: 0, draft: 0 };
                const first = i === 0;
                const last = i === cats.length - 1;
                return (
                  <motion.li
                    key={c.id}
                    layout
                    transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                    className={cn(
                      'relative flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line/70 bg-white px-4 py-3.5 transition-colors duration-700 last:border-0 sm:px-5 md:flex-nowrap',
                      flash === c.id && 'bg-brand-50/70',
                    )}
                  >
                    {/* Order + arrows */}
                    <div className="flex w-[68px] shrink-0 items-center gap-2">
                      <span className="w-6 text-center text-[13px] font-extrabold tabular-nums text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex flex-col overflow-hidden rounded-lg bg-white ring-1 ring-line">
                        <button type="button" onClick={() => move(c, -1)} disabled={first} title={t('moveUp')} aria-label={t('moveUp')} className="grid h-[22px] w-7 place-items-center text-ink-soft transition hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-25">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <span className="h-px bg-line" />
                        <button type="button" onClick={() => move(c, 1)} disabled={last} title={t('moveDown')} aria-label={t('moveDown')} className="grid h-[22px] w-7 place-items-center text-ink-soft transition hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-25">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </div>

                    {/* Image + name + slug */}
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <button type="button" onClick={() => openEditor(c)} aria-label={ta('edit')} className="group relative block h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-sand ring-1 ring-line">
                        {c.image && <img src={thumb(c.image)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                        {c.featured && (
                          <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/95 text-brand-600 shadow-sm">
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                      </button>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <button type="button" onClick={() => openEditor(c)} className="truncate text-[15px] font-bold text-ink transition-colors hover:text-brand-700">
                            {l(c.name)}
                          </button>
                          <a
                            href={href(`/produktet/${c.slug}`)}
                            target="_blank"
                            rel="noreferrer"
                            title={t('openOnSite')}
                            className="hidden shrink-0 items-center gap-1 rounded-md bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 sm:inline-flex"
                          >
                            /{c.slug}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        <p className="mt-0.5 truncate text-[13px] text-muted">{l(c.tagline)}</p>
                      </div>
                    </div>

                    {/* Products + featured + actions (mobile: second row under the name) */}
                    <div className="flex w-full items-center gap-2 pl-[84px] md:contents">
                      <div className="min-w-0 flex-1 text-[13px] md:w-[104px] md:flex-none md:shrink-0">
                        {n.active + n.draft === 0 ? (
                          <span className="text-muted">{t('noProducts')}</span>
                        ) : (
                          <>
                            <span className="font-semibold text-ink">{n.active === 1 ? t('activeOne') : t('activeN', { n: n.active })}</span>
                            {n.draft > 0 && <span className="ml-1.5 text-xs text-muted md:ml-0 md:mt-0.5 md:block">{t('draftsN', { n: n.draft })}</span>}
                          </>
                        )}
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5 md:w-[76px]" title={t('colFeatured')}>
                        <Star className={cn('h-3.5 w-3.5 md:hidden', c.featured ? 'fill-brand-600 text-brand-600' : 'text-muted')} />
                        <Switch size="sm" checked={c.featured} onChange={(v) => toggleFeatured(c, v)} />
                      </span>
                      <span className="flex w-[72px] shrink-0 justify-end gap-0.5">
                        <IconBtn icon={<Pencil className="h-4 w-4" />} label={ta('edit')} onClick={() => openEditor(c)} />
                        <IconBtn icon={<Trash2 className="h-4 w-4" />} label={ta('delete')} danger onClick={() => remove(c)} />
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </Card>

          <HomePreview cats={cats} flash={flash} />
        </div>
      )}

      <CategoryEditor key={editor.key} open={editor.open} category={editor.cat} onClose={() => setEditor((e) => ({ ...e, open: false }))} />
    </div>
  );
}

/** Miniature of the homepage category grid — updates live while reordering. */
function HomePreview({ cats, flash }: { cats: Category[]; flash: string | null }) {
  const t = useDict(T, 'admin');
  const l = useL('admin');
  return (
    <Card
      title={t('previewTitle')}
      description={t('previewText')}
      className="xl:sticky xl:top-24"
      actions={
        <a href={href('/')} target="_blank" rel="noreferrer" title={t('previewLink')} aria-label={t('previewLink')} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
          <ExternalLink className="h-4 w-4" />
        </a>
      }
    >
      <div className="grid grid-cols-3 gap-2 pb-5 sm:gap-3 xl:gap-2">
        {cats.map((c, i) => (
          <motion.div key={c.id} layout transition={{ type: 'spring', stiffness: 420, damping: 38 }} className={cn(i % 3 === 1 && 'translate-y-5')}>
            <div className={cn('relative aspect-[4/5] overflow-hidden rounded-xl bg-ink ring-2 ring-offset-2 transition', flash === c.id ? 'ring-brand-600' : 'ring-transparent')}>
              {c.image && <img src={thumb(c.image)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
              <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-white/20 px-1.5 text-[9px] font-bold tracking-[0.14em] text-white backdrop-blur-md">{String(i + 1).padStart(2, '0')}</span>
              <span className="absolute inset-x-2 bottom-1.5 block truncate font-display text-[13px] leading-tight text-white sm:text-lg xl:text-[13px]">{l(c.name)}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 rounded-xl bg-canvas/70 p-3 text-xs leading-relaxed text-muted">
        <span className="font-bold text-ink-soft">{t('tipTitle')}:</span> {t('tipText')}
      </p>
    </Card>
  );
}
