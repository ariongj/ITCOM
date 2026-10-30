import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { FilePlus2, FileText, Plus, Trash2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SearchInput, Table, Td, Th, confirmDialog } from '@/admin/components/kit';
import { draftCustomerName, draftTotals } from '@/admin/components/orders/drafts';
import { actorName, pluralKey } from '@/admin/components/orders/helpers';
import { DraftBadge } from '@/admin/components/orders/status';
import { Check, Stat, Tabs, Tip } from '@/admin/components/orders/ui';
import { od } from '@/admin/components/orders/dict';
import { adm } from '@/admin/i18n';
import { defineDict, useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { fold } from '@/lib/search';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DraftOrder } from '@/lib/types';

const T = defineDict({
  me: {
    description: 'Narudžbe koje tim sastavlja za kupce koji zovu telefonom ili dolaze u optiku. Slanje predračuna i konverzija su posebne radnje.',
    create: 'Kreiraj nacrt',
    tab_all: 'Svi',
    tab_open: 'Otvoreni',
    tab_invoice_sent: 'Predračun poslat',
    tab_converted: 'Konvertovani',
    searchPh: 'Pretraži broj, kupca, telefon ili oznaku',
    col_draft: 'Nacrt',
    col_date: 'Kreiran',
    col_customer: 'Kupac',
    col_by: 'Kreirao',
    col_status: 'Status',
    col_total: 'Ukupno',
    col_order: 'Narudžba',
    noCustomer: 'Bez kupca',
    stat_open: 'Otvoreni nacrti',
    stat_openHint: 'čekaju predračun ili potvrdu',
    stat_value: 'Vrijednost otvorenih',
    stat_valueHint: 'sa popustima i dostavom',
    stat_converted: 'Konvertovano',
    stat_convertedHint: 'nacrta je postalo narudžba',
    selectAll: 'Izaberi sve',
    selectRow: 'Izaberi {n}',
    delete: 'Obriši',
    deleteTitle: 'Obrisati {n}?',
    deleteText: 'Nacrti se brišu trajno. Konvertovani nacrti se ne brišu — njihova narudžba ostaje.',
    deleted: 'Obrisano: {n}',
    emptyTitle: 'Još nema nacrta',
    emptyText: 'Kreirajte nacrt kada kupac naruči telefonom: dodajte proizvode, popust i dostavu, pošaljite predračun i konvertujte u narudžbu.',
    emptyFiltered: 'Nema nacrta za ovaj filter',
    drafts_one: '{n} nacrt',
    drafts_few: '{n} nacrta',
    drafts_many: '{n} nacrta',
  },
  sq: {
    description: 'Porosi që ekipi i përgatit për klientë që telefonojnë ose vijnë në optikë. Dërgimi i faturës dhe konvertimi janë veprime të veçanta.',
    create: 'Krijo draft',
    tab_all: 'Të gjitha',
    tab_open: 'Të hapura',
    tab_invoice_sent: 'Fatura e dërguar',
    tab_converted: 'Të konvertuara',
    searchPh: 'Kërko numrin, klientin, telefonin ose etiketën',
    col_draft: 'Drafti',
    col_date: 'Krijuar',
    col_customer: 'Klienti',
    col_by: 'Krijuar nga',
    col_status: 'Statusi',
    col_total: 'Totali',
    col_order: 'Porosia',
    noCustomer: 'Pa klient',
    stat_open: 'Drafte të hapura',
    stat_openHint: 'presin faturën ose konfirmimin',
    stat_value: 'Vlera e të hapurave',
    stat_valueHint: 'me zbritje dhe dërgesë',
    stat_converted: 'Të konvertuara',
    stat_convertedHint: 'drafte u bënë porosi',
    selectAll: 'Zgjidh të gjitha',
    selectRow: 'Zgjidh {n}',
    delete: 'Fshij',
    deleteTitle: 'Të fshihen {n}?',
    deleteText: 'Draftet fshihen përfundimisht. Draftet e konvertuara nuk fshihen — porosia e tyre mbetet.',
    deleted: 'U fshinë: {n}',
    emptyTitle: 'Ende nuk ka drafte',
    emptyText: 'Krijoni një draft kur klienti porosit me telefon: shtoni produktet, zbritjen dhe dërgesën, dërgoni faturën dhe konvertojeni në porosi.',
    emptyFiltered: 'Nuk ka drafte për këtë filtër',
    drafts_one: '{n} draft',
    drafts_few: '{n} drafte',
    drafts_many: '{n} drafte',
  },
  en: {
    description: 'Orders the team builds for customers who call or visit the store. Sending the invoice and converting are separate actions.',
    create: 'Create draft',
    tab_all: 'All',
    tab_open: 'Open',
    tab_invoice_sent: 'Invoice sent',
    tab_converted: 'Converted',
    searchPh: 'Search number, customer, phone or tag',
    col_draft: 'Draft',
    col_date: 'Created',
    col_customer: 'Customer',
    col_by: 'Created by',
    col_status: 'Status',
    col_total: 'Total',
    col_order: 'Order',
    noCustomer: 'No customer',
    stat_open: 'Open drafts',
    stat_openHint: 'awaiting invoice or confirmation',
    stat_value: 'Open draft value',
    stat_valueHint: 'with discounts and delivery',
    stat_converted: 'Converted',
    stat_convertedHint: 'drafts became orders',
    selectAll: 'Select all',
    selectRow: 'Select {n}',
    delete: 'Delete',
    deleteTitle: 'Delete {n}?',
    deleteText: 'Drafts are deleted permanently. Converted drafts are kept — their order stays.',
    deleted: 'Deleted: {n}',
    emptyTitle: 'No drafts yet',
    emptyText: 'Create a draft when a customer orders by phone: add products, discount and delivery, send the invoice and convert it into an order.',
    emptyFiltered: 'No drafts for this filter',
    drafts_one: '{n} draft',
    drafts_few: '{n} drafts',
    drafts_many: '{n} drafts',
  },
});

