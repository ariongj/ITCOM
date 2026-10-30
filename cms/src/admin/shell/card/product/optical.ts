import type { CartItem, L10n, Product } from '@/lib/types';

/**
 * Optical helpers shared by the product page, the shop, the cart and the checkout.
 * Frames carry a `lenses` option (optical: frame | single | screen | progressive, sun: original | rx);
 * prescription-lens packages live in the `cat-lente` category and are sold per pair (unit `set`).
 */
export const FRAME_CATEGORIES = ['cat-optike', 'cat-dielli'];
export const LENS_CATEGORY = 'cat-lente';
/** `lenses` option values that are made to the customer's prescription. */
export const RX_LENS_VALUES = ['single', 'screen', 'progressive', 'rx'];

const T = (me: string, sq: string, en: string): L10n => ({ me, sq, en });

/** Frames (optical + sun) — the products that can be tried on virtually and get Care+. */
export const isFrame = (p: Pick<Product, 'categoryId'>) => FRAME_CATEGORIES.includes(p.categoryId);
export const isLensPackage = (p: Pick<Product, 'categoryId'>) => p.categoryId === LENS_CATEGORY;
export const lensOption = (p: Pick<Product, 'options'>) => p.options.find((o) => o.id === 'lenses');

/** The product can be ordered with prescription lenses (frame with an Rx lens choice, or a lens package). */
export function rxReady(p: Product) {
  return isLensPackage(p) || !!lensOption(p)?.values.some((v) => RX_LENS_VALUES.includes(v.id));
}

/** The chosen configuration needs a prescription before the lab can start. */
export function needsRx(p: Product | undefined, options: Record<string, string> = {}) {
  if (!p) return false;
  return isLensPackage(p) || RX_LENS_VALUES.includes(options.lenses ?? '');
}

/** Any cart line that needs a prescription (drives the "Receta" step in the checkout). */
export function cartNeedsRx(cart: CartItem[], products: Product[]) {
  return cart.some((i) => needsRx(products.find((p) => p.id === i.productId), i.options));
}

/** Virtual try-on page (built by the try-on module) for one frame. */
export const tryOnPath = (slug: string) => `/provo-virtualisht?produkt=${encodeURIComponent(slug)}`;

/** One-line explanation per lens choice, shown on the lens cards. */
export const LENS_INFO: Record<string, L10n> = {
  frame: T('Sočiva možete dodati i kasnije, sa receptom ili bez', 'Lentet mund t’i shtoni edhe më vonë, me recetë ose pa', 'You can add lenses later, with or without a prescription'),
  single: T('Za daljinu ili čitanje, sa antirefleksom i UV zaštitom', 'Për larg ose për lexim, me antirefleks dhe mbrojtje UV', 'For distance or reading, with anti-reflective coat and UV protection'),
  screen: T('Filter plavog svetla za rad za računarom i telefonom', 'Filtër i dritës blu për punë para kompjuterit dhe telefonit', 'Blue-light filter for computer and phone work'),
  progressive: T('Blizu, ekran i daljina u jednom paru — bez vidljive linije', 'Afër, ekran dhe larg në një palë — pa vijë të dukshme', 'Near, screen and distance in one pair — no visible line'),
  original: T('Originalna sunčana sočiva sa punom zaštitom UV400', 'Lentet origjinale të diellit, me mbrojtje të plotë UV400', 'The original sun lenses with full UV400 protection'),
  rx: T('Sa dioptrijom, u istoj nijansi za sunce', 'Me dioptri, në të njëjtën ngjyrë dielli', 'Made to your prescription in the same sun tint'),
  // smart glasses (on request — a preference for the enquiry, confirmed per model)
  'sg-original': T('Sočiva sa kojima model dolazi — sunčana ili providna', 'Lentet me të cilat vjen modeli — dielli ose të qarta', 'The lenses the model comes with — sun or clear'),
  'sg-rx': T('Po vašem receptu, iz naše laboratorije — prema modelu', 'Sipas recetës suaj, nga laboratori ynë — sipas modelit', 'To your prescription, from our lab — depending on the model'),
  'sg-photo': T('Tamne na suncu, svetle u zatvorenom — prema dostupnosti', 'Errësohen në diell, zbardhen brenda — sipas disponueshmërisë', 'Darken in the sun, clear indoors — subject to availability'),
};

/** Working days the lab needs per lens choice (shown under the lens cards). */
export const LENS_DAYS: Record<string, string> = { single: '2–4', screen: '2–4', progressive: '4–6', rx: '4–6' };

/** Lab time range of a lens package ("4–6"), read from its lead-time spec; falls back to 2–7. */
export function labDays(p: Product) {
  const spec = p.specs.find((s) => /lead time|izrada|përgatit/i.test(`${s.label.en} ${s.label.me} ${s.label.sq}`));
  const m = spec?.value.en.match(/(\d+)\s*[–-]\s*(\d+)/);
  return m ? `${m[1]}–${m[2]}` : p.leadDays ? `~${p.leadDays}` : '2–7';
}

/** "49-19-142" → lens width, bridge, temple length (mm). */
export function frameSize(p: Product): { lens: number; bridge: number; temple: number } | null {
  const spec = p.specs.find((s) => /size|madh|veli/i.test(`${s.label.en} ${s.label.sq} ${s.label.me}`));
  const m = spec?.value.en.trim().match(/^(\d{2})\s*[-–□x]\s*(\d{2})\s*[-–x]\s*(\d{3})$/);
  return m ? { lens: Number(m[1]), bridge: Number(m[2]), temple: Number(m[3]) } : null;
}
