// Settings space (Konfigurimet) — PDF pp.39–42, mock-up p.41.
// Section registry, the settings draft type and the few settings the shared `Settings` type does not carry yet.
import type { ComponentType } from 'react';
import { Activity, Bell, Building2, CreditCard, Database, Languages, MapPin, Plug, ShieldCheck, ShoppingCart, Truck, Users } from 'lucide-react';
import type { Lang, Settings } from '@/lib/types';
import type { SKey } from './strings';

/* ------------------------------------------------------------------ */
/* Extra settings (stored on `settings.ext` until the shared type has them) */
/* ------------------------------------------------------------------ */
export type PayProvider = 'pilot' | 'monri' | 'allsecure';

export interface SettingsExt {
  /** Primary domain shown in General → Domain */
  domain: string;
  weightUnit: 'kg' | 'g';
  lengthUnit: 'cm' | 'mm' | 'm';
  payProvider: PayProvider;
  payEnv: 'test' | 'live';
  /** auto = captured at checkout · manual = authorised, captured when the order is confirmed */
  capture: 'auto' | 'manual';
  langDefault: Lang;
  langFallback: Lang;
  localDelivery: { enabled: boolean; fee: number; area: string };
}

export const EXT_DEFAULTS: SettingsExt = {
  domain: 'itcom.example',
  weightUnit: 'kg',
  lengthUnit: 'cm',
  payProvider: 'pilot',
  payEnv: 'test',
  capture: 'auto',
  langDefault: 'sq',
  langFallback: 'sq',
  localDelivery: { enabled: false, fee: 0, area: 'Prishtinë' },
};

/** The draft the settings screens edit: the shared settings + `ext`. */
export type SettingsX = Settings & { ext: SettingsExt };

export function withExt(s: Settings): SettingsX {
  const ext = (s as Partial<SettingsX>).ext;
  return { ...s, ext: { ...EXT_DEFAULTS, ...ext, localDelivery: { ...EXT_DEFAULTS.localDelivery, ...ext?.localDelivery } } };
}

export type SetX = <K extends keyof SettingsX>(key: K, value: SettingsX[K]) => void;
export type SetExt = <K extends keyof SettingsExt>(key: K, value: SettingsExt[K]) => void;
export type Errors = Partial<Record<string, string>>;

/** Props every settings section receives. */
export interface SecProps {
  s: SettingsX;
  set: SetX;
  setExt: SetExt;
  errors: Errors;
  /** Current role may only look (settings: view) */
  readOnly: boolean;
}

/* ------------------------------------------------------------------ */
/* Section registry — drives the sub-navigation and /admin/konfiguracija/:section */
/* ------------------------------------------------------------------ */
export type SectionId =
  | 'general' | 'staff' | 'payments' | 'checkout' | 'shipping' | 'locations' | 'languages' | 'notifications' | 'integrations' | 'privacy' | 'activity' | 'data';

export interface SectionDef {
  id: SectionId;
  /** URL segment after /admin/konfiguracija ('' = index) */
  slug: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: SKey;
  /** Settings keys edited by the section (unsaved / example dots) */
  keys: (keyof SettingsX)[];
  /** Section lives elsewhere — the nav item is a link */
  to?: string;
}

