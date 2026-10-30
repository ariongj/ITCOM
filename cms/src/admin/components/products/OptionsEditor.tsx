import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Palette, Plus, RectangleHorizontal, Trash2, X } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import type { L10n, Lang, ProductOption, ProductOptionValue } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { pd } from './dict';
import { IconBtn, LangTabs, MiniL10n, NumInput, Segmented, missingCounts } from './parts';

const L = (me: string, sq: string, en: string): L10n => ({ me, sq, en });
const empty = (): L10n => ({ me: '', sq: '', en: '' });

/** One-click starting points (data in all three languages). */
const PRESETS: { key: string; make: () => ProductOption }[] = [
  {
    key: 'color',
    make: () => ({
      id: uid('opt'),
      name: L('Boja okvira', 'Ngjyra e kornizës', 'Frame colour'),
      type: 'swatch',
      values: [
        { id: uid('v'), label: L('Crna', 'E zezë', 'Black'), swatch: '#1f1d1b' },
        { id: uid('v'), label: L('Havana', 'Havana', 'Tortoise'), swatch: '#6b4226' },
        { id: uid('v'), label: L('Providna', 'Kristal', 'Crystal'), swatch: '#e8e4dc', priceDelta: 10 },
      ],
    }),
  },
  {
    key: 'size',
    make: () => ({
      id: uid('opt'),
      name: L('Veličina', 'Madhësia', 'Size'),
      type: 'button',
      values: ['50 mm', '52 mm', '54 mm'].map((w) => ({ id: uid('v'), label: L(w, w, w) })),
    }),
  },
  {
    key: 'lenses',
    make: () => ({
      id: uid('opt'),
      name: L('Sočiva', 'Lentet', 'Lenses'),
      type: 'button',
      values: [
        { id: uid('v'), label: L('Samo okvir', 'Vetëm korniza', 'Frame only') },
        { id: uid('v'), label: L('Jednožižna', 'Njëvizore', 'Single vision'), priceDelta: 80 },
        { id: uid('v'), label: L('Progresivna', 'Progresive', 'Progressive'), priceDelta: 210 },
      ],
    }),
  },
];

