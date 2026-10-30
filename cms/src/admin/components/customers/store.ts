// Customer profiles (PDF p.19): private notes, tags, marketing consent per channel, customers added by
// staff / CSV import, and merged duplicates.
//
// The shared Db has no `customers` list yet (customers are derived from orders), so this module keeps
// the profile layer in its own persisted store (`optika-customers`). It is bound to `db.seededAt`:
// when the demo data is re-seeded (Settings → reset), the profiles are re-seeded too (see useCustomers).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { safeStorage } from '@/store/storage';
import type { Lang } from '@/lib/types';
import { uid } from '@/lib/utils';

export type Channel = 'email' | 'sms' | 'whatsapp' | 'viber';
export const CHANNELS: Channel[] = ['email', 'sms', 'whatsapp', 'viber'];

export type ConsentStatus = 'subscribed' | 'unsubscribed' | 'none';
export type ConsentSource = 'checkout' | 'import' | 'staff' | 'form';
export interface Consent {
  status: ConsentStatus;
  /** When the customer gave / withdrew consent */
  at?: string;
  source?: ConsentSource;
  /** Staff id when changed in the CMS */
  by?: string;
}
export type Marketing = Record<Channel, Consent>;

/** Staff-only note — never shown to the customer, never exported. */
export interface CustomerNote {
  id: string;
  at: string;
  /** Staff id */
  by: string;
  text: string;
}

export interface CustomerProfile {
  tags: string[];
  notes: CustomerNote[];
  marketing?: Partial<Marketing>;
}

export type CustomerSource = 'web' | 'import' | 'manual' | 'appointment' | 'contact';

/** A customer that exists without a web order (added by staff, imported, from a booking / enquiry). */
export interface ManualCustomer {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  company?: string;
  pib?: string;
  lang: Lang;
  source: Exclude<CustomerSource, 'web'>;
  createdAt: string;
}

export interface CustomerData {
  /** Profiles by (primary) customer key */
  profiles: Record<string, CustomerProfile>;
  manual: ManualCustomer[];
  /** secondary key → primary key */
  merges: Record<string, string>;
  /** "a|b" pairs confirmed as NOT duplicates */
  dismissed: string[];
}

interface State extends CustomerData {
  /** db.seededAt this data belongs to (null = never seeded) */
  seed: string | null;
}

interface Actions {
  load: (seed: string, data: CustomerData) => void;
  restore: (snapshot: CustomerData) => void;
  setTags: (key: string, tags: string[]) => void;
  addNote: (key: string, text: string, by: string) => void;
  removeNote: (key: string, id: string) => void;
  setConsent: (key: string, channel: Channel, consent: Consent) => void;
  /** Add (or update by key) manual customers and their initial profile */
  addCustomers: (items: { customer?: ManualCustomer; key: string; tags?: string[]; marketing?: Partial<Marketing> }[]) => void;
  removeCustomer: (key: string) => void;
  merge: (primary: string, secondary: string) => void;
  unmerge: (secondary: string) => void;
  dismissPair: (a: string, b: string) => void;
}

export const pairKey = (a: string, b: string) => [a, b].sort().join('|');

const emptyProfile = (): CustomerProfile => ({ tags: [], notes: [] });
const uniq = (list: string[]) => [...new Set(list.map((x) => x.trim()).filter(Boolean))];

/** Per channel, the most recent explicit decision wins (an unknown "none" never overrides a decision). */
export function mergeMarketing(a: Partial<Marketing> = {}, b: Partial<Marketing> = {}): Partial<Marketing> {
  const out: Partial<Marketing> = { ...a };
  for (const ch of Object.keys(b) as Channel[]) {
    const x = a[ch];
    const y = b[ch];
    if (!y || y.status === 'none') continue;
    if (!x || x.status === 'none' || (y.at ?? '') > (x.at ?? '')) out[ch] = y;
  }
  return out;
}

