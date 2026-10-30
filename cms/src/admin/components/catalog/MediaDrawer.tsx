import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  AlertTriangle, BookOpen, Camera, ChevronLeft, ChevronRight, Database, ExternalLink, FileText, FolderTree, GalleryHorizontalEnd, Home,
  Images, Layers, Megaphone, Package, PencilLine, Replace, Trash2,
} from 'lucide-react';
import { Drawer, Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Checkbox, Hint, Label } from '@/components/ui/Field';
import { KV } from '@/admin/components/kit';
import { MediaPicker } from '@/admin/components/media';
import { CopyButton, formatBytes } from './shared';
import { replaceMediaEverywhere, usageOf, type UsageKind, type UsageRef } from './usage';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { date } from '@/lib/format';
import type { HomeSectionType, Lang, MediaItem } from '@/lib/types';
import { cn, thumb } from '@/lib/utils';

export const MEDIA_T = defineDict({
  me: {
    details: 'Detalji fajla',
    prev: 'Prethodni',
    next: 'Sljedeći',
    uploaded: 'Otpremljeno',
    library: 'Iz kataloga',
    alt: 'Alternativni tekst',
    altHint: 'Kratak opis slike — pomaže Google pretrazi i čitačima ekrana.',
    altPh: 'npr. Okvir Prism M2 od titana, crni',
    altSaved: 'Alt tekst je sačuvan',
    altMissing: 'Nedostaje alt tekst',
    dimensions: 'Dimenzije',
    size: 'Veličina',
    type: 'Tip',
    folder: 'Folder',
    added: 'Dodato',
    url: 'Adresa fajla',
    copyUrl: 'Kopiraj URL',
    urlCopied: 'URL je kopiran',
    embedded: 'Fajl je sačuvan u pregledaču (demo) — u produkciji dobija trajnu adresu na serveru.',
    usage: 'Gdje se koristi',
    usageNone: 'Fajl se trenutno ne koristi nigdje — možete ga slobodno obrisati.',
    open: 'Otvori original',
    deleteTitle: 'Obrisati „{name}“?',
    deleteText: 'Fajl će biti uklonjen iz biblioteke. Ova radnja se ne može poništiti.',
    deleteUsed: 'Fajl se koristi na {n} mjesta. Izaberite zamjenu ili potvrdite uklanjanje sa svih mjesta.',
    optReplace: 'Zamijeni drugim fajlom',
    optReplaceHint: 'Sva mjesta dobijaju izabrani fajl, a ovaj se briše.',
    optRemove: 'Obriši i ukloni sa svih mjesta',
    optRemoveHint: 'Slika nestaje iz galerija, sekcija i članaka gdje je postavljena.',
    chooseReplacement: 'Izaberi zamjenu',
    changeReplacement: 'Promijeni',
    sameFile: 'Izaberite drugi fajl za zamjenu.',
    ack: 'Razumijem da slika nestaje sa {n} mjesta.',
    replaceDelete: 'Zamijeni i obriši',
    removeDelete: 'Ukloni i obriši',
    deletedToast: 'Fajl je obrisan',
    replacedToast: 'Zamijenjeno na {n} mjesta, fajl je obrisan',
    removedToast: 'Uklonjeno sa {n} mjesta, fajl je obrisan',
    unknown: 'Nepoznato',
    noDelete: 'Vaša uloga nema dozvolu za brisanje fajlova.',
    kind_product: 'Proizvod',
    kind_category: 'Kategorija',
    kind_collection: 'Kolekcija',
    kind_home: 'Početna stranica',
    kind_homeDraft: 'Početna (nacrt)',
    kind_placement: 'Slajd / baner',
    kind_offer: 'Ponuda',
    kind_project: 'Lookbook',
    kind_post: 'Blog',
    kind_page: 'Stranica',
    kind_model: 'Model sadržaja',
    sec_hero: 'Hero slajder',
    sec_trust: 'Prednosti',
    sec_categories: 'Kategorije',
    sec_featured: 'Izdvojeni proizvodi',
    sec_promo: 'Promo akcija',
    sec_process: 'Kako radimo',
    sec_services: 'Usluge',
    sec_projects: 'Lookbook',
    sec_stats: 'Brojke i citat',
    sec_instagram: 'Instagram',
    sec_faq: 'Česta pitanja',
    sec_blog: 'Savjeti',
    sec_cta: 'Poziv na akciju',
    sec_spotlight: 'Istaknuto',
  },
  sq: {
    details: 'Detajet e skedarit',
    prev: 'I mëparshmi',
    next: 'Tjetri',
    uploaded: 'I ngarkuar',
    library: 'Nga katalogu',
    alt: 'Teksti alternativ',
    altHint: 'Përshkrim i shkurtër i imazhit — ndihmon kërkimin në Google dhe lexuesit e ekranit.',
    altPh: 'p.sh. Kornizë titani Prism M2, e zezë',
    altSaved: 'Teksti alt u ruajt',
    altMissing: 'Mungon teksti alt',
    dimensions: 'Dimensionet',
    size: 'Madhësia',
    type: 'Tipi',
    folder: 'Dosja',
    added: 'Shtuar',
    url: 'Adresa e skedarit',
    copyUrl: 'Kopjo URL',
    urlCopied: 'URL u kopjua',
    embedded: 'Skedari është ruajtur në shfletues (demo) — në prodhim merr një adresë të përhershme në server.',
    usage: 'Ku përdoret',
    usageNone: 'Skedari aktualisht nuk përdoret askund — mund ta fshini lirisht.',
    open: 'Hap origjinalin',
    deleteTitle: 'Të fshihet „{name}“?',
    deleteText: 'Skedari do të hiqet nga biblioteka. Ky veprim nuk mund të zhbëhet.',
    deleteUsed: 'Skedari përdoret në {n} vende. Zgjidhni një zëvendësim ose konfirmoni heqjen nga të gjitha vendet.',
    optReplace: 'Zëvendëso me një skedar tjetër',
    optReplaceHint: 'Të gjitha vendet marrin skedarin e zgjedhur, ndërsa ky fshihet.',
    optRemove: 'Fshi dhe hiq nga të gjitha vendet',
    optRemoveHint: 'Imazhi largohet nga galeritë, seksionet dhe artikujt ku është vendosur.',
    chooseReplacement: 'Zgjidh zëvendësimin',
    changeReplacement: 'Ndrysho',
    sameFile: 'Zgjidhni një skedar tjetër për zëvendësim.',
    ack: 'E kuptoj që imazhi hiqet nga {n} vende.',
    replaceDelete: 'Zëvendëso dhe fshi',
    removeDelete: 'Hiq dhe fshi',
    deletedToast: 'Skedari u fshi',
    replacedToast: 'U zëvendësua në {n} vende, skedari u fshi',
    removedToast: 'U hoq nga {n} vende, skedari u fshi',
    unknown: 'E panjohur',
    noDelete: 'Roli juaj nuk ka leje për të fshirë skedarë.',
    kind_product: 'Produkt',
    kind_category: 'Kategori',
    kind_collection: 'Koleksion',
    kind_home: 'Ballina',
    kind_homeDraft: 'Ballina (draft)',
    kind_placement: 'Slide / banner',
    kind_offer: 'Ofertë',
    kind_project: 'Lookbook',
    kind_post: 'Blog',
    kind_page: 'Faqe',
    kind_model: 'Model përmbajtjeje',
    sec_hero: 'Sllajderi hero',
    sec_trust: 'Përparësitë',
    sec_categories: 'Kategoritë',
    sec_featured: 'Produktet e veçuara',
    sec_promo: 'Aksioni promo',
    sec_process: 'Si punojmë',
    sec_services: 'Shërbimet',
    sec_projects: 'Lookbook',
    sec_stats: 'Shifrat dhe citati',
    sec_instagram: 'Instagram',
    sec_faq: 'Pyetjet e shpeshta',
    sec_blog: 'Këshillat',
    sec_cta: 'Thirrje për veprim',
    sec_spotlight: 'Në fokus',
  },
  en: {
    details: 'File details',
    prev: 'Previous',
    next: 'Next',
    uploaded: 'Uploaded',
    library: 'From catalogue',
    alt: 'Alt text',
    altHint: 'A short description of the image — helps Google search and screen readers.',
    altPh: 'e.g. Prism M2 titanium frame, black',
    altSaved: 'Alt text saved',
    altMissing: 'Alt text missing',
    dimensions: 'Dimensions',
    size: 'File size',
    type: 'Type',
    folder: 'Folder',
    added: 'Added',
    url: 'File address',
    copyUrl: 'Copy URL',
    urlCopied: 'URL copied',
    embedded: 'The file is stored in the browser (demo) — in production it gets a permanent server address.',
    usage: 'Where it is used',
    usageNone: 'This file is not used anywhere — it is safe to delete.',
    open: 'Open original',
    deleteTitle: 'Delete “{name}”?',
    deleteText: 'The file will be removed from the library. This cannot be undone.',
    deleteUsed: 'This file is used in {n} places. Choose a replacement or confirm removing it everywhere.',
    optReplace: 'Replace with another file',
    optReplaceHint: 'Every place gets the chosen file, then this one is deleted.',
    optRemove: 'Delete and remove everywhere',
    optRemoveHint: 'The image disappears from the galleries, sections and articles that use it.',
    chooseReplacement: 'Choose replacement',
    changeReplacement: 'Change',
    sameFile: 'Pick a different file as the replacement.',
    ack: 'I understand the image is removed from {n} places.',
    replaceDelete: 'Replace and delete',
    removeDelete: 'Remove and delete',
    deletedToast: 'File deleted',
    replacedToast: 'Replaced in {n} places, file deleted',
    removedToast: 'Removed from {n} places, file deleted',
    unknown: 'Unknown',
    noDelete: 'Your role cannot delete files.',
    kind_product: 'Product',
    kind_category: 'Category',
    kind_collection: 'Collection',
    kind_home: 'Homepage',
    kind_homeDraft: 'Homepage (draft)',
    kind_placement: 'Slide / banner',
    kind_offer: 'Offer',
    kind_project: 'Lookbook',
    kind_post: 'Blog',
    kind_page: 'Page',
    kind_model: 'Content model',
    sec_hero: 'Hero slider',
    sec_trust: 'Benefits',
    sec_categories: 'Categories',
    sec_featured: 'Featured products',
    sec_promo: 'Promo campaign',
    sec_process: 'How we work',
    sec_services: 'Services',
    sec_projects: 'Lookbook',
    sec_stats: 'Stats & quote',
    sec_instagram: 'Instagram',
    sec_faq: 'FAQ',
    sec_blog: 'Advice',
    sec_cta: 'Call to action',
    sec_spotlight: 'Spotlight',
  },
});

