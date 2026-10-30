import { Languages, Megaphone, Phone, ShieldCheck } from 'lucide-react';
import { defineDict, useDict } from '@/i18n';
import type { CheckoutSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { S } from './strings';
import { ToggleRow } from './fields';
import type { SecProps } from './model';
import { Block, Choice, Note, Panel, Segmented } from './ui';

const C = defineDict({
  me: {
    account: 'Nalog kupca',
    account_h: 'Da li kupac mora da ima nalog da bi kupio.',
    guestYes: 'Kao gost ili sa nalogom',
    guestYes_d: 'Preporučeno — najmanje prepreka do narudžbe.',
    guestNo: 'Samo sa nalogom',
    guestNo_d: 'Kupac se registruje prije plaćanja.',
    contact: 'Kontakt',
    contact_h: 'E-mail je uvijek obavezan zbog potvrde narudžbe.',
    phoneReq: 'Telefon je obavezan',
    phoneReq_d: 'Potreban za dogovor dostave, termina pregleda i preuzimanja naočara.',
    fields: 'Polja forme',
    fields_h: 'Ime i adresa su obavezni za dostavu.',
    company: 'Firma i NUI',
    company_d: 'Za kupce kojima treba račun na firmu.',
    f_required: 'Obavezno',
    f_optional: 'Opciono',
    f_hidden: 'Skriveno',
    marketing: 'Marketing',
    optIn: 'Saglasnost za marketing',
    optIn_d: 'Polje za potvrdu na checkout-u, nikad unaprijed označeno. Saglasnost se čuva posebno za svaki kanal (e-mail, SMS).',
    langNote: 'Jezik checkout-a i obavještenja prati jezik kupca. Pravila korpe, količina i validacija provjeravaju se na serveru.',
    preview: 'Pregled forme',
    pv_guest: 'Kao gost',
    pv_login: 'Prijava',
    pv_loginReq: 'Prijavite se ili kreirajte nalog da nastavite.',
    pv_name: 'Ime i prezime',
    pv_email: 'E-mail',
    pv_phone: 'Telefon',
    pv_company: 'Firma / NUI',
    pv_address: 'Adresa i grad',
    pv_optional: 'opciono',
    pv_optin: 'Želim da primam ponude i savjete e-mailom',
    pv_pay: 'Nastavi na plaćanje',
  },
  sq: {
    account: 'Llogaria e klientit',
    account_h: 'A duhet klienti të ketë llogari për të blerë.',
    guestYes: 'Si vizitor ose me llogari',
    guestYes_d: 'Rekomandohet — më pak pengesa deri te porosia.',
    guestNo: 'Vetëm me llogari',
    guestNo_d: 'Klienti regjistrohet para pagesës.',
    contact: 'Kontakti',
    contact_h: 'Email-i është gjithmonë i detyrueshëm për konfirmimin e porosisë.',
    phoneReq: 'Telefoni i detyrueshëm',
    phoneReq_d: 'I nevojshëm për dorëzimin dhe marrjen në dyqan.',
    fields: 'Fushat e formularit',
    fields_h: 'Emri dhe adresa janë të detyrueshme për dërgesë.',
    company: 'Kompania dhe NUI',
    company_d: 'Për klientët që kanë nevojë për faturë në emër të kompanisë.',
    f_required: 'E detyrueshme',
    f_optional: 'Opsionale',
    f_hidden: 'E fshehur',
    marketing: 'Marketingu',
    optIn: 'Pëlqimi për marketing',
    optIn_d: 'Kuti zgjedhjeje në checkout, asnjëherë e paraplotësuar. Pëlqimi ruhet veçmas për çdo kanal (email, SMS).',
    langNote: 'Gjuha e checkout-it dhe e njoftimeve lidhet me gjuhën e klientit. Rregullat e shportës, të sasisë dhe validimi kontrollohen në server.',
    preview: 'Parapamje e formularit',
    pv_guest: 'Si vizitor',
    pv_login: 'Hyr',
    pv_loginReq: 'Hyni ose krijoni llogari për të vazhduar.',
    pv_name: 'Emri dhe mbiemri',
    pv_email: 'E-mail',
    pv_phone: 'Telefoni',
    pv_company: 'Kompania / NUI',
    pv_address: 'Adresa dhe qyteti',
    pv_optional: 'opsionale',
    pv_optin: 'Dëshiroj të marr oferta dhe këshilla me email',
    pv_pay: 'Vazhdo te pagesa',
  },
  en: {
    account: 'Customer account',
    account_h: 'Whether customers need an account to buy.',
    guestYes: 'As a guest or with an account',
    guestYes_d: 'Recommended — the fewest obstacles to ordering.',
    guestNo: 'Account required',
    guestNo_d: 'Customers register before paying.',
    contact: 'Contact',
    contact_h: 'E-mail is always required for the order confirmation.',
    phoneReq: 'Phone required',
    phoneReq_d: 'Needed to arrange delivery, eye-exam appointments and collecting your glasses.',
    fields: 'Form fields',
    fields_h: 'Name and address are required for delivery.',
    company: 'Company & business no. (NUI)',
    company_d: 'For customers who need an invoice to a company.',
    f_required: 'Required',
    f_optional: 'Optional',
    f_hidden: 'Hidden',
    marketing: 'Marketing',
    optIn: 'Marketing consent',
    optIn_d: 'A checkbox at checkout, never pre-ticked. Consent is stored separately per channel (e-mail, SMS).',
    langNote: 'Checkout and notification language follows the customer’s language. Cart, quantity and validation rules are checked on the server.',
    preview: 'Form preview',
    pv_guest: 'As guest',
    pv_login: 'Sign in',
    pv_loginReq: 'Sign in or create an account to continue.',
    pv_name: 'Full name',
    pv_email: 'E-mail',
    pv_phone: 'Phone',
    pv_company: 'Company / NUI',
    pv_address: 'Address & city',
    pv_optional: 'optional',
    pv_optin: 'I’d like to receive offers and tips by e-mail',
    pv_pay: 'Continue to payment',
  },
});

function PreviewField({ label, required, optionalLabel }: { label: string; required: boolean; optionalLabel: string }) {
  return (
    <div>
      <div className="mb-1 text-[11.5px] font-semibold text-ink-soft">
        {label}
        {required ? <span className="ml-0.5 text-ink">*</span> : <span className="ml-1 font-normal text-muted">({optionalLabel})</span>}
      </div>
      <div className="h-8 rounded-md border border-line bg-white" />
    </div>
  );
}

function CheckoutPreview({ c }: { c: CheckoutSettings }) {
  const t = useDict(C, 'admin');
  return (
    <div aria-hidden className="select-none rounded-xl border border-line bg-[#f7f7f7] p-3">
      <div className="mb-2.5 px-1 text-[12px] font-semibold text-muted">{t('preview')}</div>
      <div className="rounded-lg bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] ring-1 ring-black/5">
        {c.guest ? (
          <div className="mb-4 grid grid-cols-2 rounded-md bg-[#f1f1f1] p-0.5 text-center text-[11.5px] font-semibold">
            <span className="rounded bg-white py-1 text-ink shadow-sm">{t('pv_guest')}</span>
            <span className="py-1 text-muted">{t('pv_login')}</span>
          </div>
        ) : (
          <div className="mb-4 rounded-md bg-[#f1f1f1] px-2.5 py-2 text-[11.5px] font-medium text-ink-soft">{t('pv_loginReq')}</div>
        )}
        <div className={cn('space-y-3 transition-opacity', !c.guest && 'opacity-50')}>
          <PreviewField label={t('pv_name')} required optionalLabel={t('pv_optional')} />
          <PreviewField label={t('pv_email')} required optionalLabel={t('pv_optional')} />
          <PreviewField label={t('pv_phone')} required={c.phoneRequired} optionalLabel={t('pv_optional')} />
          {c.companyField !== 'hidden' && <PreviewField label={t('pv_company')} required={c.companyField === 'required'} optionalLabel={t('pv_optional')} />}
          <PreviewField label={t('pv_address')} required optionalLabel={t('pv_optional')} />
          {c.marketingOptIn && (
            <div className="flex items-start gap-2 pt-0.5">
              <span className="mt-px h-3.5 w-3.5 shrink-0 rounded-[4px] border border-ink/30 bg-white" />
              <span className="text-[11.5px] leading-snug text-ink-soft">{t('pv_optin')}</span>
            </div>
          )}
          <div className="grid h-8 place-items-center rounded-md bg-ink text-[11.5px] font-semibold text-white">{t('pv_pay')}</div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutSection({ s, set }: SecProps) {
  const t = useDict(C, 'admin');
  const ts = useDict(S, 'admin');
  const c = s.checkout;
  const patch = (p: Partial<CheckoutSettings>) => set('checkout', { ...c, ...p });

  return (
    <Panel lead title={ts('sec_checkout')} description={ts('sec_checkout_d')}>
      <div className="grid gap-6 min-[1360px]:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0">
          <Block title={t('account')} hint={t('account_h')}>
            <div role="radiogroup" aria-label={t('account')} className="grid gap-2.5 md:grid-cols-2">
              <Choice checked={c.guest} onSelect={() => patch({ guest: true })} title={t('guestYes')} description={t('guestYes_d')} />
              <Choice checked={!c.guest} onSelect={() => patch({ guest: false })} title={t('guestNo')} description={t('guestNo_d')} />
            </div>
          </Block>

          <Block title={t('contact')} hint={t('contact_h')}>
            <ToggleRow icon={<Phone className="h-[18px] w-[18px]" />} title={t('phoneReq')} description={t('phoneReq_d')} checked={c.phoneRequired} onChange={(v) => patch({ phoneRequired: v })} />
          </Block>

          <Block title={t('fields')} hint={t('fields_h')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-muted ring-1 ring-inset ring-line/80">
                  <ShieldCheck className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink">{t('company')}</div>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">{t('company_d')}</p>
                </div>
              </div>
              <Segmented
                label={t('company')}
                className="w-full sm:w-auto"
                value={c.companyField}
                onChange={(v) => patch({ companyField: v })}
                options={[
                  { id: 'required', label: t('f_required') },
                  { id: 'optional', label: t('f_optional') },
                  { id: 'hidden', label: t('f_hidden') },
                ]}
              />
            </div>
          </Block>

          <Block title={t('marketing')}>
            <ToggleRow icon={<Megaphone className="h-[18px] w-[18px]" />} title={t('optIn')} description={t('optIn_d')} checked={c.marketingOptIn} onChange={(v) => patch({ marketingOptIn: v })} />
            <Note icon={Languages} className="mt-5">
              {t('langNote')}
            </Note>
          </Block>
        </div>
        <div className="min-[1360px]:sticky min-[1360px]:top-20 min-[1360px]:self-start">
          <CheckoutPreview c={c} />
        </div>
      </div>
    </Panel>
  );
}
