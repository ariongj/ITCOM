// Online Store → Publikimi: writes the public part of the CMS to the live site (GitHub commit of js/cms-data.js),
// connects the order channel (orders, messages and bookings sent by every visitor's shop) and can load the live
// version into this browser for a second staff device. See src/lib/publish.ts.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CircleCheck, Copy, Download, ExternalLink, Inbox, KeyRound, RefreshCw, Rocket, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Card, PageHeader, confirmDialog } from '@/admin/components/kit';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { defineDict, interpolate, useDict } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { importShopRecords, type ShopRecords } from '@/store/outbox';
import { BASE } from '@/lib/paths';
import { timeAgo } from '@/lib/format';
import { CHANNEL_SCRIPT } from '@/lib/channel-script';
import {
  PublishError, SNAPSHOT_PATH, buildSnapshot, checkAccess, fetchChannel, fetchLiveSnapshot, publish, readConfig, saveConfig, snapshotScript,
  summarize, type PublishConfig, type PublishStep, type Snapshot,
} from '@/lib/publish';
import type { Booking, Db, Inquiry, Order } from '@/lib/types';

const en = {
  title: 'Publishing',
  intro: 'CMS changes are saved in this browser. Publish to show them to every visitor of the shop.',
  whatTitle: 'What gets published',
  whatDesc: 'Only public content. Orders, customers, messages, bookings, quotes, staff, costs and drafts stay in the CMS.',
  products: 'Active products', collections: 'Published collections', discounts: 'Active discounts', offers: 'Active campaigns',
  posts: 'Blog articles', pages: 'Info pages', placements: 'Banners and slides', services: 'Bookable services',
  codesWarn: 'Discount codes become readable in the site files: {codes}. Use codes you are happy to see shared.',
  noToken: 'Connect GitHub below to publish from here, or download the file and upload it to the repository.',
  publish: 'Publish now', publishing: 'Publishing…', download: 'Download cms-data.js', viewSite: 'Open the shop',
  last: 'Last published {when} by {by} · {size} KB', lastNone: 'Not published from this browser yet.',
  live: 'Live version: published {when} by {by}.', liveNone: 'The live site has no published content yet (it shows the built-in catalogue).',
  loadLive: 'Load the live version here', loadLiveTitle: 'Replace this browser’s public content with the live version?',
  loadLiveText: 'Products, prices, collections, discounts, campaigns, blog, pages, banners, menus and services are replaced. Orders, customers and messages stay.',
  loaded: 'The live version is now in this browser.',
  stepImage: 'Uploading images {done}/{total}…', stepData: 'Writing content to {branch}…',
  done: 'Published. GitHub Pages updates the site in 1–2 minutes; visitors may need up to 10 minutes because of caching.',
  ghTitle: 'GitHub connection', ghDesc: 'A fine-grained token with “Contents: Read and write” on this repository only. It is stored in this browser, never in the CMS data or the site.',
  owner: 'Owner', repo: 'Repository', branch: 'Live branch (GitHub Pages)', mirror: 'Also update branch (optional)',
  mirrorHint: 'The source branch, so the next code deploy keeps the content.',
  token: 'Token', tokenHint: 'github.com → Settings → Developer settings → Fine-grained tokens → only this repository → Contents: Read and write.',
  check: 'Check connection', checking: 'Checking…', saved: 'Saved in this browser.', ok: 'Connected: the token can write to {repo}.',
  errAuth: 'GitHub refused the token (expired, wrong or missing permission).', errRepo: 'Repository or branch not found.',
  errNoPush: 'The token can read but not write. Give it “Contents: Read and write”.', errNet: 'GitHub could not be reached: {msg}',
  chTitle: 'Order channel', chDesc: 'Without it, orders, messages and bookings stay in the visitor’s browser. With it, every one reaches you (Google Sheet + email) and you import them here.',
  endpoint: 'Web app URL (…/exec)', endpointHint: 'Published with the site, so the shop knows where to send. Must start with https://',
  key: 'Key', keyHint: 'The KEY from the script. Stays in this browser.', saveEndpoint: 'Save address', endpointSaved: 'Address saved. Publish so the shop starts sending.',
  fetch: 'Fetch orders', fetching: 'Fetching…', fetched: '{n} new records imported.', fetchedNone: 'Nothing new.',
  fetchErr: 'The channel did not answer: {msg}', script: 'Google Apps Script for the channel', copy: 'Copy script', copied: 'Copied.',
  badUrl: 'Enter an https:// address.',
};
const sq: typeof en = {
  title: 'Publikimi',
  intro: 'Ndryshimet në CMS ruhen në këtë shfletues. Publikoni që t’i shohë çdo vizitor i dyqanit.',
  whatTitle: 'Çfarë publikohet',
  whatDesc: 'Vetëm përmbajtja publike. Porositë, klientët, mesazhet, terminet, ofertat B2B, stafi, kostot dhe draftet mbeten në CMS.',
  products: 'Produkte aktive', collections: 'Koleksione të publikuara', discounts: 'Zbritje aktive', offers: 'Fushata aktive',
  posts: 'Artikuj blogu', pages: 'Faqe informuese', placements: 'Banerë dhe slajde', services: 'Shërbime për rezervim',
  codesWarn: 'Kodet e zbritjes bëhen të lexueshme në skedarët e faqes: {codes}. Përdorni kode që nuk ju shqetëson nëse ndahen.',
  noToken: 'Lidhni GitHub-in më poshtë për të publikuar nga këtu, ose shkarkoni skedarin dhe ngarkojeni në repository.',
  publish: 'Publiko tani', publishing: 'Duke publikuar…', download: 'Shkarko cms-data.js', viewSite: 'Hap dyqanin',
  last: 'Publikuar së fundi {when} nga {by} · {size} KB', lastNone: 'Ende pa publikim nga ky shfletues.',
  live: 'Versioni në faqe: publikuar {when} nga {by}.', liveNone: 'Faqja ende nuk ka përmbajtje të publikuar (shfaq katalogun bazë).',
  loadLive: 'Ngarko versionin e faqes këtu', loadLiveTitle: 'Të zëvendësohet përmbajtja publike e këtij shfletuesi me versionin e faqes?',
  loadLiveText: 'Zëvendësohen produktet, çmimet, koleksionet, zbritjet, fushatat, blogu, faqet, banerët, menutë dhe shërbimet. Porositë, klientët dhe mesazhet mbeten.',
  loaded: 'Versioni i faqes tani është në këtë shfletues.',
  stepImage: 'Duke ngarkuar fotot {done}/{total}…', stepData: 'Duke shkruar përmbajtjen në {branch}…',
  done: 'U publikua. GitHub Pages e përditëson faqen për 1–2 minuta; vizitorët mund ta shohin deri në 10 minuta për shkak të memories.',
  ghTitle: 'Lidhja me GitHub', ghDesc: 'Një token “fine-grained” me “Contents: Read and write” vetëm për këtë repository. Ruhet në këtë shfletues, kurrë në të dhënat e CMS-it ose në faqe.',
  owner: 'Pronari', repo: 'Repository', branch: 'Dega e faqes (GitHub Pages)', mirror: 'Përditëso edhe degën (opsionale)',
  mirrorHint: 'Dega burimore, që publikimi i ardhshëm i kodit ta ruajë përmbajtjen.',
  token: 'Token', tokenHint: 'github.com → Settings → Developer settings → Fine-grained tokens → vetëm ky repository → Contents: Read and write.',
  check: 'Kontrollo lidhjen', checking: 'Duke kontrolluar…', saved: 'U ruajt në këtë shfletues.', ok: 'Lidhja funksionon: tokeni mund të shkruajë në {repo}.',
  errAuth: 'GitHub nuk e pranoi tokenin (ka skaduar, është gabim ose i mungon leja).', errRepo: 'Repository ose dega nuk u gjet.',
  errNoPush: 'Tokeni lexon, por nuk shkruan. Jepini “Contents: Read and write”.', errNet: 'GitHub nuk u arrit: {msg}',
  chTitle: 'Kanali i porosive', chDesc: 'Pa të, porositë, mesazhet dhe terminet mbeten në shfletuesin e vizitorit. Me të, secila ju arrin (Google Sheet + email) dhe i importoni këtu.',
  endpoint: 'URL e Web app (…/exec)', endpointHint: 'Publikohet bashkë me faqen, që dyqani të dijë ku t’i dërgojë. Duhet të fillojë me https://',
  key: 'Çelësi', keyHint: 'KEY nga skripti. Mbetet në këtë shfletues.', saveEndpoint: 'Ruaj adresën', endpointSaved: 'Adresa u ruajt. Publikoni që dyqani të fillojë t’i dërgojë.',
  fetch: 'Merr porositë', fetching: 'Duke marrë…', fetched: 'U importuan {n} regjistrime të reja.', fetchedNone: 'Asgjë e re.',
  fetchErr: 'Kanali nuk u përgjigj: {msg}', script: 'Google Apps Script për kanalin', copy: 'Kopjo skriptin', copied: 'U kopjua.',
  badUrl: 'Shkruani një adresë https://',
};
const dict = defineDict({ me: en, sq, en });

