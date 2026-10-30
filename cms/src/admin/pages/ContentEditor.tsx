// Online Store / Editori / Homepage — section editor with draft, preview, publish and version history
// (CMS proposal pp.32–33). Every edit goes to `homeDraft` (debounced); "Publiko" makes it live.
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, CloudCheck, Copy, Eye, EyeOff, History, Loader2,
  Lock, Megaphone, PanelBottom, PanelTop, PencilLine, Plus, Trash2, Undo2, Upload,
} from 'lucide-react';
import type { HomeSection, HomeSectionType } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { PageHeader, confirmDialog } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { timeAgo, dateTime } from '@/lib/format';
import { href } from '@/lib/paths';
import { cn } from '@/lib/utils';
import { B, type BKey } from '@/admin/components/builder/i18n';
import { ICON_TILE, SECTION_META } from '@/admin/components/builder/meta';
import { ChangeTag, FixedRow, SectionList } from '@/admin/components/builder/SectionList';
import { SectionForm, type ChangeOpts } from '@/admin/components/builder/SectionForm';
import { IconBtn } from '@/admin/components/builder/fields';
import { Preview, type Device } from '@/admin/components/builder/Preview';
import { AddSectionModal } from '@/admin/components/builder/AddSectionModal';
import { VersionsDrawer } from '@/admin/components/builder/VersionsDrawer';
import { FixedPanel, isFixedId, useBarMessages, type FixedId } from '@/admin/components/builder/FixedPanels';
import { SCHEMA, canAdd, cloneSection, createSection } from '@/admin/components/builder/catalog';
import { issueCounts, validateSection, type Issue } from '@/admin/components/builder/validate';
import { changedCount, diffVersions, jsonById, rowChange } from '@/admin/components/builder/diff';

const DEBOUNCE_MS = 300;

const FIXED_META: Record<FixedId, { icon: typeof PanelTop; label: BKey }> = {
  __header: { icon: PanelTop, label: 'fixedHeader' },
  __bar: { icon: Megaphone, label: 'fixedBar' },
  __footer: { icon: PanelBottom, label: 'fixedFooter' },
};

