import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, GitMerge, Phone, UserRound } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { defineDict, useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { date, money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { cx } from './i18n';
import { phone8, type CustomerRecord, type DuplicatePair } from './model';
import { Avatar, ConsentState, Gate } from './parts';
import { CHANNELS, mergeMarketing, snapshotCustomers, useCustomerStore, type Marketing } from './store';

const T = defineDict({
  me: {
    title: 'Spajanje duplikata',
    description: 'Pregled prije spajanja — ništa se ne mijenja dok ne kliknete „Spoji“. Narudžbe ostaju netaknute; spaja se samo profil kupca.',
    reasonPhone: 'Isti telefon',
    reasonName: 'Isto ime i grad',
    primary: 'Glavni zapis',
    makePrimary: 'Postavi kao glavni',
    secondary: 'Spaja se u glavni',
    result: 'Rezultat',
    orders: 'Narudžbe',
    spent: 'Potrošeno',
    since: 'Od',
    emails: 'E-mail adrese',
    phones: 'Telefoni',
    tags: 'Oznake',
    notes: 'Bilješke',
    addresses: 'Adrese',
    marketing: 'Saglasnosti',
    notDup: 'Nisu duplikati',
    merge: 'Spoji u „{name}“',
    merged: 'Kupci su spojeni',
    mergedText: '{a} → {b}',
    undo: 'Poništi',
    dismissed: 'Označeno kao različiti kupci',
    noneTitle: 'Nema mogućih duplikata',
    noneText: 'Svi kupci imaju jedinstven telefon i ime u svom gradu.',
    close: 'Zatvori',
    pairOf: 'Par {i} od {n}',
  },
  sq: {
    title: 'Bashko dyfishimet',
    description: 'Parapamje para bashkimit — asgjë nuk ndryshon derisa të klikoni „Bashko“. Porositë mbeten të paprekura; bashkohet vetëm profili i klientit.',
    reasonPhone: 'I njëjti telefon',
    reasonName: 'I njëjti emër dhe qytet',
    primary: 'Regjistrimi kryesor',
    makePrimary: 'Bëje kryesor',
    secondary: 'Bashkohet te kryesori',
    result: 'Rezultati',
    orders: 'Porositë',
    spent: 'Shpenzuar',
    since: 'Që nga',
    emails: 'E-mailet',
    phones: 'Telefonat',
    tags: 'Etiketat',
    notes: 'Shënimet',
    addresses: 'Adresat',
    marketing: 'Pëlqimet',
    notDup: 'Nuk janë dyfishime',
    merge: 'Bashko te „{name}“',
    merged: 'Klientët u bashkuan',
    mergedText: '{a} → {b}',
    undo: 'Zhbëj',
    dismissed: 'U shënuan si klientë të ndryshëm',
    noneTitle: 'Nuk ka dyfishime të mundshme',
    noneText: 'Çdo klient ka telefon unik dhe emër unik në qytetin e vet.',
    close: 'Mbyll',
    pairOf: 'Çifti {i} nga {n}',
  },
  en: {
    title: 'Merge duplicates',
    description: 'Preview before merging — nothing changes until you click “Merge”. Orders stay untouched; only the customer profile is combined.',
    reasonPhone: 'Same phone',
    reasonName: 'Same name and city',
    primary: 'Primary record',
    makePrimary: 'Make primary',
    secondary: 'Merged into primary',
    result: 'Result',
    orders: 'Orders',
    spent: 'Spent',
    since: 'Since',
    emails: 'E-mails',
    phones: 'Phones',
    tags: 'Tags',
    notes: 'Notes',
    addresses: 'Addresses',
    marketing: 'Consent',
    notDup: 'Not duplicates',
    merge: 'Merge into “{name}”',
    merged: 'Customers merged',
    mergedText: '{a} → {b}',
    undo: 'Undo',
    dismissed: 'Marked as different customers',
    noneTitle: 'No possible duplicates',
    noneText: 'Every customer has a unique phone and a unique name in their city.',
    close: 'Close',
    pairOf: 'Pair {i} of {n}',
  },
});

function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[13px]">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 text-right font-medium text-ink">{children}</span>
    </div>
  );
}

