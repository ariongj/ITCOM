import type { ReactNode } from 'react';
import { CalendarClock, Ticket } from 'lucide-react';
import type { HeroSlide, HomeSection, HomeSectionType, L10n } from '@/lib/types';
import { L10nInput } from '@/admin/components/L10nInput';
import { GalleryField, ImageField } from '@/admin/components/media';
import { emptyL10n, useDict, useL } from '@/i18n';
import { cn, thumb, uid } from '@/lib/utils';
import { B } from './i18n';
import { CtaFields, Group, IconPicker, ListEditor, SourceNote, TextField, TitleField, ToggleSwitch, isoToLocalInput, localInputToIso } from './fields';
import { FeaturedModePicker } from './ProductPicker';
import { stripStars, trustIcon } from './meta';

export type ChangeOpts = { reload?: boolean };
type DataOf<T extends HomeSectionType> = Extract<HomeSection, { type: T }>['data'];
type SetData<T extends HomeSectionType> = (data: DataOf<T>, opts?: ChangeOpts) => void;

/** Edit form for one homepage section. Every change is reported upward immediately. */
export function SectionForm({ section, onChange }: { section: HomeSection; onChange: (s: HomeSection, opts?: ChangeOpts) => void }) {
  switch (section.type) {
    case 'hero':
      return <HeroForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'trust':
      return <TrustForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'categories':
      return <HeadingForm data={section.data} set={(data) => onChange({ ...section, data })} note={<NoteFor type="categories" />} />;
    case 'projects':
      return <HeadingForm data={section.data} set={(data) => onChange({ ...section, data })} note={<NoteFor type="projects" />} />;
    case 'blog':
      return <HeadingForm data={section.data} set={(data) => onChange({ ...section, data })} note={<NoteFor type="blog" />} />;
    case 'featured':
      return <FeaturedForm data={section.data} set={(data, o) => onChange({ ...section, data }, o)} />;
    case 'promo':
      return <PromoForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'process':
      return <ProcessForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'services':
      return <ServicesForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'stats':
      return <StatsForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'faq':
      return <FaqForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'instagram':
      return <InstagramForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'cta':
      return <CtaForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    case 'spotlight':
      return <SpotlightForm data={section.data} set={(data) => onChange({ ...section, data })} />;
    default:
      return null;
  }
}

