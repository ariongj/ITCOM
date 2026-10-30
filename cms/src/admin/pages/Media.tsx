import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CircleDashed, ImageIcon, Images, LayoutGrid, Link2, List, TextCursorInput, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, FilterPills, PageHeader, SearchInput } from '@/admin/components/kit';
import { Dropzone, useUploader } from '@/admin/components/media';
import { MediaDrawer, fileFormat, useFolderLabel } from '@/admin/components/catalog/MediaDrawer';
import { StatTile, formatBytes } from '@/admin/components/catalog/shared';
import { useMediaUsage, usageOf } from '@/admin/components/catalog/usage';
import { Segmented, SelectField } from '@/admin/components/editorial/ui';
import { defineDict, useDict, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { MediaItem } from '@/lib/types';
import { date } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, thumb } from '@/lib/utils';

const T = defineDict({
  me: {
    subtitle: 'Biblioteka fajlova sajta — pretraga, tip, alt tekst, dimenzije i reference upotrebe. Fajl koji se koristi briše se tek uz zamjenu ili jasnu potvrdu.',
    upload: 'Otpremi fajlove',
    statTotal: 'Ukupno fajlova',
    statTotalHint: '{n} otpremljeno · {size}',
    statTotalHintNone: 'u {n} foldera',
    statUsed: 'U upotrebi',
    statUsedHint: '{pct}% biblioteke',
    statUnused: 'Nekorišćeni',
    statUnusedHint: 'Kandidati za brisanje',
    statNoAlt: 'Bez alt teksta',
    statNoAltHint: 'Dopunite za SEO i pristupačnost',
    searchPh: 'Pretraži po nazivu ili alt tekstu…',
    allTypes: 'Svi tipovi',
    typeImage: 'Slika · {f}',
    useAll: 'Svi',
    useUsed: 'U upotrebi',
    useUnused: 'Nekorišćeni',
    useNoAlt: 'Bez alt',
    gridView: 'Mreža',
    listView: 'Lista',
    usedN: 'Koristi se {n}×',
    unused: 'Nekorišćen',
    noAlt: 'Bez alt teksta',
    fresh: 'Novo',
    emptyTitle: 'Nema fajlova za prikaz',
    emptyText: 'Promijenite pretragu ili filter, ili otpremite nove fotografije.',
    resetFilters: 'Poništi filtere',
    sortHint: 'Najnovije prvo',
    loadMore: 'Prikaži još {n}',
    colFile: 'Fajl',
    colType: 'Tip',
    colDims: 'Dimenzije',
    colSize: 'Veličina',
    colUsage: 'Upotreba',
    colAdded: 'Dodato',
  },
  sq: {
    subtitle: 'Biblioteka e skedarëve të faqes — kërkim, tip, tekst alt, dimensione dhe referenca përdorimi. Skedari në përdorim fshihet vetëm me zëvendësim ose konfirmim të qartë.',
    upload: 'Ngarko skedarë',
    statTotal: 'Gjithsej skedarë',
    statTotalHint: '{n} të ngarkuar · {size}',
    statTotalHintNone: 'në {n} dosje',
    statUsed: 'Në përdorim',
    statUsedHint: '{pct}% e bibliotekës',
    statUnused: 'Të papërdorur',
    statUnusedHint: 'Kandidatë për fshirje',
    statNoAlt: 'Pa tekst alt',
    statNoAltHint: 'Plotësojini për SEO dhe aksesueshmëri',
    searchPh: 'Kërko sipas emrit ose tekstit alt…',
    allTypes: 'Të gjitha tipet',
    typeImage: 'Imazh · {f}',
    useAll: 'Të gjithë',
    useUsed: 'Në përdorim',
    useUnused: 'Të papërdorur',
    useNoAlt: 'Pa alt',
    gridView: 'Rrjetë',
    listView: 'Listë',
    usedN: 'Përdoret {n}×',
    unused: 'I papërdorur',
    noAlt: 'Pa tekst alt',
    fresh: 'I ri',
    emptyTitle: 'Nuk ka skedarë për të shfaqur',
    emptyText: 'Ndryshoni kërkimin ose filtrin, ose ngarkoni foto të reja.',
    resetFilters: 'Pastro filtrat',
    sortHint: 'Më të rinjtë së pari',
    loadMore: 'Shfaq edhe {n}',
    colFile: 'Skedari',
    colType: 'Tipi',
    colDims: 'Dimensionet',
    colSize: 'Madhësia',
    colUsage: 'Përdorimi',
    colAdded: 'Shtuar',
  },
  en: {
    subtitle: 'The site’s file library — search, type, alt text, dimensions and usage references. A file in use is deleted only with a replacement or an explicit confirmation.',
    upload: 'Upload files',
    statTotal: 'Total files',
    statTotalHint: '{n} uploaded · {size}',
    statTotalHintNone: 'in {n} folders',
    statUsed: 'In use',
    statUsedHint: '{pct}% of the library',
    statUnused: 'Unused',
    statUnusedHint: 'Candidates for clean-up',
    statNoAlt: 'Missing alt text',
    statNoAltHint: 'Fill in for SEO and accessibility',
    searchPh: 'Search by name or alt text…',
    allTypes: 'All types',
    typeImage: 'Image · {f}',
    useAll: 'All',
    useUsed: 'In use',
    useUnused: 'Unused',
    useNoAlt: 'No alt',
    gridView: 'Grid',
    listView: 'List',
    usedN: 'Used {n}×',
    unused: 'Unused',
    noAlt: 'No alt text',
    fresh: 'New',
    emptyTitle: 'No files to show',
    emptyText: 'Change the search or filter, or upload new photos.',
    resetFilters: 'Reset filters',
    sortHint: 'Newest first',
    loadMore: 'Show {n} more',
    colFile: 'File',
    colType: 'Type',
    colDims: 'Dimensions',
    colSize: 'Size',
    colUsage: 'Usage',
    colAdded: 'Added',
  },
});

