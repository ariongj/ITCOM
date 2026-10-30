import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BadgePercent, Check, ChevronDown, Hand, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import type { HomeSection, Product } from '@/lib/types';
import { Label } from '@/components/ui/Field';
import { Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCategories } from '@/store/hooks';
import { isOnSale } from '@/lib/pricing';
import { money } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, thumb } from '@/lib/utils';
import { B } from './i18n';
import { IconBtn, ctl } from './fields';

type FeaturedData = Extract<HomeSection, { type: 'featured' }>['data'];
type Mode = FeaturedData['mode'];

const MODES: { id: Mode; icon: typeof Sparkles }[] = [
  { id: 'bestsellers', icon: TrendingUp },
  { id: 'sale', icon: BadgePercent },
  { id: 'new', icon: Sparkles },
  { id: 'manual', icon: Hand },
];

/** Mirrors the storefront's FeaturedSection selection logic. */
function autoPick(products: Product[], mode: Mode) {
  const active = products.filter((p) => p.status === 'active');
  if (mode === 'sale') return active.filter(isOnSale).sort((a, b) => b.sold - a.sold);
  if (mode === 'new') return [...active].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return [...active].sort((a, b) => b.sold - a.sold);
}

export function FeaturedModePicker({ data, onChange }: { data: FeaturedData; onChange: (d: FeaturedData) => void }) {
  const t = useDict(B, 'admin');
  const l = useL('admin');
  const products = useDb((s) => s.products);
  const auto = useMemo(() => (data.mode === 'manual' ? [] : autoPick(products, data.mode).slice(0, 10)), [products, data.mode]);

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('mode')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map(({ id, icon: Icon }) => {
            const on = data.mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ ...data, mode: id })}
                aria-pressed={on}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold transition',
                  on ? 'border-ink bg-ink text-paper shadow-sm' : 'border-line bg-white text-ink-soft hover:border-ink/25 hover:text-ink',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', on ? 'text-brand-200' : 'text-muted')} />
                <span className="truncate">{t(`mode_${id}`)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">{t(`modeHint_${data.mode}`)}</p>
      </div>

      {data.mode === 'manual' ? (
        <ManualPicker ids={data.productIds} onChange={(productIds) => onChange({ ...data, productIds })} />
      ) : (
        <div>
          <Label>{t('autoPreview')}</Label>
          <div className="grid grid-cols-5 gap-1.5">
            {auto.map((p, i) => (
              <div key={p.id} title={l(p.name)} className="relative aspect-square overflow-hidden rounded-lg bg-sand ring-1 ring-line">
                {p.images[0] && <img src={thumb(p.images[0])} alt="" className="h-full w-full object-cover" loading="lazy" />}
                <span className="absolute left-1 top-1 grid h-4 min-w-4 place-items-center rounded bg-white/90 px-1 text-[9.5px] font-bold tabular-nums text-ink shadow-sm">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ManualPicker({ ids, onChange }: { ids: string[]; onChange: (ids: string[]) => void }) {
  const t = useDict(B, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const cats = useCategories();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const selected = useMemo(() => ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[], [ids, products]);
  const results = useMemo(() => {
    const needle = fold(q.trim());
    return products.filter(
      (p) => p.status === 'active' && (cat === 'all' || p.categoryId === cat) && (!needle || fold(`${p.name[lang]} ${p.name.me} ${p.sku}`).includes(needle)),
    );
  }, [products, q, cat, lang]);

  const toggle = (id: string) => onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  // Reorder by the visible list (ids of deleted products are dropped on the way)
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= selected.length) return;
    const next = selected.map((p) => p.id);
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const price = (p: Product) => money(isOnSale(p) ? (p.salePrice as number) : p.price, lang);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label className="mb-0">{t('picked')}</Label>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold tabular-nums text-ink-soft">{selected.length}</span>
        </div>
        {selected.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">{t('pickedEmpty')}</p>
        ) : (
          <ol className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line bg-white">
            {selected.map((p, i) => (
              <li key={p.id} className="flex items-center gap-2.5 py-1.5 pl-2 pr-1.5">
                <span className="w-4 shrink-0 text-center text-[11px] font-bold tabular-nums text-muted">{i + 1}</span>
                <Thumb src={p.images[0]} className="h-9 w-9" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{l(p.name)}</span>
                  <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    {price(p)}
                    {p.status !== 'active' && <span className="rounded bg-amber-50 px-1 text-[10px] font-bold text-amber-800">{t('draftBadge')}</span>}
                  </span>
                </span>
                <IconBtn label={t('moveUp')} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={t('moveDown')} disabled={i === selected.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label={ta('remove')} onClick={() => toggle(p.id)} danger>
                  <X className="h-3.5 w-3.5" />
                </IconBtn>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <Label>{t('addProducts')}</Label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchProducts')} aria-label={t('searchProducts')} className={cn(ctl, 'h-10 pl-9')} />
          </div>
          <div className="relative w-[42%] shrink-0">
            <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label={t('allCategories')} className={cn(ctl, 'h-10 cursor-pointer appearance-none truncate pr-8')}>
              <option value="all">{t('allCategories')}</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {l(c.name)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </div>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-line bg-white">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">{t('noProducts')}</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {results.map((p) => {
                const on = ids.includes(p.id);
                return (
                  <li key={p.id}>
                    <button type="button" onClick={() => toggle(p.id)} className={cn('flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition', on ? 'bg-brand-50/60' : 'hover:bg-canvas/70')}>
                      <Thumb src={p.images[0]} className="h-9 w-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{l(p.name)}</span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {l(cats.find((c) => c.id === p.categoryId)?.name)} · {price(p)}
                        </span>
                      </span>
                      <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full border transition', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink/25 bg-white text-transparent')}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
