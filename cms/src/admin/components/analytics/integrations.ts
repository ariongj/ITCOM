// Integrations catalogue (PDF p.06 "Integrime: pagesa, korrier, email, ERP, analitikë", p.40 "Integrime dhe webhook
// endpoints me scopes, status, histori dhe rotacion secrets", p.51 "Pagesa, korrieri, fiskalizimi/kontabiliteti").
// Everything here is a DEMO description: nothing connects to a real service.
import type { ComponentType } from 'react';
import { ChartColumn, CreditCard, Database, Mail, Receipt, Truck } from 'lucide-react';
import type { Integration, IntegrationKind, L10n, Order } from '@/lib/types';

const T = (me: string, sq: string, en: string): L10n => ({ me, sq, en });

export const KINDS: IntegrationKind[] = ['payment', 'courier', 'email', 'fiscal', 'analytics', 'erp'];

export interface IntegrationX extends Integration {
  provider?: string;
  scopes?: string[];
  env?: 'test' | 'live';
  lastSync?: string;
  /** demo connection log entries, newest first */
  log?: { at: string; level: 'ok' | 'warn' | 'error'; text: L10n }[];
}

export interface KindMeta {
  icon: ComponentType<{ className?: string }>;
  label: L10n;
  title: L10n;
  desc: L10n;
  providers: { id: string; name: string; note: L10n }[];
  scopes: { id: string; label: L10n; required?: boolean }[];
}

