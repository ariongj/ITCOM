// Purchase order editor (PDF p.16): supplier, destination, lines with ordered / received / rejected / cost,
// reference, expected date, note. Status flow draft → sent → partial → closed; stock changes only on receipt.
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Check, CircleAlert, FileQuestion, Lock, PackageCheck, Plus, Send, Trash2, X } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/misc';
import { Card, PageHeader, SaveBar, Table, Td, Th, Thumb, confirmDialog } from '@/admin/components/kit';
import { useDict, useL, useLang } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import type { Product, PurchaseOrder, PurchaseOrderLine } from '@/lib/types';
import { date, dateTime, money, num } from '@/lib/format';
import { fold } from '@/lib/search';
import { cn, uid } from '@/lib/utils';
import { inv } from './dict';
import { LOW_STOCK, PO_STATUSES, actorName, fromDateInput, isOverdue, lineLeft, nextPoNumber, poLeft, stockUnit, toDateInput } from './helpers';
import { useInventoryRows } from './useInventory';
import { ProductPicker } from './ProductPicker';
import { ReceiveDialog } from './ReceiveDialog';
import { FieldLabel, Gate, IconBtn, IntField, MoneyField, PO_STATUS_META, PoStatusTag, ReceiveBar, SelectField, Tag, TextField, controlClass } from './ui';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function KVRow({ label, children, strong }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5 text-[13.5px]', strong && 'border-t border-line/70 pt-2.5 font-semibold')}>
      <span className={strong ? 'text-ink' : 'text-muted'}>{label}</span>
      <span className="text-right tabular-nums text-ink">{children}</span>
    </div>
  );
}

