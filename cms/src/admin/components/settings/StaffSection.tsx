import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Check, Eye, KeyRound, Lock, Mail, Pencil, Phone, Plus, ScrollText, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { FilterPills, confirmDialog } from '@/admin/components/kit';
import { MODULE_LABEL } from '@/admin/layout/nav';
import { adm } from '@/admin/i18n';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Overlay';
import { defineDict, useDict, useL, useLang } from '@/i18n';
import { timeAgo } from '@/lib/format';
import { ACTIONS, MODULES, ROLES, ROLE_META, can, modulesFor, type Action } from '@/lib/permissions';
import type { RoleId, Staff } from '@/lib/types';
import { cn, uid } from '@/lib/utils';
import { useDb } from '@/store/db';
import { useCan, useCurrentStaff } from '@/store/hooks';
import { useUi } from '@/store/ui';
import { S } from './strings';
import { TextField, isEmail } from './fields';
import { Avatar, Choice, Gate, LinkRow, Panel, StateText } from './ui';

const ST = defineDict({
  me: {
    members: 'Članova: {n} · aktivnih: {active}',
    addMember: 'Dodaj člana',
    colMember: 'Član',
    colRole: 'Uloga',
    colAccess: 'Prijava',
    colLast: 'Posljednja aktivnost',
    colStatus: 'Status',
    mfa: 'MFA obavezna',
    password: 'Lozinka',
    you: 'Vi',
    editMember: 'Izmijeni člana',
    newMember: 'Novi član',
    name: 'Ime i prezime',
    email: 'E-mail',
    phone: 'Telefon',
    role: 'Uloga',
    activeLabel: 'Aktivan nalog',
    activeHint: 'Neaktivan nalog ne može da se prijavi; istorija ostaje sačuvana.',
    invite: 'Pozivnica se šalje na e-mail; član sam postavlja lozinku.',
    mfaHint: 'Uloga „{role}“ zahtijeva MFA pri prijavi.',
    memberSaved: 'Član je sačuvan',
    memberAdded: 'Pozivnica je poslata na {email}',
    removeTitle: 'Ukloniti nalog „{name}“?',
    removeText: 'Nalog se briše, a istorija aktivnosti ostaje u dnevniku.',
    removed: 'Član je uklonjen',
    cantSelf: 'Ne možete ukloniti sopstveni nalog',
    lastOwner: 'Mora postojati bar jedan aktivan vlasnik',
    nameReq: 'Unesite ime',
    emailBad: 'Neispravna e-mail adresa',
    emailTaken: 'Ovaj e-mail već koristi drugi član',
    matrix: 'Matrica dozvola',
    matrix_d: 'Pregled, izmjena, objava, arhiviranje, brisanje, uvoz i izvoz — po modulu. Priprema ponuda odvojena je od aktiviranja.',
    readOnly: 'Samo za čitanje',
    module: 'Modul',
    noAccess: 'Bez pristupa',
    allowed: 'Dozvoljeno',
    denied: 'Nije dozvoljeno',
    tryRole: 'Isprobaj ulogu',
    modulesCount: 'Modula: {n} od {total}',
    act_view: 'Pregled',
    act_edit: 'Izmjena',
    act_publish: 'Objava',
    act_archive: 'Arhiva',
    act_delete: 'Brisanje',
    act_import: 'Uvoz',
    act_export: 'Izvoz',
    act_viewCost: 'Trošak',
    act_refund: 'Povrat',
    act_cancel: 'Otkaz',
    catalogNote: 'Dozvole za katalog uključuju pregled i izmjenu troška, izmjenu cijene, izvoz, brisanje i posebne dozvole za inventar, transfere i dostave.',
    security: 'Sigurnost i revizija',
    security_d: 'Prijava, sesije i dnevnik aktivnosti (PDF str. 42).',
    sec1: 'MFA obavezna za privilegovane uloge — vlasnik i menadžer.',
    sec2: 'Sesija ističe nakon 12 sati neaktivnosti.',
    sec3: 'Ograničenje pokušaja: 5 pogrešnih prijava → zaključavanje 15 min.',
    sec4: 'Dozvole za integracije su posebni scope-ovi.',
    sec5: 'Zabrana važi i za direktan API zahtjev — dozvole provjerava server.',
    audit: 'Dnevnik aktivnosti',
    audit_d: 'Svaka važna radnja bilježi aktera, radnju, vrijeme, objekat i promjenu · zapisa: {n}',
    openActivity: 'Otvori',
    never: '—',
  },
  sq: {
    members: 'Anëtarë: {n} · aktivë: {active}',
    addMember: 'Shto anëtar',
    colMember: 'Anëtari',
    colRole: 'Roli',
    colAccess: 'Hyrja',
    colLast: 'Aktiviteti i fundit',
    colStatus: 'Statusi',
    mfa: 'MFA e detyrueshme',
    password: 'Fjalëkalim',
    you: 'Ju',
    editMember: 'Ndrysho anëtarin',
    newMember: 'Anëtar i ri',
    name: 'Emri dhe mbiemri',
    email: 'E-mail',
    phone: 'Telefoni',
    role: 'Roli',
    activeLabel: 'Llogari aktive',
    activeHint: 'Llogaria joaktive nuk mund të hyjë; historiku ruhet.',
    invite: 'Ftesa dërgohet me email; anëtari e vendos vetë fjalëkalimin.',
    mfaHint: 'Roli „{role}“ kërkon MFA gjatë hyrjes.',
    memberSaved: 'Anëtari u ruajt',
    memberAdded: 'Ftesa u dërgua te {email}',
    removeTitle: 'Të hiqet llogaria „{name}“?',
    removeText: 'Llogaria fshihet, ndërsa historiku i aktivitetit mbetet në ditar.',
    removed: 'Anëtari u hoq',
    cantSelf: 'Nuk mund ta hiqni llogarinë tuaj',
    lastOwner: 'Duhet të ketë të paktën një Pronar aktiv',
    nameReq: 'Shkruani emrin',
    emailBad: 'Adresë e-maili e pavlefshme',
    emailTaken: 'Ky email përdoret nga një anëtar tjetër',
    matrix: 'Matrica e lejeve',
    matrix_d: 'Lexim, krijim/ndryshim, publikim, arkivim, fshirje, import dhe eksport — sipas modulit. Përgatitja e ofertave është e ndarë nga aktivizimi.',
    readOnly: 'Vetëm për lexim',
    module: 'Moduli',
    noAccess: 'Pa qasje',
    allowed: 'Lejohet',
    denied: 'Nuk lejohet',
    tryRole: 'Provo këtë rol',
    modulesCount: 'Module: {n} nga {total}',
    act_view: 'Shiko',
    act_edit: 'Ndrysho',
    act_publish: 'Publiko',
    act_archive: 'Arkivo',
    act_delete: 'Fshij',
    act_import: 'Importo',
    act_export: 'Eksporto',
    act_viewCost: 'Kosto',
    act_refund: 'Rimburso',
    act_cancel: 'Anulo',
    catalogNote: 'Lejet për katalogun përfshijnë shikimin dhe redaktimin e kostos, redaktimin e çmimit, eksportin, fshirjen dhe leje të veçanta për inventar, transferime dhe dërgesa.',
    security: 'Siguria dhe auditimi',
    security_d: 'Hyrja, sesionet dhe ditari i aktivitetit (PDF f. 42).',
    sec1: 'MFA e detyrueshme për role të privilegjuara — Pronar dhe Menaxher.',
    sec2: 'Sesioni skadon pas 12 orësh pa aktivitet.',
    sec3: 'Kufizim përpjekjesh: 5 hyrje të gabuara → bllokim 15 min.',
    sec4: 'Lejet për integrime janë scopes të veçanta.',
    sec5: 'Ndalimi vlen edhe për kërkesë direkte në API — lejet i kontrollon serveri.',
    audit: 'Ditari i aktivitetit',
    audit_d: 'Çdo veprim i rëndësishëm regjistron aktorin, veprimin, kohën, objektin dhe ndryshimin · regjistrime: {n}',
    openActivity: 'Hap',
    never: '—',
  },
  en: {
    members: 'Members: {n} · active: {active}',
    addMember: 'Add member',
    colMember: 'Member',
    colRole: 'Role',
    colAccess: 'Sign-in',
    colLast: 'Last activity',
    colStatus: 'Status',
    mfa: 'MFA required',
    password: 'Password',
    you: 'You',
    editMember: 'Edit member',
    newMember: 'New member',
    name: 'Full name',
    email: 'E-mail',
    phone: 'Phone',
    role: 'Role',
    activeLabel: 'Active account',
    activeHint: 'An inactive account can’t sign in; its history is kept.',
    invite: 'An invitation is e-mailed; the member sets their own password.',
    mfaHint: 'The “{role}” role requires MFA at sign-in.',
    memberSaved: 'Member saved',
    memberAdded: 'Invitation sent to {email}',
    removeTitle: 'Remove the account “{name}”?',
    removeText: 'The account is deleted; its activity history stays in the log.',
    removed: 'Member removed',
    cantSelf: 'You can’t remove your own account',
    lastOwner: 'There must be at least one active owner',
    nameReq: 'Enter a name',
    emailBad: 'Invalid e-mail address',
    emailTaken: 'Another member already uses this e-mail',
    matrix: 'Permission matrix',
    matrix_d: 'View, create/edit, publish, archive, delete, import and export — per module. Preparing offers is separate from activating them.',
    readOnly: 'Read-only',
    module: 'Module',
    noAccess: 'No access',
    allowed: 'Allowed',
    denied: 'Not allowed',
    tryRole: 'Try this role',
    modulesCount: 'Modules: {n} of {total}',
    act_view: 'View',
    act_edit: 'Edit',
    act_publish: 'Publish',
    act_archive: 'Archive',
    act_delete: 'Delete',
    act_import: 'Import',
    act_export: 'Export',
    act_viewCost: 'Cost',
    act_refund: 'Refund',
    act_cancel: 'Cancel',
    catalogNote: 'Catalogue permissions include viewing and editing cost, editing price, export, deletion and separate permissions for inventory, transfers and shipments.',
    security: 'Security & audit',
    security_d: 'Sign-in, sessions and the activity log (PDF p. 42).',
    sec1: 'MFA required for privileged roles — owner and manager.',
    sec2: 'Sessions expire after 12 hours of inactivity.',
    sec3: 'Attempt limit: 5 failed sign-ins → 15-minute lock.',
    sec4: 'Integration permissions are separate scopes.',
    sec5: 'Denials also apply to direct API requests — the server checks permissions.',
    audit: 'Activity log',
    audit_d: 'Every important action records the actor, action, time, object and change · entries: {n}',
    openActivity: 'Open',
    never: '—',
  },
});

