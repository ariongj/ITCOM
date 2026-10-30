// Live preview of a slide / banner / announcement with the storefront's real styling (PDF p.35
// "Parapamje Desktop / Mobile"). Rendered at the device's real width and scaled down to the panel, inside a
// wrapper that restores the Optika brand + warm tokens (the CMS itself stays neutral).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowRight, CalendarCheck, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import type { Lang, L10n } from '@/lib/types';
import { lt } from '@/i18n';
import { site } from '@/i18n/site';
import { Accent } from '@/components/ui/misc';
import { buttonClass } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { FONT_PAIRS, storefrontVars, type FontPair } from './theme';
import { objectPos, type PlacementX } from './placements';

export type Device = 'desktop' | 'mobile';

const SIZE: Record<'slide' | 'banner' | 'announcement', Record<Device, { w: number; h: number }>> = {
  slide: { desktop: { w: 1280, h: 680 }, mobile: { w: 390, h: 720 } },
  banner: { desktop: { w: 1280, h: 440 }, mobile: { w: 390, h: 540 } },
  announcement: { desktop: { w: 1280, h: 132 }, mobile: { w: 390, h: 132 } },
};

/** Scales a fixed-size stage (real device pixels) to the available width. */
function Stage({ w, h, maxWidth, className, children }: { w: number; h: number; maxWidth?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const width = maxWidth ? Math.min(cw, maxWidth) : cw;
  const s = width ? width / w : 0;
  return (
    <div ref={ref} className="w-full">
      <div className={cn('relative mx-auto overflow-hidden', className)} style={{ width: width || '100%', height: s ? h * s : 240 }}>
        {s > 0 && <div style={{ width: w, height: h, transform: `scale(${s})`, transformOrigin: 'top left' }}>{children}</div>}
      </div>
    </div>
  );
}

const T = (v: L10n | undefined, lang: Lang) => lt(v, lang);

function NavItems({ lang }: { lang: Lang }) {
  const d = site[lang];
  return (
    <>
      <span>{d.nav_products}</span>
      <span>{d.nav_services}</span>
      <span>{d.nav_projects}</span>
      <span>{d.nav_contact}</span>
    </>
  );
}

export function PlacementPreview({
  p,
  device,
  lang,
  brand,
  font = 'classic',
  index = 1,
  count = 1,
  domain = 'itcom.example',
  placeholders,
}: {
  p: PlacementX;
  device: Device;
  lang: Lang;
  brand: string;
  font?: FontPair;
  /** Position of this slide in its slideshow (1-based) and total — for the indicators */
  index?: number;
  count?: number;
  domain?: string;
  placeholders: { title: string; cta: string };
}) {
  const size = SIZE[p.kind][device];
  const mobile = device === 'mobile';
  const vars = storefrontVars(brand);
  return (
    <div style={vars}>
      {mobile ? (
        <Stage w={size.w} h={size.h} maxWidth={p.kind === 'announcement' ? 340 : 290} className="rounded-[26px] border-[7px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_18px_40px_-20px_rgb(0_0_0/0.5)]">
          <Body p={p} device={device} lang={lang} font={font} index={index} count={count} placeholders={placeholders} />
        </Stage>
      ) : (
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_18px_40px_-24px_rgb(0_0_0/0.45)]">
          <div className="flex h-7 items-center gap-1.5 border-b border-black/[0.06] bg-[#f4f4f4] px-3">
            <span className="h-2 w-2 rounded-full bg-black/15" />
            <span className="h-2 w-2 rounded-full bg-black/15" />
            <span className="h-2 w-2 rounded-full bg-black/15" />
            <span className="mx-auto truncate rounded-md bg-white px-6 py-0.5 text-[10.5px] font-medium text-black/45">{domain}</span>
          </div>
          <Stage w={size.w} h={size.h}>
            <Body p={p} device={device} lang={lang} font={font} index={index} count={count} placeholders={placeholders} />
          </Stage>
        </div>
      )}
    </div>
  );
}

function Body({ p, device, lang, font, index, count, placeholders }: { p: PlacementX; device: Device; lang: Lang; font: FontPair; index: number; count: number; placeholders: { title: string; cta: string } }) {
  if (p.kind === 'announcement') return <AnnouncementBody p={p} device={device} lang={lang} />;
  if (p.kind === 'banner') return <BannerBody p={p} device={device} lang={lang} font={font} placeholders={placeholders} />;
  return <SlideBody p={p} device={device} lang={lang} font={font} index={index} count={count} placeholders={placeholders} />;
}

