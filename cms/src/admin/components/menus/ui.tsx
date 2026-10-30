// Small building blocks of the menu editor: status chips (text + symbol), type badge, storefront colour scope.
import type { ComponentType, CSSProperties } from 'react';
import { Archive, CalendarX, CircleCheck, CircleDashed, CirclePause, Clock3, EyeOff, TriangleAlert } from 'lucide-react';
import { StateChip } from '@/admin/components/editorial/ui';
import { useDict } from '@/i18n';
import { brandVars } from '@/lib/color';
import type { MenuItemType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { mn, TYPE_ICON } from './dict';
import type { LinkIssue } from './links';

const ISSUE: Record<LinkIssue, { icon: ComponentType<{ className?: string }>; tone: 'warn' | 'muted' | 'neutral' }> = {
  missing: { icon: TriangleAlert, tone: 'warn' },
  invalid: { icon: TriangleAlert, tone: 'warn' },
  draft: { icon: CircleDashed, tone: 'warn' },
  hidden: { icon: EyeOff, tone: 'muted' },
  scheduled: { icon: Clock3, tone: 'neutral' },
  expired: { icon: CalendarX, tone: 'muted' },
  paused: { icon: CirclePause, tone: 'muted' },
  archived: { icon: Archive, tone: 'muted' },
};

/** Why a link is not on the storefront — text + symbol. */
export function IssueChip({ issue, className }: { issue: LinkIssue; className?: string }) {
  const t = useDict(mn, 'admin');
  const s = ISSUE[issue];
  return (
    <StateChip icon={s.icon} tone={s.tone} className={className}>
      {t(`issue_${issue}`)}
    </StateChip>
  );
}

export function LiveChip({ className }: { className?: string }) {
  const t = useDict(mn, 'admin');
  return (
    <StateChip icon={CircleCheck} tone="ok" className={className}>
      {t('shown')}
    </StateChip>
  );
}

/** Rounded square with the link-type icon. */
export function TypeIcon({ type, size = 'md', className }: { type: MenuItemType; size?: 'sm' | 'md'; className?: string }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-lg bg-canvas text-ink-soft ring-1 ring-inset ring-line', size === 'sm' ? 'h-7 w-7' : 'h-8 w-8', className)}>
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
  );
}

/** Re-enables the warm Optika storefront palette inside the neutral CMS (live previews). */
export function storeVars(brandColor: string): CSSProperties {
  return {
    ...brandVars(brandColor),
    '--color-ink': '#1c1a17',
    '--color-ink-soft': '#3a3631',
    '--color-muted': '#6f675e',
    '--color-paper': '#f7f3ee',
    '--color-sand': '#efe7dc',
    '--color-line': '#e3d9cc',
  } as CSSProperties;
}
