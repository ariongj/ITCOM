import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CalendarClock, CheckCheck, Inbox, ShoppingBag, TimerReset } from 'lucide-react';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { dateTime, money, timeAgo } from '@/lib/format';
import { offerState } from '@/lib/offers';
import { cn } from '@/lib/utils';
import { DROPDOWN, useDismiss } from './popover';

const H48 = 48 * 3600 * 1000;

type Kind = 'order' | 'contact' | 'booking' | 'offer';
interface Notif {
  id: string;
  kind: Kind;
  group: 'new' | 'attention';
  /** Sort key (ISO) */
  at: string;
  /** Shown as "x min ago" (new) or as a date (attention) */
  when: string;
  to: string;
  title: string;
  sub: string;
}

const ICON: Record<Kind, ComponentType<{ className?: string }>> = {
  order: ShoppingBag,
  contact: Inbox,
  booking: CalendarClock,
  offer: TimerReset,
};

/**
 * Notification feed (PDF p.08 "Kërkojnë vëmendje"): new orders, new contacts, bookings awaiting confirmation and
 * offers that end within 48 h — each only when the current role may open that module.
 */
function useNotifications() {
  const t = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const orders = useDb((s) => s.orders);
  const inquiries = useDb((s) => s.inquiries);
  const bookings = useDb((s) => s.bookings);
  const services = useDb((s) => s.services);
  const offers = useDb((s) => s.offers);

  return useMemo(() => {
    const now = Date.now();
    const out: Notif[] = [];
    if (can('orders')) {
      for (const o of orders) {
        if (o.seen) continue;
        out.push({ id: o.id, kind: 'order', group: 'new', at: o.createdAt, when: timeAgo(o.createdAt, lang), to: `/admin/narudzbe/${o.id}`, title: t('newOrder', { n: o.number }), sub: `${o.customer.firstName} ${o.customer.lastName} · ${money(o.total, lang)}` });
      }
    }
    if (can('contacts')) {
      for (const q of inquiries) {
        if (q.seen) continue;
        out.push({ id: q.id, kind: 'contact', group: 'new', at: q.createdAt, when: timeAgo(q.createdAt, lang), to: `/admin/kontakti?id=${q.id}`, title: t('newInquiry', { name: q.name }), sub: q.message.replace(/\s+/g, ' ').slice(0, 80) });
      }
    }
    if (can('appointments')) {
      for (const b of bookings) {
        if (b.status !== 'pending') continue;
        const svc = services.find((s) => s.id === b.serviceId);
        out.push({ id: b.id, kind: 'booking', group: 'attention', at: b.start, when: dateTime(b.start, lang), to: `/admin/termini?id=${b.id}`, title: t('pendingBooking', { name: b.customerName }), sub: [svc && l(svc.name), b.city].filter(Boolean).join(' · ') });
      }
    }
    if (can('offers')) {
      for (const o of offers) {
        if (!o.endsAt || offerState(o, now) !== 'active') continue;
        const left = new Date(o.endsAt).getTime() - now;
        if (left <= 0 || left > H48) continue;
        out.push({ id: o.id, kind: 'offer', group: 'attention', at: o.endsAt, when: dateTime(o.endsAt, lang), to: `/admin/ponude/${o.id}`, title: t('offerEnding', { name: l(o.name), h: Math.max(1, Math.round(left / 3600000)) }), sub: l(o.badge) || l(o.description) });
      }
    }
    const fresh = out.filter((n) => n.group === 'new').sort((a, b) => b.at.localeCompare(a.at));
    const attention = out.filter((n) => n.group === 'attention').sort((a, b) => a.at.localeCompare(b.at));
    return { fresh, attention, total: out.length };
  }, [orders, inquiries, bookings, services, offers, can, t, l, lang]);
}

/** Toast when a new order arrives (storefront in another tab → cross-tab sync), with a shortcut to it. */
export function useNewOrderToasts() {
  const t = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const orders = useDb((s) => s.orders);
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const unseen = orders.filter((o) => !o.seen);
    if (seenIds.current === null) {
      seenIds.current = new Set(unseen.map((o) => o.id));
      return;
    }
    for (const o of unseen) {
      if (seenIds.current.has(o.id)) continue;
      seenIds.current.add(o.id);
      if (!can('orders')) continue;
      toast.success(t('newOrder', { n: o.number }), {
        description: `${o.customer.firstName} ${o.customer.lastName} · ${money(o.total, lang)}`,
        action: { label: t('open'), onClick: () => navigate(`/admin/narudzbe/${o.id}`) },
      });
    }
  }, [orders, t, lang, can, navigate]);
}

export function Notifications() {
  const t = useDict(adm, 'admin');
  const { fresh, attention, total } = useNotifications();
  const markAllOrdersSeen = useDb((s) => s.markAllOrdersSeen);
  const inquiries = useDb((s) => s.inquiries);
  const updateInquiry = useDb((s) => s.updateInquiry);
  const can = useCan();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, ref);

  const markAll = () => {
    if (can('orders')) markAllOrdersSeen();
    if (can('contacts')) inquiries.filter((q) => !q.seen).forEach((q) => updateInquiry(q.id, { seen: true }));
  };

  const section = (label: string, list: Notif[]) =>
    list.length > 0 && (
      <div>
        <div className="sticky top-0 z-[1] bg-[#f7f7f7] px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">
          {label} · {list.length}
        </div>
        {list.map((n) => {
          const Icon = ICON[n.kind];
          return (
            <Link key={`${n.kind}-${n.id}`} to={n.to} onClick={close} className="flex gap-3 border-b border-black/[0.06] px-4 py-3 transition-colors last:border-0 hover:bg-[#f5f5f5]">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f1f1f1] text-[#1a1a1a] ring-1 ring-black/[0.06]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold leading-snug text-ink">{n.title}</span>
                {n.sub && <span className="mt-0.5 block truncate text-[12px] text-muted">{n.sub}</span>}
                <span className="mt-0.5 block text-[11px] text-muted/80">{n.when}</span>
              </span>
            </Link>
          );
        })}
      </div>
    );

  return (
    <div ref={ref} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn('relative grid h-9 w-9 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white', open && 'bg-white/10 text-white')}
        aria-label={`${t('notifications')}${total ? ` (${total})` : ''}`}
        aria-expanded={open}
        title={t('notifications')}
      >
        <Bell className="h-[18px] w-[18px]" />
        {total > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 animate-pop place-items-center rounded-full bg-white px-1 text-[9.5px] font-extrabold tabular-nums text-[#1a1a1a] ring-2 ring-[#1a1a1a]">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className={cn(DROPDOWN, 'sm:w-[380px]')}>
            <div className="flex items-center justify-between gap-3 border-b border-black/[0.08] px-4 py-3">
              <span className="text-[14px] font-semibold">{t('notifications')}</span>
              {fresh.length > 0 && (
                <button type="button" className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-soft hover:text-ink hover:underline" onClick={markAll}>
                  <CheckCheck className="h-3.5 w-3.5" /> {t('markAllRead')}
                </button>
              )}
            </div>
            <div className="max-h-[min(440px,calc(100vh-140px))] overflow-y-auto overscroll-contain">
              {total === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f1f1f1] text-muted">
                    <Bell className="h-4.5 w-4.5" />
                  </span>
                  <p className="text-[13px] text-muted">{t('noNotifications')}</p>
                </div>
              ) : (
                <>
                  {section(t('notifNew'), fresh)}
                  {section(t('notifAttention'), attention)}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
