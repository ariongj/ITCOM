import { useEffect, useMemo, useState } from 'react';
import { AtSign, Clock, ExternalLink, Globe, Hash, Mail, MapPin, Megaphone, MessageCircle, Palette, Phone, Search, TriangleAlert } from 'lucide-react';
import { L10nInput } from '@/admin/components/L10nInput';
import { Select } from '@/components/ui/Field';
import { FacebookIcon } from '@/components/brand/Social';
import { LogoMark } from '@/components/brand/Logo';
import { defineDict, useDict, useLang } from '@/i18n';
import { unitLabel } from '@/lib/format';
import type { Unit } from '@/lib/types';
import { useDb } from '@/store/db';
import { T } from './i18n';
import { S } from './strings';
import { CharCount, ExampleChip, NumberField, TextAreaField, TextField, isExample } from './fields';
import { EXAMPLE_FIELDS, ORDER_PREFIX_RE, TIMEZONES, tzNow, tzOffset, type SecProps } from './model';
import { Block, LinkRow, Note, Panel, Segmented, StateText } from './ui';

const G = defineDict({
  me: {
    store: 'Prodavnica',
    store_h: 'Naziv i opis koje kupci vide na sajtu, u e-mailovima i na fakturama.',
    legal: 'Pravni podaci',
    legal_h: 'Za fakture, ponude i pravne stranice.',
    contact: 'Kontakt',
    contact_h: 'Prikazuje se u podnožju sajta, na stranici Kontakt i u potvrdama.',
    addressGroup: 'Adresa',
    country: 'Država',
    countryName: 'Kosovo',
    defaults: 'Standardi i formati',
    defaults_d: 'Valuta, porez, jedinice mjere i vremenska zona za cijelu prodavnicu.',
    currency: 'Osnovna valuta',
    currencyName: 'EUR — Euro (€)',
    currency_h: 'Cijene na sajtu su u eurima. Valute drugih tržišta podešavaju se u modulu Tržišta.',
    markets: 'Tržišta',
    vat_h: 'Cene uključuju PDV (TVSH). CMS ne zamenjuje fiskalizaciju ATK.',
    units: 'Jedinice mjere',
    weight: 'Težina',
    length: 'Dimenzije',
    saleUnits: 'Prodajne jedinice proizvoda',
    timezone: 'Vremenska zona',
    timezone_h: 'Za rasporede popusta, ponuda i termina · trenutno vrijeme: {time}',
    numbering: 'Numeracija narudžbi',
    numbering_h: 'Prefiks važi samo za nove narudžbe; postojeće zadržavaju svoj broj.',
    prefix: 'Prefiks',
    prefixBad: '1–6 znakova: velika slova, brojevi ili crtica',
    nextOrder: 'Sljedeća narudžba',
    domainSeo: 'Domen i SEO',
    domainSeo_d: 'Primarni domen, preusmjeravanja i osnovni SEO za pretraživače.',
    domain: 'Primarni domen',
    domainOk: 'Povezan · SSL aktivan',
    redirect: 'www.{domain} i stari linkovi preusmjeravaju se na https://{domain} (301).',
    brand: 'Brend i traka',
    brand_d: 'Izgled prodavnice uređuje se u kanalu Online Store.',
    brandColor: 'Boja brenda, logo i tema',
    brandColor_d: 'Premješteno u Online Store › Tema.',
    openTheme: 'Otvori Temu',
    bar: 'Traka sa obavještenjima',
    bar_d: 'Poruke na vrhu sajta uređuju se uz slajdove i banere.',
    openBar: 'Slajdovi i baneri',
  },
  sq: {
    store: 'Dyqani',
    store_h: 'Emri dhe përshkrimi që klientët shohin në faqe, në email dhe në fatura.',
    legal: 'Të dhënat ligjore',
    legal_h: 'Për faturat, ofertat dhe faqet ligjore.',
    contact: 'Kontakti',
    contact_h: 'Shfaqet në fund të faqes, te faqja Kontakt dhe në konfirmime.',
    addressGroup: 'Adresa',
    country: 'Shteti',
    countryName: 'Kosova',
    defaults: 'Standardet dhe formatet',
    defaults_d: 'Valuta, taksa, njësitë matëse dhe zona kohore për të gjithë dyqanin.',
    currency: 'Valuta bazë',
    currencyName: 'EUR — Euro (€)',
    currency_h: 'Çmimet në faqe janë në euro. Valutat e tregjeve të tjera caktohen te moduli Tregjet.',
    markets: 'Tregjet',
    vat_h: 'Çmimet përfshijnë TVSH-në. CMS-i nuk e zëvendëson fiskalizimin e ATK-së.',
    units: 'Njësitë matëse',
    weight: 'Pesha',
    length: 'Përmasat',
    saleUnits: 'Njësitë e shitjes së produkteve',
    timezone: 'Zona kohore',
    timezone_h: 'Për oraret e zbritjeve, ofertave dhe termineve · ora tani: {time}',
    numbering: 'Numërimi i porosive',
    numbering_h: 'Prefiksi vlen vetëm për porositë e reja; ato ekzistuese ruajnë numrin e tyre.',
    prefix: 'Prefiksi',
    prefixBad: '1–6 karaktere: shkronja të mëdha, numra ose vizë',
    nextOrder: 'Porosia e ardhshme',
    domainSeo: 'Domeni dhe SEO',
    domainSeo_d: 'Domeni primar, ridrejtimet dhe SEO bazë për motorët e kërkimit.',
    domain: 'Domeni primar',
    domainOk: 'I lidhur · SSL aktiv',
    redirect: 'www.{domain} dhe linket e vjetra ridrejtohen te https://{domain} (301).',
    brand: 'Marka dhe shiriti',
    brand_d: 'Pamja e dyqanit menaxhohet te kanali Online Store.',
    brandColor: 'Ngjyra e markës, logoja dhe tema',
    brandColor_d: 'U zhvendos te Online Store › Tema.',
    openTheme: 'Hap Temën',
    bar: 'Shiriti i njoftimeve',
    bar_d: 'Mesazhet në krye të faqes menaxhohen bashkë me slideshow dhe bannerët.',
    openBar: 'Slideshow & bannerë',
  },
  en: {
    store: 'Store',
    store_h: 'The name and description customers see on the site, in e-mails and on invoices.',
    legal: 'Legal details',
    legal_h: 'For invoices, quotes and legal pages.',
    contact: 'Contact',
    contact_h: 'Shown in the site footer, on the Contact page and in confirmations.',
    addressGroup: 'Address',
    country: 'Country',
    countryName: 'Kosovo',
    defaults: 'Standards & formats',
    defaults_d: 'Currency, tax, units of measure and time zone for the whole store.',
    currency: 'Base currency',
    currencyName: 'EUR — Euro (€)',
    currency_h: 'Prices on the site are in euros. Other markets’ currencies are set in Markets.',
    markets: 'Markets',
    vat_h: 'Prices include VAT (TVSH). The CMS doesn’t replace ATK fiscalisation.',
    units: 'Units of measure',
    weight: 'Weight',
    length: 'Dimensions',
    saleUnits: 'Product sales units',
    timezone: 'Time zone',
    timezone_h: 'For discount, offer and appointment schedules · time now: {time}',
    numbering: 'Order numbering',
    numbering_h: 'The prefix applies to new orders only; existing orders keep their number.',
    prefix: 'Prefix',
    prefixBad: '1–6 characters: capital letters, digits or a hyphen',
    nextOrder: 'Next order',
    domainSeo: 'Domain & SEO',
    domainSeo_d: 'Primary domain, redirects and basic SEO for search engines.',
    domain: 'Primary domain',
    domainOk: 'Connected · SSL active',
    redirect: 'www.{domain} and old links redirect to https://{domain} (301).',
    brand: 'Brand & bar',
    brand_d: 'The store’s look is managed in the Online Store channel.',
    brandColor: 'Brand colour, logo and theme',
    brandColor_d: 'Moved to Online Store › Theme.',
    openTheme: 'Open Theme',
    bar: 'Announcement bar',
    bar_d: 'Messages at the top of the site are managed with the slideshow and banners.',
    openBar: 'Slideshow & banners',
  },
});