function RecordCard({ c, primary, onPick, labels }: { c: CustomerRecord; primary: boolean; onPick: () => void; labels: { primary: string; secondary: string; makePrimary: string; orders: string; spent: string; since: string } }) {
  const tx = useDict(cx, 'admin');
  const lang = useLang('admin');
  return (
    <div className={cn('flex min-w-0 flex-col rounded-xl border bg-white p-4', primary ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line')}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em]', primary ? 'text-ink' : 'text-muted')}>
          {primary ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.4} /> : <ArrowRight className="h-3.5 w-3.5" />}
          {primary ? labels.primary : labels.secondary}
        </span>
        {!primary && (
          <button type="button" onClick={onPick} className="text-[12px] font-semibold text-ink-soft underline underline-offset-2 hover:text-ink">
            {labels.makePrimary}
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={c.name} size="sm" />
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-ink">{c.name}</div>
          <div className="truncate text-[12px] text-muted">{tx(`src_${c.source}`)}</div>
        </div>
      </div>
      <div className="mt-3 divide-y divide-line/70 border-t border-line/70">
        <Field label="E-mail">
          <span className="block truncate">{c.email || '—'}</span>
        </Field>
        <Field label={<Phone className="h-3.5 w-3.5" />}>
          <span className="tabular-nums">{c.phone || '—'}</span>
        </Field>
        <Field label={tx('f_city')}>{c.city || '—'}</Field>
        <Field label={labels.orders}>
          {c.valid} · {money(c.spent, lang, { decimals: false })}
        </Field>
        <Field label={labels.since}>{date(c.since, lang)}</Field>
      </div>
    </div>
  );
}

function PairView({ pair, onDone }: { pair: DuplicatePair; onDone: () => void }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const logAudit = useDb((s) => s.logAudit);
  const [primaryKey, setPrimaryKey] = useState(pair.a.key);
  const primary = primaryKey === pair.a.key ? pair.a : pair.b;
  const secondary = primary === pair.a ? pair.b : pair.a;

  const emails = [...new Set([...primary.emails, ...secondary.emails])];
  const phones = [...primary.phones];
  for (const p of secondary.phones) if (!phones.some((x) => phone8(x) === phone8(p))) phones.push(p);
  const tags = [...new Set([...primary.tags, ...secondary.tags])];
  const marketing = { ...primary.marketing, ...mergeMarketing(primary.marketing, secondary.marketing) } as Marketing;
  const canEdit = can('customers', 'edit');

  const merge = () => {
    const snap = snapshotCustomers();
    useCustomerStore.getState().merge(primary.key, secondary.key);
    logAudit({ action: 'update', object: 'customer', objectId: primary.key, detail: `merge ${secondary.email || secondary.phone} → ${primary.email || primary.phone}` });
    toast.success(t('merged'), {
      description: t('mergedText', { a: secondary.name, b: primary.name }),
      action: { label: t('undo'), onClick: () => useCustomerStore.getState().restore(snap) },
    });
    onDone();
  };
  const dismiss = () => {
    useCustomerStore.getState().dismissPair(pair.a.key, pair.b.key);
    toast.success(t('dismissed'));
    onDone();
  };
  const labels = { primary: t('primary'), secondary: t('secondary'), makePrimary: t('makePrimary'), orders: t('orders'), spent: t('spent'), since: t('since') };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
          {pair.reason === 'phone' ? <Phone className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
          {pair.reason === 'phone' ? t('reasonPhone') : t('reasonName')}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.15fr]">
        <RecordCard c={pair.a} primary={primary === pair.a} onPick={() => setPrimaryKey(pair.a.key)} labels={labels} />
        <RecordCard c={pair.b} primary={primary === pair.b} onPick={() => setPrimaryKey(pair.b.key)} labels={labels} />
        <div className="flex min-w-0 flex-col rounded-xl bg-canvas p-4 ring-1 ring-inset ring-line">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink">
            <GitMerge className="h-3.5 w-3.5" /> {t('result')}
          </span>
          <div className="mt-3 truncate text-[15px] font-semibold text-ink">{primary.name}</div>
          <div className="mt-2 divide-y divide-line/70 border-t border-line/70">
            <Field label={t('emails')}>
              {emails.map((e) => (
                <span key={e} className="block truncate">
                  {e}
                </span>
              ))}
            </Field>
            <Field label={t('phones')}>
              {phones.length ? phones.map((p) => <span key={p} className="block tabular-nums">{p}</span>) : '—'}
            </Field>
            <Field label={t('orders')}>
              {primary.valid + secondary.valid} · {money(primary.spent + secondary.spent, lang, { decimals: false })}
            </Field>
            <Field label={t('tags')}>{tags.length ? tags.join(', ') : '—'}</Field>
            <Field label={t('notes')}>{primary.notes.length + secondary.notes.length}</Field>
          </div>
          <div className="mt-2 border-t border-line/70 pt-2">
            <div className="mb-1 text-[12px] text-muted">{t('marketing')}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {CHANNELS.map((ch) => (
                <div key={ch} className="flex min-w-0 items-center justify-between gap-1">
                  <span className="text-[12px] text-ink-soft">{tx(`ch_${ch}`)}</span>
                  <ConsentState consent={marketing[ch]} className="text-[11.5px]!" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Gate allowed={canEdit} reason={tx('noPermission')}>
          <Button variant="outline" shape="rounded" size="sm" disabled={!canEdit} onClick={dismiss} className="w-full sm:w-auto">
            {t('notDup')}
          </Button>
        </Gate>
        <Gate allowed={canEdit} reason={tx('noPermission')}>
          <Button shape="rounded" size="sm" icon={<GitMerge className="h-4 w-4" />} disabled={!canEdit} onClick={merge} className="w-full sm:w-auto">
            {t('merge', { name: primary.name })}
          </Button>
        </Gate>
      </div>
    </div>
  );
}

export function MergeModal({ open, onClose, pairs, focusId }: { open: boolean; onClose: () => void; pairs: DuplicatePair[]; focusId?: string | null }) {
  const t = useDict(T, 'admin');
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!open) return;
    const i = focusId ? pairs.findIndex((p) => p.id === focusId) : 0;
    setIndex(Math.max(0, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusId]);
  const pair = pairs[Math.min(index, pairs.length - 1)];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={t('title')}
      description={t('description')}
      footer={
        pairs.length > 1 ? (
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-[13px] text-muted">{t('pairOf', { i: Math.min(index, pairs.length - 1) + 1, n: pairs.length })}</span>
            <div className="flex gap-1.5">
              {pairs.map((p, i) => (
                <button key={p.id} type="button" onClick={() => setIndex(i)} aria-label={t('pairOf', { i: i + 1, n: pairs.length })} className={cn('h-2 w-2 rounded-full transition-colors', i === index ? 'bg-ink' : 'bg-ink/20 hover:bg-ink/40')} />
              ))}
            </div>
          </div>
        ) : (
          <Button variant="outline" shape="rounded" size="sm" onClick={onClose}>
            {t('close')}
          </Button>
        )
      }
    >
      <div className="p-5 sm:p-6">
        {pair ? (
          <PairView key={pair.id} pair={pair} onDone={() => (pairs.length <= 1 ? onClose() : setIndex((i) => Math.max(0, Math.min(i, pairs.length - 2))))} />
        ) : (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={t('noneTitle')} text={t('noneText')} className="py-10" />
        )}
      </div>
    </Modal>
  );
}
