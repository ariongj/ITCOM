// CMS v2 navigation — PDF p.06 (structure) and p.08 / p.12 (sidebar mock-ups).
// One source of truth for the sidebar, the command palette ("Ekranet") and permission checks.
import type { ComponentType } from 'react';
import {
  CalendarDays, ChartColumn, FileText, Globe, House, Megaphone, MessagesSquare, Plug, Settings, ShoppingBag, Store, Tag, User,
} from 'lucide-react';
import { can, type Module } from '@/lib/permissions';
import type { RoleId } from '@/lib/types';
import type { adm } from '@/admin/i18n';

export type NavKey = Extract<keyof (typeof adm)['me'], `nav_${string}`>;
export type NavBadge = 'newOrders' | 'newInquiries' | 'pendingBookings';

export interface NavLeaf {
  to: string;
  label: NavKey;
  /** Permission module (view). `null` = visible to every role. */
  module: Module | null;
}

export interface NavItem extends NavLeaf {
  id: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  section: 'main' | 'channels' | 'bottom';
  badge?: NavBadge;
  /** Sub-items, shown under the parent while it is active */
  children?: NavLeaf[];
}

export const NAV: NavItem[] = [
  { id: 'overview', to: '/admin', label: 'nav_overview', icon: House, module: 'overview', section: 'main' },
  {
    id: 'orders', to: '/admin/narudzbe', label: 'nav_orders', icon: ShoppingBag, module: 'orders', section: 'main', badge: 'newOrders',
    children: [
      { to: '/admin/narudzbe', label: 'nav_orders', module: 'orders' },
      { to: '/admin/nacrti', label: 'nav_drafts', module: 'drafts' },
      { to: '/admin/povrati', label: 'nav_returns', module: 'returns' },
    ],
  },
  {
    id: 'products', to: '/admin/proizvodi', label: 'nav_products', icon: Tag, module: 'products', section: 'main',
    children: [
      { to: '/admin/proizvodi', label: 'nav_products', module: 'products' },
      { to: '/admin/kolekcije', label: 'nav_collections', module: 'collections' },
      { to: '/admin/kategorije', label: 'nav_categories', module: 'products' },
      { to: '/admin/inventar', label: 'nav_inventory', module: 'inventory' },
      { to: '/admin/nabavke', label: 'nav_purchasing', module: 'purchasing' },
    ],
  },
  {
    id: 'customers', to: '/admin/kupci', label: 'nav_customers', icon: User, module: 'customers', section: 'main',
    children: [
      { to: '/admin/kupci', label: 'nav_customers', module: 'customers' },
      { to: '/admin/segmenti', label: 'nav_segments', module: 'segments' },
    ],
  },
  {
    id: 'contacts', to: '/admin/kontakti', label: 'nav_contacts', icon: MessagesSquare, module: 'contacts', section: 'main', badge: 'newInquiries',
    children: [
      { to: '/admin/kontakti', label: 'nav_inbox', module: 'contacts' },
      { to: '/admin/kontakti/ponude', label: 'nav_quotes', module: 'quotes' },
    ],
  },
  {
    id: 'appointments', to: '/admin/termini', label: 'nav_appointments', icon: CalendarDays, module: 'appointments', section: 'main', badge: 'pendingBookings',
    children: [
      { to: '/admin/termini', label: 'nav_calendar', module: 'appointments' },
      { to: '/admin/termini/usluge', label: 'nav_services', module: 'appointments' },
    ],
  },
  {
    id: 'growth', to: '/admin/ponude', label: 'nav_growth', icon: Megaphone, module: 'offers', section: 'main',
    children: [
      { to: '/admin/ponude', label: 'nav_offers', module: 'offers' },
      { to: '/admin/popusti', label: 'nav_discounts', module: 'discounts' },
    ],
  },
  {
    id: 'content', to: '/admin/stranice', label: 'nav_content', icon: FileText, module: 'content', section: 'main',
    children: [
      { to: '/admin/stranice', label: 'nav_pages', module: 'content' },
      { to: '/admin/savjeti', label: 'nav_blog', module: 'content' },
      { to: '/admin/meniji', label: 'nav_menus', module: 'content' },
      { to: '/admin/mediji', label: 'nav_media', module: 'content' },
    ],
  },
  { id: 'analytics', to: '/admin/analitika', label: 'nav_analytics', icon: ChartColumn, module: 'analytics', section: 'main' },
  {
    id: 'onlineStore', to: '/admin/prodavnica', label: 'nav_onlineStore', icon: Store, module: 'onlineStore', section: 'channels',
    children: [
      { to: '/admin/prodavnica/slajdovi', label: 'nav_slides', module: 'onlineStore' },
      { to: '/admin/prodavnica/publikimi', label: 'nav_publish', module: 'onlineStore' },
    ],
  },
  { id: 'markets', to: '/admin/trzista', label: 'nav_markets', icon: Globe, module: 'markets', section: 'channels' },
  { id: 'integrations', to: '/admin/integracije', label: 'nav_integrations', icon: Plug, module: 'integrations', section: 'channels' },
  { id: 'settings', to: '/admin/konfiguracija', label: 'nav_settings', icon: Settings, module: 'settings', section: 'bottom' },
];

