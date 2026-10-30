import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem, Lang, RoleId } from '@/lib/types';
import { safeStorage } from './storage';

export function cartKey(productId: string, options: Record<string, string>, installation: boolean) {
  const opts = Object.keys(options)
    .sort()
    .map((k) => `${k}=${options[k]}`)
    .join('&');
  return `${productId}|${opts}|${installation ? 'i' : ''}`;
}

/** Codes are stored trimmed, without spaces, uppercase (same as the discount engine). */
const norm = (code: string) => code.trim().replace(/\s+/g, '').toUpperCase();

interface UiState {
  lang: Lang;
  adminLang: Lang;
  cart: CartItem[];
  wishlist: string[];
  /** Entered discount codes, in entry order */
  codes: string[];
  /** Legacy alias of codes[0] — kept in sync by every code action */
  coupon: string | null;
  recentlyViewed: string[];
  adminAuthed: boolean;
  /** Role the demo admin acts as (Roles & permissions, PDF p.42) */
  adminRole: RoleId;
  cartOpen: boolean;
  searchOpen: boolean;

  setLang: (lang: Lang) => void;
  setAdminLang: (lang: Lang) => void;
  addToCart: (item: Omit<CartItem, 'key'>) => void;
  setQty: (key: string, qty: number) => void;
  setInstallation: (key: string, on: boolean) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  toggleWishlist: (productId: string) => void;
  addCode: (code: string) => void;
  removeCode: (code: string) => void;
  clearCodes: () => void;
  /** Legacy: replace the first code (null removes it) */
  setCoupon: (code: string | null) => void;
  pushViewed: (productId: string) => void;
  login: () => void;
  logout: () => void;
  setAdminRole: (role: RoleId) => void;
}

const withCodes = (codes: string[]) => ({ codes, coupon: codes[0] ?? null });

export const UI_VERSION = 2;

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      lang: 'sq',
      adminLang: 'sq',
      cart: [],
      wishlist: [],
      codes: [],
      coupon: null,
      recentlyViewed: [],
      adminAuthed: false,
      adminRole: 'owner',
      cartOpen: false,
      searchOpen: false,

      setLang: (lang) => set({ lang }),
      setAdminLang: (adminLang) => set({ adminLang }),
      addToCart: (item) =>
        set((s) => {
          const key = cartKey(item.productId, item.options, item.installation);
          const existing = s.cart.find((c) => c.key === key);
          if (existing) {
            return { cart: s.cart.map((c) => (c.key === key ? { ...c, qty: c.qty + item.qty } : c)) };
          }
          return { cart: [...s.cart, { ...item, key }] };
        }),
      setQty: (key, qty) =>
        set((s) => ({
          cart: qty <= 0 ? s.cart.filter((c) => c.key !== key) : s.cart.map((c) => (c.key === key ? { ...c, qty } : c)),
        })),
      setInstallation: (key, on) =>
        set((s) => {
          const line = s.cart.find((c) => c.key === key);
          if (!line) return {};
          const newKey = cartKey(line.productId, line.options, on);
          const clash = s.cart.find((c) => c.key === newKey);
          if (clash) {
            return {
              cart: s.cart
                .filter((c) => c.key !== key)
                .map((c) => (c.key === newKey ? { ...c, qty: c.qty + line.qty } : c)),
            };
          }
          return { cart: s.cart.map((c) => (c.key === key ? { ...c, installation: on, key: newKey } : c)) };
        }),
      removeFromCart: (key) => set((s) => ({ cart: s.cart.filter((c) => c.key !== key) })),
      clearCart: () => set({ cart: [], ...withCodes([]) }),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      toggleWishlist: (id) =>
        set((s) => ({ wishlist: s.wishlist.includes(id) ? s.wishlist.filter((w) => w !== id) : [...s.wishlist, id] })),
      addCode: (code) =>
        set((s) => {
          const c = norm(code);
          return c && !s.codes.includes(c) ? withCodes([...s.codes, c]) : {};
        }),
      removeCode: (code) => set((s) => withCodes(s.codes.filter((c) => c !== norm(code)))),
      clearCodes: () => set(withCodes([])),
      setCoupon: (code) =>
        set((s) => {
          const c = code ? norm(code) : '';
          const rest = s.codes.slice(1).filter((x) => x !== c);
          return withCodes(c ? [c, ...rest] : rest);
        }),
      pushViewed: (id) => set((s) => ({ recentlyViewed: [id, ...s.recentlyViewed.filter((v) => v !== id)].slice(0, 12) })),
      login: () => set({ adminAuthed: true }),
      logout: () => set({ adminAuthed: false }),
      setAdminRole: (adminRole) => set({ adminRole }),
    }),
    {
      name: 'itcom-cms-ui',
      version: UI_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        lang: s.lang,
        adminLang: s.adminLang,
        cart: s.cart,
        wishlist: s.wishlist,
        codes: s.codes,
        coupon: s.coupon,
        recentlyViewed: s.recentlyViewed,
        adminAuthed: s.adminAuthed,
        adminRole: s.adminRole,
      }),
      // v1 → v2: keep the shopper's cart, wishlist, history, language and login; the CMS now opens in
      // Albanian (sq) as owner; the single coupon becomes the first entry of `codes`.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<UiState>;
        if (version >= UI_VERSION) return old as UiState;
        const codes = old.coupon ? [norm(old.coupon)] : [];
        return {
          lang: old.lang ?? 'sq',
          adminLang: 'sq',
          cart: Array.isArray(old.cart) ? old.cart : [],
          wishlist: Array.isArray(old.wishlist) ? old.wishlist : [],
          recentlyViewed: Array.isArray(old.recentlyViewed) ? old.recentlyViewed : [],
          adminAuthed: !!old.adminAuthed,
          adminRole: 'owner',
          ...withCodes(codes),
        } as UiState;
      },
    },
  ),
);
