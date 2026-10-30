import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Check, Info, Languages, Megaphone, Palette, Plus, RotateCcw, Search, ShieldCheck, Sparkles, Trash2, Mail } from 'lucide-react';
import { L10nInput } from '@/admin/components/L10nInput';
import { Button } from '@/components/ui/Button';
import { Badge, Accent } from '@/components/ui/misc';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { LANGS, emptyL10n, useDict, useL, useLang } from '@/i18n';
import { brandScale, isHex } from '@/lib/color';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { T, type Key } from './i18n';
import { CharCount, IconBtn, SectionCard, TextAreaField, TextField, ToggleRow, type SectionProps } from './fields';

/* ------------------------------------------------------------------ */
/* Jezici                                                              */
/* ------------------------------------------------------------------ */
export function LanguagesSection({ s, set }: SectionProps) {
  const t = useDict(T, 'admin');
  return (
    <SectionCard id="languages" icon={Languages} title={t('s_languages')} description={t('s_languages_d')}>
      <div className="divide-y divide-line/70">
        {LANGS.map((l) => {
          const primary = l.code === 'sq';
          return (
            <ToggleRow
              key={l.code}
              icon={<span className="text-[12px] font-extrabold tracking-wide">{l.short}</span>}
              title={l.label}
              badge={primary ? <Badge tone="sand">{t('primary')}</Badge> : undefined}
              description={t(`lang_${l.code}_d` as Key)}
              checked={primary || s.languages[l.code]}
              disabled={primary}
              onChange={(v) => set('languages', { ...s.languages, me: true, [l.code]: v })}
            />
          );
        })}
      </div>
      <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-canvas/70 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t('langNote')}
      </p>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Traka sa obavještenjima                                             */
/* ------------------------------------------------------------------ */
export function AnnouncementsSection({ s, set }: SectionProps) {
  const t = useDict(T, 'admin');
  const l = useL('admin');
  const items = s.announcements;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((x) => x + 1), 3500);
    return () => clearInterval(id);
  }, [items.length]);

  const current = items.length ? items[i % items.length] : null;
  const move = (from: number, to: number) => {
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    set('announcements', next);
  };

  return (
    <SectionCard id="announcements" icon={Megaphone} title={t('s_announcements')} description={t('s_announcements_d')}>
      {/* Live preview — same look as the storefront bar */}
      <div className="mb-6">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{t('livePreview')}</div>
        <div className="relative flex h-10 items-center justify-center overflow-hidden rounded-xl bg-ink px-4 text-[12.5px] font-medium text-paper">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.p
                key={i % items.length}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn('min-w-0 truncate', items.length > 1 && 'sm:px-12')}
              >
                {l(current) || '—'}
              </motion.p>
            ) : (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-paper/50">
                {t('noMessages')}
              </motion.p>
            )}
          </AnimatePresence>
          {items.length > 1 && (
            <span className="absolute right-3 hidden gap-1 sm:flex">
              {items.map((_, k) => (
                <span key={k} className={cn('h-1.5 w-1.5 rounded-full transition-colors', k === i % items.length ? 'bg-paper' : 'bg-paper/25')} />
              ))}
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{t('noMessages')}</div>
      ) : (
        <ol className="space-y-3">
          {items.map((msg, k) => (
            <li key={k} className="flex flex-col gap-2 rounded-xl border border-line bg-canvas/40 p-3.5 sm:flex-row sm:items-end sm:gap-3 sm:p-4">
              <L10nInput
                className="min-w-0 flex-1"
                label={
                  <span className="inline-flex items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-ink text-[10.5px] font-bold text-paper">{k + 1}</span>
                    {t('message', { n: k + 1 })}
                  </span>
                }
                value={msg}
                onChange={(v) => set('announcements', items.map((x, j) => (j === k ? v : x)))}
              />
              <div className="flex shrink-0 items-center justify-end gap-0.5 sm:h-10">
                <IconBtn label={t('moveUp')} disabled={k === 0} onClick={() => move(k, k - 1)}>
                  <ArrowUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn label={t('moveDown')} disabled={k === items.length - 1} onClick={() => move(k, k + 1)}>
                  <ArrowDown className="h-4 w-4" />
                </IconBtn>
                <IconBtn label={t('removeMessage')} danger onClick={() => set('announcements', items.filter((_, j) => j !== k))}>
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button variant="outline" size="sm" shape="rounded" className="mt-3" icon={<Plus className="h-4 w-4" />} onClick={() => set('announcements', [...items, emptyL10n()])}>
        {t('addMessage')}
      </Button>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Izgled                                                              */
/* ------------------------------------------------------------------ */
export const DEFAULT_BRAND = '#776440';

const PRESETS: { hex: string; key: Key }[] = [
  { hex: DEFAULT_BRAND, key: 'preset_brand' },
  { hex: '#b0532c', key: 'preset_terracotta' },
  { hex: '#8a6235', key: 'preset_oak' },
  { hex: '#5a6b3f', key: 'preset_olive' },
  { hex: '#1f5a63', key: 'preset_petrol' },
  { hex: '#283d66', key: 'preset_navy' },
];

const normHex = (v: string) => {
  const h = v.trim().replace(/^#?/, '#').toLowerCase();
  return h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h;
};
/** Accepts "2c4a3a" as well as "#2c4a3a". */
const withHash = (v: string) => v.trim().replace(/^#?/, '#');

/** "Sve za vaš dom" → "Sve za vaš *dom*" (last word in the italic brand serif). */
const accentLast = (text: string) => (text.includes('*') ? text : text.replace(/(\S+)\s*$/, '*$1*'));

export function AppearanceSection({ s, set, savedBrand }: SectionProps & { savedBrand: string }) {
  const t = useDict(T, 'admin');
  const l = useL('admin');
  const lang = useLang('admin');
  const [hex, setHex] = useState(s.brandColor);
  useEffect(() => {
    setHex((h) => (isHex(h) && normHex(h) === normHex(s.brandColor) ? h : s.brandColor));
  }, [s.brandColor]);

  const scale = useMemo(() => brandScale(isHex(s.brandColor) ? s.brandColor : DEFAULT_BRAND), [s.brandColor]);
  const pick = (v: string) => set('brandColor', normHex(v));
  const hexBad = !isHex(withHash(hex));
  const previewing = normHex(s.brandColor) !== normHex(savedBrand);

  return (
    <SectionCard id="appearance" icon={Palette} title={t('s_appearance')} description={t('s_appearance_d')}>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{t('brandColor')}</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ring-1 ring-line" style={{ background: s.brandColor }} title={t('brandColor')}>
              <input type="color" value={normHex(s.brandColor)} onChange={(e) => pick(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={t('brandColor')} />
            </label>
            <TextField
              className="w-36"
              value={hex}
              onChange={(v) => {
                setHex(v);
                if (isHex(withHash(v))) pick(v);
              }}
              inputClassName="font-mono uppercase tracking-wider"
              maxLength={7}
              spellCheck={false}
              autoComplete="off"
              aria-label={`${t('brandColor')} (HEX)`}
            />
            {normHex(s.brandColor) !== DEFAULT_BRAND && (
              <Button variant="ghost" size="sm" shape="rounded" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => pick(DEFAULT_BRAND)}>
                {t('preset_brand')}
              </Button>
            )}
          </div>
          <p className={cn('mt-1.5 text-xs', hexBad ? 'font-medium text-red-600' : 'text-muted')}>{hexBad ? t('invalidHex') : t('brandColor_h')}</p>

          <div className="mt-6 mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{t('presets')}</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PRESETS.map((p) => {
              const on = normHex(s.brandColor) === p.hex;
              return (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => pick(p.hex)}
                  aria-pressed={on}
                  className={cn(
                    'group flex flex-col items-center gap-2 rounded-xl border px-1.5 pb-2.5 pt-3 text-center transition-all',
                    on ? 'border-ink bg-white shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line bg-white hover:border-ink/30',
                  )}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform group-hover:scale-105" style={{ background: p.hex }}>
                    {on && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="text-[11.5px] font-semibold leading-tight text-ink-soft">{t(p.key)}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{t('palette')}</div>
          <div className="flex h-8 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]">
            {Object.entries(scale).map(([k, v]) => (
              <span key={k} title={`${k} · ${v}`} style={{ background: v }} className={cn('flex-1', k === '600' && 'flex-[1.6]')} />
            ))}
          </div>
          <div className="mt-1 flex text-[10px] tabular-nums text-muted">
            {Object.keys(scale).map((k) => (
              <span key={k} className={cn('flex-1 text-center', k === '600' && 'flex-[1.6] font-bold text-ink-soft')}>
                {k}
              </span>
            ))}
          </div>

          {previewing && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
              <Sparkles className="h-3.5 w-3.5" /> {t('colorPreviewNote')}
            </p>
          )}
        </div>

        {/* Live sample of the storefront in the chosen colour */}
        <div aria-hidden className="pointer-events-none select-none self-start overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_12px_32px_-20px_rgb(28_26_23/0.35)]">
          <div className="flex items-center justify-between border-b border-line/70 bg-white px-4 py-2.5">
            <Logo className="h-8!" />
            <span className="flex gap-1">
              <span className="h-1.5 w-5 rounded-full bg-ink/10" />
              <span className="h-1.5 w-5 rounded-full bg-ink/10" />
              <span className="h-1.5 w-5 rounded-full bg-brand-600" />
            </span>
          </div>
          <div className="p-5">
            <p className="eyebrow">{t('sampleEyebrow')}</p>
            <p className="display mt-2 text-[28px] leading-[1.08] text-ink">
              <Accent text={accentLast(l(s.tagline) || 'ITCOM')} />
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Badge tone="brand">{t('sampleBadge')}</Badge>
              <span className="text-[15px] font-bold text-brand-700">{money(249, lang)}</span>
              <span className="text-xs text-muted line-through">{money(299, lang)}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" tabIndex={-1}>
                {t('sampleCta')}
              </Button>
              <Button size="sm" variant="soft" tabIndex={-1}>
                {t('sampleLink')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-line/70 pt-6">
        <ToggleRow
          icon={<Megaphone className="h-[18px] w-[18px]" />}
          title={t('demoBanner')}
          description={t('demoBanner_d')}
          checked={s.demoBanner}
          onChange={(v) => set('demoBanner', v)}
        />
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* SEO                                                                 */
/* ------------------------------------------------------------------ */
const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

function siteHost() {
  const h = typeof window !== 'undefined' ? window.location.hostname : '';
  return !h || h === 'localhost' || /^[\d.]+$/.test(h) ? 'itcom.example' : h;
}

export function SeoSection({ s, set }: SectionProps) {
  const t = useDict(T, 'admin');
  const seo = s.seo;
  return (
    <SectionCard id="seo" icon={Search} title={t('s_seo')} description={t('s_seo_d')}>
      <div className="grid gap-5">
        <TextField label={t('seoTitle')} value={seo.title} onChange={(v) => set('seo', { ...seo, title: v })} hint={<CharCount n={seo.title.length} max={60} />} />
        <TextAreaField label={t('seoDesc')} rows={3} value={seo.description} onChange={(v) => set('seo', { ...seo, description: v })} hint={<CharCount n={seo.description.length} max={160} />} />
      </div>

      <div className="mt-6 rounded-xl border border-line bg-canvas/50 p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
          <Search className="h-3.5 w-3.5" /> {t('googlePreview')}
        </div>
        <div className="rounded-lg bg-white p-4 shadow-[0_1px_3px_rgb(0_0_0/0.06)] ring-1 ring-black/5 sm:px-5" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1f3f4] ring-1 ring-black/5">
              <LogoMark className="h-3.5!" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[14px] text-[#202124]">{s.companyName || 'ITCOM'}</span>
              <span className="block truncate text-[12px] text-[#4d5156]">https://{siteHost()}</span>
            </span>
          </div>
          <div className="mt-2 text-[19px] leading-[1.3] text-[#1a0dab] sm:text-[20px]">{clip(seo.title || s.companyName, 62)}</div>
          <p className="mt-1 text-[14px] leading-[1.55] text-[#4d5156]">{clip(seo.description, 158) || '—'}</p>
        </div>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Administrator                                                       */
/* ------------------------------------------------------------------ */
export function AdminSection({ s, set, errors }: SectionProps) {
  const t = useDict(T, 'admin');
  return (
    <SectionCard id="admin" icon={ShieldCheck} title={t('s_admin')} description={t('s_admin_d')}>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <TextField
          label={t('adminEmail')}
          hint={t('adminEmail_h')}
          type="email"
          value={s.adminEmail}
          onChange={(v) => set('adminEmail', v.trim())}
          leading={<Mail className="h-4 w-4" />}
          error={errors.adminEmail}
        />
        <p className="flex items-start gap-2.5 rounded-xl bg-sand/60 p-3.5 text-[12.5px] leading-relaxed text-ink-soft sm:mt-7">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          {t('adminNote')}
        </p>
      </div>
    </SectionCard>
  );
}
