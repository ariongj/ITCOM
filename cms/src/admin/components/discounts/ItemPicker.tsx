// Product / collection picker for discount scopes (applies to, BXGY X and Y).
import { useMemo, useState } from 'react';
import { FolderOpen, Package, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { collectionProducts } from '@/lib/collections';
import { basePrice } from '@/lib/pricing';
import { money } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn } from '@/lib/utils';
import { dd } from './i18n';
import { FHint } from './ui';

type Kind = 'collections' | 'products';

interface Row {
  id: string;
  title: string;
  meta: string;
  image?: string;
  muted?: boolean;
}

function useRows(kind: Kind): Row[] {
  const t = useDict(dd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const collections = useDb((s) => s.collections);
  return useMemo(() => {
    if (kind === 'collections')
      return collections.map((c) => {
        const n = collectionProducts(c, products).length;
        const bits = [c.kind === 'smart' ? t('smart') : t('manual'), t('productsN', { n })];
        if (!c.published) bits.push(t('unpublished'));
        return { id: c.id, title: l(c.title), meta: bits.join(' · '), image: c.image, muted: !c.published };
      });
    return products.map((p) => {
      const bits = [p.sku, money(basePrice(p), lang)];
      if (p.status !== 'active') bits.push(p.status === 'archived' ? t('archived') : t('unpublished'));
      return { id: p.id, title: l(p.name), meta: bits.filter(Boolean).join(' · '), image: p.images[0], muted: p.status !== 'active' };
    });
  }, [kind, collections, products, l, lang, t]);
}

/** Selected items + a "Zgjidh" button that opens the searchable picker. */
export function ScopePicker({ kind, ids, onChange, error, className }: { kind: Kind; ids: string[]; onChange: (ids: string[]) => void; error?: string; className?: string }) {
  const t = useDict(dd, 'admin');
  const ta = useDict(adm, 'admin');
  const rows = useRows(kind);
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const selected = ids.map((id) => byId.get(id) ?? { id, title: id, meta: '' });
  const Icon = kind === 'collections' ? FolderOpen : Package;

  return (
    <div className={className}>
      <div className={cn('overflow-hidden rounded-lg border bg-white', error ? 'border-red-400' : 'border-line')}>
        {selected.length > 0 && (
          <ul className="max-h-[248px] divide-y divide-line/70 overflow-y-auto">
            {selected.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <Thumb src={r.image} className="h-8 w-8 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-[13.5px] font-medium', r.muted ? 'text-muted' : 'text-ink')}>{r.title}</div>
                  {r.meta && <div className="truncate text-[12px] text-muted">{r.meta}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => onChange(ids.filter((x) => x !== r.id))}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
                  aria-label={ta('remove')}
                  title={ta('remove')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn('flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-ink transition-colors hover:bg-canvas/70', selected.length > 0 && 'border-t border-line/70')}
        >
          {selected.length ? <Plus className="h-4 w-4 text-muted" /> : <Icon className="h-4 w-4 text-muted" />}
          {kind === 'collections' ? t('pickCollections') : t('pickProducts')}
          {selected.length > 0 && <span className="ml-auto rounded-md bg-canvas px-1.5 text-[11.5px] tabular-nums text-muted">{selected.length}</span>}
        </button>
      </div>
      {error && <FHint error>{error}</FHint>}
      <PickerModal open={open} kind={kind} rows={rows} value={ids} onClose={() => setOpen(false)} onApply={(v) => onChange(v)} />
    </div>
  );
}

function PickerModal({ open, kind, rows, value, onClose, onApply }: { open: boolean; kind: Kind; rows: Row[]; value: string[]; onClose: () => void; onApply: (ids: string[]) => void }) {
  const t = useDict(dd, 'admin');
  const ta = useDict(adm, 'admin');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string[]>(value);
  // reset the working selection each time the dialog opens (not on every parent render)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSel(value);
      setQ('');
    }
  }

  const list = useMemo(() => {
    const terms = fold(q.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) return rows;
    return rows.filter((r) => {
      const hay = fold(`${r.title} ${r.meta}`);
      return terms.every((x) => hay.includes(x));
    });
  }, [rows, q]);

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={kind === 'collections' ? t('pickCollections') : t('pickProducts')}
      footer={
        <>
          <span className="mr-auto text-[13px] text-muted">{ta('selected')}: {sel.length}</span>
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {ta('cancel')}
          </Button>
          <Button
            shape="rounded"
            size="sm"
            onClick={() => {
              onApply(sel);
              onClose();
            }}
          >
            {t('pickerDone')}
          </Button>
        </>
      }
    >
      <div className="sticky top-0 z-10 border-b border-line bg-white px-4 py-3 sm:px-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('pickerSearch')}
            className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[14px] outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
          />
        </div>
      </div>
      {list.length === 0 ? (
        <p className="px-6 py-12 text-center text-[13.5px] text-muted">{t('pickerNone')}</p>
      ) : (
        <ul className="divide-y divide-line/70">
          {list.map((r) => {
            const on = sel.includes(r.id);
            return (
              <li key={r.id}>
                <button type="button" onClick={() => toggle(r.id)} aria-pressed={on} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors sm:px-6', on ? 'bg-canvas/80' : 'hover:bg-canvas/50')}>
                  <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border-[1.5px]', on ? 'border-ink bg-ink text-white' : 'border-ink/30 bg-white')}>
                    <svg viewBox="0 0 16 16" className={cn('h-3 w-3', on ? 'scale-100' : 'scale-0')} fill="none" stroke="currentColor" strokeWidth={2.6}>
                      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <Thumb src={r.image} className="h-9 w-9 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[13.5px] font-medium', r.muted ? 'text-muted' : 'text-ink')}>{r.title}</span>
                    <span className="block truncate text-[12px] text-muted">{r.meta}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
