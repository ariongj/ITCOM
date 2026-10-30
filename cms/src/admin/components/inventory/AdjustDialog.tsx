// "Korrigjo stokun" (PDF p.15): every change needs a reason and creates a movement (adjustStock).
// A second tab edits blocked units (Të bllokuara) — they stay on hand but cannot be sold.
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, Lock, PackageOpen } from 'lucide-react';
import { Modal } from '@/components/ui/Overlay';
import { Button } from '@/components/ui/Button';
import { Thumb } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { MovementReason } from '@/lib/types';
import { num } from '@/lib/format';
import { cn } from '@/lib/utils';
import { inv } from './dict';
import { ADJUST_REASONS, stockUnit } from './helpers';
import type { InvRow } from './useInventory';
import { DeltaQty, FieldLabel, IntField, Segmented, SelectField, controlClass } from './ui';

type Tab = 'onHand' | 'blocked';
type Mode = 'by' | 'set';

function PreviewRow({ label, from, to, unit, strong }: { label: ReactNode; from: number; to: number; unit: string; strong?: boolean }) {
  const lang = useLang('admin');
  const changed = from !== to;
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13.5px]">
      <span className={cn('text-muted', strong && 'font-semibold text-ink-soft')}>{label}</span>
      <span className="flex items-center gap-2 tabular-nums">
        <span className={cn(changed ? 'text-muted line-through decoration-ink/30' : 'font-semibold text-ink')}>{num(from, lang)}</span>
        {changed && (
          <>
            <ArrowRight className="h-3.5 w-3.5 text-muted" />
            <span className={cn('font-bold text-ink', strong && 'text-[15px]')}>
              {num(to, lang)} <span className="text-[12px] font-medium text-muted">{unit}</span>
            </span>
          </>
        )}
      </span>
    </div>
  );
}

