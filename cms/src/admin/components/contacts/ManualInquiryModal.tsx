import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Phone, Store } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { dateTime } from '@/lib/format';
import { useDb } from '@/store/db';
import { useCurrentStaff, useSettings } from '@/store/hooks';
import { allCities } from '@/lib/pricing';
import type { Inquiry } from '@/lib/types';
import { cx } from './i18n';
import { CInput, CSelect, CTextarea, Chip, Segmented } from './fields';
import { KIND_ICON } from './atoms';
import { KINDS, assignableStaff, findExisting, isoDayFromNow, type ContactKind, type InquiryX } from './model';

const T = defineDict({
  me: {
    title: 'Ručni upit',
    subtitle: 'Upišite upit primljen telefonom ili u prodavnici — dobija isti tok kao upiti sa sajta.',
    kind: 'Vrsta',
    source: 'Izvor',
    src_phone: 'Telefonski poziv',
    src_manual: 'U optici / ručno',
    name: 'Ime i prezime',
    phone: 'Telefon',
    email: 'E-mail',
    city: 'Grad',
    company: 'Firma',
    service: 'Usluga',
    serviceAny: 'Bez usluge',
    preferred: 'Željeni datum',
    message: 'Poruka / opis zahtjeva',
    messagePh: 'Npr. B2B: 20 pari progresivnih sočiva 1.6 za optiku u Prizrenu, isporuka za 7 dana…',
    assignee: 'Odgovorni',
    followUp: 'Rok za praćenje',
    noDue: 'Bez roka',
    today: 'Danas',
    tomorrow: 'Sutra',
    in3: 'Za 3 dana',
    required: 'Obavezno polje',
    badPhone: 'Unesite ispravan broj (najmanje 8 cifara)',
    badEmail: 'E-mail nije ispravan',
    dupTitle: 'Već postoji otvoren upit za ovaj kontakt',
    dupText: '{name} · {when}. Novi upis će biti označen kao mogući duplikat.',
    create: 'Kreiraj upit',
    created: 'Upit je kreiran — {name}',
  },
  sq: {
    title: 'Kërkesë manuale',
    subtitle: 'Regjistroni një kërkesë të marrë me telefon ose në optikë — ndjek të njëjtin proces si kërkesat nga faqja.',
    kind: 'Lloji',
    source: 'Burimi',
    src_phone: 'Telefonatë',
    src_manual: 'Në optikë / manual',
    name: 'Emri dhe mbiemri',
    phone: 'Telefoni',
    email: 'E-mail',
    city: 'Qyteti',
    company: 'Kompania',
    service: 'Shërbimi',
    serviceAny: 'Pa shërbim',
    preferred: 'Data e dëshiruar',
    message: 'Mesazhi / përshkrimi i kërkesës',
    messagePh: 'P.sh. B2B: 20 palë lente progresive 1.6 për një optikë në Prizren, dorëzim brenda 7 ditëve…',
    assignee: 'Përgjegjësi',
    followUp: 'Afati i ndjekjes',
    noDue: 'Pa afat',
    today: 'Sot',
    tomorrow: 'Nesër',
    in3: 'Për 3 ditë',
    required: 'Fushë e detyrueshme',
    badPhone: 'Shkruani një numër të saktë (të paktën 8 shifra)',
    badEmail: 'E-maili nuk është i saktë',
    dupTitle: 'Ekziston tashmë një kërkesë e hapur për këtë kontakt',
    dupText: '{name} · {when}. Regjistrimi i ri do të shënohet si dyfish i mundshëm.',
    create: 'Krijo kërkesën',
    created: 'Kërkesa u krijua — {name}',
  },
  en: {
    title: 'Manual request',
    subtitle: 'Log a request received by phone or in the store — it follows the same flow as website requests.',
    kind: 'Type',
    source: 'Source',
    src_phone: 'Phone call',
    src_manual: 'In store / manual',
    name: 'Full name',
    phone: 'Phone',
    email: 'E-mail',
    city: 'City',
    company: 'Company',
    service: 'Service',
    serviceAny: 'No service',
    preferred: 'Preferred date',
    message: 'Message / request details',
    messagePh: 'E.g. B2B: 20 pairs of 1.6 progressive lenses for an optician in Prizren, delivery within 7 days…',
    assignee: 'Assignee',
    followUp: 'Follow-up due',
    noDue: 'No due date',
    today: 'Today',
    tomorrow: 'Tomorrow',
    in3: 'In 3 days',
    required: 'Required',
    badPhone: 'Enter a valid number (at least 8 digits)',
    badEmail: 'E-mail is not valid',
    dupTitle: 'There is already an open request for this contact',
    dupText: '{name} · {when}. The new entry will be flagged as a possible duplicate.',
    create: 'Create request',
    created: 'Request created — {name}',
  },
});

