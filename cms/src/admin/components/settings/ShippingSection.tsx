import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, BadgePercent, MapPin, Plus, Receipt, Store, Trash2, TriangleAlert, Truck } from 'lucide-react';
import { adm } from '@/admin/i18n';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { defineDict, useDict, useLang } from '@/i18n';
import { money } from '@/lib/format';
import { activeShippingRule } from '@/lib/pricing';
import type { ShippingZone } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { T } from './i18n';
import { S } from './strings';
import { IconBtn, ListField, NumberField, TextField, ToggleRow } from './fields';
import type { SecProps } from './model';
import { Block, Note, Panel, StateText } from './ui';

const D = defineDict({
  me: {
    zonesTitle: 'Zone i cijene dostave',
    free: 'Besplatna dostava',
    free_h: 'Besplatna dostava je sada pravilo popusta — sa rasporedom, segmentima i pravilima kombinovanja.',
    freeOn: 'Aktivno · besplatno iznad {amount}',
    freeOff: 'Nema aktivnog pravila',
    openRule: 'Otvori pravilo',
    pickup: 'Preuzimanje u prodavnici',
    pickup_h: 'Lokacije sa preuzimanjem nude se na checkout-u bez troškova dostave.',
    pickupAddr: 'Adresa za preuzimanje na checkout-u',
    pickupNone: 'Nijedna lokacija nema uključeno preuzimanje.',
    locations: 'Lokacije',
    local: 'Lokalna dostava',
    local_d: 'Našim vozilom po Prištini, u dogovorenom terminu.',
    localFee: 'Cijena',
    localArea: 'Područje (gradovi)',
    free0: 'Besplatno',
    taxNote: 'Cene uključuju PDV (TVSH) {rate}%. Pakovanje, praćenje i otpremnice zavise od kurirskog partnera. CMS ne zamenjuje fiskalizaciju ATK.',
  },
  sq: {
    zonesTitle: 'Zonat dhe tarifat e dërgesës',
    free: 'Dërgesa falas',
    free_h: 'Dërgesa falas tani është rregull zbritjeje — me orar, segmente dhe rregulla kombinimi.',
    freeOn: 'Aktive · falas mbi {amount}',
    freeOff: 'Nuk ka rregull aktiv',
    openRule: 'Hap rregullin',
    pickup: 'Marrje në dyqan',
    pickup_h: 'Lokacionet me marrje ofrohen në checkout pa kosto dërgese.',
    pickupAddr: 'Adresa e marrjes në checkout',
    pickupNone: 'Asnjë lokacion nuk ka marrje të aktivizuar.',
    locations: 'Lokacionet',
    local: 'Dorëzim lokal',
    local_d: 'Me automjetin tonë nëpër Prishtinë, në orarin e dakorduar.',
    localFee: 'Tarifa',
    localArea: 'Zona (qytetet)',
    free0: 'Falas',
    taxNote: 'Çmimet përfshijnë TVSH {rate}%. Paketimi, gjurmimi dhe fletët e paketimit varen nga partneri i dërgesës. CMS-i nuk e zëvendëson fiskalizimin e ATK-së.',
  },
  en: {
    zonesTitle: 'Shipping zones & rates',
    free: 'Free shipping',
    free_h: 'Free shipping is now a discount rule — with scheduling, segments and combination rules.',
    freeOn: 'Active · free over {amount}',
    freeOff: 'No active rule',
    openRule: 'Open rule',
    pickup: 'Pickup in store',
    pickup_h: 'Pickup locations are offered at checkout with no shipping fee.',
    pickupAddr: 'Pickup address at checkout',
    pickupNone: 'No location has pickup enabled.',
    locations: 'Locations',
    local: 'Local delivery',
    local_d: 'With our own car around Prishtina, at an agreed time.',
    localFee: 'Fee',
    localArea: 'Area (cities)',
    free0: 'Free',
    taxNote: 'Prices include {rate}% VAT (TVSH). Packing, tracking and packing slips depend on the carrier partner. The CMS doesn’t replace ATK fiscalisation.',
  },
});

const ico = 'h-4 w-4';

