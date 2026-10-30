import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PackageCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Thumb } from '@/admin/components/kit';
import { defineDict, useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import type { Order } from '@/lib/types';
import { CARRIERS, localizeLine, qtyLabel, type CarrierKey } from './helpers';
import { Check, SelectInput, TextInput } from './ui';
import { od } from './dict';

const T = defineDict({
  me: {
    title: 'Pripremi isporuku',
    description: 'Izaberite stavke koje idu u ovu pošiljku. Ostatak ostaje „djelimično poslato“.',
    items: 'Stavke u pošiljci',
    carrier: 'Način slanja',
    tracking: 'Broj za praćenje',
    trackingPh: 'npr. PK-4471-MT',
    trackingHint: 'Upisuje se u istoriju narudžbe i na karticu „Isporuka“.',
    submit: 'Označi kao poslato',
    submitPartial: 'Pošalji izabrane ({n})',
    done: 'Narudžba {n} je označena kao poslata',
    donePartial: 'Djelimična isporuka evidentirana za {n}',
    partialNote: 'Djelimična isporuka: {items}',
    noneSelected: 'Izaberite bar jednu stavku',
  },
  sq: {
    title: 'Përgatit dërgesën',
    description: 'Zgjidhni artikujt që shkojnë në këtë dërgesë. Pjesa tjetër mbetet „pjesërisht e dërguar“.',
    items: 'Artikujt në dërgesë',
    carrier: 'Mënyra e dërgimit',
    tracking: 'Numri i gjurmimit',
    trackingPh: 'p.sh. PK-4471-MT',
    trackingHint: 'Shënohet në historikun e porosisë dhe te karta „Dërgesa“.',
    submit: 'Shëno si të dërguar',
    submitPartial: 'Dërgo të zgjedhurat ({n})',
    done: 'Porosia {n} u shënua si e dërguar',
    donePartial: 'Dërgesa e pjesshme u regjistrua për {n}',
    partialNote: 'Dërgesë e pjesshme: {items}',
    noneSelected: 'Zgjidhni të paktën një artikull',
  },
  en: {
    title: 'Prepare shipment',
    description: 'Choose the items going into this shipment. The rest stays “partially fulfilled”.',
    items: 'Items in this shipment',
    carrier: 'Shipping method',
    tracking: 'Tracking number',
    trackingPh: 'e.g. PK-4471-MT',
    trackingHint: 'Saved to the order history and the “Delivery” card.',
    submit: 'Mark as fulfilled',
    submitPartial: 'Ship selected ({n})',
    done: 'Order {n} marked as fulfilled',
    donePartial: 'Partial shipment recorded for {n}',
    partialNote: 'Partial shipment: {items}',
    noneSelected: 'Select at least one item',
  },
});

/** "Përgatit dërgesën" — ships the order (fulfillOrder) with carrier + tracking; fewer lines → partial shipment. */
export function FulfilDialog({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const t = useDict(T, 'admin');
  const to = useDict(od, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products);
  const fulfillOrder = useDb((s) => s.fulfillOrder);
  const addOrderNote = useDb((s) => s.addOrderNote);

  const [lines, setLines] = useState<Set<number>>(new Set());
  const [carrier, setCarrier] = useState<CarrierKey>('own');
  const [tracking, setTracking] = useState('');

  useEffect(() => {
    if (!open) return;
    setLines(new Set(order.items.map((_, i) => i)));
    setCarrier(order.delivery.method === 'pickup' ? 'pickup' : order.fulfillment?.carrier && (CARRIERS as readonly string[]).includes(order.fulfillment.carrier) ? (order.fulfillment.carrier as CarrierKey) : 'own');
    setTracking('');
  }, [open, order]);

  const partial = lines.size < order.items.length;
  const names = (idx: number[]) => idx.map((i) => localizeLine(order.items[i], products.find((p) => p.id === order.items[i].productId), order.lang, lang).name).join(', ');

  const submit = () => {
    if (!lines.size) return toast.error(t('noneSelected'));
    fulfillOrder(order.id, { carrier, tracking: tracking.trim() || undefined, partial });
    if (partial) addOrderNote(order.id, t('partialNote', { items: names([...lines].sort((a, b) => a - b)) }));
    toast.success(partial ? t('donePartial', { n: order.number }) : t('done', { n: order.number }));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('title')}
      description={t('description')}
      size="md"
      footer={
        <>
          <Button variant="outline" size="sm" shape="rounded" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button size="sm" shape="rounded" icon={partial ? <Truck className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />} onClick={submit} disabled={!lines.size}>
            {partial ? t('submitPartial', { n: lines.size }) : t('submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-5">
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink-soft">{t('items')}</p>
          <ul className="divide-y divide-line/70 rounded-lg border border-line">
            {order.items.map((l, i) => {
              const loc = localizeLine(l, products.find((p) => p.id === l.productId), order.lang, lang);
              const on = lines.has(i);
              return (
                <li key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Check
                    checked={on}
                    label={loc.name}
                    onChange={(v) =>
                      setLines((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(i);
                        else next.delete(i);
                        return next;
                      })
                    }
                  />
                  <Thumb src={l.image} className="h-9 w-9 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{loc.name}</span>
                    {loc.options && <span className="block truncate text-[12px] text-muted">{loc.options}</span>}
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink-soft">{qtyLabel(l, lang, tc('packs'))}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label={t('carrier')} value={carrier} onChange={(e) => setCarrier(e.target.value as CarrierKey)}>
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {to(`carrier_${c}`)}
              </option>
            ))}
          </SelectInput>
          <TextInput label={t('tracking')} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder={t('trackingPh')} hint={t('trackingHint')} />
        </div>
      </div>
    </Modal>
  );
}
