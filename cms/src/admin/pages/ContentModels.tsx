// Content / Models (PDF p.36 "Modele dhe fusha"): reusable structured content — FAQ, services, projects,
// locations. The model definition (fields: text, number, choice, image, link, date, boolean, reference +
// validation, translation, draft/active, public permission) is edited here; the entries stay in the module
// that owns them ("Shiko regjistrimet"). Functional modules such as appointments keep their own logic.
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, Boxes, Braces, CalendarClock, ChevronRight, CircleCheck, CircleDashed, Eye, Lock, Rows3 } from 'lucide-react';
import { PageHeader, Card, confirmDialog } from '@/admin/components/kit';
import { Notice, StateChip } from '@/admin/components/editorial/ui';
import { md } from '@/admin/components/models/dict';
import { FieldEditor } from '@/admin/components/models/FieldEditor';
import { ModelDrawer } from '@/admin/components/models/ModelDrawer';
import { EDITORS, DESCRIPTION_KEY, FIELD_ICON, entriesOf, modelIcon, modelPublic, modelStatus, usedOptions, withRules, type FieldX, type ModelX } from '@/admin/components/models/model';
import { EmptyState } from '@/components/ui/misc';
import { emptyL10n, useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan, useSettings } from '@/store/hooks';
import type { ContentFieldType } from '@/lib/types';
import { cn } from '@/lib/utils';

const COLS = 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_96px_minmax(0,1fr)_96px_20px]';

interface FieldEditState {
  open: boolean;
  session: number;
  modelId: string;
  field: FieldX | null;
  /** key before editing (null = new field) */
  originalKey: string | null;
}

