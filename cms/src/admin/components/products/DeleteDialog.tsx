import { useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Archive, Info, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/admin/components/kit';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { cn } from '@/lib/utils';
import { pd } from './dict';
import { productRefs, type ProductX } from './model';

/**
 * Delete with a consequences dialog (PDF p.09): products that appear in orders, draft orders, quotes or
 * purchase orders are archived instead (orders keep their copy); the others are deleted permanently,
 * removed from manual collections and written to the audit log.
 */
export function DeleteDialog({ products: incoming, onClose, onDone }: { products: ProductX[]; onClose: () => void; onDone?: (result: { deleted: string[]; archived: string[] }) => void }) {
  // keep the last list while the modal animates out
  const last = useRef(incoming);
  if (incoming.length) last.current = incoming;
  const products = last.current;
  const t = useDict(pd, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const orders = useDb((s) => s.orders);
  const drafts = useDb((s) => s.drafts);
  const quotes = useDb((s) => s.quotes);
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const collections = useDb((s) => s.collections);
  const discounts = useDb((s) => s.discounts);
  const offers = useDb((s) => s.offers);
  const open = incoming.length > 0;

  const plan = useMemo(
    () => products.map((p) => ({ p, refs: productRefs(p.id, { orders, drafts, quotes, purchaseOrders, collections, discounts, offers }) })),
    [products, orders, drafts, quotes, purchaseOrders, collections, discounts, offers],
  );
  const toDelete = plan.filter((x) => !x.refs.history);
  const toArchive = plan.filter((x) => x.refs.history && x.p.status !== 'archived');

  const confirm = () => {
    const st = useDb.getState();
    for (const { p } of toArchive) st.upsertProduct({ ...p, status: 'archived' });
    const ids = new Set(toDelete.map((x) => x.p.id));
    for (const c of st.collections) {
      if (c.kind === 'manual' && c.productIds.some((id) => ids.has(id))) st.upsert('collections', { ...c, productIds: c.productIds.filter((id) => !ids.has(id)) });
    }
    for (const id of ids) st.deleteProduct(id);
    toast.success(t('del_done', { d: toDelete.length, a: toArchive.length }));
    onDone?.({ deleted: [...ids], archived: toArchive.map((x) => x.p.id) });
    onClose();
  };

  const label =
    toDelete.length && toArchive.length
      ? `${t('del_confirmDelete', { n: toDelete.length })} · ${t('del_confirmArchive', { n: toArchive.length })}`
      : toDelete.length
        ? t('del_confirmDelete', { n: toDelete.length })
        : toArchive.length
          ? t('del_confirmArchive', { n: toArchive.length })
          : t('del_confirm');

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={products.length === 1 ? t('del_title_one', { name: l(products[0].name) }) : t('del_title_many', { n: products.length })}
      description={t('del_intro')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {ta('cancel')}
          </Button>
          <Button variant="danger" shape="rounded" size="sm" onClick={confirm} disabled={!toDelete.length && !toArchive.length} icon={toDelete.length ? <Trash2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}>
            {label}
          </Button>
        </>
      }
    >
      <ul className="max-h-[46vh] divide-y divide-line/70 overflow-y-auto px-6">
        {plan.map(({ p, refs }) => {
          const where = [
            refs.orders && t('del_hasOrders', { n: refs.orders }),
            refs.drafts && t('del_hasDrafts', { n: refs.drafts }),
            refs.quotes && t('del_hasQuotes', { n: refs.quotes }),
            refs.purchaseOrders && t('del_hasPOs', { n: refs.purchaseOrders }),
          ].filter(Boolean) as string[];
          const fate = !refs.history ? 'delete' : p.status === 'archived' ? 'stays' : 'archive';
          return (
            <li key={p.id} className="flex items-start gap-3 py-3.5">
              <Thumb src={p.images[0]} className="h-10 w-10" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{l(p.name) || '—'}</div>
                    <div className="font-mono text-[11.5px] text-muted">{p.sku || '—'}</div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
                      fate === 'delete' ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15' : 'bg-ink/[0.06] text-ink-soft',
                    )}
                  >
                    {fate === 'delete' ? <Trash2 className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                    {fate === 'delete' ? t('del_willDelete') : fate === 'archive' ? t('del_willArchive') : t('del_staysArchived')}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5 text-[12.5px] text-muted">
                  <div>{where.length ? `${t('del_usedIn')} ${where.join(' · ')}` : t('del_noHistory')}</div>
                  {!refs.history && refs.collections.length > 0 && <div>{t('del_inCollections', { list: refs.collections.map((c) => l(c.title)).join(', ') })}</div>}
                  {refs.discounts.length > 0 && <div>{t('del_inDiscounts', { list: refs.discounts.map((d) => d.title).join(', ') })}</div>}
                  {refs.offers.length > 0 && <div>{t('del_inOffers', { list: refs.offers.map((o) => l(o.name)).join(', ') })}</div>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mx-6 mb-5 mt-1 flex gap-2.5 rounded-lg bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
        {t('del_note')}
      </div>
    </Modal>
  );
}
