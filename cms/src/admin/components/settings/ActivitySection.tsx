import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Download, Globe, ScrollText } from 'lucide-react';
import { FilterPills, SearchInput } from '@/admin/components/kit';
import { adm } from '@/admin/i18n';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { defineDict, useDict, useLang } from '@/i18n';
import { dateTime, timeAgo } from '@/lib/format';
import type { Module } from '@/lib/permissions';
import type { AuditAction, AuditEntry, AuditObject } from '@/lib/types';
import { cn, download } from '@/lib/utils';
import { fold } from '@/lib/search';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { S } from './strings';
import { Avatar, Gate, Panel } from './ui';

const A = defineDict({
  me: {
    search: 'Pretraži detalje, broj ili naziv…',
    allActors: 'Svi akteri',
    allObjects: 'Svi objekti',
    allActions: 'Sve radnje',
    web: 'Sajt (kupac)',
    system: 'Sistem',
    colTime: 'Vrijeme',
    colActor: 'Akter',
    colAction: 'Radnja',
    colObject: 'Objekat',
    colDetail: 'Promjena',
    more: 'Prikaži još',
    exportCsv: 'Izvezi CSV',
    empty: 'Nema zapisa za izabrane filtere.',
    retention: 'Dnevnik čuva posljednjih 300 zapisa i ne može se mijenjati iz CMS-a.',
    p_all: 'Sve',
    p_today: 'Danas',
    p_7: '7 dana',
    p_30: '30 dana',
    a_create: 'Kreiranje', a_update: 'Izmjena', a_delete: 'Brisanje', a_publish: 'Objava', a_unpublish: 'Povlačenje', a_archive: 'Arhiviranje', a_status: 'Status', a_refund: 'Povrat novca',
    a_fulfil: 'Isporuka', a_receive: 'Prijem', a_adjust: 'Korekcija', a_convert: 'Konverzija', a_assign: 'Dodjela', a_restore: 'Vraćanje', a_login: 'Prijava', a_send: 'Slanje',
    o_product: 'Proizvod', o_order: 'Narudžba', o_discount: 'Popust', o_offer: 'Ponuda', o_placement: 'Slajd / baner', o_collection: 'Kolekcija', o_settings: 'Podešavanja', o_home: 'Početna',
    o_draft: 'Nacrt narudžbe', o_return: 'Povrat', o_purchaseOrder: 'Nabavka', o_inventory: 'Inventar', o_inquiry: 'Upit', o_quote: 'B2B ponuda', o_booking: 'Termin', o_staff: 'Osoblje',
    o_page: 'Stranica', o_post: 'Članak', o_menu: 'Meni', o_segment: 'Segment', o_customer: 'Kupac',
  },
  sq: {
    search: 'Kërko në detaje, numër ose emër…',
    allActors: 'Të gjithë aktorët',
    allObjects: 'Të gjitha objektet',
    allActions: 'Të gjitha veprimet',
    web: 'Faqja (klient)',
    system: 'Sistemi',
    colTime: 'Koha',
    colActor: 'Aktori',
    colAction: 'Veprimi',
    colObject: 'Objekti',
    colDetail: 'Ndryshimi',
    more: 'Shfaq më shumë',
    exportCsv: 'Eksporto CSV',
    empty: 'Nuk ka regjistrime për filtrat e zgjedhur.',
    retention: 'Ditari ruan 300 regjistrimet e fundit dhe nuk mund të ndryshohet nga CMS-i.',
    p_all: 'Të gjitha',
    p_today: 'Sot',
    p_7: '7 ditë',
    p_30: '30 ditë',
    a_create: 'Krijim', a_update: 'Ndryshim', a_delete: 'Fshirje', a_publish: 'Publikim', a_unpublish: 'Çpublikim', a_archive: 'Arkivim', a_status: 'Status', a_refund: 'Rimbursim',
    a_fulfil: 'Përmbushje', a_receive: 'Pranim', a_adjust: 'Rregullim', a_convert: 'Konvertim', a_assign: 'Caktim', a_restore: 'Rikthim', a_login: 'Hyrje', a_send: 'Dërgim',
    o_product: 'Produkt', o_order: 'Porosi', o_discount: 'Zbritje', o_offer: 'Ofertë', o_placement: 'Slide / banner', o_collection: 'Koleksion', o_settings: 'Konfigurime', o_home: 'Faqja kryesore',
    o_draft: 'Draft porosie', o_return: 'Kthim', o_purchaseOrder: 'Furnizim', o_inventory: 'Inventar', o_inquiry: 'Kërkesë', o_quote: 'Ofertë B2B', o_booking: 'Termin', o_staff: 'Staf',
    o_page: 'Faqe', o_post: 'Artikull', o_menu: 'Meny', o_segment: 'Segment', o_customer: 'Klient',
  },
  en: {
    search: 'Search details, number or name…',
    allActors: 'All actors',
    allObjects: 'All objects',
    allActions: 'All actions',
    web: 'Website (customer)',
    system: 'System',
    colTime: 'Time',
    colActor: 'Actor',
    colAction: 'Action',
    colObject: 'Object',
    colDetail: 'Change',
    more: 'Show more',
    exportCsv: 'Export CSV',
    empty: 'No entries for the selected filters.',
    retention: 'The log keeps the latest 300 entries and can’t be edited from the CMS.',
    p_all: 'All',
    p_today: 'Today',
    p_7: '7 days',
    p_30: '30 days',
    a_create: 'Create', a_update: 'Update', a_delete: 'Delete', a_publish: 'Publish', a_unpublish: 'Unpublish', a_archive: 'Archive', a_status: 'Status', a_refund: 'Refund',
    a_fulfil: 'Fulfil', a_receive: 'Receive', a_adjust: 'Adjust', a_convert: 'Convert', a_assign: 'Assign', a_restore: 'Restore', a_login: 'Sign-in', a_send: 'Send',
    o_product: 'Product', o_order: 'Order', o_discount: 'Discount', o_offer: 'Offer', o_placement: 'Slide / banner', o_collection: 'Collection', o_settings: 'Settings', o_home: 'Homepage',
    o_draft: 'Draft order', o_return: 'Return', o_purchaseOrder: 'Purchase order', o_inventory: 'Inventory', o_inquiry: 'Enquiry', o_quote: 'B2B quote', o_booking: 'Appointment', o_staff: 'Staff',
    o_page: 'Page', o_post: 'Post', o_menu: 'Menu', o_segment: 'Segment', o_customer: 'Customer',
  },
});
type AKey = keyof typeof A.me;
type Period = 'all' | 'today' | '7' | '30';

