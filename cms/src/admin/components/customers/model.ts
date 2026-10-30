// Customer model for the CMS (PDF p.19): one record per person, built from web orders + the profile layer
// (store.ts), with linked enquiries / bookings / B2B quotes, duplicate detection, segment subjects and CSV.
import type { Booking, Inquiry, Lang, Order, Quote, Segment } from '@/lib/types';
import { matchesSegment, type SegmentSubject } from '@/lib/crm';
import { fold } from '@/lib/search';
import { round2, slugify } from '@/lib/utils';
import { customerKey } from '@/admin/components/crm/customers';
import { CHANNELS, pairKey, type Channel, type Consent, type CustomerData, type CustomerNote, type CustomerSource, type ManualCustomer, type Marketing } from './store';

export interface CustomerAddress {
  address: string;
  city: string;
  /** Orders delivered to this address */
  orders: number;
  last: string;
}

export interface CustomerRecord {
  key: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  /** Every e-mail / phone known for this person (merged records included) */
  emails: string[];
  phones: string[];
  city: string;
  address: string;
  addresses: CustomerAddress[];
  company?: string;
  pib?: string;
  lang: Lang;
  /** Newest first, cancelled included */
  orders: Order[];
  count: number;
  /** Orders that count (not cancelled) */
  valid: number;
  cancelled: number;
  /** Lifetime spend EUR, cancelled excluded */
  spent: number;
  first?: string;
  last?: string;
  /** Customer since (first order or when the record was created) */
  since: string;
  source: CustomerSource;
  /** Staff tags (+ automatic ones) */
  tags: string[];
  autoTags: string[];
  notes: CustomerNote[];
  marketing: Marketing;
  /** Keys of records merged into this one */
  mergedKeys: string[];
  /** Has a staff-created record (deletable when there are no orders) */
  manual: boolean;
  inquiries: Inquiry[];
  bookings: Booking[];
  quotes: Quote[];
}

const NONE: Consent = { status: 'none' };
export const emptyMarketing = (): Marketing => ({ email: NONE, sms: NONE, whatsapp: NONE, viber: NONE });

/** Last 8 digits — "+383 44 123 456" and "044 123 456" are the same phone. */
export const phone8 = (p?: string) => {
  const d = (p ?? '').replace(/\D/g, '');
  return d.length >= 6 ? d.slice(-8) : '';
};
const low = (s?: string) => (s ?? '').trim().toLowerCase();

/** Follow the merge chain to the primary key. */
export function resolveKey(key: string, merges: Record<string, string>) {
  let k = key;
  for (let i = 0; i < 10 && merges[k]; i++) k = merges[k];
  return k;
}

export function manualKey(email: string, phone: string, name: string) {
  return low(email) || (phone8(phone) ? `tel-${phone8(phone)}` : `m-${slugify(name) || Date.now().toString(36)}`);
}

interface Group {
  orders: Order[];
  manual: ManualCustomer[];
  keys: Set<string>;
}