type Tab = 'all' | DraftOrder['status'];
const TABS: Tab[] = ['all', 'open', 'invoice_sent', 'converted'];

export default function DraftOrders() {
  const t = useDict(T, 'admin');
  const to = useDict(od, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const drafts = useDb((s) => s.drafts);
  const orders = useDb((s) => s.orders);
  const staff = useDb((s) => s.staff);
  const products = useDb((s) => s.products);
  const settings = useDb((s) => s.settings);
  const discounts = useDb((s) => s.discounts);
  const collections = useDb((s) => s.collections);
  const remove = useDb((s) => s.remove);

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totals = useMemo(() => new Map(drafts.map((d) => [d.id, draftTotals(d, { products, settings, discounts, collections })])), [drafts, products, settings, discounts, collections]);

  const searched = useMemo(() => {
    const q = fold(query.trim());
    const list = [...drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!q) return list;
    return list.filter((d) => fold(`${d.number} ${draftCustomerName(d)} ${d.customer.company ?? ''} ${d.customer.email ?? ''} ${d.customer.phone ?? ''} ${d.customer.city ?? ''} ${d.tags.join(' ')}`).includes(q));
  }, [drafts, query]);
  const filtered = tab === 'all' ? searched : searched.filter((d) => d.status === tab);
  const counts = Object.fromEntries(TABS.map((k) => [k, k === 'all' ? searched.length : searched.filter((d) => d.status === k).length])) as Record<Tab, number>;

  const stats = useMemo(() => {
    const open = drafts.filter((d) => d.status !== 'converted');
    return { open: open.length, value: open.reduce((s, d) => s + (totals.get(d.id)?.grandTotal ?? 0), 0), converted: drafts.length - open.length };
  }, [drafts, totals]);

  const deletable = filtered.filter((d) => d.status !== 'converted');
  const chosen = deletable.filter((d) => selected.has(d.id));
  const allOn = deletable.length > 0 && deletable.every((d) => selected.has(d.id));
  const canDelete = can('drafts', 'delete');
  const plural = (n: number) => t(pluralKey('drafts', n, lang), { n });

  const del = async () => {
    const ok = await confirmDialog({ title: t('deleteTitle', { n: plural(chosen.length) }), text: t('deleteText'), confirmLabel: t('delete'), danger: true });
    if (!ok) return;
    chosen.forEach((d) => remove('drafts', d.id));
    setSelected(new Set());
    toast.success(t('deleted', { n: plural(chosen.length) }));
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_orders'), to: '/admin/narudzbe' }, ta('nav_drafts')]}
        title={ta('nav_drafts')}
        description={t('description')}
        actions={
          can('drafts', 'edit') && (
            <ButtonLink to="/admin/nacrti/novi" size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />}>
              {t('create')}
            </ButtonLink>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={t('stat_open')} value={stats.open} hint={t('stat_openHint')} onClick={() => setTab('open')} active={tab === 'open'} />
        <Stat label={t('stat_value')} value={money(stats.value, lang, { decimals: false })} hint={t('stat_valueHint')} />
        <div className="col-span-2 lg:col-span-1">
          <Stat label={t('stat_converted')} value={stats.converted} hint={t('stat_convertedHint')} onClick={() => setTab('converted')} active={tab === 'converted'} />
        </div>
      </div>

      <Card padded={false}>
        <Tabs tabs={TABS.map((k) => ({ id: k, label: t(`tab_${k}`), count: counts[k] }))} value={tab} onChange={(v) => { setTab(v); setSelected(new Set()); }} />
        <div className="flex flex-col gap-2 border-b border-line/70 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <SearchInput value={query} onChange={setQuery} placeholder={t('searchPh')} className="min-w-0 sm:max-w-md sm:flex-1 [&_input]:h-9" />
          {chosen.length > 0 && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-[13px] font-semibold text-ink">{to('selected', { n: chosen.length })}</span>
              <Tip tip={!canDelete && to('noPermission')}>
                <Button variant="outline" size="xs" shape="rounded" icon={<Trash2 className="h-3.5 w-3.5" />} disabled={!canDelete} onClick={del}>
                  {t('delete')}
                </Button>
              </Tip>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={drafts.length ? <FileText className="h-6 w-6" /> : <FilePlus2 className="h-6 w-6" />}
            title={drafts.length ? t('emptyFiltered') : t('emptyTitle')}
            text={drafts.length ? undefined : t('emptyText')}
            action={
              !drafts.length &&
              can('drafts', 'edit') && (
                <ButtonLink to="/admin/nacrti/novi" size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />}>
                  {t('create')}
                </ButtonLink>
              )
            }
          />
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th className="w-10">
                    <Check checked={allOn} indeterminate={!allOn && chosen.length > 0} onChange={(v) => setSelected(v ? new Set(deletable.map((d) => d.id)) : new Set())} label={t('selectAll')} disabled={!deletable.length} />
                  </Th>
                  <Th>{t('col_draft')}</Th>
                  <Th>{t('col_date')}</Th>
                  <Th>{t('col_customer')}</Th>
                  <Th>{t('col_by')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th className="text-right">{t('col_total')}</Th>
                  <Th>{t('col_order')}</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const order = d.convertedOrderId ? orders.find((o) => o.id === d.convertedOrderId) : undefined;
                  const sel = selected.has(d.id);
                  return (
                    <tr key={d.id} onClick={() => navigate(`/admin/nacrti/${d.id}`)} className={cn('cursor-pointer transition-colors', sel ? 'bg-ink/[0.035]' : 'hover:bg-canvas/70')}>
                      <Td className="w-10">
                        <Check
                          checked={sel}
                          disabled={d.status === 'converted'}
                          onChange={(v) =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(d.id);
                              else next.delete(d.id);
                              return next;
                            })
                          }
                          label={t('selectRow', { n: d.number })}
                        />
                      </Td>
                      <Td className="whitespace-nowrap font-semibold tabular-nums">{d.number}</Td>
                      <Td className="whitespace-nowrap">{date(d.createdAt, lang, { day: 'numeric', month: 'short' })}</Td>
                      <Td className="max-w-[240px]">
                        <span className={cn('block truncate', draftCustomerName(d) ? 'font-medium' : 'text-muted')}>{draftCustomerName(d) || t('noCustomer')}</span>
                        <span className="block truncate text-[12px] text-muted">{[d.customer.company, d.customer.city].filter(Boolean).join(' · ')}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-soft">{actorName(d.createdBy, staff, { web: to('by_web'), admin: to('by_admin') }) || '—'}</Td>
                      <Td className="whitespace-nowrap">
                        <DraftBadge status={d.status} />
                      </Td>
                      <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(totals.get(d.id)?.grandTotal ?? 0, lang)}</Td>
                      <Td className="whitespace-nowrap">
                        {order ? (
                          <Link to={`/admin/narudzbe/${order.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink underline-offset-2 hover:underline">
                            #{order.number}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>

            <ul className="divide-y divide-line/70 md:hidden">
              {filtered.map((d) => (
                <li key={d.id}>
                  <Link to={`/admin/nacrti/${d.id}`} className="block px-4 py-3.5 active:bg-canvas">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-[14.5px] font-semibold tabular-nums">{d.number}</span>
                      <span className="text-[14.5px] font-semibold tabular-nums">{money(totals.get(d.id)?.grandTotal ?? 0, lang)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-3 text-[13px]">
                      <span className="truncate">{draftCustomerName(d) || t('noCustomer')}</span>
                      <span className="shrink-0 text-[12px] text-muted">{date(d.createdAt, lang, { day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="mt-2 flex items-center gap-2">
                      <DraftBadge status={d.status} />
                      <span className="truncate text-[12px] text-muted">{actorName(d.createdBy, staff, { web: to('by_web'), admin: to('by_admin') })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
