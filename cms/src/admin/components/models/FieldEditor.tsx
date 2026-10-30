// Add / edit one field of a content model: type picker, label (SQ/EN/SR), API key, rules and validation preview.
import { useState } from 'react';
import { Check, Lock, ShieldCheck, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { FieldError, Hint, Input, Label, Switch } from '@/components/ui/Field';
import { L10nInput } from '@/admin/components/L10nInput';
import { ChipsInput, Notice, SelectField } from '@/admin/components/editorial/ui';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import type { ContentFieldType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { md } from './dict';
import { FIELD_ICON, FIELD_TYPES, REF_TARGETS, TRANSLATABLE_TYPES, fieldErrors, keyFromLabel, type FieldX, type RefTarget } from './model';

type T = ReturnType<typeof useDict<typeof md.me>>;

/** "Required · text in 3 languages · up to 80 characters" */
export function validationHint(f: FieldX, t: T, withRequired = true): string {
  const parts = withRequired ? [f.required ? t('v_required') : t('v_optional')] : [];
  switch (f.type) {
    case 'text':
      parts.push(f.translatable ? t('v_text3') : t('v_text1'));
      if (f.max) parts.push(t('v_maxLen', { n: f.max }));
      break;
    case 'number':
      parts.push(t('v_number'));
      if (f.min !== undefined && f.max !== undefined) parts.push(t('v_range', { min: f.min, max: f.max }));
      else if (f.min !== undefined) parts.push(t('v_min', { n: f.min }));
      else if (f.max !== undefined) parts.push(t('v_maxN', { n: f.max }));
      break;
    case 'choice':
      parts.push(t(f.multiple ? 'v_choiceMulti' : 'v_choice', { n: f.options?.length || '…' }));
      break;
    case 'image':
      parts.push(t('v_image'));
      break;
    case 'link':
      parts.push(t('v_link'));
      break;
    case 'date':
      parts.push(t('v_date'));
      break;
    case 'boolean':
      parts.push(t('v_boolean'));
      break;
    case 'reference':
      parts.push(t('v_ref', { target: f.ref ? t(`r_${f.ref}`) : '…' }));
      break;
  }
  return parts.join(' · ');
}

const num = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

export function FieldEditor({
  open,
  field,
  isNew,
  others,
  modelName,
  suggestions,
  readOnly,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  field: FieldX | null;
  isNew: boolean;
  /** The model's other fields (key uniqueness) */
  others: FieldX[];
  modelName: string;
  /** Option values already used by entries */
  suggestions: string[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (f: FieldX) => void;
  onDelete: (key: string) => void;
}) {
  const t = useDict(md, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const [draft, setDraft] = useState<FieldX | null>(field);
  const [keyAuto, setKeyAuto] = useState(isNew);
  const [tried, setTried] = useState(false);

  if (!draft) return <Modal open={false} onClose={onClose} />;

  const system = !draft.custom;
  const errors = fieldErrors(draft, others);
  const show = (e: (typeof errors)[number]) => tried && errors.includes(e);
  const patch = (p: Partial<FieldX>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const canTranslate = TRANSLATABLE_TYPES.includes(draft.type);

  const setType = (type: ContentFieldType) => {
    if (system || type === draft.type) return;
    patch({
      type,
      translatable: TRANSLATABLE_TYPES.includes(type) ? draft.translatable : false,
      options: type === 'choice' ? draft.options ?? [] : undefined,
      multiple: type === 'choice' ? draft.multiple : undefined,
      ref: type === 'reference' ? draft.ref : undefined,
      min: type === 'number' ? draft.min : undefined,
      max: type === 'number' || type === 'text' ? draft.max : undefined,
    });
  };

  const save = () => {
    if (readOnly) return;
    if (errors.length) {
      setTried(true);
      return;
    }
    const clean: FieldX = Object.fromEntries(Object.entries({ ...draft, help: draft.help && (draft.help.me || draft.help.sq || draft.help.en) ? draft.help : undefined }).filter(([, v]) => v !== undefined)) as unknown as FieldX;
    onSave(clean);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? t('newField') : t('editField')}
      description={modelName}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {!isNew && !system && !readOnly ? (
            <Button variant="ghost" size="sm" shape="rounded" className="text-red-600 hover:bg-red-50 hover:text-red-700" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDelete(draft.key)}>
              {t('deleteField')}
            </Button>
          ) : (
            <span />
          )}
          <span className="flex gap-2">
            <Button variant="outline" size="sm" shape="rounded" onClick={onClose}>
              {ta('cancel')}
            </Button>
            {!readOnly && (
              <Button size="sm" shape="rounded" icon={<Check className="h-4 w-4" />} onClick={save}>
                {isNew ? t('addField') : t('saveField')}
              </Button>
            )}
          </span>
        </div>
      }
    >
      <fieldset disabled={readOnly} className="space-y-5 px-6 py-5">
        {/* Type */}
        <div>
          <Label>{t('type')}</Label>
          <div role="radiogroup" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {FIELD_TYPES.map((ty) => {
              const Icon = FIELD_ICON[ty];
              const on = draft.type === ty;
              const locked = system && !on;
              return (
                <button
                  key={ty}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={locked}
                  onClick={() => setType(ty)}
                  className={cn(
                    'flex items-start gap-2 rounded-lg p-2.5 text-left ring-1 ring-inset transition-colors',
                    on ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:bg-canvas',
                    locked && 'cursor-not-allowed opacity-40 hover:bg-white',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', on ? 'text-white' : 'text-ink-soft')} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold leading-tight">{t(`t_${ty}`)}</span>
                    <span className={cn('mt-0.5 block text-[11.5px] leading-snug', on ? 'text-white/70' : 'text-muted')}>{t(`td_${ty}`)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {system ? (
            <Notice icon={Lock} className="mt-3">
              {t('systemHint')}
            </Notice>
          ) : (
            <Hint className="mt-2">{t('customHint')}</Hint>
          )}
        </div>

        {/* Label + key */}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <L10nInput
              label={t('label')}
              required
              value={draft.label}
              onChange={(label) => patch(keyAuto && !system ? { label, key: keyFromLabel(label.sq) } : { label })}
            />
            {show('label') && <FieldError>{t('labelRequired')}</FieldError>}
          </div>
          <div>
            <div className="mb-1.5 flex h-[25px] items-end">
              <Label className="mb-0">{t('key')}</Label>
            </div>
            <Input
              value={draft.key}
              disabled={system}
              onChange={(e) => {
                setKeyAuto(false);
                patch({ key: e.target.value.replace(/\s+/g, '') });
              }}
              className="h-10! font-mono text-[13.5px]!"
              error={show('key') ? t('keyInvalid') : show('keyTaken') ? t('keyTaken') : undefined}
              hint={system ? undefined : t('keyHint')}
            />
          </div>
        </div>

        {/* Rules */}
        <div className="grid gap-3 sm:grid-cols-2">
          <RuleRow label={t('required')} hint={t('requiredHint')} checked={!!draft.required} onChange={(v) => patch({ required: v })} />
          <RuleRow
            label={t('translatable')}
            hint={canTranslate ? t('translatableHint') : t('notTranslatable')}
            checked={canTranslate && !!draft.translatable}
            onChange={(v) => patch({ translatable: v })}
            disabled={!canTranslate}
          />
        </div>

        {/* Type-specific settings */}
        {draft.type === 'text' && (
          <Input label={t('maxLen')} type="number" min={1} value={draft.max ?? ''} onChange={(e) => patch({ max: num(e.target.value) })} className="h-10!" wrapClassName="sm:max-w-[220px]" />
        )}
        {draft.type === 'number' && (
          <div className="grid grid-cols-2 gap-3 sm:max-w-[460px]">
            <Input label={t('min')} type="number" value={draft.min ?? ''} onChange={(e) => patch({ min: num(e.target.value) })} className="h-10!" />
            <Input label={t('max')} type="number" value={draft.max ?? ''} onChange={(e) => patch({ max: num(e.target.value) })} className="h-10!" />
          </div>
        )}
        {draft.type === 'choice' && (
          <div className="space-y-3">
            <ChipsInput label={t('options')} value={draft.options ?? []} onChange={(options) => patch({ options })} suggestions={suggestions} placeholder={t('optionsPh')} disabled={readOnly} />
            {show('options') && <FieldError>{t('optionsMin')}</FieldError>}
            <RuleRow label={t('multiple')} hint={t('multipleHint')} checked={!!draft.multiple} onChange={(v) => patch({ multiple: v })} />
          </div>
        )}
        {draft.type === 'reference' && (
          <div className="sm:max-w-[320px]">
            <SelectField label={t('refTarget')} value={draft.ref ?? ''} onChange={(e) => patch({ ref: (e.target.value || undefined) as RefTarget | undefined })}>
              <option value="">—</option>
              {REF_TARGETS.map((r) => (
                <option key={r} value={r}>
                  {t(`r_${r}`)}
                </option>
              ))}
            </SelectField>
            {show('ref') && <FieldError>{t('refRequired')}</FieldError>}
          </div>
        )}

        <L10nInput label={t('help')} value={draft.help ?? { me: '', sq: '', en: '' }} onChange={(help) => patch({ help })} hint={t('helpHint')} />

        {/* Validation preview */}
        <div className="flex items-start gap-2.5 rounded-lg bg-canvas px-3 py-2.5 ring-1 ring-inset ring-line">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
          <div className="min-w-0 text-[13px]">
            <span className="font-semibold text-ink">{t('validation')}: </span>
            <span className="text-ink-soft">{validationHint(draft, t)}</span>
            {draft.help && l(draft.help) && <div className="mt-0.5 text-[12.5px] italic text-muted">„{l(draft.help)}“</div>}
          </div>
        </div>
      </fieldset>
    </Modal>
  );
}

function RuleRow({ label, hint, checked, onChange, disabled }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 rounded-lg p-3 ring-1 ring-inset ring-line', disabled && 'bg-canvas/60')}>
      <div className="min-w-0">
        <div className={cn('text-[13.5px] font-semibold', disabled ? 'text-muted' : 'text-ink')}>{label}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-muted">{hint}</div>
      </div>
      <Switch checked={checked} onChange={onChange} size="sm" disabled={disabled} />
    </div>
  );
}
