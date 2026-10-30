import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { ArrowDown, CheckCheck, Copy, Download, Inbox, Plus, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { PageHeader, SearchInput, Table, Td, Th, Tr } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { Agenda, type AgendaFilter } from '@/admin/components/crm/Agenda';
import { InquiryCard } from '@/admin/components/crm/InquiryCard';
import { InquiryDrawer } from '@/admin/components/crm/InquiryDrawer';
import { matches, useNow } from '@/admin/components/crm/shared';
import { cx } from '@/admin/components/contacts/i18n';
import { AssigneeLabel, DueLabel, FilterSelect, KindLabel, StatusLabel, TickBox, useNoPermText } from '@/admin/components/contacts/atoms';
import { ManualInquiryModal } from '@/admin/components/contacts/ManualInquiryModal';
import {
  KINDS, SOURCES, TABS, assignableStaff, customerIndex, dueOf, duplicateIndex, inquiriesCsv, kindOf, sourceKey, sourceOf, tabOf,
  type ContactKind, type ContactTab, type Due, type InquiryX, type SourceId,
} from '@/admin/components/contacts/model';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { date, timeAgo } from '@/lib/format';
import type { Product, Staff } from '@/lib/types';
import { cn, download } from '@/lib/utils';

const T = defineDict({
  me: {
    manual: 'Ručni upit',
    export: 'Izvoz',
    exported: 'Izvezeno {n} upita (CSV)',
    searchPh: 'Pretraži upite…',
    assignee: 'Odgovorni',
    source: 'Izvor',
    kind: 'Vrsta',
    everyone: 'Svi',
    allF: 'Sve',
    col_request: 'Upit',
    col_kind: 'Vrsta',
    col_assignee: 'Odgovorni',
    col_status: 'Status',
    col_due: 'Rok',
    col_date: 'Datum',
    count: '{n} upita',
    showing: 'Prikazano {n} od {total}',
    clear: 'Poništi filtere',
    emptyTitle: 'Nema upita za ove filtere',
    emptyText: 'Promijenite karticu ili filtere, ili obrišite pretragu.',
    noneTitle: 'Još nema upita',
    noneText: 'Formulari sa sajta, ručni upiti i pozivi pojavljuju se ovdje odmah.',
    spam: 'Zaštita od spama: skriveno polje (honeypot) i ograničenje slanja — jedno slanje formulara pravi tačno jedan upit. Upiti sa istim telefonom ili e-mailom u roku od 7 dana označavaju se kao mogući duplikati.',
    selected: '{n} izabrano',
    selectAll: 'Izaberi sve',
    selectRow: 'Izaberi upit',
    bulkAssign: 'Dodijeli…',
    bulkClose: 'Zatvori',
    bulkSeen: 'Označi kao pročitano',
    bulkAssigned: '{n} upita dodijeljeno: {name}',
    bulkClosed: '{n} upita zatvoreno',
    bulkSeenDone: 'Označeno kao pročitano',
    toastNew: 'Novi upit: {name}',
    open: 'Otvori',
    sortDue: 'Sortiraj po roku',
    sortDate: 'Sortiraj po datumu',
  },
  sq: {
    manual: 'Kërkesë manuale',
    export: 'Eksporto',
    exported: 'U eksportuan {n} kërkesa (CSV)',
    searchPh: 'Kërko kërkesa…',
    assignee: 'Përgjegjësi',
    source: 'Burimi',
    kind: 'Lloji',
    everyone: 'Të gjithë',
    allF: 'Të gjitha',
    col_request: 'Kërkesa',
    col_kind: 'Lloji',
    col_assignee: 'Përgjegjësi',
    col_status: 'Statusi',
    col_due: 'Afati',
    col_date: 'Data',
    count: '{n} kërkesa',
    showing: 'Shfaqen {n} nga {total}',
    clear: 'Pastro filtrat',
    emptyTitle: 'Asnjë kërkesë për këta filtra',
    emptyText: 'Ndryshoni skedën ose filtrat, ose pastroni kërkimin.',
    noneTitle: 'Ende nuk ka kërkesa',
    noneText: 'Formularët e faqes, kërkesat manuale dhe telefonatat shfaqen këtu menjëherë.',
    spam: 'Mbrojtje nga spam: fushë e fshehur (honeypot) dhe kufizim dërgimesh — një dërgim i formularit krijon vetëm një kërkesë. Kërkesat me të njëjtin telefon ose e-mail brenda 7 ditëve shënohen si dyfishe të mundshme.',
    selected: '{n} të zgjedhura',
    selectAll: 'Zgjidh të gjitha',
    selectRow: 'Zgjidh kërkesën',
    bulkAssign: 'Cakto…',
    bulkClose: 'Mbyll',
    bulkSeen: 'Shëno si të lexuara',
    bulkAssigned: '{n} kërkesa iu caktuan: {name}',
    bulkClosed: '{n} kërkesa u mbyllën',
    bulkSeenDone: 'U shënuan si të lexuara',
    toastNew: 'Kërkesë e re: {name}',
    open: 'Hap',
    sortDue: 'Rendit sipas afatit',
    sortDate: 'Rendit sipas datës',
  },
  en: {
    manual: 'Manual request',
    export: 'Export',
    exported: 'Exported {n} requests (CSV)',
    searchPh: 'Search requests…',
    assignee: 'Assignee',
    source: 'Source',
    kind: 'Type',
    everyone: 'Everyone',
    allF: 'All',
    col_request: 'Request',
    col_kind: 'Type',
    col_assignee: 'Assignee',
    col_status: 'Status',
    col_due: 'Due',
    col_date: 'Date',
    count: '{n} requests',
    showing: 'Showing {n} of {total}',
    clear: 'Clear filters',
    emptyTitle: 'No requests match these filters',
    emptyText: 'Change the tab or filters, or clear the search.',
    noneTitle: 'No requests yet',
    noneText: 'Website forms, manual requests and phone calls show up here instantly.',
    spam: 'Spam protection: a hidden honeypot field and send throttling — one form submission creates exactly one request. Requests with the same phone or e-mail within 7 days are flagged as possible duplicates.',
    selected: '{n} selected',
    selectAll: 'Select all',
    selectRow: 'Select request',
    bulkAssign: 'Assign…',
    bulkClose: 'Close',
    bulkSeen: 'Mark as read',
    bulkAssigned: '{n} requests assigned to {name}',
    bulkClosed: '{n} requests closed',
    bulkSeenDone: 'Marked as read',
    toastNew: 'New request: {name}',
    open: 'Open',
    sortDue: 'Sort by due date',
    sortDate: 'Sort by date',
  },
});

type AssigneeF = 'all' | 'none' | 'me' | string;
type Row = { q: InquiryX; kind: ContactKind; due: Due | null; dup?: string; staff?: Staff; product?: Product };

export default function Inquiries() {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const noPerm = useNoPermText();
  const me = useCurrentStaff();
  const now = useNow();

  const inquiries = useDb((s) => s.inquiries) as InquiryX[];
  const products = useDb((s) => s.products);
  const staff = useDb((s) => s.staff);
  const bookings = useDb((s) => s.bookings);
  const orders = useDb((s) => s.orders);

  const [params, setParams] = useSearchParams();
  const openId = params.get('id');
  const [tab, setTab] = useState<ContactTab>('all');
  const [q, setQ] = useState('');
  const [who, setWho] = useState<AssigneeF>('all');
  const [source, setSource] = useState<'all' | SourceId>('all');
  const [kind, setKind] = useState<'all' | ContactKind>('all');
  const [agenda, setAgenda] = useState<AgendaFilter | null>(null);
  const [sort, setSort] = useState<'date' | 'due'>('date');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState(false);
  const canEdit = can('contacts', 'edit');

  /* ---------------- derived rows ---------------- */
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const staffById = useMemo(() => new Map(staff.map((m) => [m.id, m])), [staff]);
  const booked = useMemo(() => new Set(bookings.filter((b) => b.inquiryId).map((b) => b.inquiryId!)), [bookings]);
  const dups = useMemo(() => duplicateIndex(inquiries), [inquiries]);
  const index = useMemo(() => customerIndex(orders), [orders]);

  const rows: Row[] = useMemo(
    () =>
      [...inquiries]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((x) => ({
          q: x,
          kind: kindOf(x, booked.has(x.id)),
          due: dueOf(x),
          dup: dups.get(x.id),
          staff: x.assignee ? staffById.get(x.assignee) : undefined,
          product: x.productId ? productById.get(x.productId) : undefined,
        })),
    [inquiries, booked, dups, staffById, productById],
  );

  // everything except the status tab — the tab counts follow the other filters
  const base = useMemo(
    () =>
      rows.filter(({ q: x, kind: k, due, product }) => {
        if (who === 'none' ? !!x.assignee : who === 'me' ? x.assignee !== me?.id : who !== 'all' && x.assignee !== who) return false;
        if (source !== 'all' && sourceOf(x) !== source) return false;
        if (kind !== 'all' && k !== kind) return false;
        if (agenda === 'new' && x.status !== 'new') return false;
        if (agenda === 'unassigned' && (x.status === 'done' || x.assignee)) return false;
        if (agenda === 'overdue' && (!due || new Date(due.at).getTime() >= now)) return false;
        return matches(q, [x.name, x.company, x.phone, x.email, x.city, x.service, x.message, ...(x.tags ?? []), product && l(product.name)]);
      }),
    [rows, who, me?.id, source, kind, agenda, now, q, l],
  );
  const counts = useMemo(() => {
    const c = { all: base.length, new: 0, open: 0, closed: 0 };
    for (const r of base) c[tabOf(r.q.status)]++;
    return c;
  }, [base]);
  const list = useMemo(() => {
    const out = tab === 'all' ? base : base.filter((r) => tabOf(r.q.status) === tab);
    if (sort === 'due') return [...out].sort((a, b) => (a.due ? a.due.at : '9999').localeCompare(b.due ? b.due.at : '9999'));
    return out;
  }, [base, tab, sort]);

  const filtersActive = q.trim() !== '' || who !== 'all' || source !== 'all' || kind !== 'all' || agenda !== null;
  const clearFilters = () => {
    setQ('');
    setWho('all');
    setSource('all');
    setKind('all');
    setAgenda(null);
  };

  /* ---------------- drawer ---------------- */
  const current = openId ? (inquiries.find((x) => x.id === openId) as InquiryX | undefined) : undefined;
  const currentDup = current && dups.get(current.id) ? inquiries.find((x) => x.id === dups.get(current.id)) : undefined;
  const openInquiry = useCallback(
    (id: string) => {
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.set('id', id);
          return n;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const closeInquiry = () =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.delete('id');
        return n;
      },
      { replace: true },
    );
  useEffect(() => {
    if (current && !current.seen) useDb.getState().updateInquiry(current.id, { seen: true });
  }, [current]);

  /* ---------------- live: new website leads pop in ---------------- */
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (known.current === null) {
      known.current = new Set(inquiries.map((x) => x.id));
      return;
    }
    for (const x of inquiries) {
      if (known.current.has(x.id)) continue;
      known.current.add(x.id);
      if (!x.seen) toast(t('toastNew', { name: x.name }), { description: x.message.slice(0, 80), action: { label: t('open'), onClick: () => openInquiry(x.id) } });
    }
  }, [inquiries, t, openInquiry]);

  /* ---------------- selection & bulk ---------------- */
  const visibleIds = list.map((r) => r.q.id);
  const selected = visibleIds.filter((id) => sel.has(id));
  const allOn = visibleIds.length > 0 && selected.length === visibleIds.length;
  const someOn = selected.length > 0 && !allOn;
  const toggle = (id: string, on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(visibleIds));
  const bulkAssign = (id: string) => {
    const m = staffById.get(id);
    if (!m) return;
    for (const x of selected) useDb.getState().assignInquiry(x, id);
    toast.success(t('bulkAssigned', { n: selected.length, name: m.name }));
    setSel(new Set());
  };
  const bulkClose = () => {
    const db = useDb.getState();
    let n = 0;
    for (const id of selected) {
      const x = inquiries.find((y) => y.id === id);
      if (!x || x.status === 'done') continue;
      db.updateInquiry(id, { status: 'done', seen: true });
      db.logAudit({ action: 'status', object: 'inquiry', objectId: id, detail: `${x.status} → done` });
      n++;
    }
    toast.success(t('bulkClosed', { n }));
    setSel(new Set());
  };
  const bulkSeen = () => {
    for (const id of selected) useDb.getState().updateInquiry(id, { seen: true });
    toast.success(t('bulkSeenDone'));
    setSel(new Set());
  };

  const exportCsv = () => {
    const csv = inquiriesCsv(list.map((r) => ({ q: r.q, kind: tx(`kind_${r.kind}`), source: tx(sourceKey(sourceOf(r.q))), status: tx(`st_${r.q.status}`), assignee: r.staff?.name ?? '' })));
    download(`kontaktet-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success(t('exported', { n: list.length }));
  };

  const assignable = useMemo(() => assignableStaff(staff), [staff]);

  return (
    <div className="animate-fade-in pb-24">
      <PageHeader
        breadcrumbs={[ta('nav_contacts'), ta('nav_inbox')]}
        title={ta('nav_contacts')}
        actions={
          <>
            <span title={can('contacts', 'export') ? undefined : noPerm}>
              <Button variant="outline" shape="rounded" size="sm" icon={<Download className="h-4 w-4" />} disabled={!can('contacts', 'export') || list.length === 0} onClick={exportCsv}>
                {t('export')}
              </Button>
            </span>
            <span title={canEdit ? undefined : noPerm}>
              <Button variant="primary" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!canEdit} onClick={() => setManual(true)}>
                {t('manual')}
              </Button>
            </span>
          </>
        }
      />

      <Agenda inquiries={inquiries} bookings={bookings} now={now} active={agenda} onPick={setAgenda} className="mb-4" />

      <section className="overflow-hidden rounded-xl border border-line/80 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        {/* Tabs */}
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 sm:px-4" role="tablist">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-3 text-[13.5px] font-semibold transition-colors', tab === id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink')}
            >
              {tx(`tab_${id}`)}
              <span className={cn('rounded-md px-1.5 text-[11px] tabular-nums', tab === id ? 'bg-ink text-white' : 'bg-ink/[0.06] text-ink-soft')}>{counts[id]}</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="grid gap-2 border-b border-line/70 p-3 sm:grid-cols-3 sm:p-4 xl:flex xl:items-center">
          <SearchInput value={q} onChange={setQ} placeholder={t('searchPh')} className="sm:col-span-3 xl:flex-1 [&_input]:h-9" />
          <FilterSelect label={t('assignee')} value={who} onChange={(e) => setWho(e.target.value)} active={who !== 'all'} className="xl:w-auto">
            <option value="all">{t('everyone')}</option>
            <option value="none">{tx('unassigned')}</option>
            {me && <option value="me">{tx('me')}</option>}
            {assignable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t('source')} value={source} onChange={(e) => setSource(e.target.value as 'all' | SourceId)} active={source !== 'all'}>
            <option value="all">{t('allF')}</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {tx(sourceKey(s))}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t('kind')} value={kind} onChange={(e) => setKind(e.target.value as 'all' | ContactKind)} active={kind !== 'all'}>
            <option value="all">{t('allF')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {tx(`kind_${k}`)}
              </option>
            ))}
          </FilterSelect>
        </div>

        {/* Table / list */}
        {inquiries.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} title={t('noneTitle')} text={t('noneText')} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title={t('emptyTitle')}
            text={t('emptyText')}
            action={
              filtersActive && (
                <Button variant="outline" shape="rounded" size="sm" onClick={clearFilters}>
                  {t('clear')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  {canEdit && (
                    <Th className="w-10 pr-0!">
                      <TickBox checked={allOn} indeterminate={someOn} onChange={toggleAll} label={t('selectAll')} />
                    </Th>
                  )}
                  <Th>{t('col_request')}</Th>
                  <Th className="max-xl:hidden">{t('col_kind')}</Th>
                  <Th>{t('col_assignee')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th>
                    <SortBtn on={sort === 'due'} onClick={() => setSort(sort === 'due' ? 'date' : 'due')} title={t('sortDue')}>
                      {t('col_due')}
                    </SortBtn>
                  </Th>
                  <Th className="max-lg:hidden">
                    <SortBtn on={sort === 'date'} onClick={() => setSort('date')} title={t('sortDate')}>
                      {t('col_date')}
                    </SortBtn>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const x = r.q;
                  const on = sel.has(x.id);
                  const unseen = !x.seen;
                  return (
                    <Tr key={x.id} onClick={() => openInquiry(x.id)} className={cn('group', (on || openId === x.id) && 'bg-canvas/70')}>
                      {canEdit && (
                        <Td className="w-10 pr-0!" onClick={(e) => e.stopPropagation()}>
                          <TickBox checked={on} onChange={(v) => toggle(x.id, v)} label={t('selectRow')} />
                        </Td>
                      )}
                      <Td className="max-w-0 w-[42%]">
                        <div className="flex min-w-0 items-center gap-2">
                          {unseen && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" aria-label={tx('st_new')} />}
                          <span className={cn('truncate text-ink', unseen ? 'font-bold' : 'font-semibold')}>{x.name}</span>
                          {x.company && <span className="hidden truncate text-[12.5px] text-muted lg:inline">· {x.company}</span>}
                          {r.dup && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20" title={tx('duplicate')}>
                              <Copy className="h-3 w-3" />
                              <span className="max-2xl:hidden">{tx('duplicate')}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate text-[12.5px] text-muted">
                          <span className="xl:hidden">{tx(`kind_${r.kind}`)} · </span>
                          {x.message}
                        </div>
                      </Td>
                      <Td className="max-xl:hidden">
                        <KindLabel kind={r.kind} />
                      </Td>
                      <Td className="max-w-[180px]">
                        <AssigneeLabel staff={r.staff} />
                      </Td>
                      <Td>
                        <StatusLabel status={x.status} />
                      </Td>
                      <Td>
                        <DueLabel due={r.due} now={now} />
                      </Td>
                      <Td className="whitespace-nowrap max-lg:hidden">
                        <div className="text-[13px] text-ink">{date(x.createdAt, lang, { day: 'numeric', month: 'short' })}</div>
                        <div className="text-[12px] text-muted">{timeAgo(x.createdAt, lang)}</div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            <ul className="divide-y divide-line/70 md:hidden">
              {list.map((r) => (
                <li key={r.q.id}>
                  <InquiryCard
                    inquiry={r.q}
                    kind={r.kind}
                    assignee={r.staff}
                    due={r.due}
                    now={now}
                    duplicate={!!r.dup}
                    selected={sel.has(r.q.id)}
                    onSelect={canEdit ? (v) => toggle(r.q.id, v) : undefined}
                    selectLabel={t('selectRow')}
                    active={openId === r.q.id}
                    onOpen={() => openInquiry(r.q.id)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-line/70 bg-canvas/40 px-4 py-3 text-[12.5px] text-muted sm:px-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-semibold text-ink-soft">{filtersActive ? t('showing', { n: list.length, total: inquiries.length }) : t('count', { n: list.length })}</span>
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="font-semibold text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink">
                {t('clear')}
              </button>
            )}
          </div>
          <p className="flex max-w-3xl gap-2 leading-relaxed">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('spam')}
          </p>
        </div>
      </section>

      {/* Bulk bar */}
      <AnimatePresence>
        {canEdit && selected.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className="fixed bottom-5 left-1/2 z-50 flex w-[min(640px,calc(100%-2rem))] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-white shadow-2xl lg:left-[calc(50%+120px)]"
          >
            <span className="px-1 text-[13px] font-semibold">{t('selected', { n: selected.length })}</span>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              <label className="relative">
                <select
                  value=""
                  onChange={(e) => e.target.value && bulkAssign(e.target.value)}
                  className="h-8 cursor-pointer appearance-none rounded-lg bg-white/10 pl-3 pr-3 text-[12.5px] font-semibold text-white outline-none hover:bg-white/15 [&>option]:text-ink"
                  aria-label={t('bulkAssign')}
                >
                  <option value="">{t('bulkAssign')}</option>
                  {assignable.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={bulkSeen} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold hover:bg-white/10">
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="max-sm:hidden">{t('bulkSeen')}</span>
              </button>
              <button type="button" onClick={bulkClose} className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[12.5px] font-semibold text-ink hover:bg-white/90">
                {t('bulkClose')}
              </button>
              <button type="button" onClick={() => setSel(new Set())} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10" aria-label={ta('close')}>
                <X className="h-4 w-4" />
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <InquiryDrawer
        inquiry={current}
        product={current?.productId ? productById.get(current.productId) : undefined}
        open={!!current}
        onClose={closeInquiry}
        index={index}
        duplicateOf={currentDup}
        onOpenInquiry={openInquiry}
      />
      <ManualInquiryModal open={manual} onClose={() => setManual(false)} onCreated={openInquiry} />
    </div>
  );
}

function SortBtn({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: string }) {
  return (
    <button type="button" onClick={onClick} title={title} className={cn('-mx-1 inline-flex items-center gap-1 rounded px-1 hover:text-ink', on && 'text-ink')}>
      {children}
      <ArrowDown className={cn('h-3 w-3 transition-opacity', on ? 'opacity-100' : 'opacity-0')} />
    </button>
  );
}
