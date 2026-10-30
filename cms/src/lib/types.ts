// Core data model shared by the storefront and the CMS.
// Everything the client can edit lives in the persisted `db` store (see store/db.ts).

export type Lang = 'me' | 'sq' | 'en';

/** A localized string: Montenegrin (default), Albanian, English. */
export type L10n = { me: string; sq: string; en: string };

/** Units a product can be sold in. */
export type Unit = 'kom' | 'm2' | 'm' | 'set';

export type Badge = 'new' | 'sale' | 'bestseller' | 'premium';

export interface Category {
  id: string;
  slug: string;
  name: L10n;
  tagline: L10n;
  description: L10n;
  image: string;
  order: number;
  featured: boolean;
}

export interface ProductOptionValue {
  id: string;
  label: L10n;
  /** CSS color for swatch-type options */
  swatch?: string;
  /** Added to the unit price when selected (EUR, VAT incl.) */
  priceDelta?: number;
}

export interface ProductOption {
  id: string;
  name: L10n;
  type: 'swatch' | 'button';
  values: ProductOptionValue[];
}

export interface ProductSpec {
  label: L10n;
  value: L10n;
}

/** Product lifecycle (PDF p.09): archived products stay in orders/history but leave the storefront and lists. */
export type ProductStatus = 'active' | 'draft' | 'archived';
/** Sales channels a product is published to (PDF p.06/p.10). */
export type SalesChannel = 'online' | 'pos';

export interface Product {
  id: string;
  slug: string;
  sku: string;
  categoryId: string;
  name: L10n;
  short: L10n;
  description: L10n;
  /** Regular price in EUR (VAT included) per unit — the "compare-at" (Çmimi referues) when salePrice is set */
  price: number;
  /** Optional sale price (VAT included) — the active selling price */
  salePrice?: number | null;
  unit: Unit;
  /** m² per package (flooring/tiles) — cart quantity is in packages */
  packSize?: number;
  /** On-hand quantity available to sell (999 = made to order / unlimited) */
  stock: number;
  images: string[];
  options: ProductOption[];
  specs: ProductSpec[];
  /** Installation offered as an add-on, priced per unit (per m² for m2 products) */
  installation?: { available: boolean; price: number } | null;
  badges: Badge[];
  featured: boolean;
  status: ProductStatus;
  /** Made-to-measure products: "Request a quote" instead of "Add to cart" */
  quoteOnly?: boolean;
  /** Typical lead time in days */
  leadDays?: number;
  warrantyYears?: number;
  seo?: { title?: string; description?: string };
  createdAt: string;
  updatedAt?: string;
  sold: number;

  /* ---- CMS v2 (all optional) ---- */
  /** Internal cost per item, EUR (Kosto / copë) — visible only with permission `viewCost` */
  cost?: number;
  /** Brand / supplier */
  vendor?: string;
  tags?: string[];
  barcode?: string;
  /** Units on order from suppliers (Në ardhje) */
  incoming?: number;
  /** Blocked units — damaged, reserved for display… (E bllokuar) */
  unavailable?: number;
  /** Public template: regular product page or a "request a quote" page */
  template?: 'standard' | 'quote';
  /** Channels the product is published to (default: online) */
  channels?: SalesChannel[];
  /** ITCOM storefront data kept with the product: filter values, rating, badge text, drawing fallback */
  itcom?: { attrs: Record<string, string | number>; rating: number; reviews: number; badge: string; art: unknown };
}

export interface CartItem {
  key: string;
  productId: string;
  /** pieces / metres / packages (for m2 products) */
  qty: number;
  options: Record<string, string>;
  installation: boolean;
}

export type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipped' | 'installation' | 'completed' | 'cancelled';
export type PaymentMethod = 'cod' | 'bank' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type DeliveryMethod = 'delivery' | 'pickup';

