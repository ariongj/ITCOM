import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CalendarCheck2, CheckCheck, FileText, History, Lock, Mail, RotateCw, Send, StickyNote, UserRoundCheck, CirclePlus, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/misc';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCurrentStaff } from '@/store/hooks';
import { dateTime } from '@/lib/format';
import type { AuditEntry, Booking, InquiryStatus, Quote } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { cx } from './i18n';
import { CTextarea } from './fields';
import { StaffAvatar, StatusSymbol } from './atoms';
import { STATUSES, sourceKey, sourceOf, type InquiryX, type Reply } from './model';

const T = defineDict({
  me: {
    tab_replies: 'Odgovori',
    tab_notes: 'Privatne bilješke',
    tab_history: 'Istorija',
    repliesEmpty: 'Još nema odgovora klijentu.',
    to: 'Za: {email}',
    replyPh: 'Napišite odgovor klijentu…',
    send: 'Pošalji e-mail',
    sent: 'Poslato',
    failed: 'Nije poslato',
    err_invalidEmail: 'neispravna e-mail adresa',
    err_noEmail: 'klijent nema e-mail',
    retry: 'Pošalji ponovo',
    sentToast: 'Odgovor je poslat na {email}',
    failedToast: 'Slanje nije uspjelo — {error}',
    noEmailHint: 'Klijent nije ostavio e-mail — javite se telefonom ili preko WhatsApp-a.',
    repliesHint: 'Odgovori idu klijentu; status slanja i greške se čuvaju.',
    notePh: 'Npr. želi progresivna sočiva, pozvati posle 17h, doneti stari recept…',
    noteHint: 'Vidljivo samo osoblju — nikad se ne šalje klijentu.',
    saveNote: 'Sačuvaj bilješku',
    noteSaved: 'Bilješka je sačuvana',
    h_created: 'Primljeno preko: {source}',
    h_createdManual: 'Ručno upisano ({source})',
    h_assign: 'Dodijeljeno: {who}',
    h_status: 'Status: {from} → {to}',
    h_send: 'Poslat odgovor e-mailom',
    h_update: 'Ažurirano',
    h_booking: 'Termin {when}',
    h_quote: 'B2B ponuda {number}',
    readOnly: 'Samo pregled — nemate dozvolu za izmjene.',
  },
  sq: {
    tab_replies: 'Përgjigjet',
    tab_notes: 'Shënime private',
    tab_history: 'Historiku',
    repliesEmpty: 'Ende nuk ka përgjigje për klientin.',
    to: 'Për: {email}',
    replyPh: 'Shkruani përgjigjen për klientin…',
    send: 'Dërgo e-mail',
    sent: 'Dërguar',
    failed: 'Nuk u dërgua',
    err_invalidEmail: 'adresë e-mail e pavlefshme',
    err_noEmail: 'klienti nuk ka e-mail',
    retry: 'Dërgo sërish',
    sentToast: 'Përgjigjja u dërgua te {email}',
    failedToast: 'Dërgimi dështoi — {error}',
    noEmailHint: 'Klienti nuk ka lënë e-mail — kontaktojeni me telefon ose WhatsApp.',
    repliesHint: 'Përgjigjet i shkojnë klientit; statusi i dërgimit dhe gabimet ruhen.',
    notePh: 'P.sh. dëshiron lente progresive, thirrje pas orës 17, të sjellë recetën e vjetër…',
    noteHint: 'E dukshme vetëm për stafin — nuk i dërgohet kurrë klientit.',
    saveNote: 'Ruaj shënimin',
    noteSaved: 'Shënimi u ruajt',
    h_created: 'Pranuar nga: {source}',
    h_createdManual: 'Regjistruar manualisht ({source})',
    h_assign: 'U caktua: {who}',
    h_status: 'Statusi: {from} → {to}',
    h_send: 'U dërgua përgjigje me e-mail',
    h_update: 'U përditësua',
    h_booking: 'Termin {when}',
    h_quote: 'Ofertë B2B {number}',
    readOnly: 'Vetëm shikim — nuk keni leje për ndryshime.',
  },
  en: {
    tab_replies: 'Replies',
    tab_notes: 'Private notes',
    tab_history: 'History',
    repliesEmpty: 'No replies to the customer yet.',
    to: 'To: {email}',
    replyPh: 'Write a reply to the customer…',
    send: 'Send e-mail',
    sent: 'Sent',
    failed: 'Not sent',
    err_invalidEmail: 'invalid e-mail address',
    err_noEmail: 'the customer has no e-mail',
    retry: 'Send again',
    sentToast: 'Reply sent to {email}',
    failedToast: 'Sending failed — {error}',
    noEmailHint: 'The customer left no e-mail — reach out by phone or WhatsApp.',
    repliesHint: 'Replies go to the customer; delivery status and errors are kept.',
    notePh: 'E.g. wants progressive lenses, call after 5 pm, bring the old prescription…',
    noteHint: 'Visible to staff only — never sent to the customer.',
    saveNote: 'Save note',
    noteSaved: 'Note saved',
    h_created: 'Received via: {source}',
    h_createdManual: 'Logged manually ({source})',
    h_assign: 'Assigned: {who}',
    h_status: 'Status: {from} → {to}',
    h_send: 'Reply sent by e-mail',
    h_update: 'Updated',
    h_booking: 'Appointment {when}',
    h_quote: 'B2B quote {number}',
    readOnly: 'View only — you do not have permission to edit.',
  },
});

