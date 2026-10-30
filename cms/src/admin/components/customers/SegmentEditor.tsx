import { useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { BadgePercent, Copy, Download, Info, Lock, Megaphone, Plus, Sparkles, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { adm } from '@/admin/i18n';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { matchesSegment } from '@/lib/crm';
import { money } from '@/lib/format';
import type { L10n, Segment, SegmentField, SegmentRule } from '@/lib/types';
import { cn, download, uid } from '@/lib/utils';
import { pluralForm } from '@/admin/components/crm/shared';
import { cx } from './i18n';
import { exportCsv, isSubscribed, subjectOf, type CustomerRecord } from './model';
import { isNumericField, ruleValid, useExplain } from './explain';
import { Avatar, Gate, LangChip } from './parts';

export const SEG = defineDict({
  me: {
    newTitle: 'Novi segment',
    details: 'Detalji',
    name: 'Naziv',
    namePh: 'npr. Klijenti iz Vučitrna',
    description: 'Opis (interno)',
    conditions: 'Uslovi',
    conditionsHint: 'Segment je dinamičan: kupac ulazi ili izlazi čim se promijene njegove narudžbe ili podaci.',
    mustMeet: 'Kupac mora ispuniti',
    addCondition: 'Dodaj uslov',
    removeCondition: 'Ukloni uslov',
    operator: 'Operator',
    templates: 'Brzi početak',
    tpl_dormant: 'Neaktivni 60+ dana',
    tpl_big: 'Potrošili 2.000 €+',
    tpl_new: 'Novi ovog mjeseca',
    tpl_tag: 'Arhitekti i izvođači',
    explanation: 'Objašnjenje',
    live: 'Poklapanja uživo',
    liveOf: 'od {n} kupaca · {pct}%',
    previewEmpty: 'Nijedan kupac trenutno ne ispunjava uslove.',
    previewMore: '+ još {n}',
    openList: 'Otvori u listi kupaca',
    consentIn: 'E-mail saglasnost: {n} od {total}',
    exportMembers: 'Izvezi članove (CSV)',
    usage: 'Upotreba',
    usageEmpty: 'Segment još nije publika nijednog popusta ili ponude.',
    usageHint: 'Publiku birate u popustu: Popusti → Publika → Segment.',
    noAuto: 'Segmenti ne šalju marketing automatski. Služe kao publika za popuste i ponude i za izvještaje; kampanju pokrećete sami, samo kupcima sa saglasnošću.',
    saved: 'Segment je sačuvan',
    created: 'Segment je kreiran',
    errName: 'Unesite naziv segmenta',
    errRules: 'Popunite vrijednost u svim uslovima',
    readOnly: 'Samo pregled — vaša uloga ne može mijenjati segmente.',
    notFound: 'Segment nije pronađen',
    notFoundText: 'Možda je obrisan. Vratite se na listu segmenata.',
    backToList: 'Nazad na segmente',
    duplicate: 'Dupliraj',
    copySuffix: ' (kopija)',
    duplicated: 'Segment je dupliran',
    delete: 'Obriši',
    deleteTitle: 'Obrisati segment „{name}“?',
    deleteText: 'Kupci se ne brišu — briše se samo filter.',
    deleteBlocked: 'Segment je publika popusta — prvo promijenite publiku popusta.',
    deleted: 'Segment je obrisan',
    discount: 'Popust',
    offer: 'Ponuda',
    valuePh: 'Vrijednost',
    customersCol: 'Kupci',
  },
  sq: {
    newTitle: 'Segment i ri',
    details: 'Detajet',
    name: 'Emri',
    namePh: 'p.sh. Klientë nga Vushtrria',
    description: 'Përshkrimi (i brendshëm)',
    conditions: 'Kushtet',
    conditionsHint: 'Segmenti është dinamik: klienti hyn ose del sapo ndryshojnë porositë ose të dhënat e tij.',
    mustMeet: 'Klienti duhet të plotësojë',
    addCondition: 'Shto kusht',
    removeCondition: 'Hiq kushtin',
    operator: 'Operatori',
    templates: 'Fillim i shpejtë',
    tpl_dormant: 'Joaktivë 60+ ditë',
    tpl_big: 'Shpenzuan 2.000 €+',
    tpl_new: 'Të rinj këtë muaj',
    tpl_tag: 'Arkitektë dhe ndërtues',
    explanation: 'Shpjegimi',
    live: 'Përputhje live',
    liveOf: 'nga {n} klientë · {pct}%',
    previewEmpty: 'Asnjë klient nuk i plotëson kushtet aktualisht.',
    previewMore: '+ {n} të tjerë',
    openList: 'Hap në listën e klientëve',
    consentIn: 'Pëlqim për e-mail: {n} nga {total}',
    exportMembers: 'Eksporto anëtarët (CSV)',
    usage: 'Përdorimi',
    usageEmpty: 'Segmenti ende nuk është audiencë e asnjë zbritjeje apo oferte.',
    usageHint: 'Audiencën e zgjidhni te zbritja: Zbritjet → Audienca → Segment.',
    noAuto: 'Segmentet nuk dërgojnë marketing automatikisht. Përdoren si audiencë për zbritjet, ofertat dhe raportet; fushatën e nisni vetë, vetëm te klientët me pëlqim.',
    saved: 'Segmenti u ruajt',
    created: 'Segmenti u krijua',
    errName: 'Shkruani emrin e segmentit',
    errRules: 'Plotësoni vlerën në të gjitha kushtet',
    readOnly: 'Vetëm shikim — roli juaj nuk mund të ndryshojë segmentet.',
    notFound: 'Segmenti nuk u gjet',
    notFoundText: 'Mund të jetë fshirë. Kthehuni te lista e segmenteve.',
    backToList: 'Kthehu te segmentet',
    duplicate: 'Dupliko',
    copySuffix: ' (kopje)',
    duplicated: 'Segmenti u duplikua',
    delete: 'Fshij',
    deleteTitle: 'Të fshihet segmenti „{name}“?',
    deleteText: 'Klientët nuk fshihen — fshihet vetëm filtri.',
    deleteBlocked: 'Segmenti është audiencë e një zbritjeje — ndryshoni fillimisht audiencën e zbritjes.',
    deleted: 'Segmenti u fshi',
    discount: 'Zbritje',
    offer: 'Ofertë',
    valuePh: 'Vlera',
    customersCol: 'Klientët',
  },
  en: {
    newTitle: 'New segment',
    details: 'Details',
    name: 'Name',
    namePh: 'e.g. Customers from Vushtrri',
    description: 'Description (internal)',
    conditions: 'Conditions',
    conditionsHint: 'Segments are dynamic: a customer joins or leaves as soon as their orders or data change.',
    mustMeet: 'Customer must meet',
    addCondition: 'Add condition',
    removeCondition: 'Remove condition',
    operator: 'Operator',
    templates: 'Quick start',
    tpl_dormant: 'Dormant 60+ days',
    tpl_big: 'Spent €2,000+',
    tpl_new: 'New this month',
    tpl_tag: 'Architects & contractors',
    explanation: 'Explanation',
    live: 'Live matches',
    liveOf: 'of {n} customers · {pct}%',
    previewEmpty: 'No customer meets these conditions right now.',
    previewMore: '+ {n} more',
    openList: 'Open in customer list',
    consentIn: 'E-mail consent: {n} of {total}',
    exportMembers: 'Export members (CSV)',
    usage: 'Usage',
    usageEmpty: 'Not yet the audience of any discount or offer.',
    usageHint: 'Pick the audience in the discount: Discounts → Audience → Segment.',
    noAuto: 'Segments never send marketing automatically. They are audiences for discounts, offers and reports; you start a campaign yourself, only to customers who gave consent.',
    saved: 'Segment saved',
    created: 'Segment created',
    errName: 'Enter a segment name',
    errRules: 'Fill in the value of every condition',
    readOnly: 'View only — your role can’t edit segments.',
    notFound: 'Segment not found',
    notFoundText: 'It may have been deleted. Go back to the segment list.',
    backToList: 'Back to segments',
    duplicate: 'Duplicate',
    copySuffix: ' (copy)',
    duplicated: 'Segment duplicated',
    delete: 'Delete',
    deleteTitle: 'Delete segment “{name}”?',
    deleteText: 'Customers are not deleted — only the filter is.',
    deleteBlocked: 'This segment is a discount audience — change the discount’s audience first.',
    deleted: 'Segment deleted',
    discount: 'Discount',
    offer: 'Offer',
    valuePh: 'Value',
    customersCol: 'Customers',
  },
});

const FIELDS: SegmentField[] = ['orders', 'spent', 'lastOrderDays', 'city', 'lang', 'tag'];
const blankSegment = (): Segment => ({ id: '', name: { me: '', sq: '', en: '' }, description: { me: '', sq: '', en: '' }, match: 'all', rules: [{ field: 'orders', op: 'gt', value: '' }] });
const TEMPLATES: { id: 'tpl_dormant' | 'tpl_big' | 'tpl_new' | 'tpl_tag'; match: Segment['match']; rules: SegmentRule[] }[] = [
  { id: 'tpl_dormant', match: 'all', rules: [{ field: 'orders', op: 'gt', value: '0' }, { field: 'lastOrderDays', op: 'gt', value: '60' }] },
  { id: 'tpl_big', match: 'all', rules: [{ field: 'spent', op: 'gt', value: '2000' }] },
  { id: 'tpl_new', match: 'all', rules: [{ field: 'orders', op: 'eq', value: '1' }, { field: 'lastOrderDays', op: 'lt', value: '30' }] },
  { id: 'tpl_tag', match: 'any', rules: [{ field: 'tag', op: 'eq', value: 'arhitekta' }, { field: 'tag', op: 'eq', value: 'izvođač' }] },
];

/** Discounts (and their offers) that target a segment. */
export function useSegmentUsage() {
  const discounts = useDb((s) => s.discounts);
  const offers = useDb((s) => s.offers);
  return useMemo(() => {
    const map = new Map<string, { discounts: typeof discounts; offers: typeof offers }>();
    for (const d of discounts) {
      if (d.audience.type !== 'segment' || !d.audience.segmentId) continue;
      const e = map.get(d.audience.segmentId) ?? { discounts: [], offers: [] };
      e.discounts.push(d);
      for (const o of offers) if (o.discountId === d.id && !e.offers.includes(o)) e.offers.push(o);
      map.set(d.audience.segmentId, e);
    }
    return map;
  }, [discounts, offers]);
}

function RuleRow({ rule, onChange, onRemove, count, cities, tags, disabled, canRemove }: { rule: SegmentRule; onChange: (r: SegmentRule) => void; onRemove: () => void; count: number | null; cities: string[]; tags: string[]; disabled: boolean; canRemove: boolean }) {
  const tx = useDict(cx, 'admin');
  const t = useDict(SEG, 'admin');
  const lang = useLang('admin');
  const listId = useId();
  const numeric = isNumericField(rule.field);
  const invalid = !ruleValid(rule);
  const ctl = 'h-10 w-full rounded-lg border bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/5 disabled:bg-canvas disabled:text-muted';
  const setField = (field: SegmentField) => onChange({ field, op: isNumericField(field) ? 'gt' : 'eq', value: field === 'lang' ? 'sq' : '' });
  const unit = rule.field === 'spent' ? '€' : rule.field === 'lastOrderDays' ? tx('unit_days') : rule.field === 'orders' ? tx('unit_orders') : null;

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-line/80 bg-white p-2.5 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
      <select value={rule.field} disabled={disabled} onChange={(e) => setField(e.target.value as SegmentField)} aria-label={t('conditions')} className={cn(ctl, 'cursor-pointer appearance-none border-line font-medium')}>
        {FIELDS.map((f) => (
          <option key={f} value={f}>
            {tx(`f_${f}`)}
          </option>
        ))}
      </select>
      <div className="row-start-1 flex items-center justify-end gap-1 sm:col-start-4">
        <span
          title={count === null ? undefined : tx(`customers_${pluralForm(count, lang)}`, { n: count })}
          className={cn('inline-flex h-7 min-w-9 items-center justify-center gap-1 rounded-md px-1.5 text-[12px] font-semibold tabular-nums', count === null ? 'text-muted/50' : 'bg-ink/[0.06] text-ink-soft')}
        >
          <Users className="h-3 w-3" />
          {count ?? '–'}
        </span>
        {!disabled && (
          <button type="button" onClick={onRemove} disabled={!canRemove} aria-label={t('removeCondition')} title={t('removeCondition')} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:opacity-30">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="col-span-2 grid grid-cols-2 gap-2 sm:contents">
        {numeric ? (
          <select value={rule.op} disabled={disabled} onChange={(e) => onChange({ ...rule, op: e.target.value as SegmentRule['op'] })} aria-label={t('operator')} className={cn(ctl, 'cursor-pointer appearance-none border-line sm:col-start-2 sm:row-start-1')}>
            {(['gt', 'lt', 'eq'] as const).map((op) => (
              <option key={op} value={op}>
                {tx(`op_${op}`)}
              </option>
            ))}
          </select>
        ) : (
          <div className={cn(ctl, 'flex items-center border-line bg-canvas/60 text-ink-soft sm:col-start-2 sm:row-start-1')}>{tx('op_is')}</div>
        )}
        <div className="relative sm:col-start-3 sm:row-start-1">
          {rule.field === 'lang' ? (
            <select value={rule.value} disabled={disabled} onChange={(e) => onChange({ ...rule, value: e.target.value })} aria-label={tx('f_lang')} className={cn(ctl, 'cursor-pointer appearance-none border-line')}>
              {(['me', 'sq', 'en'] as const).map((x) => (
                <option key={x} value={x}>
                  {tx(`lang_${x}`)}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                value={rule.value}
                disabled={disabled}
                inputMode={numeric ? 'decimal' : undefined}
                list={numeric ? undefined : listId}
                placeholder={t('valuePh')}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                aria-invalid={invalid || undefined}
                className={cn(ctl, unit && 'pr-16', invalid ? 'border-amber-500/70' : 'border-line')}
              />
              {unit && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-muted">{unit}</span>}
              {!numeric && (
                <datalist id={listId}>
                  {(rule.field === 'city' ? cities : tags).map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SegmentEditor({ id, customers, now }: { id: string; customers: CustomerRecord[]; now: number }) {
  const t = useDict(SEG, 'admin');
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
  const usageMap = useSegmentUsage();
  const isNew = id === 'novi';
  const stored = segments.find((s) => s.id === id);
  const original = useMemo(() => (isNew ? blankSegment() : stored ? structuredClone(stored) : null), [isNew, stored]);
  const [draft, setDraft] = useState<Segment | null>(original);
  const [tried, setTried] = useState(false);
  useEffect(() => {
    setDraft(original);
    setTried(false);
  }, [original]);

  const canEdit = can('segments', 'edit');
  const canDelete = can('segments', 'delete');
  const canExport = can('customers', 'export');

  const subjects = useMemo(() => customers.map((c) => ({ c, s: subjectOf(c, now) })), [customers, now]);
  const complete = useMemo(() => (draft ? { ...draft, rules: draft.rules.filter(ruleValid) } : null), [draft]);
  const members = useMemo(() => (complete ? subjects.filter((x) => matchesSegment(x.s, complete)).map((x) => x.c).sort((a, b) => b.spent - a.spent) : []), [subjects, complete]);
  const ruleCounts = draft?.rules.map((r) => (ruleValid(r) ? subjects.filter((x) => matchesSegment(x.s, { match: 'all', rules: [r] })).length : null)) ?? [];
  const cities = useMemo(() => [...new Set(customers.map((c) => c.city).filter(Boolean))].sort(), [customers]);
  const tags = useMemo(() => [...new Set(customers.flatMap((c) => c.tags))].sort(), [customers]);

  if (!draft || !original) {
    return (
      <div>
        <PageHeader back="/admin/segmenti" breadcrumbs={[{ label: ta('nav_customers'), to: '/admin/kupci' }, { label: ta('nav_segments'), to: '/admin/segmenti' }]} title={t('notFound')} description={t('notFoundText')} />
        <Button variant="outline" shape="rounded" size="sm" onClick={() => navigate('/admin/segmenti')}>
          {t('backToList')}
        </Button>
      </div>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  const nameOk = !!(draft.name.me.trim() || draft.name.sq.trim() || draft.name.en.trim());
  const rulesOk = draft.rules.length > 0 && draft.rules.every(ruleValid);
  const usage = usageMap.get(draft.id);
  const used = !!usage?.discounts.length;
  const pct = customers.length ? Math.round((members.length / customers.length) * 100) : 0;
  const emailOk = members.filter((c) => isSubscribed(c, 'email')).length;
  const displayName = l(draft.name) || t('newTitle');

  const patch = (p: Partial<Segment>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setRule = (i: number, r: SegmentRule) => patch({ rules: draft.rules.map((x, j) => (j === i ? r : x)) });

  const save = () => {
    setTried(true);
    if (!nameOk) return toast.error(t('errName'));
    if (!rulesOk) return toast.error(t('errRules'));
    // fill empty translations from the first one given
    const first = draft.name.sq || draft.name.me || draft.name.en;
    const name: L10n = { me: draft.name.me || first, sq: draft.name.sq || first, en: draft.name.en || first };
    const next: Segment = { ...draft, id: draft.id || uid('seg'), name, rules: draft.rules.map((r) => ({ ...r, value: String(r.value).trim().replace(',', '.') })) };
    upsert('segments', next);
    toast.success(isNew ? t('created') : t('saved'), { description: l(name) });
    if (isNew) navigate(`/admin/segmenti?id=${next.id}`, { replace: true });
  };
  const discard = () => {
    if (isNew) navigate('/admin/segmenti');
    else setDraft(original);
    setTried(false);
  };
  const duplicateSeg = () => {
    const copy: Segment = { ...structuredClone(original), id: uid('seg'), name: { me: original.name.me + t('copySuffix'), sq: original.name.sq + t('copySuffix'), en: original.name.en + t('copySuffix') } };
    upsert('segments', copy);
    toast.success(t('duplicated'));
    navigate(`/admin/segmenti?id=${copy.id}`);
  };
  const del = async () => {
    if (!(await confirmDialog({ title: t('deleteTitle', { name: l(original.name) }), text: t('deleteText'), confirmLabel: t('delete'), danger: true }))) return;
    remove('segments', original.id);
    toast.success(t('deleted'), { description: l(original.name) });
    navigate('/admin/segmenti');
  };

  return (
    <div className="pb-28">
      <PageHeader
        back="/admin/segmenti"
        breadcrumbs={[{ label: ta('nav_customers'), to: '/admin/kupci' }, { label: ta('nav_segments'), to: '/admin/segmenti' }, isNew ? t('newTitle') : l(original.name)]}
        title={displayName}
        actions={
          !isNew && (
            <>
              <Gate allowed={canEdit} reason={tx('noPermission')}>
                <Button variant="outline" shape="rounded" size="sm" icon={<Copy className="h-4 w-4" />} disabled={!canEdit} onClick={duplicateSeg}>
                  {t('duplicate')}
                </Button>
              </Gate>
              <Gate allowed={canDelete && !used} reason={!canDelete ? tx('noPermission') : t('deleteBlocked')}>
                <Button variant="outline" shape="rounded" size="sm" icon={<Trash2 className="h-4 w-4" />} disabled={!canDelete || used} onClick={del}>
                  {t('delete')}
                </Button>
              </Gate>
            </>
          )
        }
      />

      {!canEdit && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-[13px] text-ink-soft">
          <Lock className="h-4 w-4 shrink-0 text-muted" /> {t('readOnly')}
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card title={t('details')}>
            <div className="grid gap-4">
              {canEdit ? (
                <>
                  <L10nInput label={t('name')} required value={draft.name} onChange={(name) => patch({ name })} placeholder={t('namePh')} />
                  {tried && !nameOk && <p className="-mt-2 text-[12px] font-medium text-red-600">{t('errName')}</p>}
                  <L10nInput label={t('description')} value={draft.description ?? { me: '', sq: '', en: '' }} onChange={(description) => patch({ description })} multiline rows={2} />
                </>
              ) : (
                <div>
                  <div className="text-[15px] font-semibold text-ink">{l(draft.name)}</div>
                  {draft.description && l(draft.description) && <p className="mt-1 text-[13.5px] text-muted">{l(draft.description)}</p>}
                </div>
              )}
            </div>
          </Card>

          <Card title={t('conditions')} description={t('conditionsHint')}>
            {isNew && canEdit && (
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted">
                  <Sparkles className="h-3.5 w-3.5" /> {t('templates')}
                </span>
                {TEMPLATES.map((tp) => (
                  <button key={tp.id} type="button" onClick={() => patch({ match: tp.match, rules: structuredClone(tp.rules) })} className="h-8 rounded-lg bg-white px-2.5 text-[12.5px] font-semibold text-ink-soft ring-1 ring-line transition hover:text-ink hover:ring-ink/30">
                    {t(tp.id)}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-muted">{t('mustMeet')}</span>
              <div className="inline-flex rounded-lg bg-canvas p-0.5" role="radiogroup">
                {(['all', 'any'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={draft.match === m}
                    disabled={!canEdit}
                    onClick={() => patch({ match: m })}
                    className={cn('h-8 rounded-md px-3 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed', draft.match === m ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink')}
                  >
                    {tx(`match_${m}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {draft.rules.map((r, i) => (
                <div key={i}>
                  {i > 0 && <div className="py-1 pl-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{draft.match === 'all' ? tx('x_and').trim() : tx('x_or').trim()}</div>}
                  <RuleRow rule={r} count={ruleCounts[i]} cities={cities} tags={tags} disabled={!canEdit} canRemove={draft.rules.length > 1} onChange={(x) => setRule(i, x)} onRemove={() => patch({ rules: draft.rules.filter((_, j) => j !== i) })} />
                  {tried && !ruleValid(r) && <p className="mt-1 pl-1 text-[12px] font-medium text-amber-800">{tx('x_incomplete')}</p>}
                </div>
              ))}
            </div>
            {canEdit && (
              <Button variant="outline" shape="rounded" size="sm" icon={<Plus className="h-4 w-4" />} className="mt-3" onClick={() => patch({ rules: [...draft.rules, { field: 'city', op: 'eq', value: '' }] })}>
                {t('addCondition')}
              </Button>
            )}

            <div className="mt-5 rounded-xl bg-canvas px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
                <Info className="h-3.5 w-3.5" /> {t('explanation')}
              </div>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{explain(draft)}</p>
            </div>
          </Card>
        </div>

        {/* Live preview + usage */}
        <div className="space-y-5 lg:sticky lg:top-[76px]">
          <Card padded={false}>
            <div className="px-5 pb-4 pt-4">
              <div className="text-[12.5px] font-medium text-muted">{t('live')}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[32px] font-semibold leading-none tracking-tight text-ink tabular-nums">{members.length}</span>
                <span className="text-[13px] text-muted">{t('liveOf', { n: customers.length, pct })}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
              {members.length > 0 && <div className="mt-2 text-[12.5px] text-muted">{t('consentIn', { n: emailOk, total: members.length })}</div>}
            </div>
            <div className="border-t border-line/70">
              {members.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-muted">{rulesOk || draft.rules.some(ruleValid) ? t('previewEmpty') : tx('x_empty')}</p>
              ) : (
                <ul className="divide-y divide-line/70">
                  {members.slice(0, 6).map((c) => (
                    <li key={c.key}>
                      <Link to={`/admin/kupci?c=${encodeURIComponent(c.key)}`} className="flex items-center gap-2.5 px-5 py-2.5 transition-colors hover:bg-canvas/70">
                        <Avatar name={c.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-[13.5px] font-semibold text-ink">{c.name}</span>
                            <LangChip lang={c.lang} className="shrink-0" />
                          </div>
                          <div className="truncate text-[12px] text-muted">
                            {c.city || '—'} · {tx(`orders_${pluralForm(c.valid, lang)}`, { n: c.valid })}
                          </div>
                        </div>
                        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">{money(c.spent, lang, { decimals: false })}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {members.length > 6 && <div className="border-t border-line/70 px-5 py-2 text-[12.5px] text-muted">{t('previewMore', { n: members.length - 6 })}</div>}
            </div>
            {!isNew && !dirty && members.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line/70 px-5 py-3">
                <Button variant="outline" shape="rounded" size="xs" icon={<Users className="h-3.5 w-3.5" />} onClick={() => navigate(`/admin/kupci?segment=${draft.id}`)}>
                  {t('openList')}
                </Button>
                <Gate allowed={canExport} reason={tx('noPermission')}>
                  <Button variant="ghost" shape="rounded" size="xs" icon={<Download className="h-3.5 w-3.5" />} disabled={!canExport} onClick={() => download(`segment-${draft.id}.csv`, exportCsv(members), 'text/csv;charset=utf-8')}>
                    {t('exportMembers')}
                  </Button>
                </Gate>
              </div>
            )}
          </Card>

          <Card title={t('usage')}>
            {usage && (usage.discounts.length > 0 || usage.offers.length > 0) ? (
              <ul className="space-y-2">
                {usage.discounts.map((d) => (
                  <li key={d.id}>
                    <Link to={`/admin/popusti/${d.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-[13.5px] transition-colors hover:bg-canvas">
                      <BadgePercent className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{d.title}</span>
                      <span className="shrink-0 text-[12px] text-muted">{t('discount')}</span>
                    </Link>
                  </li>
                ))}
                {usage.offers.map((o) => (
                  <li key={o.id}>
                    <Link to={`/admin/ponude/${o.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-[13.5px] transition-colors hover:bg-canvas">
                      <Megaphone className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate font-medium text-ink">{l(o.name)}</span>
                      <span className="shrink-0 text-[12px] text-muted">{t('offer')}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted">{t('usageEmpty')}</p>
            )}
            <p className="mt-3 text-[12.5px] text-muted">{t('usageHint')}</p>
            <div className="mt-4 flex gap-2.5 rounded-xl border border-line px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
              <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              {t('noAuto')}
            </div>
          </Card>
        </div>
      </div>

      {canEdit && <SaveBar dirty={dirty || isNew} onSave={save} onDiscard={discard} />}
    </div>
  );
}
