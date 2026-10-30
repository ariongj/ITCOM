import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, ListPlus, Plus, X } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import type { L10n, Lang, ProductSpec } from '@/lib/types';
import { pd } from './dict';
import { IconBtn, LangTabs, MiniL10n, missingCounts } from './parts';

const L = (me: string, sq: string, en: string): L10n => ({ me, sq, en });
const empty = (): L10n => ({ me: '', sq: '', en: '' });

/** Common spec labels, ready-translated. */
const SUGGESTED: L10n[] = [
  L('Materijal', 'Materiali', 'Material'),
  L('Veličina', 'Madhësia', 'Size'),
  L('Širina okvira', 'Gjerësia e kornizës', 'Frame width'),
  L('Težina', 'Pesha', 'Weight'),
  L('UV zaštita', 'Mbrojtja UV', 'UV protection'),
  L('Garancija', 'Garancia', 'Warranty'),
];

export function SpecsEditor({ value, onChange }: { value: ProductSpec[]; onChange: (v: ProductSpec[]) => void }) {
  const t = useDict(pd, 'admin');
  const l = useL('admin');
  const adminLang = useLang('admin');
  const [lang, setLang] = useState<Lang>(adminLang);
  const missing = useMemo(() => missingCounts(value.flatMap((s) => [s.label, s.value])), [value]);

  // Specs have no ids — keep stable React keys alongside the rows so inputs keep focus while reordering.
  const keys = useRef<string[]>([]);
  const seq = useRef(0);
  while (keys.current.length < value.length) keys.current.push(`s${seq.current++}`);
  if (keys.current.length > value.length) keys.current.length = value.length;

  const set = (i: number, patch: Partial<ProductSpec>) => onChange(value.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const moveRow = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    const ks = keys.current;
    [ks[i], ks[j]] = [ks[j], ks[i]];
    onChange(next);
  };
  const removeRow = (i: number) => {
    keys.current.splice(i, 1);
    onChange(value.filter((_, k) => k !== i));
  };
  const add = (label: L10n = empty()) => onChange([...value, { label: { ...label }, value: empty() }]);
  const suggestions = SUGGESTED.filter((s) => !value.some((v) => v.label.sq.trim().toLowerCase() === s.sq.toLowerCase()));

  return (
    <Card title={t('c_specs')} description={t('c_specs_d')} actions={value.length > 0 && <LangTabs value={lang} onChange={setLang} missing={missing} title={t('langHint')} />} padded={false}>
      <div className="p-4 sm:p-5">
        {value.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-canvas/40 px-4 py-4 text-[13px] text-muted">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink-soft ring-1 ring-line">
              <ListPlus className="h-4 w-4" />
            </span>
            {t('noSpecs')}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="flex items-center gap-2 border-b border-line/70 bg-canvas/50 px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted max-sm:hidden">
              <span className="w-5 shrink-0" />
              <div className="flex min-w-0 flex-1 gap-2">
                <span className="w-[38%] shrink-0 pl-3">{t('specLabel')}</span>
                <span className="flex-1 pl-3">{t('specValue')}</span>
              </div>
              <span className="w-8 shrink-0" />
            </div>
            <div className="divide-y divide-line/60">
              <AnimatePresence initial={false}>
                {value.map((s, i) => (
                  <motion.div key={keys.current[i]} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex w-5 shrink-0 flex-col items-center text-muted">
                      <button type="button" aria-label={t('moveUp')} title={t('moveUp')} disabled={i === 0} onClick={() => moveRow(i, -1)} className="grid h-4 w-5 place-items-center rounded hover:text-ink disabled:opacity-25">
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label={t('moveDown')} title={t('moveDown')} disabled={i === value.length - 1} onClick={() => moveRow(i, 1)} className="grid h-4 w-5 place-items-center rounded hover:text-ink disabled:opacity-25">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:gap-2">
                      <MiniL10n value={s.label} lang={lang} onChange={(label) => set(i, { label })} placeholder={t('specLabel')} className="sm:w-[38%] sm:shrink-0 [&_input]:font-semibold" />
                      <MiniL10n value={s.value} lang={lang} onChange={(v) => set(i, { value: v })} placeholder={t('specValue')} className="flex-1" />
                    </div>
                    <IconBtn label={t('remove')} onClick={() => removeRow(i)} danger className="h-9">
                      <X className="h-4 w-4" />
                    </IconBtn>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line/70 px-4 py-3 sm:px-5">
        <button type="button" onClick={() => add()} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[12.5px] font-semibold text-paper transition hover:bg-ink-soft">
          <Plus className="h-3.5 w-3.5" /> {t('addSpec')}
        </button>
        {suggestions.length > 0 && (
          <>
            <span className="ml-1 text-[12px] font-medium text-muted">{t('quickAdd')}:</span>
            {suggestions.slice(0, 5).map((s) => (
              <button
                key={s.sq}
                type="button"
                onClick={() => add(s)}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink-soft transition hover:border-ink/30 hover:text-ink"
              >
                <Plus className="h-3 w-3 text-muted" />
                {l(s)}
              </button>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}
