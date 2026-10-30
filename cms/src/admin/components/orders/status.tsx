// Neutral status badges for the orders area (PDF p.07: statuses use text + a symbol, never colour alone).
// Payment, fulfilment and returns are separate states (PDF p.17) — each gets its own badge.
import type { ReactNode } from 'react';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import type { DraftOrder, FulfillmentState, PaymentState, ReturnStatus } from '@/lib/types';
import { od } from './dict';

export type Glyph = 'ring' | 'half' | 'dot' | 'check' | 'cross' | 'dash';
export type PillTone = 'attention' | 'neutral' | 'subtle' | 'critical' | 'outline';

const TONE: Record<PillTone, string> = {
  // functional yellow for "needs action" (Shopify-like), greys for done states — no decorative colour
  attention: 'bg-[#FFF1C2] text-[#4A3A00]',
  neutral: 'bg-[#E6E6E6] text-[#2B2B2B]',
  subtle: 'bg-[#F3F3F3] text-[#5C5C5C]',
  critical: 'bg-[#FDE3DF] text-[#8A1B0A]',
  outline: 'bg-white text-[#303030] ring-1 ring-inset ring-[#D4D4D4]',
};

/** 10px symbol so a status is readable without colour. */
export function StatusGlyph({ glyph, className }: { glyph: Glyph; className?: string }) {
  const c = cn('h-2.5 w-2.5 shrink-0', className);
  switch (glyph) {
    case 'ring':
      return (
        <svg viewBox="0 0 10 10" className={c} aria-hidden>
          <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'dash':
      return (
        <svg viewBox="0 0 10 10" className={c} aria-hidden>
          <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.6" />
        </svg>
      );
    case 'half':
      return (
        <svg viewBox="0 0 10 10" className={c} aria-hidden>
          <circle cx="5" cy="5" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 1.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor" />
        </svg>
      );
    case 'dot':
      return (
        <svg viewBox="0 0 10 10" className={c} aria-hidden>
          <circle cx="5" cy="5" r="4" fill="currentColor" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 10 10" className={c} aria-hidden>
          <circle cx="5" cy="5" r="4.6" fill="currentColor" />
          <path d="M3 5.2l1.4 1.4L7.1 3.8" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'cross':
      return (
        <svg viewBox="0 0 10 10" className={c} aria-hidden>
          <circle cx="5" cy="5" r="4.6" fill="currentColor" />
          <path d="M3.4 3.4l3.2 3.2M6.6 3.4L3.4 6.6" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
  }
}

export function StatusPill({ tone, glyph, icon, children, className }: { tone: PillTone; glyph?: Glyph; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold leading-none', TONE[tone], className)}>
      {icon ?? (glyph && <StatusGlyph glyph={glyph} />)}
      {children}
    </span>
  );
}

const PAY: Record<PaymentState, [PillTone, Glyph]> = {
  pending: ['attention', 'ring'],
  authorized: ['attention', 'half'],
  paid: ['neutral', 'dot'],
  partially_refunded: ['subtle', 'half'],
  refunded: ['subtle', 'ring'],
  failed: ['critical', 'cross'],
};

export function PayBadge({ state, className }: { state: PaymentState; className?: string }) {
  const t = useDict(od, 'admin');
  const [tone, glyph] = PAY[state];
  return (
    <StatusPill tone={tone} glyph={glyph} className={className}>
      {t(`pay_${state}`)}
    </StatusPill>
  );
}

const FUL: Record<FulfillmentState, [PillTone, Glyph]> = {
  unfulfilled: ['attention', 'ring'],
  partial: ['attention', 'half'],
  fulfilled: ['neutral', 'dot'],
  delivered: ['neutral', 'check'],
};

export function FulfilBadge({ state, className }: { state: FulfillmentState; className?: string }) {
  const t = useDict(od, 'admin');
  const [tone, glyph] = FUL[state];
  return (
    <StatusPill tone={tone} glyph={glyph} className={className}>
      {t(`ful_${state}`)}
    </StatusPill>
  );
}

const RET: Record<ReturnStatus, [PillTone, Glyph]> = {
  requested: ['attention', 'ring'],
  approved: ['attention', 'half'],
  received: ['outline', 'dot'],
  refunded: ['neutral', 'check'],
  rejected: ['subtle', 'cross'],
};

export function ReturnBadge({ status, className }: { status: ReturnStatus; className?: string }) {
  const t = useDict(od, 'admin');
  const [tone, glyph] = RET[status];
  return (
    <StatusPill tone={tone} glyph={glyph} className={className}>
      {t(`ret_${status}`)}
    </StatusPill>
  );
}

const DRAFT: Record<DraftOrder['status'], [PillTone, Glyph]> = {
  open: ['attention', 'ring'],
  invoice_sent: ['outline', 'half'],
  converted: ['neutral', 'check'],
};

export function DraftBadge({ status, className }: { status: DraftOrder['status']; className?: string }) {
  const t = useDict(od, 'admin');
  const [tone, glyph] = DRAFT[status];
  return (
    <StatusPill tone={tone} glyph={glyph} className={className}>
      {t(`draft_${status}`)}
    </StatusPill>
  );
}

export function CancelledBadge() {
  const t = useDict(od, 'admin');
  return (
    <StatusPill tone="critical" glyph="cross">
      {t('cancelled')}
    </StatusPill>
  );
}

export function ArchivedBadge() {
  const t = useDict(od, 'admin');
  return (
    <StatusPill tone="outline" glyph="dash">
      {t('archived')}
    </StatusPill>
  );
}