const move = <T,>(list: T[], from: number, to: number) => {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

function ValueRow({
  value,
  type,
  lang,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  value: ProductOptionValue;
  type: ProductOption['type'];
  lang: Lang;
  index: number;
  count: number;
  onChange: (v: ProductOptionValue) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useDict(pd, 'admin');
  return (
    <motion.div layout="position" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="group/v flex items-center gap-2">
      {/* reorder */}
      <div className="flex w-5 shrink-0 flex-col items-center text-muted">
        <button type="button" aria-label={t('moveUp')} disabled={index === 0} onClick={() => onMove(-1)} className="grid h-4 w-5 place-items-center rounded hover:text-ink disabled:opacity-25">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label={t('moveDown')} disabled={index === count - 1} onClick={() => onMove(1)} className="grid h-4 w-5 place-items-center rounded hover:text-ink disabled:opacity-25">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* swatch / button marker */}
      {type === 'swatch' ? (
        <label title={t('pickColor')} className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-white transition hover:border-ink/30">
          <span className="h-6 w-6 rounded-full ring-1 ring-inset ring-ink/15" style={{ background: value.swatch || '#ffffff' }} />
          <input type="color" value={value.swatch || '#ffffff'} onChange={(e) => onChange({ ...value, swatch: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t('pickColor')} />
        </label>
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-dashed border-line text-[11px] font-bold tabular-nums text-muted">{index + 1}</span>
      )}
      <MiniL10n value={value.label} lang={lang} onChange={(label) => onChange({ ...value, label })} placeholder={t('valueLabel')} className="flex-1" />
      <NumInput
        size="sm"
        zeroAsEmpty
        value={value.priceDelta ?? null}
        onChange={(n) => onChange({ ...value, priceDelta: n || undefined })}
        prefix="+"
        suffix="€"
        placeholder="0"
        wrapClassName="w-[92px] shrink-0 sm:w-[104px]"
        aria-label={t('priceDelta')}
      />
      <IconBtn label={t('remove')} onClick={onRemove} danger className="h-9 w-8">
        <X className="h-4 w-4" />
      </IconBtn>
    </motion.div>
  );
}

export function OptionsEditor({ value, onChange }: { value: ProductOption[]; onChange: (v: ProductOption[]) => void }) {
  const t = useDict(pd, 'admin');
  const adminLang = useLang('admin');
  const [lang, setLang] = useState<Lang>(adminLang);
  const missing = useMemo(() => missingCounts(value.flatMap((o) => [o.name, ...o.values.map((v) => v.label)])), [value]);
  return (
    <Card title={t('c_options')} description={t('c_options_d')} actions={value.length > 0 && <LangTabs value={lang} onChange={setLang} missing={missing} title={t('langHint')} />} padded={false}>
      <OptionsFields value={value} onChange={onChange} lang={lang} />
    </Card>
  );
}

/** Options list + "add option" footer, without a card — embedded in "Variantet & inventari". */
export function OptionsFields({ value, onChange, lang }: { value: ProductOption[]; onChange: (v: ProductOption[]) => void; lang: Lang }) {
  const t = useDict(pd, 'admin');
  const l = useL('admin');

  const update = (i: number, patch: Partial<ProductOption>) => onChange(value.map((o, k) => (k === i ? { ...o, ...patch } : o)));
  const setValues = (i: number, values: ProductOptionValue[]) => update(i, { values });
  const addOption = () => onChange([...value, { id: uid('opt'), name: empty(), type: 'button', values: [{ id: uid('v'), label: empty() }] }]);
  const presets = PRESETS.filter((p) => {
    const name = p.make().name.sq.toLowerCase();
    return !value.some((o) => o.name.sq.trim().toLowerCase() === name);
  });

  return (
    <>
      <div className="space-y-3 p-4 sm:p-5">
        {value.length === 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-canvas/40 px-4 py-4 text-[13px] text-muted">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-ink-soft ring-1 ring-line">
              <Palette className="h-4 w-4" />
            </span>
            {t('noOptions')}
          </div>
        )}
        <AnimatePresence initial={false}>
          {value.map((o, i) => (
            <motion.div key={o.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="overflow-hidden rounded-xl border border-line bg-white">
              {/* Option header */}
              <div className="flex flex-wrap items-center gap-2 border-b border-line/70 bg-canvas/50 px-3 py-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-bold text-paper">{i + 1}</span>
                <MiniL10n value={o.name} lang={lang} onChange={(name) => update(i, { name })} placeholder={t('optionName')} className="min-w-[160px] flex-1" />
                <div className="flex items-center gap-1">
                  <Segmented
                    size="sm"
                    value={o.type}
                    onChange={(type) => update(i, { type, values: type === 'swatch' ? o.values.map((v) => ({ ...v, swatch: v.swatch || '#d9cfc2' })) : o.values })}
                    options={[
                      { id: 'swatch', label: t('type_swatch'), icon: <Palette className="h-3.5 w-3.5" /> },
                      { id: 'button', label: t('type_button'), icon: <RectangleHorizontal className="h-3.5 w-3.5" /> },
                    ]}
                  />
                  <span className="mx-0.5 h-5 w-px bg-line" />
                  <IconBtn label={t('moveUp')} onClick={() => onChange(move(value, i, i - 1))} disabled={i === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label={t('moveDown')} onClick={() => onChange(move(value, i, i + 1))} disabled={i === value.length - 1}>
                    <ArrowDown className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label={t('remove')} onClick={() => onChange(value.filter((_, k) => k !== i))} danger>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </div>
              {/* Values */}
              <div className="space-y-2 px-3 py-3">
                <div className="flex items-center gap-2 pl-7 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted max-sm:hidden">
                  <span className="w-9" />
                  <span className="flex-1">{t('valueLabel')}</span>
                  <span className="w-[104px]">{t('priceDelta')}</span>
                  <span className="w-8" />
                </div>
                <AnimatePresence initial={false}>
                  {o.values.map((v, k) => (
                    <ValueRow
                      key={v.id}
                      value={v}
                      type={o.type}
                      lang={lang}
                      index={k}
                      count={o.values.length}
                      onChange={(nv) => setValues(i, o.values.map((x, j) => (j === k ? nv : x)))}
                      onMove={(d) => setValues(i, move(o.values, k, k + d))}
                      onRemove={() => setValues(i, o.values.filter((_, j) => j !== k))}
                    />
                  ))}
                </AnimatePresence>
                <button
                  type="button"
                  onClick={() => setValues(i, [...o.values, { id: uid('v'), label: empty(), ...(o.type === 'swatch' ? { swatch: '#d9cfc2' } : {}) }])}
                  className="ml-7 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-brand-700 transition hover:bg-brand-50"
                >
                  <Plus className="h-3.5 w-3.5" /> {t('addValue')}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line/70 px-4 py-3 sm:px-5">
        <button type="button" onClick={addOption} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-[12.5px] font-semibold text-paper transition hover:bg-ink-soft">
          <Plus className="h-3.5 w-3.5" /> {t('addOption')}
        </button>
        {presets.length > 0 && (
          <>
            <span className="ml-1 text-[12px] font-medium text-muted">{t('quickAdd')}:</span>
            {presets.map((p) => {
              const sample = p.make();
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onChange([...value, p.make()])}
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink-soft transition hover:border-ink/30 hover:text-ink')}
                >
                  {sample.type === 'swatch' ? (
                    <span className="flex -space-x-1">
                      {sample.values.map((v) => (
                        <span key={v.id} className="h-3 w-3 rounded-full ring-1 ring-white" style={{ background: v.swatch }} />
                      ))}
                    </span>
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-muted" />
                  )}
                  {l(sample.name)}
                </button>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
