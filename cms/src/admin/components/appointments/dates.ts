// Calendar date helpers for the appointments module (PDF pp.45–46).
// All maths is done in LOCAL time with setDate/setHours, so the week that contains the
// summer/winter-time switch (last Sunday of October / March) still lays out correctly.
import type { Lang } from '@/lib/types';

/** Monday = 0 … Sunday = 6 */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

export function startOfDay(d: Date | number | string) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function mondayOf(d: Date | number | string) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - weekdayIndex(x));
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Local "YYYY-MM-DD" */
export function dayKey(d: Date | string | number) {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}

/** "YYYY-MM-DD" → local midnight (not UTC). */
export function parseDay(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : startOfDay(v);
}

/** "HH:MM" → minutes after midnight */
export function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** minutes after midnight → "HH:MM" */
export function fromMin(min: number) {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** Minutes after local midnight of an ISO instant */
export function minutesOf(iso: string | Date) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Local day + minutes → ISO instant */
export function atMinutes(day: string | Date, minutes: number) {
  const d = typeof day === 'string' ? parseDay(day) : startOfDay(day);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d.toISOString();
}

export function hhmm(iso: string | Date) {
  return fromMin(minutesOf(iso));
}

export function timeRange(start: string, durationMin: number) {
  const s = new Date(start);
  const e = new Date(s.getTime() + durationMin * 60000);
  return `${hhmm(s)}–${hhmm(e)}`;
}

export function sameDay(a: Date | string, b: Date | string) {
  return dayKey(a) === dayKey(b);
}

/* ------------------------------------------------------------------ */
/* Names — written out so Albanian reads like the proposal ("Hënë 05") */
/* ------------------------------------------------------------------ */
const DAYS: Record<Lang, string[]> = {
  me: ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak', 'Subota', 'Nedjelja'],
  sq: ['Hënë', 'Martë', 'Mërkurë', 'Enjte', 'Premte', 'Shtunë', 'Diel'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};
const DAYS_SHORT: Record<Lang, string[]> = {
  me: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'],
  sq: ['Hën', 'Mar', 'Mër', 'Enj', 'Pre', 'Sht', 'Die'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
/** ME uses the genitive after a day number ("5. oktobra") */
const MONTHS: Record<Lang, string[]> = {
  me: ['januara', 'februara', 'marta', 'aprila', 'maja', 'juna', 'jula', 'avgusta', 'septembra', 'oktobra', 'novembra', 'decembra'],
  sq: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MONTHS_SHORT: Record<Lang, string[]> = {
  me: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'],
  sq: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const dayName = (i: number, lang: Lang, short = false) => (short ? DAYS_SHORT : DAYS)[lang][i];

/** "Hënë 05" / "Pon 05" — calendar column header */
export function dayHeader(d: Date, lang: Lang, short = false) {
  return `${dayName(weekdayIndex(d), lang, short)} ${pad(d.getDate())}`;
}

/** "05 tetor" / "5. oktobra" / "5 October" */
export function dayMonth(d: Date, lang: Lang, short = false) {
  const m = (short ? MONTHS_SHORT : MONTHS)[lang][d.getMonth()];
  if (lang === 'me') return `${d.getDate()}. ${m}`;
  if (lang === 'sq') return `${pad(d.getDate())} ${m}`;
  return `${d.getDate()} ${m}`;
}

/** "E mërkurë, 07 tetor 2026" style long date */
export function longDate(d: Date | string, lang: Lang) {
  const x = new Date(d);
  const name = dayName(weekdayIndex(x), lang);
  return `${name}, ${dayMonth(x, lang)} ${x.getFullYear()}`;
}

/** Range label for a week: "05–10 tetor" · "28 shtator – 03 tetor" */
export function rangeLabel(from: Date, to: Date, lang: Lang) {
  const sameMonth = from.getMonth() === to.getMonth();
  if (!sameMonth) return `${dayMonth(from, lang, true)} – ${dayMonth(to, lang, true)}`;
  const m = MONTHS[lang][to.getMonth()];
  if (lang === 'me') return `${from.getDate()}–${to.getDate()}. ${m}`;
  if (lang === 'sq') return `${pad(from.getDate())}–${pad(to.getDate())} ${m}`;
  return `${from.getDate()}–${to.getDate()} ${m}`;
}

/** ISO week number (for the "W41" hint) */
export function isoWeek(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - dow);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}
