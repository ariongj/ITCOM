// Device preview of the real landing page (/oferta/:slug) in a scaled iframe — PDF p.29 "Preview në pajisje".
import { useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink, Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { href } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { useOT } from './ui';

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICES: Record<Device, { w: number; h: number; icon: typeof Monitor }> = {
  desktop: { w: 1280, h: 0, icon: Monitor },
  tablet: { w: 820, h: 1180, icon: Tablet },
  mobile: { w: 390, h: 844, icon: Smartphone },
};

export function DevicePreview({ slug, live, dirty }: { slug: string | null; live: boolean; dirty: boolean }) {
  const t = useOT();
  const [device, setDevice] = useState<Device>('desktop');
  const [key, setKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const url = slug ? href(`/oferta/${slug}${live ? '' : '?preview=1'}`) : '';
  const d = DEVICES[device];
  const pad = 16;
  let scale = 1;
  let innerH = d.h;
  let boxW = 0;
  let boxH = 0;
  if (device === 'desktop') {
    scale = Math.min(1, (size.w - pad * 2) / d.w);
    boxW = d.w * scale;
    boxH = Math.max(0, size.h - pad * 2);
    innerH = boxH / (scale || 1);
  } else {
    scale = Math.min(1, (size.w - pad * 2) / d.w, (size.h - pad * 2) / d.h);
    boxW = d.w * scale;
    boxH = d.h * scale;
  }

  const onLoad = () => {
    // hide the storefront's floating "demo → CMS" badge inside the preview
    try {
      const doc = frame.current?.contentDocument;
      if (doc && !doc.getElementById('optika-offer-preview')) {
        const st = doc.createElement('style');
        st.id = 'optika-offer-preview';
        st.textContent = 'a.fixed[href$="/admin"]{display:none!important}';
        doc.head.appendChild(st);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  };

  return (
    <Card
      title={t('preview')}
      description={t('previewText')}
      padded={false}
      actions={
        <div className="flex items-center gap-1">
          <div className="flex rounded-lg bg-canvas p-0.5" role="tablist">
            {(Object.keys(DEVICES) as Device[]).map((k) => {
              const Icon = DEVICES[k].icon;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={device === k}
                  title={t(k)}
                  aria-label={t(k)}
                  onClick={() => setDevice(k)}
                  className={cn('grid h-8 w-8 place-items-center rounded-md transition-colors', device === k ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!url}
            onClick={() => {
              setLoaded(false);
              setKey((k) => k + 1);
            }}
            title={t('reload')}
            aria-label={t('reload')}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition hover:bg-canvas hover:text-ink disabled:opacity-40"
          >
            <RotateCw className={cn('h-4 w-4', url && !loaded && 'animate-spin')} />
          </button>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" title={t('openNew')} aria-label={t('openNew')} className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition hover:bg-canvas hover:text-ink">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      }
    >
      {dirty && url && <p className="border-b border-line/70 bg-amber-50 px-5 py-2 text-[12.5px] font-medium text-amber-900">{t('previewUnsaved')}</p>}
      <div ref={stage} className="relative h-[420px] overflow-hidden rounded-b-xl bg-[#e6e6e6] sm:h-[520px]">
        {!url ? (
          <div className="grid h-full place-items-center px-6 text-center text-[13px] text-muted">{t('previewNotSaved')}</div>
        ) : (
          size.w > 0 && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2" style={{ width: boxW, height: boxH }}>
              <div
                className={cn('overflow-hidden bg-white shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]', device === 'desktop' ? 'rounded-md' : 'rounded-[22px] ring-[6px] ring-[#1a1a1a]')}
                style={{ width: boxW, height: boxH }}
              >
                <iframe
                  key={`${key}-${device}`}
                  ref={frame}
                  src={url}
                  title={t('preview')}
                  onLoad={onLoad}
                  className="origin-top-left border-0"
                  style={{ width: d.w, height: innerH, transform: `scale(${scale})` }}
                />
              </div>
            </div>
          )
        )}
      </div>
    </Card>
  );
}
