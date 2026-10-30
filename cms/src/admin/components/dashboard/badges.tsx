import type { ReactNode } from 'react';
import { useDict } from '@/i18n';
import type { FulfillmentState, PaymentState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { D } from './i18n';

/**
 * Status = text + symbol, never colour alone (PDF p.07). The symbol's fill tells how far along a state is:
 * ○ open · ◐ partly · ● done · ✓ delivered · ↺ refunded · ✕ failed. Colour only tints what needs action.
 */
export type StatusSymbol = 'open' | 'partial' | 'done' | 'check' | 'back' | 'fail';
export type StatusTone = 'neutral' | 'attention' | 'critical';

const TONE: Record<StatusTone, string> = {
  neutral: 'bg-[#ebebeb] text-[#303030]',
  attention: 'bg-[#fff1cc] text-[#5c4400]',
  critical: 'bg-[#fde6e4] text-[#8e1f0b]',
};

export function StatusIcon({ kind, className }: { kind: StatusSymbol; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" className={cn('h-3 w-3 shrink-0', className)} aria-hidden>
      {kind === 'open' && <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.2 1.6" />}
      {kind === 'partial' && (
        <>
          <circle cx="6" cy="6" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 1.75a4.25 4.25 0 0 1 0 8.5z" fill="currentColor" />
        </>
      )}
      {kind === 'done' && <circle cx="6" cy="6" r="5" fill="currentColor" />}
      {kind === 'check' && (
        <>
          <circle cx="6" cy="6" r="5.5" fill="currentColor" />
          <path d="M3.6 6.1l1.6 1.6 3.2-3.3" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'back' && (
        <path d="M3.2 4.2h4a2.6 2.6 0 0 1 0 5.2H4.6M3.2 4.2l1.8-1.8M3.2 4.2L5 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === 'fail' && (
        <>
          <circle cx="6" cy="6" r="5.5" fill="currentColor" />
          <path d="M4.2 4.2l3.6 3.6M7.8 4.2L4.2 7.8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function StatusPill({ symbol, tone = 'neutral', children, className }: { symbol: StatusSymbol; tone?: StatusTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 pl-1.5 pr-2.5 text-[12px] font-medium leading-5', TONE[tone], className)}>
      <StatusIcon kind={symbol} />
      <span className="truncate">{children}</span>
    </span>
  );
}

const PAY: Record<PaymentState, { symbol: StatusSymbol; tone: StatusTone }> = {
  pending: { symbol: 'open', tone: 'attention' },
  authorized: { symbol: 'partial', tone: 'attention' },
  paid: { symbol: 'done', tone: 'neutral' },
  partially_refunded: { symbol: 'partial', tone: 'neutral' },
  refunded: { symbol: 'back', tone: 'neutral' },
  failed: { symbol: 'fail', tone: 'critical' },
};

const FULFIL: Record<FulfillmentState, { symbol: StatusSymbol; tone: StatusTone }> = {
  unfulfilled: { symbol: 'open', tone: 'attention' },
  partial: { symbol: 'partial', tone: 'attention' },
  fulfilled: { symbol: 'done', tone: 'neutral' },
  delivered: { symbol: 'check', tone: 'neutral' },
};

/** Payment state badge — feed it `paymentOf(order)`. */
export function PaymentBadge({ state }: { state: PaymentState }) {
  const t = useDict(D, 'admin');
  const m = PAY[state];
  return (
    <StatusPill symbol={m.symbol} tone={m.tone}>
      {t(`pay_${state}`)}
    </StatusPill>
  );
}

/** Fulfilment state badge — feed it `fulfillmentOf(order)`. */
export function FulfillmentBadge({ state }: { state: FulfillmentState }) {
  const t = useDict(D, 'admin');
  const m = FULFIL[state];
  return (
    <StatusPill symbol={m.symbol} tone={m.tone}>
      {t(`ff_${state}`)}
    </StatusPill>
  );
}
