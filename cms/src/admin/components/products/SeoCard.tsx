import { Globe, Link2, RotateCcw } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { Checkbox, Textarea } from '@/components/ui/Field';
import { useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import type { Product } from '@/lib/types';
import { basePrice } from '@/lib/pricing';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { pd } from './dict';
import { FormField, TextInput } from './parts';

function Counter({ n, max }: { n: number; max: number }) {
  return <span className={cn('text-[11px] font-semibold tabular-nums', n > max ? 'text-amber-700' : 'text-muted')}>{`${n}/${max}`}</span>;
}

const GOOGLE_FONT = { fontFamily: 'arial, sans-serif' };

export function SeoCard({
  draft,
  slugAuto,
  onSlug,
  onResetSlug,
  onSeo,
  redirectFrom,
  redirect,
  onRedirect,
}: {
  draft: Product;
  slugAuto: boolean;
  onSlug: (slug: string) => void;
  onResetSlug: () => void;
  onSeo: (seo: { title?: string; description?: string }) => void;
  /** previous published URL handle when it was changed (p.10 "ridrejtim kur ndryshon URL") */
  redirectFrom?: string;
  redirect?: boolean;
  onRedirect?: (v: boolean) => void;
}) {
  const t = useDict(pd, 'admin');
  const lang = useLang('admin');
  const adminEmail = useDb((s) => s.settings.adminEmail);
  const company = useDb((s) => s.settings.companyName);
  const domain = adminEmail.split('@')[1] || 'itcom.example';
  const seo = draft.seo ?? {};
  // Mirrors the storefront <title>: "{name} — {company}" (see usePageTitle).
  // Albanian is the storefront's default language, so search engines index the SQ copy.
  const autoTitle = `${draft.name.sq.trim() || draft.name.me.trim() || t('f_title')} — ${company}`;
  const title = seo.title?.trim() || autoTitle;
  const autoDesc = draft.short.sq.trim() || draft.description.sq.trim() || draft.short.me.trim();
  const desc = seo.description?.trim() || autoDesc;
  const price = basePrice(draft);
  const toOrder = draft.stock >= 999 || draft.stock <= 0;
  const stockLabel = toOrder ? t('madeToOrder') : t('inStock');

  return (
    <Card title={t('c_seo')} description={t('c_seo_d')}>
      <div className="space-y-5">
        <FormField
          label={t('f_slug')}
          hint={
            slugAuto ? (
              t('slugAuto')
            ) : (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {t('slugManual')}
                <button type="button" onClick={onResetSlug} className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                  <RotateCcw className="h-3 w-3" /> {t('slugReset')}
                </button>
              </span>
            )
          }
        >
          <TextInput
            prefix={
              <span className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" />
                <span>
                  <span className="max-sm:hidden">{domain}</span>/produkt/
                </span>
              </span>
            }
            value={draft.slug}
            onChange={(e) => onSlug(e.target.value)}
            mono
            spellCheck={false}
            aria-label={t('f_slug')}
          />
          {redirectFrom && onRedirect && (
            <div className="mt-2.5 rounded-lg bg-canvas px-3 py-2.5">
              <Checkbox checked={!!redirect} onChange={onRedirect} label={<span className="text-[13px]">{t('redirect', { old: redirectFrom })}</span>} description={t('redirect_h')} />
            </div>
          )}
        </FormField>
        <FormField label={t('f_metaTitle')} hint={t('f_metaTitle_h')} aside={<Counter n={(seo.title ?? '').length} max={60} />}>
          <TextInput value={seo.title ?? ''} placeholder={autoTitle} onChange={(e) => onSeo({ ...seo, title: e.target.value })} aria-label={t('f_metaTitle')} />
        </FormField>
        <FormField label={t('f_metaDesc')} hint={t('f_metaDesc_h')} aside={<Counter n={(seo.description ?? '').length} max={160} />}>
          <Textarea
            rows={3}
            value={seo.description ?? ''}
            placeholder={autoDesc}
            onChange={(e) => onSeo({ ...seo, description: e.target.value })}
            aria-label={t('f_metaDesc')}
            className="rounded-lg! px-3! py-2.5! text-[14px]!"
          />
        </FormField>

        {/* Google-style result preview */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            <Globe className="h-3.5 w-3.5" /> {t('googlePreview')}
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_6px_rgb(32_33_36/0.08)]" style={GOOGLE_FONT}>
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-extrabold text-white">{company.trim().charAt(0).toUpperCase() || 'S'}</span>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[13.5px] text-[#202124]">{company}</div>
                <div className="truncate text-[12px] text-[#4d5156]">
                  https://{domain} › produkt › {draft.slug || '…'}
                </div>
              </div>
            </div>
            <div className="mt-2 line-clamp-1 text-[19px] leading-snug text-[#1a0dab]">{title}</div>
            <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.55] text-[#4d5156]">{desc || '—'}</p>
            {price > 0 && (
              <div className="mt-1.5 text-[13px] text-[#4d5156]">
                {money(price, lang)} · <span className={toOrder ? '' : 'text-[#188038]'}>{stockLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
