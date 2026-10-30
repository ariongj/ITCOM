import '@/admin/admin.css'; // full CMS stylesheet (the storefront sheet leaves admin-only classes out)
import { Fragment, useEffect, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, FileX2, Printer } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { LangSwitcher } from '@/components/LangSwitcher';
import { Button, ButtonLink } from '@/components/ui/Button';
import { installationAmount, lineUnits, localizeLine } from '@/admin/components/orders/helpers';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useSettings } from '@/store/hooks';
import { date, money, num, unitLabel } from '@/lib/format';
import { cn, round2 } from '@/lib/utils';
import type { Order } from '@/lib/types';

const T = defineDict({
  me: {
    docTitle: 'Predračun / Račun',
    docNo: 'br. {n}',
    back: 'Nazad na narudžbu',
    print: 'Štampaj / PDF',
    preview: 'Pregled za štampu',
    seller: 'Prodavac',
    buyer: 'Kupac',
    delivery: 'Isporuka i plaćanje',
    issued: 'Datum izdavanja',
    orderDate: 'Datum narudžbe',
    place: 'Mjesto izdavanja',
    due: 'Rok plaćanja',
    currency: 'Valuta',
    pib: 'NUI',
    pdv: 'PDV broj',
    account: 'Bankovni račun',
    tel: 'Tel.',
    email: 'E-mail',
    company: 'Firma',
    country: 'Kosovo',
    col_no: 'R.br.',
    col_desc: 'Opis',
    col_qty: 'Kol.',
    col_unit: 'Jed.',
    col_price: 'Cijena',
    col_amount: 'Iznos',
    sku: 'Šifra',
    packs: '{n} pak. × {size} m²',
    installFor: 'Nega+ — {name}',
    installSub: '12 meseci zaštite od loma i besplatna podešavanja',
    shippingLine: 'Dostava — {city}',
    discountLine: 'Popust (kupon {code})',
    discountPlain: 'Popust',
    unit_service: 'usl.',
    base: 'Osnovica (bez PDV-a)',
    vat: 'PDV {rate}%',
    toPay: 'Ukupno za uplatu',
    paidStamp: 'Plaćeno',
    payTitle: 'Instrukcije za plaćanje',
    payMethod: 'Izabrani način plaćanja',
    recipient: 'Primalac',
    bank: 'Banka',
    reference: 'Poziv na broj',
    amount: 'Iznos',
    purpose: 'Svrha uplate',
    purposeText: 'Plaćanje po predračunu {n}',
    note_cod: 'Iznos se plaća prilikom isporuke ili preuzimanja robe.',
    note_card: 'Narudžba je plaćena platnom karticom putem web prodavnice.',
    note_bank: 'Molimo izvršite uplatu u roku od 8 dana, uz poziv na broj iz ovog dokumenta.',
    thanks: 'Hvala vam na povjerenju!',
    thanksText: 'Za sva pitanja u vezi sa narudžbom, isporukom ili prilagođavanjem naočara stojimo vam na raspolaganju na {phone} ili {email}.',
    legal: 'Dokument je izdat elektronski i punovažan je bez pečata i potpisa. Cene su iskazane u evrima sa uračunatim PDV-om. Fiskalni račun izdaje se zasebno, u skladu sa propisima ATK.',
    notFound: 'Narudžba nije pronađena',
    notFoundText: 'Račun ne može biti prikazan jer narudžba ne postoji.',
    toOrders: 'Sve narudžbe',
  },
  sq: {
    docTitle: 'Parafaturë / Faturë',
    docNo: 'nr. {n}',
    back: 'Kthehu te porosia',
    print: 'Printo / PDF',
    preview: 'Parapamje për printim',
    seller: 'Shitësi',
    buyer: 'Blerësi',
    delivery: 'Dorëzimi dhe pagesa',
    issued: 'Data e lëshimit',
    orderDate: 'Data e porosisë',
    place: 'Vendi i lëshimit',
    due: 'Afati i pagesës',
    currency: 'Monedha',
    pib: 'NUI',
    pdv: 'Nr. TVSH',
    account: 'Llogaria bankare',
    tel: 'Tel.',
    email: 'E-mail',
    company: 'Kompania',
    country: 'Kosovë',
    col_no: 'Nr.',
    col_desc: 'Përshkrimi',
    col_qty: 'Sasia',
    col_unit: 'Njës.',
    col_price: 'Çmimi',
    col_amount: 'Shuma',
    sku: 'Kodi',
    packs: '{n} pako × {size} m²',
    installFor: 'Kujdes+ — {name}',
    installSub: '12 muaj mbrojtje nga thyerja dhe rregullime falas',
    shippingLine: 'Transporti — {city}',
    discountLine: 'Zbritje (kuponi {code})',
    discountPlain: 'Zbritje',
    unit_service: 'shërb.',
    base: 'Baza (pa TVSH)',
    vat: 'TVSH {rate}%',
    toPay: 'Totali për pagesë',
    paidStamp: 'E paguar',
    payTitle: 'Udhëzime për pagesë',
    payMethod: 'Mënyra e zgjedhur e pagesës',
    recipient: 'Përfituesi',
    bank: 'Banka',
    reference: 'Referenca',
    amount: 'Shuma',
    purpose: 'Qëllimi i pagesës',
    purposeText: 'Pagesë sipas parafaturës {n}',
    note_cod: 'Shuma paguhet në momentin e dorëzimit ose të marrjes së mallit.',
    note_card: 'Porosia është paguar me kartelë përmes dyqanit online.',
    note_bank: 'Ju lutemi kryeni pagesën brenda 8 ditëve, duke shënuar referencën e këtij dokumenti.',
    thanks: 'Faleminderit për besimin!',
    thanksText: 'Për çdo pyetje rreth porosisë, dorëzimit ose përshtatjes së syzeve jemi në dispozicionin tuaj në {phone} ose {email}.',
    legal: 'Dokumenti është lëshuar elektronikisht dhe është i vlefshëm pa vulë dhe nënshkrim. Çmimet janë në euro me TVSH të përfshirë. Kuponi fiskal lëshohet veçmas, sipas rregullave të ATK-së.',
    notFound: 'Porosia nuk u gjet',
    notFoundText: 'Fatura nuk mund të shfaqet sepse porosia nuk ekziston.',
    toOrders: 'Të gjitha porositë',
  },
  en: {
    docTitle: 'Proforma / Invoice',
    docNo: 'no. {n}',
    back: 'Back to order',
    print: 'Print / PDF',
    preview: 'Print preview',
    seller: 'Seller',
    buyer: 'Bill to',
    delivery: 'Delivery & payment',
    issued: 'Issue date',
    orderDate: 'Order date',
    place: 'Place of issue',
    due: 'Payment due',
    currency: 'Currency',
    pib: 'Business no. (NUI)',
    pdv: 'VAT no.',
    account: 'Bank account',
    tel: 'Tel.',
    email: 'E-mail',
    company: 'Company',
    country: 'Kosovo',
    col_no: 'No.',
    col_desc: 'Description',
    col_qty: 'Qty',
    col_unit: 'Unit',
    col_price: 'Price',
    col_amount: 'Amount',
    sku: 'SKU',
    packs: '{n} packs × {size} m²',
    installFor: 'Care+ — {name}',
    installSub: '12-month breakage cover and free adjustments',
    shippingLine: 'Delivery — {city}',
    discountLine: 'Discount (coupon {code})',
    discountPlain: 'Discount',
    unit_service: 'svc.',
    base: 'Tax base (excl. VAT)',
    vat: 'VAT {rate}%',
    toPay: 'Total to pay',
    paidStamp: 'Paid',
    payTitle: 'Payment instructions',
    payMethod: 'Selected payment method',
    recipient: 'Beneficiary',
    bank: 'Bank',
    reference: 'Reference',
    amount: 'Amount',
    purpose: 'Payment purpose',
    purposeText: 'Payment for proforma {n}',
    note_cod: 'The amount is paid on delivery or when collecting the goods.',
    note_card: 'This order was paid by card through the online shop.',
    note_bank: 'Please pay within 8 days, quoting the reference shown on this document.',
    thanks: 'Thank you for your trust!',
    thanksText: 'For any questions about your order, delivery or the fitting of your glasses, reach us at {phone} or {email}.',
    legal: 'This document was issued electronically and is valid without stamp or signature. Prices are in euros and include VAT. The fiscal receipt is issued separately under ATK (Tax Administration of Kosovo) rules.',
    notFound: 'Order not found',
    notFoundText: 'The invoice cannot be shown because the order does not exist.',
    toOrders: 'All orders',
  },
});

