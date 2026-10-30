import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AuditAction, AuditEntry, AuditObject, Booking, CartItem, Category, CmsPage, Coupon, Customer, Db, DeliveryMethod, Discount,
  DraftOrder, HomeSection, Inquiry, InventoryMovement, L10n, Lang, MediaItem, MovementReason, Order, OrderLine, OrderStatus,
  PaymentMethod, Post, Product, Project, ReturnRequest, ReturnStatus, Settings,
} from '@/lib/types';
import { createSeed, DB_VERSION } from '@/data/seed';
import { priceCart } from '@/lib/pricing';
import { refundForLines } from '@/lib/orders';
import { checkBooking, type BookingConflict } from '@/lib/bookings';
import { isTracked } from '@/lib/inventory';
import { lt } from '@/i18n';
import { round2, uid } from '@/lib/utils';
import { safeStorage } from './storage';
import { useUi } from './ui';

export interface PlaceOrderInput {
  customer: Customer;
  items: CartItem[];
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  /** Legacy single code (= first code) */
  couponCode?: string | null;
  /** Entered discount codes */
  codes?: string[];
  lang: Lang;
}

export interface InquiryInput {
  type: Inquiry['type'];
  name: string;
  phone: string;
  email?: string;
  city?: string;
  service?: string;
  productId?: string;
  message: string;
  preferredDate?: string;
  source?: Inquiry['source'];
  company?: string;
  /** Inbox tags set by the form (e.g. "smart-glasses") */
  tags?: string[];
}

/** CMS v2 lists that support the generic upsert/remove actions. */
export type CollectionKey =
  | 'collections' | 'discounts' | 'offers' | 'placements' | 'staff' | 'services' | 'bookings' | 'segments'
  | 'movements' | 'purchaseOrders' | 'drafts' | 'returns' | 'quotes' | 'menus' | 'contentModels' | 'audit';
export type ItemOf<K extends CollectionKey> = Db[K][number];

export type AuditInput = Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string; at?: string };

export interface ReturnInput {
  orderId: string;
  lines: { productId: string; qty: number }[];
  reason: string;
  restock?: boolean;
  note?: string;
}

export type AddBookingInput = Omit<Booking, 'id' | 'createdAt' | 'status' | 'durationMin'> & { status?: Booking['status']; durationMin?: number };
export type BookingResult = { ok: true; booking: Booking } | { ok: false; reason: BookingConflict };

interface Actions {
  updateSettings: (patch: Partial<Settings>) => void;

  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => string | null;

  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, dir: -1 | 1) => void;

  placeOrder: (input: PlaceOrderInput) => Order;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  setOrderStatus: (id: string, status: OrderStatus, note?: string) => void;
  addOrderNote: (id: string, note: string) => void;
  markOrderSeen: (id: string) => void;
  markAllOrdersSeen: () => void;
  deleteOrder: (id: string) => void;
  /** Ship the order (status → shipped) and record the shipment */
  fulfillOrder: (id: string, info?: { carrier?: string; tracking?: string; partial?: boolean }) => void;
  /** Record a (partial) refund; full amount → payment status 'refunded' */
  refundOrder: (id: string, amount: number, lineIds?: string[], note?: string) => void;

  addInquiry: (input: InquiryInput) => Inquiry;
  updateInquiry: (id: string, patch: Partial<Inquiry>) => void;
  deleteInquiry: (id: string) => void;
  assignInquiry: (id: string, staffId: string | null) => void;

  upsertCoupon: (c: Coupon) => void;
  deleteCoupon: (id: string) => void;

  upsertPage: (p: CmsPage) => void;
  deletePage: (id: string) => void;

  upsertPost: (p: Post) => void;
  deletePost: (id: string) => void;

  upsertProject: (p: Project) => void;
  deleteProject: (id: string) => void;

  addMedia: (m: MediaItem) => void;
  updateMedia: (id: string, patch: Partial<MediaItem>) => void;
  deleteMedia: (id: string) => void;

  /** Replace one homepage section of the PUBLISHED home (edit) */
  updateHomeSection: (section: HomeSection) => void;
  /** Replace the full PUBLISHED list (reorder / toggle / add / remove) */
  setHome: (sections: HomeSection[]) => void;
  /** Save unpublished homepage edits */
  saveHomeDraft: (sections: HomeSection[]) => void;
  /** Draft → live; the previous live version goes to homeHistory (max 10). Returns false without a draft. */
  publishHome: () => boolean;
  discardHomeDraft: () => void;
  /** Load homeHistory[index] into the draft (preview, then publishHome) */
  restoreHomeVersion: (index: number) => void;

  /* ---- CMS v2 generic list actions ---- */
  upsert: <K extends CollectionKey>(key: K, item: ItemOf<K>) => void;
  remove: <K extends CollectionKey>(key: K, id: string) => void;

  /* ---- inventory & purchasing ---- */
  /** Change stock and write a movement. Returns the movement (null for unknown product). */
  adjustStock: (productId: string, delta: number, reason: MovementReason, note?: string, ref?: string) => InventoryMovement | null;
  /**
   * Receive goods. `lines` carry the CUMULATIVE received/rejected totals per product, so sending the same
   * receipt twice never adds stock twice. Returns the units added to stock.
   */
  receivePurchaseOrder: (id: string, lines: { productId: string; received: number; rejected?: number }[]) => number;

  /* ---- drafts & returns ---- */
  /** Draft → real order through the same path as placeOrder */
  convertDraft: (id: string) => Order | null;
  createReturn: (input: ReturnInput) => ReturnRequest | null;
  /** received → restock (once, if restock); refunded → refundOrder with the net paid amount */
  setReturnStatus: (id: string, status: ReturnStatus, note?: string) => void;

  /* ---- appointments ---- */
  addBooking: (input: AddBookingInput) => BookingResult;
  rescheduleBooking: (id: string, start: string, staffId?: string) => BookingResult;
  setBookingStatus: (id: string, status: Booking['status']) => void;

  logAudit: (entry: AuditInput) => void;

  resetDemo: () => void;
  importDb: (db: Db) => void;
}

