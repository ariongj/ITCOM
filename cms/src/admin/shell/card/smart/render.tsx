import { Box } from 'lucide-react';
import { useDict } from '@/i18n';
import { common } from '@/i18n/common';
import { cn } from '@/lib/utils';

/**
 * Smart-glasses pictures are our own 3D renders, not brand photography (we have no rights to those) — they carry a
 * small honest "3D render" chip wherever they appear. Matches with or without the deploy base ("/optika/images/smart/…").
 */
export const isRender = (src?: string | null) => !!src && /\/images\/(?:smart\/|cat\/smart)/.test(src);

/** Small "Render 3D" label laid over a rendered image (light chip on light renders, glass chip on dark ones). */
export function RenderChip({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const tc = useDict(common);
  return (
    <span
      className={cn(
        'pointer-events-none inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em] backdrop-blur',
        tone === 'dark' ? 'bg-black/35 text-white/80 ring-1 ring-white/15' : 'bg-white/85 text-ink-soft shadow-sm ring-1 ring-ink/10',
        className,
      )}
    >
      <Box className="h-3 w-3" />
      {tc('render3d')}
    </span>
  );
}
