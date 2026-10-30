import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { common } from '@/i18n/common';
import { useUi } from '@/store/ui';

/** Close-button label in the language of the current area (CMS under html[data-admin], storefront otherwise). */
function useCloseLabel() {
  const site = useUi((s) => s.lang);
  const admin = useUi((s) => s.adminLang);
  return common[document.documentElement.hasAttribute('data-admin') ? admin : site].close;
}

function useLockBody(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);
}

export function Drawer({
  open,
  onClose,
  side = 'right',
  children,
  className,
  title,
  footer,
  width = 'max-w-[440px]',
}: {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'left';
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useLockBody(open);
  useEsc(open, onClose);
  const closeLabel = useCloseLabel();
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={cn(
              'absolute top-0 bottom-0 flex w-full flex-col bg-paper shadow-2xl',
              side === 'right' ? 'right-0' : 'left-0',
              width,
              className,
            )}
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
          >
            {title !== undefined && (
              <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
                <div className="min-w-0 text-lg font-semibold">{title}</div>
                <button onClick={onClose} className="-mr-2 grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={closeLabel}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-line bg-white/60 px-5 py-4 sm:px-6">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Modal({
  open,
  onClose,
  children,
  title,
  description,
  footer,
  size = 'md',
  className,
}: {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}) {
  useLockBody(open);
  useEsc(open, onClose);
  const closeLabel = useCloseLabel();
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-[1200px]' }[size];
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl', w, className)}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                <div className="min-w-0">
                  {title && <h2 className="text-lg font-bold text-ink">{title}</h2>}
                  {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                </div>
                <button onClick={onClose} className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-ink/5" aria-label={closeLabel}>
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/60 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