export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  image: string;
  unit: Unit;
  packSize?: number;
  qty: number;
  /** Human readable option summary, e.g. "Širina: 80 cm · Boja: Bijela" */
  options: string;
  unitPrice: number;
  installation: boolean;
  installationPrice: number;
  lineTotal: number;
  /** CMS v2: total discount allocated to this line (product + share of order discounts), EUR */
  discount?: number;
  /** CMS v2: how that discount splits per rule (PDF p.24 "Çdo allocation ruhet në porosi") */
  allocations?: DiscountAllocation[];
  /** CMS v2: custom (non-catalogue) line added from a draft order */
  custom?: boolean;
}

/** A discount rule applied to an order — snapshot stored on the order. */
export interface AppliedDiscount {
  id: string;
  title: string;
  kind: DiscountKind;
  code?: string;
  /** EUR saved by this rule */
  amount: number;
}

export interface DiscountAllocation {
  discountId: string;
  amount: number;
}

export interface Refund {
  id: string;
  at: string;
  amount: number;
  /** Order line indexes (as strings) the refund covers — informative */
  lineIds: string[];
  note?: string;
  by?: string;
}

/** Derived order states (PDF p.17) — see lib/orders.ts */
export type FulfillmentState = 'unfulfilled' | 'partial' | 'fulfilled' | 'delivered';
export type PaymentState = 'pending' | 'authorized' | 'paid' | 'partially_refunded' | 'refunded' | 'failed';

export interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  company?: string;
  pib?: string;
  note?: string;
}

export interface OrderEvent {
  at: string;
  status: OrderStatus | 'note' | 'payment';
  note?: string;
  by?: string;
}

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  customer: Customer;
  items: OrderLine[];
  delivery: { method: DeliveryMethod; fee: number; date?: string };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    /** CMS v2: EUR refunded so far (partial refunds) */
    refunded?: number;
    /** CMS v2: card authorised but not captured yet */
    authorized?: boolean;
    /** CMS v2: last payment attempt failed */
    failed?: boolean;
  };
  /** Legacy single-code snapshot (first applied code) — kept for older screens */
  coupon?: { code: string; discount: number } | null;
  subtotal: number;
  installationTotal: number;
  /** Product + order discounts (EUR). Shipping discounts are reflected in `shipping`. */
  discount: number;
  shipping: number;
  total: number;
  vat: number;
  lang: Lang;
  timeline: OrderEvent[];
  internalNote?: string;
  /** false until an admin opens it — drives the "new" badge */
  seen: boolean;
  demo?: boolean;

  /* ---- CMS v2 (all optional) ---- */
  /** Every discount rule applied at checkout (incl. shipping) */
  discounts?: AppliedDiscount[];
  /** Shipping fee before any shipping discount */
  shippingBeforeDiscount?: number;
  refunds?: Refund[];
  fulfillment?: { shippedAt?: string; deliveredAt?: string; carrier?: string; tracking?: string; partial?: boolean };
  tags?: string[];
  /** Draft order this order was converted from */
  draftId?: string;
}

export type InquiryType = 'measurement' | 'contact' | 'quote';
export type InquiryStatus = 'new' | 'contacted' | 'scheduled' | 'done';
/** Where an inquiry came from (PDF p.43) */
export type InquirySource = 'web-form' | 'measurement' | 'phone' | 'manual' | 'quote';
/** Inbox kind, derived from the type — see inquiryKind() in lib/crm.ts */
export type InquiryKind = 'contact' | 'b2b' | 'meeting';

export interface Inquiry {
  id: string;
  createdAt: string;
  type: InquiryType;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  service?: string;
  productId?: string;
  message: string;
  preferredDate?: string;
  status: InquiryStatus;
  seen: boolean;
  scheduledAt?: string;
  note?: string;

