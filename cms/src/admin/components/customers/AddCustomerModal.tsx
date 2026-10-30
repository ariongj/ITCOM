import { useId, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Checkbox, Input, Select } from '@/components/ui/Field';
import { defineDict, useDict } from '@/i18n';
import { useDb } from '@/store/db';
import { useCurrentStaff } from '@/store/hooks';
import type { Lang } from '@/lib/types';
import { cx } from './i18n';
import { manualKey, phone8, type CustomerRecord } from './model';
import { useCustomerStore, type Marketing } from './store';

const T = defineDict({
  me: {
    title: 'Novi kupac',
    description: 'Za klijente iz prodavnice ili sa telefona. Web kupci se dodaju automatski uz prvu narudžbu.',
    firstName: 'Ime',
    lastName: 'Prezime',
    email: 'E-mail',
    phone: 'Telefon',
    city: 'Grad',
    address: 'Adresa',
    company: 'Firma (opciono)',
    lang: 'Jezik komunikacije',
    tags: 'Oznake',
    tagsHint: 'Odvojite zarezom, npr. arhitekta, novogradnja',
    consentTitle: 'Marketing saglasnost',
    consentEmail: 'Pristaje na e-mail marketing',
    consentSms: 'Pristaje na SMS poruke',
    consentHint: 'Označite samo uz izričitu saglasnost kupca.',
    errName: 'Unesite ime',
    errContact: 'Unesite e-mail ili telefon',
    errEmail: 'Neispravan e-mail',
    errExists: 'Već postoji kupac sa ovim kontaktom: {name}',
    cancel: 'Otkaži',
    save: 'Dodaj kupca',
    added: 'Kupac je dodat',
  },
  sq: {
    title: 'Klient i ri',
    description: 'Për klientë nga dyqani ose telefoni. Klientët online shtohen automatikisht me porosinë e parë.',
    firstName: 'Emri',
    lastName: 'Mbiemri',
    email: 'E-mail',
    phone: 'Telefoni',
    city: 'Qyteti',
    address: 'Adresa',
    company: 'Kompania (opsionale)',
    lang: 'Gjuha e komunikimit',
    tags: 'Etiketat',
    tagsHint: 'Ndajini me presje, p.sh. arhitekta, novogradnja',
    consentTitle: 'Pëlqimi për marketing',
    consentEmail: 'Pranon marketing me e-mail',
    consentSms: 'Pranon mesazhe SMS',
    consentHint: 'Shënojeni vetëm me pëlqimin e qartë të klientit.',
    errName: 'Shkruani emrin',
    errContact: 'Shkruani e-mailin ose telefonin',
    errEmail: 'E-mail i pavlefshëm',
    errExists: 'Ekziston tashmë një klient me këtë kontakt: {name}',
    cancel: 'Anulo',
    save: 'Shto klientin',
    added: 'Klienti u shtua',
  },
  en: {
    title: 'New customer',
    description: 'For in-store, phone or eye-exam customers. Web customers are added automatically with their first order.',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'E-mail',
    phone: 'Phone',
    city: 'City',
    address: 'Address',
    company: 'Company (optional)',
    lang: 'Preferred language',
    tags: 'Tags',
    tagsHint: 'Separate with commas, e.g. architect, new-build',
    consentTitle: 'Marketing consent',
    consentEmail: 'Accepts e-mail marketing',
    consentSms: 'Accepts SMS messages',
    consentHint: 'Only tick with the customer’s explicit consent.',
    errName: 'Enter a first name',
    errContact: 'Enter an e-mail or a phone',
    errEmail: 'Invalid e-mail',
    errExists: 'A customer with this contact already exists: {name}',
    cancel: 'Cancel',
    save: 'Add customer',
    added: 'Customer added',
  },
});

const blank = { firstName: '', lastName: '', email: '', phone: '', city: '', address: '', company: '', lang: 'sq' as Lang, tags: '', email_ok: false, sms_ok: false };