/** Data folder names are stored in Albanian (see data/seed.ts) — show them in the panel language. */
const FOLDER_LABELS: Record<string, Record<Lang, string>> = {
  Hero: { sq: 'Hero', en: 'Hero', me: 'Hero' },
  'Të ndryshme': { sq: 'Të ndryshme', en: 'Other', me: 'Ostalo' },
  Kategoritë: { sq: 'Kategoritë', en: 'Categories', me: 'Kategorije' },
  Shërbimet: { sq: 'Shërbimet', en: 'Services', me: 'Usluge' },
  Lookbook: { sq: 'Lookbook', en: 'Lookbook', me: 'Lookbook' },
  Produktet: { sq: 'Produktet', en: 'Products', me: 'Proizvodi' },
  'Të ngarkuara': { sq: 'Të ngarkuara', en: 'Uploads', me: 'Otpremljeno' },
  // folder names written by older builds (still found in browsers that kept their demo data)
  Ostalo: { sq: 'Të ndryshme', en: 'Other', me: 'Ostalo' },
  Kategorije: { sq: 'Kategoritë', en: 'Categories', me: 'Kategorije' },
  Usluge: { sq: 'Shërbimet', en: 'Services', me: 'Usluge' },
  Projekti: { sq: 'Lookbook', en: 'Lookbook', me: 'Lookbook' },
  Proizvodi: { sq: 'Produktet', en: 'Products', me: 'Proizvodi' },
  Otpremljeno: { sq: 'Të ngarkuara', en: 'Uploads', me: 'Otpremljeno' },
};

