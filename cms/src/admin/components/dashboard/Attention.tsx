import { useMemo, type ComponentType } from 'react';
import { Link } from 'react-router';
import { CalendarClock, CheckCheck, ChevronRight, CreditCard, Hourglass, PackageMinus, Truck, Undo2, UserX } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { money, timeAgo, unitLabel } from '@/lib/format';
import type { Lang } from '@/lib/types';
import { daysUntil, expiringOffers, lowStockProducts, openReturns, pendingBookings, pendingPayments, unassignedContacts, unfulfilledOrders } from './data';
import { fmtDate } from './dates';
import { D, pluralKey } from './i18n';
import { Empty } from './lists';

interface Item {
  id: string;
  icon: ComponentType<{ className?: string }>;
  text: string;
  detail?: string;
  to: string;
}

const shortDate = (iso: string, lang: Lang) => fmtDate(new Date(iso), lang, { day: 'numeric', month: 'short' });
const dateTimeShort = (iso: string, lang: Lang) => fmtDate(new Date(iso), lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * "Kërkojnë vëmendje" (PDF p.08 + p.38 operational reports): each queue links straight to its filtered list,
 * a single item opens directly. Only queues the current role may open are shown.
 */
function useAttentionItems(now: Date): Item[] {
  const t = useDict(D, 'admin');
  const tc = useDict(common, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const products = useDb((s) => s.products);
  const orders = useDb((s) => s.orders);
  const bookings = useDb((s) => s.bookings);
  const inquiries = useDb((s) => s.inquiries);
  const offers = useDb((s) => s.offers);
  const returns = useDb((s) => s.returns);

  return useMemo(() => {
    const out: Item[] = [];
    const plural = (base: 'low' | 'book' | 'offers' | 'contacts' | 'payments' | 'unful' | 'returns', n: number) => t(`${base}_${pluralKey(lang, n)}`, { n });

    // 1 · low stock (mock-up row 1)
    if (can('inventory') && can('products')) {
      const low = lowStockProducts(products);
      if (low.length) {
        const p = low[0];
        const qty = `${p.stock} ${p.unit === 'm2' ? tc('packs') : unitLabel(p.unit, lang)}`;
        out.push({ id: 'low', icon: PackageMinus, text: plural('low', low.length), detail: t('d_low', { name: l(p.name), n: qty }), to: '/admin/proizvodi?zalihe=low' });
      }
    }
    // 2 · bookings awaiting confirmation
    if (can('appointments')) {
      const list = pendingBookings(bookings);
      if (list.length) {
        const b = list[0];
        out.push({
          id: 'bookings',
          icon: CalendarClock,
          text: plural('book', list.length),
          detail: t('d_book', { name: b.customerName, when: dateTimeShort(b.start, lang) }),
          to: list.length === 1 ? `/admin/termini?id=${b.id}` : '/admin/termini?status=pending',
        });
      }
    }
    // 3 · offers that end soon
    if (can('offers')) {
      const list = expiringOffers(offers, now);
      if (list.length) {
        const o = list[0];
        const d = daysUntil(new Date(o.endsAt!), now);
        const when = d <= 0 ? t('when_today') : d === 1 ? t('when_tomorrow') : t('when_days', { n: d });
        out.push(
          list.length === 1
            ? {
                id: 'offers',
                icon: Hourglass,
                text: t('offer_one', { name: l(o.name), when }),
                detail: t('d_offer', { date: shortDate(o.endsAt!, lang), revenue: money(o.metrics.revenue, lang, { decimals: false }) }),
                to: `/admin/ponude/${o.id}`,
              }
            : { id: 'offers', icon: Hourglass, text: plural('offers', list.length), detail: t('d_offers', { name: l(o.name), date: shortDate(o.endsAt!, lang) }), to: '/admin/ponude?status=active' },
        );
      }
    }
    // 4 · contacts without an assignee
    if (can('contacts')) {
      const list = unassignedContacts(inquiries);
      if (list.length) {
        const q = list[0];
        out.push({
          id: 'contacts',
          icon: UserX,
          text: plural('contacts', list.length),
          detail: t('d_contacts', { name: q.name, ago: timeAgo(q.createdAt, lang) }),
          to: list.length === 1 ? `/admin/kontakti?id=${q.id}` : '/admin/kontakti?assignee=none',
        });
      }
    }
    // 5 · payments pending · 6 · unfulfilled orders (p.38 "Porosi të papërmbushura dhe pagesa në pritje")
    if (can('orders')) {
      const pay = pendingPayments(orders);
      if (pay.length) {
        const sum = pay.reduce((s, o) => s + o.total, 0);
        out.push({ id: 'payments', icon: CreditCard, text: plural('payments', pay.length), detail: t('d_payments', { amount: money(sum, lang, { decimals: false }) }), to: '/admin/narudzbe?payment=pending' });
      }
      const open = unfulfilledOrders(orders);
      if (open.length) {
        const o = open[0];
        out.push({ id: 'unfulfilled', icon: Truck, text: plural('unful', open.length), detail: t('d_unful', { n: o.number, ago: timeAgo(o.createdAt, lang) }), to: '/admin/narudzbe?fulfillment=unfulfilled' });
      }
    }
    // 7 · returns waiting
    if (can('returns')) {
      const list = openReturns(returns);
      if (list.length) {
        const r = list[0];
        out.push({ id: 'returns', icon: Undo2, text: plural('returns', list.length), detail: t('d_returns', { n: r.number, amount: money(r.refundAmount, lang) }), to: '/admin/povrati?status=requested' });
      }
    }
    return out;
  }, [products, orders, bookings, inquiries, offers, returns, now, can, t, tc, l, lang]);
}

export function Attention({ now, className }: { now: Date; className?: string }) {
  const t = useDict(D, 'admin');
  const items = useAttentionItems(now);
  return (
    <Card
      className={className}
      title={
        <span className="inline-flex items-center gap-2">
          {t('att_title')}
          {items.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[11px] font-semibold tabular-nums text-white">{items.length}</span>}
        </span>
      }
      description={t('att_desc')}
      padded={false}
    >
      {items.length === 0 ? (
        <Empty icon={<CheckCheck className="h-5 w-5" />} title={t('att_clear')} text={t('att_clear_text')} />
      ) : (
        <ul className="divide-y divide-line/70">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.id}>
                <Link to={it.to} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f7f7f7] focus-visible:bg-[#f7f7f7] focus-visible:outline-none">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1f1f1] text-ink-soft transition-colors group-hover:bg-[#e8e8e8] group-hover:text-ink">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-snug text-ink">{it.text}</span>
                    {it.detail && <span className="mt-0.5 block truncate text-[12px] text-muted">{it.detail}</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/25 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