export const useCustomerStore = create<State & Actions>()(
  persist(
    (set) => ({
      seed: null,
      profiles: {},
      manual: [],
      merges: {},
      dismissed: [],

      load: (seed, data) => set({ seed, ...data }),
      restore: (snapshot) => set({ ...snapshot }),

      setTags: (key, tags) =>
        set((s) => ({ profiles: { ...s.profiles, [key]: { ...(s.profiles[key] ?? emptyProfile()), tags: uniq(tags) } } })),

      addNote: (key, text, by) =>
        set((s) => {
          const p = s.profiles[key] ?? emptyProfile();
          const note: CustomerNote = { id: uid('cn'), at: new Date().toISOString(), by, text: text.trim() };
          return { profiles: { ...s.profiles, [key]: { ...p, notes: [note, ...p.notes] } } };
        }),

      removeNote: (key, id) =>
        set((s) => {
          const p = s.profiles[key];
          if (!p) return {};
          return { profiles: { ...s.profiles, [key]: { ...p, notes: p.notes.filter((n) => n.id !== id) } } };
        }),

      setConsent: (key, channel, consent) =>
        set((s) => {
          const p = s.profiles[key] ?? emptyProfile();
          return { profiles: { ...s.profiles, [key]: { ...p, marketing: { ...p.marketing, [channel]: consent } } } };
        }),

      addCustomers: (items) =>
        set((s) => {
          let manual = s.manual;
          const profiles = { ...s.profiles };
          for (const it of items) {
            if (it.customer) {
              const c = it.customer;
              manual = manual.some((m) => m.key === c.key) ? manual.map((m) => (m.key === c.key ? c : m)) : [...manual, c];
            }
            const p = profiles[it.key] ?? emptyProfile();
            profiles[it.key] = { ...p, tags: uniq([...p.tags, ...(it.tags ?? [])]), marketing: mergeMarketing(p.marketing, it.marketing) };
          }
          return { manual, profiles };
        }),

      removeCustomer: (key) =>
        set((s) => {
          const aliases = Object.entries(s.merges).filter(([, p]) => p === key).map(([k]) => k);
          const gone = new Set([key, ...aliases]);
          const profiles = { ...s.profiles };
          for (const k of gone) delete profiles[k];
          return {
            manual: s.manual.filter((m) => !gone.has(m.key)),
            profiles,
            merges: Object.fromEntries(Object.entries(s.merges).filter(([k, p]) => !gone.has(k) && !gone.has(p))),
          };
        }),

      merge: (primary, secondary) =>
        set((s) => {
          if (primary === secondary) return {};
          const a = s.profiles[primary] ?? emptyProfile();
          const b = s.profiles[secondary] ?? emptyProfile();
          const merged: CustomerProfile = {
            tags: uniq([...a.tags, ...b.tags]),
            notes: [...a.notes, ...b.notes].sort((x, y) => y.at.localeCompare(x.at)),
            marketing: mergeMarketing(a.marketing, b.marketing),
          };
          const profiles = { ...s.profiles, [primary]: merged };
          delete profiles[secondary];
          // anything that pointed at the secondary now points at the primary
          const merges = Object.fromEntries(Object.entries(s.merges).map(([k, p]) => [k, p === secondary ? primary : p]));
          merges[secondary] = primary;
          return { profiles, merges };
        }),

      unmerge: (secondary) =>
        set((s) => {
          const merges = { ...s.merges };
          delete merges[secondary];
          return { merges };
        }),

      dismissPair: (a, b) => set((s) => ({ dismissed: uniq([...s.dismissed, pairKey(a, b)]) })),
    }),
    {
      name: 'itcom-cms-customers',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ seed: s.seed, profiles: s.profiles, manual: s.manual, merges: s.merges, dismissed: s.dismissed }),
    },
  ),
);

/** Current data without the actions — for undo snapshots. */
export function snapshotCustomers(): CustomerData {
  const s = useCustomerStore.getState();
  return { profiles: s.profiles, manual: s.manual, merges: s.merges, dismissed: s.dismissed };
}
