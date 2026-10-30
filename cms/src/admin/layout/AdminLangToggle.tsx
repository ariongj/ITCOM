import { LANGS, useDict } from '@/i18n';
import { adm } from '@/admin/i18n';
import { useUi } from '@/store/ui';
import { cn } from '@/lib/utils';

/**
 * SQ / EN / SR segmented switch for the CMS language (independent of the storefront language).
 * `full` stretches the three buttons over the available width (drawer, account menu).
 */
export function AdminLangToggle({ tone = 'dark', full }: { tone?: 'dark' | 'light'; full?: boolean }) {
  const lang = useUi((s) => s.adminLang);
  const setLang = useUi((s) => s.setAdminLang);
  const t = useDict(adm, 'admin');
  return (
    <div role="radiogroup" aria-label={t('adminLang')} className={cn('items-center gap-0.5 rounded-lg p-0.5', full ? 'flex w-full' : 'inline-flex', tone === 'dark' ? 'bg-white/[0.08] ring-1 ring-white/10' : 'bg-[#f1f1f1] ring-1 ring-black/[0.06]')}>
      {LANGS.map((l) => {
        const on = l.code === lang;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={on}
            title={l.label}
            onClick={() => setLang(l.code)}
            className={cn(
              'h-7 min-w-[34px] rounded-md px-2 text-[11.5px] font-bold tracking-wide transition-colors',
              full && 'flex-1',
              tone === 'dark'
                ? on
                  ? 'bg-white text-[#1a1a1a]'
                  : 'text-white/65 hover:bg-white/10 hover:text-white'
                : on
                  ? 'bg-white text-[#1a1a1a] shadow-[0_1px_2px_rgb(0_0_0/0.1)]'
                  : 'text-muted hover:text-ink',
            )}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}
