// Live thumbnail of the public site: the real storefront in an iframe (href() keeps the GitHub Pages base),
// rendered at a device width and scaled to the box. Same-origin, so it re-renders on its own when the CMS saves
// (the iframe's stores rehydrate on the localStorage `storage` event).
import { useLayoutEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { href } from '@/lib/paths';
import { cn } from '@/lib/utils';

export function SiteFrame({ path = '/', w, h, title, loadingText, className }: { path?: string; w: number; h: number; title: string; loadingText?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(0);
  const [loaded, setLoaded] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCw(el.clientWidth));
    ro.observe(el);
    setCw(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const s = cw ? cw / w : 0;
  return (
    <div ref={ref} className={cn('relative w-full overflow-hidden bg-[#f3f3f3]', className)} style={{ height: s ? h * s : undefined, aspectRatio: s ? undefined : `${w} / ${h}` }}>
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="inline-flex items-center gap-2 text-[12px] font-medium text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText}
          </span>
        </div>
      )}
      {s > 0 && (
        <iframe
          src={href(path)}
          title={title}
          tabIndex={-1}
          aria-hidden
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn('pointer-events-none absolute left-0 top-0 origin-top-left border-0 bg-white transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
          style={{ width: w, height: h, transform: `scale(${s})` }}
        />
      )}
    </div>
  );
}
