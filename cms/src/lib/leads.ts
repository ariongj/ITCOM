// Leads → the shop's inbox. The site has no server: orders, bookings and requests are kept in the visitor's own
// browser, so each one is also e-mailed to the shop through Web3Forms (https://web3forms.com — a public, form-only
// access key; it can only send to the address it was created for). Without a key nothing is sent (demo mode).
//
// The key is set at build time: VITE_WEB3FORMS_KEY (e.g. a GitHub Actions variable) or SHOP_FORM_KEY below.
// It must be in the build, not only in the CMS — CMS settings live in the editor's own browser.
import type { Booking, Inquiry, Order } from './types';
import { dateTime, money } from './format';

/** Paste the Web3Forms access key the shop received by e-mail here (or set VITE_WEB3FORMS_KEY). */
const SHOP_FORM_KEY = '';

const KEY = (import.meta.env.VITE_WEB3FORMS_KEY as string | undefined)?.trim() || SHOP_FORM_KEY;
const ENDPOINT = 'https://api.web3forms.com/submit';
const OUTBOX = 'itcom-cms-outbox';

/** True once leads are actually delivered to the shop (a key is configured). */
export const leadsLive = !!KEY;

interface Lead {
  subject: string;
  /** Shown as the sender name in the shop's inbox */
  from: string;
  /** Customer e-mail: "Reply" in the inbox answers the customer */
  replyTo?: string;
  /** Rows of the e-mail, in order (empty values are left out) */
  fields: [label: string, value: string | number | undefined | null][];
}

type Payload = Record<string, string>;

function payload(lead: Lead): Payload {
  const p: Payload = { access_key: KEY, subject: lead.subject, from_name: lead.from };
  if (lead.replyTo) p.replyto = lead.replyTo;
  for (const [label, value] of lead.fields) {
    const v = value === undefined || value === null ? '' : String(value).trim();
    if (v) p[label] = v;
  }
  return p;
}

async function post(p: Payload): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(p),
      keepalive: true, // the page usually navigates right after a submit
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => ({}))) as { success?: boolean };
    return json.success !== false;
  } catch {
    return false;
  }
}

function readOutbox(): Payload[] {
  try {
    const v = JSON.parse(localStorage.getItem(OUTBOX) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeOutbox(list: Payload[]) {
  try {
    if (list.length) localStorage.setItem(OUTBOX, JSON.stringify(list.slice(-20)));
    else localStorage.removeItem(OUTBOX);
  } catch {
    /* storage full or blocked: nothing more we can do */
  }
}

/** Send one lead; if the network fails it waits in an outbox and is retried on the next visit. Never throws. */
function send(lead: Lead) {
  if (!KEY) return;
  const p = payload(lead);
  void post(p).then((ok) => {
    if (!ok) writeOutbox([...readOutbox(), p]);
  });
}

/** Retry anything that didn't go out (offline submit, closed tab). Called once at start-up. */
export function flushLeadOutbox() {
  if (!KEY) return;
  const pending = readOutbox();
  if (!pending.length) return;
  writeOutbox([]);
  void Promise.all(pending.map((p) => post({ ...p, access_key: KEY }).then((ok) => (ok ? null : p)))).then((left) => {
    const failed = left.filter((p): p is Payload => !!p);
    if (failed.length) writeOutbox([...readOutbox(), ...failed]);
  });
}

/* ------------------------------------------------------------------ */
/* What the shop receives (in Albanian, the shop's language)           */
/* ------------------------------------------------------------------ */
const DELIVERY: Record<string, string> = { delivery: 'Dërgesë në adresë', pickup: 'Marrje në dyqan' };
const PAYMENT: Record<string, string> = { cod: 'Pagesë në dorëzim', bank: 'Transfertë bankare', card: 'Kartelë' };
const eur = (n: number) => money(n, 'sq');
const when = (iso?: string) => (iso ? dateTime(iso, 'sq') : '');

export function notifyOrder(o: Order) {
  const c = o.customer;
  const lines = o.items.map((l) => `${l.qty} × ${l.name}${l.options ? ` (${l.options})` : ''} — ${eur(l.lineTotal)}`).join('\n');
  send({
    subject: `Porosi e re ${o.number} — ${eur(o.total)}`,
    from: `${c.firstName} ${c.lastName}`.trim() || 'Porosi nga uebi',
    replyTo: c.email || undefined,
    fields: [
      ['Porosia', o.number],
      ['Data', when(o.createdAt)],
      ['Klienti', `${c.firstName} ${c.lastName}`.trim()],
      ['Telefoni', c.phone],
      ['E-mail', c.email],
      ['Kompania', c.company ? `${c.company}${c.pib ? ` (NUI ${c.pib})` : ''}` : ''],
      ['Qyteti', c.city],
      ['Adresa', c.address],
      ['Marrja', DELIVERY[o.delivery.method] ?? o.delivery.method],
      ['Pagesa', PAYMENT[o.payment.method] ?? o.payment.method],
      ['Artikujt', lines],
      ['Nëntotali', eur(o.subtotal)],
      ['Zbritja', o.discount ? `−${eur(o.discount)}` : ''],
      ['Transporti', eur(o.shipping)],
      ['Totali', eur(o.total)],
      ['Kodet', (o.discounts ?? []).map((d) => d.code).filter(Boolean).join(', ')],
      ['Shënim / receta', c.note],
    ],
  });
}

/** Contact messages, availability and price requests, partner requests and bookings (with their slot). */
export function notifyInquiry(q: Inquiry, extra: { booking?: Pick<Booking, 'start' | 'durationMin'>; product?: string; topic?: string } = {}) {
  const kind = extra.booking ? 'Rezervim i ri' : q.type === 'quote' ? 'Kërkesë për ofertë' : q.type === 'measurement' ? 'Kërkesë për termin' : 'Mesazh i ri';
  const about = extra.topic || q.service || extra.product || '';
  send({
    subject: `${kind}${about ? ` — ${about}` : ''} (${q.name})`,
    from: q.name || 'Kërkesë nga uebi',
    replyTo: q.email || undefined,
    fields: [
      ['Lloji', kind],
      ['Termini', extra.booking ? `${when(extra.booking.start)} (${extra.booking.durationMin} min) — në pritje të konfirmimit` : ''],
      ['Shërbimi / tema', q.service],
      ['Produkti', extra.product],
      ['Emri', q.name],
      ['Telefoni', q.phone],
      ['E-mail', q.email],
      ['Kompania', q.company],
      ['Qyteti', q.city],
      ['Data e preferuar', q.preferredDate],
      ['Mesazhi', q.message && q.message !== '—' ? q.message : ''],
      ['Etiketat', (q.tags ?? []).join(', ')],
      ['Dërguar më', when(q.createdAt)],
    ],
  });
}

export function notifyNewsletter(email: string) {
  send({ subject: `Abonim i ri në buletin: ${email}`, from: 'Buletini', replyTo: email, fields: [['E-mail', email], ['Data', when(new Date().toISOString())]] });
}
