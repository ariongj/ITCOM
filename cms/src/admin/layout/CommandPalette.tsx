import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CornerDownLeft, FileText, Inbox, LayoutGrid, Newspaper, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { useCan } from '@/store/hooks';
import { aggregateCustomers } from '@/admin/components/crm/customers';
import { money, timeAgo } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, initials, thumb } from '@/lib/utils';
import type { L10n } from '@/lib/types';
import { screensFor } from './nav';
import { MOD_KEY, useScrollLock } from './popover';

type GroupId = 'recent' | 'screens' | 'products' | 'orders' | 'customers' | 'collections' | 'offers' | 'pages' | 'blog' | 'contacts';

interface Hit {
  key: string;
  group: GroupId;
  to: string;
  title: string;
  sub?: string;
  meta?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  img?: string;
  avatar?: string;
}

const PER_GROUP = 5;
const all = (v: L10n | undefined) => (v ? `${v.me} ${v.sq} ${v.en}` : '');

/**
 * Global search / command palette (top bar, Ctrl/⌘+K) — PDF p.08 "Kërko produkte, porosi ose klientë…".
 * Searches products, orders, customers, collections, offers, pages, blog posts, contacts and the CMS screens
 * the current role may open. Diacritics-insensitive, every word must match. ↑/↓ to move, Enter to open, Esc to close.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  useScrollLock(open);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[640px]"
          >
            <Palette onClose={onClose} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const t = useDict(adm, 'admin');
  const tc = useDict(common, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const role = useUi((s) => s.adminRole);
  const navigate = useNavigate();

  const products = useDb((s) => s.products);
  const orders = useDb((s) => s.orders);
  const collections = useDb((s) => s.collections);
  const offers = useDb((s) => s.offers);
  const pages = useDb((s) => s.pages);
  const posts = useDb((s) => s.posts);
  const inquiries = useDb((s) => s.inquiries);

  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const customers = useMemo(() => (can('customers') ? aggregateCustomers(orders) : []), [orders, can]);
  const screens = useMemo(() => screensFor(role), [role]);

  const hits = useMemo<Hit[]>(() => {
    const tokens = fold(q.trim()).split(/\s+/).filter(Boolean);
    const match = (hay: string) => tokens.every((w) => hay.includes(w));
    const take = <T,>(list: T[], hay: (x: T) => string, max = PER_GROUP) => {
      const out: T[] = [];
      for (const x of list) {
        if (match(fold(hay(x)))) out.push(x);
        if (out.length >= max) break;
      }
      return out;
    };
    const screenHits = (list: typeof screens): Hit[] =>
      list.map((s) => ({ key: `s:${s.to}`, group: 'screens', to: s.to, title: t(s.label), sub: s.parent ? t(s.parent) : undefined, icon: s.icon }));
    const orderHit = (o: (typeof orders)[number], group: GroupId): Hit => ({
      key: `${group}:${o.id}`,
      group,
      to: `/admin/narudzbe/${o.id}`,
      title: o.number,
      sub: `${o.customer.firstName} ${o.customer.lastName} · ${money(o.total, lang)}`,
      meta: (
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', o.status === 'cancelled' ? 'bg-black/25' : o.status === 'completed' ? 'bg-emerald-600' : 'bg-[#1a1a1a]')} />
          {tc(`status_${o.status}`)}
        </span>
      ),
      icon: ShoppingBag,
    });

    if (!tokens.length) {
      const recent = can('orders') ? [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((o) => orderHit(o, 'recent')) : [];
      return [...recent, ...screenHits(screens)];
    }

    const out: Hit[] = [];
    out.push(...screenHits(take(screens, (s) => `${t(s.label)} ${s.parent ? t(s.parent) : ''} ${s.to}`, 4)));
    if (can('products')) {
      for (const p of take(products, (p) => `${all(p.name)} ${p.sku} ${p.slug} ${p.vendor ?? ''} ${(p.tags ?? []).join(' ')}`)) {
        out.push({ key: `p:${p.id}`, group: 'products', to: `/admin/proizvodi/${p.id}`, title: l(p.name), sub: p.sku, meta: money(p.salePrice ?? p.price, lang), img: p.images[0] });
      }
    }
    if (can('orders')) {
      const sorted = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const o of take(sorted, (o) => `${o.number} ${o.number.replace(/\D/g, '')} ${o.customer.firstName} ${o.customer.lastName} ${o.customer.email} ${o.customer.phone} ${o.customer.city} ${o.customer.company ?? ''}`)) {
        out.push(orderHit(o, 'orders'));
      }
    }
    for (const c of take(customers, (c) => `${c.name} ${c.email} ${c.phone} ${c.city} ${c.company ?? ''}`)) {
      out.push({ key: `c:${c.key}`, group: 'customers', to: `/admin/kupci?c=${encodeURIComponent(c.key)}`, title: c.name, sub: [c.email || c.phone, c.city].filter(Boolean).join(' · '), meta: money(c.spent, lang), avatar: initials(c.name) });
    }
    if (can('collections')) {
      for (const c of take(collections, (c) => `${all(c.title)} ${c.slug}`)) {
        out.push({ key: `col:${c.id}`, group: 'collections', to: `/admin/kolekcije/${c.id}`, title: l(c.title), sub: `/koleksioni/${c.slug}`, meta: c.published ? t('published') : t('draft'), img: c.image, icon: LayoutGrid });
      }
    }
    if (can('offers')) {
      for (const o of take(offers, (o) => `${all(o.name)} ${all(o.badge)} ${o.slug}`)) {
        out.push({ key: `of:${o.id}`, group: 'offers', to: `/admin/ponude/${o.id}`, title: l(o.name), sub: l(o.badge), img: o.image, icon: Sparkles });
      }
    }
    if (can('content')) {
      for (const p of take(pages, (p) => `${all(p.title)} ${p.slug}`)) {
        out.push({ key: `pg:${p.id}`, group: 'pages', to: `/admin/stranice/${p.id}`, title: l(p.title), sub: `/faqe/${p.slug}`, meta: p.published ? t('published') : t('draft'), icon: FileText });
      }
      for (const p of take(posts, (p) => `${all(p.title)} ${all(p.tag)} ${p.slug}`)) {
        out.push({ key: `po:${p.id}`, group: 'blog', to: `/admin/savjeti/${p.id}`, title: l(p.title), sub: l(p.tag), img: p.cover, icon: Newspaper });
      }
    }
    if (can('contacts')) {
      const sorted = [...inquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      for (const i of take(sorted, (i) => `${i.name} ${i.email ?? ''} ${i.phone} ${i.city ?? ''} ${i.company ?? ''} ${i.message}`)) {
        out.push({ key: `inq:${i.id}`, group: 'contacts', to: `/admin/kontakti?id=${i.id}`, title: i.name, sub: i.message.replace(/\s+/g, ' ').slice(0, 90), meta: timeAgo(i.createdAt, lang), icon: Inbox });
      }
    }
    return out;
  }, [q, screens, products, orders, customers, collections, offers, pages, posts, inquiries, can, t, tc, l, lang]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onClose();
    navigate(h.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (hits.length ? (i + 1) % hits.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
    } else if (e.key === 'Home') {
      setActive(0);
    } else if (e.key === 'End') {
      setActive(Math.max(0, hits.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const LABEL: Record<GroupId, string> = {
    recent: t('cmdRecent'),
    screens: t('cmdScreens'),
    products: t('nav_products'),
    orders: t('nav_orders'),
    customers: t('nav_customers'),
    collections: t('nav_collections'),
    offers: t('nav_offers'),
    pages: t('nav_pages'),
    blog: t('nav_blog'),
    contacts: t('nav_contacts'),
  };

  const activeId = hits[active] ? `cmd-${hits[active].key}` : undefined;

  return (
    <div role="dialog" aria-modal="true" aria-label={t('cmdTitle')} className="overflow-hidden rounded-xl bg-white text-ink shadow-[0_24px_80px_-20px_rgb(0_0_0/0.55)] ring-1 ring-black/10">
      <div className="flex items-center gap-3 border-b border-black/[0.08] px-4">
        <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('searchPlaceholder')}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmd-list"
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          spellCheck={false}
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/80"
        />
        <button type="button" onClick={onClose} className="shrink-0 rounded-md border border-black/10 px-1.5 py-0.5 text-[11px] font-semibold text-muted hover:text-ink">
          Esc
        </button>
      </div>

      <div ref={listRef} id="cmd-list" role="listbox" className="max-h-[min(60vh,480px)] overflow-y-auto overscroll-contain py-1.5">
        {!q.trim() && <p className="px-4 pb-1 pt-2 text-[12px] text-muted">{t('cmdHint')}</p>}
        {hits.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f1f1f1] text-muted">
              <Search className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-ink">{t('cmdEmpty', { q: q.trim() })}</p>
            <p className="mt-1 max-w-sm text-[12.5px] text-muted">{t('cmdEmptyHint')}</p>
          </div>
        ) : (
          hits.map((h, i) => {
            const first = i === 0 || hits[i - 1].group !== h.group;
            const on = i === active;
            const Icon = h.icon ?? ArrowRight;
            return (
              <div key={h.key}>
                {first && <div className="px-4 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{LABEL[h.group]}</div>}
                <div
                  id={`cmd-${h.key}`}
                  role="option"
                  aria-selected={on}
                  data-idx={i}
                  onMouseMove={() => active !== i && setActive(i)}
                  onClick={() => go(h)}
                  className={cn('mx-2 flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2', on && 'bg-[#f1f1f1]')}
                >
                  {h.img ? (
                    <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[#f1f1f1] ring-1 ring-black/[0.06]">
                      <img src={thumb(h.img)} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </span>
                  ) : h.avatar ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e3e3e3] text-[11px] font-bold text-[#303030]">{h.avatar}</span>
                  ) : (
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md ring-1', on ? 'bg-white ring-black/10' : 'bg-[#f7f7f7] ring-black/[0.06]')}>
                      <Icon className="h-4 w-4 text-[#303030]" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{h.title}</span>
                    {h.sub && <span className="block truncate text-[12px] text-muted">{h.sub}</span>}
                  </span>
                  {h.meta && <span className="hidden shrink-0 text-[12px] text-muted sm:block">{h.meta}</span>}
                  <CornerDownLeft className={cn('h-3.5 w-3.5 shrink-0 text-muted', on ? 'opacity-100' : 'opacity-0')} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden items-center gap-4 border-t border-black/[0.08] bg-[#fafafa] px-4 py-2 text-[11.5px] text-muted sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> {t('cmdNavigate')}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> {t('cmdOpen')}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> {t('cmdClose')}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>{MOD_KEY}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-5 min-w-5 place-items-center rounded border border-black/10 bg-white px-1 font-sans text-[10.5px] font-semibold text-ink-soft shadow-[0_1px_0_rgb(0_0_0/0.08)]">{children}</kbd>;
}
