import { useMemo } from 'react';
import { Info, Languages } from 'lucide-react';
import { Select, Switch } from '@/components/ui/Field';
import { LANGS, defineDict, useDict } from '@/i18n';
import type { L10n, Lang } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useDb } from '@/store/db';
import { S } from './strings';
import type { SecProps } from './model';
import { Block, Note, Panel, StateText } from './ui';

const LG = defineDict({
  me: {
    colLang: 'Jezik',
    colSite: 'Na sajtu',
    colCoverage: 'Prevedenost',
    d_me: 'Srpski — latinica · na sajtu podrazumevano isključen',
    d_sq: 'Osnovni jezik — sadržaj se piše prvo na albanskom',
    d_en: 'Za dijasporu i strane kupce',
    published: 'Objavljen',
    off: 'Isključen',
    defaultBadge: 'Podrazumijevani',
    fallbackBadge: 'Rezervni',
    default: 'Podrazumijevani jezik',
    default_h: 'Jezik prve posjete i e-mailova kada jezik kupca nije poznat.',
    fallback: 'Rezervni jezik',
    fallback_h: 'Prikazuje se kada prevod nedostaje.',
    cantDisable: 'Podrazumijevani i rezervni jezik moraju ostati uključeni',
    coverage: 'Prevedenost sadržaja',
    coverage_h: 'Nazivi proizvoda, kategorija, kolekcija, stranica i blog članaka.',
    missing: 'Bez prevoda: {n}',
    complete: 'Kompletno',
    adminNote: 'Panel administracije je uvijek dostupan na sva tri jezika (podrazumijevano albanski). Isključeni jezici nestaju iz izbora jezika na sajtu.',
    srNote: 'Srpska verzija (SR) postoji za sve tekstove, ali je na sajtu podrazumevano isključena. Uključite je kada prevodi budu provereni — do tada posetioci biraju albanski ili engleski, a nedostajući prevodi prikazuju se na albanskom.',
  },
  sq: {
    colLang: 'Gjuha',
    colSite: 'Në faqe',
    colCoverage: 'Përkthimi',
    d_me: 'Serbisht — latinisht · si parazgjedhje e fikur në faqe',
    d_sq: 'Gjuha kryesore — përmbajtja shkruhet fillimisht në shqip',
    d_en: 'Për diasporën dhe blerësit e huaj',
    published: 'Publikuar',
    off: 'Joaktive',
    defaultBadge: 'Parazgjedhur',
    fallbackBadge: 'Rezervë',
    default: 'Gjuha parazgjedhur',
    default_h: 'Gjuha e vizitës së parë dhe e email-eve kur gjuha e klientit nuk dihet.',
    fallback: 'Gjuha rezervë (fallback)',
    fallback_h: 'Shfaqet kur mungon përkthimi.',
    cantDisable: 'Gjuha parazgjedhur dhe ajo rezervë duhet të mbeten aktive',
    coverage: 'Mbulimi i përkthimeve',
    coverage_h: 'Emrat e produkteve, kategorive, koleksioneve, faqeve dhe artikujve të blogut.',
    missing: 'Pa përkthim: {n}',
    complete: 'I plotë',
    adminNote: 'Paneli i administrimit është gjithmonë në dispozicion në të tria gjuhët (parazgjedhur shqip). Gjuhët e çaktivizuara zhduken nga zgjedhja e gjuhës në faqe.',
    srNote: 'Versioni serbisht (SR) ekziston për të gjitha tekstet, por si parazgjedhje është i fikur në faqe. Aktivizojeni kur përkthimet të jenë rishikuar — deri atëherë vizitorët zgjedhin shqip ose anglisht, ndërsa përkthimet që mungojnë shfaqen në shqip.',
  },
  en: {
    colLang: 'Language',
    colSite: 'On the site',
    colCoverage: 'Translated',
    d_me: 'Serbian — Latin script · off on the site by default',
    d_sq: 'Primary language — content is written in Albanian first',
    d_en: 'For the diaspora and foreign customers',
    published: 'Published',
    off: 'Off',
    defaultBadge: 'Default',
    fallbackBadge: 'Fallback',
    default: 'Default language',
    default_h: 'Language of the first visit and of e-mails when the customer’s language is unknown.',
    fallback: 'Fallback language',
    fallback_h: 'Shown when a translation is missing.',
    cantDisable: 'The default and fallback languages must stay enabled',
    coverage: 'Translation coverage',
    coverage_h: 'Product, category, collection, page and blog post titles.',
    missing: 'Untranslated: {n}',
    complete: 'Complete',
    adminNote: 'The admin panel is always available in all three languages (Albanian by default). Disabled languages disappear from the site’s language switcher.',
    srNote: 'A Serbian (SR) version exists for every text but is switched off on the site by default. Turn it on once the translations have been reviewed — until then visitors choose Albanian or English, and missing translations fall back to Albanian.',
  },
});
type LgKey = keyof typeof LG.me;

