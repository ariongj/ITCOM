// Online Store → Slideshow & bannerë → editor (PDF p.35): title, linked offer (inherited or own schedule),
// CTA + destination, desktop / mobile media with focal point and alt text per language, eyebrow / subtitle,
// alignment, overlay, status — with a live Desktop / Mobile preview in the real storefront styling.
// Rules (p.31): text stays text, expired offers are never advertised, reduced motion is respected.
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { useReducedMotion } from 'motion/react';
import {
  AlignCenter, AlignLeft, ArrowUpRight, CalendarClock, CircleAlert, Copy, Info, Keyboard, ListTree, Monitor, Plus, Save, SearchX, Smartphone, Trash2, Type, X,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, plain } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { adm } from '@/admin/i18n';
import { site } from '@/i18n/site';
import { LANGS, lt, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useSettings } from '@/store/hooks';
import { offerState, placementState } from '@/lib/offers';
import { date } from '@/lib/format';
import type { L10n, Lang, Offer, PlacementKind, PlacementPosition } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { SD, SE } from '@/admin/components/store/i18n';
import { FieldLabel, Notice, Segmented, SelectBox, StatePill, Tip, ctl } from '@/admin/components/store/parts';
import { MediaSlot } from '@/admin/components/store/MediaSlot';
import { PlacementPreview, type Device } from '@/admin/components/store/PlacementPreview';
import {
  KIND_POSITIONS, KINDS, blankPlacement, fromLocalInput, rangeLabel, resolveHref, toLocalInput, useLeaveGuard, type LinkCtx, type PlacementX,
} from '@/admin/components/store/placements';
import { readTheme } from '@/admin/components/store/theme';

const LIST = '/admin/prodavnica/slajdovi';
const NEW_TITLE = { slide: 'newTitle_slide', banner: 'newTitle_banner', announcement: 'newTitle_announcement' } as const;

export default function SlideEdit() {
  const { id = '' } = useParams();
  const isNew = id === 'novi';
  const [params] = useSearchParams();
  const placements = useDb((s) => s.placements);
  const saved = useMemo(() => (isNew ? null : ((placements.find((p) => p.id === id) as PlacementX | undefined) ?? null)), [placements, id, isNew]);

  // A new item gets its id, kind, position and order once (from ?lloji=&pozicioni=)
  const [fresh] = useState<PlacementX>(() => {
    const kind = (KINDS.includes(params.get('lloji') as PlacementKind) ? params.get('lloji') : 'slide') as PlacementKind;
    const pos = params.get('pozicioni') as PlacementPosition | null;
    const position = pos && KIND_POSITIONS[kind].includes(pos) ? pos : KIND_POSITIONS[kind][0];
    const order = Math.max(0, ...useDb.getState().placements.filter((p) => p.position === position).map((p) => p.order)) + 1;
    return blankPlacement(uid('pl'), kind, position, order);
  });
  const base = isNew ? fresh : saved;
  if (!base) return <NotFound />;
  return <Editor key={base.id} base={base} isNew={isNew} />;
}

