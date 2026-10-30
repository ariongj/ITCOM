// Image slot with media library / upload and a focal point picker (PDF p.31 "crop/focal point", p.35 "Zgjidh foto / focal point").
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import { Crosshair, ImagePlus, Images, Upload, X } from 'lucide-react';
import { MediaPicker, useUploader } from '@/admin/components/media';
import { Button } from '@/components/ui/Button';
import { useDict } from '@/i18n';
import { clamp, cn } from '@/lib/utils';
import { SE } from './i18n';
import type { Focal } from './placements';

export function MediaSlot({
  label,
  hint,
  value,
  onChange,
  focal,
  onFocal,
  fallback,
  disabled,
  empty = 'aspect-[16/9]',
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  focal?: Focal;
  onFocal: (f: Focal) => void;
  /** Shown dimmed when the slot is empty (mobile falls back to the desktop image) */
  fallback?: string;
  disabled?: boolean;
  /** Aspect of the empty placeholder */
  empty?: string;
}) {
  const t = useDict(SE, 'admin');
  const [open, setOpen] = useState(false);
  const { upload, busy } = useUploader();
  const file = useRef<HTMLInputElement>(null);
  const src = value || fallback || '';
  const f = focal ?? { x: 50, y: 50 };

  const pick = (e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    onFocal({ x: Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100)), y: Math.round(clamp(((e.clientY - r.top) / r.height) * 100, 0, 100)) });
  };
  const nudge = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || disabled) return;
    e.preventDefault();
    onFocal({ x: clamp(f.x + d[0], 0, 100), y: clamp(f.y + d[1], 0, 100) });
  };

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-end justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink-soft">{label}</span>
        {src && (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium tabular-nums text-muted">
            <Crosshair className="h-3 w-3" /> {f.x}% · {f.y}%
          </span>
        )}
      </div>

      {src ? (
        <div className="grid place-items-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#f3f3f3_0%_25%,#fafafa_0%_50%)] bg-[length:16px_16px] p-2 ring-1 ring-line">
          <div
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${t('focal')} — ${f.x}%, ${f.y}%`}
            aria-valuetext={`${f.x}%, ${f.y}%`}
            aria-valuenow={f.x}
            aria-valuemin={0}
            aria-valuemax={100}
            onClick={pick}
            onKeyDown={nudge}
            className={cn('relative inline-block max-w-full cursor-crosshair overflow-hidden rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-ink/20', disabled && 'cursor-default')}
          >
            <img src={src} alt="" draggable={false} className={cn('block max-h-[200px] w-auto max-w-full select-none', !value && 'opacity-45 grayscale')} />
            {/* rule-of-thirds guide */}
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_33.2%,rgb(255_255_255/0.35)_33.3%,transparent_33.5%,transparent_66.5%,rgb(255_255_255/0.35)_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgb(255_255_255/0.35)_33.3%,transparent_33.5%,transparent_66.5%,rgb(255_255_255/0.35)_66.6%,transparent_66.8%)]" />
            <span
              aria-hidden
              className="pointer-events-none absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-black/25 shadow-[0_0_0_1px_rgb(0_0_0/0.35),0_4px_12px_rgb(0_0_0/0.35)] backdrop-blur-[2px] transition-[left,top] duration-150"
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn('flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/20 bg-ink/[0.02] text-muted transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed', empty)}
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs font-semibold">{t('choose')}</span>
        </button>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Button size="xs" shape="rounded" variant="outline" icon={<Images className="h-3.5 w-3.5" />} onClick={() => setOpen(true)} disabled={disabled}>
          {t('choose')}
        </Button>
        <Button size="xs" shape="rounded" variant="outline" loading={busy} icon={<Upload className="h-3.5 w-3.5" />} onClick={() => file.current?.click()} disabled={disabled}>
          {t('upload')}
        </Button>
        {src && (
          <Button size="xs" shape="rounded" variant="ghost" icon={<Crosshair className="h-3.5 w-3.5" />} onClick={() => onFocal({ x: 50, y: 50 })} disabled={disabled}>
            {t('focalReset')}
          </Button>
        )}
        {value && (
          <Button size="xs" shape="rounded" variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => onChange('')} disabled={disabled} aria-label={t('clearImage')} title={t('clearImage')} />
        )}
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
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={(urls) => urls[0] && onChange(urls[0])} />
    </div>
  );
}
