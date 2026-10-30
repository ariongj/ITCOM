import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp, Plus, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { defineDict, useDict } from '@/i18n';
import { useDb } from '@/store/db';
import { cn, download } from '@/lib/utils';
import { IMPORT_TEMPLATE_HEAD, analyseImport, emptyMarketing, type CustomerRecord, type ImportRow } from './model';
import { ConsentSummary, LangChip } from './parts';
import { CHANNELS, snapshotCustomers, useCustomerStore, type Marketing } from './store';

const T = defineDict({
  me: {
    title: 'Uvoz kupaca (CSV)',
    description: 'Postojeći kupci se prepoznaju po e-mailu ili telefonu i ažuriraju (oznake, saglasnosti); ostali se dodaju kao novi.',
    drop: 'Izaberite CSV fajl ili ga prevucite ovdje',
    dropHint: 'UTF-8 · separator zarez ili tačka-zarez · prvi red = nazivi kolona',
    template: 'Preuzmi šablon',
    sample: 'Probaj sa primjerom',
    columns: 'Podržane kolone',
    note: 'Kupci koji su se odjavili sa marketinga neće biti ponovo prijavljeni uvozom.',
    change: 'Drugi fajl',
    sumNew: '{n} novih',
    sumUpdate: '{n} ažuriranja',
    sumError: '{n} sa greškom',
    recognized: 'Prepoznate kolone',
    unknown: 'Zanemarene kolone: {list}',
    col_line: 'Red',
    col_customer: 'Kupac',
    col_contact: 'Kontakt',
    col_city: 'Grad',
    col_tags: 'Oznake',
    col_marketing: 'Marketing',
    col_status: 'Rezultat',
    st_new: 'Novi kupac',
    st_update: 'Ažurira: {name}',
    err_noName: 'Nedostaje ime',
    err_noContact: 'Nedostaje e-mail ili telefon',
    err_badEmail: 'Neispravan e-mail',
    err_dupInFile: 'Duplikat u fajlu',
    empty: 'Fajl nema redova sa podacima.',
    cancel: 'Otkaži',
    import: 'Uvezi {n} kupaca',
    imported: 'Uvoz završen',
    importedText: '{a} novih, {b} ažurirano',
    undo: 'Poništi',
    readError: 'Fajl nije moguće pročitati',
  },
  sq: {
    title: 'Importo klientë (CSV)',
    description: 'Klientët ekzistues njihen sipas e-mailit ose telefonit dhe përditësohen (etiketat, pëlqimet); të tjerët shtohen si të rinj.',
    drop: 'Zgjidhni skedarin CSV ose tërhiqeni këtu',
    dropHint: 'UTF-8 · ndarës presje ose pikëpresje · rreshti i parë = emrat e kolonave',
    template: 'Shkarko shabllonin',
    sample: 'Provo me shembullin',
    columns: 'Kolonat e mbështetura',
    note: 'Klientët që janë çabonuar nga marketingu nuk abonohen sërish nga importi.',
    change: 'Skedar tjetër',
    sumNew: '{n} të rinj',
    sumUpdate: '{n} përditësime',
    sumError: '{n} me gabim',
    recognized: 'Kolonat e njohura',
    unknown: 'Kolona të injoruara: {list}',
    col_line: 'Rreshti',
    col_customer: 'Klienti',
    col_contact: 'Kontakti',
    col_city: 'Qyteti',
    col_tags: 'Etiketat',
    col_marketing: 'Marketingu',
    col_status: 'Rezultati',
    st_new: 'Klient i ri',
    st_update: 'Përditëson: {name}',
    err_noName: 'Mungon emri',
    err_noContact: 'Mungon e-maili ose telefoni',
    err_badEmail: 'E-mail i pavlefshëm',
    err_dupInFile: 'Dyfishim në skedar',
    empty: 'Skedari nuk ka rreshta me të dhëna.',
    cancel: 'Anulo',
    import: 'Importo {n} klientë',
    imported: 'Importi përfundoi',
    importedText: '{a} të rinj, {b} të përditësuar',
    undo: 'Zhbëj',
    readError: 'Skedari nuk mund të lexohet',
  },
  en: {
    title: 'Import customers (CSV)',
    description: 'Existing customers are matched by e-mail or phone and updated (tags, consent); everyone else is added as new.',
    drop: 'Choose a CSV file or drop it here',
    dropHint: 'UTF-8 · comma or semicolon separated · first row = column names',
    template: 'Download template',
    sample: 'Try with a sample',
    columns: 'Supported columns',
    note: 'Customers who unsubscribed from marketing are never re-subscribed by an import.',
    change: 'Another file',
    sumNew: '{n} new',
    sumUpdate: '{n} updates',
    sumError: '{n} with errors',
    recognized: 'Recognised columns',
    unknown: 'Ignored columns: {list}',
    col_line: 'Row',
    col_customer: 'Customer',
    col_contact: 'Contact',
    col_city: 'City',
    col_tags: 'Tags',
    col_marketing: 'Marketing',
    col_status: 'Result',
    st_new: 'New customer',
    st_update: 'Updates: {name}',
    err_noName: 'Missing name',
    err_noContact: 'Missing e-mail or phone',
    err_badEmail: 'Invalid e-mail',
    err_dupInFile: 'Duplicate in file',
    empty: 'The file has no data rows.',
    cancel: 'Cancel',
    import: 'Import {n} customers',
    imported: 'Import finished',
    importedText: '{a} new, {b} updated',
    undo: 'Undo',
    readError: 'The file could not be read',
  },
});