export const KIND_META: Record<IntegrationKind, KindMeta> = {
  payment: {
    icon: CreditCard,
    label: T('Plaćanja', 'Pagesa', 'Payments'),
    title: T('Kartično plaćanje', 'Pagesa me kartelë', 'Card payments'),
    desc: T('Online plaćanje karticom, autorizacija, naplata i povrat novca. CMS čuva samo reference transakcija, nikad brojeve kartica.', 'Pagesë online me kartelë, autorizim, capture dhe rimbursim. CMS ruan vetëm referenca transaksioni, jo numra kartash.', 'Online card payments, authorisation, capture and refunds. The CMS stores transaction references only, never card numbers.'),
    providers: [
      { id: 'bank', name: 'ProCredit Bank Kosovo · e-commerce', note: T('Ugovor sa bankom na Kosovu', 'Kontratë me bankën në Kosovë', 'Contract with a Kosovo bank') },
      { id: 'teb', name: 'TEB Kosova · POS virtual', note: T('Virtuelni POS banke', 'POS virtual i bankës', 'The bank’s virtual POS') },
      { id: 'raiffeisen', name: 'Raiffeisen Bank Kosovo · e-commerce', note: T('E-commerce servis banke', 'Shërbimi e-commerce i bankës', 'The bank’s e-commerce service') },
    ],
    scopes: [
      { id: 'payments:write', label: T('Kreiranje i naplata plaćanja', 'Krijo dhe kap pagesa', 'Create and capture payments'), required: true },
      { id: 'refunds:write', label: T('Povrat novca', 'Rimburso', 'Refunds') },
      { id: 'webhooks:read', label: T('Webhook obavještenja (potpisana)', 'Njoftime webhook (të nënshkruara)', 'Webhook notifications (signed)'), required: true },
    ],
  },
  courier: {
    icon: Truck,
    label: T('Kurir', 'Korrier', 'Courier'),
    title: T('Kurirska služba', 'Shërbimi i korrierit', 'Courier service'),
    desc: T('Kreiranje pošiljki i naljepnica, broj za praćenje u narudžbi i obavještenje kupcu.', 'Krijim dërgesash dhe etiketash, numri i gjurmimit në porosi dhe njoftim për klientin.', 'Shipments and labels, tracking number on the order and a customer notification.'),
    providers: [
      { id: 'postakosoves', name: 'Posta e Kosovës', note: T('Nacionalna pošta', 'Posta kombëtare', 'National post') },
      { id: 'partner', name: 'Kurirski partner (Kosovo)', note: T('Dostava 1–3 dana širom Kosova', 'Dërgesë 1–3 ditë në gjithë Kosovën', '1–3 day delivery across Kosovo') },
      { id: 'dhl', name: 'DHL Express', note: T('Međunarodne pošiljke', 'Dërgesa ndërkombëtare', 'International shipments') },
    ],
    scopes: [
      { id: 'shipments:write', label: T('Pošiljke i naljepnice', 'Dërgesa dhe etiketa', 'Shipments and labels'), required: true },
      { id: 'tracking:read', label: T('Praćenje pošiljke', 'Gjurmimi i dërgesës', 'Shipment tracking'), required: true },
      { id: 'pickups:write', label: T('Zakazivanje preuzimanja', 'Porosit marrje', 'Schedule pickups') },
    ],
  },
  email: {
    icon: Mail,
    label: T('E-mail', 'E-mail', 'E-mail'),
    title: T('Transakcijski e-mail', 'E-mail transaksionalë', 'Transactional e-mail'),
    desc: T('Potvrde narudžbi, plaćanja, dostave, povrata, kontakata i termina — sa logom slanja i ponovnim pokušajem.', 'Konfirmime porosie, pagese, dërgese, kthimi, kontakti dhe termini — me log dërgimi dhe riprovim.', 'Order, payment, shipping, return, contact and booking confirmations — with a send log and retries.'),
    providers: [
      { id: 'smtp', name: 'SMTP (info@itcom.example)', note: T('Postojeći server pošte', 'Serveri ekzistues i postës', 'Existing mail server') },
      { id: 'postmark', name: 'Postmark', note: T('Servis za transakcijsku poštu', 'Shërbim për e-mail transaksionalë', 'Transactional e-mail service') },
      { id: 'ses', name: 'Amazon SES', note: T('Veliki obim slanja', 'Vëllim i madh dërgimi', 'High sending volume') },
    ],
    scopes: [
      { id: 'messages:send', label: T('Slanje poruka', 'Dërgo mesazhe', 'Send messages'), required: true },
      { id: 'templates:read', label: T('Šabloni', 'Shabllonet', 'Templates') },
      { id: 'bounces:read', label: T('Vraćene poruke (bounce)', 'Mesazhet e kthyera (bounce)', 'Bounces') },
    ],
  },
  fiscal: {
    icon: Receipt,
    label: T('Fiskalizacija', 'Fiskalizimi', 'Fiscalisation'),
    title: T('Fiskalizacija (ATK)', 'Fiskalizimi (ATK)', 'Fiscalisation (ATK)'),
    desc: T('Registracija računa preko fiskalnog sistema ATK i čuvanje fiskalnog broja na računu. CMS ne zamenjuje fiskalni uređaj.', 'Regjistrimi i faturave përmes sistemit fiskal të ATK-së dhe ruajtja e numrit fiskal në faturë. CMS-i nuk e zëvendëson pajisjen fiskale.', 'Registers invoices through the ATK fiscal system and stores the fiscal number on the invoice. The CMS does not replace the fiscal device.'),
    providers: [
      { id: 'atk', name: 'ATK — Administrata Tatimore e Kosovës', note: T('Fiskalni uređaj ili softver sertifikovan kod ATK', 'Pajisje ose softuer fiskal i certifikuar nga ATK', 'ATK-certified fiscal device or software') },
      { id: 'accounting', name: 'ERP / POS', note: T('Fiskalizuje knjigovodstvo', 'Fiskalizon kontabiliteti', 'Fiscalised by the accounting software') },
    ],
    scopes: [
      { id: 'invoices:fiscalize', label: T('Fiskalizacija računa (fiskalni broj)', 'Fiskalizo faturat (numri fiskal)', 'Fiscalise invoices (fiscal number)'), required: true },
      { id: 'invoices:read', label: T('Status računa', 'Statusi i faturave', 'Invoice status'), required: true },
      { id: 'cash:write', label: T('Depozit gotovine', 'Depozita e arkës', 'Cash deposit') },
    ],
  },
  analytics: {
    icon: ChartColumn,
    label: T('Analitika', 'Analitikë', 'Analytics'),
    title: T('Merenje poseta i konverzija', 'Matja e vizitave dhe konvertimeve', 'Visit and conversion tracking'),
    desc: T('Strukturisani događaji: posjeta, korpa, checkout, kupovina, UTM i klikovi na ponude — uz poštovanje pristanka na kolačiće.', 'Ngjarje të strukturuara: vizitë, shportë, checkout, blerje, UTM dhe klikime ofertash — duke respektuar pëlqimin për cookies.', 'Structured events: visit, cart, checkout, purchase, UTM and offer clicks — respecting cookie consent.'),
    providers: [
      { id: 'ga4', name: 'Google Analytics 4', note: T('Besplatno, standard', 'Falas, standard', 'Free, standard') },
      { id: 'plausible', name: 'Plausible', note: T('Bez kolačića', 'Pa cookies', 'Cookie-less') },
      { id: 'meta', name: 'Meta Pixel', note: T('Kampanje na mrežama', 'Fushata në rrjete', 'Social campaigns') },
    ],
    scopes: [
      { id: 'events:write', label: T('Slanje događaja', 'Dërgo ngjarje', 'Send events'), required: true },
      { id: 'consent:read', label: T('Pristanak na kolačiće', 'Pëlqimi për cookies', 'Cookie consent'), required: true },
      { id: 'reports:read', label: T('Čitanje izvještaja u CMS-u', 'Lexo raportet në CMS', 'Read reports in the CMS') },
    ],
  },
  erp: {
    icon: Database,
    label: T('ERP / knjigovodstvo', 'ERP / kontabilitet', 'ERP / accounting'),
    title: T('ERP i knjigovodstvo', 'ERP dhe kontabiliteti', 'ERP and accounting'),
    desc: T('Sinhronizacija artikala, zaliha, narudžbi i računa sa knjigovodstvom. Uključuje se po potrebi, uz specifikaciju i testove.', 'Sinkronizim artikujsh, stoku, porosish dhe faturash me kontabilitetin. Aktivizohet sipas nevojës, me specifikim dhe prova.', 'Syncs items, stock, orders and invoices with accounting. Switched on when needed, with a specification and tests.'),
    providers: [
      { id: 'pantheon', name: 'Pantheon', note: T('ERP u regionu', 'ERP në rajon', 'Regional ERP') },
      { id: 'minimax', name: 'Minimax', note: T('Online knjigovodstvo', 'Kontabilitet online', 'Online accounting') },
      { id: 'csv', name: 'CSV / API', note: T('Izvoz za postojeći sistem', 'Eksport për sistemin ekzistues', 'Export for the existing system') },
    ],
    scopes: [
      { id: 'products:read', label: T('Artikli i zalihe', 'Artikuj dhe stok', 'Items and stock'), required: true },
      { id: 'orders:write', label: T('Slanje narudžbi', 'Dërgo porositë', 'Send orders'), required: true },
      { id: 'invoices:read', label: T('Računi', 'Faturat', 'Invoices') },
    ],
  },
};

