import { useCallback } from 'react';
import { useDict, useLang } from '@/i18n';
import { money } from '@/lib/format';
import type { Segment, SegmentField, SegmentRule } from '@/lib/types';
import { cx } from './i18n';

export const NUMERIC_FIELDS: SegmentField[] = ['orders', 'spent', 'lastOrderDays'];
export const isNumericField = (f: SegmentField) => NUMERIC_FIELDS.includes(f);

/** A rule is complete when it has a usable value (numbers must parse). */
export function ruleValid(r: SegmentRule) {
  const v = String(r.value ?? '').trim();
  if (!v) return false;
  if (isNumericField(r.field)) return Number.isFinite(Number(v.replace(',', '.'))) && Number(v.replace(',', '.')) >= 0;
  return true;
}

/**
 * Plain-language explanation of a segment (PDF p.19 "shpjegimi i kushteve"):
 *   "Përfshin klientët ku shpenzimet totale janë mbi 4.000 € dhe numri i porosive është më i madh se 1."
 * In ANY mode consecutive "is" rules on the same field are grouped: "qyteti është Mitrovicë, Vushtrri ose Skenderaj".
 */
export function useExplain() {
  const t = useDict(cx, 'admin');
  const lang = useLang('admin');
  return useCallback(
    (seg: Pick<Segment, 'match' | 'rules'>) => {
      const rules = seg.rules.filter(ruleValid);
      if (!rules.length) return t('x_empty');
      const joiner = seg.match === 'any' ? t('x_or') : t('x_and');
      const list = (vals: string[]) => (vals.length < 2 ? vals[0] : `${vals.slice(0, -1).join(', ')}${t('x_or')}${vals[vals.length - 1]}`);
      const valueText = (r: SegmentRule) => {
        const raw = String(r.value).trim();
        if (r.field === 'spent') return money(Number(raw.replace(',', '.')), lang, { decimals: false });
        if (r.field === 'lang') {
          const name = ['me', 'sq', 'en'].includes(raw) ? t(`lang_${raw as 'me' | 'sq' | 'en'}`) : raw;
          return lang === 'en' ? name : name.toLowerCase();
        }
        if (r.field === 'tag') return lang === 'en' ? `“${raw}”` : `„${raw}“`;
        return raw;
      };
      const parts: string[] = [];
      for (let i = 0; i < rules.length; i++) {
        const r = rules[i];
        if (!isNumericField(r.field)) {
          const vals = [valueText(r)];
          while (seg.match === 'any' && i + 1 < rules.length && rules[i + 1].field === r.field) vals.push(valueText(rules[++i]));
          parts.push(t(`x_${r.field as 'city' | 'lang' | 'tag'}`, { v: list(vals) }));
        } else {
          parts.push(t(`x_${r.field as 'orders' | 'spent' | 'lastOrderDays'}_${r.op}`, { v: valueText(r) }));
        }
      }
      return t('x_intro', { conds: parts.join(joiner) });
    },
    [t, lang],
  );
}
