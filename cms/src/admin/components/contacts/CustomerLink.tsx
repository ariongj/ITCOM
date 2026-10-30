import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, Link2, Link2Off, Search, UserRound } from 'lucide-react';
import { defineDict, useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { matches } from '@/admin/components/crm/shared';
import type { CustomerRow } from '@/admin/components/crm/customers';
import { StatusLabel, StaffAvatar } from './atoms';
import { customerFor, kindOf, phoneKey, type CustomerIndex, type InquiryX } from './model';
import { cx } from './i18n';

const T = defineDict({
  me: {
    orders: 'Narudžbe',
    spent: 'Potrošeno',
    since: 'Kupac od',
    openProfile: 'Otvori profil',
    auto: 'Povezano automatski (e-mail / telefon)',
    manual: 'Povezano ručno',
    unlink: 'Ukloni vezu',
    relink: 'Poveži automatski',
    none: 'Nema profila kupca sa ovim e-mailom ili telefonom.',
    noneHint: 'Profil nastaje sa prvom narudžbom. Možete povezati postojećeg kupca:',
    searchPh: 'Pretraži kupce po imenu, e-mailu ili telefonu…',
    noMatch: 'Nema kupaca za ovu pretragu.',
    link: 'Poveži',
    other: 'Drugi upiti istog kontakta',
  },
  sq: {
    orders: 'Porosi',
    spent: 'Shpenzuar',
    since: 'Klient që nga',
    openProfile: 'Hap profilin',
    auto: 'Lidhur automatikisht (e-mail / telefon)',
    manual: 'Lidhur manualisht',
    unlink: 'Hiq lidhjen',
    relink: 'Lidh automatikisht',
    none: 'Nuk ka profil klienti me këtë e-mail ose telefon.',
    noneHint: 'Profili krijohet me porosinë e parë. Mund ta lidhni me një klient ekzistues:',
    searchPh: 'Kërko klientë sipas emrit, e-mailit ose telefonit…',
    noMatch: 'Nuk ka klientë për këtë kërkim.',
    link: 'Lidh',
    other: 'Kërkesa të tjera nga i njëjti kontakt',
  },
  en: {
    orders: 'Orders',
    spent: 'Spent',
    since: 'Customer since',
    openProfile: 'Open profile',
    auto: 'Linked automatically (e-mail / phone)',
    manual: 'Linked manually',
    unlink: 'Unlink',
    relink: 'Link automatically',
    none: 'No customer profile with this e-mail or phone.',
    noneHint: 'A profile starts with the first order. You can link an existing customer:',
    searchPh: 'Search customers by name, e-mail or phone…',
    noMatch: 'No customers for this search.',
    link: 'Link',
    other: 'Other requests from the same contact',
  },
});

/** Link a request to an existing customer profile (derived from orders) and show the purchase history (p.43). */
export function CustomerLink({ inquiry: q, index, canEdit, canOpenProfile, onOpenInquiry }: { inquiry: InquiryX; index: CustomerIndex; canEdit: boolean; canOpenProfile: boolean; onOpenInquiry: (id: string) => void }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const lang = useLang('admin');
  const inquiries = useDb((s) => s.inquiries);
  const [query, setQuery] = useState('');
  const linked = customerFor(q, index);
  const autoMatch = useMemo(() => customerFor({ ...q, customerKey: undefined }, index), [q, index]);

  const setKey = (customerKey: string | null | undefined) => useDb.getState().updateInquiry(q.id, { customerKey } as Partial<InquiryX>);

  const others = useMemo(() => {
    const pk = phoneKey(q.phone);
    const em = q.email?.trim().toLowerCase();
    return inquiries
      .filter((x) => x.id !== q.id && ((pk.length >= 6 && phoneKey(x.phone) === pk) || (em && x.email?.trim().toLowerCase() === em)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [inquiries, q]);

  const results = useMemo(() => (query.trim() ? index.rows.filter((r) => matches(query, [r.name, r.email, r.phone, r.company, r.city])).slice(0, 5) : []), [query, index]);

  return (
    <div className="space-y-3">
      {linked ? (
        <Profile row={linked.row} auto={linked.auto} canEdit={canEdit} canOpen={canOpenProfile} onUnlink={() => setKey(null)} />
      ) : (
        <div className="rounded-xl border border-line bg-white p-3.5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-ink/25 text-muted">
              <UserRound className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{t('none')}</p>
              {canEdit && <p className="mt-0.5 text-[12.5px] text-muted">{t('noneHint')}</p>}
            </div>
            {canEdit && q.customerKey === null && autoMatch && (
              <button type="button" onClick={() => setKey(undefined)} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink-soft hover:text-ink">
                <Link2 className="h-3.5 w-3.5" /> {t('relink')}
              </button>
            )}
          </div>
          {canEdit && (
            <div className="mt-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPh')}
                  className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[13px] outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
                />
              </div>
              {query.trim() && (
                <ul className="mt-1.5 divide-y divide-line/70 overflow-hidden rounded-lg border border-line">
                  {results.length === 0 ? (
                    <li className="px-3 py-2.5 text-[12.5px] text-muted">{t('noMatch')}</li>
                  ) : (
                    results.map((r) => (
                      <li key={r.key} className="flex items-center gap-2.5 px-3 py-2">
                        <StaffAvatar name={r.name} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-ink">{r.name}</div>
                          <div className="truncate text-[12px] text-muted">{[r.email || r.phone, r.city].filter(Boolean).join(' · ')}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setKey(r.key);
                            setQuery('');
                          }}
                          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-line px-2 text-[12px] font-semibold text-ink hover:border-ink/30"
                        >
                          <Link2 className="h-3 w-3" /> {t('link')}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {others.length > 0 && (
        <div>
          <div className="mb-1.5 text-[12px] font-semibold text-muted">{t('other')}</div>
          <ul className="divide-y divide-line/70 overflow-hidden rounded-xl border border-line bg-white">
            {others.slice(0, 4).map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => onOpenInquiry(x.id)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-canvas/70">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{x.message}</span>
                    <span className="text-[12px] text-muted">
                      {date(x.createdAt, lang)} · {tx(`kind_${kindOf(x)}`)}
                    </span>
                  </span>
                  <StatusLabel status={x.status} className="text-[12px]" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Profile({ row, auto, canEdit, canOpen, onUnlink }: { row: CustomerRow; auto: boolean; canEdit: boolean; canOpen: boolean; onUnlink: () => void }) {
  const t = useDict(T, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex items-start gap-3 p-3.5">
        <StaffAvatar name={row.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-ink">{row.name}</div>
          <div className="truncate text-[12.5px] text-muted">{[row.company, row.email || row.phone, row.city].filter(Boolean).join(' · ')}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-muted">
            <Link2 className="h-3 w-3" /> {auto ? t('auto') : t('manual')}
          </div>
        </div>
        {canOpen && (
          <Link to={`/admin/kupci?c=${encodeURIComponent(row.key)}`} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/30">
            {t('openProfile')} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <dl className="grid grid-cols-3 border-y border-line/70 bg-canvas/40 text-center">
        <div className="px-2 py-2">
          <dt className="text-[11.5px] text-muted">{t('orders')}</dt>
          <dd className="text-[14px] font-semibold tabular-nums text-ink">{row.count}</dd>
        </div>
        <div className="border-x border-line/70 px-2 py-2">
          <dt className="text-[11.5px] text-muted">{t('spent')}</dt>
          <dd className="text-[14px] font-semibold tabular-nums text-ink">{money(row.spent, lang)}</dd>
        </div>
        <div className="px-2 py-2">
          <dt className="text-[11.5px] text-muted">{t('since')}</dt>
          <dd className="text-[14px] font-semibold text-ink">{date(row.first, lang, { month: 'short', year: 'numeric' })}</dd>
        </div>
      </dl>
      <ul className="divide-y divide-line/70">
        {row.orders.slice(0, 3).map((o) => (
          <li key={o.id}>
            <Link to={`/admin/narudzbe/${o.id}`} className="flex items-center gap-3 px-3.5 py-2 text-[13px] transition-colors hover:bg-canvas/70">
              <span className="w-16 shrink-0 font-semibold text-ink">{o.number}</span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {date(o.createdAt, lang)} · {tc(`status_${o.status}`)}
              </span>
              <span className={cn('shrink-0 tabular-nums', o.status === 'cancelled' ? 'text-muted line-through' : 'font-semibold text-ink')}>{money(o.total, lang)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="border-t border-line/70 px-3.5 py-2">
          <button type="button" onClick={onUnlink} className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-ink">
            <Link2Off className="h-3.5 w-3.5" /> {t('unlink')}
          </button>
        </div>
      )}
    </div>
  );
}
