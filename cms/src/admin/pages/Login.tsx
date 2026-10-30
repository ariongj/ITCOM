import '@/admin/admin.css'; // full CMS stylesheet (the storefront sheet leaves admin-only classes out)
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ArrowLeft, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { LangSwitcher } from '@/components/LangSwitcher';
import { useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useUi } from '@/store/ui';
import { useDb } from '@/store/db';
import { sleep } from '@/lib/utils';

// Demo credentials (local demo only — not a real auth system). The e-mail comes from settings.adminEmail
// (admin@itcom.example by default).
const DEMO_PASSWORD = 'itcom2026';

export default function Login() {
  const t = useDict(adm, 'admin');
  const authed = useUi((s) => s.adminAuthed);
  const login = useUi((s) => s.login);
  const adminEmail = useDb((s) => s.settings.adminEmail);
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (authed) return <Navigate to="/admin" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await sleep(500);
    if (email.trim().toLowerCase() === adminEmail.toLowerCase() && password === DEMO_PASSWORD) {
      login();
      navigate('/admin');
    } else {
      setError(t('wrongPassword'));
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src={`${import.meta.env.BASE_URL}assets/photos/gaming-1600.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_30%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo tone="light" accent className="h-14" />
          <div>
            <p className="display max-w-md text-4xl leading-tight">{t('loginHero')}</p>
            <p className="mt-4 max-w-sm text-paper/70">{t('loginHeroText')}</p>
          </div>
        </div>
      </div>
      <div className="relative flex flex-col bg-paper">
        <div className="flex items-center justify-between p-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> {t('backToSite')}
          </Link>
          <LangSwitcher scope="admin" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <form onSubmit={submit} className="w-full max-w-sm">
            <div className="lg:hidden">
              <Logo className="mb-10 h-12" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t('loginTitle')}</h1>
            <p className="mt-2 text-muted">{t('loginText')}</p>
            <div className="mt-8 space-y-4">
              <Input label={t('email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} leading={<Mail className="h-4 w-4" />} autoComplete="username" />
              <Input label={t('password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} leading={<Lock className="h-4 w-4" />} error={error} autoComplete="current-password" />
            </div>
            <Button type="submit" size="lg" shape="rounded" className="mt-6 w-full" loading={busy}>
              {t('login')}
            </Button>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-sand/70 p-3 text-[13px] text-ink-soft">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /> {t('demoHint')}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