export function PurchaseOrderEditor({ id }: { id: string }) {
  const t = useDict(inv, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const can = useCan();
  const navigate = useNavigate();
  const purchaseOrders = useDb((s) => s.purchaseOrders);
  const locations = useDb((s) => s.settings.locations);
  const products = useDb((s) => s.products);
  const movements = useDb((s) => s.movements);
  const staff = useDb((s) => s.staff);
  const upsert = useDb((s) => s.upsert);
  const remove = useDb((s) => s.remove);
  const rows = useInventoryRows();
  const rowById = useMemo(() => new Map(rows.map((r) => [r.p.id, r])), [rows]);

  const isNew = id === 'novi';
  const saved = useMemo(() => purchaseOrders.find((x) => x.id === id), [purchaseOrders, id]);
  const canEdit = can('purchasing', 'edit');
  const canCost = can('purchasing', 'viewCost');
  const canDelete = can('purchasing', 'delete');

  const blank = (): PurchaseOrder => {
    const now = new Date();
    return {
      id: '',
      number: nextPoNumber(purchaseOrders, now),
      supplier: '',
      location: (locations.find((x) => x.isDefault) ?? locations[0])?.id ?? '',
      status: 'draft',
      lines: [],
      reference: '',
      note: '',
      expectedAt: new Date(now.getTime() + 7 * 86400000).toISOString(),
      createdAt: now.toISOString(),
    };
  };

  const [draft, setDraft] = useState<PurchaseOrder | null>(() => saved ?? (isNew ? blank() : null));
  const [prevId, setPrevId] = useState(id);
  const [prevSaved, setPrevSaved] = useState(saved);
  const [showErrors, setShowErrors] = useState(false);
  const [receiving, setReceiving] = useState(false);
  if (id !== prevId) {
    setPrevId(id);
    setPrevSaved(saved);
    setDraft(saved ?? (isNew ? blank() : null));
    setShowErrors(false);
  } else if (saved !== prevSaved) {
    // Store changed (receipt, status): take it over, keeping unsaved edits to editable fields.
    setPrevSaved(saved);
    if (saved)
      setDraft((d) =>
        !d || same(d, prevSaved)
          ? saved
          : { ...d, status: saved.status, lines: d.lines.map((x) => ({ ...x, ...pickProgress(saved.lines.find((s) => s.productId === x.productId)) })) },
      );
  }

  if (!draft) {
    return (
      <div className="pb-16">
        <PageHeader back="/admin/nabavke" breadcrumbs={[{ label: ta('nav_products'), to: '/admin/proizvodi' }, { label: ta('nav_purchasing'), to: '/admin/nabavke' }]} title={t('ed_notFound')} />
        <Card>
          <EmptyState
            icon={<FileQuestion className="h-6 w-6" />}
            title={t('ed_notFound')}
            text={t('ed_notFoundText')}
            action={
              <ButtonLink to="/admin/nabavke" variant="outline" shape="rounded" size="sm">
                {t('ed_backToList')}
              </ButtonLink>
            }
          />
        </Card>
      </div>
    );
  }

  const status = draft.status;
  const readOnly = !canEdit || status === 'closed';
  const dirty = isNew ? !!(draft.supplier.trim() || draft.lines.length || draft.reference?.trim() || draft.note?.trim()) : !!saved && !same(draft, saved);

  const set = (patch: Partial<PurchaseOrder>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const setLine = (pid: string, patch: Partial<PurchaseOrderLine>) => set({ lines: draft.lines.map((x) => (x.productId === pid ? { ...x, ...patch } : x)) });
  const addLine = (p: Product) => set({ lines: [...draft.lines, { productId: p.id, ordered: suggestedQty(p, rowById.get(p.id)?.lv.available ?? 0), received: 0, rejected: 0, cost: p.cost ?? 0 }] });
  const removeLine = (pid: string) => set({ lines: draft.lines.filter((x) => x.productId !== pid) });

  const under = draft.lines.find((x) => x.ordered < x.received + x.rejected);
  const errors = {
    supplier: !draft.supplier.trim() ? t('ed_needSupplier') : null,
    lines: !draft.lines.length ? t('ed_needLines') : null,
    qty: draft.lines.some((x) => x.ordered <= 0) ? t('ed_needQty') : null,
    min: under ? t('ed_minOrdered', { n: under.received + under.rejected }) : null,
  };
  const firstError = errors.supplier ?? errors.lines ?? errors.qty ?? errors.min;

  const persist = (nextStatus?: PurchaseOrder['status']) => {
    if (!canEdit) return null;
    if (firstError) {
      setShowErrors(true);
      toast.error(firstError);
      return null;
    }
    const now = new Date().toISOString();
    const item: PurchaseOrder = {
      ...draft,
      id: isNew ? uid('po') : draft.id,
      number: isNew ? nextPoNumber(purchaseOrders) : draft.number,
      supplier: draft.supplier.trim(),
      reference: draft.reference?.trim() || undefined,
      note: draft.note?.trim() || undefined,
      createdAt: isNew ? now : draft.createdAt,
      status: nextStatus ?? draft.status,
    };
    upsert('purchaseOrders', item);
    setShowErrors(false);
    if (isNew) navigate(`/admin/nabavke?id=${item.id}`, { replace: true });
    return item;
  };

  const onSave = () => {
    const item = persist();
    if (item) toast.success(isNew ? t('ed_created') : t('ed_saved'), { description: item.number });
  };
  const onDiscard = () => {
    if (isNew) navigate('/admin/nabavke');
    else if (saved) setDraft(saved);
    setShowErrors(false);
  };
  const markSent = () => {
    const item = persist('sent');
    if (item) toast.success(t('ed_sent'), { description: `${item.number} · ${item.supplier}` });
  };
  const closePo = async () => {
    if (!saved) return;
    const ok = await confirmDialog({ title: t('ed_closeTitle'), text: t('ed_closeText', { n: num(poLeft(saved), lang) }), confirmLabel: t('ed_close'), danger: false });
    if (!ok) return;
    upsert('purchaseOrders', { ...saved, status: 'closed' });
    toast.success(t('ed_closed'), { description: saved.number });
  };
  const deletePo = async () => {
    if (!saved) return;
    const ok = await confirmDialog({ title: t('ed_deleteTitle', { n: saved.number }), text: ta('confirmDeleteText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    remove('purchaseOrders', saved.id);
    toast.success(t('ed_deleted'), { description: saved.number });
    navigate('/admin/nabavke');
  };

  /* ---------------- derived ---------------- */
  const totals = {
    ordered: draft.lines.reduce((s, x) => s + x.ordered, 0),
    received: draft.lines.reduce((s, x) => s + x.received, 0),
    rejected: draft.lines.reduce((s, x) => s + x.rejected, 0),
    value: Math.round(draft.lines.reduce((s, x) => s + x.ordered * x.cost, 0) * 100) / 100,
    receivedValue: Math.round(draft.lines.reduce((s, x) => s + x.received * x.cost, 0) * 100) / 100,
  };
  const receipts = isNew ? [] : movements.filter((m) => m.ref === draft.number && m.reason === 'received').sort((a, b) => b.at.localeCompare(a.at));
  const differences = draft.lines
    .map((x) => ({ x, left: lineLeft(x) }))
    .filter(({ x, left }) => x.rejected > 0 || (left > 0 && (status === 'closed' || status === 'partial')));
  const showProgress = status !== 'draft';
  const overdue = !!saved && isOverdue(saved);
  const inLines = new Set(draft.lines.map((x) => x.productId));
  const suggestions = (() => {
    const s = fold(draft.supplier.trim());
    if (readOnly || s.length < 3) return [];
    return rows.filter((r) => {
      if (!r.lv.tracked || r.p.status === 'archived' || inLines.has(r.p.id) || !r.p.vendor) return false;
      const v = fold(r.p.vendor);
      return s.includes(v) || v.includes(s);
    });
  })();

  const crumbs = [{ label: ta('nav_products'), to: '/admin/proizvodi' }, { label: ta('nav_purchasing'), to: '/admin/nabavke' }, isNew ? t('po_new') : draft.number];

  /* ---------------- header actions ---------------- */
  const receiveBlocked = dirty ? t('ed_saveFirst') : null;
  const actions = !canEdit ? (
    <Tag icon={Lock} tone="muted">
      {t('ed_noPermEdit')}
    </Tag>
  ) : isNew ? (
    <Button shape="rounded" size="sm" onClick={onSave} icon={<Check className="h-4 w-4" />}>
      {ta('save')}
    </Button>
  ) : status === 'draft' ? (
    <>
      <Gate allowed={canDelete} reason={t('ed_noPermDelete')}>
        <Button variant="outline" shape="rounded" size="sm" className="bg-white" icon={<Trash2 className="h-4 w-4" />} onClick={deletePo} disabled={!canDelete}>
          {ta('delete')}
        </Button>
      </Gate>
      <Button shape="rounded" size="sm" icon={<Send className="h-4 w-4" />} onClick={markSent}>
        {t('ed_markSent')}
      </Button>
    </>
  ) : status === 'closed' ? null : (
    <>
      <Button variant="outline" shape="rounded" size="sm" className="bg-white" icon={<X className="h-4 w-4" />} onClick={closePo} disabled={dirty}>
        {t('ed_close')}
      </Button>
      <Gate allowed={!receiveBlocked} reason={receiveBlocked ?? ''}>
        <Button shape="rounded" size="sm" icon={<PackageCheck className="h-4 w-4" />} onClick={() => setReceiving(true)} disabled={!!receiveBlocked}>
          {t('ed_receive')}
        </Button>
      </Gate>
    </>
  );

  /* ---------------- line cells ---------------- */
  const productCell = (x: PurchaseOrderLine) => {
    const r = rowById.get(x.productId);
    const p = r?.p;
    return (
      <div className="flex min-w-0 items-center gap-3">
        <Thumb src={p?.images[0]} className="h-10 w-10" />
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{p ? l(p.name) : x.productId}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <span className="font-mono">{p?.sku}</span>
            {r && (
              <span>
                {t('ed_available', { n: num(r.lv.available, lang) })} {stockUnit(r.p, lang)}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };
  const orderedInput = (x: PurchaseOrderLine) => {
    const min = Math.max(1, x.received + x.rejected);
    const bad = showErrors && (x.ordered <= 0 || x.ordered < x.received + x.rejected);
    return (
      <IntField
        size="sm"
        value={x.ordered}
        onChange={(v) => setLine(x.productId, { ordered: v ?? 0 })}
        min={min}
        disabled={readOnly}
        invalid={bad}
        title={x.received + x.rejected > 0 ? t('ed_minOrdered', { n: x.received + x.rejected }) : undefined}
        aria-label={t('ed_ordered')}
        className="w-[84px]!"
      />
    );
  };
  const removeBtn = (x: PurchaseOrderLine) => {
    const locked = x.received + x.rejected > 0;
    if (readOnly) return null;
    return (
      <IconBtn label={locked ? t('ed_lockedLine') : t('ed_remove')} onClick={() => removeLine(x.productId)} disabled={locked} className="hover:bg-red-50! hover:text-red-600!">
        <Trash2 className="h-4 w-4" />
      </IconBtn>
    );
  };
  const progressCell = (x: PurchaseOrderLine) => (
    <div className="min-w-[92px]">
      <div className="text-[13px] tabular-nums">
        <span className="font-semibold text-ink">{num(x.received, lang)}</span>
        <span className="text-muted"> / {num(x.ordered, lang)}</span>
      </div>
      <ReceiveBar className="mt-1" ordered={x.ordered} received={x.received} rejected={x.rejected} />
    </div>
  );

  const unitOf = (pid: string) => {
    const p = rowById.get(pid)?.p;
    return p ? stockUnit(p, lang) : '';
  };

  return (
    <div className="pb-28">
      <PageHeader
        back="/admin/nabavke"
        breadcrumbs={crumbs}
        title={isNew ? t('po_new') : draft.number}
        badge={
          <span className="flex items-center gap-1.5">
            <PoStatusTag status={status} />
            {overdue && (
              <Tag icon={CircleAlert} tone="red">
                {t('po_overdue')}
              </Tag>
            )}
          </span>
        }
        description={isNew ? t('ed_stockHint') : `${draft.supplier} · ${ta('created')} ${date(draft.createdAt, lang)}`}
        actions={actions}
      />

      {status === 'closed' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line/80 bg-white px-4 py-3 text-[13px] text-ink-soft">
          <Lock className="h-4 w-4 text-muted" />
          {t('ed_readOnly')}
        </div>
      )}

      <div className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Supplier, destination & shipment details */}
          <Card title={t('ed_supplierCard')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="po-supplier">{t('po_supplier')}</FieldLabel>
                <TextField
                  id="po-supplier"
                  list="po-suppliers"
                  value={draft.supplier}
                  onChange={(e) => set({ supplier: e.target.value })}
                  placeholder={t('ed_supplierPh')}
                  disabled={readOnly}
                  invalid={showErrors && !!errors.supplier}
                />
                <datalist id="po-suppliers">
                  {[...new Set([...purchaseOrders.map((x) => x.supplier), ...products.map((p) => p.vendor ?? '')].filter(Boolean))].sort().map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {showErrors && errors.supplier && <p className="mt-1.5 text-[12px] font-medium text-red-700">{errors.supplier}</p>}
              </div>
              <div>
                <FieldLabel htmlFor="po-location">{t('po_destination')}</FieldLabel>
                <SelectField id="po-location" value={draft.location} onChange={(e) => set({ location: e.target.value })} disabled={readOnly}>
                  {locations.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name} — {x.city}
                    </option>
                  ))}
                </SelectField>
              </div>
              <div>
                <FieldLabel htmlFor="po-ref">{t('ed_reference')}</FieldLabel>
                <TextField id="po-ref" value={draft.reference ?? ''} onChange={(e) => set({ reference: e.target.value })} placeholder={t('ed_referencePh')} disabled={readOnly} className="font-mono text-[13px]" />
              </div>
              <div>
                <FieldLabel htmlFor="po-date">{t('ed_expected')}</FieldLabel>
                <TextField id="po-date" type="date" value={toDateInput(draft.expectedAt)} onChange={(e) => set({ expectedAt: fromDateInput(e.target.value) })} disabled={readOnly} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="po-note">{t('ed_note')}</FieldLabel>
                <textarea id="po-note" value={draft.note ?? ''} onChange={(e) => set({ note: e.target.value })} rows={2} placeholder={t('ed_notePh')} disabled={readOnly} className={cn(controlClass, 'resize-y px-3 py-2 leading-relaxed')} />
              </div>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[12px] text-muted">
              <Lock className="mt-px h-3.5 w-3.5 shrink-0" />
              {t('ed_supplierHint')}
            </p>
          </Card>

          {/* Status flow */}
          <Card title={t('ed_steps')}>
            <ol className="space-y-0.5">
              {PO_STATUSES.map((s, i) => {
                const cur = PO_STATUSES.indexOf(status);
                const done = i < cur || status === 'closed';
                const active = i === cur;
                const I = PO_STATUS_META[s].icon;
                return (
                  <li key={s} aria-current={active ? 'step' : undefined} className={cn('flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px]', active && 'bg-canvas')}>
                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 ring-inset', done || active ? 'bg-ink text-white ring-ink' : 'bg-white text-muted ring-line')}>
                      {done && !active ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : <I className="h-3.5 w-3.5" />}
                    </span>
                    <span className={cn(active ? 'font-semibold text-ink' : done ? 'text-ink-soft' : 'text-muted')}>{t(`st_${s}`)}</span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 border-t border-line/70 pt-3.5">
              {showProgress ? (
                <>
                  <ReceiveBar ordered={totals.ordered} received={totals.received} rejected={totals.rejected} />
                  <p className="mt-1.5 text-[12.5px] text-ink-soft">
                    {t('ed_progress', { r: num(totals.received, lang), o: num(totals.ordered, lang) })}
                    {totals.rejected > 0 && <span className="text-muted"> · {t('ed_rejectedN', { n: totals.rejected })}</span>}
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] text-muted">{t('ed_stockHint')}</p>
              )}
              {draft.expectedAt && status !== 'closed' && (
                <p className={cn('mt-1 text-[12.5px]', overdue ? 'font-semibold text-red-700' : 'text-muted')}>
                  {t('po_expected')}: {date(draft.expectedAt, lang)}
                </p>
              )}
            </div>
          </Card>
        </div>

          {/* Lines */}
          <Card
            padded={false}
            title={t('ed_products')}
            description={draft.lines.length ? `${t('po_lines', { n: draft.lines.length })} · ${num(totals.ordered, lang)} ${t('ed_unitsTotal').toLowerCase()}` : undefined}
          >
            {!readOnly && (
              <div className="space-y-2.5 border-b border-line/70 p-4 sm:px-5">
                <ProductPicker rows={rows} exclude={inLines} onPick={addLine} showCost={canCost} />
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                    <span>{t('ed_suggest', { v: draft.supplier.trim() })}</span>
                    {suggestions.slice(0, 6).map((r) => (
                      <button
                        key={r.p.id}
                        type="button"
                        onClick={() => addLine(r.p)}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-ink-soft ring-1 ring-inset ring-line transition hover:text-ink hover:ring-ink/30"
                      >
                        <Plus className="h-3 w-3" />
                        {l(r.p.name).split(' — ')[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {draft.lines.length === 0 ? (
              <div className={cn('px-5 py-10 text-center text-[13.5px]', showErrors && errors.lines ? 'font-medium text-red-700' : 'text-muted')}>{t('ed_noLines')}</div>
            ) : (
              <>
                <Table className="hidden md:block">
                  <thead>
                    <tr>
                      <Th>{t('col_product')}</Th>
                      <Th className="text-right">{t('ed_ordered')}</Th>
                      {showProgress && <Th>{t('ed_received')}</Th>}
                      {showProgress && <Th className="text-right">{t('ed_rejected')}</Th>}
                      {canCost && <Th className="text-right">{t('ed_cost')}</Th>}
                      {canCost && <Th className="text-right">{t('ed_lineTotal')}</Th>}
                      {!readOnly && <Th className="w-[1%]" />}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.lines.map((x) => (
                      <tr key={x.productId}>
                        <Td className="max-w-[300px]">{productCell(x)}</Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {orderedInput(x)}
                            <span className="w-8 text-left text-[11.5px] text-muted">{unitOf(x.productId)}</span>
                          </div>
                        </Td>
                        {showProgress && <Td>{progressCell(x)}</Td>}
                        {showProgress && (
                          <Td className={cn('text-right tabular-nums', x.rejected ? 'font-semibold text-red-700' : 'text-muted/60')}>{num(x.rejected, lang)}</Td>
                        )}
                        {canCost && (
                          <Td className="text-right">
                            <div className="ml-auto w-[104px]">
                              <MoneyField value={x.cost} onChange={(v) => setLine(x.productId, { cost: v })} disabled={readOnly} aria-label={t('ed_cost')} />
                            </div>
                          </Td>
                        )}
                        {canCost && <Td className="whitespace-nowrap text-right font-semibold tabular-nums">{money(x.ordered * x.cost, lang)}</Td>}
                        {!readOnly && <Td className="text-right">{removeBtn(x)}</Td>}
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Mobile lines */}
                <ul className="divide-y divide-line/70 md:hidden">
                  {draft.lines.map((x) => (
                    <li key={x.productId} className="space-y-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-2">
                        {productCell(x)}
                        {removeBtn(x)}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>{t('ed_ordered')}</FieldLabel>
                          <div className="flex items-center gap-1.5">
                            {orderedInput(x)}
                            <span className="text-[11.5px] text-muted">{unitOf(x.productId)}</span>
                          </div>
                        </div>
                        {canCost && (
                          <div>
                            <FieldLabel aside={money(x.ordered * x.cost, lang)}>{t('ed_cost')}</FieldLabel>
                            <MoneyField value={x.cost} onChange={(v) => setLine(x.productId, { cost: v })} disabled={readOnly} aria-label={t('ed_cost')} />
                          </div>
                        )}
                      </div>
                      {showProgress && (
                        <div className="flex items-center gap-3 text-[12.5px]">
                          <div className="flex-1">{progressCell(x)}</div>
                          {x.rejected > 0 && <span className="font-semibold text-red-700">{t('ed_rejectedN', { n: x.rejected })}</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 bg-canvas/40 px-5 py-3 text-[13px]">
                  <span className="text-muted">
                    {t('ed_unitsTotal')}: <span className="font-semibold tabular-nums text-ink">{num(totals.ordered, lang)}</span>
                  </span>
                  {canCost ? (
                    <span className="text-muted">
                      {t('ed_subtotal')}: <span className="text-[14.5px] font-bold tabular-nums text-ink">{money(totals.value, lang)}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] text-muted">
                      <Lock className="h-3 w-3" />
                      {t('po_costHidden')}
                    </span>
                  )}
                </div>
              </>
            )}
          </Card>

        <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {/* Differences */}
          {showProgress && (differences.length > 0 || status === 'closed') && (
            <Card title={t('ed_differences')}>
              {differences.length === 0 ? (
                <p className="flex items-center gap-1.5 text-[13.5px] text-ink-soft">
                  <Check className="h-4 w-4 text-emerald-700" />
                  {t('ed_noDifferences')}
                </p>
              ) : (
                <ul className="divide-y divide-line/60">
                  {differences.map(({ x, left }) => {
                    const p = rowById.get(x.productId)?.p;
                    return (
                      <li key={x.productId} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-[13.5px] first:pt-0 last:pb-0">
                        <span className="min-w-0 truncate font-medium text-ink">{p ? l(p.name) : x.productId}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {x.rejected > 0 && (
                            <Tag icon={X} tone="red">
                              {t('ed_rejectedN', { n: x.rejected })}
                            </Tag>
                          )}
                          {left > 0 && (
                            <Tag icon={status === 'closed' ? CircleAlert : PO_STATUS_META.partial.icon} tone={status === 'closed' ? 'neutral' : 'amber'}>
                              {status === 'closed' ? t('ed_notReceived', { n: left }) : t('ed_missing', { n: left })}
                            </Tag>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
          {draft.lines.length > 0 && (
            <Card title={canCost ? t('ed_summary') : t('ed_unitsTotal')}>
              <KVRow label={t('ed_ordered')}>{num(totals.ordered, lang)}</KVRow>
              {showProgress && <KVRow label={t('ed_received')}>{num(totals.received, lang)}</KVRow>}
              {showProgress && totals.rejected > 0 && <KVRow label={t('ed_rejected')}>{num(totals.rejected, lang)}</KVRow>}
              {canCost ? (
                <>
                  {showProgress && <KVRow label={t('ed_receivedValue')}>{money(totals.receivedValue, lang)}</KVRow>}
                  <KVRow label={t('ed_subtotal')} strong>
                    {money(totals.value, lang)}
                  </KVRow>
                </>
              ) : (
                <p className="mt-2 flex items-center gap-1.5 border-t border-line/70 pt-2.5 text-[12px] text-muted">
                  <Lock className="h-3.5 w-3.5" />
                  {t('ed_supplierHint')}
                </p>
              )}
            </Card>
          )}

          {!isNew && status !== 'draft' && (
            <Card title={t('ed_receipts')}>
              {receipts.length === 0 ? (
                <p className="text-[13px] text-muted">{t('ed_receiptsEmpty')}</p>
              ) : (
                <ul className="space-y-3">
                  {receipts.map((m) => {
                    const p = rowById.get(m.productId)?.p;
                    return (
                      <li key={m.id} className="flex gap-3 text-[13px]">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-canvas text-ink-soft ring-1 ring-inset ring-line">
                          <PackageCheck className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-medium text-ink">{p ? l(p.name) : m.productId}</span>
                            <span className="shrink-0 font-bold tabular-nums text-emerald-700">+{num(m.delta, lang)}</span>
                          </div>
                          <div className="mt-0.5 text-[12px] text-muted">
                            {actorName(m.by, staff, t('mv_web'))} · {dateTime(m.at, lang)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>

      {canEdit && status !== 'closed' && <SaveBar dirty={dirty} onSave={onSave} onDiscard={onDiscard} />}
      <ReceiveDialog po={receiving ? saved : undefined} onClose={() => setReceiving(false)} />
    </div>
  );
}

/** Default order quantity: a pallet-ish amount for packs/metres, otherwise refill to twice the low-stock line. */
function suggestedQty(p: Product, available: number) {
  if (p.unit === 'm2') return 20;
  if (p.unit === 'm') return 10;
  return Math.max(2, LOW_STOCK * 2 - available);
}

function pickProgress(l?: PurchaseOrderLine) {
  return l ? { received: l.received, rejected: l.rejected } : {};
}