/** Readable module names (no-permission screen, role tables). */
export const MODULE_LABEL: Record<Module, NavKey> = {
  overview: 'nav_overview',
  orders: 'nav_orders',
  drafts: 'nav_drafts',
  returns: 'nav_returns',
  products: 'nav_products',
  collections: 'nav_collections',
  inventory: 'nav_inventory',
  purchasing: 'nav_purchasing',
  customers: 'nav_customers',
  segments: 'nav_segments',
  offers: 'nav_offers',
  discounts: 'nav_discounts',
  content: 'nav_content',
  onlineStore: 'nav_onlineStore',
  markets: 'nav_markets',
  analytics: 'nav_analytics',
  contacts: 'nav_contacts',
  quotes: 'nav_quotes',
  appointments: 'nav_appointments',
  integrations: 'nav_integrations',
  settings: 'nav_settings',
  staff: 'nav_staff',
};

/** Segment-aware prefix match: '/admin/kontakti' matches '/admin/kontakti/x' but not '/admin/kontaktiX'. */
export function pathMatches(path: string, to: string) {
  if (to === '/admin') return path === '/admin' || path === '/admin/';
  return path === to || path.startsWith(`${to}/`);
}

const allowed = (role: RoleId, leaf: NavLeaf) => leaf.module === null || can(role, leaf.module, 'view');

/** Sidebar for a role: hidden items removed, a parent links to its first visible sub-item. */
export function navFor(role: RoleId): NavItem[] {
  const out: NavItem[] = [];
  for (const item of NAV) {
    if (!item.children) {
      if (allowed(role, item)) out.push(item);
      continue;
    }
    const children = item.children.filter((c) => allowed(role, c));
    if (!children.length) continue;
    out.push({ ...item, to: children[0].to, children });
  }
  return out;
}

/** Every screen a role can open, flattened (command palette). */
export function screensFor(role: RoleId): { to: string; label: NavKey; parent?: NavKey; icon: NavItem['icon'] }[] {
  const out: { to: string; label: NavKey; parent?: NavKey; icon: NavItem['icon'] }[] = [];
  for (const item of navFor(role)) {
    if (!item.children) out.push({ to: item.to, label: item.label, icon: item.icon });
    else for (const c of item.children) out.push({ to: c.to, label: c.label, parent: c.label === item.label ? undefined : item.label, icon: item.icon });
  }
  return out;
}

/** Active parent + sub-item for a pathname (longest matching link wins). */
export function activeNav(path: string, items: NavItem[]): { item?: NavItem; leaf?: NavLeaf } {
  let best: { item?: NavItem; leaf?: NavLeaf; len: number } = { len: -1 };
  for (const item of items) {
    for (const leaf of item.children ?? [item]) {
      if (pathMatches(path, leaf.to) && leaf.to.length > best.len) best = { item, leaf, len: leaf.to.length };
    }
  }
  return { item: best.item, leaf: best.leaf };
}
