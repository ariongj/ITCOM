import { useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Check, ImagePlus, Images, Upload, X, GripVertical, Star } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Field';
import { FilterPills, SearchInput } from './kit';
import { useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import type { MediaItem } from '@/lib/types';
import { cn, thumb, uid } from '@/lib/utils';

/** Read an image file, downscale to ≤1600px and re-encode as JPEG (keeps localStorage small). */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<{ url: string; width: number; height: number; size: number }> {
  const src = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  const url = canvas.toDataURL('image/jpeg', quality);
  return { url, width: w, height: h, size: Math.round((url.length * 3) / 4) };
}

/** Upload files into the media library; returns the created items. */
export function useUploader() {
  const addMedia = useDb((s) => s.addMedia);
  const t = useDict(adm, 'admin');
  const [busy, setBusy] = useState(false);
  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return [];
    setBusy(true);
    const out: MediaItem[] = [];
    try {
      for (const f of list) {
        const c = await compressImage(f);
        const item: MediaItem = {
          id: uid('m'),
          url: c.url,
          name: f.name,
          alt: f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          folder: 'Të ngarkuara',
          uploaded: true,
          createdAt: new Date().toISOString(),
          width: c.width,
          height: c.height,
          size: c.size,
        };
        addMedia(item);
        out.push(item);
      }
      toast.success(t('uploaded'));
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setBusy(false);
    }
    return out;
  };
  return { upload, busy };
}

export function Dropzone({ onFiles, busy, className, compact }: { onFiles: (f: FileList) => void; busy?: boolean; className?: string; compact?: boolean }) {
  const t = useDict(adm, 'admin');
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors',
        over ? 'border-brand-600 bg-brand-50' : 'border-line bg-canvas/50 hover:border-ink/25 hover:bg-canvas',
        compact ? 'gap-1 px-4 py-5' : 'gap-2 px-6 py-10',
        className,
      )}
    >
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-soft ring-1 ring-line">
        <Upload className={cn('h-4 w-4', busy && 'animate-bounce')} />
      </span>
      <span className="text-[13px] font-semibold text-ink">{busy ? t('uploading') : t('dropHere')}</span>
      {!compact && <span className="text-xs text-muted">{t('fileTypes')}</span>}
    </div>
  );
}

