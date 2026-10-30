// Koleksionet — list (PDF p.14 "Produkte > Koleksionet"): manual vs smart, live public product count, publication, sort.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Copy, ExternalLink, EyeOff, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SearchInput, Table, Td, Th, Thumb, confirmDialog } from '@/admin/components/kit';
import { Tabs } from '@/admin/components/orders/ui';
import { RowMenu, type MenuItem } from '@/admin/components/products/parts';
import { pd } from '@/admin/components/products/dict';
import { cd, type CdKey } from '@/admin/components/collections/dict';
import { collectionUsage, ruleText, uniqueCollectionSlug, usageCount } from '@/admin/components/collections/model';
import { KindLabel, PublishedLabel } from '@/admin/components/collections/ui';
import { adm } from '@/admin/i18n';
import { useDict, useL, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan, useCategories } from '@/store/hooks';
import { inCollection, sortProducts } from '@/lib/collections';
import { fold } from '@/lib/search';
import { money } from '@/lib/format';
import { href } from '@/lib/paths';
import type { Collection, Product } from '@/lib/types';
import { uid } from '@/lib/utils';

type Tab = 'all' | Collection['kind'];
const TABS: Tab[] = ['all', 'manual', 'smart'];

interface Row {
  c: Collection;
  /** active members, storefront order */
  live: Product[];
  hidden: number;
  usage: number;
}

