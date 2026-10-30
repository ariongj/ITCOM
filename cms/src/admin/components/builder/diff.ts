import type { HomeSection } from '@/lib/types';

export type RowChange = 'new' | 'changed' | null;

/** JSON of each section by id — used to compare a draft (or an old version) with the live homepage. */
export function jsonById(list: HomeSection[]) {
  return new Map(list.map((s) => [s.id, JSON.stringify(s)]));
}

/** Per-row marker in the section list: not on the live page yet, or different from it. */
export function rowChange(s: HomeSection, live: Map<string, string>): RowChange {
  const l = live.get(s.id);
  if (l === undefined) return 'new';
  return l === JSON.stringify(s) ? null : 'changed';
}

export interface VersionDiff {
  /** Sections in `a` that `b` doesn't have */
  added: HomeSection[];
  /** Sections in `b` that `a` doesn't have */
  removed: HomeSection[];
  /** Present in both, hidden in `a` but visible in `b` */
  hidden: HomeSection[];
  /** Present in both, visible in `a` but hidden in `b` */
  shown: HomeSection[];
  /** Same id, different content (visibility aside) */
  content: number;
  reordered: boolean;
  same: boolean;
}

/** How version `a` differs from `b` (usually: an old version vs. the live page). */
export function diffVersions(a: HomeSection[], b: HomeSection[]): VersionDiff {
  const bById = new Map(b.map((s) => [s.id, s]));
  const aIds = new Set(a.map((s) => s.id));
  const added = a.filter((s) => !bById.has(s.id));
  const removed = b.filter((s) => !aIds.has(s.id));
  const hidden: HomeSection[] = [];
  const shown: HomeSection[] = [];
  let content = 0;
  for (const s of a) {
    const o = bById.get(s.id);
    if (!o) continue;
    if (s.enabled !== o.enabled) (s.enabled ? shown : hidden).push(s);
    if (JSON.stringify(s.data) !== JSON.stringify(o.data)) content++;
  }
  const common = (list: HomeSection[], other: Set<string>) => list.filter((s) => other.has(s.id)).map((s) => s.id).join('|');
  const reordered = common(a, new Set(b.map((s) => s.id))) !== common(b, aIds);
  const same = !added.length && !removed.length && !hidden.length && !shown.length && !content && !reordered;
  return { added, removed, hidden, shown, content, reordered, same };
}

/** Sections changed between a draft and the live page (new + changed + removed). */
export function changedCount(draft: HomeSection[], live: HomeSection[]) {
  const l = jsonById(live);
  const ids = new Set(draft.map((s) => s.id));
  let n = 0;
  for (const s of draft) if (rowChange(s, l)) n++;
  for (const s of live) if (!ids.has(s.id)) n++;
  return n;
}