const TYPE_FOR: Record<ContactKind, Inquiry['type']> = { contact: 'contact', meeting: 'contact', b2b: 'quote', measurement: 'measurement' };
const EMPTY = { name: '', phone: '', email: '', city: '', company: '', service: '', date: '', message: '' };

export function ManualInquiryModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const settings = useSettings();
  const services = useDb((s) => s.services);
  const staff = useDb((s) => s.staff);
  const inquiries = useDb((s) => s.inquiries);
  const me = useCurrentStaff();
  const assignable = useMemo(() => assignableStaff(staff), [staff]);

  const [kind, setKind] = useState<ContactKind>('contact');
  const [source, setSource] = useState<'phone' | 'manual'>('phone');
  const [form, setForm] = useState(EMPTY);
  const [assignee, setAssignee] = useState<string>(() => (me && assignable.some((m) => m.id === me.id) ? me.id : ''));
  const [follow, setFollow] = useState<string>(() => isoDayFromNow(1));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const existing = useMemo(() => (form.phone.replace(/\D/g, '').length >= 6 || form.email.includes('@') ? findExisting(inquiries, form.phone, form.email)[0] : undefined), [inquiries, form.phone, form.email]);
  const cities = useMemo(() => allCities(settings), [settings]);

  const reset = () => {
    setKind('contact');
    setSource('phone');
    setForm(EMPTY);
    setErrors({});
    setFollow(isoDayFromNow(1));
  };
  const close = () => {
    onClose();
    window.setTimeout(reset, 300);
  };

  const submit = () => {
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = t('required');
    if (!form.phone.trim()) err.phone = t('required');
    else if (form.phone.replace(/\D/g, '').length < 8) err.phone = t('badPhone');
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) err.email = t('badEmail');
    if (!form.message.trim()) err.message = t('required');
    if (kind === 'b2b' && !form.company.trim()) err.company = t('required');
    setErrors(err);
    if (Object.keys(err).length) return;

    const db = useDb.getState();
    const q = db.addInquiry({
      type: TYPE_FOR[kind],
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      city: form.city.trim() || undefined,
      service: form.service || undefined,
      message: form.message.trim(),
      preferredDate: (kind === 'meeting' || kind === 'measurement') && form.date ? form.date : undefined,
      source,
      company: kind === 'b2b' ? form.company.trim() : undefined,
    });
    const extra: Partial<InquiryX> = {
      seen: true,
      followUpAt: follow ? new Date(`${follow}T10:00`).toISOString() : undefined,
      tags: [kind === 'b2b' ? 'b2b' : kind === 'meeting' ? 'takim' : kind === 'measurement' ? 'kontroll' : 'kontakt', source === 'phone' ? 'telefon' : 'optike'],
      ...(kind === 'meeting' ? { kind: 'meeting' as const } : {}),
    };
    db.updateInquiry(q.id, extra);
    if (assignee) db.assignInquiry(q.id, assignee);
    db.logAudit({ action: 'create', object: 'inquiry', objectId: q.id, detail: `${q.name} (${tx(`src_${source}`)})` });
    toast.success(t('created', { name: q.name }));
    close();
    onCreated(q.id);
  };

  const withDate = kind === 'meeting' || kind === 'measurement';

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={t('title')}
      description={t('subtitle')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={close}>
            {ta('cancel')}
          </Button>
          <Button variant="primary" shape="rounded" size="sm" onClick={submit}>
            {t('create')}
          </Button>
        </>
      }
    >
      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-[12.5px] font-semibold text-ink-soft">{t('kind')}</span>
            <Segmented<ContactKind>
              value={kind}
              onChange={setKind}
              cols="grid-cols-2 sm:grid-cols-4"
              options={KINDS.map((k) => {
                const I = KIND_ICON[k];
                return { id: k, label: tx(`kind_${k}`), icon: <I className="h-3.5 w-3.5 shrink-0" /> };
              })}
            />
          </div>
          <div>
            <span className="mb-1 block text-[12.5px] font-semibold text-ink-soft">{t('source')}</span>
            <Segmented<'phone' | 'manual'>
              value={source}
              onChange={setSource}
              options={[
                { id: 'phone', label: t('src_phone'), icon: <Phone className="h-3.5 w-3.5 shrink-0" /> },
                { id: 'manual', label: t('src_manual'), icon: <Store className="h-3.5 w-3.5 shrink-0" /> },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <CInput label={t('name')} required value={form.name} onChange={set('name')} error={errors.name} autoComplete="off" autoFocus />
          <CInput label={t('phone')} required type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+383 4_ ___ ___" />
          <CInput label={t('email')} type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <CInput label={t('city')} value={form.city} onChange={set('city')} list="manual-cities" />
          <datalist id="manual-cities">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {kind === 'b2b' && <CInput label={t('company')} required value={form.company} onChange={set('company')} error={errors.company} wrapClassName="sm:col-span-2" placeholder="Optika … SH.P.K." />}
          <CSelect label={t('service')} value={form.service} onChange={set('service')}>
            <option value="">{t('serviceAny')}</option>
            {services.map((s) => (
              <option key={s.id} value={s.name.sq}>
                {l(s.name)}
              </option>
            ))}
            <option value="Optical Lab B2B">Optical Lab B2B</option>
          </CSelect>
          {withDate ? <CInput label={t('preferred')} type="date" min={isoDayFromNow(0)} value={form.date} onChange={set('date')} /> : <div className="max-sm:hidden" />}
          <CTextarea label={t('message')} required rows={3} value={form.message} onChange={set('message')} error={errors.message} placeholder={t('messagePh')} wrapClassName="sm:col-span-2" />
        </div>

        {existing && (
          <div className="flex gap-3 rounded-lg border border-amber-600/25 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">{t('dupTitle')}</div>
              <div className="mt-0.5 text-amber-900/80">{t('dupText', { name: existing.name, when: dateTime(existing.createdAt, lang) })}</div>
            </div>
          </div>
        )}

        <div className="grid gap-x-4 gap-y-3.5 border-t border-line pt-4 sm:grid-cols-2">
          <CSelect label={t('assignee')} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">{tx('unassigned')}</option>
            {assignable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.title ? ` — ${l(m.title)}` : ''}
              </option>
            ))}
          </CSelect>
          <div>
            <CInput label={t('followUp')} type="date" value={follow} onChange={(e) => setFollow(e.target.value)} />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip on={follow === isoDayFromNow(0)} onClick={() => setFollow(isoDayFromNow(0))}>
                {t('today')}
              </Chip>
              <Chip on={follow === isoDayFromNow(1)} onClick={() => setFollow(isoDayFromNow(1))}>
                {t('tomorrow')}
              </Chip>
              <Chip on={follow === isoDayFromNow(3)} onClick={() => setFollow(isoDayFromNow(3))}>
                {t('in3')}
              </Chip>
              <Chip on={!follow} onClick={() => setFollow('')}>
                {t('noDue')}
              </Chip>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