export default function ContentEditor() {
  const t = useDict(B, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const canEdit = can('onlineStore', 'edit');
  const canPublish = can('onlineStore', 'publish');

  const live = useDb((s) => s.home);
  const stored = useDb((s) => s.homeDraft);
  const history = useDb((s) => s.homeHistory);
  const staff = useDb((s) => s.staff);
  const products = useDb((s) => s.products);
  const publishHome = useDb((s) => s.publishHome);
  const discardHomeDraft = useDb((s) => s.discardHomeDraft);
  const restoreHomeVersion = useDb((s) => s.restoreHomeVersion);
  const bar = useBarMessages();

  /** Edits not yet written to the store (debounce window) */
  const [local, setLocal] = useState<HomeSection[] | null>(null);
  const sections = local ?? stored ?? live;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Row highlighted in the list (the one last opened) — also the insert point for new sections */
  const [lastId, setLastId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [device, setDevice] = useState<Device>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'desktop'));
  const [tab, setTab] = useState<'editor' | 'preview'>('editor');
  const [addOpen, setAddOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  const pending = useRef<HomeSection[] | null>(null);
  const timer = useRef<number | undefined>(undefined);

  /* ---------------- debounced draft writes ---------------- */
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    const st = useDb.getState();
    // A draft identical to the live page is no draft at all
    if (JSON.stringify(next) === JSON.stringify(st.home)) {
      if (st.homeDraft) st.discardHomeDraft();
    } else {
      st.saveHomeDraft(next);
    }
    setLocal(null);
    setSaving(false);
    setSavedAt(Date.now());
  }, []);

  // Never lose the last keystrokes when leaving the page or closing the tab
  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  const dropPending = () => {
    window.clearTimeout(timer.current);
    pending.current = null;
    setLocal(null);
    setSaving(false);
  };

  /** Latest sections, including edits still waiting for the debounce. */
  const latest = () => pending.current ?? useDb.getState().homeDraft ?? useDb.getState().home;

  const commit = (next: HomeSection[], opts?: { now?: boolean; reload?: boolean }) => {
    if (!canEdit) return;
    pending.current = next;
    setLocal(next);
    setSaving(true);
    window.clearTimeout(timer.current);
    if (opts?.now || opts?.reload) {
      flush();
      if (opts.reload) setReloadTick((n) => n + 1);
    } else {
      timer.current = window.setTimeout(flush, DEBOUNCE_MS);
    }
  };

  /* ---------------- derived ---------------- */
  const liveJson = useMemo(() => JSON.stringify(live), [live]);
  const liveById = useMemo(() => jsonById(live), [live]);
  const hasChanges = useMemo(() => JSON.stringify(sections) !== liveJson, [sections, liveJson]);
  const diff = useMemo(() => diffVersions(sections, live), [sections, live]);
  const nChanged = useMemo(() => changedCount(sections, live), [sections, live]);
  const activeIds = useMemo(() => new Set(products.filter((p) => p.status === 'active').map((p) => p.id)), [products]);
  const issues = useMemo(() => new Map(sections.map((s) => [s.id, validateSection(s, { activeProductIds: activeIds })])), [sections, activeIds]);
  const totals = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    const blocking: string[] = [];
    for (const s of sections) {
      const c = issueCounts(issues.get(s.id));
      warnings += c.warnings;
      if (s.enabled) errors += c.errors;
      if (s.enabled && c.errors) blocking.push(s.id);
    }
    return { errors, warnings, blocking };
  }, [sections, issues]);
  const enabledCount = sections.filter((s) => s.enabled).length;
  const activeBar = bar.filter((b) => b.state === 'active').length;
  const staffName = useCallback((id: string) => staff.find((m) => m.id === id)?.name ?? (id === 'web' ? 'Web' : 'Admin'), [staff]);

  const fixed = isFixedId(selectedId) ? selectedId : null;
  const current = selectedId && !fixed ? sections.find((s) => s.id === selectedId) : undefined;
  const index = current ? sections.findIndex((s) => s.id === current.id) : -1;
  const view: 'list' | 'section' | 'fixed' = current ? 'section' : fixed ? 'fixed' : 'list';
  const anchor = current ?? (lastId && !isFixedId(lastId) ? sections.find((s) => s.id === lastId) : undefined);

  /* ---------------- selection ---------------- */
  const focusOn = useCallback((id: string) => setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 })), []);

  const select = (id: string | null) => {
    flush();
    setSelectedId(id);
    if (id) {
      setLastId(id);
      focusOn(id);
    }
  };

  // Narrow screens: bring the editor card into view when switching between list and form
  useEffect(() => {
    const el = asideRef.current;
    if (!el || window.innerWidth >= 1280) return;
    const top = el.getBoundingClientRect().top;
    if (top < 56) window.scrollTo({ top: window.scrollY + top - 72, behavior: 'smooth' });
  }, [selectedId]);

  /* ---------------- section actions ---------------- */
  const editSection = (next: HomeSection, opts?: ChangeOpts) => commit(sections.map((h) => (h.id === next.id ? next : h)), { reload: opts?.reload });

  const toggle = (id: string, enabled: boolean) => {
    commit(sections.map((h) => (h.id === id ? { ...h, enabled } : h)), { now: true });
    if (enabled) focusOn(id);
  };

  const reorder = (next: HomeSection[], movedId: string) => {
    commit(next, { now: true });
    focusOn(movedId);
  };

  const insertAfter = (list: HomeSection[], s: HomeSection, afterId?: string) => {
    const i = afterId ? list.findIndex((x) => x.id === afterId) + 1 : list.length;
    const at = i > 0 ? i : list.length;
    return [...list.slice(0, at), s, ...list.slice(at)];
  };

  const addSection = (type: HomeSectionType) => {
    if (!canAdd(sections, type)) return;
    const s = createSection(type);
    commit(insertAfter(sections, s, anchor?.id), { now: true });
    setAddOpen(false);
    setSelectedId(s.id);
    setLastId(s.id);
    focusOn(s.id);
    setTab('editor');
    toast.success(t('added', { name: t(`type_${type}`) }));
  };

  const duplicate = (s: HomeSection) => {
    if (!canAdd(sections, s.type)) {
      toast.error(t('limitReached', { max: SCHEMA[s.type].max }));
      return;
    }
    const c = cloneSection(s);
    commit(insertAfter(sections, c, s.id), { now: true });
    setSelectedId(c.id);
    setLastId(c.id);
    focusOn(c.id);
    toast.success(t('duplicated'));
  };

  const remove = async (s: HomeSection) => {
    const ok = await confirmDialog({ title: t('deleteTitle', { name: t(`type_${s.type}`) }), text: t('deleteText'), confirmLabel: t('deleteConfirm'), danger: true });
    if (!ok) return;
    const list = latest();
    const i = list.findIndex((x) => x.id === s.id);
    commit(list.filter((x) => x.id !== s.id), { now: true });
    setSelectedId(null);
    setLastId(list[i - 1]?.id ?? null);
    toast(t('deleted'));
  };

  /** Put a section that exists live (but was removed in the draft) back near its live position. */
  const restoreRemoved = (s: HomeSection) => {
    const after = live.slice(live.findIndex((x) => x.id === s.id) + 1).map((x) => x.id);
    let i = sections.findIndex((x) => after.includes(x.id));
    if (i < 0) i = sections.length;
    commit([...sections.slice(0, i), structuredClone(s), ...sections.slice(i)], { now: true });
    setLastId(s.id);
    if (s.enabled) focusOn(s.id);
  };

  /* ---------------- draft actions ---------------- */
  const publish = () => {
    if (!canPublish) return;
    flush();
    const draft = useDb.getState().homeDraft;
    if (!draft) {
      toast(t('nothingToPublish'));
      return;
    }
    const blocking = draft.filter((s) => s.enabled && validateSection(s, { activeProductIds: activeIds }).some((i) => i.level === 'error'));
    if (blocking.length) {
      const n = blocking.reduce((sum, s) => sum + issueCounts(validateSection(s, { activeProductIds: activeIds })).errors, 0);
      toast.error(t('publishBlocked', { n }), { description: t('publishBlockedText') });
      setTab('editor');
      select(blocking[0].id);
      return;
    }
    if (publishHome()) {
      setSavedAt(null);
      toast.success(t('published'), {
        description: t('publishedText'),
        action: { label: t('viewSiteLive'), onClick: () => window.open(href('/'), '_blank', 'noopener') },
      });
    }
  };

  const discard = async () => {
    const ok = await confirmDialog({ title: t('discardTitle'), text: t('discardText'), confirmLabel: t('discardShort'), danger: true });
    if (!ok) return;
    dropPending();
    discardHomeDraft();
    setSavedAt(null);
    const home = useDb.getState().home;
    if (selectedId && !isFixedId(selectedId) && !home.some((s) => s.id === selectedId)) setSelectedId(null);
    if (lastId && !isFixedId(lastId) && !home.some((s) => s.id === lastId)) setLastId(null);
    setReloadTick((n) => n + 1);
    toast(t('discarded'));
  };

  const restore = async (i: number, label: string) => {
    if (hasChanges) {
      const ok = await confirmDialog({ title: t('verRestoreTitle', { v: label }), text: t('verRestoreText'), confirmLabel: t('verRestore'), danger: false });
      if (!ok) return;
    }
    dropPending();
    restoreHomeVersion(i);
    setVersionsOpen(false);
    setSavedAt(Date.now());
    const draft = useDb.getState().homeDraft ?? [];
    if (selectedId && !isFixedId(selectedId) && !draft.some((s) => s.id === selectedId)) setSelectedId(null);
    setReloadTick((n) => n + 1);
    toast.success(t('verRestored', { v: label }));
  };

  const switchTab = (next: 'editor' | 'preview') => {
    flush();
    setTab(next);
    if (next === 'preview' && selectedId) focusOn(selectedId);
  };

  /* ---------------- render ---------------- */
  const publishTitle = !canPublish ? t('noPublishPerm') : !hasChanges ? t('noChangesHint') : undefined;

  return (
    <div className="flex flex-col xl:-mb-10 xl:h-[calc(100dvh-6.5rem)] xl:min-h-[720px]">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_onlineStore'), to: '/admin/prodavnica' }, ta('nav_editor'), t('crumbHome')]}
        title={
          <>
            {t('crumbHome')} <span className="font-normal text-ink/25">/</span> {hasChanges ? t('titleDraft') : t('titleLive')}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" shape="rounded" icon={<History className="h-4 w-4" />} onClick={() => setVersionsOpen(true)} aria-label={t('versions')} title={t('versions')}>
              <span className="hidden sm:inline">{t('versions')}</span>
              <span className="rounded bg-ink/[0.07] px-1.5 text-[11px] tabular-nums text-ink-soft">{history.length + 1}</span>
            </Button>
            {canEdit && hasChanges && (
              <Button variant="outline" size="sm" shape="rounded" icon={<Undo2 className="h-4 w-4" />} onClick={discard} aria-label={t('discardDraft')} title={t('discardDraft')}>
                <span className="hidden sm:inline">{t('discardDraft')}</span>
              </Button>
            )}
            <span title={publishTitle} className="inline-flex">
              <Button size="sm" shape="rounded" icon={<Upload className="h-4 w-4" />} disabled={!canPublish || !hasChanges} onClick={publish} className="min-w-[120px]">
                {t('publish')}
              </Button>
            </span>
          </>
        }
      />

      {/* Draft status line — text + symbol */}
      <div role="status" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-line/80 bg-white px-4 py-2.5 text-[13px] shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        {hasChanges ? (
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <span className="grid h-4 w-4 place-items-center">
              <span className="h-2 w-2 rounded-full bg-amber-500 ring-[3px] ring-amber-500/20" />
            </span>
            {t('stDraft')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 font-semibold text-ink">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {t('stLive')}
          </span>
        )}
        {hasChanges && (nChanged > 0 || diff.reordered) && (
          <span className="text-ink-soft">{[nChanged > 0 && t('stChanges', { n: nChanged }), diff.reordered && t('verReordered')].filter(Boolean).join(' · ')}</span>
        )}
        {totals.errors > 0 && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
            <AlertCircle className="h-4 w-4" /> {t('stErrors', { n: totals.errors })}
          </span>
        )}
        {totals.warnings > 0 && (
          <span className="inline-flex items-center gap-1.5 text-amber-700">
            <AlertTriangle className="h-4 w-4" /> {t('stWarnings', { n: totals.warnings })}
          </span>
        )}
        {!canEdit && (
          <span className="inline-flex items-center gap-1.5 text-ink-soft">
            <Lock className="h-3.5 w-3.5" /> {t('readOnly')}
          </span>
        )}
        {hasChanges && !canPublish && canEdit && (
          <span className="inline-flex items-center gap-1.5 text-ink-soft" title={t('noPublishPerm')}>
            <Lock className="h-3.5 w-3.5" /> {t('awaitingApproval')}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted sm:ml-auto">
          <AutosaveStatus saving={saving} savedAt={savedAt} />
          {history[0] && <span title={dateTime(history[0].at, lang)}>{t('stLastPublished', { when: timeAgo(history[0].at, lang), who: staffName(history[0].by) })}</span>}
        </span>
      </div>


      {/* Narrow screens: editor / preview tabs */}
      <div className="mb-4 grid grid-cols-2 rounded-xl bg-white p-1 ring-1 ring-line xl:hidden" role="tablist">
        {(['editor', 'preview'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => switchTab(k)}
            className={cn('inline-flex h-9 items-center justify-center gap-2 rounded-lg text-[13.5px] font-semibold transition-colors', tab === k ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:text-ink')}
          >
            {k === 'editor' ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {k === 'editor' ? t('tabEditor') : t('tabPreview')}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-4 xl:flex-1 xl:grid-cols-[400px_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] 2xl:grid-cols-[420px_minmax(0,1fr)]">
        {/* Left card: "Seksionet" */}
        <aside ref={asideRef} className={cn('min-h-0 flex-col overflow-clip rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] xl:flex', tab === 'editor' ? 'flex' : 'hidden')}>
          <AnimatePresence mode="wait" initial={false}>
            {view === 'list' ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex items-center justify-between gap-3 border-b border-line/70 px-4 py-3.5">
                  <h2 className="text-[14.5px] font-semibold text-ink">{t('sections')}</h2>
                  <span className="text-[12.5px] tabular-nums text-muted">{t('enabledCount', { n: enabledCount, total: sections.length })}</span>
                </div>
                <div className="min-h-0 flex-1 p-2 xl:overflow-y-auto">
                  <FixedRow icon={PanelTop} label={t('fixedHeader')} summary={t('fixedHint')} selected={lastId === '__header'} onClick={() => select('__header')} />
                  <FixedRow icon={Megaphone} label={t('fixedBar')} summary={`${t('barSummary', { n: activeBar })} · ${ta('nav_slides')}`} selected={lastId === '__bar'} onClick={() => select('__bar')} />

                  <div className="mx-2 mb-1 mt-3 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                    <span>{t('templateLabel')}</span>
                    <span className="h-px flex-1 bg-line/80" />
                  </div>
                  <SectionList
                    sections={sections}
                    live={liveById}
                    issues={issues}
                    selectedId={lastId}
                    readOnly={!canEdit}
                    onSelect={select}
                    onToggle={toggle}
                    onReorder={reorder}
                  />

                  {diff.removed.length > 0 && (
                    <div className="mx-1 mt-2 rounded-lg border border-dashed border-line px-3 py-2.5">
                      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{t('removedNote')}</div>
                      {diff.removed.map((s) => (
                        <div key={s.id} className="mt-1.5 flex items-center gap-2 text-[13px]">
                          <span className="w-3 text-center text-muted" aria-hidden>
                            −
                          </span>
                          <span className="min-w-0 flex-1 truncate text-ink-soft line-through decoration-ink/30">{t(`type_${s.type}`)}</span>
                          {canEdit && canAdd(sections, s.type) && (
                            <button type="button" onClick={() => restoreRemoved(s)} className="shrink-0 rounded-md px-2 py-0.5 text-[12px] font-semibold text-ink ring-1 ring-line transition hover:bg-ink/[0.04]">
                              {t('restoreSection')}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mx-2 mb-1 mt-3 h-px bg-line/80" />
                  <FixedRow icon={PanelBottom} label={t('fixedFooter')} summary={t('fixedHint')} selected={lastId === '__footer'} onClick={() => select('__footer')} />
                </div>
                <div className="border-t border-line/70 p-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setAddOpen(true)}
                    className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-[13.5px] font-semibold text-ink transition hover:bg-ink/[0.045] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" /> {t('addSection')}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`edit-${selectedId}`}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 14 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="flex min-h-0 flex-1 flex-col"
              >
                {current ? (
                  <>
                    <DetailHeader
                      icon={SECTION_META[current.type].icon}
                      name={t(`type_${current.type}`)}
                      crumb={`${t('sections')} · ${index + 1}/${sections.length}`}
                      tag={rowChange(current, liveById)}
                      dimmed={!current.enabled}
                      onBack={() => select(null)}
                      nav={
                        <>
                          <IconBtn label={t('prevSection')} onClick={() => index > 0 && select(sections[index - 1].id)} disabled={index <= 0} className="h-8 w-7">
                            <ChevronLeft className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label={t('nextSection')} onClick={() => index < sections.length - 1 && select(sections[index + 1].id)} disabled={index >= sections.length - 1} className="h-8 w-7">
                            <ChevronRight className="h-4 w-4" />
                          </IconBtn>
                        </>
                      }
                      actions={
                        canEdit && (
                          <>
                            <IconBtn label={current.enabled ? t('hide') : t('show')} onClick={() => toggle(current.id, !current.enabled)} className="h-8 w-8">
                              {current.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                            </IconBtn>
                            <IconBtn label={canAdd(sections, current.type) ? t('duplicate') : t('limitReached', { max: SCHEMA[current.type].max })} onClick={() => duplicate(current)} disabled={!canAdd(sections, current.type)} className="h-8 w-8">
                              <Copy className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn label={t('deleteSection')} onClick={() => void remove(current)} danger className="h-8 w-8">
                              <Trash2 className="h-4 w-4" />
                            </IconBtn>
                          </>
                        )
                      }
                    />
                    <AnimatePresence initial={false}>
                      {!current.enabled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex items-center gap-2.5 border-b border-line/70 bg-[#F6F6F6] px-4 py-2.5 text-[12.5px] text-ink-soft">
                            <EyeOff className="h-4 w-4 shrink-0" />
                            <span className="flex-1">{t('hiddenNote')}</span>
                            {canEdit && (
                              <button type="button" onClick={() => toggle(current.id, true)} className="shrink-0 rounded-md bg-white px-2.5 py-1 text-[12px] font-semibold text-ink ring-1 ring-line hover:bg-ink/[0.03]">
                                {t('showIt')}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="min-h-0 flex-1 px-4 pb-8 pt-4 sm:px-5 xl:overflow-y-auto">
                      <IssuesBox issues={issues.get(current.id) ?? []} hidden={!current.enabled} />
                      <fieldset disabled={!canEdit} className="m-0 min-w-0 border-0 p-0">
                        <SectionForm key={current.id} section={current} onChange={editSection} />
                      </fieldset>
                    </div>
                  </>
                ) : (
                  fixed && (
                    <>
                      <DetailHeader icon={FIXED_META[fixed].icon} name={t(FIXED_META[fixed].label)} crumb={t('sections')} fixed onBack={() => select(null)} />
                      <div className="min-h-0 flex-1 px-4 pb-8 pt-5 sm:px-5 xl:overflow-y-auto">
                        <FixedPanel id={fixed} />
                      </div>
                    </>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Right card: "Parapamje / Desktop" — the draft */}
        <Preview
          device={device}
          onDevice={(d) => {
            setDevice(d);
            if (selectedId) focusOn(selectedId);
          }}
          focus={focus}
          reloadTick={reloadTick}
          draft={hasChanges}
          className={cn('h-[calc(100dvh-13rem)] min-h-[520px] xl:flex xl:h-auto xl:min-h-0', tab === 'preview' ? 'flex' : 'hidden')}
        />
      </div>

      <AddSectionModal open={addOpen} onClose={() => setAddOpen(false)} sections={sections} afterName={anchor ? t(`type_${anchor.type}`) : null} onAdd={addSection} />
      <VersionsDrawer
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        live={live}
        history={history}
        draft={hasChanges ? sections : null}
        canRestore={canEdit}
        staffName={staffName}
        onRestore={(i, label) => void restore(i, label)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
function DetailHeader({
  icon: Icon,
  name,
  crumb,
  tag,
  dimmed,
  fixed,
  onBack,
  nav,
  actions,
}: {
  icon: ComponentType<{ className?: string }>;
  name: string;
  crumb: string;
  tag?: 'new' | 'changed' | null;
  dimmed?: boolean;
  fixed?: boolean;
  onBack: () => void;
  nav?: ReactNode;
  actions?: ReactNode;
}) {
  const t = useDict(B, 'admin');
  return (
    <div className="sticky top-14 z-10 border-b border-line/70 bg-white/95 backdrop-blur xl:static">
      {/* Row 1: back to the list + previous / next section */}
      <div className="flex items-center gap-1 px-2 pt-2 sm:px-2.5">
        <button
          type="button"
          onClick={onBack}
          title={t('allSections')}
          className="inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-ink/[0.05] hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{crumb}</span>
        </button>
        <span className="ml-auto flex shrink-0 items-center">{nav}</span>
      </div>
      {/* Row 2: section name + actions */}
      <div className="flex items-center gap-2.5 px-3 pb-3 pt-1 sm:px-4">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset', ICON_TILE, dimmed && 'opacity-45')}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={cn('truncate text-[16px] font-semibold leading-tight', dimmed ? 'text-ink/55' : 'text-ink')}>{name}</span>
          {tag && <ChangeTag kind={tag} />}
          {fixed && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted" title={t('fixedHint')}>
              <Lock className="h-2.5 w-2.5" /> {t('fixedTag')}
            </span>
          )}
        </div>
        {actions && <span className="flex shrink-0 items-center gap-0.5">{actions}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/** Validation result for the open section (schema + rules from validate.ts). */
function IssuesBox({ issues, hidden }: { issues: Issue[]; hidden: boolean }) {
  const t = useDict(B, 'admin');
  if (!issues.length) {
    return (
      <p className="mb-6 flex items-center gap-2 text-[12.5px] text-ink-soft">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {t('checkOk')}
      </p>
    );
  }
  const msg = (i: Issue) => {
    const list = i.vars?.list;
    return t(i.key, list ? { ...i.vars, list: t(list as BKey) } : i.vars);
  };
  const sorted = [...issues].sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1));
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-line/70 bg-[#F7F7F7] px-3.5 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('checkTitle')}</span>
      </div>
      <ul className="divide-y divide-line/60">
        {sorted.map((i, k) => (
          <li key={k} className="flex items-start gap-2.5 px-3.5 py-2 text-[12.5px] leading-snug">
            {i.level === 'error' ? <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-600" /> : <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-amber-600" />}
            <span className={i.level === 'error' ? 'text-ink' : 'text-ink-soft'}>{msg(i)}</span>
          </li>
        ))}
      </ul>
      {hidden && issues.some((i) => i.level === 'error') && <p className="border-t border-line/60 px-3.5 py-2 text-[12px] text-muted">{t('v_hiddenNote')}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function AutosaveStatus({ saving, savedAt }: { saving: boolean; savedAt: number | null }) {
  const t = useDict(B, 'admin');
  const lang = useLang('admin');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (savedAt) setNow(Date.now());
  }, [savedAt]);

  if (!saving && !savedAt) return null;
  let rel = '';
  if (savedAt) {
    const s = Math.max(0, Math.round((now - savedAt) / 1000));
    rel = s < 5 ? t('relNow') : s < 60 ? t('relSec', { n: s }) : s < 3600 ? t('relMin', { n: Math.floor(s / 60) }) : timeAgo(new Date(savedAt).toISOString(), lang);
  }
  return (
    <span className="inline-flex items-center gap-1.5" aria-live="polite">
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CloudCheck className="h-3.5 w-3.5" />}
      <span className="text-ink-soft">{saving ? t('savingNow') : t('autosaved')}</span>
      {savedAt && !saving && <span>· {rel}</span>}
    </span>
  );
}