export type DbStore = Db & Actions;

const upsertIn = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [item, ...list];

/** Every persisted key (use it for export/backup). */
export const DATA_KEYS: (keyof Db)[] = [
  'version', 'settings', 'categories', 'products', 'orders', 'inquiries', 'coupons', 'pages', 'posts', 'projects', 'media', 'home', 'seededAt',
  'collections', 'discounts', 'offers', 'placements', 'staff', 'services', 'bookings', 'segments', 'movements', 'purchaseOrders',
  'drafts', 'returns', 'quotes', 'menus', 'contentModels', 'audit', 'homeDraft', 'homeHistory',
];

const AUDIT_MAX = 300;
const MOVEMENTS_MAX = 500;
const HISTORY_MAX = 10;

/** Which generic lists are written to the audit log, and as what. */
const AUDITED: Partial<Record<CollectionKey, AuditObject>> = {
  collections: 'collection', discounts: 'discount', offers: 'offer', placements: 'placement', staff: 'staff', segments: 'segment',
  purchaseOrders: 'purchaseOrder', drafts: 'draft', returns: 'return', quotes: 'quote', menus: 'menu', bookings: 'booking',
};

/** Staff id of the person acting in the admin (demo: first active staff member with the current role). */
function actorId(s: Pick<Db, 'staff'>): string {
  const role = useUi.getState().adminRole;
  return s.staff.find((m) => m.active && m.role === role)?.id ?? s.staff.find((m) => m.role === 'owner')?.id ?? 'admin';
}

/** A short label for an audited item: name/title/number/code. */
function labelOf(item: unknown): string | undefined {
  const o = item as Record<string, unknown>;
  for (const k of ['number', 'code', 'title', 'name', 'customerName']) {
    const v = o?.[k];
    if (typeof v === 'string' && v) return v;
    if (v && typeof v === 'object' && typeof (v as L10n).me === 'string') return (v as L10n).me;
  }
  return undefined;
}

function entry(s: Pick<Db, 'staff'>, e: AuditInput): AuditEntry {
  return { id: uid('au'), at: e.at ?? new Date().toISOString(), actor: e.actor ?? actorId(s), action: e.action, object: e.object, objectId: e.objectId, ...(e.detail ? { detail: e.detail } : {}) };
}
const pushAudit = (s: Pick<Db, 'staff' | 'audit'>, ...items: AuditInput[]) => [...items.map((e) => entry(s, e)).reverse(), ...s.audit].slice(0, AUDIT_MAX);

const movement = (productId: string, delta: number, reason: MovementReason, by: string, note?: string, ref?: string): InventoryMovement => ({
  id: uid('mv'),
  productId,
  delta,
  reason,
  at: new Date().toISOString(),
  by,
  ...(note ? { note } : {}),
  ...(ref ? { ref } : {}),
});

/* ------------------------------------------------------------------ */
/* Order construction — shared by placeOrder and convertDraft          */
/* ------------------------------------------------------------------ */
interface BuiltOrder {
  order: Order;
  /** Patch to apply to the state (orders, products, discounts, offers, movements, audit) */
  patch: Partial<Db>;
}