function Stack({ children }: { children: ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}

function ImgThumb({ src, className }: { src?: string; className?: string }) {
  return <span className={cn('block h-8 w-11 shrink-0 overflow-hidden rounded-md bg-sand ring-1 ring-line', className)}>{src && <img src={thumb(src)} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>;
}

function NoteFor({ type }: { type: 'categories' | 'projects' | 'blog' }) {
  const t = useDict(B, 'admin');
  if (type === 'categories') return <SourceNote text={t('src_categories')} to="/admin/kategorije" linkLabel={t('openCategories')} />;
  if (type === 'projects') return <SourceNote text={t('src_projects')} to="/admin/projekti" linkLabel={t('openProjects')} />;
  return <SourceNote text={t('src_blog')} to="/admin/savjeti" linkLabel={t('openPosts')} />;
}

/* ------------------------------------------------------------------ */
function HeroForm({ data, set }: { data: DataOf<'hero'>; set: SetData<'hero'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  const newSlide = (): HeroSlide => {
    const first = data.slides[0];
    return {
      id: uid('s'),
      image: first?.image ?? '/images/hero/optical.webp',
      eyebrow: emptyL10n(),
      title: { me: B.me.newSlideTitle, sq: B.sq.newSlideTitle, en: B.en.newSlideTitle },
      subtitle: emptyL10n(),
      primary: first ? structuredClone(first.primary) : { label: emptyL10n(), href: '/produktet' },
      secondary: first ? structuredClone(first.secondary) : { label: emptyL10n(), href: '/kontakt' },
    };
  };
  return (
    <Stack>
      <Group title={t('grpSettings')}>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-3.5 py-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-ink">{t('autoplay')}</div>
            <div className="text-xs text-muted">{t('autoplayHint')}</div>
          </div>
          <ToggleSwitch checked={data.autoplay} onChange={(autoplay) => set({ ...data, autoplay })} label={t('autoplay')} />
        </div>
      </Group>
      <Group title={t('slides')}>
        <ListEditor
          items={data.slides}
          onChange={(slides) => set({ ...data, slides })}
          min={1}
          max={8}
          defaultOpen={0}
          addLabel={t('addSlide')}
          newItem={newSlide}
          thumb={(s) => <ImgThumb src={s.image} />}
          title={(s, i) => stripStars(l(s.title)) || t('slide', { n: i + 1 })}
          subtitle={(s, i) => [t('slide', { n: i + 1 }), l(s.eyebrow)].filter(Boolean).join(' · ')}
          render={(s, up) => (
            <>
              <ImageField label={t('image')} value={s.image} onChange={(image) => up({ image })} aspect="aspect-[16/8]" />
              <L10nInput label={t('eyebrow')} value={s.eyebrow} onChange={(eyebrow) => up({ eyebrow })} />
              <TitleField value={s.title} onChange={(title) => up({ title })} />
              <L10nInput label={t('subtitle')} value={s.subtitle} onChange={(subtitle) => up({ subtitle })} multiline rows={3} />
              <CtaFields title={t('primaryCta')} value={s.primary} onChange={(primary) => up({ primary })} />
              <CtaFields title={t('secondaryCta')} value={s.secondary} onChange={(secondary) => up({ secondary })} />
            </>
          )}
        />
      </Group>
      <SourceNote text={t('heroSlidesNote')} to="/admin/prodavnica/slajdovi" linkLabel={t('openSlides')} />
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function TrustForm({ data, set }: { data: DataOf<'trust'>; set: SetData<'trust'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  return (
    <Stack>
      <Group title={t('items')}>
        <ListEditor
          items={data.items}
          onChange={(items) => set({ ...data, items })}
          max={8}
          addLabel={t('addItem')}
          newItem={() => ({ icon: 'Sparkles', title: emptyL10n(), text: emptyL10n() })}
          thumb={(it) => {
            const Icon = trustIcon(it.icon);
            return (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                <Icon className="h-4 w-4" />
              </span>
            );
          }}
          title={(it, i) => l(it.title) || t('item', { n: i + 1 })}
          subtitle={(it) => l(it.text)}
          render={(it, up) => (
            <>
              <IconPicker value={it.icon} onChange={(icon) => up({ icon })} />
              <L10nInput label={t('title')} value={it.title} onChange={(title) => up({ title })} />
              <L10nInput label={t('text')} value={it.text} onChange={(text) => up({ text })} />
            </>
          )}
        />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function HeadingForm<D extends { eyebrow: L10n; title: L10n; subtitle?: L10n }>({
  data,
  set,
  note,
}: {
  data: D;
  set: (d: D) => void;
  note?: ReactNode;
}) {
  const t = useDict(B, 'admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} />
        {data.subtitle && <L10nInput label={t('subtitle')} value={data.subtitle} onChange={(subtitle) => set({ ...data, subtitle })} multiline rows={2} />}
      </Group>
      {note}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function FeaturedForm({ data, set }: { data: DataOf<'featured'>; set: SetData<'featured'> }) {
  const t = useDict(B, 'admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} />
      </Group>
      <Group title={t('grpContent')}>
        {/* The storefront keeps the active tab in local state, so a mode switch needs a preview reload. */}
        <FeaturedModePicker data={data} onChange={(next) => set(next, { reload: next.mode !== data.mode })} />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function PromoForm({ data, set }: { data: DataOf<'promo'>; set: SetData<'promo'> }) {
  const t = useDict(B, 'admin');
  const ms = new Date(data.endsAt).getTime() - Date.now();
  const left = Number.isNaN(ms) ? null : ms;
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} />
        <L10nInput label={t('text')} value={data.text} onChange={(text) => set({ ...data, text })} multiline rows={4} />
      </Group>
      <Group title={t('grpOffer')}>
        <div className="space-y-4">
          <TextField
            type="datetime-local"
            label={t('endsAt')}
            value={isoToLocalInput(data.endsAt)}
            onChange={(v) => {
              const iso = localInputToIso(v);
              if (iso) set({ ...data, endsAt: iso });
            }}
            leading={<CalendarClock className="h-4 w-4" />}
            hint={
              left === null ? undefined : left > 0 ? (
                <span className="font-semibold text-emerald-700">{t('endsIn', { d: Math.floor(left / 86400000), h: Math.floor((left / 3600000) % 24) })}</span>
              ) : (
                <span className="font-semibold text-amber-700">{t('expired')}</span>
              )
            }
          />
          <TextField
            label={t('code')}
            value={data.code}
            onChange={(v) => set({ ...data, code: v.toUpperCase().replace(/\s+/g, '') })}
            leading={<Ticket className="h-4 w-4" />}
            placeholder="MIFTARI10"
            className="font-mono uppercase tracking-wider"
            hint={t('codeHint')}
            spellCheck={false}
          />
        </div>
      </Group>
      <Group title={t('grpImage')}>
        <ImageField value={data.image} onChange={(image) => set({ ...data, image })} aspect="aspect-[16/9]" />
      </Group>
      <Group title={t('grpButton')}>
        <CtaFields value={data.cta} onChange={(cta) => set({ ...data, cta })} />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function ProcessForm({ data, set }: { data: DataOf<'process'>; set: SetData<'process'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} multiline />
      </Group>
      <Group title={t('steps')}>
        <ListEditor
          items={data.steps}
          onChange={(steps) => set({ ...data, steps })}
          max={8}
          addLabel={t('addStep')}
          newItem={() => ({ title: emptyL10n(), text: emptyL10n() })}
          thumb={(_, i) => <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[12px] font-bold tabular-nums text-paper">{String(i + 1).padStart(2, '0')}</span>}
          title={(s, i) => l(s.title) || t('step', { n: i + 1 })}
          subtitle={(s) => l(s.text)}
          render={(s, up) => (
            <>
              <L10nInput label={t('title')} value={s.title} onChange={(title) => up({ title })} />
              <L10nInput label={t('text')} value={s.text} onChange={(text) => up({ text })} multiline rows={3} />
            </>
          )}
        />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function ServicesForm({ data, set }: { data: DataOf<'services'>; set: SetData<'services'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} multiline />
        <L10nInput label={t('subtitle')} value={data.subtitle} onChange={(subtitle) => set({ ...data, subtitle })} multiline rows={2} />
      </Group>
      <Group title={t('servicesList')}>
        <ListEditor
          items={data.items}
          onChange={(items) => set({ ...data, items })}
          max={12}
          addLabel={t('addService')}
          newItem={() => ({ image: '', title: emptyL10n(), text: emptyL10n() })}
          thumb={(s) => <ImgThumb src={s.image} />}
          title={(s, i) => l(s.title) || t('service', { n: i + 1 })}
          subtitle={(s) => l(s.text)}
          render={(s, up) => (
            <>
              <ImageField label={t('image')} value={s.image} onChange={(image) => up({ image })} aspect="aspect-[16/9]" />
              <L10nInput label={t('title')} value={s.title} onChange={(title) => up({ title })} />
              <L10nInput label={t('text')} value={s.text} onChange={(text) => up({ text })} multiline rows={3} />
            </>
          )}
        />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function StatsForm({ data, set }: { data: DataOf<'stats'>; set: SetData<'stats'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  return (
    <Stack>
      <Group title={t('grpContent')}>
        <ImageField label={t('image')} value={data.image} onChange={(image) => set({ ...data, image })} aspect="aspect-[16/10]" />
        <L10nInput label={t('quote')} value={data.quote} onChange={(quote) => set({ ...data, quote })} multiline rows={3} />
      </Group>
      <Group title={t('figures')}>
        <ListEditor
          items={data.items}
          onChange={(items) => set({ ...data, items })}
          max={6}
          addLabel={t('addFigure')}
          newItem={() => ({ value: '', label: emptyL10n() })}
          thumb={(s) => <span className="display grid h-8 min-w-11 shrink-0 place-items-center rounded-lg bg-brand-50 px-1.5 text-[15px] leading-none text-brand-700">{s.value || '–'}</span>}
          title={(s, i) => l(s.label) || t('figure', { n: i + 1 })}
          render={(s, up) => (
            <>
              <TextField label={t('value')} value={s.value} onChange={(value) => up({ value })} hint={t('valueHint')} placeholder="48h" />
              <L10nInput label={t('label')} value={s.label} onChange={(label) => up({ label })} />
            </>
          )}
        />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function FaqForm({ data, set }: { data: DataOf<'faq'>; set: SetData<'faq'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} />
      </Group>
      <Group title={t('questions')}>
        <ListEditor
          items={data.items}
          onChange={(items) => set({ ...data, items })}
          max={20}
          addLabel={t('addQuestion')}
          newItem={() => ({ q: emptyL10n(), a: emptyL10n() })}
          title={(s, i) => l(s.q) || t('question', { n: i + 1 })}
          render={(s, up) => (
            <>
              <L10nInput label={t('q')} value={s.q} onChange={(q) => up({ q })} />
              <L10nInput label={t('a')} value={s.a} onChange={(a) => up({ a })} multiline rows={5} />
            </>
          )}
        />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function InstagramForm({ data, set }: { data: DataOf<'instagram'>; set: SetData<'instagram'> }) {
  const t = useDict(B, 'admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} />
      </Group>
      <Group title={t('photos')}>
        <GalleryField value={data.images} onChange={(images) => set({ ...data, images })} />
        <p className="-mt-2 text-xs text-muted">{t('photosHint')}</p>
        <SourceNote text={t('src_instagram')} to="/admin/konfiguracija" linkLabel={t('openSettings')} />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function SpotlightForm({ data, set }: { data: DataOf<'spotlight'>; set: SetData<'spotlight'> }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} multiline />
        <L10nInput label={t('text')} value={data.text} onChange={(text) => set({ ...data, text })} multiline rows={3} />
      </Group>
      <Group title={t('grpImage')}>
        <ImageField value={data.image} onChange={(image) => set({ ...data, image })} aspect="aspect-[3/2]" />
      </Group>
      <Group title={t('points')}>
        <ListEditor
          items={data.points}
          onChange={(points) => set({ ...data, points })}
          max={4}
          addLabel={t('addPoint')}
          newItem={() => ({ text: emptyL10n() })}
          title={(it, i) => l(it.text) || t('point', { n: i + 1 })}
          render={(it, up) => <L10nInput label={t('text')} value={it.text} onChange={(text) => up({ text })} />}
        />
        <p className="-mt-2 text-xs text-muted">{t('pointsHint')}</p>
      </Group>
      <Group title={t('grpButton')}>
        <CtaFields title={t('primaryCta')} value={data.primary} onChange={(primary) => set({ ...data, primary })} />
        <CtaFields title={t('secondaryCta')} value={data.secondary} onChange={(secondary) => set({ ...data, secondary })} />
      </Group>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
function CtaForm({ data, set }: { data: DataOf<'cta'>; set: SetData<'cta'> }) {
  const t = useDict(B, 'admin');
  return (
    <Stack>
      <Group title={t('grpHeading')}>
        <L10nInput label={t('eyebrow')} value={data.eyebrow} onChange={(eyebrow) => set({ ...data, eyebrow })} />
        <TitleField value={data.title} onChange={(title) => set({ ...data, title })} multiline />
        <L10nInput label={t('text')} value={data.text} onChange={(text) => set({ ...data, text })} multiline rows={3} />
      </Group>
      <Group title={t('grpImage')}>
        <ImageField value={data.image} onChange={(image) => set({ ...data, image })} aspect="aspect-[16/10]" />
      </Group>
      <SourceNote text={t('src_cta')} to="/admin/kontakti" linkLabel={t('openInquiries')} />
    </Stack>
  );
}
