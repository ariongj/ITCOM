import { date } from '@/lib/format';
import type { Lang } from '@/lib/types';

/**
 * Chrome ships without Albanian Intl data, so `Intl.DateTimeFormat('sq-AL')` silently falls back to
 * English ("Sunday, 4 October"). For the dashboard we spell the Albanian names out ourselves (CLDR forms)
 * whenever the runtime cannot do it; every other language goes through the shared `date()` helper.
 */
const SQ_NATIVE = (() => {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf(['sq']).length > 0;
  } catch {
    return false;
  }
})();

const SQ_MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const SQ_MONTHS_SHORT = ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'korr', 'gush', 'sht', 'tet', 'nën', 'dhj'];
const SQ_DAYS = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];
const SQ_DAYS_SHORT = ['Die', 'Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht'];

function sqDate(d: Date, o: Intl.DateTimeFormatOptions) {
  const dm: string[] = [];
  if (o.day) dm.push(String(d.getDate()));
  if (o.month) {
    const m = d.getMonth();
    dm.push(o.month === 'long' ? SQ_MONTHS[m] : o.month === 'short' || o.month === 'narrow' ? SQ_MONTHS_SHORT[m] : String(m + 1));
  }
  if (o.year) dm.push(String(d.getFullYear()));
  const wd = o.weekday ? (o.weekday === 'long' ? SQ_DAYS[d.getDay()] : SQ_DAYS_SHORT[d.getDay()]) : '';
  const time = o.hour || o.minute ? date(d, 'en', { hour: o.hour, minute: o.minute, hour12: false }) : '';
  return [[wd, dm.join(' ')].filter(Boolean).join(', '), time].filter(Boolean).join(', ');
}

/** `date()` with a real Albanian fallback. */
export function fmtDate(d: Date, lang: Lang, opts: Intl.DateTimeFormatOptions) {
  if (lang === 'sq' && !SQ_NATIVE) return sqDate(d, opts);
  return date(d, lang, opts);
}