export function useFolderLabel() {
  const lang = useLang('admin');
  return useCallback((folder: string) => FOLDER_LABELS[folder]?.[lang] ?? folder, [lang]);
}

export const KIND_ICON: Record<UsageKind, ComponentType<{ className?: string }>> = {
  product: Package,
  category: FolderTree,
  collection: Layers,
  home: Home,
  homeDraft: PencilLine,
  placement: GalleryHorizontalEnd,
  offer: Megaphone,
  project: Camera,
  post: BookOpen,
  page: FileText,
  model: Database,
};

export function fileFormat(m: MediaItem) {
  const mime = /^data:image\/([a-z+]+)/i.exec(m.url)?.[1];
  const ext = mime ?? /\.([a-z0-9]+)(\?.*)?$/i.exec(m.url)?.[1] ?? /\.([a-z0-9]+)$/i.exec(m.name)?.[1] ?? '';
  return ext.replace('jpeg', 'jpg').replace('svg+xml', 'svg').toUpperCase();
}

/** Readable "where" label of a usage reference. */
export function useUsageLabel() {
  const t = useDict(MEDIA_T, 'admin');
  const l = useL('admin');
  return useCallback(
    (r: UsageRef) => ((r.kind === 'home' || r.kind === 'homeDraft') && r.section ? t(`sec_${r.section as HomeSectionType}`) : r.name ? l(r.name) : r.label ?? ''),
    [t, l],
  );
}

