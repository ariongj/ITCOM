import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowUpRight, Camera, Cookie, Download, ExternalLink, FileText, Search, Trash2 } from 'lucide-react';
import { adm } from '@/admin/i18n';
import { Button } from '@/components/ui/Button';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { date } from '@/lib/format';
import { href } from '@/lib/paths';
import type { Integration } from '@/lib/types';
import { download } from '@/lib/utils';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { S } from './strings';
import { ToggleRow } from './fields';
import type { SecProps } from './model';
import { Block, Gate, Note, Panel, StateText, type StateTone } from './ui';

const PR = defineDict({
  me: {
    policies: 'Pravila',
    policies_h: 'Pravne stranice uređuju se u Sadržaju; ovdje vidite status i link u podnožju sajta.',
    inFooter: 'U podnožju',
    notInFooter: 'Nije u podnožju',
    view: 'Prikaži',
    edit: 'Uredi',
    cookies: 'Kolačići i saglasnost',
    cookieBanner: 'Baner za kolačiće',
    cookieBanner_d: 'Posjetilac bira: neophodni, analitika, marketing. Nebitni kolačići se ne postavljaju bez saglasnosti.',
    pixels: 'Pikseli i događaji kupca',
    pixels_d: 'Analitika i marketinški pikseli aktiviraju se tek nakon saglasnosti.',
    marketing: 'Marketinška saglasnost na checkout-u',
    marketing_d: 'Posebno polje, nikad unaprijed označeno.',
    st_connected: 'Povezano',
    st_test: 'U testu',
    st_disconnected: 'Nije povezano',
    rights: 'Prava kupca na podatke',
    rights_h: 'Izvoz i brisanje po politici podataka.',
    lookup: 'E-mail ili telefon kupca',
    find: 'Pronađi',
    found: 'Narudžbe: {orders} · upiti: {inquiries} · termini: {bookings}',
    none: 'Nema podataka za ovaj kontakt.',
    exportBtn: 'Izvezi podatke (JSON)',
    exported: 'Izvoz podataka kupca je preuzet',
    auditDetail: 'Izvoz podataka kupca: {who}',
    example: 'Primjer',
    deletion: 'Brisanje: marketinške saglasnosti i upiti brišu se odmah na zahtjev; narudžbe i fakture se anonimizuju i čuvaju 10 godina zbog zakonskih (fiskalnih) obaveza.',
    tryon: 'Virtuelna proba',
    tryon_h: 'Kamera i fotografije na stranici „Virtuelna proba“.',
    tryon_d: 'Slika sa kamere ili otpremljena fotografija obrađuje se samo u pregledaču posetioca. Ništa se ne šalje na server, ne čuva se i ne deli — kada se stranica zatvori, slika nestaje. Pregledač traži dozvolu za kameru pre prvog korišćenja.',
    tryonOpen: 'Otvori probu',
  },
  sq: {
    policies: 'Politikat',
    policies_h: 'Faqet ligjore redaktohen te Përmbajtja; këtu shihni statusin dhe linkun në fund të faqes.',
    inFooter: 'Në fund të faqes',
    notInFooter: 'Jo në fund të faqes',
    view: 'Shiko',
    edit: 'Redakto',
    cookies: 'Cookies dhe pëlqimi',
    cookieBanner: 'Banneri i cookies',
    cookieBanner_d: 'Vizitori zgjedh: të domosdoshme, analitikë, marketing. Cookies jo-thelbësore nuk vendosen pa pëlqim.',
    pixels: 'Pixels dhe ngjarjet e klientit',
    pixels_d: 'Analitika dhe pixels e marketingut aktivizohen vetëm pas pëlqimit.',
    marketing: 'Pëlqimi i marketingut në checkout',
    marketing_d: 'Kuti e veçantë, asnjëherë e paraplotësuar.',
    st_connected: 'E lidhur',
    st_test: 'Në provë',
    st_disconnected: 'E palidhur',
    rights: 'Të drejtat e klientit mbi të dhënat',
    rights_h: 'Eksport dhe fshirje sipas politikës së të dhënave.',
    lookup: 'Email-i ose telefoni i klientit',
    find: 'Kërko',
    found: 'Porosi: {orders} · kërkesa: {inquiries} · termine: {bookings}',
    none: 'Nuk ka të dhëna për këtë kontakt.',
    exportBtn: 'Eksporto të dhënat (JSON)',
    exported: 'Eksporti i të dhënave të klientit u shkarkua',
    auditDetail: 'Eksport i të dhënave të klientit: {who}',
    example: 'Shembull',
    deletion: 'Fshirja: pëlqimet e marketingut dhe kërkesat fshihen menjëherë me kërkesë; porositë dhe faturat anonimizohen dhe ruhen 10 vjet për detyrime ligjore (fiskale).',
    tryon: 'Provo virtualisht',
    tryon_h: 'Kamera dhe fotot në faqen „Provo virtualisht“.',
    tryon_d: 'Pamja e kamerës ose fotoja e ngarkuar përpunohet vetëm në shfletuesin e vizitorit. Asgjë nuk dërgohet në server, nuk ruhet dhe nuk ndahet — kur mbyllet faqja, imazhi zhduket. Shfletuesi kërkon leje për kamerën para përdorimit të parë.',
    tryonOpen: 'Hap provën',
  },
  en: {
    policies: 'Policies',
    policies_h: 'Legal pages are edited in Content; here you see their status and footer link.',
    inFooter: 'In footer',
    notInFooter: 'Not in footer',
    view: 'View',
    edit: 'Edit',
    cookies: 'Cookies & consent',
    cookieBanner: 'Cookie banner',
    cookieBanner_d: 'Visitors choose: necessary, analytics, marketing. Non-essential cookies aren’t set without consent.',
    pixels: 'Pixels & customer events',
    pixels_d: 'Analytics and marketing pixels fire only after consent.',
    marketing: 'Marketing consent at checkout',
    marketing_d: 'A separate checkbox, never pre-ticked.',
    st_connected: 'Connected',
    st_test: 'In test',
    st_disconnected: 'Not connected',
    rights: 'Customer data rights',
    rights_h: 'Export and deletion according to the data policy.',
    lookup: 'Customer e-mail or phone',
    find: 'Find',
    found: 'Orders: {orders} · enquiries: {inquiries} · appointments: {bookings}',
    none: 'No data for this contact.',
    exportBtn: 'Export data (JSON)',
    exported: 'Customer data export downloaded',
    auditDetail: 'Customer data export: {who}',
    example: 'Example',
    deletion: 'Deletion: marketing consents and enquiries are deleted right away on request; orders and invoices are anonymised and kept for 10 years for legal (fiscal) obligations.',
    tryon: 'Virtual try-on',
    tryon_h: 'Camera and photos on the “Virtual try-on” page.',
    tryon_d: 'The camera feed or an uploaded photo is processed only in the visitor’s browser. Nothing is sent to a server, stored or shared — when the page is closed, the image is gone. The browser asks for camera permission before first use.',
    tryonOpen: 'Open try-on',
  },
});
type PrKey = keyof typeof PR.me;

