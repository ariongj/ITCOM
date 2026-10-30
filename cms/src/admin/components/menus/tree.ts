// Immutable operations on a menu's items — one level of sub-items (PDF p.36 "renditje dhe nënmenu").
import type { MenuItem } from '@/lib/types';
import { validUrl } from './links';

export interface Located {
  item: MenuItem;
  /** id of the parent, null for a top-level item */
  parentId: string | null;
  index: number;
  siblings: MenuItem[];
}

export function locate(items: MenuItem[], id: string): Located | null {
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.id === id) return { item: it, parentId: null, index: i, siblings: items };
    const kids = it.children ?? [];
    const j = kids.findIndex((c) => c.id === id);
    if (j >= 0) return { item: kids[j], parentId: it.id, index: j, siblings: kids };
  }
  return null;
}

/** Replace the sibling list that contains `id`. */
function withSiblings(items: MenuItem[], parentId: string | null, next: MenuItem[]): MenuItem[] {
  if (parentId === null) return next;
  return items.map((it) => (it.id === parentId ? { ...it, children: next } : it));
}

export function updateItem(items: MenuItem[], id: string, patch: Partial<MenuItem>): MenuItem[] {
  const loc = locate(items, id);
  if (!loc) return items;
  return withSiblings(items, loc.parentId, loc.siblings.map((x) => (x.id === id ? { ...x, ...patch } : x)));
}

export function removeItem(items: MenuItem[], id: string): MenuItem[] {
  const loc = locate(items, id);
  if (!loc) return items;
  return withSiblings(items, loc.parentId, loc.siblings.filter((x) => x.id !== id));
}

export function addItem(items: MenuItem[], item: MenuItem, parentId: string | null = null): MenuItem[] {
  if (parentId === null) return [...items, item];
  return items.map((it) => (it.id === parentId ? { ...it, children: [...(it.children ?? []), item] } : it));
}

/** Move up / down among its siblings. */
export function moveItem(items: MenuItem[], id: string, dir: -1 | 1): MenuItem[] {
  const loc = locate(items, id);
  if (!loc) return items;
  const to = loc.index + dir;
  if (to < 0 || to >= loc.siblings.length) return items;
  const next = [...loc.siblings];
  [next[loc.index], next[to]] = [next[to], next[loc.index]];
  return withSiblings(items, loc.parentId, next);
}

/** Drag & drop inside the same sibling list: put `id` before / after `targetId`. */
export function moveNextTo(items: MenuItem[], id: string, targetId: string, after: boolean): MenuItem[] {
  const a = locate(items, id);
  const b = locate(items, targetId);
  if (!a || !b || a.parentId !== b.parentId || id === targetId) return items;
  const next = a.siblings.filter((x) => x.id !== id);
  const at = next.findIndex((x) => x.id === targetId) + (after ? 1 : 0);
  next.splice(at, 0, a.item);
  return withSiblings(items, a.parentId, next);
}

/** Top-level item without children → last sub-item of the previous top-level item. */
export function canIndent(items: MenuItem[], id: string) {
  const loc = locate(items, id);
  return !!loc && loc.parentId === null && loc.index > 0 && !(loc.item.children ?? []).length;
}

export function indentItem(items: MenuItem[], id: string): MenuItem[] {
  if (!canIndent(items, id)) return items;
  const loc = locate(items, id)!;
  const prev = items[loc.index - 1];
  return items.filter((x) => x.id !== id).map((x) => (x.id === prev.id ? { ...x, children: [...(x.children ?? []), loc.item] } : x));
}

/** Sub-item → top-level, right after its former parent. */
export function outdentItem(items: MenuItem[], id: string): MenuItem[] {
  const loc = locate(items, id);
  if (!loc || loc.parentId === null) return items;
  const out: MenuItem[] = [];
  for (const it of items) {
    if (it.id === loc.parentId) {
      out.push({ ...it, children: (it.children ?? []).filter((c) => c.id !== id) });
      out.push(loc.item);
    } else out.push(it);
  }
  return out;
}

export const countItems = (items: MenuItem[]) => items.reduce((n, it) => n + 1 + (it.children?.length ?? 0), 0);

/* ------------------------------------------------------------------ */
/* Validation (label in SQ required, destination required, URL format)  */
/* ------------------------------------------------------------------ */
export type ItemError = 'label' | 'target' | 'url';

export function itemErrors(it: Pick<MenuItem, 'label' | 'type' | 'target'>): ItemError[] {
  const out: ItemError[] = [];
  if (!it.label.sq.trim()) out.push('label');
  if (it.type === 'url') {
    if (!validUrl(it.target)) out.push('url');
  } else if (!it.target.trim()) out.push('target');
  return out;
}

/** id → errors, for every item (sub-items included) that has at least one. */
export function menuErrors(items: MenuItem[]): Map<string, ItemError[]> {
  const out = new Map<string, ItemError[]>();
  const visit = (it: MenuItem) => {
    const e = itemErrors(it);
    if (e.length) out.set(it.id, e);
    (it.children ?? []).forEach(visit);
  };
  items.forEach(visit);
  return out;
}
