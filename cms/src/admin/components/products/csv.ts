// Minimal RFC-4180 CSV reader/writer for the product import/export (PDF p.09).
// Reads comma, semicolon (Excel in SQ/SR locales) or tab separated files, quoted fields and "" escapes.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: ',' | ';' | '\t';
}

function detectDelimiter(firstLine: string): ParsedCsv['delimiter'] {
  const count = (ch: string) => {
    let n = 0;
    let quoted = false;
    for (const c of firstLine) {
      if (c === '"') quoted = !quoted;
      else if (c === ch && !quoted) n++;
    }
    return n;
  };
  const scores: [ParsedCsv['delimiter'], number][] = [
    [',', count(',')],
    [';', count(';')],
    ['\t', count('\t')],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] > 0 ? scores[0][0] : ',';
}

export function parseCsv(input: string): ParsedCsv {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const firstLine = text.split('\n').find((l) => l.trim()) ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  const clean = rows.map((r) => r.map((v) => v.trim())).filter((r) => r.some((v) => v !== ''));
  const [headers = [], ...body] = clean;
  return { headers, rows: body, delimiter };
}

const needsQuote = (s: string, d: string) => s.includes(d) || s.includes('"') || s.includes('\n') || s.includes('\r') || /^\s|\s$/.test(s);

export function toCsv(rows: (string | number | null | undefined)[][], delimiter = ','): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          const s = v == null ? '' : String(v);
          return needsQuote(s, delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(delimiter),
    )
    .join('\r\n');
}

/** "1.249,90" / "1,249.90" / "19,9" / "€ 49" → number (null when empty or invalid). */
export function parseNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = raw.replace(/[€\s]/g, '').replace(/eur$/i, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // the right-most separator is the decimal one
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma > -1) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