function NotFound() {
  const t = useDict(SE, 'admin');
  const ta = useDict(adm, 'admin');
  return (
    <div>
      <PageHeader back={LIST} breadcrumbs={[{ label: ta('nav_onlineStore'), to: '/admin/prodavnica' }, { label: ta('nav_slides'), to: LIST }]} title={t('notFound')} />
      <Card>
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t('notFound')}
          text={t('notFoundText')}
          action={
            <ButtonLink to={LIST} shape="rounded" size="sm" variant="outline">
              {t('backToList')}
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */
function Editor({ base, isNew }: { base: PlacementX; isNew: boolean }) {
  const t = useDict(SE, 'admin');
  const ts = useDict(SD, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const adminLang = useLang('admin');
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const can = useCan();
  const canEdit = can('onlineStore', 'edit');
  const canPublish = can('onlineStore', 'publish');
  const canDelete = can('onlineStore', 'delete');

  const settings = useSettings();
  const theme = readTheme(settings);
  const placements = useDb((s) => s.placements);
  const offers = useDb((s) => s.offers);
  const collections = useDb((s) => s.collections);
  const categories = useDb((s) => s.categories);
  const products = useDb((s) => s.products);
  const pages = useDb((s) => s.pages);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);

  const [draft, setDraft] = useState<PlacementX>(base);
  // follow the stored item when it changes elsewhere (another tab) while nothing is edited here
  const [prevBase, setPrevBase] = useState(base);
  if (prevBase !== base) {
    setPrevBase(base);
    if (JSON.stringify(draft) === JSON.stringify(prevBase)) setDraft(base);
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(base);
  const set = (patch: Partial<PlacementX>) => setDraft((d) => ({ ...d, ...patch }));
  const guard = useLeaveGuard(dirty && canEdit, { title: ts('leaveTitle'), text: ts('leaveText'), confirm: ts('leaveConfirm') });

  const [device, setDevice] = useState<Device>('desktop');
  const [previewLang, setPreviewLang] = useState<Lang>(adminLang);
  const [ownSchedule, setOwnSchedule] = useState(!!(base.startsAt || base.endsAt));
  const [showErrors, setShowErrors] = useState(false);

  const kind = draft.kind;
  const isBar = kind === 'announcement';
  const offer = draft.offerId ? offers.find((o) => o.id === draft.offerId) ?? null : null;
  const oState = offer ? offerState(offer) : null;
  const state = placementState(draft, Date.now(), offer);
  const listUrl = `${LIST}${kind === 'slide' ? '' : `?lloji=${kind}`}`;
  const ctx: LinkCtx = useMemo(() => ({ offers, collections, categories, products, pages }), [offers, collections, categories, products, pages]);

  // indicators in the preview: live items of this position + this one, in display order
  const { index, count } = useMemo(() => {
    const now = Date.now();
    const byId = new Map(offers.map((o) => [o.id, o]));
    const list = placements
      .filter((p) => p.position === draft.position && p.id !== draft.id && placementState(p, now, p.offerId ? byId.get(p.offerId) ?? null : null) === 'active')
      .concat(draft)
      .sort((a, b) => a.order - b.order);
    return { index: list.findIndex((p) => p.id === draft.id) + 1, count: list.length };
  }, [placements, offers, draft]);

  /* ---------------- validation ---------------- */
  const titleMissing = !draft.title.me.trim() && !draft.title.sq.trim() && !draft.title.en.trim();
  const imageMissing = !isBar && draft.status === 'active' && !draft.image;
  const datesBad = !!(draft.startsAt && draft.endsAt && new Date(draft.endsAt) <= new Date(draft.startsAt));
  const lockedLive = !canPublish && base.status === 'active' && !isNew;

  const save = () => {
    if (titleMissing || imageMissing || datesBad) {
      setShowErrors(true);
      toast.error(titleMissing ? t('needTitle') : imageMissing ? t('needImage') : t('dateInvalid'));
      return;
    }
    let next: PlacementX = { ...draft, name: draft.name.trim() || plain(lt(draft.title, 'sq')).slice(0, 60) };
    if (!ownSchedule && next.offerId) next = { ...next, startsAt: undefined, endsAt: undefined };
    if (!next.startsAt) delete next.startsAt;
    if (!next.endsAt) delete next.endsAt;
    if (!next.offerId) delete next.offerId;
    if (!canPublish && next.status === 'active') next = { ...next, status: 'draft' };
    upsert('placements', next);
    setDraft(next);
    if (!canPublish && draft.status === 'active') toast.success(t('savedDraftOnly'));
    else toast.success(isNew ? t('created') : ts('saved'), { description: plain(l(next.title)) || next.name });
    if (isNew) {
      guard.allow();
      navigate(`${LIST}/${next.id}`, { replace: true });
    }
  };
  const discard = () => {
    setDraft(base);
    setOwnSchedule(!!(base.startsAt || base.endsAt));
    setShowErrors(false);
  };
  const duplicate = () => {
    const max = Math.max(0, ...placements.filter((x) => x.position === base.position).map((x) => x.order));
    const copy: PlacementX = { ...structuredClone(base), id: uid('pl'), name: `${base.name} ${ts('copySuffix')}`, status: 'draft', order: max + 1 };
    upsert('placements', copy);
    toast.success(ts('duplicated'));
    guard.allow();
    navigate(`${LIST}/${copy.id}`);
  };
  const del = async () => {
    const name = plain(l(base.title)) || base.name;
    if (!(await confirmDialog({ title: ts('deleteTitle', { name }), text: ts('deleteText'), confirmLabel: ts('delete'), danger: true }))) return;
    remove('placements', base.id);
    toast.success(ts('deleted'), { description: name });
    guard.allow();
    navigate(listUrl, { replace: true });
  };

  /* ---------------- offer link ---------------- */
  const pickOffer = (offerId: string) => {
    const o = offers.find((x) => x.id === offerId);
    if (!o) {
      set({ offerId: undefined });
      setOwnSchedule(!!(draft.startsAt || draft.endsAt));
      return;
    }
    const patch: Partial<PlacementX> = { offerId: o.id };
    // a fresh link points the CTA at the offer's landing page
    if (!draft.cta.href) patch.cta = { href: `/oferta/${o.slug}`, label: isEmpty(draft.cta.label) ? { me: SE.me.previewCta, sq: SE.sq.previewCta, en: SE.en.previewCta } : draft.cta.label };
    if (!ownSchedule) Object.assign(patch, { startsAt: undefined, endsAt: undefined });
    set(patch);
  };
  const offerRange = offer ? rangeLabel(offer.startsAt, offer.endsAt, adminLang, { from: ts('fromWord'), until: ts('untilWord') }) ?? ts('noEnd') : '';
  const setScheduleMode = (own: boolean) => {
    setOwnSchedule(own);
    if (!own) set({ startsAt: undefined, endsAt: undefined });
    else if (offer && !draft.startsAt && !draft.endsAt) set({ startsAt: offer.startsAt, endsAt: offer.endsAt });
  };

  /* ---------------- header ---------------- */
  const heading = isNew ? t(NEW_TITLE[kind]) : `${ts(`one_${kind}`)}: ${plain(l(draft.title)) || draft.name || ts('untitled')}`;
  const saveBtn = (
    <Button shape="rounded" size="sm" icon={<Save className="h-4 w-4" />} onClick={save} disabled={!dirty || !canEdit || lockedLive}>
      {t('save')}
    </Button>
  );

  return (
    <div className="pb-28">
      <PageHeader
        back={listUrl}
        breadcrumbs={[{ label: ta('nav_onlineStore'), to: '/admin/prodavnica' }, { label: ta('nav_slides'), to: listUrl }, isNew ? t(NEW_TITLE[kind]) : plain(l(draft.title)) || draft.name || ts('untitled')]}
        title={<span className="line-clamp-2 break-words">{heading}</span>}
        badge={<StatePill state={state} />}
        actions={
          <>
            {!isNew && (
              <Button variant="outline" shape="rounded" size="sm" icon={<Copy className="h-4 w-4" />} onClick={duplicate} disabled={!canEdit}>
                {ts('duplicate')}
              </Button>
            )}
            {!isNew &&
              (canDelete ? (
                <Button variant="outline" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} onClick={del} className="text-red-700 hover:border-red-300!">
                  {ts('delete')}
                </Button>
              ) : (
                <Tip text={ts('noPermDelete')} side="bottom">
                  <Button variant="outline" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled>
                    {ts('delete')}
                  </Button>
                </Tip>
              ))}
            {lockedLive ? (
              <Tip text={ts('noPermPublish')} side="bottom">
                {saveBtn}
              </Tip>
            ) : !canEdit ? (
              <Tip text={ts('noPermEdit')} side="bottom">
                {saveBtn}
              </Tip>
            ) : (
              saveBtn
            )}
          </>
        }
      />

      {!canEdit && <Notice icon={Info} className="mb-4">{ts('readOnly')}</Notice>}
      {lockedLive && canEdit && <Notice icon={Info} tone="warn" className="mb-4">{ts('noPermPublish')}</Notice>}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
        {/* -------- Preview (right on desktop, first on smaller screens) -------- */}
        <div className="order-first xl:sticky xl:top-[72px] xl:order-last">
          <Card
            title={t('preview')}
            actions={
              <div className="flex items-center gap-1.5">
                <Segmented<Device>
                  size="sm"
                  label={t('preview')}
                  value={device}
                  onChange={setDevice}
                  options={[
                    { id: 'desktop', label: <span className="max-sm:sr-only">{ts('desktop')}</span>, icon: Monitor, title: ts('desktop') },
                    { id: 'mobile', label: <span className="max-sm:sr-only">{ts('mobile')}</span>, icon: Smartphone, title: ts('mobile') },
                  ]}
                />
                <Segmented<Lang> size="sm" label="Lang" value={previewLang} onChange={setPreviewLang} options={LANGS.map((x) => ({ id: x.code, label: x.short }))} />
              </div>
            }
            bodyClassName="bg-[#f6f6f6] rounded-b-xl"
          >
            <PlacementPreview
              p={draft}
              device={device}
              lang={previewLang}
              brand={settings.brandColor}
              font={theme.font}
              index={index}
              count={count}
              domain={theme.domain.name}
              placeholders={{ title: t('previewEmptyTitle'), cta: t('previewCta') }}
            />
            <div className="mt-3.5 space-y-1.5 text-[12px] text-muted">
              <p className="flex items-start gap-1.5">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" /> {t('previewNote')}
              </p>
              <p className="flex items-start gap-1.5">
                <Keyboard className="mt-px h-3.5 w-3.5 shrink-0" /> {t('kbdNote')}
                {reduce && <span className="font-semibold text-ink-soft"> · {t('reducedMotion')}</span>}
              </p>
            </div>
          </Card>
        </div>

        {/* -------- Form -------- */}
        <fieldset disabled={!canEdit} className="min-w-0 space-y-5">
          {/* Content */}
          <Card title={t('sec_content')}>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="pl-name">{t('f_name')}</FieldLabel>
                  <input id="pl-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('f_name_ph')} className={cn(ctl, 'h-10')} />
                  <p className="mt-1.5 text-xs text-muted">{t('f_name_h')}</p>
                </div>
                <div>
                  <FieldLabel htmlFor="pl-pos">{t('f_position')}</FieldLabel>
                  <SelectBox id="pl-pos" value={draft.position} onChange={(e) => set({ position: e.target.value as PlacementPosition })} disabled={KIND_POSITIONS[kind].length === 1}>
                    {KIND_POSITIONS[kind].map((p) => (
                      <option key={p} value={p}>
                        {ts(`pos_${p}`)}
                      </option>
                    ))}
                  </SelectBox>
                </div>
              </div>
              <L10nInput
                label={isBar ? t('f_message') : t('f_title')}
                value={draft.title}
                onChange={(v) => set({ title: v })}
                hint={showErrors && titleMissing ? <span className="font-medium text-red-600">{t('needTitle')}</span> : isBar ? t('f_message_h') : t('f_title_h')}
                required
              />
              {!isBar && (
                <>
                  <L10nInput label={t('f_eyebrow')} value={draft.eyebrow} onChange={(v) => set({ eyebrow: v })} />
                  <L10nInput label={t('f_subtitle')} value={draft.subtitle} onChange={(v) => set({ subtitle: v })} multiline rows={2} />
                </>
              )}
            </div>
          </Card>

          {/* Offer & schedule */}
          <Card title={t('sec_offer')}>
            <div className="space-y-4">
              <div>
                <FieldLabel
                  htmlFor="pl-offer"
                  aside={
                    offer && (
                      <Link to={`/admin/ponude/${offer.id}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
                        {t('openOffer')} <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    )
                  }
                >
                  {t('f_offer')}
                </FieldLabel>
                <SelectBox id="pl-offer" value={draft.offerId ?? ''} onChange={(e) => pickOffer(e.target.value)}>
                  <option value="">{t('noOffer')}</option>
                  {sortOffers(offers).map((o) => {
                    const st = offerState(o);
                    return (
                      <option key={o.id} value={o.id} disabled={st === 'expired' && o.id !== draft.offerId}>
                        {lt(o.name, adminLang)} — {st === 'expired' ? t('expiredOpt') : ts(`st_${st}`)}
                      </option>
                    );
                  })}
                </SelectBox>
                <p className="mt-1.5 text-xs text-muted">{t('offer_h')}</p>
              </div>

              {offer && oState === 'expired' && (
                <Notice icon={CircleAlert} tone="error">
                  {t('offerExpired', { name: lt(offer.name, adminLang) })}
                </Notice>
              )}
              {offer && (oState === 'draft' || oState === 'paused') && (
                <Notice icon={CircleAlert} tone="warn">
                  {t('offerPaused', { name: lt(offer.name, adminLang), state: ts(`st_${oState}`).toLowerCase() })}
                </Notice>
              )}
              {offer && oState === 'scheduled' && (
                <Notice icon={CalendarClock}>{t('offerScheduled', { d: date(offer.startsAt, adminLang, { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) })}</Notice>
              )}

              {offer ? (
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('sec_offer')}>
                  <RadioTile on={!ownSchedule} onClick={() => setScheduleMode(false)} title={t('sched_inherit')} text={t('sched_inherit_d', { range: offerRange })} />
                  <RadioTile on={ownSchedule} onClick={() => setScheduleMode(true)} title={t('sched_own')} text={t('sched_own_d')} />
                </div>
              ) : null}

              {(!offer || ownSchedule) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField label={t('f_start')} hint={t('start_h')} value={draft.startsAt} onChange={(v) => set({ startsAt: v })} />
                  <DateField label={t('f_end')} hint={t('end_h')} value={draft.endsAt} onChange={(v) => set({ endsAt: v })} error={datesBad ? t('dateInvalid') : undefined} />
                </div>
              )}
            </div>
          </Card>

          {/* CTA */}
          <Card title={isBar ? t('f_link') : t('sec_cta')}>
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <L10nInput label={isBar ? t('f_linkLabel') : t('f_ctaLabel')} value={draft.cta.label} onChange={(v) => set({ cta: { ...draft.cta, label: v } })} />
                <Destination label={t('f_dest')} value={draft.cta.href} onChange={(v) => set({ cta: { ...draft.cta, href: v } })} ctx={ctx} />
              </div>
              {!isBar && !draft.cta.href && !isEmpty(draft.cta.label) && (
                <Notice icon={CircleAlert} tone="warn">
                  {t('ctaNoDest')}
                </Notice>
              )}
              {kind === 'slide' &&
                (draft.secondary ? (
                  <div className="rounded-xl border border-line/80 bg-ink/[0.015] p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-[13px] font-semibold text-ink">{t('secondary')}</span>
                      <Button variant="ghost" size="xs" shape="rounded" icon={<X className="h-3.5 w-3.5" />} onClick={() => set({ secondary: undefined })}>
                        {t('removeSecondary')}
                      </Button>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <L10nInput label={t('f_ctaLabel')} value={draft.secondary.label} onChange={(v) => set({ secondary: { ...draft.secondary!, label: v } })} />
                      <Destination label={t('f_dest')} value={draft.secondary.href} onChange={(v) => set({ secondary: { ...draft.secondary!, href: v } })} ctx={ctx} />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="xs"
                    shape="rounded"
                    icon={<Plus className="h-3.5 w-3.5" />}
                    onClick={() => set({ secondary: { label: { me: SE.me.dest_measure, sq: SE.sq.dest_measure, en: SE.en.dest_measure }, href: '/#rezervo' } })}
                  >
                    {t('addSecondary')}
                  </Button>
                ))}
            </div>
          </Card>

          {/* Media */}
          {!isBar && (
            <Card title={t('sec_media')}>
              <div className="grid gap-5 sm:grid-cols-2">
                <MediaSlot
                  label={t('f_mediaDesktop')}
                  hint={showErrors && imageMissing ? <span className="font-medium text-red-600">{t('needImage')}</span> : t('mediaDesktop_h')}
                  value={draft.image}
                  onChange={(v) => set({ image: v })}
                  focal={draft.focal}
                  onFocal={(f) => set({ focal: f })}
                />
                <MediaSlot
                  label={t('f_mediaMobile')}
                  hint={t('mediaMobile_h')}
                  value={draft.imageMobile ?? ''}
                  onChange={(v) => set({ imageMobile: v || undefined })}
                  fallback={draft.image}
                  focal={draft.focalMobile ?? draft.focal}
                  onFocal={(f) => {
                    set({ focalMobile: f });
                    setDevice('mobile');
                  }}
                  empty="aspect-[4/5] max-h-[200px]"
                />
              </div>
              <p className="mt-2 text-xs text-muted">{t('focal_h')}</p>
              <div className="mt-5">
                <L10nInput label={t('f_alt')} value={draft.alt} onChange={(v) => set({ alt: v })} hint={t('f_alt_h')} />
              </div>
              <Notice icon={Type} className="mt-4">
                {t('textRule')}
              </Notice>
            </Card>
          )}

          {/* Appearance */}
          {!isBar && (
            <Card title={t('sec_style')}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{t('f_align')}</div>
                  <Segmented<'left' | 'center'>
                    className="w-full"
                    label={t('f_align')}
                    value={draft.textAlign}
                    onChange={(v) => set({ textAlign: v })}
                    disabled={!canEdit}
                    options={[
                      { id: 'left', label: t('left'), icon: AlignLeft },
                      { id: 'center', label: t('center'), icon: AlignCenter },
                    ]}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pl-overlay" aside={<span className="text-[12.5px] font-semibold tabular-nums text-ink">{draft.overlay}%</span>}>
                    {t('f_overlay')}
                  </FieldLabel>
                  <input
                    id="pl-overlay"
                    type="range"
                    min={0}
                    max={80}
                    step={5}
                    value={draft.overlay}
                    onChange={(e) => set({ overlay: Number(e.target.value) })}
                    className="h-10 w-full cursor-pointer accent-[#1a1a1a]"
                  />
                  <p className={cn('text-xs', draft.overlay < 20 ? 'font-medium text-amber-800' : 'text-muted')}>{draft.overlay < 20 ? t('contrastLow') : t('overlay_h')}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Publishing */}
          <Card title={t('sec_publish')} actions={<StatePill state={state} />}>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t('sec_publish')}>
              <RadioTile
                on={draft.status === 'active'}
                onClick={() => set({ status: 'active' })}
                title={t('status_active')}
                text={t('status_active_d')}
                disabled={!canPublish}
                lockedText={canPublish ? undefined : ts('noPermPublish')}
              />
              <RadioTile on={draft.status === 'draft'} onClick={() => set({ status: 'draft' })} title={t('status_draft')} text={t('status_draft_d')} disabled={lockedLive} />
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line/70 pt-4 text-[13px] sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{t('nowOnSite')}</dt>
                <dd>
                  <StatePill state={placementState(base, Date.now(), base.offerId ? offers.find((o) => o.id === base.offerId) ?? null : null)} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{ts(`pos_${draft.position}`)}</dt>
                <dd className="font-semibold tabular-nums text-ink">{String(index).padStart(2, '0')}</dd>
              </div>
              {offer && (
                <div className="flex items-center justify-between gap-3 sm:col-span-2">
                  <dt className="text-muted">{t('f_offer')}</dt>
                  <dd className="truncate text-right font-medium text-ink">
                    {lt(offer.name, adminLang)} <span className="font-normal text-muted">/ {ownSchedule ? t('sched_own').toLowerCase() : t('sched_inherit').toLowerCase()}</span>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </fieldset>
      </div>

      <SaveBar dirty={dirty && canEdit && !lockedLive} onSave={save} onDiscard={discard} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */
const isEmpty = (v: L10n) => !v.me.trim() && !v.sq.trim() && !v.en.trim();

const OFFER_RANK = { active: 0, scheduled: 1, draft: 2, paused: 3, expired: 4 } as const;
function sortOffers(list: Offer[]) {
  return [...list].sort((a, b) => OFFER_RANK[offerState(a)] - OFFER_RANK[offerState(b)]);
}

function RadioTile({ on, onClick, title, text, disabled, lockedText }: { on: boolean; onClick: () => void; title: ReactNode; text: ReactNode; disabled?: boolean; lockedText?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      title={lockedText}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border bg-white p-3.5 text-left transition-colors disabled:cursor-not-allowed',
        on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line enabled:hover:border-ink/30',
        disabled && !on && 'opacity-55',
      )}
    >
      <span className={cn('mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2', on ? 'border-ink' : 'border-ink/25')}>
        <span className={cn('h-2 w-2 rounded-full bg-ink transition-transform', on ? 'scale-100' : 'scale-0')} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{lockedText ?? text}</span>
      </span>
    </button>
  );
}

function DateField({ label, hint, value, onChange, error }: { label: string; hint: string; value?: string; onChange: (v: string | undefined) => void; error?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-1.5">
        <input type="datetime-local" value={toLocalInput(value)} onChange={(e) => onChange(fromLocalInput(e.target.value))} aria-invalid={!!error || undefined} className={cn(ctl, 'h-10 min-w-0 flex-1 tabular-nums', error && 'border-red-500')} aria-label={label} />
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-ink" aria-label={`${label} ×`}>
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className={cn('mt-1.5 text-xs', error ? 'font-medium text-red-600' : 'text-muted')}>{error ?? hint}</p>
    </div>
  );
}

/** Path / URL input with a picker of internal destinations (offers, collections, categories, pages…). */
function Destination({ label, value, onChange, ctx }: { label: string; value: string; onChange: (v: string) => void; ctx: LinkCtx }) {
  const t = useDict(SE, 'admin');
  const ts = useDict(SD, 'admin');
  const lang = useLang('admin');
  const resolved = resolveHref(value, ctx, lang);
  const groups: { label: string; items: { href: string; label: string }[] }[] = [
    { label: t('dest_offers'), items: sortOffers(ctx.offers).filter((o) => offerState(o) !== 'expired').map((o) => ({ href: `/oferta/${o.slug}`, label: lt(o.name, lang) })) },
    { label: t('dest_collections'), items: ctx.collections.map((c) => ({ href: `/koleksioni/${c.slug}`, label: `${lt(c.title, lang)}${c.published ? '' : ` ${t('unpublished')}`}` })) },
    { label: t('dest_categories'), items: [...ctx.categories].sort((a, b) => a.order - b.order).map((c) => ({ href: `/produktet/${c.slug}`, label: lt(c.name, lang) })) },
    { label: t('dest_pages'), items: ctx.pages.filter((p) => p.published).map((p) => ({ href: `/faqe/${p.slug}`, label: lt(p.title, lang) })) },
    {
      label: t('dest_other'),
      items: [
        { href: '/produktet', label: t('dest_all') },
        { href: '/#rezervo', label: t('dest_measure') },
        { href: '/syze-inteligjente', label: site[lang].nav_smart },
        { href: '/provo-virtualisht', label: t('dest_tryon') },
        { href: '/rezervo', label: site[lang].nav_book },
        { href: '/gjej-kornizen', label: site[lang].nav_finder },
        { href: '/lentet', label: site[lang].nav_lensGuide },
        { href: '/klinika', label: 'Klinika Miftari' },
        { href: '/optical-lab', label: 'Optical Lab' },
        { href: '/sherbimet', label: t('dest_services') },
        { href: '/lookbook', label: 'Lookbook' },
        { href: '/kontakt', label: t('dest_contact') },
      ],
    },
  ];
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-1.5">
        <input value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="/oferta/…" className={cn(ctl, 'h-10 min-w-0 flex-1 font-mono text-[13px]')} aria-label={label} spellCheck={false} />
        <label className="relative grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-white text-ink-soft transition-colors hover:border-ink/30 hover:text-ink" title={t('destPick')}>
          <ListTree className="h-4 w-4" />
          <select value="" onChange={(e) => e.target.value && onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t('destPick')}>
            <option value="">{t('destPick')}</option>
            {groups.map((g) =>
              g.items.length ? (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((it) => (
                    <option key={it.href} value={it.href}>
                      {it.label}
                    </option>
                  ))}
                </optgroup>
              ) : null,
            )}
          </select>
        </label>
      </div>
      <p className="mt-1.5 truncate text-xs text-muted">
        {resolved.type === 'none' ? t('f_dest_h') : resolved.type === 'url' ? `${ts('link_url')} · ${t('f_dest_h')}` : `→ ${ts(`link_${resolved.type}` as 'link_offer')} / ${resolved.label}`}
      </p>
    </div>
  );
}
