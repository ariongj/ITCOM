import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Thumb } from '@/admin/components/kit';
import { defineDict, useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { orderLineNet, refundedOf } from '@/lib/orders';
import { money } from '@/lib/format';
import { round2 } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { localizeLine } from './helpers';
import { Check, NumberInput, Stepper, TextInput } from './ui';

const T = defineDict({
  me: {
    title: 'Refundacija · #{n}',
    description: 'Iznos se računa iz neto plaćenog iznosa stavki (nakon popusta), ne iz trenutne cijene ili akcije.',
    colItem: 'Stavka',
    colPaid: 'Plaćeno / kom',
    colQty: 'Refundirati',
    shipping: 'Refundiraj i dostavu ({amount})',
    shippingHint: 'Dostava se vraća samo kada pravilo to dozvoljava.',
    calculated: 'Izračunato iz stavki',
    amount: 'Iznos refundacije',
    max: 'Maksimalno {amount} (plaćeno {paid}, već refundirano {refunded})',
    reason: 'Razlog (vidi ga samo tim)',
    reasonPh: 'npr. oštećena kvaka, dogovor sa kupcem',
    submit: 'Refundiraj {amount}',
    done: 'Refundirano {amount} za #{n}',
    returnHint: 'Vraća se i roba na stanje?',
    returnLink: 'Otvorite povrat',
  },
  sq: {
    title: 'Rimbursim · #{n}',
    description: 'Shuma llogaritet nga pagesa neto e artikujve (pas zbritjeve), jo nga çmimi ose oferta aktuale.',
    colItem: 'Artikulli',
    colPaid: 'Paguar / copë',
    colQty: 'Për rimbursim',
    shipping: 'Rimburso edhe transportin ({amount})',
    shippingHint: 'Transporti kthehet vetëm kur rregulli e lejon.',
    calculated: 'Llogaritur nga artikujt',
    amount: 'Shuma e rimbursimit',
    max: 'Maksimumi {amount} (paguar {paid}, rimbursuar më parë {refunded})',
    reason: 'Arsyeja (e sheh vetëm ekipi)',
    reasonPh: 'p.sh. dorezë e dëmtuar, marrëveshje me klientin',
    submit: 'Rimburso {amount}',
    done: 'U rimbursuan {amount} për #{n}',
    returnHint: 'Kthehet edhe malli në stok?',
    returnLink: 'Hapni një kthim',
  },
  en: {
    title: 'Refund · #{n}',
    description: 'The amount comes from the net paid amount of the items (after discounts), not the current price or offer.',
    colItem: 'Item',
    colPaid: 'Paid / unit',
    colQty: 'Refund',
    shipping: 'Also refund delivery ({amount})',
    shippingHint: 'Delivery is refunded only when the rule allows it.',
    calculated: 'Calculated from items',
    amount: 'Refund amount',
    max: 'Up to {amount} (paid {paid}, already refunded {refunded})',
    reason: 'Reason (team only)',
    reasonPh: 'e.g. damaged handle, agreed with the customer',
    submit: 'Refund {amount}',
    done: 'Refunded {amount} for #{n}',
    returnHint: 'Goods coming back to stock?',
    returnLink: 'Open a return',
  },
});

/** Partial / full refund (PDF p.24: refund uses the net paid amount of the returned lines). */
export function RefundDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const t = useDict(T, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const refundOrder = useDb((s) => s.refundOrder);

  const [qty, setQty] = useState<number[]>([]);
  const [withShipping, setWithShipping] = useState(false);
  const [manual, setManual] = useState<number | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    setQty(order.items.map(() => 0));
    setWithShipping(false);
    setManual(null);
    setReason('');
  }, [open, order]);

  const refunded = refundedOf(order);
  const max = round2(Math.max(0, order.total - refunded));
  const perUnit = useMemo(() => order.items.map((l, i) => (l.qty ? orderLineNet(order, i) / l.qty : 0)), [order]);
  const calculated = round2(qty.reduce((s, n, i) => s + perUnit[i] * n, 0) + (withShipping ? order.shipping : 0));
  const amount = round2(Math.min(max, manual ?? calculated));

  const setLine = (i: number, n: number) => {
    setQty((prev) => prev.map((v, k) => (k === i ? n : v)));
    setManual(null);
  };

  const submit = () => {
    if (amount <= 0) return;
    const lineIds = qty.map((n, i) => (n > 0 ? String(i) : '')).filter(Boolean);
    refundOrder(order.id, amount, lineIds, reason.trim() || undefined);
    toast.success(t('done', { amount: money(amount, lang), n: order.number }));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title', { n: order.number })}
      description={t('description')}
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" shape="rounded" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button size="sm" shape="rounded" icon={<RotateCcw className="h-4 w-4" />} disabled={amount <= 0} onClick={submit}>
            {t('submit', { amount: money(amount, lang) })}
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-5">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px_96px] gap-3 border-b border-line bg-canvas/60 px-3 py-2 text-[12px] font-semibold text-muted sm:grid">
            <span>{t('colItem')}</span>
            <span className="text-right">{t('colPaid')}</span>
            <span className="text-center">{t('colQty')}</span>
            <span className="text-right">{tc('total')}</span>
          </div>
          <ul className="divide-y divide-line/70">
            {order.items.map((l, i) => {
              const loc = localizeLine(l, products.find((p) => p.id === l.productId), order.lang, lang);
              return (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_110px_120px_96px]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Thumb src={l.image} className="h-9 w-9 rounded-md" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium text-ink">{loc.name}</span>
                      <span className="block text-[12px] text-muted">
                        {l.qty} × {money(perUnit[i], lang)}
                        <span className="sm:hidden"> · {t('colPaid')}</span>
                      </span>
                    </span>
                  </span>
                  <span className="hidden text-right text-[13px] tabular-nums text-ink-soft sm:block">{money(perUnit[i], lang)}</span>
                  <span className="flex justify-end sm:justify-center">
                    <Stepper value={qty[i] ?? 0} onChange={(n) => setLine(i, n)} min={0} max={l.qty} ariaLabel={`${t('colQty')} — ${loc.name}`} />
                  </span>
                  <span className="col-span-2 text-right text-[13.5px] font-semibold tabular-nums text-ink sm:col-span-1">{money(round2(perUnit[i] * (qty[i] ?? 0)), lang)}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {order.shipping > 0 && (
          <div className="flex items-start gap-3">
            <Check
              checked={withShipping}
              onChange={(v) => {
                setWithShipping(v);
                setManual(null);
              }}
              label={t('shipping', { amount: money(order.shipping, lang) })}
              className="mt-0.5"
            />
            <span className="text-[13.5px]">
              <span className="font-medium text-ink">{t('shipping', { amount: money(order.shipping, lang) })}</span>
              <span className="block text-[12px] text-muted">{t('shippingHint')}</span>
            </span>
          </div>
        )}

        <div className="grid gap-4 rounded-lg bg-canvas/70 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-semibold text-ink-soft">{t('calculated')}</p>
            <p className="mt-1 text-[20px] font-bold tabular-nums text-ink">{money(Math.min(calculated, max), lang)}</p>
            <p className="mt-0.5 text-[12px] text-muted">{t('max', { amount: money(max, lang), paid: money(order.total, lang), refunded: money(refunded, lang) })}</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[12.5px] font-semibold text-ink-soft">{t('amount')}</p>
              <NumberInput value={amount} onChange={(v) => setManual(v)} min={0} max={max} suffix="€" ariaLabel={t('amount')} />
            </div>
            <TextInput label={t('reason')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('reasonPh')} />
          </div>
        </div>

        <p className="flex items-center gap-2 text-[12.5px] text-muted">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {t('returnHint')}{' '}
          <Link to={`/admin/povrati?order=${order.id}&new=1`} onClick={onClose} className="font-semibold text-ink underline underline-offset-2">
            {t('returnLink')}
          </Link>
        </p>
      </div>
    </Modal>
  );
}