/** "W" + 5 characters without look-alikes (no 0/O, 1/I/L): easy to read out on the phone, ~20 M combinations. */
function webOrderCode() {
  const abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const r = crypto.getRandomValues(new Uint8Array(5));
  return 'W' + Array.from(r, (b) => abc[b % abc.length]).join('');
}

function buildOrder(s: Db, input: PlaceOrderInput, extra: { customLines?: DraftOrder['customLines']; draftId?: string; by?: string; status?: OrderStatus } = {}): BuiltOrder {
  const totals = priceCart(input.items, s.products, s.settings, {
    lang: input.lang,
    codes: input.codes,
    couponCode: input.couponCode,
    discounts: s.discounts,
    collections: s.collections,
    delivery: input.delivery,
    city: input.customer.city,
  });
  const prefix = s.settings.orderPrefix || 'SC-';
  // sequential numbers only (web orders carry a letter code — see webOrderCode)
  const maxNum = s.orders.reduce((m, o) => Math.max(m, Number(/^\D*(\d+)$/.exec(o.number)?.[1] ?? 0)), 1000);
  const now = new Date().toISOString();
  const by = extra.by ?? 'web';
  const items: OrderLine[] = totals.lines.map((l) => ({
    productId: l.product.id,
    sku: l.product.sku,
    name: lt(l.product.name, input.lang),
    image: l.product.images[0] ?? '',
    unit: l.product.unit,
    packSize: l.product.packSize,
    qty: l.item.qty,
    options: l.optionsLabel,
    unitPrice: l.unitPrice,
    installation: l.item.installation,
    installationPrice: l.installationUnitPrice,
    lineTotal: l.lineTotal,
    discount: l.discount,
    allocations: l.allocations,
  }));
  const custom = (extra.customLines ?? []).filter((c) => c.title.trim() && c.qty > 0);
  for (const c of custom) {
    items.push({ productId: '', sku: 'CUSTOM', name: c.title.trim(), image: '', unit: 'kom', qty: c.qty, options: '', unitPrice: c.price, installation: false, installationPrice: 0, lineTotal: round2(c.price * c.qty), custom: true, discount: 0, allocations: [] });
  }
  const customTotal = round2(custom.reduce((sum, c) => sum + c.price * c.qty, 0));
  const total = round2(totals.total + customTotal);
  const firstCode = totals.applied.find((a) => a.code);
  const order: Order = {
    id: uid('o'),
    // Orders placed on the website are numbered in the customer's own browser (there is no server to count them),
    // so a sequential number would repeat between customers: they get a short random code instead.
    number: by === 'web' ? `${prefix}${webOrderCode()}` : `${prefix}${maxNum + 1}`,
    createdAt: now,
    status: extra.status ?? 'new',
    customer: input.customer,
    items,
    delivery: { method: input.delivery, fee: totals.shipping },
    payment: { method: input.payment, status: input.payment === 'card' ? 'paid' : 'pending' },
    coupon: firstCode ? { code: firstCode.code!, discount: totals.discount } : null,
    subtotal: round2(totals.subtotal + customTotal),
    installationTotal: totals.installationTotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total,
    vat: round2(total - total / (1 + s.settings.vatRate / 100)),
    lang: input.lang,
    timeline: [{ at: now, status: 'new', by }],
    seen: by !== 'web',
    discounts: totals.applied,
    shippingBeforeDiscount: totals.shippingBeforeDiscount,
    ...(extra.draftId ? { draftId: extra.draftId } : {}),
  };

  /* stock, sold counters and 'sale' movements */
  const moves: InventoryMovement[] = [];
  const products = s.products.map((p) => {
    const qty = input.items.filter((i) => i.productId === p.id).reduce((n, i) => n + i.qty, 0);
    if (!qty) return p;
    if (isTracked(p)) moves.push(movement(p.id, -Math.min(qty, p.stock), 'sale', by, undefined, order.number));
    return { ...p, sold: p.sold + qty, stock: isTracked(p) ? Math.max(0, p.stock - qty) : p.stock };
  });

  /* discount uses + live offer metrics */
  const usedIds = new Set(totals.applied.map((a) => a.id));
  const discounts = usedIds.size ? s.discounts.map((d) => (usedIds.has(d.id) ? { ...d, uses: d.uses + 1 } : d)) : s.discounts;
  const offers = usedIds.size
    ? s.offers.map((o) => {
        if (!o.discountId || !usedIds.has(o.discountId)) return o;
        const a = totals.applied.find((x) => x.id === o.discountId)!;
        const m = o.metrics;
        return { ...o, metrics: { ...m, orders: m.orders + 1, codeUses: m.codeUses + (a.code ? 1 : 0), revenue: round2(m.revenue + order.total), discountTotal: round2(m.discountTotal + a.amount) } };
      })
    : s.offers;

  return {
    order,
    patch: {
      orders: [order, ...s.orders],
      products,
      discounts,
      offers,
      movements: moves.length ? [...moves, ...s.movements].slice(0, MOVEMENTS_MAX) : s.movements,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */
export const useDb = create<DbStore>()(
  persist(
    (set, get) => ({
      ...createSeed(),

      updateSettings: (patch) =>
        set((s) => {
          const settings = { ...s.settings, ...patch };
          // the free-shipping threshold lives on the automatic shipping discount — keep both in sync
          let discounts = s.discounts;
          if (patch.freeShippingThreshold != null && patch.freeShippingThreshold !== s.settings.freeShippingThreshold) {
            discounts = s.discounts.map((d) =>
              d.kind === 'shipping' && d.method === 'auto' && d.minimum.type === 'amount' && d.status === 'active'
                ? { ...d, minimum: { type: 'amount' as const, value: patch.freeShippingThreshold as number } }
                : d,
            );
          }
          const keys = Object.keys(patch).filter((k) => patch[k as keyof Settings] !== s.settings[k as keyof Settings]);
          return { settings, discounts, audit: keys.length ? pushAudit(s, { action: 'update', object: 'settings', objectId: 'settings', detail: keys.join(', ') }) : s.audit };
        }),

      upsertProduct: (p) =>
        set((s) => {
          const prev = s.products.find((x) => x.id === p.id);
          const action: AuditAction = !prev ? 'create' : prev.status !== 'archived' && p.status === 'archived' ? 'archive' : prev.status !== 'active' && p.status === 'active' ? 'publish' : 'update';
          return {
            products: upsertIn(s.products, { ...p, updatedAt: new Date().toISOString() }),
            audit: pushAudit(s, { action, object: 'product', objectId: p.id, detail: p.name.me }),
          };
        }),
      deleteProduct: (id) =>
        set((s) => {
          const p = s.products.find((x) => x.id === id);
          return { products: s.products.filter((x) => x.id !== id), audit: p ? pushAudit(s, { action: 'delete', object: 'product', objectId: id, detail: p.name.me }) : s.audit };
        }),
      duplicateProduct: (id) => {
        const src = get().products.find((p) => p.id === id);
        if (!src) return null;
        const copy: Product = {
          ...structuredClone(src),
          id: uid('p'),
          slug: `${src.slug}-kopija`,
          sku: `${src.sku}-K`,
          name: { me: `${src.name.me} (kopija)`, sq: `${src.name.sq} (kopje)`, en: `${src.name.en} (copy)` },
          status: 'draft',
          sold: 0,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ products: [copy, ...s.products], audit: pushAudit(s, { action: 'create', object: 'product', objectId: copy.id, detail: copy.name.me }) }));
        return copy.id;
      },

      upsertCategory: (c) => set((s) => ({ categories: upsertIn(s.categories, c).sort((a, b) => a.order - b.order) })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
      moveCategory: (id, dir) =>
        set((s) => {
          const list = [...s.categories].sort((a, b) => a.order - b.order);
          const i = list.findIndex((c) => c.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= list.length) return {};
          [list[i], list[j]] = [list[j], list[i]];
          return { categories: list.map((c, k) => ({ ...c, order: k + 1 })) };
        }),

      placeOrder: (input) => {
        const { order, patch } = buildOrder(get(), input);
        set(patch);
        return order;
      },
      updateOrder: (id, patch) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      setOrderStatus: (id, status, note) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || o.status === status) return {};
          const now = new Date().toISOString();
          const by = actorId(s);
          const payment =
            status === 'completed' && o.payment.method === 'cod' ? { ...o.payment, status: 'paid' as const } : status === 'cancelled' && o.payment.status === 'paid' ? { ...o.payment, status: 'refunded' as const, refunded: o.total } : o.payment;
          const fulfillment =
            status === 'shipped' || status === 'installation' ? { ...o.fulfillment, shippedAt: o.fulfillment?.shippedAt ?? now } : status === 'completed' ? { ...o.fulfillment, deliveredAt: now } : o.fulfillment;
          const next: Order = { ...o, status, payment, fulfillment, seen: true, timeline: [...o.timeline, { at: now, status, note, by: 'admin' }] };
          // cancelling an open order releases the reserved stock
          let products = s.products;
          let movements = s.movements;
          if (status === 'cancelled' && (o.status === 'new' || o.status === 'confirmed' || o.status === 'processing')) {
            const moves: InventoryMovement[] = [];
            products = s.products.map((p) => {
              const qty = o.items.filter((l) => l.productId === p.id).reduce((n, l) => n + l.qty, 0);
              if (!qty || !isTracked(p)) return p;
              moves.push(movement(p.id, qty, 'correction', by, `Otkazana narudžba / Porosi e anuluar`, o.number));
              return { ...p, stock: p.stock + qty };
            });
            movements = [...moves, ...s.movements].slice(0, MOVEMENTS_MAX);
          }
          return {
            orders: s.orders.map((x) => (x.id === id ? next : x)),
            products,
            movements,
            audit: pushAudit(s, { action: 'status', object: 'order', objectId: id, detail: `${o.number}: ${o.status} → ${status}` }),
          };
        }),
      addOrderNote: (id, note) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, timeline: [...o.timeline, { at: new Date().toISOString(), status: 'note', note, by: 'admin' }] } : o)),
        })),
      markOrderSeen: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id && !o.seen ? { ...o, seen: true } : o)) })),
      markAllOrdersSeen: () => set((s) => ({ orders: s.orders.map((o) => (o.seen ? o : { ...o, seen: true })) })),
      deleteOrder: (id) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          return { orders: s.orders.filter((x) => x.id !== id), audit: o ? pushAudit(s, { action: 'delete', object: 'order', objectId: id, detail: o.number }) : s.audit };
        }),
      fulfillOrder: (id, info = {}) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          if (!o || o.status === 'cancelled' || o.status === 'completed') return {};
          const now = new Date().toISOString();
          const status: OrderStatus = o.status === 'shipped' || o.status === 'installation' ? o.status : 'shipped';
          const next: Order = {
            ...o,
            status,
            seen: true,
            fulfillment: { ...o.fulfillment, shippedAt: o.fulfillment?.shippedAt ?? now, ...(info.carrier ? { carrier: info.carrier } : {}), ...(info.tracking ? { tracking: info.tracking } : {}), partial: !!info.partial },
            timeline: o.status === status ? o.timeline : [...o.timeline, { at: now, status, note: info.tracking ? `${info.carrier ?? ''} ${info.tracking}`.trim() : undefined, by: 'admin' }],
          };
          return { orders: s.orders.map((x) => (x.id === id ? next : x)), audit: pushAudit(s, { action: 'fulfil', object: 'order', objectId: id, detail: o.number }) };
        }),
      refundOrder: (id, amount, lineIds = [], note) =>
        set((s) => {
          const o = s.orders.find((x) => x.id === id);
          const value = round2(Math.max(0, amount));
          if (!o || !value) return {};
          const already = o.payment.refunded ?? (o.refunds ?? []).reduce((sum, r) => sum + r.amount, 0);
          const refunded = round2(Math.min(o.total, already + value));
          const now = new Date().toISOString();
          const by = actorId(s);
          const next: Order = {
            ...o,
            refunds: [...(o.refunds ?? []), { id: uid('rf'), at: now, amount: round2(refunded - already), lineIds, ...(note ? { note } : {}), by }],
            payment: { ...o.payment, refunded, status: refunded >= o.total - 0.005 ? 'refunded' : o.payment.status },
            timeline: [...o.timeline, { at: now, status: 'payment', note: note ?? `Refund ${round2(refunded - already).toFixed(2)} €`, by: 'admin' }],
          };
          return { orders: s.orders.map((x) => (x.id === id ? next : x)), audit: pushAudit(s, { action: 'refund', object: 'order', objectId: id, detail: `${o.number}: ${round2(refunded - already).toFixed(2)} €` }) };
        }),

      addInquiry: (input) => {
        const inq: Inquiry = { id: uid('inq'), createdAt: new Date().toISOString(), status: 'new', seen: false, source: input.type === 'measurement' ? 'measurement' : input.type === 'quote' ? 'quote' : 'web-form', ...input };
        set((s) => ({ inquiries: [inq, ...s.inquiries] }));
        return inq;
      },
      updateInquiry: (id, patch) => set((s) => ({ inquiries: s.inquiries.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
      deleteInquiry: (id) => set((s) => ({ inquiries: s.inquiries.filter((q) => q.id !== id) })),
      assignInquiry: (id, staffId) =>
        set((s) => {
          const q = s.inquiries.find((x) => x.id === id);
          if (!q) return {};
          const member = s.staff.find((m) => m.id === staffId);
          return {
            inquiries: s.inquiries.map((x) => (x.id === id ? { ...x, assignee: staffId ?? undefined, seen: true } : x)),
            audit: pushAudit(s, { action: 'assign', object: 'inquiry', objectId: id, detail: `${q.name} → ${member?.name ?? '—'}` }),
          };
        }),

      upsertCoupon: (c) => set((s) => ({ coupons: upsertIn(s.coupons, { ...c, code: c.code.trim().toUpperCase() }) })),
      deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) })),

      upsertPage: (p) => set((s) => ({ pages: upsertIn(s.pages, { ...p, updatedAt: new Date().toISOString() }) })),
      deletePage: (id) => set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),

      upsertPost: (p) => set((s) => ({ posts: upsertIn(s.posts, p).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) })),
      deletePost: (id) => set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),

      upsertProject: (p) => set((s) => ({ projects: upsertIn(s.projects, p) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      addMedia: (m) => set((s) => ({ media: [m, ...s.media] })),
      updateMedia: (id, patch) => set((s) => ({ media: s.media.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
      deleteMedia: (id) => set((s) => ({ media: s.media.filter((m) => m.id !== id) })),

      updateHomeSection: (section) => set((s) => ({ home: s.home.map((h) => (h.id === section.id ? section : h)) })),
      setHome: (home) => set({ home }),
      saveHomeDraft: (sections) => set({ homeDraft: sections }),
      publishHome: () => {
        const s = get();
        if (!s.homeDraft) return false;
        const by = actorId(s);
        set({
          home: s.homeDraft,
          homeDraft: null,
          homeHistory: [{ at: new Date().toISOString(), by, sections: s.home }, ...s.homeHistory].slice(0, HISTORY_MAX),
          audit: pushAudit(s, { action: 'publish', object: 'home', objectId: 'home', actor: by }),
        });
        return true;
      },
      discardHomeDraft: () => set({ homeDraft: null }),
      restoreHomeVersion: (index) =>
        set((s) => {
          const v = s.homeHistory[index];
          if (!v) return {};
          return { homeDraft: structuredClone(v.sections), audit: pushAudit(s, { action: 'restore', object: 'home', objectId: 'home', detail: v.at }) };
        }),

      /* ---------------- generic CMS v2 lists ---------------- */
      upsert: (key, item) =>
        set((s) => {
          let value = item as ItemOf<typeof key>;
          let settings = s.settings;
          if (key === 'discounts') {
            const d = item as Discount;
            const normalized: Discount = { ...d, code: d.method === 'code' && d.code ? d.code.trim().replace(/\s+/g, '').toUpperCase() : d.code };
            value = normalized as ItemOf<typeof key>;
            // keep the storefront's "free delivery over X" copy in sync with the automatic shipping rule
            if (d.kind === 'shipping' && d.method === 'auto' && d.status === 'active' && d.minimum.type === 'amount' && d.audience.type === 'all') {
              settings = { ...s.settings, freeShippingThreshold: d.minimum.value };
            }
          }
          const list = s[key] as unknown as { id: string }[];
          const exists = list.some((x) => x.id === (value as { id: string }).id);
          const next = upsertIn(list, value as { id: string });
          const obj = AUDITED[key];
          return {
            [key]: next,
            ...(settings !== s.settings ? { settings } : {}),
            ...(obj ? { audit: pushAudit(s, { action: exists ? 'update' : 'create', object: obj, objectId: (value as { id: string }).id, detail: labelOf(value) }) } : {}),
          } as Partial<DbStore>;
        }),
      remove: (key, id) =>
        set((s) => {
          const list = s[key] as unknown as { id: string }[];
          const item = list.find((x) => x.id === id);
          if (!item) return {};
          const obj = AUDITED[key];
          return {
            [key]: list.filter((x) => x.id !== id),
            ...(obj ? { audit: pushAudit(s, { action: 'delete', object: obj, objectId: id, detail: labelOf(item) }) } : {}),
          } as Partial<DbStore>;
        }),

      /* ---------------- inventory & purchasing ---------------- */
      adjustStock: (productId, delta, reason, note, ref) => {
        const s = get();
        const p = s.products.find((x) => x.id === productId);
        if (!p || !delta) return null;
        const by = actorId(s);
        const applied = Math.max(-p.stock, Math.round(delta));
        const mv = movement(productId, applied, reason, by, note, ref);
        set({
          products: s.products.map((x) => (x.id === productId ? { ...x, stock: Math.max(0, x.stock + applied), updatedAt: mv.at } : x)),
          movements: [mv, ...s.movements].slice(0, MOVEMENTS_MAX),
          audit: pushAudit(s, { action: 'adjust', object: 'inventory', objectId: productId, detail: `${p.sku} ${applied > 0 ? '+' : ''}${applied} (${reason})` }),
        });
        return mv;
      },
      receivePurchaseOrder: (id, lines) => {
        const s = get();
        const po = s.purchaseOrders.find((x) => x.id === id);
        if (!po || po.status === 'draft' || po.status === 'closed') return 0;
        const by = actorId(s);
        const added = new Map<string, number>();
        const nextLines = po.lines.map((l) => {
          const r = lines.find((x) => x.productId === l.productId);
          if (!r) return l;
          const rejected = Math.max(l.rejected, Math.min(l.ordered, Math.round(r.rejected ?? l.rejected)));
          const received = Math.max(l.received, Math.min(l.ordered - rejected, Math.round(r.received)));
          const delta = received - l.received;
          if (delta > 0) added.set(l.productId, (added.get(l.productId) ?? 0) + delta);
          return { ...l, received, rejected };
        });
        const done = nextLines.every((l) => l.received + l.rejected >= l.ordered);
        const anyIn = nextLines.some((l) => l.received + l.rejected > 0);
        const status = done ? 'closed' : anyIn ? 'partial' : po.status;
        const moves = [...added].map(([pid, q]) => movement(pid, q, 'received', by, po.supplier, po.number));
        const total = [...added.values()].reduce((a, b) => a + b, 0);
        set({
          purchaseOrders: s.purchaseOrders.map((x) => (x.id === id ? { ...x, lines: nextLines, status } : x)),
          products: s.products.map((p) => {
            const q = added.get(p.id);
            if (!q) return p;
            const line = nextLines.find((l) => l.productId === p.id)!;
            return { ...p, stock: isTracked(p) ? p.stock + q : p.stock, incoming: Math.max(0, line.ordered - line.received - line.rejected), updatedAt: new Date().toISOString() };
          }),
          movements: moves.length ? [...moves, ...s.movements].slice(0, MOVEMENTS_MAX) : s.movements,
          audit: total ? pushAudit(s, { action: 'receive', object: 'purchaseOrder', objectId: id, detail: `${po.number}: +${total}` }) : s.audit,
        });
        return total;
      },

      /* ---------------- drafts & returns ---------------- */
      convertDraft: (id) => {
        const s = get();
        const d = s.drafts.find((x) => x.id === id);
        if (!d || d.status === 'converted') return null;
        const by = actorId(s);
        const customer: Customer = {
          firstName: d.customer.firstName ?? '',
          lastName: d.customer.lastName ?? '',
          email: d.customer.email ?? '',
          phone: d.customer.phone ?? '',
          city: d.customer.city ?? '',
          address: d.customer.address ?? '',
          ...(d.customer.company ? { company: d.customer.company } : {}),
          ...(d.customer.pib ? { pib: d.customer.pib } : {}),
          ...(d.note ? { note: d.note } : {}),
        };
        const { order, patch } = buildOrder(
          s,
          { customer, items: d.items, delivery: d.delivery, payment: d.payment ?? 'bank', codes: d.discountCodes, lang: d.lang ?? 'sq' },
          { customLines: d.customLines, draftId: d.id, by, status: 'confirmed' },
        );
        const withTags: Order = { ...order, tags: d.tags, timeline: [...order.timeline, { at: order.createdAt, status: 'confirmed', note: d.number, by: 'admin' }] };
        set({
          ...patch,
          orders: [withTags, ...s.orders],
          drafts: s.drafts.map((x) => (x.id === id ? { ...x, status: 'converted', convertedOrderId: order.id } : x)),
          audit: pushAudit(s, { action: 'convert', object: 'draft', objectId: id, detail: `${d.number} → ${order.number}` }),
        });
        return withTags;
      },
      createReturn: (input) => {
        const s = get();
        const o = s.orders.find((x) => x.id === input.orderId);
        const lines = input.lines.filter((l) => l.qty > 0 && o?.items.some((i) => i.productId === l.productId));
        if (!o || !lines.length) return null;
        const maxNum = s.returns.reduce((m, r) => Math.max(m, Number(r.number.replace(/\D/g, '')) || 0), 1000);
        const now = new Date().toISOString();
        const by = actorId(s);
        const ret: ReturnRequest = {
          id: uid('rt'),
          number: `RT-${maxNum + 1}`,
          orderId: o.id,
          lines,
          reason: input.reason,
          status: 'requested',
          refundAmount: refundForLines(o, lines),
          restock: input.restock ?? true,
          createdAt: now,
          timeline: [{ at: now, status: 'requested', by, ...(input.note ? { note: input.note } : {}) }],
        };
        set({ returns: [ret, ...s.returns], audit: pushAudit(s, { action: 'create', object: 'return', objectId: ret.id, detail: `${ret.number} (${o.number})` }) });
        return ret;
      },
      setReturnStatus: (id, status, note) => {
        const s = get();
        const r = s.returns.find((x) => x.id === id);
        if (!r || r.status === status) return;
        const by = actorId(s);
        const now = new Date().toISOString();
        // restock only once the goods are physically back — and only once (idempotent)
        const restockNow = status === 'received' && r.restock && !r.restocked;
        if (restockNow) for (const l of r.lines) get().adjustStock(l.productId, l.qty, 'return', r.reason, r.number);
        const restocked = !!r.restocked || restockNow;
        if (status === 'refunded' && r.refundAmount > 0) {
          const o = get().orders.find((x) => x.id === r.orderId);
          const lineIds = o ? o.items.map((l, i) => (r.lines.some((x) => x.productId === l.productId) ? String(i) : '')).filter(Boolean) : [];
          get().refundOrder(r.orderId, r.refundAmount, lineIds, r.number);
        }
        set((st) => ({
          returns: st.returns.map((x) => (x.id === id ? { ...x, status, restocked, timeline: [...x.timeline, { at: now, status, by, ...(note ? { note } : {}) }] } : x)),
          audit: pushAudit(st, { action: 'status', object: 'return', objectId: id, detail: `${r.number}: ${r.status} → ${status}` }),
        }));
      },

      /* ---------------- appointments ---------------- */
      addBooking: (input) => {
        const s = get();
        const service = s.services.find((x) => x.id === input.serviceId);
        const candidate = { ...input, durationMin: input.durationMin ?? service?.durationMin ?? 60 };
        const check = checkBooking(candidate, s.bookings, s.services);
        if (!check.ok) return check;
        const booking: Booking = { ...candidate, id: uid('bk'), status: input.status ?? 'confirmed', createdAt: new Date().toISOString() };
        set({
          bookings: [...s.bookings, booking].sort((a, b) => a.start.localeCompare(b.start)),
          inquiries: booking.inquiryId ? s.inquiries.map((q) => (q.id === booking.inquiryId ? { ...q, status: 'scheduled', scheduledAt: booking.start, seen: true } : q)) : s.inquiries,
          audit: pushAudit(s, { action: 'create', object: 'booking', objectId: booking.id, detail: `${booking.customerName} · ${booking.start.slice(0, 16).replace('T', ' ')}` }),
        });
        return { ok: true, booking };
      },
      rescheduleBooking: (id, start, staffId) => {
        const s = get();
        const b = s.bookings.find((x) => x.id === id);
        if (!b) return { ok: false, reason: 'invalid' };
        const next: Booking = { ...b, start, staffId: staffId ?? b.staffId };
        const check = checkBooking(next, s.bookings, s.services, id);
        if (!check.ok) return check;
        set({
          bookings: s.bookings.map((x) => (x.id === id ? next : x)).sort((a, c) => a.start.localeCompare(c.start)),
          inquiries: b.inquiryId ? s.inquiries.map((q) => (q.id === b.inquiryId ? { ...q, scheduledAt: start } : q)) : s.inquiries,
          audit: pushAudit(s, { action: 'update', object: 'booking', objectId: id, detail: `${b.customerName} → ${start.slice(0, 16).replace('T', ' ')}` }),
        });
        return { ok: true, booking: next };
      },
      setBookingStatus: (id, status) =>
        set((s) => {
          const b = s.bookings.find((x) => x.id === id);
          if (!b || b.status === status) return {};
          return {
            bookings: s.bookings.map((x) => (x.id === id ? { ...x, status } : x)),
            inquiries: b.inquiryId && status === 'done' ? s.inquiries.map((q) => (q.id === b.inquiryId ? { ...q, status: 'done' } : q)) : s.inquiries,
            audit: pushAudit(s, { action: 'status', object: 'booking', objectId: id, detail: `${b.customerName}: ${b.status} → ${status}` }),
          };
        }),

      logAudit: (e) => set((s) => ({ audit: pushAudit(s, e) })),

      resetDemo: () => set({ ...createSeed() }),
      // Older backups miss the CMS v2 lists — fill them from fresh demo data.
      importDb: (db) => {
        const seed = createSeed();
        set({ ...seed, ...db, settings: { ...seed.settings, ...db.settings }, version: DB_VERSION });
      },
    }),
    {
      name: 'itcom-cms-db',
      version: DB_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as DbStore,
      // Any schema change → start from fresh demo data.
      migrate: () => createSeed() as unknown as DbStore,
    },
  ),
);

/** Convenience non-reactive accessor */
export const db = () => useDb.getState();
