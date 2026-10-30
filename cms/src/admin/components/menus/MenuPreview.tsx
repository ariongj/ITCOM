// Live preview of the menu being edited, drawn in the storefront's warm palette (only visible links,
// exactly as the header / footer resolve them).
import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, ChevronDown, Info, Monitor, Smartphone, X } from 'lucide-react';
import { Card } from '@/admin/components/kit';
import { Segmented } from '@/admin/components/editorial/ui';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { useDict, useL } from '@/i18n';
import { usePlacements, useSettings } from '@/store/hooks';
import type { Menu, MenuItem } from '@/lib/types';
import { cn, thumb } from '@/lib/utils';
import { isPromo, liveTree, resolveLink, type LinkSources, type NavNode } from './links';
import { mn } from './dict';
import { storeVars } from './ui';

const isTile = (n: NavNode) => !!n.entity?.image && n.type !== 'url' && n.type !== 'page' && !isPromo(n);

export function MenuPreview({ handle, items, src }: { handle: Menu['handle']; items: MenuItem[]; src: LinkSources }) {
  const t = useDict(mn, 'admin');
  const settings = useSettings();
  const [mode, setMode] = useState<'desktop' | 'mobile'>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' : 'desktop'));
  const nodes = useMemo(() => liveTree(items, src), [items, src]);
  const notShown = useMemo(() => {
    let n = 0;
    const visit = (it: MenuItem) => {
      if (!resolveLink(it, src).live) n++;
      (it.children ?? []).forEach(visit);
    };
    items.forEach(visit);
    return n;
  }, [items, src]);

  return (
    <Card
      padded={false}
      title={t('preview')}
      description={t('previewText')}
      actions={
        handle === 'main' ? (
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'desktop', label: <Monitor className="h-3.5 w-3.5" />, title: t('desktop') },
              { id: 'mobile', label: <Smartphone className="h-3.5 w-3.5" />, title: t('mobile') },
            ]}
          />
        ) : undefined
      }
    >
      <div className="p-4 sm:p-5">
        <div style={storeVars(settings.brandColor)}>
          {nodes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-[13px] text-muted">{t('fallbackNote')}</div>
          ) : handle === 'footer' ? (
            <FooterPreview nodes={nodes} />
          ) : mode === 'desktop' ? (
            <DesktopPreview key={nodes.map((n) => n.id).join()} nodes={nodes} />
          ) : (
            <MobilePreview nodes={nodes} />
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          {handle === 'main' && mode === 'desktop' && nodes.some((n) => n.children.length) && (
            <span className="inline-flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> {t('previewHint')}
            </span>
          )}
          {notShown > 0 && <span className="font-medium text-amber-800">{t('hiddenCount', { n: notShown })}</span>}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
function DesktopPreview({ nodes }: { nodes: NavNode[] }) {
  const l = useL('admin');
  const t = useDict(mn, 'admin');
  const bar = usePlacements('bar');
  const settings = useSettings();
  const [open, setOpen] = useState<string | null>(() => nodes.find((n) => n.children.length)?.id ?? null);
  const cur = nodes.find((n) => n.id === open && n.children.length);
  const promo = cur?.children.find((c) => isPromo(c));
  const tiles = cur ? cur.children.filter((c) => c !== promo) : [];
  const announcement = bar[0]?.title ?? settings.announcements[0];

  return (
    <div className="overflow-hidden rounded-lg bg-paper text-ink ring-1 ring-line">
      {announcement && <div className="flex h-6 items-center justify-center truncate bg-ink px-3 text-[9.5px] font-medium text-paper/85">{l(announcement)}</div>}
      <div className="flex min-h-11 items-center gap-1.5 border-b border-line px-2.5 py-1.5">
        <LogoMark className="h-6 shrink-0 self-start" />
        <nav className="flex min-w-0 flex-wrap items-center">
          {nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              title={n.to || undefined}
              onClick={() => n.children.length && setOpen((o) => (o === n.id ? null : n.id))}
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-1 text-[11px] font-semibold transition-colors',
                open === n.id ? 'bg-ink/[0.07] text-ink' : 'text-ink-soft hover:text-ink',
                !n.children.length && 'cursor-default',
              )}
            >
              {l(n.label)}
              {n.children.length > 0 && <ChevronDown className={cn('h-3 w-3 transition-transform', open === n.id && 'rotate-180')} />}
            </button>
          ))}
        </nav>
      </div>
      {cur ? (
        <div className="grid grid-cols-2 gap-1 p-2.5">
          {tiles.map((c) => (
            <div key={c.id} title={c.to} className="flex min-w-0 items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-white">
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-sand text-ink-soft">
                {c.entity?.image ? <img src={thumb(c.entity.image)} alt="" className="h-full w-full object-cover" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold">{l(c.label)}</span>
                {c.entity?.subtitle && <span className="block truncate text-[10px] text-muted">{l(c.entity.subtitle)}</span>}
              </span>
            </div>
          ))}
          {promo && (
            <div title={promo.to} className="relative col-span-2 mt-1 h-[68px] overflow-hidden rounded-lg bg-ink">
              <img src={thumb(promo.entity?.image ?? '/images/misc/promo.webp')} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/85 to-transparent" />
              <div className="relative flex h-full flex-col justify-center px-3 text-white">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-200">{l(promo.label)}</span>
                <span className="font-display text-[17px] leading-tight">{promo.type === 'offer' ? l(promo.entity?.subtitle) : '−20%'}</span>
                <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold">
                  {t('seeAll')} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative h-24 overflow-hidden bg-gradient-to-br from-sand to-paper">
          <div className="absolute bottom-4 left-4 space-y-1.5">
            <div className="h-2.5 w-40 rounded-full bg-ink/10" />
            <div className="h-2 w-28 rounded-full bg-ink/[0.07]" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function MobilePreview({ nodes }: { nodes: NavNode[] }) {
  const l = useL('admin');
  const t = useDict(mn, 'admin');
  const shop = nodes.find((n) => n.children.some(isTile));
  const tiles = shop ? shop.children.filter(isTile) : [];
  const rows: { key: string; label: string; sub: NavNode[] }[] = [
    { key: 'home', label: t('home'), sub: [] },
    ...nodes.map((n) => (n === shop ? { key: n.id, label: n.to ? t('allProducts') : l(n.label), sub: n.children.filter((c) => !isTile(c)) } : { key: n.id, label: l(n.label), sub: n.children })),
  ];
  return (
    <div className="mx-auto w-[252px] rounded-[30px] bg-[#111] p-2 shadow-[0_20px_40px_-20px_rgb(0_0_0/0.5)]">
      <div className="h-[470px] overflow-hidden rounded-[23px] bg-paper text-ink">
        <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
          <Logo className="h-6" />
          <X className="h-4 w-4 text-ink-soft" />
        </div>
        <div className="no-scrollbar h-[420px] overflow-y-auto px-3.5 py-3">
          {tiles.length > 0 && (
            <>
              <div className="mb-1.5 text-[8.5px] font-bold uppercase tracking-[0.2em] text-muted">{t('categories')}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {tiles.map((c) => (
                  <div key={c.id} className="relative h-14 overflow-hidden rounded-lg bg-ink">
                    {c.entity?.image && <img src={thumb(c.entity.image)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                    <span className="absolute bottom-1 left-2 right-2 truncate text-[10.5px] font-semibold text-white">{l(c.label)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className={cn('flex flex-col', tiles.length > 0 && 'mt-3')}>
            {rows.map((r) => (
              <div key={r.key}>
                <div className="border-b border-line py-2 text-[12.5px] font-semibold">{r.label}</div>
                {r.sub.map((c) => (
                  <div key={c.id} className={cn('border-b border-line py-1.5 pl-3 text-[11.5px]', isPromo(c) ? 'font-semibold text-brand-700' : 'font-medium text-ink-soft')}>
                    {l(c.label)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function FooterPreview({ nodes }: { nodes: NavNode[] }) {
  const l = useL('admin');
  const settings = useSettings();
  const groups = [
    ...nodes.filter((n) => n.children.length).map((n) => ({ id: n.id, heading: l(n.label), links: n.children })),
    ...(nodes.some((n) => !n.children.length) ? [{ id: 'loose', heading: '', links: nodes.filter((n) => !n.children.length) }] : []),
  ];
  return (
    <div className="overflow-hidden rounded-lg bg-ink px-4 pb-3 pt-4 text-paper">
      <div className={cn('grid gap-x-4 gap-y-5', groups.length >= 3 ? 'grid-cols-3' : 'grid-cols-2')}>
        {groups.map((g) => (
          <div key={g.id} className="min-w-0">
            <div className="mb-2 h-3 truncate text-[8.5px] font-bold uppercase tracking-[0.2em] text-paper/45">{g.heading}</div>
            <ul className="space-y-1.5">
              {g.links.map((n) => (
                <li key={n.id} title={n.to} className={cn('text-[11.5px] leading-snug', isPromo(n) ? 'font-semibold text-brand-200' : 'text-paper/80')}>
                  {l(n.label)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-white/10 pt-2 text-[9px] text-paper/40">© {new Date().getFullYear()} {settings.legalName}</div>
    </div>
  );
}
