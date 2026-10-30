import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

const MAP: Record<string, string> = {
  č: 'c', ć: 'c', š: 's', ž: 'z', đ: 'dj', ë: 'e', ç: 'c', ś: 's', ź: 'z',
  Č: 'c', Ć: 'c', Š: 's', Ž: 'z', Đ: 'dj', Ë: 'e', Ç: 'c',
};

export function slugify(input: string) {
  return input
    .split('')
    .map((ch) => MAP[ch] ?? ch)
    .join('')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Deterministic PRNG (mulberry32) — demo data is stable for a given seed. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

export function weighted<T>(items: readonly (readonly [T, number])[], r: () => number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Swap a local /images/x.webp path for its 640px sibling (/images/x-sm.webp). */
export function thumb(src: string | undefined) {
  if (!src) return '';
  if (src.startsWith('/images/') && src.endsWith('.webp') && !src.endsWith('-sm.webp')) {
    return src.replace(/\.webp$/, '-sm.webp');
  }
  return src;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function download(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A business detail that is actually filled in — not empty and not a seed placeholder like "81XXXXXXX". */
export function isFilled(value: string | undefined | null): value is string {
  return !!value && !!value.trim() && !/X{3,}/i.test(value);
}
