// "Prano mallin" (PDF p.16): partial receiving with rejected units; quantities are sent to the store as
// CUMULATIVE totals computed from the snapshot taken when the dialog opened, so submitting the same receipt
// twice (double click, retry) never adds stock twice.
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CircleCheck, CircleDotDashed, PackageCheck, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import type { PurchaseOrder } from '@/lib/types';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import { adm } from '@/admin/i18n';
import { inv } from './dict';
import { lineLeft, stockUnit } from './helpers';
import { useInventoryRows } from './useInventory';
import { IntField, ReceiveBar } from './ui';

type Entry = { now: number | null; rej: number | null };

export function ReceiveDialog({ po, onClose }: { po: PurchaseOrder | undefined; onClose: () => void }) {
  const t = useDict(inv, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const receivePurchaseOrder = useDb((s) => s.receivePurchaseOrder);
  const rows = useInventoryRows();
  const onHandById = useMemo(() => new Map(rows.map((r) => [r.p.id, r.lv.onHand])), [rows]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  // Snapshot of the document at the moment the dialog opened (the receipt is computed from it).
  const [snap, setSnap] = useState<PurchaseOrder | null>(null);
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [busy, setBusy] = useState(false);
  if (po && po.id !== snap?.id) {
    setSnap(po);
    setBusy(false);
    setEntries(Object.fromEntries(po.lines.map((x) => [x.productId, { now: lineLeft(x), rej: 0 }])));
  }
  const close = () => {
    setSnap(null);
    onClose();
  };

  const lines = useMemo(
    () =>
      (snap?.lines ?? []).map((x) => {
        const e = entries[x.productId] ?? { now: 0, rej: 0 };
        const left = lineLeft(x);
        const now = e.now ?? 0;
        const rej = e.rej ?? 0;
        return { x, left, now, rej, over: now + rej > left, after: left - now - rej };
      }),
    [snap, entries],
  );
  const open = lines.filter((r) => r.left > 0);
  const anyOver = lines.some((r) => r.over);
  const anyInput = lines.some((r) => r.now > 0 || r.rej > 0);
  const totalNow = lines.reduce((s, r) => s + r.now, 0);
  const willClose = !anyOver && lines.every((r) => r.after <= 0);
  const diffs = lines.filter((r) => r.left > 0 && (r.rej > 0 || r.after > 0));

  const set = (pid: string, patch: Partial<Entry>) => setEntries((m) => ({ ...m, [pid]: { ...(m[pid] ?? { now: 0, rej: 0 }), ...patch } }));
  const fillAll = () => setEntries(Object.fromEntries((snap?.lines ?? []).map((x) => [x.productId, { now: lineLeft(x), rej: 0 }])));

  const submit = () => {
    if (!snap || busy || anyOver || !anyInput) return;
    setBusy(true);
    const payload = lines
      .filter((r) => r.now > 0 || r.rej > 0)
      .map((r) => ({ productId: r.x.productId, received: r.x.received + r.now, rejected: r.x.rejected + r.rej }));
    // the store only applies what is new (cumulative totals) — measure what actually changed
    const rejectedOf = () => (useDb.getState().purchaseOrders.find((x) => x.id === snap.id)?.lines ?? []).reduce((n, x) => n + x.rejected, 0);
    const rejBefore = rejectedOf();
    const added = receivePurchaseOrder(snap.id, payload);
    const rejected = rejectedOf() - rejBefore;
    if (added > 0) toast.success(t('rc_done', { n: num(added, lang) }), { description: rejected ? t('ed_rejectedN', { n: rejected }) : snap.number });
    else if (rejected > 0) toast.success(t('ed_rejectedN', { n: rejected }), { description: snap.number });
    else toast.info(t('rc_nothing'), { description: snap.number });
    close();
  };

  return (
    <Modal
      open={!!po}
      onClose={close}
      size="lg"
      title={snap ? t('rc_title', { n: snap.number }) : ''}
      description={t('rc_desc')}
      footer={
        <>
          <span className="mr-auto hidden items-center gap-1.5 text-[12.5px] text-muted sm:inline-flex">
            {willClose ? <CircleCheck className="h-4 w-4" /> : <CircleDotDashed className="h-4 w-4" />}
            {willClose ? t('rc_willClose') : t('rc_willPartial')}
          </span>
          <Button variant="outline" shape="rounded" size="sm" onClick={close}>
            {ta('cancel')}
          </Button>
          <Button shape="rounded" size="sm" icon={<PackageCheck className="h-4 w-4" />} onClick={submit} disabled={!anyInput || anyOver || busy || open.length === 0}>
            {t('rc_confirm')}
            {totalNow > 0 && <span className="rounded bg-white/15 px-1.5 text-[11.5px] tabular-nums">+{num(totalNow, lang)}</span>}
          </Button>
        </>
      }
    >
      {snap && (
        <div className="space-y-4 px-6 py-5">
          {open.length === 0 ? (
            <p className="rounded-lg bg-canvas px-4 py-3 text-[13.5px] text-ink-soft">{t('rc_allDone')}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-muted">
                  {snap.supplier} · <span className="font-mono">{snap.reference || '—'}</span>
                </p>
                <Button variant="outline" size="xs" shape="rounded" className="bg-white" onClick={fillAll}>
                  {t('rc_all')}
                </Button>
              </div>

              <ul className="divide-y divide-line/70 rounded-xl ring-1 ring-line/80">
                <li className="hidden grid-cols-[minmax(0,1fr)_84px_104px_104px] items-center gap-3 rounded-t-xl bg-canvas/60 px-4 py-2 text-[12px] font-semibold text-muted sm:grid">
                  <span>{t('col_product')}</span>
                  <span className="text-right">{t('rc_remaining')}</span>
                  <span className="text-right">{t('rc_acceptNow')}</span>
                  <span className="text-right" title={t('rc_rejectedHint')}>{t('rc_rejectNow')}</span>
                </li>
                {lines.map(({ x, left, now, over }) => {
                  const p = productById.get(x.productId);
                  const u = p ? stockUnit(p, lang) : '';
                  const done = left === 0;
                  return (
                    <li key={x.productId} className={cn('grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_84px_104px_104px]', done && 'bg-canvas/40')}>
                      <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
                        <Thumb src={p?.images[0]} className="h-9 w-9" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-semibold text-ink">{p ? l(p.name) : x.productId}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted">
                            <span className="font-mono">{p?.sku}</span>
                            <span>
                              {t('ed_progress', { r: num(x.received, lang), o: num(x.ordered, lang) })}
                              {x.rejected > 0 && ` · ${t('ed_rejectedN', { n: x.rejected })}`}
                            </span>
                          </div>
                          <ReceiveBar className="mt-1.5 max-w-[220px]" ordered={x.ordered} received={x.received + (done ? 0 : now)} rejected={x.rejected} />
                        </div>
                      </div>
                      <div className="text-[13px] sm:text-right">
                        <span className="text-muted sm:hidden">{t('rc_remaining')}: </span>
                        <span className={cn('font-semibold tabular-nums', done && 'text-muted')}>
                          {num(left, lang)} <span className="text-[11px] font-medium text-muted">{u}</span>
                        </span>
                      </div>
                      {done ? (
                        <div className="flex items-center justify-end gap-1 text-[12px] font-semibold text-emerald-700 sm:col-span-2">
                          <CircleCheck className="h-3.5 w-3.5" />
                          {t('st_closed')}
                        </div>
                      ) : (
                        <>
                          <div className="col-span-2 grid grid-cols-2 gap-3 sm:contents">
                            <div>
                              <span className="mb-1 block text-[11.5px] font-semibold text-muted sm:hidden">{t('rc_acceptNow')}</span>
                              <IntField size="sm" value={entries[x.productId]?.now ?? null} onChange={(v) => set(x.productId, { now: v })} min={0} max={left} invalid={over} aria-label={t('rc_acceptNow')} />
                              <div className={cn('mt-1 text-right text-[11px]', over ? 'font-medium text-red-700' : 'text-muted')}>
                                {over ? t('rc_tooMany', { n: left }) : t('rc_stockAfter', { n: num((onHandById.get(x.productId) ?? 0) + now, lang) })}
                              </div>
                            </div>
                            <div>
                              <span className="mb-1 block text-[11.5px] font-semibold text-muted sm:hidden">{t('rc_rejectNow')}</span>
                              <IntField size="sm" value={entries[x.productId]?.rej ?? null} onChange={(v) => set(x.productId, { rej: v })} min={0} max={left} invalid={over} aria-label={t('rc_rejectNow')} />
                              <div className="mt-1 text-right text-[11px] text-muted">{t('ed_rejectedN', { n: num(x.rejected + (entries[x.productId]?.rej ?? 0), lang) })}</div>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Differences preview */}
              <div className="rounded-xl border border-line/80 px-4 py-3">
                <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{t('rc_diffTitle')}</div>
                {diffs.length === 0 ? (
                  <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
                    <CircleCheck className="h-4 w-4 text-emerald-700" />
                    {t('ed_noDifferences')}
                  </p>
                ) : (
                  <ul className="space-y-1 text-[13px]">
                    {diffs.map(({ x, rej, after }) => {
                      const p = productById.get(x.productId);
                      return (
                        <li key={x.productId} className="flex flex-wrap items-center justify-between gap-x-3">
                          <span className="min-w-0 truncate text-ink-soft">{p ? l(p.name) : x.productId}</span>
                          <span className="flex gap-2 text-[12.5px] font-semibold tabular-nums">
                            {after > 0 && <span className="text-ink">{t('ed_missing', { n: after })}</span>}
                            {rej > 0 && <span className="text-red-700">{t('ed_rejectedN', { n: rej })}</span>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="mt-2 border-t border-line/70 pt-2 text-[12px] text-muted sm:hidden">{willClose ? t('rc_willClose') : t('rc_willPartial')}</p>
              </div>
            </>
          )}

          <p className="flex gap-2 text-[12px] leading-snug text-muted">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0" />
            {t('rc_idempotent')}
          </p>
        </div>
      )}
    </Modal>
  );
}
