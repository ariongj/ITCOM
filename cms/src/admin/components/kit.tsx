import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { Link } from 'react-router';
import { create } from 'zustand';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Search, AlertTriangle } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/misc';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { useDict } from '@/i18n';
import { common } from '@/i18n/common';
import { adm } from '@/admin/i18n';
import type { InquiryStatus, OrderStatus, PaymentStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* Page header                                                         */
/* ------------------------------------------------------------------ */
/** A breadcrumb step: plain text, or a link back to a parent screen. */
export type Crumb = string | { label: string; to: string };

/**
 * Screen header (PDF p.07/p.12): breadcrumb ("Produktet / Të gjitha"), title + badge, description, actions on the right.
 *
 *   <PageHeader breadcrumbs={[ta('nav_products'), ta('all')]} title={ta('nav_products')} actions={…} />
 *   <PageHeader breadcrumbs={[{ label: ta('nav_offers'), to: '/admin/ponude' }, l(offer.name)]} back="/admin/ponude" … />
 *
 * `back` (a link above the title) still works; when both are given, the back arrow sits in front of the breadcrumb.
 */
export function PageHeader({ title, description, actions, back, badge, breadcrumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: string; badge?: ReactNode; breadcrumbs?: Crumb[] }) {
  const t = useDict(adm, 'admin');
  const crumbs = breadcrumbs?.filter((c) => (typeof c === 'string' ? c : c.label)) ?? [];
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {crumbs.length > 0 ? (
          <nav aria-label={t('breadcrumb')} className="mb-1.5 flex min-w-0 items-center gap-1 text-[13px] text-muted">
            {back && (
              <Link to={back} title={t('back')} aria-label={t('back')} className="-ml-1 mr-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink">
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
            )}
            <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <li key={i} className="flex min-w-0 items-center gap-1">
                    {typeof c === 'string' ? (
                      <span className={cn('truncate', last && 'text-ink-soft')} aria-current={last ? 'page' : undefined}>
                        {c}
                      </span>
                    ) : (
                      <Link to={c.to} className="truncate transition-colors hover:text-ink hover:underline hover:underline-offset-2">
                        {c.label}
                      </Link>
                    )}
                    {!last && <span className="text-ink/25" aria-hidden>/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : (
          back && (
            <Link to={back} className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5" /> {t('back')}
            </Link>
          )
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-ink sm:text-[26px]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 max-w-2xl text-[13.5px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
export function Card({ title, description, actions, children, className, bodyClassName, padded = true }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; bodyClassName?: string; padded?: boolean }) {
  return (
    <section className={cn('rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]', className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Table primitives                                                    */
/* ------------------------------------------------------------------ */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px]">{children}</table>
    </div>
  );
}
export function Th({ children, className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn('whitespace-nowrap border-b border-line bg-canvas/60 px-4 py-2.5 text-[12.5px] font-semibold text-muted first:pl-5 last:pr-5', className)} {...rest}>
      {children}
    </th>
  );
}
export function Td({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-line/70 px-4 py-2.5 align-middle text-ink first:pl-5 last:pr-5', className)} {...rest}>
      {children}
    </td>
  );
}
export function Tr({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr onClick={onClick} className={cn('transition-colors', onClick && 'cursor-pointer hover:bg-canvas/70', className)}>
      {children}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Search + filter pills                                               */
/* ------------------------------------------------------------------ */
export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const t = useDict(adm, 'admin');
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('search')}
        className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
      />
    </div>
  );
}

export function FilterPills<T extends string>({ options, value, onChange, className }: { options: { id: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('no-scrollbar flex gap-1.5 overflow-x-auto', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors',
            value === o.id ? 'bg-ink text-paper' : 'bg-white text-ink-soft ring-1 ring-line hover:text-ink',
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', value === o.id ? 'bg-white/15' : 'bg-canvas')}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status badges                                                       */
/* ------------------------------------------------------------------ */
export const ORDER_STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  new: 'brand',
  confirmed: 'blue',
  processing: 'amber',
  shipped: 'violet',
  installation: 'violet',
  completed: 'green',
  cancelled: 'gray',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tc = useDict(common, 'admin');
  return (
    <Badge tone={ORDER_STATUS_TONE[status]} dot>
      {tc(`status_${status}`)}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const tc = useDict(common, 'admin');
  const tone: BadgeTone = status === 'paid' ? 'green' : status === 'refunded' ? 'gray' : 'amber';
  return <Badge tone={tone}>{tc(`paystatus_${status}`)}</Badge>;
}

export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  const tc = useDict(common, 'admin');
  const tone: BadgeTone = status === 'new' ? 'brand' : status === 'contacted' ? 'blue' : status === 'scheduled' ? 'violet' : 'green';
  return (
    <Badge tone={tone} dot>
      {tc(`inqstatus_${status}`)}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky save bar for editors with unsaved changes                    */
/* ------------------------------------------------------------------ */
export function SaveBar({ dirty, onSave, onDiscard, saving }: { dirty: boolean; onSave: () => void; onDiscard: () => void; saving?: boolean }) {
  const t = useDict(adm, 'admin');
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="fixed bottom-5 left-1/2 z-50 flex w-[min(560px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-paper shadow-2xl lg:left-[calc(50%+120px)]"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            {t('unsaved')}
          </span>
          <span className="flex gap-2">
            <Button size="sm" variant="ghost" shape="rounded" className="text-paper hover:bg-white/10" onClick={onDiscard}>
              {t('discard')}
            </Button>
            <Button size="sm" variant="light" shape="rounded" loading={saving} onClick={onSave}>
              {t('save')}
            </Button>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Promise-based confirm dialog: `if (await confirm({...})) …`          */
/* ------------------------------------------------------------------ */
interface ConfirmState {
  open: boolean;
  title?: ReactNode;
  text?: ReactNode;
  confirmLabel?: ReactNode;
  danger?: boolean;
  resolve?: (v: boolean) => void;
}
const useConfirmStore = create<ConfirmState>(() => ({ open: false }));

export function confirmDialog(opts: { title?: ReactNode; text?: ReactNode; confirmLabel?: ReactNode; danger?: boolean } = {}) {
  return new Promise<boolean>((resolve) => useConfirmStore.setState({ open: true, danger: true, ...opts, resolve }));
}

export function ConfirmHost() {
  const s = useConfirmStore();
  const t = useDict(adm, 'admin');
  const close = (v: boolean) => {
    s.resolve?.(v);
    useConfirmStore.setState({ open: false, resolve: undefined });
  };
  return (
    <Modal
      open={s.open}
      onClose={() => close(false)}
      size="sm"
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={() => close(false)}>
            {t('cancel')}
          </Button>
          <Button variant={s.danger ? 'danger' : 'primary'} shape="rounded" size="sm" onClick={() => close(true)}>
            {s.confirmLabel ?? (s.danger ? t('delete') : t('yes'))}
          </Button>
        </>
      }
    >
      <div className="flex gap-4 px-6 py-6">
        <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full', s.danger ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700')}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-ink">{s.title ?? t('confirmDelete')}</h3>
          <p className="mt-1 text-sm text-muted">{s.text ?? t('confirmDeleteText')}</p>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
export function KV({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2 text-sm', className)}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  );
}

export function Thumb({ src, className }: { src?: string; className?: string }) {
  return <span className={cn('block h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sand ring-1 ring-line', className)}>{src && <img src={src.startsWith('/images/') ? src.replace(/\.webp$/, '-sm.webp') : src} alt="" className="h-full w-full object-cover" loading="lazy" />}</span>;
}