export function LanguagesSection({ s, set, setExt }: SecProps) {
  const t = useDict(LG, 'admin');
  const ts = useDict(S, 'admin');
  const products = useDb((st) => st.products);
  const categories = useDb((st) => st.categories);
  const collections = useDb((st) => st.collections);
  const pages = useDb((st) => st.pages);
  const posts = useDb((st) => st.posts);

  const coverage = useMemo(() => {
    const values: L10n[] = [...products.map((p) => p.name), ...categories.map((c) => c.name), ...collections.map((c) => c.title), ...pages.map((p) => p.title), ...posts.map((p) => p.title)];
    const out = {} as Record<Lang, { pct: number; missing: number }>;
    for (const { code } of LANGS) {
      const missing = values.filter((v) => !v?.[code]?.trim()).length;
      out[code] = { pct: values.length ? Math.round(((values.length - missing) / values.length) * 100) : 100, missing };
    }
    return out;
  }, [products, categories, collections, pages, posts]);

  const { langDefault, langFallback } = s.ext;
  const enabled = (code: Lang) => s.languages[code] || code === langDefault || code === langFallback;
  const toggle = (code: Lang, v: boolean) => set('languages', { ...s.languages, [code]: v });

  return (
    <Panel lead title={ts('sec_languages')} description={ts('sec_languages_d')}>
      <Block>
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="hidden grid-cols-[minmax(0,1fr)_130px_200px] gap-4 border-b border-line bg-[#f7f7f7] px-4 py-2.5 text-[12px] font-semibold text-muted sm:grid">
            <span>{t('colLang')}</span>
            <span>{t('colSite')}</span>
            <span>{t('colCoverage')}</span>
          </div>
          <ul className="divide-y divide-line/60">
            {LANGS.map((lg) => {
              const on = enabled(lg.code);
              const locked = lg.code === langDefault || lg.code === langFallback;
              const cov = coverage[lg.code];
              return (
                <li key={lg.code} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_130px_200px] sm:items-center sm:gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11.5px] font-extrabold tracking-wide ring-1 ring-inset', on ? 'bg-ink text-white ring-ink' : 'bg-[#f3f3f3] text-muted ring-black/[0.06]')}>{lg.short}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{lg.label}</span>
                        {lg.code === langDefault && <span className="rounded bg-ink px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">{t('defaultBadge')}</span>}
                        {lg.code === langFallback && <span className="rounded px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-ink-soft ring-1 ring-inset ring-ink/20">{t('fallbackBadge')}</span>}
                      </div>
                      <div className="truncate text-[12.5px] text-muted">{t(`d_${lg.code}` as LgKey)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pl-12 sm:pl-0" title={locked ? t('cantDisable') : undefined}>
                    <Switch size="sm" checked={on} disabled={locked} onChange={(v) => toggle(lg.code, v)} label={<span className="sr-only">{lg.label}</span>} />
                    <StateText tone={on ? 'ok' : 'off'}>{on ? t('published') : t('off')}</StateText>
                  </div>
                  <div className="pl-12 sm:pl-0">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-semibold tabular-nums text-ink">{cov.pct}%</span>
                      <span className="text-muted">{cov.missing ? t('missing', { n: cov.missing }) : t('complete')}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                      <div className={cn('h-full rounded-full', cov.pct === 100 ? 'bg-ink' : 'bg-ink/45')} style={{ width: `${Math.max(cov.pct, 2)}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mt-2 text-[12px] text-muted">{t('coverage_h')}</p>
        <Note icon={Languages} className="mt-4">
          {t('srNote')}
        </Note>
      </Block>

      <Block>
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t('default')}</div>
            <Select aria-label={t('default')} value={langDefault} onChange={(e) => { const v = e.target.value as Lang; setExt('langDefault', v); if (!s.languages[v]) toggle(v, true); }} className="h-10! rounded-lg! text-[14px]!">
              {LANGS.map((lg) => (
                <option key={lg.code} value={lg.code}>
                  {lg.short} — {lg.label}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-muted">{t('default_h')}</p>
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t('fallback')}</div>
            <Select aria-label={t('fallback')} value={langFallback} onChange={(e) => { const v = e.target.value as Lang; setExt('langFallback', v); if (!s.languages[v]) toggle(v, true); }} className="h-10! rounded-lg! text-[14px]!">
              {LANGS.map((lg) => (
                <option key={lg.code} value={lg.code}>
                  {lg.short} — {lg.label}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-muted">{t('fallback_h')}</p>
          </div>
        </div>
        <Note icon={Info} className="mt-5">
          {t('adminNote')}
        </Note>
      </Block>
    </Panel>
  );
}
