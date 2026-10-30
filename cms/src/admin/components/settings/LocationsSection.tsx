import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, MapPin, Pencil, Plus, Store, Trash2, Warehouse } from 'lucide-react';
import { adm } from '@/admin/i18n';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Overlay';
import { defineDict, useDict } from '@/i18n';
import type { StoreLocation } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { useDb } from '@/store/db';
import { T } from './i18n';
import { S } from './strings';
import { TextField } from './fields';
import type { SecProps } from './model';
import { Note, Panel, StateText } from './ui';

const L = defineDict({
  me: {
    addLoc: 'Dodaj lokaciju',
    colName: 'Lokacija',
    colPickup: 'Preuzimanje',
    colDefault: 'Podrazumijevana',
    colBookings: 'Predstojeći termini',
    defaultBadge: 'Podrazumijevana',
    makeDefault: 'Postavi kao podrazumijevanu',
    editLoc: 'Izmijeni lokaciju',
    newLoc: 'Nova lokacija',
    name: 'Naziv',
    pickupLabel: 'Preuzimanje u prodavnici',
    pickupHint: 'Kupci mogu ovdje preuzeti narudžbe.',
    defaultLabel: 'Podrazumijevana lokacija',
    defaultHint: 'Koristi se za zalihe, fakture i nove termine.',
    apply: 'Primijeni',
    applyHint: 'Promjene se upisuju dugmetom „Sačuvaj“ na dnu ekrana.',
    removeLoc: 'Ukloni lokaciju',
    cantRemoveDefault: 'Podrazumijevana lokacija se ne može ukloniti',
    inUse: 'Lokacija ima predstojeće termine ({n}) — premjestite ih prije uklanjanja.',
    note: 'Lokacije se koriste za zalihe, preuzimanje u prodavnici i termine — pregled vida u prodavnici, konsultacije u Klinici Miftari (kalendar po osoblju ili lokaciji).',
    pickupOn: 'Da',
    pickupOff: 'Ne',
    count: 'Lokacija: {n}',
    noPickup: 'Nijedna lokacija nema preuzimanje — ta opcija neće biti ponuđena na checkout-u.',
  },
  sq: {
    addLoc: 'Shto lokacion',
    colName: 'Lokacioni',
    colPickup: 'Marrje',
    colDefault: 'Parazgjedhur',
    colBookings: 'Terminet e ardhshme',
    defaultBadge: 'Parazgjedhur',
    makeDefault: 'Bëje parazgjedhur',
    editLoc: 'Ndrysho lokacionin',
    newLoc: 'Lokacion i ri',
    name: 'Emri',
    pickupLabel: 'Marrje në dyqan',
    pickupHint: 'Klientët mund t’i marrin porositë këtu.',
    defaultLabel: 'Lokacioni parazgjedhur',
    defaultHint: 'Përdoret për stokun, faturat dhe terminet e reja.',
    apply: 'Apliko',
    applyHint: 'Ndryshimet regjistrohen me butonin „Ruaj“ në fund të ekranit.',
    removeLoc: 'Hiq lokacionin',
    cantRemoveDefault: 'Lokacioni parazgjedhur nuk mund të hiqet',
    inUse: 'Lokacioni ka termine të ardhshme ({n}) — zhvendosini para heqjes.',
    note: 'Lokacionet përdoren për stokun, marrjen në dyqan dhe terminet — kontrolli i syve në optikë, konsultat në Klinikën Miftari (kalendar sipas stafit ose lokacionit).',
    pickupOn: 'Po',
    pickupOff: 'Jo',
    count: 'Lokacione: {n}',
    noPickup: 'Asnjë lokacion nuk ka marrje në optikë — kjo mundësi nuk do të ofrohet në checkout.',
  },
  en: {
    addLoc: 'Add location',
    colName: 'Location',
    colPickup: 'Pickup',
    colDefault: 'Default',
    colBookings: 'Upcoming appointments',
    defaultBadge: 'Default',
    makeDefault: 'Make default',
    editLoc: 'Edit location',
    newLoc: 'New location',
    name: 'Name',
    pickupLabel: 'Pickup in store',
    pickupHint: 'Customers can pick up orders here.',
    defaultLabel: 'Default location',
    defaultHint: 'Used for stock, invoices and new appointments.',
    apply: 'Apply',
    applyHint: 'Changes are stored with “Save” at the bottom of the screen.',
    removeLoc: 'Remove location',
    cantRemoveDefault: 'The default location can’t be removed',
    inUse: 'This location has upcoming appointments ({n}) — move them before removing it.',
    note: 'Locations are used for stock, pickup and appointments — eye exams in the store, consultations at Klinika Miftari (calendar by staff or location).',
    pickupOn: 'Yes',
    pickupOff: 'No',
    count: 'Locations: {n}',
    noPickup: 'No location offers pickup — the option won’t be offered at checkout.',
  },
});

