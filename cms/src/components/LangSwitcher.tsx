import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { LANGS, type Scope } from '@/i18n';
import { useUi } from '@/store/ui';
import { useDb } from '@/store/db';
import { cn } from '@/lib/utils';

export function LangSwitcher({ scope = 'site', tone = 'dark', align = 'right', compact }: { scope?: Scope; tone?: 'dark' | 'light'; align?: 'left' | 'right'; compact?: boolean }) {
  const lang = useUi((s) => (scope === 'admin' ? s.adminLang : s.lang));
  const setLang = useUi((s) => (scope === 'admin' ? s.setAdminLang : s.setLang));
  const enabled = useDb((s) => s.settings.languages);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const langs = scope === 'admin' ? LANGS : LANGS.filter((l) => enabled[l.code]);
  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-bold tracking-wide transition-colors',
          tone === 'light' ? 'text-white/90 hover:bg-white/10' : 'text-ink hover:bg-ink/[0.06]',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4 opacity-80" />
        {compact ? current.short : current.label}
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-70 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-white p-1.5 text-ink shadow-xl animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {langs.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-sand/60', l.code === lang && 'bg-sand/60')}
            >
              <span className="flex items-center gap-2.5">
                <span className="grid h-6 w-8 place-items-center rounded-md bg-ink text-[10px] font-bold tracking-wider text-paper">{l.short}</span>
                {l.label}
              </span>
              {l.code === lang && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