  /* ---- CMS v2 (all optional) ---- */
  /** Staff id responsible (Përgjegjësi) */
  assignee?: string;
  source?: InquirySource;
  tags?: string[];
  company?: string;
  /** Follow-up deadline (Afat ndjekjeje) */
  followUpAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minTotal?: number;
  active: boolean;
  uses: number;
  expiresAt?: string;
  description?: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: L10n;
  /** Lightweight markdown: ## headings, - lists, **bold**, [links](url), > quotes */
  body: L10n;
  published: boolean;
  showInFooter: boolean;
  updatedAt: string;
}

export interface Post {
  id: string;
  slug: string;
  title: L10n;
  excerpt: L10n;
  body: L10n;
  cover: string;
  tag: L10n;
  author: string;
  readMinutes: number;
  publishedAt: string;
  published: boolean;
}

export interface Project {
  id: string;
  title: L10n;
  location: string;
  year: number;
  tags: L10n[];
  summary: L10n;
  image: string;
  featured: boolean;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  alt?: string;
  folder: string;
  uploaded: boolean;
  createdAt: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface Cta { label: L10n; href: string }

export interface HeroSlide {
  id: string;
  image: string;
  eyebrow: L10n;
  title: L10n;
  subtitle: L10n;
  primary: Cta;
  secondary: Cta;
}

/** Homepage is a list of sections the client can reorder, toggle and edit. */
export type HomeSection =
  | { id: string; type: 'hero'; enabled: boolean; data: { slides: HeroSlide[]; autoplay: boolean } }
  | { id: string; type: 'trust'; enabled: boolean; data: { items: { icon: string; title: L10n; text: L10n }[] } }
  | { id: string; type: 'categories'; enabled: boolean; data: { eyebrow: L10n; title: L10n; subtitle: L10n } }
  | { id: string; type: 'featured'; enabled: boolean; data: { eyebrow: L10n; title: L10n; mode: 'bestsellers' | 'sale' | 'new' | 'manual'; productIds: string[] } }
  | { id: string; type: 'promo'; enabled: boolean; data: { eyebrow: L10n; title: L10n; text: L10n; image: string; cta: Cta; endsAt: string; code: string } }
  | { id: string; type: 'process'; enabled: boolean; data: { eyebrow: L10n; title: L10n; steps: { title: L10n; text: L10n }[] } }
  | { id: string; type: 'services'; enabled: boolean; data: { eyebrow: L10n; title: L10n; subtitle: L10n; items: { image: string; title: L10n; text: L10n }[] } }
  | { id: string; type: 'projects'; enabled: boolean; data: { eyebrow: L10n; title: L10n; subtitle: L10n } }
  | { id: string; type: 'stats'; enabled: boolean; data: { items: { value: string; label: L10n }[]; quote: L10n; image: string } }
  | { id: string; type: 'instagram'; enabled: boolean; data: { title: L10n; images: string[] } }
  | { id: string; type: 'faq'; enabled: boolean; data: { eyebrow: L10n; title: L10n; items: { q: L10n; a: L10n }[] } }
  | { id: string; type: 'blog'; enabled: boolean; data: { eyebrow: L10n; title: L10n } }
  | { id: string; type: 'cta'; enabled: boolean; data: { eyebrow: L10n; title: L10n; text: L10n; image: string } }
  /** Spotlight on a new range or page (e.g. smart glasses): image, short copy, up to 4 points and two buttons. */
  | { id: string; type: 'spotlight'; enabled: boolean; data: { eyebrow: L10n; title: L10n; text: L10n; image: string; points: { text: L10n }[]; primary: Cta; secondary: Cta } };

export type HomeSectionType = HomeSection['type'];

export interface ShippingZone {
  id: string;
  name: string;
  cities: string[];
  fee: number;
  days: string;
}

export interface Settings {
  companyName: string;
  legalName: string;
  tagline: L10n;
  about: L10n;
  email: string;
  phone: string;
  phone2?: string;
  whatsapp?: string;
  address: string;
  city: string;
  mapUrl: string;
  hours: L10n;
  pib: string;
  pdv: string;
  bankName: string;
  bankAccount: string;
  instagram: string;
  facebook?: string;
  currency: 'EUR';
  vatRate: number;
  freeShippingThreshold: number;
  shippingZones: ShippingZone[];
  pickupAddress: string;
  payments: { cod: boolean; bank: boolean; card: boolean };
  languages: { me: boolean; sq: boolean; en: boolean };
  announcements: L10n[];
  brandColor: string;
  demoBanner: boolean;
  seo: { title: string; description: string };
  adminEmail: string;