/* ------------------------------------------------------------------ */
/* Media with focal point + optional Ken Burns (off for reduced motion) */
/* ------------------------------------------------------------------ */
function Media({ p, device, kenburns }: { p: PlacementX; device: Device; kenburns?: boolean }) {
  const reduce = useReducedMotion();
  const mobile = device === 'mobile';
  const src = (mobile && p.imageMobile) || p.image;
  const focal = mobile ? (p.imageMobile ? p.focalMobile : (p.focalMobile ?? p.focal)) : p.focal;
  if (!src) return <div className="absolute inset-0 bg-[linear-gradient(135deg,#3a3631,#1c1a17)]" />;
  return (
    <img
      key={src}
      src={src}
      alt={T(p.alt, 'sq')}
      className={cn('absolute inset-0 h-full w-full object-cover', kenburns && !reduce && 'animate-[kenburns_9s_ease-out_both]')}
      style={{ objectPosition: objectPos(focal) }}
      draggable={false}
    />
  );
}

/** Overlay: the hero's gradients plus the slide's own overlay strength (0–80 %). */
function Overlay({ p }: { p: PlacementX }) {
  const a = Math.max(0, Math.min(80, p.overlay)) / 100;
  return (
    <>
      <div className="absolute inset-0" style={{ background: `rgb(28 26 23 / ${a})` }} />
      {p.textAlign === 'left' ? (
        <div className="absolute inset-0 bg-gradient-to-r from-ink/55 via-ink/15 to-transparent" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(28_26_23/0.35),transparent_70%)]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-ink/20" />
    </>
  );
}