export function ShippingSection({ s, set, setExt, errors }: SecProps) {
  const t = useDict(D, 'admin');
  const tl = useDict(T, 'admin');
  const ts = useDict(S, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const allow = useCan();
  const discounts = useDb((st) => st.discounts);
  const zones = s.shippingZones;
  const [focusId, setFocusId] = useState<string | null>(null);

  const rule = useMemo(() => activeShippingRule(discounts), [discounts]);
  const pickups = s.locations.filter((l) => l.pickup);
  const addr = (l: { address: string; city: string }) => `${l.address}, ${l.city}`;
  const local = s.ext.localDelivery;

  const patchZone = (id: string, patch: Partial<ShippingZone>) => set('shippingZones', zones.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  const addZone = () => {
    const z: ShippingZone = { id: uid('z'), name: '', cities: [], fee: 15, days: '2–3' };
    setFocusId(z.id);
    set('shippingZones', [...zones, z]);
  };

  // A city listed in two zones is ambiguous — the storefront uses the first match.
  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const z of zones)
      for (const c of z.cities) {
        const k = c.toLowerCase();
        if (seen.has(k)) dup.add(c);
        else seen.add(k);
      }
    return [...dup];
  }, [zones]);

  return (
    <div className="space-y-5">
      <Panel
        lead
        title={ts('sec_shipping')}
        description={ts('sec_shipping_d')}
        footnote={
          <>
            <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('taxNote', { rate: s.vatRate })}</span>
          </>
        }
      >
        <Block title={t('zonesTitle')} hint={tl('zones_d')}>
          {zones.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-[13px] text-muted">{tl('noZones')}</div>
          ) : (
            <ol className="space-y-3">
              {zones.map((z, i) => (
                <li key={z.id} className="rounded-lg border border-line p-4">
                  <div className="mb-3.5 flex items-center gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-ink text-[11px] font-bold text-white">{i + 1}</span>
                    <span className={cn('min-w-0 flex-1 truncate text-[14px] font-semibold', z.name.trim() ? 'text-ink' : 'text-muted')}>{z.name.trim() || tl('newZone')}</span>
                    <span className="hidden shrink-0 text-[12.5px] tabular-nums text-muted sm:inline">
                      {money(z.fee, lang)} · {z.days} {tl('days')} · {tl('zoneCitiesCount', { n: z.cities.length })}
                    </span>
                    <IconBtn label={tl('removeZone')} danger onClick={() => set('shippingZones', zones.filter((x) => x.id !== z.id))}>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1fr)_120px_130px]">
                    <TextField className="col-span-2 sm:col-span-1" label={tl('zoneName')} value={z.name} onChange={(v) => patchZone(z.id, { name: v })} placeholder={tl('newZone')} error={errors[`zone_${z.id}`]} autoFocus={focusId === z.id} />
                    <NumberField label={tl('zoneFee')} value={z.fee} onChange={(n) => patchZone(z.id, { fee: n })} trailing="€" />
                    <TextField label={tl('zoneDays')} value={z.days} onChange={(v) => patchZone(z.id, { days: v })} placeholder="1–2" />
                    <ListField className="col-span-2 sm:col-span-3" label={tl('zoneCities')} value={z.cities} onChange={(v) => patchZone(z.id, { cities: v })} rows={2} placeholder="Mitrovicë, Vushtrri, …" />
                  </div>
                </li>
              ))}
            </ol>
          )}
          {duplicates.length > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800 ring-1 ring-inset ring-amber-600/15">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              {duplicates.map((c) => tl('duplicateCity', { city: c })).join(' ')}
            </p>
          )}
          <Button variant="outline" size="sm" shape="rounded" className="mt-3" icon={<Plus className="h-4 w-4" />} onClick={addZone}>
            {tl('addZone')}
          </Button>
        </Block>

        <Block title={t('free')} hint={t('free_h')}>
          <div className="flex flex-col gap-3 rounded-lg border border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f3f3f3] text-ink-soft ring-1 ring-inset ring-black/[0.05]">
                <BadgePercent className="h-[17px] w-[17px]" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-ink">{rule ? rule.title : ta('nav_discounts')}</div>
                {rule && rule.minimum.type === 'amount' ? <StateText tone="ok">{t('freeOn', { amount: money(rule.minimum.value, lang) })}</StateText> : <StateText tone="off">{t('freeOff')}</StateText>}
              </div>
            </div>
            {allow('discounts', 'view') && (
              <Link
                to={rule ? `/admin/popusti/${rule.id}` : '/admin/popusti'}
                className="ml-12 inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-lg border border-ink/15 bg-white px-3 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/35 sm:ml-0 sm:self-center"
              >
                {rule ? t('openRule') : ta('nav_discounts')}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
              </Link>
            )}
          </div>
        </Block>

        <Block
          title={t('pickup')}
          hint={t('pickup_h')}
          aside={
            <Link to="/admin/konfiguracija/lokacionet" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-soft hover:text-ink">
              {t('locations')} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {pickups.length === 0 ? (
            <Note>{t('pickupNone')}</Note>
          ) : (
            <>
              <ul className="mb-4 flex flex-wrap gap-2">
                {pickups.map((l) => (
                  <li key={l.id} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px]">
                    <Store className="h-3.5 w-3.5 text-muted" />
                    <span className="font-semibold text-ink">{l.name}</span>
                    <span className="text-muted">{l.city}</span>
                  </li>
                ))}
              </ul>
              <div className="max-w-lg">
                <div className="mb-2 text-[12.5px] font-medium text-muted">{t('pickupAddr')}</div>
                <Select aria-label={t('pickupAddr')} value={s.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} className="h-10! rounded-lg! text-[14px]!">
                  {!pickups.some((l) => addr(l) === s.pickupAddress) && <option value={s.pickupAddress}>{s.pickupAddress}</option>}
                  {pickups.map((l) => (
                    <option key={l.id} value={addr(l)}>
                      {l.name} — {addr(l)}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}
        </Block>

        <Block title={t('local')}>
          <ToggleRow icon={<Truck className="h-[18px] w-[18px]" />} title={t('local')} description={t('local_d')} checked={local.enabled} onChange={(v) => setExt('localDelivery', { ...local, enabled: v })} />
          {local.enabled && (
            <div className="mt-4 grid gap-x-4 gap-y-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:pl-14">
              <NumberField label={t('localFee')} value={local.fee} onChange={(n) => setExt('localDelivery', { ...local, fee: n })} trailing="€" hint={local.fee === 0 ? t('free0') : undefined} />
              <TextField label={t('localArea')} value={local.area} onChange={(v) => setExt('localDelivery', { ...local, area: v })} leading={<MapPin className={ico} />} />
            </div>
          )}
        </Block>
      </Panel>
    </div>
  );
}