  /* ---- CMS v2 ---- */
  /** IANA zone used for schedules (discounts, offers, bookings) */
  timezone: string;
  /** Prefix for order numbers, e.g. "SC-" → SC-1042 */
  orderPrefix: string;
  locations: StoreLocation[];
  notifications: NotificationTemplate[];
  integrations: Integration[];
  markets: Market[];
  checkout: CheckoutSettings;
  privacy: { cookieBanner: boolean };
  /** ITCOM: order channel (webhook). The shop also sends every order, message and booking here (HTTPS POST). */
  orderEndpoint?: string;
}

/* ================================================================== */
/* CMS v2 — catalogue, marketing, operations                          */
/* ================================================================== */

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  /** Customers can pick up orders here */
  pickup: boolean;
  isDefault: boolean;
}

export type NotificationEvent =
  | 'order_placed'
  | 'order_confirmed'
  | 'payment_received'
  | 'order_shipped'
  | 'return_requested'
  | 'return_refunded'
  | 'contact_received'
  | 'booking_confirmed'
  | 'booking_reminder'
  | 'staff_new_order'
  | 'staff_new_inquiry';

export interface NotificationTemplate {
  id: string;
  event: NotificationEvent;
  enabled: boolean;
  recipients: 'customer' | 'staff';
  subject: L10n;
}

export type IntegrationKind = 'payment' | 'courier' | 'email' | 'fiscal' | 'analytics' | 'erp';
export interface Integration {
  id: string;
  kind: IntegrationKind;
  name: string;
  status: 'connected' | 'test' | 'disconnected';
  note: string;
}

export interface Market {
  id: string;
  name: L10n;
  /** ISO country codes, e.g. ['ME'] */
  countries: string[];
  currency: string;
  languages: Lang[];
  status: 'active' | 'draft';
}

export interface CheckoutSettings {
  /** Allow checkout without an account */
  guest: boolean;
  phoneRequired: boolean;
  companyField: 'optional' | 'hidden' | 'required';
  marketingOptIn: boolean;
}

/* ---------------- Collections (PDF p.14) ---------------- */
export type CollectionRuleField = 'category' | 'price' | 'compareAt' | 'stock' | 'status' | 'tag' | 'title' | 'vendor' | 'onSale' | 'badge';
export type RuleOp = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
export interface CollectionRule {
  field: CollectionRuleField;
  op: RuleOp;
  /** Always stored as text: numbers as "300", booleans as "true", ids as "cat-podovi" */
  value: string;
}
export type CollectionSort = 'manual' | 'bestselling' | 'price-asc' | 'price-desc' | 'newest';

export interface Collection {
  id: string;
  slug: string;
  title: L10n;
  description: L10n;
  image: string;
  /** manual = hand-picked productIds; smart = membership follows `rules` dynamically */
  kind: 'manual' | 'smart';
  /** Manual members (also manual order when sort = 'manual') */
  productIds: string[];
  match: 'all' | 'any';
  rules: CollectionRule[];
  sort: CollectionSort;
  published: boolean;
  seo?: { title?: string; description?: string };
  createdAt?: string;
}

/* ---------------- Discounts (PDF pp.20–27) ---------------- */
export type DiscountKind = 'products' | 'order' | 'bxgy' | 'shipping';
/** Combination class: BXGY counts as a product discount */
export type DiscountClass = 'products' | 'order' | 'shipping';
export type DiscountMethod = 'code' | 'auto';
/** Stored status — 'scheduled' and 'expired' are derived from dates (discountState) */
export type DiscountStatus = 'active' | 'draft' | 'paused';
export type DiscountState = DiscountStatus | 'scheduled' | 'expired';

