import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { useDict } from '@/i18n';
import { cn } from '@/lib/utils';
import { S } from './strings';
import { SECTIONS, sectionPath, type SectionDef, type SectionId } from './model';

interface NavProps {
  current: SectionId;
  dirty: boolean;
  examples: Set<SectionId>;
}

function Dots({ id, current, dirty, examples }: NavProps & { id: SectionId }) {
  const t = useDict(S, 'admin');
  return (
    <>
      {examples.has(id) && <span title={t('exampleDot')} aria-label={t('exampleDot')} className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
      {dirty && current === id && <span title={t('unsavedDot')} aria-label={t('unsavedDot')} className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink ring-2 ring-ink/15" />}
    </>
  );
}

function Item({ d, onNavigate, ...p }: NavProps & { d: SectionDef; onNavigate?: () => void }) {
  const t = useDict(S, 'admin');
  const on = d.id === p.current;
  return (
    <li>
      <Link
        to={sectionPath(d)}
        onClick={onNavigate}
        aria-current={on ? 'page' : undefined}
        title={d.to ? t('opensElsewhere') : undefined}
        className={cn(
          'group flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors',
          on ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-black/[0.06]' : 'font-medium text-ink-soft hover:bg-white/70 hover:text-ink',
        )}
      >
        <d.icon className={cn('h-4 w-4 shrink-0', on ? 'text-ink' : 'text-muted group-hover:text-ink-soft')} strokeWidth={on ? 2.1 : 1.8} />
        <span className="min-w-0 flex-1 truncate">{t(d.label)}</span>
        <Dots id={d.id} {...p} />
        {d.to && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />}
      </Link>
    </li>
  );
}

/** Settings sub-navigation (mock-up p.41): a grey card with a white pill for the current section. */
export function SettingsNav(p: NavProps) {
  const t = useDict(S, 'admin');
  const [open, setOpen] = useState(false);
  const cur = SECTIONS.find((d) => d.id === p.current) ?? SECTIONS[0];
  useEffect(() => setOpen(false), [p.current]);

  return (
    <>
      {/* Desktop */}
      <nav aria-label={t('navLabel')} className="hidden xl:block">
        <div className="sticky top-[76px] rounded-xl border border-line/80 bg-[#f6f6f6] p-2">
          <ul className="space-y-0.5">
            {SECTIONS.map((d) => (
              <Item key={d.id} d={d} {...p} />
            ))}
          </ul>
        </div>
      </nav>

      {/* Mobile / tablet: disclosure */}
      <nav aria-label={t('navLabel')} className="mb-4 xl:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-line/80 bg-white px-3.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
        >
          <cur.icon className="h-4 w-4 shrink-0 text-ink" />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-medium leading-tight text-muted">{t('chooseSection')}</span>
            <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{t(cur.label)}</span>
          </span>
          <Dots id={cur.id} {...p} />
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="mt-2 rounded-xl border border-line/80 bg-[#f6f6f6] p-2 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)]">
            <ul className="grid gap-0.5 sm:grid-cols-2">
              {SECTIONS.map((d) => (
                <Item key={d.id} d={d} {...p} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
          </div>
        )}
      </nav>
    </>
  );
}