const POLICY_PAGES = ['pg-uslovi', 'pg-privatnost', 'pg-reklamacije', 'pg-dostava'];
const INT_TONE: Record<Integration['status'], StateTone> = { connected: 'ok', test: 'test', disconnected: 'off' };
const digits = (v: string) => v.replace(/\D/g, '');

export function PrivacySection({ s, set, readOnly }: SecProps) {
  const t = useDict(PR, 'admin');
  const ts = useDict(S, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const allow = useCan();
  const pages = useDb((st) => st.pages);
  const orders = useDb((st) => st.orders);
  const inquiries = useDb((st) => st.inquiries);
  const bookings = useDb((st) => st.bookings);
  const logAudit = useDb((st) => st.logAudit);
  const [q, setQ] = useState('');

  const policies = useMemo(() => POLICY_PAGES.map((id) => pages.find((p) => p.id === id)).filter((p) => !!p), [pages]);
  const analytics = s.integrations.find((i) => i.kind === 'analytics');

  const match = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (v.length < 4) return null;
    const d = digits(v);
    const hit = (email?: string, phone?: string) => (!!email && email.toLowerCase() === v) || (d.length >= 6 && !!phone && digits(phone).endsWith(d.slice(-8)));
    return {
      orders: orders.filter((o) => hit(o.customer.email, o.customer.phone)),
      inquiries: inquiries.filter((x) => hit(x.email, x.phone)),
      bookings: bookings.filter((b) => hit(b.email, b.phone)),
    };
  }, [q, orders, inquiries, bookings]);
  const total = match ? match.orders.length + match.inquiries.length + match.bookings.length : 0;
  const sampleEmail = orders.find((o) => o.customer.email)?.customer.email ?? '';
  const canExport = allow('customers', 'export');

  const exportData = () => {
    if (!match || !total) return;
    const who = q.trim();
    download(`customer-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), contact: who, ...match }, null, 2));
    logAudit({ action: 'send', object: 'customer', objectId: who, detail: t('auditDetail', { who }) });
    toast.success(t('exported'));
  };

  return (
    <div className="space-y-5">
      <Panel lead title={ts('sec_privacy')} description={ts('sec_privacy_d')}>
        <Block title={t('policies')} hint={t('policies_h')}>
          <ul className="divide-y divide-line/60 overflow-hidden rounded-lg border border-line">
            {policies.map((p) => (
              <li key={p.id} className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-ink">{l(p.title)}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                      <StateText tone={p.published ? 'ok' : 'off'}>{p.published ? ta('published') : ta('draft')}</StateText>
                      <span>{p.showInFooter ? t('inFooter') : t('notInFooter')}</span>
                      <span>
                        {ta('updated')} {date(p.updatedAt, lang)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 pl-7 sm:pl-0">
                  <a href={href(`/faqe/${p.slug}`)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold text-ink-soft hover:bg-ink/[0.05] hover:text-ink">
                    {t('view')} <ExternalLink className="h-3 w-3" />
                  </a>
                  {allow('content', 'edit') && (
                    <Link to={`/admin/stranice/${p.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 text-[12.5px] font-semibold text-ink hover:border-ink/35">
                      {t('edit')} <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Block>

        <Block title={t('cookies')}>
          <div className="divide-y divide-line/70">
            <div className="pb-3.5">
              <ToggleRow icon={<Cookie className="h-[18px] w-[18px]" />} title={t('cookieBanner')} description={t('cookieBanner_d')} checked={s.privacy.cookieBanner} disabled={readOnly} onChange={(v) => set('privacy', { ...s.privacy, cookieBanner: v })} />
            </div>
            <div className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-ink">{t('pixels')}</div>
                <p className="text-[12.5px] text-muted">{t('pixels_d')}</p>
              </div>
              {analytics && allow('integrations', 'view') && (
                <Link to="/admin/integracije" className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
                  {analytics.name}: <StateText tone={INT_TONE[analytics.status]}>{t(`st_${analytics.status}` as PrKey)}</StateText>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            <div className="flex flex-col gap-1.5 pt-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-ink">{t('marketing')}</div>
                <p className="text-[12.5px] text-muted">{t('marketing_d')}</p>
              </div>
              <Link to="/admin/konfiguracija/checkout" className="inline-flex shrink-0 items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
                <StateText tone={s.checkout.marketingOptIn ? 'ok' : 'off'}>{s.checkout.marketingOptIn ? ts('statusOn') : ts('statusOff')}</StateText>
                <span>· {ts('sec_checkout')}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Block>

        <Block title={t('rights')} hint={t('rights_h')}>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('lookup')}
                aria-label={t('lookup')}
                className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[14px] outline-none transition placeholder:text-muted/70 focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
              />
            </div>
            <Gate allowed={canExport} reason={ts('noPermission')}>
              <Button variant="outline" size="sm" shape="rounded" className="h-10!" icon={<Download className="h-4 w-4" />} disabled={!canExport || !total} onClick={exportData}>
                {t('exportBtn')}
              </Button>
            </Gate>
          </div>
          <div className="mt-2 min-h-5 text-[12.5px]">
            {match ? (
              total ? (
                <StateText tone="ok">{t('found', { orders: match.orders.length, inquiries: match.inquiries.length, bookings: match.bookings.length })}</StateText>
              ) : (
                <StateText tone="off">{t('none')}</StateText>
              )
            ) : (
              sampleEmail && (
                <button type="button" onClick={() => setQ(sampleEmail)} className="text-muted hover:text-ink">
                  {t('example')}: <span className="font-medium underline decoration-ink/20 underline-offset-2">{sampleEmail}</span>
                </button>
              )
            )}
          </div>
          <Note icon={Trash2} className="mt-4">
            {t('deletion')}
          </Note>
        </Block>

        <Block title={t('tryon')} hint={t('tryon_h')}>
          <Note icon={Camera}>
            <p>{t('tryon_d')}</p>
            <a href={href('/provo-virtualisht')} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-semibold text-ink hover:underline">
              {t('tryonOpen')} <ExternalLink className="h-3 w-3" />
            </a>
          </Note>
        </Block>
      </Panel>
    </div>
  );
}