/** Media library modal — pick one or many images (or upload new ones). */
export function MediaPicker({ open, onClose, onSelect, multiple }: { open: boolean; onClose: () => void; onSelect: (urls: string[]) => void; multiple?: boolean }) {
  const t = useDict(adm, 'admin');
  const media = useDb((s) => s.media);
  const { upload, busy } = useUploader();
  const [q, setQ] = useState('');
  const [folder, setFolder] = useState('all');
  const [sel, setSel] = useState<string[]>([]);
  const folders = useMemo(() => ['all', ...Array.from(new Set(media.map((m) => m.folder)))], [media]);
  const list = media.filter((m) => (folder === 'all' || m.folder === folder) && (!q || `${m.name} ${m.alt ?? ''}`.toLowerCase().includes(q.toLowerCase())));
  const toggle = (url: string) => setSel((s) => (multiple ? (s.includes(url) ? s.filter((x) => x !== url) : [...s, url]) : [url]));
  const done = () => {
    if (sel.length) onSelect(sel);
    setSel([]);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={() => {
        setSel([]);
        onClose();
      }}
      size="xl"
      title={t('mediaLibrary')}
      footer={
        <>
          <span className="mr-auto text-sm text-muted">{sel.length ? `${sel.length} ${t('selected').toLowerCase()}` : ''}</span>
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button shape="rounded" size="sm" disabled={!sel.length} onClick={done}>
            {t('select')}
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={q} onChange={setQ} className="sm:w-64" />
          <FilterPills options={folders.map((f) => ({ id: f, label: f === 'all' ? t('all') : f }))} value={folder} onChange={setFolder} />
        </div>
        <Dropzone
          compact
          busy={busy}
          onFiles={async (f) => {
            const items = await upload(f);
            if (items.length) setSel((s) => (multiple ? [...s, ...items.map((i) => i.url)] : [items[0].url]));
            setFolder('all');
          }}
        />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {list.map((m) => {
            const on = sel.includes(m.url);
            return (
              <button key={m.id} type="button" onClick={() => toggle(m.url)} onDoubleClick={() => { setSel([m.url]); onSelect([m.url]); onClose(); }} className={cn('group relative aspect-square overflow-hidden rounded-xl bg-sand ring-2 transition', on ? 'ring-brand-600' : 'ring-transparent hover:ring-ink/20')}>
                <img src={thumb(m.url)} alt={m.alt} loading="lazy" className="h-full w-full object-cover" />
                <span className={cn('absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow transition', on ? 'bg-brand-600 text-white' : 'bg-black/20 text-transparent')}>
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-left text-[10.5px] font-medium text-white opacity-0 transition group-hover:opacity-100">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

/** Single image field with preview, "choose from media" and "upload". */
export function ImageField({ label, value, onChange, aspect = 'aspect-[16/10]', hint }: { label?: ReactNode; value: string; onChange: (v: string) => void; aspect?: string; hint?: ReactNode }) {
  const t = useDict(adm, 'admin');
  const [open, setOpen] = useState(false);
  const { upload, busy } = useUploader();
  const file = useRef<HTMLInputElement>(null);
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className={cn('group relative overflow-hidden rounded-xl bg-sand ring-1 ring-line', aspect)}>
        {value ? (
          <img src={thumb(value)} alt="" className="h-full w-full object-cover" />
        ) : (
          <button type="button" onClick={() => setOpen(true)} className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted hover:text-ink">
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs font-semibold">{t('chooseFromMedia')}</span>
          </button>
        )}
        {value && (
          <div className="absolute inset-0 flex items-end justify-end gap-1.5 bg-gradient-to-t from-black/40 via-transparent p-2 opacity-0 transition group-hover:opacity-100">
            <Button size="xs" shape="rounded" variant="light" icon={<Images className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
              {t('replace')}
            </Button>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button size="xs" shape="rounded" variant="outline" icon={<Images className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>
          {t('chooseFromMedia')}
        </Button>
        <Button size="xs" shape="rounded" variant="outline" loading={busy} icon={<Upload className="h-3.5 w-3.5" />} onClick={() => file.current?.click()}>
          {t('uploadNew')}
        </Button>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            if (!e.target.files?.length) return;
            const [item] = await upload(e.target.files);
            if (item) onChange(item.url);
            e.target.value = '';
          }}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={(urls) => onChange(urls[0])} />
    </div>
  );
}

/** Multi-image gallery field (first image = cover). Drag to reorder. */
export function GalleryField({ label, value, onChange }: { label?: ReactNode; value: string[]; onChange: (v: string[]) => void }) {
  const t = useDict(adm, 'admin');
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const { upload, busy } = useUploader();
  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {value.map((url, i) => (
          <div
            key={url + i}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (drag !== null) move(drag, i);
              setDrag(null);
            }}
            className={cn('group relative aspect-square overflow-hidden rounded-xl bg-sand ring-1 ring-line', drag === i && 'opacity-40')}
          >
            <img src={thumb(url)} alt="" className="h-full w-full object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Star className="h-2.5 w-2.5 fill-current" /> {t('cover')}
              </span>
            )}
            <span className="absolute bottom-1.5 left-1.5 grid h-6 w-6 cursor-grab place-items-center rounded-md bg-white/90 text-ink-soft opacity-0 shadow transition group-hover:opacity-100">
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-md bg-white/90 text-ink-soft opacity-0 shadow transition hover:text-red-600 group-hover:opacity-100" aria-label={t('remove')}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line text-muted transition hover:border-ink/30 hover:text-ink">
          <ImagePlus className="h-5 w-5" />
          <span className="text-[11px] font-semibold">{t('add')}</span>
        </button>
      </div>
      <Dropzone compact busy={busy} className="mt-3" onFiles={async (f) => { const items = await upload(f); onChange([...value, ...items.map((i) => i.url)]); }} />
      <MediaPicker open={open} multiple onClose={() => setOpen(false)} onSelect={(urls) => onChange([...value, ...urls.filter((u) => !value.includes(u))])} />
    </div>
  );
}
