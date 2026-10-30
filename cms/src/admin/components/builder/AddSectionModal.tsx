import { Lock, Plus } from 'lucide-react';
import type { HomeSection, HomeSectionType } from '@/lib/types';
import { Modal } from '@/components/ui/Overlay';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import { B } from './i18n';
import { SECTION_META } from './meta';
import { CATALOG, SCHEMA, countOf } from './catalog';

/** "+ Shto seksion": catalogue of allowed section types with their schema and per-page limit. */
export function AddSectionModal({
  open,
  onClose,
  sections,
  afterName,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  sections: HomeSection[];
  /** Name of the section the new one is inserted after (null = end of page) */
  afterName: string | null;
  onAdd: (type: HomeSectionType) => void;
}) {
  const t = useDict(B, 'admin');
  // Types that can still be added first, then the ones at their limit (catalogue order kept inside each group)
  const order = [...CATALOG].sort((a, b) => Number(countOf(sections, a) >= SCHEMA[a].max) - Number(countOf(sections, b) >= SCHEMA[b].max));
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('catTitle')}
      description={t('catText')}
      footer={<p className="mr-auto text-[12.5px] text-muted">{afterName ? t('catWhere', { name: afterName }) : t('catWhereEnd')}</p>}
    >
      <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5">
        {order.map((type) => {
          const meta = SECTION_META[type];
          const Icon = meta.icon;
          const schema = SCHEMA[type];
          const n = countOf(sections, type);
          const full = n >= schema.max;
          return (
            <button
              key={type}
              type="button"
              disabled={full}
              onClick={() => onAdd(type)}
              className={cn(
                'group flex flex-col gap-2.5 rounded-xl border bg-white p-3.5 text-left outline-none transition',
                full ? 'cursor-not-allowed border-line/70 bg-[#FAFAFA]' : 'border-line hover:border-ink/30 hover:shadow-[0_6px_18px_-12px_rgb(0_0_0/0.35)] focus-visible:ring-2 focus-visible:ring-ink/25',
              )}
            >
              <span className="flex items-start gap-3">
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset', meta.tone, full && 'opacity-50')}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[14px] font-semibold', full ? 'text-ink/50' : 'text-ink')}>{t(`type_${type}`)}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{t(`desc_${type}`)}</span>
                </span>
              </span>
              <span className="flex flex-wrap gap-1">
                {schema.fields.map((f) => (
                  <span key={f} className="rounded border border-line/80 bg-[#F7F7F7] px-1.5 text-[11px] leading-[18px] text-ink-soft">
                    {t(f)}
                  </span>
                ))}
              </span>
              <span className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-2.5 text-[12px]">
                <span className="tabular-nums text-muted">{t('catUsage', { n, max: schema.max })}</span>
                {full ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-muted">
                    <Lock className="h-3.5 w-3.5" /> {t('catFull')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-ink px-2 py-1 font-semibold text-white transition group-hover:bg-black">
                    <Plus className="h-3.5 w-3.5" /> {t('catAdd')}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
