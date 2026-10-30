// Online Store → Slideshow & bannerë (PDF p.34): tabs Slide / Bannerë / Announcement bar, filters
// Pozicioni · Gjuha · Statusi, table Përmbajtja · Lidhja · Orari · Statusi, ordering per position.
import { Fragment, useMemo, useState, type DragEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowDown, ArrowUp, Copy, ExternalLink, GalleryHorizontalEnd, GripVertical, Info, Megaphone, Pencil, Plus, Rocket, Trash2, TriangleAlert, Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select, Switch } from '@/components/ui/Field';
import { Badge, EmptyState, Tabs, plain } from '@/components/ui/misc';
import { Card, PageHeader, Table, Td, Th, Thumb, confirmDialog } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { LANGS, lt, useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useSettings } from '@/store/hooks';
import { placementState } from '@/lib/offers';
import { href } from '@/lib/paths';
import type { Lang, Offer, Placement, PlacementKind, PlacementPosition, PlacementState } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { SD, SL } from '@/admin/components/store/i18n';
import { ChipSelect, RowMenu, Segmented, StatePill, Tip, type MenuAction } from '@/admin/components/store/parts';
import { KIND_POSITIONS, KINDS, POSITION_PATH, commitOrder, linkOf, missingIn, rangeLabel, scheduleOf, type LinkCtx } from '@/admin/components/store/placements';
import { readTheme, themePatch, type SlideLayout } from '@/admin/components/store/theme';

type StatusF = 'all' | PlacementState;
const STATES: PlacementState[] = ['active', 'scheduled', 'draft', 'expired', 'paused'];
const ADD_KEY = { slide: 'add_slide', banner: 'add_banner', announcement: 'add_announcement' } as const;

interface Row {
  p: Placement;
  offer: Offer | null;
  state: PlacementState;
  link: { type: string; label: string };
  schedule: string | null;
  inherited: boolean;
  missing: boolean;
}