export interface DiscountTarget {
  scope: 'all' | 'collections' | 'products';
  ids: string[];
}

export interface Discount {
  id: string;
  /** Internal name (staff only) */
  title: string;
  /** Shown to the shopper in cart/checkout */
  publicTitle: L10n;
  kind: DiscountKind;
  method: DiscountMethod;
  /** Required when method = 'code' — stored trimmed + uppercase */
  code?: string;
  valueType: 'percent' | 'fixed';
  /** Percent 0–100 or EUR amount */
  value: number;
  /** Which lines benefit (products) / form the base (order). Ignored for shipping & bxgy. */
  appliesTo: DiscountTarget;
  /** Fixed products discount: true = per item, false = once per order (split over eligible lines) */
  perItem?: boolean;
  minimum: { type: 'none' | 'amount' | 'qty'; value: number };
  bxgy?: {
    buyIds: string[];
    buyScope: 'collections' | 'products';
    buyQty: number;
    getIds: string[];
    getScope: 'collections' | 'products';
    getQty: number;
    getType: 'free' | 'percent';
    /** Percent off Y when getType = 'percent' */
    getValue: number;
    /** Max applications per order */
    maxUses: number;
  };
  shipping?: {
    /** Only rates up to this fee are discounted (EUR) */
    maxRate?: number;
    /** Limit to shipping zones (settings.shippingZones ids) */
    zoneIds?: string[];
  };
  audience: { type: 'all' | 'segment'; segmentId?: string };
  /** Mutual combination flags — both rules must allow each other */
  combines: { products: boolean; order: boolean; shipping: boolean };
  usageLimit?: number;
  oncePerCustomer?: boolean;
  startsAt: string;
  endsAt?: string;
  status: DiscountStatus;
  uses: number;
  createdAt: string;
  tags?: string[];
}

/* ---------------- Offers centre (PDF pp.28–30) ---------------- */
export type OfferStatus = 'draft' | 'active' | 'paused';
export type OfferState = OfferStatus | 'scheduled' | 'expired';
export type OfferSlot = 'hero' | 'banner' | 'announcement' | 'home-block';

export interface OfferMetrics {
  visits: number;
  ctaClicks: number;
  codeUses: number;
  orders: number;
  revenue: number;
  discountTotal: number;
}

export interface Offer {
  id: string;
  slug: string;
  name: L10n;
  description: L10n;
  status: OfferStatus;
  startsAt: string;
  endsAt?: string;
  /** Linked discount rule — the offer never copies the percentage itself */
  discountId?: string;
  collectionId?: string;
  productIds: string[];
  badge: L10n;
  image: string;
  landing: { title: L10n; text: L10n };
  /** Where the campaign is shown */
  placements: OfferSlot[];
  /** Staff id responsible */
  owner: string;
  /** e.g. "utm_source=site&utm_campaign=jesen-podovi" */
  utm: string;
  metrics: OfferMetrics;
  createdAt?: string;
}

/* ---------------- Slideshow, banners, announcement bar (PDF pp.31–35) ---------------- */
export type PlacementKind = 'slide' | 'banner' | 'announcement';
export type PlacementPosition = 'home-hero' | 'home-banner' | 'catalog' | 'bar';
export type PlacementState = 'active' | 'draft' | 'scheduled' | 'expired' | 'paused';

export interface Placement {
  id: string;
  kind: PlacementKind;
  position: PlacementPosition;
  /** Internal name */
  name: string;
  eyebrow: L10n;
  title: L10n;
  subtitle: L10n;
  cta: Cta;
  /** Optional second button (hero slides) */
  secondary?: Cta;
  image: string;
  imageMobile?: string;
  alt: L10n;
  textAlign: 'left' | 'center';
  /** Dark overlay strength 0–80 (%) */
  overlay: number;
  /** Linked offer — the placement inherits its validity */
  offerId?: string;
  startsAt?: string;
  endsAt?: string;
  status: 'active' | 'draft';
  order: number;
}