export function MediaDrawer({ item, onClose, usage, onPrev, onNext }: { item: MediaItem | null; onClose: () => void; usage: Map<string, UsageRef[]>; onPrev?: () => void; onNext?: () => void }) {
  const t = useDict(MEDIA_T, 'admin');
  // Keep the last item while the drawer animates out
  const [last, setLast] = useState<MediaItem | null>(item);
  if (item && item !== last) setLast(item);
  const shown = item ?? last;
  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      width="max-w-[520px]"
      title={
        <div className="flex items-center gap-2">
          <span className="text-[16px]">{t('details')}</span>
          <span className="ml-1 flex items-center gap-0.5">
            <button type="button" onClick={onPrev} disabled={!onPrev} title={t('prev')} aria-label={t('prev')} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} title={t('next')} aria-label={t('next')} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        </div>
      }
    >
      {shown && <MediaDetails key={shown.id} item={shown} usage={usageOf(usage, shown.url)} onDeleted={onClose} />}
    </Drawer>
  );
}

function MediaDetails({ item, usage, onDeleted }: { item: MediaItem; usage: UsageRef[]; onDeleted: () => void }) {
  const t = useDict(MEDIA_T, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const folderLabel = useFolderLabel();
  const where = useUsageLabel();
  const updateMedia = useDb((s) => s.updateMedia);
  const [alt, setAlt] = useState(item.alt ?? '');
  const [dims, setDims] = useState<{ w: number; h: number } | null>(item.width && item.height ? { w: item.width, h: item.height } : null);
  const [bytes, setBytes] = useState<number | null>(item.size ?? null);
  const [deleting, setDeleting] = useState(false);
  const isData = item.url.startsWith('data:');
  const dirty = alt.trim() !== (item.alt ?? '').trim();
  const canEdit = can('content', 'edit');
  const canDelete = can('content', 'delete');

  // File size for bundled images: ask the server (HEAD) — "when known"; cached on the media record
  useEffect(() => {
    if (item.size || isData) return;
    let alive = true;
    fetch(item.url, { method: 'HEAD' })
      .then((r) => {
        const n = Number(r.headers.get('content-length'));
        if (alive && r.ok && n > 0) {
          setBytes(n);
          updateMedia(item.id, { size: n });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item.id, item.url, item.size, isData, updateMedia]);

  const saveAlt = () => {
    updateMedia(item.id, { alt: alt.trim() });
    toast.success(t('altSaved'));
  };

  const absoluteUrl = isData ? item.url : new URL(item.url, window.location.origin).href;

  return (
    <div className="flex min-h-full flex-col">
      <div className="space-y-6 p-5 sm:p-6">
        {/* Preview on a checkerboard so transparent PNGs read correctly */}
        <div
          className="grid place-items-center overflow-hidden rounded-xl ring-1 ring-line"
          style={{ backgroundColor: '#f4f4f4', backgroundImage: 'linear-gradient(45deg,#e9e9e9 25%,transparent 25%,transparent 75%,#e9e9e9 75%),linear-gradient(45deg,#e9e9e9 25%,transparent 25%,transparent 75%,#e9e9e9 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0,8px 8px' }}
        >
          <img
            src={item.url}
            alt={item.alt ?? ''}
            className="max-h-[300px] w-auto max-w-full object-contain"
            onLoad={(e) => {
              if (dims) return;
              const w = e.currentTarget.naturalWidth;
              const h = e.currentTarget.naturalHeight;
              setDims({ w, h });
              if (w && h) updateMedia(item.id, { width: w, height: h });
            }}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-soft">{item.uploaded ? t('uploaded') : t('library')}</span>
            <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-soft">{folderLabel(item.folder)}</span>
            <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-soft">{fileFormat(item) || '—'}</span>
          </div>
          <h3 className="mt-2.5 break-all text-[17px] font-semibold leading-snug text-ink">{item.name}</h3>
        </div>

        {/* Alt text */}
        <div>
          <Label htmlFor="media-alt">{t('alt')}</Label>
          <div className="flex gap-2">
            <input
              id="media-alt"
              value={alt}
              disabled={!canEdit}
              placeholder={t('altPh')}
              onChange={(e) => setAlt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && dirty && saveAlt()}
              className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas"
            />
            {canEdit && (
              <Button shape="rounded" size="sm" variant={dirty ? 'primary' : 'outline'} disabled={!dirty} onClick={saveAlt} className="h-10">
                {ta('save')}
              </Button>
            )}
          </div>
          {!item.alt?.trim() && !dirty ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> {t('altMissing')} — {t('altHint')}
            </p>
          ) : (
            <Hint>{t('altHint')}</Hint>
          )}
        </div>

        {/* Facts */}
        <div className="rounded-lg border border-line bg-white px-4 py-1">
          <KV label={t('dimensions')} className="border-b border-line/60">
            {dims ? `${dims.w} × ${dims.h} px` : <span className="text-muted">{t('unknown')}</span>}
          </KV>
          <KV label={t('size')} className="border-b border-line/60">
            {bytes ? formatBytes(bytes, lang) : <span className="text-muted">{t('unknown')}</span>}
          </KV>
          <KV label={t('type')} className="border-b border-line/60">
            {fileFormat(item) || '—'}
          </KV>
          <KV label={t('added')}>{date(item.createdAt, lang)}</KV>
        </div>

        {/* URL */}
        <div>
          <Label>{t('url')}</Label>
          <div className="flex gap-2">
            <div className="flex h-9 min-w-0 flex-1 items-center rounded-lg border border-line bg-canvas/60 px-3 font-mono text-[12px] text-ink-soft">
              <span className="truncate">{isData ? `${item.url.slice(0, 32)}…` : item.url}</span>
            </div>
            <CopyButton text={absoluteUrl} label={t('copyUrl')} toastText={t('urlCopied')} />
          </div>
          {isData && <Hint>{t('embedded')}</Hint>}
        </div>

        {/* Usage */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">{t('usage')}</Label>
            <span className={cn('rounded-md px-1.5 text-[11px] font-bold tabular-nums', usage.length ? 'bg-ink text-white' : 'bg-canvas text-muted')}>{usage.length}</span>
          </div>
          {usage.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line bg-canvas/40 px-4 py-4 text-[13px] text-muted">{t('usageNone')}</p>
          ) : (
            <UsageList refs={usage} where={where} />
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-auto flex items-center justify-between gap-2 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <span title={canDelete ? undefined : t('noDelete')}>
          <Button variant="ghost" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} className="text-red-600 hover:bg-red-50" disabled={!canDelete} onClick={() => setDeleting(true)}>
            {ta('delete')}
          </Button>
        </span>
        {!isData && (
          <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink/35">
            {t('open')} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <DeleteMediaModal
        item={deleting ? item : null}
        usage={usage}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          setDeleting(false);
          onDeleted();
        }}
      />
    </div>
  );
}

function UsageList({ refs, where, compact }: { refs: UsageRef[]; where: (r: UsageRef) => string; compact?: boolean }) {
  const t = useDict(MEDIA_T, 'admin');
  return (
    <ul className={cn('divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-white', compact && 'max-h-[220px] overflow-y-auto')}>
      {refs.map((u) => {
        const Icon = KIND_ICON[u.kind];
        return (
          <li key={`${u.kind}-${u.id}`}>
            <Link to={u.to} className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-canvas/60">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-canvas text-ink-soft group-hover:bg-white">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{where(u)}</span>
                <span className="block text-[11.5px] text-muted">{t(`kind_${u.kind}`)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Delete a library file. Unused → plain confirmation. Used → the PDF rule: pick a replacement (every reference is
 * re-pointed) or explicitly acknowledge that the image is removed from every place that uses it.
 */
export function DeleteMediaModal({ item, usage, onClose, onDeleted }: { item: MediaItem | null; usage: UsageRef[]; onClose: () => void; onDeleted: () => void }) {
  const t = useDict(MEDIA_T, 'admin');
  const ta = useDict(adm, 'admin');
  const where = useUsageLabel();
  const media = useDb((s) => s.media);
  const deleteMedia = useDb((s) => s.deleteMedia);
  const [mode, setMode] = useState<'replace' | 'remove'>('replace');
  const [replacement, setReplacement] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [picking, setPicking] = useState(false);
  const [prev, setPrev] = useState<MediaItem | null>(item);
  if (item !== prev) {
    setPrev(item);
    setMode('replace');
    setReplacement(null);
    setAck(false);
  }

  const shown = item ?? prev;
  const used = usage.length > 0;
  const replacementItem = replacement ? media.find((m) => m.url === replacement) : undefined;
  const ready = !used || (mode === 'replace' ? !!replacement : ack);

  const run = () => {
    if (!shown || !ready) return;
    let n = 0;
    if (used) n = replaceMediaEverywhere(shown.url, mode === 'replace' ? replacement : null);
    deleteMedia(shown.id);
    toast.success(!used ? t('deletedToast') : mode === 'replace' ? t('replacedToast', { n }) : t('removedToast', { n }));
    onDeleted();
  };

  return (
    <>
      <Modal
        open={!!item}
        onClose={onClose}
        size="md"
        title={shown ? t('deleteTitle', { name: shown.name }) : ''}
        description={used ? t('deleteUsed', { n: usage.length }) : t('deleteText')}
        footer={
          <>
            <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
              {ta('cancel')}
            </Button>
            <Button variant="danger" shape="rounded" size="sm" disabled={!ready} onClick={run} icon={used && mode === 'replace' ? <Replace className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}>
              {!used ? ta('delete') : mode === 'replace' ? t('replaceDelete') : t('removeDelete')}
            </Button>
          </>
        }
      >
        {shown && (
          <div className="space-y-4 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <img src={thumb(shown.url)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-line" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-ink">{shown.name}</div>
                <div className="text-[12.5px] text-muted">{fileFormat(shown)}</div>
              </div>
            </div>

            {used && (
              <>
                <UsageList refs={usage} where={where} compact />
                <div className="overflow-hidden rounded-lg border border-line">
                  {(['replace', 'remove'] as const).map((m, i) => {
                    const on = mode === m;
                    return (
                      <div key={m} className={cn('px-3.5 py-3', i > 0 && 'border-t border-line', on && 'bg-ink/[0.03]')}>
                        <label className="flex cursor-pointer items-start gap-3">
                          <input type="radio" className="peer sr-only" checked={on} onChange={() => setMode(m)} name="media-delete-mode" />
                          <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', on ? 'border-ink bg-ink' : 'border-ink/30 bg-white')}>
                            <span className={cn('h-1.5 w-1.5 rounded-full bg-white', on ? 'scale-100' : 'scale-0')} />
                          </span>
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                              {m === 'replace' ? <Replace className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                              {m === 'replace' ? t('optReplace') : t('optRemove')}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{m === 'replace' ? t('optReplaceHint') : t('optRemoveHint')}</span>
                          </span>
                        </label>
                        {on && m === 'replace' && (
                          <div className="mt-3 flex items-center gap-3 pl-7">
                            {replacementItem || replacement ? (
                              <>
                                <img src={thumb(replacement!)} alt="" className="h-11 w-11 rounded-md object-cover ring-1 ring-line" />
                                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{replacementItem?.name ?? replacement}</span>
                                <Button variant="outline" size="xs" shape="rounded" onClick={() => setPicking(true)}>
                                  {t('changeReplacement')}
                                </Button>
                              </>
                            ) : (
                              <Button variant="outline" size="sm" shape="rounded" icon={<Images className="h-4 w-4" />} onClick={() => setPicking(true)}>
                                {t('chooseReplacement')}
                              </Button>
                            )}
                          </div>
                        )}
                        {on && m === 'remove' && (
                          <div className="mt-3 pl-7">
                            <Checkbox checked={ack} onChange={setAck} label={<span className="text-[13px] font-medium text-ink">{t('ack', { n: usage.length })}</span>} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={([url]) => {
          if (!url || !shown) return;
          if (url === shown.url) {
            toast.error(t('sameFile'));
            return;
          }
          setReplacement(url);
        }}
      />
    </>
  );
}
