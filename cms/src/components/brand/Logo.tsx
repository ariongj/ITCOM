import { cn } from '@/lib/utils';

/*
 * ITCOM identity: a monitor in a rounded square (as in the shop header) and the ITCOM wordmark in Manrope ExtraBold.
 * One SVG, so it scales with its height class.
 */
type Tone = 'dark' | 'light';

function Mark({ tone }: { tone: Tone }) {
  const tile = tone === 'dark' ? '#0b0c0f' : '#ffffff';
  const ink = tone === 'dark' ? '#ffffff' : '#0b0c0f';
  return (
    <>
      <rect x="0" y="0" width="48" height="48" rx="12" fill={tile} />
      <g fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="11" y="12" width="26" height="18" rx="2.5" />
        <path d="M19 37h10M24 30v7" />
      </g>
    </>
  );
}

/** Mark + ITCOM wordmark. `accent` is accepted for compatibility (dark grounds use tone="light"). */
export function Logo({ className, tone = 'dark' }: { className?: string; tone?: Tone; accent?: boolean }) {
  const ink = tone === 'dark' ? 'var(--color-ink)' : '#ffffff';
  return (
    <svg viewBox="0 0 176 48" className={cn('h-11 w-auto', className)} role="img" aria-label="ITCOM">
      <Mark tone={tone} />
      <text x="58" y="36" fill={ink} style={{ font: '800 31px "Manrope Variable", Manrope, system-ui, sans-serif', letterSpacing: '-0.02em' }}>ITCOM</text>
    </svg>
  );
}

export function LogoMark({ className, tone = 'dark' }: { className?: string; tone?: Tone; accent?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-8 w-auto', className)} aria-hidden>
      <Mark tone={tone} />
    </svg>
  );
}