const ico = 'h-4 w-4';
// Optika sells pieces (frames) and pairs (`set` = a pair of lenses); m² / m stay supported in code but are not offered here.
const UNITS: Unit[] = ['kom', 'set'];
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

function useClock(zone: string) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return tzNow(zone, now);
}

export function GeneralSection({ s, set, setExt, errors }: SecProps) {
  const t = useDict(G, 'admin');
  const tl = useDict(T, 'admin');
  const ts = useDict(S, 'admin');
  const lang = useLang('admin');
  const orders = useDb((st) => st.orders);
  const clock = useClock(s.timezone);

  const examples = EXAMPLE_FIELDS.filter((f) => f.section === 'general' && isExample(s[f.key] as string | undefined));
  const nextNumber = useMemo(() => orders.reduce((m, o) => Math.max(m, Number(o.number.replace(/\D/g, '')) || 0), 1000) + 1, [orders]);
  const prefixOk = ORDER_PREFIX_RE.test(s.orderPrefix);
  const mapOk = /^https?:\/\/\S+$/.test(s.mapUrl.trim());
  const seo = s.seo;

  const goFirstExample = () => {
    const el = document.querySelector<HTMLElement>('[data-example="true"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => el.focus({ preventScroll: true }), 450);
  };

  return (
    <div className="space-y-5">
      <Panel lead title={ts('sec_general')} description={ts('sec_general_d')}>
        {examples.length > 0 && (
          <Note tone="amber" icon={TriangleAlert} className="mb-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-semibold text-amber-950">
                  {ts('examplesTitle', { n: examples.length })} <ExampleChip />
                </div>
                <p className="mt-0.5">{ts('examplesText')}</p>
              </div>
              <button type="button" onClick={goFirstExample} className="shrink-0 self-start rounded-md px-2 py-1 text-[12.5px] font-semibold text-amber-900 underline decoration-amber-600/40 underline-offset-2 hover:bg-amber-100/70 sm:self-center">
                {ts('examplesGo')}
              </button>
            </div>
          </Note>
        )}

        <Block title={t('store')} hint={t('store_h')}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <TextField label={tl('companyName')} value={s.companyName} onChange={(v) => set('companyName', v)} error={errors.companyName} />
            <TextField label={tl('legalName')} value={s.legalName} onChange={(v) => set('legalName', v)} />
            <L10nInput className="sm:col-span-2" label={tl('tagline')} value={s.tagline} onChange={(v) => set('tagline', v)} />
            <L10nInput className="sm:col-span-2" label={tl('about')} value={s.about} onChange={(v) => set('about', v)} multiline rows={3} hint={tl('about_h')} />
          </div>
        </Block>

        <Block title={t('legal')} hint={t('legal_h')}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <TextField label={tl('pib')} value={s.pib} onChange={(v) => set('pib', v)} example inputClassName="font-mono text-[13.5px] tracking-wide" />
            <TextField label={tl('pdv')} value={s.pdv} onChange={(v) => set('pdv', v)} example inputClassName="font-mono text-[13.5px] tracking-wide" />
          </div>
        </Block>

        <Block title={t('contact')} hint={t('contact_h')}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <TextField label={tl('email')} type="email" value={s.email} onChange={(v) => set('email', v)} leading={<Mail className={ico} />} error={errors.email} />
            <TextField label={tl('phone')} type="tel" value={s.phone} onChange={(v) => set('phone', v)} leading={<Phone className={ico} />} example />
            <TextField label={tl('phone2')} type="tel" optional value={s.phone2 ?? ''} onChange={(v) => set('phone2', v)} leading={<Phone className={ico} />} example placeholder="+383 …" />
            <TextField label={tl('whatsapp')} type="tel" optional value={s.whatsapp ?? ''} onChange={(v) => set('whatsapp', v)} leading={<MessageCircle className={ico} />} example placeholder="+383 …" />
            <L10nInput className="sm:col-span-2" label={tl('hours')} value={s.hours} onChange={(v) => set('hours', v)} />
            <TextField label={tl('instagram')} hint={tl('instagram_h')} value={s.instagram} onChange={(v) => set('instagram', v.replace(/^@+/, '').trim())} leading={<AtSign className={ico} />} placeholder="optikamiftari" />
            <TextField label={tl('facebook')} optional value={s.facebook ?? ''} onChange={(v) => set('facebook', v)} leading={<FacebookIcon className={ico} />} placeholder="https://facebook.com/…" />
          </div>
        </Block>

        <Block title={t('addressGroup')}>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TextField label={tl('address')} value={s.address} onChange={(v) => set('address', v)} leading={<MapPin className={ico} />} example />
            <TextField label={tl('city')} value={s.city} onChange={(v) => set('city', v)} />
            <TextField label={t('country')} value={t('countryName')} onChange={() => undefined} readOnly className="sm:col-span-1" inputClassName="bg-[#f6f6f6] text-muted" />
            <TextField
              label={tl('mapUrl')}
              value={s.mapUrl}
              onChange={(v) => set('mapUrl', v)}
              placeholder="https://maps.google.com/…"
              inputClassName="pr-20"
              trailing={
                mapOk ? (
                  <a href={s.mapUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-ink-soft hover:bg-canvas hover:text-ink">
                    {tl('openMap')} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null
              }
            />
          </div>
        </Block>
      </Panel>

      <Panel title={t('defaults')} description={t('defaults_d')}>
        <Block>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <div className="mb-2.5 flex min-h-6 items-center text-[13px] font-semibold text-ink-soft">{t('currency')}</div>
              <Select value="EUR" disabled aria-label={t('currency')} className="h-10! rounded-lg! text-[14px]!">
                <option value="EUR">{t('currencyName')}</option>
              </Select>
              <p className="mt-1.5 text-xs text-muted">{t('currency_h')}</p>
            </div>
            <NumberField label={tl('vatRate')} hint={t('vat_h')} value={s.vatRate} onChange={(n) => set('vatRate', n)} trailing="%" error={errors.vatRate} />
          </div>
        </Block>

        <Block title={t('units')}>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
            <div>
              <div className="mb-2 text-[12.5px] font-medium text-muted">{t('weight')}</div>
              <Segmented label={t('weight')} value={s.ext.weightUnit} onChange={(v) => setExt('weightUnit', v)} options={[{ id: 'kg', label: 'kg' }, { id: 'g', label: 'g' }]} />
            </div>
            <div>
              <div className="mb-2 text-[12.5px] font-medium text-muted">{t('length')}</div>
              <Segmented label={t('length')} value={s.ext.lengthUnit} onChange={(v) => setExt('lengthUnit', v)} options={[{ id: 'cm', label: 'cm' }, { id: 'mm', label: 'mm' }, { id: 'm', label: 'm' }]} />
            </div>
            <div>
              <div className="mb-2 text-[12.5px] font-medium text-muted">{t('saleUnits')}</div>
              <div className="flex h-9 items-center gap-1.5">
                {UNITS.map((u) => (
                  <span key={u} className="rounded-md bg-[#f1f1f1] px-2 py-1 text-[12.5px] font-semibold text-ink-soft ring-1 ring-inset ring-black/[0.06]">
                    {unitLabel(u, lang)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Block>

        <Block title={t('timezone')}>
          <div className="max-w-md">
            <Select aria-label={t('timezone')} value={s.timezone} onChange={(e) => set('timezone', e.target.value)} className="h-10! rounded-lg! text-[14px]!">
              {TIMEZONES.map((z) => (
                <option key={z} value={z}>
                  ({tzOffset(z)}) {z.replace('Europe/', '').replace('_', ' ')}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <Clock className="h-3 w-3" /> {t('timezone_h', { time: clock })}
            </p>
          </div>
        </Block>

        <Block title={t('numbering')} hint={t('numbering_h')}>
          <div className="grid items-start gap-x-4 gap-y-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <TextField
              label={t('prefix')}
              value={s.orderPrefix}
              onChange={(v) => set('orderPrefix', v.toUpperCase().replace(/\s+/g, '').slice(0, 6))}
              leading={<Hash className={ico} />}
              inputClassName="font-mono uppercase tracking-wider"
              error={errors.orderPrefix ?? (!prefixOk && s.orderPrefix ? t('prefixBad') : undefined)}
              maxLength={6}
              spellCheck={false}
            />
            <div className="sm:pt-[34px]">
              <div className="flex h-10 items-center gap-3 rounded-lg bg-[#f6f6f6] px-3.5 ring-1 ring-inset ring-black/[0.05]">
                <span className="text-[12.5px] text-muted">{t('nextOrder')}</span>
                <span className="font-mono text-[14px] font-semibold tracking-wide text-ink">
                  {(prefixOk ? s.orderPrefix : 'OM-') + nextNumber}
                </span>
                <span className="hidden font-mono text-[12.5px] text-muted sm:inline">· {(prefixOk ? s.orderPrefix : 'OM-') + (nextNumber + 1)} …</span>
              </div>
            </div>
          </div>
        </Block>
      </Panel>

      <Panel title={t('domainSeo')} description={t('domainSeo_d')}>
        <Block>
          <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <TextField
              label={t('domain')}
              value={s.ext.domain}
              onChange={(v) => setExt('domain', v.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))}
              leading={<Globe className={ico} />}
              spellCheck={false}
            />
            <div className="flex h-10 items-center sm:mt-[34px]">
              <StateText tone="ok">{t('domainOk')}</StateText>
            </div>
          </div>
          <p className="mt-2 text-[12.5px] text-muted">{t('redirect', { domain: s.ext.domain || 'itcom.example' })}</p>
        </Block>

        <Block title="SEO">
          <div className="grid gap-5">
            <TextField label={tl('seoTitle')} value={seo.title} onChange={(v) => set('seo', { ...seo, title: v })} hint={<CharCount n={seo.title.length} max={60} />} />
            <TextAreaField label={tl('seoDesc')} rows={3} value={seo.description} onChange={(v) => set('seo', { ...seo, description: v })} hint={<CharCount n={seo.description.length} max={160} />} />
          </div>
          <div className="mt-5 rounded-lg border border-line bg-[#f7f7f7] p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2 px-1 text-[12px] font-semibold text-muted">
              <Search className="h-3.5 w-3.5" /> {tl('googlePreview')}
            </div>
            <div className="rounded-lg bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] ring-1 ring-black/5 sm:px-5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1f3f4] ring-1 ring-black/5">
                  <LogoMark className="h-3.5!" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[14px] text-[#202124]">{s.companyName || 'ITCOM'}</span>
                  <span className="block truncate text-[12px] text-[#4d5156]">https://{s.ext.domain || 'itcom.example'}</span>
                </span>
              </div>
              <div className="mt-2 text-[19px] leading-[1.3] text-[#1a0dab] sm:text-[20px]">{clip(seo.title || s.companyName, 62)}</div>
              <p className="mt-1 text-[14px] leading-[1.55] text-[#4d5156]">{clip(seo.description, 158) || '—'}</p>
            </div>
          </div>
        </Block>
      </Panel>

      <Panel title={t('brand')} description={t('brand_d')}>
        <div className="divide-y divide-line/70">
          <LinkRow icon={Palette} title={t('brandColor')} text={t('brandColor_d')} to="/admin/prodavnica" cta={t('openTheme')} aside={<span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: s.brandColor }} title={s.brandColor} />} />
          <LinkRow icon={Megaphone} title={t('bar')} text={t('bar_d')} to="/admin/prodavnica/slajdovi" cta={t('openBar')} />
        </div>
      </Panel>
    </div>
  );
}
