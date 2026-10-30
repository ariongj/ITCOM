import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ChevronRight, Copy, Megaphone, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, Table, Td, Th, Tr, confirmDialog } from '@/admin/components/kit';
import { pluralForm } from '@/admin/components/crm/shared';
import { cx } from '@/admin/components/customers/i18n';
import { useExplain } from '@/admin/components/customers/explain';
import { ActionMenu, Gate } from '@/admin/components/customers/parts';
import { SEG, SegmentEditor, useSegmentUsage } from '@/admin/components/customers/SegmentEditor';
import { useCustomers, useSegmentCounts } from '@/admin/components/customers/useCustomers';
import { adm } from '@/admin/i18n';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { Segment } from '@/lib/types';
import { uid } from '@/lib/utils';

const T = defineDict({
  me: {
    subtitle: 'Dinamičke grupe kupaca prema pravilima — publika za popuste, ponude i izvještaje.',
    newSegment: 'Novi segment',
    infoTitle: 'Segmenti ne šalju marketing automatski.',
    infoText: 'Segment je živi filter, ne kopija kupaca: članstvo se mijenja čim se promijene narudžbe ili podaci kupca. Koristi se kao publika za popuste i ponude i u izvještajima.',
    col_segment: 'Segment',
    col_rules: 'Uslovi',
    col_matches: 'Poklapanja',
    col_usage: 'Koristi se u',
    pct: '{pct}% kupaca',
    usageNone: 'Nije u upotrebi',
    disc_one: '{n} popust',
    disc_few: '{n} popusta',
    disc_many: '{n} popusta',
    off_one: '{n} ponuda',
    off_few: '{n} ponude',
    off_many: '{n} ponuda',
    viewCustomers: 'Prikaži kupce',
    edit: 'Uredi',
    footer: 'Ukupno kupaca: {n} · poklapanja se računaju uživo',
    emptyTitle: 'Još nema segmenata',
    emptyText: 'Napravite prvi segment — npr. VIP klijenti, klijenti iz Mitrovice ili klijenti kojima je vreme za kontrolu vida.',
  },
  sq: {
    subtitle: 'Grupe dinamike klientësh sipas rregullave — audiencë për zbritjet, ofertat dhe raportet.',
    newSegment: 'Segment i ri',
    infoTitle: 'Segmentet nuk dërgojnë marketing automatikisht.',
    infoText: 'Segmenti është filtër i gjallë, jo kopje e klientëve: anëtarësia ndryshon sapo ndryshojnë porositë ose të dhënat e klientit. Përdoret si audiencë për zbritjet dhe ofertat, si dhe në raporte.',
    col_segment: 'Segmenti',
    col_rules: 'Kushtet',
    col_matches: 'Përputhje',
    col_usage: 'Përdoret në',
    pct: '{pct}% e klientëve',
    usageNone: 'Nuk përdoret',
    disc_one: '{n} zbritje',
    disc_few: '{n} zbritje',
    disc_many: '{n} zbritje',
    off_one: '{n} ofertë',
    off_few: '{n} oferta',
    off_many: '{n} oferta',
    viewCustomers: 'Shiko klientët',
    edit: 'Ndrysho',
    footer: 'Klientë gjithsej: {n} · përputhjet llogariten live',
    emptyTitle: 'Ende nuk ka segmente',
    emptyText: 'Krijoni segmentin e parë — p.sh. klientë VIP, klientë nga Mitrovica ose klientë që u ka ardhur koha për kontroll të syve.',
  },
  en: {
    subtitle: 'Dynamic customer groups built from rules — audiences for discounts, offers and reports.',
    newSegment: 'New segment',
    infoTitle: 'Segments never send marketing automatically.',
    infoText: 'A segment is a live filter, not a copy of customers: membership changes as soon as orders or customer data change. It is used as the audience for discounts and offers, and in reports.',
    col_segment: 'Segment',
    col_rules: 'Conditions',
    col_matches: 'Matches',
    col_usage: 'Used in',
    pct: '{pct}% of customers',
    usageNone: 'Not used',
    disc_one: '{n} discount',
    disc_few: '{n} discounts',
    disc_many: '{n} discounts',
    off_one: '{n} offer',
    off_few: '{n} offers',
    off_many: '{n} offers',
    viewCustomers: 'View customers',
    edit: 'Edit',
    footer: 'Total customers: {n} · matches are calculated live',
    emptyTitle: 'No segments yet',
    emptyText: 'Create your first segment — e.g. VIP customers, customers from Mitrovica or customers due for an eye exam.',
  },
});

export default function Segments() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const { customers, now } = useCustomers();
  if (id) return <SegmentEditor key={id} id={id} customers={customers} now={now} />;
  return <SegmentList />;
}

