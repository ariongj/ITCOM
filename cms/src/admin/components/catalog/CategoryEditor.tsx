import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Link2, RefreshCw, Star } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { FieldError, Hint, Label, Switch } from '@/components/ui/Field';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { defineDict, emptyL10n, useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import type { Category } from '@/lib/types';
import { cn, slugify, uid } from '@/lib/utils';

const T = defineDict({
  me: {
    newTitle: 'Nova kategorija',
    editTitle: 'Uredi kategoriju',
    newText: 'Kategorija se odmah pojavljuje u meniju, na početnoj i u prodavnici.',
    editText: 'Izmjene su vidljive na sajtu čim ih sačuvate.',
    name: 'Naziv',
    namePh: 'npr. Kontaktna sočiva',
    tagline: 'Podnaslov',
    taglinePh: 'Kratak opis ispod naziva',
    description: 'Opis',
    descriptionHint: 'Prikazuje se na vrhu stranice kategorije.',
    image: 'Naslovna fotografija',
    imageHint: 'Uspravna fotografija (4:5) najbolje izgleda na početnoj.',
    slug: 'Adresa (URL)',
    slugAuto: 'Generiše se automatski iz albanskog naziva.',
    slugManual: 'Adresa je ručno podešena.',
    slugRegen: 'Generiši iz naziva',
    featured: 'Istaknuta kategorija',
    featuredText: 'Označava kategoriju kao jednu od glavnih ponuda.',
    errName: 'Unesite naziv na albanskom (SQ).',
    errSlug: 'Unesite adresu kategorije.',
    errSlugTaken: 'Ova adresa je već zauzeta.',
    saved: 'Kategorija je sačuvana',
    created: 'Kategorija je kreirana',
  },
  sq: {
    newTitle: 'Kategori e re',
    editTitle: 'Ndrysho kategorinë',
    newText: 'Kategoria shfaqet menjëherë në meny, në faqen kryesore dhe në dyqan.',
    editText: 'Ndryshimet shfaqen në faqe sapo t’i ruani.',
    name: 'Emri',
    namePh: 'p.sh. Monitorë',
    tagline: 'Nëntitulli',
    taglinePh: 'Përshkrim i shkurtër nën emër',
    description: 'Përshkrimi',
    descriptionHint: 'Shfaqet në krye të faqes së kategorisë.',
    image: 'Fotografia kryesore',
    imageHint: 'Një foto vertikale (4:5) duket më mirë në faqen kryesore.',
    slug: 'Adresa (URL)',
    slugAuto: 'Krijohet automatikisht nga emri në shqip.',
    slugManual: 'Adresa është vendosur manualisht.',
    slugRegen: 'Krijo nga emri',
    featured: 'Kategori e veçuar',
    featuredText: 'E shënon kategorinë si një nga ofertat kryesore.',
    errName: 'Shkruani emrin në shqip (SQ).',
    errSlug: 'Shkruani adresën e kategorisë.',
    errSlugTaken: 'Kjo adresë është tashmë e zënë.',
    saved: 'Kategoria u ruajt',
    created: 'Kategoria u krijua',
  },
  en: {
    newTitle: 'New category',
    editTitle: 'Edit category',
    newText: 'The category appears straight away in the menu, on the homepage and in the shop.',
    editText: 'Changes go live on the site as soon as you save.',
    name: 'Name',
    namePh: 'e.g. Contact lenses',
    tagline: 'Tagline',
    taglinePh: 'Short line under the name',
    description: 'Description',
    descriptionHint: 'Shown at the top of the category page.',
    image: 'Cover photo',
    imageHint: 'A portrait photo (4:5) looks best on the homepage.',
    slug: 'Address (URL)',
    slugAuto: 'Generated automatically from the Albanian name.',
    slugManual: 'The address was set manually.',
    slugRegen: 'Generate from name',
    featured: 'Featured category',
    featuredText: 'Marks the category as one of your main offers.',
    errName: 'Enter the Albanian (SQ) name.',
    errSlug: 'Enter the category address.',
    errSlugTaken: 'This address is already taken.',
    saved: 'Category saved',
    created: 'Category created',
  },
});

const blank = (order: number): Category => ({
  id: uid('cat'),
  slug: '',
  name: emptyL10n(),
  tagline: emptyL10n(),
  description: emptyL10n(),
  image: '',
  order,
  featured: false,
});

/**
 * Create / edit a category. Mount with a fresh `key` each time it opens so the
 * draft starts from the given category (null = new).
 */
export function CategoryEditor({ open, category, onClose }: { open: boolean; category: Category | null; onClose: () => void }) {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const categories = useDb((s) => s.categories);
  const upsertCategory = useDb((s) => s.upsertCategory);
  const slugId = useId();

  const isNew = !category;
  const [draft, setDraft] = useState<Category>(() => (category ? structuredClone(category) : blank(categories.reduce((m, c) => Math.max(m, c.order), 0) + 1)));
  // Albanian is the source language: the URL handle follows the SQ name.
  const [slugAuto, setSlugAuto] = useState(() => !category || category.slug === slugify(category.name.sq));
  const [touched, setTouched] = useState(false);

  const set = (patch: Partial<Category>) => setDraft((d) => ({ ...d, ...patch }));
  const slug = slugAuto ? slugify(draft.name.sq) : draft.slug;
  const finalSlug = slugify(slug);
  const slugTaken = !!finalSlug && categories.some((c) => c.id !== draft.id && c.slug === finalSlug);
  const errors = {
    name: !draft.name.sq.trim() ? t('errName') : undefined,
    slug: !finalSlug ? t('errSlug') : slugTaken ? t('errSlugTaken') : undefined,
  };

  const save = () => {
    setTouched(true);
    if (errors.name || errors.slug) return;
    upsertCategory({ ...draft, slug: finalSlug });
    toast.success(isNew ? t('created') : t('saved'));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? t('newTitle') : t('editTitle')}
      description={isNew ? t('newText') : t('editText')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {ta('cancel')}
          </Button>
          <Button shape="rounded" size="sm" onClick={save}>
            {isNew ? ta('create') : ta('save')}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-6 p-6 md:grid-cols-[264px_minmax(0,1fr)]"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="space-y-4">
          <ImageField label={t('image')} value={draft.image} onChange={(image) => set({ image })} aspect="aspect-[16/10] md:aspect-[4/5]" hint={t('imageHint')} />
          <div className={cn('rounded-xl border p-3.5 transition-colors', draft.featured ? 'border-brand-200 bg-brand-50/60' : 'border-line bg-canvas/40')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
                  <Star className={cn('h-3.5 w-3.5', draft.featured ? 'fill-brand-600 text-brand-600' : 'text-muted')} />
                  {t('featured')}
                </div>
                <p className="mt-1 text-xs leading-snug text-muted">{t('featuredText')}</p>
              </div>
              <Switch size="sm" checked={draft.featured} onChange={(featured) => set({ featured })} />
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div>
            <L10nInput label={t('name')} required value={draft.name} onChange={(name) => set({ name })} placeholder={t('namePh')} />
            {touched && <FieldError>{errors.name}</FieldError>}
          </div>
          <L10nInput label={t('tagline')} value={draft.tagline} onChange={(tagline) => set({ tagline })} placeholder={t('taglinePh')} />
          <L10nInput label={t('description')} value={draft.description} onChange={(description) => set({ description })} multiline rows={4} hint={t('descriptionHint')} />

          <div>
            <Label htmlFor={slugId} required>
              {t('slug')}
            </Label>
            <div
              className={cn(
                'flex h-11 items-center overflow-hidden rounded-xl border bg-white transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5',
                touched && errors.slug ? 'border-red-500' : 'border-line',
              )}
            >
              <span className="flex h-full shrink-0 items-center gap-1.5 border-r border-line bg-canvas/70 px-3 font-mono text-[12.5px] text-muted">
                <Link2 className="h-3.5 w-3.5" />
                /produktet/
              </span>
              <input
                id={slugId}
                value={slug}
                onChange={(e) => {
                  setSlugAuto(false);
                  set({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') });
                }}
                onBlur={() => !slugAuto && set({ slug: slugify(draft.slug) })}
                className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-[14px] text-ink outline-none"
                spellCheck={false}
              />
              {!slugAuto && (
                <button
                  type="button"
                  onClick={() => setSlugAuto(true)}
                  title={t('slugRegen')}
                  aria-label={t('slugRegen')}
                  className="mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {touched && errors.slug ? <FieldError>{errors.slug}</FieldError> : <Hint>{slugAuto ? t('slugAuto') : t('slugManual')}</Hint>}
          </div>
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
