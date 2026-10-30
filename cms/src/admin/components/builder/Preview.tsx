import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ExternalLink, Info, Lock, Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react';
import type { Lang } from '@/lib/types';
import { LANGS, useDict } from '@/i18n';
import { useUi } from '@/store/ui';
import { useDb } from '@/store/db';
import { cn } from '@/lib/utils';
import { href } from '@/lib/paths';
import { B } from './i18n';

export type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICES: Record<Device, { w: number; h: number; icon: typeof Monitor; bezel: number }> = {
  desktop: { w: 1280, h: 0, icon: Monitor, bezel: 0 },
  tablet: { w: 820, h: 1180, icon: Tablet, bezel: 12 },
  mobile: { w: 390, h: 844, icon: Smartphone, bezel: 9 },
};
const CHROME = 34;
/** The storefront homepage renders `homeDraft ?? home` with ?preview=1. */
const PREVIEW_URL = href('/?preview=1');
const HIGHLIGHT_MS = 1600;

/** Theme parts outside the homepage sections, found directly in the iframe (same origin). */
function fixedTarget(doc: Document, id: string): HTMLElement | null {
  const header = doc.querySelector<HTMLElement>('header');
  if (id === '__header') return header;
  if (id === '__footer') return doc.querySelector<HTMLElement>('footer');
  if (id === '__bar') {
    const prev = header?.previousElementSibling as HTMLElement | null;
    return prev && prev.tagName === 'DIV' && !prev.querySelector('header') ? prev : null;
  }
  return null;
}

/**
 * Draft preview: the real homepage in an iframe, scaled to fit the card.
 * It re-renders by itself — the iframe's stores rehydrate on the localStorage `storage` event.
 */
