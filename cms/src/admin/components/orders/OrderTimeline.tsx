import { useState } from 'react';
import { toast } from 'sonner';
import { Ban, Euro, Globe, MessageSquareText, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { defineDict, useDict, useLang } from '@/i18n';
import { common } from '@/i18n/common';
import { useDb } from '@/store/db';
import { useCan } from '@/store/hooks';
import { dateTime, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Order, OrderEvent } from '@/lib/types';
import { actorName, isCarrierKey, isRecent } from './helpers';
import { od } from './dict';

const T = defineDict({
  me: {
    placeholder: 'Dodajte internu napomenu (vidi je samo tim)…',
    add: 'Dodaj',
    added: 'Napomena je dodata',
    shortcut: 'Ctrl + Enter',
    ev_created: 'Narudžba primljena preko web prodavnice',
    ev_createdStaff: 'Narudžbu je kreirao tim',
    ev_fromDraft: 'Konvertovana iz nacrta {n}',
    ev_status: 'Status: „{s}“',
    ev_cancelled: 'Narudžba je otkazana',
    ev_note: 'Interna napomena',
    ev_payment: 'Uplata je evidentirana',
    ev_refund: 'Refundacija',
    empty: 'Još nema aktivnosti.',
  },
  sq: {
    placeholder: 'Shtoni një shënim të brendshëm (e sheh vetëm ekipi)…',
    add: 'Shto',
    added: 'Shënimi u shtua',
    shortcut: 'Ctrl + Enter',
    ev_created: 'Porosia u pranua nga Online Store',
    ev_createdStaff: 'Porosia u krijua nga ekipi',
    ev_fromDraft: 'U konvertua nga drafti {n}',
    ev_status: 'Statusi: „{s}“',
    ev_cancelled: 'Porosia u anulua',
    ev_note: 'Shënim i brendshëm',
    ev_payment: 'Pagesa u regjistrua',
    ev_refund: 'Rimbursim',
    empty: 'Ende nuk ka aktivitet.',
  },
  en: {
    placeholder: 'Add an internal note (visible to your team only)…',
    add: 'Add',
    added: 'Note added',
    shortcut: 'Ctrl + Enter',
    ev_created: 'Order received from the Online Store',
    ev_createdStaff: 'Order created by the team',
    ev_fromDraft: 'Converted from draft {n}',
    ev_status: 'Status: “{s}”',
    ev_cancelled: 'Order was cancelled',
    ev_note: 'Internal note',
    ev_payment: 'Payment recorded',
    ev_refund: 'Refund',
    empty: 'No activity yet.',
  },
});

const isRefund = (e: OrderEvent) => e.status === 'payment' && !!e.note && /refund|RT-\d/i.test(e.note);

/** Order history (newest first) with an "add internal note" composer — PDF p.18 "historiku ruhet në një timeline". */
export function OrderTimeline({ order }: { order: Order }) {
  const t = useDict(T, 'admin');
  const to = useDict(od, 'admin');
  const tc = useDict(common, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const staff = useDb((s) => s.staff);
  const addOrderNote = useDb((s) => s.addOrderNote);
  const [note, setNote] = useState('');

  const submit = () => {
    const text = note.trim();
    if (!text) return;
    addOrderNote(order.id, text);
    setNote('');
    toast.success(t('added'));
  };

  const events = order.timeline.map((e, i) => ({ e, i })).reverse();

  const title = (e: OrderEvent, i: number) => {
    if (e.status === 'note') return t('ev_note');
    if (isRefund(e)) return t('ev_refund');
    if (e.status === 'payment') return t('ev_payment');
    if (e.status === 'cancelled') return t('ev_cancelled');
    if (i === 0 && e.status === 'new') return e.by === 'web' ? t('ev_created') : t('ev_createdStaff');
    if (order.draftId && e.status === 'confirmed' && e.note && /^D-\d+/.test(e.note)) return t('ev_fromDraft', { n: e.note });
    return t('ev_status', { s: tc(`status_${e.status}`) });
  };

  // fulfillOrder() writes "<carrier key> <tracking>" — show the carrier by name
  const noteText = (e: OrderEvent) => {
    const m = e.status === 'shipped' && e.note ? /^(\S+)\s+(.+)$/.exec(e.note) : null;
    return m && isCarrierKey(m[1]) ? `${to(`carrier_${m[1]}`)} · ${m[2]}` : e.note;
  };

  const icon = (e: OrderEvent, i: number) => {
    if (e.status === 'note') return <MessageSquareText className="h-3.5 w-3.5" />;
    if (e.status === 'payment') return <Euro className="h-3.5 w-3.5" />;
    if (e.status === 'cancelled') return <Ban className="h-3.5 w-3.5" />;
    if (i === 0 && e.by === 'web') return <Globe className="h-3.5 w-3.5" />;
    return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
  };

  return (
    <div>
      {can('orders', 'edit') && (
        <div className="rounded-lg border border-line bg-white focus-within:border-ink/30 focus-within:ring-4 focus-within:ring-ink/5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            placeholder={t('placeholder')}
            className="block w-full resize-none rounded-lg bg-transparent px-3 pt-2.5 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-muted/80"
          />
          <div className="flex items-center justify-between gap-3 px-2 pb-2">
            <span className="hidden pl-1 text-[11.5px] text-muted sm:block">{t('shortcut')}</span>
            <Button size="xs" shape="rounded" variant="primary" className="ml-auto" icon={<Send className="h-3.5 w-3.5" />} disabled={!note.trim()} onClick={submit}>
              {t('add')}
            </Button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">{t('empty')}</p>
      ) : (
        <ol className="mt-4">
          {events.map(({ e, i }, k) => {
            const last = k === events.length - 1;
            const strong = e.status !== 'note' && e.status !== 'payment';
            return (
              <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                {!last && <span aria-hidden className="absolute bottom-0 left-[11px] top-6 w-px bg-line" />}
                <span
                  className={cn(
                    'relative z-10 mt-0.5 grid h-[23px] w-[23px] shrink-0 place-items-center rounded-full',
                    e.status === 'cancelled' ? 'bg-[#FDE3DF] text-[#8A1B0A]' : k === 0 && strong ? 'bg-ink text-white' : strong ? 'bg-white text-ink ring-1 ring-line' : 'bg-[#EBEBEB] text-ink-soft',
                  )}
                >
                  {icon(e, i)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold leading-snug text-ink">{title(e, i)}</p>
                  {e.note && !(order.draftId && e.status === 'confirmed' && /^D-\d+$/.test(e.note)) && (
                    <p className={cn('mt-1 whitespace-pre-line rounded-lg px-2.5 py-1.5 text-[13px] leading-relaxed', e.status === 'note' ? 'bg-[#FFF8E1] text-ink ring-1 ring-[#E8D9A8]' : 'bg-canvas text-ink-soft')}>{noteText(e)}</p>
                  )}
                  <p className="mt-0.5 text-[12px] text-muted">
                    {dateTime(e.at, lang)}
                    {isRecent(e.at) && <> · {timeAgo(e.at, lang)}</>}
                    {e.by && <> · {actorName(e.by, staff, { web: to('by_web'), admin: to('by_admin') })}</>}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
