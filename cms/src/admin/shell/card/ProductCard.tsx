import { Link } from 'react-router';
import { toast } from 'sonner';
import { Heart, Plus, ArrowUpRight, CalendarCheck, Glasses, FlaskConical } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Badge, Img } from '@/components/ui/misc';
import { Price } from './Price';
import { defineDict, useDict, useL } from '@/i18n';
import { site } from '@/i18n/site';
import { common } from '@/i18n/common';
import { useUi } from '@/store/ui';
import { useDb } from '@/store/db';
import { defaultOptions, discountPct, priceOnRequest } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { isLensPackage, labDays, rxReady } from './product/optical';
import { RenderChip, isRender } from './smart/render';

const C = defineDict({
  me: { rxReady: 'Moguće sa dioptrijom', labDays: 'Laboratorija: {days} dana', request: 'Proverite dostupnost', tryIn: 'Besplatna proba u optici' },
  sq: { rxReady: 'Gati për dioptri', labDays: 'Laboratori: {days} ditë', request: 'Kërko disponueshmërinë', tryIn: 'Provë falas në optikë' },
  en: { rxReady: 'Prescription-ready', labDays: 'Lab time: {days} days', request: 'Request availability', tryIn: 'Free try-on in store' },
});

export function ProductBadges({ product, className }: { product: Product; className?: string }) {
  const tc = useDict(common);
  const pct = discountPct(product);
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {pct > 0 && <Badge tone="brand">−{pct}%</Badge>}
      {product.badges.includes('new') && <Badge tone="dark">{tc('badge_new')}</Badge>}
      {product.badges.includes('bestseller') && <Badge tone="light">{tc('badge_bestseller')}</Badge>}
      {product.badges.includes('premium') && !product.badges.includes('new') && <Badge tone="light">{tc('badge_premium')}</Badge>}
    </div>
  );
}

export function ProductCard({ product, className, priority }: { product: Product; className?: string; priority?: boolean }) {
  const t = useDict(site);
  const tp = useDict(C);
  const l = useL();
  const category = useDb((s) => s.categories.find((c) => c.id === product.categoryId));
  const wish = useUi((s) => s.wishlist.includes(product.id));
  const toggleWishlist = useUi((s) => s.toggleWishlist);
  const addToCart = useUi((s) => s.addToCart);
  const setCartOpen = useUi((s) => s.setCartOpen);
  const href = `/produkt/${product.slug}`;
  const simple = !product.quoteOnly && product.options.length === 0 && product.unit !== 'm2' && product.unit !== 'm';
  // frame colour first; any other swatch option (e.g. a lens tint) as a fallback
  const swatches = product.options.find((o) => o.id === 'color') ?? product.options.find((o) => o.type === 'swatch');
  const lensPack = isLensPackage(product);
  const onReq = priceOnRequest(product);
  const rx = !lensPack && !onReq && rxReady(product);

  const quickAdd = () => {
    addToCart({ productId: product.id, qty: 1, options: defaultOptions(product), installation: false });
    toast.success(t('added'), { description: l(product.name), action: { label: t('viewCart'), onClick: () => setCartOpen(true) } });
  };

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
        <Link to={href} aria-label={l(product.name)} className="absolute inset-0">
          <Img src={product.images[0]} small eager={priority} alt={l(product.name)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]" />
          {product.images[1] && (
            <Img src={product.images[1]} small alt="" className="absolute inset-0 h-full w-full object-cover opacity-0! transition-opacity duration-700 group-hover:opacity-100!" />
          )}
        </Link>
        <ProductBadges product={product} className="pointer-events-none absolute left-3 top-3" />
        {isRender(product.images[0]) && <RenderChip className="absolute bottom-3 left-3 transition-opacity duration-300 md:group-hover:opacity-0" />}
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={t('wishlist')}
          aria-pressed={wish}
          className={cn(
            'absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-all hover:scale-105',
            wish ? 'text-brand-600' : 'text-ink/70 hover:text-ink',
          )}
        >
          <Heart className={cn('h-4 w-4', wish && 'fill-current')} />
        </button>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden">
          {simple ? (
            <button type="button" onClick={quickAdd} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/95 text-sm font-semibold text-ink shadow-lg backdrop-blur hover:bg-ink hover:text-white">
              <Plus className="h-4 w-4" /> {t('addToCart')}
            </button>
          ) : (
            <Link to={href} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white/95 text-sm font-semibold text-ink shadow-lg backdrop-blur hover:bg-ink hover:text-white">
              {onReq ? tp('request') : product.quoteOnly ? t('requestQuote') : t('chooseOptions')} <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{category ? l(category.name) : ''}</span>
          {swatches && (
            <span className="flex shrink-0 items-center -space-x-1" title={swatches.values.map((v) => l(v.label)).join(' · ')}>
              {swatches.values.slice(0, 4).map((v) => (
                <span key={v.id} className="h-3.5 w-3.5 rounded-full border-2 border-paper ring-1 ring-ink/10" style={{ background: v.swatch }} />
              ))}
              {swatches.values.length > 4 && <span className="pl-2 text-[11px] font-semibold tabular-nums text-muted">+{swatches.values.length - 4}</span>}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-[15.5px] font-semibold leading-snug text-ink">
          <Link to={href} className="link-u">
            {l(product.name)}
          </Link>
        </h3>
        <div className="mt-auto pt-2.5">
          {product.quoteOnly && !onReq && <div className="mb-0.5 text-[12px] font-medium text-oak">{t('quoteOnly')}</div>}
          <Price product={product} size="sm" />
          {onReq && (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
              <CalendarCheck className="h-3 w-3" />
              {tp('tryIn')}
            </div>
          )}
          {(rx || lensPack) && (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
              {lensPack ? <FlaskConical className="h-3 w-3" /> : <Glasses className="h-3 w-3" />}
              {lensPack ? tp('labDays', { days: labDays(product) }) : tp('rxReady')}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
