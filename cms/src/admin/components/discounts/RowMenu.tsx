import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Ellipsis, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  divider?: boolean;
  /** Shown but not clickable, with a reason (permissions) */
  disabledTip?: string;
}

/** "⋯" row menu, rendered in a portal so table overflow never clips it. */
export function RowMenu({ items, label }: { items: RowAction[]; label: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < items.length * 40 + 48;
    setPos({ x: Math.max(8, window.innerWidth - r.right), y: up ? window.innerHeight - r.top + 6 : r.bottom + 6, up });
  };

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent | TouchEvent) => {
      const n = e.target as Node;
      if (!menu.current?.contains(n) && !btn.current?.contains(n)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={cn('grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink', pos && 'bg-ink/[0.06] text-ink')}
      >
        <Ellipsis className="h-4 w-4" />
      </button>
      {createPortal(
        <AnimatePresence>
          {pos && (
            <motion.div
              ref={menu}
              role="menu"
              initial={{ opacity: 0, scale: 0.97, y: pos.up ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              style={{ position: 'fixed', right: pos.x, ...(pos.up ? { bottom: pos.y } : { top: pos.y }), transformOrigin: pos.up ? 'bottom right' : 'top right' }}
              className="z-[70] min-w-[200px] rounded-xl border border-black/10 bg-white p-1 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.35)]"
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((it, i) => {
                const Icon = it.icon;
                return (
                  <div key={i}>
                    {it.divider && <div className="my-1 h-px bg-line/80" />}
                    <button
                      type="button"
                      role="menuitem"
                      aria-disabled={!!it.disabledTip || undefined}
                      title={it.disabledTip}
                      onClick={() => {
                        if (it.disabledTip) return;
                        setPos(null);
                        it.onSelect();
                      }}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition-colors',
                        it.disabledTip ? 'cursor-not-allowed text-muted/70' : it.danger ? 'text-red-600 hover:bg-red-50' : 'text-ink hover:bg-canvas',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      {it.label}
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
