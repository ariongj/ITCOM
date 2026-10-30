import { useMemo, useState } from 'react';
import { PackageSearch, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { SearchInput, Thumb } from '@/admin/components/kit';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { basePrice } from '@/lib/pricing';
import { money, perUnit } from '@/lib/format';
import { searchProducts } from '@/lib/search';
import type { Product } from '@/lib/types';

const T = defineDict({
  me: { title: 'Dodaj iz kataloga', searchPh: 'Naziv ili SKU…', empty: 'Nema proizvoda za ovu pretragu.', onRequest: 'na upit', draft: 'nacrt' },
  sq: { title: 'Shto nga katalogu', searchPh: 'Emri ose SKU…', empty: 'Nuk ka produkte për këtë kërkim.', onRequest: 'sipas kërkesës', draft: 'draft' },
  en: { title: 'Add from catalogue', searchPh: 'Name or SKU…', empty: 'No products for this search.', onRequest: 'on request', draft: 'draft' },
});

/** Catalogue search for B2B quote lines (active + draft products, archived excluded). */
export function ProductPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Product) => void }) {
  const t = useDict(T, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const categories = useDb((s) => s.categories);
  const [q, setQ] = useState('');
  const pool = useMemo(() => products.filter((p) => p.status !== 'archived'), [products]);
  const list = useMemo(() => (q.trim() ? searchProducts(pool, categories, q, lang) : [...pool].sort((a, b) => b.sold - a.sold)).slice(0, 30), [pool, categories, q, lang]);
  return (
    <Modal open={open} onClose={onClose} size="md" title={t('title')}>
      <div className="sticky top-0 z-10 border-b border-line bg-white px-5 py-3">
        <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} />
      </div>
      {list.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center text-[13px] text-muted">
          <PackageSearch className="mb-2 h-6 w-6" />
          {t('empty')}
        </div>
      ) : (
        <ul className="divide-y divide-line/70">
          {list.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(p);
                  setQ('');
                }}
                className="group flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-canvas/70"
              >
                <Thumb src={p.images[0]} className="h-10 w-10 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{l(p.name)}</span>
                  <span className="block truncate text-[12px] text-muted">
                    <span className="font-mono">{p.sku}</span>
                    {p.status === 'draft' && ` · ${t('draft')}`}
                  </span>
                </span>
                <span className="shrink-0 text-right text-[12.5px] tabular-nums text-ink-soft">
                  {money(basePrice(p), lang)} <span className="text-muted">{perUnit(p.unit, lang)}</span>
                  {p.quoteOnly && <span className="block text-[11px] text-muted">{t('onRequest')}</span>}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors group-hover:border-ink/30 group-hover:text-ink">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
