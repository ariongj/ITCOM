import { useCallback } from 'react';
import { useUi } from '@/store/ui';
import type { L10n, Lang } from '@/lib/types';

// ITCOM: Albanian first, English second. The `me` slot (inherited from the base build) holds the
// Serbian (Latin) copy for Mitrovica; it is switched off on the storefront by default (Konfigurimet → Gjuhët).
export const LANGS: { code: Lang; label: string; short: string; htmlLang: string }[] = [
  { code: 'sq', label: 'Shqip', short: 'SQ', htmlLang: 'sq' },
  { code: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { code: 'me', label: 'Srpski', short: 'SR', htmlLang: 'sr-Latn' },
];

export type Scope = 'site' | 'admin';

type Vars = Record<string, string | number>;

/**
 * Define a typed dictionary. `me` is the source of truth; TypeScript enforces
 * that `sq` and `en` provide exactly the same keys.
 *
 *   const dict = defineDict({ me: { hello: 'Zdravo {name}' }, sq: { hello: 'Përshëndetje {name}' }, en: { hello: 'Hello {name}' } });
 *   const t = useDict(dict);   t('hello', { name: 'Ana' })
 */
export function defineDict<T extends Record<string, string>>(d: {
  me: T;
  sq: NoInfer<Record<keyof T, string>>;
  en: NoInfer<Record<keyof T, string>>;
}) {
  return d as { me: T; sq: Record<keyof T, string>; en: Record<keyof T, string> };
}

export function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function useLang(scope: Scope = 'site'): Lang {
  return useUi((s) => (scope === 'admin' ? s.adminLang : s.lang));
}

export function useDict<T extends Record<string, string>>(
  dict: { me: T; sq: Record<keyof T, string>; en: Record<keyof T, string> },
  scope: Scope = 'site',
) {
  const lang = useLang(scope);
  return useCallback(
    (key: keyof T & string, vars?: Vars) => interpolate((dict[lang][key] ?? dict.sq[key] ?? dict.me[key] ?? key) as string, vars),
    [dict, lang],
  );
}

/** Pick the right language from a localized value (falls back to Albanian, then the third slot). */
export function lt(v: L10n | null | undefined, lang: Lang): string {
  if (!v) return '';
  return v[lang]?.trim() ? v[lang] : v.sq?.trim() ? v.sq : v.me;
}

export function useL(scope: Scope = 'site') {
  const lang = useLang(scope);
  return useCallback((v: L10n | null | undefined) => lt(v, lang), [lang]);
}

export const emptyL10n = (): L10n => ({ me: '', sq: '', en: '' });
export const l10n = (me: string, sq: string, en: string): L10n => ({ me, sq, en });
