import type { Lang, Unit } from './types';

const LOCALE: Record<Lang, string> = { me: 'de-DE', sq: 'de-DE', en: 'en-IE' };
const DATE_LOCALE: Record<Lang, string> = { me: 'sr-Latn', sq: 'sq-AL', en: 'en-GB' };

/** 1.249,00 € (ME/SQ) — €1,249.00 (EN) */
export function money(value: number, lang: Lang = 'sq', opts: { decimals?: boolean } = {}) {
  const decimals = opts.decimals ?? true;
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(value);
}

/** Compact money for charts/KPIs: 12,4k € */
export function moneyCompact(value: number, lang: Lang = 'sq') {
  if (Math.abs(value) < 10000) return money(value, lang, { decimals: false });
  return new Intl.NumberFormat(LOCALE[lang], {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function num(value: number, lang: Lang = 'sq', maxDecimals = 2) {
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: maxDecimals }).format(value);
}

/* Chrome ships without Albanian Intl data: `Intl.DateTimeFormat('sq-AL')` silently falls back to English
   ("9 October 2026"). When the runtime can't do Albanian, format in en-GB (same day-month-year order) and swap
   the month and weekday names for the CLDR Albanian ones. Works with any options, including timeZone. */
const SQ_NATIVE = (() => {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(['sq']).length > 0;
  } catch {
    return false;
  }
})();
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec'];
const SQ_MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const SQ_MONTHS_SHORT = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'sht', 'tet', 'nën', 'dhj'];
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SQ_DAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];
const SQ_DAYS_SHORT = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];

function sqParts(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-GB', opts)
    .formatToParts(d)
    .map((p) => {
      if (p.type === 'month') {
        const long = EN_MONTHS.indexOf(p.value);
        if (long >= 0) return SQ_MONTHS[long];
        const short = EN_MONTHS_SHORT.indexOf(p.value);
        if (short >= 0) return SQ_MONTHS_SHORT[short];
      }
      if (p.type === 'weekday') {
        const long = EN_DAYS.indexOf(p.value);
        if (long >= 0) return SQ_DAYS[long];
        const short = EN_DAYS_SHORT.indexOf(p.value);
        if (short >= 0) return SQ_DAYS_SHORT[short];
      }
      return p.value;
    })
    .join('');
}

export function date(iso: string | Date, lang: Lang = 'sq', opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  try {
    if (lang === 'sq' && !SQ_NATIVE) return sqParts(d, opts);
    return new Intl.DateTimeFormat(DATE_LOCALE[lang], opts).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-GB', opts).format(d);
  }
}

export function dateTime(iso: string, lang: Lang = 'sq') {
  return date(iso, lang, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const REL: Record<Lang, { now: string; min: string; h: string; d: string; ago: (s: string) => string }> = {
  me: { now: 'upravo sada', min: 'min', h: 'h', d: 'd', ago: (s) => `prije ${s}` },
  sq: { now: 'tani', min: 'min', h: 'orë', d: 'ditë', ago: (s) => `para ${s}` },
  en: { now: 'just now', min: 'min', h: 'h', d: 'd', ago: (s) => `${s} ago` },
};

export function timeAgo(iso: string, lang: Lang = 'sq') {
  const r = REL[lang];
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return r.now;
  if (diff < 3600) return r.ago(`${Math.floor(diff / 60)} ${r.min}`);
  if (diff < 86400) return r.ago(`${Math.floor(diff / 3600)} ${r.h}`);
  if (diff < 86400 * 30) return r.ago(`${Math.floor(diff / 86400)} ${r.d}`);
  return date(iso, lang);
}

const UNIT_LABEL: Record<Lang, Record<Unit, string>> = {
  me: { kom: 'kom', m2: 'm²', m: 'm', set: 'par' },
  sq: { kom: 'copë', m2: 'm²', m: 'm', set: 'palë' },
  en: { kom: 'pc', m2: 'm²', m: 'm', set: 'pair' },
};

export function unitLabel(unit: Unit, lang: Lang = 'sq') {
  return UNIT_LABEL[lang][unit];
}

/** "/ m²" style suffix for prices */
export function perUnit(unit: Unit, lang: Lang = 'sq') {
  return `/ ${unitLabel(unit, lang)}`;
}