/* ---------------- Staff, roles ---------------- */
export type RoleId = 'owner' | 'manager' | 'catalog' | 'orders' | 'editor' | 'marketing' | 'reception';

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  /** Avatar / calendar colour */
  color: string;
  active: boolean;
  phone?: string;
  title?: L10n;
}

/* ---------------- Appointments (PDF pp.45–46) ---------------- */
export interface Service {
  id: string;
  name: L10n;
  description?: L10n;
  durationMin: number;
  /** Parallel bookings allowed for the same slot */
  capacity: number;
  price?: number;
  color: string;
  staffIds: string[];
  /** 'onsite' = at the customer's address, or a settings.locations id */
  location?: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'done' | 'cancelled' | 'noshow';

export interface Booking {
  id: string;
  serviceId: string;
  staffId: string;
  customerName: string;
  phone: string;
  email?: string;
  city?: string;
  /** ISO start */
  start: string;
  durationMin: number;
  status: BookingStatus;
  inquiryId?: string;
  note?: string;
  /** settings.locations id, or 'onsite' (customer's address) */
  location: string;
  address?: string;
  createdAt: string;
}

/* ---------------- Customers & segments (PDF p.19) ---------------- */
export type SegmentField = 'orders' | 'spent' | 'city' | 'lastOrderDays' | 'lang' | 'tag';
export interface SegmentRule {
  field: SegmentField;
  op: 'gt' | 'lt' | 'eq';
  value: string;
}
export interface Segment {
  id: string;
  name: L10n;
  description?: L10n;
  match: 'all' | 'any';
  rules: SegmentRule[];
}

/* ---------------- Inventory & purchasing (PDF pp.15–16) ---------------- */
export type MovementReason = 'correction' | 'received' | 'damaged' | 'return' | 'sale' | 'count';
export interface InventoryMovement {
  id: string;
  productId: string;
  /** + in / − out */
  delta: number;
  reason: MovementReason;
  note?: string;
  at: string;
  /** Staff id, or 'web' for storefront sales */
  by: string;
  /** Source document, e.g. "PO-2026-014", "SC-1042", "RT-1003" */
  ref?: string;
  location?: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'closed';
export interface PurchaseOrderLine {
  productId: string;
  ordered: number;
  received: number;
  rejected: number;
  /** Unit cost, EUR */
  cost: number;
}
export interface PurchaseOrder {
  id: string;
  number: string;
  supplier: string;
  /** settings.locations id */
  location: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  reference?: string;
  note?: string;
  expectedAt?: string;
  createdAt: string;
}

/* ---------------- Draft orders & returns (PDF p.17) ---------------- */
export interface DraftOrder {
  id: string;
  /** e.g. "D-1007" */
  number: string;
  createdAt: string;
  customer: Partial<Customer>;
  items: CartItem[];
  customLines: { title: string; price: number; qty: number }[];
  discountCodes: string[];
  delivery: DeliveryMethod;
  payment?: PaymentMethod;
  note: string;
  tags: string[];
  status: 'open' | 'invoice_sent' | 'converted';
  convertedOrderId?: string;
  /** Staff id */
  createdBy?: string;
  lang?: Lang;
}

export type ReturnStatus = 'requested' | 'approved' | 'received' | 'refunded' | 'rejected';
export interface ReturnRequest {
  id: string;
  /** e.g. "RT-1003" */
  number: string;
  orderId: string;
  lines: { productId: string; qty: number }[];
  reason: string;
  status: ReturnStatus;
  /** Net paid amount for the returned lines (after discounts), EUR */
  refundAmount: number;
  /** Put the goods back into stock once received */
  restock: boolean;
  /** true once stock was actually increased (idempotency) */
  restocked?: boolean;
  createdAt: string;
  timeline: { at: string; status: ReturnStatus; note?: string; by?: string }[];
}

/* ---------------- B2B quotes (PDF p.43) ---------------- */
export interface Quote {
  id: string;
  /** e.g. "Q-2026-031" */
  number: string;
  inquiryId?: string;
  customer: { name: string; company: string; email: string; phone: string };
  lines: { productId?: string; title: string; qty: number; price: number }[];
  validUntil: string;
  terms?: L10n;
  version: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted';
  createdAt: string;
  orderId?: string;
  /** Staff id */
  owner?: string;
}

/* ---------------- Navigation & content models (PDF p.36) ---------------- */
export type MenuItemType = 'page' | 'product' | 'collection' | 'category' | 'offer' | 'url';
export interface MenuItem {
  id: string;
  label: L10n;
  type: MenuItemType;
  /** id/slug of the target, or a path/URL for type 'url' */
  target: string;
  children?: MenuItem[];
}
export interface Menu {
  id: string;
  handle: 'main' | 'footer';
  title: string;
  items: MenuItem[];
}

export type ContentFieldType = 'text' | 'number' | 'choice' | 'image' | 'link' | 'date' | 'boolean' | 'reference';
export interface ContentModel {
  id: string;
  name: L10n;
  /** Which Db list holds the entries, e.g. 'projects' */
  source: string;
  fields: { key: string; label: L10n; type: ContentFieldType }[];
  entries: number;
}

/* ---------------- Audit log (PDF p.42) ---------------- */
export type AuditAction =
  | 'create' | 'update' | 'delete' | 'publish' | 'unpublish' | 'archive' | 'status'
  | 'refund' | 'fulfil' | 'receive' | 'adjust' | 'convert' | 'assign' | 'restore' | 'login' | 'send';
export type AuditObject =
  | 'product' | 'order' | 'discount' | 'offer' | 'placement' | 'collection' | 'settings' | 'home'
  | 'draft' | 'return' | 'purchaseOrder' | 'inventory' | 'inquiry' | 'quote' | 'booking' | 'staff'
  | 'page' | 'post' | 'menu' | 'segment' | 'customer';
export interface AuditEntry {
  id: string;
  at: string;
  /** Staff id, or 'web' for storefront actions */
  actor: string;
  action: AuditAction;
  object: AuditObject;
  objectId: string;
  /** Short human detail, e.g. "SC-1042 → shipped" or a product name */
  detail?: string;
}

export interface HomeVersion {
  at: string;
  /** Staff id */
  by: string;
  sections: HomeSection[];
}

export interface Db {
  version: number;
  settings: Settings;
  categories: Category[];
  products: Product[];
  orders: Order[];
  inquiries: Inquiry[];
  /** Legacy code list (v1 Coupons screen). The pricing engine uses `discounts`. */
  coupons: Coupon[];
  pages: CmsPage[];
  posts: Post[];
  projects: Project[];
  media: MediaItem[];
  /** Published homepage */
  home: HomeSection[];
  /** ISO time the demo data was (re)generated */
  seededAt: string;

  /* ---- CMS v2 ---- */
  collections: Collection[];
  discounts: Discount[];
  offers: Offer[];
  placements: Placement[];
  staff: Staff[];
  services: Service[];
  bookings: Booking[];
  segments: Segment[];
  movements: InventoryMovement[];
  purchaseOrders: PurchaseOrder[];
  drafts: DraftOrder[];
  returns: ReturnRequest[];
  quotes: Quote[];
  menus: Menu[];
  contentModels: ContentModel[];
  audit: AuditEntry[];
  /** Unpublished homepage edits (null = no draft) */
  homeDraft: HomeSection[] | null;
  /** Previously published homepages, newest first (max 10) */
  homeHistory: HomeVersion[];
}