export default function ContentModels() {
  const t = useDict(md, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const can = useCan();
  const canEdit = can('content', 'edit');
  const canPublish = can('content', 'publish');
  const models = useDb((s) => s.contentModels) as ModelX[];
  const projects = useDb((s) => s.projects);
  const home = useDb((s) => s.home);
  const settings = useSettings();
  const upsert = useDb((s) => s.upsert);
  const [params, setParams] = useSearchParams();

  const openId = params.get('model');
  // Keep the last model mounted while the drawer animates out.
  const [shownId, setShownId] = useState(openId);
  if (openId && openId !== shownId) setShownId(openId);
  const stored = models.find((m) => m.id === (openId ?? shownId));
  // Effective rules for display (theme defaults; choice options from the entries when none are stored).
  const current = useMemo<ModelX | undefined>(
    () =>
      stored && {
        ...stored,
        fields: stored.fields.map((f) => {
          const r = withRules(stored, f);
          return r.type === 'choice' && !r.options?.length ? { ...r, options: usedOptions(stored, r.key, { projects }) } : r;
        }),
      },
    [stored, projects],
  );

  const entries = useMemo(() => new Map(models.map((m) => [m.id, entriesOf(m, { projects, home, settings })])), [models, projects, home, settings]);
  const projectCount = entries.get(models.find((m) => m.source === 'projects')?.id ?? '')?.count ?? projects.length;

  const [fe, setFe] = useState<FieldEditState>({ open: false, session: 0, modelId: '', field: null, originalKey: null });
  const feModel = models.find((m) => m.id === fe.modelId);

  const openModel = (id: string) => setParams({ model: id }, { replace: false });
  const closeModel = () => setParams({}, { replace: false });

  const openField = (model: ModelX, key?: string) => {
    const f = key ? model.fields.find((x) => x.key === key) : undefined;
    const field: FieldX = f ? f : { key: '', label: emptyL10n(), type: 'text' as ContentFieldType, required: false, translatable: true, custom: true };
    setFe((s) => ({ open: true, session: s.session + 1, modelId: model.id, field, originalKey: f ? f.key : null }));
  };
  const closeField = () => setFe((s) => ({ ...s, open: false }));

  const saveField = (f: FieldX) => {
    if (!feModel || !canEdit) return;
    const isNew = fe.originalKey === null;
    const fields = isNew ? [...feModel.fields, { ...f, custom: true }] : feModel.fields.map((x) => (x.key === fe.originalKey ? f : x));
    upsert('contentModels', { ...feModel, fields });
    toast.success(isNew ? t('fieldAdded') : t('fieldSaved'), { description: `${l(feModel.name)} · ${f.key}` });
    closeField();
  };

  const deleteField = async (key: string) => {
    if (!feModel) return;
    const f = feModel.fields.find((x) => x.key === key);
    if (!f) return;
    const ok = await confirmDialog({ title: t('deleteFieldTitle', { name: l(f.label) || key }), text: t('deleteFieldText'), confirmLabel: ta('remove'), danger: true });
    if (!ok) return;
    upsert('contentModels', { ...feModel, fields: feModel.fields.filter((x) => x.key !== key) });
    toast.success(t('fieldDeleted'));
    closeField();
  };

  const patchModel = (m: ModelX, p: Partial<ModelX>) => {
    if (!canPublish) return;
    upsert('contentModels', { ...m, ...p });
    toast.success(t('modelSaved'), { description: l(m.name) });
  };

  return (
    <div>
      <PageHeader breadcrumbs={[ta('nav_content'), ta('nav_models')]} title={ta('nav_models')} description={t('description')} />

      {!canEdit && (
        <Notice icon={Eye} className="mb-5">
          {t('readOnly')}
        </Notice>
      )}

      {/* Definition vs entries vs functional modules (PDF p.36) */}
      <Card padded={false} className="mb-5 overflow-hidden">
        <div className="grid divide-y divide-line/70 md:grid-cols-3 md:divide-x md:divide-y-0">
          <Concept icon={Braces} title={t('c1Title')} text={t('c1Text')} />
          <Concept icon={Rows3} title={t('c2Title')} text={t('c2Text', { n: projectCount })} />
          <Concept icon={CalendarClock} title={t('c3Title')} text={t('c3Text')}>
            <Link to="/admin/termini/usluge" className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink underline-offset-2 hover:underline">
              {t('c3Link')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Concept>
        </div>
      </Card>

      <Card padded={false} className="overflow-hidden" title={t('definitions')} description={t('definitionsText')}>
        {models.length === 0 ? (
          <EmptyState icon={<Boxes className="h-6 w-6" />} title={t('empty')} />
        ) : (
          <>
            <div className={cn('hidden items-center gap-4 border-b border-line bg-canvas/60 px-5 py-2 text-[12.5px] font-semibold text-muted md:grid', COLS)}>
              <span>{t('colModel')}</span>
              <span>{t('colFields')}</span>
              <span>{t('colEntries')}</span>
              <span>{t('colEditor')}</span>
              <span>{t('colStatus')}</span>
              <span />
            </div>
            <ul className="divide-y divide-line/70">
              {models.map((m) => {
                const Icon = modelIcon(m.source);
                const editor = EDITORS[m.source];
                const count = entries.get(m.id)?.count ?? m.entries;
                const types = Array.from(new Set(m.fields.map((f) => f.type)));
                const active = modelStatus(m) === 'active';
                const descKey = DESCRIPTION_KEY[m.source] ?? 'md_custom';
                return (
                  <li
                    key={m.id}
                    onClick={() => openModel(m.id)}
                    className={cn('grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-canvas/60 sm:px-5', COLS)}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft ring-1 ring-inset ring-line">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-ink">{l(m.name)}</div>
                        <div className="truncate text-[12.5px] text-muted">{t(descKey)}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted md:hidden" />

                    <div className="col-span-2 flex min-w-0 items-center gap-2 pl-[52px] md:col-span-1 md:pl-0">
                      <span className="shrink-0 text-[13px] font-medium text-ink">{t('fieldsN', { n: m.fields.length })}</span>
                      <span className="flex min-w-0 flex-wrap gap-0.5">
                        {types.map((ty) => {
                          const TI = FIELD_ICON[ty];
                          return (
                            <span key={ty} title={t(`t_${ty}`)} className="grid h-6 w-6 place-items-center rounded-md bg-ink/[0.05] text-ink-soft">
                              <TI className="h-3.5 w-3.5" />
                            </span>
                          );
                        })}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-3 pl-[52px] text-[13px] md:col-span-1 md:block md:pl-0">
                      <span className="font-semibold tabular-nums text-ink">
                        {count}
                        <span className="ml-1 font-normal text-muted md:hidden">{t('colEntries').toLowerCase()}</span>
                      </span>
                      <span className="md:hidden">
                        <StateChip icon={active ? CircleCheck : CircleDashed} tone={active ? 'ok' : 'warn'}>
                          {active ? t('active') : t('draft')}
                        </StateChip>
                      </span>
                    </div>
                    <div className="col-span-2 pl-[52px] md:col-span-1 md:pl-0" onClick={(e) => e.stopPropagation()}>
                      {editor ? (
                        <Link
                          to={editor.to}
                          title={`${t('viewEntries')} · ${t(editor.label)}`}
                          aria-label={`${t('viewEntries')} · ${t(editor.label)}`}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium text-ink-soft ring-1 ring-inset ring-line transition hover:bg-white hover:text-ink"
                        >
                          <span className="truncate">
                            <span className="md:hidden">{t('viewEntries')} · </span>
                            {t(editor.label)}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                      ) : (
                        <span className="text-[13px] text-muted">—</span>
                      )}
                    </div>
                    <div className="hidden flex-col items-start gap-1 md:flex">
                      <StateChip icon={active ? CircleCheck : CircleDashed} tone={active ? 'ok' : 'warn'}>
                        {active ? t('active') : t('draft')}
                      </StateChip>
                      {!modelPublic(m) && (
                        <StateChip icon={Lock} tone="muted">
                          {t('private')}
                        </StateChip>
                      )}
                    </div>
                    <ChevronRight className="hidden h-4 w-4 text-muted md:block" />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <ModelDrawer
        model={current}
        open={!!openId && !!current}
        entries={current ? entries.get(current.id) ?? { count: current.entries, items: [] } : { count: 0, items: [] }}
        canEdit={canEdit}
        canPublish={canPublish}
        onClose={closeModel}
        onEditField={(key) => current && openField(current, key)}
        onAddField={() => current && openField(current)}
        onPatch={(p) => current && patchModel(current, p)}
      />

      <FieldEditor
        key={fe.session}
        open={fe.open}
        field={fe.field}
        isNew={fe.originalKey === null}
        others={feModel ? feModel.fields.filter((x) => x.key !== fe.originalKey) : []}
        modelName={feModel ? l(feModel.name) : ''}
        suggestions={feModel && fe.field ? usedOptions(feModel, fe.field.key, { projects }) : []}
        readOnly={!canEdit}
        onClose={closeField}
        onSave={saveField}
        onDelete={deleteField}
      />
    </div>
  );
}

function Concept({ icon: Icon, title, text, children }: { icon: typeof Braces; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink text-white">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold text-ink">{title}</div>
        <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{text}</p>
        {children}
      </div>
    </div>
  );
}