export function AddCustomerModal({ open, onClose, customers, cities, onCreated }: { open: boolean; onClose: () => void; customers: CustomerRecord[]; cities: string[]; onCreated: (key: string) => void }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const me = useCurrentStaff();
  const logAudit = useDb((s) => s.logAudit);
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  const listId = useId();
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }));

  const email = f.email.trim().toLowerCase();
  const existing = customers.find((c) => (email && c.emails.includes(email)) || (phone8(f.phone) && c.phones.some((p) => phone8(p) === phone8(f.phone))));
  const errors = {
    firstName: !f.firstName.trim() ? t('errName') : undefined,
    contact: !email && !phone8(f.phone) ? t('errContact') : undefined,
    email: email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? t('errEmail') : undefined,
    exists: existing ? t('errExists', { name: existing.name }) : undefined,
  };
  const ok = !Object.values(errors).some(Boolean);

  const close = () => {
    setF(blank);
    setTried(false);
    onClose();
  };
  const save = () => {
    setTried(true);
    if (!ok) return;
    const now = new Date().toISOString();
    const key = manualKey(email, f.phone, `${f.firstName} ${f.lastName}`);
    const marketing: Partial<Marketing> = {};
    if (f.email_ok) marketing.email = { status: 'subscribed', at: now, source: 'staff', by: me?.id };
    if (f.sms_ok) marketing.sms = { status: 'subscribed', at: now, source: 'staff', by: me?.id };
    useCustomerStore.getState().addCustomers([
      {
        key,
        customer: { key, firstName: f.firstName.trim(), lastName: f.lastName.trim(), email, phone: f.phone.trim(), city: f.city.trim(), address: f.address.trim(), company: f.company.trim() || undefined, lang: f.lang, source: 'manual', createdAt: now },
        tags: f.tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean),
        marketing,
      },
    ]);
    logAudit({ action: 'create', object: 'customer', objectId: key, detail: `${f.firstName} ${f.lastName}`.trim() });
    toast.success(t('added'), { description: `${f.firstName} ${f.lastName}`.trim() });
    close();
    onCreated(key);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="md"
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={close}>
            {t('cancel')}
          </Button>
          <Button shape="rounded" size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={save}>
            {t('save')}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Input label={t('firstName')} required value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={tried ? errors.firstName : undefined} className="h-10! text-[14px]!" />
        <Input label={t('lastName')} value={f.lastName} onChange={(e) => set('lastName', e.target.value)} className="h-10! text-[14px]!" />
        <Input label={t('email')} type="email" value={f.email} onChange={(e) => set('email', e.target.value)} error={tried ? errors.email ?? errors.contact : undefined} className="h-10! text-[14px]!" />
        <Input label={t('phone')} type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+383 4_ ___ ___" error={tried && !errors.email ? errors.contact : undefined} className="h-10! text-[14px]!" />
        <div>
          <Input label={t('city')} value={f.city} list={listId} onChange={(e) => set('city', e.target.value)} className="h-10! text-[14px]!" />
          <datalist id={listId}>
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <Input label={t('address')} value={f.address} onChange={(e) => set('address', e.target.value)} className="h-10! text-[14px]!" />
        <Input label={t('company')} value={f.company} onChange={(e) => set('company', e.target.value)} className="h-10! text-[14px]!" />
        <Select label={t('lang')} value={f.lang} onChange={(e) => set('lang', e.target.value as Lang)} className="h-10! text-[14px]!">
          {(['sq', 'en', 'me'] as Lang[]).map((l) => (
            <option key={l} value={l}>
              {tx(`lang_${l}`)}
            </option>
          ))}
        </Select>
        <Input label={t('tags')} hint={t('tagsHint')} value={f.tags} onChange={(e) => set('tags', e.target.value)} wrapClassName="sm:col-span-2" className="h-10! text-[14px]!" />
        <fieldset className="rounded-xl border border-line px-4 py-3 sm:col-span-2">
          <legend className="px-1 text-[13px] font-semibold text-ink-soft">{t('consentTitle')}</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Checkbox checked={f.email_ok} onChange={(v) => set('email_ok', v)} label={t('consentEmail')} />
            <Checkbox checked={f.sms_ok} onChange={(v) => set('sms_ok', v)} label={t('consentSms')} />
          </div>
          <p className="mt-2 text-[12px] text-muted">{t('consentHint')}</p>
        </fieldset>
        {tried && errors.exists && <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-900 ring-1 ring-inset ring-amber-600/20 sm:col-span-2">{errors.exists}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