export function buildCustomers(input: { orders: Order[]; inquiries: Inquiry[]; bookings: Booking[]; quotes: Quote[]; data: CustomerData }): CustomerRecord[] {
  const { orders, inquiries, bookings, quotes, data } = input;
  const groups = new Map<string, Group>();
  const groupOf = (raw: string) => {
    const k = resolveKey(raw, data.merges);
    let g = groups.get(k);
    if (!g) groups.set(k, (g = { orders: [], manual: [], keys: new Set() }));
    g.keys.add(raw);
    return g;
  };
  for (const o of orders) groupOf(customerKey(o)).orders.push(o);
  for (const m of data.manual) groupOf(m.key).manual.push(m);

  // contact lookups for linking enquiries / bookings / quotes
  const byEmail = <T>(items: T[], get: (x: T) => string | undefined) => {
    const m = new Map<string, T[]>();
    for (const x of items) {
      const e = low(get(x));
      if (e) m.set(e, [...(m.get(e) ?? []), x]);
    }
    return m;
  };
  const byPhone = <T>(items: T[], get: (x: T) => string | undefined) => {
    const m = new Map<string, T[]>();
    for (const x of items) {
      const p = phone8(get(x));
      if (p) m.set(p, [...(m.get(p) ?? []), x]);
    }
    return m;
  };
  const inqE = byEmail(inquiries, (i) => i.email);
  const inqP = byPhone(inquiries, (i) => i.phone);
  const bkE = byEmail(bookings, (b) => b.email);
  const bkP = byPhone(bookings, (b) => b.phone);
  const qE = byEmail(quotes, (q) => q.customer.email);
  const qP = byPhone(quotes, (q) => q.customer.phone);
  const linked = <T extends { id: string }>(emails: string[], phones: string[], e: Map<string, T[]>, p: Map<string, T[]>) => {
    const out = new Map<string, T>();
    for (const x of emails) for (const it of e.get(low(x)) ?? []) out.set(it.id, it);
    for (const x of phones) for (const it of p.get(phone8(x)) ?? []) out.set(it.id, it);
    return [...out.values()];
  };

  const rows: CustomerRecord[] = [];
  for (const [key, g] of groups) {
    const sorted = [...g.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const valid = sorted.filter((o) => o.status !== 'cancelled');
    const latest = sorted[0]?.customer;
    // the primary's own manual record first, then the others (oldest first)
    const manual = [...g.manual].sort((a, b) => (a.key === key ? -1 : b.key === key ? 1 : a.createdAt.localeCompare(b.createdAt)));
    const m0 = manual[0];
    const base = latest ?? m0;
    if (!base) continue;

    const emails = [...new Set([...sorted.map((o) => o.customer.email), ...manual.map((m) => m.email)].map(low).filter(Boolean))];
    const phones: string[] = [];
    for (const p of [...sorted.map((o) => o.customer.phone), ...manual.map((m) => m.phone)]) {
      if (p && !phones.some((x) => phone8(x) === phone8(p))) phones.push(p);
    }

    const addr = new Map<string, CustomerAddress>();
    for (const o of sorted) {
      const k = fold(`${o.customer.address}|${o.customer.city}`);
      const a = addr.get(k);
      if (a) a.orders++;
      else if (o.customer.address || o.customer.city) addr.set(k, { address: o.customer.address, city: o.customer.city, orders: 1, last: o.createdAt });
    }
    for (const m of manual) {
      const k = fold(`${m.address}|${m.city}`);
      if (!addr.has(k) && (m.address || m.city)) addr.set(k, { address: m.address, city: m.city, orders: 0, last: m.createdAt });
    }

    const profile = data.profiles[key];
    const company = sorted.find((o) => o.customer.company)?.customer.company ?? manual.find((m) => m.company)?.company;
    const autoTags = company ? ['b2b'] : [];
    const orderTags = sorted.flatMap((o) => o.tags ?? []);
    const tags = [...new Set([...(profile?.tags ?? []), ...orderTags, ...autoTags])];
    const createdAt = [sorted[sorted.length - 1]?.createdAt, ...manual.map((m) => m.createdAt)].filter(Boolean).sort()[0] as string;

    rows.push({
      key,
      name: `${base.firstName} ${base.lastName}`.trim(),
      firstName: base.firstName,
      lastName: base.lastName,
      email: low(base.email) || emails[0] || '',
      phone: base.phone || phones[0] || '',
      emails,
      phones,
      city: base.city,
      address: base.address,
      addresses: [...addr.values()],
      company,
      pib: sorted.find((o) => o.customer.pib)?.customer.pib ?? manual.find((m) => m.pib)?.pib,
      lang: sorted[0]?.lang ?? m0?.lang ?? 'me',
      orders: sorted,
      count: sorted.length,
      valid: valid.length,
      cancelled: sorted.length - valid.length,
      spent: round2(valid.reduce((s, o) => s + o.total, 0)),
      first: sorted[sorted.length - 1]?.createdAt,
      last: sorted[0]?.createdAt,
      since: createdAt,
      source: sorted.length ? 'web' : (m0?.source ?? 'manual'),
      tags,
      autoTags,
      notes: profile?.notes ?? [],
      marketing: { ...emptyMarketing(), ...(profile?.marketing ?? {}) },
      mergedKeys: [...g.keys].filter((k) => k !== key),
      manual: manual.length > 0,
      inquiries: linked(emails, phones, inqE, inqP).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      bookings: linked(emails, phones, bkE, bkP).sort((a, b) => b.start.localeCompare(a.start)),
      quotes: linked(emails, phones, qE, qP).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Segments                                                            */
/* ------------------------------------------------------------------ */
/** Subject for lib/crm `matchesSegment` — includes staff tags and customers without orders. */
export function subjectOf(c: CustomerRecord, now: number): SegmentSubject {
  return {
    key: c.key,
    name: c.name,
    email: c.email,
    phone: c.phone,
    orders: c.valid,
    spent: c.spent,
    city: c.city,
    lastOrderDays: c.last ? Math.floor((now - new Date(c.last).getTime()) / 86400000) : Number.POSITIVE_INFINITY,
    lang: c.lang,
    tags: c.tags,
  };
}

export function membersOf(seg: Pick<Segment, 'match' | 'rules'>, customers: CustomerRecord[], now: number) {
  return customers.filter((c) => matchesSegment(subjectOf(c, now), seg));
}

export const isSubscribed = (c: Pick<CustomerRecord, 'marketing'>, ch?: Channel) =>
  ch ? c.marketing[ch].status === 'subscribed' : CHANNELS.some((x) => c.marketing[x].status === 'subscribed');

/* ------------------------------------------------------------------ */
/* Duplicates (same phone, or same name in the same city)              */
/* ------------------------------------------------------------------ */
export interface DuplicatePair {
  id: string;
  a: CustomerRecord;
  b: CustomerRecord;
  reason: 'phone' | 'name';
}

/** `a` is the suggested primary: more orders, then higher spend, then the older record. */
export function findDuplicates(customers: CustomerRecord[], dismissed: string[]): DuplicatePair[] {
  const out: DuplicatePair[] = [];
  const skip = new Set(dismissed);
  for (let i = 0; i < customers.length; i++) {
    for (let j = i + 1; j < customers.length; j++) {
      const x = customers[i];
      const y = customers[j];
      if (skip.has(pairKey(x.key, y.key))) continue;
      const p = x.phones.map(phone8).filter(Boolean);
      const samePhone = y.phones.some((ph) => p.includes(phone8(ph)));
      const sameName = fold(x.name) === fold(y.name) && !!x.city && fold(x.city) === fold(y.city);
      if (!samePhone && !sameName) continue;
      const [a, b] = rank(x, y);
      out.push({ id: pairKey(x.key, y.key), a, b, reason: samePhone ? 'phone' : 'name' });
    }
  }
  return out;
}

export function rank(x: CustomerRecord, y: CustomerRecord): [CustomerRecord, CustomerRecord] {
  const score = (c: CustomerRecord) => [c.valid, c.spent, -new Date(c.since).getTime()];
  const sx = score(x);
  const sy = score(y);
  for (let i = 0; i < sx.length; i++) {
    if (sx[i] !== sy[i]) return sx[i] > sy[i] ? [x, y] : [y, x];
  }
  return [x, y];
}

/* ------------------------------------------------------------------ */
/* Demo profile layer — deterministic, generated once per db seed      */
/* ------------------------------------------------------------------ */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const addDays = (iso: string, d: number) => new Date(new Date(iso).getTime() + d * 86400000).toISOString();
/** Serbian first names (Mitrovica is mixed) — these customers get the `me` (Serbian) language, everyone else Albanian. */
const SR_FIRST = new Set(['Milica', 'Marko', 'Jelena', 'Nikola', 'Stefan', 'Ana', 'Milan', 'Dragan', 'Jovana', 'Nemanja', 'Ivana', 'Marija', 'Dejan', 'Snežana']);
const TAG_POOL = ['gaming', 'biznes', 'student', 'rekomandim', 'krijues', 'pc-sipas-porosise', 'familje'];

export function seedCustomerData(orders: Order[], bookings: Booking[], inquiries: Inquiry[], seededAt: string): CustomerData {
  const profiles: CustomerData['profiles'] = {};
  const manual: ManualCustomer[] = [];
  const base = buildCustomers({ orders, inquiries: [], bookings: [], quotes: [], data: { profiles: {}, manual: [], merges: {}, dismissed: [] } });
  const bySpend = [...base].sort((a, b) => b.spent - a.spent);
  const byOrders = [...base].sort((a, b) => b.valid - a.valid || b.spent - a.spent);

  for (const c of base) {
    const h = hash(c.key);
    const at = c.first ?? seededAt;
    const consent = (on: boolean, off = false): Consent => (on ? { status: 'subscribed', at, source: 'checkout' } : off ? { status: 'unsubscribed', at: addDays(at, 12 + (h % 20)), source: 'form' } : NONE);
    const tags: string[] = [];
    if (h % 7 < 3) tags.push(TAG_POOL[h % TAG_POOL.length]);
    if (h % 11 === 0) tags.push(TAG_POOL[(h >>> 4) % TAG_POOL.length]);
    if (c.orders.some((o) => o.items.some((l) => l.installation))) {
      if (h % 3 === 0) tags.push('montim');
    }
    profiles[c.key] = {
      tags: [...new Set(tags)],
      notes: [],
      marketing: {
        email: consent(h % 10 < 6, h % 10 === 9),
        sms: consent((h >>> 3) % 10 < 3),
        whatsapp: consent((h >>> 6) % 10 < 4 || c.lang === 'sq'),
        viber: consent((h >>> 9) % 10 < 2),
      },
    };
  }

  // Staff notes on the best customers (private — staff only)
  const NOTES: [string, string][] = [
    ['st-sales', 'Preferon të kontaktohet pas orës 16:00. Kërkon faturë me NUI për çdo porosi.'],
    ['st-service', 'PC i montuar me porosi — klienti kërkoi testim 24‑orësh para dorëzimit. Interesohet për monitor 27" në muajin që vjen.'],
    ['st-shop', 'E merr porosinë gjithmonë në dyqan, të shtunën paradite.'],
    ['st-owner', 'Klient besnik që nga 2021. Rekomandoi dy klientë të rinj — ofroji 5% në porosinë e ardhshme.'],
  ];
  bySpend.slice(0, 4).forEach((c, i) => {
    const [by, text] = NOTES[i];
    const at = addDays(c.last ?? seededAt, i % 2 ? 1 : 0.2);
    profiles[c.key].notes.push({ id: `cn-seed-${i}`, at: at > seededAt ? seededAt : at, by, text });
  });
  if (bySpend[0]) profiles[bySpend[0].key].tags = [...new Set([...profiles[bySpend[0].key].tags, 'rekomandim'])];

  // Customers met through appointments (no web order yet)
  const known = new Set(base.flatMap((c) => c.phones.map(phone8)));
  const seen = new Set<string>();
  for (const b of bookings) {
    if (manual.length >= 2) break;
    const p = phone8(b.phone);
    if (!p || known.has(p) || seen.has(p) || b.status === 'cancelled' || b.inquiryId) continue;
    seen.add(p);
    const [firstName, ...rest] = b.customerName.split(' ');
    const key = manualKey(b.email ?? '', b.phone, b.customerName);
    manual.push({ key, firstName, lastName: rest.join(' '), email: b.email ?? '', phone: b.phone, city: b.city ?? '', address: b.address ?? '', lang: SR_FIRST.has(firstName) ? 'me' : 'sq', source: 'appointment', createdAt: b.createdAt });
    profiles[key] = {
      tags: ['dyqan'],
      notes: [],
      marketing: { ...emptyMarketing(), whatsapp: { status: 'subscribed', at: b.createdAt, source: 'staff', by: 'st-shop' } },
    };
  }

  // An Optical Lab B2B lead from the contact inbox (another optician ordering lenses) — linked to its enquiry and quote
  const partner = inquiries.find((i) => i.id === 'inq_120');
  if (partner) {
    const [firstName, ...rest] = partner.name.split(' ');
    const key = manualKey(partner.email ?? '', partner.phone, partner.name);
    manual.push({ key, firstName, lastName: rest.join(' '), email: partner.email ?? '', phone: partner.phone, city: partner.city ?? '', address: 'Rruga Adem Jashari 18', company: partner.company, lang: 'sq', source: 'contact', createdAt: partner.createdAt });
    profiles[key] = {
      tags: ['b2b', 'optike-partnere'],
      notes: [{ id: 'cn-seed-b2b', at: addDays(partner.createdAt, 0.3), by: 'st-arta', text: 'Optikë partnere — rreth 40 palë lente progresive në muaj për Optical Lab. Oferta Q-2026-031 u dërgua; presin konfirmimin e pronarit.' }],
      marketing: { ...emptyMarketing(), email: { status: 'subscribed', at: partner.createdAt, source: 'form' } },
    };
  }

  // Two records imported from the old webshop that duplicate existing customers
  const old = addDays(seededAt, -420);
  const [d1, d2] = byOrders.filter((c) => c.phone && c.email);
  if (d1) {
    const first = fold(d1.firstName);
    const last = fold(d1.lastName).replace(/[^a-z]/g, '');
    const email = `${first[0]}${last}@gmail.com`;
    manual.push({ key: email, firstName: fold(d1.firstName).replace(/^./, (x) => x.toUpperCase()), lastName: fold(d1.lastName).replace(/^./, (x) => x.toUpperCase()), email, phone: d1.phone.replace('+383 ', '0'), city: d1.city, address: d1.address, lang: d1.lang, source: 'import', createdAt: old });
    profiles[email] = { tags: ['faqja-vjeter'], notes: [], marketing: { ...emptyMarketing(), email: { status: 'subscribed', at: old, source: 'import' } } };
  }
  if (d2) {
    const email = `${fold(d2.firstName)}.${fold(d2.lastName).replace(/[^a-z]/g, '')}@hotmail.com`;
    manual.push({ key: email, firstName: d2.firstName, lastName: d2.lastName, email, phone: '', city: d2.city, address: '', lang: d2.lang, source: 'import', createdAt: old });
    profiles[email] = { tags: ['faqja-vjeter'], notes: [], marketing: { ...emptyMarketing(), email: { status: 'unsubscribed', at: addDays(old, 40), source: 'import' } } };
  }

  return { profiles, manual, merges: {}, dismissed: [] };
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */
const esc = (v: string | number | undefined) => {
  const s = String(v ?? '');
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const consentCell = (c: Consent) => (c.status === 'subscribed' ? 'yes' : c.status === 'unsubscribed' ? 'unsubscribed' : 'no');

/** Export — private notes are never exported (PDF p.19 acceptance). */
export function exportCsv(rows: CustomerRecord[]) {
  const head = ['first_name', 'last_name', 'email', 'phone', 'city', 'address', 'company', 'language', 'orders', 'total_spent_eur', 'last_order', 'customer_since', 'tags', 'email_marketing', 'sms_marketing', 'whatsapp_marketing', 'viber_marketing'];
  const lines = rows.map((r) =>
    [
      r.firstName, r.lastName, r.email, r.phone, r.city, r.address, r.company ?? '', r.lang, r.valid, r.spent.toFixed(2), r.last?.slice(0, 10) ?? '', r.since.slice(0, 10), r.tags.join(';'),
      consentCell(r.marketing.email), consentCell(r.marketing.sms), consentCell(r.marketing.whatsapp), consentCell(r.marketing.viber),
    ].map(esc).join(','),
  );
  return '﻿' + [head.join(','), ...lines].join('\n');
}

export const IMPORT_TEMPLATE_HEAD = ['first_name', 'last_name', 'email', 'phone', 'city', 'address', 'language', 'tags', 'email_marketing', 'sms_marketing'];

/** RFC-4180-ish parser: quotes, escaped quotes, CRLF, BOM; delimiter `,` or `;` (detected from the header). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

type ImportField = 'firstName' | 'lastName' | 'name' | 'email' | 'phone' | 'city' | 'address' | 'company' | 'lang' | 'tags' | 'emailMarketing' | 'smsMarketing' | 'whatsappMarketing' | 'viberMarketing';
const ALIASES: Record<ImportField, string[]> = {
  firstName: ['first_name', 'firstname', 'first name', 'given name', 'ime', 'emri'],
  lastName: ['last_name', 'lastname', 'last name', 'surname', 'prezime', 'mbiemri'],
  name: ['name', 'full_name', 'full name', 'customer', 'kupac', 'klienti', 'ime i prezime', 'emri i plote', 'emri dhe mbiemri'],
  email: ['email', 'e-mail', 'e_mail', 'mail', 'email address'],
  phone: ['phone', 'telefon', 'telefoni', 'tel', 'mobile', 'mobilni', 'celular'],
  city: ['city', 'grad', 'qyteti', 'town', 'mjesto'],
  address: ['address', 'address1', 'adresa', 'street', 'rruga'],
  company: ['company', 'firma', 'kompania', 'organization'],
  lang: ['language', 'lang', 'jezik', 'gjuha', 'locale'],
  tags: ['tags', 'tag', 'oznake', 'etiketat', 'etiketa'],
  emailMarketing: ['email_marketing', 'accepts_email_marketing', 'accepts_marketing', 'newsletter', 'marketing'],
  smsMarketing: ['sms_marketing', 'accepts_sms_marketing', 'sms'],
  whatsappMarketing: ['whatsapp_marketing', 'whatsapp'],
  viberMarketing: ['viber_marketing', 'viber'],
};
const norm = (s: string) => fold(s).replace(/[^a-z0-9]+/g, ' ').trim();

export type ImportStatus = 'new' | 'update' | 'error';
export type ImportError = 'noName' | 'noContact' | 'badEmail' | 'dupInFile';
export interface ImportRow {
  line: number;
  status: ImportStatus;
  error?: ImportError;
  customer: ManualCustomer;
  tags: string[];
  marketing: Partial<Marketing>;
  /** Existing customer this row updates */
  match?: CustomerRecord;
}

const YES = new Set(['yes', 'y', 'true', '1', 'po', 'da', 'subscribed', 'x']);
const LANGS: Record<string, Lang> = { me: 'me', sr: 'me', srpski: 'me', serbian: 'me', serbisht: 'me', cg: 'me', mne: 'me', crnogorski: 'me', montenegrin: 'me', sq: 'sq', al: 'sq', shqip: 'sq', albanski: 'sq', albanian: 'sq', en: 'en', english: 'en', engleski: 'en', anglisht: 'en' };

export function analyseImport(text: string, existing: CustomerRecord[], now: string): { rows: ImportRow[]; columns: ImportField[]; unknown: string[] } {
  const table = parseCsv(text);
  if (!table.length) return { rows: [], columns: [], unknown: [] };
  const header = table[0].map(norm);
  const colOf = {} as Partial<Record<ImportField, number>>;
  const unknown: string[] = [];
  header.forEach((h, i) => {
    const f = (Object.keys(ALIASES) as ImportField[]).find((k) => ALIASES[k].map(norm).includes(h));
    if (f && colOf[f] === undefined) colOf[f] = i;
    else if (!f && table[0][i]?.trim()) unknown.push(table[0][i].trim());
  });
  const byEmail = new Map<string, CustomerRecord>();
  const byPhone = new Map<string, CustomerRecord>();
  for (const c of existing) {
    for (const e of c.emails) byEmail.set(e, c);
    for (const p of c.phones) if (phone8(p)) byPhone.set(phone8(p), c);
  }
  const seenKeys = new Set<string>();
  const rows: ImportRow[] = table.slice(1).map((cells, idx) => {
    const get = (f: ImportField) => (colOf[f] !== undefined ? (cells[colOf[f]!] ?? '').trim() : '');
    let firstName = get('firstName');
    let lastName = get('lastName');
    if (!firstName && !lastName && get('name')) {
      const parts = get('name').split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
    const email = low(get('email'));
    const phone = get('phone');
    const consent = (v: string): Consent | undefined => {
      const x = low(v);
      if (!x) return undefined;
      if (YES.has(x)) return { status: 'subscribed', at: now, source: 'import' };
      if (x.startsWith('unsub') || x === 'odjavljen' || x === 'cabonuar' || x === 'çabonuar') return { status: 'unsubscribed', at: now, source: 'import' };
      return undefined;
    };
    const marketing: Partial<Marketing> = {};
    const mk: [Channel, ImportField][] = [['email', 'emailMarketing'], ['sms', 'smsMarketing'], ['whatsapp', 'whatsappMarketing'], ['viber', 'viberMarketing']];
    for (const [ch, f] of mk) {
      const c = consent(get(f));
      if (c) marketing[ch] = c;
    }
    const match = (email && byEmail.get(email)) || (phone8(phone) ? byPhone.get(phone8(phone)) : undefined) || undefined;
    const key = match?.key ?? manualKey(email, phone, `${firstName} ${lastName}`);
    const customer: ManualCustomer = {
      key,
      firstName,
      lastName,
      email,
      phone,
      city: get('city'),
      address: get('address'),
      company: get('company') || undefined,
      lang: LANGS[low(get('lang'))] ?? 'me',
      source: 'import',
      createdAt: now,
    };
    const tags = get('tags').split(/[;|,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    let error: ImportError | undefined;
    if (!firstName && !lastName) error = 'noName';
    else if (!email && !phone8(phone)) error = 'noContact';
    else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) error = 'badEmail';
    else if (seenKeys.has(key)) error = 'dupInFile';
    if (!error) seenKeys.add(key);
    return { line: idx + 2, status: error ? 'error' : match ? 'update' : 'new', error, customer, tags, marketing, match };
  });
  return { rows, columns: Object.keys(colOf) as ImportField[], unknown };
}
