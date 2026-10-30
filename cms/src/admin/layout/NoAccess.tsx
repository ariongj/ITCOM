import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowLeft, Lock } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/Button';
import { useDict, useL } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useUi } from '@/store/ui';
import { ROLE_META, can, type Module } from '@/lib/permissions';
import { MODULE_LABEL } from './nav';

/** Shown by <RequirePerm> when the current role cannot open a screen. */
export default function NoAccess({ module }: { module: Module }) {
  const t = useDict(adm, 'admin');
  const l = useL('admin');
  const role = useUi((s) => s.adminRole);
  const setRole = useUi((s) => s.setAdminRole);
  const roleName = l(ROLE_META[role].name);

  return (
    <div className="grid min-h-[60vh] place-items-center py-10">
      <div className="w-full max-w-[460px] rounded-xl border border-line bg-white px-6 py-9 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:px-10">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-canvas text-ink ring-1 ring-line">
          <Lock className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-[22px] font-bold tracking-tight text-ink">{t('noAccessTitle')}</h1>
        <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">
          {t('noAccessText', { role: roleName, module: t(MODULE_LABEL[module]) })}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {can(role, 'overview') && (
            <Link to="/admin" className={buttonClass({ variant: 'outline', size: 'sm', shape: 'rounded', className: 'bg-white' })}>
              <ArrowLeft className="h-4 w-4" /> {t('backToOverview')}
            </Link>
          )}
          <Button
            size="sm"
            shape="rounded"
            onClick={() => {
              setRole('owner');
              toast(t('roleSwitched', { role: l(ROLE_META.owner.name) }));
            }}
          >
            {t('viewAsOwner')}
          </Button>
        </div>
      </div>
    </div>
  );
}
