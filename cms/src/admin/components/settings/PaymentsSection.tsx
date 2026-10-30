import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowUpRight, Banknote, CreditCard, FlaskConical, Landmark, Lock, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { defineDict, useDict, useLang } from '@/i18n';
import { money, timeAgo } from '@/lib/format';
import type { Integration, Order } from '@/lib/types';
import { cn, sleep } from '@/lib/utils';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { T } from './i18n';
import { S } from './strings';
import { TextField, ToggleRow } from './fields';
import { shortRef, type PayProvider, type SecProps } from './model';
import { Block, Choice, Gate, Note, Panel, Segmented, StateText, type StateTone } from './ui';

const P = defineDict({
  me: {
    online: 'Online provajder',
    online_h: 'Kartično plaćanje preko e-commerce servisa banke na Kosovu. Aktiviranje i probno plaćanje su posebni koraci.',
    provider: 'Provajder',
    prov_pilot: 'ProCredit Bank Kosovo — e-commerce',
    prov_monri: 'TEB Kosova — virtuelni POS',
    prov_allsecure: 'Raiffeisen Bank Kosovo — e-commerce',
    env: 'Okruženje',
    env_test: 'Test okruženje',
    env_live: 'Produkcija',
    card: 'Platne kartice online',
    card_d: 'Visa, Mastercard i Maestro na checkout-u.',
    testMode: 'Test okruženje — kartice se ne terete.',
    liveWarn: 'Produkcija se uključuje tek nakon ugovora sa bankom i uspješnog probnog plaćanja.',
    runTest: 'Probno plaćanje',
    testOk: 'Probno plaćanje od 1,00 € je autorizovano',
    testRef: 'Referenca {ref} — kartica nije terećena.',
    testDetail: 'Probno plaćanje 1,00 € · {ref}',
    connection: 'Veza',
    st_connected: 'Povezano',
    st_test: 'U testu',
    st_disconnected: 'Nije povezano',
    manual: 'Ručni načini',
    manual_h: 'Plaćanje se evidentira ručno u narudžbi.',
    capture: 'Naplata',
    capture_h: 'Kada se iznos sa kartice zaista naplaćuje.',
    cap_auto: 'Automatski na checkout-u',
    cap_auto_d: 'Iznos se naplaćuje odmah po potvrdi plaćanja.',
    cap_manual: 'Ručno, nakon potvrde narudžbe',
    cap_manual_d: 'Kartica se autorizuje, a naplata ide u roku od 7 dana — korisno za dioptrijska sočiva koja se izrađuju po receptu.',
    refunds: 'Povrat novca',
    refunds_d: 'Povrat se radi iz narudžbe i zahtijeva dozvolu „Povrat“. Kartična plaćanja vraćaju se preko provajdera, ručna se evidentiraju.',
    refundYes: 'Vaša uloga može da vraća novac',
    refundNo: 'Vaša uloga ne može da vraća novac',
    security: 'CMS čuva reference transakcija, nikada brojeve kartica. Webhook-ovi se provjeravaju potpisom; tajni ključevi čuvaju se van javnih podataka.',
    tx: 'Posljednje transakcije',
    tx_h: 'Kartična plaćanja iz narudžbi i probna plaćanja.',
    txRef: 'Referenca',
    txOrder: 'Narudžba',
    txAmount: 'Iznos',
    txStatus: 'Status',
    txWhen: 'Vrijeme',
    tx_captured: 'Naplaćeno',
    tx_authorized: 'Autorizovano',
    tx_refunded: 'Vraćeno',
    tx_partial: 'Djelimično vraćeno',
    tx_failed: 'Neuspjelo',
    tx_pending: 'Na čekanju',
    tx_test: 'Proba',
    txEmpty: 'Još nema kartičnih plaćanja.',
    logsNote: 'Status i logovi integracije vidljivi su samo uz dozvolu.',
    integrations: 'Integracije',
    pilotNote: 'Banka, valuta, zone i fiskalizacija (ATK) potvrđuju se pre puštanja u rad. Do tada se ne postavlja univerzalna taksa ili tarifa.',
  },
  sq: {
    online: 'Ofrues online',
    online_h: 'Pagesa me kartelë përmes shërbimit e-commerce të një banke në Kosovë. Aktivizimi dhe prova e pagesës janë hapa të veçantë.',
    provider: 'Ofruesi',
    prov_pilot: 'ProCredit Bank Kosovo — e-commerce',
    prov_monri: 'TEB Kosova — POS virtual',
    prov_allsecure: 'Raiffeisen Bank Kosovo — e-commerce',
    env: 'Ambienti',
    env_test: 'Ambient prove',
    env_live: 'Live',
    card: 'Kartelë pagese online',
    card_d: 'Visa, Mastercard dhe Maestro në checkout.',
    testMode: 'Ambient prove — kartelat nuk ngarkohen.',
    liveWarn: 'Live aktivizohet vetëm pas kontratës me bankën dhe një pagese prove të suksesshme.',
    runTest: 'Bëj pagesë prove',
    testOk: 'Pagesa prove prej 1,00 € u autorizua',
    testRef: 'Referenca {ref} — kartela nuk u ngarkua.',
    testDetail: 'Pagesë prove 1,00 € · {ref}',
    connection: 'Lidhja',
    st_connected: 'E lidhur',
    st_test: 'Në provë',
    st_disconnected: 'E palidhur',
    manual: 'Mënyra manuale',
    manual_h: 'Pagesa regjistrohet manualisht te porosia.',
    capture: 'Arkëtimi',
    capture_h: 'Kur arkëtohet realisht shuma nga kartela.',
    cap_auto: 'Automatik në checkout',
    cap_auto_d: 'Shuma arkëtohet menjëherë pas konfirmimit të pagesës.',
    cap_manual: 'Manual, pas konfirmimit të porosisë',
    cap_manual_d: 'Kartela autorizohet dhe arkëtimi bëhet brenda 7 ditëve — e dobishme për PC‑të që ndërtohen me porosi.',
    refunds: 'Rimbursimi',
    refunds_d: 'Rimbursimi bëhet nga porosia dhe kërkon lejen „Rimburso“. Pagesat me kartelë kthehen përmes ofruesit, ato manuale regjistrohen.',
    refundYes: 'Roli juaj mund të rimbursojë',
    refundNo: 'Roli juaj nuk mund të rimbursojë',
    security: 'CMS ruan referenca transaksioni, jo numra kartash. Webhooks verifikohen me nënshkrim; secrets ruhen jashtë të dhënave publike.',
    tx: 'Transaksionet e fundit',
    tx_h: 'Pagesat me kartelë nga porositë dhe pagesat prove.',
    txRef: 'Referenca',
    txOrder: 'Porosia',
    txAmount: 'Shuma',
    txStatus: 'Statusi',
    txWhen: 'Koha',
    tx_captured: 'Arkëtuar',
    tx_authorized: 'Autorizuar',
    tx_refunded: 'Rimbursuar',
    tx_partial: 'Rimbursuar pjesërisht',
    tx_failed: 'Dështuar',
    tx_pending: 'Në pritje',
    tx_test: 'Provë',
    txEmpty: 'Ende nuk ka pagesa me kartelë.',
    logsNote: 'Statusi dhe log-et e integrimit shihen vetëm me leje.',
    integrations: 'Integrime',
    pilotNote: 'Banka, valuta, zonat dhe fiskalizimi (ATK) konfirmohen para lansimit. Deri atëherë nuk caktohet një taksë ose tarifë universale.',
  },
  en: {
    online: 'Online provider',
    online_h: 'Card payments through a Kosovo bank’s e-commerce gateway. Activation and a test payment are separate steps.',
    provider: 'Provider',
    prov_pilot: 'ProCredit Bank Kosovo — e-commerce',
    prov_monri: 'TEB Kosova — virtual POS',
    prov_allsecure: 'Raiffeisen Bank Kosovo — e-commerce',
    env: 'Environment',
    env_test: 'Test environment',
    env_live: 'Live',
    card: 'Online card payments',
    card_d: 'Visa, Mastercard and Maestro at checkout.',
    testMode: 'Test environment — cards are not charged.',
    liveWarn: 'Live is enabled only after the bank contract and a successful test payment.',
    runTest: 'Run a test payment',
    testOk: 'Test payment of €1.00 authorised',
    testRef: 'Reference {ref} — the card was not charged.',
    testDetail: 'Test payment €1.00 · {ref}',
    connection: 'Connection',
    st_connected: 'Connected',
    st_test: 'In test',
    st_disconnected: 'Not connected',
    manual: 'Manual methods',
    manual_h: 'The payment is recorded manually on the order.',
    capture: 'Capture',
    capture_h: 'When the card amount is actually collected.',
    cap_auto: 'Automatically at checkout',
    cap_auto_d: 'The amount is captured as soon as the payment is confirmed.',
    cap_manual: 'Manually, after the order is confirmed',
    cap_manual_d: 'The card is authorised and captured within 7 days — useful for prescription lenses made to order.',
    refunds: 'Refunds',
    refunds_d: 'Refunds are issued from the order and need the “Refund” permission. Card payments go back through the provider; manual ones are recorded.',
    refundYes: 'Your role can issue refunds',
    refundNo: 'Your role can’t issue refunds',
    security: 'The CMS stores transaction references, never card numbers. Webhooks are verified by signature; secrets are kept outside public data.',
    tx: 'Recent transactions',
    tx_h: 'Card payments from orders and test payments.',
    txRef: 'Reference',
    txOrder: 'Order',
    txAmount: 'Amount',
    txStatus: 'Status',
    txWhen: 'Time',
    tx_captured: 'Captured',
    tx_authorized: 'Authorised',
    tx_refunded: 'Refunded',
    tx_partial: 'Partially refunded',
    tx_failed: 'Failed',
    tx_pending: 'Pending',
    tx_test: 'Test',
    txEmpty: 'No card payments yet.',
    logsNote: 'Integration status and logs are visible only with permission.',
    integrations: 'Integrations',
    pilotNote: 'The bank, currency, zones and ATK fiscalisation are confirmed before launch. Until then, no universal tax or fee is set.',
  },
});
type PKey = keyof typeof P.me;

