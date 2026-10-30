import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Trash2 } from 'lucide-react';
import { Drawer } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { L10nInput } from '@/admin/components/L10nInput';
import { confirmDialog } from '@/admin/components/kit';
import { defineDict, useDict, useL } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { Service } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { ap } from './i18n';
import { CHEVRON, StaffAvatar, isLive } from './shared';

const T = defineDict({
  me: {
    newTitle: 'Nova usluga',
    editTitle: 'Uredi uslugu',
    name: 'Naziv usluge',
    description: 'Kratak opis',
    durationHint: 'Koliko traje jedan termin',
    capacityHint: 'Paralelnih termina u istom periodu',
    pricing: 'Cijena',
    noPrice: 'Bez cijene',
    freeOpt: 'Besplatno',
    paid: 'Naplaćuje se',
    priceLabel: 'Cijena sa PDV-om',
    color: 'Boja u kalendaru',
    team: 'Ko radi ovu uslugu',
    teamHint: 'Samo izabrane osobe mogu dobiti termin za ovu uslugu.',
    where: 'Gdje se odvija',
    save: 'Sačuvaj uslugu',
    saved: 'Usluga je sačuvana',
    nameRequired: 'Unesite naziv',
    staffRequired: 'Izaberite bar jednu osobu',
    deleteTitle: 'Obrisati uslugu?',
    deleteText: 'Usluga „{name}“ biće uklonjena iz kalendara i forme za termine.',
    deleteBlocked: 'Usluga ima {n} predstojećih termina — prvo ih pomjerite ili otkažite.',
    deleted: 'Usluga je obrisana',
    delete: 'Obriši',
    cancel: 'Odustani',
  },
  sq: {
    newTitle: 'Shërbim i ri',
    editTitle: 'Ndrysho shërbimin',
    name: 'Emri i shërbimit',
    description: 'Përshkrim i shkurtër',
    durationHint: 'Sa zgjat një termin',
    capacityHint: 'Rezervime paralele në të njëjtin interval',
    pricing: 'Çmimi',
    noPrice: 'Pa çmim',
    freeOpt: 'Falas',
    paid: 'Me pagesë',
    priceLabel: 'Çmimi me TVSH',
    color: 'Ngjyra në kalendar',
    team: 'Kush e ofron këtë shërbim',
    teamHint: 'Vetëm personat e zgjedhur mund të marrin termine për këtë shërbim.',
    where: 'Ku zhvillohet',
    save: 'Ruaj shërbimin',
    saved: 'Shërbimi u ruajt',
    nameRequired: 'Shkruani emrin',
    staffRequired: 'Zgjidhni të paktën një person',
    deleteTitle: 'Ta fshij shërbimin?',
    deleteText: 'Shërbimi „{name}“ do të hiqet nga kalendari dhe formulari i termineve.',
    deleteBlocked: 'Shërbimi ka {n} termine të ardhshme — ricaktojini ose anulojini fillimisht.',
    deleted: 'Shërbimi u fshi',
    delete: 'Fshi',
    cancel: 'Hiq dorë',
  },
  en: {
    newTitle: 'New service',
    editTitle: 'Edit service',
    name: 'Service name',
    description: 'Short description',
    durationHint: 'Length of one appointment',
    capacityHint: 'Parallel bookings in the same slot',
    pricing: 'Price',
    noPrice: 'No price',
    freeOpt: 'Free',
    paid: 'Paid',
    priceLabel: 'Price incl. VAT',
    color: 'Calendar colour',
    team: 'Who offers this service',
    teamHint: 'Only the selected people can be booked for this service.',
    where: 'Where it takes place',
    save: 'Save service',
    saved: 'Service saved',
    nameRequired: 'Enter a name',
    staffRequired: 'Pick at least one person',
    deleteTitle: 'Delete this service?',
    deleteText: '“{name}” will be removed from the calendar and the booking form.',
    deleteBlocked: 'The service has {n} upcoming bookings — reschedule or cancel them first.',
    deleted: 'Service deleted',
    delete: 'Delete',
    cancel: 'Cancel',
  },
});

/** Muted calendar colours — readable as a 13 % tint behind dark text. */
export const SERVICE_COLORS = ['#3d5a80', '#2f7d6d', '#b5651d', '#6b5b95', '#9c6644', '#4a7c59', '#8a5a83', '#5c6b73'];

export function newService(): Service {
  return { id: uid('sv'), name: { me: '', sq: '', en: '' }, description: { me: '', sq: '', en: '' }, durationMin: 30, capacity: 1, color: SERVICE_COLORS[1], staffIds: [], location: 'loc-mitrovice' };
}

const labelCls = 'mb-1.5 block text-[13px] font-semibold text-ink-soft';
const selectCls = 'h-10 w-full cursor-pointer appearance-none rounded-lg border border-line bg-white bg-[length:14px] bg-[right_12px_center] bg-no-repeat pl-3 pr-9 text-[13.5px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5';

export function ServiceEditor({ service, open, onClose }: { service: Service | null; open: boolean; onClose: () => void }) {
  const t = useDict(T, 'admin');
  const exists = useDb((s) => (service ? s.services.some((x) => x.id === service.id) : false));
  return (
    <Drawer open={open && !!service} onClose={onClose} width="max-w-[520px]" title={<span className="text-[15px] font-bold">{exists ? t('editTitle') : t('newTitle')}</span>}>
      {service && <Form key={service.id} initial={service} exists={exists} onClose={onClose} />}
    </Drawer>
  );
}