/** Localised versions of the seeded notes (the stored note is Albanian only — `sq` must equal DEFAULT_SETTINGS.integrations[].note). */
export const SEEDED_NOTES: Record<string, L10n> = {
  'int-payment': T('Test režim — kartice se ne terete. Produkcijski ključevi posle ugovora sa bankom.', 'Mënyra test — kartelat nuk ngarkohen. Çelësat e prodhimit pas kontratës me bankën.', 'Test mode — cards are not charged. Live keys after the contract with the bank.'),
  'int-courier': T('Za sada dostava po Mitrovici našim vozilom; API kurira zavisi od izabranog partnera.', 'Për momentin dërgesat në Mitrovicë me automjetin tonë; API e kurierit sipas partnerit të zgjedhur.', 'For now we deliver around Mitrovica with our own car; the courier API depends on the chosen partner.'),
  'int-email': T('Potvrde narudžbi i termina šalju se sa info@itcom.example.', 'Konfirmimet e porosive dhe termineve dërgohen nga info@itcom.example.', 'Order and appointment confirmations are sent from info@itcom.example.'),
  'int-fiscal': T('Povezivanje sa sistemom fiskalizacije ATK — planirano za fazu 2.', 'Lidhja me sistemin e fiskalizimit të ATK-së — e planifikuar për fazën 2.', 'Connection to the ATK fiscalisation system — planned for phase 2.'),
  'int-analytics': T('Merenje poseta i konverzija u test property-ju.', 'Matja e vizitave dhe konvertimeve në property test.', 'Visit and conversion tracking in a test property.'),
};

