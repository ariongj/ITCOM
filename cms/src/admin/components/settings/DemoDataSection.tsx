import { useMemo, useRef, type ChangeEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Download, HardDrive, Megaphone, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { confirmDialog } from '@/admin/components/kit';
import { useDict, useLang } from '@/i18n';
import { DATA_KEYS, useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { dateTime, num } from '@/lib/format';
import type { Db, Settings } from '@/lib/types';
import { cn, download } from '@/lib/utils';
import { T } from './i18n';
import { S } from './strings';
import { ToggleRow } from './fields';
import type { SecProps } from './model';
import { Block, Gate, Panel } from './ui';

/** Lists every export must contain (v1 shape — older backups stay importable; v2 lists are filled from fresh demo data). */
const ARRAY_KEYS = ['categories', 'products', 'orders', 'inquiries', 'coupons', 'pages', 'posts', 'projects', 'media', 'home'] as const;
/** Rough localStorage budget of mainstream browsers (characters). */
const QUOTA = 5 * 1024 * 1024;

/** The persisted data only (no store actions). */
function snapshot(): Db {
  const s = useDb.getState();
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as Db;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Basic shape check of an exported file; returns a Db ready for importDb() or null. */
function validate(x: unknown, current: Db): Db | null {
  if (!isObj(x) || !isObj(x.settings) || typeof x.settings.companyName !== 'string') return null;
  for (const k of ARRAY_KEYS) if (!Array.isArray(x[k])) return null;
  const withIds = (list: unknown) => (list as unknown[]).every((it) => isObj(it) && typeof it.id === 'string');
  if (!withIds(x.products) || !withIds(x.categories) || !withIds(x.orders)) return null;
  return {
    ...(x as unknown as Db),
    // Older exports may miss newer settings keys — keep current values for those.
    settings: { ...current.settings, ...(x.settings as Partial<Settings>) },
    seededAt: typeof x.seededAt === 'string' ? x.seededAt : new Date().toISOString(),
    version: current.version,
  };
}

/** Size of the persisted data (characters) — the serialized snapshot is the source of truth right after seeding. */
function storageUsed(): number {
  let stored = 0;
  try {
    stored = window.localStorage.getItem('itcom-cms-db')?.length ?? 0;
  } catch {
    /* storage unavailable */
  }
  return Math.max(stored, JSON.stringify(snapshot()).length);
}

function fmtSize(chars: number, lang: ReturnType<typeof useLang>) {
  const kb = chars / 1024;
  return kb < 1024 ? `${num(Math.round(kb), lang)} KB` : `${num(kb / 1024, lang, 1)} MB`;
}

function ActionRow({ icon, title, text, action, danger }: { icon: ReactNode; title: ReactNode; text: ReactNode; action: ReactNode; danger?: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset', danger ? 'bg-red-50 text-red-600 ring-red-600/10' : 'bg-[#f3f3f3] text-ink-soft ring-black/[0.05]')}>{icon}</span>
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-ink">{title}</div>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{text}</p>
        </div>
      </div>
      <div className="shrink-0 pl-12 sm:pl-0">{action}</div>
    </div>
  );
}

export function DemoDataSection({ s, set, readOnly, onReplaced }: SecProps & { onReplaced: (settings: Settings) => void }) {
  const t = useDict(T, 'admin');
  const ts = useDict(S, 'admin');
  const lang = useLang('admin');
  const allow = useCan();
  const products = useDb((st) => st.products);
  const orders = useDb((st) => st.orders);
  const inquiries = useDb((st) => st.inquiries);
  const media = useDb((st) => st.media);
  const audit = useDb((st) => st.audit);
  const settings = useDb((st) => st.settings);
  const seededAt = useDb((st) => st.seededAt);
  const resetDemo = useDb((st) => st.resetDemo);
  const importDb = useDb((st) => st.importDb);
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-measured whenever the persisted data changes.
  const used = useMemo(() => storageUsed(), [products, orders, inquiries, media, settings, seededAt, audit]); // eslint-disable-line react-hooks/exhaustive-deps
  const pct = Math.min(100, (used / QUOTA) * 100);
  const canExport = allow('settings', 'export');
  const canImport = allow('settings', 'import');
  const canReset = allow('settings', 'delete');

  const stats = [
    { label: t('stat_products'), value: products.length },
    { label: t('stat_orders'), value: orders.length },
    { label: t('stat_inquiries'), value: inquiries.length },
    { label: t('stat_media'), value: media.length },
  ];

  const onExport = () => {
    download(`itcom-cms-demo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(snapshot(), null, 2));
    toast.success(t('exportDone'));
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      toast.error(t('importReadError'));
      return;
    }
    const data = validate(parsed, snapshot());
    if (!data) {
      toast.error(t('importInvalid'));
      return;
    }
    const ok = await confirmDialog({ title: t('importConfirmTitle'), text: t('importConfirmText', { file: file.name }), confirmLabel: t('importConfirmBtn'), danger: false });
    if (!ok) return;
    importDb(data);
    onReplaced(useDb.getState().settings);
    toast.success(t('importDone'), { description: t('importDoneText', { products: data.products.length, orders: data.orders.length }) });
  };

  const onReset = async () => {
    const ok = await confirmDialog({ title: t('resetConfirmTitle'), text: t('resetConfirmText'), confirmLabel: t('resetConfirmBtn'), danger: true });
    if (!ok) return;
    resetDemo();
    onReplaced(useDb.getState().settings);
    toast.success(t('resetDone'));
  };

  return (
    <Panel lead title={ts('sec_data')} description={ts('sec_data_d')}>
      <Block>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((x) => (
            <div key={x.label} className="rounded-lg border border-line px-4 py-3">
              <div className="text-[22px] font-bold tabular-nums tracking-tight text-ink">{num(x.value, lang)}</div>
              <div className="text-[12px] font-medium text-muted">{x.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[12.5px]">
            <span className="inline-flex items-center gap-2 font-semibold text-ink-soft">
              <HardDrive className="h-3.5 w-3.5 text-muted" /> {t('storage')}
            </span>
            <span className="tabular-nums text-muted">
              {fmtSize(used, lang)} / {fmtSize(QUOTA, lang)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className={cn('h-full rounded-full transition-[width] duration-500', pct > 75 ? 'bg-amber-500' : 'bg-ink/70')} style={{ width: `${Math.max(pct, 1.5)}%` }} />
          </div>
          <p className="mt-2 text-[12px] text-muted">
            {t('generated', { date: dateTime(seededAt, lang) })} · {t('localNote')}
          </p>
        </div>
      </Block>

      <Block>
        <div className="divide-y divide-line/70 rounded-lg border border-line">
          <ActionRow
            icon={<Download className="h-[17px] w-[17px]" />}
            title={t('export_t')}
            text={t('export_d')}
            action={
              <Gate allowed={canExport} reason={ts('noPermission')}>
                <Button variant="outline" size="sm" shape="rounded" icon={<Download className="h-4 w-4" />} disabled={!canExport} onClick={onExport}>
                  {t('export')}
                </Button>
              </Gate>
            }
          />
          <ActionRow
            icon={<Upload className="h-[17px] w-[17px]" />}
            title={t('import_t')}
            text={t('import_d')}
            action={
              <Gate allowed={canImport} reason={ts('noPermission')}>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
                <Button variant="outline" size="sm" shape="rounded" icon={<Upload className="h-4 w-4" />} disabled={!canImport} onClick={() => fileRef.current?.click()}>
                  {t('import')}
                </Button>
              </Gate>
            }
          />
          <ActionRow
            danger
            icon={<RotateCcw className="h-[17px] w-[17px]" />}
            title={t('reset_t')}
            text={t('reset_d')}
            action={
              <Gate allowed={canReset} reason={ts('noPermission')}>
                <Button variant="outline" size="sm" shape="rounded" icon={<RotateCcw className="h-4 w-4 text-red-600" />} disabled={!canReset} onClick={() => void onReset()}>
                  <span className="text-red-700">{t('reset')}</span>
                </Button>
              </Gate>
            }
          />
        </div>
      </Block>

      <Block>
        <ToggleRow icon={<Megaphone className="h-[18px] w-[18px]" />} title={t('demoBanner')} description={t('demoBanner_d')} checked={s.demoBanner} disabled={readOnly} onChange={(v) => set('demoBanner', v)} />
      </Block>
    </Panel>
  );
}