export function AdjustDialog({ row, locationName, onClose }: { row: InvRow | undefined; locationName?: string; onClose: () => void }) {
  const t = useDict(inv, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const adjustStock = useDb((s) => s.adjustStock);
  const upsertProduct = useDb((s) => s.upsertProduct);
  const logAudit = useDb((s) => s.logAudit);

  const [forId, setForId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('onHand');
  const [mode, setMode] = useState<Mode>('by');
  const [qty, setQty] = useState<number | null>(null);
  const [reason, setReason] = useState<MovementReason>('correction');
  const [note, setNote] = useState('');
  const [blocked, setBlocked] = useState<number | null>(0);

  // Fresh form each time the dialog opens for a product.
  if (row && row.p.id !== forId) {
    setForId(row.p.id);
    setTab('onHand');
    setMode('by');
    setQty(null);
    setReason('correction');
    setNote('');
    setBlocked(row.lv.unavailable);
  }
  const close = () => {
    setForId(null);
    onClose();
  };

  const allowed = can('inventory', 'edit');
  const p = row?.p;
  const lv = row?.lv;
  const unit = p ? stockUnit(p, lang) : '';

  // On-hand tab
  const newOnHand = lv ? (mode === 'by' ? lv.onHand + (qty ?? 0) : (qty ?? lv.onHand)) : 0;
  const delta = lv ? newOnHand - lv.onHand : 0;
  const belowCommitted = !!lv && newOnHand < lv.committed;
  const newStock = p ? p.stock + delta : 0;
  const newAvailable = lv ? Math.max(0, newStock - lv.unavailable) : 0;
  const onHandValid = !!lv && delta !== 0 && !belowCommitted;

  // Blocked tab
  const maxBlocked = p ? p.stock : 0;
  const blockedVal = blocked ?? 0;
  const blockedValid = !!lv && blocked != null && blockedVal >= 0 && blockedVal <= maxBlocked && blockedVal !== lv.unavailable;

  const save = () => {
    if (!p || !lv || !allowed) return;
    if (tab === 'onHand') {
      if (!onHandValid) return;
      const mv = adjustStock(p.id, delta, reason, note.trim() || undefined);
      if (!mv) return;
      toast.success(t('adj_saved'), { description: `${p.sku} · ${t('col_onHand')} ${num(lv.onHand, lang)} → ${num(lv.onHand + mv.delta, lang)} (${t(`r_${reason}`)})` });
    } else {
      if (!blockedValid) return;
      upsertProduct({ ...p, unavailable: blockedVal });
      logAudit({ action: 'adjust', object: 'inventory', objectId: p.id, detail: `${p.sku} ${t('col_unavailable')} ${lv.unavailable} → ${blockedVal}${note.trim() ? ` — ${note.trim()}` : ''}` });
      toast.success(t('adj_blockedSaved'), { description: `${p.sku} · ${t('col_unavailable')} ${lv.unavailable} → ${blockedVal}` });
    }
    close();
  };

  const tracked = !!lv?.tracked;
  const valid = tab === 'onHand' ? onHandValid : blockedValid;

  return (
    <Modal
      open={!!row}
      onClose={close}
      size="md"
      title={t('adjustStock')}
      description={t('adj_desc')}
      footer={
        <>
          <Button variant="outline" shape="rounded" size="sm" onClick={close}>
            {tracked ? ta('cancel') : ta('close')}
          </Button>
          {tracked && (
            <Button shape="rounded" size="sm" onClick={save} disabled={!valid || !allowed}>
              {tab === 'onHand' ? t('adj_save') : ta('save')}
            </Button>
          )}
        </>
      }
    >
      {p && lv && (
        <div className="space-y-5 px-6 py-5">
          {/* Product */}
          <div className="flex items-center gap-3 rounded-xl border border-line/80 bg-canvas/40 p-3">
            <Thumb src={p.images[0]} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-semibold text-ink">{l(p.name)}</div>
              <div className="mt-0.5 truncate text-[12px] text-muted">
                <span className="font-mono">{p.sku}</span>
                {locationName && <> · {locationName}</>}
              </div>
            </div>
            {tracked && (
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('col_available')}</div>
                <div className="text-[18px] font-bold leading-tight tabular-nums text-ink">
                  {num(lv.available, lang)} <span className="text-[12px] font-medium text-muted">{unit}</span>
                </div>
              </div>
            )}
          </div>

          {!tracked ? (
            <div className="flex gap-3 rounded-xl bg-canvas/70 p-4 text-[13.5px] text-ink-soft">
              <PackageOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <p>{t('adj_untracked')}</p>
                <Link to={`/admin/proizvodi/${p.id}`} onClick={close} className="mt-2 inline-block font-semibold text-ink underline underline-offset-2">
                  {t('openProduct')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div role="tablist" className="-mt-1 flex gap-5 border-b border-line">
                {(
                  [
                    { id: 'onHand', label: t('adj_tabOnHand'), n: lv.onHand },
                    { id: 'blocked', label: t('adj_tabBlocked'), n: lv.unavailable, icon: Lock },
                  ] as const
                ).map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === x.id}
                    onClick={() => setTab(x.id)}
                    className={cn(
                      '-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2.5 text-[13.5px] font-semibold transition-colors',
                      tab === x.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
                    )}
                  >
                    {'icon' in x && <x.icon className="h-3.5 w-3.5" />}
                    {x.label}
                    <span className="rounded-md bg-canvas px-1.5 text-[11px] tabular-nums text-ink-soft">{num(x.n, lang)}</span>
                  </button>
                ))}
              </div>

              {tab === 'onHand' ? (
                <div className="space-y-4">
                  <Segmented<Mode>
                    full
                    value={mode}
                    onChange={(m) => {
                      setMode(m);
                      setQty(m === 'set' ? lv.onHand : null);
                      if (m === 'set' && reason === 'correction') setReason('count');
                      if (m === 'by' && reason === 'count') setReason('correction');
                    }}
                    options={[
                      { id: 'by', label: t('adj_by') },
                      { id: 'set', label: t('adj_set') },
                    ]}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{mode === 'by' ? t('adj_qtyBy') : t('adj_qtySet')}</FieldLabel>
                      <IntField
                        value={qty}
                        onChange={setQty}
                        signed={mode === 'by'}
                        min={mode === 'set' ? 0 : -lv.onHand}
                        stepper
                        invalid={belowCommitted}
                        placeholder={mode === 'by' ? '0' : String(lv.onHand)}
                        aria-label={mode === 'by' ? t('adj_by') : t('adj_set')}
                        autoFocus
                      />
                    </div>
                    <div>
                      <FieldLabel>{t('adj_reason')}</FieldLabel>
                      <SelectField value={reason} onChange={(e) => setReason(e.target.value as MovementReason)} aria-label={t('adj_reason')}>
                        {ADJUST_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {t(`r_${r}`)}
                          </option>
                        ))}
                      </SelectField>
                      {reason === 'damaged' && delta > 0 && <p className="mt-1.5 text-[12px] text-amber-800">{t('adj_damagedHint')}</p>}
                    </div>
                  </div>
                  {belowCommitted && <p className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">{t('adj_belowCommitted', { n: lv.committed })}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[13px] text-muted">{t('adj_blockedHint')}</p>
                  <div className="max-w-[220px] pt-2">
                    <FieldLabel>{t('adj_blockedQty')}</FieldLabel>
                    <IntField value={blocked} onChange={setBlocked} min={0} max={maxBlocked} stepper invalid={blockedVal > maxBlocked} aria-label={t('adj_blockedQty')} />
                  </div>
                  <p className={cn('text-[12px]', blockedVal > maxBlocked ? 'font-medium text-red-700' : 'text-muted')}>{t('adj_blockedMax', { n: maxBlocked })}</p>
                </div>
              )}

              <div>
                <FieldLabel aside={t('adj_noteOpt')}>{t('adj_note')}</FieldLabel>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t('adj_notePh')} className={cn(controlClass, 'resize-y px-3 py-2 leading-relaxed')} />
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-line/80 px-4 py-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-line/70 pb-2">
                  <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t('adj_preview')}</span>
                  {tab === 'onHand' && delta !== 0 && <DeltaQty delta={delta} unit={unit} className="text-[13px]" />}
                </div>
                {tab === 'onHand' ? (
                  <>
                    <PreviewRow label={t('col_onHand')} from={lv.onHand} to={newOnHand} unit={unit} />
                    <PreviewRow label={t('col_committed')} from={lv.committed} to={lv.committed} unit={unit} />
                    <PreviewRow label={t('col_unavailable')} from={lv.unavailable} to={lv.unavailable} unit={unit} />
                    <PreviewRow label={t('col_available')} from={lv.available} to={belowCommitted ? lv.available : newAvailable} unit={unit} strong />
                  </>
                ) : (
                  <>
                    <PreviewRow label={t('col_onHand')} from={lv.onHand} to={lv.onHand} unit={unit} />
                    <PreviewRow label={t('col_unavailable')} from={lv.unavailable} to={blockedVal} unit={unit} />
                    <PreviewRow label={t('col_available')} from={lv.available} to={Math.max(0, p.stock - Math.min(blockedVal, maxBlocked))} unit={unit} strong />
                  </>
                )}
                <p className="border-t border-line/70 pt-2 text-[11.5px] text-muted">{t('formula')}</p>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