export default function Collections() {
  const t = useDict(cd, 'admin');
  const ta = useDict(adm, 'admin');
  const tc = useDict(common, 'admin');
  const tp = useDict(pd, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const categories = useCategories();
  const collections = useDb((s) => s.collections);
  const products = useDb((s) => s.products);
  const discounts = useDb((s) => s.discounts);
  const offers = useDb((s) => s.offers);
  const menus = useDb((s) => s.menus);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(
    () =>
      collections.map((c) => {
        const members = products.filter((p) => inCollection(c, p));
        const live = sortProducts(
          members.filter((p) => p.status === 'active'),
          c.sort,
          c.productIds,
        );
        return { c, live, hidden: members.length - live.length, usage: usageCount(collectionUsage(c, { discounts, offers, menus })) };
      }),
    [collections, products, discounts, offers, menus],
  );

  const searched = useMemo(() => {
    const q = fold(query.trim());
    const list = [...rows].sort((a, b) => Number(b.c.published) - Number(a.c.published) || (b.c.createdAt ?? '').localeCompare(a.c.createdAt ?? ''));
    if (!q) return list;
    return list.filter(({ c }) => fold(`${c.title.me} ${c.title.sq} ${c.title.en} ${c.slug}`).includes(q));
  }, [rows, query]);
  const counts = { all: searched.length, manual: searched.filter((r) => r.c.kind === 'manual').length, smart: searched.filter((r) => r.c.kind === 'smart').length };
  const filtered = tab === 'all' ? searched : searched.filter((r) => r.c.kind === tab);

  const ctx = { t, l, categories, badge: (b: string) => tc(`badge_${b as 'new'}`), status: (s: string) => tp(`st_${s as 'active'}`), money: (v: number) => money(v, lang) };
  const conditions = (c: Collection) =>
    c.kind === 'manual' ? t('manualCount', { n: c.productIds.length }) : c.rules.length ? c.rules.map((r) => ruleText(r, ctx)).join(c.match === 'all' ? ' · ' : ` ${t('or')} `) : t('noRules');

  const canEdit = can('collections', 'edit');
  const canDelete = can('collections', 'delete');

  const duplicate = (c: Collection) => {
    const id = uid('col');
    const sfx = (v: string, add: string) => (v.trim() ? `${v} ${add}` : v);
    const copy: Collection = {
      ...structuredClone(c),
      id,
      slug: uniqueCollectionSlug(`${c.slug}-2`, id, collections),
      title: { me: sfx(c.title.me, cd.me.copySuffix), sq: sfx(c.title.sq, cd.sq.copySuffix), en: sfx(c.title.en, cd.en.copySuffix) },
      published: false,
      createdAt: new Date().toISOString(),
    };
    upsert('collections', copy);
    toast.success(t('duplicated'), { description: l(copy.title) });
    navigate(`/admin/kolekcije/${id}`);
  };
  const del = async (c: Collection) => {
    const u = collectionUsage(c, { discounts, offers, menus });
    const used = [...u.discounts.map((d) => d.title), ...u.offers.map((o) => l(o.name)), ...u.menus.map((m) => m.title)];
    const ok = await confirmDialog({
      title: t('deleteTitle', { name: l(c.title) }),
      text: (
        <>
          {t('deleteText')}
          {used.length > 0 && <span className="mt-2 block font-semibold text-ink">{t('deleteUsed', { list: used.join(', ') })}</span>}
        </>
      ),
      confirmLabel: t('delete'),
      danger: true,
    });
    if (!ok) return;
    remove('collections', c.id);
    toast.success(t('deleted'), { description: l(c.title) });
  };
  const menuFor = (c: Collection): MenuItem[] => [
    { label: t('edit'), icon: Pencil, onSelect: () => navigate(`/admin/kolekcije/${c.id}`) },
    { label: c.published ? t('viewOnSite') : t('previewOnSite'), icon: ExternalLink, onSelect: () => window.open(href(`/koleksioni/${c.slug}${c.published ? '' : '?preview=1'}`), '_blank', 'noopener') },
    { label: t('duplicate'), icon: Copy, onSelect: () => duplicate(c), disabled: !canEdit, hint: t('noPerm') },
    { label: t('delete'), icon: Trash2, onSelect: () => del(c), danger: true, divider: true, disabled: !canDelete, hint: t('noPerm') },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_products'), to: '/admin/proizvodi' }, ta('nav_collections')]}
        title={ta('nav_collections')}
        description={t('description')}
        actions={
          canEdit && (
            <ButtonLink to="/admin/kolekcije/novi" size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />}>
              {t('create')}
            </ButtonLink>
          )
        }
      />

      <Card padded={false}>
        <Tabs tabs={TABS.map((k) => ({ id: k, label: t(`tab_${k}`), count: counts[k] }))} value={tab} onChange={setTab} />
        <div className="border-b border-line/70 px-4 py-3 sm:px-5">
          <SearchInput value={query} onChange={setQuery} placeholder={t('searchPh')} className="min-w-0 sm:max-w-md [&_input]:h-9" />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-6 w-6" />}
            title={collections.length ? t('noResults') : t('emptyTitle')}
            text={collections.length ? t('noResultsText') : t('emptyText')}
            action={
              collections.length ? (
                query && (
                  <Button variant="outline" size="sm" shape="rounded" onClick={() => setQuery('')}>
                    {ta('clear')}
                  </Button>
                )
              ) : (
                canEdit && (
                  <ButtonLink to="/admin/kolekcije/novi" size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />}>
                    {t('create')}
                  </ButtonLink>
                )
              )
            }
          />
        ) : (
          <>
            {/* desktop */}
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t('col_title')}</Th>
                  <Th>{t('col_type')}</Th>
                  <Th className="hidden xl:table-cell">{t('col_conditions')}</Th>
                  <Th className="text-right">{t('col_products')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th>{t('col_sort')}</Th>
                  <Th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ c, live, hidden, usage }) => (
                  <tr key={c.id} onClick={() => navigate(`/admin/kolekcije/${c.id}`)} className="group cursor-pointer transition-colors hover:bg-canvas/70">
                    <Td className="max-w-[340px]">
                      <span className="flex items-center gap-3">
                        <Thumb src={c.image} className="h-11 w-11 rounded-lg" />
                        <span className="min-w-0">
                          <Link to={`/admin/kolekcije/${c.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-semibold text-ink group-hover:underline group-hover:underline-offset-2">
                            {l(c.title)}
                          </Link>
                          <span className="block truncate font-mono text-[12px] text-muted">/koleksioni/{c.slug}</span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      <KindLabel kind={c.kind} />
                    </Td>
                    <Td className="hidden max-w-[280px] xl:table-cell">
                      <span className="line-clamp-2 text-[13px] text-ink-soft">{conditions(c)}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      <span className="block font-semibold tabular-nums">{live.length}</span>
                      {hidden > 0 && (
                        <span className="inline-flex items-center gap-1 text-[12px] text-muted" title={t('hiddenTitle', { n: hidden })}>
                          <EyeOff className="h-3 w-3" /> {t('hiddenCount', { n: hidden })}
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      <PublishedLabel published={c.published} />
                      {usage > 0 && <span className="mt-1 block text-[12px] text-muted">{t('col_usage')}: {t('usageN', { n: usage })}</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-[13px] text-ink-soft">{t(`sort_${c.sort}` as CdKey)}</Td>
                    <Td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu items={menuFor(c)} label={t('moreActions')} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* mobile */}
            <ul className="divide-y divide-line/70 md:hidden">
              {filtered.map(({ c, live, hidden }) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                  <Link to={`/admin/kolekcije/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Thumb src={c.image} className="h-14 w-14 rounded-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-ink">{l(c.title)}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-muted">
                        <KindLabel kind={c.kind} className="text-[12.5px]" />
                        <span>· {t('productsN', { n: live.length })}</span>
                        {hidden > 0 && <span>{t('hiddenCount', { n: hidden })}</span>}
                      </span>
                      <span className="mt-1.5 block">
                        <PublishedLabel published={c.published} />
                      </span>
                    </span>
                  </Link>
                  <RowMenu items={menuFor(c)} label={t('moreActions')} />
                </li>
              ))}
            </ul>

            <p className="px-4 py-3 text-[13px] text-muted sm:px-5">{t('footerCount', { n: filtered.length })}</p>
          </>
        )}
      </Card>
    </div>
  );
}