function LocationModal({ open, loc, onClose, onApply }: { open: boolean; loc: StoreLocation | null; onClose: () => void; onApply: (l: StoreLocation) => void }) {
  const t = useDict(L, 'admin');
  const tl = useDict(T, 'admin');
  const ta = useDict(adm, 'admin');
  const [d, setD] = useState<StoreLocation>(() => loc ?? { id: uid('loc'), name: '', address: '', city: '', pickup: true, isDefault: false });
  const [tried, setTried] = useState(false);
  const err = { name: !d.name.trim() ? tl('required') : undefined, address: !d.address.trim() ? tl('required') : undefined, city: !d.city.trim() ? tl('required') : undefined };
  const apply = () => {
    setTried(true);
    if (err.name || err.address || err.city) return;
    onApply({ ...d, name: d.name.trim(), address: d.address.trim(), city: d.city.trim() });
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={loc ? t('editLoc') : t('newLoc')}
      description={t('applyHint')}
      footer={
        <>
          <Button variant="outline" size="sm" shape="rounded" onClick={onClose}>
            {ta('cancel')}
          </Button>
          <Button size="sm" shape="rounded" onClick={apply}>
            {t('apply')}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 px-6 py-5 sm:grid-cols-2">
        <TextField className="sm:col-span-2" label={t('name')} value={d.name} onChange={(v) => setD({ ...d, name: v })} leading={<Store className="h-4 w-4" />} error={tried ? err.name : undefined} autoFocus placeholder="Salon Bar" />
        <TextField label={tl('address')} value={d.address} onChange={(v) => setD({ ...d, address: v })} leading={<MapPin className="h-4 w-4" />} error={tried ? err.address : undefined} />
        <TextField label={tl('city')} value={d.city} onChange={(v) => setD({ ...d, city: v })} error={tried ? err.city : undefined} />
        <div className="space-y-3 sm:col-span-2">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3">
            <span>
              <span className="block text-[13.5px] font-semibold text-ink">{t('pickupLabel')}</span>
              <span className="block text-[12.5px] text-muted">{t('pickupHint')}</span>
            </span>
            <Switch checked={d.pickup} onChange={(v) => setD({ ...d, pickup: v })} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3">
            <span>
              <span className="block text-[13.5px] font-semibold text-ink">{t('defaultLabel')}</span>
              <span className="block text-[12.5px] text-muted">{t('defaultHint')}</span>
            </span>
            <Switch checked={d.isDefault} disabled={!!loc?.isDefault} onChange={(v) => setD({ ...d, isDefault: v })} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

export function LocationsSection({ s, set, readOnly }: SecProps) {
  const t = useDict(L, 'admin');
  const ts = useDict(S, 'admin');
  const ta = useDict(adm, 'admin');
  const bookings = useDb((st) => st.bookings);
  const locs = s.locations;
  const [editing, setEditing] = useState<{ loc: StoreLocation | null; key: number } | null>(null);
  const [open, setOpen] = useState(false);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const m = new Map<string, number>();
    for (const b of bookings) if (b.status !== 'cancelled' && new Date(b.start).getTime() >= now) m.set(b.location, (m.get(b.location) ?? 0) + 1);
    return m;
  }, [bookings]);

  const write = (next: StoreLocation[]) => set('locations', next);
  const makeDefault = (id: string) => write(locs.map((l) => ({ ...l, isDefault: l.id === id })));
  const apply = (loc: StoreLocation) => {
    const exists = locs.some((l) => l.id === loc.id);
    let next = exists ? locs.map((l) => (l.id === loc.id ? loc : l)) : [...locs, loc];
    if (loc.isDefault) next = next.map((l) => ({ ...l, isDefault: l.id === loc.id }));
    if (!next.some((l) => l.isDefault) && next[0]) next = next.map((l, i) => ({ ...l, isDefault: i === 0 }));
    write(next);
    setOpen(false);
  };
  const removeLoc = (l: StoreLocation) => {
    if (l.isDefault) return toast.error(t('cantRemoveDefault'));
    const n = upcoming.get(l.id) ?? 0;
    if (n > 0) return toast.error(t('inUse', { n }));
    write(locs.filter((x) => x.id !== l.id));
  };
  const openEditor = (loc: StoreLocation | null) => {
    setEditing({ loc, key: Date.now() });
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <Panel
        lead
        flush
        title={ts('sec_locations')}
        description={ts('sec_locations_d')}
        actions={
          <Button size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />} disabled={readOnly} onClick={() => openEditor(null)}>
            {t('addLoc')}
          </Button>
        }
        footnote={
          <>
            <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('note')}</span>
          </>
        }
      >
        <div className="px-5 py-2.5 text-[12.5px] text-muted sm:px-6">{t('count', { n: locs.length })}</div>
        <ul className="divide-y divide-line/60 border-t border-line">
          {locs.map((l) => {
            const n = upcoming.get(l.id) ?? 0;
            return (
              <li key={l.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#fafafa] sm:px-6 md:flex-row md:items-center md:gap-5">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3f3f3] text-ink-soft ring-1 ring-inset ring-black/[0.05]">
                    {l.pickup ? <Store className="h-[17px] w-[17px]" /> : <Warehouse className="h-[17px] w-[17px]" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{l.name}</span>
                      {l.isDefault && <span className="rounded bg-ink px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">{t('defaultBadge')}</span>}
                    </div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {l.address}, {l.city}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pl-12 md:pl-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[12px] text-muted">{t('colPickup')}</span>
                    <Switch size="sm" checked={l.pickup} onChange={(v) => write(locs.map((x) => (x.id === l.id ? { ...x, pickup: v } : x)))} label={<span className="sr-only">{`${t('colPickup')}: ${l.name}`}</span>} />
                  </div>
                  <div className="min-w-[132px] text-[12.5px]">
                    {l.isDefault ? (
                      <StateText tone="ok">{t('defaultBadge')}</StateText>
                    ) : (
                      <button type="button" onClick={() => makeDefault(l.id)} className="font-semibold text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink hover:decoration-ink/60 disabled:no-underline disabled:opacity-50">
                        {t('makeDefault')}
                      </button>
                    )}
                  </div>
                  <div className={cn('flex items-center gap-1.5 text-[12.5px]', n ? 'text-ink-soft' : 'text-muted')} title={t('colBookings')}>
                    <CalendarDays className="h-3.5 w-3.5 text-muted" /> {n}
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button type="button" onClick={() => openEditor(l)} title={ta('edit')} aria-label={`${ta('edit')}: ${l.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-35">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeLoc(l)} disabled={l.isDefault} title={l.isDefault ? t('cantRemoveDefault') : t('removeLoc')} aria-label={`${t('removeLoc')}: ${l.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-muted">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      {locs.filter((l) => l.pickup).length === 0 && <Note tone="amber">{t('noPickup')}</Note>}
      {editing && <LocationModal key={editing.key} open={open} loc={editing.loc} onClose={() => setOpen(false)} onApply={apply} />}
    </div>
  );
}