const ACTION_SYMBOL: Partial<Record<AuditAction, string>> = { create: '+', delete: '−', publish: '↑', unpublish: '↓', archive: '▪', refund: '↺', restore: '↺', login: '→', send: '↗', status: '●', fulfil: '✓', receive: '↧' };

/** Where an audited object lives in the CMS (and which module guards it). */
function objectLink(e: AuditEntry): { to: string; module: Module } | null {
  if (e.action === 'delete') return null;
  const id = encodeURIComponent(e.objectId);
  const map: Record<AuditObject, [string, Module]> = {
    product: [`/admin/proizvodi/${id}`, 'products'],
    order: [`/admin/narudzbe/${id}`, 'orders'],
    discount: [`/admin/popusti/${id}`, 'discounts'],
    offer: [`/admin/ponude/${id}`, 'offers'],
    placement: [`/admin/prodavnica/slajdovi/${id}`, 'onlineStore'],
    collection: [`/admin/kolekcije/${id}`, 'collections'],
    settings: ['/admin/konfiguracija', 'settings'],
    home: ['/admin/prodavnica/editor', 'onlineStore'],
    draft: [`/admin/nacrti/${id}`, 'drafts'],
    return: ['/admin/povrati', 'returns'],
    purchaseOrder: ['/admin/nabavke', 'purchasing'],
    inventory: ['/admin/inventar', 'inventory'],
    inquiry: [`/admin/kontakti?id=${id}`, 'contacts'],
    quote: ['/admin/kontakti/ponude', 'quotes'],
    booking: [`/admin/termini?id=${id}`, 'appointments'],
    staff: ['/admin/konfiguracija/stafi', 'settings'],
    page: [`/admin/stranice/${id}`, 'content'],
    post: [`/admin/savjeti/${id}`, 'content'],
    menu: ['/admin/meniji', 'content'],
    segment: ['/admin/segmenti', 'segments'],
    customer: [`/admin/kupci?q=${id}`, 'customers'],
  };
  const [to, module] = map[e.object] ?? [];
  return to ? { to, module } : null;
}