type TabId = 'replies' | 'notes' | 'history';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Replies to the customer, private staff notes and the request's history — kept strictly apart (p.43). */
export function Conversation({ inquiry: q, canEdit, bookings, quotes }: { inquiry: InquiryX; canEdit: boolean; bookings: Booking[]; quotes: Quote[] }) {
  const t = useDict(T, 'admin');
  const replies = q.replies ?? [];
  const [tab, setTab] = useState<TabId>('replies');
  return (
    <div>
      <Tabs<TabId>
        value={tab}
        onChange={setTab}
        className="[&>button]:px-2.5 [&>button]:py-2.5 [&>button]:text-[13px]"
        tabs={[
          { id: 'replies', label: t('tab_replies'), badge: replies.length ? <span className="rounded-md bg-ink/[0.06] px-1.5 text-[11px] tabular-nums">{replies.length}</span> : undefined },
          { id: 'notes', label: t('tab_notes'), badge: q.note ? <Lock className="h-3 w-3 text-muted" /> : undefined },
          { id: 'history', label: t('tab_history') },
        ]}
      />
      <div className="pt-4">
        {tab === 'replies' && <Replies key={q.id} inquiry={q} canEdit={canEdit} />}
        {tab === 'notes' && <Notes key={q.id} inquiry={q} canEdit={canEdit} />}
        {tab === 'history' && <Timeline inquiry={q} bookings={bookings} quotes={quotes} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Replies({ inquiry: q, canEdit }: { inquiry: InquiryX; canEdit: boolean }) {
  const t = useDict(T, 'admin');
  const lang = useLang('admin');
  const staff = useDb((s) => s.staff);
  const me = useCurrentStaff();
  const [text, setText] = useState('');
  const replies = q.replies ?? [];
  const email = q.email?.trim() ?? '';

  const deliver = (body: string, retryOf?: string) => {
    const error: Reply['error'] = !email ? 'noEmail' : !EMAIL_RE.test(email) ? 'invalidEmail' : undefined;
    const reply: Reply = { id: uid('rp'), at: new Date().toISOString(), by: me?.id ?? 'admin', channel: 'email', to: email, text: body, status: error ? 'failed' : 'sent', ...(error ? { error } : {}) };
    const db = useDb.getState();
    const list = retryOf ? replies.filter((r) => r.id !== retryOf) : replies;
    const patch: Partial<InquiryX> = { replies: [...list, reply], seen: true, ...(!error && q.status === 'new' ? { status: 'contacted' as const } : {}) };
    db.updateInquiry(q.id, patch);
    if (!error) {
      db.logAudit({ action: 'send', object: 'inquiry', objectId: q.id, detail: email });
      if (q.status === 'new') db.logAudit({ action: 'status', object: 'inquiry', objectId: q.id, detail: 'new → contacted' });
      toast.success(t('sentToast', { email }));
    } else toast.error(t('failedToast', { error: t(`err_${error}`) }));
    return !error;
  };

  return (
    <div className="space-y-3">
      {replies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-[13px] text-muted">{t('repliesEmpty')}</p>
      ) : (
        <ul className="space-y-2.5">
          {replies.map((r) => {
            const who = staff.find((m) => m.id === r.by)?.name ?? 'CMS';
            return (
              <li key={r.id} className="rounded-xl border border-line bg-white p-3.5">
                <div className="flex items-center justify-between gap-3 text-[12px] text-muted">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <StaffAvatar name={who} size="xs" />
                    <span className="truncate font-semibold text-ink-soft">{who}</span>
                    <span className="truncate">· {t('to', { email: r.to || '—' })}</span>
                  </span>
                  <span className="shrink-0">{dateTime(r.at, lang)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{r.text}</p>
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  {r.status === 'sent' ? (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
                      <CheckCheck className="h-3.5 w-3.5" /> {t('sent')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5" /> {t('failed')} — {t(`err_${r.error ?? 'invalidEmail'}`)}
                    </span>
                  )}
                  {r.status === 'failed' && canEdit && (
                    <button type="button" onClick={() => deliver(r.text, r.id)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-soft hover:text-ink">
                      <RotateCw className="h-3 w-3" /> {t('retry')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {canEdit ? (
        <div className="rounded-xl border border-line bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted">
            <Mail className="h-3.5 w-3.5" />
            {email ? t('to', { email }) : t('noEmailHint')}
          </div>
          <CTextarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t('replyPh')}
            disabled={!email}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim() && deliver(text.trim())) setText('');
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted">{t('repliesHint')}</span>
            <Button
              size="xs"
              shape="rounded"
              variant="primary"
              icon={<Send className="h-3.5 w-3.5" />}
              disabled={!email || !text.trim()}
              onClick={() => {
                if (deliver(text.trim())) setText('');
              }}
            >
              {t('send')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[12.5px] text-muted">{t('readOnly')}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Notes({ inquiry: q, canEdit }: { inquiry: InquiryX; canEdit: boolean }) {
  const t = useDict(T, 'admin');
  const [note, setNote] = useState(q.note ?? '');
  const dirty = note.trim() !== (q.note ?? '').trim();
  const save = () => {
    useDb.getState().updateInquiry(q.id, { note: note.trim() || undefined });
    toast.success(t('noteSaved'));
  };
  return (
    <div className="rounded-xl border border-dashed border-ink/20 bg-[#fafaf7] p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink-soft">
        <StickyNote className="h-3.5 w-3.5" /> {t('noteHint')}
      </div>
      <CTextarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder={t('notePh')}
        disabled={!canEdit}
        className="bg-white"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && dirty) save();
        }}
      />
      {canEdit && (
        <div className="mt-2 flex justify-end">
          <Button size="xs" shape="rounded" variant={dirty ? 'primary' : 'outline'} disabled={!dirty} onClick={save}>
            {t('saveNote')}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
interface Event {
  at: string;
  icon: typeof History;
  text: string;
  who?: string;
  status?: InquiryStatus;
}

function Timeline({ inquiry: q, bookings, quotes }: { inquiry: InquiryX; bookings: Booking[]; quotes: Quote[] }) {
  const t = useDict(T, 'admin');
  const tx = useDict(cx, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const audit = useDb((s) => s.audit);
  const staff = useDb((s) => s.staff);
  const services = useDb((s) => s.services);

  const events = useMemo(() => {
    const name = (id: string) => staff.find((m) => m.id === id)?.name ?? (id === 'web' ? 'Web' : id);
    const statusName = (s: string) => (STATUSES.includes(s as InquiryStatus) ? tx(`st_${s as InquiryStatus}`) : s);
    const out: Event[] = [];
    const src = tx(sourceKey(sourceOf(q)));
    const manual = sourceOf(q) === 'phone' || sourceOf(q) === 'manual';
    const mine = audit.filter((a: AuditEntry) => a.object === 'inquiry' && a.objectId === q.id);
    const createdBy = mine.find((a) => a.action === 'create');
    out.push({ at: q.createdAt, icon: CirclePlus, text: manual ? t('h_createdManual', { source: src }) : t('h_created', { source: src }), who: createdBy ? name(createdBy.actor) : undefined, status: 'new' });
    for (const a of mine) {
      if (a.action === 'create') continue;
      if (a.action === 'assign') {
        const who = a.detail?.split('→')[1]?.trim() || '—';
        out.push({ at: a.at, icon: UserRoundCheck, text: t('h_assign', { who: who === '—' ? tx('unassigned') : who }), who: name(a.actor) });
      } else if (a.action === 'status') {
        const m = /(\w+)\s*→\s*(\w+)/.exec(a.detail ?? '');
        out.push({ at: a.at, icon: ArrowRightLeft, text: m ? t('h_status', { from: statusName(m[1]), to: statusName(m[2]) }) : t('h_update'), who: name(a.actor), status: m?.[2] as InquiryStatus | undefined });
      } else if (a.action === 'send') {
        out.push({ at: a.at, icon: Send, text: t('h_send'), who: name(a.actor) });
      } else {
        out.push({ at: a.at, icon: History, text: t('h_update'), who: name(a.actor) });
      }
    }
    for (const b of bookings) {
      const svc = services.find((s) => s.id === b.serviceId);
      out.push({ at: b.createdAt, icon: CalendarCheck2, text: `${t('h_booking', { when: dateTime(b.start, lang) })}${svc ? ` · ${l(svc.name)}` : ''}`, who: name(b.staffId) });
    }
    for (const qu of quotes) out.push({ at: qu.createdAt, icon: FileText, text: `${t('h_quote', { number: qu.number })} · v${qu.version}`, who: qu.owner ? name(qu.owner) : undefined });
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [q, audit, staff, services, bookings, quotes, t, tx, l, lang]);

  return (
    <ol className="relative space-y-3.5 pl-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-line">
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span className={cn('absolute -left-6 top-0 grid h-[19px] w-[19px] place-items-center rounded-full border border-line bg-white text-ink-soft')}>
            {e.status ? <StatusSymbol status={e.status} className="h-2.5 w-2.5" /> : <e.icon className="h-2.5 w-2.5" />}
          </span>
          <div className="text-[13px] font-medium text-ink">{e.text}</div>
          <div className="mt-0.5 text-[12px] text-muted">
            {dateTime(e.at, lang)}
            {e.who && ` · ${e.who}`}
          </div>
        </li>
      ))}
    </ol>
  );
}