const PUBLIC_KEYS = ['settings', 'categories', 'products', 'pages', 'posts', 'collections', 'discounts', 'offers', 'placements', 'menus', 'services'] as const;

export default function Publish() {
  const t = useDict(dict, 'admin');
  const can = useCan();
  const canPublish = can('onlineStore', 'publish') || can('settings', 'edit');
  const staff = useCurrentStaff();
  const by = staff?.name ?? 'Admin';
  const db = useDb() as unknown as Db;
  const updateSettings = useDb((s) => s.updateSettings);
  const logAudit = useDb((s) => s.logAudit);

  const [cfg, setCfg] = useState<PublishConfig>(readConfig);
  const set = (patch: Partial<PublishConfig>) => setCfg((c) => ({ ...c, ...patch }));
  const persist = (next = cfg) => saveConfig(next);

  const snapshot = useMemo(() => buildSnapshot(db, by), [db, by]);
  const sum = useMemo(() => summarize(snapshot.state), [snapshot]);
  const [busy, setBusy] = useState<'' | 'publish' | 'check' | 'fetch'>('');
  const [step, setStep] = useState('');
  const [live, setLive] = useState<Snapshot | null | undefined>(undefined);
  const [endpoint, setEndpoint] = useState(db.settings.orderEndpoint ?? '');
  const shopUrl = BASE;

  const loadLive = () => fetchLiveSnapshot(BASE).then(setLive);
  useEffect(() => { loadLive(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ghError = (e: unknown) => {
    if (e instanceof PublishError) {
      if (e.status === 401) return t('errAuth');
      if (e.status === 404 || e.message === 'not-found') return t('errRepo');
      if (e.message === 'no-push' || e.status === 403) return t('errNoPush');
      return interpolate(t('errNet'), { msg: e.message });
    }
    return interpolate(t('errNet'), { msg: e instanceof Error ? e.message : String(e) });
  };

  const onCheck = async () => {
    persist();
    setBusy('check');
    try {
      await checkAccess(cfg);
      toast.success(interpolate(t('ok'), { repo: `${cfg.owner}/${cfg.repo}` }));
    } catch (e) {
      toast.error(ghError(e));
    } finally {
      setBusy('');
    }
  };

  const onPublish = async () => {
    persist();
    setBusy('publish');
    try {
      const out = await publish(snapshot, cfg, BASE, (s: PublishStep) =>
        setStep(s.kind === 'image' ? interpolate(t('stepImage'), { done: s.done + 1, total: s.total }) : s.kind === 'data' ? interpolate(t('stepData'), { branch: s.branch }) : ''),
      );
      const next = { ...cfg, last: { at: new Date().toISOString(), by, url: out.commit.html_url, bytes: out.bytes, images: out.images } };
      setCfg(next);
      persist(next);
      logAudit({ action: 'publish', object: 'settings', objectId: 'site', detail: `${cfg.owner}/${cfg.repo}@${cfg.branch} · ${out.commit.sha.slice(0, 7)}` });
      toast.success(t('done'));
    } catch (e) {
      toast.error(ghError(e));
    } finally {
      setBusy('');
      setStep('');
    }
  };

  const onDownload = () => {
    const blob = new Blob([snapshotScript(snapshot)], { type: 'text/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cms-data.js';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const onLoadLive = async () => {
    if (!live) return;
    if (!(await confirmDialog({ title: t('loadLiveTitle'), text: t('loadLiveText'), confirmLabel: t('loadLive') }))) return;
    useDb.setState((s) => {
      const patch: Partial<Db> = {};
      for (const k of PUBLIC_KEYS) {
        if (k === 'settings') patch.settings = { ...s.settings, ...live.state.settings };
        else (patch as Record<string, unknown>)[k] = (live.state as unknown as Record<string, unknown>)[k];
      }
      return patch;
    });
    toast.success(t('loaded'));
  };

  const onSaveEndpoint = () => {
    const v = endpoint.trim();
    if (v && !/^https:\/\//.test(v)) { toast.error(t('badUrl')); return; }
    updateSettings({ orderEndpoint: v });
    persist();
    toast.success(t('endpointSaved'));
  };

  const onFetch = async () => {
    const url = (db.settings.orderEndpoint ?? '').trim();
    if (!/^https:\/\//.test(url)) { toast.error(t('badUrl')); return; }
    persist();
    setBusy('fetch');
    try {
      const recs = await fetchChannel(url, cfg.channelKey);
      const box: ShopRecords = { orders: [], inquiries: [], bookings: [] };
      for (const r of recs) {
        if (r.kind === 'order') box.orders!.push(r.record as Order);
        else if (r.kind === 'inquiry') box.inquiries!.push(r.record as Inquiry);
        else if (r.kind === 'booking') box.bookings!.push(r.record as { booking: Booking; inquiry: Inquiry });
      }
      const n = importShopRecords(box);
      toast[n ? 'success' : 'message'](n ? interpolate(t('fetched'), { n }) : t('fetchedNone'));
    } catch (e) {
      toast.error(interpolate(t('fetchErr'), { msg: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy('');
    }
  };

  const copyScript = () => navigator.clipboard?.writeText(CHANNEL_SCRIPT).then(() => toast.success(t('copied')));
  const hasToken = !!cfg.token.trim();
  const counts: [keyof typeof en, number][] = [
    ['products', sum.products], ['collections', sum.collections], ['discounts', sum.discounts], ['offers', sum.offers],
    ['posts', sum.posts], ['pages', sum.pages], ['placements', sum.placements], ['services', sum.services],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('title')}
        description={t('intro')}
        actions={
          <a href={shopUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-ink-soft ring-1 ring-line hover:bg-ink/[0.04] hover:text-ink">
            <ExternalLink className="h-3.5 w-3.5" /> {t('viewSite')}
          </a>
        }
      />

      <div className="grid gap-5">
        <Card title={t('whatTitle')} description={t('whatDesc')}>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            {counts.map(([k, n]) => (
              <div key={k} className="rounded-lg bg-canvas px-3 py-2.5">
                <dt className="text-[12px] text-muted">{t(k)}</dt>
                <dd className="text-[20px] font-semibold tabular-nums text-ink">{n}</dd>
              </div>
            ))}
          </dl>
          {sum.codes.length > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {interpolate(t('codesWarn'), { codes: sum.codes.join(', ') })}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Rocket className="h-4 w-4" />} loading={busy === 'publish'} disabled={!hasToken || !canPublish || !!busy} onClick={onPublish}>
              {busy === 'publish' ? t('publishing') : t('publish')}
            </Button>
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={onDownload}>
              {t('download')}
            </Button>
            {step && <span className="text-[13px] text-muted" aria-live="polite">{step}</span>}
          </div>
          {!hasToken && <p className="mt-3 text-[13px] text-muted">{t('noToken')} <code className="font-mono text-[12px]">{SNAPSHOT_PATH}</code></p>}
          <p className="mt-3 text-[13px] text-muted">
            {cfg.last ? (
              <>
                <CircleCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />
                {interpolate(t('last'), { when: timeAgo(cfg.last.at, 'sq'), by: cfg.last.by, size: Math.round(cfg.last.bytes / 1024) })}{' '}
                <a href={cfg.last.url} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">commit</a>
              </>
            ) : (
              t('lastNone')
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-muted">
            {live === undefined ? null : live ? (
              <span>{interpolate(t('live'), { when: timeAgo(live.publishedAt, 'sq'), by: live.by })}</span>
            ) : (
              <span>{t('liveNone')}</span>
            )}
            <button type="button" onClick={loadLive} className="inline-flex items-center gap-1 font-semibold text-ink-soft hover:text-ink">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            {live && (
              <Button variant="ghost" size="sm" onClick={onLoadLive}>
                {t('loadLive')}
              </Button>
            )}
          </div>
        </Card>

        <Card title={t('ghTitle')} description={t('ghDesc')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t('owner')} value={cfg.owner} onChange={(e) => set({ owner: e.target.value.trim() })} onBlur={() => persist()} />
            <Input label={t('repo')} value={cfg.repo} onChange={(e) => set({ repo: e.target.value.trim() })} onBlur={() => persist()} />
            <Input label={t('branch')} value={cfg.branch} onChange={(e) => set({ branch: e.target.value.trim() })} onBlur={() => persist()} />
            <Input label={t('mirror')} hint={t('mirrorHint')} value={cfg.mirrorBranch} onChange={(e) => set({ mirrorBranch: e.target.value.trim() })} onBlur={() => persist()} />
            <Input
              wrapClassName="sm:col-span-2"
              label={t('token')}
              hint={t('tokenHint')}
              type="password"
              autoComplete="off"
              spellCheck={false}
              leading={<KeyRound className="h-4 w-4" />}
              value={cfg.token}
              onChange={(e) => set({ token: e.target.value })}
              onBlur={() => persist()}
              placeholder="github_pat_…"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" loading={busy === 'check'} disabled={!hasToken || !!busy} onClick={onCheck}>
              {busy === 'check' ? t('checking') : t('check')}
            </Button>
          </div>
        </Card>

        <Card title={t('chTitle')} description={t('chDesc')}>
          {!db.settings.orderEndpoint && (
            <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {t('chDesc')}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Input label={t('endpoint')} hint={t('endpointHint')} value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
            <Input label={t('key')} hint={t('keyHint')} type="password" autoComplete="off" value={cfg.channelKey} onChange={(e) => set({ channelKey: e.target.value })} onBlur={() => persist()} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={onSaveEndpoint} disabled={endpoint.trim() === (db.settings.orderEndpoint ?? '')}>
              {t('saveEndpoint')}
            </Button>
            <Button variant="primary" icon={<Inbox className="h-4 w-4" />} loading={busy === 'fetch'} disabled={!db.settings.orderEndpoint || !!busy} onClick={onFetch}>
              {busy === 'fetch' ? t('fetching') : t('fetch')}
            </Button>
          </div>
          <details className="mt-5 rounded-lg border border-line">
            <summary className="cursor-pointer px-4 py-3 text-[13.5px] font-semibold text-ink">{t('script')}</summary>
            <div className="border-t border-line p-4">
              <Button variant="ghost" size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={copyScript}>
                {t('copy')}
              </Button>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-ink-soft">{CHANNEL_SCRIPT}</pre>
            </div>
          </details>
        </Card>
      </div>
    </div>
  );
}
