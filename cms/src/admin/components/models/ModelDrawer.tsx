// One content model: its fields (definition) and a glimpse of its entries, which stay in the owning editor.
import { Link } from 'react-router';
import { ArrowRight, Asterisk, CalendarClock, CircleCheck, CircleDashed, Globe, Info, Languages, Lock, Pencil, Plus } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Switch } from '@/components/ui/Field';
import { buttonClass, Button } from '@/components/ui/Button';
import { StateChip } from '@/admin/components/editorial/ui';
import { useDict, useL } from '@/i18n';
import { cn, thumb } from '@/lib/utils';
import { md } from './dict';
import { validationHint } from './FieldEditor';
import { DESCRIPTION_KEY, EDITORS, FIELD_ICON, isSystem, modelIcon, modelPublic, modelStatus, withRules, type EntryPreview, type FieldX, type ModelX } from './model';

const SAMPLE = 4;

export function ModelDrawer({
  model,
  open,
  entries,
  canEdit,
  canPublish,
  onClose,
  onEditField,
  onAddField,
  onPatch,
}: {
  model: ModelX | undefined;
  open: boolean;
  entries: { count: number; items: EntryPreview[] };
  canEdit: boolean;
  canPublish: boolean;
  onClose: () => void;
  onEditField: (key: string) => void;
  onAddField: () => void;
  onPatch: (p: Partial<ModelX>) => void;
}) {
  const t = useDict(md, 'admin');
  const l = useL('admin');
  if (!model) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;

  const Icon = modelIcon(model.source);
  const editor = EDITORS[model.source];
  const descKey = DESCRIPTION_KEY[model.source];
  const fields = model.fields.map((f) => withRules(model, f));
  const active = modelStatus(model) === 'active';
  const isPublic = modelPublic(model);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="max-w-[720px]"
      title={
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-white">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[17px] font-bold text-ink">{l(model.name)}</div>
            <div className="truncate text-[12.5px] font-medium text-muted">
              {t('source')}: <span className="font-mono">{model.source}</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4 px-5 py-5 sm:px-6">
        {/* Summary */}
        <div className="flex flex-wrap items-center gap-1.5">
          <StateChip icon={active ? CircleCheck : CircleDashed} tone={active ? 'ok' : 'warn'}>
            {active ? t('active') : t('draft')}
          </StateChip>
          <StateChip icon={isPublic ? Globe : Lock} tone={isPublic ? 'neutral' : 'muted'}>
            {isPublic ? t('public') : t('private')}
          </StateChip>
          <span className="text-[12.5px] text-muted">
            {t('fieldsN', { n: fields.length })} · {t('entriesN', { n: entries.count })}
          </span>
        </div>
        <p className="text-[13.5px] text-ink-soft">{t(descKey ?? 'md_custom')}</p>

        {/* Fields */}
        <section className="overflow-hidden rounded-xl border border-line/80 bg-white">
          <header className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-[14.5px] font-semibold text-ink">{t('fields')}</h3>
              <p className="text-[12.5px] text-muted">{t('fieldsText')}</p>
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" shape="rounded" icon={<Plus className="h-4 w-4" />} onClick={onAddField}>
                {t('addField')}
              </Button>
            )}
          </header>
          <div className="hidden grid-cols-[150px_minmax(0,1fr)_120px_32px] gap-3 border-b border-line bg-canvas/60 px-4 py-2 text-[12px] font-semibold text-muted sm:grid">
            <span>{t('colKey')}</span>
            <span>{t('colLabel')}</span>
            <span>{t('colType')}</span>
            <span className="sr-only">{t('editField')}</span>
          </div>
          <ul className="divide-y divide-line/70">
            {fields.map((f) => (
              <FieldRow key={f.key} f={f} canEdit={canEdit} onEdit={() => onEditField(f.key)} />
            ))}
          </ul>
        </section>

        {/* Entries */}
        <section className="overflow-hidden rounded-xl border border-line/80 bg-white">
          <header className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-[14.5px] font-semibold text-ink">
                {t('entriesSample')} <span className="ml-1 rounded-md bg-ink/[0.05] px-1.5 py-0.5 text-[12px] font-semibold text-muted">{entries.count}</span>
              </h3>
              {editor && <p className="text-[12.5px] text-muted">{t('entriesText', { where: t(editor.label) })}</p>}
            </div>
            {editor && (
              <Link to={editor.to} className={buttonClass({ variant: 'primary', size: 'sm', shape: 'rounded', className: 'shrink-0' })}>
                {t('viewEntries')} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </header>
          {entries.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-muted">{t('noEntries')}</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {entries.items.slice(0, SAMPLE).map((e) => {
                const body = (
                  <>
                    {e.image ? (
                      <span className="block h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-sand ring-1 ring-inset ring-line">
                        <img src={thumb(e.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft ring-1 ring-inset ring-line">
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{l(e.title)}</span>
                      {e.sub && <span className="block truncate text-[12.5px] text-muted">{l(e.sub)}</span>}
                    </span>
                  </>
                );
                return (
                  <li key={e.id}>
                    {e.to ? (
                      <Link to={e.to} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-canvas/60">
                        {body}
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                    )}
                  </li>
                );
              })}
              {entries.count > SAMPLE && <li className="px-4 py-2 text-[12.5px] font-medium text-muted">{t('moreEntries', { n: entries.count - SAMPLE })}</li>}
            </ul>
          )}
          {editor && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line/70 bg-canvas/40 px-4 py-2.5 text-[12px] text-muted">
              {t('usedOn')}:
              {editor.usedOn.map((p) => (
                <code key={p} className="rounded bg-white px-1.5 py-px font-mono text-[11.5px] text-ink-soft ring-1 ring-inset ring-line">
                  {p}
                </code>
              ))}
            </div>
          )}
        </section>

        {/* Settings */}
        <section className="rounded-xl border border-line/80 bg-white">
          <header className="border-b border-line/70 px-4 py-3">
            <h3 className="text-[14.5px] font-semibold text-ink">{t('settings')}</h3>
            {!canPublish && <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted"><Lock className="h-3 w-3" /> {t('noPublish')}</p>}
          </header>
          <div className="divide-y divide-line/70">
            <SettingRow label={t('statusLabel')} hint={t('statusHint')} checked={active} disabled={!canPublish} onChange={(v) => onPatch({ status: v ? 'active' : 'draft' })} />
            <SettingRow label={t('publicLabel')} hint={t('publicHint')} checked={isPublic} disabled={!canPublish} onChange={(v) => onPatch({ public: v })} />
          </div>
        </section>

        {/* PDF p.36 */}
        <div className="space-y-2 rounded-xl bg-ink/[0.035] px-4 py-3 text-[13px] text-ink-soft ring-1 ring-inset ring-ink/[0.07]">
          <p className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t('pdfNote')}
          </p>
          <p className="flex gap-2">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {t('pdfNote2')}{' '}
              <Link to="/admin/termini/usluge" className="font-semibold text-ink underline-offset-2 hover:underline">
                {t('c3Link')} →
              </Link>
            </span>
          </p>
        </div>
      </div>
    </Drawer>
  );
}

