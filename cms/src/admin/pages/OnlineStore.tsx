// Online Store → Tema (PDF pp.32, 37): current theme with a live thumbnail, theme settings for the PUBLIC site
// (logo, brand colour, fonts, spacing — the CMS stays neutral), preferences (SEO, social image, maintenance mode,
// languages), domain, and links to Editori + Slideshow & bannerë.
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowRight, Check, CircleCheck, CircleDashed, Construction, Copy, ExternalLink, GalleryHorizontalEnd, Globe, Info, LayoutTemplate, Link2Off, Loader2,
  Lock, Paintbrush, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Field';
import { Logo, LogoMark } from '@/components/brand/Logo';
import { Card, PageHeader, SaveBar, confirmDialog } from '@/admin/components/kit';
import { L10nInput } from '@/admin/components/L10nInput';
import { ImageField } from '@/admin/components/media';
import { adm } from '@/admin/i18n';
import { LANGS, lt, useDict, useLang } from '@/i18n';
import { useDb } from '@/store/db';
import { useCan, useSettings } from '@/store/hooks';
import { activePlacements } from '@/lib/offers';
import { brandScale, DEFAULT_BRAND, isHex } from '@/lib/color';
import { dateTime, timeAgo } from '@/lib/format';
import { BASE, href } from '@/lib/paths';
import type { Settings } from '@/lib/types';
import { cn, sleep, thumb } from '@/lib/utils';
import { SD, TH } from '@/admin/components/store/i18n';
import { FieldLabel, GroupTitle, Notice, Segmented, Tip, ctl } from '@/admin/components/store/parts';
import { SiteFrame } from '@/admin/components/store/SiteFrame';
import { StorePreview } from '@/admin/components/store/StorePreview';
import {
  BRAND_PRESETS, DENSITY, FONT_PAIRS, normHex, readTheme, storefrontVars, themePatch, whiteContrast, type Density, type FontPair, type LogoVariant, type StoreTheme,
} from '@/admin/components/store/theme';

interface Form {
  brandColor: string;
  seo: Settings['seo'];
  theme: StoreTheme;
}
const formOf = (s: Settings): Form => ({ brandColor: s.brandColor, seo: { ...s.seo }, theme: readTheme(s) });
const SEO_MAX = { title: 60, description: 160 };

