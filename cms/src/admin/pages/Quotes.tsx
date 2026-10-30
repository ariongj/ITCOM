import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowUpRight, FileText, Info, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { PageHeader, SearchInput, Table, Td, Th, Tr } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { matches, useNow } from '@/admin/components/crm/shared';
import { cx } from '@/admin/components/contacts/i18n';
import { AssigneeLabel, FilterSelect, QuoteStatusLabel, useNoPermText } from '@/admin/components/contacts/atoms';
import { QuoteEditor } from '@/admin/components/contacts/QuoteEditor';
import { daysLeft, quoteOwners, quoteState, quoteTotals, type QuoteState } from '@/admin/components/contacts/model';
import { defineDict, useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useSettings } from '@/store/hooks';
import { date, money, moneyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';

const T = defineDict({
  me: {
    desc: 'Ponude laboratorije Optical Lab za druge optike — sočiva po receptu, sa rokom važenja, uslovima i verzijama.',
    note: 'B2B ponuda je lični predlog cene za jednu optiku-partnera (slanje, prihvatanje i pretvaranje u narudžbu su posebne radnje). Promotivne kampanje koje se prikazuju na početnoj stranici vode se u modulu',
    promoLink: 'Rast → Ponude',
    newQuote: 'Nova ponuda',
    tab_all: 'Sve',
    searchPh: 'Pretraži po broju, firmi ili kontaktu…',
    owner: 'Odgovorni',
    everyone: 'Svi',
    col_quote: 'Ponuda',
    col_customer: 'Klijent',
    col_value: 'Vrijednost',
    col_valid: 'Važi do',
    col_status: 'Status',
    col_owner: 'Odgovorni',
    col_created: 'Kreirano',
    lines_one: '{n} stavka',
    lines_many: '{n} stavki',
    left: 'još {n} d.',
    today: 'ističe danas',
    k_open: 'Čeka odgovor',
    k_openSub: '{n} poslatih ponuda',
    k_won: 'Prihvaćeno',
    k_wonSub: '{n} ponuda prihvaćeno ili u narudžbi',
    k_rate: 'Stopa prihvatanja',
    k_rateSub: 'od ponuda sa odgovorom',
    emptyTitle: 'Nema ponuda za ove filtere',
    emptyText: 'Promijenite karticu ili pretragu.',
    noneTitle: 'Još nema B2B ponuda',
    noneText: 'Kreirajte ponudu iz upita ili od nule — stavke iz kataloga ili slobodne stavke.',
    count: '{n} ponuda',
  },
  sq: {
    desc: 'Ofertat e Optical Lab për optikat e tjera — lente me recetë, me afat vlefshmërie, kushte dhe versione.',
    note: 'Oferta B2B është propozim çmimi për një optikë partnere (dërgimi, pranimi dhe konvertimi në porosi janë veprime të veçanta). Fushatat promocionale që shfaqen në homepage menaxhohen te',
    promoLink: 'Rritja → Ofertat',
    newQuote: 'Ofertë e re',
    tab_all: 'Të gjitha',
    searchPh: 'Kërko sipas numrit, kompanisë ose kontaktit…',
    owner: 'Përgjegjësi',
    everyone: 'Të gjithë',
    col_quote: 'Oferta',
    col_customer: 'Klienti',
    col_value: 'Vlera',
    col_valid: 'E vlefshme deri',
    col_status: 'Statusi',
    col_owner: 'Përgjegjësi',
    col_created: 'Krijuar',
    lines_one: '{n} linjë',
    lines_many: '{n} linja',
    left: 'edhe {n} ditë',
    today: 'skadon sot',
    k_open: 'Në pritje të përgjigjes',
    k_openSub: '{n} oferta të dërguara',
    k_won: 'Pranuar',
    k_wonSub: '{n} oferta të pranuara ose në porosi',
    k_rate: 'Shkalla e pranimit',
    k_rateSub: 'nga ofertat me përgjigje',
    emptyTitle: 'Asnjë ofertë për këta filtra',
    emptyText: 'Ndryshoni skedën ose kërkimin.',
    noneTitle: 'Ende nuk ka oferta B2B',
    noneText: 'Krijoni një ofertë nga një kërkesë ose nga e para — linja nga katalogu ose linja të lira.',
    count: '{n} oferta',
  },
  en: {
    desc: 'Optical Lab quotes for other opticians — prescription lenses with validity, terms and versions.',
    note: 'A B2B quote is a personal price proposal for one partner optician (sending, acceptance and conversion to an order are separate actions). Promotional campaigns shown on the homepage live in',
    promoLink: 'Growth → Offers',
    newQuote: 'New quote',
    tab_all: 'All',
    searchPh: 'Search by number, company or contact…',
    owner: 'Owner',
    everyone: 'Everyone',
    col_quote: 'Quote',
    col_customer: 'Customer',
    col_value: 'Value',
    col_valid: 'Valid until',
    col_status: 'Status',
    col_owner: 'Owner',
    col_created: 'Created',
    lines_one: '{n} line',
    lines_many: '{n} lines',
    left: '{n} d left',
    today: 'expires today',
    k_open: 'Awaiting reply',
    k_openSub: '{n} quotes sent',
    k_won: 'Accepted',
    k_wonSub: '{n} quotes accepted or ordered',
    k_rate: 'Acceptance rate',
    k_rateSub: 'of quotes with a reply',
    emptyTitle: 'No quotes match these filters',
    emptyText: 'Change the tab or the search.',
    noneTitle: 'No B2B quotes yet',
    noneText: 'Create a quote from a request or from scratch — catalogue lines or custom lines.',
    count: '{n} quotes',
  },
});

type Tab = 'all' | Exclude<QuoteState, 'expired'>;
const TABS: Tab[] = ['all', 'draft', 'sent', 'accepted', 'declined', 'converted'];

export default function Quotes() {
  const [params] = useSearchParams();
  const id = params.get('id');
  if (id) return <QuoteEditor key={id} id={id} inquiryId={params.get('inquiry')} />;
  return <QuoteList />;
}

function QuoteList() {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const noPerm = useNoPermText();
  const now = useNow();
  const settings = useSettings();
  const quotes = useDb((s) => s.quotes);
  const staff = useDb((s) => s.staff);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('all');
  const owners = useMemo(() => quoteOwners(staff), [staff]);

  const rows = useMemo(
    () =>
      [...quotes]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((x) => ({ x, state: quoteState(x, now), total: quoteTotals(x.lines, settings.vatRate).total, owner: staff.find((m) => m.id === x.owner) })),
    [quotes, now, settings.vatRate, staff],
  );
  const base = useMemo(() => rows.filter((r) => (owner === 'all' || r.x.owner === owner) && matches(q, [r.x.number, r.x.customer.company, r.x.customer.name, r.x.customer.email, r.x.customer.phone, ...r.x.lines.map((l) => l.title)])), [rows, owner, q]);
  const count = (tb: Tab) => (tb === 'all' ? base.length : tb === 'sent' ? base.filter((r) => r.state === 'sent' || r.state === 'expired').length : base.filter((r) => r.state === tb).length);
  const list = tab === 'all' ? base : tab === 'sent' ? base.filter((r) => r.state === 'sent' || r.state === 'expired') : base.filter((r) => r.state === tab);

  const kpi = useMemo(() => {
    const open = rows.filter((r) => r.state === 'sent' || r.state === 'expired');
    const won = rows.filter((r) => r.state === 'accepted' || r.state === 'converted');
    const lost = rows.filter((r) => r.state === 'declined');
    const decided = won.length + lost.length;
    return {
      openValue: open.reduce((s, r) => s + r.total, 0),
      open: open.length,
      wonValue: won.reduce((s, r) => s + r.total, 0),
      won: won.length,
      rate: decided ? Math.round((won.length / decided) * 100) : null,
    };
  }, [rows]);

  const canCreate = can('quotes', 'edit');

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_contacts'), to: '/admin/kontakti' }, ta('nav_quotes')]}
        title={ta('nav_quotes')}
        description={t('desc')}
        actions={
          <span title={canCreate ? undefined : noPerm}>
            <Button variant="primary" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!canCreate} onClick={() => navigate('/admin/kontakti/ponude?id=new')}>
              {t('newQuote')}
            </Button>
          </span>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3 lg:gap-3">
        <Kpi label={t('k_open')} value={moneyCompact(kpi.openValue, lang)} sub={t('k_openSub', { n: kpi.open })} />
        <Kpi label={t('k_won')} value={moneyCompact(kpi.wonValue, lang)} sub={t('k_wonSub', { n: kpi.won })} />
        <Kpi label={t('k_rate')} value={kpi.rate == null ? '—' : `${kpi.rate}%`} sub={t('k_rateSub')} className="max-lg:col-span-2" />
      </div>

      <section className="overflow-hidden rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 sm:px-4" role="tablist">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-3 text-[13.5px] font-semibold transition-colors', tab === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
            >
              {id === 'all' ? t('tab_all') : tx(`q_${id as Exclude<Tab, 'all'>}`)}
              <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', tab === id ? 'bg-ink text-white' : 'bg-ink/[0.06] text-ink-soft')}>{count(id)}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2 border-b border-line/70 p-3 sm:flex sm:items-center sm:p-4">
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="sm:flex-1 [&_input]:h-9" />
          <FilterSelect label={t('owner')} value={owner} onChange={(e) => setOwner(e.target.value)} active={owner !== 'all'}>
            <option value="all">{t('everyone')}</option>
            {owners.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FilterSelect>
        </div>

        {quotes.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t('noneTitle')} text={t('noneText')} />
        ) : list.length === 0 ? (
          <EmptyState icon={<FileText className="h-6 w-6" />} title={t('emptyTitle')} text={t('emptyText')} />
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t('col_quote')}</Th>
                  <Th>{t('col_customer')}</Th>
                  <Th className="text-right">{t('col_value')}</Th>
                  <Th>{t('col_valid')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th className="max-xl:hidden">{t('col_owner')}</Th>
                  <Th className="max-lg:hidden">{t('col_created')}</Th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ x, state, total, owner: o }) => {
                  const left = daysLeft(x.validUntil, now);
                  const live = state === 'sent' || state === 'draft';
                  return (
                    <Tr key={x.id} onClick={() => navigate(`/admin/kontakti/ponude?id=${x.id}`)}>
                      <Td className="whitespace-nowrap">
                        <Link to={`/admin/kontakti/ponude?id=${x.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-ink hover:underline">
                          {x.number}
                        </Link>
                        <div className="text-[12px] text-muted">
                          v{x.version} · {t(x.lines.length === 1 ? 'lines_one' : 'lines_many', { n: x.lines.length })}
                        </div>
                      </Td>
                      <Td className="max-w-[260px]">
                        <div className="truncate font-medium text-ink">{x.customer.company || x.customer.name}</div>
                        {x.customer.company && <div className="truncate text-[12px] text-muted">{x.customer.name}</div>}
                      </Td>
                      <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(total, lang)}</Td>
                      <Td className="whitespace-nowrap">
                        <div className={cn('text-[13px]', state === 'expired' ? 'font-semibold text-amber-800' : 'text-ink')}>{date(x.validUntil, lang)}</div>
                        {live && left >= 0 && <div className="text-[12px] text-muted">{left === 0 ? t('today') : t('left', { n: left })}</div>}
                      </Td>
                      <Td>
                        <QuoteStatusLabel state={state} />
                      </Td>
                      <Td className="max-xl:hidden">
                        <AssigneeLabel staff={o} />
                      </Td>
                      <Td className="whitespace-nowrap text-[13px] text-ink-soft max-lg:hidden">{date(x.createdAt, lang)}</Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            <ul className="divide-y divide-line/70 md:hidden">
              {list.map(({ x, state, total }) => (
                <li key={x.id}>
                  <Link to={`/admin/kontakti/ponude?id=${x.id}`} className="block px-4 py-3.5 active:bg-canvas">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-ink">{x.customer.company || x.customer.name}</div>
                        <div className="truncate text-[12px] text-muted">
                          {x.number} · v{x.version}
                          {x.customer.company && ` · ${x.customer.name}`}
                        </div>
                      </div>
                      <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink">{money(total, lang)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <QuoteStatusLabel state={state} className="text-[12.5px]" />
                      <span className="text-[12px] text-muted">
                        {t('col_valid')}: {date(x.validUntil, lang, { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-line/70 bg-canvas/40 px-4 py-3 text-[12.5px] text-muted sm:px-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <span className="shrink-0 font-semibold text-ink-soft">{t('count', { n: list.length })}</span>
          <p className="flex max-w-3xl gap-2 leading-relaxed">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {t('note')}{' '}
              {can('offers', 'view') ? (
                <Link to="/admin/ponude" className="inline-flex items-center gap-0.5 font-semibold text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink">
                  {t('promoLink')}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="font-semibold text-ink-soft">{t('promoLink')}</span>
              )}
              .
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, sub, className }: { label: string; value: string; sub: string; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-line/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]', className)}>
      <div className="truncate text-[12.5px] font-medium text-muted">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold leading-tight tracking-tight tabular-nums text-ink">{value}</div>
      <div className="mt-0.5 truncate text-[12px] text-muted">{sub}</div>
    </div>
  );
}