function FieldRow({ f, canEdit, onEdit }: { f: FieldX; canEdit: boolean; onEdit: () => void }) {
  const t = useDict(md, 'admin');
  const l = useL('admin');
  const Icon = FIELD_ICON[f.type];
  return (
    <li
      onClick={onEdit}
      className={cn('grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-canvas/60 sm:grid-cols-[150px_minmax(0,1fr)_120px_32px]')}
    >
      <div className="flex min-w-0 items-center gap-1.5 sm:pt-px">
        <code className="truncate font-mono text-[12.5px] font-semibold text-ink">{f.key}</code>
      </div>
      <span className="row-span-2 self-center sm:hidden">
        <EditBtn canEdit={canEdit} onEdit={onEdit} label={t('editField')} />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13.5px] font-semibold text-ink">{l(f.label)}</span>
          {!isSystem(f) && <span className="rounded-md bg-white px-1.5 py-px text-[11px] font-semibold text-ink ring-1 ring-inset ring-ink/25">{t('custom')}</span>}
          {f.required && (
            <span title={t('required')} className="inline-flex items-center gap-0.5 rounded-md bg-ink/[0.06] px-1.5 py-px text-[11px] font-semibold text-ink-soft">
              <Asterisk className="h-3 w-3" /> {t('required')}
            </span>
          )}
          {f.translatable && (
            <span title={t('translatableHint')} className="inline-flex items-center gap-0.5 rounded-md bg-ink/[0.06] px-1.5 py-px text-[11px] font-semibold text-ink-soft">
              <Languages className="h-3 w-3" /> SQ · EN · SR
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[12px] leading-snug text-muted first-letter:uppercase">{validationHint(f, t, false)}</div>
        <span className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-soft sm:hidden">
          <Icon className="h-3.5 w-3.5 text-muted" /> {t(`t_${f.type}`)}
        </span>
      </div>
      <span className="hidden items-center gap-1.5 text-[13px] font-medium text-ink-soft sm:inline-flex sm:pt-px">
        <Icon className="h-4 w-4 text-muted" /> {t(`t_${f.type}`)}
      </span>
      <span className="hidden sm:block">
        <EditBtn canEdit={canEdit} onEdit={onEdit} label={t('editField')} />
      </span>
    </li>
  );
}

function EditBtn({ canEdit, onEdit, label }: { canEdit: boolean; onEdit: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink"
    >
      {canEdit ? <Pencil className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

function SettingRow({ label, hint, checked, disabled, onChange }: { label: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-ink">{label}</div>
        <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</div>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} size="sm" />
    </div>
  );
}
