import { ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { useDict } from '@/i18n';
import { discountClass } from '@/lib/discounts';
import type { DiscountKind } from '@/lib/types';
import { cn } from '@/lib/utils';
import { dd } from './i18n';
import { KIND_ICON, KINDS } from './meta';

/** The four checkout mechanisms (PDF p.20) with a one-line explanation each. */
export function TypeGrid({ onChoose, current, className }: { onChoose: (k: DiscountKind) => void; current?: DiscountKind; className?: string }) {
  const t = useDict(dd, 'admin');
  return (
    <ul className={cn('grid gap-2.5 sm:grid-cols-2', className)}>
      {KINDS.map((k) => {
        const Icon = KIND_ICON[k];
        const on = current === k;
        return (
          <li key={k}>
            <button
              type="button"
              onClick={() => onChoose(k)}
              aria-pressed={on}
              className={cn(
                'group flex h-full w-full items-start gap-3.5 rounded-xl border bg-white p-4 text-left transition-[border-color,box-shadow]',
                on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/35 hover:shadow-[0_2px_10px_-4px_rgb(0_0_0/0.12)]',
              )}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-canvas text-ink ring-1 ring-inset ring-line">
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[14.5px] font-semibold text-ink">{t(`kind_${k}`)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{t(`kindHint_${k}`)}</span>
                <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                  <span className="font-mono">{t(`ex_${k}`)}</span>
                  <span aria-hidden className="text-ink/20">·</span>
                  <span>{t('classLabel', { c: t(`cls_${discountClass({ kind: k })}`) })}</span>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TypeChooser({ open, onClose, onChoose }: { open: boolean; onClose: () => void; onChoose: (k: DiscountKind) => void }) {
  const t = useDict(dd, 'admin');
  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('chooseTitle')} description={t('chooseText')}>
      <div className="p-4 sm:p-6">
        <TypeGrid onChoose={onChoose} />
      </div>
    </Modal>
  );
}