export const SECTIONS: SectionDef[] = [
  { id: 'general', slug: '', icon: Building2, label: 'sec_general', keys: ['companyName', 'legalName', 'tagline', 'about', 'pib', 'pdv', 'email', 'phone', 'phone2', 'whatsapp', 'address', 'city', 'mapUrl', 'hours', 'instagram', 'facebook', 'vatRate', 'timezone', 'orderPrefix', 'seo'] },
  { id: 'staff', slug: 'stafi', icon: Users, label: 'sec_staff', keys: [] },
  { id: 'payments', slug: 'pagesat', icon: CreditCard, label: 'sec_payments', keys: ['payments', 'bankName', 'bankAccount'] },
  { id: 'checkout', slug: 'checkout', icon: ShoppingCart, label: 'sec_checkout', keys: ['checkout'] },
  { id: 'shipping', slug: 'dergesat', icon: Truck, label: 'sec_shipping', keys: ['shippingZones', 'pickupAddress'] },
  { id: 'locations', slug: 'lokacionet', icon: MapPin, label: 'sec_locations', keys: ['locations'] },
  { id: 'languages', slug: 'gjuhet', icon: Languages, label: 'sec_languages', keys: ['languages'] },
  { id: 'notifications', slug: 'njoftimet', icon: Bell, label: 'sec_notifications', keys: ['notifications', 'adminEmail'] },
  { id: 'integrations', slug: 'integrimet', icon: Plug, label: 'sec_integrations', keys: [], to: '/admin/integracije' },
  { id: 'privacy', slug: 'privatesia', icon: ShieldCheck, label: 'sec_privacy', keys: ['privacy'] },
  { id: 'activity', slug: 'aktiviteti', icon: Activity, label: 'sec_activity', keys: [] },
  { id: 'data', slug: 'demo', icon: Database, label: 'sec_data', keys: ['demoBanner'] },
];

export const sectionPath = (d: SectionDef) => d.to ?? (d.slug ? `/admin/konfiguracija/${d.slug}` : '/admin/konfiguracija');

/** Old / alternative slugs that still open the right section. */
const ALIASES: Record<string, SectionId> = {
  pergjithshme: 'general', opste: 'general', general: 'general',
  staff: 'staff', osoblje: 'staff', rolet: 'staff',
  placanja: 'payments', payments: 'payments',
  dostava: 'shipping', shipping: 'shipping',
  lokacije: 'locations', jezici: 'languages', obavjestenja: 'notifications',
  privatnost: 'privacy', aktivnost: 'activity', 'te-dhenat': 'data', podaci: 'data',
};

export function sectionFor(slug: string | undefined): SectionDef | undefined {
  const s = (slug ?? '').toLowerCase();
  return SECTIONS.find((d) => d.slug === s) ?? SECTIONS.find((d) => d.id === ALIASES[s]);
}

/* ------------------------------------------------------------------ */
/* Demo placeholders ("Shembull" chip)                                 */
/* ------------------------------------------------------------------ */
export const EXAMPLE_FIELDS: { key: keyof Settings; section: SectionId }[] = [
  { key: 'pib', section: 'general' },
  { key: 'pdv', section: 'general' },
  { key: 'phone', section: 'general' },
  { key: 'phone2', section: 'general' },
  { key: 'whatsapp', section: 'general' },
  { key: 'address', section: 'general' },
  { key: 'city', section: 'general' },
  { key: 'bankAccount', section: 'payments' },
];

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */
export const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const ORDER_PREFIX_RE = /^[A-Z0-9][A-Z0-9-]{0,5}$/;

export const TIMEZONES = ['Europe/Belgrade', 'Europe/Tirane', 'Europe/Skopje', 'Europe/Sarajevo', 'Europe/Zagreb', 'Europe/Vienna', 'Europe/Berlin', 'Europe/London', 'Europe/Istanbul'];

/** "GMT+2" for an IANA zone (current offset). */
export function tzOffset(zone: string, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'shortOffset' }).formatToParts(at).find((p) => p.type === 'timeZoneName');
    return part?.value ?? '';
  } catch {
    return '';
  }
}

/** Current wall-clock time in a zone, "14:32". */
export function tzNow(zone: string, at = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' }).format(at);
  } catch {
    return '';
  }
}

/** Short stable hash → payment references in the demo ("TX-7K2M9Q"). */
export function shortRef(seed: string, len = 6) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  let x = h >>> 0;
  for (let i = 0; i < len; i++) {
    out += abc[x % abc.length];
    x = Math.floor(x / abc.length) || (h >>> (i + 1)) + i * 7919;
  }
  return out;
}
