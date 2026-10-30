import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router';
import { confirmDialog } from '@/admin/components/kit';
import { useDict } from '@/i18n';
import { ed } from './i18n';

/**
 * Local editing copy of a stored record.
 * `source` is the record from the store (undefined while creating a new one).
 */
export function useDraft<T>(source: T | undefined, blank: () => T) {
  const [initial] = useState<T>(() => source ?? blank());
  const base = source ?? initial;
  const [draft, setDraft] = useState<T>(base);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(base), [draft, base]);
  const patch = useCallback((p: Partial<T>) => setDraft((d) => ({ ...d, ...p })), []);
  const reset = useCallback(() => setDraft(base), [base]);
  return { draft, setDraft, patch, dirty, reset };
}

/** Ctrl/Cmd + S anywhere on the page. */
export function useSaveShortcut(fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        ref.current();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}

/**
 * Ask before leaving an editor with unsaved changes (in-app navigation + tab close).
 * Call `allowNext()` right before a programmatic navigation that should not be blocked.
 */
export function useUnsavedGuard(dirty: boolean) {
  const t = useDict(ed, 'admin');
  const dirtyRef = useRef(dirty);
  const bypass = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
      !bypass.current && dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    let alive = true;
    confirmDialog({ title: t('leaveTitle'), text: t('leaveText'), confirmLabel: t('leave'), danger: true }).then((ok) => {
      if (!alive) return;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
    return () => {
      alive = false;
    };
  }, [blocker, t]);

  useEffect(() => {
    if (!dirty) return;
    const fn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, [dirty]);

  return useCallback(() => {
    bypass.current = true;
  }, []);
}

/** "Ctrl S" / "⌘ S" label for the save shortcut hint. */
export function useSaveKeyLabel() {
  return useMemo(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ S' : 'Ctrl S'), []);
}

/** Rough word count of a markdown string. */
export function countWords(md: string) {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_`-]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export const readMinutesFor = (md: string) => Math.max(1, Math.round(countWords(md) / 200));