function SegmentList() {
  const t = useDict(T, 'admin');
  const ts = useDict(SEG, 'admin');
  const tx = useDict(cx, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const navigate = useNavigate();
  const can = useCan();
  const explain = useExplain();
  const segments = useDb((s) => s.segments);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);
  const { customers, now } = useCustomers();
  const counts = useSegmentCounts(customers, now);
  const usage = useSegmentUsage();
  const canEdit = can('segments', 'edit');
  const canDelete = can('segments', 'delete');
  const total = customers.length;

  const open = (s: Segment) => navigate(`/admin/segmenti?id=${s.id}`);
  const duplicate = (s: Segment) => {
    const copy: Segment = { ...structuredClone(s), id: uid('seg'), name: { me: s.name.me + ts('copySuffix'), sq: s.name.sq + ts('copySuffix'), en: s.name.en + ts('copySuffix') } };
    upsert('segments', copy);
    toast.success(ts('duplicated'), { description: l(copy.name) });
  };
  const del = async (s: Segment) => {
    if (!(await confirmDialog({ title: ts('deleteTitle', { name: l(s.name) }), text: ts('deleteText'), confirmLabel: ts('delete'), danger: true }))) return;
    remove('segments', s.id);
    toast.success(ts('deleted'), { description: l(s.name) });
  };
  const usageText = (s: Segment) => {
    const u = usage.get(s.id);
    if (!u || (!u.discounts.length && !u.offers.length)) return null;
    return [u.discounts.length ? t(`disc_${pluralForm(u.discounts.length, lang)}`, { n: u.discounts.length }) : null, u.offers.length ? t(`off_${pluralForm(u.offers.length, lang)}`, { n: u.offers.length }) : null].filter(Boolean).join(' · ');
  };
  const menu = (s: Segment) => {
    const used = !!usage.get(s.id)?.discounts.length;
    return [
      { label: t('viewCustomers'), icon: Users, onSelect: () => navigate(`/admin/kupci?segment=${s.id}`) },
      { label: t('edit'), icon: Pencil, onSelect: () => open(s) },
      { label: ts('duplicate'), icon: Copy, onSelect: () => duplicate(s), disabled: !canEdit, hint: tx('noPermission') },
      { label: ts('delete'), icon: Trash2, danger: true, divider: true, onSelect: () => del(s), disabled: !canDelete || used, hint: !canDelete ? tx('noPermission') : ts('deleteBlocked') },
    ];
  };
  const Matches = ({ s, wide }: { s: Segment; wide?: boolean }) => {
    const n = counts.get(s.id)?.length ?? 0;
    const pct = total ? Math.round((n / total) * 100) : 0;
    return (
      <div className={wide ? 'w-[150px]' : 'w-full'}>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[14px] font-semibold tabular-nums text-ink">{tx(`customers_${pluralForm(n, lang)}`, { n })}</span>
          <span className="text-[12px] tabular-nums text-muted">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink/[0.07]" title={t('pct', { pct })}>
          <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="pb-16">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_customers'), to: '/admin/kupci' }, ta('nav_segments')]}
        title={ta('nav_segments')}
        badge={<Badge tone="gray">{segments.length}</Badge>}
        description={t('subtitle')}
        actions={
          <Gate allowed={canEdit} reason={tx('noPermission')}>
            <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} disabled={!canEdit} onClick={() => navigate('/admin/segmenti?id=novi')}>
              {t('newSegment')}
            </Button>
          </Gate>
        }
      />

      <div className="mb-4 flex gap-3 rounded-xl border border-line/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/[0.06] text-ink-soft">
          <Megaphone className="h-4 w-4" />
        </span>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">{t('infoTitle')}</span> {t('infoText')}
        </p>
      </div>

      <Card padded={false}>
        {segments.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={t('emptyTitle')}
            text={t('emptyText')}
            action={
              canEdit && (
                <Button shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/admin/segmenti?id=novi')}>
                  {t('newSegment')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table className="hidden md:block">
              <thead>
                <tr>
                  <Th>{t('col_segment')}</Th>
                  <Th>{t('col_rules')}</Th>
                  <Th>{t('col_matches')}</Th>
                  <Th className="hidden lg:table-cell">{t('col_usage')}</Th>
                  <Th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {segments.map((s) => {
                  const used = usageText(s);
                  return (
                    <Tr key={s.id} onClick={() => open(s)} className="group">
                      <Td className="w-[26%]">
                        <div className="font-semibold text-ink">{l(s.name)}</div>
                        {s.description && l(s.description) && <div className="mt-0.5 line-clamp-1 text-[12.5px] text-muted">{l(s.description)}</div>}
                      </Td>
                      <Td>
                        <p className="line-clamp-2 max-w-[460px] text-[13px] leading-snug text-ink-soft">{explain(s)}</p>
                        <div className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">{tx(`match_${s.match}`)}</div>
                      </Td>
                      <Td>
                        <Matches s={s} wide />
                      </Td>
                      <Td className="hidden whitespace-nowrap text-[13px] lg:table-cell">{used ? <span className="text-ink-soft">{used}</span> : <span className="text-muted">{t('usageNone')}</span>}</Td>
                      <Td className="w-12 text-right" onClick={(e) => e.stopPropagation()}>
                        <ActionMenu items={menu(s)} label={tx('moreActions')} />
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>

            <ul className="divide-y divide-line/70 md:hidden">
              {segments.map((s) => {
                const used = usageText(s);
                return (
                  <li key={s.id} className="flex items-start gap-2 px-4 py-4">
                    <button type="button" onClick={() => open(s)} className="min-w-0 flex-1 text-left">
                      <div className="flex items-center gap-1 font-semibold text-ink">
                        {l(s.name)} <ChevronRight className="h-3.5 w-3.5 text-muted" />
                      </div>
                      <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-ink-soft">{explain(s)}</p>
                      <div className="mt-3">
                        <Matches s={s} />
                      </div>
                      <div className="mt-2 text-[12px] text-muted">{used ?? t('usageNone')}</div>
                    </button>
                    <div className="-mr-1.5 -mt-1">
                      <ActionMenu items={menu(s)} label={tx('moreActions')} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line/70 px-5 py-3.5 text-[13px] text-muted">{t('footer', { n: total })}</div>
          </>
        )}
      </Card>
    </div>
  );
}