export default function OnlineStore() {
  const t = useDict(TH, 'admin');
  const ts = useDict(SD, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const canEdit = can('onlineStore', 'edit');
  const canPublish = can('onlineStore', 'publish');

  const settings = useSettings();
  const updateSettings = useDb((s) => s.updateSettings);

  /* ---------------- form (theme + preferences), saved together ---------------- */
  const saved = useMemo(() => formOf(settings), [settings]);
  const [form, setForm] = useState<Form>(saved);
  const [prevSaved, setPrevSaved] = useState(saved);
  if (prevSaved !== saved) {
    setPrevSaved(saved);
    if (JSON.stringify(form) === JSON.stringify(prevSaved)) setForm(saved);
  }
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const setTheme = (patch: Partial<StoreTheme>) => setForm((f) => ({ ...f, theme: { ...f.theme, ...patch } }));
  const [hex, setHex] = useState(form.brandColor);
  const hexBad = !isHex(hex.trim().replace(/^#?/, '#'));
  const pickColor = (v: string) => {
    setHex(normHex(v));
    setForm((f) => ({ ...f, brandColor: normHex(v) }));
  };

  const save = () => {
    updateSettings({ brandColor: isHex(form.brandColor) ? normHex(form.brandColor) : DEFAULT_BRAND, seo: { title: form.seo.title.trim(), description: form.seo.description.trim() }, ...themePatch(form.theme) });
    toast.success(t('savedToast'));
  };
  const discard = () => {
    setForm(saved);
    setHex(saved.brandColor);
  };

  const toggleMaintenance = async (on: boolean) => {
    if (on && !(await confirmDialog({ title: t('maintConfirmTitle'), text: t('maintConfirmText'), confirmLabel: t('maintConfirm'), danger: false }))) return;
    setTheme({ maintenance: { ...form.theme.maintenance, on } });
  };

  return (
    <div className="pb-28">
      <PageHeader
        breadcrumbs={[{ label: ta('nav_onlineStore'), to: '/admin/prodavnica' }, ta('nav_theme')]}
        title={ta('nav_theme')}
        description={t('subtitle')}
        actions={
          <>
            <a href={href('/')} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-4 text-[13px] font-semibold text-ink transition hover:border-ink/35">
              <ExternalLink className="h-4 w-4" /> {t('viewStore')}
            </a>
            <ButtonLink to="/admin/prodavnica/editor" shape="rounded" size="sm" icon={<Paintbrush className="h-4 w-4" />}>
              {t('customize')}
            </ButtonLink>
          </>
        }
      />

      {!canEdit && (
        <Notice icon={Lock} className="mb-4">
          {t('readOnly')}
        </Notice>
      )}

      <ThemeCard />

      {/* -------- Theme settings + preview -------- */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <fieldset disabled={!canEdit} className="min-w-0">
          <Card title={t('settingsTitle')} description={t('settingsDesc')}>
            <div className="divide-y divide-line/70 [&>section]:py-6 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
              {/* Logo */}
              <section>
                <GroupTitle>{t('logo')}</GroupTitle>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="space-y-4">
                    <Segmented<LogoVariant>
                      className="w-full"
                      label={t('logo')}
                      value={form.theme.logo}
                      onChange={(v) => setTheme({ logo: v })}
                      disabled={!canEdit}
                      options={[
                        { id: 'full', label: t('logo_full') },
                        { id: 'mark', label: t('logo_mark') },
                      ]}
                    />
                    <div>
                      <FieldLabel htmlFor="logo-size" aside={<span className="text-[12.5px] font-semibold tabular-nums text-ink">{form.theme.logoSize} px</span>}>
                        {t('logoSize')}
                      </FieldLabel>
                      <input id="logo-size" type="range" min={32} max={56} step={2} value={form.theme.logoSize} onChange={(e) => setTheme({ logoSize: Number(e.target.value) })} className="h-8 w-full cursor-pointer accent-[#1a1a1a]" />
                      <p className="text-xs text-muted">{t('logo_h')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2" style={storefrontVars(form.brandColor)}>
                    <LogoTile label={t('onLight')} variant={form.theme.logo} size={form.theme.logoSize} />
                    <LogoTile label={t('onDark')} variant={form.theme.logo} size={form.theme.logoSize} dark />
                  </div>
                </div>
              </section>

              {/* Brand colour */}
              <section>
                <GroupTitle>{t('brandColor')}</GroupTitle>
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="relative h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ring-1 ring-line" style={{ background: form.brandColor }} title={t('custom')}>
                    <input type="color" value={normHex(form.brandColor)} onChange={(e) => pickColor(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={t('custom')} />
                  </label>
                  <div className="w-36">
                    <input
                      value={hex}
                      onChange={(e) => {
                        setHex(e.target.value);
                        const v = e.target.value.trim().replace(/^#?/, '#');
                        if (isHex(v)) setForm((f) => ({ ...f, brandColor: normHex(v) }));
                      }}
                      maxLength={7}
                      spellCheck={false}
                      aria-label={`${t('brandColor')} (HEX)`}
                      aria-invalid={hexBad || undefined}
                      className={cn(ctl, 'h-10 font-mono uppercase tracking-wider', hexBad && 'border-red-500')}
                    />
                  </div>
                  {normHex(form.brandColor) !== DEFAULT_BRAND && (
                    <Button variant="ghost" size="sm" shape="rounded" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => pickColor(DEFAULT_BRAND)}>
                      {t('preset_brand')}
                    </Button>
                  )}
                </div>
                <p className={cn('mt-1.5 text-xs', hexBad ? 'font-medium text-red-600' : 'text-muted')}>{hexBad ? t('invalidHex') : t('brandColor_h')}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {BRAND_PRESETS.map((p) => {
                    const on = normHex(form.brandColor) === p.hex;
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => pickColor(p.hex)}
                        aria-pressed={on}
                        className={cn('group flex flex-col items-center gap-2 rounded-xl border bg-white px-1.5 pb-2.5 pt-3 text-center transition-all', on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30')}
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-full text-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform group-hover:scale-105" style={{ background: p.hex }}>
                          {on && <Check className="h-4 w-4" strokeWidth={3} />}
                        </span>
                        <span className="text-[11.5px] font-semibold leading-tight text-ink-soft">{t(p.key)}</span>
                      </button>
                    );
                  })}
                </div>
                <Palette hex={form.brandColor} />
                {isHex(form.brandColor) && whiteContrast(form.brandColor) < 4.5 && (
                  <Notice icon={TriangleAlert} tone="warn" className="mt-3">
                    {t('contrastWarn', { r: whiteContrast(form.brandColor).toFixed(1) })}
                  </Notice>
                )}
              </section>

              {/* Fonts */}
              <section>
                <GroupTitle>{t('fonts')}</GroupTitle>
                <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('fonts')}>
                  {(Object.keys(FONT_PAIRS) as FontPair[]).map((k) => {
                    const on = form.theme.font === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTheme({ font: k })}
                        className={cn('flex flex-col rounded-xl border bg-white p-3.5 text-left transition-all', on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30')}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-[32px] leading-none text-ink" style={FONT_PAIRS[k].heading}>
                            Aa
                          </span>
                          {on && <CircleCheck className="h-4 w-4 text-ink" />}
                        </span>
                        <span className="mt-3 text-[13px] font-semibold text-ink">{t(`font_${k}`)}</span>
                        <span className="text-[12px] text-muted">{FONT_PAIRS[k].label}</span>
                        <span className="mt-2 line-clamp-1 text-[12.5px] text-ink-soft" style={FONT_PAIRS[k].body}>
                          {lt(settings.tagline, lang)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Spacing */}
              <section>
                <GroupTitle>{t('spacing')}</GroupTitle>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('spacing')}>
                  {(Object.keys(DENSITY) as Density[]).map((k) => {
                    const on = form.theme.density === k;
                    const d = DENSITY[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTheme({ density: k })}
                        className={cn('rounded-xl border bg-white p-3 text-left transition-all', on ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-line hover:border-ink/30')}
                      >
                        <span className="flex h-12 flex-col justify-center rounded-md bg-ink/[0.04] px-2" style={{ gap: d.gap / 3 }} aria-hidden>
                          <span className="h-1.5 w-3/4 rounded-full bg-ink/25" />
                          <span className="h-1.5 w-1/2 rounded-full bg-ink/15" />
                          <span className="h-1.5 w-2/3 rounded-full bg-ink/15" />
                        </span>
                        <span className="mt-2 block text-[13px] font-semibold text-ink">{t(`density_${k}`)}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">{t('spacing_h')}</p>
              </section>
            </div>
          </Card>
        </fieldset>

        {/* sticky preview of the unsaved theme */}
        <div className="xl:sticky xl:top-[72px]">
          <Card
            title={t('previewTitle')}
            actions={
              <span className={cn('inline-flex items-center gap-1.5 text-[12px] font-semibold', dirty ? 'text-amber-800' : 'text-muted')}>
                {dirty ? <CircleDashed className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {dirty ? t('previewUnsaved') : t('previewSaved')}
              </span>
            }
            bodyClassName="bg-[#f6f6f6] rounded-b-xl"
          >
            <div className="mx-auto max-w-[360px]">
              <StorePreview brand={form.brandColor} theme={form.theme} lang={lang} words={{ eyebrow: t('sampleEyebrow'), text: t('sampleText'), cta: t('sampleCta'), cta2: t('sampleCta2'), badge: t('sampleBadge') }} />
            </div>
          </Card>
        </div>
      </div>

      {/* -------- Preferences + domain -------- */}
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <fieldset disabled={!canEdit} className="min-w-0">
          <Card title={t('prefsTitle')} description={t('prefsDesc')}>
            <div className="divide-y divide-line/70 [&>section]:py-6 [&>section:first-child]:pt-0 [&>section:last-child]:pb-0">
              {/* SEO */}
              <section>
                <GroupTitle>SEO</GroupTitle>
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <CountedInput id="seo-title" label={t('seoTitle')} value={form.seo.title} max={SEO_MAX.title} onChange={(v) => setForm((f) => ({ ...f, seo: { ...f.seo, title: v } }))} />
                    <CountedInput id="seo-desc" label={t('seoDesc')} value={form.seo.description} max={SEO_MAX.description} multiline onChange={(v) => setForm((f) => ({ ...f, seo: { ...f.seo, description: v } }))} />
                  </div>
                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{t('seoPreview')}</div>
                    <div className="rounded-xl border border-line bg-white p-4">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/[0.05]" style={storefrontVars(form.brandColor)}>
                          <LogoMark className="h-4! w-auto" />
                        </span>
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-[12.5px] text-ink">{settings.companyName}</div>
                          <div className="truncate text-[11.5px] text-muted">https://{form.theme.domain.name}</div>
                        </div>
                      </div>
                      <div className="mt-2 line-clamp-1 text-[17px] font-medium leading-snug text-ink">{clip(form.seo.title || settings.companyName, SEO_MAX.title)}</div>
                      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{clip(form.seo.description, SEO_MAX.description)}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Social sharing image */}
              <section>
                <GroupTitle>{t('shareImage')}</GroupTitle>
                <div className="grid gap-5 lg:grid-cols-2">
                  <ImageField value={form.theme.shareImage} onChange={(v) => setTheme({ shareImage: v })} aspect="aspect-[40/21]" hint={t('shareImage_h')} />
                  <div className="self-start overflow-hidden rounded-xl border border-line bg-white">
                    <div className="aspect-[40/21] bg-sand">{form.theme.shareImage && <img src={thumb(form.theme.shareImage)} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="border-t border-line bg-ink/[0.03] px-3.5 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-muted">{form.theme.domain.name}</div>
                      <div className="mt-0.5 line-clamp-1 text-[13.5px] font-semibold text-ink">{form.seo.title || settings.companyName}</div>
                      <div className="line-clamp-1 text-[12.5px] text-muted">{form.seo.description}</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Maintenance */}
              <section>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink">{t('maintenance')}</div>
                    <p className="mt-0.5 text-[13px] text-muted">{t('maintenance_d')}</p>
                    <p className={cn('mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold', form.theme.maintenance.on ? 'text-amber-900' : 'text-emerald-800')}>
                      {form.theme.maintenance.on ? <Construction className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
                      {form.theme.maintenance.on ? t('maintOn') : t('maintOff')}
                    </p>
                  </div>
                  <Tip text={canPublish ? undefined : ts('noPermPublish')}>
                    <Switch checked={form.theme.maintenance.on} onChange={toggleMaintenance} disabled={!canPublish || !canEdit} label={<span className="sr-only">{t('maintenance')}</span>} />
                  </Tip>
                </div>
                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                  <L10nInput label={t('maintMsg')} value={form.theme.maintenance.message} onChange={(v) => setTheme({ maintenance: { ...form.theme.maintenance, message: v } })} multiline rows={3} />
                  <div>
                    <div className="mb-1.5 text-[13px] font-semibold text-ink-soft">{t('maintPreview')}</div>
                    <div className="grid min-h-[132px] place-items-center rounded-xl border border-line bg-paper px-5 py-6 text-center" style={storefrontVars(form.brandColor)}>
                      <div>
                        <Logo className="mx-auto h-9!" />
                        <p className="mx-auto mt-3 max-w-[300px] text-[12.5px] leading-relaxed text-ink-soft">{lt(form.theme.maintenance.message, lang)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Languages */}
              <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold text-ink">{t('languages')}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {LANGS.filter((x) => settings.languages[x.code] || x.code === 'sq').map((x) => (
                        <span key={x.code} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-[12.5px] font-semibold text-ink">
                          <Check className="h-3.5 w-3.5" /> {x.label}
                          {x.code === 'sq' && <span className="font-normal text-muted">· {t('langDefault')}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link to="/admin/trzista" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-soft hover:text-ink">
                    {t('manageMarkets')} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </section>
            </div>
          </Card>
        </fieldset>

        <DomainCard
          theme={form.theme}
          onChecked={(at) => {
            const domain = { ...saved.theme.domain, checkedAt: at };
            updateSettings(themePatch({ ...saved.theme, domain }));
            setForm((f) => ({ ...f, theme: { ...f.theme, domain: { ...f.theme.domain, checkedAt: at } } }));
          }}
        />
      </div>

      <SaveBar dirty={dirty && canEdit} onSave={save} onDiscard={discard} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Current theme: live thumbnail + status + links                      */
/* ------------------------------------------------------------------ */
function ThemeCard() {
  const t = useDict(TH, 'admin');
  const ta = useDict(adm, 'admin');
  const lang = useLang('admin');
  const home = useDb((s) => s.home);
  const homeDraft = useDb((s) => s.homeDraft);
  const history = useDb((s) => s.homeHistory);
  const placements = useDb((s) => s.placements);
  const offers = useDb((s) => s.offers);
  const counts = useMemo(
    () => ({
      slides: activePlacements(placements, 'home-hero', offers).length,
      banners: placements.filter((p) => p.kind === 'banner').length,
      bars: placements.filter((p) => p.kind === 'announcement').length,
    }),
    [placements, offers],
  );
  const lastPublished = history[0]?.at;
  const sections = home.filter((s) => s.enabled).length;

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* thumbnail */}
        <div className="relative bg-[#ebebeb] p-4 sm:p-6 lg:pb-8 lg:pr-12">
          <div className="overflow-hidden rounded-lg bg-white shadow-[0_18px_40px_-22px_rgb(0_0_0/0.45)] ring-1 ring-black/10">
            <div className="flex h-6 items-center gap-1.5 border-b border-black/[0.06] bg-[#f4f4f4] px-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
            </div>
            <SiteFrame w={1280} h={760} title={t('currentTheme')} loadingText={t('loadingPreview')} />
          </div>
          <div className="absolute bottom-4 right-4 hidden w-[104px] overflow-hidden rounded-[18px] border-[5px] border-[#1a1a1a] bg-[#1a1a1a] shadow-[0_18px_36px_-14px_rgb(0_0_0/0.55)] sm:block lg:bottom-5 lg:right-5">
            <div className="overflow-hidden rounded-[13px]">
              <SiteFrame w={390} h={780} title={`${t('currentTheme')} — mobile`} />
            </div>
          </div>
        </div>

        {/* details */}
        <div className="flex flex-col p-5 sm:p-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{t('currentTheme')}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h2 className="text-[20px] font-bold tracking-tight text-ink">ITCOM</h2>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-700/15">
              <span className="h-2 w-2 rounded-full bg-emerald-600" /> {t('live')}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-muted">{t('themeMeta')}</p>

          <ul className="mt-4 space-y-2 text-[13px]">
            <li className="flex items-center gap-2 text-ink-soft">
              <CircleCheck className="h-4 w-4 shrink-0 text-ink" />
              {lastPublished ? (
                <span title={dateTime(lastPublished, lang)}>{t('publishedAgo', { ago: timeAgo(lastPublished, lang) })}</span>
              ) : (
                t('initialSetup')
              )}
            </li>
            <li className="flex items-center gap-2 text-ink-soft">
              {homeDraft ? <CircleDashed className="h-4 w-4 shrink-0 text-amber-700" /> : <Check className="h-4 w-4 shrink-0 text-ink" />}
              <span className={cn(homeDraft && 'font-semibold text-amber-900')}>{homeDraft ? t('draftPending') : t('noDraft')}</span>
            </li>
            <li className="flex items-center gap-2 text-ink-soft">
              <LayoutTemplate className="h-4 w-4 shrink-0 text-ink" />
              {t('sectionsN', { n: sections })}
            </li>
          </ul>


          <div className="mt-auto grid gap-2 pt-5">
            <QuickLink to="/admin/prodavnica/editor" icon={<LayoutTemplate className="h-4 w-4" />} title={ta('nav_editor')} text={t('editorDesc')} />
            <QuickLink to="/admin/prodavnica/slajdovi" icon={<GalleryHorizontalEnd className="h-4 w-4" />} title={ta('nav_slides')} text={t('slidesDesc', { a: counts.slides, b: counts.banners, c: counts.bars })} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function QuickLink({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 transition-colors hover:border-ink/30 hover:bg-ink/[0.015]">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/[0.05] text-ink">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
        <span className="block truncate text-[12.5px] text-muted">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Domain (PDF p.37 "preferenca, SEO dhe domeni")                       */
/* ------------------------------------------------------------------ */
const DNS = [
  { type: 'A', name: '@', value: '185.199.108.153' },
  { type: 'CNAME', name: 'www', value: 'ariongj.github.io' },
];

function DomainCard({ theme, onChecked }: { theme: StoreTheme; onChecked: (at: string) => void }) {
  const t = useDict(TH, 'admin');
  const lang = useLang('admin');
  const can = useCan();
  const [busy, setBusy] = useState(false);
  const current = useMemo(() => new URL(BASE, window.location.origin).href.replace(/^https?:\/\//, '').replace(/\/$/, ''), []);
  const copy = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(t('copied'), { description: v });
    } catch {
      toast.error(v);
    }
  };
  const verify = async () => {
    setBusy(true);
    await sleep(1400);
    setBusy(false);
    onChecked(new Date().toISOString());
    toast.error(t('verifyFail'), { description: theme.domain.name });
  };
  return (
    <Card title={t('domainTitle')} description={t('domainDesc')}>
      <div className="rounded-xl border border-line">
        <div className="flex items-start gap-3 border-b border-line/70 px-3.5 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink/[0.05] text-ink">
            <Globe className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-semibold text-ink">{theme.domain.name}</span>
            <span className="mt-1 inline-flex h-6 items-center gap-1.5 rounded-full bg-ink/[0.05] px-2.5 text-[12px] font-semibold text-ink-soft ring-1 ring-inset ring-ink/10">
              <Link2Off className="h-3.5 w-3.5" /> {t('notConnected')}
            </span>
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-3.5 py-3 text-[13px]">
          <span className="min-w-0">
            <span className="block text-[12px] text-muted">{t('currentAddress')}</span>
            <span className="block truncate font-medium text-ink">{current}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-emerald-800">
            <CircleCheck className="h-3.5 w-3.5" /> {t('primary')}
          </span>
        </div>
      </div>

      <div className="mt-5 text-[13px] font-semibold text-ink">{t('howTo')}</div>
      <ol className="mt-2 space-y-1.5 text-[13px] text-ink-soft">
        {[t('step1'), t('step2'), t('step3')].map((s, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-white">{i + 1}</span>
            <span className="leading-snug">{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 overflow-hidden rounded-xl border border-line text-[12.5px]">
        <div className="grid grid-cols-[52px_44px_minmax(0,1fr)_32px] gap-2 bg-canvas/60 px-3 py-2 font-semibold text-muted">
          <span>{t('dnsType')}</span>
          <span>{t('dnsName')}</span>
          <span>{t('dnsValue')}</span>
          <span />
        </div>
        {DNS.map((r) => (
          <div key={r.type} className="grid grid-cols-[52px_44px_minmax(0,1fr)_32px] items-center gap-2 border-t border-line/70 px-3 py-1.5">
            <span className="font-semibold text-ink">{r.type}</span>
            <span className="font-mono text-ink">{r.name}</span>
            <span className="truncate font-mono text-ink">{r.value}</span>
            <button type="button" onClick={() => copy(r.value)} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-ink/[0.06] hover:text-ink" aria-label={`${t('copy')} ${r.value}`} title={t('copy')}>
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-ink/[0.03] px-3 py-2 text-[12.5px]">
        <span className="inline-flex items-center gap-1.5 text-ink-soft">
          <ShieldCheck className="h-3.5 w-3.5" /> {t('ssl')}
        </span>
        <span className="text-muted">{t('sslPending')}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" shape="rounded" size="sm" onClick={verify} disabled={busy || !can('onlineStore', 'publish')} icon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}>
          {t('verify')}
        </Button>
        {theme.domain.checkedAt && <span className="text-[12px] text-muted">{t('lastChecked', { t: timeAgo(theme.domain.checkedAt, lang) })}</span>}
      </div>
      <p className="mt-3 flex items-start gap-1.5 text-[12px] text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t('verifyFail')}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function LogoTile({ label, variant, size, dark }: { label: string; variant: LogoVariant; size: number; dark?: boolean }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border', dark ? 'border-black/20 bg-ink' : 'border-line bg-paper')}>
      <div className="grid flex-1 place-items-center px-3 py-5">
        <span className="flex [&>svg]:h-full! [&>svg]:w-auto" style={{ height: size }}>
          {variant === 'full' ? <Logo tone={dark ? 'light' : 'dark'} /> : <LogoMark tone={dark ? 'light' : 'dark'} />}
        </span>
      </div>
      <div className={cn('border-t px-3 py-1.5 text-[11.5px] font-medium', dark ? 'border-white/10 text-white/70' : 'border-line text-muted')}>{label}</div>
    </div>
  );
}

function Palette({ hex }: { hex: string }) {
  const scale = brandScale(isHex(hex) ? hex : DEFAULT_BRAND);
  return (
    <div className="mt-4">
      <div className="flex h-7 overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]">
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
    </div>
  );
}

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

function CountedInput({ id, label, value, max, onChange, multiline }: { id: string; label: string; value: string; max: number; onChange: (v: string) => void; multiline?: boolean }) {
  const t = useDict(TH, 'admin');
  const over = value.length > max;
  return (
    <div>
      <FieldLabel htmlFor={id} aside={<span className={cn('text-[12px] tabular-nums', over ? 'font-semibold text-amber-800' : 'text-muted')}>{t('chars', { n: value.length, max })}</span>}>
        {label}
      </FieldLabel>
      {multiline ? (
        <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cn(ctl, 'resize-y py-2.5 leading-relaxed')} />
      ) : (
        <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={cn(ctl, 'h-10')} />
      )}
      {over && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-800">
          <TriangleAlert className="h-3.5 w-3.5" /> {t('seoLong')}
        </p>
      )}
    </div>
  );
}