type TxState = 'captured' | 'authorized' | 'refunded' | 'partial' | 'failed' | 'pending';
const TX_TONE: Record<TxState, StateTone> = { captured: 'ok', authorized: 'test', refunded: 'off', partial: 'info', failed: 'warn', pending: 'info' };

function txState(o: Order): TxState {
  const p = o.payment;
  if (p.failed) return 'failed';
  if (p.status === 'refunded') return 'refunded';
  if ((p.refunded ?? 0) > 0) return 'partial';
  if (p.authorized) return 'authorized';
  return p.status === 'paid' ? 'captured' : 'pending';
}

const INT_TONE: Record<Integration['status'], StateTone> = { connected: 'ok', test: 'test', disconnected: 'off' };

interface TestTx {
  ref: string;
  at: string;
}

export function PaymentsSection({ s, set, setExt, readOnly }: SecProps) {
  const t = useDict(P, 'admin');
  const tl = useDict(T, 'admin');
  const ts = useDict(S, 'admin');
  const lang = useLang('admin');
  const allow = useCan();
  const orders = useDb((st) => st.orders);
  const logAudit = useDb((st) => st.logAudit);
  const [tests, setTests] = useState<TestTx[]>([]);
  const [testing, setTesting] = useState(false);

  const p = s.payments;
  const ext = s.ext;
  const enabled = [p.cod, p.bank, p.card].filter(Boolean).length;
  const integration = s.integrations.find((i) => i.kind === 'payment');
  const seeLogs = allow('integrations', 'view');
  const canRefund = allow('orders', 'refund');

  const cardOrders = useMemo(() => orders.filter((o) => o.payment.method === 'card').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [orders]);

  const runTest = async () => {
    setTesting(true);
    await sleep(900);
    const ref = `TX-TEST-${shortRef(String(Date.now()))}`;
    setTests((x) => [{ ref, at: new Date().toISOString() }, ...x].slice(0, 3));
    logAudit({ action: 'send', object: 'settings', objectId: 'payments', detail: t('testDetail', { ref }) });
    setTesting(false);
    toast.success(t('testOk'), { description: t('testRef', { ref }) });
  };

  const methods = [
    { key: 'cod' as const, icon: <Banknote className="h-[18px] w-[18px]" />, title: tl('cod'), desc: tl('cod_d') },
    { key: 'bank' as const, icon: <Landmark className="h-[18px] w-[18px]" />, title: tl('bank'), desc: tl('bank_d') },
  ];

  return (
    <div className="space-y-5">
      <Panel
        lead
        title={ts('sec_payments')}
        description={ts('sec_payments_d')}
        footnote={
          <>
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{t('logsNote')}</span>
          </>
        }
      >
        <Block title={t('online')} hint={t('online_h')}>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <div className="mb-2 text-[12.5px] font-medium text-muted">{t('provider')}</div>
              <Select aria-label={t('provider')} value={ext.payProvider} onChange={(e) => setExt('payProvider', e.target.value as PayProvider)} className="h-10! rounded-lg! text-[14px]!">
                {(['pilot', 'monri', 'allsecure'] as PayProvider[]).map((k) => (
                  <option key={k} value={k}>
                    {t(`prov_${k}` as PKey)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <div className="mb-2 text-[12.5px] font-medium text-muted">{t('env')}</div>
              <Segmented
                label={t('env')}
                className="h-10 w-full items-center sm:w-auto [&>button]:h-9"
                value={ext.payEnv}
                onChange={(v) => setExt('payEnv', v)}
                options={[
                  { id: 'test', label: t('env_test') },
                  { id: 'live', label: t('env_live') },
                ]}
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-line">
            <div className="px-4 py-3.5">
              <ToggleRow
                icon={<CreditCard className="h-[18px] w-[18px]" />}
                title={t('card')}
                description={t('card_d')}
                checked={p.card}
                disabled={p.card && enabled === 1}
                onChange={(v) => set('payments', { ...p, card: v })}
              />
            </div>
            <div className="flex flex-col gap-3 border-t border-line/70 bg-[#fafafa] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
                {ext.payEnv === 'test' ? <StateText tone="test">{t('testMode')}</StateText> : <StateText tone="warn">{t('liveWarn')}</StateText>}
                {seeLogs && integration && (
                  <Link to="/admin/integracije" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink">
                    {t('connection')}: <StateText tone={INT_TONE[integration.status]}>{t(`st_${integration.status}` as PKey)}</StateText>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              {ext.payEnv === 'test' && (
                <Gate allowed={!readOnly} reason={ts('ownerOnly')}>
                  <Button variant="outline" size="xs" shape="rounded" icon={<FlaskConical className="h-3.5 w-3.5" />} loading={testing} disabled={!p.card || readOnly} onClick={() => void runTest()} className="self-start sm:self-center">
                    {t('runTest')}
                  </Button>
                </Gate>
              )}
            </div>
          </div>
        </Block>

        <Block title={t('manual')} hint={t('manual_h')}>
          <div className="divide-y divide-line/70 rounded-lg border border-line">
            {methods.map((r) => (
              <div key={r.key} className="px-4 py-3.5">
                <ToggleRow icon={r.icon} title={r.title} description={r.desc} checked={p[r.key]} disabled={p[r.key] && enabled === 1} onChange={(v) => set('payments', { ...p, [r.key]: v })} />
                {r.key === 'bank' && p.bank && (
                  <div className="mt-4 grid gap-x-4 gap-y-4 pl-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:pl-14">
                    <TextField label={tl('bankName')} value={s.bankName} onChange={(v) => set('bankName', v)} leading={<Landmark className="h-4 w-4" />} />
                    <TextField label={tl('bankAccount')} value={s.bankAccount} onChange={(v) => set('bankAccount', v)} example inputClassName="font-mono text-[13.5px] tracking-wide" />
                  </div>
                )}
              </div>
            ))}
          </div>
          {enabled === 1 && <p className="mt-2.5 text-[12.5px] text-muted">{tl('lastPayment')}</p>}
        </Block>

        <Block title={t('capture')} hint={t('capture_h')}>
          <div role="radiogroup" aria-label={t('capture')} className="grid gap-2.5 md:grid-cols-2">
            <Choice checked={ext.capture === 'auto'} onSelect={() => setExt('capture', 'auto')} title={t('cap_auto')} description={t('cap_auto_d')} />
            <Choice checked={ext.capture === 'manual'} onSelect={() => setExt('capture', 'manual')} title={t('cap_manual')} description={t('cap_manual_d')} />
          </div>
        </Block>

        <Block title={t('refunds')}>
          <p className="max-w-2xl text-[13px] leading-relaxed text-ink-soft">{t('refunds_d')}</p>
          <div className="mt-2.5">
            <StateText tone={canRefund ? 'ok' : 'off'}>{canRefund ? t('refundYes') : t('refundNo')}</StateText>
          </div>
          <Note icon={Lock} className="mt-4">
            {t('security')}
          </Note>
        </Block>
      </Panel>

      {seeLogs && (
        <Panel title={t('tx')} description={t('tx_h')} flush>
          {cardOrders.length + tests.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-muted">{t('txEmpty')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                <thead>
                  <tr>
                    {[t('txRef'), t('txOrder'), t('txAmount'), t('txStatus'), t('txWhen')].map((h, i) => (
                      <th key={h} className={cn('whitespace-nowrap border-b border-line bg-[#f7f7f7] px-3 py-2.5 text-[12px] font-semibold text-muted first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', i === 2 && 'text-right')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((x) => (
                    <tr key={x.ref} className="bg-[#fcfcfc]">
                      <td className="border-b border-line/60 py-2.5 pl-5 pr-3 font-mono text-[12px] text-ink-soft sm:pl-6">{x.ref}</td>
                      <td className="border-b border-line/60 px-3 py-2.5 text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <FlaskConical className="h-3.5 w-3.5" /> {t('tx_test')}
                        </span>
                      </td>
                      <td className="border-b border-line/60 px-3 py-2.5 text-right tabular-nums">{money(1, lang, { decimals: true })}</td>
                      <td className="border-b border-line/60 px-3 py-2.5">
                        <StateText tone="test">{t('tx_authorized')}</StateText>
                      </td>
                      <td className="whitespace-nowrap border-b border-line/60 py-2.5 pl-3 pr-5 text-muted sm:pr-6">{timeAgo(x.at, lang)}</td>
                    </tr>
                  ))}
                  {cardOrders.map((o) => {
                    const st = txState(o);
                    return (
                      <tr key={o.id} className="transition-colors hover:bg-[#fafafa]">
                        <td className="border-b border-line/60 py-2.5 pl-5 pr-3 font-mono text-[12px] text-ink-soft sm:pl-6">TX-{shortRef(o.id, 8)}</td>
                        <td className="border-b border-line/60 px-3 py-2.5">
                          <Link to={`/admin/narudzbe/${o.id}`} className="inline-flex items-center gap-1.5 font-semibold text-ink hover:underline hover:underline-offset-2">
                            <ReceiptText className="h-3.5 w-3.5 text-muted" /> {o.number}
                          </Link>
                        </td>
                        <td className="border-b border-line/60 px-3 py-2.5 text-right font-medium tabular-nums">{money(o.total, lang, { decimals: true })}</td>
                        <td className="border-b border-line/60 px-3 py-2.5">
                          <StateText tone={TX_TONE[st]}>{t(`tx_${st}` as PKey)}</StateText>
                        </td>
                        <td className="whitespace-nowrap border-b border-line/60 py-2.5 pl-3 pr-5 text-muted sm:pr-6">{timeAgo(o.createdAt, lang)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-line/70 px-5 py-3 text-[12.5px] text-muted sm:px-6">{t('pilotNote')}</div>
        </Panel>
      )}
    </div>
  );
}