export type StKey = keyof typeof ST.me;

/** Roles that must use MFA (PDF p.42 "MFA për role të privilegjuara"). */
export const PRIVILEGED: RoleId[] = ['owner', 'manager'];
const COLORS = ['#3d5a80', '#6b5b95', '#2f7d6d', '#9c6644', '#b5651d', '#5c6f2b', '#7a4069', '#44546a'];

/* ------------------------------------------------------------------ */
/* Staff member editor                                                 */
/* ------------------------------------------------------------------ */
function StaffModal({ open, member, onClose }: { open: boolean; member: Staff | null; onClose: () => void }) {
  const t = useDict(ST, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const staff = useDb((s) => s.staff);
  const upsert = useDb((s) => s.upsert);
  const isNew = !member;
  const [draft, setDraft] = useState<Staff>(() => member ?? { id: uid('st'), name: '', email: '', role: 'orders', color: COLORS[staff.length % COLORS.length], active: true });
  const [tried, setTried] = useState(false);

  const otherOwners = staff.filter((m) => m.id !== draft.id && m.role === 'owner' && m.active).length;
  const lockOwner = member?.role === 'owner' && member.active && otherOwners === 0;
  const emailTaken = staff.some((m) => m.id !== draft.id && m.email.trim().toLowerCase() === draft.email.trim().toLowerCase());
  const errors = {
    name: !draft.name.trim() ? t('nameReq') : undefined,
    email: !isEmail(draft.email) ? t('emailBad') : emailTaken ? t('emailTaken') : undefined,
  };
  const valid = !errors.name && !errors.email;

  const save = () => {
    setTried(true);
    if (!valid) return;
    upsert('staff', { ...draft, name: draft.name.trim(), email: draft.email.trim().toLowerCase(), phone: draft.phone?.trim() || undefined });
    toast.success(isNew ? t('memberAdded', { email: draft.email.trim().toLowerCase() }) : t('memberSaved'));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? t('newMember') : t('editMember')}
      description={isNew ? t('invite') : member?.email}
      footer={
        <>
          <Button variant="outline" size="sm" shape="rounded" onClick={onClose}>
            {ta('cancel')}
          </Button>
          <Button size="sm" shape="rounded" onClick={save}>
            {isNew ? t('addMember') : ta('save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 px-6 py-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          <TextField label={t('name')} value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} leading={<UserRound className="h-4 w-4" />} error={tried ? errors.name : undefined} autoFocus />
          <TextField label={t('email')} type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })} leading={<Mail className="h-4 w-4" />} error={tried ? errors.email : undefined} />
          <TextField label={t('phone')} optional type="tel" value={draft.phone ?? ''} onChange={(v) => setDraft({ ...draft, phone: v })} leading={<Phone className="h-4 w-4" />} placeholder="+383 …" />
          <div className="rounded-lg border border-line px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13.5px] font-semibold text-ink">{t('activeLabel')}</span>
              <Switch checked={draft.active} disabled={lockOwner} onChange={(v) => setDraft({ ...draft, active: v })} label={<span className="sr-only">{t('activeLabel')}</span>} />
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-muted">{lockOwner ? t('lastOwner') : t('activeHint')}</p>
          </div>
          {PRIVILEGED.includes(draft.role) && (
            <p className="flex items-start gap-2 text-[12.5px] leading-snug text-muted">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('mfaHint', { role: l(ROLE_META[draft.role].name) })}
            </p>
          )}
        </div>
        <div>
          <div className="mb-2.5 text-[13px] font-semibold text-ink-soft">{t('role')}</div>
          <div role="radiogroup" aria-label={t('role')} className="grid gap-2">
            {ROLES.map((r) => (
              <Choice
                key={r}
                checked={draft.role === r}
                disabled={lockOwner && r !== 'owner'}
                onSelect={() => setDraft({ ...draft, role: r })}
                title={l(ROLE_META[r].name)}
                description={l(ROLE_META[r].description)}
                aside={PRIVILEGED.includes(r) ? <span className="mt-0.5 shrink-0 text-[11px] font-semibold text-muted">MFA</span> : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Read-only permission matrix                                         */
/* ------------------------------------------------------------------ */
function RoleMatrix() {
  const t = useDict(ST, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const navigate = useNavigate();
  const staff = useDb((s) => s.staff);
  const currentRole = useUi((s) => s.adminRole);
  const setRole = useUi((s) => s.setAdminRole);
  const [role, setRoleTab] = useState<RoleId>(currentRole === 'owner' ? 'manager' : currentRole);
  const counts = useMemo(() => Object.fromEntries(ROLES.map((r) => [r, staff.filter((m) => m.role === r && m.active).length])) as Record<RoleId, number>, [staff]);
  const visible = modulesFor(role).length;

  const tryRole = () => {
    setRole(role);
    toast(ta('roleSwitched', { role: l(ROLE_META[role].name) }));
    if (!can(role, 'settings', 'view')) navigate('/admin');
  };

  return (
    <Panel
      title={t('matrix')}
      description={t('matrix_d')}
      actions={
        <StateText tone="info">
          <Lock className="-ml-0.5 h-3 w-3" /> {t('readOnly')}
        </StateText>
      }
      flush
      footnote={t('catalogNote')}
    >
      <div className="border-b border-line/70 px-5 py-3.5 sm:px-6">
        <FilterPills<RoleId> value={role} onChange={setRoleTab} options={ROLES.map((r) => ({ id: r, label: l(ROLE_META[r].name), count: counts[r] }))} />
        <div className="mt-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-[14px] font-semibold text-ink">{l(ROLE_META[role].name)}</span>
              {PRIVILEGED.includes(role) && <StateText tone="info">MFA</StateText>}
              <span className="text-[12.5px] text-muted">{t('modulesCount', { n: visible, total: MODULES.length })}</span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{l(ROLE_META[role].description)}</p>
          </div>
          {role !== currentRole && (
            <Button variant="outline" size="xs" shape="rounded" icon={<Eye className="h-3.5 w-3.5" />} onClick={tryRole} className="self-start sm:self-center">
              {t('tryRole')}
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] border-b border-line bg-[#f7f7f7] py-2.5 pl-5 pr-3 text-[12px] font-semibold text-muted sm:pl-6">{t('module')}</th>
              {ACTIONS.map((a) => (
                <th key={a} className="border-b border-line bg-[#f7f7f7] px-1.5 py-2.5 text-center text-[11.5px] font-semibold text-muted last:pr-5 sm:last:pr-6">
                  {t(`act_${a}` as StKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map((m) => {
              const any = can(role, m, 'view');
              return (
                <tr key={m} className="group">
                  <td className="sticky left-0 z-[1] border-b border-line/60 bg-white py-2 pl-5 pr-3 group-hover:bg-[#fafafa] sm:pl-6">
                    <span className={cn('font-medium', any ? 'text-ink' : 'text-muted')}>{ta(MODULE_LABEL[m])}</span>
                    {!any && <span className="ml-2 text-[11.5px] text-muted/80">· {t('noAccess')}</span>}
                  </td>
                  {ACTIONS.map((a: Action) => {
                    const ok = can(role, m, a);
                    return (
                      <td key={a} className="border-b border-line/60 px-1.5 py-2 text-center group-hover:bg-[#fafafa] last:pr-5 sm:last:pr-6" title={`${ta(MODULE_LABEL[m])} · ${t(`act_${a}` as StKey)}: ${ok ? t('allowed') : t('denied')}`}>
                        {ok ? (
                          <Check className="mx-auto h-4 w-4 text-ink" strokeWidth={2.4} aria-label={t('allowed')} />
                        ) : (
                          <span className="text-ink/20" aria-label={t('denied')}>
                            –
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */
export function StaffSection() {
  const t = useDict(ST, 'admin');
  const ts = useDict(S, 'admin');
  const ta = useDict(adm, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const allow = useCan();
  const me = useCurrentStaff();
  const staff = useDb((s) => s.staff);
  const audit = useDb((s) => s.audit);
  const remove = useDb((s) => s.remove);
  const [editing, setEditing] = useState<{ member: Staff | null; key: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const openEditor = (member: Staff | null) => {
    setEditing({ member, key: Date.now() });
    setModalOpen(true);
  };

  const canEdit = allow('staff', 'edit');
  const canDelete = allow('staff', 'delete');
  const lastSeen = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of audit) if (!m.has(a.actor) || m.get(a.actor)! < a.at) m.set(a.actor, a.at);
    return m;
  }, [audit]);
  const sorted = useMemo(() => [...staff].sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name)), [staff]);
  const active = staff.filter((m) => m.active).length;

  const del = async (m: Staff) => {
    if (m.id === me?.id) return toast.error(t('cantSelf'));
    if (m.role === 'owner' && m.active && staff.filter((x) => x.role === 'owner' && x.active).length <= 1) return toast.error(t('lastOwner'));
    const ok = await confirmDialog({ title: t('removeTitle', { name: m.name }), text: t('removeText'), confirmLabel: ta('delete'), danger: true });
    if (!ok) return;
    remove('staff', m.id);
    toast.success(t('removed'));
  };

  const access = (m: Staff) =>
    PRIVILEGED.includes(m.role) ? (
      <StateText tone="info">
        <ShieldCheck className="-ml-0.5 h-3.5 w-3.5 text-ink-soft" /> {t('mfa')}
      </StateText>
    ) : (
      <StateText tone="info">
        <KeyRound className="-ml-0.5 h-3.5 w-3.5 text-muted" /> {t('password')}
      </StateText>
    );
  const status = (m: Staff) => <StateText tone={m.active ? 'ok' : 'off'}>{m.active ? ta('active') : ta('inactive')}</StateText>;
  const rowActions = (m: Staff) => (
    <span className="flex items-center justify-end gap-0.5">
      <Gate allowed={canEdit} reason={ts('noPermission')}>
        <button type="button" disabled={!canEdit} onClick={() => openEditor(m)} title={ta('edit')} aria-label={`${ta('edit')}: ${m.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink disabled:pointer-events-none disabled:opacity-35">
          <Pencil className="h-4 w-4" />
        </button>
      </Gate>
      <Gate allowed={canDelete} reason={ts('noPermission')}>
        <button type="button" disabled={!canDelete || m.id === me?.id} onClick={() => void del(m)} title={m.id === me?.id ? t('cantSelf') : ta('delete')} aria-label={`${ta('delete')}: ${m.name}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-35">
          <Trash2 className="h-4 w-4" />
        </button>
      </Gate>
    </span>
  );
  const who = (m: Staff) => (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={m.name} color={m.active ? m.color : '#a3a3a3'} />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className={cn('truncate font-semibold', m.active ? 'text-ink' : 'text-muted')}>{m.name}</span>
          {m.id === me?.id && <span className="rounded bg-ink px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white">{t('you')}</span>}
        </span>
        <span className="block truncate text-[12.5px] text-muted">{m.email}</span>
      </span>
    </span>
  );

  return (
    <div className="space-y-5">
      <Panel
        lead
        flush
        title={ts('sec_staff')}
        description={ts('sec_staff_d')}
        actions={
          <Gate allowed={canEdit} reason={ts('noPermission')}>
            <Button size="sm" shape="rounded" icon={<Plus className="h-4 w-4" />} disabled={!canEdit} onClick={() => openEditor(null)}>
              {t('addMember')}
            </Button>
          </Gate>
        }
      >
        <div className="px-5 py-2.5 text-[12.5px] text-muted sm:px-6">{t('members', { n: staff.length, active })}</div>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full border-collapse text-left text-[13.5px]">
            <thead>
              <tr>
                {[t('colMember'), t('colRole'), t('colAccess'), t('colLast'), t('colStatus'), ''].map((h, i) => (
                  <th key={i} className="whitespace-nowrap border-y border-line bg-[#f7f7f7] px-3 py-2.5 text-[12.5px] font-semibold text-muted first:pl-6 last:pr-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-[#fafafa]">
                  <td className="border-b border-line/60 py-2.5 pl-6 pr-3">{who(m)}</td>
                  <td className="border-b border-line/60 px-3 py-2.5">
                    <div className="font-medium text-ink">{l(ROLE_META[m.role].name)}</div>
                    {m.title && <div className="truncate text-[12px] text-muted">{l(m.title)}</div>}
                  </td>
                  <td className="border-b border-line/60 px-3 py-2.5">{access(m)}</td>
                  <td className="whitespace-nowrap border-b border-line/60 px-3 py-2.5 text-[12.5px] text-muted">{lastSeen.has(m.id) ? timeAgo(lastSeen.get(m.id)!, lang) : t('never')}</td>
                  <td className="border-b border-line/60 px-3 py-2.5">{status(m)}</td>
                  <td className="border-b border-line/60 py-2.5 pl-3 pr-5">{rowActions(m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile list */}
        <ul className="divide-y divide-line/60 border-t border-line md:hidden">
          {sorted.map((m) => (
            <li key={m.id} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-2">
                {who(m)}
                {rowActions(m)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 pl-11 text-[12.5px]">
                <span className="font-semibold text-ink">{l(ROLE_META[m.role].name)}</span>
                {access(m)}
                {status(m)}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <RoleMatrix />

      <Panel title={t('security')} description={t('security_d')}>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {(['sec1', 'sec2', 'sec3', 'sec4', 'sec5'] as const).map((k) => (
            <li key={k} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-soft">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" strokeWidth={2.6} />
              {t(k)}
            </li>
          ))}
        </ul>
        <div className="mt-5 border-t border-line/70 pt-4">
          <LinkRow icon={ScrollText} title={t('audit')} text={t('audit_d', { n: audit.length })} to="/admin/konfiguracija/aktiviteti" cta={t('openActivity')} />
        </div>
      </Panel>

      {editing && <StaffModal key={editing.key} open={modalOpen} member={editing.member} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
