import { useEffect, type RefObject } from 'react';

/** Close a dropdown on an outside mousedown / touch or on Escape. */
export function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, ref]);
}

/** Lock page scroll while a drawer / dialog is open. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

/** "⌘" on Apple devices, "Ctrl" elsewhere — for the Ctrl/⌘+K hint. */
export const MOD_KEY = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';

/** Shared dropdown panel classes: full-width sheet under the top bar on phones, anchored popover from `sm`. */
export const DROPDOWN =
  'fixed inset-x-3 top-[60px] z-50 overflow-hidden rounded-xl border border-black/10 bg-white text-ink shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2';
