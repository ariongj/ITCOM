// Linked promotional content (PDF pp.28–29, 31–32): slides, catalogue banners and the announcement bar
// reference the offer and inherit its schedule; the homepage promo block is a slot toggle.
import { Link } from 'react-router';
import { GalleryHorizontalEnd, LayoutTemplate, Megaphone, PanelTop, Pencil, Plus, Unlink, type LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/Field';
import { Card, Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { placementState } from '@/lib/offers';
import { cn } from '@/lib/utils';
import type { Offer, Placement, PlacementKind } from '@/lib/types';
import { rangeLabel, type OfferX } from './model';
import { Help, PlacementStatusPill, SelectBox, useOT } from './ui';

const KIND_ICON: Record<PlacementKind, LucideIcon> = { slide: GalleryHorizontalEnd, banner: PanelTop, announcement: Megaphone };

export function PlacementsCard({
  draft,
  linked,
  createdIds,
  all,
  offers,
  homeBlock,
  onHomeBlock,
  onCreate,
  onLink,
  onUnlink,
  createdNote,
}: {
  draft: OfferX;
  linked: Placement[];
  createdIds: Set<string>;
  all: Placement[];
  offers: Offer[];
  homeBlock: boolean;
  onHomeBlock: (v: boolean) => void;
  onCreate: (kind: PlacementKind) => void;
  onLink: (id: string) => void;
  onUnlink: (id: string) => void;
  createdNote?: string;
}) {
  const t = useOT();
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const linkedIds = new Set(linked.map((p) => p.id));
  const free = all.filter((p) => !linkedIds.has(p.id));
  const offerName = (id?: string) => {
    const o = id ? offers.find((x) => x.id === id) : undefined;
    return o ? l(o.name) : '';
  };

  const create: { kind: PlacementKind; label: string }[] = [
    { kind: 'slide', label: t('addSlide') },
    { kind: 'banner', label: t('addBanner') },
    { kind: 'announcement', label: t('addBar') },
  ];

  return (
    <Card
      title={t('placements')}
      description={t('placementsText')}
      bodyClassName="space-y-4"
    >
      <div id="of-placements" className="scroll-mt-32" />

      {/* create / link toolbar */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12.5px] font-semibold text-muted">{t('createNew')}:</span>
          {create.map((c) => {
            const Icon = KIND_ICON[c.kind];
            return (
              <button
                key={c.kind}
                type="button"
                onClick={() => onCreate(c.kind)}
                disabled={!draft.slug}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 text-[13px] font-semibold text-ink transition hover:border-ink/35 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                <Icon className="h-3.5 w-3.5 text-ink-soft" />
                {c.label}
              </button>
            );
          })}
        </div>
        <SelectBox
          value=""
          aria-label={t('linkExisting')}
          onChange={(e) => e.target.value && onLink(e.target.value)}
          className="lg:w-72"
          disabled={!free.length}
        >
          <option value="">{free.length ? `${t('linkExisting')}…` : t('noFree')}</option>
          {(['slide', 'banner', 'announcement'] as PlacementKind[]).map((k) => {
            const group = free.filter((p) => p.kind === k);
            if (!group.length) return null;
            return (
              <optgroup key={k} label={t(`kind_${k}`)}>
                {group.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.offerId ? ` (${t('linkedToOther', { name: offerName(p.offerId) })})` : ''}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </SelectBox>
      </div>

      {/* linked list */}
      {linked.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">{t('noPlacements')}</p>
      ) : (
        <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line/80">
          {linked.map((p) => {
            const Icon = KIND_ICON[p.kind];
            const state = placementState(p, Date.now(), draft);
            const isNew = createdIds.has(p.id);
            const own = !!(p.startsAt || p.endsAt);
            return (
              <li key={p.id} className="flex items-start gap-3 bg-white px-3 py-2.5 sm:items-center">
                {p.kind === 'announcement' || !p.image ? (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft ring-1 ring-line">
                    <Icon className="h-4 w-4" />
                  </span>
                ) : (
                  <Thumb src={p.image} className="h-10 w-10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                    {isNew && <span className="rounded bg-ink px-1.5 py-px text-[10.5px] font-bold uppercase tracking-wide text-white">{t('newItem')}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted">
                    <Icon className="h-3 w-3" />
                    <span>{t(`pos_${p.position}`)}</span>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <LayoutTemplate className="h-3 w-3" />
                      {own ? `${t('ownWindow')}: ${rangeLabel(p.startsAt ?? draft.startsAt, p.endsAt ?? draft.endsAt, lang, t('period_open'))}` : `${t('inherits')} (${rangeLabel(draft.startsAt, draft.endsAt, lang, t('period_open'))})`}
                    </span>
                    {p.cta.href && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="truncate font-mono text-[11.5px]">{p.cta.href}</span>
                      </>
                    )}
                    {isNew && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="italic">{t('appliedOnSave')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="hidden sm:block">
                    <PlacementStatusPill state={state} />
                  </span>
                  {!isNew && (
                    <Link to={`/admin/prodavnica/slajdovi/${p.id}`} title={ta('edit')} aria-label={ta('edit')} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                  <button type="button" onClick={() => onUnlink(p.id)} title={t('unlink')} aria-label={t('unlink')} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink">
                    <Unlink className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {createdNote && <Help>{createdNote}</Help>}

      {/* homepage block slot */}
      <div className={cn('flex items-center justify-between gap-4 rounded-lg border border-line/80 px-3.5 py-3')}>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-ink">{t('homeBlock')}</div>
          <div className="text-[12.5px] text-muted">{t('homeBlockText')}</div>
        </div>
        <Switch checked={homeBlock} onChange={onHomeBlock} size="sm" />
      </div>
    </Card>
  );
}
