// Offer editor — Rritja > Ofertat > … (CMS proposal pp.28–30). One flow for the staff preparing promotions:
// 1 Përgatit → 2 Paraqit dhe publiko → 3 Mat dhe përfundo. Only roles with `offers.publish` activate an offer.
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CalendarCheck2, Copy, ExternalLink, Flag, Megaphone, Pause, Play, Rocket, RotateCcw, Trash2, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, Thumb } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { offerState } from '@/lib/offers';
import { ROLE_META } from '@/lib/permissions';
import { href } from '@/lib/paths';
import { cn, slugify } from '@/lib/utils';
import type { OfferStatus, Placement, PlacementKind } from '@/lib/types';
import { useChecker, useOfferData } from '@/admin/components/offers/hooks';
import { useOfferActions } from '@/admin/components/offers/actions';
import {
  checkStats, emptyOffer, fullDate, KIND_POSITION, LANG_CODES, offerProducts, placementFromOffer, slotsFor, sourceOf,
  type FixTarget, type OfferX, type RuleMode, type Step,
} from '@/admin/components/offers/model';
import { PrepareStep } from '@/admin/components/offers/PrepareStep';
import { PresentStep } from '@/admin/components/offers/PresentStep';
import { MeasureStep } from '@/admin/components/offers/MeasureStep';
import { PublishModal, type PublishOptions } from '@/admin/components/offers/PublishModal';
import { EndedBanner, Stepper, SummaryRow, useStepTitles, type StepInfo } from '@/admin/components/offers/EditorParts';
import { ActionMenu, OfferStatusPill, StaffAvatar, contentLines, periodLines, ruleLines, useOT, type MenuItem } from '@/admin/components/offers/ui';

export default function OfferEdit() {
  const { id = 'novi' } = useParams();
  const exists = useDb((s) => s.offers.some((o) => o.id === id));
  if (id !== 'novi' && !exists) return <NotFound />;
  return <Editor key={id} id={id} />;
}

function NotFound() {
  const t = useOT();
  const ta = useDict(adm, 'admin');
  return (
    <div>
      <PageHeader back="/admin/ponude" breadcrumbs={[ta('nav_growth'), { label: ta('nav_offers'), to: '/admin/ponude' }]} title={t('notFound')} />
      <Card>
        <EmptyState
          icon={<Megaphone className="h-6 w-6" />}
          title={t('notFound')}
          text={t('notFoundText')}
          action={
            <ButtonLink to="/admin/ponude" shape="rounded" size="sm" variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
              {t('backToList')}
            </ButtonLink>
          }
        />
      </Card>
    </div>
  );
}

/** What is persisted — the rule mode is UI only, the slot list is derived on save. */
const keyOf = (o: OfferX, linked: string[], created: Placement[]) =>
  JSON.stringify([{ ...o, placements: o.placements.includes('home-block') }, [...linked].sort(), created.map((c) => c.id)]);