export default function Slides() {
  const ta = useDict(adm, 'admin');
  const t = useDict(SL, 'admin');
  const ts = useDict(SD, 'admin');
  const adminLang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const canEdit = can('onlineStore', 'edit');
  const canPublish = can('onlineStore', 'publish');
  const canDelete = can('onlineStore', 'delete');

  const placements = useDb((s) => s.placements);
  const offers = useDb((s) => s.offers);
  const collections = useDb((s) => s.collections);
  const categories = useDb((s) => s.categories);
  const products = useDb((s) => s.products);
  const pages = useDb((s) => s.pages);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);

  /* ---------------- filters in the URL (kept when coming back from the editor) ---------------- */
  const [params, setParams] = useSearchParams();
  const kind = (KINDS.includes(params.get('lloji') as PlacementKind) ? params.get('lloji') : 'slide') as PlacementKind;
  const positions = KIND_POSITIONS[kind];
  const posParam = params.get('pozicioni') as PlacementPosition | null;
  const position: PlacementPosition | 'all' = posParam && positions.includes(posParam) ? posParam : positions.length === 1 ? positions[0] : 'all';
  const lang = (LANGS.some((x) => x.code === params.get('gjuha')) ? params.get('gjuha') : adminLang) as Lang;
  const status = (STATES.includes(params.get('statusi') as PlacementState) ? params.get('statusi') : 'all') as StatusF;
  const setParam = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '' || v === 'all') n.delete(k);
          else n.set(k, v);
        }
        return n;
      },
      { replace: true },
    );

  /* ---------------- rows ---------------- */
  const ctx: LinkCtx = useMemo(() => ({ offers, collections, categories, products, pages }), [offers, collections, categories, products, pages]);
  const offerById = useMemo(() => new Map(offers.map((o) => [o.id, o])), [offers]);
  const all = useMemo(() => {
    const now = Date.now();
    return placements.map<Row>((p) => {
      const offer = p.offerId ? offerById.get(p.offerId) ?? null : null;
      const sc = scheduleOf(p, offer);
      return {
        p,
        offer,
        state: placementState(p, now, offer),
        link: linkOf(p, ctx, lang),
        schedule: rangeLabel(sc.start, sc.end, lang, { from: ts('fromWord'), until: ts('untilWord') }, now),
        inherited: sc.inherited,
        missing: missingIn(p, lang),
      };
    });
  }, [placements, offerById, ctx, lang, ts]);

  const kindCounts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, placements.filter((p) => p.kind === k).length])) as Record<PlacementKind, number>, [placements]);
  const ofKind = useMemo(() => all.filter((r) => r.p.kind === kind && (position === 'all' || r.p.position === position)), [all, kind, position]);
  const stateCounts = useMemo(() => {
    const c: Record<string, number> = { all: ofKind.length };
    for (const r of ofKind) c[r.state] = (c[r.state] ?? 0) + 1;
    return c;
  }, [ofKind]);
  const groups = useMemo(
    () =>
      (position === 'all' ? positions : [position]).map((pos) => {
        const full = ofKind.filter((r) => r.p.position === pos).sort((a, b) => a.p.order - b.p.order);
        return { pos, full, rows: full.filter((r) => status === 'all' || r.state === status), live: full.filter((r) => r.state === 'active').length };
      }),
    [ofKind, position, positions, status],
  );
  const visible = groups.reduce((n, g) => n + g.rows.length, 0);
  const canReorder = canEdit && status === 'all';
  const filtersActive = status !== 'all' || (positions.length > 1 && position !== 'all');

  /* ---------------- ordering ---------------- */
  const [drag, setDrag] = useState<{ id: string; pos: PlacementPosition } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const reorder = (pos: PlacementPosition, ids: string[]) => {
    commitOrder(pos, ids, ts(`pos_${pos}`));
    toast.success(t('reordered'));
  };
  const step = (pos: PlacementPosition, id: string, dir: -1 | 1) => {
    const ids = groups.find((g) => g.pos === pos)!.full.map((r) => r.p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder(pos, ids);
  };
  const dropOn = (pos: PlacementPosition, targetId: string) => {
    if (!drag || drag.pos !== pos || drag.id === targetId) return;
    const ids = groups.find((g) => g.pos === pos)!.full.map((r) => r.p.id);
    const from = ids.indexOf(drag.id);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, drag.id);
    reorder(pos, ids);
  };
  const dragProps = (r: Row) =>
    canReorder
      ? {
          draggable: true,
          onDragStart: (e: DragEvent) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', r.p.id);
            setDrag({ id: r.p.id, pos: r.p.position });
          },
          onDragOver: (e: DragEvent) => {
            if (!drag || drag.pos !== r.p.position) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (over !== r.p.id) setOver(r.p.id);
          },
          onDrop: (e: DragEvent) => {
            e.preventDefault();
            dropOn(r.p.position, r.p.id);
            setDrag(null);
            setOver(null);
          },
          onDragEnd: () => {
            setDrag(null);
            setOver(null);
          },
        }
      : {};

  /* ---------------- actions ---------------- */
  const editUrl = (id: string) => `/admin/prodavnica/slajdovi/${id}`;
  const label = (p: Placement) => plain(lt(p.title, lang)) || p.name || ts('untitled');
  const setStatus = (p: Placement, active: boolean) => {
    upsert('placements', { ...p, status: active ? 'active' : 'draft' });
    toast.success(active ? t('nowActive', { name: label(p) }) : t('nowDraft', { name: label(p) }));
  };
  const duplicate = (p: Placement) => {
    const max = Math.max(0, ...placements.filter((x) => x.position === p.position).map((x) => x.order));
    const id = uid('pl');
    upsert('placements', { ...structuredClone(p), id, name: `${p.name || label(p)} ${ts('copySuffix')}`, status: 'draft', order: max + 1 });
    toast.success(ts('duplicated'), { action: { label: ts('edit'), onClick: () => navigate(editUrl(id)) } });
  };
  const del = async (p: Placement) => {
    if (!(await confirmDialog({ title: ts('deleteTitle', { name: label(p) }), text: ts('deleteText'), confirmLabel: ts('delete'), danger: true }))) return;
    remove('placements', p.id);
    toast.success(ts('deleted'), { description: label(p) });
  };
  const menuFor = (r: Row): MenuAction[] => [
    { label: ts('edit'), icon: Pencil, onSelect: () => navigate(editUrl(r.p.id)) },
    { label: ts('duplicate'), icon: Copy, onSelect: () => duplicate(r.p), disabledReason: canEdit ? undefined : ts('noPermEdit') },
    r.p.status === 'draft'
      ? { label: t('activate'), icon: Rocket, onSelect: () => setStatus(r.p, true), disabledReason: canPublish ? undefined : ts('noPermPublish') }
      : { label: t('toDraft'), icon: Undo2, onSelect: () => setStatus(r.p, false), disabledReason: canPublish ? undefined : ts('noPermPublish') },
    { label: ts('viewOnSite'), icon: ExternalLink, onSelect: () => window.open(href(POSITION_PATH[r.p.position]), '_blank', 'noopener') },
    { label: ts('delete'), icon: Trash2, onSelect: () => del(r.p), danger: true, divider: true, disabledReason: canDelete ? undefined : ts('noPermDelete') },
  ];
  const addNew = () => navigate(`/admin/prodavnica/slajdovi/novi?lloji=${kind}${position !== 'all' ? `&pozicioni=${position}` : ''}`);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  /* ---------------- render helpers ---------------- */
  const statusOptions: { id: StatusF; label: string }[] = [{ id: 'all', label: t('all') }, ...STATES.map((s) => ({ id: s, label: ts(`st_${s}`) }))];
  const LinkCell = ({ r }: { r: Row }) =>
    r.link.type === 'none' ? (
      <span className="text-muted">{ts('link_none')}</span>
    ) : (
      <span className="block min-w-0 truncate">
        <span className="text-muted">{ts(`link_${r.link.type}` as 'link_offer')} / </span>
        {r.offer ? (
          <Link to={`/admin/ponude/${r.offer.id}`} onClick={stop} className="font-medium text-ink hover:underline hover:underline-offset-2">
            {r.link.label}
          </Link>
        ) : (
          <span className={cn('font-medium text-ink', r.link.type === 'url' && 'font-mono text-[12.5px]')}>{r.link.label}</span>
        )}
      </span>
    );
  const ScheduleCell = ({ r }: { r: Row }) => (
    <div className="whitespace-nowrap">
      <div className={cn('tabular-nums', r.schedule ? 'text-ink' : 'text-muted')}>{r.schedule ?? ts('noEnd')}</div>
      {r.inherited && <div className="mt-0.5 text-[11.5px] text-muted">{ts('inherited')}</div>}
    </div>
  );
  const Media = ({ r, big }: { r: Row; big?: boolean }) =>
    r.p.kind === 'announcement' ? (
      <span className={cn('grid shrink-0 place-items-center rounded-md bg-ink text-white', big ? 'h-12 w-12' : 'h-10 w-10')}>
        <Megaphone className="h-4 w-4" />
      </span>
    ) : (
      <Thumb src={r.p.image} className={cn('rounded-md!', big ? 'h-12! w-[76px]!' : 'h-10! w-16!')} />
    );
  const Missing = ({ r }: { r: Row }) =>
    r.missing ? (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-600/20">
        <TriangleAlert className="h-3 w-3" /> {t('missingLang', { lang: lang === 'me' ? 'SR' : lang.toUpperCase() })}
      </span>
    ) : null;
  const OrderButtons = ({ r, i, n }: { r: Row; i: number; n: number }) =>
    canReorder ? (
      <span className="inline-flex">
        <button type="button" onClick={(e) => (stop(e), step(r.p.position, r.p.id, -1))} disabled={i === 0} className="grid h-8 w-7 place-items-center rounded-md text-muted transition hover:bg-ink/[0.06] hover:text-ink disabled:opacity-25" aria-label={t('moveUp')} title={t('moveUp')}>
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={(e) => (stop(e), step(r.p.position, r.p.id, 1))} disabled={i === n - 1} className="grid h-8 w-7 place-items-center rounded-md text-muted transition hover:bg-ink/[0.06] hover:text-ink disabled:opacity-25" aria-label={t('moveDown')} title={t('moveDown')}>
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </span>
    ) : null;

  const addLabel = t(ADD_KEY[kind]);
  const addButton = canEdit ? (
    <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addNew}>
      {addLabel}
    </Button>
  ) : (
    <Tip text={ts('noPermEdit')} side="bottom">
      <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} disabled>
        {addLabel}
      </Button>
    </Tip>
  );

  return (
    <div className="pb-24">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_onlineStore'), to: '/admin/prodavnica' }, ta('nav_slides')]}
        title={ta('nav_slides')}
        description={t('subtitle')}
        actions={addButton}
      />

      <Card padded={false}>
        <Tabs<PlacementKind>
          className="px-3 sm:px-4"
          value={kind}
          onChange={(k) => setParams((prev) => {
            const n = new URLSearchParams(prev);
            n.delete('pozicioni');
            n.delete('statusi');
            if (k === 'slide') n.delete('lloji');
            else n.set('lloji', k);
            return n;
          }, { replace: true })}
          tabs={KINDS.map((k) => ({
            id: k,
            label: ts(`kind_${k}`),
            badge: <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', kind === k ? 'bg-ink text-white' : 'bg-ink/[0.06] text-muted')}>{kindCounts[k]}</span>,
          }))}
        />

        {/* Filters (PDF p.34: "Pozicioni: Homepage / Kryesor · Gjuha: SQ · Statusi: Të gjitha") */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3 sm:px-5">
          <ChipSelect
            label={t('f_position')}
            display={position === 'all' ? t('all') : ts(`pos_${position}`)}
            value={position}
            active={positions.length > 1 && position !== 'all'}
            onChange={(e) => setParam({ pozicioni: e.target.value })}
            disabled={positions.length === 1}
          >
            {positions.length > 1 && <option value="all">{t('all')}</option>}
            {positions.map((p) => (
              <option key={p} value={p}>
                {ts(`pos_${p}`)}
              </option>
            ))}
          </ChipSelect>
          <ChipSelect label={t('f_lang')} display={lang === 'me' ? 'SR' : lang.toUpperCase()} value={lang} onChange={(e) => setParam({ gjuha: e.target.value === adminLang ? null : e.target.value })}>
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.short} — {l.label}
              </option>
            ))}
          </ChipSelect>
          <ChipSelect label={t('f_status')} display={statusOptions.find((o) => o.id === status)!.label} value={status} active={status !== 'all'} onChange={(e) => setParam({ statusi: e.target.value })}>
            {statusOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label} ({stateCounts[o.id] ?? 0})
              </option>
            ))}
          </ChipSelect>
          {filtersActive && (
            <button type="button" onClick={() => setParam({ pozicioni: null, statusi: null })} className="px-1 text-[13px] font-semibold text-muted hover:text-ink">
              {t('clearFilters')}
            </button>
          )}
        </div>

        {visible === 0 ? (
          <EmptyState
            icon={kind === 'announcement' ? <Megaphone className="h-6 w-6" /> : <GalleryHorizontalEnd className="h-6 w-6" />}
            title={t('emptyTitle')}
            text={t('emptyText')}
            action={
              filtersActive ? (
                <Button variant="outline" shape="rounded" size="sm" onClick={() => setParam({ pozicioni: null, statusi: null })}>
                  {t('clearFilters')}
                </Button>
              ) : (
                canEdit && (
                  <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addNew}>
                    {addLabel}
                  </Button>
                )
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t('col_content')}</Th>
                  <Th>{t('col_link')}</Th>
                  <Th>{t('col_schedule')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th className="w-[104px]" />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <Fragment key={g.pos}>
                    {(groups.length > 1 || g.live === 0) && (
                      <tr>
                        <td colSpan={5} className="border-b border-line/70 bg-canvas/40 px-5 py-2">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                            {groups.length > 1 && <span className="font-semibold text-ink">{ts(`pos_${g.pos}`)}</span>}
                            {groups.length > 1 && <span className="text-muted">{t('liveN', { n: g.live })} · {t('itemsN', { n: g.full.length })}</span>}
                            {g.live === 0 && (
                              <span className="inline-flex items-center gap-1.5 font-medium text-amber-900">
                                <TriangleAlert className="h-3.5 w-3.5" />
                                {kind === 'slide' ? t('noLive') : t('noLiveBanner', { pos: ts(`pos_${g.pos}`) })}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    {g.rows.map((r) => {
                      const i = g.full.indexOf(r);
                      return (
                        <tr
                          key={r.p.id}
                          {...dragProps(r)}
                          onClick={() => navigate(editUrl(r.p.id))}
                          className={cn('group cursor-pointer transition-colors hover:bg-canvas/70', drag?.id === r.p.id && 'opacity-40', over === r.p.id && drag?.id !== r.p.id && 'shadow-[inset_0_2px_0_var(--color-ink)]')}
                        >
                          <Td>
                            <div className="flex min-w-0 items-center gap-3">
                              {canReorder && (
                                <span className="-ml-2 cursor-grab text-ink/25 transition-colors group-hover:text-ink/60 active:cursor-grabbing" title={t('drag')} aria-hidden>
                                  <GripVertical className="h-4 w-4" />
                                </span>
                              )}
                              <span className="w-5 shrink-0 text-[12.5px] font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                              <Media r={r} />
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="truncate font-semibold text-ink">{plain(lt(r.p.title, lang)) || ts('untitled')}</span>
                                  <Missing r={r} />
                                </div>
                                <div className="mt-0.5 truncate text-[12px] text-muted">{r.p.name || '—'}</div>
                              </div>
                            </div>
                          </Td>
                          <Td className="max-w-[260px]">
                            <LinkCell r={r} />
                          </Td>
                          <Td>
                            <ScheduleCell r={r} />
                          </Td>
                          <Td>
                            <StatePill state={r.state} />
                          </Td>
                          <Td className="text-right" onClick={stop}>
                            <div className="flex items-center justify-end gap-0.5">
                              <OrderButtons r={r} i={i} n={g.full.length} />
                              <RowMenu items={menuFor(r)} label={t('moreActions')} />
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </Table>

            {/* Mobile cards */}
            <div className="md:hidden">
              {groups.map((g) => (
                <Fragment key={g.pos}>
                  {(groups.length > 1 || g.live === 0) && (
                    <div className="border-b border-line/70 bg-canvas/40 px-4 py-2 text-[12.5px]">
                      {groups.length > 1 && (
                        <div>
                          <span className="font-semibold text-ink">{ts(`pos_${g.pos}`)}</span> <span className="text-muted">· {t('liveN', { n: g.live })}</span>
                        </div>
                      )}
                      {g.live === 0 && (
                        <div className="mt-0.5 flex items-start gap-1.5 font-medium text-amber-900">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {kind === 'slide' ? t('noLive') : t('noLiveBanner', { pos: ts(`pos_${g.pos}`) })}
                        </div>
                      )}
                    </div>
                  )}
                  <ul className="divide-y divide-line/70 border-b border-line/70">
                    {g.rows.map((r) => {
                      const i = g.full.indexOf(r);
                      return (
                        <li key={r.p.id} onClick={() => navigate(editUrl(r.p.id))} className="flex cursor-pointer gap-3 px-4 py-3.5 active:bg-canvas">
                          <div className="flex flex-col items-center gap-1.5">
                            <Media r={r} big />
                            <span className="text-[11.5px] font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, '0')}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink">{plain(lt(r.p.title, lang)) || ts('untitled')}</div>
                                <div className="mt-0.5 truncate text-[12px] text-muted">{r.p.name}</div>
                              </div>
                              <div className="-mr-1.5 -mt-1 flex items-center" onClick={stop}>
                                <RowMenu items={menuFor(r)} label={t('moreActions')} />
                              </div>
                            </div>
                            <div className="mt-1.5 text-[12.5px]">
                              <LinkCell r={r} />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatePill state={r.state} />
                                <span className="text-[12.5px] tabular-nums text-muted">
                                  {r.schedule ?? ts('noEnd')}
                                  {r.inherited && ` · ${ts('inherited')}`}
                                </span>
                                <Missing r={r} />
                              </div>
                              <div onClick={stop}>
                                <OrderButtons r={r} i={i} n={g.full.length} />
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Fragment>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 text-[12.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> {t('footnote')}
              </span>
              {canEdit && <span>{canReorder ? t('reorderHint') : t('reorderOff')}</span>}
            </div>
          </>
        )}
      </Card>

      {kind === 'slide' && <SlideshowSettings disabled={!canEdit} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slideshow behaviour (PDF p.31): layout, autoplay, interval, controls */
/* ------------------------------------------------------------------ */
function SlideshowSettings({ disabled }: { disabled: boolean }) {
  const t = useDict(SL, 'admin');
  const ts = useDict(SD, 'admin');
  const settings = useSettings();
  const updateSettings = useDb((s) => s.updateSettings);
  const theme = readTheme(settings);
  const ss = theme.slideshow;
  const set = (patch: Partial<typeof ss>) => {
    updateSettings(themePatch({ ...theme, slideshow: { ...ss, ...patch } }));
    toast.success(t('ss_saved'));
  };
  return (
    <Card className="mt-5" title={t('ss_title')} description={t('ss_desc')} actions={disabled ? <Badge tone="gray">{ts('noPermEdit')}</Badge> : undefined}>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sm:col-span-2">
          <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{t('ss_layout')}</div>
          <Segmented<SlideLayout>
            className="w-full"
            label={t('ss_layout')}
            value={ss.layout}
            disabled={disabled}
            onChange={(v) => set({ layout: v })}
            options={[
              { id: 'full', label: t('layout_full') },
              { id: 'inset', label: t('layout_inset') },
              { id: 'layered', label: t('layout_layered') },
            ]}
          />
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{t('ss_interval')}</div>
          <Select value={String(ss.interval)} disabled={disabled || !ss.autoplay} onChange={(e) => set({ interval: Number(e.target.value) })} className="h-9! rounded-lg! text-[14px]!" aria-label={t('ss_interval')}>
            {[5, 7, 9, 12].map((n) => (
              <option key={n} value={n}>
                {t('ss_seconds', { n })}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col justify-end gap-2.5">
          <Switch size="sm" checked={ss.autoplay} disabled={disabled} onChange={(v) => set({ autoplay: v })} label={<span className="text-[13px]">{t('ss_autoplay')}</span>} />
          <Switch size="sm" checked={ss.controls} disabled={disabled} onChange={(v) => set({ controls: v })} label={<span className="text-[13px]">{t('ss_controls')}</span>} />
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-[12.5px] text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('ss_motion')}
      </p>
    </Card>
  );
}
