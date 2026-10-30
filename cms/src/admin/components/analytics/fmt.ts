// Formatting helpers for the insight screens (Analitika, Tregjet, Integrime, Harta e moduleve).
import { useLayoutEffect, useRef, useState } from 'react';
import { date } from '@/lib/format';
import type { Lang } from '@/lib/types';

/**
 * Chrome ships without Albanian Intl data, so `Intl.DateTimeFormat('sq')` silently falls back to English.
 * Albanian month/day names are spelled out here (CLDR forms) whenever the runtime cannot do it.
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

const pad = (n: number) => String(n).padStart(2, '0');

function sqDate(d: Date, o: Intl.DateTimeFormatOptions) {
  const dm: string[] = [];
  if (o.day) dm.push(String(d.getDate()));
  if (o.month) {
    const m = d.getMonth();
    dm.push(o.month === 'long' ? SQ_MONTHS[m] : o.month === 'short' || o.month === 'narrow' ? SQ_MONTHS_SHORT[m] : String(m + 1));
  }
  if (o.year) dm.push(String(d.getFullYear()));
  const wd = o.weekday ? (o.weekday === 'long' ? SQ_DAYS[d.getDay()] : SQ_DAYS_SHORT[d.getDay()]) : '';
  const time = o.hour || o.minute ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
  return [[wd, dm.join(' ')].filter(Boolean).join(', '), time].filter(Boolean).join(', ');
}

/** `date()` with a real Albanian fallback. */
export function fmtDate(d: Date | string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  const x = typeof d === 'string' ? new Date(d) : d;
  if (lang === 'sq' && !SQ_NATIVE) return sqDate(x, opts);
  return date(x, lang, opts);
}

export const fmtDay = (d: Date | string, lang: Lang) => fmtDate(d, lang, { day: 'numeric', month: 'short' });
export const fmtDayYear = (d: Date | string, lang: Lang) => fmtDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (d: Date | string, lang: Lang) => fmtDate(d, lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "5 – 30 sht 2026" style range label; `to` is exclusive. */
export function rangeLabel(from: Date, toExclusive: Date, lang: Lang) {
  const last = new Date(toExclusive.getTime() - 1);
  const sameDay = from.toDateString() === last.toDateString();
  if (sameDay) return fmtDayYear(from, lang);
  const sameYear = from.getFullYear() === last.getFullYear();
  return `${sameYear ? fmtDay(from, lang) : fmtDayYear(from, lang)} – ${fmtDayYear(last, lang)}`;
}

/** Local YYYY-MM-DD (not UTC) */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Signed percentage "+12,4 %" / "−3 %" */
export function pctLabel(v: number, lang: Lang, digits = 1) {
  const n = new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'de-DE', { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : digits }).format(Math.abs(v));
  return `${v > 0.0005 ? '+' : v < -0.0005 ? '−' : ''}${n}%`;
}

/** Share "34 %" (unsigned) */
export function shareLabel(v: number, lang: Lang, digits = 0) {
  return `${new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'de-DE', { maximumFractionDigits: digits }).format(v * 100)}%`;
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */
export type CsvCell = string | number | null | undefined;

const cell = (v: CsvCell) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : v;
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC 4180 CSV (comma, dot decimals) with a UTF-8 BOM so Excel opens ë/ç/š correctly. */
export function toCsv(rows: CsvCell[][]) {
  return `﻿${rows.map((r) => r.map(cell).join(',')).join('\r\n')}`;
}

/* ------------------------------------------------------------------ */
/* Measure an element's width (SVG charts draw at real pixel size)     */
/* ------------------------------------------------------------------ */
export function useWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (!('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
