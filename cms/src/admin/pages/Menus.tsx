// Content / Menus (PDF p.36 "Menu dhe media: menu kryesore, footer dhe llogari klienti. Lidhje te faqe, produkt,
// koleksion, ofertë ose URL; renditje dhe nënmenu"). Edits stay local until "Ruaj" (or Ctrl/⌘ S); the storefront
// header (desktop, mega menu, mobile) and footer read the saved menus.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ExternalLink, GripVertical, ListTree, Lock, PanelBottom, PanelTop, Plus, UserRound } from 'lucide-react';
import { PageHeader, Card, SaveBar, confirmDialog } from '@/admin/components/kit';
import { Notice } from '@/admin/components/editorial/ui';
import { useSaveKeyLabel, useSaveShortcut, useUnsavedGuard } from '@/admin/components/editorial/hooks';
import { LinkEditor, type EditCtx } from '@/admin/components/menus/LinkEditor';
import { MenuTree } from '@/admin/components/menus/MenuTree';
import { MenuPreview } from '@/admin/components/menus/MenuPreview';
import { mn } from '@/admin/components/menus/dict';
import { liveTree } from '@/admin/components/menus/links';
import { addItem, countItems, locate, menuErrors, removeItem, updateItem } from '@/admin/components/menus/tree';
import { useLinkSources } from '@/admin/components/menus/useNav';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { emptyL10n, useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { Menu, MenuItem } from '@/lib/types';
import { href } from '@/lib/paths';
import { cn, uid } from '@/lib/utils';

const ORDER: Record<string, number> = { main: 0, footer: 1 };

interface EditorState {
  open: boolean;
  session: number;
  menuId: string;
  parentId: string | null;
  ctx: EditCtx | null;
}

export default function Menus() {
  const t = useDict(mn, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const can = useCan();
  const keyLabel = useSaveKeyLabel();
  const menus = useDb((s) => s.menus);
  const upsert = useDb((s) => s.upsert);
  const src = useLinkSources();
  const [params, setParams] = useSearchParams();

  // Menu changes go live immediately → edit + publish rights (PDF p.42).
  const canEdit = can('content', 'edit') && can('content', 'publish');
  const readOnly = !canEdit;

  const ordered = useMemo(() => [...menus].sort((a, b) => (ORDER[a.handle] ?? 9) - (ORDER[b.handle] ?? 9)), [menus]);
  const wanted = params.get('menu');
  const active = ordered.find((m) => m.id === wanted || m.handle === wanted) ?? ordered[0];

  /** Unsaved item lists per menu id */
  const [edits, setEdits] = useState<Record<string, MenuItem[]>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [editor, setEditor] = useState<EditorState>({ open: false, session: 0, menuId: '', parentId: null, ctx: null });

  const itemsOf = (m: Menu) => edits[m.id] ?? m.items;
  const dirtyIds = useMemo(
    () => Object.keys(edits).filter((id) => {
      const m = menus.find((x) => x.id === id);
      return !!m && JSON.stringify(m.items) !== JSON.stringify(edits[id]);
    }),
    [edits, menus],
  );
  const dirty = dirtyIds.length > 0 && !readOnly;
  useUnsavedGuard(dirty);

  const select = (m: Menu) => setParams(m.handle === 'main' ? {} : { menu: m.handle }, { replace: true });
  const setItems = (menuId: string, items: MenuItem[]) => setEdits((e) => ({ ...e, [menuId]: items }));

  const save = () => {
    if (!dirty) return;
    const bad = dirtyIds.find((id) => menuErrors(edits[id]).size > 0);
    if (bad) {
      setShowErrors(true);
      const m = menus.find((x) => x.id === bad);
      if (m && m.id !== active?.id) select(m);
      toast.error(t('saveErrors'));
      return;
    }
    for (const id of dirtyIds) {
      const m = menus.find((x) => x.id === id);
      if (m) upsert('menus', { ...m, items: edits[id] });
    }
    setEdits({});
    setShowErrors(false);
    toast.success(t('saved'));
  };
  useSaveShortcut(save);

  const discard = () => {
    setEdits({});
    setShowErrors(false);
  };

  if (!active) {
    return (
      <div>
        <PageHeader breadcrumbs={[ta('nav_content'), ta('nav_menus')]} title={ta('nav_menus')} description={t('description')} />
        <Card>
          <EmptyState icon={<ListTree className="h-6 w-6" />} title={t('noMenu')} />
        </Card>
      </div>
    );
  }

  const items = itemsOf(active);
  const errors = showErrors ? menuErrors(items) : new Map();
  const menuName = (m: Menu) => (m.handle === 'main' ? t('main') : m.handle === 'footer' ? t('footer') : m.title);
  const menuWhere = (m: Menu) => (m.handle === 'main' ? t('mainWhere') : t('footerWhere'));

  /* ---- link editor ---- */
  const openEdit = (id: string) => {
    const loc = locate(items, id);
    if (!loc) return;
    const parent = loc.parentId ? items.find((x) => x.id === loc.parentId) : undefined;
    setEditor((s) => ({ open: true, session: s.session + 1, menuId: active.id, parentId: loc.parentId, ctx: { item: loc.item, isNew: false, parent: parent?.label, childCount: loc.item.children?.length ?? 0 } }));
  };
  const openNew = (parentId: string | null) => {
    if (readOnly) return;
    const parent = parentId ? items.find((x) => x.id === parentId) : undefined;
    // New sub-links default to the type their siblings use (e.g. categories under "Proizvodi").
    const type = parent?.children?.at(-1)?.type ?? 'page';
    const item: MenuItem = { id: uid('mi'), label: emptyL10n(), type, target: '' };
    setEditor((s) => ({ open: true, session: s.session + 1, menuId: active.id, parentId, ctx: { item, isNew: true, parent: parent?.label, childCount: 0 } }));
  };
  const closeEditor = () => setEditor((s) => ({ ...s, open: false }));
  const applyEdit = (item: MenuItem) => {
    const menu = menus.find((m) => m.id === editor.menuId);
    if (!menu || !editor.ctx) return;
    const cur = itemsOf(menu);
    const next = editor.ctx.isNew ? addItem(cur, item, editor.parentId) : updateItem(cur, item.id, { label: item.label, type: item.type, target: item.target });
    setItems(menu.id, next);
    closeEditor();
  };
  const removeLink = async (id: string, menuId = active.id) => {
    const menu = menus.find((m) => m.id === menuId);
    if (!menu) return;
    const cur = itemsOf(menu);
    const loc = locate(cur, id);
    if (!loc) return;
    const kids = loc.item.children?.length ?? 0;
    const ok = await confirmDialog({
      title: t('removeTitle', { name: l(loc.item.label) || t('newLink') }),
      text: kids ? `${t('removeText')} ${t('removeTextKids', { n: kids })}` : t('removeText'),
      confirmLabel: ta('remove'),
      danger: true,
    });
    if (!ok) return;
    setItems(menu.id, removeItem(cur, id));
    if (editor.open && editor.ctx?.item.id === id) closeEditor();
  };

  return (
    <div className="pb-24">
      <PageHeader
        breadcrumbs={[ta('nav_content'), ta('nav_menus')]}
        title={ta('nav_menus')}
        description={t('description')}
        actions={
          <>
            <a href={href('/')} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'outline', size: 'sm', shape: 'rounded' })}>
              <ExternalLink className="h-3.5 w-3.5" /> {t('viewOnSite')}
            </a>
            {canEdit && (
              <Button size="sm" shape="rounded" onClick={save} disabled={!dirty}>
                {ta('save')}
                <kbd className="ml-1 hidden rounded bg-white/15 px-1.5 py-px font-sans text-[10.5px] font-semibold tracking-wide text-white/85 sm:inline">{keyLabel}</kbd>
              </Button>
            )}
          </>
        }
      />

      {readOnly && (
        <Notice icon={Lock} className="mb-5">
          {t('readOnlyMenus')}
        </Notice>
      )}

      {/* Menu picker (PDF: main, footer, customer account) */}
      <div role="tablist" aria-label={t('menus')} className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
        {ordered.map((m) => {
          const on = m.id === active.id;
          const list = itemsOf(m);
          const visible = liveTree(list, src).reduce((n, x) => n + 1 + x.children.length, 0);
          const total = countItems(list);
          const Icon = m.handle === 'main' ? PanelTop : PanelBottom;
          const unsaved = dirtyIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => select(m)}
              className={cn(
                'flex min-w-0 items-start gap-3 rounded-xl border bg-white p-3 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all sm:p-4',
                on ? 'border-ink ring-1 ring-ink' : 'border-line/80 hover:border-ink/30',
              )}
            >
              <span className={cn('hidden h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset transition-colors sm:grid', on ? 'bg-ink text-white ring-ink' : 'bg-canvas text-ink-soft ring-line')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-ink">{menuName(m)}</span>
                  {unsaved && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      {t('unsavedHere')}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 hidden truncate text-[12.5px] text-muted sm:block">{menuWhere(m)}</span>
                <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 font-semibold text-ink-soft">{t('links', { n: total })}</span>
                  {total > visible && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800 ring-1 ring-inset ring-amber-700/15">{t('hiddenCount', { n: total - visible })}</span>}
                </span>
              </span>
            </button>
          );
        })}
        <div aria-disabled className="hidden items-start gap-3 rounded-xl border border-dashed border-line bg-white/50 p-4 lg:flex" title={t('accountWhere')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-canvas text-muted ring-1 ring-inset ring-line">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-ink-soft">{t('account')}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t('accountWhere')}</span>
            <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-ink/[0.05] px-1.5 py-0.5 text-[12px] font-semibold text-muted">
              <Lock className="h-3 w-3" /> {t('off')}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Card
          padded={false}
          className="overflow-hidden"
          title={
            <span className="flex items-center gap-2">
              {menuName(active)}
              <code className="rounded bg-ink/[0.05] px-1.5 py-px font-mono text-[11.5px] font-medium text-muted">{active.handle}</code>
            </span>
          }
          description={menuWhere(active)}
          actions={
            canEdit && (
              <Button size="sm" variant="outline" shape="rounded" icon={<Plus className="h-4 w-4" />} onClick={() => openNew(null)}>
                {t('addLink')}
              </Button>
            )
          }
        >
          {items.length === 0 ? (
            <EmptyState
              icon={<ListTree className="h-6 w-6" />}
              title={t('emptyMenu')}
              text={`${t('emptyMenuText')} ${t('fallbackNote')}`}
              action={
                canEdit ? (
                  <Button size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />} onClick={() => openNew(null)}>
                    {t('addLink')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="p-1.5 sm:p-2">
              <MenuTree
                items={items}
                src={src}
                errors={errors}
                readOnly={readOnly}
                onChange={(next) => setItems(active.id, next)}
                onEdit={openEdit}
                onAddChild={openNew}
                onDelete={(id) => removeLink(id)}
              />
            </div>
          )}
          {!readOnly && items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line/70 bg-canvas/40 px-5 py-2.5 text-[12px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5" /> {t('dragHint')}
              </span>
              <span className="hidden sm:inline">{t('keyboardHint')}</span>
            </div>
          )}
        </Card>

        <div className="min-w-0 xl:sticky xl:top-[72px]">
          <MenuPreview handle={active.handle} items={items} src={src} />
        </div>
      </div>

      <LinkEditor
        key={editor.session}
        open={editor.open}
        ctx={editor.ctx}
        src={src}
        readOnly={readOnly}
        onClose={closeEditor}
        onApply={applyEdit}
        onDelete={(id) => removeLink(id, editor.menuId)}
      />

      {!readOnly && <SaveBar dirty={dirty} onSave={save} onDiscard={discard} />}
    </div>
  );
}
