import { useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, Download, FileSpreadsheet, FileUp, MinusCircle, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { useDict, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCategories } from '@/store/hooks';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { pd, type PdKey } from './dict';
import { parseCsv, type ParsedCsv } from './csv';
import { downloadTemplate } from './exporter';
import { IMPORT_FIELDS, SAMPLE_CSV, autoMap, buildProduct, validateRows, type ImportOptions, type ImportRow, type Issue, type MappedField } from './importer';
import { Segmented, SelectInput } from './parts';
import type { ProductX } from './model';

type Step = 1 | 2 | 3;
const PREVIEW_ROWS = 60;

export function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported?: (r: { created: number; updated: number }) => void }) {
  const t = useDict(pd, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const products = useDb((s) => s.products) as ProductX[];
  const categories = useCategories();
  const [step, setStep] = useState<Step>(1);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [mapping, setMapping] = useState<MappedField[]>([]);
  const [opts, setOpts] = useState<ImportOptions>({ onExisting: 'update', newStatus: 'draft' });
  const file = useRef<HTMLInputElement>(null);

  const parsed: ParsedCsv | null = useMemo(() => (text.trim() ? parseCsv(text) : null), [text]);
  const rows = useMemo(() => (parsed && step === 3 ? validateRows(parsed.rows, mapping, products, categories, opts) : []), [parsed, step, mapping, products, categories, opts]);

  const reset = () => {
    setStep(1);
    setText('');
    setFileName(null);
    setMapping([]);
    setOpts({ onExisting: 'update', newStatus: 'draft' });
  };
  const close = () => {
    onClose();
    window.setTimeout(reset, 300);
  };

  const load = (content: string, name: string | null) => {
    setText(content);
    setFileName(name);
    const p = parseCsv(content);
    setMapping(autoMap(p.headers));
  };
  const readFile = (f: File | undefined) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => load(String(r.result ?? ''), f.name);
    r.onerror = () => toast.error(t('imp_readError'));
    r.readAsText(f, 'utf-8');
  };

  const mapped = new Set(mapping);
  const canMap = mapped.has('name_sq') || mapped.has('name_en') || mapped.has('name_me');
  const canStep2 = canMap && mapped.has('price');
  const sum = {
    create: rows.filter((r) => r.action === 'create').length,
    update: rows.filter((r) => r.action === 'update').length,
    skip: rows.filter((r) => r.action === 'skip' && !r.errors.length).length,
    errors: rows.filter((r) => r.errors.length).length,
  };
  const importable = sum.create + sum.update;

  const run = () => {
    const st = useDb.getState();
    const all: { id: string; slug: string }[] = st.products.map((p) => ({ id: p.id, slug: p.slug }));
    let created = 0;
    let updated = 0;
    for (const r of rows) {
      if (r.action === 'skip') continue;
      const p = buildProduct(r, opts, categories, all);
      st.upsertProduct(p);
      all.push({ id: p.id, slug: p.slug });
      if (r.action === 'create') created++;
      else updated++;
    }
    toast.success(t('imp_done', { c: created, u: updated }), {
      description: created ? t('imp_doneHint') : undefined,
      action: created && onImported ? { label: t('imp_showDrafts'), onClick: () => onImported({ created, updated }) } : undefined,
    });
    close();
  };

  const fieldLabel = (f: MappedField) => (f === 'ignore' ? t('imp_ignore') : t(`fld_${f}` as PdKey));

  const footer = (
    <>
      {step > 1 && (
        <Button variant="outline" shape="rounded" size="sm" onClick={() => setStep((s) => (s - 1) as Step)} className="mr-auto">
          {t('imp_back')}
        </Button>
      )}
      <Button variant="outline" shape="rounded" size="sm" onClick={close}>
        {ta('cancel')}
      </Button>
      {step === 1 && (
        <Button shape="rounded" size="sm" disabled={!parsed?.rows.length} onClick={() => setStep(2)} iconRight={<ArrowRight className="h-4 w-4" />}>
          {t('imp_next')}
        </Button>
      )}
      {step === 2 && (
        <Button shape="rounded" size="sm" disabled={!canStep2} onClick={() => setStep(3)} iconRight={<ArrowRight className="h-4 w-4" />}>
          {t('imp_next')}
        </Button>
      )}
      {step === 3 && (
        <Button shape="rounded" size="sm" disabled={!importable} onClick={run} icon={<FileUp className="h-4 w-4" />}>
          {importable ? t('imp_confirm', { n: importable }) : t('imp_nothing')}
        </Button>
      )}
    </>
  );

  return (
    <Modal open={open} onClose={close} size="xl" title={t('imp_title')} description={t('imp_desc')} footer={footer}>
      {/* steps */}
      <ol className="flex items-center gap-2 border-b border-line/70 px-6 py-3 text-[12.5px]">
        {([1, 2, 3] as Step[]).map((s, i) => (
          <li key={s} className="flex min-w-0 items-center gap-2">
            {i > 0 && <span className="h-px w-5 shrink-0 bg-line sm:w-10" />}
            <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold', step >= s ? 'bg-ink text-white' : 'bg-ink/[0.08] text-muted')}>{step > s ? '✓' : s}</span>
            <span className={cn('truncate font-semibold', step === s ? 'text-ink' : 'text-muted max-sm:hidden')}>{t(`imp_step${s}` as PdKey)}</span>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-4 p-6">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              readFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
              drag ? 'border-ink bg-ink/[0.03]' : 'border-line hover:border-ink/30 hover:bg-canvas/50',
            )}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-canvas text-ink-soft ring-1 ring-line">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <span className="text-[14px] font-semibold text-ink">{fileName ?? t('imp_drop')}</span>
            <span className="text-[12.5px] text-muted">{t('imp_dropHint')}</span>
            <input
              ref={file}
              type="file"
              accept=".csv,text/csv,.txt"
              className="sr-only"
              onChange={(e) => {
                readFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>

          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-ink-soft">{t('imp_paste')}</span>
              <span className="flex gap-1.5">
                <Button variant="outline" shape="rounded" size="xs" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadTemplate(t, lang)}>
                  {t('imp_template')}
                </Button>
                <Button variant="outline" shape="rounded" size="xs" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => load(SAMPLE_CSV, 'optika-shembull.csv')}>
                  {t('imp_sample')}
                </Button>
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => load(e.target.value, null)}
              rows={7}
              spellCheck={false}
              placeholder={'Emri;SKU;Kategoria;Çmimi;Stoku\nKornizë optike Aria A03;OM-ARI-A03;Syze optike;149,00;8'}
              className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink outline-none transition placeholder:text-muted/50 focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
            />
          </div>

          {parsed && (
            <div className={cn('flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[13px]', parsed.rows.length ? 'bg-canvas text-ink-soft' : 'bg-amber-50 text-amber-900')}>
              {parsed.rows.length ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <div className="min-w-0">
                <div className="font-semibold">{parsed.rows.length ? t('imp_detected', { rows: parsed.rows.length, cols: parsed.headers.length, sep: parsed.delimiter === '\t' ? 'TAB' : parsed.delimiter }) : t('imp_noRows')}</div>
                {parsed.headers.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {parsed.headers.map((h, i) => (
                      <span key={i} className="rounded-md bg-white px-1.5 py-0.5 text-[11.5px] text-ink-soft ring-1 ring-line">
                        {h || '—'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && parsed && (
        <div className="space-y-5 p-6">
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-canvas/70 text-[12px] font-semibold text-muted">
                  <th className="px-4 py-2.5">{t('imp_csvColumn')}</th>
                  <th className="px-4 py-2.5 max-sm:hidden">{t('imp_example')}</th>
                  <th className="w-[44%] px-4 py-2.5">{t('imp_field')}</th>
                </tr>
              </thead>
              <tbody>
                {parsed.headers.map((h, i) => {
                  const example = parsed.rows.map((r) => r[i]).find((v) => v) ?? '';
                  const f = mapping[i] ?? 'ignore';
                  return (
                    <tr key={i} className="border-t border-line/70">
                      <td className="px-4 py-2 font-semibold text-ink">{h || `#${i + 1}`}</td>
                      <td className="max-w-[220px] truncate px-4 py-2 text-muted max-sm:hidden" title={example}>
                        {example || '—'}
                      </td>
                      <td className="px-4 py-1.5">
                        <SelectInput
                          size="sm"
                          value={f}
                          active={f !== 'ignore'}
                          onChange={(e) => {
                            const v = e.target.value as MappedField;
                            setMapping((m) => m.map((x, k) => (k === i ? v : v !== 'ignore' && x === v ? 'ignore' : x)));
                          }}
                          aria-label={h}
                        >
                          <option value="ignore">{t('imp_ignore')}</option>
                          {IMPORT_FIELDS.map((fl) => (
                            <option key={fl} value={fl}>
                              {fieldLabel(fl)}
                            </option>
                          ))}
                        </SelectInput>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!canStep2 && (
            <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-[13px] font-medium text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {t('imp_required')}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t('imp_existing')}</div>
              <Segmented
                value={opts.onExisting}
                onChange={(onExisting) => setOpts((o) => ({ ...o, onExisting }))}
                options={[
                  { id: 'update', label: t('imp_update'), icon: <RefreshCw className="h-3.5 w-3.5" /> },
                  { id: 'skip', label: t('imp_skip'), icon: <MinusCircle className="h-3.5 w-3.5" /> },
                ]}
                className="max-w-full flex-wrap"
              />
            </div>
            <div>
              <div className="mb-2 text-[13px] font-semibold text-ink-soft">{t('imp_newStatus')}</div>
              <Segmented
                value={opts.newStatus}
                onChange={(newStatus) => setOpts((o) => ({ ...o, newStatus }))}
                options={[
                  { id: 'draft', label: t('imp_asDraft') },
                  { id: 'column', label: t('imp_fromColumn') },
                ]}
                className="max-w-full flex-wrap"
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile label={t('imp_sumNew')} value={sum.create} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
            <Tile label={t('imp_sumUpdate')} value={sum.update} icon={<RefreshCw className="h-4 w-4 text-ink-soft" />} />
            <Tile label={t('imp_sumSkip')} value={sum.skip} icon={<MinusCircle className="h-4 w-4 text-muted" />} />
            <Tile label={t('imp_sumErrors')} value={sum.errors} icon={<XCircle className={cn('h-4 w-4', sum.errors ? 'text-red-600' : 'text-muted')} />} />
          </div>

          <DuplicateReport rows={rows} opts={opts} />

          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="bg-canvas/70 text-[12px] font-semibold text-muted">
                  <th className="w-14 px-3 py-2.5">{t('imp_colLine')}</th>
                  <th className="w-[124px] px-3 py-2.5">{t('imp_colResult')}</th>
                  <th className="px-3 py-2.5">{t('fld_name_sq')}</th>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5 text-right">{t('fld_price')}</th>
                  <th className="px-3 py-2.5">{t('imp_colNote')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((r) => (
                  <tr key={r.line} className={cn('border-t border-line/70 align-top', r.errors.length > 0 && 'bg-red-50/40')}>
                    <td className="px-3 py-2 tabular-nums text-muted">{r.line}</td>
                    <td className="px-3 py-2">
                      <ResultLabel row={r} />
                    </td>
                    <td className="max-w-[220px] px-3 py-2 font-medium text-ink">
                      <span className="line-clamp-2">{r.name || '—'}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-soft">{r.sku || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.price != null ? money(r.price, lang) : '—'}</td>
                    <td className="px-3 py-2 text-[12.5px]">
                      <IssueList issues={r.errors} tone="error" />
                      <IssueList issues={r.warnings} tone="warn" />
                      {!r.errors.length && !r.warnings.length && <span className="text-muted">{t('imp_ok')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > PREVIEW_ROWS && <div className="border-t border-line/70 px-4 py-2 text-[12.5px] text-muted">{t('imp_moreRows', { n: rows.length - PREVIEW_ROWS })}</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Tile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-3">
      <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-muted">
        {label}
        {icon}
      </div>
      <div className="mt-1 text-[22px] font-bold tabular-nums leading-none text-ink">{value}</div>
    </div>
  );
}

function ResultLabel({ row }: { row: ImportRow }) {
  const t = useDict(pd, 'admin');
  const base = 'inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold';
  if (row.errors.length)
    return (
      <span className={cn(base, 'text-red-700')}>
        <XCircle className="h-3.5 w-3.5" /> {t('imp_res_error')}
      </span>
    );
  if (row.action === 'create')
    return (
      <span className={cn(base, 'text-emerald-800')}>
        <CheckCircle2 className="h-3.5 w-3.5" /> {t('imp_res_create')}
      </span>
    );
  if (row.action === 'update')
    return (
      <span className={cn(base, 'text-ink')}>
        <RefreshCw className="h-3.5 w-3.5" /> {t('imp_res_update')}
      </span>
    );
  return (
    <span className={cn(base, 'text-muted')}>
      <MinusCircle className="h-3.5 w-3.5" /> {t('imp_res_skip')}
    </span>
  );
}

function IssueList({ issues, tone }: { issues: Issue[]; tone: 'error' | 'warn' }) {
  const t = useDict(pd, 'admin');
  if (!issues.length) return null;
  const label = (i: Issue) => t(`issue_${i.code}` as PdKey, { value: i.value ?? '', field: i.field ? t(`fld_${i.field}` as PdKey) : '' });
  return (
    <ul className={cn('space-y-0.5', tone === 'error' ? 'text-red-700' : 'text-amber-800')}>
      {issues.map((i, k) => (
        <li key={k} className="flex items-start gap-1">
          {tone === 'error' ? <XCircle className="mt-0.5 h-3 w-3 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />}
          {label(i)}
        </li>
      ))}
    </ul>
  );
}

/** Duplicate-SKU report: repeats inside the file + SKUs that already exist in the catalogue. */
function DuplicateReport({ rows, opts }: { rows: ImportRow[]; opts: ImportOptions }) {
  const t = useDict(pd, 'admin');
  const inFile = rows.filter((r) => r.dupOfLine);
  const inCatalog = rows.filter((r) => r.existing && !r.dupOfLine);
  const none = !inFile.length && !inCatalog.length;
  return (
    <div className={cn('rounded-xl border px-4 py-3.5', none ? 'border-line bg-white' : 'border-amber-600/20 bg-amber-50/60')}>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Copy className="h-4 w-4 text-muted" />
        {t('imp_dupReport')}
        {!none && <span className="rounded-md bg-white px-1.5 text-[11px] tabular-nums ring-1 ring-line">{inFile.length + inCatalog.length}</span>}
      </div>
      {none ? (
        <p className="mt-1 text-[12.5px] text-muted">{t('imp_noDups')}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-[12.5px] text-ink-soft">
          {inFile.map((r) => (
            <li key={`f${r.line}`} className="flex items-start gap-1.5">
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              {t('imp_dupInFile', { sku: r.sku, a: r.dupOfLine ?? '', b: r.line })}
            </li>
          ))}
          {inCatalog.map((r) => (
            <li key={`c${r.line}`} className="flex items-start gap-1.5">
              <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" />
              {t('imp_dupInCatalog', { sku: r.sku, name: r.existing?.name.sq || r.existing?.name.me || '', action: opts.onExisting === 'update' ? t('imp_actUpdate') : t('imp_actSkip') })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
