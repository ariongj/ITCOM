// Step 2 — "Paraqit dhe publiko" (PDF p.29): badge, landing page, placements, device preview, test cart, checks.
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Copy, ExternalLink } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { Accent } from '@/components/ui/misc';
import { useL, useLang } from '@/i18n';
import { brandVars } from '@/lib/color';
import { basePrice } from '@/lib/pricing';
import { money } from '@/lib/format';
import { href } from '@/lib/paths';
import { thumb } from '@/lib/utils';
import type { Discount, PlacementKind, Placement, Product } from '@/lib/types';
import type { OfferData } from './hooks';
import type { Check, FixTarget, OfferX, RuleMode } from './model';
import { PlacementsCard } from './PlacementsCard';
import { DevicePreview } from './DevicePreview';
import { TestCart } from './TestCart';
import { ChecksCard } from './ChecksCard';
import { FieldLabel, useOT } from './ui';

export interface PresentProps {
  draft: OfferX;
  set: (patch: Partial<OfferX>) => void;
  data: OfferData;
  mode: RuleMode;
  discount?: Discount;
  participating: Product[];
  linked: Placement[];
  createdIds: Set<string>;
  homeBlock: boolean;
  onHomeBlock: (v: boolean) => void;
  onCreate: (kind: PlacementKind) => void;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
  createdNote?: string;
  savedSlug: string | null;
  live: boolean;
  dirty: boolean;
  checks: Check[];
  onFix: (f: FixTarget) => void;
  publishBar: ReactNode;
}

export function PresentStep(p: PresentProps) {
  const t = useOT();
  const l = useL('admin');
  const lang = useLang('admin');
  const { draft, set } = p;
  const sample = p.participating.find((x) => x.status === 'active') ?? p.participating[0];
  const url = `/oferta/${draft.slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href(url)}`);
      toast.success(t('copied'));
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="space-y-5">
      {/* ---------------- badge ---------------- */}
      <Card title={t('badge')} description={t('badgeText')}>
        <div id="of-badge" className="scroll-mt-32" />
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
          <L10nInput label={t('badge')} value={draft.badge} onChange={(badge) => set({ badge })} placeholder="−15%" />
          <div>
            <FieldLabel>{t('badgeOnCard')}</FieldLabel>
            {/* storefront look inside the neutral CMS: brand colours scoped to this preview */}
            <div style={brandVars(p.data.settings.brandColor)} className="overflow-hidden rounded-xl border border-line bg-white">
              <div className="relative aspect-[4/3] bg-sand">
                {(sample?.images[0] || draft.image) && <img src={thumb(sample?.images[0] || draft.image)} alt="" className="h-full w-full object-cover" />}
                {l(draft.badge) && <span className="absolute left-2 top-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-white">{l(draft.badge)}</span>}
              </div>
              <div className="px-2.5 py-2">
                <div className="truncate text-[12px] font-semibold text-ink">{sample ? l(sample.name) : l(draft.name)}</div>
                {sample && <div className="text-[12px] font-bold text-brand-700">{money(basePrice(sample), lang)}</div>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------- landing page ---------------- */}
      <Card
        title={t('landing')}
        description={t('landingText')}
        actions={
          draft.slug && (
            <div className="flex items-center gap-1">
              <button type="button" onClick={copy} title={t('copyLink')} aria-label={t('copyLink')} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-canvas hover:text-ink">
                <Copy className="h-4 w-4" />
              </button>
              {p.savedSlug && (
                <a href={href(`/oferta/${p.savedSlug}${p.live ? '' : '?preview=1'}`)} target="_blank" rel="noreferrer" title={t('openNew')} aria-label={t('openNew')} className="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-canvas hover:text-ink">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          )
        }
      >
        <div id="of-landing" className="scroll-mt-32" />
        <div className="mb-4 flex min-w-0 items-center gap-2 rounded-lg bg-canvas/70 px-3 py-2 font-mono text-[12.5px] text-ink-soft">
          <span className="truncate">itcom.example{url}</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <L10nInput label={t('f_landingTitle')} value={draft.landing.title} onChange={(title) => set({ landing: { ...draft.landing, title } })} hint={t('f_landingTitleHint')} />
            {l(draft.landing.title) && (
              <div className="rounded-lg border border-line/70 px-3 py-2 text-[17px] font-semibold text-ink [&_em]:font-serif" style={brandVars(p.data.settings.brandColor)}>
                <Accent text={l(draft.landing.title)} />
              </div>
            )}
            <L10nInput label={t('f_landingText')} value={draft.landing.text} onChange={(text) => set({ landing: { ...draft.landing, text } })} multiline rows={3} />
          </div>
          <ImageField label={t('f_image')} value={draft.image} onChange={(image) => set({ image })} aspect="aspect-[4/3]" />
        </div>
      </Card>

      <PlacementsCard
        draft={draft}
        linked={p.linked}
        createdIds={p.createdIds}
        all={p.data.placements}
        offers={p.data.offers}
        homeBlock={p.homeBlock}
        onHomeBlock={p.onHomeBlock}
        onCreate={p.onCreate}
        onLink={p.onLink}
        onUnlink={p.onUnlink}
        createdNote={p.createdNote}
      />

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <DevicePreview slug={p.savedSlug} live={p.live} dirty={p.dirty} />
        <TestCart draft={draft} discount={p.discount} mode={p.mode} participating={p.participating} data={p.data} />
      </div>

      <ChecksCard checks={p.checks} onFix={p.onFix} footer={p.publishBar} />
    </div>
  );
}
