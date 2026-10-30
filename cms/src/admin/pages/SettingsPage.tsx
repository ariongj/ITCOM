// Konfigurimet — a separate settings space (proposal pp.39–42, mock-up p.41):
// sub-navigation on the left, one section per route (/admin/konfiguracija/:section), one shared draft + SaveBar.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { PageHeader, SaveBar } from '@/admin/components/kit';
import { defineDict, useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useDb } from '@/store/db';
import { useUi } from '@/store/ui';
import { can, ROLE_META } from '@/lib/permissions';
import type { Settings } from '@/lib/types';
import { S } from '@/admin/components/settings/strings';
import { isEmail, isExample } from '@/admin/components/settings/fields';
import { Note } from '@/admin/components/settings/ui';
import { SettingsNav } from '@/admin/components/settings/SettingsNav';
import {
  EXAMPLE_FIELDS, ORDER_PREFIX_RE, sectionFor, same, withExt,
  type Errors, type SecProps, type SectionId, type SetExt, type SettingsX, type SetX,
} from '@/admin/components/settings/model';
import { GeneralSection } from '@/admin/components/settings/GeneralSection';
import { StaffSection } from '@/admin/components/settings/StaffSection';
import { PaymentsSection } from '@/admin/components/settings/PaymentsSection';
import { CheckoutSection } from '@/admin/components/settings/CheckoutSection';
import { ShippingSection } from '@/admin/components/settings/ShippingSection';
import { LocationsSection } from '@/admin/components/settings/LocationsSection';
import { LanguagesSection } from '@/admin/components/settings/LanguagesSection';
import { NotificationsSection } from '@/admin/components/settings/NotificationsSection';
import { PrivacySection } from '@/admin/components/settings/PrivacySection';
import { ActivitySection } from '@/admin/components/settings/ActivitySection';
import { DemoDataSection } from '@/admin/components/settings/DemoDataSection';

const P = defineDict({
  me: { invalidEmail: 'E-mail adresa nije ispravna' },
  sq: { invalidEmail: 'Adresa e e-mailit nuk është e saktë' },
  en: { invalidEmail: 'The e-mail address is not valid' },
});

/** Validation for the fields that would break the storefront or checkout if saved wrong. */
function validate(d: SettingsX, t: (k: 'invalidPrefix' | 'needLocation' | 'subjectMissing') => string, invalidEmail: string): Errors {
  const e: Errors = {};
  if (!ORDER_PREFIX_RE.test(d.orderPrefix ?? '')) e.orderPrefix = t('invalidPrefix');
  if (d.email && !isEmail(d.email)) e.email = invalidEmail;
  if (d.adminEmail && !isEmail(d.adminEmail)) e.adminEmail = invalidEmail;
  const locs = d.locations ?? [];
  if (!locs.length || !locs.some((l) => l.isDefault)) e.locations = t('needLocation');
  if ((d.notifications ?? []).some((n) => !n.subject?.sq?.trim())) e.notifications = t('subjectMissing');
  return e;
}

export default function SettingsPage() {
  const t = useDict(S, 'admin');
  const ta = useDict(adm, 'admin');
  const tp = useDict(P, 'admin');
  const l = useL('admin');
  const { section: slug } = useParams();
  const def = sectionFor(slug);
  const saved = useDb((s) => s.settings);
  const updateSettings = useDb((s) => s.updateSettings);
  const role = useUi((s) => s.adminRole);
  const readOnly = !can(role, 'settings', 'edit');

  const base = useMemo(() => withExt(saved), [saved]);
  const [draft, setDraft] = useState<SettingsX>(base);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // Saved settings changed elsewhere (another tab, import, reset) and nothing is being edited → follow them.
  const dirty = !same(draft, base);
  useEffect(() => {
    if (!dirty) setDraft(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const set: SetX = useCallback((key, value) => setDraft((d) => ({ ...d, [key]: value })), []);
  const setExt: SetExt = useCallback((key, value) => setDraft((d) => ({ ...d, ext: { ...d.ext, [key]: value } })), []);

  const save = useCallback(async () => {
    if (readOnly) {
      toast.error(t('ownerOnly'));
      return;
    }
    const errs = validate(draft, t, tp('invalidEmail'));
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    updateSettings(draft as unknown as Partial<Settings>);
    setSaving(false);
    toast.success(ta('saved'));
  }, [draft, readOnly, t, ta, updateSettings]);

  const discard = useCallback(() => {
    setDraft(base);
    setErrors({});
  }, [base]);

  // Ctrl/⌘+S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, save]);

  const examples = useMemo(() => {
    const out = new Set<SectionId>();
    for (const f of EXAMPLE_FIELDS) if (isExample(draft[f.key] as string | undefined)) out.add(f.section);
    return out;
  }, [draft]);

  if (!def) return <Navigate to="/admin/konfiguracija" replace />;
  if (def.to) return <Navigate to={def.to} replace />;

  const props: SecProps = { s: draft, set, setExt, errors, readOnly };
  const body = (() => {
    switch (def.id) {
      case 'general': return <GeneralSection {...props} />;
      case 'staff': return <StaffSection />;
      case 'payments': return <PaymentsSection {...props} />;
      case 'checkout': return <CheckoutSection {...props} />;
      case 'shipping': return <ShippingSection {...props} />;
      case 'locations': return <LocationsSection {...props} />;
      case 'languages': return <LanguagesSection {...props} />;
      case 'notifications': return <NotificationsSection {...props} />;
      case 'privacy': return <PrivacySection {...props} />;
      case 'activity': return <ActivitySection />;
      case 'data': return <DemoDataSection {...props} onReplaced={(next) => setDraft(withExt(next))} />;
      default: return null;
    }
  })();
  const editsSettings = def.keys.length > 0;

  return (
    <div>
      <PageHeader breadcrumbs={[t('title'), t(def.label)]} title={t('title')} />
      <div className="grid gap-6 xl:grid-cols-[232px_minmax(0,1fr)]">
        <SettingsNav current={def.id} dirty={dirty} examples={examples} />
        <div className="min-w-0 space-y-5 pb-24">
          {readOnly && editsSettings && (
            <Note icon={Lock}>
              <span className="font-semibold text-ink">{t('readOnlyTitle')}</span> — {t('readOnlyText', { role: l(ROLE_META[role].name) })}
            </Note>
          )}
          {body}
        </div>
      </div>
      {editsSettings && <SaveBar dirty={dirty && !readOnly} onSave={() => void save()} onDiscard={discard} saving={saving} />}
    </div>
  );
}