export const DEFAULT_PROVIDER: Partial<Record<IntegrationKind, string>> = { payment: 'bank', email: 'smtp', analytics: 'ga4' };

/** Every kind has a card: kinds missing from settings show as "not connected". */
export function integrationList(stored: Integration[]): IntegrationX[] {
  return KINDS.map((kind) => {
    const found = stored.find((i) => i.kind === kind) as IntegrationX | undefined;
    const base: IntegrationX = found ?? { id: `int-${kind}`, kind, name: KIND_META[kind].title.sq, status: 'disconnected', note: '' };
    return {
      ...base,
      provider: base.provider ?? (base.status !== 'disconnected' ? DEFAULT_PROVIDER[kind] : undefined),
      scopes: base.scopes ?? (base.status !== 'disconnected' ? KIND_META[kind].scopes.map((s) => s.id) : []),
      env: base.env ?? (base.status === 'connected' ? 'live' : base.status === 'test' ? 'test' : undefined),
    };
  });
}

export const maskEmail = (e: string) => {
  const [u, d] = e.split('@');
  return d ? `${u.slice(0, 1)}•••@${d}` : e;
};

/** Demo activity log, derived from real store data so it changes with the demo. */
export function demoLog(x: IntegrationX, orders: Order[], now: Date): { at: string; level: 'ok' | 'warn' | 'error'; text: L10n }[] {
  const out = [...(x.log ?? [])];
  const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  const min = (n: number) => new Date(now.getTime() - n * 60000).toISOString();
  if (x.kind === 'payment' && x.status !== 'disconnected') {
    for (const o of recent.filter((o) => o.payment.method === 'card').slice(0, 4))
      out.push({ at: o.createdAt, level: 'ok', text: T(`payment.succeeded — ${o.number} · webhook potpis provjeren`, `payment.succeeded — ${o.number} · nënshkrimi i webhook-ut u verifikua`, `payment.succeeded — ${o.number} · webhook signature verified`) });
    out.push({ at: min(60 * 26), level: 'warn', text: T('Test način: kartice se ne terete', 'Mjedis prove: kartelat nuk ngarkohen', 'Test mode: cards are not charged') });
  }
  if (x.kind === 'email' && x.status !== 'disconnected') {
    for (const o of recent.slice(0, 5))
      out.push({ at: o.createdAt, level: 'ok', text: T(`Poslato „Primili smo vašu narudžbu ${o.number}“ → ${maskEmail(o.customer.email)}`, `U dërgua „E morëm porosinë tuaj ${o.number}“ → ${maskEmail(o.customer.email)}`, `Sent “We received your order ${o.number}” → ${maskEmail(o.customer.email)}`) });
    out.push({ at: min(60 * 30), level: 'warn', text: T('1 poruka vraćena (bounce) — ponovni pokušaj zakazan', '1 mesazh u kthye (bounce) — riprovimi u planifikua', '1 message bounced — retry scheduled') });
  }
  if (x.kind === 'analytics' && x.status !== 'disconnected') {
    out.push({ at: min(9), level: 'ok', text: T('Poslato 312 događaja (page_view, add_to_cart, purchase) u test property', 'U dërguan 312 ngjarje (page_view, add_to_cart, purchase) në property prove', '312 events sent (page_view, add_to_cart, purchase) to the test property') });
    out.push({ at: min(60 * 5), level: 'warn', text: T('18 % posjetilaca odbilo je analitičke kolačiće — ne mjere se', '18 % e vizitorëve refuzuan cookies analitike — nuk maten', '18% of visitors declined analytics cookies — not measured') });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