export function Preview({
  device,
  onDevice,
  focus,
  reloadTick,
  draft,
  className,
}: {
  device: Device;
  onDevice: (d: Device) => void;
  focus: { id: string; n: number } | null;
  reloadTick: number;
  /** Is a draft (different from live) being shown? */
  draft: boolean;
  className?: string;
}) {
  const t = useDict(B, 'admin');
  const siteLang = useUi((s) => s.lang);
  const setSiteLang = useUi((s) => s.setLang);
  const domain = useDb((s) => s.settings.adminEmail.split('@')[1] || 'itcom.example');
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [loaded, setLoaded] = useState(false);
  const [frameKey, setFrameKey] = useState(0);

  // Measure the stage (keeps the last non-zero size while the card is hidden on mobile)
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reload = useCallback(() => {
    setLoaded(false);
    setFrameKey((k) => k + 1);
  }, []);

  const firstReload = useRef(true);
  useEffect(() => {
    if (firstReload.current) {
      firstReload.current = false;
      return;
    }
    reload();
  }, [reloadTick, reload]);

  // Scroll the preview to the focused part once it exists in the iframe's DOM
  useEffect(() => {
    if (!loaded || !focus) return;
    let tries = 0;
    let timer = 0;
    const tick = () => {
      const win = frameRef.current?.contentWindow;
      const doc = frameRef.current?.contentDocument;
      if (!win || !doc) return;
      if (focus.id.startsWith('__')) {
        // Header / announcement bar / footer: handled here, the storefront only knows homepage sections
        const el = fixedTarget(doc, focus.id);
        if (!el) {
          if (tries++ < 25) timer = window.setTimeout(tick, 120);
          return;
        }
        if (focus.id === '__footer') el.scrollIntoView({ behavior: 'smooth', block: 'end' });
        else win.scrollTo({ top: 0, behavior: 'smooth' });
        el.classList.add('preview-highlight');
        win.setTimeout(() => el.classList.remove('preview-highlight'), HIGHLIGHT_MS);
        return;
      }
      if (doc.querySelector(`[data-section="${CSS.escape(focus.id)}"]`)) {
        win.postMessage({ type: 'optika:scrollTo', id: focus.id }, window.location.origin);
      } else if (tries++ < 25) {
        timer = window.setTimeout(tick, 120);
      }
    };
    timer = window.setTimeout(tick, 140);
    return () => window.clearTimeout(timer);
  }, [focus, loaded, device]);

  const onLoad = () => {
    // Hide the storefront's floating "demo → CMS" badge inside the preview only.
    try {
      const doc = frameRef.current?.contentDocument;
      if (doc && !doc.getElementById('optika-builder-preview')) {
        const st = doc.createElement('style');
        st.id = 'optika-builder-preview';
        st.textContent = 'a.fixed[href$="/admin"]{display:none!important}';
        doc.head.appendChild(st);
      }
    } catch {
      /* cross-origin — ignore */
    }
    setLoaded(true);
  };

  // Geometry
  const d = DEVICES[device];
  const pad = size.w < 520 ? 12 : 20;
  let scale = 1;
  const innerW = d.w;
  let innerH = d.h;
  let boxW = 0;
  let boxH = 0;
  if (device === 'desktop') {
    const availW = size.w - pad * 2;
    const availH = size.h - pad * 2 - CHROME;
    scale = Math.min(1, availW / d.w);
    boxW = d.w * scale;
    boxH = Math.max(0, availH);
    innerH = boxH / scale;
  } else {
    const availW = size.w - pad * 2 - d.bezel * 2;
    const availH = size.h - pad * 2 - d.bezel * 2;
    scale = Math.min(1, availW / d.w, availH / d.h);
    boxW = d.w * scale;
    boxH = d.h * scale;
  }
  const measured = size.w > 0;

  return (
    <section className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]', className)}>
      {/* Card header: "Parapamje / Desktop" + device switch (PDF p.33) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/70 px-4 py-2.5">
        <h2 className="mr-auto flex min-w-0 items-center gap-2 text-[14.5px] font-semibold text-ink">
          <span className="truncate">
            {t('previewTitle')} <span className="font-normal text-muted">/ {t(device)}</span>
          </span>
          {draft && (
            <span className="hidden shrink-0 items-center gap-1 rounded border border-ink/10 bg-white px-1.5 text-[10.5px] font-semibold uppercase leading-[17px] tracking-wide text-ink-soft sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t('titleDraft')}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg bg-[#F1F1F1] p-0.5" role="tablist" aria-label={t('previewTitle')}>
            {(Object.keys(DEVICES) as Device[]).map((k) => {
              const Icon = DEVICES[k].icon;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={device === k}
                  onClick={() => onDevice(k)}
                  title={t(k)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors',
                    device === k ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-muted hover:text-ink',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden 2xl:inline">{t(k)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center rounded-lg bg-[#F1F1F1] p-0.5" title={t('siteLang')}>
            {LANGS.map((lg) => (
              <button
                key={lg.code}
                type="button"
                onClick={() => setSiteLang(lg.code as Lang)}
                aria-pressed={siteLang === lg.code}
                className={cn('h-8 rounded-md px-2 text-[11px] font-bold tracking-wide transition-colors', siteLang === lg.code ? 'bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-muted hover:text-ink')}
              >
                {lg.short}
              </button>
            ))}
          </div>

          <button type="button" onClick={reload} title={t('reload')} aria-label={t('reload')} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-soft transition hover:bg-ink/[0.05] hover:text-ink">
            <RotateCw className={cn('h-4 w-4', !loaded && 'animate-spin')} />
          </button>
          <a
            href={PREVIEW_URL}
            target="_blank"
            rel="noreferrer"
            title={t('openDraft')}
            aria-label={t('openDraft')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-soft ring-1 ring-line transition hover:bg-ink/[0.04] hover:text-ink"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className={cn('relative min-h-0 flex-1 overflow-hidden bg-[#EDEDED]', device === 'desktop' ? 'flex justify-center' : 'grid place-items-center')}
        style={{ backgroundImage: 'radial-gradient(rgb(0 0 0 / 0.07) 1px, transparent 1px)', backgroundSize: '16px 16px', padding: pad }}
      >
        {measured && (
          <div
            className={cn(
              'relative flex flex-col overflow-hidden transition-[width,height] duration-300 ease-out',
              device === 'desktop' && 'rounded-lg bg-white shadow-[0_18px_44px_-24px_rgb(0_0_0/0.45)] ring-1 ring-black/10',
              device === 'tablet' && 'rounded-[30px] bg-[#1A1A1A] shadow-[0_26px_60px_-30px_rgb(0_0_0/0.65)] ring-1 ring-black/40',
              device === 'mobile' && 'rounded-[38px] bg-[#1A1A1A] shadow-[0_26px_60px_-30px_rgb(0_0_0/0.65)] ring-1 ring-black/40',
            )}
            style={{ width: boxW + d.bezel * 2, height: boxH + d.bezel * 2 + (device === 'desktop' ? CHROME : 0), padding: d.bezel }}
          >
            {device === 'desktop' && (
              <div className="flex shrink-0 items-center gap-3 border-b border-black/[0.08] bg-[#F5F5F5] px-3" style={{ height: CHROME }}>
                <span className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-black/15" />
                </span>
                <span className="mx-auto flex h-[22px] min-w-0 max-w-[60%] flex-1 items-center justify-center gap-1.5 rounded-md bg-white px-3 text-[11px] font-medium text-muted ring-1 ring-black/[0.08]">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {domain}
                    <span className="text-ink/35">/?preview=1</span>
                  </span>
                </span>
                <span className="w-[42px]" />
              </div>
            )}
            <div
              className={cn('relative overflow-hidden bg-white', device === 'tablet' && 'rounded-[18px]', device === 'mobile' && 'rounded-[30px]')}
              style={{ width: boxW, height: boxH }}
            >
              <iframe
                key={frameKey}
                ref={frameRef}
                src={PREVIEW_URL}
                title={t('livePreview')}
                onLoad={onLoad}
                className="absolute left-0 top-0 border-0 bg-white"
                style={{ width: innerW, height: innerH, transform: `scale(${scale})`, transformOrigin: '0 0' }}
              />
              <div className={cn('pointer-events-none absolute inset-0 grid place-items-center bg-white transition-opacity duration-300', loaded ? 'opacity-0' : 'opacity-100')}>
                <div className="flex flex-col items-center gap-3 text-[13px] font-medium text-muted">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
                  {t('loadingPreview')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PDF p.33 caption */}
      <p className="flex items-center gap-2 border-t border-line/70 px-4 py-2 text-[12px] text-muted">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{t('previewNote')}</span>
      </p>
    </section>
  );
}
