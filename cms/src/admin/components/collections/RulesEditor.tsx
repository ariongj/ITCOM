import { useId } from 'react';
import { Plus, X, Zap } from 'lucide-react';
import { FieldError } from '@/components/ui/Field';
import { useDict, useL } from '@/i18n';
import { common } from '@/i18n/common';
import type { Category, CollectionRule, CollectionRuleField, RuleOp } from '@/lib/types';
import { cn } from '@/lib/utils';
import { IconBtn, Segmented, SelectInput, TextInput } from '@/admin/components/products/parts';
import { pd } from '@/admin/components/products/dict';
import { cd, type CdKey } from './dict';
import { BADGES, OPS, RULE_FIELDS, defaultRule, isNumeric } from './model';

/** Smart-collection conditions with ALL / ANY logic (PDF p.14). */
export function RulesEditor({
  match,
  onMatch,
  rules,
  onRules,
  categories,
  tags,
  vendors,
  showErrors,
}: {
  match: 'all' | 'any';
  onMatch: (m: 'all' | 'any') => void;
  rules: CollectionRule[];
  onRules: (r: CollectionRule[]) => void;
  categories: Category[];
  tags: string[];
  vendors: string[];
  showErrors?: boolean;
}) {
  const t = useDict(cd, 'admin');
  const tp = useDict(pd, 'admin');
  const tc = useDict(common, 'admin');
  const l = useL('admin');
  const ids = useId();
  const set = (i: number, patch: Partial<CollectionRule>) => onRules(rules.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const changeField = (i: number, field: CollectionRuleField) => onRules(rules.map((r, k) => (k === i ? defaultRule(field, categories) : r)));

  const valueInput = (r: CollectionRule, i: number) => {
    const invalid = showErrors && !r.value.trim();
    switch (r.field) {
      case 'category':
        return (
          <SelectInput size="sm" value={r.value} onChange={(e) => set(i, { value: e.target.value })} invalid={invalid} aria-label={t('valuePh')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {l(c.name)}
              </option>
            ))}
          </SelectInput>
        );
      case 'status':
        return (
          <SelectInput size="sm" value={r.value} onChange={(e) => set(i, { value: e.target.value })} aria-label={t('valuePh')}>
            <option value="active">{tp('st_active')}</option>
            <option value="draft">{tp('st_draft')}</option>
            <option value="archived">{tp('st_archived')}</option>
          </SelectInput>
        );
      case 'onSale':
        return (
          <SelectInput size="sm" value={/^(true|1|da|po|yes)$/i.test(r.value) ? 'true' : 'false'} onChange={(e) => set(i, { value: e.target.value })} aria-label={t('valuePh')}>
            <option value="true">{t('yes')}</option>
            <option value="false">{t('no')}</option>
          </SelectInput>
        );
      case 'badge':
        return (
          <SelectInput size="sm" value={r.value} onChange={(e) => set(i, { value: e.target.value })} aria-label={t('valuePh')}>
            {BADGES.map((b) => (
              <option key={b} value={b}>
                {tc(`badge_${b}`)}
              </option>
            ))}
          </SelectInput>
        );
      default: {
        const list = r.field === 'tag' ? `${ids}-tags` : r.field === 'vendor' ? `${ids}-vendors` : undefined;
        return (
          <TextInput
            size="sm"
            value={r.value}
            list={list}
            inputMode={isNumeric(r.field) ? 'decimal' : undefined}
            onChange={(e) => set(i, { value: isNumeric(r.field) ? e.target.value.replace(/[^\d.,]/g, '') : e.target.value })}
            placeholder={t('valuePh')}
            suffix={r.field === 'price' || r.field === 'compareAt' ? '€' : undefined}
            invalid={invalid}
            aria-label={t('valuePh')}
          />
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[13px] font-semibold text-ink-soft">{t('match_label')}</span>
        <Segmented
          size="sm"
          value={match}
          onChange={onMatch}
          options={[
            { id: 'all', label: `${t('match_all')} (ALL)` },
            { id: 'any', label: `${t('match_any')} (ANY)` },
          ]}
        />
      </div>

      {rules.length === 0 ? (
        <p className={cn('rounded-lg border border-dashed px-4 py-3.5 text-[13px]', showErrors ? 'border-red-300 bg-red-50/50 text-red-700' : 'border-line bg-canvas/40 text-muted')}>{t('noRules')}</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-canvas/40 p-2 sm:flex-nowrap">
              {i > 0 && <span className="w-full text-[11px] font-bold uppercase tracking-wide text-muted sm:hidden">{t(match === 'all' ? 'and' : 'or')}</span>}
              <SelectInput size="sm" value={r.field} onChange={(e) => changeField(i, e.target.value as CollectionRuleField)} className="min-w-0 flex-1 sm:w-48 sm:flex-none" aria-label={t('c_conditions')}>
                {RULE_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {t(`field_${f}` as CdKey)}
                  </option>
                ))}
              </SelectInput>
              <SelectInput size="sm" value={r.op} onChange={(e) => set(i, { op: e.target.value as RuleOp })} className="w-[132px] shrink-0 sm:w-36" aria-label={t('operator')}>
                {OPS[r.field].map((op) => (
                  <option key={op} value={op}>
                    {t(`op_${op}` as CdKey)}
                  </option>
                ))}
              </SelectInput>
              <div className="min-w-0 flex-1 max-sm:basis-[calc(100%-44px)]">{valueInput(r, i)}</div>
              <IconBtn label={t('removeRule')} onClick={() => onRules(rules.filter((_, k) => k !== i))} danger className="h-9">
                <X className="h-4 w-4" />
              </IconBtn>
            </li>
          ))}
        </ul>
      )}
      {showErrors && rules.some((r) => !r.value.trim()) && <FieldError>{t('e_rules')}</FieldError>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => onRules([...rules, defaultRule(rules.length ? 'tag' : 'category', categories)])} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[12.5px] font-semibold text-white transition hover:bg-ink-soft">
          <Plus className="h-3.5 w-3.5" /> {t('addRule')}
        </button>
        <p className="flex items-start gap-1.5 text-[12.5px] text-muted">
          <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('liveNote')}
        </p>
      </div>

      <datalist id={`${ids}-tags`}>
        {tags.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <datalist id={`${ids}-vendors`}>
        {vendors.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
    </div>
  );
}