function SlideBody({ p, device, lang, font, index, count, placeholders }: { p: PlacementX; device: Device; lang: Lang; font: FontPair; index: number; count: number; placeholders: { title: string; cta: string } }) {
  const mobile = device === 'mobile';
  const center = p.textAlign === 'center';
  const title = T(p.title, lang);
  const ctaLabel = T(p.cta.label, lang);
  const sec = p.secondary && p.secondary.href ? T(p.secondary.label, lang) : '';
  const heading: CSSProperties = FONT_PAIRS[font].heading;
  return (
    <section className="relative isolate h-full w-full overflow-hidden bg-ink font-sans">
      <Media p={p} device={device} kenburns />
      <Overlay p={p} />
      {/* faux header (transparent over the hero) */}
      <div className={cn('absolute inset-x-0 top-0 flex items-center justify-between', mobile ? 'h-16 px-4' : 'h-20 px-8')}>
        <Logo tone="light" className={mobile ? 'h-9!' : 'h-11!'} />
        {!mobile && (
          <div className="flex gap-7 text-[14.5px] font-semibold text-white/85">
            <NavItems lang={lang} />
          </div>
        )}
        <span className="h-9 w-9 rounded-full border border-white/30" />
      </div>
      <div className={cn('absolute inset-0 flex flex-col justify-end', mobile ? 'px-4 pb-28 pt-24' : 'px-8 pb-36 pt-32', center && 'items-center text-center')}>
        <div className={cn(mobile ? 'max-w-full' : 'max-w-3xl', center && 'flex flex-col items-center')}>
          {T(p.eyebrow, lang) && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              {T(p.eyebrow, lang)}
            </div>
          )}
          <h1 className={cn('display text-shadow-soft text-white', mobile ? 'text-[46px] leading-[0.98]' : 'text-[88px] leading-[0.98]', !title && 'opacity-50')} style={heading}>
            <Accent text={title || placeholders.title} accentClassName="text-brand-200" />
          </h1>
          {T(p.subtitle, lang) && <p className={cn('mt-6 max-w-xl leading-relaxed text-white/85', mobile ? 'text-[17px]' : 'text-lg')}>{T(p.subtitle, lang)}</p>}
          {(p.cta.href || sec) && (
            <div className={cn('mt-9 flex flex-wrap gap-3', center && 'justify-center')}>
              {p.cta.href && (
                <span className={buttonClass({ size: 'lg' })}>
                  {ctaLabel || placeholders.cta}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
              {sec && (
                <span className={buttonClass({ size: 'lg', variant: 'outlineLight' })}>
                  {p.secondary!.href.includes('rezervo') && <CalendarCheck className="h-4 w-4" />}
                  {sec}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {count > 1 && (
        <div className={cn('absolute flex items-center gap-5', mobile ? 'bottom-[86px] left-4' : 'bottom-32 right-8')}>
          <span className="font-display text-sm tabular-nums text-white/80">
            <span className="text-white">{String(index).padStart(2, '0')}</span> / {String(count).padStart(2, '0')}
          </span>
          <div className="flex gap-2">
            {Array.from({ length: count }, (_, k) => (
              <span key={k} className="relative h-[3px] w-14 overflow-hidden rounded-full bg-white/25">
                <span className={cn('absolute inset-y-0 left-0 rounded-full bg-white', k < index ? 'w-full' : 'w-0')} />
              </span>
            ))}
          </div>
          {!mobile && (
            <div className="flex gap-2">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white">
                <ChevronLeft className="h-5 w-5" />
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white">
                <ChevronRight className="h-5 w-5" />
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function BannerBody({ p, device, lang, font, placeholders }: { p: PlacementX; device: Device; lang: Lang; font: FontPair; placeholders: { title: string; cta: string } }) {
  const mobile = device === 'mobile';
  const center = p.textAlign === 'center';
  const title = T(p.title, lang);
  return (
    <div className={cn('h-full w-full bg-paper font-sans', mobile ? 'px-4 py-6' : 'px-8 py-10')}>
      <div className="relative isolate h-full overflow-hidden rounded-3xl bg-ink">
        <Media p={p} device={device} />
        <Overlay p={p} />
        <div className={cn('absolute inset-0 flex flex-col justify-end', mobile ? 'p-6' : 'p-12', center && 'items-center text-center')}>
          {T(p.eyebrow, lang) && <span className="text-[11.5px] font-bold uppercase tracking-[0.2em] text-brand-200">{T(p.eyebrow, lang)}</span>}
          <h2 className={cn('display mt-2 text-white', mobile ? 'text-[34px] leading-[1.02]' : 'max-w-2xl text-[56px] leading-[1.02]', !title && 'opacity-50')} style={FONT_PAIRS[font].heading}>
            <Accent text={title || placeholders.title} accentClassName="text-brand-200" />
          </h2>
          {T(p.subtitle, lang) && <p className={cn('mt-3 max-w-lg text-white/85', mobile ? 'text-[15px]' : 'text-[17px]')}>{T(p.subtitle, lang)}</p>}
          {p.cta.href && (
            <span className={cn(buttonClass({ size: mobile ? 'md' : 'lg', variant: 'light' }), 'mt-6')}>
              {T(p.cta.label, lang) || placeholders.cta}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnouncementBody({ p, device, lang }: { p: PlacementX; device: Device; lang: Lang }) {
  const mobile = device === 'mobile';
  const msg = T(p.title, lang);
  const linkLabel = T(p.cta.label, lang);
  return (
    <div className="h-full w-full bg-paper font-sans">
      <div className="bg-ink text-paper">
        <div className={cn('flex h-9 items-center justify-between gap-4 text-[12.5px]', mobile ? 'px-4' : 'px-8')}>
          {!mobile && (
            <span className="flex items-center gap-1.5 text-paper/75">
              <Phone className="h-3.5 w-3.5" /> +383 43 777 667
            </span>
          )}
          <p className={cn('flex-1 truncate text-center font-medium', !msg && 'opacity-50')}>
            {msg || '—'}
            {p.cta.href && linkLabel && <span className="ml-2 underline underline-offset-2">{linkLabel}</span>}
          </p>
          {!mobile && <span className="text-[11px] font-bold tracking-wide text-paper/75">SQ · EN</span>}
        </div>
      </div>
      <div className={cn('flex h-[72px] items-center justify-between border-b border-line bg-paper/95', mobile ? 'px-4' : 'px-8')}>
        <Logo className={mobile ? 'h-9!' : 'h-11!'} />
        {!mobile && (
          <div className="flex gap-7 text-[14.5px] font-semibold text-ink-soft">
            <NavItems lang={lang} />
          </div>
        )}
        <span className="h-9 w-9 rounded-full bg-ink/[0.06]" />
      </div>
    </div>
  );
}