function Form({ initial, exists, onClose }: { initial: Service; exists: boolean; onClose: () => void }) {
  const t = useDict(T, 'admin');
  const ta = useDict(ap, 'admin');
  const l = useL('admin');
  const can = useCan();
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);
  const locations = useDb((s) => s.settings.locations);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);
  const [d, setD] = useState<Service>(() => structuredClone(initial));
  const [pricing, setPricing] = useState<'none' | 'free' | 'paid'>(initial.price == null ? 'none' : initial.price === 0 ? 'free' : 'paid');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canEdit = can('appointments', 'edit');
  const canDelete = can('appointments', 'delete');
  const set = <K extends keyof Service>(k: K, v: Service[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = () => {
    const err: Record<string, string> = {};
    if (!d.name.me.trim() && !d.name.sq.trim()) err.name = t('nameRequired');
    if (!d.staffIds.length) err.staff = t('staffRequired');
    setErrors(err);
    if (Object.keys(err).length) return;
    const name = { me: d.name.me.trim() || d.name.sq.trim(), sq: d.name.sq.trim() || d.name.me.trim(), en: d.name.en.trim() || d.name.sq.trim() || d.name.me.trim() };
    const next: Service = {
      ...d,
      name,
      durationMin: Math.max(5, Math.round(d.durationMin)),
      capacity: Math.max(1, Math.round(d.capacity)),
      price: pricing === 'none' ? undefined : pricing === 'free' ? 0 : Math.max(0, Number(d.price) || 0),
    };
    if (pricing === 'none') delete next.price;
    upsert('services', next);
    toast.success(t('saved'));
    onClose();
  };

  const del = async () => {
    const upcoming = bookings.filter((b) => b.serviceId === initial.id && isLive(b) && new Date(b.start).getTime() > Date.now()).length;
    if (upcoming) {
      toast.error(t('deleteBlocked', { n: upcoming }));
      return;
    }
    const ok = await confirmDialog({ title: t('deleteTitle'), text: t('deleteText', { name: l(initial.name) }), confirmLabel: t('delete'), danger: true });
    if (!ok) return;
    remove('services', initial.id);
    toast.success(t('deleted'));
    onClose();
  };

  return (
    <div className="flex h-full flex-col">
      <fieldset disabled={!canEdit} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
        <div>
          <L10nInput label={t('name')} value={d.name} onChange={(v) => set('name', v)} required />
          {errors.name && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.name}</p>}
        </div>
        <L10nInput label={t('description')} value={d.description ?? { me: '', sq: '', en: '' }} onChange={(v) => set('description', v)} multiline rows={2} />

        <div className="grid grid-cols-2 gap-3">
          <Input label={ta('duration')} type="number" min={5} step={15} value={d.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))} trailing="min" hint={t('durationHint')} className="h-10! text-[14px]!" />
          <Input label={ta('capacity')} type="number" min={1} max={20} value={d.capacity} onChange={(e) => set('capacity', Number(e.target.value))} hint={t('capacityHint')} className="h-10! text-[14px]!" />
        </div>

        <div>
          <span className={labelCls}>{t('pricing')}</span>
          <div className="grid grid-cols-3 gap-1.5">
            {(['none', 'free', 'paid'] as const).map((p) => (
              <button key={p} type="button" onClick={() => setPricing(p)} aria-pressed={pricing === p} className={cn('h-9 rounded-lg border text-[13px] font-semibold transition-colors', pricing === p ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink/30')}>
                {p === 'none' ? t('noPrice') : p === 'free' ? t('freeOpt') : t('paid')}
              </button>
            ))}
          </div>
          {pricing === 'paid' && <Input label={t('priceLabel')} type="number" min={0} step={5} value={d.price ?? ''} onChange={(e) => set('price', Number(e.target.value))} trailing="€" wrapClassName="mt-3" className="h-10! text-[14px]!" />}
        </div>

        <label className="block">
          <span className={labelCls}>{t('where')}</span>
          <select value={d.location ?? 'onsite'} onChange={(e) => set('location', e.target.value)} className={selectCls} style={{ backgroundImage: CHEVRON }}>
            {locations.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
            <option value="onsite">{ta('onsite')}</option>
          </select>
        </label>

        <div>
          <span className={labelCls}>{t('color')}</span>
          <div className="flex flex-wrap gap-2">
            {SERVICE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => set('color', c)} aria-label={c} aria-pressed={d.color === c} className={cn('grid h-8 w-8 place-items-center rounded-lg ring-offset-2 transition', d.color === c && 'ring-2 ring-ink')} style={{ background: c }}>
                {d.color === c && <Check className="h-4 w-4 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={labelCls}>{t('team')}</span>
          <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line bg-white">
            {staff.filter((m) => m.active).map((m) => {
              const on = d.staffIds.includes(m.id);
              return (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-canvas/60">
                  <input type="checkbox" checked={on} onChange={() => set('staffIds', on ? d.staffIds.filter((x) => x !== m.id) : [...d.staffIds, m.id])} className="h-4 w-4 accent-[#1a1a1a]" />
                  <StaffAvatar staff={m} size="sm" className="ring-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink">{m.name}</span>
                    {m.title && <span className="block truncate text-[12px] text-muted">{l(m.title)}</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.staff ? <p className="mt-1.5 text-xs font-medium text-red-600">{errors.staff}</p> : <p className="mt-1.5 text-xs text-muted">{t('teamHint')}</p>}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-2 border-t border-line bg-white/60 px-5 py-4 sm:px-6">
        {exists ? (
          <span title={canDelete ? undefined : ta('noPerm')}>
            <Button variant="ghost" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled={!canDelete} onClick={del} className="text-red-700 hover:bg-red-50">
              {t('delete')}
            </Button>
          </span>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {t('cancel')}
          </Button>
          <span title={canEdit ? undefined : ta('noPerm')}>
            <Button shape="rounded" size="sm" disabled={!canEdit} onClick={save}>
              {t('save')}
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
}