function Editor({ id }: { id: string }) {
  const isNew = id === 'novi';
  const t = useOT();
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const role = useUi((s) => s.adminRole);
  const me = useCurrentStaff();
  const data = useOfferData();
  const check = useChecker(data);
  const act = useOfferActions();
  const upsert = useDb((s) => s.upsert);
  const logAudit = useDb((s) => s.logAudit);
  const stored = data.offers.find((o) => o.id === id);

  const canEdit = can('offers', 'edit');
  const canPublish = can('offers', 'publish');

  /* ----------------------------- state ----------------------------- */
  const [init] = useState(() => {
    const offer: OfferX = stored ? structuredClone(stored) : emptyOffer(me?.id ?? 'st-gent');
    if (!offer.markets) offer.markets = ['mk-me'];
    const linked = stored ? data.placements.filter((p) => p.offerId === stored.id).map((p) => p.id) : [];
    return { offer, linked, mode: (offer.discountId || isNew ? 'link' : 'none') as RuleMode };
  });
  const [base, setBase] = useState(init);
  const [draft, setDraft] = useState<OfferX>(init.offer);
  const [linkedIds, setLinkedIds] = useState<string[]>(init.linked);
  const [created, setCreated] = useState<Placement[]>([]);
  const [mode, setModeState] = useState<RuleMode>(init.mode);
  const [createdNote, setCreatedNote] = useState<string>();
  const [pub, setPub] = useState({ open: false, n: 0 });

  const set = (patch: Partial<OfferX>) => setDraft((d) => ({ ...d, ...patch }));
  const setMode = (m: RuleMode) => {
    setModeState(m);
    if (m !== 'link') set({ discountId: undefined });
  };
  const homeBlock = draft.placements.includes('home-block');
  const setHomeBlock = (v: boolean) => set({ placements: v ? [...draft.placements.filter((s) => s !== 'home-block'), 'home-block'] : draft.placements.filter((s) => s !== 'home-block') });

  const linked = useMemo(
    () => [...linkedIds.map((pid) => data.placements.find((p) => p.id === pid)).filter((p): p is Placement => !!p), ...created],
    [linkedIds, created, data.placements],
  );
  const createdIds = useMemo(() => new Set(created.map((c) => c.id)), [created]);
  const dirty = keyOf(draft, linkedIds, created) !== keyOf(base.offer, base.linked, []);

  const savedState = stored ? offerState(stored) : 'draft';
  const state = offerState(draft);
  const discount = mode === 'link' && draft.discountId ? data.discountById.get(draft.discountId) : undefined;
  const { list: participating } = useMemo(() => offerProducts(draft, data.products, data.collections), [draft, data.products, data.collections]);
  const source = sourceOf(draft, discount);
  const checks = useMemo(() => check(draft, { linked, mode, homeBlock }), [check, draft, linked, mode, homeBlock]);
  const stats = checkStats(checks);
  const slugTaken = !!draft.slug && data.offers.some((o) => o.id !== draft.id && o.slug === draft.slug);
  const owner = data.staff.find((s) => s.id === draft.owner);
  const future = new Date(draft.startsAt).getTime() > Date.now();

  /* ----------------------------- steps ----------------------------- */
  const [params, setParams] = useSearchParams();
  const defaultStep: Step = isNew || savedState === 'draft' ? 1 : savedState === 'scheduled' ? 2 : 3;
  const raw = Number(params.get('hapi'));
  const step = (raw === 1 || raw === 2 || raw === 3 ? raw : defaultStep) as Step;
  const goStep = (s: Step, anchor?: string) => {
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set('hapi', String(s));
        return n;
      },
      { replace: true },
    );
    window.setTimeout(() => {
      const el = anchor ? document.getElementById(anchor) : null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };
  const onFix = (f: FixTarget) => {
    if (f === 'sync') {
      if (discount) set({ startsAt: discount.startsAt, endsAt: discount.endsAt });
      return;
    }
    const where: Record<Exclude<FixTarget, 'sync'>, [Step, string]> = {
      basics: [1, 'of-basics'],
      period: [1, 'of-period'],
      rule: [1, 'of-rule'],
      products: [1, 'of-products'],
      landing: [2, 'of-landing'],
      placements: [2, 'of-placements'],
      badge: [2, 'of-badge'],
    };
    goStep(...where[f]);
  };

  /* ----------------------------- save ------------------------------ */
  const save = (patch: Partial<OfferX> = {}, quiet = false): OfferX | null => {
    if (!canEdit) return null;
    const next: OfferX = { ...draft, ...patch, slug: slugify(draft.slug) };
    if (!LANG_CODES.some((lg) => next.name[lg]?.trim())) {
      toast.error(t('ck_nameMissing'));
      goStep(1, 'of-basics');
      return null;
    }
    if (!next.slug || data.offers.some((o) => o.id !== next.id && o.slug === next.slug)) {
      toast.error(t('err_slug'));
      goStep(1, 'of-basics');
      return null;
    }
    if (next.endsAt && new Date(next.endsAt).getTime() <= new Date(next.startsAt).getTime()) {
      toast.error(t('f_endBeforeStart'));
      goStep(1, 'of-period');
      return null;
    }
    if (mode !== 'link' || !next.discountId) delete next.discountId;
    next.placements = slotsFor(linked, homeBlock);
    upsert('offers', next);
    // linked content: link / unlink existing placements, create the new ones
    const s = useDb.getState();
    for (const p of s.placements) {
      const want = linkedIds.includes(p.id);
      if (want && p.offerId !== next.id) upsert('placements', { ...p, offerId: next.id });
      else if (!want && p.offerId === next.id) {
        const copy = { ...p };
        delete copy.offerId;
        upsert('placements', copy);
      }
    }
    for (const c of created) upsert('placements', { ...c, offerId: next.id, cta: { ...c.cta, href: `/oferta/${next.slug}` } });
    const ids = [...linkedIds, ...created.map((c) => c.id)];
    setLinkedIds(ids);
    setCreated([]);
    setCreatedNote(undefined);
    setDraft(next);
    setBase({ offer: next, linked: ids, mode });
    if (!quiet) toast.success(isNew ? t('createdToast') : t('saved'), { description: l(next.name) });
    if (isNew) navigate(`/admin/ponude/${next.id}?hapi=${step}`, { replace: true });
    return next;
  };
  const discard = () => {
    setDraft(base.offer);
    setLinkedIds(base.linked);
    setCreated([]);
    setCreatedNote(undefined);
    setModeState(base.mode);
  };

  /* --------------------------- lifecycle --------------------------- */
  const changeStatus = (status: OfferStatus) => {
    const next = save({ status }, true);
    if (!next) return;
    logAudit({ action: status === 'active' ? 'publish' : status === 'draft' ? 'unpublish' : 'status', object: 'offer', objectId: next.id, detail: `${next.name.sq || next.name.me} → ${status}` });
    toast.success(status === 'paused' ? t('toast_paused') : status === 'draft' ? t('toast_draft') : t('toast_resumed'), { description: l(next.name) });
  };

  const publish = (o: PublishOptions) => {
    const next = save({ status: 'active' }, true);
    setPub((p) => ({ ...p, open: false }));
    if (!next) return;
    const s = useDb.getState();
    if (o.rule && next.discountId) {
      const d = s.discounts.find((x) => x.id === next.discountId);
      if (d && d.status !== 'active') upsert('discounts', { ...d, status: 'active' });
    }
    if (o.content) for (const p of s.placements) if (p.offerId === next.id && p.status === 'draft') upsert('placements', { ...p, status: 'active' });
    logAudit({ action: 'publish', object: 'offer', objectId: next.id, detail: next.name.sq || next.name.me });
    const later = new Date(next.startsAt).getTime() > Date.now();
    toast.success(later ? t('scheduledToast', { d: fullDate(next.startsAt, lang) }) : t('published'), { description: l(next.name) });
    if (!isNew) goStep(later ? 2 : 3);
  };

  const endNow = (o: { content: boolean; rule: boolean }) => {
    const next = save({ status: 'active', endsAt: new Date().toISOString() }, true);
    if (!next) return;
    const s = useDb.getState();
    if (o.content) for (const p of s.placements) if (p.offerId === next.id && p.status === 'active') upsert('placements', { ...p, status: 'draft' });
    if (o.rule && next.discountId) {
      const d = s.discounts.find((x) => x.id === next.discountId);
      if (d && d.status === 'active') upsert('discounts', { ...d, status: 'paused' });
    }
    logAudit({ action: 'archive', object: 'offer', objectId: next.id, detail: next.name.sq || next.name.me });
    toast.success(t('ended'), { description: l(next.name) });
  };

  /* ---------------------------- content ---------------------------- */
  const onCreate = (kind: PlacementKind) => {
    const liveNow = savedState === 'active';
    const pos = KIND_POSITION[kind];
    const order = Math.max(0, ...data.placements.filter((p) => p.position === pos).map((p) => p.order), ...created.filter((p) => p.position === pos).map((p) => p.order)) + 1;
    setCreated((c) => [...c, placementFromOffer(draft, kind, order, liveNow ? 'draft' : 'active')]);
    setCreatedNote(liveNow ? `${t('createdFromOffer')} ${t('createdAsDraft')}` : t('createdFromOffer'));
  };
  const onLink = (pid: string) => setLinkedIds((ids) => (ids.includes(pid) ? ids : [...ids, pid]));
  const onUnlink = (pid: string) => {
    if (createdIds.has(pid)) setCreated((c) => c.filter((x) => x.id !== pid));
    else setLinkedIds((ids) => ids.filter((x) => x !== pid));
  };

  /* ---------------------------- actions ---------------------------- */
  const openPublish = () => setPub((p) => ({ open: true, n: p.n + 1 }));
  const roleName = l(ROLE_META[role].name);
  const isDraftLike = isNew || savedState === 'draft';

  const PublishButton = ({ full }: { full?: boolean }) =>
    isDraftLike ? (
      canPublish ? (
        <Button shape="rounded" size="sm" className={cn(full && 'w-full')} icon={future ? <CalendarCheck2 className="h-4 w-4" /> : <Rocket className="h-4 w-4" />} onClick={openPublish}>
          {future ? t('schedule') : t('publish')}
        </Button>
      ) : (
        <span title={t('noPublishPerm')} className={cn('inline-flex', full && 'w-full')}>
          <Button shape="rounded" size="sm" disabled className={cn(full && 'w-full')} icon={<Rocket className="h-4 w-4" />}>
            {future ? t('schedule') : t('publish')}
          </Button>
        </span>
      )
    ) : savedState === 'paused' ? (
      <Button shape="rounded" size="sm" className={cn(full && 'w-full')} disabled={!canPublish} title={canPublish ? undefined : t('noPublishPerm')} icon={<Play className="h-4 w-4" />} onClick={() => changeStatus('active')}>
        {t('a_resume')}
      </Button>
    ) : savedState === 'expired' ? (
      canEdit && (
        <Button shape="rounded" size="sm" className={cn(full && 'w-full')} icon={<Copy className="h-4 w-4" />} onClick={() => navigate(`/admin/ponude/${act.duplicate(stored!)}`)}>
          {ta('duplicate')}
        </Button>
      )
    ) : (
      <Button shape="rounded" size="sm" variant="outline" className={cn(full && 'w-full')} disabled={!canPublish} title={canPublish ? undefined : t('noPublishPerm')} icon={<Pause className="h-4 w-4" />} onClick={() => changeStatus('paused')}>
        {t('a_pause')}
      </Button>
    );

  const menu: MenuItem[] = [];
  if (stored) {
    if (canEdit) menu.push({ label: ta('duplicate'), icon: Copy, onSelect: () => navigate(`/admin/ponude/${act.duplicate(stored)}`) });
    if (savedState === 'scheduled' || savedState === 'paused') menu.push({ label: t('a_unpublish'), icon: RotateCcw, disabled: !canPublish, reason: t('noPublishPerm'), onSelect: () => changeStatus('draft') });
    if (savedState === 'active' || savedState === 'paused') menu.push({ label: t('a_end'), icon: Flag, disabled: !can('offers', 'archive'), reason: t('noPerm'), onSelect: () => goStep(3, 'of-end') });
    if (can('offers', 'delete'))
      menu.push({
        label: ta('delete'),
        icon: Trash2,
        danger: true,
        divider: true,
        onSelect: async () => {
          if (await act.del(stored)) navigate('/admin/ponude');
        },
      });
  }

  const titles = useStepTitles();
  const prepTodo = checks.filter((c) => c.level === 'fail' && ['basics', 'period', 'rule', 'products'].includes(c.fix ?? '')).length + (draft.markets?.length ? 0 : 1);
  const stepInfo: StepInfo[] = [
    { ...titles[0], status: prepTodo ? t('stepTodo', { n: prepTodo }) : t('stepDone'), tone: prepTodo ? 'todo' : 'done' },
    isDraftLike
      ? { ...titles[1], status: stats.fail ? t('checksErrors', { n: stats.fail }) : t('checksSummary', { ok: stats.ok, total: stats.total }), tone: stats.fail ? 'error' : stats.warn ? 'todo' : 'done' }
      : { ...titles[1], status: savedState === 'expired' ? t('stepEnded') : t('stepPublished'), tone: 'done' },
    {
      ...titles[2],
      status: savedState === 'expired' ? t('stepEnded') : savedState === 'active' || savedState === 'paused' ? t('stepLive') : t('stepWaiting'),
      tone: savedState === 'expired' ? 'done' : savedState === 'active' || savedState === 'paused' ? 'live' : 'muted',
    },
  ];

  const name = l(draft.name) || (isNew ? t('newTitle') : t('unnamed'));
  const rl = ruleLines(discount, t, lang);
  const cl = contentLines(linked, homeBlock, !!(draft.landing.title.me || draft.landing.title.sq || draft.landing.title.en), t);
  const pl = periodLines(draft, state, t, lang);
  const marketNames = data.settings.markets.filter((m) => draft.markets?.includes(m.id)).map((m) => l(m.name));
  const StatIcon = stats.fail ? XCircle : stats.warn ? AlertTriangle : CheckCircle2;

  const publishBar: ReactNode = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-[13px] text-ink-soft">
        {isDraftLike ? (
          !canPublish ? (
            <span className="inline-flex items-start gap-2">
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11.5px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-600/25">{t('waitsApproval')}</span>
              {t('approvalNote', { role: roleName })}
            </span>
          ) : stats.fail ? (
            <span className="font-medium text-red-800">{t('pubBlocked', { n: stats.fail })}</span>
          ) : (
            <span>{future ? t('pubAt', { d: fullDate(draft.startsAt, lang) }) : t('pubNow')}</span>
          )
        ) : (
          <span className="inline-flex items-center gap-2">
            <OfferStatusPill state={savedState} size="sm" />
            {pl.sub}
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <PublishButton />
      </div>
    </div>
  );

  return (
    <div className="pb-28">
      <PageHeader
        back="/admin/ponude"
        breadcrumbs={[ta('nav_growth'), { label: ta('nav_offers'), to: '/admin/ponude' }, isNew ? t('newTitle') : name]}
        title={name}
        badge={<OfferStatusPill state={isNew ? 'draft' : state} />}
        actions={
          <>
            {stored && (
              <a
                href={href(`/oferta/${stored.slug}${savedState === 'active' ? '' : '?preview=1'}`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3.5 text-[13px] font-semibold text-ink transition hover:border-ink/35"
              >
                <ExternalLink className="h-4 w-4" />
                {t('viewPage')}
              </a>
            )}
            {menu.length > 0 && <ActionMenu items={menu} label={t('more')} trigger="button" />}
            <PublishButton />
          </>
        }
      />

      {savedState === 'expired' && stored?.endsAt && <EndedBanner text={t('endedOn', { d: fullDate(stored.endsAt, lang) })} />}

      <Stepper step={step} onStep={(s) => goStep(s)} steps={stepInfo} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <fieldset disabled={!canEdit} className="min-w-0 space-y-5">
          {step === 1 && <PrepareStep draft={draft} set={set} mode={mode} setMode={setMode} data={data} isNew={isNew} slugTaken={slugTaken} />}
          {step === 2 && (
            <PresentStep
              draft={draft}
              set={set}
              data={data}
              mode={mode}
              discount={discount}
              participating={participating}
              linked={linked}
              createdIds={createdIds}
              homeBlock={homeBlock}
              onHomeBlock={setHomeBlock}
              onCreate={onCreate}
              onLink={onLink}
              onUnlink={onUnlink}
              createdNote={createdNote}
              savedSlug={stored?.slug ?? null}
              live={savedState === 'active'}
              dirty={dirty}
              checks={checks}
              onFix={onFix}
              publishBar={publishBar}
            />
          )}
          {step === 3 && (
            <div id="of-end-wrap">
              <MeasureStep
                offer={stored ? { ...stored, utm: draft.utm } : draft}
                state={savedState}
                discount={discount}
                data={data}
                linked={linked}
                onUtm={(utm) => set({ utm })}
                onEnd={endNow}
                canEnd={can('offers', 'archive')}
                canExport={can('offers', 'export')}
                canPauseRule={can('discounts', 'publish')}
              />
              <div id="of-end" className="scroll-mt-32" />
            </div>
          )}

          {/* step navigation */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {step > 1 ? (
              <Button variant="outline" shape="rounded" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => goStep((step - 1) as Step)}>
                {t('prev')}: {titles[step - 2].title}
              </Button>
            ) : (
              <span />
            )}
            {step < 3 && (
              <Button variant="dark" shape="rounded" size="sm" iconRight={<ArrowRight className="h-4 w-4" />} onClick={() => goStep((step + 1) as Step)}>
                {t('next')}: {titles[step].title}
              </Button>
            )}
          </div>
        </fieldset>

        {/* summary (p.27 style) */}
        <aside className="min-w-0 space-y-5 xl:sticky xl:top-[76px] xl:self-start">
          <Card title={t('summary')} bodyClassName="py-1!">
            <div className="flex items-center gap-3 border-b border-line/70 py-3">
              <Thumb src={draft.image} className="h-12 w-12" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-ink">{name}</div>
                <div className="truncate font-mono text-[12px] text-muted">/oferta/{draft.slug || '…'}</div>
              </div>
            </div>
            <dl className="divide-y divide-line/60">
              <SummaryRow label={t('s_period')}>
                <span className="block">{pl.head}</span>
                {pl.sub && <span className="block text-[12px] font-normal text-muted">{pl.sub}</span>}
              </SummaryRow>
              <SummaryRow label={t('s_rule')}>
                {mode === 'link' && !discount ? (
                  <span className="text-red-700">{t('ck_ruleMissing')}</span>
                ) : (
                  <>
                    <span className="block">{rl.head}</span>
                    <span className="block text-[12px] font-normal text-muted">{rl.sub}</span>
                  </>
                )}
              </SummaryRow>
              <SummaryRow label={t('s_products')}>{source === 'all' && !participating.length ? t('src_all') : t(participating.length === 1 ? 'nProduct_one' : 'nProduct_many', { n: participating.length })}</SummaryRow>
              <SummaryRow label={t('s_content')}>
                <span className="block">{cl.head}</span>
                {cl.sub && <span className="block text-[12px] font-normal text-muted">{cl.sub}</span>}
              </SummaryRow>
              <SummaryRow label={t('s_owner')}>
                <span className="inline-flex items-center gap-1.5">
                  <StaffAvatar staff={owner} size="sm" />
                  {owner?.name ?? '—'}
                </span>
              </SummaryRow>
              <SummaryRow label={t('s_markets')}>{marketNames.join(', ') || '—'}</SummaryRow>
              <SummaryRow label={t('s_checks')}>
                <button type="button" onClick={() => goStep(2, 'of-checks')} className={cn('inline-flex items-center gap-1 hover:underline', stats.fail ? 'text-red-700' : stats.warn ? 'text-amber-800' : 'text-emerald-800')}>
                  <StatIcon className="h-3.5 w-3.5" />
                  {t('checksSummary', { ok: stats.ok, total: stats.total })}
                </button>
              </SummaryRow>
            </dl>
            <div className="space-y-2 border-t border-line/70 py-3">
              <PublishButton full />
              {isDraftLike && !canPublish && <p className="text-[12.5px] leading-snug text-muted">{t('approvalNote', { role: roleName })}</p>}
            </div>
          </Card>
        </aside>
      </div>

      <PublishModal
        key={pub.n}
        open={pub.open}
        onClose={() => setPub((p) => ({ ...p, open: false }))}
        offer={draft}
        discount={discount}
        linked={linked}
        checks={checks}
        canPublishRule={can('discounts', 'publish')}
        onConfirm={publish}
      />

      {canEdit && <SaveBar dirty={dirty || (isNew && keyOf(draft, linkedIds, created) !== keyOf(base.offer, base.linked, []))} onSave={() => save()} onDiscard={discard} />}
    </div>
  );
}