function sampleCsv(existing: CustomerRecord[]) {
  const known = [...existing].filter((c) => c.email && c.count > 0).sort((a, b) => b.spent - a.spent)[0];
  const rows = [
    IMPORT_TEMPLATE_HEAD.join(','),
    'Fjolla,Rexhepi,fjolla.rexhepi@example.com,+383 44 245 118,Mitrovicë,Rruga Bislim Bajgora 22,sq,progresive,yes,no',
    'Labinot,Kastrati,labinot.kastrati@example.com,+383 49 731 402,Vushtrri,Rruga Adem Jashari 9,sq,"familje;kontroll-vjetor",yes,yes',
    'Nikola,Petrović,nikola.petrovic@example.com,+383 45 118 240,Mitrovicë,Rruga Nëna Terezë 31,me,lente-kontakti,no,no',
    known ? `${known.firstName},${known.lastName},${known.email},,${known.city},,${known.lang},kontroll-vjetor,yes,` : '',
    'Jeta,Bytyqi,,,Prishtinë,,en,,yes,no',
    'Rinor,Zeka,rinor.zeka@example,+383 44 902 331,Skenderaj,,sq,,no,no',
  ].filter(Boolean);
  return rows.join('\n');
}

export function ImportModal({ open, onClose, customers }: { open: boolean; onClose: () => void; customers: CustomerRecord[] }) {
  const t = useDict(T, 'admin');
  const logAudit = useDb((s) => s.logAudit);
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const analysis = useMemo(() => (file ? analyseImport(file.text, customers, new Date().toISOString()) : null), [file, customers]);
  const rows = analysis?.rows ?? [];
  const counts = { new: rows.filter((r) => r.status === 'new').length, update: rows.filter((r) => r.status === 'update').length, error: rows.filter((r) => r.status === 'error').length };
  const valid = counts.new + counts.update;

  const close = () => {
    setFile(null);
    onClose();
  };
  const read = async (f: File | undefined) => {
    if (!f) return;
    try {
      setFile({ name: f.name, text: await f.text() });
    } catch {
      toast.error(t('readError'));
    }
  };
  const run = () => {
    const snap = snapshotCustomers();
    const items = rows
      .filter((r) => r.status !== 'error')
      .map((r) => {
        if (r.status === 'new') return { key: r.customer.key, customer: r.customer, tags: r.tags, marketing: r.marketing };
        // never re-subscribe someone who unsubscribed
        const marketing: Partial<Marketing> = {};
        for (const ch of CHANNELS) {
          const v = r.marketing[ch];
          if (v && !(v.status === 'subscribed' && r.match?.marketing[ch].status === 'unsubscribed')) marketing[ch] = v;
        }
        return { key: r.match!.key, tags: r.tags, marketing };
      });
    useCustomerStore.getState().addCustomers(items);
    logAudit({ action: 'create', object: 'customer', objectId: 'import', detail: `CSV ${file?.name ?? ''}: +${counts.new}, ~${counts.update}` });
    toast.success(t('imported'), {
      description: t('importedText', { a: counts.new, b: counts.update }),
      action: { label: t('undo'), onClick: () => useCustomerStore.getState().restore(snap) },
    });
    close();
  };

  const status = (r: ImportRow) =>
    r.status === 'error' ? (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-red-700">
        <XCircle className="h-3.5 w-3.5 shrink-0" /> {t(`err_${r.error!}`)}
      </span>
    ) : r.status === 'update' ? (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium text-ink-soft">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t('st_update', { name: r.match!.name })}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} /> {t('st_new')}
      </span>
    );

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title={t('title')}
      description={t('description')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={close}>
            {t('cancel')}
          </Button>
          {file && (
            <Button shape="rounded" size="sm" icon={<FileUp className="h-4 w-4" />} disabled={!valid} onClick={run}>
              {t('import', { n: valid })}
            </Button>
          )}
        </>
      }
    >
      <div className="p-5 sm:p-6">
        {!file ? (
          <div className="space-y-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                read(e.dataTransfer.files[0]);
              }}
              className={cn('flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors', drag ? 'border-ink bg-canvas' : 'border-line hover:border-ink/30 hover:bg-canvas/50')}
            >
              <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => read(e.target.files?.[0])} />
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink/[0.06] text-ink-soft">
                <FileSpreadsheet className="h-6 w-6" />
              </span>
              <span className="mt-3 text-[14.5px] font-semibold text-ink">{t('drop')}</span>
              <span className="mt-1 text-[12.5px] text-muted">{t('dropHint')}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" shape="rounded" size="sm" icon={<Download className="h-4 w-4" />} onClick={() => download('itcom-klientet-shabllon.csv', '﻿' + IMPORT_TEMPLATE_HEAD.join(',') + '\n', 'text/csv;charset=utf-8')}>
                {t('template')}
              </Button>
              <Button variant="outline" shape="rounded" size="sm" icon={<Sparkles className="h-4 w-4" />} onClick={() => setFile({ name: 'shembull.csv', text: sampleCsv(customers) })}>
                {t('sample')}
              </Button>
            </div>
            <div className="rounded-xl bg-canvas px-4 py-3">
              <div className="text-[12px] font-semibold text-muted">{t('columns')}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {IMPORT_TEMPLATE_HEAD.map((h) => (
                  <code key={h} className="rounded bg-white px-1.5 py-0.5 text-[11.5px] text-ink-soft ring-1 ring-line">
                    {h}
                  </code>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-muted">{t('note')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-muted" />
                <span className="truncate text-[14px] font-semibold text-ink">{file.name}</span>
              </div>
              <Button variant="ghost" shape="rounded" size="xs" onClick={() => setFile(null)}>
                {t('change')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-white">
                <Plus className="h-3.5 w-3.5" /> {t('sumNew', { n: counts.new })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.07] px-2.5 py-1 text-[12px] font-semibold text-ink">
                <RefreshCw className="h-3.5 w-3.5" /> {t('sumUpdate', { n: counts.update })}
              </span>
              {counts.error > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/15">
                  <XCircle className="h-3.5 w-3.5" /> {t('sumError', { n: counts.error })}
                </span>
              )}
            </div>
            {analysis && analysis.columns.length > 0 && (
              <div className="text-[12.5px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t('recognized')}:
                </span>{' '}
                {analysis.columns.join(', ')}
                {analysis.unknown.length > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t('unknown', { list: analysis.unknown.join(', ') })}
                  </div>
                )}
              </div>
            )}
            {rows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">{t('empty')}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-line bg-canvas/60 text-[12px] text-muted">
                      <th className="px-3 py-2 font-semibold">{t('col_line')}</th>
                      <th className="px-3 py-2 font-semibold">{t('col_customer')}</th>
                      <th className="px-3 py-2 font-semibold">{t('col_contact')}</th>
                      <th className="px-3 py-2 font-semibold">{t('col_city')}</th>
                      <th className="px-3 py-2 font-semibold">{t('col_tags')}</th>
                      <th className="px-3 py-2 font-semibold">{t('col_marketing')}</th>
                      <th className="px-3 py-2 font-semibold">{t('col_status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.line} className={cn('border-b border-line/70 last:border-0', r.status === 'error' && 'bg-red-50/40')}>
                        <td className="px-3 py-2 tabular-nums text-muted">{r.line}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink">{`${r.customer.firstName} ${r.customer.lastName}`.trim() || '—'}</span>
                            <LangChip lang={r.customer.lang} />
                          </div>
                        </td>
                        <td className="max-w-[220px] px-3 py-2">
                          <div className="truncate text-ink-soft">{r.customer.email || '—'}</div>
                          {r.customer.phone && <div className="text-[12px] tabular-nums text-muted">{r.customer.phone}</div>}
                        </td>
                        <td className="px-3 py-2 text-ink-soft">{r.customer.city || '—'}</td>
                        <td className="px-3 py-2 text-ink-soft">{r.tags.join(', ') || '—'}</td>
                        <td className="px-3 py-2">
                          <ConsentSummary marketing={{ ...emptyMarketing(), ...r.marketing }} />
                        </td>
                        <td className="max-w-[220px] px-3 py-2">{status(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[12.5px] text-muted">{t('note')}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