const PAGE = 25;

export function ActivitySection() {
  const t = useDict(A, 'admin');
  const ts = useDict(S, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const allow = useCan();
  const audit = useDb((s) => s.audit);
  const staff = useDb((s) => s.staff);
  const [q, setQ] = useState('');
  const [actor, setActor] = useState('all');
  const [object, setObject] = useState<'all' | AuditObject>('all');
  const [action, setAction] = useState<'all' | AuditAction>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [limit, setLimit] = useState(PAGE);

  const staffById = useMemo(() => new Map(staff.map((m) => [m.id, m])), [staff]);
  const actorName = (id: string) => (id === 'web' ? t('web') : staffById.get(id)?.name ?? (id === 'admin' ? t('system') : id));
  const actors = useMemo(() => [...new Set(audit.map((e) => e.actor))], [audit]);
  const objects = useMemo(() => [...new Set(audit.map((e) => e.object))].sort(), [audit]);
  const actions = useMemo(() => [...new Set(audit.map((e) => e.action))].sort(), [audit]);

  const rows = useMemo(() => {
    const now = Date.now();
    const since = period === 'today' ? new Date().setHours(0, 0, 0, 0) : period === '7' ? now - 7 * 864e5 : period === '30' ? now - 30 * 864e5 : 0;
    const needle = fold(q.trim());
    return [...audit]
      .sort((a, b) => b.at.localeCompare(a.at))
      .filter((e) => (actor === 'all' || e.actor === actor) && (object === 'all' || e.object === object) && (action === 'all' || e.action === action) && new Date(e.at).getTime() >= since)
      .filter((e) => !needle || fold(`${e.detail ?? ''} ${e.objectId} ${actorName(e.actor)}`).includes(needle));
  }, [audit, actor, object, action, period, q]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = rows.slice(0, limit);
  const filtered = actor !== 'all' || object !== 'all' || action !== 'all' || period !== 'all' || !!q.trim();
  const canExport = allow('settings', 'export');

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [[t('colTime'), t('colActor'), t('colAction'), t('colObject'), 'ID', t('colDetail')].map(esc).join(',')];
    for (const e of rows) lines.push([e.at, actorName(e.actor), t(`a_${e.action}` as AKey), t(`o_${e.object}` as AKey), e.objectId, e.detail ?? ''].map(esc).join(','));
    download(`audit-${new Date().toISOString().slice(0, 10)}.csv`, `﻿${lines.join('\n')}`, 'text/csv;charset=utf-8');
  };

  const selectCls = 'h-10! rounded-lg! text-[13.5px]! pr-9!';
  const objectCell = (e: AuditEntry) => {
    const link = objectLink(e);
    const label = <span className="font-medium">{t(`o_${e.object}` as AKey)}</span>;
    return link && allow(link.module, 'view') ? (
      <Link to={link.to} className="text-ink hover:underline hover:underline-offset-2">
        {label}
      </Link>
    ) : (
      <span className="text-ink-soft">{label}</span>
    );
  };
  const actorCell = (e: AuditEntry) => {
    const m = staffById.get(e.actor);
    return (
      <span className="flex min-w-0 items-center gap-2">
        {m ? (
          <Avatar name={m.name} color={m.color} size="sm" />
        ) : (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ececec] text-muted">
            <Globe className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="truncate">{actorName(e.actor)}</span>
      </span>
    );
  };
  const actionCell = (e: AuditEntry) => (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-medium text-ink-soft">
      <span aria-hidden className="grid h-4 w-4 place-items-center rounded bg-[#efefef] text-[10px] font-bold text-ink-soft">
        {ACTION_SYMBOL[e.action] ?? '·'}
      </span>
      {t(`a_${e.action}` as AKey)}
    </span>
  );

  return (
    <Panel
      lead
      flush
      title={ts('sec_activity')}
      description={ts('sec_activity_d')}
      actions={
        <Gate allowed={canExport} reason={ts('noPermission')}>
          <Button variant="outline" size="sm" shape="rounded" icon={<Download className="h-4 w-4" />} disabled={!canExport || !rows.length} onClick={exportCsv}>
            {t('exportCsv')}
          </Button>
        </Gate>
      }
      footnote={
        <>
          <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t('retention')}</span>
        </>
      }
    >
      <div className="space-y-3 border-b border-line/70 px-5 py-4 sm:px-6">
        <div className="grid gap-2.5 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE); }} placeholder={t('search')} />
          <Select aria-label={t('colActor')} value={actor} onChange={(e) => { setActor(e.target.value); setLimit(PAGE); }} className={selectCls}>
            <option value="all">{t('allActors')}</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {actorName(a)}
              </option>
            ))}
          </Select>
          <Select aria-label={t('colAction')} value={action} onChange={(e) => { setAction(e.target.value as AuditAction | 'all'); setLimit(PAGE); }} className={selectCls}>
            <option value="all">{t('allActions')}</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {t(`a_${a}` as AKey)}
              </option>
            ))}
          </Select>
          <Select aria-label={t('colObject')} value={object} onChange={(e) => { setObject(e.target.value as AuditObject | 'all'); setLimit(PAGE); }} className={selectCls}>
            <option value="all">{t('allObjects')}</option>
            {objects.map((o) => (
              <option key={o} value={o}>
                {t(`o_${o}` as AKey)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterPills<Period>
            value={period}
            onChange={(v) => { setPeriod(v); setLimit(PAGE); }}
            options={[
              { id: 'all', label: t('p_all') },
              { id: 'today', label: t('p_today') },
              { id: '7', label: t('p_7') },
              { id: '30', label: t('p_30') },
            ]}
          />
          <span className="flex items-center gap-3 text-[12.5px] text-muted">
            {ta('showing', { n: shown.length, total: rows.length })}
            {filtered && (
              <button
                type="button"
                className="font-semibold text-ink-soft underline decoration-ink/20 underline-offset-2 hover:text-ink"
                onClick={() => {
                  setQ('');
                  setActor('all');
                  setObject('all');
                  setAction('all');
                  setPeriod('all');
                  setLimit(PAGE);
                }}
              >
                {ta('clear')}
              </button>
            )}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-14 text-center text-[13px] text-muted">{t('empty')}</div>
      ) : (
        <>
          {/* Desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr>
                  {[t('colTime'), t('colActor'), t('colAction'), t('colObject'), t('colDetail')].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-line bg-[#f7f7f7] px-3 py-2.5 text-[12px] font-semibold text-muted first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-[#fafafa]">
                    <td className="whitespace-nowrap border-b border-line/60 py-2.5 pl-6 pr-3 text-muted" title={dateTime(e.at, lang)}>
                      <div className="text-ink-soft">{timeAgo(e.at, lang)}</div>
                      <div className="text-[11.5px] tabular-nums">{dateTime(e.at, lang)}</div>
                    </td>
                    <td className="max-w-[180px] border-b border-line/60 px-3 py-2.5">{actorCell(e)}</td>
                    <td className="border-b border-line/60 px-3 py-2.5">{actionCell(e)}</td>
                    <td className="whitespace-nowrap border-b border-line/60 px-3 py-2.5">{objectCell(e)}</td>
                    <td className="border-b border-line/60 py-2.5 pl-3 pr-6 text-ink-soft">
                      <span className="line-clamp-2">{e.detail || <span className="font-mono text-[12px] text-muted">{e.objectId}</span>}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <ul className="divide-y divide-line/60 md:hidden">
            {shown.map((e) => (
              <li key={e.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 text-[12.5px]">
                  {actorCell(e)}
                  <span className="shrink-0 text-muted" title={dateTime(e.at, lang)}>
                    {timeAgo(e.at, lang)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-8 text-[13px]">
                  {actionCell(e)}
                  <span className="text-ink/25">·</span>
                  {objectCell(e)}
                </div>
                {e.detail && <p className={cn('mt-1 pl-8 text-[12.5px] leading-snug text-muted')}>{e.detail}</p>}
              </li>
            ))}
          </ul>
          {rows.length > shown.length && (
            <div className="border-t border-line/70 px-5 py-3 text-center sm:px-6">
              <Button variant="outline" size="xs" shape="rounded" onClick={() => setLimit((n) => n + PAGE)}>
                {t('more')}
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