/** Page-level print rules: A4, no browser margins (the sheet carries its own), keep colours. */
const PRINT_CSS = `
@page { size: A4; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

export default function Invoice() {
  const { id } = useParams();
  const t = useDict(T, 'admin');
  const order = useDb((s) => s.orders.find((o) => o.id === id || o.number === id));
  const companyName = useDb((s) => s.settings.companyName);

  useEffect(() => {
    const prev = document.title;
    document.title = order ? `${order.number} — ${companyName}` : companyName;
    return () => {
      document.title = prev;
    };
  }, [order, companyName]);

  return (
    <div className="min-h-screen bg-canvas pb-16 print:min-h-0! print:bg-white print:p-0!">
      <style>{PRINT_CSS}</style>
      <div className="no-print sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[calc(210mm+2rem)] items-center gap-2 px-4">
          {order ? (
            <Link to={`/admin/narudzbe/${order.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('back')}</span>
            </Link>
          ) : (
            <span />
          )}
          {order && (
            <span className="ml-1 hidden truncate text-[13px] text-muted md:inline">
              {t('preview')} · <span className="font-semibold text-ink">{order.number}</span>
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <LangSwitcher scope="admin" compact />
            {order && (
              <Button size="sm" shape="rounded" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
                {t('print')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {order ? (
        <div className="px-3 pt-6 sm:px-4 sm:pt-10 print:p-0!">
          <Sheet order={order} />
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-md px-4 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-sand text-ink-soft">
            <FileX2 className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-ink">{t('notFound')}</h1>
          <p className="mt-1.5 text-sm text-muted">{t('notFoundText')}</p>
          <ButtonLink to="/admin/narudzbe" variant="dark" size="sm" shape="rounded" className="mt-6">
            {t('toOrders')}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

type InvoiceRow = { key: string; desc: ReactNode; sub?: ReactNode; qty: string; unit: string; price: number | null; amount: number; muted?: boolean };

function Sheet({ order }: { order: Order }) {
  const t = useDict(T, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const s = useSettings();
  const products = useDb((st) => st.products);
  const rules = useDb((st) => st.discounts);
  const tl = useL('admin');
  const c = order.customer;

  const issued = new Date().toISOString();
  const dueDate = new Date(new Date(order.createdAt).getTime() + 8 * 86400000).toISOString();
  const d = (iso: string) => date(iso, lang, { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Build invoice rows: products, their Care+ cover (stored as `installation`), delivery, discount
  const rows: InvoiceRow[] = [];
  order.items.forEach((l, i) => {
    const loc = localizeLine(l, products.find((p) => p.id === l.productId), order.lang, lang);
    const units = lineUnits(l);
    const sub = [`${t('sku')} ${l.sku}`, loc.options, l.unit === 'm2' && l.packSize ? t('packs', { n: l.qty, size: num(l.packSize, lang) }) : ''].filter(Boolean).join(' · ');
    rows.push({ key: `p${i}`, desc: loc.name, sub, qty: num(units, lang), unit: unitLabel(l.unit, lang), price: l.unitPrice, amount: l.lineTotal });
    const inst = installationAmount(l);
    if (inst > 0) rows.push({ key: `i${i}`, desc: t('installFor', { name: loc.name }), sub: t('installSub'), qty: num(units, lang), unit: unitLabel(l.unit, lang), price: l.installationPrice, amount: inst });
  });
  if (order.shipping > 0) rows.push({ key: 'ship', desc: t('shippingLine', { city: c.city }), sub: tc(`delivery_${order.delivery.method}`), qty: '1', unit: t('unit_service'), price: order.shipping, amount: order.shipping });
  // one row per applied product / order discount (the shipping discount is already reflected in the delivery row)
  const applied = (order.discounts ?? []).filter((a) => a.kind !== 'shipping' && a.amount > 0);
  if (applied.length)
    for (const a of applied) {
      const rule = rules.find((r) => r.id === a.id);
      const name = (rule && tl(rule.publicTitle)) || a.title;
      rows.push({ key: `disc-${a.id}`, desc: a.code ? t('discountLine', { code: a.code }) : t('discountPlain'), sub: name, qty: '', unit: '', price: null, amount: -a.amount, muted: true });
    }
  else if (order.discount > 0)
    rows.push({ key: 'disc', desc: order.coupon?.code ? t('discountLine', { code: order.coupon.code }) : t('discountPlain'), qty: '', unit: '', price: null, amount: -order.discount, muted: true });

  const vat = order.vat || round2(order.total - order.total / (1 + s.vatRate / 100));
  const base = round2(order.total - vat);
  const paid = order.payment.status === 'paid';
  // Settings keep the city without a postcode; the store's own city gets its postcode on the document.
  const zip = /^mitrovic/i.test(s.city.trim()) ? '40000 ' : '';

  return (
    <article className="print-sheet relative mx-auto w-full max-w-[210mm] bg-white px-5 py-7 text-[12px] leading-normal text-ink shadow-[0_1px_2px_rgb(28_26_23/0.06),0_24px_60px_-28px_rgb(28_26_23/0.35)] ring-1 ring-line/70 sm:min-h-[297mm] sm:px-[14mm] sm:py-[12mm] print:min-h-0! print:ring-0!">
      {/* brand rule */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-brand-600" />

      {/* Header: company + document meta */}
      <header className="grid gap-6 sm:grid-cols-[1fr_auto] sm:gap-10">
        <div>
          <Logo className="h-[52px]" />
          <div className="mt-3 space-y-px text-[11.5px] text-ink-soft">
            <p className="text-[13px] font-extrabold text-ink">
              {s.companyName}
              {s.legalName && s.legalName !== s.companyName && <span className="font-semibold text-ink-soft"> · {s.legalName}</span>}
            </p>
            <p>
              {s.address}, {zip}
              {s.city}, {t('country')}
            </p>
            <p>
              {t('pib')}: {s.pib} · {t('pdv')}: {s.pdv}
            </p>
            <p>
              {t('account')}: {s.bankAccount} ({s.bankName})
            </p>
            <p>
              {t('tel')} {s.phone} · {s.email}
            </p>
          </div>
        </div>
        <div className="sm:text-right">
          <h1 className="display text-[26px] leading-tight text-ink sm:text-[30px]">{t('docTitle')}</h1>
          <p className="mt-0.5 text-[15px] font-extrabold tracking-wide text-brand-700">{t('docNo', { n: order.number })}</p>
          <dl className="mt-4 grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-0.5 text-[11.5px] sm:justify-end">
            <Meta label={t('issued')}>{d(issued)}</Meta>
            <Meta label={t('orderDate')}>{d(order.createdAt)}</Meta>
            <Meta label={t('place')}>{s.city}</Meta>
            {order.payment.method === 'bank' && !paid && <Meta label={t('due')}>{d(dueDate)}</Meta>}
            <Meta label={t('currency')}>EUR (€)</Meta>
          </dl>
        </div>
      </header>

      {/* Parties */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="rounded-lg bg-canvas/70 px-4 py-3">
          <Label>{t('buyer')}</Label>
          <p className="mt-1 text-[13.5px] font-bold text-ink">
            {c.firstName} {c.lastName}
          </p>
          {c.company && <p className="font-semibold text-ink-soft">{c.company}</p>}
          {c.pib && (
            <p className="text-ink-soft">
              {t('pib')}: {c.pib}
            </p>
          )}
          <p className="text-ink-soft">{c.address}</p>
          <p className="text-ink-soft">
            {c.city}, {t('country')}
          </p>
          <p className="text-ink-soft">
            {c.phone} · {c.email}
          </p>
        </div>
        <div className="rounded-lg border border-line px-4 py-3">
          <Label>{t('delivery')}</Label>
          <p className="mt-1 font-semibold text-ink">{tc(`delivery_${order.delivery.method}`)}</p>
          <p className="text-ink-soft">{order.delivery.method === 'pickup' ? s.pickupAddress : `${c.address}, ${c.city}`}</p>
          <p className="mt-1.5 font-semibold text-ink">{tc(`pay_${order.payment.method}`)}</p>
          <p className="text-ink-soft">{tc(`paystatus_${order.payment.status}`)}</p>
        </div>
      </section>

      {/* Items */}
      <table className="mt-6 w-full border-collapse text-left">
        <thead>
          <tr className="border-b-2 border-ink text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
            <th className="hidden w-8 py-2 pr-2 font-bold sm:table-cell">{t('col_no')}</th>
            <th className="py-2 pr-3 font-bold">{t('col_desc')}</th>
            <th className="py-2 pr-2 text-right font-bold">{t('col_qty')}</th>
            <th className="hidden py-2 pl-1.5 pr-3 font-bold sm:table-cell">{t('col_unit')}</th>
            <th className="hidden py-2 pr-3 text-right font-bold sm:table-cell">{t('col_price')}</th>
            <th className="py-2 text-right font-bold">{t('col_amount')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.key} className="border-b border-line/80 align-top">
              <td className="hidden py-2 pr-2 tabular-nums text-muted sm:table-cell">{i + 1}.</td>
              <td className="py-2 pr-3">
                <span className={cn('block font-semibold leading-snug', r.muted ? 'text-ink-soft' : 'text-ink')}>{r.desc}</span>
                {r.sub && <span className="block text-[10.5px] leading-snug text-muted">{r.sub}</span>}
                {r.price !== null && <span className="block text-[10.5px] text-muted sm:hidden">{money(r.price, lang)} / {r.unit}</span>}
              </td>
              <td className="whitespace-nowrap py-2 pr-2 text-right tabular-nums">
                {r.qty}
                <span className="sm:hidden"> {r.unit}</span>
              </td>
              <td className="hidden py-2 pl-1.5 pr-3 text-ink-soft sm:table-cell">{r.unit}</td>
              <td className="hidden whitespace-nowrap py-2 pr-3 text-right tabular-nums sm:table-cell">{r.price !== null ? money(r.price, lang) : ''}</td>
              <td className={cn('whitespace-nowrap py-2 text-right font-semibold tabular-nums', r.amount < 0 && 'text-emerald-700')}>{r.amount < 0 ? `− ${money(-r.amount, lang)}` : money(r.amount, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment instructions + totals */}
      <section className="mt-5 grid gap-6 sm:grid-cols-[1fr_272px] sm:gap-8">
        <div className="order-2 rounded-lg border border-dashed border-ink/20 px-4 py-3 sm:order-1">
          <Label>{t('payTitle')}</Label>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[11.5px]">
            {(
              [
                [t('recipient'), s.legalName],
                [t('bank'), s.bankName],
                [t('account'), <span className="font-semibold tracking-wide tabular-nums">{s.bankAccount}</span>],
                [t('reference'), <span className="font-bold tracking-wide text-brand-700">{order.number}</span>],
                [t('amount'), <span className="font-semibold">{money(order.total, lang)}</span>],
                [t('purpose'), t('purposeText', { n: order.number })],
              ] as [string, ReactNode][]
            ).map(([k, v]) => (
              <Fragment key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </Fragment>
            ))}
          </dl>
          <p className="mt-2.5 border-t border-line/80 pt-2 text-[11px] text-ink-soft">
            <span className="font-semibold text-ink">{t('payMethod')}:</span> {tc(`pay_${order.payment.method}`)}. {t(`note_${order.payment.method}`)}
          </p>
        </div>

        <div className="order-1 sm:order-2">
          <dl className="space-y-1 text-[12px]">
            <TotalRow label={t('base')} value={money(base, lang)} />
            <TotalRow label={t('vat', { rate: s.vatRate })} value={money(vat, lang)} />
          </dl>
          <div className="mt-2 flex items-baseline justify-between gap-3 rounded-lg bg-ink px-3.5 py-2 text-paper">
            <span className="whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.08em] text-paper/75">{t('toPay')}</span>
            <span className="text-[17px] font-extrabold tabular-nums">{money(order.total, lang)}</span>
          </div>
          {paid && (
            <div className="mt-4 flex justify-end">
              <span className="-rotate-6 rounded-md border-2 border-emerald-600 px-3 py-1 text-[13px] font-extrabold uppercase tracking-[0.25em] text-emerald-700">{t('paidStamp')}</span>
            </div>
          )}
        </div>
      </section>

      {/* Thank-you + legal */}
      <footer className="mt-6 border-t border-line pt-4">
        <p className="display text-[20px] italic text-brand-700">{t('thanks')}</p>
        <p className="mt-1 text-pretty text-[11.5px] text-ink-soft">{t('thanksText', { phone: s.phone, email: s.email })}</p>
        <p className="mt-3 text-[10px] leading-snug text-muted">{t('legal')}</p>
      </footer>
    </article>
  );
}

function Label({ children }: { children: ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{children}</p>;
}

function Meta({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{children}</dd>
    </>
  );
}

function TotalRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
