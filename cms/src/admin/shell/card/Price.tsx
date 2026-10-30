import type { Product } from '@/lib/types';
import { basePrice, isOnSale, priceOnRequest } from '@/lib/pricing';
import { money, perUnit } from '@/lib/format';
import { useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { cn } from '@/lib/utils';

/** True when options can push the price above the base price → show "from". */
export function hasPriceRange(p: Product) {
  return p.options.some((o) => o.values.some((v) => (v.priceDelta ?? 0) > 0));
}

export function Price({ product, size = 'md', className, showUnit = true }: { product: Product; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; showUnit?: boolean }) {
  const lang = useLang();
  const tc = useDict(common);
  if (priceOnRequest(product)) {
    const text = { sm: 'text-[14.5px]', md: 'text-[16px]', lg: 'text-xl', xl: 'text-[28px] leading-tight' };
    return (
      <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
        <span className={cn('font-semibold tracking-tight text-ink', text[size])}>{tc('priceOnRequest')}</span>
      </div>
    );
  }
  const sale = isOnSale(product);
  const price = basePrice(product);
  const from = product.quoteOnly || hasPriceRange(product);
  const sizes = {
    sm: 'text-[15px]',
    md: 'text-[17px]',
    lg: 'text-2xl',
    xl: 'text-[34px] leading-none',
  };
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      {from && <span className="text-[13px] font-medium text-muted">{tc('from')}</span>}
      <span className={cn('font-bold tracking-tight tabular-nums', sale ? 'text-brand-700' : 'text-ink', sizes[size])}>{money(price, lang, { decimals: price % 1 !== 0 })}</span>
      {showUnit && product.unit !== 'kom' && <span className="text-[13px] font-medium text-muted">{perUnit(product.unit, lang)}</span>}
      {sale && <span className="text-[13px] font-medium text-muted line-through tabular-nums">{money(product.price, lang, { decimals: product.price % 1 !== 0 })}</span>}
    </div>
  );
}