type UsageFilter = 'all' | 'used' | 'unused' | 'noalt';
type View = 'grid' | 'list';
/** Tiles rendered per "page" — keeps the grid light with 100+ images */
const PAGE = 30;
const VIEW_KEY = 'optika-media-view';

/** Natural size of bundled images measured in this session (seed records carry no dimensions). */
const DIMS = new Map<string, { w: number; h: number }>();

/** Measure the natural size of the given (visible) files once; cached per session. */
function useDims(items: MediaItem[], enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const todo = items.filter((m) => !(m.width && m.height) && !DIMS.has(m.url));
    todo.forEach((m) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        DIMS.set(m.url, { w: img.naturalWidth, h: img.naturalHeight });
        if (alive) setTick((x) => x + 1);
      };
      img.src = m.url;
    });
    return () => {
      alive = false;
    };
  }, [items, enabled]);
  return (m: MediaItem) => (m.width && m.height ? { w: m.width, h: m.height } : DIMS.get(m.url));
}

export default function Media() {
  const t = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const folderLabel = useFolderLabel();
  const media = useDb((s) => s.media);
  const usage = useMediaUsage();
  const { upload, busy } = useUploader();
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = can('content', 'edit');

  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('all');
  const [type, setType] = useState('all');
  const [use, setUse] = useState<UsageFilter>('all');
  const [view, setViewState] = useState<View>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const [limit, setLimit] = useState(PAGE);

  const setView = (v: View) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode */
    }
  };

  const sorted = useMemo(() => [...media].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [media]);
  const useCount = useMemo(() => new Map(media.map((m) => [m.id, usageOf(usage, m.url).length])), [media, usage]);
  const formats = useMemo(() => new Map(media.map((m) => [m.id, fileFormat(m) || '—'])), [media]);

  const stats = useMemo(() => {
    const uploaded = media.filter((m) => m.uploaded);
    const used = media.filter((m) => (useCount.get(m.id) ?? 0) > 0).length;
    return {
      total: media.length,
      folders: new Set(media.map((m) => m.folder)).size,
      uploaded: uploaded.length,
      uploadedBytes: uploaded.reduce((s, m) => s + (m.size ?? 0), 0),
      used,
      unused: media.length - used,
      noAlt: media.filter((m) => !m.alt?.trim()).length,
    };
  }, [media, useCount]);

  const folders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of media) counts.set(m.folder, (counts.get(m.folder) ?? 0) + 1);
    return [{ id: 'all', label: ta('all'), count: media.length }, ...Array.from(counts, ([id, count]) => ({ id, label: folderLabel(id), count }))];
  }, [media, ta, folderLabel]);

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    formats.forEach((f) => counts.set(f, (counts.get(f) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [formats]);

  const list = useMemo(() => {
    const needle = fold(q.trim());
    return sorted.filter((m) => {
      if (folder !== 'all' && m.folder !== folder) return false;
      if (type !== 'all' && formats.get(m.id) !== type) return false;
      const n = useCount.get(m.id) ?? 0;
      if (use === 'used' && n === 0) return false;
      if (use === 'unused' && n > 0) return false;
      if (use === 'noalt' && m.alt?.trim()) return false;
      return !needle || fold(`${m.name} ${m.alt ?? ''}`).includes(needle);
    });
  }, [sorted, folder, type, use, q, useCount, formats]);

  const visible = useMemo(() => list.slice(0, limit), [list, limit]);
  const dimsOf = useDims(visible, view === 'list');
  useEffect(() => setLimit(PAGE), [q, folder, use, type]);

  // If the folder / type disappears (e.g. last upload deleted) fall back to "all"
  useEffect(() => {
    if (folder !== 'all' && !media.some((m) => m.folder === folder)) setFolder('all');
    if (type !== 'all' && !typeOptions.some(([f]) => f === type)) setType('all');
  }, [media, folder, type, typeOptions]);

  const doUpload = async (files: FileList) => {
    const items = await upload(files);
    if (!items.length) return;
    setFolder('all');
    setUse('all');
    setType('all');
    setQ('');
    setFresh((f) => [...f, ...items.map((i) => i.id)]);
  };

  const idx = openId ? list.findIndex((m) => m.id === openId) : -1;
  const current = openId ? media.find((m) => m.id === openId) ?? null : null;
  const filtered = q || folder !== 'all' || use !== 'all' || type !== 'all';

  const usageLabel = (n: number) =>
    n > 0 ? (
      <span className="inline-flex items-center gap-1 text-ink-soft">
        <Link2 className="h-3 w-3" />
        {t('usedN', { n })}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted">
        <CircleDashed className="h-3 w-3" />
        {t('unused')}
      </span>
    );

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[ta('nav_content'), ta('nav_media')]}
        title={ta('nav_media')}
        description={t('subtitle')}
        actions={
          canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) doUpload(e.target.files);
                  e.target.value = '';
                }}
              />
              <Button shape="rounded" size="sm" loading={busy} icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
                {t('upload')}
              </Button>
            </>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Images className="h-4 w-4" />}
          label={t('statTotal')}
          value={stats.total}
          hint={stats.uploaded ? t('statTotalHint', { n: stats.uploaded, size: formatBytes(stats.uploadedBytes, lang) }) : t('statTotalHintNone', { n: stats.folders })}
        />
        <StatTile icon={<Link2 className="h-4 w-4" />} label={t('statUsed')} value={stats.used} hint={t('statUsedHint', { pct: stats.total ? Math.round((stats.used / stats.total) * 100) : 0 })} />
        <StatTile icon={<CircleDashed className="h-4 w-4" />} label={t('statUnused')} value={stats.unused} hint={t('statUnusedHint')} />
        <StatTile icon={<TextCursorInput className="h-4 w-4" />} label={t('statNoAlt')} value={stats.noAlt} hint={t('statNoAltHint')} />
      </div>

      <Card padded={false}>
        {canEdit && (
          <div className="border-b border-line/70 p-3 sm:p-4">
            <Dropzone onFiles={doUpload} busy={busy} compact />
          </div>
        )}
        <div className="space-y-3 border-b border-line/70 p-3 sm:p-4">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="lg:w-72" />
            <SelectField value={type} onChange={(e) => setType(e.target.value)} wrapClassName="lg:w-48" aria-label={t('colType')}>
              <option value="all">{t('allTypes')}</option>
              {typeOptions.map(([f, n]) => (
                <option key={f} value={f}>
                  {t('typeImage', { f })} ({n})
                </option>
              ))}
            </SelectField>
            <div className="flex items-center gap-2 lg:ml-auto">
              <Segmented<UsageFilter>
                value={use}
                onChange={setUse}
                className="min-w-0 flex-1 overflow-x-auto no-scrollbar lg:flex-none"
                options={[
                  { id: 'all', label: t('useAll') },
                  { id: 'used', label: t('useUsed') },
                  { id: 'unused', label: t('useUnused') },
                  { id: 'noalt', label: t('useNoAlt') },
                ]}
              />
              <Segmented<View>
                value={view}
                onChange={setView}
                options={[
                  { id: 'grid', label: <LayoutGrid className="h-4 w-4" />, title: t('gridView') },
                  { id: 'list', label: <List className="h-4 w-4" />, title: t('listView') },
                ]}
              />
            </div>
          </div>
          <FilterPills options={folders} value={folder} onChange={setFolder} />
        </div>

        <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted sm:px-5">
          <span>{ta('showing', { n: visible.length, total: list.length })}</span>
          <span>{t('sortHint')}</span>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-6 w-6" />}
            title={t('emptyTitle')}
            text={t('emptyText')}
            action={
              filtered ? (
                <Button
                  variant="outline"
                  shape="rounded"
                  size="sm"
                  onClick={() => {
                    setQ('');
                    setFolder('all');
                    setUse('all');
                    setType('all');
                  }}
                >
                  {t('resetFilters')}
                </Button>
              ) : undefined
            }
          />
        ) : view === 'grid' ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-4 p-3 sm:grid-cols-3 sm:p-5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {visible.map((m) => {
              const n = useCount.get(m.id) ?? 0;
              const isFresh = fresh.includes(m.id);
              const d = dimsOf(m);
              return (
                <li key={m.id} className={cn(isFresh && 'animate-pop')}>
                  <button type="button" onClick={() => setOpenId(m.id)} className="group block w-full text-left">
                    <span className={cn('relative block aspect-square overflow-hidden rounded-lg bg-canvas ring-1 transition duration-200 group-hover:ring-ink/30', isFresh ? 'ring-2 ring-ink' : 'ring-line')}>
                      <img src={thumb(m.url)} alt={m.alt ?? ''} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                      <span className="absolute left-1.5 top-1.5 rounded bg-white/90 px-1.5 py-px font-mono text-[10px] font-semibold text-ink shadow-sm">{formats.get(m.id)}</span>
                      {isFresh && <span className="absolute right-1.5 top-1.5 rounded bg-ink px-1.5 py-px text-[10px] font-semibold text-white">{t('fresh')}</span>}
                      {!m.alt?.trim() && (
                        <span title={t('noAlt')} className="absolute bottom-1.5 right-1.5 grid h-5 w-5 place-items-center rounded bg-amber-100 text-amber-800 shadow-sm">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 block truncate text-[12.5px] font-semibold text-ink group-hover:underline">{m.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px]">
                      {usageLabel(n)}
                      {d && <span className="truncate text-muted">· {d.w}×{d.h}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-3 sm:p-4">
            <div className="hidden grid-cols-[minmax(0,1fr)_72px_110px_84px_120px_96px] gap-4 rounded-t-lg border border-line bg-canvas/60 px-3 py-2 text-[12.5px] font-semibold text-muted md:grid">
              <span>{t('colFile')}</span>
              <span>{t('colType')}</span>
              <span>{t('colDims')}</span>
              <span>{t('colSize')}</span>
              <span>{t('colUsage')}</span>
              <span>{t('colAdded')}</span>
            </div>
            <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line md:rounded-t-none md:border-t-0">
              {visible.map((m) => {
                const n = useCount.get(m.id) ?? 0;
                const d = dimsOf(m);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(m.id)}
                      className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 bg-white px-3 py-2 text-left transition-colors hover:bg-canvas/60 md:grid-cols-[minmax(0,1fr)_72px_110px_84px_120px_96px] md:gap-4"
                    >
                      <span className="flex min-w-0 items-center gap-3 max-md:contents">
                        <img src={thumb(m.url)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-line" />
                        <span className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-ink">{m.name}</span>
                          <span className={cn('block truncate text-[12px]', m.alt?.trim() ? 'text-muted' : 'font-medium text-amber-800')}>
                            {m.alt?.trim() || `⚠ ${t('noAlt')}`}
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-x-2 text-[11.5px] text-muted md:hidden">
                            <span className="font-mono">{formats.get(m.id)}</span>
                            {d && <span>{d.w}×{d.h}</span>}
                            {usageLabel(n)}
                          </span>
                        </span>
                      </span>
                      <span className="hidden font-mono text-[12px] text-ink-soft md:block">{formats.get(m.id)}</span>
                      <span className="hidden text-[13px] tabular-nums text-ink-soft md:block">{d ? `${d.w} × ${d.h}` : <span className="text-muted">…</span>}</span>
                      <span className="hidden text-[13px] tabular-nums text-ink-soft md:block">{m.size ? formatBytes(m.size, lang) : <span className="text-muted">—</span>}</span>
                      <span className="hidden text-[12.5px] md:block">{usageLabel(n)}</span>
                      <span className="hidden text-[13px] text-muted md:block">{date(m.createdAt, lang)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {list.length > visible.length && (
          <div className="flex justify-center px-4 pb-6">
            <Button variant="outline" shape="rounded" size="sm" onClick={() => setLimit((x) => x + PAGE)}>
              {t('loadMore', { n: Math.min(PAGE, list.length - visible.length) })}
            </Button>
          </div>
        )}
      </Card>

      <MediaDrawer
        item={current}
        usage={usage}
        onClose={() => setOpenId(null)}
        onPrev={idx > 0 ? () => setOpenId(list[idx - 1].id) : undefined}
        onNext={idx >= 0 && idx < list.length - 1 ? () => setOpenId(list[idx + 1].id) : undefined}
      />
    </div>
  );
}
